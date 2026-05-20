import Link from 'next/link';
import { requireAuth } from '@/lib/auth';

const NAV = [
  { href: '/dashboard',           label: 'Overview' },
  { href: '/dashboard/campaigns', label: 'Campanhas' },
  { href: '/dashboard/funnels',   label: 'Funis' },
  { href: '/dashboard/sales',     label: 'Vendas' }
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireAuth();
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-6">
          <Link href="/dashboard" className="font-semibold tracking-tight whitespace-nowrap">
            funils <span className="text-zinc-400 font-normal">dashboard</span>
          </Link>
          <nav className="flex-1 flex items-center gap-1 overflow-x-auto">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="px-3 py-1.5 rounded-md text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <form action="/api/logout" method="post">
            <button type="submit" className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
              sair
            </button>
          </form>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
