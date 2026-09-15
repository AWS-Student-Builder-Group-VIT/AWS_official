import { useEffect, useState } from 'react';
import { createClient } from '../lib/supabase.js';

export default function AdminResults() {
  const [supabase] = useState(createClient);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [resultMap, setResultMap] = useState({});
  const [feedbackMap, setFeedbackMap] = useState({});

  const load = async () => {
    const { data } = await supabase
      .from('candidate_profiles')
      .select('*, domain:domains(*), final_result:final_results(*)')
      .in('status', ['round_2', 'selected', 'waitlisted', 'rejected'])
      .order('full_name');
    const list = data ?? [];
    setCandidates(list);
    const rm = {};
    const fm = {};
    list.forEach((c) => {
      if (c.final_result) { rm[c.id] = c.final_result.result; fm[c.id] = c.final_result.feedback ?? ''; }
    });
    setResultMap(rm);
    setFeedbackMap(fm);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const saveResult = async (candidateId) => {
    const result = resultMap[candidateId];
    if (!result) return;
    setSaving(candidateId);
    const candidate = candidates.find((c) => c.id === candidateId);
    const payload = { candidate_id: candidateId, result, feedback: feedbackMap[candidateId] || null };
    if (candidate?.final_result) await supabase.from('final_results').update({ result, feedback: payload.feedback }).eq('candidate_id', candidateId);
    else await supabase.from('final_results').insert(payload);
    await supabase.from('candidate_profiles').update({
      final_status: result,
      status: result === 'selected' ? 'selected' : result === 'waitlisted' ? 'waitlisted' : 'rejected',
    }).eq('id', candidateId);
    await load();
    setSaving(null);
  };

  if (loading) return <div className="flex h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} /></div>;

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="mb-2 text-2xl font-bold" style={{ color: 'var(--text)' }}>Final Results</h1>
      <p className="mb-6" style={{ color: 'var(--muted)' }}>Publish final decisions for interview-stage candidates.</p>
      {candidates.length === 0 && <div className="rounded-xl border p-8 text-center text-sm" style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--muted)' }}>No candidates in interview stage yet.</div>}
      <div className="space-y-4">
        {candidates.map((c) => (
          <div key={c.id} className="rounded-xl border p-5" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
            <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-semibold" style={{ color: 'var(--text)' }}>{c.full_name}</p>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>{c.registration_number} · {c.domain?.name ?? '—'}</p>
              </div>
              {c.final_result && (
                <span className="rounded-full px-3 py-1 text-xs font-semibold"
                  style={{ background: c.final_result.result === 'selected' ? 'rgba(34,197,94,.2)' : c.final_result.result === 'waitlisted' ? 'rgba(245,158,11,.2)' : 'rgba(239,68,68,.2)', color: c.final_result.result === 'selected' ? 'var(--success)' : c.final_result.result === 'waitlisted' ? 'var(--warning)' : 'var(--error)' }}>
                  {c.final_result.result}
                </span>
              )}
            </div>
            <div className="mb-3 flex flex-wrap gap-3">
              {['selected', 'waitlisted', 'not_selected'].map((r) => (
                <label key={r} className="flex cursor-pointer items-center gap-2">
                  <input type="radio" name={`result-${c.id}`} value={r} checked={resultMap[c.id] === r}
                    onChange={() => setResultMap({ ...resultMap, [c.id]: r })} style={{ accentColor: 'var(--accent)' }} />
                  <span className="text-sm capitalize" style={{ color: r === 'selected' ? 'var(--success)' : r === 'waitlisted' ? 'var(--warning)' : 'var(--error)' }}>{r.replace('_', ' ')}</span>
                </label>
              ))}
            </div>
            <textarea value={feedbackMap[c.id] ?? ''} onChange={(e) => setFeedbackMap({ ...feedbackMap, [c.id]: e.target.value })}
              rows={2} placeholder="Feedback for candidate (optional, visible to them)…"
              className="mb-3 w-full rounded-lg border px-3 py-2 text-sm resize-none outline-none"
              style={{ borderColor: 'var(--border)', background: 'var(--panel)', color: 'var(--text)' }} />
            <button onClick={() => saveResult(c.id)} disabled={!resultMap[c.id] || saving === c.id}
              className="rounded-lg px-5 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
              style={{ background: 'var(--accent)', color: 'var(--bg)' }}>
              {saving === c.id ? 'Saving…' : 'Publish Result'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
