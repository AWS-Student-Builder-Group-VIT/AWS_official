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
  const [menuOpen, setMenuOpen] = useState(false);

  const pathname = location.pathname;
  const isLoginPage = pathname === '/recruitment/admin/login';
  // The operations console runs full width, so it has no permanent sidebar.
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

  useEffect(() => { setMenuOpen(false); }, [pathname]);

  useEffect(() => {
    const close = (event) => { if (event.key === 'Escape') setMenuOpen(false); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate('/recruitment/admin/login', { replace: true });
  };

  const navLinks = (
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
  );

  const sidebarInner = (
    <>
      <div className="flex h-16 items-center gap-3 border-b px-5" style={{ borderColor: 'var(--border)' }}>
        <img src={awsIcon} alt="AWS" className="h-8 w-8 rounded object-contain border border-[var(--border)] p-1 bg-black/40" />
        <div>
          <p className="text-xs font-semibold" style={{ color: 'var(--text)' }}>AWS SBG Admin</p>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>Recruitment</p>
        </div>
      </div>
      {navLinks}
      <div className="border-t p-4" style={{ borderColor: 'var(--border)' }}>
        <button onClick={signOut} className="w-full rounded-lg px-3 py-2 text-left text-sm transition" style={{ color: 'var(--muted)' }}>
          Sign Out
        </button>
      </div>
    </>
  );

  // Hovering the button is enough to reveal the menu; clicking pins it open.
  const menuButton = (
    <button
      type="button"
      onMouseEnter={() => setMenuOpen(true)}
      onFocus={() => setMenuOpen(true)}
      onClick={() => setMenuOpen((open) => !open)}
      aria-label="Menu"
      aria-expanded={menuOpen}
      className="grid h-10 w-10 place-items-center border transition hover:border-[var(--accent)]"
      style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--accent)' }}
    >
      <span className="space-y-1">
        <span className="block h-0.5 w-4" style={{ background: 'currentColor' }} />
        <span className="block h-0.5 w-4" style={{ background: 'currentColor' }} />
        <span className="block h-0.5 w-4" style={{ background: 'currentColor' }} />
      </span>
    </button>
  );

  const drawer = (
    <>
      {menuOpen && (
        <button type="button" aria-label="Close menu" onClick={() => setMenuOpen(false)}
          className="fixed inset-0 z-30" style={{ background: 'rgba(8,10,13,.7)' }} />
      )}
      <aside
        onMouseLeave={() => setMenuOpen(false)}
        className={`fixed inset-y-0 left-0 z-40 w-56 flex-col border-r ${menuOpen ? 'flex' : 'hidden'}`}
        style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
      >
        {sidebarInner}
      </aside>
    </>
  );

  if (isLoginPage) return <div className="min-h-screen"><Outlet /></div>;

  if (checking) return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} />
    </div>
  );

  // Full-width console: the menu is the only navigation, so it is always shown.
  if (isOperationsPage) return (
    <div className="rct-admin min-h-screen">
      <div className="fixed left-4 top-4 z-50">{menuButton}</div>
      {drawer}
      <Outlet />
    </div>
  );

  return (
    <div className="rct-admin flex min-h-screen" style={{ background: 'var(--bg)' }}>
      <aside className="hidden w-56 flex-col border-r lg:flex" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        {sidebarInner}
      </aside>
      {drawer}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-14 items-center gap-3 border-b px-4 lg:hidden" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          {menuButton}
          <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>AWS SBG Admin</span>
        </div>
        <main className="flex-1 overflow-auto"><Outlet /></main>
      </div>
    </div>
  );
}
