import { useEffect, useState } from 'react';
import { createClient } from '../lib/supabase.js';
import { formatDateTime } from '../lib/utils.js';

export default function AdminAssessments() {
  const [supabase] = useState(createClient);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [error, setError] = useState('');
  const [minPercent, setMinPercent] = useState(40);
  const [markOthers, setMarkOthers] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkResult, setBulkResult] = useState('');

  const load = async () => {
    const { data } = await supabase
      .from('assessment_attempts')
      .select('*, candidate:candidate_profiles(full_name,registration_number), domain:domains(name), subdomain:subdomains(name)')
      .eq('status', 'submitted')
      .order('submitted_at', { ascending: false });
    setAttempts(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const qualify = async (id, qualified, notes) => {
    setSaving(id);
    const { data: attempt } = await supabase.from('assessment_attempts').select('candidate_id').eq('id', id).single();
    await supabase.from('assessment_attempts').update({ admin_qualified: qualified, admin_notes: notes }).eq('id', id);
    await supabase.from('candidate_profiles').update({
      round_0_status: qualified ? 'qualified' : 'not_qualified',
      round_0_score: attempts.find((a) => a.id === id)?.score,
      current_round: qualified ? 1 : 0,
      status: qualified ? 'round_1' : 'rejected',
    }).eq('id', attempt.candidate_id);
    await load();
    setSaving(null);
  };

  // Qualify everyone at or above a threshold the admin picks.
  const bulkQualify = async () => {
    const summary = markOthers
      ? `Qualify every unreviewed candidate scoring ${minPercent}% or above, and mark the rest not qualified?`
      : `Qualify every unreviewed candidate scoring ${minPercent}% or above?`;
    if (!confirm(summary)) return;
    setBulkBusy(true);
    setError('');
    setBulkResult('');
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setError('Administrator session expired.'); setBulkBusy(false); return; }
    const response = await fetch('/api/recruitment/admin/assessments/bulk-qualify', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ minPercent: Number(minPercent), markOthersNotQualified: markOthers }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) setError(result.error ?? 'Bulk qualify failed.');
    else {
      setBulkResult(`${result.qualified} qualified, ${result.notQualified} not qualified, ${result.skipped} skipped of ${result.considered} reviewed.`);
      await load();
    }
    setBulkBusy(false);
  };

  const releaseMarks = async (id, release) => {
    setSaving(id);
    setError('');
    const { data: { session } } = await supabase.auth.getSession();
    const response = session ? await fetch('/api/recruitment/admin/assessments/release', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ attempt_id: id, release }),
    }) : null;
    if (!response?.ok) { const r = response ? await response.json() : null; setError(r?.error ?? 'Administrator session expired.'); }
    else await load();
    setSaving(null);
  };

  if (loading) return <div className="flex h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} /></div>;

  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-bold" style={{ color: 'var(--text)' }}>Round 1 Assessments — Review ({attempts.length})</h1>
      {error && <div role="alert" className="mb-4 rounded-lg border p-3 text-sm" style={{ borderColor: 'rgba(239,68,68,.4)', background: 'rgba(239,68,68,.1)', color: 'var(--error)' }}>{error}</div>}

      <section className="mb-6 rounded-xl border p-5" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <p className="label">BULK QUALIFY</p>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--muted)' }}>
            Qualify everyone scoring at least
            <input type="number" min="0" max="100" value={minPercent} onChange={(e) => setMinPercent(e.target.value)}
              className="w-20 border px-2 py-1.5 text-sm outline-none focus:border-[var(--accent)]"
              style={{ borderColor: 'var(--border)', background: 'var(--bg)', color: 'var(--text)' }} />
            %
          </label>
          <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--muted)' }}>
            <input type="checkbox" checked={markOthers} onChange={(e) => setMarkOthers(e.target.checked)} style={{ accentColor: 'var(--accent)' }} />
            Also mark everyone below as not qualified
          </label>
          <button type="button" onClick={bulkQualify} disabled={bulkBusy || attempts.length === 0} className="action !min-h-10">
            {bulkBusy ? 'Applying…' : 'Apply to all'}
          </button>
        </div>
        <p className="mt-3 text-xs" style={{ color: 'var(--dim)' }}>
          Only candidates you have not already reviewed are changed. Unscored attempts are skipped.
        </p>
        {bulkResult && <p role="status" className="mt-2 text-sm" style={{ color: 'var(--success)' }}>{bulkResult}</p>}
      </section>
      <div className="space-y-4">
        {attempts.length === 0 && <div className="rounded-xl border p-8 text-center text-sm" style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--muted)' }}>No submitted assessments to review.</div>}
        {attempts.map((a) => <AttemptCard key={a.id} attempt={a} saving={saving === a.id} onQualify={qualify} onReleaseMarks={releaseMarks} />)}
      </div>
    </div>
  );
}

function AttemptCard({ attempt: a, saving, onQualify, onReleaseMarks }) {
  const [notes, setNotes] = useState(a.admin_notes ?? '');
  const pct = a.score != null && a.total_marks ? Math.round((a.score / a.total_marks) * 100) : null;
  const alreadyReviewed = a.admin_qualified != null;
  const pctColor = pct >= 70 ? 'var(--success)' : pct >= 40 ? 'var(--warning)' : 'var(--error)';

  return (
    <div className="rounded-xl border p-5" style={{ borderColor: alreadyReviewed ? 'var(--border)' : 'rgba(255,153,0,.3)', background: alreadyReviewed ? 'rgba(255,255,255,.03)' : 'var(--surface)' }}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-semibold" style={{ color: 'var(--text)' }}>{a.candidate.full_name}</p>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>{a.candidate.registration_number} · {a.domain.name} / {a.subdomain?.name ?? '—'}</p>
        </div>
        <div className="text-right">
          {pct != null && <p className="text-2xl font-bold" style={{ color: pctColor }}>{pct}%</p>}
          <p className="text-xs" style={{ color: 'var(--muted)' }}>{a.score ?? '?'} / {a.total_marks ?? '?'} marks</p>
          {a.auto_submitted && <p className="text-xs" style={{ color: 'var(--warning)' }}>Auto-submitted (time up)</p>}
        </div>
      </div>

      {!alreadyReviewed && (
        <>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
            placeholder="Admin notes (optional)…"
            className="mb-3 w-full rounded-lg border px-3 py-2 text-sm resize-none outline-none"
            style={{ borderColor: 'var(--border)', background: 'var(--panel)', color: 'var(--text)' }} />
          <div className="flex gap-3">
            <button onClick={() => onQualify(a.id, true, notes)} disabled={saving}
              className="rounded-lg px-5 py-2 text-sm font-semibold transition disabled:opacity-50"
              style={{ background: 'rgba(34,197,94,.2)', color: 'var(--success)' }}>
              {saving ? '…' : '✓ Qualify'}
            </button>
            <button onClick={() => onQualify(a.id, false, notes)} disabled={saving}
              className="rounded-lg px-5 py-2 text-sm font-semibold transition disabled:opacity-50"
              style={{ background: 'rgba(239,68,68,.2)', color: 'var(--error)' }}>
              {saving ? '…' : '✕ Not Qualified'}
            </button>
          </div>
        </>
      )}
      {alreadyReviewed && (
        <p className={`text-sm font-medium`} style={{ color: a.admin_qualified ? 'var(--success)' : 'var(--error)' }}>
          {a.admin_qualified ? '✓ Qualified' : '✕ Not Qualified'}
          {a.admin_notes && <span className="ml-2 font-normal" style={{ color: 'var(--muted)' }}>— {a.admin_notes}</span>}
        </p>
      )}

      <div className="mt-4 border-t pt-4" style={{ borderColor: 'var(--border)' }}>
        <button onClick={() => onReleaseMarks(a.id, !a.results_released_at)} disabled={saving}
          className="rounded-lg px-5 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40"
          style={a.results_released_at
            ? { background: 'rgba(245,158,11,.15)', color: 'var(--warning)' }
            : { background: 'var(--accent)', color: 'var(--bg)' }}>
          {saving ? 'Saving…' : a.results_released_at ? 'Hide marks from candidate' : a.score == null ? 'Calculate & release marks' : 'Release marks to candidate'}
        </button>
        <p className="mt-2 text-xs" style={{ color: 'var(--dim)' }}>
          {a.results_released_at ? `Released ${formatDateTime(a.results_released_at)}` : 'The candidate currently sees "Results will be released shortly."'}
        </p>
        <p className="mt-2 text-xs" style={{ color: 'var(--dim)' }}>Submitted {a.submitted_at ? formatDateTime(a.submitted_at) : '—'}</p>
      </div>
    </div>
  );
}
