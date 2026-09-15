'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import type { CandidateProfile, FinalResult } from '@/types';

interface EligibleCandidate extends CandidateProfile {
  final_result?: { result: FinalResult; feedback: string | null };
}

export default function AdminResults() {
  const supabase = createClient();
  const [candidates, setCandidates] = useState<EligibleCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [resultMap, setResultMap] = useState<Record<string, FinalResult>>({});
  const [feedbackMap, setFeedbackMap] = useState<Record<string, string>>({});

  const load = async () => {
    const { data } = await supabase
      .from('candidate_profiles')
      .select('*, domain:domains(*), final_result:final_results(*)')
      .in('status', ['round_2', 'selected', 'waitlisted', 'rejected'])
      .order('full_name');
    const list = (data as EligibleCandidate[]) ?? [];
    setCandidates(list);
    const rm: Record<string, FinalResult> = {};
    const fm: Record<string, string> = {};
    list.forEach((c) => {
      if (c.final_result) {
        rm[c.id] = c.final_result.result;
        fm[c.id] = c.final_result.feedback ?? '';
      }
    });
    setResultMap(rm);
    setFeedbackMap(fm);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const saveResult = async (candidateId: string) => {
    const result = resultMap[candidateId];
    if (!result) return;
    setSaving(candidateId);

    const candidate = candidates.find((c) => c.id === candidateId);
    const payload = { candidate_id: candidateId, result, feedback: feedbackMap[candidateId] || null };

    if (candidate?.final_result) {
      await supabase.from('final_results').update({ result, feedback: payload.feedback }).eq('candidate_id', candidateId);
    } else {
      await supabase.from('final_results').insert(payload);
    }

    await supabase.from('candidate_profiles').update({
      final_status: result,
      status: result === 'selected' ? 'selected' : result === 'waitlisted' ? 'waitlisted' : 'rejected',
    }).eq('id', candidateId);

    await load();
    setSaving(null);
  };

  if (loading) return <Spinner />;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="mb-2 text-2xl font-bold text-text">Final Results</h1>
      <p className="mb-6 text-muted">Publish final decisions for interview-stage candidates.</p>

      {candidates.length === 0 && (
        <div className="rounded-xl border border-border bg-surface p-8 text-center text-sm text-muted">
          No candidates in interview stage yet.
        </div>
      )}

      <div className="space-y-4">
        {candidates.map((c) => (
          <div key={c.id} className="rounded-xl border border-border bg-surface p-5">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-text">{c.full_name}</p>
                <p className="text-xs text-muted">{c.registration_number} · {c.domain?.name ?? '—'}</p>
              </div>
              {c.final_result && (
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  c.final_result.result === 'selected' ? 'bg-success/20 text-success' :
                  c.final_result.result === 'waitlisted' ? 'bg-warning/20 text-warning' :
                  'bg-error/20 text-error'
                }`}>
                  {c.final_result.result}
                </span>
              )}
            </div>

            <div className="mb-3 flex flex-wrap gap-3">
              {(['selected', 'waitlisted', 'not_selected'] as FinalResult[]).map((r) => (
                <label key={r} className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name={`result-${c.id}`}
                    value={r}
                    checked={resultMap[c.id] === r}
                    onChange={() => setResultMap({ ...resultMap, [c.id]: r })}
                    className="accent-[#FF9900]"
                  />
                  <span className={`text-sm capitalize ${
                    r === 'selected' ? 'text-success' :
                    r === 'waitlisted' ? 'text-warning' : 'text-error'
                  }`}>{r.replace('_', ' ')}</span>
                </label>
              ))}
            </div>

            <textarea
              value={feedbackMap[c.id] ?? ''}
              onChange={(e) => setFeedbackMap({ ...feedbackMap, [c.id]: e.target.value })}
              rows={2}
              placeholder="Feedback for candidate (optional, visible to them)…"
              className="mb-3 w-full rounded-lg border border-border bg-panel px-3 py-2 text-sm text-text placeholder-dim focus:border-accent resize-none"
            />

            <button
              onClick={() => saveResult(c.id)}
              disabled={!resultMap[c.id] || saving === c.id}
              className="rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-bg hover:bg-accent-muted transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving === c.id ? 'Saving…' : 'Publish Result'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function Spinner() {
  return <div className="flex h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent" /></div>;
}
