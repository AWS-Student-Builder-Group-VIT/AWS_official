import { useEffect, useState } from 'react';
import { createClient } from '../lib/supabase.js';
import { formatDateTime } from '../lib/utils.js';

const defaultEval = { technical_score: 0, problem_solving_score: 0, aws_score: 0, code_quality_score: 0, ux_score: 0, documentation_score: 0, comments: '', qualified: false };

export default function AdminProjects() {
  const [supabase] = useState(createClient);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(null);
  const [evalData, setEvalData] = useState(defaultEval);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from('project_submissions')
      .select('*, candidate:candidate_profiles(full_name,registration_number), assignment:project_assignments(project:projects(title,code)), evaluation:project_evaluations(*)')
      .order('submitted_at', { ascending: false });
    setSubmissions(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openEval = (s) => { setActive(s.id); setEvalData(s.evaluation ?? { ...defaultEval }); };

  const saveEval = async (s) => {
    setSaving(true);
    const payload = { ...evalData, submission_id: s.id, candidate_id: s.candidate_id };
    if (s.evaluation?.id) await supabase.from('project_evaluations').update(payload).eq('id', s.evaluation.id);
    else await supabase.from('project_evaluations').insert(payload);
    const totalScore = evalData.technical_score + evalData.problem_solving_score + evalData.aws_score + evalData.code_quality_score + evalData.ux_score + evalData.documentation_score;
    await supabase.from('candidate_profiles').update({
      round_1_status: evalData.qualified ? 'qualified' : 'not_qualified',
      round_1_score: totalScore,
      status: evalData.qualified ? 'round_2' : 'rejected',
      current_round: evalData.qualified ? 2 : 1,
    }).eq('id', s.candidate_id);
    await load();
    setActive(null);
    setSaving(false);
  };

  if (loading) return <div className="flex h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} /></div>;
  const activeSubmission = submissions.find((s) => s.id === active);
  const totalScore = evalData.technical_score + evalData.problem_solving_score + evalData.aws_score + evalData.code_quality_score + evalData.ux_score + evalData.documentation_score;

  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-bold" style={{ color: 'var(--text)' }}>Project Submissions ({submissions.length})</h1>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {submissions.length === 0 && <div className="col-span-2 rounded-xl border p-8 text-center text-sm" style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--muted)' }}>No project submissions yet.</div>}
        {submissions.map((s) => (
          <div key={s.id} className="rounded-xl border p-5" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
            <div className="mb-3 flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold" style={{ color: 'var(--text)' }}>{s.candidate.full_name}</p>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>{s.candidate.registration_number}</p>
              </div>
              <span className="font-mono text-xs" style={{ color: 'var(--muted)' }}>{s.assignment.project.code}</span>
            </div>
            <p className="mb-3 truncate text-sm" style={{ color: 'var(--muted)' }}>{s.assignment.project.title}</p>
            <div className="mb-3 flex flex-wrap gap-2">
              <a href={s.github_url} target="_blank" rel="noopener noreferrer" className="text-xs hover:underline" style={{ color: 'var(--accent)' }}>GitHub →</a>
              {s.deployed_url && <a href={s.deployed_url} target="_blank" rel="noopener noreferrer" className="text-xs hover:underline" style={{ color: 'var(--accent)' }}>Demo →</a>}
              {s.demo_video_url && <a href={s.demo_video_url} target="_blank" rel="noopener noreferrer" className="text-xs hover:underline" style={{ color: 'var(--accent)' }}>Video →</a>}
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs" style={{ color: 'var(--dim)' }}>{formatDateTime(s.submitted_at)}{s.is_late ? ' (late)' : ''}</p>
              {s.evaluation
                ? <span className="text-xs font-medium" style={{ color: s.evaluation.qualified ? 'var(--success)' : 'var(--error)' }}>{s.evaluation.qualified ? '✓ Qualified' : '✕ Not Qualified'} ({s.evaluation.total_score}/100)</span>
                : <button onClick={() => openEval(s)} className="rounded-lg px-3 py-1.5 text-xs font-medium transition" style={{ background: 'rgba(255,153,0,.2)', color: 'var(--accent)' }}>Evaluate</button>}
            </div>
          </div>
        ))}
      </div>

      {active && activeSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(10,11,14,.8)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-lg overflow-auto rounded-2xl border p-6" style={{ maxHeight: '90vh', borderColor: 'var(--border)', background: 'var(--surface)' }}>
            <h3 className="mb-1 font-bold" style={{ color: 'var(--text)' }}>Evaluate: {activeSubmission.candidate.full_name}</h3>
            <p className="mb-4 text-sm" style={{ color: 'var(--muted)' }}>{activeSubmission.assignment.project.title}</p>
            {[
              { key: 'technical_score', label: 'Technical (25)', max: 25 },
              { key: 'problem_solving_score', label: 'Problem Solving (20)', max: 20 },
              { key: 'aws_score', label: 'AWS Usage (20)', max: 20 },
              { key: 'code_quality_score', label: 'Code Quality (15)', max: 15 },
              { key: 'ux_score', label: 'UX / UI (10)', max: 10 },
              { key: 'documentation_score', label: 'Documentation (10)', max: 10 },
            ].map(({ key, label, max }) => (
              <div key={key} className="mb-3">
                <label className="mb-1 flex items-center justify-between text-sm" style={{ color: 'var(--muted)' }}>
                  <span>{label}</span><span style={{ color: 'var(--text)' }}>{evalData[key]} / {max}</span>
                </label>
                <input type="range" min={0} max={max} value={evalData[key]}
                  onChange={(e) => setEvalData({ ...evalData, [key]: Number(e.target.value) })}
                  className="w-full" style={{ accentColor: 'var(--accent)' }} />
              </div>
            ))}
            <div className="mb-3 rounded-lg p-3 text-center" style={{ background: 'var(--panel)' }}>
              <span className="text-sm" style={{ color: 'var(--muted)' }}>Total: </span>
              <span className="text-xl font-bold" style={{ color: 'var(--text)' }}>{totalScore}</span>
              <span style={{ color: 'var(--muted)' }}> / 100</span>
            </div>
            <textarea value={evalData.comments} onChange={(e) => setEvalData({ ...evalData, comments: e.target.value })}
              rows={3} placeholder="Evaluation comments…"
              className="mb-3 w-full rounded-lg border px-3 py-2 text-sm resize-none outline-none"
              style={{ borderColor: 'var(--border)', background: 'var(--panel)', color: 'var(--text)' }} />
            <label className="mb-4 flex cursor-pointer items-center gap-2">
              <input type="checkbox" checked={evalData.qualified} onChange={(e) => setEvalData({ ...evalData, qualified: e.target.checked })} style={{ accentColor: 'var(--accent)' }} />
              <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>Mark as Qualified for Interview</span>
            </label>
            <div className="flex gap-3">
              <button onClick={() => saveEval(activeSubmission)} disabled={saving}
                className="flex-1 rounded-lg py-2.5 text-sm font-semibold transition disabled:opacity-50"
                style={{ background: 'var(--accent)', color: 'var(--bg)' }}>
                {saving ? 'Saving…' : 'Save Evaluation'}
              </button>
              <button onClick={() => setActive(null)}
                className="rounded-lg border px-4 py-2.5 text-sm transition"
                style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
