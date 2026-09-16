import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity, CalendarClock, CheckCircle2, ClipboardCheck, Download, FilePlus2, FolderKanban, Mail, RefreshCw, Search, ShieldCheck, Users, X } from 'lucide-react';
import { createClient } from '../lib/supabase.js';
import { formatDateTime } from '../lib/utils.js';
import { candidateCsvRow } from '../lib/admin-export.js';
import QuestionBank from './QuestionBank.jsx';

const emptyPayload = { admin: { id: '', email: '', name: '', role: '' }, candidates: [], attempts: [], assignments: [], submissions: [], bookings: [], results: [], domains: [], slots: [], written_questions: [], written_rules: [], written_answers: [], synced_at: '' };
const stageOrder = { selected: 8, waitlisted: 7, round_2: 6, round_1: 5, round_0: 4, pending: 3, rejected: 1 };

function humanize(value) { return value ? value.replaceAll('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase()) : 'Not started'; }
function initials(name) { return name.split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase(); }
function scorePercent(attempt) { if (attempt?.score == null || !attempt.total_marks) return null; return Math.round((attempt.score / attempt.total_marks) * 100); }
function choiceLabel(choice) { const domain = choice.subdomain?.domain; return domain?.selection_mode === 'whole_domain' ? domain.name : `${domain?.name ?? 'Domain'} / ${choice.subdomain?.name ?? 'Track'}`; }

export default function AdminOperations() {
  const navigate = useNavigate();
  const [supabase] = useState(createClient);
  const [payload, setPayload] = useState(emptyPayload);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [domainIds, setDomainIds] = useState([]);
  const [subdomainId, setSubdomainId] = useState('');
  const [stage, setStage] = useState('');
  const [minScore, setMinScore] = useState(0);
  const [sort, setSort] = useState('newest');
  const [selectedId, setSelectedId] = useState(null);
  const [showQuestionBank, setShowQuestionBank] = useState(false);
  const [releasingId, setReleasingId] = useState(null);

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true); else setLoading(true);
    setError('');
    let token = '';
    try { const { data: { session } } = await supabase.auth.getSession(); token = session?.access_token || ''; } catch {}
    if (!token) { navigate('/recruitment/admin/login', { replace: true }); return; }
    const response = await fetch('/api/recruitment/admin/operations', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
    const result = await response.json();
    if (!response.ok) setError(result.error ?? 'Unable to load operations data.');
    else setPayload(result);
    setLoading(false);
    setRefreshing(false);
  }, [supabase, navigate]);

  useEffect(() => { load(); }, [load]);

  const records = useMemo(() => payload.candidates.map((profile) => {
    const assignments = payload.assignments.filter((item) => item.candidate_id === profile.id);
    const assignmentIds = new Set(assignments.map((item) => item.id));
    return { profile, attempt: payload.attempts.find((item) => item.candidate_id === profile.id), assignments, submissions: payload.submissions.filter((item) => assignmentIds.has(item.assignment_id)), bookings: payload.bookings.filter((item) => item.candidate_id === profile.id), writtenAnswers: payload.written_answers.filter((item) => item.candidate_id === profile.id), result: payload.results.find((item) => item.candidate_id === profile.id) };
  }), [payload]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const list = records.filter((record) => {
      const choices = record.profile.subdomain_choices ?? [];
      const searchable = [record.profile.full_name, record.profile.registration_number, record.profile.email, record.profile.phone, ...choices.map(choiceLabel), ...record.writtenAnswers.flatMap((a) => [a.answer_text, a.question?.prompt])].filter(Boolean).join(' ').toLowerCase();
      const domainMatch = domainIds.length === 0 || choices.some((c) => c.subdomain?.domain_id && domainIds.includes(c.subdomain.domain_id));
      const subdomainMatch = !subdomainId || choices.some((c) => c.subdomain_id === subdomainId);
      const pct = scorePercent(record.attempt);
      return (!query || searchable.includes(query)) && domainMatch && subdomainMatch && (!stage || record.profile.status === stage) && (minScore === 0 || (pct != null && pct >= minScore));
    });
    return list.sort((a, b) => {
      if (sort === 'score_desc') return (scorePercent(b.attempt) ?? -1) - (scorePercent(a.attempt) ?? -1);
      if (sort === 'score_asc') return (scorePercent(a.attempt) ?? 101) - (scorePercent(b.attempt) ?? 101);
      if (sort === 'name') return a.profile.full_name.localeCompare(b.profile.full_name);
      if (sort === 'status') return (stageOrder[b.profile.status] ?? 0) - (stageOrder[a.profile.status] ?? 0);
      return new Date(b.profile.created_at).getTime() - new Date(a.profile.created_at).getTime();
    });
  }, [records, search, domainIds, subdomainId, stage, minScore, sort]);

  const [deletingId, setDeletingId] = useState(null);

  // Deleting wipes every answer, attempt and choice, so it asks for the
  // registration number rather than a single click.
  const deleteCandidate = async (profile) => {
    const typed = prompt(
      `This permanently deletes ${profile.full_name} and all of their recruitment data.\n\nType their registration number (${profile.registration_number}) to confirm:`,
    );
    if (typed == null) return;
    if (typed.trim().toLowerCase() !== (profile.registration_number ?? '').toLowerCase()) {
      setError('Registration number did not match. Nothing was deleted.');
      return;
    }
    setDeletingId(profile.id);
    setError('');
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setError('Administrator session expired.'); setDeletingId(null); return; }
    const response = await fetch(`/api/recruitment/admin/candidates?id=${encodeURIComponent(profile.id)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) setError(result.error ?? 'Unable to delete this candidate.');
    else {
      setSelectedId(null);
      await load();
    }
    setDeletingId(null);
  };

  const selected = records.find((r) => r.profile.id === selectedId) ?? null;
  const visibleSubdomains = useMemo(() => payload.domains.filter((d) => domainIds.includes(d.id)).flatMap((d) => d.subdomains ?? []), [payload.domains, domainIds]);
  useEffect(() => { if (subdomainId && !visibleSubdomains.some((s) => s.id === subdomainId)) setSubdomainId(''); }, [subdomainId, visibleSubdomains]);
  const metrics = useMemo(() => {
    const evaluated = payload.attempts.filter((a) => a.admin_qualified != null).length;
    const qualified = payload.attempts.filter((a) => a.admin_qualified === true).length;
    const graded = payload.submissions.filter((s) => s.evaluation).length;
    const offers = payload.results.filter((r) => r.result === 'selected').length;
    const backlog = records.filter((r) => r.profile.status === 'pending' || (r.attempt?.status === 'submitted' && r.attempt.admin_qualified == null) || r.submissions.some((s) => !s.evaluation)).length;
    return { evaluated, qualified, graded, offers, backlog };
  }, [payload, records]);

  function toggleDomain(id) { setDomainIds((curr) => curr.includes(id) ? curr.filter((item) => item !== id) : [...curr, id]); }
  function resetFilters() { setSearch(''); setDomainIds([]); setSubdomainId(''); setStage(''); setMinScore(0); setSort('newest'); }

  async function setMarksRelease(attemptId, release) {
    setReleasingId(attemptId); setError('');
    const { data: { session } } = await supabase.auth.getSession();
    const response = session ? await fetch('/api/recruitment/admin/assessments/release', { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ attempt_id: attemptId, release }) }) : null;
    if (!response?.ok) { const result = response ? await response.json() : null; setError(result?.error ?? 'Administrator session expired.'); } else await load(true);
    setReleasingId(null);
  }

  function exportCsv() {
    const quote = (v) => `"${String(v ?? '').replaceAll('"', '""')}"`;
    const rows = filtered.map(({ profile, attempt, assignments, bookings, result, writtenAnswers }) => {
      const exportRow = candidateCsvRow({ profile, choices: [...(profile.subdomain_choices ?? [])].sort((a, b) => a.priority - b.priority).map(choiceLabel), writtenAnswers: writtenAnswers.map((a) => ({ domain: a.domain?.name ?? 'Domain', prompt: a.question?.prompt ?? 'Question', answer: a.answer_text, links: a.submission_links })) });
      return [exportRow.registration_number, exportRow.full_name, profile.email, profile.phone, profile.year, profile.branch, exportRow.choices, exportRow.written_responses, profile.status, attempt?.score, attempt?.total_marks, assignments.map((a) => a.project?.code).join(' | '), bookings.map((b) => `${b.slot?.date?.date ?? ''} ${b.slot?.slot_time ?? ''}`).join(' | '), result?.result];
    });
    const csv = [['Registration', 'Name', 'Email', 'Phone', 'Year', 'Branch', 'Choices', 'Written responses', 'Status', 'R1 score', 'R1 total', 'R2 projects', 'R3 interviews', 'Final'], ...rows].map((row) => row.map(quote).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = `recruitment-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(url);
  }

  if (loading) return <div className="grid min-h-screen place-items-center" style={{ background: '#080a0d' }}><div className="text-center"><RefreshCw className="mx-auto animate-spin" style={{ color: 'var(--accent)' }} /><p className="mt-3 font-mono text-xs" style={{ color: 'var(--muted)' }}>BUFFERING OPERATIONS DATA…</p></div></div>;

  return (
    <div className="min-h-screen" style={{ background: '#080a0d', color: 'var(--text)' }}>
      <header className="flex min-h-14 flex-wrap items-center justify-between gap-3 border-b px-4 py-2" style={{ borderColor: 'var(--border)', background: '#060709' }}>
        <div className="flex items-center gap-3">
          <Activity size={19} style={{ color: 'var(--accent)' }} />
          <div><p className="font-mono text-xs font-bold tracking-wider">AWS SBG // RECRUITMENT OPERATIONS</p><p className="font-mono text-[9px]" style={{ color: 'var(--dim)' }}>ADMIN TRIAGE &amp; CANDIDATE DOSSIER CONSOLE</p></div>
          <span className="hidden px-2 py-1 font-mono text-[9px] font-bold sm:inline" style={{ background: 'var(--accent)', color: 'var(--bg)' }}>LIVE DATA</span>
        </div>
        <div className="flex items-center gap-3 font-mono text-[10px]">
          <span style={{ color: 'var(--success)' }}>● CONNECTED</span>
          <span className="hidden md:inline" style={{ color: 'var(--muted)' }}>OPS-ADMIN: {payload.admin.name || payload.admin.email}</span>
          <Link to="/recruitment/admin" className="border px-3 py-2 transition" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>STANDARD ADMIN</Link>
        </div>
      </header>

      <section className="grid grid-cols-2 border-b sm:grid-cols-3 xl:grid-cols-6" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        {[
          { label: 'Total applications', value: records.length, detail: `${filtered.length} visible`, icon: <Users size={17} />, color: 'var(--accent)' },
          { label: 'Triage backlog', value: metrics.backlog, detail: 'require action', icon: <ClipboardCheck size={17} />, color: 'var(--warning)' },
          { label: 'R1 evaluated', value: metrics.evaluated, detail: `${metrics.qualified} qualified`, icon: <ShieldCheck size={17} />, color: 'var(--success)' },
          { label: 'R2 project tracks', value: payload.assignments.length, detail: `${metrics.graded} graded`, icon: <FolderKanban size={17} />, color: 'var(--info)' },
          { label: 'R3 interview slots', value: payload.bookings.length, detail: `${payload.slots.length} total`, icon: <CalendarClock size={17} />, color: '#c084fc' },
          { label: 'Offers extended', value: metrics.offers, detail: `${payload.results.length} decisions`, icon: <CheckCircle2 size={17} />, color: 'var(--success)' },
        ].map(({ label, value, detail, icon, color }) => (
          <div key={label} className="flex min-h-20 items-center justify-between border-r border-b px-4 py-3 xl:border-b-0" style={{ borderColor: 'var(--border)' }}>
            <div>
              <p className="font-mono text-[9px] uppercase tracking-wider" style={{ color: 'var(--muted)' }}>{label}</p>
              <p className="mt-1 font-mono text-xl font-bold" style={{ color }}>{value.toLocaleString()}</p>
              <p className="font-mono text-[9px]" style={{ color: 'var(--dim)' }}>{detail}</p>
            </div>
            <span style={{ color }}>{icon}</span>
          </div>
        ))}
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-2 font-mono text-[10px]" style={{ borderColor: 'var(--border)', background: '#060709' }}>
        <span><strong style={{ color: 'var(--accent)' }}>{filtered.length}</strong> OF {records.length} CANDIDATES DISPLAYED</span>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setShowQuestionBank(true)} className="inline-flex items-center gap-2 border px-3 py-2 transition" style={{ borderColor: 'rgba(255,153,0,.6)', background: 'rgba(255,153,0,.1)', color: 'var(--accent)' }}><FilePlus2 size={13} />QUESTION BANK</button>
          <button onClick={exportCsv} className="inline-flex items-center gap-2 border px-3 py-2 transition" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}><Download size={13} />EXPORT CSV</button>
          <button onClick={() => load(true)} disabled={refreshing} className="inline-flex items-center gap-2 border px-3 py-2 transition disabled:opacity-50" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}><RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />SYNC LIVE</button>
        </div>
      </div>

      {error && <div role="alert" className="border-b px-4 py-3 text-sm" style={{ borderColor: 'var(--error)', background: 'rgba(239,68,68,.1)', color: 'var(--error)' }}>{error}</div>}

      <div className="grid min-h-[calc(100vh-10.5rem)] xl:grid-cols-[230px_minmax(680px,1fr)_360px]">
        {/* Filters */}
        <aside className="border-r p-3" style={{ borderColor: 'var(--border)', background: '#060709' }}>
          <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: 'var(--border)' }}>
            <p className="font-mono text-[10px] font-bold tracking-widest">POWER FILTERS</p>
            <button onClick={resetFilters} className="font-mono text-[9px] hover:underline" style={{ color: 'var(--accent)' }}>RESET ALL</button>
          </div>
          <label className="mt-4 block">
            <span className="label !text-[9px]">Identifier / search</span>
            <span className="relative block"><Search size={14} className="absolute left-3 top-3" style={{ color: 'var(--dim)' }} /><input value={search} onChange={(e) => setSearch(e.target.value)} className="field !py-2 !pl-9 font-mono text-xs" placeholder="Name, reg, email…" /></span>
          </label>
          <div className="mt-5"><p className="label !text-[9px]">Domain groups</p><div className="space-y-1">{payload.domains.map((domain) => { const count = records.filter((r) => r.profile.subdomain_choices?.some((c) => c.subdomain?.domain_id === domain.id)).length; return <label key={domain.id} className="flex cursor-pointer items-center justify-between border border-transparent px-2 py-2 font-mono text-[10px] hover:border-[var(--border)]" style={{ background: 'var(--surface)' }}><span className="flex items-center gap-2"><input type="checkbox" checked={domainIds.includes(domain.id)} onChange={() => toggleDomain(domain.id)} style={{ accentColor: 'var(--accent)' }} />{domain.name}</span><span style={{ color: 'var(--accent)' }}>{count}</span></label>; })}</div></div>
          <label className="mt-5 block"><span className="label !text-[9px]">Pipeline stage</span><select value={stage} onChange={(e) => setStage(e.target.value)} className="field !py-2 font-mono text-xs"><option value="">All stages</option>{['pending','round_0','round_1','round_2','selected','waitlisted','rejected'].map((v) => <option key={v} value={v}>{humanize(v)}</option>)}</select></label>
          <label className="mt-5 block"><span className="flex justify-between font-mono text-[9px] uppercase tracking-wider" style={{ color: 'var(--muted)' }}><span>Min R1 score</span><strong style={{ color: 'var(--accent)' }}>{minScore}%</strong></span><input type="range" min="0" max="100" step="5" value={minScore} onChange={(e) => setMinScore(Number(e.target.value))} className="mt-3 w-full" style={{ accentColor: 'var(--accent)' }} /></label>
        </aside>

        {/* Candidate table */}
        <main className="min-w-0 overflow-hidden border-r" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between border-b px-3 py-2 font-mono text-[10px]" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
            <span style={{ color: 'var(--muted)' }}>INSTANT CANDIDATE BUFFER</span>
            <label className="flex items-center gap-2"><span style={{ color: 'var(--dim)' }}>SORT:</span>
              <select value={sort} onChange={(e) => setSort(e.target.value)} className="border px-2 py-1" style={{ borderColor: 'var(--border)', background: 'var(--bg)', color: 'var(--text)' }}>
                {[['newest','Newest'],['score_desc','Score ↓'],['score_asc','Score ↑'],['name','Name'],['status','Stage']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
          </div>
          <div className="overflow-auto">
            <table className="w-full min-w-[850px] border-collapse text-left text-xs">
              <thead className="sticky top-0 z-10 border-b-2 font-mono text-[9px] uppercase tracking-wider" style={{ borderColor: 'var(--border)', background: '#080a0d', color: 'var(--muted)' }}>
                <tr>{['Candidate identity','Subdomain pair','Round 1','Round 2 projects','Round 3 interviews','Decision'].map((h) => <th key={h} className="px-3 py-3">{h}</th>)}</tr>
              </thead>
              <tbody>
                {filtered.map((record) => {
                  const { profile, attempt, assignments, submissions, bookings, result } = record;
                  const pct = scorePercent(attempt);
                  const choices = [...(profile.subdomain_choices ?? [])].sort((a, b) => a.priority - b.priority);
                  const active = selectedId === profile.id;
                  return (
                    <tr key={profile.id} onClick={() => setSelectedId(profile.id)} className="cursor-pointer border-b transition" style={{ borderColor: 'var(--border)', background: active ? 'rgba(255,153,0,.05)' : 'rgba(17,19,24,.4)', boxShadow: active ? 'inset 3px 0 0 #FF9900' : 'none' }}>
                      <td className="px-3 py-3"><div className="flex items-center gap-2"><span className="grid h-8 w-8 shrink-0 place-items-center border font-mono text-[10px] font-bold" style={{ borderColor: 'rgba(255,153,0,.4)', background: 'rgba(255,153,0,.1)', color: 'var(--accent)' }}>{initials(profile.full_name)}</span><span className="min-w-0"><strong className="block truncate text-sm" style={{ color: 'var(--text)' }}>{profile.full_name}</strong><span className="font-mono text-[9px]" style={{ color: 'var(--accent)' }}>#{profile.registration_number}</span><span className="block text-[9px]" style={{ color: 'var(--dim)' }}>{profile.branch ?? 'Branch —'} · Year {profile.year ?? '—'}</span></span></div></td>
                      <td className="px-3 py-3">{choices.length ? choices.map((c) => <span key={c.subdomain_id} className="block font-mono text-[9px]" style={{ color: 'var(--accent)' }}>{choiceLabel(c)}</span>) : <span style={{ color: 'var(--dim)' }}>Unassigned</span>}</td>
                      <td className="px-3 py-3 font-mono">{pct == null ? <span style={{ color: 'var(--dim)' }}>{humanize(profile.round_0_status)}</span> : <><strong style={{ color: pct >= 70 ? 'var(--success)' : pct >= 40 ? 'var(--warning)' : 'var(--error)' }}>{attempt?.score}/{attempt?.total_marks} ({pct}%)</strong><span className="block text-[9px]" style={{ color: 'var(--dim)' }}>{attempt?.auto_submitted ? 'Auto-submitted' : humanize(attempt?.status)}</span></>}</td>
                      <td className="px-3 py-3 font-mono text-[9px]">{assignments.length ? <><span style={{ color: 'var(--text)' }}>{assignments.length} assigned</span><span className="block" style={{ color: 'var(--success)' }}>{submissions.length} submitted · {submissions.filter((s) => s.evaluation).length} graded</span></> : <span style={{ color: 'var(--dim)' }}>Not assigned</span>}</td>
                      <td className="px-3 py-3 font-mono text-[9px]">{bookings.length ? <><span style={{ color: 'var(--text)' }}>{bookings.length} booked</span><span className="block" style={{ color: 'var(--success)' }}>Confirmed</span></> : <span style={{ color: 'var(--dim)' }}>Not booked</span>}</td>
                      <td className="px-3 py-3"><span className="border px-2 py-1 font-mono text-[9px] uppercase" style={result?.result === 'selected' || profile.status === 'selected' ? { borderColor: 'rgba(34,197,94,.5)', background: 'rgba(34,197,94,.1)', color: 'var(--success)' } : profile.status === 'rejected' ? { borderColor: 'rgba(239,68,68,.5)', background: 'rgba(239,68,68,.1)', color: 'var(--error)' } : { borderColor: 'var(--border)', color: 'var(--muted)' }}>{humanize(result?.result ?? profile.status)}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && <div className="p-12 text-center font-mono text-xs" style={{ color: 'var(--muted)' }}>NO CANDIDATES MATCH THE ACTIVE FILTERS</div>}
          </div>
        </main>

        {/* Candidate inspector */}
        <aside className={`${selected ? 'block' : 'hidden xl:block'} fixed inset-0 z-40 overflow-auto xl:static xl:z-auto`} style={{ background: '#080a0d' }}>
          {selected
            ? <CandidateInspector record={selected} onClose={() => setSelectedId(null)} releasing={releasingId === selected.attempt?.id} onReleaseMarks={setMarksRelease} onDelete={deleteCandidate} deleting={deletingId === selected.profile.id} />
            : <div className="grid h-full place-items-center p-8 text-center"><div><Users style={{ color: 'var(--dim)' }} className="mx-auto" /><p className="mt-3 font-mono text-xs" style={{ color: 'var(--muted)' }}>SELECT A CANDIDATE<br />TO OPEN THE DOSSIER</p></div></div>}
        </aside>
      </div>

      <footer className="flex flex-wrap justify-between gap-2 border-t px-4 py-2 font-mono text-[9px]" style={{ borderColor: 'var(--border)', background: '#060709', color: 'var(--dim)' }}>
        <span>REGION: ap-south-1 // CONTROLLED ADMIN OPERATIONS</span>
        <span>LAST SYNC: {payload.synced_at ? formatDateTime(payload.synced_at) : '—'}</span>
      </footer>

      {showQuestionBank && <QuestionBank domains={payload.domains} onClose={() => setShowQuestionBank(false)} />}
    </div>
  );
}

function CandidateInspector({ record, onClose, releasing, onReleaseMarks, onDelete, deleting }) {
  const { profile, attempt, assignments, submissions, bookings, writtenAnswers, result } = record;
  const choices = [...(profile.subdomain_choices ?? [])].sort((a, b) => a.priority - b.priority);
  const Section = ({ title, children }) => <section className="border p-4" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}><h3 className="mb-3 border-b pb-2 font-mono text-[10px] uppercase tracking-wider" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>{title}</h3>{children}</section>;
  const Data = ({ label, value }) => <div><dt className="font-mono text-[9px] uppercase" style={{ color: 'var(--dim)' }}>{label}</dt><dd className="mt-1 break-words" style={{ color: 'var(--text)' }}>{value}</dd></div>;

  return (
    <div className="min-h-full" style={{ background: '#080a0d' }}>
      <header className="sticky top-0 z-10 flex items-center justify-between border-b px-4 py-3" style={{ borderColor: 'var(--border)', background: '#11141a' }}>
        <p className="font-mono text-[10px] font-bold tracking-wider">CANDIDATE DOSSIER INSPECTOR</p>
        <button onClick={onClose} aria-label="Close candidate dossier" style={{ color: 'var(--muted)' }}><X size={17} /></button>
      </header>
      <div className="space-y-4 p-4">
        <Section title="Identity">
          <div className="flex items-start gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center border font-mono font-bold" style={{ borderColor: 'rgba(255,153,0,.5)', background: 'rgba(255,153,0,.1)', color: 'var(--accent)' }}>{initials(profile.full_name)}</span>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-lg font-bold">{profile.full_name}</h2>
              <p className="font-mono text-[10px]" style={{ color: 'var(--accent)' }}>#{profile.registration_number}</p>
              <p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>{profile.branch ?? 'Branch not provided'} · Year {profile.year ?? '—'}</p>
            </div>
          </div>
          <div className="mt-4"><a href={`mailto:${profile.email}`} className="inline-flex items-center gap-2 border px-3 py-2 text-[10px] transition" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}><Mail size={13} />EMAIL</a></div>
          <dl className="mt-4 grid grid-cols-2 gap-3 border-t pt-3 text-xs" style={{ borderColor: 'var(--border)' }}>
            <Data label="Phone" value={profile.phone ?? 'Not provided'} />
            <Data label="Applied" value={formatDateTime(profile.created_at)} />
          </dl>
        </Section>

        <Section title="Application choices">
          <div className="space-y-2">{choices.length ? choices.map((c) => <div key={c.subdomain_id} className="border p-3" style={{ borderColor: 'var(--border)', background: 'rgba(0,0,0,.4)' }}><p className="font-mono text-[9px]" style={{ color: 'var(--accent)' }}>SELECTED</p><p className="mt-1 text-sm">{choiceLabel(c)}</p></div>) : <p className="text-xs" style={{ color: 'var(--muted)' }}>No choices submitted.</p>}</div>
        </Section>

        <Section title="Round 1 · Written responses">
          <div className="space-y-3">{writtenAnswers.length ? writtenAnswers.map((answer) => <article key={`${answer.domain_id}:${answer.question_id}`} className="border p-3" style={{ borderColor: 'var(--border)', background: 'rgba(0,0,0,.4)' }}><div className="flex justify-between gap-3"><p className="font-mono text-[9px]" style={{ color: 'var(--accent)' }}>{answer.domain?.name ?? 'Domain'}</p><span className="font-mono text-[9px]" style={{ color: answer.is_final ? 'var(--success)' : 'var(--warning)' }}>{answer.is_final ? 'FINAL' : 'DRAFT'}</span></div><h4 className="mt-2 text-xs font-semibold">{answer.question?.prompt ?? 'Question'}</h4><p className="mt-2 whitespace-pre-wrap text-xs leading-5" style={{ color: 'var(--muted)' }}>{answer.answer_text || 'No written explanation.'}</p>{answer.submission_links?.length > 0 && <div className="mt-2 space-y-1">{answer.submission_links.map((link) => <a key={link} href={link} target="_blank" rel="noreferrer" className="block break-all text-xs hover:underline" style={{ color: 'var(--accent)' }}>{link} ↗</a>)}</div>}</article>) : <p className="text-xs" style={{ color: 'var(--muted)' }}>No written responses saved.</p>}</div>
        </Section>

        <Section title="Round 1 · Technical assessment">
          {attempt ? <><dl className="grid grid-cols-2 gap-3 text-xs">
            <Data label="Score" value={attempt.score == null ? 'Pending evaluation' : `${attempt.score} / ${attempt.total_marks ?? '—'} (${scorePercent(attempt) ?? 0}%)`} />
            <Data label="Status" value={humanize(attempt.status)} />
            <Data label="Admin decision" value={attempt.admin_qualified == null ? 'Pending' : attempt.admin_qualified ? 'Qualified' : 'Not qualified'} />
            <Data label="Auto-submitted" value={attempt.auto_submitted ? 'Yes (time up)' : 'No'} />
          </dl>
          {attempt.status === 'submitted' && <div className="mt-4 border-t pt-3" style={{ borderColor: 'var(--border)' }}>
            <button onClick={() => onReleaseMarks(attempt.id, !attempt.results_released_at)} disabled={releasing}
              className="w-full border px-3 py-2 font-mono text-[10px] font-bold transition disabled:cursor-not-allowed disabled:opacity-40"
              style={attempt.results_released_at ? { borderColor: 'rgba(245,158,11,.5)', color: 'var(--warning)' } : { borderColor: 'var(--accent)', background: 'var(--accent)', color: 'var(--bg)' }}>
              {releasing ? 'SAVING…' : attempt.results_released_at ? 'HIDE MARKS FROM CANDIDATE' : attempt.score == null ? 'CALCULATE & RELEASE MARKS' : 'RELEASE MARKS TO CANDIDATE'}
            </button>
            <p className="mt-2 font-mono text-[9px]" style={{ color: 'var(--dim)' }}>{attempt.results_released_at ? `Released ${formatDateTime(attempt.results_released_at)}` : 'Candidate sees: Results will be released shortly.'}</p>
          </div>}</> : <p className="text-xs" style={{ color: 'var(--muted)' }}>No Technical assessment required or started.</p>}
        </Section>

        <Section title="Round 2 · Project tracks">
          <div className="space-y-3">{assignments.length ? assignments.map((assignment) => { const submission = submissions.find((s) => s.assignment_id === assignment.id); return <div key={assignment.id} className="border p-3" style={{ borderColor: 'var(--border)', background: 'rgba(0,0,0,.4)' }}><div className="flex justify-between gap-3"><div><p className="font-mono text-[9px]" style={{ color: 'var(--accent)' }}>{assignment.project?.code ?? 'PROJECT'}</p><p className="mt-1 text-sm font-semibold">{assignment.project?.title ?? 'Unavailable'}</p></div><span className="font-mono text-[9px]" style={{ color: 'var(--muted)' }}>{humanize(assignment.status)}</span></div>{submission ? <div className="mt-3 border-t pt-3 text-xs" style={{ borderColor: 'var(--border)' }}><a href={submission.github_url} target="_blank" rel="noreferrer" className="hover:underline" style={{ color: 'var(--accent)' }}>Open GitHub ↗</a>{submission.evaluation ? <p className="mt-2 font-mono" style={{ color: 'var(--success)' }}>Evaluation: {submission.evaluation.total_score ?? '—'}/100 · {submission.evaluation.qualified ? 'Qualified' : 'Not qualified'}</p> : <p className="mt-2 font-mono" style={{ color: 'var(--warning)' }}>Awaiting evaluation</p>}</div> : <p className="mt-3 font-mono text-[10px]" style={{ color: 'var(--warning)' }}>Not submitted</p>}</div>; }) : <p className="text-xs" style={{ color: 'var(--muted)' }}>No projects assigned.</p>}</div>
        </Section>

        <Section title="Final decision">
          <div className="flex items-center justify-between"><span className="text-sm" style={{ color: 'var(--muted)' }}>Current outcome</span><strong className="font-mono text-sm" style={{ color: result?.result === 'selected' ? 'var(--success)' : result?.result === 'not_selected' ? 'var(--error)' : 'var(--accent)' }}>{humanize(result?.result ?? profile.final_status ?? 'Pending')}</strong></div>
          {result?.feedback && <p className="mt-3 border-t pt-3 text-xs leading-5" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>{result.feedback}</p>}
        </Section>
        <section className="border p-4" style={{ borderColor: 'rgba(239,68,68,.35)', background: 'rgba(239,68,68,.06)' }}>
          <h3 className="mb-3 border-b pb-2 font-mono text-[10px] uppercase tracking-wider" style={{ borderColor: 'rgba(239,68,68,.25)', color: 'var(--error)' }}>Danger zone</h3>
          <p className="text-xs leading-5" style={{ color: 'var(--muted)' }}>
            Permanently removes this candidate, every answer and attempt they have, and their sign-in account.
          </p>
          <button type="button" onClick={() => onDelete?.(profile)} disabled={deleting}
            className="mt-3 inline-flex items-center gap-2 border px-4 py-2 font-mono text-[10px] uppercase tracking-wider transition disabled:opacity-40"
            style={{ borderColor: 'rgba(239,68,68,.5)', color: 'var(--error)' }}>
            {deleting ? 'Deleting…' : 'Delete candidate'}
          </button>
        </section>
      </div>
    </div>
  );
}
