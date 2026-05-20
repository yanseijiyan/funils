/* lib/events — INSERT idempotente na tabela `events` do Postgres.
 *
 * Recebe um evento canônico (do bridge) e grava no DB.
 * UNIQUE (event_id, event_name) garante idempotência.
 *
 * Falhas no INSERT são logadas e NÃO bloqueiam dispatch CAPI/TikTok.
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

async function recordEvent(e) {
  const sql = getSql();
  if (!sql) return { ok: false, skipped: 'no_database_url' };
  try {
    const rows = await sql`
      INSERT INTO events (
        event_id, event_name, tenant, session_id, ts,
        utm_source, utm_medium, utm_campaign, utm_content, utm_term,
        fbclid, ttclid, gclid,
        url, referrer, user_agent, ip,
        value, currency, custom
      ) VALUES (
        ${e.event_id}, ${e.event_name}, ${e.tenant}, ${e.session_id || null},
        ${e.ts ? new Date(e.ts * 1000).toISOString() : new Date().toISOString()},
        ${e.utm_source}, ${e.utm_medium}, ${e.utm_campaign}, ${e.utm_content}, ${e.utm_term},
        ${e.fbclid}, ${e.ttclid}, ${e.gclid},
        ${e.url}, ${e.referrer}, ${e.user_agent}, ${e.ip},
        ${e.value}, ${e.currency}, ${e.custom || null}
      )
      ON CONFLICT (event_id, event_name) DO NOTHING
      RETURNING id
    `;
    return { ok: true, inserted: rows.length > 0, id: rows[0]?.id || null };
  } catch (err) {
    console.error('[events.recordEvent] error', err && err.message);
    return { ok: false, error: String((err && err.message) || err) };
  }
}

module.exports = { recordEvent };
