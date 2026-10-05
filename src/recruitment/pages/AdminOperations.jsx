import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity, AlertTriangle, CalendarClock, CheckCircle2, ClipboardCheck, Download, FilePlus2, FolderKanban, RefreshCw, Search, ShieldCheck, Users, X } from 'lucide-react';
import { createClient } from '../lib/supabase.js';
import { formatDateTime } from '../lib/utils.js';
import QuestionBank from './QuestionBank.jsx';

const FILTER_STORAGE_KEY = 'ops-filter-v1';

const emptyPayload = { admin: { id: '', email: '', name: '', role: '' }, candidates: [], attempts: [], assignments: [], submissions: [], bookings: [], results: [], domains: [], slots: [], written_questions: [], written_rules: [], subdomain_lookup: {}, synced_at: '' };
const stageOrder = { selected: 8, waitlisted: 7, round_2: 6, round_1: 5, round_0: 4, pending: 3, rejected: 1 };

function readPersistedFilters() {
  try { const raw = sessionStorage.getItem(FILTER_STORAGE_KEY); if (!raw) return null; return JSON.parse(raw); } catch { return null; }
}
function writePersistedFilters(state) {
  try { sessionStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(state)); } catch {}
}

function humanize(value) { return value ? value.replaceAll('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase()) : 'Not started'; }
function initials(name) { return name.split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase(); }
function scorePercent(attempt) { if (attempt?.score == null || !attempt.total_marks) return null; return Math.round((attempt.score / attempt.total_marks) * 100); }
function choiceLabel(choice) { const domain = choice.subdomain?.domain; return domain?.selection_mode === 'whole_domain' ? domain.name : `${domain?.name ?? 'Domain'} / ${choice.subdomain?.name ?? 'Track'}`; }

function getChoiceQualStatus(record, choice, attempts) {
  const domain = choice.subdomain?.domain;
  const isTechnical = domain?.slug === 'technical';
  if (isTechnical) {
    const domainAttempt = (attempts ?? []).find(
      (a) => a.candidate_id === record.profile.id && a.domain_id === choice.subdomain?.domain_id,
    );
    return domainAttempt?.admin_qualified ?? null;
  }
  return choice.admin_qualified ?? null;
}

function getRecordQualStatus(record, domainIds, attempts) {
  const choices = record.profile.subdomain_choices ?? [];
  if (domainIds.length > 0) {
    const targetChoices = choices.filter(
      (c) => c.subdomain?.domain_id && domainIds.includes(c.subdomain.domain_id),
    );
    if (targetChoices.length === 0) {
      return { isQualified: false, isDisqualified: false, isPending: false };
    }
    const statuses = targetChoices.map((c) => getChoiceQualStatus(record, c, attempts));
    return {
      isQualified: statuses.some((s) => s === true),
      isDisqualified: statuses.some((s) => s === false),
      isPending: statuses.some((s) => s == null),
    };
  }
  const allStatuses = choices.map((c) => getChoiceQualStatus(record, c, attempts));
  const isQualified = record.profile.round_0_status === 'qualified' || allStatuses.some((s) => s === true);
  const isDisqualified =
    record.profile.round_0_status === 'not_qualified' ||
    record.profile.status === 'rejected' ||
    (allStatuses.length > 0 && allStatuses.every((s) => s === false));
  const isPending = !isQualified && !isDisqualified;
  return { isQualified, isDisqualified, isPending };
}

export default function AdminOperations() {
  const navigate = useNavigate();
  const [supabase] = useState(createClient);
  const [payload, setPayload] = useState(emptyPayload);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  // Restore filters from sessionStorage so navigation away + back keeps selection intact
  const [search, setSearch] = useState(() => readPersistedFilters()?.search ?? '');
  const [domainIds, setDomainIds] = useState(() => readPersistedFilters()?.domainIds ?? []);
  const [subdomainId, setSubdomainId] = useState(() => readPersistedFilters()?.subdomainId ?? '');
  const [stage, setStage] = useState(() => readPersistedFilters()?.stage ?? '');
  const [minScore, setMinScore] = useState(() => readPersistedFilters()?.minScore ?? 0);
  const [sort, setSort] = useState(() => readPersistedFilters()?.sort ?? 'newest');
  const [qualFilter, setQualFilter] = useState(() => readPersistedFilters()?.qualFilter ?? '');
  const [showQuestionBank, setShowQuestionBank] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportDomainId, setExportDomainId] = useState('');
  const [exportQualFilter, setExportQualFilter] = useState('qualified');
  const [disqualifying, setDisqualifying] = useState(''); // candidateId being processed
  const [bulkDisqualifying, setBulkDisqualifying] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0 });
  const [showBulkModal, setShowBulkModal] = useState(false);

  // Persist filter state so it survives navigation to candidate profile and back
  useEffect(() => {
    writePersistedFilters({ search, domainIds, subdomainId, stage, minScore, sort, qualFilter });
  }, [search, domainIds, subdomainId, stage, minScore, sort, qualFilter]);


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

      // Qualification status filter (scoped to selected domain(s) if any, otherwise global)
      let qualMatch = true;
      if (qualFilter) {
        const qStatus = getRecordQualStatus(record, domainIds, payload.attempts);
        if (qualFilter === 'qualified') qualMatch = Boolean(qStatus.isQualified);
        else if (qualFilter === 'disqualified') qualMatch = Boolean(qStatus.isDisqualified);
        else if (qualFilter === 'pending') qualMatch = Boolean(qStatus.isPending);
      }

      return (!query || searchable.includes(query)) && domainMatch && subdomainMatch && qualMatch && (!stage || record.profile.status === stage) && (minScore === 0 || (pct != null && pct >= minScore));
    });
    return list.sort((a, b) => {
      if (sort === 'score_desc') return (scorePercent(b.attempt) ?? -1) - (scorePercent(a.attempt) ?? -1);
      if (sort === 'score_asc') return (scorePercent(a.attempt) ?? 101) - (scorePercent(b.attempt) ?? 101);
      if (sort === 'name') return a.profile.full_name.localeCompare(b.profile.full_name);
      if (sort === 'status') return (stageOrder[b.profile.status] ?? 0) - (stageOrder[a.profile.status] ?? 0);
      return new Date(b.profile.created_at).getTime() - new Date(a.profile.created_at).getTime();
    });
  }, [records, search, domainIds, subdomainId, qualFilter, stage, minScore, sort, payload.attempts]);

  const visibleSubdomains = useMemo(() => payload.domains.filter((d) => domainIds.includes(d.id)).flatMap((d) => d.subdomains ?? []), [payload.domains, domainIds]);
  useEffect(() => { if (subdomainId && !visibleSubdomains.some((s) => s.id === subdomainId)) setSubdomainId(''); }, [subdomainId, visibleSubdomains]);

  const selectedDomainLabel = useMemo(() => {
    if (domainIds.length === 1) {
      return payload.domains.find((d) => d.id === domainIds[0])?.name ?? 'Domain';
    }
    if (domainIds.length > 1) {
      return `${domainIds.length} Domains`;
    }
    return '';
  }, [domainIds, payload.domains]);

  const qualCounts = useMemo(() => {
    let pending = 0;
    let qualified = 0;
    let disqualified = 0;
    for (const record of records) {
      const choices = record.profile.subdomain_choices ?? [];
      const domainMatch = domainIds.length === 0 || choices.some((c) => c.subdomain?.domain_id && domainIds.includes(c.subdomain.domain_id));
      if (!domainMatch) continue;
      const status = getRecordQualStatus(record, domainIds, payload.attempts);
      if (status.isQualified) qualified++;
      if (status.isDisqualified) disqualified++;
      if (status.isPending) pending++;
    }
    return { pending, qualified, disqualified };
  }, [records, domainIds, payload.attempts]);

  const metrics = useMemo(() => {
    const evaluated = payload.attempts.filter((a) => a.admin_qualified != null).length;
    const qualified = payload.attempts.filter((a) => a.admin_qualified === true).length;
    const graded = payload.submissions.filter((s) => s.evaluation).length;
    const offers = payload.results.filter((r) => r.result === 'selected').length;
    const backlog = records.filter((r) => r.profile.status === 'pending' || (r.attempt?.status === 'submitted' && r.attempt.admin_qualified == null) || r.submissions.some((s) => !s.evaluation)).length;
    return { evaluated, qualified, graded, offers, backlog };
  }, [payload, records]);

  function toggleDomain(id) { setDomainIds((curr) => curr.includes(id) ? curr.filter((item) => item !== id) : [...curr, id]); }
  function resetFilters() { setSearch(''); setDomainIds([]); setSubdomainId(''); setStage(''); setMinScore(0); setSort('newest'); setQualFilter(''); }

  const adminFetch = useCallback(async (path, opts = {}) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Administrator session expired.');
    const response = await fetch(path, {
      ...opts,
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
        ...(opts.headers ?? {}),
      },
      cache: 'no-store',
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error ?? `Request failed (HTTP ${response.status}).`);
    return result;
  }, [supabase]);

  /**
   * Disqualify the candidate ONLY for domains where they have NOT submitted a response.
   * – Technical domain  → no assessment attempt or attempt.status !== 'submitted'
   * – Non-technical     → no is_final written answer for that domain
   * Other domains (already submitted) are left completely untouched.
   */
  async function disqualifyNonSubmitted(record) {
    const candidateId = record.profile.id;
    setDisqualifying(candidateId);
    setError('');
    try {
      const choices = record.profile.subdomain_choices ?? [];
      const toDisqualify = [];
      for (const choice of choices) {
        const domain = choice.subdomain?.domain;
        const isTechnical = domain?.slug === 'technical';
        if (isTechnical) {
          const attempt = payload.attempts.find(
            (a) => a.candidate_id === candidateId && a.domain_id === choice.subdomain?.domain_id,
          );
          if (!attempt || attempt.status !== 'submitted') {
            toDisqualify.push(choice.subdomain_id);
          }
        } else {
          const hasSubmitted = (payload.written_questions ?? []).some(
            (wq) => wq.candidate_id === candidateId && wq.domain_id === choice.subdomain?.domain_id && wq.is_final,
          );
          if (!hasSubmitted) {
            toDisqualify.push(choice.subdomain_id);
          }
        }
      }
      if (toDisqualify.length === 0) {
        setError('All domains for this candidate already have submissions — nothing to disqualify.');
        setDisqualifying('');
        return;
      }
      for (const subdomainId of toDisqualify) {
        await adminFetch(`/api/recruitment/admin/candidates/${encodeURIComponent(candidateId)}/qualify`, {
          method: 'POST',
          body: JSON.stringify({ subdomainId, qualified: false }),
        });
      }
      await load(true);
    } catch (err) {
      setError(`Disqualify failed: ${err.message}`);
    }
    setDisqualifying('');
  }

  /**
   * Build a preview of how many candidates × domain pairs will be bulk-disqualified.
   * Returns an array of { domainName, candidateCount } sorted by count desc.
   */
  function buildBulkPreview() {
    // Map domainId → { name, set of candidateIds that haven't submitted }
    const domainMap = {};
    for (const record of filtered) {
      const candidateId = record.profile.id;
      const choices = record.profile.subdomain_choices ?? [];
      for (const choice of choices) {
        const domain = choice.subdomain?.domain;
        if (!domain) continue;
        const isTechnical = domain.slug === 'technical';
        let submitted = false;
        if (isTechnical) {
          const attempt = payload.attempts.find(
            (a) => a.candidate_id === candidateId && a.domain_id === choice.subdomain?.domain_id,
          );
          submitted = attempt?.status === 'submitted';
        } else {
          submitted = (payload.written_questions ?? []).some(
            (wq) => wq.candidate_id === candidateId && wq.domain_id === choice.subdomain?.domain_id && wq.is_final,
          );
        }
        if (!submitted) {
          const domId = domain.id;
          if (!domainMap[domId]) domainMap[domId] = { name: domain.name, candidates: new Set() };
          domainMap[domId].candidates.add(candidateId);
        }
      }
    }
    return Object.values(domainMap)
      .map(({ name, candidates }) => ({ domainName: name, candidateCount: candidates.size }))
      .sort((a, b) => b.candidateCount - a.candidateCount);
  }

  /**
   * Bulk disqualify ALL filtered candidates for every domain they haven't submitted.
   * Runs sequentially per candidate to avoid API hammering.
   */
  async function bulkDisqualifyAll() {
    setShowBulkModal(false);
    setBulkDisqualifying(true);
    setError('');
    // Collect all (candidateId, subdomainId) pairs where no submission exists
    const jobs = [];
    for (const record of filtered) {
      const candidateId = record.profile.id;
      const choices = record.profile.subdomain_choices ?? [];
      for (const choice of choices) {
        const domain = choice.subdomain?.domain;
        if (!domain) continue;
        const isTechnical = domain.slug === 'technical';
        let submitted = false;
        if (isTechnical) {
          const attempt = payload.attempts.find(
            (a) => a.candidate_id === candidateId && a.domain_id === choice.subdomain?.domain_id,
          );
          submitted = attempt?.status === 'submitted';
        } else {
          submitted = (payload.written_questions ?? []).some(
            (wq) => wq.candidate_id === candidateId && wq.domain_id === choice.subdomain?.domain_id && wq.is_final,
          );
        }
        if (!submitted) {
          jobs.push({ candidateId, subdomainId: choice.subdomain_id });
        }
      }
    }
    if (jobs.length === 0) {
      setError('No unsubmitted domain entries found — nothing to disqualify.');
      setBulkDisqualifying(false);
      return;
    }
    setBulkProgress({ done: 0, total: jobs.length });
    let done = 0;
    for (const job of jobs) {
      try {
        await adminFetch(
          `/api/recruitment/admin/candidates/${encodeURIComponent(job.candidateId)}/qualify`,
          { method: 'POST', body: JSON.stringify({ subdomainId: job.subdomainId, qualified: false }) },
        );
      } catch (err) {
        // Log but continue; one failure shouldn't halt the bulk run
        console.error('Bulk disqualify error for', job, err.message);
      }
      done += 1;
      setBulkProgress({ done, total: jobs.length });
    }
    await load(true);
    setBulkDisqualifying(false);
    setBulkProgress({ done: 0, total: 0 });
  }

  function openExportModal() {
    setExportDomainId(payload.domains[0]?.id ?? '');
    setExportQualFilter('qualified');
    setShowExportModal(true);
  }


  async function runExport() {
    if (!exportDomainId) return;
    setExporting(true);
    setError('');
    try {
      // Determine which domain object was selected
      const domain = payload.domains.find((d) => d.id === exportDomainId);
      const domainName = domain?.name ?? 'Domain';

      // Collect every candidate that registered for this domain
      const domainCandidates = records.filter((record) =>
        (record.profile.subdomain_choices ?? []).some(
          (c) => c.subdomain?.domain_id === exportDomainId,
        ),
      );

      // For each candidate determine if they are qualified in THIS domain.
      // – Technical domain (slug='technical') → qualification lives on assessment_attempt.admin_qualified
      // – All other domains (Events, Management, etc.) → qualification lives on
      //   candidate_subdomain_choices.admin_qualified (per-choice, NOT on the attempt)
      const selectedDomain = payload.domains.find((d) => d.id === exportDomainId);
      const isTechnical = selectedDomain?.slug === 'technical';

      const qualify = (record) => {
        if (isTechnical) {
          // Technical: find the attempt for this domain
          const domainAttempt = payload.attempts.find(
            (a) => a.candidate_id === record.profile.id && a.domain_id === exportDomainId,
          );
          return domainAttempt ? domainAttempt.admin_qualified === true : false;
        } else {
          // Non-technical: qualification is stored directly on the subdomain choice row
          const domainChoices = (record.profile.subdomain_choices ?? []).filter(
            (c) => c.subdomain?.domain_id === exportDomainId,
          );
          return domainChoices.some((c) => c.admin_qualified === true);
        }
      };

      const toExport = domainCandidates.filter((record) => {
        const isQualified = qualify(record);
        if (exportQualFilter === 'qualified') return isQualified;
        if (exportQualFilter === 'not_qualified') return !isQualified;
        return true; // 'all'
      });

      const quote = (v) => `"${String(v ?? '').replaceAll('"', '""')}"`;
      const headers = ['Name', 'Email', 'Phone', 'Branch', 'Domain'];
      const rows = toExport.map(({ profile }) => [
        profile.full_name,
        profile.email,
        profile.phone,
        profile.branch,
        domainName,
      ]);
      const csv = [headers, ...rows].map((row) => row.map(quote).join(',')).join('\n');
      const label = exportQualFilter === 'all' ? 'all' : exportQualFilter;
      const filename = `${domainName.toLowerCase().replace(/\s+/g, '-')}-${label}-${new Date().toISOString().slice(0, 10)}.csv`;
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
      setShowExportModal(false);
    } catch (err) {
      setError(`Export failed: ${err.message}`);
    }
    setExporting(false);
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
        <span>
          <strong style={{ color: 'var(--accent)' }}>{filtered.length}</strong> OF {records.length} CANDIDATES DISPLAYED
          {qualFilter && (
            <span
              className="ml-2 inline-flex items-center gap-1 border px-2 py-0.5 font-mono text-[9px] font-bold uppercase"
              style={{
                borderColor: 'rgba(255,153,0,.5)',
                background: 'rgba(255,153,0,.12)',
                color: 'var(--accent)',
              }}
            >
              <span>{selectedDomainLabel || 'GLOBAL'}: {qualFilter}</span>
              <button
                type="button"
                onClick={() => setQualFilter('')}
                className="hover:text-white"
                title="Clear qualification filter"
              >
                <X size={10} />
              </button>
            </span>
          )}
          {bulkDisqualifying && (
            <span className="ml-3" style={{ color: 'var(--warning)' }}>
              ⚡ BULK DISQUALIFYING… {bulkProgress.done}/{bulkProgress.total}
            </span>
          )}
        </span>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setShowQuestionBank(true)} className="inline-flex items-center gap-2 border px-3 py-2 transition" style={{ borderColor: 'rgba(255,153,0,.6)', background: 'rgba(255,153,0,.1)', color: 'var(--accent)' }}><FilePlus2 size={13} />QUESTION BANK</button>
          <button onClick={openExportModal} disabled={exporting} className="inline-flex items-center gap-2 border px-3 py-2 transition disabled:opacity-50" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}><Download size={13} />{exporting ? 'EXPORTING…' : 'EXPORT CSV'}</button>
          <button onClick={() => load(true)} disabled={refreshing} className="inline-flex items-center gap-2 border px-3 py-2 transition disabled:opacity-50" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}><RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />SYNC LIVE</button>
          <button
            id="bulk-disqualify-btn"
            onClick={() => setShowBulkModal(true)}
            disabled={bulkDisqualifying || filtered.length === 0}
            title="Bulk disqualify all visible candidates for every domain they have NOT submitted"
            className="inline-flex items-center gap-2 border px-3 py-2 font-bold transition disabled:opacity-40"
            style={{ borderColor: 'rgba(239,68,68,.7)', background: 'rgba(239,68,68,.12)', color: 'var(--error)' }}
          >
            <AlertTriangle size={13} />
            {bulkDisqualifying ? `WORKING… ${bulkProgress.done}/${bulkProgress.total}` : 'BULK DISQUALIFY UNSUBMITTED'}
          </button>
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
          <div className="mt-5">
            <p className="label !text-[9px]">Domain groups</p>
            <div className="space-y-1">
              {payload.domains.map((domain) => {
                const count = records.filter((r) => r.profile.subdomain_choices?.some((c) => c.subdomain?.domain_id === domain.id)).length;
                const active = domainIds.includes(domain.id);
                return (
                  <label
                    key={domain.id}
                    className="flex cursor-pointer items-center justify-between border px-2 py-2 font-mono text-[10px] transition"
                    style={{
                      background: active ? 'rgba(255,153,0,.08)' : 'var(--surface)',
                      borderColor: active ? 'rgba(255,153,0,.45)' : 'transparent',
                    }}
                  >
                    <span className="flex items-center gap-2">
                      <input type="checkbox" checked={active} onChange={() => toggleDomain(domain.id)} style={{ accentColor: 'var(--accent)' }} />
                      <span style={{ color: active ? 'var(--accent)' : 'var(--text)' }}>{domain.name}</span>
                    </span>
                    <span style={{ color: 'var(--accent)' }}>{count}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Qualification status filter: domain-scoped if domain selected, else global */}
          <div className="mt-5">
            <div className="flex items-center justify-between mb-1">
              <span className="label !text-[9px] !mb-0">
                {selectedDomainLabel ? `${selectedDomainLabel} status` : 'Qualification'}
              </span>
              <span
                className="font-mono text-[8px] font-bold uppercase px-1.5 py-0.5"
                style={{
                  background: selectedDomainLabel ? 'rgba(255,153,0,.15)' : 'rgba(255,255,255,.06)',
                  color: selectedDomainLabel ? 'var(--accent)' : 'var(--dim)',
                  border: `1px solid ${selectedDomainLabel ? 'rgba(255,153,0,.3)' : 'var(--border)'}`,
                }}
              >
                {selectedDomainLabel ? 'Domain scope' : 'Global scope'}
              </span>
            </div>
            <select
              id="qualification-filter"
              value={qualFilter}
              onChange={(e) => setQualFilter(e.target.value)}
              className="field !py-2 font-mono text-xs"
              style={{
                borderColor: qualFilter ? 'rgba(255,153,0,.6)' : undefined,
                background: qualFilter ? 'rgba(255,153,0,.05)' : undefined,
              }}
            >
              <option value="">
                All {selectedDomainLabel ? `(${selectedDomainLabel})` : '(Global)'}
              </option>
              <option value="pending">
                ⋯ Pending ({qualCounts.pending})
              </option>
              <option value="qualified">
                ✓ Qualified ({qualCounts.qualified})
              </option>
              <option value="disqualified">
                ✗ Disqualified ({qualCounts.disqualified})
              </option>
            </select>
          </div>

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
            <table className="w-full min-w-[1050px] border-collapse text-left text-xs">
              <thead className="sticky top-0 z-10 border-b-2 font-mono text-[9px] uppercase tracking-wider" style={{ borderColor: 'var(--border)', background: '#080a0d', color: 'var(--muted)' }}>
                <tr>
                  <th className="px-3 py-3">Candidate identity</th>
                  <th className="px-3 py-3">Domain · Submission · Qualification</th>
                  <th className="px-3 py-3">Round 1</th>
                  <th className="px-3 py-3">Round 2 projects</th>
                  <th className="px-3 py-3">Round 3 interviews</th>
                  <th className="px-3 py-3">Decision</th>
                  <th className="px-3 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((record) => {
                  const { profile, attempt, assignments, submissions, bookings, result } = record;
                  const pct = scorePercent(attempt);
                  const choices = [...(profile.subdomain_choices ?? [])].sort((a, b) => a.priority - b.priority);
                  const isBusy = disqualifying === profile.id;

                  // Build per-domain submission + qualification status
                  const domainRows = choices.map((choice) => {
                    const domain = choice.subdomain?.domain;
                    const isTechnical = domain?.slug === 'technical';
                    const label = choiceLabel(choice);
                    let submitted = false;
                    let qualStatus = null;
                    if (isTechnical) {
                      const domainAttempt = payload.attempts.find(
                        (a) => a.candidate_id === profile.id && a.domain_id === choice.subdomain?.domain_id,
                      );
                      submitted = domainAttempt?.status === 'submitted';
                      qualStatus = domainAttempt?.admin_qualified ?? null;
                    } else {
                      const hasSubmitted = (payload.written_questions ?? []).some(
                        (wq) => wq.candidate_id === profile.id && wq.domain_id === choice.subdomain?.domain_id && wq.is_final,
                      );
                      submitted = hasSubmitted;
                      qualStatus = choice.admin_qualified ?? null;
                    }
                    return { choice, label, submitted, qualStatus };
                  });

                  const hasUnsubmitted = domainRows.some((dr) => !dr.submitted);

                  return (
                    <tr key={profile.id} className="border-b transition hover:bg-[rgba(255,153,0,.04)]" style={{ borderColor: 'var(--border)', background: 'rgba(17,19,24,.4)' }}>

                      {/* Identity */}
                      <td className="cursor-pointer px-3 py-3" onClick={() => navigate(`/recruitment/admin/candidates/${profile.id}`)}
                      ><div className="flex items-center gap-2"><span className="grid h-8 w-8 shrink-0 place-items-center border font-mono text-[10px] font-bold" style={{ borderColor: 'rgba(255,153,0,.4)', background: 'rgba(255,153,0,.1)', color: 'var(--accent)' }}>{initials(profile.full_name)}</span><span className="min-w-0"><strong className="block truncate text-sm" style={{ color: 'var(--text)' }}>{profile.full_name}</strong><span className="font-mono text-[9px]" style={{ color: 'var(--accent)' }}>#{profile.registration_number}</span><span className="block text-[9px]" style={{ color: 'var(--dim)' }}>{profile.branch ?? 'Branch —'} · Year {profile.year ?? '—'}</span></span></div></td>

                      {/* Domain · Submission · Qualification */}
                      <td className="px-3 py-3">
                        {domainRows.length ? (
                          <div className="space-y-1.5">
                            {domainRows.map(({ choice, label, submitted, qualStatus }) => (
                              <div key={choice.subdomain_id} className="flex flex-wrap items-center gap-1">
                                <span className="font-mono text-[9px]" style={{ color: 'var(--accent)' }}>{label}</span>
                                <span className="rounded-sm px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase" style={submitted ? { background: 'rgba(34,197,94,.15)', color: 'var(--success)' } : { background: 'rgba(239,68,68,.12)', color: 'var(--error)' }}>
                                  {submitted ? 'Submitted' : 'Not submitted'}
                                </span>
                                <span className="rounded-sm px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase" style={qualStatus === true ? { background: 'rgba(34,197,94,.12)', color: 'var(--success)' } : qualStatus === false ? { background: 'rgba(239,68,68,.12)', color: 'var(--error)' } : { background: 'rgba(255,153,0,.08)', color: 'var(--warning)' }}>
                                  {qualStatus === true ? '✓ Qualified' : qualStatus === false ? '✗ Not qualified' : '⋯ Pending'}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : <span style={{ color: 'var(--dim)' }}>Unassigned</span>}
                      </td>

                      {/* Round 1 */}
                      <td className="cursor-pointer px-3 py-3 font-mono" onClick={() => navigate(`/recruitment/admin/candidates/${profile.id}`)}>{pct == null ? <span style={{ color: 'var(--dim)' }}>{humanize(profile.round_0_status)}</span> : <><strong style={{ color: pct >= 70 ? 'var(--success)' : pct >= 40 ? 'var(--warning)' : 'var(--error)' }}>{attempt?.score}/{attempt?.total_marks} ({pct}%)</strong><span className="block text-[9px]" style={{ color: 'var(--dim)' }}>{attempt?.auto_submitted ? 'Auto-submitted' : humanize(attempt?.status)}</span></>}</td>

                      {/* Round 2 */}
                      <td className="cursor-pointer px-3 py-3 font-mono text-[9px]" onClick={() => navigate(`/recruitment/admin/candidates/${profile.id}`)}>{assignments.length ? <><span style={{ color: 'var(--text)' }}>{assignments.length} assigned</span><span className="block" style={{ color: 'var(--success)' }}>{submissions.length} submitted · {submissions.filter((s) => s.evaluation).length} graded</span></> : <span style={{ color: 'var(--dim)' }}>Not assigned</span>}</td>

                      {/* Round 3 */}
                      <td className="cursor-pointer px-3 py-3 font-mono text-[9px]" onClick={() => navigate(`/recruitment/admin/candidates/${profile.id}`)}>{bookings.length ? <><span style={{ color: 'var(--text)' }}>{bookings.length} booked</span><span className="block" style={{ color: 'var(--success)' }}>Confirmed</span></> : <span style={{ color: 'var(--dim)' }}>Not booked</span>}</td>

                      {/* Decision */}
                      <td className="cursor-pointer px-3 py-3" onClick={() => navigate(`/recruitment/admin/candidates/${profile.id}`)}
                      ><span className="border px-2 py-1 font-mono text-[9px] uppercase" style={result?.result === 'selected' || profile.status === 'selected' ? { borderColor: 'rgba(34,197,94,.5)', background: 'rgba(34,197,94,.1)', color: 'var(--success)' } : profile.status === 'rejected' ? { borderColor: 'rgba(239,68,68,.5)', background: 'rgba(239,68,68,.1)', color: 'var(--error)' } : { borderColor: 'var(--border)', color: 'var(--muted)' }}>{humanize(result?.result ?? profile.status)}</span></td>

                      {/* Actions */}
                      <td className="px-3 py-3">
                        {hasUnsubmitted && (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={(e) => { e.stopPropagation(); disqualifyNonSubmitted(record); }}
                            title="Mark NOT QUALIFIED only for domains where this candidate has not submitted"
                            className="inline-flex items-center gap-1 border px-2 py-1.5 font-mono text-[8px] font-bold uppercase transition hover:opacity-90 disabled:opacity-40"
                            style={{ borderColor: 'rgba(239,68,68,.5)', background: 'rgba(239,68,68,.08)', color: 'var(--error)', whiteSpace: 'nowrap' }}
                          >
                            <AlertTriangle size={10} />
                            {isBusy ? 'Working…' : 'Disqualify unsubmitted'}
                          </button>
                        )}
                      </td>
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

      {showExportModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Export CSV"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.75)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowExportModal(false); }}
        >
          <div
            className="w-full max-w-md border"
            style={{ background: '#0d0f14', borderColor: 'var(--border)' }}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-2">
                <Download size={15} style={{ color: 'var(--accent)' }} />
                <span className="font-mono text-xs font-bold tracking-widest" style={{ color: 'var(--accent)' }}>EXPORT CSV</span>
              </div>
              <button
                onClick={() => setShowExportModal(false)}
                aria-label="Close export modal"
                className="border p-1 transition hover:border-[var(--accent)]"
                style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
              >
                <X size={13} />
              </button>
            </div>

            {/* Modal body */}
            <div className="space-y-5 px-4 py-5">
              <p className="font-mono text-[10px] leading-relaxed" style={{ color: 'var(--muted)' }}>
                Select a domain and qualification status. Each student registered in the chosen domain
                will appear in the CSV — if they registered in multiple domains they will be listed
                per domain based on their qualification in <em>that</em> domain.
              </p>

              {/* Domain selector */}
              <label className="block">
                <span className="mb-1 block font-mono text-[9px] uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Domain</span>
                <select
                  id="export-domain-select"
                  value={exportDomainId}
                  onChange={(e) => setExportDomainId(e.target.value)}
                  className="w-full border px-3 py-2 font-mono text-xs"
                  style={{ borderColor: 'var(--border)', background: '#060709', color: 'var(--text)' }}
                >
                  {payload.domains.map((d) => {
                    const count = records.filter((r) =>
                      (r.profile.subdomain_choices ?? []).some((c) => c.subdomain?.domain_id === d.id)
                    ).length;
                    return (
                      <option key={d.id} value={d.id}>
                        {d.name} ({count} registered)
                      </option>
                    );
                  })}
                </select>
              </label>

              {/* Qualification filter */}
              <label className="block">
                <span className="mb-1 block font-mono text-[9px] uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Qualification status</span>
                <select
                  id="export-qual-select"
                  value={exportQualFilter}
                  onChange={(e) => setExportQualFilter(e.target.value)}
                  className="w-full border px-3 py-2 font-mono text-xs"
                  style={{ borderColor: 'var(--border)', background: '#060709', color: 'var(--text)' }}
                >
                  <option value="qualified">Qualified only</option>
                  <option value="not_qualified">Not qualified only</option>
                  <option value="all">All (qualified + not qualified)</option>
                </select>
              </label>

              {/* Preview count */}
              {exportDomainId && (() => {
                const domainCandidates = records.filter((r) =>
                  (r.profile.subdomain_choices ?? []).some((c) => c.subdomain?.domain_id === exportDomainId)
                );
                const selectedDomain = payload.domains.find((d) => d.id === exportDomainId);
                const isTechnical = selectedDomain?.slug === 'technical';
                const qualify = (record) => {
                  if (isTechnical) {
                    const domainAttempt = payload.attempts.find(
                      (a) => a.candidate_id === record.profile.id && a.domain_id === exportDomainId,
                    );
                    return domainAttempt ? domainAttempt.admin_qualified === true : false;
                  } else {
                    const domainChoices = (record.profile.subdomain_choices ?? []).filter(
                      (c) => c.subdomain?.domain_id === exportDomainId,
                    );
                    return domainChoices.some((c) => c.admin_qualified === true);
                  }
                };
                const count = domainCandidates.filter((record) => {
                  if (exportQualFilter === 'qualified') return qualify(record);
                  if (exportQualFilter === 'not_qualified') return !qualify(record);
                  return true;
                }).length;
                return (
                  <div className="border px-3 py-2 font-mono text-[10px]" style={{ borderColor: 'rgba(255,153,0,.3)', background: 'rgba(255,153,0,.05)' }}>
                    <span style={{ color: 'var(--muted)' }}>ROWS IN CSV: </span>
                    <strong style={{ color: 'var(--accent)' }}>{count}</strong>
                    <span style={{ color: 'var(--dim)' }}> candidates</span>
                  </div>
                );
              })()}

              <p className="font-mono text-[9px] leading-relaxed" style={{ color: 'var(--dim)' }}>
                CSV columns: <strong style={{ color: 'var(--muted)' }}>Name · Email · Phone · Branch · Domain</strong>
              </p>
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-3 border-t px-4 py-3" style={{ borderColor: 'var(--border)' }}>
              <button
                onClick={() => setShowExportModal(false)}
                className="border px-4 py-2 font-mono text-[10px] transition"
                style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
              >
                CANCEL
              </button>
              <button
                id="export-csv-confirm"
                onClick={runExport}
                disabled={!exportDomainId || exporting}
                className="inline-flex items-center gap-2 border px-4 py-2 font-mono text-[10px] font-bold transition disabled:opacity-50"
                style={{ borderColor: 'rgba(255,153,0,.6)', background: 'rgba(255,153,0,.15)', color: 'var(--accent)' }}
              >
                <Download size={12} />{exporting ? 'EXPORTING…' : 'DOWNLOAD CSV'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bulk Disqualify Confirmation Modal ── */}
      {showBulkModal && (() => {
        const preview = buildBulkPreview();
        const totalJobs = preview.reduce((s, p) => s + p.candidateCount, 0);
        return (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Bulk Disqualify Unsubmitted"
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.8)' }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowBulkModal(false); }}
          >
            <div className="w-full max-w-lg border" style={{ background: '#0d0f14', borderColor: 'rgba(239,68,68,.5)' }}>
              {/* Header */}
              <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: 'rgba(239,68,68,.4)' }}>
                <div className="flex items-center gap-2">
                  <AlertTriangle size={15} style={{ color: 'var(--error)' }} />
                  <span className="font-mono text-xs font-bold tracking-widest" style={{ color: 'var(--error)' }}>BULK DISQUALIFY — CONFIRM</span>
                </div>
                <button onClick={() => setShowBulkModal(false)} aria-label="Close" className="border p-1 transition hover:border-[var(--error)]" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}><X size={13} /></button>
              </div>

              {/* Body */}
              <div className="space-y-4 px-4 py-5">
                <p className="font-mono text-[10px] leading-relaxed" style={{ color: 'var(--muted)' }}>
                  This will mark <strong style={{ color: 'var(--error)' }}>NOT QUALIFIED</strong> for every candidate–domain pair where no response has been submitted.
                  Candidates who <em>did</em> submit are untouched.
                  This action affects only the <strong style={{ color: 'var(--accent)' }}>{filtered.length} visible candidates</strong> (apply domain / stage filters first to scope this).
                </p>

                {/* Per-domain preview breakdown */}
                {preview.length === 0 ? (
                  <div className="border px-3 py-3 font-mono text-[10px]" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>
                    ✓ All visible candidates have submitted in every domain — nothing to disqualify.
                  </div>
                ) : (
                  <div>
                    <p className="mb-2 font-mono text-[9px] uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                      Domains affected &amp; candidates to be disqualified:
                    </p>
                    <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                      {preview.map(({ domainName, candidateCount }) => (
                        <div key={domainName} className="flex items-center justify-between border px-3 py-2 font-mono text-[10px]" style={{ borderColor: 'rgba(239,68,68,.25)', background: 'rgba(239,68,68,.05)' }}>
                          <span style={{ color: 'var(--text)' }}>{domainName}</span>
                          <span className="font-bold" style={{ color: 'var(--error)' }}>{candidateCount} candidate{candidateCount !== 1 ? 's' : ''}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 border px-3 py-2 font-mono text-[10px]" style={{ borderColor: 'rgba(239,68,68,.4)', background: 'rgba(239,68,68,.08)' }}>
                      <span style={{ color: 'var(--muted)' }}>TOTAL API CALLS: </span>
                      <strong style={{ color: 'var(--error)' }}>{totalJobs}</strong>
                      <span style={{ color: 'var(--dim)' }}> disqualification{totalJobs !== 1 ? 's' : ''} will be applied</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 border-t px-4 py-3" style={{ borderColor: 'rgba(239,68,68,.3)' }}>
                <button onClick={() => setShowBulkModal(false)} className="border px-4 py-2 font-mono text-[10px] transition" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>
                  CANCEL
                </button>
                <button
                  id="bulk-disqualify-confirm"
                  onClick={bulkDisqualifyAll}
                  disabled={preview.length === 0}
                  className="inline-flex items-center gap-2 border px-4 py-2 font-mono text-[10px] font-bold transition disabled:opacity-40"
                  style={{ borderColor: 'rgba(239,68,68,.7)', background: 'rgba(239,68,68,.15)', color: 'var(--error)' }}
                >
                  <AlertTriangle size={12} />
                  YES, DISQUALIFY {totalJobs} ENTRIES
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
