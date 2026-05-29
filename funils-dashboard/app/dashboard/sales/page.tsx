import { getSales, getTenants, getCampaigns, resolveFilters, type Filters } from '@/lib/queries';
import { FiltersBar } from '@/components/filters';
import { fmtBRL, fmtDateTime } from '@/lib/format';

export const dynamic = 'force-dynamic';

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    refunded: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
  };
  const cls = map[status] || 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300';
  return <span className={'inline-block px-2 py-0.5 rounded-full text-xs font-medium ' + cls}>{status}</span>;
}

export default async function SalesPage(props: { searchParams: Promise<Filters> }) {
  const filters = resolveFilters(await props.searchParams);
  const [sales, tenants, campaignList] = await Promise.all([getSales(filters), getTenants(), getCampaigns(filters.tenant)]);

  return (
    <div className="space-y-6">
      <FiltersBar tenants={tenants} campaigns={campaignList} current={filters} />

      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Quando</th>
                <th className="text-left px-4 py-3 font-medium">Tenant</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Valor</th>
                <th className="text-left px-4 py-3 font-medium">UTM Source</th>
                <th className="text-left px-4 py-3 font-medium">Campanha</th>
                <th className="text-left px-4 py-3 font-medium">Adset</th>
                <th className="text-left px-4 py-3 font-medium">Produto</th>
                <th className="text-left px-4 py-3 font-medium">Order ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {sales.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-zinc-500">
                    Nenhuma venda no período.
                  </td>
                </tr>
              ) : (
                sales.map((s) => (
                  <tr key={s.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">{fmtDateTime(s.ts)}</td>
                    <td className="px-4 py-3 font-medium">{s.tenant}</td>
                    <td className="px-4 py-3"><StatusPill status={s.status} /></td>
                    <td className="px-4 py-3 font-medium tabular-nums">{fmtBRL(s.value, s.currency || 'USD')}</td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{s.utm_source || '—'}</td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{s.utm_campaign || '—'}</td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{s.utm_content || '—'}</td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{s.product_name || s.product_id || '—'}</td>
                    <td className="px-4 py-3 text-xs text-zinc-500 font-mono">{s.order_id}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
