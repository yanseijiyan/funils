/* api/capi/meta — endpoint individual Meta CAPI (mesmo payload do /api/capi/event) */
const { getTenant } = require('../../lib/tenant');
const { userDataMeta, readJson } = require('../../lib/hash');
const { sendMetaCapi } = require('../../lib/meta-capi');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST')    { res.status(405).json({ ok: false, error: 'method' }); return; }
  let payload;
  try { payload = await readJson(req); }
  catch (e) { res.status(400).json({ ok: false, error: 'bad_json' }); return; }
  const tenant = getTenant(payload.tenant);
  const event = {
    event_name: payload.event_name || 'PageView',
    event_time: payload.event_time || Math.floor(Date.now() / 1000),
    event_id: payload.event_id,
    event_source_url: payload.event_source_url,
    action_source: 'website',
    user_data: userDataMeta(payload.user_data, req),
    custom_data: payload.custom_data || {}
  };
  const r = await sendMetaCapi({
    pixelId: tenant.meta_pixel_id, token: tenant.capi_token,
    event, testCode: tenant.capi_test_code
  });
  res.status(200).json({ ok: r.ok !== false, event_id: payload.event_id, meta: r });
};
