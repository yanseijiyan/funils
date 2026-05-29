import { getCampaignBreakdown, getAdSpend, getTenants, getCampaigns, resolveFilters, type Filters, type AdSpendRow } from '@/lib/queries';
import { FiltersBar } from '@/components/filters';
import { fmtBRL, fmtInt, fmtPct } from '@/lib/format';
import { CardSection } from '@/components/card';

export const dynamic = 'force-dynamic';

type Level = 'root' | 'source' | 'campaign' | 'adset' | 'ad';
const NEXT: Record<Level, Level> = { root: 'source', source: 'campaign', campaign: 'adset', adset: 'ad', ad: 'ad' };

type Node = {
  label: string;
  display: string;
  level: Level;
  visitors: number; leads: number; sales: number; revenue: number;
  spend: number; impressions: number; clicks: number;
  children: Map<string, Node>;
};

function newNode(label: string, level: Level): Node {
  return {
    label, display: label, level,
    visitors: 0, leads: 0, sales: 0, revenue: 0,
    spend: 0, impressions: 0, clicks: 0,
    children: new Map()
  };
}

export default async function CampaignsPage(props: { searchParams: Promise<Filters> }) {
  const filters = resolveFilters(await props.searchParams);
  const [rows, ad, tenants, campaignList] = await Promise.all([
    getCampaignBreakdown(filters),
    getAdSpend(filters),
    getTenants(),
    getCampaigns(filters.tenant)
  ]);

  const root = newNode('Total', 'root');

  /* 1. Árvore a partir do funil (utm_source → campaign → content → term) */
  for (const r of rows) {
    const path = [
      r.utm_source   || '(direct)',
      r.utm_campaign || '(sem campanha)',
      r.utm_content  || '(sem adset)',
      r.utm_term     || '(sem ad)'
    ];
    let node = root;
    let level: Level = 'root';
    for (const seg of path) {
      level = NEXT[level];
      if (!node.children.has(seg)) node.children.set(seg, newNode(seg, level));
      node = node.children.get(seg)!;
      node.visitors += Number(r.visitors);
      node.leads    += Number(r.leads);
      node.sales    += Number(r.sales);
      node.revenue  += Number(r.revenue);
    }
    root.visitors += Number(r.visitors);
    root.leads    += Number(r.leads);
    root.sales    += Number(r.sales);
    root.revenue  += Number(r.revenue);
  }

  /* 2. Garante nós pra campanhas/ads que tiveram gasto mas nenhum evento de funil */
  function ensure(path: string[], levels: Level[]) {
    let node = root;
    for (let i = 0; i < path.length; i++) {
      if (!node.children.has(path[i])) node.children.set(path[i], newNode(path[i], levels[i]));
      node = node.children.get(path[i])!;
    }
  }
  for (const a of ad) {
    if (a.level === 'campaign') {
      ensure(['tiktok', a.ref_id], ['source', 'campaign']);
    } else if (a.level === 'adset' && a.campaign_id) {
      ensure(['tiktok', a.campaign_id, a.ref_id], ['source', 'campaign', 'adset']);
    } else if (a.level === 'ad' && a.campaign_id && a.adset_id) {
      ensure(['tiktok', a.campaign_id, a.adset_id, a.ref_id], ['source', 'campaign', 'adset', 'ad']);
    }
  }

  /* 3. Lookup ad_stats por "nível:id" */
  const adMap = new Map<string, AdSpendRow>();
  for (const a of ad) adMap.set(a.level + ':' + a.ref_id, a);

  /* 4. Enriquece com gasto + resolve nomes (campanhas/ads usam IDs como label) */
  function enrich(node: Node) {
    for (const c of node.children.values()) enrich(c);
    if (node.level === 'campaign' || node.level === 'adset' || node.level === 'ad') {
      const a = adMap.get(node.level + ':' + node.label);
      if (a) {
        node.spend = a.spend;
        node.impressions = a.impressions;
        node.clicks = a.clicks;
        if (a.name) node.display = a.name;
      }
    } else {
      let s = 0, i = 0, c = 0;
      for (const ch of node.children.values()) { s += ch.spend; i += ch.impressions; c += ch.clicks; }
      node.spend = s; node.impressions = i; node.clicks = c;
    }
  }
  enrich(root);

  const sources = Array.from(root.children.values())
    .sort((a, b) => b.spend - a.spend || b.revenue - a.revenue || b.visitors - a.visitors);

  return (
    <div className="space-y-6">
      <FiltersBar tenants={tenants} campaigns={campaignList} current={filters} />
      <CardSection title="Campanhas — performance de Ads">
        {sources.length === 0 ? (
          <p className="text-sm text-zinc-500 py-6 text-center">Nenhuma campanha no período.</p>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[1080px]">
              <HeaderRow />
              <div className="space-y-0.5 mt-1">
                {sources.map((s) => <Block key={s.label} node={s} depth={0} open />)}
              </div>
            </div>
          </div>
        )}
      </CardSection>
      <p className="text-xs text-zinc-500">
        Gasto/Impressões/Cliques vêm da TikTok Marketing API (sync via cron). CPC/CPM/CTR/CPA/ROAS são calculados.
        Campanha/conjunto/anúncio casam pelo ID do TikTok — os links dos anúncios precisam carregar os IDs nos UTMs.
      </p>
    </div>
  );
}

const COLS =
  'grid grid-cols-[minmax(220px,1.4fr)_repeat(11,minmax(64px,1fr))] gap-1 items-center';

function HeaderRow() {
  const cols = ['Gasto', 'Impr.', 'Cliques', 'CTR', 'CPC', 'CPM', 'Visitas', 'Vendas', 'Receita', 'CPA', 'ROAS'];
  return (
    <div className={COLS + ' text-[11px] uppercase tracking-wide text-zinc-400 px-2 py-1.5 border-b border-zinc-200 dark:border-zinc-800'}>
      <div>Campanha / conjunto / anúncio</div>
      {cols.map((c) => <div key={c} className="text-right">{c}</div>)}
    </div>
  );
}

function Block({ node, depth, open }: { node: Node; depth: number; open?: boolean }) {
  const kids = Array.from(node.children.values())
    .sort((a, b) => b.spend - a.spend || b.revenue - a.revenue);
  if (kids.length === 0) {
    return <Row node={node} depth={depth} />;
  }
  return (
    <details open={open} className="rounded-md">
      <summary className="cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden">
        <Row node={node} depth={depth} expandable />
      </summary>
      <div className="space-y-0.5">
        {kids.map((k) => <Block key={k.label} node={k} depth={depth + 1} />)}
      </div>
    </details>
  );
}

function Row({ node, depth, expandable }: { node: Node; depth: number; expandable?: boolean }) {
  const ctr  = node.impressions ? node.clicks / node.impressions : 0;
  const cpc  = node.clicks ? node.spend / node.clicks : 0;
  const cpm  = node.impressions ? (node.spend / node.impressions) * 1000 : 0;
  const cpa  = node.sales ? node.spend / node.sales : 0;
  const roas = node.spend ? node.revenue / node.spend : 0;

  const cell = (v: string, dim = false) => (
    <div className={'text-right tabular-nums ' + (dim ? 'text-zinc-400' : '')}>{v}</div>
  );

  return (
    <div className={COLS + ' text-sm px-2 py-1.5 rounded hover:bg-zinc-50 dark:hover:bg-zinc-800/40'}>
      <div className="truncate flex items-center" style={{ paddingLeft: depth * 14 }}>
        {expandable && <span className="text-zinc-400 mr-1 text-xs">▸</span>}
        <span className={depth === 0 ? 'font-semibold' : ''}>{node.display}</span>
      </div>
      {cell(node.spend ? fmtBRL(node.spend) : '—', !node.spend)}
      {cell(node.impressions ? fmtInt(node.impressions) : '—', !node.impressions)}
      {cell(node.clicks ? fmtInt(node.clicks) : '—', !node.clicks)}
      {cell(node.impressions ? fmtPct(ctr) : '—', !node.impressions)}
      {cell(node.clicks ? fmtBRL(cpc) : '—', !node.clicks)}
      {cell(node.impressions ? fmtBRL(cpm) : '—', !node.impressions)}
      {cell(fmtInt(node.visitors), !node.visitors)}
      {cell(fmtInt(node.sales), !node.sales)}
      {cell(node.revenue ? fmtBRL(node.revenue) : '—', !node.revenue)}
      {cell(node.sales ? fmtBRL(cpa) : '—', !node.sales)}
      {cell(node.spend ? roas.toFixed(2) + 'x' : '—', !node.spend)}
    </div>
  );
}
