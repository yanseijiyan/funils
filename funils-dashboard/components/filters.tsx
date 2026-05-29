'use client';

import { useMemo, useRef, useState } from 'react';
import type { Filters } from '@/lib/queries';

const TZ = 'America/Sao_Paulo';

/* ── helpers de data (math em UTC sobre YYYY-MM-DD evita problema de fuso/DST) ── */
function todayTZ(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}
function parseYMD(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
function toYMD(dt: Date): string {
  return dt.toISOString().slice(0, 10);
}
function addDays(s: string, n: number): string {
  const dt = parseYMD(s);
  dt.setUTCDate(dt.getUTCDate() + n);
  return toYMD(dt);
}

type Preset = { key: string; label: string; range: (today: string) => { from: string; to: string } };

const PRESETS: Preset[] = [
  { key: 'today', label: 'Hoje', range: (t) => ({ from: t, to: t }) },
  { key: 'yesterday', label: 'Ontem', range: (t) => ({ from: addDays(t, -1), to: addDays(t, -1) }) },
  { key: 'last7', label: 'Últimos 7 dias', range: (t) => ({ from: addDays(t, -6), to: t }) },
  { key: 'last30', label: 'Últimos 30 dias', range: (t) => ({ from: addDays(t, -29), to: t }) },
  { key: 'month', label: 'Este mês', range: (t) => ({ from: t.slice(0, 8) + '01', to: t }) }
];

function matchPreset(from: string, to: string, today: string): string {
  for (const p of PRESETS) {
    const r = p.range(today);
    if (r.from === from && r.to === to) return p.key;
  }
  return 'custom';
}

export function FiltersBar({ tenants, campaigns = [], current }: { tenants: string[]; campaigns?: string[]; current: Filters }) {
  const today = useMemo(() => todayTZ(), []);
  const [from, setFrom] = useState(current.from || today);
  const [to, setTo] = useState(current.to || today);
  const [preset, setPreset] = useState(() => matchPreset(current.from || today, current.to || today, today));
  const formRef = useRef<HTMLFormElement>(null);

  function applyPreset(key: string) {
    setPreset(key);
    if (key === 'custom') return; // deixa o usuário editar as datas à mão
    const p = PRESETS.find((x) => x.key === key);
    if (!p) return;
    const r = p.range(today);
    setFrom(r.from);
    setTo(r.to);
    // submete na hora pra refletir o período escolhido
    requestAnimationFrame(() => formRef.current?.requestSubmit());
  }

  const inputCls =
    'h-9 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent px-2.5 text-sm ' +
    'text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-zinc-400/40 ' +
    'dark:focus:ring-zinc-500/40 transition';

  return (
    <form
      ref={formRef}
      className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-3 flex flex-wrap gap-3 items-end shadow-sm"
    >
      <Field label="Tenant">
        <select name="tenant" defaultValue={current.tenant || ''} className={inputCls + ' min-w-40 cursor-pointer'}>
          <option value="">Todos</option>
          {tenants.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </Field>

      {campaigns.length > 0 && (
        <Field label="Campanha">
          <select name="campaign" defaultValue={current.campaign || ''} className={inputCls + ' min-w-44 max-w-64 cursor-pointer'}>
            <option value="">Todas</option>
            {campaigns.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </Field>
      )}

      <Field label="Período">
        <select value={preset} onChange={(e) => applyPreset(e.target.value)} className={inputCls + ' min-w-40 cursor-pointer'}>
          {PRESETS.map((p) => (
            <option key={p.key} value={p.key}>{p.label}</option>
          ))}
          <option value="custom">Personalizado</option>
        </select>
      </Field>

      <Field label="De">
        <input
          type="date"
          name="from"
          value={from}
          onChange={(e) => { setFrom(e.target.value); setPreset(matchPreset(e.target.value, to, today)); }}
          className={inputCls}
        />
      </Field>

      <Field label="Até">
        <input
          type="date"
          name="to"
          value={to}
          onChange={(e) => { setTo(e.target.value); setPreset(matchPreset(from, e.target.value, today)); }}
          className={inputCls}
        />
      </Field>

      <button
        type="submit"
        className="h-9 px-5 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium hover:opacity-90 active:scale-[.98] transition"
      >
        Filtrar
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-zinc-500">{label}</label>
      {children}
    </div>
  );
}
