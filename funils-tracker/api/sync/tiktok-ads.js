/* api/sync/tiktok-ads — sincroniza gasto de Ads do TikTok pra tabela `ad_stats`.
 *
 * Chamado por um cron externo (cron-job.org) a cada ~15-30min, OU pelo botão
 * "Atualizar gasto" do dashboard.
 *
 * URL:  GET /api/sync/tiktok-ads?tenant=<id>&key=<SYNC_SECRET>&days=7
 *
 * Auth: ?key= (ou header X-Sync-Key) deve bater com a env SYNC_SECRET.
 * Config do tenant:
 *   - tiktok_advertiser_id  → no tenants.json
 *   - TENANT_<NOME>_TIKTOK_MARKETING_TOKEN → env (token da Marketing API)
 */
const { getTenant } = require('../../lib/tenant');
const { getAdStats } = require('../../lib/tiktok-reporting');
const { upsertAdStats } = require('../../lib/ad-stats');

function ymd(d) { return d.toISOString().slice(0, 10); }

module.exports = async function handler(req, res) {
  const url = new URL(req.url, 'http://x');
  const tenantId = url.searchParams.get('tenant');
  const key = url.searchParams.get('key') || req.headers['x-sync-key'];

  /* 1. Auth */
  if (!process.env.SYNC_SECRET) {
    res.status(500).json({ ok: false, error: 'env_missing_SYNC_SECRET' });
    return;
  }
  if (key !== process.env.SYNC_SECRET) {
    res.status(401).json({ ok: false, error: 'invalid_sync_key' });
    return;
  }
  if (!tenantId) {
    res.status(400).json({ ok: false, error: 'missing_tenant' });
    return;
  }

  /* 2. Config do tenant */
  const tenant = getTenant(tenantId);
  const envName = 'TENANT_' + tenantId.toUpperCase().replace(/[^A-Z0-9]/g, '') + '_TIKTOK_MARKETING_TOKEN';
  if (!tenant.tiktok_marketing_token) {
    res.status(500).json({ ok: false, error: 'env_missing_' + envName });
    return;
  }
  if (!tenant.tiktok_advertiser_id || tenant.tiktok_advertiser_id === 'PREENCHER') {
    res.status(500).json({ ok: false, error: 'missing_tiktok_advertiser_id_no_tenants_json', tenant: tenantId });
    return;
  }

  /* 3. Janela de datas (default: últimos 7 dias, máx 30) */
  const days = Math.min(Math.max(Number(url.searchParams.get('days') || 7), 1), 30);
  const end = new Date();
  const start = new Date(Date.now() - (days - 1) * 86400000);

  /* 4. Puxa do TikTok e grava */
  try {
    const rows = await getAdStats({
      token: tenant.tiktok_marketing_token,
      advertiserId: tenant.tiktok_advertiser_id,
      startDate: ymd(start),
      endDate: ymd(end)
    });
    const db = await upsertAdStats(tenantId, rows);
    res.status(200).json({
      ok: true,
      tenant: tenantId,
      window: { start: ymd(start), end: ymd(end) },
      fetched: rows.length,
      db
    });
  } catch (e) {
    res.status(502).json({ ok: false, tenant: tenantId, error: String((e && e.message) || e) });
  }
};
