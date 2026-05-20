import type { Filters } from '@/lib/queries';

export function FiltersBar({ tenants, current }: { tenants: string[]; current: Filters }) {
  return (
    <form className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-3 flex flex-wrap gap-3 items-end">
      <Field label="Tenant">
        <select
          name="tenant"
          defaultValue={current.tenant || ''}
          className="h-9 rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-2 text-sm min-w-40"
        >
          <option value="">Todos</option>
          {tenants.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </Field>
      <Field label="De">
        <input type="date" name="from" defaultValue={current.from || ''} className="h-9 rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-2 text-sm" />
      </Field>
      <Field label="Até">
        <input type="date" name="to" defaultValue={current.to || ''} className="h-9 rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-2 text-sm" />
      </Field>
      <button className="h-9 px-4 rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium">
        Filtrar
      </button>
    </form>
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

export function fmtBRL(v: number | string | null, currency = 'USD'): string {
  if (v == null || v === '') return '—';
  const n = typeof v === 'string' ? Number(v) : v;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(n);
}

export function fmtInt(v: number): string {
  return new Intl.NumberFormat('pt-BR').format(v);
}

export function fmtPct(v: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 1 }).format(v);
}

export function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}
