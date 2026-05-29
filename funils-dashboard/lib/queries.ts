/* Queries agregadas pro dashboard. Todas aceitam filtros opcionais. */
import { sql, type Sale } from '@/lib/db';

export type Filters = {
  tenant?: string;
  from?: string; // YYYY-MM-DD
  to?: string;
  campaign?: string; // utm_campaign
};

/* Fuso da operação — "hoje" é o dia comercial no Brasil. */
export const DASHBOARD_TZ = 'America/Sao_Paulo';

/* Data de hoje (YYYY-MM-DD) no fuso da operação. Funciona no server (UTC). */
export function tzToday(tz: string = DASHBOARD_TZ): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}

/* Aplica o default: sem período na URL → só o dia de hoje (fuso BR).
   Se vier qualquer ponta (from ou to), respeita o que o usuário escolheu. */
export function resolveFilters(raw: Filters): Filters {
  const campaign = raw.campaign?.trim() || undefined;
  const from = raw.from?.trim() || '';
  const to = raw.to?.trim() || '';
  if (from || to) {
    return { tenant: raw.tenant, campaign, from: from || undefined, to: to || undefined };
  }
  const today = tzToday();
  return { tenant: raw.tenant, campaign, from: today, to: today };
}

function whereSales(f: Filters) {
  return {
    tenant: f.tenant || null,
    from: f.from || null,
    to: f.to || null,
    campaign: f.campaign || null
  };
}

export async function getTenants(): Promise<string[]> {
  try {
    const rows = await sql`
      SELECT DISTINCT tenant FROM events
      UNION
      SELECT DISTINCT tenant FROM sales
      ORDER BY 1
    `;
    return rows.map((r) => String(r.tenant));
  } catch {
    return [];
  }
}

/* Cards: totais de evento por nome (PageView/ViewContent/Lead/Purchase) */
export async function getOverviewCards(f: Filters) {
  try {
    const w = whereSales(f);
    const rows = await sql`
      SELECT
        COUNT(*) FILTER (WHERE event_name = 'PageView')         AS pageviews,
        COUNT(DISTINCT session_id) FILTER (WHERE event_name = 'PageView') AS visitors,
        COUNT(*) FILTER (WHERE event_name = 'Lead')             AS leads,
        COUNT(DISTINCT session_id) FILTER (WHERE event_name = 'ADIC') AS adic,
        COUNT(*) FILTER (WHERE event_name = 'InitiateCheckout') AS checkouts
      FROM events
      WHERE (${w.tenant}::text IS NULL OR tenant = ${w.tenant})
        AND (${w.campaign}::text IS NULL OR utm_campaign = ${w.campaign})
        AND (${w.from}::date IS NULL OR ts >= ${w.from}::date)
        AND (${w.to}::date IS NULL OR ts < (${w.to}::date + INTERVAL '1 day'))
    `;
    const salesRows = await sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'approved')   AS sales,
        COUNT(*) FILTER (WHERE status = 'refunded')   AS refunds,
        COALESCE(SUM(value) FILTER (WHERE status = 'approved'), 0) AS revenue
      FROM sales
      WHERE (${w.tenant}::text IS NULL OR tenant = ${w.tenant})
        AND (${w.campaign}::text IS NULL OR utm_campaign = ${w.campaign})
        AND (${w.from}::date IS NULL OR ts >= ${w.from}::date)
        AND (${w.to}::date IS NULL OR ts < (${w.to}::date + INTERVAL '1 day'))
    `;
    const e = rows[0] || {};
    const s = salesRows[0] || {};
    return {
      pageviews: Number(e.pageviews || 0),
      visitors:  Number(e.visitors  || 0),
      leads:     Number(e.leads     || 0),
      adic:      Number(e.adic      || 0),
      checkouts: Number(e.checkouts || 0),
      sales:     Number(s.sales     || 0),
      refunds:   Number(s.refunds   || 0),
      revenue:   Number(s.revenue   || 0)
    };
  } catch (e) {
    console.error('[getOverviewCards]', e);
    return { pageviews: 0, visitors: 0, leads: 0, adic: 0, checkouts: 0, sales: 0, refunds: 0, revenue: 0 };
  }
}

/* Vendas + visitas agregadas por dia, pro gráfico de área */
export type DayPoint = { day: string; visitors: number; leads: number; sales: number; revenue: number };
export async function getSeriesByDay(f: Filters): Promise<DayPoint[]> {
  try {
    const w = whereSales(f);
    const events = await sql`
      SELECT
        DATE_TRUNC('day', ts)::date AS day,
        COUNT(DISTINCT session_id) FILTER (WHERE event_name = 'PageView') AS visitors,
        COUNT(*) FILTER (WHERE event_name = 'Lead') AS leads
      FROM events
      WHERE (${w.tenant}::text IS NULL OR tenant = ${w.tenant})
        AND (${w.campaign}::text IS NULL OR utm_campaign = ${w.campaign})
        AND (${w.from}::date IS NULL OR ts >= ${w.from}::date)
        AND (${w.to}::date IS NULL OR ts < (${w.to}::date + INTERVAL '1 day'))
      GROUP BY 1
    `;
    const sales = await sql`
      SELECT
        DATE_TRUNC('day', ts)::date AS day,
        COUNT(*) FILTER (WHERE status = 'approved') AS sales,
        COALESCE(SUM(value) FILTER (WHERE status = 'approved'), 0) AS revenue
      FROM sales
      WHERE (${w.tenant}::text IS NULL OR tenant = ${w.tenant})
        AND (${w.campaign}::text IS NULL OR utm_campaign = ${w.campaign})
        AND (${w.from}::date IS NULL OR ts >= ${w.from}::date)
        AND (${w.to}::date IS NULL OR ts < (${w.to}::date + INTERVAL '1 day'))
      GROUP BY 1
    `;
    const map = new Map<string, DayPoint>();
    for (const r of events) {
      const day = String(r.day).slice(0, 10);
      map.set(day, { day, visitors: Number(r.visitors || 0), leads: Number(r.leads || 0), sales: 0, revenue: 0 });
    }
    for (const r of sales) {
      const day = String(r.day).slice(0, 10);
      const cur = map.get(day) || { day, visitors: 0, leads: 0, sales: 0, revenue: 0 };
      cur.sales = Number(r.sales || 0);
      cur.revenue = Number(r.revenue || 0);
      map.set(day, cur);
    }
    return Array.from(map.values()).sort((a, b) => (a.day < b.day ? -1 : 1));
  } catch (e) {
    console.error('[getSeriesByDay]', e);
    return [];
  }
}

/* Breakdown por campanha (TikTok Ads: campaign / adset / ad) */
export type CampaignRow = {
  utm_source: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  visitors: number;
  leads: number;
  adic: number;
  checkouts: number;
  sales: number;
  revenue: number;
};
export async function getCampaignBreakdown(f: Filters): Promise<CampaignRow[]> {
  try {
    const w = whereSales(f);
    const rows = await sql`
      WITH ev AS (
        SELECT
          utm_source, utm_campaign, utm_content, utm_term,
          COUNT(DISTINCT session_id) FILTER (WHERE event_name = 'PageView') AS visitors,
          COUNT(*) FILTER (WHERE event_name = 'Lead') AS leads,
          COUNT(DISTINCT session_id) FILTER (WHERE event_name = 'ADIC') AS adic,
          COUNT(*) FILTER (WHERE event_name = 'InitiateCheckout') AS checkouts
        FROM events
        WHERE (${w.tenant}::text IS NULL OR tenant = ${w.tenant})
          AND (${w.from}::date IS NULL OR ts >= ${w.from}::date)
          AND (${w.to}::date IS NULL OR ts < (${w.to}::date + INTERVAL '1 day'))
        GROUP BY utm_source, utm_campaign, utm_content, utm_term
      ),
      sl AS (
        SELECT
          utm_source, utm_campaign, utm_content, utm_term,
          COUNT(*) FILTER (WHERE status = 'approved') AS sales,
          COALESCE(SUM(value) FILTER (WHERE status = 'approved'), 0) AS revenue
        FROM sales
        WHERE (${w.tenant}::text IS NULL OR tenant = ${w.tenant})
          AND (${w.from}::date IS NULL OR ts >= ${w.from}::date)
          AND (${w.to}::date IS NULL OR ts < (${w.to}::date + INTERVAL '1 day'))
        GROUP BY utm_source, utm_campaign, utm_content, utm_term
      )
      SELECT
        COALESCE(ev.utm_source, sl.utm_source)     AS utm_source,
        COALESCE(ev.utm_campaign, sl.utm_campaign) AS utm_campaign,
        COALESCE(ev.utm_content, sl.utm_content)   AS utm_content,
        COALESCE(ev.utm_term, sl.utm_term)         AS utm_term,
        COALESCE(ev.visitors, 0)  AS visitors,
        COALESCE(ev.leads, 0)     AS leads,
        COALESCE(ev.adic, 0)      AS adic,
        COALESCE(ev.checkouts, 0) AS checkouts,
        COALESCE(sl.sales, 0)     AS sales,
        COALESCE(sl.revenue, 0)   AS revenue
      FROM ev
      FULL OUTER JOIN sl USING (utm_source, utm_campaign, utm_content, utm_term)
      ORDER BY revenue DESC NULLS LAST, visitors DESC NULLS LAST
      LIMIT 500
    `;
    return rows as unknown as CampaignRow[];
  } catch (e) {
    console.error('[getCampaignBreakdown]', e);
    return [];
  }
}

/* Gasto de Ads (tabela ad_stats) agregado por nível + ref_id — pro join no breakdown */
export type AdSpendRow = {
  level: string;        // campaign | adset | ad
  ref_id: string;
  name: string | null;
  campaign_id: string | null;
  adset_id: string | null;
  spend: number;
  impressions: number;
  clicks: number;
};
export async function getAdSpend(f: Filters): Promise<AdSpendRow[]> {
  try {
    const w = whereSales(f);
    const rows = await sql`
      SELECT
        level, ref_id,
        MAX(name)        AS name,
        MAX(campaign_id) AS campaign_id,
        MAX(adset_id)    AS adset_id,
        COALESCE(SUM(spend), 0)       AS spend,
        COALESCE(SUM(impressions), 0) AS impressions,
        COALESCE(SUM(clicks), 0)      AS clicks
      FROM ad_stats
      WHERE (${w.tenant}::text IS NULL OR tenant = ${w.tenant})
        AND (${w.from}::date IS NULL OR stat_date >= ${w.from}::date)
        AND (${w.to}::date IS NULL OR stat_date <= ${w.to}::date)
      GROUP BY level, ref_id
    `;
    return rows as unknown as AdSpendRow[];
  } catch (e) {
    console.error('[getAdSpend]', e);
    return [];
  }
}

/* Quiz funnel: contagem de eventos QuizStep por step value.
   href/slug: página real onde aquele passo disparou (url mais comum do passo). */
export type FunnelStep = { label: string; count: number; href?: string; slug?: string };
export async function getQuizFunnel(f: Filters): Promise<FunnelStep[]> {
  try {
    const w = whereSales(f);
    const rows = await sql`
      SELECT
        (custom->>'step')::int AS step,
        COUNT(DISTINCT session_id) AS count,
        MODE() WITHIN GROUP (ORDER BY url) AS url
      FROM events
      WHERE event_name = 'QuizStep'
        AND (${w.tenant}::text IS NULL OR tenant = ${w.tenant})
        AND (${w.campaign}::text IS NULL OR utm_campaign = ${w.campaign})
        AND (${w.from}::date IS NULL OR ts >= ${w.from}::date)
        AND (${w.to}::date IS NULL OR ts < (${w.to}::date + INTERVAL '1 day'))
        AND custom->>'step' IS NOT NULL
      GROUP BY 1
      ORDER BY 1
    `;
    return rows.map((r) => {
      const url = r.url ? String(r.url) : undefined;
      let slug: string | undefined;
      if (url) {
        try { slug = new URL(url).pathname; } catch { slug = undefined; }
      }
      return { label: 'Passo ' + r.step, count: Number(r.count), href: url, slug };
    });
  } catch (e) {
    console.error('[getQuizFunnel]', e);
    return [];
  }
}

/* Lista de campanhas (utm_campaign) pra popular o filtro. */
export async function getCampaigns(tenant?: string): Promise<string[]> {
  try {
    const t = tenant || null;
    const rows = await sql`
      SELECT DISTINCT utm_campaign FROM events
      WHERE utm_campaign IS NOT NULL AND utm_campaign <> ''
        AND (${t}::text IS NULL OR tenant = ${t})
      ORDER BY 1
      LIMIT 500
    `;
    return rows.map((r) => String(r.utm_campaign));
  } catch (e) {
    console.error('[getCampaigns]', e);
    return [];
  }
}

/* VSL retention: contagem por milestone (25/50/75/100) */
export async function getVslRetention(f: Filters): Promise<FunnelStep[]> {
  try {
    const w = whereSales(f);
    const rows = await sql`
      SELECT event_name, COUNT(DISTINCT session_id) AS count
      FROM events
      WHERE event_name IN ('VSLPlay','VSL_25','VSL_50','VSL_75','VSL_100')
        AND (${w.tenant}::text IS NULL OR tenant = ${w.tenant})
        AND (${w.campaign}::text IS NULL OR utm_campaign = ${w.campaign})
        AND (${w.from}::date IS NULL OR ts >= ${w.from}::date)
        AND (${w.to}::date IS NULL OR ts < (${w.to}::date + INTERVAL '1 day'))
      GROUP BY 1
    `;
    const order = ['VSLPlay', 'VSL_25', 'VSL_50', 'VSL_75', 'VSL_100'];
    const labels: Record<string, string> = {
      VSLPlay: 'Play',
      VSL_25: '25%', VSL_50: '50%', VSL_75: '75%', VSL_100: '100%'
    };
    const map = new Map(rows.map((r) => [String(r.event_name), Number(r.count)]));
    return order.map((k) => ({ label: labels[k], count: map.get(k) || 0 }));
  } catch (e) {
    console.error('[getVslRetention]', e);
    return [];
  }
}

/* Scroll distribution: contagem por milestone (50/75/100) */
export async function getScrollDistribution(f: Filters): Promise<FunnelStep[]> {
  try {
    const w = whereSales(f);
    const rows = await sql`
      SELECT event_name, COUNT(DISTINCT session_id) AS count
      FROM events
      WHERE event_name IN ('ScrollDepth_50','ScrollDepth_75','ScrollDepth_100')
        AND (${w.tenant}::text IS NULL OR tenant = ${w.tenant})
        AND (${w.campaign}::text IS NULL OR utm_campaign = ${w.campaign})
        AND (${w.from}::date IS NULL OR ts >= ${w.from}::date)
        AND (${w.to}::date IS NULL OR ts < (${w.to}::date + INTERVAL '1 day'))
      GROUP BY 1
    `;
    const order = ['ScrollDepth_50', 'ScrollDepth_75', 'ScrollDepth_100'];
    const labels: Record<string, string> = { ScrollDepth_50: '50%', ScrollDepth_75: '75%', ScrollDepth_100: '100%' };
    const map = new Map(rows.map((r) => [String(r.event_name), Number(r.count)]));
    return order.map((k) => ({ label: labels[k], count: map.get(k) || 0 }));
  } catch (e) {
    console.error('[getScrollDistribution]', e);
    return [];
  }
}

/* Lista detalhada de vendas (já existia) */
export async function getSales(f: Filters): Promise<Sale[]> {
  try {
    const w = whereSales(f);
    const rows = await sql`
      SELECT * FROM sales
      WHERE (${w.tenant}::text IS NULL OR tenant = ${w.tenant})
        AND (${w.campaign}::text IS NULL OR utm_campaign = ${w.campaign})
        AND (${w.from}::date IS NULL OR ts >= ${w.from}::date)
        AND (${w.to}::date IS NULL OR ts < (${w.to}::date + INTERVAL '1 day'))
      ORDER BY ts DESC
      LIMIT 200
    `;
    return rows as unknown as Sale[];
  } catch (e) {
    console.error('[getSales]', e);
    return [];
  }
}
