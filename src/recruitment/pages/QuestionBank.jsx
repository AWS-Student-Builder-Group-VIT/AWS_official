import { useEffect, useMemo, useState } from 'react';
import { Check, FileQuestion, Plus, Save, Trash2, X } from 'lucide-react';
import { createClient } from '../lib/supabase.js';
import { formatDateTime } from '../lib/utils.js';

const initialOptions = [{ id: 'A', text: '' }, { id: 'B', text: '' }, { id: 'C', text: '' }, { id: 'D', text: '' }];
const roundTabs = [
  { round: 1, title: 'Round 1', subtitle: 'Questions and assessment' },
  { round: 2, title: 'Round 2', subtitle: 'Project guidelines' },
  { round: 3, title: 'Round 3', subtitle: 'Interview guidelines' },
];

export default function QuestionBank({ domains, onClose }) {
  const [supabase] = useState(createClient);
  const [activeRound, setActiveRound] = useState(1);
  const [questionMode, setQuestionMode] = useState('scored');
  const [domainId, setDomainId] = useState('');
  const [subdomainId, setSubdomainId] = useState('');
  const [questionType, setQuestionType] = useState('mcq');
  const [questionText, setQuestionText] = useState('');
  const [options, setOptions] = useState(initialOptions);
  const [correctAnswers, setCorrectAnswers] = useState([]);
  const [shortAnswers, setShortAnswers] = useState('');
  const [marks, setMarks] = useState(1);
  const [difficulty, setDifficulty] = useState('medium');
  const [questions, setQuestions] = useState([]);
  const [writtenQuestions, setWrittenQuestions] = useState([]);
  const [guidelines, setGuidelines] = useState({ 2: null, 3: null });
  const [guidelineDraft, setGuidelineDraft] = useState('');
  const [projects, setProjects] = useState([]);
  const [projectTitle, setProjectTitle] = useState('');
  const [projectDetails, setProjectDetails] = useState('');
  const [projectDocumentUrl, setProjectDocumentUrl] = useState('');
  const [savingProject, setSavingProject] = useState(false);
  const [loadingContent, setLoadingContent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const activeDomain = domains.find((d) => d.id === domainId);
  const activeSubdomain = activeDomain?.subdomains?.find((s) => s.id === subdomainId);
  const validOptions = useMemo(() => options.filter((o) => o.text.trim()), [options]);

  async function authHeaders() {
    try { const { data: { session } } = await supabase.auth.getSession(); if (session?.access_token) return { Authorization: `Bearer ${session.access_token}` }; } catch {}
    return null;
  }

  async function loadContent() {
    if (activeRound === 1 && questionMode === 'scored' && !subdomainId) { setQuestions([]); return; }
    if (activeRound > 1 && !subdomainId) { setGuidelineDraft(''); setProjects([]); return; }
    setLoadingContent(true); setError('');
    const headers = await authHeaders();
    if (!headers) { setError('Administrator session expired.'); setLoadingContent(false); return; }
    if (activeRound === 1) {
      const endpoint = questionMode === 'scored' ? `/api/recruitment/admin/questions?subdomain_id=${encodeURIComponent(subdomainId)}` : `/api/recruitment/admin/questions?mode=written${domainId ? `&domain_id=${encodeURIComponent(domainId)}` : ''}`;
      const res = await fetch(endpoint, { headers, cache: 'no-store' });
      const result = await res.json();
      if (!res.ok) setError(result.error ?? 'Unable to load content.');
      else if (questionMode === 'scored') setQuestions(result.questions ?? []);
      else setWrittenQuestions(result.questions ?? []);
    } else {
      const gRes = await fetch(`/api/recruitment/admin/round-guidelines?subdomain_id=${encodeURIComponent(subdomainId)}`, { headers, cache: 'no-store' });
      const gResult = await gRes.json();
      if (gRes.ok) {
        const rows = gResult.guidelines ?? [];
        const next = { 2: rows.find((r) => r.round_number === 2) ?? null, 3: rows.find((r) => r.round_number === 3) ?? null };
        setGuidelines(next); setGuidelineDraft(next[activeRound]?.guidelines ?? '');
      }
      if (activeRound === 2) {
        const pRes = await fetch(`/api/recruitment/admin/projects?subdomain_id=${encodeURIComponent(subdomainId)}`, { headers, cache: 'no-store' });
        const pResult = await pRes.json();
        if (pRes.ok) setProjects(pResult.projects ?? []);
      }
    }
    setLoadingContent(false);
  }

  useEffect(() => { loadContent(); }, [subdomainId, domainId, activeRound, questionMode]);
  useEffect(() => {
    const close = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [onClose]);

  function selectRound(round) { setActiveRound(round); setError(''); setMessage(''); if (round === 2 || round === 3) setGuidelineDraft(guidelines[round]?.guidelines ?? ''); }
  function resetScoredEditor() { setQuestionText(''); setOptions(initialOptions); setCorrectAnswers([]); setShortAnswers(''); setMarks(1); setDifficulty('medium'); }
  function toggleCorrect(id) { setCorrectAnswers((curr) => questionType === 'mcq' ? [id] : curr.includes(id) ? curr.filter((a) => a !== id) : [...curr, id]); }
  function addOption() { const used = new Set(options.map((o) => o.id)); const id = 'ABCDEFGHIJ'.split('').find((l) => !used.has(l)); if (id) setOptions((curr) => [...curr, { id, text: '' }]); }
  function removeOption(id) { if (options.length <= 2) { setError('Need at least two options.'); return; } setOptions((curr) => curr.filter((o) => o.id !== id)); setCorrectAnswers((curr) => curr.filter((a) => a !== id)); }

  async function saveScoredQuestion() {
    setError(''); setMessage('');
    if (!subdomainId) { setError('Select a Technical subdomain.'); return; }
    if (questionText.trim().length < 10) { setError('Question text needs at least 10 characters.'); return; }
    const answers = questionType === 'short_answer' ? shortAnswers.split(',').map((a) => a.trim()).filter(Boolean) : correctAnswers;
    if (questionType !== 'short_answer' && validOptions.length < 2) { setError('Add at least two non-empty options.'); return; }
    if (!answers.length) { setError('Add at least one correct answer or keyword.'); return; }
    setSaving(true);
    const headers = await authHeaders();
    if (!headers) { setError('Administrator session expired.'); setSaving(false); return; }
    const res = await fetch('/api/recruitment/admin/questions', { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'scored', subdomain_id: subdomainId, question_text: questionText, question_type: questionType, options: questionType === 'short_answer' ? null : validOptions, correct_answers: answers, marks, difficulty }) });
    const result = await res.json();
    if (!res.ok) setError(result.error ?? 'Unable to save question.');
    else { setQuestions((curr) => [result.question, ...curr]); setMessage(`Technical question saved to ${activeSubdomain?.name}.`); resetScoredEditor(); }
    setSaving(false);
  }

  async function saveWrittenQuestion() {
    setError(''); setMessage('');
    if (questionText.trim().length < 10) { setError('Question text needs at least 10 characters.'); return; }
    setSaving(true);
    const headers = await authHeaders();
    if (!headers) { setError('Administrator session expired.'); setSaving(false); return; }
    const res = await fetch('/api/recruitment/admin/questions', { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'written', domain_id: domainId || null, prompt: questionText }) });
    const result = await res.json();
    if (!res.ok) setError(result.error ?? 'Unable to save written question.');
    else { setWrittenQuestions((curr) => [...curr, result.question]); setMessage(domainId ? `Question added for ${activeDomain?.name}.` : 'Question added for every non-Technical domain.'); setQuestionText(''); }
    setSaving(false);
  }

  async function deleteQuestion(id, mode) {
    if (!confirm('Delete this question?')) return;
    setError(''); setMessage('');
    const headers = await authHeaders();
    if (!headers) { setError('Session expired.'); return; }
    const res = await fetch(`/api/recruitment/admin/questions?id=${encodeURIComponent(id)}&mode=${mode}`, { method: 'DELETE', headers });
    const result = await res.json();
    if (!res.ok) setError(result.error ?? 'Failed to delete.');
    else { if (mode === 'scored') setQuestions((curr) => curr.filter((q) => q.id !== id)); else setWrittenQuestions((curr) => curr.filter((q) => q.id !== id)); setMessage('Question deleted.'); }
  }

  async function saveGuidelines() {
    setError(''); setMessage('');
    if (!subdomainId || activeRound === 1) { setError('Select a subdomain and guideline round.'); return; }
    if (guidelineDraft.trim().length < 5) { setError('Guidelines need at least 5 characters.'); return; }
    setSaving(true);
    const headers = await authHeaders();
    if (!headers) { setError('Session expired.'); setSaving(false); return; }
    const res = await fetch('/api/recruitment/admin/round-guidelines', { method: 'PUT', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ subdomain_id: subdomainId, round_number: activeRound, guidelines: guidelineDraft }) });
    const result = await res.json();
    if (!res.ok) setError(result.error ?? 'Unable to save guidelines.');
    else { setGuidelines((curr) => ({ ...curr, [activeRound]: result.guideline })); setMessage(`Round ${activeRound} guidelines saved.`); }
    setSaving(false);
  }

  async function saveProjectStatement() {
    setError(''); setMessage('');
    if (!subdomainId) { setError('Select a subdomain.'); return; }
    if (projectTitle.trim().length < 3 || projectDetails.trim().length < 10) { setError('Title needs 3+ chars, details 10+ chars.'); return; }
    setSavingProject(true);
    const headers = await authHeaders();
    if (!headers) { setError('Session expired.'); setSavingProject(false); return; }
    const res = await fetch('/api/recruitment/admin/projects', { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ subdomain_id: subdomainId, title: projectTitle, details: projectDetails, task_document_url: projectDocumentUrl }) });
    const result = await res.json();
    if (!res.ok) setError(result.error ?? 'Unable to save problem statement.');
    else { setProjects((curr) => [result.project, ...curr]); setMessage(`Problem statement added to ${activeSubdomain?.name}.`); setProjectTitle(''); setProjectDetails(''); setProjectDocumentUrl(''); }
    setSavingProject(false);
  }

  const technicalDomains = domains.filter((d) => d.slug === 'technical');
  const selectableDomains = activeRound === 1 ? (questionMode === 'scored' ? technicalDomains : domains.filter((d) => d.slug !== 'technical')) : domains;

  const fieldStyle = { borderColor: 'var(--border)', background: 'var(--bg)', color: 'var(--text)' };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto backdrop-blur-sm" style={{ background: 'rgba(8,10,13,.95)' }} role="dialog" aria-modal="true" aria-labelledby="qb-title">
      <div className="mx-auto min-h-screen max-w-7xl border-x" style={{ borderColor: 'var(--border)', background: '#080a0d' }}>
        <header className="sticky top-0 z-20 border-b" style={{ borderColor: 'var(--border)', background: '#060709' }}>
          <div className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-3"><FileQuestion style={{ color: 'var(--accent)' }} size={20} /><div><h2 id="qb-title" className="font-mono text-sm font-bold tracking-wider">RECRUITMENT ROUND CONTENT</h2><p className="mt-1 font-mono text-[9px]" style={{ color: 'var(--dim)' }}>QUESTIONS, PROJECT GUIDELINES &amp; INTERVIEW GUIDELINES</p></div></div>
            <button onClick={onClose} className="grid h-9 w-9 place-items-center border transition" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }} aria-label="Close"><X size={17} /></button>
          </div>
          <nav className="grid grid-cols-3" aria-label="Recruitment rounds">
            {roundTabs.map((tab) => (
              <button key={tab.round} onClick={() => selectRound(tab.round)} className="border-t border-r border-border px-3 py-3 text-left transition last:border-r-0"
                style={{ borderColor: 'var(--border)', background: activeRound === tab.round ? 'var(--accent)' : 'var(--surface)', color: activeRound === tab.round ? 'var(--bg)' : 'var(--muted)' }}>
                <span className="block font-mono text-xs font-bold">{tab.title}</span>
                <span className="mt-1 hidden text-[10px] sm:block">{tab.subtitle}</span>
              </button>
            ))}
          </nav>
        </header>

        {activeRound === 1 && (
          <div className="grid grid-cols-2 border-b p-3" style={{ borderColor: 'var(--border)' }}>
            {['scored','written'].map((mode) => (
              <button key={mode} onClick={() => { setQuestionMode(mode); setDomainId(''); setSubdomainId(''); }} className="px-4 py-3 font-mono text-xs" style={{ background: questionMode === mode ? 'var(--accent)' : 'var(--surface)', color: questionMode === mode ? 'var(--bg)' : 'var(--muted)' }}>
                {mode === 'scored' ? 'TECHNICAL · SCORED' : 'NON-TECHNICAL · WRITTEN'}
              </button>
            ))}
          </div>
        )}

        <div className="border-b p-5 sm:p-7" style={{ borderColor: 'var(--border)' }}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="label">Domain group</label><select value={domainId} onChange={(e) => { setDomainId(e.target.value); setSubdomainId(''); }} className="field" style={fieldStyle}><option value="">Select domain</option>{selectableDomains.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
            {!(activeRound === 1 && questionMode === 'written') && (
              <div><label className="label">Subdomain specialization</label><select value={subdomainId} disabled={!domainId} onChange={(e) => setSubdomainId(e.target.value)} className="field disabled:opacity-50" style={fieldStyle}><option value="">Select subdomain</option>{activeDomain?.subdomains?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
            )}
          </div>
        </div>

        {activeRound === 1 ? (questionMode === 'scored' ? (
          <div className="grid lg:grid-cols-[minmax(0,1fr)_420px]">
            <main className="border-r p-5 sm:p-7" style={{ borderColor: 'var(--border)' }}>
              <section className="border p-5" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                <div className="grid gap-4 sm:grid-cols-[1fr_11rem_7rem]">
                  <div><label className="label">Question type</label><select value={questionType} onChange={(e) => { setQuestionType(e.target.value); setCorrectAnswers([]); }} className="field" style={fieldStyle}><option value="mcq">Single choice</option><option value="multiple_select">Multiple select</option><option value="short_answer">Short answer</option></select></div>
                  <div><label className="label">Difficulty</label><select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="field" style={fieldStyle}><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select></div>
                  <div><label className="label">Marks</label><input type="number" min="1" max="20" value={marks} onChange={(e) => setMarks(Number(e.target.value))} className="field" style={fieldStyle} /></div>
                </div>
                <div className="mt-4"><label className="label">Question</label><textarea rows={4} value={questionText} onChange={(e) => setQuestionText(e.target.value)} className="field resize-y" placeholder="Enter the complete question…" style={fieldStyle} /></div>
                {questionType === 'short_answer' ? (
                  <div className="mt-4"><label className="label">Accepted answers / keywords</label><input value={shortAnswers} onChange={(e) => setShortAnswers(e.target.value)} className="field" style={fieldStyle} /></div>
                ) : (
                  <div className="mt-4">
                    <div className="mb-2 flex items-center justify-between"><span className="label !mb-0">Answer options</span><button type="button" onClick={addOption} disabled={options.length >= 10} className="inline-flex items-center gap-1 font-mono text-[10px]" style={{ color: 'var(--accent)' }}><Plus size={13} />ADD</button></div>
                    <div className="space-y-2">{options.map((option) => { const checked = correctAnswers.includes(option.id); return <div key={option.id} className="grid grid-cols-[2.5rem_1fr_2.5rem] items-center border" style={{ borderColor: 'var(--border)' }}><button type="button" onClick={() => toggleCorrect(option.id)} className="grid h-full min-h-12 place-items-center border-r" style={{ borderColor: 'var(--border)', background: checked ? 'var(--success)' : 'transparent', color: checked ? 'var(--bg)' : 'var(--muted)' }}>{checked ? <Check size={15} /> : option.id}</button><input value={option.text} onChange={(e) => setOptions((curr) => curr.map((o) => o.id === option.id ? { ...o, text: e.target.value } : o))} className="min-w-0 px-3 py-3 text-sm outline-none" style={{ background: 'transparent', color: 'var(--text)' }} /><button type="button" onClick={() => removeOption(option.id)} className="grid h-full place-items-center border-l" style={{ borderColor: 'var(--border)', color: 'var(--dim)' }}><Trash2 size={14} /></button></div>; })}</div>
                  </div>
                )}
                {error && <p className="mt-4 text-sm" style={{ color: 'var(--error)' }}>{error}</p>}
                {message && <p className="mt-4 text-sm" style={{ color: 'var(--success)' }}>{message}</p>}
                <button onClick={saveScoredQuestion} disabled={saving || !subdomainId} className="action mt-5 inline-flex items-center gap-2"><Save size={15} />Save Technical question</button>
              </section>
            </main>
            <aside className="flex flex-col border-l p-5" style={{ borderColor: 'var(--border)', background: '#060709' }}>
              <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border)' }}>
                <div><p className="font-mono text-[10px] font-bold" style={{ color: 'var(--accent)' }}>TECHNICAL QUESTION BANK</p><p className="font-mono text-[10px]" style={{ color: 'var(--muted)' }}>{questions.length} QUESTION{questions.length === 1 ? '' : 'S'}</p></div>
              </div>
              {loadingContent ? <p className="py-8 font-mono text-xs" style={{ color: 'var(--muted)' }}>Loading…</p>
                : !subdomainId ? <p className="py-8 font-mono text-xs" style={{ color: 'var(--dim)' }}>Select a domain &amp; subdomain.</p>
                : questions.length === 0 ? <p className="py-8 font-mono text-xs" style={{ color: 'var(--muted)' }}>No questions found.</p>
                : <div className="mt-3 max-h-[calc(100vh-280px)] space-y-2 overflow-y-auto pr-1">
                    {questions.map((q, idx) => <article key={q.id} className="border p-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                      <div className="flex items-start justify-between gap-2"><p className="font-mono text-[9px] font-bold" style={{ color: 'var(--accent)' }}>#{idx + 1} · {q.difficulty.toUpperCase()} · {q.marks} MARKS</p><button type="button" onClick={() => deleteQuestion(q.id, 'scored')} className="p-1 transition" style={{ color: 'var(--dim)' }}><Trash2 size={13} /></button></div>
                      <p className="mt-1.5 text-xs leading-5" style={{ color: 'var(--text)' }}>{q.question_text}</p>
                    </article>)}
                  </div>}
            </aside>
          </div>
        ) : (
          <div className="grid lg:grid-cols-[minmax(0,1fr)_420px]">
            <main className="border-r p-5 sm:p-7" style={{ borderColor: 'var(--border)' }}>
              <section className="border p-5" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                <div><label className="label">Question</label><textarea rows={4} value={questionText} onChange={(e) => setQuestionText(e.target.value)} className="field resize-y" placeholder="Type the question candidates will answer…" style={fieldStyle} /></div>
                <p className="mt-2 text-xs" style={{ color: 'var(--dim)' }}>{domainId ? `Asked only of ${activeDomain?.name} applicants.` : 'Asked of every non-Technical applicant. Choose a domain above to target one domain.'}</p>
                {error && <p className="mt-4 text-sm" style={{ color: 'var(--error)' }}>{error}</p>}
                {message && <p className="mt-4 text-sm" style={{ color: 'var(--success)' }}>{message}</p>}
                <button onClick={saveWrittenQuestion} disabled={saving} className="action mt-5 inline-flex items-center gap-2"><Save size={15} />Add question</button>
              </section>
            </main>
            <aside className="flex flex-col border-l p-5" style={{ borderColor: 'var(--border)', background: '#060709' }}>
              {loadingContent ? <p className="py-8 font-mono text-xs" style={{ color: 'var(--muted)' }}>Loading…</p>
                : writtenQuestions.length === 0 ? <p className="py-8 font-mono text-xs" style={{ color: 'var(--muted)' }}>No written questions.</p>
                : <div className="space-y-2 overflow-y-auto">{writtenQuestions.map((q) => <article key={q.id} className="border p-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}><div className="flex justify-between gap-2"><p className="font-mono text-[9px]" style={{ color: 'var(--accent)' }}>{q.scope} · {q.question_group}</p><button onClick={() => deleteQuestion(q.id, 'written')} className="p-1" style={{ color: 'var(--dim)' }}><Trash2 size={13} /></button></div><p className="mt-1 text-xs" style={{ color: 'var(--text)' }}>{q.prompt}</p></article>)}</div>}
            </aside>
          </div>
        )) : (
          <div className="p-5 sm:p-7">
            <div><label className="label">Round {activeRound} guidelines</label><textarea rows={12} value={guidelineDraft} onChange={(e) => setGuidelineDraft(e.target.value)} disabled={!subdomainId || saving} placeholder="Enter guidelines…" className="field resize-y disabled:opacity-50" style={fieldStyle} /></div>
            {error && <p className="mt-4 text-sm" style={{ color: 'var(--error)' }}>{error}</p>}
            {message && <p className="mt-4 text-sm" style={{ color: 'var(--success)' }}>{message}</p>}
            <button onClick={saveGuidelines} disabled={saving || !subdomainId} className="action mt-5 inline-flex items-center gap-2"><Save size={15} />Save guidelines</button>
            {activeRound === 2 && (
              <div className="mt-8">
                <h3 className="eyebrow mb-4">PROBLEM STATEMENTS</h3>
                <div className="space-y-3">{((() => { const stateMap = { projectTitle, projectDetails, projectDocumentUrl }; return [['Title','projectTitle',setProjectTitle],['Details (problem description)','projectDetails',setProjectDetails],['Task document URL','projectDocumentUrl',setProjectDocumentUrl]].map(([label, key, setter]) => <div key={key}><label className="label">{label}</label><input value={stateMap[key]} onChange={(e) => setter(e.target.value)} className="field" style={fieldStyle} /></div>); })())}</div>
                <button onClick={saveProjectStatement} disabled={savingProject || !subdomainId} className="action mt-4 inline-flex items-center gap-2"><Plus size={15} />Add Problem Statement</button>
                <div className="mt-5 space-y-2">{projects.map((p) => <div key={p.id} className="border p-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}><p className="font-mono text-[10px] font-bold" style={{ color: 'var(--accent)' }}>{p.title}</p><p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>{p.problem_statement}</p></div>)}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
