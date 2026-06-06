import { query } from "./db.js";

async function migrate() {
  await query(`
    CREATE TABLE IF NOT EXISTS waiter_tables (
      id           SERIAL PRIMARY KEY,
      user_id      INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      table_id     INT NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
      assigned_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (user_id, table_id)
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_waiter_tables_user  ON waiter_tables(user_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_waiter_tables_table ON waiter_tables(table_id)`);
  const r = await query("SELECT to_regclass('public.waiter_tables') AS t");
  console.log("Tabla waiter_tables:", r.rows[0].t);
  process.exit(0);
}

migrate().catch((e) => { console.error(e); process.exit(1); });
