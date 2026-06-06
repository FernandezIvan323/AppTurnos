import { Router } from "express";
import { query, getClient } from "../db.js";
import { authRequired, requireRole } from "../middleware/auth.js";

const router = Router();

router.get("/", authRequired, async (_req, res) => {
  const { rows } = await query(
    `SELECT u.id   AS user_id,
            u.name AS user_name,
            u.username,
            u.active,
            COALESCE(
              (SELECT json_agg(json_build_object('id', wt.table_id, 'number', t.number, 'label', t.label) ORDER BY t.number)
                 FROM waiter_tables wt
                 JOIN tables t ON t.id = wt.table_id
                WHERE wt.user_id = u.id),
              '[]'::json
            ) AS tables
       FROM users u
      WHERE u.role = 'waiter' AND u.active = TRUE
      ORDER BY u.name`
  );
  res.json(rows);
});

router.put("/:user_id", authRequired, requireRole("admin"), async (req, res) => {
  const { table_ids } = req.body || {};
  if (!Array.isArray(table_ids))
    return res.status(400).json({ error: "table_ids debe ser un arreglo" });

  const userId = Number(req.params.user_id);
  const u = await query("SELECT id, role FROM users WHERE id = $1", [userId]);
  if (u.rows.length === 0) return res.status(404).json({ error: "Mesero no existe" });
  if (u.rows[0].role !== "waiter")
    return res.status(400).json({ error: "El usuario no es mesero" });

  const ids = [...new Set(table_ids.map(Number).filter((n) => Number.isInteger(n) && n > 0))];

  if (ids.length > 0) {
    const t = await query("SELECT id FROM tables WHERE id = ANY($1::int[])", [ids]);
    if (t.rows.length !== ids.length)
      return res.status(400).json({ error: "Una o más mesas no existen" });

    const conflict = await query(
      `SELECT wt.user_id, u.name, t.number
         FROM waiter_tables wt
         JOIN users u  ON u.id = wt.user_id
         JOIN tables t ON t.id = wt.table_id
        WHERE wt.table_id = ANY($1::int[])
          AND wt.user_id <> $2
        LIMIT 1`,
      [ids, userId]
    );
    if (conflict.rows.length > 0) {
      return res.status(409).json({
        error: `La mesa ${conflict.rows[0].number} ya está asignada a ${conflict.rows[0].name}`,
      });
    }
  }

  const client = await getClient();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM waiter_tables WHERE user_id = $1", [userId]);
    for (const tid of ids) {
      await client.query(
        "INSERT INTO waiter_tables (user_id, table_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        [userId, tid]
      );
    }
    await client.query("COMMIT");
    res.json({ ok: true, count: ids.length });
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
});

router.delete("/:user_id/:table_id", authRequired, requireRole("admin"), async (req, res) => {
  await query(
    "DELETE FROM waiter_tables WHERE user_id = $1 AND table_id = $2",
    [req.params.user_id, req.params.table_id]
  );
  res.json({ ok: true });
});

export default router;
