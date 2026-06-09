import { Router } from "express";
import { query, withTransaction, HttpError } from "../db.js";
import { authRequired, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(authRequired, requireRole("admin"));

// --- helpers -------------------------------------------------------------

function ymd(input) {
  if (!input) return null;
  // Acepta 'YYYY-MM-DD' o un ISO completo (toma la parte de la fecha).
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

async function pendingOrdersFor(closingDate) {
  const { rows } = await query(
    `SELECT o.id, o.type, o.status, o.payment_status, o.total, o.created_at,
            t.number  AS table_number,
            c.name    AS customer_name
       FROM orders o
       LEFT JOIN tables    t ON t.id = o.table_id
       LEFT JOIN customers c ON c.id = o.customer_id
      WHERE (o.status NOT IN ('delivered','paid','cancelled')
             OR o.payment_status <> 'paid')
        AND o.status <> 'cancelled'
        AND o.payment_status <> 'debt'
      ORDER BY o.created_at
      LIMIT 50`
  );
  return rows;
}

async function computeDaySummary(closingDate) {
  const { rows: sales } = await query(
    `SELECT COUNT(*)::int                     AS total_orders,
            COALESCE(SUM(total),0)::numeric    AS total_sales,
            COALESCE(SUM(total) FILTER (WHERE payment_method='cash'),0)::numeric     AS cash_sales,
            COALESCE(SUM(total) FILTER (WHERE payment_method='card'),0)::numeric     AS card_sales,
            COALESCE(SUM(total) FILTER (WHERE payment_method='transfer'),0)::numeric AS transfer_sales,
            COALESCE(SUM(total) FILTER (WHERE payment_method='mixed'),0)::numeric    AS mixed_sales
       FROM orders
      WHERE DATE(closed_at AT TIME ZONE 'America/Mexico_City') = $1
        AND payment_status = 'paid'`,
    [closingDate]
  );
  return sales[0] || {
    total_orders: 0,
    total_sales: 0,
    cash_sales: 0,
    card_sales: 0,
    transfer_sales: 0,
    mixed_sales: 0,
  };
}

// --- routes --------------------------------------------------------------

// GET /api/cash-closings -> listado histórico (opcional ?from=YYYY-MM-DD&to=)
router.get("/", async (req, res) => {
  const { from, to, limit = 100 } = req.query;
  const params = [];
  let where = "WHERE 1=1";
  if (from) {
    const f = ymd(from);
    if (!f) return res.status(400).json({ error: "Fecha 'from' inválida" });
    params.push(f);
    where += ` AND cc.closing_date >= $${params.length}`;
  }
  if (to) {
    const t = ymd(to);
    if (!t) return res.status(400).json({ error: "Fecha 'to' inválida" });
    params.push(t);
    where += ` AND cc.closing_date <= $${params.length}`;
  }
  params.push(Math.min(Number(limit) || 100, 500));
  const { rows } = await query(
    `SELECT cc.id, cc.closing_date, cc.closed_at, cc.total_sales, cc.total_orders,
            cc.cash_sales, cc.card_sales, cc.transfer_sales, cc.mixed_sales,
            cc.initial_cash, cc.expected_cash, cc.counted_cash, cc.difference,
            cc.notes, cc.closed_by, u.name AS closed_by_name
       FROM cash_closings cc
       LEFT JOIN users u ON u.id = cc.closed_by
       ${where}
       ORDER BY cc.closing_date DESC
       LIMIT $${params.length}`,
    params
  );
  res.json(rows);
});

// GET /api/cash-closings/preview?date=YYYY-MM-DD -> calcula lo que se cerraría
router.get("/preview", async (req, res) => {
  const date = ymd(req.query.date);
  if (!date) return res.status(400).json({ error: "Fecha requerida (YYYY-MM-DD)" });
  const summary = await computeDaySummary(date);
  const pending = await pendingOrdersFor(date);
  const existing = await query(
    "SELECT id, closed_at, closed_by FROM cash_closings WHERE closing_date = $1",
    [date]
  );
  res.json({
    closing_date: date,
    ...summary,
    expected_cash: Number(summary.cash_sales),
    pending_orders: pending,
    pending_count: pending.length,
    already_closed: existing.rows[0] || null,
  });
});

// GET /api/cash-closings/:id -> detalle
router.get("/:id", async (req, res) => {
  const { rows } = await query(
    `SELECT cc.*, u.name AS closed_by_name
       FROM cash_closings cc
       LEFT JOIN users u ON u.id = cc.closed_by
      WHERE cc.id = $1`,
    [req.params.id]
  );
  if (rows.length === 0) return res.status(404).json({ error: "Cierre no encontrado" });
  res.json(rows[0]);
});

// POST /api/cash-closings -> crea el cierre
router.post("/", async (req, res) => {
  const date = ymd(req.body.closing_date);
  if (!date) return res.status(400).json({ error: "closing_date requerido (YYYY-MM-DD)" });
  const initialCash = Number(req.body.initial_cash);
  const countedCash = Number(req.body.counted_cash);
  if (Number.isNaN(initialCash) || initialCash < 0)
    return res.status(400).json({ error: "initial_cash inválido" });
  if (Number.isNaN(countedCash) || countedCash < 0)
    return res.status(400).json({ error: "counted_cash inválido" });
  const notes = (req.body.notes || "").toString().trim() || null;

  try {
    const closingId = await withTransaction(async (client) => {
      // 1) Verificar que no exista un cierre para esa fecha
      const existing = await client.query(
        "SELECT id FROM cash_closings WHERE closing_date = $1",
        [date]
      );
      if (existing.rows.length > 0) {
        const err = new HttpError(409, `Ya existe un cierre para ${date}. Los cortes son inmutables.`);
        err.closing_id = existing.rows[0].id;
        throw err;
      }

      // 2) Verificar que no haya pedidos pendientes
      const { rows: pending } = await client.query(
        `SELECT o.id, o.type, o.status, o.payment_status, o.total, o.created_at,
                t.number AS table_number, c.name AS customer_name
           FROM orders o
           LEFT JOIN tables t    ON t.id = o.table_id
           LEFT JOIN customers c ON c.id = o.customer_id
          WHERE (o.status NOT IN ('delivered','paid','cancelled')
                 OR o.payment_status <> 'paid')
            AND o.status <> 'cancelled'
          LIMIT 50`
      );
      if (pending.length > 0) {
        const err = new HttpError(
          409,
          `Hay ${pending.length} pedido(s) pendiente(s). Ciérralos o cancélalos antes de hacer el corte.`
        );
        err.pending_orders = pending;
        throw err;
      }

      // 3) Calcular resumen del día
      const { rows: sales } = await client.query(
        `SELECT COUNT(*)::int                     AS total_orders,
                COALESCE(SUM(total),0)::numeric    AS total_sales,
                COALESCE(SUM(total) FILTER (WHERE payment_method='cash'),0)::numeric     AS cash_sales,
                COALESCE(SUM(total) FILTER (WHERE payment_method='card'),0)::numeric     AS card_sales,
                COALESCE(SUM(total) FILTER (WHERE payment_method='transfer'),0)::numeric AS transfer_sales,
                COALESCE(SUM(total) FILTER (WHERE payment_method='mixed'),0)::numeric    AS mixed_sales
           FROM orders
          WHERE DATE(closed_at AT TIME ZONE 'America/Mexico_City') = $1
            AND payment_status = 'paid'`,
        [date]
      );
      const summary = sales[0] || {
        total_orders: 0, total_sales: 0, cash_sales: 0, card_sales: 0, transfer_sales: 0, mixed_sales: 0,
      };
      const expected = Number(initialCash) + Number(summary.cash_sales);
      const diff = Number(countedCash) - expected;

      // 4) Insertar
      const { rows: ins } = await client.query(
        `INSERT INTO cash_closings
          (closing_date, closed_by, total_sales, total_orders,
           cash_sales, card_sales, transfer_sales, mixed_sales,
           initial_cash, expected_cash, counted_cash, difference, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         RETURNING id`,
        [
          date, req.user.id,
          summary.total_sales, summary.total_orders,
          summary.cash_sales, summary.card_sales, summary.transfer_sales, summary.mixed_sales,
          initialCash, expected, countedCash, diff, notes,
        ]
      );
      return ins[0].id;
    });

    const detail = await query(
      `SELECT cc.*, u.name AS closed_by_name
         FROM cash_closings cc
         LEFT JOIN users u ON u.id = cc.closed_by
        WHERE cc.id = $1`,
      [closingId]
    );
    res.status(201).json(detail.rows[0]);
  } catch (e) {
    const status = e.status || 500;
    if (status === 500) console.error(`[cashClosings:POST /]`, e);
    const body = { error: e.message || "Error interno" };
    if (e.closing_id) body.closing_id = e.closing_id;
    if (e.pending_orders) body.pending_orders = e.pending_orders;
    res.status(status).json(body);
  }
});

export default router;
