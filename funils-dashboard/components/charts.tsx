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

/* Cor por retenção: vermelho (0%) → verde (100%) */
function retentionColor(p: number): string {
  const hue = Math.max(0, Math.min(1, p)) * 130; // 0 vermelho, 130 verde
  return `hsl(${Math.round(hue)} 68% 52%)`;
}
const nf = new Intl.NumberFormat('pt-BR');

/* Funnel (barras horizontais — VSL, Quiz, Scroll)
 *  - dropoff: mostra a queda vs passo anterior e destaca o pior passo
 *  - gradient: pinta a barra por retenção (verde→vermelho)
 *  - href/slug em cada step (quiz) viram link pra página real */
export function FunnelChart({
  data,
  color = '#10b981',
  dropoff = false,
  gradient = false
}: { data: FunnelStep[]; color?: string; dropoff?: boolean; gradient?: boolean }) {
  if (!data.length) return <Empty label="Sem eventos no período" />;
  const max = Math.max(...data.map((d) => d.count), 1);
  const first = data[0]?.count || 0;

  // pior passo = maior queda relativa vs anterior (só onde o anterior tinha gente)
  let worstIdx = -1;
  let worstDrop = 0;
  for (let i = 1; i < data.length; i++) {
    const prev = data[i - 1].count;
    if (prev <= 0) continue;
    const drop = 1 - data[i].count / prev;
    if (drop > worstDrop) { worstDrop = drop; worstIdx = i; }
  }

  return (
    <div className="space-y-2">
      {data.map((d, i) => {
        const pctOfMax = (d.count / max) * 100;
        const pctOfFirst = first ? d.count / first : 0;
        const prev = i > 0 ? data[i - 1].count : 0;
        const dropPrev = i > 0 && prev > 0 ? 1 - d.count / prev : 0;
        const isWorst = i === worstIdx && worstDrop > 0;
        const barColor = gradient ? retentionColor(pctOfFirst) : color;

        return (
          <div key={i} className="flex items-center gap-3">
            <div className="w-28 shrink-0 text-right">
              {d.href ? (
                <a href={d.href} target="_blank" rel="noopener noreferrer"
                   className="text-sm text-zinc-400 hover:text-zinc-100 hover:underline inline-flex items-center gap-1 justify-end">
                  {d.label}<span aria-hidden>↗</span>
                </a>
              ) : (
                <span className="text-sm text-zinc-500 tabular-nums">{d.label}</span>
              )}
              {d.slug && <div className="text-[10px] text-zinc-600 truncate">{d.slug}</div>}
            </div>
            <div className={'flex-1 relative h-10 bg-zinc-100 dark:bg-zinc-800/40 rounded-md overflow-hidden ' +
                            (isWorst ? 'ring-2 ring-red-500/70' : '')}>
              <div className="h-full rounded-md transition-all" style={{ width: pctOfMax + '%', background: barColor }} />
              <div className="absolute inset-0 flex items-center px-3 text-sm font-medium gap-2">
                <span className="tabular-nums">{nf.format(d.count)}</span>
                {i > 0 && !dropoff && (
                  <span className="text-xs text-zinc-200/80 tabular-nums">{(pctOfFirst * 100).toFixed(1)}%</span>
                )}
                {i > 0 && dropoff && dropPrev > 0 && (
                  <span className={'text-xs tabular-nums ' + (isWorst ? 'text-red-100 font-semibold' : 'text-zinc-200/80')}>
                    ▼ {(dropPrev * 100).toFixed(0)}% vs anterior
                  </span>
                )}
                {isWorst && (
                  <span className="ml-auto text-[10px] uppercase tracking-wide bg-red-600 text-white px-1.5 py-0.5 rounded">
                    pior queda
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
