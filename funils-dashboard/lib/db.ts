/* Cliente Postgres (Neon) — lazy init pra não crashar no build se DATABASE_URL faltar */
import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

let client: NeonQueryFunction<false, false> | null = null;

function getClient(): NeonQueryFunction<false, false> {
  if (client) return client;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL not set');
  client = neon(url);
  return client;
}

/* Tagged template wrapper que reutiliza a interface do neon() */
export function sql(strings: TemplateStringsArray, ...values: unknown[]): Promise<Record<string, unknown>[]> {
  return getClient()(strings, ...values) as Promise<Record<string, unknown>[]>;
}

export type Sale = {
  id: number;
  order_id: string;
  tenant: string;
  ts: string;
  status: string;
  value: string | null;
  currency: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  ttclid: string | null;
  fbclid: string | null;
  product_id: string | null;
  product_name: string | null;
  customer_email_hash: string | null;
  customer_phone_hash: string | null;
};
