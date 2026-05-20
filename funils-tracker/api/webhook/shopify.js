/* api/webhook/shopify — webhook Shopify "Order creation" multi-tenant
 *
 * URL pra configurar no Shopify Admin (Settings → Notifications → Webhooks):
 *   https://funils-tracker.vercel.app/api/webhook/shopify?tenant=minha-loja
 *
 * Tenant resolution (em ordem):
 *   1. ?tenant=minha-loja na URL                       (recomendado, explícito)
 *   2. Header X-Shopify-Shop-Domain → tenantByShopifyDomain (precisa shopify_domain no tenants.json)
 *
 * Validação: HMAC-SHA256 do corpo cru (raw body) com TENANT_<NOME>_SHOPIFY_WEBHOOK_SECRET,
 * em base64, comparado com o header X-Shopify-Hmac-Sha256.
 *
 * Tópicos suportados (header X-Shopify-Topic):
 *   orders/create, orders/paid          → Purchase
 *   refunds/create, orders/refunded     → Refund
 *
 * Click IDs (ttclid/ttp/fbclid/utm_*) chegam via note_attributes do pedido —
 * preenchidos pelo snippet "BB TRACKER BRIDGE" no theme.liquid (cart.attributes).
 * Fallback: parse da query string em landing_site.
 */
const crypto = require('crypto');
const { getTenant, tenantByShopifyDomain } = require('../../lib/tenant');
const { sha256, digitsOnly } = require('../../lib/hash');
const { sendMetaCapi } = require('../../lib/meta-capi');
const { sendTikTokEvents } = require('../../lib/tiktok-events');
const { recordSale } = require('../../lib/sales');

/* Lê o corpo CRU da request (necessário pro HMAC — re-serializar JSON não bate).
 * Lemos o stream ANTES de tocar em req.body (no Vercel req.body é um getter lazy
 * que consome o stream ao ser acessado). */
function readRawBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    let settled = false;
    const finish = () => { if (settled) return; settled = true; resolve(Buffer.concat(chunks)); };
    req.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    req.on('end', finish);
    req.on('error', finish);
    setImmediate(() => { if (chunks.length === 0 && (req.readableEnded || req.complete)) finish(); });
  });
}

function verifyHmac(rawBuf, secret, headerHmac) {
  if (!secret || !headerHmac) return false;
  const digest = crypto.createHmac('sha256', secret).update(rawBuf).digest('base64');
  const a = Buffer.from(digest);
  const b = Buffer.from(String(headerHmac));
  if (a.length !== b.length) return false;
  try { return crypto.timingSafeEqual(a, b); } catch (e) { return false; }
}

function pick(obj, paths) {
  for (let i = 0; i < paths.length; i++) {
    const v = paths[i].split('.').reduce((o, k) => (o ? o[k] : null), obj);
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return null;
}

/* note_attributes: [{name,value}] → { name: value } */
function noteAttrs(order) {
  const out = {};
  const arr = order && order.note_attributes;
  if (Array.isArray(arr)) {
    arr.forEach((a) => { if (a && a.name) out[a.name] = a.value; });
  }
  return out;
}

/* Tópico Shopify → evento canônico */
function mapTopic(topic) {
  const t = String(topic || '').toLowerCase();
  if (t === 'orders/create' || t === 'orders/paid') return 'Purchase';
  if (t === 'refunds/create' || t === 'orders/refunded') return 'Refund';
  return null;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ ok: false, error: 'method' }); return; }

  /* 1. Corpo cru + parse */
  const rawBuf = await readRawBody(req);
  let payload;
  try { payload = JSON.parse(rawBuf.toString('utf8') || '{}'); }
  catch (e) { res.status(400).json({ ok: false, error: 'bad_json' }); return; }

  /* 2. Resolve tenant */
  const queryUrl = new URL(req.url, 'http://x');
  const shopDomain = req.headers['x-shopify-shop-domain'] || null;
  let tenantId = queryUrl.searchParams.get('tenant')
    || tenantByShopifyDomain(shopDomain)
    || null;
  if (!tenantId) {
    res.status(401).json({ ok: false, error: 'cannot_resolve_tenant', shop: shopDomain });
    return;
  }
  const tenant = getTenant(tenantId);

  /* 3. Valida assinatura HMAC */
  if (!tenant.shopify_secret) {
    res.status(500).json({
      ok: false,
      error: 'env_missing_TENANT_' + tenantId.toUpperCase().replace(/[^A-Z0-9]/g, '') + '_SHOPIFY_WEBHOOK_SECRET'
    });
    return;
  }
  const hmacHeader = req.headers['x-shopify-hmac-sha256'];
  if (!verifyHmac(rawBuf, tenant.shopify_secret, hmacHeader)) {
    res.status(401).json({ ok: false, error: 'invalid_hmac', tenant: tenantId });
    return;
  }

  /* 4. Mapeia tópico → evento */
  const topic = req.headers['x-shopify-topic'];
  const eventName = mapTopic(topic);
  if (!eventName) {
    res.status(200).json({ ok: true, skipped: 'topic_not_mapped', tenant: tenantId, topic });
    return;
  }
  const isTest = String(req.headers['x-shopify-test'] || '').toLowerCase() === 'true';

  /* 5. Extrai dados do pedido */
  const isRefund = eventName === 'Refund';
  // refunds/create traz objeto Refund; orders/* traz objeto Order
  const order = isRefund && payload.order ? payload.order : payload;
  const attrs = noteAttrs(order);

  // valor: refund soma transactions; order usa total_price
  let amount = 0;
  if (isRefund && Array.isArray(payload.transactions)) {
    amount = payload.transactions.reduce((s, t) => s + Number(t.amount || 0), 0);
  } else {
    amount = Number(pick(order, ['current_total_price', 'total_price', 'subtotal_price']) || 0);
  }
  const currency  = pick(order, ['presentment_currency', 'currency']) || 'USD';
  const orderId   = String(pick(order, ['id', 'order_id']) || pick(payload, ['order_id', 'id']) || '');
  const orderName = pick(order, ['name', 'order_number']);

  // click ids: note_attributes primeiro, fallback landing_site query
  function param(name) {
    if (attrs[name]) return attrs[name];
    const ls = pick(order, ['landing_site']);
    if (ls) { try { return new URL(ls, 'http://x').searchParams.get(name); } catch (e) {} }
    return null;
  }
  const ttclid = param('ttclid');
  const ttp    = attrs.ttp || null;
  const fbclid = param('fbclid');
  const fbc    = attrs._fbc || (fbclid ? null : null);
  const fbp    = attrs._fbp || null;

  // PII
  const cust  = order.customer || {};
  const addr  = order.billing_address || order.shipping_address || cust.default_address || {};
  const email = pick(order, ['email', 'contact_email']) || cust.email || null;
  const phone = pick(order, ['phone']) || cust.phone || addr.phone || null;
  const fn    = cust.first_name || addr.first_name || null;
  const ln    = cust.last_name  || addr.last_name  || null;
  const city  = addr.city || null;
  const state = addr.province_code || addr.province || null;
  const zip   = addr.zip || null;
  const country = addr.country_code || addr.country || null;

  const client = order.client_details || {};
  const nowSec = Math.floor(Date.now() / 1000);
  let eventTime = nowSec;
  const createdAt = pick(order, ['processed_at', 'created_at']);
  if (createdAt) {
    const t = Math.floor(new Date(createdAt).getTime() / 1000);
    if (!isNaN(t) && t > 0) eventTime = t;
  }
  // event_id determinístico → dedup com o Custom Pixel do Shopify
  const eventId = (isRefund ? 'refund_' : 'order_') + orderId;

  // line items → contents
  const items = Array.isArray(order.line_items) ? order.line_items : [];
  const metaContents = items.map((li) => ({
    id: String(li.product_id || li.variant_id || li.sku || ''),
    quantity: Number(li.quantity || 1),
    item_price: Number(li.price || 0)
  }));
  const ttContents = items.map((li) => ({
    content_id: String(li.product_id || li.variant_id || li.sku || ''),
    content_name: li.title || li.name || null,
    content_type: 'product',
    quantity: Number(li.quantity || 1),
    price: Number(li.price || 0)
  }));
  const contentIds = items
    .map((li) => String(li.product_id || li.variant_id || li.sku || ''))
    .filter(Boolean);

  /* 6. Monta evento Meta */
  const metaUd = {};
  if (email)   metaUd.em = [sha256(email)];
  if (phone)   metaUd.ph = [sha256(digitsOnly(phone))];
  if (fn)      metaUd.fn = [sha256(fn)];
  if (ln)      metaUd.ln = [sha256(ln)];
  if (city)    metaUd.ct = [sha256(city)];
  if (state)   metaUd.st = [sha256(state)];
  if (zip)     metaUd.zp = [sha256(digitsOnly(zip))];
  if (country) metaUd.country = [sha256(country)];
  if (orderId) metaUd.external_id = [sha256(orderId)];
  if (fbp) metaUd.fbp = fbp;
  if (fbc) metaUd.fbc = fbc;
  else if (fbclid) metaUd.fbc = 'fb.1.' + nowSec + '.' + fbclid;
  if (client.browser_ip) metaUd.client_ip_address = client.browser_ip;
  if (client.user_agent) metaUd.client_user_agent = client.user_agent;
  const metaEvent = {
    event_name: eventName,
    event_time: eventTime,
    event_id: eventId,
    action_source: isRefund ? 'system_generated' : 'website',
    user_data: metaUd,
    custom_data: {
      value: isRefund ? -amount : amount,
      currency,
      order_id: orderId,
      content_ids: contentIds.length ? contentIds : undefined,
      contents: metaContents.length ? metaContents : undefined,
      content_type: 'product',
      num_items: items.reduce((s, li) => s + Number(li.quantity || 1), 0) || undefined,
      tenant: tenantId,
      source: 'shopify_webhook'
    }
  };

  /* 7. Monta evento TikTok (Purchase vira CompletePayment via ALIAS na lib) */
  const ttUser = {};
  if (email)   ttUser.email = [sha256(email)];
  if (phone)   ttUser.phone = [sha256('+' + digitsOnly(phone))];
  if (fn)      ttUser.first_name = [sha256(fn)];
  if (ln)      ttUser.last_name  = [sha256(ln)];
  if (city)    ttUser.city = [sha256(city)];
  if (state)   ttUser.state = [sha256(state)];
  if (zip)     ttUser.zip_code = [sha256(digitsOnly(zip))];
  if (country) ttUser.country = [sha256(country)];
  if (orderId) ttUser.external_id = [sha256(orderId)];
  if (ttp)    ttUser.ttp = ttp;
  if (ttclid) ttUser.ttclid = ttclid;
  if (client.browser_ip) ttUser.ip = client.browser_ip;
  if (client.user_agent) ttUser.user_agent = client.user_agent;
  const ttEvent = {
    event: isRefund ? 'Refund' : 'Purchase',
    event_time: eventTime,
    event_id: eventId,
    user: ttUser,
    properties: {
      value: amount,
      currency,
      contents: ttContents.length ? ttContents : undefined,
      content_type: 'product',
      order_id: orderId
    }
  };

  /* 8. Dispara em paralelo: Meta CAPI + TikTok Events + INSERT no Postgres */
  const [meta, tiktok, db] = await Promise.all([
    sendMetaCapi({
      pixelId: tenant.meta_pixel_id, token: tenant.capi_token,
      event: metaEvent, testCode: tenant.capi_test_code
    }),
    sendTikTokEvents({
      pixelId: tenant.tiktok_pixel_id, token: tenant.tiktok_access_token,
      event: ttEvent, testCode: tenant.tiktok_test_code
    }),
    recordSale({
      order_id: orderId || eventId,
      tenant: tenantId,
      status: isRefund ? 'refunded' : 'approved',
      value: isRefund ? -amount : amount,
      currency,
      utm_source:   param('utm_source'),
      utm_medium:   param('utm_medium'),
      utm_campaign: param('utm_campaign'),
      utm_content:  param('utm_content'),
      utm_term:     param('utm_term'),
      ttclid, fbclid,
      product_id: contentIds[0] || null,
      product_name: items[0] ? (items[0].title || items[0].name) : null,
      customer_email_hash: email ? sha256(email) : null,
      customer_phone_hash: phone ? sha256(digitsOnly(phone)) : null,
      raw: payload
    })
  ]);

  res.status(200).json({
    ok: true,
    tenant: tenantId,
    event: eventName,
    event_id: eventId,
    order: orderName || orderId,
    value: amount,
    currency,
    test: isTest,
    meta, tiktok, db
  });
};
