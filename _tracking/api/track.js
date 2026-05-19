/* funils tracker — Meta Conversions API (server-side)
 * Vercel Serverless Function. Recebe POST do client e dispara evento pro Meta CAPI com PII hash SHA256.
 *
 * Envs (configurar no projeto Vercel):
 *   CAPI_TOKEN          — Access token do Pixel (System User token)
 *   CAPI_TEST_CODE      — (opcional) test event code pra ver evento ao vivo em Test Events
 *   ALLOWED_PIXEL_IDS   — (opcional) CSV de pixel_ids permitidos
 *
 * Payload esperado do client (core.js):
 *   { event_name, event_id, event_time, event_source_url, pixel_id, user_data, custom_data }
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

  var token = process.env.CAPI_TOKEN;
  if (!token) { res.status(200).json({ ok: false, skipped: 'no_capi_token' }); return; }

  let payload;
  try { payload = await readBody(req); }
  catch (e) { res.status(400).json({ ok: false, error: 'bad_json' }); return; }

  var pixelId = payload.pixel_id;
  if (!pixelId) { res.status(400).json({ ok: false, error: 'no_pixel_id' }); return; }

  var allowed = (process.env.ALLOWED_PIXEL_IDS || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
  if (allowed.length && allowed.indexOf(String(pixelId)) < 0) {
    res.status(403).json({ ok: false, error: 'pixel_not_allowed' });
    return;
  }

  var ud = payload.user_data || {};
  var userData = {
    client_ip_address: clientIp(req),
    client_user_agent: ud.client_user_agent || req.headers['user-agent'] || null
  };
  if (ud.fbp) userData.fbp = ud.fbp;
  if (ud.fbc) userData.fbc = ud.fbc;
  if (ud.fbclid && !userData.fbc) {
    userData.fbc = 'fb.1.' + Math.floor(Date.now() / 1000) + '.' + ud.fbclid;
  }
  // PII (Meta espera tudo hashed em SHA256, lowercase + trim)
  if (ud.email)       userData.em = [sha256(ud.email)];
  if (ud.phone)       userData.ph = [sha256(String(ud.phone).replace(/\D/g, ''))];
  if (ud.first_name)  userData.fn = [sha256(ud.first_name)];
  if (ud.last_name)   userData.ln = [sha256(ud.last_name)];
  if (ud.city)        userData.ct = [sha256(ud.city)];
  if (ud.state)       userData.st = [sha256(ud.state)];
  if (ud.zip)         userData.zp = [sha256(ud.zip)];
  if (ud.country)     userData.country = [sha256(ud.country)];
  if (ud.external_id) userData.external_id = [sha256(ud.external_id)];

  var event = {
    event_name: payload.event_name || 'PageView',
    event_time: payload.event_time || Math.floor(Date.now() / 1000),
    event_id: payload.event_id,                 // dedup com client Pixel
    event_source_url: payload.event_source_url,
    action_source: 'website',
    user_data: userData,
    custom_data: payload.custom_data || {}
  };

  var body = { data: [event] };
  if (process.env.CAPI_TEST_CODE) body.test_event_code = process.env.CAPI_TEST_CODE;

  var url = 'https://graph.facebook.com/v20.0/' + encodeURIComponent(pixelId) +
            '/events?access_token=' + encodeURIComponent(token);

  try {
    var r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    var json = await r.json().catch(function () { return {}; });
    if (!r.ok) { res.status(200).json({ ok: false, status: r.status, meta: json }); return; }
    res.status(200).json({ ok: true, event_id: event.event_id, meta: json });
  } catch (e) {
    res.status(200).json({ ok: false, error: String((e && e.message) || e) });
  }
};
