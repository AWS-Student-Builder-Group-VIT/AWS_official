'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { statusLabel, statusColor, formatDate } from '@/lib/utils';
import type { CandidateProfile } from '@/types';

const roundSteps = [
  { key: 'round_0', settingKey: 'round_0_start_at', label: 'Application', desc: 'Written domain responses and Technical assessment', href: '/dashboard/round-1' },
  { key: 'round_1', settingKey: 'round_1_start_at', label: 'AWS Project', desc: 'A project track for each selected subdomain', href: '/recruitment/round-1' },
  { key: 'round_2', settingKey: 'round_2_start_at', label: 'Interview', desc: 'Interview scheduling by selected subdomain', href: '/recruitment/interview' },
] as const;

type RoundSetting = typeof roundSteps[number]['settingKey'];

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [schedule, setSchedule] = useState<Partial<Record<RoundSetting, string | null>>>({});
  const [now, setNow] = useState(Date.now());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return; }
      Promise.all([
        supabase.from('candidate_profiles').select('*, domain:domains(*), subdomain:subdomains(*), subdomain_choices:candidate_subdomain_choices(*, subdomain:subdomains(*, domain:domains(*)))').eq('id', user.id).single(),
        supabase.from('recruitment_settings').select('key,value').in('key', roundSteps.map((round) => round.settingKey)),
      ]).then(([profileResult, settingsResult]) => {
        setProfile(profileResult.data);
        const next: Partial<Record<RoundSetting, string | null>> = {};
        settingsResult.data?.forEach((row) => { next[row.key as RoundSetting] = (row.value as { at?: string | null })?.at ?? null; });
        setSchedule(next);
        setLoading(false);
      });
    });
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  if (loading) return <LoadingScreen />;
  if (!profile) return null;

  const statusFor = (key: string): string => {
    if (key === 'round_0') return profile.round_0_status;
    if (key === 'round_1') return profile.round_1_status;
    if (key === 'round_2') return profile.interview_status;
    return 'not_started';
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text">Welcome back, {profile.full_name.split(' ')[0]} 👋</h1>
        <p className="mt-1 text-muted">Track your recruitment progress below.</p>
      </div>

      {/* Status card */}
      <div className="mb-8 rounded-xl border border-border bg-surface p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted">Current Status</p>
            <p className={`mt-1 text-xl font-semibold ${statusColor[profile.status]}`}>
              {statusLabel[profile.status]}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted">Subdomain choices</p>
            {profile.subdomain_choices?.length ? [...profile.subdomain_choices].sort((a, b) => a.priority - b.priority).map((choice) => (
              <p key={choice.subdomain_id} className="mt-1 font-mono text-xs text-accent">
                {choice.subdomain?.domain?.slug === 'finance' || choice.subdomain?.domain?.slug === 'outreach'
                  ? choice.subdomain?.domain?.name
                  : `${choice.subdomain?.domain?.name} / ${choice.subdomain?.name}`}
              </p>
            )) : <p className="mt-1 text-text">—</p>}
            <Link href="/recruitment/subdomain" className="mt-2 inline-block text-xs text-muted hover:text-accent">View or change →</Link>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted">Applied</p>
            <p className="mt-1 text-sm text-text">{formatDate(profile.created_at)}</p>
          </div>
        </div>
      </div>

      {/* No domain selected */}
      {!profile.subdomain_id && (
        <div className="mb-8 rounded-xl border border-accent/30 bg-accent/10 p-6">
          <p className="font-semibold text-accent">Select your domains to get started</p>
          <p className="mt-1 text-sm text-muted">Apply to any domain. Technical allows up to two specializations.</p>
          <Link href="/recruitment/subdomain" className="action mt-4">
            Choose Domains →
          </Link>
        </div>
      )}

      {/* Round progress */}
      <h2 className="mb-4 font-semibold text-text">Rounds</h2>
      <div className="space-y-4">
        {roundSteps.map(({ key, settingKey, label, desc, href }) => {
          const st = statusFor(key);
          const isActive = st === 'in_progress' || st === 'not_started';
          const startsAt = schedule[settingKey] ?? null;
          const hasStarted = Boolean(startsAt && now >= new Date(startsAt).getTime());
          const eligible = key === 'round_0' || (key === 'round_1' ? profile.round_0_status === 'qualified' || profile.round_1_status !== 'not_started' : profile.round_1_status === 'qualified' || profile.interview_status !== 'not_started');
          const tracks = [...(profile.subdomain_choices ?? [])].sort((a, b) => a.priority - b.priority);
          return (
            <section key={key} className="rounded-xl border border-border bg-surface p-5">
              <div className="flex items-start gap-5">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                st === 'qualified' ? 'bg-success/20 text-success' :
                st === 'not_qualified' ? 'bg-error/20 text-error' :
                st === 'in_progress' || st === 'submitted' ? 'bg-info/20 text-info' :
                'bg-panel text-dim'
              }`}>
                {st === 'qualified' ? '✓' : key === 'round_0' ? '1' : key === 'round_1' ? '2' : '3'}
              </div>
                <div className="min-w-0 flex-1"><p className="font-medium text-text">Round {Number(key.slice(-1)) + 1} · {label}</p><p className="text-sm text-muted">{desc}</p></div>
                <div className="shrink-0 text-right"><p className={`text-sm font-medium ${statusColor[st]}`}>{statusLabel[st]}</p>{hasStarted ? (isActive && eligible && profile.subdomain_id && <Link href={href} className="action mt-2 !min-h-9 !px-4">{st === 'in_progress' ? 'Continue →' : 'Start now →'}</Link>) : <div className="mt-2"><p className="font-mono text-[10px] uppercase tracking-wider text-dim">Starts</p><p className="mt-1 font-mono text-xs text-accent">{startsAt ? new Date(startsAt).toLocaleString() : 'To be announced'}</p></div>}</div>
              </div>
              {tracks.length > 0 && <div className={`mt-4 grid gap-2 ${tracks.length > 1 ? 'sm:grid-cols-2' : ''}`}>{tracks.map((track) => <div key={track.subdomain_id} className="border border-border bg-bg/50 p-3"><p className="font-mono text-[10px] uppercase tracking-widest text-accent">Selection</p><p className="mt-1 text-sm text-text">{track.subdomain?.domain?.slug === 'finance' || track.subdomain?.domain?.slug === 'outreach' ? track.subdomain?.domain?.name : `${track.subdomain?.domain?.name} / ${track.subdomain?.name}`}</p><p className={`mt-1 text-xs ${statusColor[st]}`}>{statusLabel[st]}</p></div>)}</div>}
              {hasStarted && !eligible && <p className="mt-4 border-l-2 border-border pl-3 text-xs text-muted">Complete and qualify in the previous round to unlock this round.</p>}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <div className="mb-3 h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent mx-auto" />
        <p className="text-sm text-muted">Loading…</p>
      </div>
    </div>
  );
}
