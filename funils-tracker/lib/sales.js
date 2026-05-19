/* lib/sales — INSERT idempotente na tabela `sales` do Postgres (Neon).
 *
 * Env: DATABASE_URL (mesma do funils-dashboard — compartilhada via Vercel).
 *
 * UNIQUE (tenant, order_id, status) → ON CONFLICT DO NOTHING garante idempotência
 * (PerfectPay às vezes reenvia o mesmo postback).
 *
 * Falhas no INSERT são logadas mas NÃO quebram o webhook (CAPI/TikTok já dispararam).
 */
const { neon } = require('@neondatabase/serverless');

let _sql = null;
function getSql() {
  if (_sql) return _sql;
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  _sql = neon(url);
  return _sql;
}

async function recordSale(s) {
  const sql = getSql();
  if (!sql) {
    return { ok: false, skipped: 'no_database_url' };
  }
  try {
    const rows = await sql`
      INSERT INTO sales (
        order_id, tenant, status, value, currency,
        utm_source, utm_medium, utm_campaign, utm_content, utm_term,
        ttclid, fbclid, product_id, product_name,
        customer_email_hash, customer_phone_hash, raw
      ) VALUES (
        ${s.order_id}, ${s.tenant}, ${s.status}, ${s.value}, ${s.currency || 'BRL'},
        ${s.utm_source}, ${s.utm_medium}, ${s.utm_campaign}, ${s.utm_content}, ${s.utm_term},
        ${s.ttclid}, ${s.fbclid}, ${s.product_id}, ${s.product_name},
        ${s.customer_email_hash}, ${s.customer_phone_hash}, ${s.raw || null}
      )
      ON CONFLICT (tenant, order_id, status) DO NOTHING
      RETURNING id
    `;
    return { ok: true, inserted: rows.length > 0, id: rows[0]?.id || null };
  } catch (e) {
    console.error('[sales.recordSale] error', e && e.message);
    return { ok: false, error: String((e && e.message) || e) };
  }
}

module.exports = { recordSale };
