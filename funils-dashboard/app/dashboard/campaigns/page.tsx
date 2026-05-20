import { getCampaignBreakdown, getTenants, type Filters } from '@/lib/queries';
import { FiltersBar, fmtMoney, fmtInt, fmtPct } from '@/components/filters';
import { CardSection } from '@/components/card';

export const dynamic = 'force-dynamic';

export default async function CampaignsPage(props: { searchParams: Promise<Filters> }) {
  const filters = await props.searchParams;
  const [rows, tenants] = await Promise.all([getCampaignBreakdown(filters), getTenants()]);

  /* Agrupa por nível: source → campaign → content → term */
  type Node = {
    label: string;
    visitors: number; leads: number; sales: number; revenue: number;
    children?: Map<string, Node>;
  };

  const root: Node = { label: 'Total', visitors: 0, leads: 0, sales: 0, revenue: 0, children: new Map() };

  for (const r of rows) {
    const src  = r.utm_source   || '(direct)';
    const camp = r.utm_campaign || '(sem campanha)';
    const cnt  = r.utm_content  || '(sem adset)';
    const trm  = r.utm_term     || '(sem ad)';
    const path = [src, camp, cnt, trm];

    let node = root;
    for (const seg of path) {
      if (!node.children) node.children = new Map();
      if (!node.children.has(seg)) {
        node.children.set(seg, { label: seg, visitors: 0, leads: 0, sales: 0, revenue: 0, children: new Map() });
      }
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

  const sources = root.children
    ? Array.from(root.children.values()).sort((a, b) => b.revenue - a.revenue || b.visitors - a.visitors)
    : [];

  return (
    <div className="space-y-6">
      <FiltersBar tenants={tenants} current={filters} />

      <CardSection title="Breakdown por origem → campanha → conjunto → anúncio">
        {sources.length === 0 ? (
          <p className="text-sm text-zinc-500 py-6 text-center">Nenhuma campanha no período.</p>
        ) : (
          <div className="space-y-2">
            {sources.map((src) => (
              <SourceBlock key={src.label} node={src} />
            ))}
          </div>
        )}
      </CardSection>
    </div>
  );
}

type Node = {
  label: string;
  visitors: number; leads: number; sales: number; revenue: number;
  children?: Map<string, Node>;
};

function SourceBlock({ node }: { node: Node }) {
  const camps = node.children
    ? Array.from(node.children.values()).sort((a, b) => b.revenue - a.revenue)
    : [];
  return (
    <details className="bg-zinc-50 dark:bg-zinc-800/40 rounded-lg overflow-hidden" open>
      <summary className="cursor-pointer px-4 py-3 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 select-none">
        <Row label={node.label} stats={node} prefix="▾" bold />
      </summary>
      <div className="px-2 py-1 space-y-1">
        {camps.map((camp) => (
          <CampaignBlock key={camp.label} node={camp} />
        ))}
      </div>
    </details>
  );
}

function CampaignBlock({ node }: { node: Node }) {
  const adsets = node.children
    ? Array.from(node.children.values()).sort((a, b) => b.revenue - a.revenue)
    : [];
  return (
    <details className="rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800/40">
      <summary className="cursor-pointer px-3 py-2 select-none">
        <Row label={node.label} stats={node} prefix="▸" indent={1} />
      </summary>
      <div className="pl-3 py-0.5 space-y-0.5">
        {adsets.map((adset) => (
          <AdsetBlock key={adset.label} node={adset} />
        ))}
      </div>
    </details>
  );
}

function AdsetBlock({ node }: { node: Node }) {
  const ads = node.children
    ? Array.from(node.children.values()).sort((a, b) => b.revenue - a.revenue)
    : [];
  return (
    <details className="rounded-sm hover:bg-zinc-100 dark:hover:bg-zinc-800/30">
      <summary className="cursor-pointer px-3 py-1.5 select-none">
        <Row label={node.label} stats={node} prefix="▸" indent={2} />
      </summary>
      <div className="pl-4 py-0.5 space-y-0.5">
        {ads.map((ad) => (
          <div key={ad.label} className="px-3 py-1">
            <Row label={ad.label} stats={ad} indent={3} />
          </div>
        ))}
      </div>
    </details>
  );
}

function Row({
  label, stats, prefix, indent = 0, bold = false
}: {
  label: string;
  stats: { visitors: number; leads: number; sales: number; revenue: number };
  prefix?: string;
  indent?: number;
  bold?: boolean;
}) {
  const conv = stats.visitors ? stats.sales / stats.visitors : 0;
  return (
    <div className="grid grid-cols-12 gap-2 items-center text-sm">
      <div className={'col-span-5 truncate ' + (bold ? 'font-semibold' : '')} style={{ paddingLeft: indent * 12 }}>
        {prefix && <span className="text-zinc-400 mr-1">{prefix}</span>}
        {label}
      </div>
      <div className="col-span-1 text-right tabular-nums text-zinc-500">{fmtInt(stats.visitors)}</div>
      <div className="col-span-1 text-right tabular-nums text-zinc-500">{fmtInt(stats.leads)}</div>
      <div className="col-span-1 text-right tabular-nums font-medium">{fmtInt(stats.sales)}</div>
      <div className="col-span-2 text-right tabular-nums font-medium">{fmtMoney(stats.revenue)}</div>
      <div className="col-span-2 text-right tabular-nums text-zinc-500">{stats.visitors ? fmtPct(conv) : '—'}</div>
    </div>
  );
}
