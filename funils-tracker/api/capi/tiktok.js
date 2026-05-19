/* api/capi/tiktok — endpoint individual TikTok Events API */
const { getTenant } = require('../../lib/tenant');
const { userDataTikTok, readJson } = require('../../lib/hash');
const { sendTikTokEvents } = require('../../lib/tiktok-events');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST')    { res.status(405).json({ ok: false, error: 'method' }); return; }
  let payload;
  try { payload = await readJson(req); }
  catch (e) { res.status(400).json({ ok: false, error: 'bad_json' }); return; }
  const tenant = getTenant(payload.tenant);
  const cd = payload.custom_data || {};
  const properties = {};
  ['value','currency','content_type','content_id','content_name','content_category','contents','order_id','description','query']
    .forEach((k) => { if (cd[k] !== undefined) properties[k] = cd[k]; });
  const event = {
    event: payload.event_name || 'Pageview',
    event_time: payload.event_time || Math.floor(Date.now() / 1000),
    event_id: payload.event_id,
    user: userDataTikTok(payload.user_data, req),
    properties,
    page: { url: payload.event_source_url, referrer: payload.referrer_url }
  };
  const r = await sendTikTokEvents({
    pixelId: tenant.tiktok_pixel_id, token: tenant.tiktok_access_token,
    event, testCode: tenant.tiktok_test_code
  });
  res.status(200).json({ ok: r.ok !== false, event_id: payload.event_id, tiktok: r });
};
