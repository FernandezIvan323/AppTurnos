import { Router } from "express";
import { query } from "../db.js";
import { authRequired, requireRole } from "../middleware/auth.js";

const router = Router();

router.get("/", authRequired, async (req, res) => {
  const isAdmin = req.user.role === "admin";
  const userId = req.user.id;
  const baseSelect = `
    SELECT t.id, t.number, t.label, t.capacity, t.active,
           cur.id   AS current_order_id,
           cur.status AS current_order_status,
           cur.total  AS current_order_total,
           cur.created_at AS current_order_created,
           (SELECT COUNT(*)::int FROM order_items WHERE order_id = cur.id) AS current_order_items,
           wt.user_id  AS assigned_user_id,
           wu.name     AS assigned_user_name
      FROM tables t
      LEFT JOIN LATERAL (
        SELECT id, status, total, created_at
          FROM orders
         WHERE table_id = t.id
           AND status NOT IN ('paid','cancelled','delivered')
         ORDER BY created_at DESC
         LIMIT 1
      ) cur ON true
      LEFT JOIN waiter_tables wt ON wt.table_id = t.id
      LEFT JOIN users wu          ON wu.id = wt.user_id
  `;
  const sql = isAdmin
    ? baseSelect + " ORDER BY t.number"
    : baseSelect + " WHERE wt.user_id = $1 ORDER BY t.number";
  const params = isAdmin ? [] : [userId];
  const { rows } = await query(sql, params);
  res.json(rows);
});

router.post("/", authRequired, requireRole("admin"), async (req, res) => {
  const { number, label = null, capacity = 4, active = true } = req.body;
  if (!number) return res.status(400).json({ error: "Número requerido" });
  const { rows } = await query(
    "INSERT INTO tables (number, label, capacity, active) VALUES ($1,$2,$3,$4) RETURNING *",
    [number, label, capacity, active]
  );
  res.status(201).json(rows[0]);
});

router.put("/:id", authRequired, requireRole("admin"), async (req, res) => {
  const { number, label, capacity, active } = req.body;
  const { rows } = await query(
    `UPDATE tables
       SET number = COALESCE($2, number),
           label = COALESCE($3, label),
           capacity = COALESCE($4, capacity),
           active = COALESCE($5, active)
     WHERE id = $1
     RETURNING *`,
    [req.params.id, number, label, capacity, active]
  );
  res.json(rows[0]);
});

router.delete("/:id", authRequired, requireRole("admin"), async (req, res) => {
  await query("DELETE FROM tables WHERE id = $1", [req.params.id]);
  res.json({ ok: true });
});

export default router;
