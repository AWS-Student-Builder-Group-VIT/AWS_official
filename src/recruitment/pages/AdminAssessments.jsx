import { useEffect, useMemo, useState } from 'react';
import { CheckSquare, Square, Check, X, Filter, Send } from 'lucide-react';
import { createClient } from '../lib/supabase.js';
import { formatDateTime } from '../lib/utils.js';

export default function AdminAssessments() {
  const [supabase] = useState(createClient);
  const [attempts, setAttempts] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [batchSaving, setBatchSaving] = useState(false);
  const [error, setError] = useState('');

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

  const unreviewedCount = useMemo(() => attempts.filter((a) => a.admin_qualified == null).length, [attempts]);
  const isAllSelected = attempts.length > 0 && selectedIds.length === attempts.length;

  const toggleSelect = (id) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(attempts.map((a) => a.id));
    }
  };

  const selectUnreviewedOnly = () => {
    setSelectedIds(attempts.filter((a) => a.admin_qualified == null).map((a) => a.id));
  };

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

  const qualifyBatch = async (qualified) => {
    if (selectedIds.length === 0 || batchSaving) return;
    setBatchSaving(true);
    setError('');
    try {
      const selectedAttempts = attempts.filter((a) => selectedIds.includes(a.id));
      await supabase.from('assessment_attempts').update({ admin_qualified: qualified }).in('id', selectedIds);
      await Promise.all(
        selectedAttempts.map((a) =>
          supabase.from('candidate_profiles').update({
            round_0_status: qualified ? 'qualified' : 'not_qualified',
            round_0_score: a.score,
            current_round: qualified ? 1 : 0,
            status: qualified ? 'round_1' : 'rejected',
          }).eq('id', a.candidate_id)
        )
      );
      setSelectedIds([]);
      await load();
    } catch (err) {
      setError(err?.message ?? 'Failed to update selected assessments.');
    } finally {
      setBatchSaving(false);
    }
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

  const releaseMarksBatch = async (release) => {
    if (selectedIds.length === 0 || batchSaving) return;
    setBatchSaving(true);
    setError('');
    const { data: { session } } = await supabase.auth.getSession();
    const response = session ? await fetch('/api/recruitment/admin/assessments/release', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ attempt_ids: selectedIds, release }),
    }) : null;
    if (!response?.ok) {
      const r = response ? await response.json() : null;
      setError(r?.error ?? 'Failed to release marks.');
    } else {
      setSelectedIds([]);
      await load();
    }
    setBatchSaving(false);
  };

  if (loading) return <div className="flex h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} /></div>;

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>
            Round 1 Assessments — Review ({attempts.length})
          </h1>
          <p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>
            {unreviewedCount} unreviewed · {attempts.length - unreviewedCount} evaluated
          </p>
        </div>

        {attempts.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={toggleSelectAll}
              className="action-secondary !py-2 !px-3 inline-flex items-center gap-2 text-xs"
            >
              {isAllSelected ? <CheckSquare size={16} /> : <Square size={16} />}
              {isAllSelected ? 'Deselect all' : `Select all (${attempts.length})`}
            </button>
            {unreviewedCount > 0 && (
              <button
                type="button"
                onClick={selectUnreviewedOnly}
                className="action-secondary !py-2 !px-3 inline-flex items-center gap-2 text-xs"
              >
                <Filter size={14} />
                Select unreviewed ({unreviewedCount})
              </button>
            )}
          </div>
        )}
      </div>

      {selectedIds.length > 0 && (
        <div
          className="sticky top-4 z-20 mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border p-4 shadow-xl backdrop-blur-md"
          style={{ borderColor: 'var(--accent)', background: 'rgba(20,24,33,.95)' }}
        >
          <div className="flex items-center gap-3">
            <span
              className="inline-flex h-7 w-7 items-center justify-center rounded-full font-mono text-xs font-bold"
              style={{ background: 'var(--accent)', color: 'var(--bg)' }}
            >
              {selectedIds.length}
            </span>
            <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
              Candidate{selectedIds.length === 1 ? '' : 's'} selected
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => qualifyBatch(true)}
              disabled={batchSaving}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition disabled:opacity-50"
              style={{ background: 'rgba(34,197,94,.25)', color: 'var(--success)', border: '1px solid rgba(34,197,94,.5)' }}
            >
              <Check size={16} />
              {batchSaving ? 'Processing…' : `Qualify selected (${selectedIds.length})`}
            </button>
            <button
              type="button"
              onClick={() => qualifyBatch(false)}
              disabled={batchSaving}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition disabled:opacity-50"
              style={{ background: 'rgba(239,68,68,.25)', color: 'var(--error)', border: '1px solid rgba(239,68,68,.5)' }}
            >
              <X size={16} />
              {batchSaving ? 'Processing…' : `Disqualify selected (${selectedIds.length})`}
            </button>
            <button
              type="button"
              onClick={() => releaseMarksBatch(true)}
              disabled={batchSaving}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition disabled:opacity-50"
              style={{ background: 'rgba(255,153,0,.25)', color: 'var(--accent)', border: '1px solid rgba(255,153,0,.5)' }}
            >
              <Send size={15} />
              {batchSaving ? 'Processing…' : `Release marks (${selectedIds.length})`}
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              disabled={batchSaving}
              className="text-xs transition hover:underline"
              style={{ color: 'var(--muted)' }}
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {error && <div role="alert" className="mb-4 rounded-lg border p-3 text-sm" style={{ borderColor: 'rgba(239,68,68,.4)', background: 'rgba(239,68,68,.1)', color: 'var(--error)' }}>{error}</div>}
      <div className="space-y-4">
        {attempts.length === 0 && <div className="rounded-xl border p-8 text-center text-sm" style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--muted)' }}>No submitted assessments to review.</div>}
        {attempts.map((a) => (
          <AttemptCard
            key={a.id}
            attempt={a}
            selected={selectedIds.includes(a.id)}
            onToggleSelect={() => toggleSelect(a.id)}
            saving={saving === a.id || batchSaving}
            onQualify={qualify}
            onReleaseMarks={releaseMarks}
          />
        ))}
      </div>
    </div>
  );
}

function AttemptCard({ attempt: a, selected, onToggleSelect, saving, onQualify, onReleaseMarks }) {
  const [notes, setNotes] = useState(a.admin_notes ?? '');
  const pct = a.score != null && a.total_marks ? Math.round((a.score / a.total_marks) * 100) : null;
  const alreadyReviewed = a.admin_qualified != null;
  const pctColor = pct >= 70 ? 'var(--success)' : pct >= 40 ? 'var(--warning)' : 'var(--error)';

  return (
    <div
      className="rounded-xl border p-5 transition"
      style={{
        borderColor: selected
          ? 'var(--accent)'
          : alreadyReviewed
            ? 'var(--border)'
            : 'rgba(255,153,0,.3)',
        background: selected
          ? 'rgba(255,153,0,.08)'
          : alreadyReviewed
            ? 'rgba(255,255,255,.03)'
            : 'var(--surface)',
      }}
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelect}
            className="mt-1 h-4 w-4 cursor-pointer accent-[#FF9900]"
            aria-label={`Select ${a.candidate.full_name}`}
          />
          <div>
            <p className="font-semibold" style={{ color: 'var(--text)' }}>{a.candidate.full_name}</p>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>{a.candidate.registration_number} · {a.domain.name} / {a.subdomain?.name ?? '—'}</p>
          </div>
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
