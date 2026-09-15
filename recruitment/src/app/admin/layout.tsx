'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/admin/login';
  const isOperationsPage = pathname === '/admin/operations';
  const router = useRouter();
  const supabase = createClient();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const check = async () => {
      if (isLoginPage) { setChecking(false); return; }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      const { data: admin } = await supabase.from('admin_users').select('id, role').eq('id', user.id).single();
      if (!admin) { router.push('/recruitment'); return; }
      setChecking(false);
    };
    check();
  }, [isLoginPage]);

  if (isLoginPage) return <div className="admin-font min-h-screen">{children}</div>;

  if (checking) {
    return <div className="admin-font flex h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent" /></div>;
  }

  if (isOperationsPage) return <div className="admin-font min-h-screen">{children}</div>;

  const navItems = [
    { href: '/admin', label: 'Overview', icon: '⊞' },
    { href: '/admin/operations', label: 'Operations Console', icon: '▦' },
    { href: '/admin/candidates', label: 'Candidates', icon: '👥' },
    { href: '/admin/assessments', label: 'Assessments', icon: '✍' },
    { href: '/admin/projects', label: 'Projects', icon: '🔨' },
    { href: '/admin/projects/assign', label: 'Assign Projects', icon: '📋' },
    { href: '/admin/interviews', label: 'Interviews', icon: '💬' },
    { href: '/admin/results', label: 'Results', icon: '🏆' },
    { href: '/admin/domains', label: 'Domains', icon: '◈' },
    { href: '/admin/settings', label: 'Settings', icon: '⚙' },
  ];

  return (
    <div className="admin-font flex min-h-screen bg-bg">
      <aside className="hidden w-56 flex-col border-r border-border bg-surface lg:flex">
        <div className="flex h-16 items-center gap-3 border-b border-border px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-bg text-xs font-bold">AWS</div>
          <div>
            <p className="text-xs font-semibold text-text">SBG Admin</p>
            <p className="text-xs text-muted">Recruitment</p>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(({ href, label, icon }) => {
            const active = pathname === href || (href !== '/admin' && pathname.startsWith(href));
            return (
              <Link key={href} href={href} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                active ? 'bg-accent/15 text-accent' : 'text-muted hover:bg-panel hover:text-text'
              }`}>
                <span>{icon}</span>{label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border p-4">
          <button
            onClick={async () => { await supabase.auth.signOut(); router.push('/login'); }}
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-muted hover:bg-panel hover:text-error transition"
          >
            Sign Out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
