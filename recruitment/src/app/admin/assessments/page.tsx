'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { formatDateTime } from '@/lib/utils';

interface AttemptRow {
  id: string;
  candidate_id: string;
  score: number | null;
  total_marks: number | null;
  submitted_at: string | null;
  auto_submitted: boolean;
  status: string;
  admin_qualified: boolean | null;
  admin_notes: string | null;
  results_released_at: string | null;
  results_released_by: string | null;
  candidate: { full_name: string; registration_number: string };
  domain: { name: string };
  subdomain: { name: string };
}

export default function AdminAssessments() {
  const supabase = createClient();
  const [attempts, setAttempts] = useState<AttemptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = async () => {
    const { data } = await supabase
      .from('assessment_attempts')
      .select('*, candidate:candidate_profiles(full_name,registration_number), domain:domains(name), subdomain:subdomains(name)')
      .eq('status', 'submitted')
      .order('submitted_at', { ascending: false });
    setAttempts((data as AttemptRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const qualify = async (id: string, qualified: boolean, notes: string) => {
    setSaving(id);
    const { data: attempt } = await supabase.from('assessment_attempts').select('candidate_id').eq('id', id).single();
    await supabase.from('assessment_attempts').update({ admin_qualified: qualified, admin_notes: notes }).eq('id', id);
    await supabase.from('candidate_profiles').update({
      round_0_status: qualified ? 'qualified' : 'not_qualified',
      round_0_score: attempts.find((a) => a.id === id)?.score,
      current_round: qualified ? 1 : 0,
      status: qualified ? 'round_1' : 'rejected',
    }).eq('id', attempt!.candidate_id);
    await load();
    setSaving(null);
  };

  const releaseMarks = async (id: string, release: boolean) => {
    setSaving(id);
    setError('');
    const { data: { session } } = await supabase.auth.getSession();
    const response = session ? await fetch('/api/admin/assessments/release', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ attempt_id: id, release }),
    }) : null;
    if (!response?.ok) { const result = response ? await response.json() : null; setError(result?.error ?? 'Administrator session expired.'); }
    else await load();
    setSaving(null);
  };

  if (loading) return <Spinner />;

  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-bold text-text">Round 1 Assessments — Review ({attempts.length})</h1>
      {error && <div role="alert" className="mb-4 rounded-lg border border-error/40 bg-error/10 p-3 text-sm text-error">{error}</div>}
      <div className="space-y-4">
        {attempts.length === 0 && (
          <div className="rounded-xl border border-border bg-surface p-8 text-center text-sm text-muted">
            No submitted assessments to review.
          </div>
        )}
        {attempts.map((a) => (
          <AttemptCard key={a.id} attempt={a} saving={saving === a.id} onQualify={qualify} onReleaseMarks={releaseMarks} />
        ))}
      </div>
    </div>
  );
}

function AttemptCard({ attempt: a, saving, onQualify, onReleaseMarks }: {
  attempt: AttemptRow;
  saving: boolean;
  onQualify: (id: string, qualified: boolean, notes: string) => void;
  onReleaseMarks: (id: string, release: boolean) => void;
}) {
  const [notes, setNotes] = useState(a.admin_notes ?? '');
  const pct = a.score != null && a.total_marks ? Math.round((a.score / a.total_marks) * 100) : null;
  const alreadyReviewed = a.admin_qualified != null;

  return (
    <div className={`rounded-xl border p-5 ${alreadyReviewed ? 'border-border bg-surface/60' : 'border-accent/30 bg-surface'}`}>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
        <div>
          <p className="font-semibold text-text">{a.candidate.full_name}</p>
          <p className="text-xs text-muted">{a.candidate.registration_number} · {a.domain.name} / {a.subdomain?.name ?? '—'}</p>
        </div>
        <div className="text-right">
          {pct != null && (
            <p className={`text-2xl font-bold ${pct >= 70 ? 'text-success' : pct >= 40 ? 'text-warning' : 'text-error'}`}>
              {pct}%
            </p>
          )}
          <p className="text-xs text-muted">{a.score ?? '?'} / {a.total_marks ?? '?'} marks</p>
          {a.auto_submitted && <p className="text-xs text-warning">Auto-submitted (time up)</p>}
        </div>
      </div>

      {!alreadyReviewed && (
        <>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Admin notes (optional)…"
            className="w-full rounded-lg border border-border bg-panel px-3 py-2 text-sm text-text placeholder-dim focus:border-accent resize-none mb-3"
          />
          <div className="flex gap-3">
            <button
              onClick={() => onQualify(a.id, true, notes)}
              disabled={saving}
              className="rounded-lg bg-success/20 px-5 py-2 text-sm font-semibold text-success hover:bg-success/30 transition disabled:opacity-50"
            >
              {saving ? '…' : '✓ Qualify'}
            </button>
            <button
              onClick={() => onQualify(a.id, false, notes)}
              disabled={saving}
              className="rounded-lg bg-error/20 px-5 py-2 text-sm font-semibold text-error hover:bg-error/30 transition disabled:opacity-50"
            >
              {saving ? '…' : '✕ Not Qualified'}
            </button>
          </div>
        </>
      )}

      {alreadyReviewed && (
        <p className={`text-sm font-medium ${a.admin_qualified ? 'text-success' : 'text-error'}`}>
          {a.admin_qualified ? '✓ Qualified' : '✕ Not Qualified'}
          {a.admin_notes && <span className="ml-2 font-normal text-muted">— {a.admin_notes}</span>}
        </p>
      )}

      <div className="mt-4 border-t border-border pt-4">
        <button
          onClick={() => onReleaseMarks(a.id, !a.results_released_at)}
          disabled={saving}
          className={`rounded-lg px-5 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${a.results_released_at ? 'bg-warning/15 text-warning hover:bg-warning/25' : 'bg-accent text-bg hover:bg-accent-muted'}`}
        >
          {saving ? 'Saving…' : a.results_released_at ? 'Hide marks from candidate' : a.score == null ? 'Calculate & release marks' : 'Release marks to candidate'}
        </button>
        <p className="mt-2 text-xs text-dim">{a.results_released_at ? `Released ${formatDateTime(a.results_released_at)}` : 'The candidate currently sees “Results will be released shortly.”'}</p>
      </div>

      <p className="mt-2 text-xs text-dim">Submitted {a.submitted_at ? formatDateTime(a.submitted_at) : '—'}</p>
    </div>
  );
}

function Spinner() {
  return <div className="flex h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent" /></div>;
}
