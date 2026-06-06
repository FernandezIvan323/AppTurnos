import { Router } from "express";
import { query, getClient } from "../db.js";
import { authRequired, requireRole } from "../middleware/auth.js";

const router = Router();

const ORDER_COLUMNS = `
  o.id, o.type, o.status, o.payment_status, o.payment_method,
  o.total, o.notes, o.cancel_reason, o.created_at, o.closed_at,
  o.table_id, o.customer_id, o.user_id, o.delivery_person_id,
  t.number AS table_number, t.label AS table_label,
  c.name AS customer_name, c.phone AS customer_phone, c.address AS customer_address,
  c.neighborhood AS customer_neighborhood, c.reference AS customer_reference,
  u.name AS user_name,
  d.name AS delivery_name, d.phone AS delivery_phone
`;

async function recomputeOrderTotal(client, orderId) {
  const { rows } = await client.query(
    `SELECT COALESCE(SUM(quantity * unit_price), 0)::numeric AS total
       FROM order_items WHERE order_id = $1`,
    [orderId]
  );
  const total = rows[0].total;
  await client.query("UPDATE orders SET total = $2 WHERE id = $1", [orderId, total]);
  return total;
}

router.get("/", authRequired, async (req, res) => {
  const { type, status, payment, from, to } = req.query;
  const filters = [];
  const params = [];
  if (type)    { params.push(type);    filters.push(`o.type = $${params.length}`); }
  if (status)  { params.push(status);  filters.push(`o.status = $${params.length}`); }
  if (payment) { params.push(payment); filters.push(`o.payment_status = $${params.length}`); }
  if (from)    { params.push(from);    filters.push(`o.created_at >= $${params.length}`); }
  if (to)      { params.push(to);      filters.push(`o.created_at <= $${params.length}`); }
  const where = filters.length ? "WHERE " + filters.join(" AND ") : "";

  const { rows } = await query(
    `SELECT ${ORDER_COLUMNS}
       FROM orders o
       LEFT JOIN tables t  ON t.id = o.table_id
       LEFT JOIN customers c ON c.id = o.customer_id
       LEFT JOIN users u     ON u.id = o.user_id
       LEFT JOIN delivery_persons d ON d.id = o.delivery_person_id
       ${where}
      ORDER BY o.created_at DESC
      LIMIT 200`,
    params
  );
  res.json(rows);
});

router.get("/:id", authRequired, async (req, res) => {
  const { rows } = await query(
    `SELECT ${ORDER_COLUMNS}
       FROM orders o
       LEFT JOIN tables t  ON t.id = o.table_id
       LEFT JOIN customers c ON c.id = o.customer_id
       LEFT JOIN users u     ON u.id = o.user_id
       LEFT JOIN delivery_persons d ON d.id = o.delivery_person_id
      WHERE o.id = $1`,
    [req.params.id]
  );
  if (rows.length === 0) return res.status(404).json({ error: "No encontrado" });
  const items = await query(
    `SELECT id, product_id, name_snapshot, unit_price, quantity, notes, status
       FROM order_items WHERE order_id = $1 ORDER BY id`,
    [req.params.id]
  );
  res.json({ ...rows[0], items: items.rows });
});

router.post("/", authRequired, async (req, res) => {
  const {
    type, table_id = null, customer_id = null,
    notes = null, items = [],
  } = req.body;

  if (!["table", "delivery", "pickup"].includes(type))
    return res.status(400).json({ error: "Tipo inválido" });
  if (type === "table" && !table_id)
    return res.status(400).json({ error: "Mesa requerida" });
  if (type === "delivery" && !customer_id)
    return res.status(400).json({ error: "Cliente requerido" });
  if (!Array.isArray(items) || items.length === 0)
    return res.status(400).json({ error: "El pedido debe tener al menos un producto" });

  const client = await getClient();
  try {
    await client.query("BEGIN");

    // Verificar mesa libre
    if (type === "table") {
      const { rows: occ } = await client.query(
        `SELECT id FROM orders WHERE table_id = $1 AND status NOT IN ('paid','cancelled','delivered') LIMIT 1`,
        [table_id]
      );
      if (occ.length > 0) {
        await client.query("ROLLBACK");
        return res.status(409).json({ error: "La mesa ya está ocupada" });
      }
      if (req.user.role === "waiter") {
        const { rows: own } = await client.query(
          "SELECT 1 FROM waiter_tables WHERE user_id = $1 AND table_id = $2 LIMIT 1",
          [req.user.id, table_id]
        );
        if (own.length === 0) {
          await client.query("ROLLBACK");
          return res.status(403).json({ error: "Esta mesa no está asignada a ti" });
        }
      }
    }

    if (req.user.role === "waiter" && type !== "table") {
      return res.status(403).json({ error: "Los meseros solo pueden crear pedidos de mesa" });
    }

    const initialStatus = "pending";

    const { rows: order } = await client.query(
      `INSERT INTO orders (type, table_id, customer_id, user_id, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [type, table_id, customer_id, req.user.id, initialStatus, notes]
    );
    const orderId = order[0].id;

    for (const it of items) {
      const { rows: p } = await client.query(
        "SELECT id, name, price FROM products WHERE id = $1",
        [it.product_id]
      );
      if (p.length === 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: `Producto ${it.product_id} no existe` });
      }
      await client.query(
        `INSERT INTO order_items (order_id, product_id, name_snapshot, unit_price, quantity, notes)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [orderId, p[0].id, p[0].name, p[0].price, it.quantity || 1, it.notes || null]
      );
    }

    const total = await recomputeOrderTotal(client, orderId);
    await client.query("COMMIT");

    res.status(201).json({ id: orderId, total });
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
});

router.post("/:id/items", authRequired, async (req, res) => {
  const { product_id, quantity = 1, notes = null } = req.body;
  const client = await getClient();
  try {
    await client.query("BEGIN");
    const { rows: p } = await client.query(
      "SELECT id, name, price FROM products WHERE id = $1",
      [product_id]
    );
    if (p.length === 0) return res.status(400).json({ error: "Producto no existe" });
    await client.query(
      `INSERT INTO order_items (order_id, product_id, name_snapshot, unit_price, quantity, notes)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [req.params.id, p[0].id, p[0].name, p[0].price, quantity, notes]
    );
    await recomputeOrderTotal(client, req.params.id);
    await client.query("COMMIT");
    res.status(201).json({ ok: true });
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
});

router.delete("/:id/items/:itemId", authRequired, async (req, res) => {
  const client = await getClient();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM order_items WHERE id = $1 AND order_id = $2", [
      req.params.itemId,
      req.params.id,
    ]);
    await recomputeOrderTotal(client, req.params.id);
    await client.query("COMMIT");
    res.json({ ok: true });
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
});

// Asignar repartidor (admin)
router.post("/:id/assign-delivery", authRequired, requireRole("admin"), async (req, res) => {
  const { delivery_person_id } = req.body;
  if (!delivery_person_id) return res.status(400).json({ error: "Repartidor requerido" });

  const client = await getClient();
  try {
    await client.query("BEGIN");
    const dp = await client.query(
      "SELECT id, status FROM delivery_persons WHERE id = $1 FOR UPDATE",
      [delivery_person_id]
    );
    if (dp.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Repartidor no existe" });
    }
    if (dp.rows[0].status !== "available") {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "Repartidor no disponible" });
    }
    const { rows: o } = await client.query(
      "SELECT status FROM orders WHERE id = $1 FOR UPDATE",
      [req.params.id]
    );
    if (o.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Pedido no existe" });
    }
    if (!["pending", "preparing"].includes(o.rows[0].status)) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "El pedido no se puede asignar en su estado actual (" + o.rows[0].status + ")" });
    }
    await client.query(
      `UPDATE orders SET delivery_person_id = $2, status = 'on_the_way' WHERE id = $1`,
      [req.params.id, delivery_person_id]
    );
    await client.query(
      `UPDATE delivery_persons SET status = 'busy' WHERE id = $1`,
      [delivery_person_id]
    );
    await client.query("COMMIT");
    res.json({ ok: true });
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
});

// Cambiar estado manualmente (admin)
router.post("/:id/status", authRequired, requireRole("admin"), async (req, res) => {
  const { status, cancel_reason = null } = req.body;
  const valid = ["pending", "preparing", "on_the_way", "delivered", "ready_to_pay", "cancelled"];
  if (!valid.includes(status)) return res.status(400).json({ error: "Estado inválido" });

  const client = await getClient();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      "SELECT delivery_person_id, type, status FROM orders WHERE id = $1 FOR UPDATE",
      [req.params.id]
    );
    if (rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "No existe" });
    }
    const o = rows[0];
    if (status === "cancelled" && o.delivery_person_id) {
      await client.query(
        "UPDATE delivery_persons SET status = 'available' WHERE id = $1",
        [o.delivery_person_id]
      );
    }
    await client.query(
      `UPDATE orders
         SET status = $2,
             cancel_reason = COALESCE($3, cancel_reason)
       WHERE id = $1`,
      [req.params.id, status, cancel_reason]
    );
    await client.query("COMMIT");
    res.json({ ok: true });
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
});

// Cerrar / cobrar pedido (admin)
router.post("/:id/close", authRequired, requireRole("admin"), async (req, res) => {
  const { payment_method = "cash" } = req.body;
  const client = await getClient();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      "SELECT delivery_person_id FROM orders WHERE id = $1 FOR UPDATE",
      [req.params.id]
    );
    if (rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "No existe" });
    }
    if (rows[0].delivery_person_id) {
      await client.query(
        "UPDATE delivery_persons SET status = 'available' WHERE id = $1",
        [rows[0].delivery_person_id]
      );
    }
    await client.query(
      `UPDATE orders
         SET status = 'delivered',
             payment_status = 'paid',
             payment_method = $2,
             closed_at = NOW()
       WHERE id = $1`,
      [req.params.id, payment_method]
    );
    await client.query("COMMIT");
    res.json({ ok: true });
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
});

// Pre-pago por transferencia: marca como pagado pero el pedido sigue su curso
// (solo aplica a pedidos a domicilio en camino)
router.post("/:id/prepay", authRequired, requireRole("admin"), async (req, res) => {
  const { payment_method = "transfer" } = req.body;
  const { rows } = await query(
    "SELECT id, type, status FROM orders WHERE id = $1",
    [req.params.id]
  );
  if (rows.length === 0) return res.status(404).json({ error: "No existe" });
  if (rows[0].type !== "delivery") {
    return res.status(400).json({ error: "Solo aplica a pedidos a domicilio" });
  }
  await query(
    "UPDATE orders SET payment_status='paid', payment_method=$2 WHERE id=$1",
    [req.params.id, payment_method]
  );
  res.json({ ok: true });
});

// Reabrir pedido cerrado por error (admin)
// Revierte el cierre: vuelve a on_the_way (si tenía repartidor) o preparing,
// libera el cierre y resetea el pago a pendiente.
router.post("/:id/reopen", authRequired, requireRole("admin"), async (req, res) => {
  const client = await getClient();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      "SELECT type, status, delivery_person_id FROM orders WHERE id = $1 FOR UPDATE",
      [req.params.id]
    );
    if (rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "No existe" });
    }
    const o = rows[0];
    if (o.status !== "delivered") {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "Solo se pueden reabrir pedidos entregados" });
    }
    let newStatus;
    if (o.type === "delivery" && o.delivery_person_id) {
      newStatus = "on_the_way";
      await client.query(
        "UPDATE delivery_persons SET status = 'busy' WHERE id = $1",
        [o.delivery_person_id]
      );
    } else if (o.type === "table") {
      newStatus = "ready_to_pay";
    } else {
      newStatus = "preparing";
    }
    await client.query(
      `UPDATE orders
          SET status = $2,
              payment_status = 'pending',
              payment_method = NULL,
              closed_at = NULL
        WHERE id = $1`,
      [req.params.id, newStatus]
    );
    await client.query("COMMIT");
    res.json({ ok: true, status: newStatus });
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
});

export default router;
