'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import type { CandidateProfile } from '@/types';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [supabase] = useState(createClient);
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.replace('/login'); return; }
      const [{ data: profileData }, { data: adminData }] = await Promise.all([
        supabase.from('candidate_profiles').select('*, domain:domains(*)').eq('id', user.id).single(),
        supabase.from('admin_users').select('id').eq('id', user.id).maybeSingle(),
      ]);
      setProfile(profileData);
      setIsAdmin(Boolean(adminData));
    });
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    const { error } = await supabase.auth.signOut();
    if (error) { setLoggingOut(false); return; }
    router.replace('/login');
    router.refresh();
  };

  const isRecruitmentRoute = pathname.startsWith('/recruitment');
  const navItems = isRecruitmentRoute ? [
    { href: '/recruitment', label: 'Overview', icon: '⊞' },
    { href: '/recruitment/subdomain', label: 'Domain', icon: '◈' },
    { href: '/dashboard/round-1', label: 'Round 1 · Application', icon: '✍' },
    { href: '/recruitment/round-1', label: 'Round 2 · Project', icon: '🔨' },
    { href: '/recruitment/interview', label: 'Round 3 · Interview', icon: '💬' },
    { href: '/recruitment/result', label: 'Result', icon: '🏆' },
    ...(isAdmin ? [{ href: '/admin/operations', label: 'Admin Console', icon: '▦' }] : []),
  ] : [
    { href: '/dashboard', label: 'Overview', icon: '⊞' },
    { href: '/dashboard/domain', label: 'Domain', icon: '◈' },
    { href: '/dashboard/round-1', label: 'Round 1 · Application', icon: '✍' },
    { href: '/dashboard/project', label: 'Round 2 · Project', icon: '🔨' },
    { href: '/dashboard/interview', label: 'Round 3 · Interview', icon: '💬' },
    { href: '/dashboard/result', label: 'Result', icon: '🏆' },
  ];

  return (
    <div className="flex min-h-screen bg-bg">
      {/* Sidebar */}
      <aside className="hidden w-60 flex-col border-r border-border bg-surface lg:flex">
        <div className="flex h-16 items-center gap-3 border-b border-border px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-bg text-xs font-bold">AWS</div>
          <span className="text-sm font-semibold">SBG Recruitment</span>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(({ href, label, icon }) => {
            const isOverview = href === '/dashboard' || href === '/recruitment';
            const active = pathname === href || (!isOverview && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                  active ? 'bg-accent/15 text-accent' : 'text-muted hover:bg-panel hover:text-text'
                }`}
              >
                <span>{icon}</span>
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border p-4">
          {profile && (
            <div className="mb-3">
              <p className="text-sm font-medium text-text truncate">{profile.full_name}</p>
              <p className="text-xs text-muted truncate">{profile.registration_number}</p>
            </div>
          )}
          <button onClick={handleLogout} disabled={loggingOut} className="flex w-full items-center gap-3 border border-border px-3 py-2.5 text-left font-mono text-xs uppercase tracking-[.12em] text-muted transition hover:border-error/60 hover:bg-error/10 hover:text-error disabled:cursor-wait disabled:opacity-60">
            <LogOut size={15} aria-hidden="true" />
            {loggingOut ? 'Logging out…' : 'Log out'}
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-surface px-4 lg:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded bg-accent text-bg text-xs font-bold">AWS</div>
          <span className="text-sm font-semibold">SBG</span>
        </div>
        <button onClick={handleLogout} disabled={loggingOut} className="flex min-h-10 items-center gap-2 px-2 font-mono text-[10px] uppercase tracking-[.12em] text-muted hover:text-error disabled:cursor-wait disabled:opacity-60">
          <LogOut size={14} aria-hidden="true" />
          {loggingOut ? 'Logging out…' : 'Log out'}
        </button>
      </div>

      {/* Main */}
      <main className="flex-1 overflow-auto pt-14 lg:pt-0">
        {children}
      </main>
    </div>
  );
}
