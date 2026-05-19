/* api/webhook/perfectpay — postback PerfectPay multi-tenant
 *
 * URL pra configurar no painel PerfectPay:
 *   https://funils-tracker.vercel.app/api/webhook/perfectpay?tenant=cliente-4
 *
 * Tenant resolution (em ordem):
 *   1. ?tenant=cliente-4 na URL                  (recomendado, explícito)
 *   2. Header X-Tenant: cliente-4
 *   3. lookup reverso: por TENANT_<NOME>_PERFECTPAY_TOKEN (token no body bate com algum tenant)
 *
 * Token validação: payload.token deve bater com tenant.perfectpay_token
 * (mesmo token que você colou no painel PerfectPay e em TENANT_<NOME>_PERFECTPAY_TOKEN)
 */
const crypto = require('crypto');
const { getTenant, tenantByPerfectPayToken } = require('../../lib/tenant');
const { sha256, digitsOnly, readJson } = require('../../lib/hash');
const { sendMetaCapi } = require('../../lib/meta-capi');
const { sendTikTokEvents } = require('../../lib/tiktok-events');
const { recordSale } = require('../../lib/sales');

function pick(obj, paths) {
  for (let i = 0; i < paths.length; i++) {
    const v = paths[i].split('.').reduce((o, k) => (o ? o[k] : null), obj);
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return null;
}

function mapStatus(pp) {
  const key = String(pick(pp, ['sale_status_enum_key', 'status', 'sale_status']) || '').toLowerCase();
  const num = Number(pick(pp, ['sale_status_enum', 'status_id']) || 0);
  if (/approved|paid|completed|pix_paid|boleto_paid/.test(key) || num === 2) return 'Purchase';
  if (/refund|reversed|charge.?back/.test(key) || num === 4 || num === 5) return 'Refund';
  return null;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ ok: false, error: 'method' }); return; }

  let pp;
  try { pp = await readJson(req); }
  catch (e) { res.status(400).json({ ok: false, error: 'bad_json' }); return; }

  /* 1. Resolve tenant */
  const queryUrl = new URL(req.url, 'http://x');
  let tenantId = queryUrl.searchParams.get('tenant') || req.headers['x-tenant'] || null;
  const tokenInBody = pick(pp, ['token', 'webhook_token']);
  if (!tenantId) tenantId = tenantByPerfectPayToken(tokenInBody);
  if (!tenantId) {
    res.status(401).json({ ok: false, error: 'cannot_resolve_tenant' });
    return;
  }
  const tenant = getTenant(tenantId);

  /* 2. Valida token */
  if (!tenant.perfectpay_token) {
    res.status(500).json({ ok: false, error: 'env_missing_TENANT_' + tenantId.toUpperCase().replace(/[^A-Z0-9]/g, '') + '_PERFECTPAY_TOKEN' });
    return;
  }
  if (tokenInBody !== tenant.perfectpay_token) {
    res.status(401).json({ ok: false, error: 'invalid_token', tenant: tenantId });
    return;
  }

  /* 3. Mapeia status → evento */
  const eventName = mapStatus(pp);
  if (!eventName) {
    res.status(200).json({ ok: true, skipped: 'status_not_mapped', tenant: tenantId, status: pick(pp, ['sale_status_enum_key']) });
    return;
  }

  /* 4. Recupera dados do clique original (passados via querystring → postback) */
  const eventId = pick(pp, ['event_id', 'src', 'utm_content']) || crypto.randomUUID();
  const fbclid  = pick(pp, ['fbclid']);
  const ttclid  = pick(pp, ['ttclid']);

  const saleAmount = Number(pick(pp, ['sale_amount', 'amount', 'total_amount']) || 0);
  const commission = Number(pick(pp, ['commission_amount', 'producer_amount']) || 0);
  const currency   = pick(pp, ['currency_enum_key', 'currency']) || 'BRL';
  const orderCode  = pick(pp, ['code', 'transaction_id', 'sale_id']) || null;

  const email    = pick(pp, ['customer.email', 'email']);
  const phone    = pick(pp, ['customer.phone_formated', 'customer.phone', 'phone']);
  const fullName = pick(pp, ['customer.full_name', 'customer.name', 'full_name']);
  let fn = null, ln = null;
  if (fullName) {
    const parts = String(fullName).trim().split(/\s+/);
    fn = parts.shift(); ln = parts.join(' ');
  }
  const productCode = pick(pp, ['product.code', 'product.id', 'product_code']);
  const productName = pick(pp, ['product.name', 'product_name']);
  const nowSec = Math.floor(Date.now() / 1000);

  /* 5. Meta event */
  const metaUd = {};
  if (email) metaUd.em = [sha256(email)];
  if (phone) metaUd.ph = [sha256(digitsOnly(phone))];
  if (fn)    metaUd.fn = [sha256(fn)];
  if (ln)    metaUd.ln = [sha256(ln)];
  if (fbclid) metaUd.fbc = 'fb.1.' + nowSec + '.' + fbclid;
  const metaEvent = {
    event_name: eventName,
    event_time: nowSec,
    event_id: eventId,
    action_source: eventName === 'Refund' ? 'system_generated' : 'website',
    user_data: metaUd,
    custom_data: {
      value: eventName === 'Refund' ? -saleAmount : saleAmount,
      currency,
      gross_price: saleAmount,
      commission,
      order_id: orderCode,
      content_ids: productCode ? [productCode] : undefined,
      content_name: productName,
      content_type: 'product',
      tenant: tenantId,
      source: 'perfectpay_webhook'
    }
  };

  /* 6. TikTok event */
  const ttUser = {};
  if (email) ttUser.email = [sha256(email)];
  if (phone) ttUser.phone = [sha256('+' + digitsOnly(phone))];
  if (fn)    ttUser.first_name = [sha256(fn)];
  if (ln)    ttUser.last_name  = [sha256(ln)];
  if (ttclid) ttUser.ttclid = ttclid;
  const ttEvent = {
    event: eventName === 'Refund' ? 'Refund' : 'Purchase',
    event_time: nowSec,
    event_id: eventId,
    user: ttUser,
    properties: {
      value: saleAmount,
      currency,
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

  /* 7. Dispara em paralelo: Meta CAPI + TikTok Events + INSERT no Postgres */
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
      order_id: orderCode || eventId,
      tenant: tenantId,
      status: eventName === 'Refund' ? 'refunded' : 'approved',
      value: eventName === 'Refund' ? -saleAmount : saleAmount,
      currency,
      utm_source:   pick(pp, ['utm_source']),
      utm_medium:   pick(pp, ['utm_medium']),
      utm_campaign: pick(pp, ['utm_campaign']),
      utm_content:  pick(pp, ['utm_content']),
      utm_term:     pick(pp, ['utm_term']),
      ttclid, fbclid,
      product_id: productCode,
      product_name: productName,
      customer_email_hash: email ? sha256(email) : null,
      customer_phone_hash: phone ? sha256(digitsOnly(phone)) : null,
      raw: pp
    })
  ]);

  res.status(200).json({
    ok: true,
    tenant: tenantId,
    event: eventName,
    event_id: eventId,
    order: orderCode,
    sale_amount: saleAmount,
    meta, tiktok, db
  });
};
