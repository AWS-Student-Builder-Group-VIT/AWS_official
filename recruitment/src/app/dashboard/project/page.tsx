'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createClient } from '@/lib/supabase';
import { formatDate, formatDateTime } from '@/lib/utils';
import type { CandidateProfile, CandidateSubdomainChoice, ProjectAssignment, ProjectSubmission, SubdomainRoundGuideline } from '@/types';

const submitSchema = z.object({
  github_url: z.string().url('Enter a valid GitHub repository URL').refine((value) => {
    const url = new URL(value);
    return url.hostname.toLowerCase() === 'github.com' && url.pathname.split('/').filter(Boolean).length >= 2;
  }, 'Use a repository link such as https://github.com/username/project'),
});

type SubmitData = z.infer<typeof submitSchema>;

export default function ProjectPage() {
  const router = useRouter();
  const supabase = createClient();
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [assignment, setAssignment] = useState<ProjectAssignment | null>(null);
  const [submission, setSubmission] = useState<ProjectSubmission | null>(null);
  const [assignments, setAssignments] = useState<ProjectAssignment[]>([]);
  const [submissions, setSubmissions] = useState<ProjectSubmission[]>([]);
  const [guidelines, setGuidelines] = useState<Record<string, SubdomainRoundGuideline>>({});
  const [activeSubdomainId, setActiveSubdomainId] = useState('');
  const [roundStartAt, setRoundStartAt] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<SubmitData>({ resolver: zodResolver(submitSchema) });

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      const [{ data: p }, { data: a }, { data: schedule }] = await Promise.all([
        supabase.from('candidate_profiles').select('*, domain:domains(*), subdomain:subdomains(*), subdomain_choices:candidate_subdomain_choices(*, subdomain:subdomains(*, domain:domains(*)))').eq('id', user.id).single(),
        supabase.from('project_assignments').select('*, project:projects(*)').eq('candidate_id', user.id).order('assigned_at'),
        supabase.from('recruitment_settings').select('value').eq('key', 'round_1_start_at').maybeSingle(),
      ]);
      setProfile(p);
      const assignmentRows = (a ?? []) as ProjectAssignment[];
      setAssignments(assignmentRows);
      const choiceRows = [...(p?.subdomain_choices ?? [])].sort((left, right) => left.priority - right.priority);
      const initialSubdomain = choiceRows[0]?.subdomain_id ?? p?.subdomain_id ?? '';
      setActiveSubdomainId(initialSubdomain);
      setAssignment(assignmentRows.find((item) => item.subdomain_id === initialSubdomain) ?? null);
      if (assignmentRows.length) {
        const { data: subs } = await supabase.from('project_submissions').select('*').in('assignment_id', assignmentRows.map((item) => item.id));
        const submissionRows = (subs ?? []) as ProjectSubmission[];
        setSubmissions(submissionRows);
        const initialAssignment = assignmentRows.find((item) => item.subdomain_id === initialSubdomain);
        setSubmission(submissionRows.find((item) => item.assignment_id === initialAssignment?.id) ?? null);
      }
      if (choiceRows.length) {
        const { data: guidelineRows } = await supabase.from('subdomain_round_guidelines').select('*').eq('round_number', 2).in('subdomain_id', choiceRows.map((choice) => choice.subdomain_id));
        setGuidelines(Object.fromEntries(((guidelineRows ?? []) as SubdomainRoundGuideline[]).map((item) => [item.subdomain_id, item])));
      }
      const scheduleValue = schedule?.value as { at?: string | null } | null;
      setRoundStartAt(scheduleValue?.at ?? null);
      setLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const onSubmit = async (data: SubmitData) => {
    if (!assignment || !profile) return;
    setSubmitting(true);
    setError('');

    const isLate = new Date() > new Date(assignment.deadline);
    const { error: err } = await supabase.from('project_submissions').insert({
      assignment_id: assignment.id,
      candidate_id: profile.id,
      github_url: data.github_url,
      is_late: isLate,
    });

    if (err) { setError(err.message); setSubmitting(false); return; }

    await supabase.from('project_assignments').update({ status: 'submitted' }).eq('id', assignment.id);
    const { data: candidateAssignments } = await supabase.from('project_assignments').select('status').eq('candidate_id', profile.id);
    if (candidateAssignments?.length && candidateAssignments.every((item) => item.status === 'submitted')) {
      await supabase.from('candidate_profiles').update({ round_1_status: 'submitted' }).eq('id', profile.id);
    }

    router.refresh();
    window.location.reload();
  };

  if (loading) return <Spinner />;

  const tracks = [...(profile?.subdomain_choices ?? [])].sort((a, b) => a.priority - b.priority);
  const roundOpen = Boolean(roundStartAt && now >= new Date(roundStartAt).getTime());
  const selectTrack = (subdomainId: string) => {
    setActiveSubdomainId(subdomainId);
    const nextAssignment = assignments.find((item) => item.subdomain_id === subdomainId) ?? null;
    setAssignment(nextAssignment);
    setSubmission(submissions.find((item) => item.assignment_id === nextAssignment?.id) ?? null);
    form.reset();
    setError('');
  };
  const tabs = <TrackTabs tracks={tracks} active={activeSubdomainId} onSelect={selectTrack} />;

  if (!roundOpen) return <div className="mx-auto max-w-3xl p-6"><h1 className="text-2xl font-bold text-text">Round 2 — Project</h1>{tabs}<div className="mt-6 border border-border bg-surface p-6"><p className="text-sm text-muted">Round 2 starts</p><p className="mt-2 font-mono text-accent">{roundStartAt ? formatDateTime(roundStartAt) : 'To be announced'}</p></div></div>;

  if (!assignment) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <h1 className="mb-2 text-2xl font-bold text-text">Round 2 — Project</h1>
        {tabs}
        <GuidelineCard guideline={guidelines[activeSubdomainId]?.guidelines} round={2} />
        {profile?.round_0_status === 'qualified' || profile?.round_1_status !== 'not_started' ? (
          <div className="mt-6 rounded-xl border border-border bg-surface p-8 text-center">
            <div className="text-3xl mb-3">⏳</div>
            <p className="font-medium text-text">Project Not Assigned Yet</p>
            <p className="mt-2 text-sm text-muted">Your project assignment will appear here once the admin assigns it. Check back soon.</p>
          </div>
        ) : (
          <div className="mt-6 rounded-xl border border-border bg-surface p-8 text-center">
            <p className="text-muted">Complete and qualify in Round 1 to unlock Round 2.</p>
          </div>
        )}
      </div>
    );
  }

  const project = assignment.project!;
  const deadline = new Date(assignment.deadline);
  const isPast = new Date() > deadline;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="mb-2 text-2xl font-bold text-text">Round 2 — Project</h1>
      <p className="mb-6 text-muted">Build your assigned project and submit your own GitHub repository before the deadline.</p>
      {tabs}
      <GuidelineCard guideline={guidelines[activeSubdomainId]?.guidelines} round={2} />

      {/* Project card */}
      <div className="mb-6 rounded-xl border border-border bg-surface p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <span className="text-xs font-mono text-muted">{project.code}</span>
            <h2 className="mt-1 text-xl font-bold text-text">{project.title}</h2>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${
            isPast ? 'bg-error/20 text-error' : 'bg-warning/20 text-warning'
          }`}>
            {isPast ? 'Deadline passed' : `Due ${formatDate(assignment.deadline)}`}
          </span>
        </div>

        <div className="mb-4 space-y-3">
          <section>
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Problem Statement</h3>
            <p className="text-sm text-text leading-relaxed">{project.problem_statement}</p>
          </section>
          <section>
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Requirements</h3>
            <pre className="whitespace-pre-wrap text-sm text-text leading-relaxed font-sans">{project.requirements}</pre>
          </section>
          <section>
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">AWS Services</h3>
            <div className="flex flex-wrap gap-2">
              {project.aws_services.map((s) => (
                <span key={s} className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs text-accent">{s}</span>
              ))}
            </div>
          </section>
          {project.optional_features && (
            <section>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Optional Features (bonus)</h3>
              <p className="text-sm text-muted">{project.optional_features}</p>
            </section>
          )}
        </div>

        <div className="flex items-center gap-2 border-t border-border pt-4 text-xs text-muted">
          <span>Assigned {formatDateTime(assignment.assigned_at)}</span>
          <span>·</span>
          <span>Deadline {formatDateTime(assignment.deadline)}</span>
        </div>
      </div>

      {/* Submission */}
      {submission ? (
        <div className="rounded-xl border border-success/30 bg-success/10 p-6">
          <h3 className="mb-2 font-semibold text-success">✓ Project Submitted</h3>
          <p className="text-sm text-muted">Submitted {formatDateTime(submission.submitted_at)}{submission.is_late ? ' (late)' : ''}</p>
          <a href={submission.github_url} target="_blank" rel="noopener noreferrer" className="mt-3 block text-sm text-accent hover:underline">
            {submission.github_url}
          </a>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-surface p-6">
          <h3 className="mb-2 font-semibold text-text">Submit Your GitHub Repository</h3>
          <p className="mb-4 text-sm text-muted">Create the repository in your own GitHub account, push your completed project, and submit its link here.</p>
          {error && <div className="mb-4 rounded-lg border border-error/30 bg-error/10 p-3 text-sm text-error">{error}</div>}
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Field label="GitHub Repository URL *" error={form.formState.errors.github_url?.message}>
              <input className="input-field" placeholder="https://github.com/you/project" {...form.register('github_url')} />
            </Field>
            <button type="submit" disabled={submitting} className="btn-primary w-full">
              {submitting ? 'Submitting…' : 'Submit Project'}
            </button>
          </form>
        </div>
      )}

      <style jsx>{`
        .input-field { width:100%; background:var(--panel); border:1px solid var(--border); border-radius:0.5rem; color:var(--text); padding:0.625rem 0.875rem; font-size:0.875rem; outline:none; }
        .input-field:focus { border-color:var(--accent); }
        .input-field::placeholder { color:var(--dim); }
        .btn-primary { background:var(--accent); color:var(--bg); border-radius:0.75rem; padding:0.75rem 1.5rem; font-weight:600; font-size:0.875rem; cursor:pointer; }
        .btn-primary:hover:not(:disabled) { background:var(--accent-muted); }
        .btn-primary:disabled { opacity:0.6; cursor:not-allowed; }
      `}</style>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-muted">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-error">{error}</p>}
    </div>
  );
}

function TrackTabs({ tracks, active, onSelect }: { tracks: CandidateSubdomainChoice[]; active: string; onSelect: (id: string) => void }) {
  if (tracks.length < 2) return null;
  return <div className="my-6 flex border-b border-border" role="tablist" aria-label="Project subdomains">{tracks.map((track) => <button key={track.subdomain_id} role="tab" aria-selected={active === track.subdomain_id} onClick={() => onSelect(track.subdomain_id)} className={`border-b-2 px-4 py-3 text-left font-mono text-xs uppercase ${active === track.subdomain_id ? 'border-accent text-accent' : 'border-transparent text-muted hover:text-text'}`}>{track.priority}. {track.subdomain?.name}</button>)}</div>;
}

function GuidelineCard({ guideline, round }: { guideline?: string; round: 2 | 3 }) {
  if (!guideline) return null;
  return <section className="mb-6 border border-accent/30 bg-accent/5 p-5"><p className="font-mono text-[10px] font-bold uppercase tracking-widest text-accent">Round {round} guidelines</p><pre className="mt-3 whitespace-pre-wrap font-sans text-sm leading-6 text-text">{guideline}</pre></section>;
}

function Spinner() {
  return <div className="flex h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent" /></div>;
}
