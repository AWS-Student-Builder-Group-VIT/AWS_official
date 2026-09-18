import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity, CalendarClock, CheckCircle2, ClipboardCheck, Download, FilePlus2, FolderKanban, RefreshCw, Search, ShieldCheck, Users } from 'lucide-react';
import { createClient } from '../lib/supabase.js';
import { formatDateTime } from '../lib/utils.js';
import { candidateCsvRow } from '../lib/admin-export.js';
import QuestionBank from './QuestionBank.jsx';

const emptyPayload = { admin: { id: '', email: '', name: '', role: '' }, candidates: [], attempts: [], assignments: [], submissions: [], bookings: [], results: [], domains: [], slots: [], written_questions: [], written_rules: [], subdomain_lookup: {}, synced_at: '' };
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
  const [showQuestionBank, setShowQuestionBank] = useState(false);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true); else setLoading(true);
    setError('');
    let token = '';
    try { const { data: { session } } = await supabase.auth.getSession(); token = session?.access_token || ''; } catch {}
    if (!token) { navigate('/recruitment/admin/login', { replace: true }); return; }
    const response = await fetch('/api/recruitment/admin/operations', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
    const result = await response.json();
    if (!response.ok) setError(result.error ?? 'Unable to load operations data.');
    else {
      // Choices arrive as ids only; attach their subdomain and domain once here
      // so the rest of the console can keep reading choice.subdomain.domain.
      const lookup = result.subdomain_lookup ?? {};
      for (const candidate of result.candidates ?? []) {
        for (const choice of candidate.subdomain_choices ?? []) choice.subdomain = lookup[choice.subdomain_id] ?? null;
      }
      setPayload(result);
    }
    setLoading(false);
    setRefreshing(false);
  }, [supabase, navigate]);

  useEffect(() => { load(); }, [load]);

  const records = useMemo(() => payload.candidates.map((profile) => {
    const assignments = payload.assignments.filter((item) => item.candidate_id === profile.id);
    const assignmentIds = new Set(assignments.map((item) => item.id));
    return { profile, attempt: payload.attempts.find((item) => item.candidate_id === profile.id), assignments, submissions: payload.submissions.filter((item) => assignmentIds.has(item.assignment_id)), bookings: payload.bookings.filter((item) => item.candidate_id === profile.id), result: payload.results.find((item) => item.candidate_id === profile.id) };
  }), [payload]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const list = records.filter((record) => {
      const choices = record.profile.subdomain_choices ?? [];
      const searchable = [record.profile.full_name, record.profile.registration_number, record.profile.email, record.profile.phone, ...choices.map(choiceLabel)].filter(Boolean).join(' ').toLowerCase();
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

  const adminFetch = useCallback(async (path) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Administrator session expired.');
    const response = await fetch(path, { headers: { Authorization: `Bearer ${session.access_token}` }, cache: 'no-store' });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error ?? `Request failed (HTTP ${response.status}).`);
    return result;
  }, [supabase]);

  async function exportCsv() {
    setExporting(true);
    setError('');
    // Every answer, a page at a time, so no single response grows too large.
    const allAnswers = {};
    try {
      for (let offset = 0; offset != null;) {
        const page = await adminFetch(`/api/recruitment/admin/written-answers?offset=${offset}&limit=400`);
        for (const answer of page.answers ?? []) (allAnswers[answer.candidate_id] ??= []).push(answer);
        offset = page.nextOffset;
      }
    } catch (err) {
      setError(`Export failed: ${err.message}`);
      setExporting(false);
      return;
    }
    exportRows(allAnswers);
    setExporting(false);
  }

  function exportRows(allAnswers) {
    const quote = (v) => `"${String(v ?? '').replaceAll('"', '""')}"`;
    const rows = filtered.map(({ profile, attempt, assignments, bookings, result }) => {
      const writtenAnswers = allAnswers[profile.id] ?? [];
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
          <button onClick={exportCsv} disabled={exporting} className="inline-flex items-center gap-2 border px-3 py-2 transition disabled:opacity-50" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}><Download size={13} />{exporting ? 'EXPORTING…' : 'EXPORT CSV'}</button>
          <button onClick={() => load(true)} disabled={refreshing} className="inline-flex items-center gap-2 border px-3 py-2 transition disabled:opacity-50" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}><RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />SYNC LIVE</button>
        </div>
      </div>

      {error && <div role="alert" className="border-b px-4 py-3 text-sm" style={{ borderColor: 'var(--error)', background: 'rgba(239,68,68,.1)', color: 'var(--error)' }}>{error}</div>}

      <div className="grid min-h-[calc(100vh-10.5rem)] xl:grid-cols-[230px_minmax(680px,1fr)]">
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
        <main className="min-w-0 overflow-hidden" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between border-b px-3 py-2 font-mono text-[10px]" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
            <span className="relative block w-full max-w-xs"><Search size={13} className="absolute left-2 top-1.5" style={{ color: 'var(--dim)' }} /><input type="search" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search candidates" className="w-full border py-1 pl-7 pr-2" style={{ borderColor: 'var(--border)', background: 'var(--bg)', color: 'var(--text)' }} placeholder="Search name, reg no, email, phone…" /></span>
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
                  return (
                    <tr key={profile.id} onClick={() => navigate(`/recruitment/admin/candidates/${profile.id}`)} className="cursor-pointer border-b transition hover:bg-[rgba(255,153,0,.05)]" style={{ borderColor: 'var(--border)', background: 'rgba(17,19,24,.4)' }}>
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

      </div>

      <footer className="flex flex-wrap justify-between gap-2 border-t px-4 py-2 font-mono text-[9px]" style={{ borderColor: 'var(--border)', background: '#060709', color: 'var(--dim)' }}>
        <span>REGION: ap-south-1 // CONTROLLED ADMIN OPERATIONS</span>
        <span>LAST SYNC: {payload.synced_at ? formatDateTime(payload.synced_at) : '—'}</span>
      </footer>

      {showQuestionBank && <QuestionBank domains={payload.domains} onClose={() => setShowQuestionBank(false)} />}
    </div>
  );
}
