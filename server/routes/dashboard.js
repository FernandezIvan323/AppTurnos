import { Router } from "express";
import { query } from "../db.js";
import { authRequired } from "../middleware/auth.js";

const router = Router();

router.get("/summary", authRequired, async (req, res) => {
  if (req.user.role === "waiter") {
    const my = await query(
      `SELECT
         (SELECT COUNT(*)::int FROM waiter_tables WHERE user_id = $1)                                  AS assigned_count,
         (SELECT COUNT(*)::int FROM waiter_tables wt
            JOIN orders o ON o.table_id = wt.table_id
            WHERE wt.user_id = $1
              AND o.status NOT IN ('paid','cancelled','delivered'))                                    AS open_count,
         (SELECT COUNT(*)::int FROM waiter_tables wt
            JOIN orders o ON o.table_id = wt.table_id
            WHERE wt.user_id = $1 AND o.status = 'ready_to_pay')                                       AS ready_to_pay,
         (SELECT COALESCE(SUM(o.total),0)::numeric FROM waiter_tables wt
            JOIN orders o ON o.table_id = wt.table_id
            WHERE wt.user_id = $1
              AND o.status NOT IN ('paid','cancelled','delivered'))                                    AS open_amount`,
      [req.user.id]
    );
    const today = await query(
      `SELECT COUNT(*)::int                                              AS closed_count,
              COALESCE(SUM(o.total),0)::numeric                          AS total_sold,
              COALESCE(AVG(o.total),0)::numeric                          AS avg_ticket
         FROM waiter_tables wt
         JOIN orders o ON o.table_id = wt.table_id
        WHERE wt.user_id = $1
          AND o.status IN ('delivered','paid')
          AND DATE(o.closed_at) = CURRENT_DATE`,
      [req.user.id]
    );
    return res.json({
      role: "waiter",
      my: my.rows[0],
      today: today.rows[0],
    });
  }

  const today = await query(
    `SELECT COALESCE(SUM(total),0)::numeric AS total_sales,
            COUNT(*)::int                     AS orders_count,
            COUNT(*) FILTER (WHERE type='delivery')::int  AS delivery_count,
            COUNT(*) FILTER (WHERE type='table')::int     AS table_count,
            COUNT(*) FILTER (WHERE type='pickup')::int    AS pickup_count,
            COALESCE(AVG(total),0)::numeric  AS avg_ticket
       FROM orders
      WHERE DATE(created_at) = CURRENT_DATE
        AND payment_status = 'paid'`
  );

  const yesterday = await query(
    `SELECT COALESCE(SUM(total),0)::numeric AS total_sales
       FROM orders
      WHERE DATE(created_at) = CURRENT_DATE - INTERVAL '1 day'
        AND payment_status = 'paid'`
  );

  const op = await query(
    `SELECT
        COUNT(*) FILTER (WHERE type='delivery' AND status='pending')::int    AS pending_to_assign,
        COUNT(*) FILTER (WHERE type='delivery' AND status='preparing')::int  AS preparing,
        COUNT(*) FILTER (WHERE type='delivery' AND status='on_the_way')::int AS on_the_way,
        COUNT(*) FILTER (WHERE type='table'    AND status NOT IN ('paid','cancelled','delivered'))::int AS active_tables,
        COUNT(*) FILTER (WHERE status='ready_to_pay')::int                   AS ready_to_pay,
        COUNT(*) FILTER (WHERE status NOT IN ('paid','cancelled','delivered'))::int AS active_orders
       FROM orders`
  );

  res.json({
    role: "admin",
    today: today.rows[0],
    yesterday_sales: yesterday.rows[0].total_sales,
    op: op.rows[0],
  });
});

export default router;
