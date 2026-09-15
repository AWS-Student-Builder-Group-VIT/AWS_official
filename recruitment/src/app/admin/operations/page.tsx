'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Activity, CalendarClock, CheckCircle2, ClipboardCheck, Download, FilePlus2, FolderKanban, Mail, RefreshCw, Search, ShieldCheck, Users, X } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { formatDateTime } from '@/lib/utils';
import { candidateCsvRow } from '@/lib/admin-export.mjs';
import type { AssessmentAttempt, CandidateProfile, CandidateWrittenAnswer, Domain, FinalResultRecord, InterviewBooking, Project, ProjectAssignment, ProjectSubmission } from '@/types';
import QuestionBank from './question-bank';

type AdminIdentity = { id: string; email: string; name: string; role: string };
type Assignment = ProjectAssignment & { project?: Project };
type Evaluation = { id: string; submission_id: string; total_score?: number; qualified?: boolean; comments?: string; technical_score?: number; problem_solving_score?: number; aws_score?: number; code_quality_score?: number; ux_score?: number; documentation_score?: number };
type Submission = ProjectSubmission & { evaluation?: Evaluation | null };
type Booking = InterviewBooking & { slot?: { slot_time?: string; date?: { date?: string; location?: string; meeting_link?: string; subdomain_id?: string } } };
type Slot = { id: string; is_booked: boolean; status: string };
type WrittenAnswer = CandidateWrittenAnswer & { question?: { prompt?: string }; domain?: { name?: string; slug?: string } };
type OperationsPayload = { admin: AdminIdentity; candidates: CandidateProfile[]; attempts: AssessmentAttempt[]; assignments: Assignment[]; submissions: Submission[]; bookings: Booking[]; results: FinalResultRecord[]; domains: Domain[]; slots: Slot[]; written_questions: unknown[]; written_rules: unknown[]; written_answers: WrittenAnswer[]; synced_at: string };
type CandidateRecord = { profile: CandidateProfile; attempt?: AssessmentAttempt; assignments: Assignment[]; submissions: Submission[]; bookings: Booking[]; writtenAnswers: WrittenAnswer[]; result?: FinalResultRecord };
type SortMode = 'newest' | 'score_desc' | 'score_asc' | 'name' | 'status';

const emptyPayload: OperationsPayload = { admin: { id: '', email: '', name: '', role: '' }, candidates: [], attempts: [], assignments: [], submissions: [], bookings: [], results: [], domains: [], slots: [], written_questions: [], written_rules: [], written_answers: [], synced_at: '' };
const stageOrder: Record<string, number> = { selected: 8, waitlisted: 7, round_2: 6, round_1: 5, round_0: 4, pending: 3, rejected: 1 };

function humanize(value?: string | null) {
  return value ? value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) : 'Not started';
}

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

function scorePercent(attempt?: AssessmentAttempt) {
  if (attempt?.score == null || !attempt.total_marks) return null;
  return Math.round((attempt.score / attempt.total_marks) * 100);
}

function choiceLabel(choice: NonNullable<CandidateProfile['subdomain_choices']>[number]) {
  const domain = choice.subdomain?.domain;
  return domain?.slug === 'finance' || domain?.slug === 'outreach'
    ? domain.name
    : `${domain?.name ?? 'Domain'} / ${choice.subdomain?.name ?? 'Track'}`;
}

export default function AdminOperationsPage() {
  const router = useRouter();
  const [supabase] = useState(createClient);
  const [payload, setPayload] = useState<OperationsPayload>(emptyPayload);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [domainIds, setDomainIds] = useState<string[]>([]);
  const [subdomainId, setSubdomainId] = useState('');
  const [stage, setStage] = useState('');
  const [minScore, setMinScore] = useState(0);
  const [sort, setSort] = useState<SortMode>('newest');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showQuestionBank, setShowQuestionBank] = useState(false);
  const [releasingId, setReleasingId] = useState<string | null>(null);

  async function load(silent = false) {
    if (silent) setRefreshing(true); else setLoading(true);
    setError('');
    let token = '';
    try {
      const { data: { session } } = await supabase.auth.getSession();
      token = session?.access_token || '';
    } catch {}
    if (!token && typeof window !== 'undefined') {
      token = sessionStorage.getItem('aws_admin_token') || localStorage.getItem('aws_admin_token') || '';
    }
    if (!token) { router.replace('/admin/login'); return; }
    const response = await fetch('/api/admin/operations', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
    const result = await response.json();
    if (!response.ok) setError(result.error ?? 'Unable to load operations data.');
    else setPayload(result as OperationsPayload);
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => { load(); }, []);

  const records = useMemo<CandidateRecord[]>(() => payload.candidates.map((profile) => {
    const assignments = payload.assignments.filter((item) => item.candidate_id === profile.id);
    const assignmentIds = new Set(assignments.map((item) => item.id));
    return {
      profile,
      attempt: payload.attempts.find((item) => item.candidate_id === profile.id),
      assignments,
      submissions: payload.submissions.filter((item) => assignmentIds.has(item.assignment_id)),
      bookings: payload.bookings.filter((item) => item.candidate_id === profile.id),
      writtenAnswers: payload.written_answers.filter((item) => item.candidate_id === profile.id),
      result: payload.results.find((item) => item.candidate_id === profile.id),
    };
  }), [payload]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const list = records.filter((record) => {
      const choices = record.profile.subdomain_choices ?? [];
      const searchable = [record.profile.full_name, record.profile.registration_number, record.profile.email, record.profile.phone, ...choices.map(choiceLabel), ...record.writtenAnswers.flatMap((answer) => [answer.answer_text, answer.question?.prompt])].filter(Boolean).join(' ').toLowerCase();
      const domainMatch = domainIds.length === 0 || choices.some((choice) => choice.subdomain?.domain_id && domainIds.includes(choice.subdomain.domain_id));
      const subdomainMatch = !subdomainId || choices.some((choice) => choice.subdomain_id === subdomainId);
      const pct = scorePercent(record.attempt);
      return (!query || searchable.includes(query)) && domainMatch && subdomainMatch && (!stage || record.profile.status === stage) && (minScore === 0 || (pct != null && pct >= minScore));
    });
    return list.sort((left, right) => {
      if (sort === 'score_desc') return (scorePercent(right.attempt) ?? -1) - (scorePercent(left.attempt) ?? -1);
      if (sort === 'score_asc') return (scorePercent(left.attempt) ?? 101) - (scorePercent(right.attempt) ?? 101);
      if (sort === 'name') return left.profile.full_name.localeCompare(right.profile.full_name);
      if (sort === 'status') return (stageOrder[right.profile.status] ?? 0) - (stageOrder[left.profile.status] ?? 0);
      return new Date(right.profile.created_at).getTime() - new Date(left.profile.created_at).getTime();
    });
  }, [records, search, domainIds, subdomainId, stage, minScore, sort]);

  const selected = records.find((record) => record.profile.id === selectedId) ?? null;
  const visibleSubdomains = useMemo(() => payload.domains
    .filter((domain) => domainIds.includes(domain.id))
    .flatMap((domain) => domain.subdomains ?? []), [payload.domains, domainIds]);

  useEffect(() => {
    if (subdomainId && !visibleSubdomains.some((subdomain) => subdomain.id === subdomainId)) {
      setSubdomainId('');
    }
  }, [subdomainId, visibleSubdomains]);

  const metrics = useMemo(() => {
    const evaluated = payload.attempts.filter((attempt) => attempt.admin_qualified != null).length;
    const qualified = payload.attempts.filter((attempt) => attempt.admin_qualified === true).length;
    const graded = payload.submissions.filter((submission) => submission.evaluation).length;
    const offers = payload.results.filter((result) => result.result === 'selected').length;
    const backlog = records.filter((record) => record.profile.status === 'pending' || record.attempt?.status === 'submitted' && record.attempt.admin_qualified == null || record.submissions.some((submission) => !submission.evaluation)).length;
    return { evaluated, qualified, graded, offers, backlog };
  }, [payload, records]);

  function toggleDomain(id: string) {
    setDomainIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function resetFilters() {
    setSearch(''); setDomainIds([]); setSubdomainId(''); setStage(''); setMinScore(0); setSort('newest');
  }

  async function setMarksRelease(attemptId: string, release: boolean) {
    setReleasingId(attemptId);
    setError('');
    const { data: { session } } = await supabase.auth.getSession();
    const response = session ? await fetch('/api/admin/assessments/release', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ attempt_id: attemptId, release }),
    }) : null;
    if (!response?.ok) { const result = response ? await response.json() : null; setError(result?.error ?? 'Administrator session expired.'); }
    else await load(true);
    setReleasingId(null);
  }

  function exportCsv() {
    const quote = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;
    const rows = filtered.map(({ profile, attempt, assignments, bookings, result, writtenAnswers }) => {
      const exportRow = candidateCsvRow({
        profile,
        choices: [...(profile.subdomain_choices ?? [])].sort((a, b) => a.priority - b.priority).map(choiceLabel),
        writtenAnswers: writtenAnswers.map((answer) => ({ domain: answer.domain?.name ?? 'Domain', prompt: answer.question?.prompt ?? 'Question', answer: answer.answer_text, links: answer.submission_links })),
      });
      return [exportRow.registration_number, exportRow.full_name, profile.email, profile.phone, profile.year, profile.branch, exportRow.choices, exportRow.written_responses, profile.status, attempt?.score, attempt?.total_marks, assignments.map((item) => item.project?.code).join(' | '), bookings.map((item) => `${item.slot?.date?.date ?? ''} ${item.slot?.slot_time ?? ''}`).join(' | '), result?.result];
    });
    const csv = [['Registration', 'Name', 'Email', 'Phone', 'Year', 'Branch', 'Application choices', 'Written responses', 'Pipeline status', 'Round 1 score', 'Round 1 total', 'Round 2 projects', 'Round 3 interviews', 'Final result'], ...rows].map((row) => row.map(quote).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `recruitment-operations-${new Date().toISOString().slice(0, 10)}.csv`; anchor.click(); URL.revokeObjectURL(url);
  }

  if (loading) return <div className="grid min-h-screen place-items-center bg-[#080a0d]"><div className="text-center"><RefreshCw className="mx-auto animate-spin text-accent" /><p className="mt-3 font-mono text-xs text-muted">BUFFERING OPERATIONS DATA…</p></div></div>;

  return <div className="min-h-screen bg-[#080a0d] text-text">
    <header className="flex min-h-14 flex-wrap items-center justify-between gap-3 border-b border-border bg-[#060709] px-4 py-2">
      <div className="flex items-center gap-3"><Activity size={19} className="text-accent" /><div><p className="font-mono text-xs font-bold tracking-wider">AWS SBG // RECRUITMENT OPERATIONS</p><p className="font-mono text-[9px] text-dim">ADMIN TRIAGE &amp; CANDIDATE DOSSIER CONSOLE</p></div><span className="hidden bg-accent px-2 py-1 font-mono text-[9px] font-bold text-bg sm:inline">LIVE DATA</span></div>
      <div className="flex items-center gap-3 font-mono text-[10px]"><span className="text-success">● CONNECTED</span><span className="hidden text-muted md:inline">OPS-ADMIN: {payload.admin.name || payload.admin.email}</span><Link href="/admin" className="border border-border px-3 py-2 text-muted hover:border-accent hover:text-accent">STANDARD ADMIN</Link></div>
    </header>

    <section className="grid grid-cols-2 border-b border-border bg-surface sm:grid-cols-3 xl:grid-cols-6">
      <Metric label="Total applications" value={records.length} detail={`${filtered.length} visible`} icon={<Users size={17} />} color="text-accent" />
      <Metric label="Triage backlog" value={metrics.backlog} detail="require action" icon={<ClipboardCheck size={17} />} color="text-warning" />
      <Metric label="R1 evaluated" value={metrics.evaluated} detail={`${metrics.qualified} qualified`} icon={<ShieldCheck size={17} />} color="text-success" />
      <Metric label="R2 project tracks" value={payload.assignments.length} detail={`${metrics.graded} graded`} icon={<FolderKanban size={17} />} color="text-blue" />
      <Metric label="R3 interview slots" value={payload.bookings.length} detail={`${payload.slots.length} available total`} icon={<CalendarClock size={17} />} color="text-purple-300" />
      <Metric label="Offers extended" value={metrics.offers} detail={`${payload.results.length} decisions`} icon={<CheckCircle2 size={17} />} color="text-success" />
    </section>

    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-[#060709] px-4 py-2 font-mono text-[10px]">
      <span><strong className="text-accent">{filtered.length}</strong> OF {records.length} CANDIDATES DISPLAYED</span>
      <div className="flex flex-wrap gap-2"><button onClick={() => setShowQuestionBank(true)} className="inline-flex items-center gap-2 border border-accent/60 bg-accent/10 px-3 py-2 text-accent hover:bg-accent hover:text-bg"><FilePlus2 size={13} />QUESTION BANK</button><button onClick={exportCsv} className="inline-flex items-center gap-2 border border-border px-3 py-2 text-muted hover:border-accent hover:text-accent"><Download size={13} />EXPORT FILTERED CSV</button><button onClick={() => load(true)} disabled={refreshing} className="inline-flex items-center gap-2 border border-border px-3 py-2 text-muted hover:border-accent hover:text-accent disabled:opacity-50"><RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />SYNC LIVE</button></div>
    </div>

    {error && <div role="alert" className="border-b border-error bg-error/10 px-4 py-3 text-sm text-error">{error}</div>}

    <div className="grid min-h-[calc(100vh-10.5rem)] xl:grid-cols-[230px_minmax(680px,1fr)_360px]">
      <aside className="border-r border-border bg-[#060709] p-3">
        <div className="flex items-center justify-between border-b border-border pb-2"><p className="font-mono text-[10px] font-bold tracking-widest">POWER FILTERS</p><button onClick={resetFilters} className="font-mono text-[9px] text-accent hover:underline">RESET ALL</button></div>
        <label className="mt-4 block"><span className="label !text-[9px]">Identifier / search</span><span className="relative block"><Search size={14} className="absolute left-3 top-3 text-dim" /><input value={search} onChange={(event) => setSearch(event.target.value)} className="field !py-2 !pl-9 font-mono text-xs" placeholder="Name, reg, email, Git…" /></span></label>
        <div className="mt-5"><p className="label !text-[9px]">Domain groups</p><div className="space-y-1">{payload.domains.map((domain) => { const count = records.filter((record) => record.profile.subdomain_choices?.some((choice) => choice.subdomain?.domain_id === domain.id)).length; return <label key={domain.id} className="flex cursor-pointer items-center justify-between border border-transparent bg-surface px-2 py-2 font-mono text-[10px] hover:border-border"><span className="flex items-center gap-2"><input type="checkbox" checked={domainIds.includes(domain.id)} onChange={() => toggleDomain(domain.id)} className="accent-[#FF9900]" />{domain.name}</span><span className="text-accent">{count}</span></label>; })}</div></div>
        <label className="mt-5 block"><span className="label !text-[9px]">Pipeline stage</span><select value={stage} onChange={(event) => setStage(event.target.value)} className="field !py-2 font-mono text-xs"><option value="">All stages</option>{['pending','round_0','round_1','round_2','selected','waitlisted','rejected'].map((value) => <option key={value} value={value}>{humanize(value)}</option>)}</select></label>
        <label className="mt-5 block"><span className="label !text-[9px]">Subdomain specialization</span><select value={subdomainId} disabled={domainIds.length === 0} onChange={(event) => setSubdomainId(event.target.value)} className="field !py-2 font-mono text-xs disabled:cursor-not-allowed disabled:opacity-50"><option value="">{domainIds.length === 0 ? 'Select a domain group first' : 'All selected-domain subdomains'}</option>{visibleSubdomains.map((subdomain) => <option key={subdomain.id} value={subdomain.id}>{subdomain.name}</option>)}</select>{domainIds.length > 1 && <span className="mt-1 block font-mono text-[9px] text-dim">Showing subdomains from {domainIds.length} selected groups.</span>}</label>
        <label className="mt-5 block"><span className="flex justify-between font-mono text-[9px] uppercase tracking-wider text-muted"><span>Minimum R1 score</span><strong className="text-accent">{minScore}%</strong></span><input type="range" min="0" max="100" step="5" value={minScore} onChange={(event) => setMinScore(Number(event.target.value))} className="mt-3 w-full accent-[#FF9900]" /></label>
      </aside>

      <main className="min-w-0 overflow-hidden border-r border-border">
        <div className="flex items-center justify-between border-b border-border bg-surface px-3 py-2 font-mono text-[10px]"><span className="text-muted">INSTANT CANDIDATE BUFFER</span><label className="flex items-center gap-2"><span className="text-dim">SORT:</span><select value={sort} onChange={(event) => setSort(event.target.value as SortMode)} className="border border-border bg-bg px-2 py-1 text-text"><option value="newest">Newest applications</option><option value="score_desc">R1 score high–low</option><option value="score_asc">R1 score low–high</option><option value="name">Candidate name</option><option value="status">Pipeline stage</option></select></label></div>
        <div className="overflow-auto"><table className="w-full min-w-[850px] border-collapse text-left text-xs"><thead className="sticky top-0 z-10 border-b-2 border-border bg-[#080a0d] font-mono text-[9px] uppercase tracking-wider text-muted"><tr><th className="px-3 py-3">Candidate identity</th><th className="px-3 py-3">Subdomain pair</th><th className="px-3 py-3">Round 1</th><th className="px-3 py-3">Round 2 projects</th><th className="px-3 py-3">Round 3 interviews</th><th className="px-3 py-3">Decision</th></tr></thead><tbody>{filtered.map((record) => <CandidateRow key={record.profile.id} record={record} active={selectedId === record.profile.id} onClick={() => setSelectedId(record.profile.id)} />)}</tbody></table>{filtered.length === 0 && <div className="p-12 text-center font-mono text-xs text-muted">NO CANDIDATES MATCH THE ACTIVE FILTERS</div>}</div>
      </main>

      <aside className={`${selected ? 'block' : 'hidden xl:block'} fixed inset-0 z-40 overflow-auto bg-[#080a0d] xl:static xl:z-auto`}>
        {selected ? <CandidateInspector record={selected} onClose={() => setSelectedId(null)} releasing={releasingId === selected.attempt?.id} onReleaseMarks={setMarksRelease} /> : <div className="grid h-full place-items-center p-8 text-center"><div><Users className="mx-auto text-dim" /><p className="mt-3 font-mono text-xs text-muted">SELECT A CANDIDATE<br />TO OPEN THE DOSSIER</p></div></div>}
      </aside>
    </div>
    <footer className="flex flex-wrap justify-between gap-2 border-t border-border bg-[#060709] px-4 py-2 font-mono text-[9px] text-dim"><span>REGION: ap-south-1 // CONTROLLED ADMIN OPERATIONS</span><span>LAST SYNC: {payload.synced_at ? formatDateTime(payload.synced_at) : '—'}</span></footer>
    {showQuestionBank && <QuestionBank domains={payload.domains} onClose={() => setShowQuestionBank(false)} />}
  </div>;
}

function Metric({ label, value, detail, icon, color }: { label: string; value: number; detail: string; icon: React.ReactNode; color: string }) {
  return <div className="flex min-h-20 items-center justify-between border-r border-b border-border px-4 py-3 xl:border-b-0"><div><p className="font-mono text-[9px] uppercase tracking-wider text-muted">{label}</p><p className={`mt-1 font-mono text-xl font-bold ${color}`}>{value.toLocaleString()}</p><p className="font-mono text-[9px] text-dim">{detail}</p></div><span className={color}>{icon}</span></div>;
}

function CandidateRow({ record, active, onClick }: { record: CandidateRecord; active: boolean; onClick: () => void }) {
  const { profile, attempt, assignments, submissions, bookings, result } = record;
  const pct = scorePercent(attempt);
  const choices = [...(profile.subdomain_choices ?? [])].sort((a, b) => a.priority - b.priority);
  return <tr onClick={onClick} className={`cursor-pointer border-b border-border transition hover:bg-panel ${active ? 'bg-accent/5 shadow-[inset_3px_0_0_#FF9900]' : 'bg-surface/40'}`}><td className="px-3 py-3"><div className="flex items-center gap-2"><span className="grid h-8 w-8 shrink-0 place-items-center border border-accent/40 bg-accent/10 font-mono text-[10px] font-bold text-accent">{initials(profile.full_name)}</span><span className="min-w-0"><strong className="block truncate text-sm text-text">{profile.full_name}</strong><span className="font-mono text-[9px] text-accent">#{profile.registration_number}</span><span className="block text-[9px] text-dim">{profile.branch ?? 'Branch —'} · Year {profile.year ?? '—'}</span></span></div></td><td className="px-3 py-3">{choices.length ? choices.map((choice) => <span key={choice.subdomain_id} className="block font-mono text-[9px] text-accent">{choiceLabel(choice)}</span>) : <span className="text-dim">Unassigned</span>}</td><td className="px-3 py-3 font-mono">{pct == null ? <span className="text-dim">{humanize(profile.round_0_status)}</span> : <><strong className={pct >= 70 ? 'text-success' : pct >= 40 ? 'text-warning' : 'text-error'}>{attempt?.score}/{attempt?.total_marks} ({pct}%)</strong><span className="block text-[9px] text-dim">{attempt?.auto_submitted ? 'Auto-submitted' : humanize(attempt?.status)}</span></>}</td><td className="px-3 py-3 font-mono text-[9px]">{assignments.length ? <><span className="text-text">{assignments.length} assigned</span><span className="block text-success">{submissions.length} submitted · {submissions.filter((item) => item.evaluation).length} graded</span></> : <span className="text-dim">Not assigned</span>}</td><td className="px-3 py-3 font-mono text-[9px]">{bookings.length ? <><span className="text-text">{bookings.length} booked</span><span className="block text-success">Confirmed</span></> : <span className="text-dim">Not booked</span>}</td><td className="px-3 py-3"><span className={`border px-2 py-1 font-mono text-[9px] uppercase ${result?.result === 'selected' || profile.status === 'selected' ? 'border-success/50 bg-success/10 text-success' : profile.status === 'rejected' ? 'border-error/50 bg-error/10 text-error' : 'border-border text-muted'}`}>{humanize(result?.result ?? profile.status)}</span></td></tr>;
}

function CandidateInspector({ record, onClose, releasing, onReleaseMarks }: { record: CandidateRecord; onClose: () => void; releasing: boolean; onReleaseMarks: (attemptId: string, release: boolean) => void }) {
  const { profile, attempt, assignments, submissions, bookings, writtenAnswers, result } = record;
  const choices = [...(profile.subdomain_choices ?? [])].sort((a, b) => a.priority - b.priority);
  return <div className="min-h-full bg-[#080a0d]"><header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-[#11141a] px-4 py-3"><p className="font-mono text-[10px] font-bold tracking-wider">CANDIDATE DOSSIER INSPECTOR</p><button onClick={onClose} aria-label="Close candidate dossier" className="text-muted hover:text-accent"><X size={17} /></button></header><div className="space-y-4 p-4">
    <section className="border border-border bg-surface p-4"><div className="flex items-start gap-3"><span className="grid h-12 w-12 shrink-0 place-items-center border border-accent/50 bg-accent/10 font-mono font-bold text-accent">{initials(profile.full_name)}</span><div className="min-w-0 flex-1"><h2 className="truncate text-lg font-bold">{profile.full_name}</h2><p className="font-mono text-[10px] text-accent">#{profile.registration_number}</p><p className="mt-1 text-xs text-muted">{profile.branch ?? 'Branch not provided'} · Year {profile.year ?? '—'}</p></div></div><div className="mt-4 grid grid-cols-2 gap-2 text-[10px]"><a href={`mailto:${profile.email}`} className="inline-flex items-center gap-2 border border-border px-3 py-2 text-muted hover:border-accent hover:text-accent"><Mail size={13} />EMAIL</a></div><dl className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-3 text-xs"><div><dt className="font-mono text-[9px] text-dim">PHONE</dt><dd className="mt-1">{profile.phone ?? 'Not provided'}</dd></div><div><dt className="font-mono text-[9px] text-dim">APPLIED</dt><dd className="mt-1">{formatDateTime(profile.created_at)}</dd></div></dl></section>
    <InspectorSection title="Application choices"><div className="space-y-2">{choices.length ? choices.map((choice) => <div key={choice.subdomain_id} className="border border-border bg-bg/60 p-3"><p className="font-mono text-[9px] text-accent">SELECTED</p><p className="mt-1 text-sm">{choiceLabel(choice)}</p></div>) : <p className="text-xs text-muted">No choices submitted.</p>}</div></InspectorSection>
    <InspectorSection title="Round 1 · Written responses"><div className="space-y-3">{writtenAnswers.length ? writtenAnswers.map((answer) => <article key={`${answer.domain_id}:${answer.question_id}`} className="border border-border bg-bg/60 p-3"><div className="flex justify-between gap-3"><p className="font-mono text-[9px] text-accent">{answer.domain?.name ?? 'Domain'}</p><span className={`font-mono text-[9px] ${answer.is_final ? 'text-success' : 'text-warning'}`}>{answer.is_final ? 'FINAL' : 'DRAFT'}</span></div><h4 className="mt-2 text-xs font-semibold">{answer.question?.prompt ?? 'Question'}</h4><p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-muted">{answer.answer_text || 'No written explanation.'}</p>{answer.submission_links?.length > 0 && <div className="mt-2 space-y-1">{answer.submission_links.map((link) => <a key={link} href={link} target="_blank" rel="noreferrer" className="block break-all text-xs text-accent hover:underline">{link} ↗</a>)}</div>}</article>) : <p className="text-xs text-muted">No written responses saved.</p>}</div></InspectorSection>
    <InspectorSection title="Round 1 · Technical assessment">{attempt ? <><dl className="grid grid-cols-2 gap-3 text-xs"><Data label="Score" value={attempt.score == null ? 'Pending evaluation' : `${attempt.score} / ${attempt.total_marks ?? '—'} (${scorePercent(attempt) ?? 0}%)`} /><Data label="Attempt status" value={humanize(attempt.status)} /><Data label="Started" value={formatDateTime(attempt.started_at)} /><Data label="Duration" value={`${Math.round(attempt.time_limit_seconds / 60)} minutes`} /><Data label="Submission" value={attempt.submitted_at ? formatDateTime(attempt.submitted_at) : 'Not submitted'} /><Data label="Timer event" value={attempt.auto_submitted ? 'Auto-submitted' : 'Normal'} /><Data label="Admin decision" value={attempt.admin_qualified == null ? 'Pending' : attempt.admin_qualified ? 'Qualified' : 'Not qualified'} /><Data label="Admin notes" value={attempt.admin_notes ?? 'No notes'} /></dl>{attempt.status === 'submitted' && <div className="mt-4 border-t border-border pt-3"><button onClick={() => onReleaseMarks(attempt.id, !attempt.results_released_at)} disabled={releasing} className={`w-full border px-3 py-2 font-mono text-[10px] font-bold disabled:cursor-not-allowed disabled:opacity-40 ${attempt.results_released_at ? 'border-warning/50 text-warning hover:bg-warning/10' : 'border-accent bg-accent text-bg hover:bg-accent-muted'}`}>{releasing ? 'SAVING…' : attempt.results_released_at ? 'HIDE MARKS FROM CANDIDATE' : attempt.score == null ? 'CALCULATE & RELEASE MARKS' : 'RELEASE MARKS TO CANDIDATE'}</button><p className="mt-2 font-mono text-[9px] text-dim">{attempt.results_released_at ? `Released ${formatDateTime(attempt.results_released_at)}` : 'Candidate sees: Results will be released shortly.'}</p></div>}</> : <p className="text-xs text-muted">No Technical assessment required or started.</p>}</InspectorSection>
    <InspectorSection title="Round 2 · Project tracks"><div className="space-y-3">{assignments.length ? assignments.map((assignment) => { const submission = submissions.find((item) => item.assignment_id === assignment.id); return <div key={assignment.id} className="border border-border bg-bg/60 p-3"><div className="flex justify-between gap-3"><div><p className="font-mono text-[9px] text-accent">{assignment.project?.code ?? 'PROJECT'}</p><p className="mt-1 text-sm font-semibold">{assignment.project?.title ?? 'Project details unavailable'}</p></div><span className="font-mono text-[9px] text-muted">{humanize(assignment.status)}</span></div><p className="mt-2 text-[10px] text-dim">Due {formatDateTime(assignment.deadline)}</p>{submission ? <div className="mt-3 border-t border-border pt-3 text-xs"><a href={submission.github_url} target="_blank" rel="noreferrer" className="text-accent hover:underline">Open GitHub repository ↗</a>{submission.deployed_url && <a href={submission.deployed_url} target="_blank" rel="noreferrer" className="ml-3 text-accent hover:underline">Live demo ↗</a>}<p className="mt-2 text-muted">Submitted {formatDateTime(submission.submitted_at)}{submission.is_late ? ' · Late' : ''}</p>{submission.evaluation ? <p className="mt-2 font-mono text-success">Evaluation: {submission.evaluation.total_score ?? '—'}/100 · {submission.evaluation.qualified ? 'Qualified' : 'Not qualified'}</p> : <p className="mt-2 font-mono text-warning">Awaiting evaluation</p>}</div> : <p className="mt-3 font-mono text-[10px] text-warning">Not submitted</p>}</div>; }) : <p className="text-xs text-muted">No projects assigned.</p>}</div></InspectorSection>
    <InspectorSection title="Round 3 · Interviews"><div className="space-y-2">{bookings.length ? bookings.map((booking) => <div key={booking.id} className="border border-border bg-bg/60 p-3 text-xs"><p className="font-mono text-accent">{booking.booking_ref}</p><p className="mt-2">{booking.slot?.date?.date ?? 'Date unavailable'} · {booking.slot?.slot_time?.slice(0, 5) ?? '—'}</p><p className="mt-1 text-muted">{booking.slot?.date?.location ?? 'Location not provided'} · {humanize(booking.status)}</p></div>) : <p className="text-xs text-muted">No interview bookings.</p>}</div></InspectorSection>
    <InspectorSection title="Final decision"><div className="flex items-center justify-between"><span className="text-sm text-muted">Current outcome</span><strong className={`font-mono text-sm ${result?.result === 'selected' ? 'text-success' : result?.result === 'not_selected' ? 'text-error' : 'text-accent'}`}>{humanize(result?.result ?? profile.final_status ?? 'Pending')}</strong></div>{result?.feedback && <p className="mt-3 border-t border-border pt-3 text-xs leading-5 text-muted">{result.feedback}</p>}</InspectorSection>
  </div></div>;
}

function InspectorSection({ title, children }: { title: string; children: React.ReactNode }) { return <section className="border border-border bg-surface p-4"><h3 className="mb-3 border-b border-border pb-2 font-mono text-[10px] uppercase tracking-wider text-muted">{title}</h3>{children}</section>; }
function Data({ label, value }: { label: string; value: string }) { return <div><dt className="font-mono text-[9px] uppercase text-dim">{label}</dt><dd className="mt-1 break-words text-text">{value}</dd></div>; }
