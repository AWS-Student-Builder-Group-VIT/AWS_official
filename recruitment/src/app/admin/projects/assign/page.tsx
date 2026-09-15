'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase';
import type { CandidateProfile, Project } from '@/types';

type AssignmentRow = { candidate_id: string; subdomain_id: string; project_id: string };

export default function AssignProjects() {
  const supabase = createClient();
  const [candidates, setCandidates] = useState<CandidateProfile[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [existing, setExisting] = useState<AssignmentRow[]>([]);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [{ data: c }, { data: p }, { data: assignments }] = await Promise.all([
      supabase.from('candidate_profiles').select('*, subdomain_choices:candidate_subdomain_choices(*, subdomain:subdomains(*, domain:domains(*)))').eq('round_0_status', 'qualified').order('full_name'),
      supabase.from('projects').select('*').eq('is_active', true),
      supabase.from('project_assignments').select('candidate_id,subdomain_id,project_id'),
    ]);
    setCandidates(c ?? []);
    setProjects(p ?? []);
    setExisting((assignments ?? []) as AssignmentRow[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const tracks = useMemo(() => candidates.flatMap((candidate) => (candidate.subdomain_choices ?? []).map((choice) => ({ candidate, choice, key: `${candidate.id}:${choice.subdomain_id}` }))), [candidates]);

  async function assign(key: string, candidateId: string, subdomainId: string) {
    const projectId = selections[key];
    if (!projectId) return;
    setSaving(key);
    const project = projects.find((item) => item.id === projectId);
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + (project?.deadline_days ?? 7));
    await supabase.from('project_assignments').upsert({ candidate_id: candidateId, subdomain_id: subdomainId, project_id: projectId, deadline: deadline.toISOString(), status: 'assigned' }, { onConflict: 'candidate_id,subdomain_id' });
    await supabase.from('candidate_profiles').update({ round_1_status: 'in_progress', status: 'round_1', current_round: 1 }).eq('id', candidateId);
    await load();
    setSaving(null);
  }

  if (loading) return <Spinner />;
  const pending = tracks.filter(({ candidate, choice }) => !existing.some((row) => row.candidate_id === candidate.id && row.subdomain_id === choice.subdomain_id));
  const assigned = tracks.filter(({ candidate, choice }) => existing.some((row) => row.candidate_id === candidate.id && row.subdomain_id === choice.subdomain_id));

  return <main className="mx-auto max-w-5xl p-6"><h1 className="text-2xl font-bold text-text">Assign Project Tracks</h1><p className="mt-2 text-muted">Each selected subdomain receives its own project assignment.</p>
    {pending.length > 0 && <section className="mt-7"><h2 className="mb-3 font-semibold text-warning">Pending tracks ({pending.length})</h2><div className="space-y-3">{pending.map(({ candidate, choice, key }) => {
      const matching = projects.filter((project) => project.subdomain_id === choice.subdomain_id);
      return <div key={key} className="flex flex-wrap items-center gap-4 rounded-xl border border-warning/30 bg-surface p-4"><div className="min-w-0 flex-1"><p className="font-medium text-text">{candidate.full_name}</p><p className="text-xs text-muted">{candidate.registration_number} · Track {choice.priority}: {choice.subdomain?.domain?.name} / {choice.subdomain?.name}</p></div><select value={selections[key] ?? ''} onChange={(event) => setSelections((current) => ({ ...current, [key]: event.target.value }))} className="rounded-lg border border-border bg-panel px-3 py-2 text-sm text-text"><option value="">Select project…</option>{matching.map((project) => <option key={project.id} value={project.id}>{project.code} — {project.title}</option>)}</select><button onClick={() => assign(key, candidate.id, choice.subdomain_id)} disabled={!selections[key] || saving === key} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-bg disabled:opacity-50">{saving === key ? '…' : 'Assign'}</button></div>;
    })}</div></section>}
    {assigned.length > 0 && <section className="mt-8"><h2 className="mb-3 font-semibold text-success">Assigned tracks</h2><div className="space-y-3">{assigned.map(({ candidate, choice, key }) => { const row = existing.find((item) => item.candidate_id === candidate.id && item.subdomain_id === choice.subdomain_id); const project = projects.find((item) => item.id === row?.project_id); return <div key={key} className="flex items-center justify-between gap-4 rounded-xl border border-border bg-surface p-4 opacity-75"><div><p className="font-medium text-text">{candidate.full_name}</p><p className="text-xs text-muted">{choice.subdomain?.name}</p></div><p className="text-sm text-muted">{project?.code} — {project?.title}</p></div>; })}</div></section>}
  </main>;
}

function Spinner() { return <div className="flex h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent" /></div>; }
