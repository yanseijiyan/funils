/* funils tracker — webhook PerfectPay (Fase 2)
 * Recebe postback da PerfectPay e dispara Purchase/Refund server-side
 * pro Meta CAPI + TikTok Events API, usando event_id recuperado do clique original.
 *
 * Setup no painel PerfectPay:
 *   1. Logado como produtor → Configurações → Notificações (Postback)
 *   2. URL: https://<seusite>.vercel.app/api/webhook/perfectpay
 *   3. Eventos: Venda Aprovada, Reembolso (mínimo). Boleto Pago, Pix Pago se vender por esses meios.
 *   4. Token: copia um valor aleatório (UUID) e cola tanto no painel quanto no env PERFECTPAY_WEBHOOK_TOKEN
 *
 * Envs:
 *   PERFECTPAY_WEBHOOK_TOKEN   — token compartilhado com o painel (obrigatório pra validação)
 *   PIXEL_ID                   — Meta Pixel (opcional — se setado, dispara Meta CAPI)
 *   CAPI_TOKEN                 — Meta CAPI access token
 *   CAPI_TEST_CODE             — opcional
 *   TIKTOK_PIXEL_ID            — TikTok Pixel (opcional — se setado, dispara TikTok Events API)
 *   TIKTOK_ACCESS_TOKEN        — TikTok Events API access token
 *   TIKTOK_TEST_CODE           — opcional
 */
const crypto = require('crypto');

function sha256(v) {
  if (v === null || v === undefined || v === '') return null;
  return crypto.createHash('sha256').update(String(v).trim().toLowerCase()).digest('hex');
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

function pick(obj, paths) {
  for (var i = 0; i < paths.length; i++) {
    var v = paths[i].split('.').reduce(function (o, k) { return o ? o[k] : null; }, obj);
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return null;
}

// PerfectPay status → nosso evento
function mapStatus(pp) {
  var key = String(pick(pp, ['sale_status_enum_key', 'status', 'sale_status']) || '').toLowerCase();
  var num = Number(pick(pp, ['sale_status_enum', 'status_id']) || 0);
  if (/approved|paid|completed|pix_paid|boleto_paid/.test(key) || num === 2) return 'Purchase';
  if (/refund|reversed|charge.?back/.test(key) || num === 4 || num === 5) return 'Refund';
  return null;
}

async function sendMetaCapi(event, pixelId, token, testCode) {
  if (!pixelId || !token) return { skipped: 'no_meta_creds' };
  var body = { data: [event] };
  if (testCode) body.test_event_code = testCode;
  var url = 'https://graph.facebook.com/v20.0/' + encodeURIComponent(pixelId) +
            '/events?access_token=' + encodeURIComponent(token);
  try {
    var r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return { ok: r.ok, status: r.status, body: await r.json().catch(function () { return {}; }) };
  } catch (e) { return { ok: false, error: String(e.message || e) }; }
}

async function sendTikTokApi(event, pixelId, token, testCode) {
  if (!pixelId || !token) return { skipped: 'no_tiktok_creds' };
  var body = { event_source: 'web', event_source_id: pixelId, data: [event] };
  if (testCode) body.test_event_code = testCode;
  try {
    var r = await fetch('https://business-api.tiktok.com/open_api/v1.3/event/track/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Access-Token': token },
      body: JSON.stringify(body)
    });
    return { ok: r.ok, status: r.status, body: await r.json().catch(function () { return {}; }) };
  } catch (e) { return { ok: false, error: String(e.message || e) }; }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ ok: false, error: 'method' }); return; }

  let pp;
  try { pp = await readBody(req); }
  catch (e) { res.status(400).json({ ok: false, error: 'bad_json' }); return; }

  // 1) Validação do token (obrigatória)
  var expectedToken = process.env.PERFECTPAY_WEBHOOK_TOKEN;
  if (!expectedToken) { res.status(500).json({ ok: false, error: 'env_missing_PERFECTPAY_WEBHOOK_TOKEN' }); return; }
  var sentToken = pick(pp, ['token', 'webhook_token']);
  if (sentToken !== expectedToken) {
    res.status(401).json({ ok: false, error: 'invalid_token' });
    return;
  }

  // 2) Detecta evento (Purchase / Refund / ignorar)
  var eventName = mapStatus(pp);
  if (!eventName) {
    res.status(200).json({ ok: true, skipped: 'status_not_mapped', status: pick(pp, ['sale_status_enum_key']) });
    return;
  }

  // 3) Recupera dados do clique original (vieram via querystring → postback)
  var eventId = pick(pp, ['event_id', 'src', 'utm_content']) || crypto.randomUUID();
  var fbclid  = pick(pp, ['fbclid']);
  var ttclid  = pick(pp, ['ttclid']);
  var gclid   = pick(pp, ['gclid']);

  // 4) Dados financeiros (value = sale_amount bruto conforme decidido)
  var saleAmount = Number(pick(pp, ['sale_amount', 'amount', 'total_amount']) || 0);
  var commission = Number(pick(pp, ['commission_amount', 'producer_amount']) || 0);
  var currency   = pick(pp, ['currency_enum_key', 'currency']) || 'BRL';
  var orderCode  = pick(pp, ['code', 'transaction_id', 'sale_id']) || null;

  // 5) PII do cliente (será hashed)
  var email      = pick(pp, ['customer.email', 'email']);
  var phone      = pick(pp, ['customer.phone_formated', 'customer.phone', 'phone']);
  var fullName   = pick(pp, ['customer.full_name', 'customer.name', 'full_name']);
  var fn = null, ln = null;
  if (fullName) {
    var parts = String(fullName).trim().split(/\s+/);
    fn = parts.shift(); ln = parts.join(' ');
  }

  // 6) Catálogo de produto
  var productCode = pick(pp, ['product.code', 'product.id', 'product_code']);
  var productName = pick(pp, ['product.name', 'product_name']);

  var nowSec = Math.floor(Date.now() / 1000);

  // 7) Monta evento Meta CAPI
  var metaUserData = {};
  if (email) metaUserData.em = [sha256(email)];
  if (phone) metaUserData.ph = [sha256(String(phone).replace(/\D/g, ''))];
  if (fn)    metaUserData.fn = [sha256(fn)];
  if (ln)    metaUserData.ln = [sha256(ln)];
  if (fbclid) metaUserData.fbc = 'fb.1.' + nowSec + '.' + fbclid;
  // _fbp não temos no webhook (cookie só client) — ok, Meta aceita sem
  var metaEvent = {
    event_name: eventName,
    event_time: nowSec,
    event_id: eventId,                 // dedup se Pixel client também tiver disparado (raro nesse fluxo)
    event_source_url: pick(pp, ['referrer_url']) || null,
    action_source: eventName === 'Refund' ? 'system_generated' : 'website',
    user_data: metaUserData,
    custom_data: {
      value: eventName === 'Refund' ? -saleAmount : saleAmount,
      currency: currency,
      gross_price: saleAmount,
      commission: commission,
      order_id: orderCode,
      content_ids: productCode ? [productCode] : undefined,
      content_name: productName,
      content_type: 'product',
      adapter: 'perfectpay'
    }
  };

  // 8) Monta evento TikTok Events API
  var ttUser = {};
  if (email) ttUser.email = [sha256(email)];
  if (phone) ttUser.phone = [sha256('+' + String(phone).replace(/\D/g, ''))];
  if (fn)    ttUser.first_name = [sha256(fn)];
  if (ln)    ttUser.last_name  = [sha256(ln)];
  if (ttclid) ttUser.ttclid = ttclid;
  var ttEvent = {
    event: eventName === 'Refund' ? 'Refund' : 'CompletePayment',  // TikTok não tem "Refund" oficial — vai como custom
    event_time: nowSec,
    event_id: eventId,
    user: ttUser,
    properties: {
      value: saleAmount,
      currency: currency,
      contents: productCode ? [{
        content_id: productCode,
        content_name: productName,
        content_type: 'product',
        quantity: 1,
        price: saleAmount
      }] : undefined,
      order_id: orderCode
    }
  };

  // 9) Dispara em paralelo
  var meta = await sendMetaCapi(
    metaEvent, process.env.PIXEL_ID, process.env.CAPI_TOKEN, process.env.CAPI_TEST_CODE
  );
  var tt = await sendTikTokApi(
    ttEvent, process.env.TIKTOK_PIXEL_ID, process.env.TIKTOK_ACCESS_TOKEN, process.env.TIKTOK_TEST_CODE
  );

  res.status(200).json({
    ok: true,
    event: eventName,
    event_id: eventId,
    order: orderCode,
    sale_amount: saleAmount,
    meta: meta,
    tiktok: tt
  });
};
