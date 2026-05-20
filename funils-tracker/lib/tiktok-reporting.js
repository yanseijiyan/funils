/* lib/tiktok-reporting — TikTok Marketing API: relatório de Ads (gasto/impressões/cliques)
 *
 * Endpoint: GET /open_api/v1.3/report/integrated/get/
 * Docs: https://business-api.tiktok.com/portal/docs (Reporting → Synchronous report)
 *
 * Puxa stats por campanha / conjunto / anúncio, com breakdown diário (stat_time_day),
 * pra alimentar a tabela `ad_stats` que o dashboard usa pra CPC/CPM/CTR/CPA/ROAS.
 */
const BASE = 'https://business-api.tiktok.com/open_api/v1.3';

async function fetchReport({ token, advertiserId, dataLevel, dimensions, metrics, startDate, endDate }) {
  const params = new URLSearchParams({
    advertiser_id: advertiserId,
    report_type: 'BASIC',
    data_level: dataLevel,
    dimensions: JSON.stringify(dimensions),
    metrics: JSON.stringify(metrics),
    start_date: startDate,
    end_date: endDate,
    page_size: '1000'
  });
  const r = await fetch(BASE + '/report/integrated/get/?' + params.toString(), {
    headers: { 'Access-Token': token }
  });
  const json = await r.json().catch(() => ({}));
  if (json.code !== 0) {
    throw new Error('tiktok_report code=' + json.code + ' msg=' + (json.message || 'unknown'));
  }
  return (json.data && json.data.list) || [];
}

/* Retorna linhas normalizadas: { level, ref_id, stat_date, name, campaign_id, adset_id, spend, impressions, clicks } */
async function getAdStats({ token, advertiserId, startDate, endDate }) {
  const LEVELS = [
    {
      level: 'campaign', dataLevel: 'AUCTION_CAMPAIGN',
      dimensions: ['campaign_id', 'stat_time_day'],
      metrics: ['campaign_name', 'spend', 'impressions', 'clicks']
    },
    {
      level: 'adset', dataLevel: 'AUCTION_ADGROUP',
      dimensions: ['adgroup_id', 'stat_time_day'],
      metrics: ['adgroup_name', 'campaign_id', 'campaign_name', 'spend', 'impressions', 'clicks']
    },
    {
      level: 'ad', dataLevel: 'AUCTION_AD',
      dimensions: ['ad_id', 'stat_time_day'],
      metrics: ['ad_name', 'adgroup_id', 'adgroup_name', 'campaign_id', 'campaign_name', 'spend', 'impressions', 'clicks']
    }
  ];
  const out = [];
  for (const L of LEVELS) {
    const list = await fetchReport({
      token, advertiserId, dataLevel: L.dataLevel,
      dimensions: L.dimensions, metrics: L.metrics, startDate, endDate
    });
    for (const row of list) {
      const d = row.dimensions || {};
      const m = row.metrics || {};
      const refId = d.campaign_id || d.adgroup_id || d.ad_id;
      if (!refId) continue;
      out.push({
        level: L.level,
        ref_id: String(refId),
        stat_date: String(d.stat_time_day || '').slice(0, 10),
        name: m.campaign_name || m.adgroup_name || m.ad_name || null,
        campaign_id: m.campaign_id ? String(m.campaign_id) : (L.level === 'campaign' ? String(refId) : null),
        adset_id: m.adgroup_id ? String(m.adgroup_id) : (L.level === 'adset' ? String(refId) : null),
        spend: Number(m.spend || 0),
        impressions: Number(m.impressions || 0),
        clicks: Number(m.clicks || 0)
      });
    }
  }
  return out;
}

module.exports = { getAdStats };
