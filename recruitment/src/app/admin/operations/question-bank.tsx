'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, ClipboardList, FileQuestion, MessagesSquare, Plus, Save, Trash2, X } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { formatDateTime } from '@/lib/utils';
import type { AssessmentQuestion, Domain, QuestionOption, QuestionType, SubdomainRoundGuideline } from '@/types';

type EditorQuestionType = Extract<QuestionType, 'mcq' | 'multiple_select' | 'short_answer'>;
type StoredQuestion = AssessmentQuestion & { is_active: boolean; created_at: string };
type StoredWrittenQuestion = {
  id: string;
  scope: 'common_non_technical' | 'domain';
  domain_id: string | null;
  question_group: string;
  prompt: string;
  instructions: string;
  response_type: 'long_text' | 'long_text_with_links';
  required: boolean;
  sort_order: number;
  is_active: boolean;
};
type AuthoringRound = 1 | 2 | 3;
type QuestionMode = 'scored' | 'written';

const initialOptions: QuestionOption[] = [
  { id: 'A', text: '' }, { id: 'B', text: '' }, { id: 'C', text: '' }, { id: 'D', text: '' },
];
const roundTabs: { round: AuthoringRound; title: string; subtitle: string }[] = [
  { round: 1, title: 'Round 1', subtitle: 'Questions and assessment' },
  { round: 2, title: 'Round 2', subtitle: 'Project guidelines' },
  { round: 3, title: 'Round 3', subtitle: 'Interview guidelines' },
];
type StoredProject = {
  id: string;
  subdomain_id: string;
  title: string;
  details: string;
  aws_services?: string[];
  created_at: string;
};

export default function QuestionBank({ domains, onClose }: { domains: Domain[]; onClose: () => void }) {
  const [supabase] = useState(createClient);
  const [activeRound, setActiveRound] = useState<AuthoringRound>(1);
  const [questionMode, setQuestionMode] = useState<QuestionMode>('scored');
  const [domainId, setDomainId] = useState('');
  const [subdomainId, setSubdomainId] = useState('');
  const [questionType, setQuestionType] = useState<EditorQuestionType>('mcq');
  const [questionText, setQuestionText] = useState('');
  const [options, setOptions] = useState<QuestionOption[]>(initialOptions);
  const [correctAnswers, setCorrectAnswers] = useState<string[]>([]);
  const [shortAnswers, setShortAnswers] = useState('');
  const [marks, setMarks] = useState(1);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [questions, setQuestions] = useState<StoredQuestion[]>([]);
  const [writtenQuestions, setWrittenQuestions] = useState<StoredWrittenQuestion[]>([]);
  const [writtenScope, setWrittenScope] = useState<'common_non_technical' | 'domain'>('domain');
  const [writtenGroup, setWrittenGroup] = useState('domain_specific');
  const [writtenInstructions, setWrittenInstructions] = useState('');
  const [writtenResponseType, setWrittenResponseType] = useState<'long_text' | 'long_text_with_links'>('long_text');
  const [writtenRequired, setWrittenRequired] = useState(true);
  const [writtenSortOrder, setWrittenSortOrder] = useState(100);
  const [minimumAnswers, setMinimumAnswers] = useState<number | ''>('');
  const [guidelines, setGuidelines] = useState<Record<2 | 3, SubdomainRoundGuideline | null>>({ 2: null, 3: null });
  const [guidelineDraft, setGuidelineDraft] = useState('');
  const [projects, setProjects] = useState<StoredProject[]>([]);
  const [projectTitle, setProjectTitle] = useState('');
  const [projectDetails, setProjectDetails] = useState('');
  const [savingProject, setSavingProject] = useState(false);
  const [loadingContent, setLoadingContent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const activeDomain = domains.find((domain) => domain.id === domainId);
  const activeSubdomain = activeDomain?.subdomains?.find((subdomain) => subdomain.id === subdomainId);
  const validOptions = useMemo(() => options.filter((option) => option.text.trim()), [options]);

  async function authHeaders() {
    let token = '';
    try {
      const { data: { session } } = await supabase.auth.getSession();
      token = session?.access_token || '';
    } catch {}
    if (!token && typeof window !== 'undefined') {
      token = sessionStorage.getItem('aws_admin_token') || localStorage.getItem('aws_admin_token') || '';
    }
    return token ? { Authorization: `Bearer ${token}` } : null;
  }

  async function loadContent() {
    if (activeRound === 1 && questionMode === 'scored' && !subdomainId) { setQuestions([]); return; }
    if (activeRound === 1 && questionMode === 'written' && !domainId) { setWrittenQuestions([]); return; }
    if (activeRound > 1 && !subdomainId) { setGuidelineDraft(''); setProjects([]); return; }
    setLoadingContent(true);
    setError('');
    const headers = await authHeaders();
    if (!headers) { setError('Administrator session expired.'); setLoadingContent(false); return; }
    
    if (activeRound === 1) {
      const endpoint = questionMode === 'scored'
        ? `/api/admin/questions?subdomain_id=${encodeURIComponent(subdomainId)}`
        : `/api/admin/questions?mode=written&domain_id=${encodeURIComponent(domainId)}`;
      const response = await fetch(endpoint, { headers, cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) setError(result.error ?? 'Unable to load round content.');
      else if (questionMode === 'scored') setQuestions(result.questions ?? []);
      else setWrittenQuestions(result.questions ?? []);
    } else {
      const gResponse = await fetch(`/api/admin/round-guidelines?subdomain_id=${encodeURIComponent(subdomainId)}`, { headers, cache: 'no-store' });
      const gResult = await gResponse.json();
      if (gResponse.ok) {
        const rows = (gResult.guidelines ?? []) as SubdomainRoundGuideline[];
        const next = {
          2: rows.find((item) => item.round_number === 2) ?? null,
          3: rows.find((item) => item.round_number === 3) ?? null,
        };
        setGuidelines(next);
        setGuidelineDraft(next[activeRound]?.guidelines ?? '');
      }

      if (activeRound === 2) {
        const pResponse = await fetch(`/api/admin/projects?subdomain_id=${encodeURIComponent(subdomainId)}`, { headers, cache: 'no-store' });
        const pResult = await pResponse.json();
        if (pResponse.ok) {
          setProjects(pResult.projects ?? []);
        }
      }
    }
    setLoadingContent(false);
  }

  useEffect(() => { loadContent(); }, [subdomainId, domainId, activeRound, questionMode]);
  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [onClose]);

  function selectRound(round: AuthoringRound) {
    setActiveRound(round);
    setError('');
    setMessage('');
    if (round === 2 || round === 3) setGuidelineDraft(guidelines[round]?.guidelines ?? '');
  }

  function resetScoredEditor() {
    setQuestionText(''); setOptions(initialOptions); setCorrectAnswers([]); setShortAnswers(''); setMarks(1); setDifficulty('medium');
  }
  function toggleCorrect(id: string) {
    setCorrectAnswers((current) => questionType === 'mcq' ? [id] : current.includes(id) ? current.filter((answer) => answer !== id) : [...current, id]);
  }
  function addOption() {
    const used = new Set(options.map((option) => option.id));
    const id = 'ABCDEFGHIJ'.split('').find((letter) => !used.has(letter));
    if (id) setOptions((current) => [...current, { id, text: '' }]);
  }
  function removeOption(id: string) {
    if (options.length <= 2) { setError('A choice question needs at least two options.'); return; }
    setOptions((current) => current.filter((option) => option.id !== id));
    setCorrectAnswers((current) => current.filter((answer) => answer !== id));
  }

  async function saveScoredQuestion() {
    setError(''); setMessage('');
    if (!subdomainId) { setError('Select a Technical subdomain.'); return; }
    if (questionText.trim().length < 10) { setError('Question text must contain at least 10 characters.'); return; }
    const answers = questionType === 'short_answer' ? shortAnswers.split(',').map((answer) => answer.trim()).filter(Boolean) : correctAnswers;
    if (questionType !== 'short_answer' && validOptions.length < 2) { setError('Add at least two non-empty options.'); return; }
    if (!answers.length) { setError('Add at least one correct answer or keyword.'); return; }
    setSaving(true);
    const headers = await authHeaders();
    if (!headers) { setError('Administrator session expired.'); setSaving(false); return; }
    const response = await fetch('/api/admin/questions', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'scored', subdomain_id: subdomainId, question_text: questionText, question_type: questionType, options: questionType === 'short_answer' ? null : validOptions, correct_answers: answers, marks, difficulty }),
    });
    const result = await response.json();
    if (!response.ok) setError(result.error ?? 'Unable to save question.');
    else { setQuestions((current) => [result.question, ...current]); setMessage(`Technical question saved to ${activeSubdomain?.name}.`); resetScoredEditor(); }
    setSaving(false);
  }

  async function saveWrittenQuestion() {
    setError(''); setMessage('');
    if (writtenScope === 'domain' && !domainId) { setError('Select a target domain.'); return; }
    if (questionText.trim().length < 10) { setError('Question text must contain at least 10 characters.'); return; }
    setSaving(true);
    const headers = await authHeaders();
    if (!headers) { setError('Administrator session expired.'); setSaving(false); return; }
    const response = await fetch('/api/admin/questions', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'written', scope: writtenScope, domain_id: writtenScope === 'domain' ? domainId : null,
        question_group: writtenGroup, prompt: questionText, instructions: writtenInstructions,
        response_type: writtenResponseType, required: writtenRequired, sort_order: writtenSortOrder,
        is_active: true, minimum_answers: minimumAnswers === '' ? null : minimumAnswers,
      }),
    });
    const result = await response.json();
    if (!response.ok) setError(result.error ?? 'Unable to save written question.');
    else { setWrittenQuestions((current) => [...current, result.question]); setMessage('Written Round 1 question saved.'); setQuestionText(''); setWrittenInstructions(''); }
    setSaving(false);
  }

  async function deleteScoredQuestion(id: string) {
    if (!confirm('Are you sure you want to delete this technical question?')) return;
    setError('');
    setMessage('');
    const headers = await authHeaders();
    if (!headers) { setError('Administrator session expired.'); return; }
    try {
      const response = await fetch(`/api/admin/questions?id=${encodeURIComponent(id)}&mode=scored`, {
        method: 'DELETE',
        headers,
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error ?? 'Failed to delete question.');
      } else {
        setQuestions((current) => current.filter((q) => q.id !== id));
        setMessage('Question deleted successfully.');
      }
    } catch (err: any) {
      setError(err.message || 'Error deleting question.');
    }
  }

  async function deleteAllScoredQuestions() {
    if (!subdomainId) return;
    if (!confirm(`Are you sure you want to delete ALL questions for ${activeSubdomain?.name || 'this subdomain'}? This cannot be undone.`)) return;
    setError('');
    setMessage('');
    const headers = await authHeaders();
    if (!headers) { setError('Administrator session expired.'); return; }
    try {
      const response = await fetch(`/api/admin/questions?all=true&subdomain_id=${encodeURIComponent(subdomainId)}&mode=scored`, {
        method: 'DELETE',
        headers,
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error ?? 'Failed to clear questions.');
      } else {
        setQuestions([]);
        setMessage(`All questions cleared for ${activeSubdomain?.name || 'subdomain'}.`);
      }
    } catch (err: any) {
      setError(err.message || 'Error clearing questions.');
    }
  }

  async function deleteWrittenQuestion(id: string) {
    if (!confirm('Are you sure you want to delete this written question?')) return;
    setError('');
    setMessage('');
    const headers = await authHeaders();
    if (!headers) { setError('Administrator session expired.'); return; }
    try {
      const response = await fetch(`/api/admin/questions?id=${encodeURIComponent(id)}&mode=written`, {
        method: 'DELETE',
        headers,
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error ?? 'Failed to delete question.');
      } else {
        setWrittenQuestions((current) => current.filter((q) => q.id !== id));
        setMessage('Written question deleted.');
      }
    } catch (err: any) {
      setError(err.message || 'Error deleting question.');
    }
  }

  async function deleteAllWrittenQuestions() {
    if (!domainId) return;
    if (!confirm(`Are you sure you want to delete ALL written questions for ${activeDomain?.name || 'this domain'}? This cannot be undone.`)) return;
    setError('');
    setMessage('');
    const headers = await authHeaders();
    if (!headers) { setError('Administrator session expired.'); return; }
    try {
      const response = await fetch(`/api/admin/questions?all=true&domain_id=${encodeURIComponent(domainId)}&mode=written`, {
        method: 'DELETE',
        headers,
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error ?? 'Failed to clear written questions.');
      } else {
        setWrittenQuestions([]);
        setMessage(`All written questions cleared for ${activeDomain?.name || 'domain'}.`);
      }
    } catch (err: any) {
      setError(err.message || 'Error clearing written questions.');
    }
  }

  async function saveGuidelines() {
    setError(''); setMessage('');
    if (!subdomainId || activeRound === 1) { setError('Select a domain, subdomain, and guideline round.'); return; }
    if (guidelineDraft.trim().length < 5) { setError('Guidelines must contain at least 5 characters.'); return; }
    setSaving(true);
    const headers = await authHeaders();
    if (!headers) { setError('Administrator session expired.'); setSaving(false); return; }
    const response = await fetch('/api/admin/round-guidelines', { method: 'PUT', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ subdomain_id: subdomainId, round_number: activeRound, guidelines: guidelineDraft }) });
    const result = await response.json();
    if (!response.ok) setError(result.error ?? 'Unable to save guidelines.');
    else { setGuidelines((current) => ({ ...current, [activeRound]: result.guideline })); setMessage(`Round ${activeRound} guidelines saved successfully.`); }
    setSaving(false);
  }

  async function saveProjectStatement() {
    setError(''); setMessage('');
    if (!subdomainId) { setError('Select a domain and subdomain.'); return; }
    if (projectTitle.trim().length < 3) { setError('Problem Statement title must have at least 3 characters.'); return; }
    if (projectDetails.trim().length < 10) { setError('Problem Statement details must have at least 10 characters.'); return; }
    setSavingProject(true);
    const headers = await authHeaders();
    if (!headers) { setError('Administrator session expired.'); setSavingProject(false); return; }
    try {
      const response = await fetch('/api/admin/projects', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ subdomain_id: subdomainId, title: projectTitle, details: projectDetails }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error ?? 'Unable to save problem statement.');
      } else {
        setProjects((curr) => [result.project, ...curr]);
        setMessage(`Problem Statement "${projectTitle}" added to ${activeSubdomain?.name}.`);
        setProjectTitle('');
        setProjectDetails('');
      }
    } catch (err: any) {
      setError(err.message || 'Error saving problem statement.');
    }
    setSavingProject(false);
  }

  async function deleteProjectStatement(id: string) {
    if (!confirm('Are you sure you want to delete this problem statement?')) return;
    setError(''); setMessage('');
    const headers = await authHeaders();
    if (!headers) { setError('Administrator session expired.'); return; }
    try {
      const response = await fetch(`/api/admin/projects?id=${encodeURIComponent(id)}`, { method: 'DELETE', headers });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error ?? 'Failed to delete problem statement.');
      } else {
        setProjects((curr) => curr.filter((p) => p.id !== id));
        setMessage('Problem statement deleted.');
      }
    } catch (err: any) {
      setError(err.message || 'Error deleting problem statement.');
    }
  }

  async function deleteAllProjectStatements() {
    if (!subdomainId) return;
    if (!confirm(`Are you sure you want to delete ALL problem statements for ${activeSubdomain?.name || 'this subdomain'}?`)) return;
    setError(''); setMessage('');
    const headers = await authHeaders();
    if (!headers) { setError('Administrator session expired.'); return; }
    try {
      const response = await fetch(`/api/admin/projects?all=true&subdomain_id=${encodeURIComponent(subdomainId)}`, { method: 'DELETE', headers });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error ?? 'Failed to clear problem statements.');
      } else {
        setProjects([]);
        setMessage(`All problem statements cleared for ${activeSubdomain?.name || 'subdomain'}.`);
      }
    } catch (err: any) {
      setError(err.message || 'Error clearing problem statements.');
    }
  }

  const technicalDomains = domains.filter((domain) => domain.slug === 'technical');
  const selectableDomains = activeRound === 1 && questionMode === 'scored' ? technicalDomains : domains.filter((domain) => domain.slug !== 'technical');

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#080a0d]/95 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="question-bank-title">
      <div className="mx-auto min-h-screen max-w-7xl border-x border-border bg-[#080a0d]">
        <header className="sticky top-0 z-20 border-b border-border bg-[#060709]">
          <div className="flex items-center justify-between px-5 py-4"><div className="flex items-center gap-3"><FileQuestion className="text-accent" size={20} /><div><h2 id="question-bank-title" className="font-mono text-sm font-bold tracking-wider">RECRUITMENT ROUND CONTENT</h2><p className="mt-1 font-mono text-[9px] text-dim">QUESTIONS, PROJECT GUIDELINES &amp; INTERVIEW GUIDELINES</p></div></div><button onClick={onClose} className="grid h-9 w-9 place-items-center border border-border text-muted hover:border-accent hover:text-accent" aria-label="Close round content"><X size={17} /></button></div>
          <nav className="grid grid-cols-3" aria-label="Recruitment rounds">{roundTabs.map((tab) => <button key={tab.round} onClick={() => selectRound(tab.round)} className={`border-t border-r border-border px-3 py-3 text-left transition last:border-r-0 ${activeRound === tab.round ? 'bg-accent text-bg' : 'bg-surface text-muted hover:text-text'}`}><span className="block font-mono text-xs font-bold">{tab.title}</span><span className="mt-1 hidden text-[10px] sm:block">{tab.subtitle}</span></button>)}</nav>
        </header>

        {activeRound === 1 && <div className="grid grid-cols-2 border-b border-border p-3"><button onClick={() => { setQuestionMode('scored'); setDomainId(''); setSubdomainId(''); }} className={`px-4 py-3 font-mono text-xs ${questionMode === 'scored' ? 'bg-accent text-bg' : 'bg-surface text-muted'}`}>TECHNICAL · SCORED</button><button onClick={() => { setQuestionMode('written'); setDomainId(''); setSubdomainId(''); }} className={`px-4 py-3 font-mono text-xs ${questionMode === 'written' ? 'bg-accent text-bg' : 'bg-surface text-muted'}`}>NON-TECHNICAL · WRITTEN</button></div>}

        <div className="border-b border-border p-5 sm:p-7"><div className="grid gap-4 sm:grid-cols-2"><Field label="Domain group"><select value={domainId} onChange={(event) => { setDomainId(event.target.value); setSubdomainId(''); }} className="field"><option value="">Select domain</option>{selectableDomains.map((domain) => <option key={domain.id} value={domain.id}>{domain.name}</option>)}</select></Field>{!(activeRound === 1 && questionMode === 'written') && <Field label="Subdomain specialization"><select value={subdomainId} disabled={!domainId} onChange={(event) => setSubdomainId(event.target.value)} className="field disabled:opacity-50"><option value="">Select subdomain</option>{activeDomain?.subdomains?.map((subdomain) => <option key={subdomain.id} value={subdomain.id}>{subdomain.name}</option>)}</select></Field>}</div></div>

        {activeRound === 1 ? questionMode === 'scored' ? (
          <div className="grid lg:grid-cols-[minmax(0,1fr)_420px]"><main className="border-r border-border p-5 sm:p-7"><section className="border border-border bg-surface p-5"><div className="grid gap-4 sm:grid-cols-[1fr_11rem_7rem]"><Field label="Question type"><select value={questionType} onChange={(event) => { setQuestionType(event.target.value as EditorQuestionType); setCorrectAnswers([]); }} className="field"><option value="mcq">Single choice</option><option value="multiple_select">Multiple select</option><option value="short_answer">Short answer</option></select></Field><Field label="Difficulty"><select value={difficulty} onChange={(event) => setDifficulty(event.target.value as typeof difficulty)} className="field"><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select></Field><Field label="Marks"><input type="number" min="1" max="20" value={marks} onChange={(event) => setMarks(Number(event.target.value))} className="field" /></Field></div><Field label="Question"><textarea rows={4} value={questionText} onChange={(event) => setQuestionText(event.target.value)} className="field resize-y" placeholder="Enter the complete question…" /></Field>{questionType === 'short_answer' ? <Field label="Accepted answers / keywords"><input value={shortAnswers} onChange={(event) => setShortAnswers(event.target.value)} className="field" /></Field> : <div><div className="mb-2 flex items-center justify-between"><span className="label !mb-0">Answer options</span><button type="button" onClick={addOption} disabled={options.length >= 10} className="inline-flex items-center gap-1 font-mono text-[10px] text-accent"><Plus size={13} />ADD OPTION</button></div><div className="space-y-2">{options.map((option) => { const checked = correctAnswers.includes(option.id); return <div key={option.id} className="grid grid-cols-[2.5rem_1fr_2.5rem] items-center border border-border"><button type="button" onClick={() => toggleCorrect(option.id)} className={`grid h-full min-h-12 place-items-center border-r border-border ${checked ? 'bg-success text-bg' : 'text-muted'}`}>{checked ? <Check size={15} /> : option.id}</button><input value={option.text} onChange={(event) => setOptions((current) => current.map((item) => item.id === option.id ? { ...item, text: event.target.value } : item))} className="min-w-0 bg-transparent px-3 py-3 text-sm outline-none" /><button type="button" onClick={() => removeOption(option.id)} className="grid h-full place-items-center border-l border-border text-dim hover:text-error"><Trash2 size={14} /></button></div>; })}</div></div>}<Feedback error={error} message={message} /><button onClick={saveScoredQuestion} disabled={saving || !subdomainId} className="action mt-5"><Save size={15} />Save Technical question</button></section></main><ScoredQuestionList questions={questions} loading={loadingContent} onDeleteQuestion={deleteScoredQuestion} onDeleteAll={deleteAllScoredQuestions} subdomainSelected={Boolean(subdomainId)} /></div>
        ) : (
          <div className="grid lg:grid-cols-[minmax(0,1fr)_420px]"><main className="border-r border-border p-5 sm:p-7"><section className="border border-border bg-surface p-5"><div className="grid gap-4 sm:grid-cols-2"><Field label="Scope"><select value={writtenScope} onChange={(event) => setWrittenScope(event.target.value as typeof writtenScope)} className="field"><option value="domain">Selected domain</option><option value="common_non_technical">All non-Technical domains</option></select></Field><Field label="Question group"><input value={writtenGroup} onChange={(event) => setWrittenGroup(event.target.value)} className="field" /></Field></div><Field label="Prompt"><textarea rows={3} value={questionText} onChange={(event) => setQuestionText(event.target.value)} className="field resize-y" /></Field><Field label="Instructions"><textarea rows={4} value={writtenInstructions} onChange={(event) => setWrittenInstructions(event.target.value)} className="field resize-y" /></Field><div className="grid gap-4 sm:grid-cols-3"><Field label="Response"><select value={writtenResponseType} onChange={(event) => setWrittenResponseType(event.target.value as typeof writtenResponseType)} className="field"><option value="long_text">Long text</option><option value="long_text_with_links">Text + links</option></select></Field><Field label="Sort order"><input type="number" min="0" value={writtenSortOrder} onChange={(event) => setWrittenSortOrder(Number(event.target.value))} className="field" /></Field><Field label="Minimum in group"><input type="number" min="1" value={minimumAnswers} onChange={(event) => setMinimumAnswers(event.target.value ? Number(event.target.value) : '')} className="field" placeholder="Optional" /></Field></div><label className="flex items-center gap-2 text-sm text-muted"><input type="checkbox" checked={writtenRequired} onChange={(event) => setWrittenRequired(event.target.checked)} className="accent-[#FF9900]" />Required individually</label><Feedback error={error} message={message} /><button onClick={saveWrittenQuestion} disabled={saving || (writtenScope === 'domain' && !domainId)} className="action mt-5"><Save size={15} />Save written question</button></section></main><WrittenQuestionList questions={writtenQuestions} loading={loadingContent} onDeleteQuestion={deleteWrittenQuestion} onDeleteAll={deleteAllWrittenQuestions} domainSelected={Boolean(domainId)} /></div>
        ) : (
          <GuidelineEditor
            round={activeRound}
            value={guidelineDraft}
            onChange={setGuidelineDraft}
            onSave={saveGuidelines}
            saving={saving}
            loading={loadingContent}
            disabled={!subdomainId}
            existing={guidelines[activeRound]}
            error={error}
            message={message}
            subdomainName={activeSubdomain?.name}
            projects={projects}
            projectTitle={projectTitle}
            projectDetails={projectDetails}
            onChangeProjectTitle={setProjectTitle}
            onChangeProjectDetails={setProjectDetails}
            onSaveProject={saveProjectStatement}
            onDeleteProject={deleteProjectStatement}
            onDeleteAllProjects={deleteAllProjectStatements}
            savingProject={savingProject}
          />
        )}
      </div>
    </div>
  );
}

function ScoredQuestionList({ questions, loading, onDeleteQuestion, onDeleteAll, subdomainSelected }: { questions: StoredQuestion[]; loading: boolean; onDeleteQuestion: (id: string) => void; onDeleteAll: () => void; subdomainSelected: boolean }) {
  return (
    <aside className="bg-[#060709] p-5 flex flex-col h-full border-l border-border">
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div>
          <p className="font-mono text-[10px] font-bold text-accent">TECHNICAL QUESTION BANK</p>
          <p className="font-mono text-[10px] text-muted">{questions.length} QUESTION{questions.length === 1 ? '' : 'S'}</p>
        </div>
        {questions.length > 0 && (
          <button
            type="button"
            onClick={onDeleteAll}
            className="flex items-center gap-1.5 px-2.5 py-1.5 border border-error/50 bg-error/10 hover:bg-error/20 text-error text-[10px] font-mono font-bold tracking-wider transition"
            title="Delete all questions for this subdomain"
          >
            <Trash2 size={12} />
            CLEAR ALL
          </button>
        )}
      </div>
      {loading ? (
        <p className="py-8 text-xs text-muted font-mono">Loading questions…</p>
      ) : !subdomainSelected ? (
        <p className="py-8 text-xs text-dim font-mono">Select a domain &amp; subdomain to view and manage questions.</p>
      ) : questions.length === 0 ? (
        <p className="py-8 text-xs text-muted font-mono">No questions found in this subdomain.</p>
      ) : (
        <div className="mt-3 space-y-2 overflow-y-auto max-h-[calc(100vh-280px)] pr-1">
          {questions.map((question, idx) => (
            <article key={question.id} className="group relative border border-border bg-surface p-3 hover:border-border/80 transition">
              <div className="flex items-start justify-between gap-2">
                <p className="font-mono text-[9px] text-accent font-bold">
                  #{idx + 1} · {question.difficulty.toUpperCase()} · {question.marks} MARKS
                </p>
                <button
                  type="button"
                  onClick={() => onDeleteQuestion(question.id)}
                  className="p-1 text-dim hover:text-error hover:bg-error/10 border border-transparent hover:border-error/30 transition rounded"
                  title="Delete this question"
                >
                  <Trash2 size={13} />
                </button>
              </div>
              <p className="mt-1.5 text-xs leading-5 text-text">{question.question_text}</p>
              {question.options && question.options.length > 0 && (
                <div className="mt-2 space-y-1 pl-2 border-l border-border/50">
                  {question.options.map((opt) => {
                    const isCorrect = Boolean(question.correct_answers?.includes(opt.id));
                    return (
                      <p key={opt.id} className={`text-[10px] ${isCorrect ? 'text-success font-medium' : 'text-muted'}`}>
                        {opt.id}) {opt.text} {isCorrect && '✓'}
                      </p>
                    );
                  })}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </aside>
  );
}

function WrittenQuestionList({ questions, loading, onDeleteQuestion, onDeleteAll, domainSelected }: { questions: StoredWrittenQuestion[]; loading: boolean; onDeleteQuestion: (id: string) => void; onDeleteAll: () => void; domainSelected: boolean }) {
  return (
    <aside className="bg-[#060709] p-5 flex flex-col h-full border-l border-border">
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div>
          <p className="font-mono text-[10px] font-bold text-accent">WRITTEN QUESTION BANK</p>
          <p className="font-mono text-[10px] text-muted">{questions.length} QUESTION{questions.length === 1 ? '' : 'S'}</p>
        </div>
        {questions.length > 0 && (
          <button
            type="button"
            onClick={onDeleteAll}
            className="flex items-center gap-1.5 px-2.5 py-1.5 border border-error/50 bg-error/10 hover:bg-error/20 text-error text-[10px] font-mono font-bold tracking-wider transition"
            title="Delete all written questions for this domain"
          >
            <Trash2 size={12} />
            CLEAR ALL
          </button>
        )}
      </div>
      {loading ? (
        <p className="py-8 text-xs text-muted font-mono">Loading questions…</p>
      ) : !domainSelected ? (
        <p className="py-8 text-xs text-dim font-mono">Select a domain to view and manage questions.</p>
      ) : questions.length === 0 ? (
        <p className="py-8 text-xs text-muted font-mono">No written questions found.</p>
      ) : (
        <div className="mt-3 space-y-2 overflow-y-auto max-h-[calc(100vh-280px)] pr-1">
          {questions.map((question, idx) => (
            <article key={question.id} className="group relative border border-border bg-surface p-3 hover:border-border/80 transition">
              <div className="flex items-start justify-between gap-2">
                <p className="font-mono text-[9px] text-accent font-bold">
                  #{idx + 1} · {question.scope.replaceAll('_', ' ')} · {question.question_group}
                </p>
                <button
                  type="button"
                  onClick={() => onDeleteQuestion(question.id)}
                  className="p-1 text-dim hover:text-error hover:bg-error/10 border border-transparent hover:border-error/30 transition rounded"
                  title="Delete this question"
                >
                  <Trash2 size={13} />
                </button>
              </div>
              <p className="mt-1.5 text-xs font-semibold leading-5 text-text">{question.prompt}</p>
              {question.instructions && <p className="mt-1.5 text-[10px] leading-4 text-muted">{question.instructions}</p>}
            </article>
          ))}
        </div>
      )}
    </aside>
  );
}

function GuidelineEditor({
  round,
  value,
  onChange,
  onSave,
  saving,
  loading,
  disabled,
  existing,
  error,
  message,
  subdomainName,
  projects,
  projectTitle,
  projectDetails,
  onChangeProjectTitle,
  onChangeProjectDetails,
  onSaveProject,
  onDeleteProject,
  onDeleteAllProjects,
  savingProject,
}: {
  round: 2 | 3;
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  saving: boolean;
  loading: boolean;
  disabled: boolean;
  existing: SubdomainRoundGuideline | null;
  error: string;
  message: string;
  subdomainName?: string;
  projects?: StoredProject[];
  projectTitle?: string;
  projectDetails?: string;
  onChangeProjectTitle?: (val: string) => void;
  onChangeProjectDetails?: (val: string) => void;
  onSaveProject?: () => void;
  onDeleteProject?: (id: string) => void;
  onDeleteAllProjects?: () => void;
  savingProject?: boolean;
}) {
  const projectRound = round === 2;
  const Icon = projectRound ? ClipboardList : MessagesSquare;

  return (
    <main className="mx-auto max-w-5xl p-5 sm:p-8 space-y-8">
      {/* Guidelines Section */}
      <section className="border border-border bg-surface p-5 sm:p-7">
        <div className="flex items-start gap-4 border-b border-border pb-5">
          <span className="grid h-11 w-11 place-items-center border border-accent/40 bg-accent/10 text-accent">
            <Icon size={20} />
          </span>
          <div>
            <p className="font-mono text-xs font-bold text-accent">ROUND {round}</p>
            <h3 className="mt-1 text-xl font-bold">
              {projectRound ? 'Project execution guidelines' : 'Interview preparation guidelines'}
            </h3>
            <p className="mt-2 text-sm text-muted">
              Shown to candidates who selected {subdomainName ?? 'this subdomain'}.
            </p>
          </div>
        </div>
        <label className="mt-6 block">
          <span className="label">Guidelines (General Instructions)</span>
          <textarea
            rows={10}
            disabled={disabled || loading}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="field resize-y disabled:opacity-50"
            placeholder="Enter general submission instructions, timeline, GitHub rules, etc."
          />
        </label>
        {existing?.updated_at && (
          <p className="font-mono text-[9px] text-dim mt-2">LAST UPDATED: {formatDateTime(existing.updated_at)}</p>
        )}
        <Feedback error={error} message={message} />
        <button onClick={onSave} disabled={saving || loading || disabled} className="action mt-5">
          <Save size={15} />
          Save Round {round} guidelines
        </button>
      </section>

      {/* Round 2 Dedicated Problem Statements Section */}
      {projectRound && (
        <section className="border border-border bg-surface p-5 sm:p-7">
          <div className="flex items-start justify-between border-b border-border pb-5">
            <div>
              <p className="font-mono text-xs font-bold text-accent">ROUND 2 · PROBLEM STATEMENTS</p>
              <h3 className="mt-1 text-xl font-bold">Project Tracks &amp; Problem Statements</h3>
              <p className="mt-2 text-sm text-muted">
                Add distinct problem statements for {subdomainName ?? 'this subdomain'}. Candidates will choose or be assigned one of these tracks.
              </p>
            </div>
            {projects && projects.length > 0 && onDeleteAllProjects && (
              <button
                type="button"
                onClick={onDeleteAllProjects}
                disabled={disabled}
                className="flex items-center gap-1.5 px-3 py-2 border border-error/50 bg-error/10 hover:bg-error/20 text-error text-xs font-mono font-bold tracking-wider transition"
              >
                <Trash2 size={13} />
                CLEAR ALL TRACKS
              </button>
            )}
          </div>

          {/* Form to Add New Problem Statement */}
          <div className="mt-6 space-y-4 border border-border/80 bg-[#060709] p-5">
            <h4 className="font-mono text-xs font-bold text-text flex items-center gap-2">
              <Plus size={14} className="text-accent" />
              ADD NEW PROBLEM STATEMENT
            </h4>
            <Field label="Problem Statement Title">
              <input
                type="text"
                disabled={disabled || loading}
                value={projectTitle || ''}
                onChange={(e) => onChangeProjectTitle?.(e.target.value)}
                placeholder="e.g. Serverless E-Commerce Platform"
                className="field"
              />
            </Field>
            <Field label="Problem Details, Requirements & Tech Stack">
              <textarea
                rows={8}
                disabled={disabled || loading}
                value={projectDetails || ''}
                onChange={(e) => onChangeProjectDetails?.(e.target.value)}
                placeholder="Enter problem description, user stories, tech requirements, expected AWS services, and deliverables..."
                className="field resize-y"
              />
            </Field>
            <button
              type="button"
              onClick={onSaveProject}
              disabled={disabled || savingProject || !projectTitle?.trim()}
              className="action"
            >
              <Save size={15} />
              {savingProject ? 'Saving…' : 'Add Problem Statement'}
            </button>
          </div>

          {/* List of Added Problem Statements */}
          <div className="mt-8 space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-mono text-xs font-bold text-muted">
                SAVED PROBLEM STATEMENTS ({projects?.length ?? 0})
              </p>
            </div>

            {(!projects || projects.length === 0) ? (
              <div className="border border-border/50 p-6 text-center text-xs font-mono text-dim">
                No problem statements added yet for {subdomainName ?? 'this subdomain'}. Add your first problem statement above.
              </div>
            ) : (
              <div className="space-y-4">
                {projects.map((proj, idx) => (
                  <article key={proj.id} className="border border-border bg-[#060709] p-5 relative group">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <span className="font-mono text-[10px] font-bold text-accent px-2 py-0.5 border border-accent/30 bg-accent/10">
                          TRACK #{idx + 1}
                        </span>
                        <h4 className="mt-2 text-base font-bold text-text">{proj.title}</h4>
                      </div>
                      {onDeleteProject && (
                        <button
                          type="button"
                          onClick={() => onDeleteProject(proj.id)}
                          className="p-1.5 text-dim hover:text-error hover:bg-error/10 border border-transparent hover:border-error/30 transition rounded"
                          title="Delete this problem statement"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                    <div className="mt-3 text-xs leading-6 text-muted whitespace-pre-wrap border-t border-border/40 pt-3">
                      {proj.details}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      )}
    </main>
  );
}

function Feedback({ error, message }: { error: string; message: string }) { return <>{error && <p role="alert" className="mt-4 border border-error/50 bg-error/10 p-3 text-sm text-error">{error}</p>}{message && <p role="status" className="mt-4 border border-success/50 bg-success/10 p-3 text-sm text-success">{message}</p>}</>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="mb-4 block"><span className="label">{label}</span>{children}</label>; }


