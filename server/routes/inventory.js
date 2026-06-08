import { Router } from "express";
import { query } from "../db.js";
import { authRequired, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(authRequired, requireRole("admin"));

router.get("/", async (_req, res) => {
  const { rows } = await query(
    `SELECT p.id, p.name, p.stock, p.min_stock, c.name AS category_name,
       CASE WHEN p.stock <= p.min_stock THEN true ELSE false END AS low_stock
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     ORDER BY p.name`
  );
  res.json(rows);
});

router.put("/:id", async (req, res) => {
  const { stock, min_stock } = req.body;
  if (stock == null && min_stock == null)
    return res.status(400).json({ error: "Nada que actualizar" });
  const sets = [];
  const vals = [req.params.id];
  if (stock != null) { sets.push(`stock = $${vals.length + 1}`); vals.push(stock); }
  if (min_stock != null) { sets.push(`min_stock = $${vals.length + 1}`); vals.push(min_stock); }
  const { rows } = await query(
    `UPDATE products SET ${sets.join(", ")} WHERE id = $1 RETURNING id, name, stock, min_stock`,
    vals
  );
  res.json(rows[0]);
});

router.post("/movement", async (req, res) => {
  const { product_id, type, quantity, reason } = req.body || {};
  if (!product_id || !type || quantity == null)
    return res.status(400).json({ error: "Faltan datos" });
  if (!["entry", "exit", "adjustment"].includes(type))
    return res.status(400).json({ error: "Tipo inválido" });
  const qty = Number(quantity);
  if (qty <= 0) return res.status(400).json({ error: "Cantidad debe ser positiva" });

  const delta = type === "entry" ? qty : type === "exit" ? -qty : 0;
  const { rows: [product] } = await query(
    `UPDATE products SET stock = GREATEST(stock + $2, 0) WHERE id = $1 RETURNING id, name, stock`,
    [product_id, delta]
  );
  if (!product) return res.status(404).json({ error: "Producto no encontrado" });

  await query(
    `INSERT INTO stock_movements (product_id, type, quantity, reason) VALUES ($1,$2,$3,$4)`,
    [product_id, type, qty, reason || null]
  );

  res.json(product);
});

router.get("/movements", async (req, res) => {
  const { product_id } = req.query;
  const { rows } = await query(
    `SELECT sm.*, p.name AS product_name
     FROM stock_movements sm
     JOIN products p ON p.id = sm.product_id
     WHERE ($1::int IS NULL OR sm.product_id = $1)
     ORDER BY sm.created_at DESC LIMIT 200`,
    [product_id || null]
  );
  res.json(rows);
});

export default router;
