/* lib/ad-stats — UPSERT na tabela `ad_stats` do Postgres (Neon).
 *
 * Guarda gasto/impressões/cliques por dia, por campanha/conjunto/anúncio.
 * UNIQUE (tenant, stat_date, level, ref_id) → re-sync sobrescreve (não duplica).
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

async function upsertAdStats(tenant, rows) {
  const sql = getSql();
  if (!sql) return { ok: false, skipped: 'no_database_url' };
  let n = 0;
  try {
    for (const r of rows) {
      if (!r.ref_id || !r.stat_date) continue;
      await sql`
        INSERT INTO ad_stats (
          tenant, stat_date, level, ref_id, name,
          campaign_id, adset_id, spend, impressions, clicks, source, updated_at
        ) VALUES (
          ${tenant}, ${r.stat_date}, ${r.level}, ${r.ref_id}, ${r.name},
          ${r.campaign_id}, ${r.adset_id}, ${r.spend}, ${r.impressions}, ${r.clicks}, 'tiktok', NOW()
        )
        ON CONFLICT (tenant, stat_date, level, ref_id) DO UPDATE SET
          name = EXCLUDED.name,
          campaign_id = EXCLUDED.campaign_id,
          adset_id = EXCLUDED.adset_id,
          spend = EXCLUDED.spend,
          impressions = EXCLUDED.impressions,
          clicks = EXCLUDED.clicks,
          updated_at = NOW()
      `;
      n++;
    }
    return { ok: true, upserted: n };
  } catch (e) {
    console.error('[ad-stats.upsertAdStats] error', e && e.message);
    return { ok: false, upserted: n, error: String((e && e.message) || e) };
  }
}

module.exports = { upsertAdStats };
