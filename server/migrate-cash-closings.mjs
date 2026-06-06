import { query } from "./db.js";

async function migrate() {
  await query(`
    CREATE TABLE IF NOT EXISTS cash_closings (
      id              SERIAL PRIMARY KEY,
      closing_date    DATE NOT NULL UNIQUE,
      opened_by       INT REFERENCES users(id) ON DELETE SET NULL,
      closed_by       INT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      closed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      total_sales     NUMERIC(10,2) NOT NULL DEFAULT 0,
      total_orders    INT NOT NULL DEFAULT 0,
      cash_sales      NUMERIC(10,2) NOT NULL DEFAULT 0,
      card_sales      NUMERIC(10,2) NOT NULL DEFAULT 0,
      transfer_sales  NUMERIC(10,2) NOT NULL DEFAULT 0,
      mixed_sales     NUMERIC(10,2) NOT NULL DEFAULT 0,
      initial_cash    NUMERIC(10,2) NOT NULL DEFAULT 0,
      expected_cash   NUMERIC(10,2) NOT NULL DEFAULT 0,
      counted_cash    NUMERIC(10,2) NOT NULL DEFAULT 0,
      difference      NUMERIC(10,2) NOT NULL DEFAULT 0,
      notes           TEXT
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_cash_closings_date ON cash_closings(closing_date DESC)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_cash_closings_user ON cash_closings(closed_by)`);
  const r = await query("SELECT to_regclass('public.cash_closings') AS t");
  console.log("Tabla cash_closings:", r.rows[0].t);
  process.exit(0);
}

migrate().catch((e) => { console.error(e); process.exit(1); });
