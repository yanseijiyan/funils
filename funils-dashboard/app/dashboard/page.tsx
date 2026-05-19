import { sql, type Sale } from '@/lib/db';

export const dynamic = 'force-dynamic';

type Search = {
  tenant?: string;
  from?: string;
  to?: string;
};

async function getSales(filters: Search): Promise<Sale[]> {
  try {
    const tenant = filters.tenant || null;
    const from = filters.from || null;
    const to = filters.to || null;
    const rows = await sql`
      SELECT * FROM sales
      WHERE (${tenant}::text IS NULL OR tenant = ${tenant})
        AND (${from}::date IS NULL OR ts >= ${from}::date)
        AND (${to}::date IS NULL OR ts < (${to}::date + INTERVAL '1 day'))
      ORDER BY ts DESC
      LIMIT 200
    `;
    return rows as unknown as Sale[];
  } catch (e) {
    console.error('[dashboard] db error', e);
    return [];
  }
}

async function getTenants(): Promise<string[]> {
  try {
    const rows = await sql`SELECT DISTINCT tenant FROM sales ORDER BY tenant`;
    return (rows as { tenant: string }[]).map((r) => r.tenant);
  } catch {
    return [];
  }
}

function fmtBRL(v: string | null, currency: string | null): string {
  if (!v) return '—';
  const n = Number(v);
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: currency || 'BRL'
  }).format(n);
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

export default async function DashboardPage(props: { searchParams: Promise<Search> }) {
  const filters = await props.searchParams;
  const [sales, tenants] = await Promise.all([getSales(filters), getTenants()]);

  const total = sales.reduce((acc, s) => {
    if (s.status === 'approved' && s.value) return acc + Number(s.value);
    return acc;
  }, 0);
  const approvedCount = sales.filter((s) => s.status === 'approved').length;

  return (
    <div className="space-y-6">
      {/* Cards de métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card label="Vendas aprovadas" value={String(approvedCount)} />
        <Card label="Receita bruta" value={fmtBRL(String(total), 'BRL')} />
        <Card label="Eventos totais" value={String(sales.length)} sub="últimos 200" />
      </div>

      {/* Filtros */}
      <form className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 flex flex-wrap gap-3 items-end">
        <Field label="Tenant">
          <select
            name="tenant"
            defaultValue={filters.tenant || ''}
            className="h-10 rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-2 text-sm"
          >
            <option value="">Todos</option>
            {tenants.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>
        <Field label="De">
          <input
            type="date"
            name="from"
            defaultValue={filters.from || ''}
            className="h-10 rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-2 text-sm"
          />
        </Field>
        <Field label="Até">
          <input
            type="date"
            name="to"
            defaultValue={filters.to || ''}
            className="h-10 rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-2 text-sm"
          />
        </Field>
        <button className="h-10 px-4 rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium">
          Filtrar
        </button>
      </form>

      {/* Tabela */}
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
                <th className="text-left px-4 py-3 font-medium">Produto</th>
                <th className="text-left px-4 py-3 font-medium">Order ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {sales.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-zinc-500">
                    Nenhuma venda ainda — verifique se o webhook está configurado e disparando.
                  </td>
                </tr>
              ) : (
                sales.map((s) => (
                  <tr key={s.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">{fmtDate(s.ts)}</td>
                    <td className="px-4 py-3 font-medium">{s.tenant}</td>
                    <td className="px-4 py-3">
                      <StatusPill status={s.status} />
                    </td>
                    <td className="px-4 py-3 font-medium tabular-nums">{fmtBRL(s.value, s.currency)}</td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{s.utm_source || '—'}</td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{s.utm_campaign || '—'}</td>
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

function Card({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5">
      <p className="text-xs uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="text-3xl font-semibold mt-1 tabular-nums">{value}</p>
      {sub && <p className="text-xs text-zinc-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-zinc-500">{label}</label>
      {children}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    refunded: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
  };
  const cls = map[status] || 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300';
  return <span className={'inline-block px-2 py-0.5 rounded-full text-xs font-medium ' + cls}>{status}</span>;
}
