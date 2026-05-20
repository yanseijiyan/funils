-- funils-dashboard: schema Postgres (Neon)
-- Rodar UMA VEZ no SQL editor do Neon (painel Vercel → Storage → seu DB → Query)
-- Ou via psql: psql $DATABASE_URL -f lib/schema.sql
--
-- Re-rodar é seguro (IF NOT EXISTS em tudo).

-- ─────────────────────────────────────────────────────
-- events: TODOS os eventos capturados pelo bridge/webhook
-- (PageView, ViewContent, Lead, InitiateCheckout, Purchase,
--  VSLPlay, VSL_25/50/75, QuizStart, QuizStep, ScrollDepth, etc)
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS events (
  id           BIGSERIAL PRIMARY KEY,
  event_id     TEXT NOT NULL,
  event_name   TEXT NOT NULL,
  tenant       TEXT NOT NULL,
  session_id   TEXT,
  ts           TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- UTMs (denormalizado pra agregar rápido)
  utm_source   TEXT,
  utm_medium   TEXT,
  utm_campaign TEXT,
  utm_content  TEXT,
  utm_term     TEXT,

  -- Click IDs
  fbclid       TEXT,
  ttclid       TEXT,
  gclid        TEXT,

  -- Origem
  url          TEXT,
  referrer     TEXT,
  user_agent   TEXT,
  ip           TEXT,

  -- Valor (pra Purchase, ou ViewContent com price)
  value        NUMERIC(12,2),
  currency     TEXT,

  -- custom: { step: 5 } pra QuizStep, { pct: 50 } pra ScrollDepth, etc
  custom       JSONB,

  -- Dedup: mesmo event_id+event_name não duplica
  UNIQUE (event_id, event_name)
);

CREATE INDEX IF NOT EXISTS idx_events_tenant_ts    ON events (tenant, ts DESC);
CREATE INDEX IF NOT EXISTS idx_events_name         ON events (event_name);
CREATE INDEX IF NOT EXISTS idx_events_utm_source   ON events (utm_source);
CREATE INDEX IF NOT EXISTS idx_events_utm_campaign ON events (utm_campaign);
CREATE INDEX IF NOT EXISTS idx_events_session      ON events (session_id);
CREATE INDEX IF NOT EXISTS idx_events_custom_gin   ON events USING GIN (custom);

-- ─────────────────────────────────────────────────────
-- sales: Purchase/Refund com PII completa (vem do webhook)
-- Mantida separada de events pra ter campos específicos (customer hashes,
-- product_id detalhado) e UNIQUE constraint mais robusta.
-- ─────────────────────────────────────────────────────
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

CREATE INDEX IF NOT EXISTS idx_sales_tenant_ts    ON sales (tenant, ts DESC);
CREATE INDEX IF NOT EXISTS idx_sales_utm_source   ON sales (utm_source);
CREATE INDEX IF NOT EXISTS idx_sales_utm_campaign ON sales (utm_campaign);

-- ─────────────────────────────────────────────────────
-- ad_stats: gasto/impressões/cliques por dia, por campanha/conjunto/anúncio.
-- Vem da TikTok Marketing API (sync via /api/sync/tiktok-ads).
-- O dashboard junta com events/sales (por id) → CPC/CPM/CTR/CPA/ROAS.
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ad_stats (
  id           BIGSERIAL PRIMARY KEY,
  tenant       TEXT NOT NULL,
  stat_date    DATE NOT NULL,
  level        TEXT NOT NULL,              -- campaign | adset | ad
  ref_id       TEXT NOT NULL,              -- id TikTok do campaign/adgroup/ad
  name         TEXT,
  campaign_id  TEXT,
  adset_id     TEXT,
  spend        NUMERIC(14,2) DEFAULT 0,
  impressions  BIGINT DEFAULT 0,
  clicks       BIGINT DEFAULT 0,
  currency     TEXT,
  source       TEXT DEFAULT 'tiktok',
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant, stat_date, level, ref_id)
);

CREATE INDEX IF NOT EXISTS idx_ad_stats_tenant_date ON ad_stats (tenant, stat_date DESC);
CREATE INDEX IF NOT EXISTS idx_ad_stats_level_ref   ON ad_stats (tenant, level, ref_id);
