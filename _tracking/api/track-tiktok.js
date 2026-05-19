/* funils tracker — TikTok Events API v1.3 (server-side)
 * Vercel Serverless Function. Recebe POST do client e dispara evento pro TikTok Events API.
 * Faz par com track.js (Meta CAPI). Dedup com Pixel client via event_id.
 *
 * Envs (configurar no projeto Vercel):
 *   TIKTOK_ACCESS_TOKEN   — Long-lived access token (Events Manager → Settings → API)
 *   TIKTOK_TEST_CODE      — (opcional) test event code pra ver evento em Test Events
 *   TIKTOK_ALLOWED_IDS    — (opcional) CSV de pixel_ids permitidos
 *
 * Docs: https://business-api.tiktok.com/portal/docs?id=1771101027431425
 */
const crypto = require('crypto');

function sha256(v) {
  if (v === null || v === undefined || v === '') return null;
  return crypto.createHash('sha256').update(String(v).trim().toLowerCase()).digest('hex');
}

function clientIp(req) {
  var xff = req.headers['x-forwarded-for'];
  if (xff) return String(xff).split(',')[0].trim();
  return (req.socket && req.socket.remoteAddress) || null;
}

async function readBody(req) {
  if (req.body) return typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  return new Promise(function (resolve, reject) {
    var chunks = [];
    req.on('data', function (c) { chunks.push(c); });
    req.on('end', function () {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); }
      catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST')    { res.status(405).json({ ok: false, error: 'method' }); return; }

  var token = process.env.TIKTOK_ACCESS_TOKEN;
  if (!token) { res.status(200).json({ ok: false, skipped: 'no_tiktok_token' }); return; }

  let payload;
  try { payload = await readBody(req); }
  catch (e) { res.status(400).json({ ok: false, error: 'bad_json' }); return; }

  var pixelId = payload.tiktok_pixel_id || payload.pixel_id;
  if (!pixelId) { res.status(400).json({ ok: false, error: 'no_pixel_id' }); return; }

  var allowed = (process.env.TIKTOK_ALLOWED_IDS || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
  if (allowed.length && allowed.indexOf(String(pixelId)) < 0) {
    res.status(403).json({ ok: false, error: 'pixel_not_allowed' });
    return;
  }

  var ud = payload.user_data || {};
  var user = {
    ip: clientIp(req),
    user_agent: ud.client_user_agent || req.headers['user-agent'] || null
  };
  if (ud.ttp)         user.ttp         = ud.ttp;
  if (ud.ttclid)      user.ttclid      = ud.ttclid;
  if (ud.email)       user.email       = [sha256(ud.email)];
  if (ud.phone)       user.phone       = [sha256('+' + String(ud.phone).replace(/\D/g, ''))];
  if (ud.first_name)  user.first_name  = [sha256(ud.first_name)];
  if (ud.last_name)   user.last_name   = [sha256(ud.last_name)];
  if (ud.city)        user.city        = [sha256(ud.city)];
  if (ud.state)       user.state       = [sha256(ud.state)];
  if (ud.zip)         user.zip_code    = [sha256(ud.zip)];
  if (ud.country)     user.country     = [sha256(ud.country)];
  if (ud.external_id) user.external_id = [sha256(ud.external_id)];

  var cd = payload.custom_data || {};
  var properties = {};
  if (cd.value !== undefined)        properties.value        = cd.value;
  if (cd.currency)                   properties.currency     = cd.currency;
  if (cd.content_type)               properties.content_type = cd.content_type;
  if (cd.content_id)                 properties.content_id   = cd.content_id;
  if (cd.content_name)               properties.content_name = cd.content_name;
  if (cd.content_category)           properties.content_category = cd.content_category;
  if (cd.contents)                   properties.contents     = cd.contents;
  if (cd.order_id)                   properties.order_id     = cd.order_id;
  if (cd.description)                properties.description  = cd.description;
  if (cd.query)                      properties.query        = cd.query;

  var event = {
    event: payload.event_name || 'Pageview',  // TikTok usa "Pageview" (1 P), aliasing abaixo
    event_time: payload.event_time || Math.floor(Date.now() / 1000),
    event_id: payload.event_id,
    user: user,
    properties: properties,
    page: {
      url: payload.event_source_url || null,
      referrer: payload.referrer_url || null
    }
  };
  // TikTok canonical names
  var ALIAS = { PageView: 'Pageview' };
  if (ALIAS[event.event]) event.event = ALIAS[event.event];

  var body = {
    event_source: 'web',
    event_source_id: pixelId,
    data: [event]
  };
  if (process.env.TIKTOK_TEST_CODE) body.test_event_code = process.env.TIKTOK_TEST_CODE;

  try {
    var r = await fetch('https://business-api.tiktok.com/open_api/v1.3/event/track/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Access-Token': token
      },
      body: JSON.stringify(body)
    });
    var json = await r.json().catch(function () { return {}; });
    if (!r.ok || (json && json.code && json.code !== 0)) {
      res.status(200).json({ ok: false, status: r.status, tiktok: json });
      return;
    }
    res.status(200).json({ ok: true, event_id: event.event_id, tiktok: json });
  } catch (e) {
    res.status(200).json({ ok: false, error: String((e && e.message) || e) });
  }
};
