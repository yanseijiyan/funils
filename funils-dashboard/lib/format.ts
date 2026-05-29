/* Formatadores — usados em Server e Client Components (sem 'use client'). */

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
