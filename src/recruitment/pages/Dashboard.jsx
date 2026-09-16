import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { createClient } from '../lib/supabase.js';
import { statusLabel, statusColor, formatDate } from '../lib/utils.js';

const roundSteps = [
  { key: 'round_0', settingKey: 'round_0_start_at', label: 'Application', desc: 'Written domain responses and Technical assessment', href: '/recruitment/dashboard/round-1' },
  { key: 'round_1', settingKey: 'round_1_start_at', label: 'AWS Project', desc: 'A project track for each selected subdomain', href: '/recruitment/round-1' },
  { key: 'round_2', settingKey: 'round_2_start_at', label: 'Interview', desc: 'Interview scheduling by selected subdomain', href: '/recruitment/interview' },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [supabase] = useState(createClient);
  const [profile, setProfile] = useState(null);
  const [schedule, setSchedule] = useState({});
  const [now, setNow] = useState(Date.now());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { navigate('/recruitment/login', { replace: true }); return; }
      Promise.all([
        supabase.from('candidate_profiles')
          .select('*, subdomain_choices:candidate_subdomain_choices(*, subdomain:subdomains(*, domain:domains(*)))')
          .eq('id', user.id).maybeSingle(),
        supabase.from('recruitment_settings')
          .select('key,value')
          .in('key', roundSteps.map((r) => r.settingKey)),
      ]).then(([profileResult, settingsResult]) => {
        if (profileResult.error) setLoadError(profileResult.error.message);
        setProfile(profileResult.data);
        const next = {};
        settingsResult.data?.forEach((row) => { next[row.key] = row.value?.at ?? null; });
        setSchedule(next);
        setLoading(false);
      });
    });
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  if (loading) return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-t-[var(--accent)]" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} />
        <p className="text-sm" style={{ color: 'var(--muted)' }}>Loading…</p>
      </div>
    </div>
  );
  // No profile row means completion never succeeded; showing an empty page hides that.
  // Only a genuinely missing record sends the candidate to the form; a failed
  // query must surface, or the two pages redirect to each other forever.
  if (loadError) return (
    <main className="mx-auto max-w-lg p-8 text-center">
      <p className="eyebrow">DASHBOARD</p>
      <h1 className="mt-4 text-2xl font-bold">Could not load your dashboard.</h1>
      <p role="alert" className="mt-4 text-sm" style={{ color: 'var(--error)' }}>{loadError}</p>
      <button type="button" onClick={() => window.location.reload()} className="action mt-6">Try again</button>
    </main>
  );
  if (!profile) return <Navigate to="/recruitment/profile/complete" replace />;

  const statusFor = (key) => {
    if (key === 'round_0') return profile.round_0_status;
    if (key === 'round_1') return profile.round_1_status;
    if (key === 'round_2') return profile.interview_status;
    return 'not_started';
  };

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Welcome back, {profile.full_name?.split(' ')[0]} 👋</h1>
        <p className="mt-1" style={{ color: 'var(--muted)' }}>Track your recruitment progress below.</p>
      </div>

      {/* Status card */}
      <div className="mb-8 rounded-xl border p-6" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>Current Status</p>
            <p className={`mt-1 text-xl font-semibold ${statusColor[profile.status]}`}>{statusLabel[profile.status]}</p>
          </div>
          <div className="text-right">
            <p className="text-sm" style={{ color: 'var(--muted)' }}>Subdomain choices</p>
            {profile.subdomain_choices?.length
              ? [...profile.subdomain_choices].sort((a, b) => a.priority - b.priority).map((choice) => (
                <p key={choice.subdomain_id} className="mt-1 font-mono text-xs" style={{ color: 'var(--accent)' }}>
                  {choice.subdomain?.domain?.slug === 'finance' || choice.subdomain?.domain?.slug === 'outreach'
                    ? choice.subdomain?.domain?.name
                    : `${choice.subdomain?.domain?.name} / ${choice.subdomain?.name}`}
                </p>
              ))
              : <p className="mt-1" style={{ color: 'var(--text)' }}>—</p>}
            <Link to="/recruitment/subdomain" className="mt-2 inline-block text-xs transition hover:underline" style={{ color: 'var(--muted)' }}>
              {profile.domain_locked || (profile.round_0_status && profile.round_0_status !== 'not_started') ? 'View choices →' : 'View or change →'}
            </Link>
          </div>
          <div className="text-right">
            <p className="text-sm" style={{ color: 'var(--muted)' }}>Applied</p>
            <p className="mt-1 text-sm" style={{ color: 'var(--text)' }}>{formatDate(profile.created_at)}</p>
          </div>
        </div>
      </div>

      {!profile.subdomain_id && (
        <div className="mb-8 rounded-xl border p-6" style={{ borderColor: 'rgba(255,153,0,.3)', background: 'rgba(255,153,0,.1)' }}>
          <p className="font-semibold" style={{ color: 'var(--accent)' }}>Select your domains to get started</p>
          <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>Apply to any domain. Technical allows up to two specializations.</p>
          <Link to="/recruitment/subdomain" className="action mt-4">Choose Domains →</Link>
        </div>
      )}

      {profile.final_status && (
        <div className="mb-8 rounded-xl border p-6" style={{ borderColor: 'rgba(34,197,94,.3)', background: 'rgba(34,197,94,.08)' }}>
          <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--muted)' }}>Final decision</p>
          <p className={`mt-2 text-xl font-semibold ${statusColor[profile.final_status]}`}>{statusLabel[profile.final_status]}</p>
          <p className="mt-2 text-sm leading-6" style={{ color: 'var(--muted)' }}>
            This is the recruitment team&apos;s final decision. It takes precedence over the individual round statuses below.
          </p>
        </div>
      )}

      <h2 className="mb-4 font-semibold" style={{ color: 'var(--text)' }}>Rounds</h2>
      <div className="space-y-4">
        {roundSteps.map(({ key, settingKey, label, desc, href }) => {
          const st = statusFor(key);
          const isActive = st === 'in_progress' || st === 'not_started';
          const startsAt = schedule[settingKey] ?? null;
          const hasStarted = Boolean(startsAt && now >= new Date(startsAt).getTime());
          const eligible = key === 'round_0'
            || (key === 'round_1' ? profile.round_0_status === 'qualified' || profile.round_1_status !== 'not_started'
              : profile.round_1_status === 'qualified' || profile.interview_status !== 'not_started');
          const tracks = [...(profile.subdomain_choices ?? [])].sort((a, b) => a.priority - b.priority);
          return (
            <section key={key} className="rounded-xl border p-5" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
              <div className="flex items-start gap-5">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                  st === 'qualified' ? 'bg-success/20 text-success' :
                  st === 'not_qualified' ? 'bg-error/20 text-error' :
                  st === 'in_progress' || st === 'submitted' ? 'bg-info/20 text-info' : 'bg-panel text-dim'
                }`}>
                  {st === 'qualified' ? '✓' : key === 'round_0' ? '1' : key === 'round_1' ? '2' : '3'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium" style={{ color: 'var(--text)' }}>Round {Number(key.slice(-1)) + 1} · {label}</p>
                  <p className="text-sm" style={{ color: 'var(--muted)' }}>{desc}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className={`text-sm font-medium ${statusColor[st]}`}>{statusLabel[st]}</p>
                  {hasStarted
                    ? (isActive && eligible && profile.subdomain_id && (
                      <Link to={href} className="action mt-2 !min-h-9 !px-4">
                        {st === 'in_progress' ? 'Continue →' : 'Start now →'}
                      </Link>
                    ))
                    : (
                      <div className="mt-2">
                        <p className="font-mono text-[10px] uppercase tracking-wider" style={{ color: 'var(--dim)' }}>Starts</p>
                        <p className="mt-1 font-mono text-xs" style={{ color: 'var(--accent)' }}>
                          {startsAt ? new Date(startsAt).toLocaleString() : 'To be announced'}
                        </p>
                      </div>
                    )}
                </div>
              </div>
              {tracks.length > 0 && (
                <div className={`mt-4 grid gap-2 ${tracks.length > 1 ? 'sm:grid-cols-2' : ''}`}>
                  {tracks.map((track) => (
                    <div key={track.subdomain_id} className="border p-3" style={{ borderColor: 'var(--border)', background: 'rgba(0,0,0,.3)' }}>
                      <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--accent)' }}>Selection</p>
                      <p className="mt-1 text-sm" style={{ color: 'var(--text)' }}>
                        {track.subdomain?.domain?.slug === 'finance' || track.subdomain?.domain?.slug === 'outreach'
                          ? track.subdomain?.domain?.name
                          : `${track.subdomain?.domain?.name} / ${track.subdomain?.name}`}
                      </p>
                    </div>
                  ))}
                </div>
              )}
              {hasStarted && !eligible && (
                <p className="mt-4 border-l-2 pl-3 text-xs" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>
                  Complete and qualify in the previous round to unlock this round.
                </p>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
