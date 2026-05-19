/* api/capi/event — endpoint unificado: dispara Meta CAPI + TikTok Events numa só chamada
 *
 * Payload:
 *   {
 *     tenant: "cliente-4",
 *     event_name: "PageView" | "ViewContent" | "Lead" | "InitiateCheckout" | "Purchase" | ...,
 *     event_id: "uuid",
 *     event_time: 1234567890,
 *     event_source_url: "https://...",
 *     referrer_url: "...",
 *     user_data: { email, phone, first_name, last_name, city, state, zip, country,
 *                  external_id, fbp, fbc, fbclid, ttp, ttclid, gclid, client_user_agent },
 *     custom_data: { value, currency, contents:[{content_id,content_name,quantity,price}],
 *                    content_ids:[], content_name, content_category, order_id, utms:{...} }
 *   }
 *
 * Retorna { ok, meta:{ok,...}, tiktok:{ok,...}, tenant:{id,meta_pixel_id,tiktok_pixel_id} }
 */
const { getTenant } = require('../../lib/tenant');
const { userDataMeta, userDataTikTok, readJson } = require('../../lib/hash');
const { sendMetaCapi } = require('../../lib/meta-capi');
const { sendTikTokEvents } = require('../../lib/tiktok-events');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST')    { res.status(405).json({ ok: false, error: 'method' }); return; }

  let payload;
  try { payload = await readJson(req); }
  catch (e) { res.status(400).json({ ok: false, error: 'bad_json' }); return; }

  const tenant = getTenant(payload.tenant);
  if (!tenant.meta_pixel_id && !tenant.tiktok_pixel_id) {
    res.status(400).json({ ok: false, error: 'tenant_not_found_or_no_pixels', tenant: payload.tenant });
    return;
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const eventName = payload.event_name || 'PageView';
  const eventId   = payload.event_id;
  const eventTime = payload.event_time || nowSec;
  const url       = payload.event_source_url || null;
  const referrer  = payload.referrer_url || null;
  const customData = payload.custom_data || {};

  /* Aplica commission_rate automaticamente em Purchase se gross_price vier sem value */
  if (eventName === 'Purchase' && customData.gross_price && !customData.value) {
    customData.value = +(customData.gross_price * tenant.commission_rate).toFixed(2);
    if (!customData.currency) customData.currency = 'BRL';
  }

  /* Expande content_ids → contents[] usando catálogo do tenant */
  if (customData.content_ids && !customData.contents) {
    customData.contents = customData.content_ids.map((id) => {
      const p = tenant.products[id] || {};
      return {
        content_id:   p.id || id,
        content_name: p.name || id,
        content_type: 'product',
        quantity:     1,
        price:        p.price || 0
      };
    });
  }

  /* Meta event */
  const metaEvent = {
    event_name: eventName,
    event_time: eventTime,
    event_id:   eventId,
    event_source_url: url,
    action_source: 'website',
    user_data: userDataMeta(payload.user_data, req),
    custom_data: customData
  };

  /* TikTok event */
  const ttProps = {};
  ['value','currency','content_type','content_id','content_name','content_category','contents','order_id','description','query']
    .forEach((k) => { if (customData[k] !== undefined) ttProps[k] = customData[k]; });
  const ttEvent = {
    event: eventName,
    event_time: eventTime,
    event_id: eventId,
    user: userDataTikTok(payload.user_data, req),
    properties: ttProps,
    page: { url, referrer }
  };

  /* Dispara em paralelo */
  const [meta, tiktok] = await Promise.all([
    sendMetaCapi({
      pixelId: tenant.meta_pixel_id,
      token: tenant.capi_token,
      event: metaEvent,
      testCode: tenant.capi_test_code
    }),
    sendTikTokEvents({
      pixelId: tenant.tiktok_pixel_id,
      token: tenant.tiktok_access_token,
      event: ttEvent,
      testCode: tenant.tiktok_test_code
    })
  ]);

  res.status(200).json({
    ok: true,
    event_id: eventId,
    event: eventName,
    tenant: { id: tenant.id, meta_pixel_id: tenant.meta_pixel_id, tiktok_pixel_id: tenant.tiktok_pixel_id },
    meta, tiktok
  });
};
