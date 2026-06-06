-- ===================================================================
--  AppTurnos · Esquema de base de datos PostgreSQL
-- ===================================================================

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  username      VARCHAR(40) UNIQUE NOT NULL,
  name          VARCHAR(100) NOT NULL,
  pin           VARCHAR(255) NOT NULL,        -- bcrypt hash
  role          VARCHAR(20)  NOT NULL CHECK (role IN ('admin','waiter')),
  active        BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categories (
  id        SERIAL PRIMARY KEY,
  name      VARCHAR(60) UNIQUE NOT NULL,
  position  INT NOT NULL DEFAULT 0,
  active    BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS products (
  id           SERIAL PRIMARY KEY,
  category_id  INT REFERENCES categories(id) ON DELETE SET NULL,
  name         VARCHAR(120) NOT NULL,
  description  TEXT,
  price        NUMERIC(10,2) NOT NULL DEFAULT 0,
  available    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tables (
  id        SERIAL PRIMARY KEY,
  number    VARCHAR(20) UNIQUE NOT NULL,   -- "1", "2", "A", "Patio 1", etc.
  label     VARCHAR(40),                    -- nombre legible
  capacity  INT NOT NULL DEFAULT 4,
  active    BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS customers (
  id           SERIAL PRIMARY KEY,
  name         VARCHAR(120) NOT NULL,
  phone        VARCHAR(30)  UNIQUE NOT NULL,
  address      TEXT,
  reference    TEXT,
  neighborhood VARCHAR(80),
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS delivery_persons (
  id     SERIAL PRIMARY KEY,
  name   VARCHAR(80) NOT NULL,
  phone  VARCHAR(30),
  status VARCHAR(20) NOT NULL DEFAULT 'available'
            CHECK (status IN ('available','busy','offduty'))
);

-- Estado global de la orden
-- pending        : recién creada, no asignada
-- preparing      : aceptada, en preparación
-- on_the_way     : repartidor asignado y salió
-- delivered      : entregada y cobrada
-- ready_to_pay   : lista para cobrar (mesa)
-- paid           : cobrada
-- cancelled      : cancelada
CREATE TABLE IF NOT EXISTS orders (
  id                SERIAL PRIMARY KEY,
  type              VARCHAR(20) NOT NULL CHECK (type IN ('table','delivery','pickup')),
  table_id          INT REFERENCES tables(id) ON DELETE SET NULL,
  customer_id       INT REFERENCES customers(id) ON DELETE SET NULL,
  user_id           INT REFERENCES users(id) ON DELETE SET NULL,
  delivery_person_id INT REFERENCES delivery_persons(id) ON DELETE SET NULL,
  status            VARCHAR(20) NOT NULL DEFAULT 'pending',
  payment_status    VARCHAR(20) NOT NULL DEFAULT 'pending',
  payment_method    VARCHAR(20),
  total             NUMERIC(10,2) NOT NULL DEFAULT 0,
  notes             TEXT,
  cancel_reason     TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at         TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS order_items (
  id          SERIAL PRIMARY KEY,
  order_id    INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id  INT REFERENCES products(id) ON DELETE SET NULL,
  name_snapshot VARCHAR(120) NOT NULL,
  unit_price  NUMERIC(10,2) NOT NULL,
  quantity    INT NOT NULL DEFAULT 1,
  notes       TEXT,
  status      VARCHAR(20) NOT NULL DEFAULT 'pending'
);

CREATE INDEX IF NOT EXISTS idx_orders_status       ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment      ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_type         ON orders(type);
CREATE INDEX IF NOT EXISTS idx_orders_created      ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orderitems_order    ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_products_category   ON products(category_id);

-- Asignación de mesas a meseros
CREATE TABLE IF NOT EXISTS waiter_tables (
  id           SERIAL PRIMARY KEY,
  user_id      INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  table_id     INT NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  assigned_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, table_id)
);
CREATE INDEX IF NOT EXISTS idx_waiter_tables_user  ON waiter_tables(user_id);
CREATE INDEX IF NOT EXISTS idx_waiter_tables_table ON waiter_tables(table_id);

-- Corte de caja (cierre Z)
-- Solo se permite UN cierre por día (closing_date UNIQUE).
-- Si te equivocás, no se puede modificar: queda como evidencia.
CREATE TABLE IF NOT EXISTS cash_closings (
  id              SERIAL PRIMARY KEY,
  closing_date    DATE NOT NULL UNIQUE,
  opened_by       INT REFERENCES users(id) ON DELETE SET NULL,
  closed_by       INT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  closed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Resumen de ventas del día
  total_sales     NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_orders    INT NOT NULL DEFAULT 0,
  -- Desglose por método de pago
  cash_sales      NUMERIC(10,2) NOT NULL DEFAULT 0,
  card_sales      NUMERIC(10,2) NOT NULL DEFAULT 0,
  transfer_sales  NUMERIC(10,2) NOT NULL DEFAULT 0,
  mixed_sales     NUMERIC(10,2) NOT NULL DEFAULT 0,
  -- Efectivo en caja
  initial_cash    NUMERIC(10,2) NOT NULL DEFAULT 0,
  expected_cash   NUMERIC(10,2) NOT NULL DEFAULT 0,
  counted_cash    NUMERIC(10,2) NOT NULL DEFAULT 0,
  difference      NUMERIC(10,2) NOT NULL DEFAULT 0,
  -- Otros
  notes           TEXT
);
CREATE INDEX IF NOT EXISTS idx_cash_closings_date  ON cash_closings(closing_date DESC);
CREATE INDEX IF NOT EXISTS idx_cash_closings_user  ON cash_closings(closed_by);
