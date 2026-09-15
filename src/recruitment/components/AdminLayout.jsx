import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { createClient } from '../lib/supabase.js';
import awsIcon from '../../assets/aws_icon.jpeg';

const navItems = [
  { href: '/recruitment/admin', label: 'Overview', icon: '⊞' },
  { href: '/recruitment/admin/operations', label: 'Operations Console', icon: '▦' },
  { href: '/recruitment/admin/candidates', label: 'Candidates', icon: '👥' },
  { href: '/recruitment/admin/assessments', label: 'Assessments', icon: '✍' },
  { href: '/recruitment/admin/projects', label: 'Projects', icon: '🔨' },
  { href: '/recruitment/admin/interviews', label: 'Interviews', icon: '💬' },
  { href: '/recruitment/admin/results', label: 'Results', icon: '🏆' },
  { href: '/recruitment/admin/domains', label: 'Domains', icon: '◈' },
  { href: '/recruitment/admin/settings', label: 'Settings', icon: '⚙' },
];

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [supabase] = useState(createClient);
  const [checking, setChecking] = useState(true);

  const pathname = location.pathname;
  const isLoginPage = pathname === '/recruitment/admin/login';
  const isOperationsPage = pathname === '/recruitment/admin/operations';

  useEffect(() => {
    if (isLoginPage) { setChecking(false); return; }
    const check = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { navigate('/recruitment/admin/login', { replace: true }); return; }
        const { data: admin } = await supabase.from('admin_users').select('id, role').eq('id', user.id).maybeSingle();
        if (!admin) { navigate('/recruitment/admin/login', { replace: true }); return; }
      } catch {
        navigate('/recruitment/admin/login', { replace: true });
        return;
      }
      setChecking(false);
    };
    check();
  }, [isLoginPage, pathname]);

  if (isLoginPage) return <div className="min-h-screen"><Outlet /></div>;

  if (checking) return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} />
    </div>
  );

  if (isOperationsPage) return <div className="min-h-screen"><Outlet /></div>;

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg)' }}>
      <aside className="hidden w-56 flex-col border-r lg:flex" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <div className="flex h-16 items-center gap-3 border-b px-5" style={{ borderColor: 'var(--border)' }}>
          <img src={awsIcon} alt="AWS" className="h-8 w-8 rounded object-contain border border-[var(--border)] p-1 bg-black/40" />
          <div>
            <p className="text-xs font-semibold" style={{ color: 'var(--text)' }}>SBG Admin</p>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>Recruitment</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-4">
          {navItems.map(({ href, label, icon }) => {
            const active = pathname === href || (href !== '/recruitment/admin' && pathname.startsWith(href));
            return (
              <Link
                key={href}
                to={href}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition"
                style={{ background: active ? 'rgba(255,153,0,.15)' : 'transparent', color: active ? 'var(--accent)' : 'var(--muted)' }}
              >
                <span>{icon}</span>{label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t p-4" style={{ borderColor: 'var(--border)' }}>
          <button
            onClick={async () => { await supabase.auth.signOut(); navigate('/recruitment/admin/login', { replace: true }); }}
            className="w-full rounded-lg px-3 py-2 text-left text-sm transition"
            style={{ color: 'var(--muted)' }}
          >
            Sign Out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto"><Outlet /></main>
    </div>
  );
}
