-- funils-dashboard: schema do Postgres (Neon)
-- Rodar UMA VEZ no SQL editor do Neon (painel Vercel → Storage → seu DB → Query)
-- Ou via psql: psql $DATABASE_URL -f lib/schema.sql

CREATE TABLE IF NOT EXISTS sales (
  id                    SERIAL PRIMARY KEY,
  order_id              TEXT NOT NULL,
  tenant                TEXT NOT NULL,
  ts                    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status                TEXT NOT NULL,                 -- approved | refunded
  value                 NUMERIC(12,2),
  currency              TEXT,
  utm_source            TEXT,
  utm_medium            TEXT,
  utm_campaign          TEXT,
  utm_content           TEXT,
  utm_term              TEXT,
  ttclid                TEXT,
  fbclid                TEXT,
  product_id            TEXT,
  product_name          TEXT,
  customer_email_hash   TEXT,
  customer_phone_hash   TEXT,
  raw                   JSONB,
  UNIQUE (tenant, order_id, status)
);

CREATE INDEX IF NOT EXISTS idx_sales_tenant_ts ON sales (tenant, ts DESC);
CREATE INDEX IF NOT EXISTS idx_sales_utm_source ON sales (utm_source);
CREATE INDEX IF NOT EXISTS idx_sales_utm_campaign ON sales (utm_campaign);
