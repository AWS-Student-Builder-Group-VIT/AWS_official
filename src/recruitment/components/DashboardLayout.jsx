import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { createClient } from '../lib/supabase.js';
import awsIcon from '../../assets/aws_icon.jpeg';

export default function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [supabase] = useState(createClient);
  const [profile, setProfile] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { navigate('/recruitment/login', { replace: true }); return; }
      const [{ data: profileData }, { data: adminData }] = await Promise.all([
        supabase.from('candidate_profiles').select('*').eq('id', user.id).maybeSingle(),
        supabase.from('admin_users').select('id').eq('id', user.id).maybeSingle(),
      ]);
      setProfile(profileData);
      setIsAdmin(Boolean(adminData));
    });
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    await supabase.auth.signOut();
    navigate('/recruitment/login', { replace: true });
  };

  const navItems = [
    { href: '/recruitment/dashboard', label: 'Overview', icon: '⊞' },
    { href: '/recruitment/subdomain', label: 'Domain', icon: '◈' },
    { href: '/recruitment/dashboard/round-1', label: 'Round 1 · Application', icon: '✍' },
    { href: '/recruitment/round-1', label: 'Round 2 · Project', icon: '🔨' },
    { href: '/recruitment/interview', label: 'Round 3 · Interview', icon: '💬' },
    { href: '/recruitment/result', label: 'Result', icon: '🏆' },
    ...(isAdmin ? [{ href: '/recruitment/admin/operations', label: 'Admin Console', icon: '▦' }] : []),
  ];

  const pathname = location.pathname;

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Sidebar */}
      <aside className="hidden w-60 flex-col border-r lg:flex" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <div className="flex h-16 items-center gap-3 border-b px-5" style={{ borderColor: 'var(--border)' }}>
          <img src={awsIcon} alt="AWS" className="h-8 w-8 rounded object-contain border border-[var(--border)] p-1 bg-black/40" />
          <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>SBG Recruitment</span>
        </div>

        <nav className="flex-1 space-y-1 p-4">
          {navItems.map(({ href, label, icon }) => {
            const isOverview = href === '/recruitment/dashboard';
            const active = pathname === href || (!isOverview && pathname.startsWith(href));
            return (
              <Link
                key={href}
                to={href}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition"
                style={{
                  background: active ? 'rgba(255,153,0,.15)' : 'transparent',
                  color: active ? 'var(--accent)' : 'var(--muted)',
                }}
              >
                <span>{icon}</span>
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t p-4" style={{ borderColor: 'var(--border)' }}>
          {profile && (
            <div className="mb-3">
              <p className="truncate text-sm font-medium" style={{ color: 'var(--text)' }}>{profile.full_name}</p>
              <p className="truncate text-xs" style={{ color: 'var(--muted)' }}>{profile.registration_number}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex w-full items-center gap-3 border px-3 py-2.5 text-left font-mono text-xs uppercase tracking-[.12em] transition disabled:cursor-wait disabled:opacity-60"
            style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
          >
            <LogOut size={15} aria-hidden="true" />
            {loggingOut ? 'Logging out…' : 'Log out'}
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b px-4 lg:hidden" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <div className="flex items-center gap-2">
          <img src={awsIcon} alt="AWS" className="h-7 w-7 rounded object-contain border border-[var(--border)] p-0.5 bg-black/40" />
          <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>SBG</span>
        </div>
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex min-h-10 items-center gap-2 px-2 font-mono text-[10px] uppercase tracking-[.12em] transition disabled:cursor-wait disabled:opacity-60"
          style={{ color: 'var(--muted)' }}
        >
          <LogOut size={14} aria-hidden="true" />
          {loggingOut ? 'Logging out…' : 'Log out'}
        </button>
      </div>

      {/* Main */}
      <main className="flex-1 overflow-auto pt-14 lg:pt-0">
        <Outlet />
      </main>
    </div>
  );
}
