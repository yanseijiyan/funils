/* Auth: senha global + cookie HMAC longa duração (60 dias)
 *
 * Cookie value = HMAC-SHA256(senha, AUTH_SECRET). Não armazena a senha em si.
 * Pra revogar TODOS os acessos: troca AUTH_SECRET no Vercel → cookies viram inválidos.
 * Pra trocar a senha: troca DASHBOARD_PASSWORD → cookies antigos viram inválidos.
 */
import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export const COOKIE_NAME = 'fnl_dash';
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 60; // 60 dias

function computeToken(password: string): string {
  const secret = process.env.AUTH_SECRET || 'dev-fallback-secret';
  return crypto.createHmac('sha256', secret).update(password).digest('hex');
}

export function isPasswordValid(input: string): boolean {
  const expected = process.env.DASHBOARD_PASSWORD || '';
  if (!expected) return false;
  if (input.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(input), Buffer.from(expected));
}

export function makeCookieValue(): string {
  return computeToken(process.env.DASHBOARD_PASSWORD || '');
}

export function isCookieValid(value: string | undefined | null): boolean {
  if (!value) return false;
  const expected = makeCookieValue();
  if (value.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(value), Buffer.from(expected));
  } catch {
    return false;
  }
}

/* Helper pra usar no layout do /dashboard */
export async function requireAuth() {
  const c = await cookies();
  const v = c.get(COOKIE_NAME)?.value;
  if (!isCookieValid(v)) redirect('/login');
}
