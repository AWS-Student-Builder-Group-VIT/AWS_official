'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { formatDateTime } from '@/lib/utils';

interface SubmissionRow {
  id: string;
  assignment_id: string;
  candidate_id: string;
  github_url: string;
  deployed_url: string | null;
  demo_video_url: string | null;
  hardest_problem: string;
  submitted_at: string;
  is_late: boolean;
  candidate: { full_name: string; registration_number: string };
  assignment: { project: { title: string; code: string } };
  evaluation: EvalRow | null;
}

interface EvalRow {
  id?: string;
  technical_score: number;
  problem_solving_score: number;
  aws_score: number;
  code_quality_score: number;
  ux_score: number;
  documentation_score: number;
  total_score?: number;
  comments: string;
  qualified: boolean;
}

const defaultEval: EvalRow = {
  technical_score: 0, problem_solving_score: 0, aws_score: 0,
  code_quality_score: 0, ux_score: 0, documentation_score: 0,
  comments: '', qualified: false,
};

export default function AdminProjects() {
  const supabase = createClient();
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<string | null>(null);
  const [evalData, setEvalData] = useState<EvalRow>(defaultEval);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from('project_submissions')
      .select(`*, candidate:candidate_profiles(full_name,registration_number),
        assignment:project_assignments(project:projects(title,code)),
        evaluation:project_evaluations(*)`)
      .order('submitted_at', { ascending: false });
    setSubmissions((data as SubmissionRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openEval = (s: SubmissionRow) => {
    setActive(s.id);
    setEvalData(s.evaluation ?? { ...defaultEval });
  };

  const saveEval = async (s: SubmissionRow) => {
    setSaving(true);
    const payload = { ...evalData, submission_id: s.id, candidate_id: s.candidate_id };
    if (s.evaluation?.id) {
      await supabase.from('project_evaluations').update(payload).eq('id', s.evaluation.id);
    } else {
      await supabase.from('project_evaluations').insert(payload);
    }
    await supabase.from('candidate_profiles').update({
      round_1_status: evalData.qualified ? 'qualified' : 'not_qualified',
      round_1_score: evalData.technical_score + evalData.problem_solving_score + evalData.aws_score +
        evalData.code_quality_score + evalData.ux_score + evalData.documentation_score,
      status: evalData.qualified ? 'round_2' : 'rejected',
      current_round: evalData.qualified ? 2 : 1,
    }).eq('id', s.candidate_id);
    await load();
    setActive(null);
    setSaving(false);
  };

  if (loading) return <Spinner />;

  const activeSubmission = submissions.find((s) => s.id === active);

  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-bold text-text">Project Submissions ({submissions.length})</h1>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {submissions.length === 0 && (
          <div className="col-span-2 rounded-xl border border-border bg-surface p-8 text-center text-sm text-muted">
            No project submissions yet.
          </div>
        )}
        {submissions.map((s) => (
          <div key={s.id} className="rounded-xl border border-border bg-surface p-5">
            <div className="mb-3 flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-text">{s.candidate.full_name}</p>
                <p className="text-xs text-muted">{s.candidate.registration_number}</p>
              </div>
              <span className="text-xs font-mono text-muted">{s.assignment.project.code}</span>
            </div>
            <p className="mb-3 text-sm text-muted truncate">{s.assignment.project.title}</p>
            <div className="flex flex-wrap gap-2 mb-3">
              <a href={s.github_url} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline">GitHub →</a>
              {s.deployed_url && <a href={s.deployed_url} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline">Demo →</a>}
              {s.demo_video_url && <a href={s.demo_video_url} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline">Video →</a>}
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-dim">{formatDateTime(s.submitted_at)}{s.is_late ? ' (late)' : ''}</p>
              {s.evaluation ? (
                <span className={`text-xs font-medium ${s.evaluation.qualified ? 'text-success' : 'text-error'}`}>
                  {s.evaluation.qualified ? '✓ Qualified' : '✕ Not Qualified'} ({s.evaluation.total_score}/100)
                </span>
              ) : (
                <button onClick={() => openEval(s)} className="rounded-lg bg-accent/20 px-3 py-1.5 text-xs font-medium text-accent hover:bg-accent/30 transition">
                  Evaluate
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Eval modal */}
      {active && activeSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 p-4 backdrop-blur">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-surface p-6 overflow-auto max-h-screen">
            <h3 className="mb-1 font-bold text-text">Evaluate: {activeSubmission.candidate.full_name}</h3>
            <p className="mb-4 text-sm text-muted">{activeSubmission.assignment.project.title}</p>

            {[
              { key: 'technical_score', label: 'Technical (25)', max: 25 },
              { key: 'problem_solving_score', label: 'Problem Solving (20)', max: 20 },
              { key: 'aws_score', label: 'AWS Usage (20)', max: 20 },
              { key: 'code_quality_score', label: 'Code Quality (15)', max: 15 },
              { key: 'ux_score', label: 'UX / UI (10)', max: 10 },
              { key: 'documentation_score', label: 'Documentation (10)', max: 10 },
            ].map(({ key, label, max }) => (
              <div key={key} className="mb-3">
                <label className="mb-1 flex items-center justify-between text-sm text-muted">
                  <span>{label}</span>
                  <span className="text-text">{(evalData as any)[key]} / {max}</span>
                </label>
                <input
                  type="range" min={0} max={max}
                  value={(evalData as any)[key]}
                  onChange={(e) => setEvalData({ ...evalData, [key]: Number(e.target.value) })}
                  className="w-full accent-[#FF9900]"
                />
              </div>
            ))}

            <div className="mb-3 rounded-lg bg-panel p-3 text-center">
              <span className="text-sm text-muted">Total: </span>
              <span className="text-xl font-bold text-text">
                {evalData.technical_score + evalData.problem_solving_score + evalData.aws_score +
                  evalData.code_quality_score + evalData.ux_score + evalData.documentation_score}
              </span>
              <span className="text-muted"> / 100</span>
            </div>

            <textarea
              value={evalData.comments}
              onChange={(e) => setEvalData({ ...evalData, comments: e.target.value })}
              rows={3} placeholder="Evaluation comments…"
              className="mb-3 w-full rounded-lg border border-border bg-panel px-3 py-2 text-sm text-text focus:border-accent resize-none"
            />

            <label className="mb-4 flex cursor-pointer items-center gap-2">
              <input type="checkbox" checked={evalData.qualified}
                onChange={(e) => setEvalData({ ...evalData, qualified: e.target.checked })}
                className="accent-[#FF9900]" />
              <span className="text-sm text-text font-medium">Mark as Qualified for Interview</span>
            </label>

            <div className="flex gap-3">
              <button onClick={() => saveEval(activeSubmission)} disabled={saving}
                className="flex-1 rounded-lg bg-accent py-2.5 text-sm font-semibold text-bg hover:bg-accent-muted transition disabled:opacity-50">
                {saving ? 'Saving…' : 'Save Evaluation'}
              </button>
              <button onClick={() => setActive(null)}
                className="rounded-lg border border-border px-4 py-2.5 text-sm text-muted hover:text-text transition">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Spinner() {
  return <div className="flex h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent" /></div>;
}
