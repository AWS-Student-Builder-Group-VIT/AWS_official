'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { statusLabel } from '@/lib/utils';
import type { CandidateProfile, FinalResultRecord } from '@/types';

export default function ResultPage() {
  const router = useRouter();
  const supabase = createClient();
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [result, setResult] = useState<FinalResultRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/auth'); return; }
      const [{ data: p }, { data: r }] = await Promise.all([
        supabase.from('candidate_profiles').select('*, domain:domains(*)').eq('id', user.id).single(),
        supabase.from('final_results').select('*').eq('candidate_id', user.id).single(),
      ]);
      setProfile(p);
      setResult(r);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <Spinner />;

  const emoji = result?.result === 'selected' ? '🎉' :
    result?.result === 'waitlisted' ? '⏳' : '🙏';

  const title = result?.result === 'selected' ? 'Congratulations! You\'re selected.' :
    result?.result === 'waitlisted' ? 'You\'re on the waitlist.' :
    result ? 'Thank you for applying.' : 'Result Pending';

  const color = result?.result === 'selected' ? 'text-success' :
    result?.result === 'waitlisted' ? 'text-warning' :
    result ? 'text-error' : 'text-muted';

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-lg text-center">
        {!result ? (
          <>
            <div className="text-5xl mb-4">⏳</div>
            <h2 className="mb-2 text-2xl font-bold text-text">Result Not Announced</h2>
            <p className="text-muted">Final results haven't been published yet. Check back after your interview.</p>
            <a href="/dashboard" className="mt-6 inline-block rounded-xl border border-border px-6 py-3 text-sm text-muted hover:border-muted hover:text-text transition">
              Back to Dashboard
            </a>
          </>
        ) : (
          <div className="rounded-2xl border border-border bg-surface p-10">
            <div className="mb-4 text-6xl">{emoji}</div>
            <h2 className={`mb-2 text-3xl font-bold ${color}`}>{title}</h2>

            {result.result === 'selected' && (
              <p className="mt-3 text-muted">
                Welcome to AWS Student Builder Group VIT! You'll receive onboarding details soon.
              </p>
            )}
            {result.result === 'waitlisted' && (
              <p className="mt-3 text-muted">
                You're on our waitlist. We'll reach out if a spot opens up.
              </p>
            )}
            {result.result === 'not_selected' && (
              <p className="mt-3 text-muted">
                We appreciated your effort and time. We encourage you to apply again next cycle.
              </p>
            )}

            {result.feedback && (
              <div className="mt-6 rounded-xl border border-border bg-panel p-4 text-left">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Feedback</p>
                <p className="text-sm text-text">{result.feedback}</p>
              </div>
            )}

            <div className="mt-6 grid grid-cols-3 gap-4 text-sm">
              <div className="rounded-lg bg-panel p-3">
                <p className="text-xs text-muted">Assessment</p>
                <p className={`mt-1 font-medium ${profile?.round_0_status === 'qualified' ? 'text-success' : 'text-error'}`}>
                  {statusLabel[profile?.round_0_status ?? 'not_started']}
                </p>
              </div>
              <div className="rounded-lg bg-panel p-3">
                <p className="text-xs text-muted">Project</p>
                <p className={`mt-1 font-medium ${profile?.round_1_status === 'qualified' ? 'text-success' : 'text-muted'}`}>
                  {statusLabel[profile?.round_1_status ?? 'not_started']}
                </p>
              </div>
              <div className="rounded-lg bg-panel p-3">
                <p className="text-xs text-muted">Interview</p>
                <p className={`mt-1 font-medium ${profile?.interview_status === 'qualified' ? 'text-success' : 'text-muted'}`}>
                  {statusLabel[profile?.interview_status ?? 'not_started']}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Spinner() {
  return <div className="flex h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent" /></div>;
}
