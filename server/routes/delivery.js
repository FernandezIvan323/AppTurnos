import { Router } from "express";
import { query } from "../db.js";
import { authRequired, requireRole } from "../middleware/auth.js";

const router = Router();

router.get("/", authRequired, async (_req, res) => {
  const { rows } = await query(
    `SELECT dp.id, dp.name, dp.phone, dp.status,
       (SELECT COUNT(*) FROM orders o WHERE o.delivery_person_id = dp.id AND o.status = 'on_the_way')::int AS active_orders
     FROM delivery_persons dp ORDER BY dp.name`
  );
  res.json(rows);
});

router.get("/history", authRequired, requireRole("admin"), async (req, res) => {
  const { delivery_person_id, limit = 50 } = req.query;
  if (!delivery_person_id) return res.status(400).json({ error: "delivery_person_id requerido" });
  const { rows } = await query(
    `SELECT o.id, o.created_at, o.customer_name, o.customer_address,
            o.total, o.payment_method, o.status
     FROM orders o
     WHERE o.delivery_person_id = $1 AND o.type = 'delivery'
     ORDER BY o.created_at DESC
     LIMIT $2`,
    [delivery_person_id, limit]
  );
  res.json(rows);
});

router.post("/", authRequired, requireRole("admin"), async (req, res) => {
  const { name, phone = null } = req.body;
  if (!name) return res.status(400).json({ error: "Nombre requerido" });
  const { rows } = await query(
    "INSERT INTO delivery_persons (name, phone, status) VALUES ($1,$2,'available') RETURNING *",
    [name, phone]
  );
  res.status(201).json(rows[0]);
});

router.put("/:id", authRequired, requireRole("admin"), async (req, res) => {
  const { name, phone, status } = req.body;
  const { rows } = await query(
    `UPDATE delivery_persons
       SET name = COALESCE($2, name),
           phone = COALESCE($3, phone),
           status = COALESCE($4, status)
     WHERE id = $1
     RETURNING *`,
    [req.params.id, name, phone, status]
  );
  res.json(rows[0]);
});

router.delete("/:id", authRequired, requireRole("admin"), async (req, res) => {
  await query("DELETE FROM delivery_persons WHERE id = $1", [req.params.id]);
  res.json({ ok: true });
});

export default router;
