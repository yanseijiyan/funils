import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { COOKIE_NAME, COOKIE_MAX_AGE, isPasswordValid, makeCookieValue, isCookieValid } from '@/lib/auth';

export const dynamic = 'force-dynamic';

async function login(formData: FormData) {
  'use server';
  const password = String(formData.get('password') || '');
  const next = String(formData.get('next') || '/dashboard');
  if (!isPasswordValid(password)) {
    redirect('/login?error=1' + (next !== '/dashboard' ? '&next=' + encodeURIComponent(next) : ''));
  }
  const c = await cookies();
  c.set(COOKIE_NAME, makeCookieValue(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE
  });
  redirect(next);
}

export default async function LoginPage(props: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const { error, next } = await props.searchParams;
  // Se já tá logado, manda direto
  const c = await cookies();
  if (isCookieValid(c.get(COOKIE_NAME)?.value)) redirect(next || '/dashboard');

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4">
      <form
        action={login}
        className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-2xl shadow-xl p-8 space-y-5 border border-zinc-200 dark:border-zinc-800"
      >
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">funils</h1>
          <p className="text-sm text-zinc-500">dashboard de vendas</p>
        </div>
        <input type="hidden" name="next" value={next || '/dashboard'} />
        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium block">Senha</label>
          <input
            id="password"
            name="password"
            type="password"
            autoFocus
            required
            autoComplete="current-password"
            className="w-full h-11 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 text-base outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
          />
          {error && <p className="text-sm text-red-600">Senha incorreta.</p>}
        </div>
        <button
          type="submit"
          className="w-full h-11 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium hover:opacity-90 transition"
        >
          Entrar
        </button>
        <p className="text-xs text-zinc-500 text-center">
          Sessão dura 60 dias. Você só precisa logar de novo se a senha mudar.
        </p>
      </form>
    </div>
  );
}
