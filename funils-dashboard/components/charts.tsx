'use client';
import {
  ResponsiveContainer,
  AreaChart, Area,
  BarChart, Bar,
  XAxis, YAxis,
  CartesianGrid,
  Tooltip,
  Cell
} from 'recharts';
import type { DayPoint, FunnelStep } from '@/lib/queries';

/* Gráfico de série temporal: visitas + leads + vendas */
export function SeriesChart({ data, currency = 'USD' }: { data: DayPoint[]; currency?: string }) {
  if (!data.length) return <Empty label="Sem dados no período" />;
  const fmt = (v: number) => new Intl.NumberFormat('pt-BR').format(v);
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
        <defs>
          <linearGradient id="gradVisitors" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#71717a" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#71717a" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradLeads" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradSales" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.5} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(125,125,125,0.15)" />
        <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="rgba(125,125,125,0.5)" />
        <YAxis tick={{ fontSize: 11 }} stroke="rgba(125,125,125,0.5)" />
        <Tooltip
          contentStyle={{
            background: 'rgb(24 24 27)',
            color: 'rgb(228 228 231)',
            border: 'none',
            borderRadius: 8,
            fontSize: 12
          }}
          formatter={(v, k) => [fmt(Number(v)), k]}
        />
        <Area type="monotone" dataKey="visitors" stroke="#71717a" fill="url(#gradVisitors)" name="Visitantes" />
        <Area type="monotone" dataKey="leads"    stroke="#3b82f6" fill="url(#gradLeads)"    name="Leads" />
        <Area type="monotone" dataKey="sales"    stroke="#10b981" fill="url(#gradSales)"    name="Vendas" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/* Funnel (barras horizontais decrescentes — VSL, Quiz, Scroll) */
export function FunnelChart({ data, color = '#10b981' }: { data: FunnelStep[]; color?: string }) {
  if (!data.length) return <Empty label="Sem eventos no período" />;
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="space-y-2">
      {data.map((d, i) => {
        const pctOfMax = (d.count / max) * 100;
        const pctOfFirst = data[0]?.count ? d.count / data[0].count : 0;
        return (
          <div key={i} className="flex items-center gap-3">
            <div className="w-16 text-sm text-zinc-500 text-right tabular-nums">{d.label}</div>
            <div className="flex-1 relative h-10 bg-zinc-100 dark:bg-zinc-800/40 rounded-md overflow-hidden">
              <div
                className="h-full rounded-md transition-all"
                style={{ width: pctOfMax + '%', background: color }}
              />
              <div className="absolute inset-0 flex items-center px-3 text-sm font-medium">
                <span className="tabular-nums">{new Intl.NumberFormat('pt-BR').format(d.count)}</span>
                {i > 0 && (
                  <span className="ml-2 text-xs text-zinc-500 tabular-nums">
                    {(pctOfFirst * 100).toFixed(1)}%
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* Bar chart simples (campanha por receita) */
export function BarRevenueChart({ data }: { data: { name: string; value: number }[] }) {
  if (!data.length) return <Empty label="Sem vendas no período" />;
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(125,125,125,0.15)" />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="rgba(125,125,125,0.5)" />
        <YAxis tick={{ fontSize: 11 }} stroke="rgba(125,125,125,0.5)" />
        <Tooltip
          contentStyle={{ background: 'rgb(24 24 27)', color: 'rgb(228 228 231)', border: 'none', borderRadius: 8, fontSize: 12 }}
          formatter={(v) => [new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(v)), 'Receita']}
        />
        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill="#10b981" />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function Empty({ label }: { label: string }) {
  return <div className="h-32 flex items-center justify-center text-sm text-zinc-500">{label}</div>;
}
