/* lib/tenant — resolve tenant_id → config completa (JSON público + tokens via env)
 *
 * Naming convention env vars:
 *   TENANT_<UPPER_NO_DASHES>_CAPI_TOKEN
 *   TENANT_<UPPER_NO_DASHES>_TIKTOK_ACCESS_TOKEN
 *   TENANT_<UPPER_NO_DASHES>_PERFECTPAY_TOKEN
 *   TENANT_<UPPER_NO_DASHES>_SHOPIFY_WEBHOOK_SECRET
 *   TENANT_<UPPER_NO_DASHES>_CAPI_TEST_CODE
 *   TENANT_<UPPER_NO_DASHES>_TIKTOK_TEST_CODE
 *
 * Fallback: DEFAULT_<SUFFIX> se tenant não tiver env próprio.
 *
 * Exemplo: tenant "cliente-4" → TENANT_CLIENTE4_CAPI_TOKEN
 */
const fs = require('fs');
const path = require('path');

let cache = null;
function loadTenants() {
  if (cache) return cache;
  try {
    cache = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'tenants.json'), 'utf8'));
  } catch (e) {
    cache = {};
  }
  return cache;
}

function envKey(tenantId, suffix) {
  const upper = String(tenantId).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return `TENANT_${upper}_${suffix}`;
}

function envOrDefault(tenantId, suffix) {
  if (tenantId) {
    const v = process.env[envKey(tenantId, suffix)];
    if (v) return v;
  }
  return process.env[`DEFAULT_${suffix}`] || null;
}

function getTenant(tenantId) {
  const all = loadTenants();
  const cfg = (tenantId && !tenantId.startsWith('_') && all[tenantId]) || {};
  return {
    id: tenantId || null,
    meta_pixel_id:    cfg.meta_pixel_id    || null,
    tiktok_pixel_id:  cfg.tiktok_pixel_id  || null,
    platform:         cfg.platform         || null,
    commission_rate:  typeof cfg.commission_rate === 'number' ? cfg.commission_rate : 1,
    content_category: cfg.content_category || null,
    products:         cfg.products         || {},
    shopify_domain:   cfg.shopify_domain   || null,
    capi_token:           envOrDefault(tenantId, 'CAPI_TOKEN'),
    tiktok_access_token:  envOrDefault(tenantId, 'TIKTOK_ACCESS_TOKEN'),
    perfectpay_token:     envOrDefault(tenantId, 'PERFECTPAY_TOKEN'),
    shopify_secret:       envOrDefault(tenantId, 'SHOPIFY_WEBHOOK_SECRET'),
    capi_test_code:       envOrDefault(tenantId, 'CAPI_TEST_CODE'),
    tiktok_test_code:     envOrDefault(tenantId, 'TIKTOK_TEST_CODE')
  };
}

/* Lookup reverso: webhook recebe token na URL/header → descobre qual tenant é dono dele */
function tenantByPerfectPayToken(token) {
  if (!token) return null;
  const all = loadTenants();
  for (const id of Object.keys(all)) {
    if (id.startsWith('_')) continue;
    if (envOrDefault(id, 'PERFECTPAY_TOKEN') === token) return id;
  }
  return null;
}

/* Lookup por domínio Shopify (webhook Shopify identifica loja via x-shopify-shop-domain) */
function tenantByShopifyDomain(domain) {
  if (!domain) return null;
  const all = loadTenants();
  for (const id of Object.keys(all)) {
    if (id.startsWith('_')) continue;
    if (all[id].shopify_domain === domain) return id;
  }
  return null;
}

module.exports = { getTenant, tenantByPerfectPayToken, tenantByShopifyDomain, loadTenants };
