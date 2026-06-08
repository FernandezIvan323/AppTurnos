import { Router } from "express";
import { query } from "../db.js";
import { authRequired } from "../middleware/auth.js";

const router = Router();

router.get("/", authRequired, async (req, res) => {
  const { q } = req.query;
  if (q) {
    const term = `%${q}%`;
    const { rows } = await query(
      `SELECT * FROM customers
        WHERE name ILIKE $1 OR phone ILIKE $1
        ORDER BY
          CASE WHEN LOWER(name) = LOWER($2) THEN 0 ELSE 1 END,
          CASE WHEN phone = $2 THEN 0 ELSE 1 END,
          name
        LIMIT 10`,
      [term, q]
    );
    return res.json(rows);
  }
  const { rows } = await query("SELECT * FROM customers ORDER BY created_at DESC LIMIT 50");
  res.json(rows);
});

router.get("/:id", authRequired, async (req, res) => {
  const { rows } = await query("SELECT * FROM customers WHERE id = $1", [req.params.id]);
  if (rows.length === 0) return res.status(404).json({ error: "No encontrado" });

  const orders = await query(
    `SELECT id, type, status, total, created_at FROM orders
      WHERE customer_id = $1
      ORDER BY created_at DESC LIMIT 10`,
    [req.params.id]
  );
  res.json({ ...rows[0], orders: orders.rows });
});

router.post("/", authRequired, async (req, res) => {
  const { name, phone, address = null, reference = null, neighborhood = null, notes = null } = req.body;
  if (!name || !phone) return res.status(400).json({ error: "Nombre y teléfono requeridos" });
  try {
    const { rows } = await query(
      `INSERT INTO customers (name, phone, address, reference, neighborhood, notes)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [name, phone, address, reference, neighborhood, notes]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    if (e.code === "23505") return res.status(409).json({ error: "Teléfono ya registrado" });
    throw e;
  }
});

router.put("/:id", authRequired, async (req, res) => {
  const { name, phone, address, reference, neighborhood, notes } = req.body;
  const { rows } = await query(
    `UPDATE customers
       SET name = COALESCE($2, name),
           phone = COALESCE($3, phone),
           address = COALESCE($4, address),
           reference = COALESCE($5, reference),
           neighborhood = COALESCE($6, neighborhood),
           notes = COALESCE($7, notes)
     WHERE id = $1
     RETURNING *`,
    [req.params.id, name, phone, address, reference, neighborhood, notes]
  );
  res.json(rows[0]);
});

export default router;
