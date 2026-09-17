import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, AlertTriangle, ArrowLeft, Check, ChevronRight, ExternalLink, FileText, Send, TerminalSquare } from 'lucide-react';
import { createClient } from '../lib/supabase.js';
import { roundOneCards } from '../lib/round-one-hub-rules.js';

const statusCopy = { not_started: 'Not submitted', draft: 'Not submitted', submitted: 'Submitted', not_assessed: 'Not assessed' };
const statusBorder = { not_started: 'var(--border)', draft: 'var(--border)', submitted: 'rgba(34,197,94,.5)', not_assessed: 'rgba(239,68,68,.5)' };
const statusTextColor = { not_started: 'var(--muted)', draft: 'var(--muted)', submitted: 'var(--success)', not_assessed: 'var(--error)' };

// A written answer counts once it has text, or a link for link questions.
const isAnswered = (answer) => Boolean(answer?.answerText?.trim() || answer?.submissionLinks?.length);

export default function RoundOne() {
  const navigate = useNavigate();
  const [supabase] = useState(createClient);
  const [data, setData] = useState(null);
  const [drafts, setDrafts] = useState({});
  // Answer keys left blank on the last submit attempt, highlighted like a form.
  const [missingKeys, setMissingKeys] = useState([]);
  const [showIncomplete, setShowIncomplete] = useState(false);
  const [activeDomainId, setActiveDomainId] = useState(null);
  const [dirtyDomainId, setDirtyDomainId] = useState(null);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  // Shown on arrival until the candidate acknowledges it, while domains can still change.
  const [lockWarningSeen, setLockWarningSeen] = useState(false);

  const request = useCallback(async (method, body) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate('/recruitment/login', { replace: true }); return null; }
    const response = await fetch('/api/recruitment/round-1/written', {
      method,
      headers: { Authorization: `Bearer ${session.access_token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? 'Unable to load Round 1.');
    return result;
  }, [supabase, navigate]);

  const load = useCallback(async () => {
    try {
      const result = await request('GET');
      if (!result) return;
      setData(result);
      setDrafts(Object.fromEntries(result.questions.map((question) => {
        const answer = result.answers.find((item) => item.domain_id === question.domainId && item.question_id === question.id);
        return [question.answerKey, { answerText: answer?.answer_text ?? '', submissionLinks: answer?.submission_links ?? [] }];
      })));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load Round 1.');
    }
  }, [request]);

  useEffect(() => { load(); }, [load]);

  const domainPayload = useCallback((domainId) => ({
    domainId,
    answers: (data?.questions || []).filter((q) => q.domainId === domainId).map((q) => ({
      domainId, questionId: q.id,
      answerText: drafts[q.answerKey]?.answerText ?? '',
      submissionLinks: drafts[q.answerKey]?.submissionLinks ?? [],
    })),
  }), [data, drafts]);

  const saveDomainDraft = useCallback(async (domainId) => {
    if (!data || dirtyDomainId !== domainId || data.domainStates[domainId]?.final) return true;
    setStatus('saving'); setError('');
    try {
      await request('PUT', domainPayload(domainId));
      setDirtyDomainId(null); setStatus('saved'); return true;
    } catch (err) {
      setStatus('idle'); setError(err instanceof Error ? err.message : 'Unable to save this domain.'); return false;
    }
  }, [data, dirtyDomainId, domainPayload, request]);

  useEffect(() => {
    if (!activeDomainId || dirtyDomainId !== activeDomainId) return;
    const timer = window.setTimeout(() => { saveDomainDraft(activeDomainId); }, 900);
    return () => window.clearTimeout(timer);
  }, [activeDomainId, dirtyDomainId, saveDomainDraft]);

  const cards = useMemo(() => data ? roundOneCards(data.domains, data.domainStates, data.technical) : [], [data]);
  const activeDomain = data?.domains.find((d) => d.id === activeDomainId) ?? null;
  const activeQuestions = (data?.questions || []).filter((q) => q.domainId === activeDomainId);
  const activeState = activeDomainId ? data?.domainStates[activeDomainId] : null;

  function updateAnswer(answerKey, change) {
    if (!activeDomainId || activeState?.final) return;
    setDrafts((curr) => { const prev = curr[answerKey] ?? { answerText: '', submissionLinks: [] }; return { ...curr, [answerKey]: { ...prev, ...change } }; });
    const next = { ...(drafts[answerKey] ?? { answerText: '', submissionLinks: [] }), ...change };
    if (isAnswered(next)) setMissingKeys((keys) => keys.filter((key) => key !== answerKey));
    setDirtyDomainId(activeDomainId); setStatus('idle'); setError('');
  }

  async function backToHub() {
    if (activeDomainId && !(await saveDomainDraft(activeDomainId))) return;
    setActiveDomainId(null); await load();
  }

  function scrollToQuestion(answerKey) {
    document.getElementById(answerKey)?.closest('article')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  async function submitDomain() {
    if (!activeDomainId || activeState?.final) return;
    const missing = activeQuestions
      .filter((question) => question.required !== false && !isAnswered(drafts[question.answerKey]))
      .map((question) => question.answerKey);
    if (missing.length) {
      setMissingKeys(missing);
      setShowIncomplete(true);
      return;
    }
    setMissingKeys([]);
    setStatus('submitting'); setError('');
    try {
      await request('POST', domainPayload(activeDomainId));
      setDirtyDomainId(null); setActiveDomainId(null); await load(); setStatus('saved');
    } catch (err) {
      setStatus('idle'); setError(err instanceof Error ? err.message : 'Unable to submit this domain.');
    }
  }

  if (!data && !error) return <main className="grid min-h-[60vh] place-items-center"><div className="h-8 w-8 animate-spin rounded-full border-2" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} /></main>;
  if (!data) return (
    <main className="mx-auto max-w-3xl p-5 sm:p-8">
      <section className="technical-panel p-6">
        <p className="eyebrow">ROUND 1 / SETUP</p>
        <h1 className="mt-3 text-2xl font-bold">Round 1 is not ready yet.</h1>
        <p className="mt-3 text-sm" style={{ color: 'var(--error)' }}>{error}</p>
        <Link to="/recruitment/subdomain" className="action-secondary mt-6 inline-flex">Back to domain selection</Link>
      </section>
    </main>
  );

  if (activeDomain) {
    const designQuestions = activeQuestions.filter((q) => q.group === 'design_tasks');
    const designAnswered = designQuestions.filter((q) => { const a = drafts[q.answerKey]; return Boolean(a?.answerText.trim() || a?.submissionLinks.length); }).length;
    const designRule = data.rules.find((r) => r.domainId === activeDomain.id && r.group === 'design_tasks');
    return (
      <main className="mx-auto max-w-4xl p-5 sm:p-8">
        <button type="button" onClick={backToHub} className="action-secondary !min-h-10 !px-4 inline-flex items-center gap-2"><ArrowLeft size={15} /> Back to Round 1</button>
        <header className="mt-6 flex flex-col justify-between gap-5 border-b pb-6 sm:flex-row sm:items-end" style={{ borderColor: 'var(--border)' }}>
          <div>
            <p className="eyebrow">ROUND 1 / {activeDomain.slug.toUpperCase()}</p>
            <h1 className="mt-3 text-3xl font-bold sm:text-4xl">{activeDomain.name}</h1>
            <p className="mt-3 text-sm" style={{ color: 'var(--muted)' }}>{activeDomain.tracks.length > 1 ? activeDomain.tracks.map((t) => t.name).join(' · ') : 'Whole-domain application'}</p>
          </div>
          <span className="status-chip self-start" style={{ borderColor: statusBorder[activeState?.status ?? 'not_started'], color: statusTextColor[activeState?.status ?? 'not_started'] }}>{statusCopy[activeState?.status ?? 'not_started']}</span>
        </header>
        {error && <p role="alert" className="mt-6 border p-4 text-sm" style={{ borderColor: 'rgba(239,68,68,.5)', background: 'rgba(239,68,68,.1)', color: 'var(--error)' }}>{error}</p>}
        <section className="technical-panel mt-8 p-5 sm:p-7">
          {designRule && <div className="mb-6 flex justify-end"><span className="status-chip" style={{ color: 'var(--accent)' }}>{designAnswered}/{designRule.minimumAnswers} Design tasks</span></div>}
          <div className="space-y-8">
            {activeQuestions.map((question, qIdx) => {
              const answer = drafts[question.answerKey] ?? { answerText: '', submissionLinks: [] };
              const isMissing = missingKeys.includes(question.answerKey);
              return (
                <article key={question.answerKey} className="border p-5 transition"
                  style={{ borderColor: isMissing ? 'var(--error)' : question.group === 'design_tasks' ? 'var(--border)' : 'transparent', background: isMissing ? 'rgba(239,68,68,.06)' : question.group === 'design_tasks' ? 'rgba(0,0,0,.3)' : 'transparent' }}>
                  <label htmlFor={question.answerKey} className="block">
                    <span className="font-mono text-xs uppercase tracking-wider" style={{ color: 'var(--accent)' }}>{String(qIdx + 1).padStart(2, '0')} {question.required ? '/ REQUIRED' : '/ CHOOSE ANY TWO'}</span>
                    <span className="mt-2 block text-base font-semibold" style={{ color: 'var(--text)' }}>{question.prompt}</span>
                    {question.instructions && <span className="mt-2 block text-sm leading-6" style={{ color: 'var(--muted)' }}>{question.instructions}</span>}
                  </label>
                  <textarea id={question.answerKey} rows={question.group === 'design_tasks' ? 6 : 5} value={answer.answerText} disabled={activeState?.final}
                    onChange={(e) => updateAnswer(question.answerKey, { answerText: e.target.value })}
                    placeholder="Write your response here…" className="field mt-4 min-h-32 resize-y disabled:cursor-not-allowed disabled:opacity-70" />
                  {question.responseType === 'long_text_with_links' && (
                    <label className="mt-4 block"><span className="label">Shareable links</span>
                      <input type="url" value={answer.submissionLinks.join(', ')} disabled={activeState?.final}
                        onChange={(e) => updateAnswer(question.answerKey, { submissionLinks: e.target.value.split(/[\n,]/).map((l) => l.trim()).filter(Boolean) })}
                        placeholder="https://drive.google.com/..." className="field disabled:cursor-not-allowed disabled:opacity-70" />
                    </label>
                  )}
                  {isMissing && (
                    <p role="alert" className="mt-3 inline-flex items-center gap-2 text-sm" style={{ color: 'var(--error)' }}>
                      <AlertCircle size={15} aria-hidden="true" /> This is a required question
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        </section>
        <div className="sticky bottom-4 mt-8 flex flex-wrap items-center justify-between gap-4 border p-4 shadow-2xl backdrop-blur" style={{ borderColor: 'var(--border)', background: 'rgba(17,19,24,.95)' }}>
          {activeState?.final
            ? <span className="inline-flex items-center gap-2 font-mono text-xs uppercase" style={{ color: 'var(--success)' }}><Check size={16} /> This domain is submitted and locked</span>
            : <>
                <span className="text-xs" style={{ color: 'var(--muted)' }}>All questions are required.</span>
                <button type="button" onClick={submitDomain} disabled={status === 'submitting'} className="action inline-flex items-center gap-2"><Send size={15} /> {status === 'submitting' ? 'Submitting…' : `Submit ${activeDomain.name}`}</button>
              </>}
        </div>

        {showIncomplete && (
          <div className="fixed inset-0 z-50 grid place-items-center p-5 backdrop-blur-sm" style={{ background: 'rgba(10,11,14,.8)' }}
            onMouseDown={(e) => { if (e.target === e.currentTarget) setShowIncomplete(false); }}>
            <section role="alertdialog" aria-modal="true" aria-labelledby="incomplete-title" className="technical-panel w-full max-w-md p-6 shadow-2xl sm:p-7">
              <div className="flex items-start gap-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center border" style={{ borderColor: 'rgba(239,68,68,.45)', background: 'rgba(239,68,68,.1)', color: 'var(--error)' }}><AlertCircle size={19} /></span>
                <div className="flex-1">
                  <h2 id="incomplete-title" className="text-xl font-bold">Please answer all questions</h2>
                  <p className="mt-3 text-sm leading-6" style={{ color: 'var(--muted)' }}>
                    {missingKeys.length} of {activeQuestions.length} question{activeQuestions.length === 1 ? '' : 's'} {missingKeys.length === 1 ? 'is' : 'are'} still unanswered.
                    They are highlighted in red. Every question must be answered before you can submit.
                  </p>
                </div>
              </div>
              <button type="button" autoFocus className="action mt-6 w-full justify-center"
                onClick={() => { setShowIncomplete(false); if (missingKeys[0]) scrollToQuestion(missingKeys[0]); }}>
                Go to first unanswered question
              </button>
            </section>
          </div>
        )}
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl p-5 sm:p-8">
      <header className="flex flex-col justify-between gap-5 border-b pb-6 sm:flex-row sm:items-end" style={{ borderColor: 'var(--border)' }}>
        <div>
          <p className="eyebrow">03 / ROUND_1</p>
          <h1 className="mt-3 text-3xl font-bold sm:text-4xl">Choose an application section.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6" style={{ color: 'var(--muted)' }}>Open each selected domain, complete its questions, and submit it separately. Technical cards enter the combined timed assessment.</p>
        </div>
        <span className="status-chip self-start" style={{ borderColor: data.roundOneComplete ? 'rgba(34,197,94,.5)' : 'var(--border)', color: data.roundOneComplete ? 'var(--success)' : 'var(--accent)' }}>
          {data.roundOneComplete ? 'Round 1 complete' : 'Round 1 in progress'}
        </span>
      </header>
      {error && <p role="alert" className="mt-6 border p-4 text-sm" style={{ borderColor: 'rgba(239,68,68,.5)', background: 'rgba(239,68,68,.1)', color: 'var(--error)' }}>{error}</p>}
      <section className="mt-8 grid gap-4 sm:grid-cols-2">
        {cards.map((card, index) => {
          const borderColor = statusBorder[card.status];
          const textColor = statusTextColor[card.status];
          const content = (
            <>
              <div className="flex items-start justify-between gap-4"><span className="font-mono text-xs" style={{ color: 'var(--accent)' }}>{String(index + 1).padStart(2, '0')}</span>{card.kind === 'technical' ? <TerminalSquare size={20} style={{ color: 'var(--accent)' }} /> : <FileText size={20} style={{ color: 'var(--accent)' }} />}</div>
              <p className="mt-8 font-mono text-[10px] uppercase tracking-[.16em]" style={{ color: 'var(--dim)' }}>{card.kind === 'technical' ? 'Technical subdomain' : 'Written domain'}</p>
              <h2 className="mt-2 text-xl font-bold">{card.title}</h2>
              <p className="mt-2 min-h-10 text-xs leading-5" style={{ color: 'var(--muted)' }}>{card.subtitle}</p>
              <div className="mt-6 flex items-center justify-between gap-3 border-t pt-4" style={{ borderColor: 'var(--border)' }}>
                <span className="status-chip" style={{ borderColor, color: textColor }}>{statusCopy[card.status]}</span>
                <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase" style={{ color: card.status === 'not_assessed' ? 'var(--dim)' : 'var(--accent)' }}>
                  {card.status === 'submitted' ? 'Review' : card.status === 'not_assessed' ? 'Locked' : 'Open'}
                  {card.kind === 'technical' ? <ExternalLink size={13} /> : <ChevronRight size={14} />}
                </span>
              </div>
            </>
          );
          if (card.kind === 'technical') {
            if (card.status === 'not_assessed') {
              return (
                <div key={card.key} className="technical-panel block min-h-64 cursor-not-allowed p-5 opacity-75 sm:p-6" title="This domain was selected after your technical assessment was already submitted. Technical assessments are limited to one attempt per candidate.">
                  {content}
                </div>
              );
            }
            return (
              <Link key={card.key} to={`/recruitment/dashboard/assessment?track=${encodeURIComponent(card.subdomainId ?? '')}`} className="technical-panel block min-h-64 p-5 transition hover:border-[var(--accent)] sm:p-6">
                {content}
              </Link>
            );
          }
          return <button key={card.key} type="button" onClick={() => setActiveDomainId(card.domainId ?? null)} className="technical-panel min-h-64 p-5 text-left transition hover:border-[var(--accent)] sm:p-6">{content}</button>;
        })}
      </section>

      {!data.domainLocked && !lockWarningSeen && (
        <div className="fixed inset-0 z-50 grid place-items-center p-5 backdrop-blur-sm" style={{ background: 'rgba(10,11,14,.8)' }}>
          <section role="alertdialog" aria-modal="true" aria-labelledby="lock-title" aria-describedby="lock-body" className="technical-panel w-full max-w-md p-6 shadow-2xl sm:p-7">
            <div className="flex items-start gap-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center border" style={{ borderColor: 'rgba(255,153,0,.45)', background: 'rgba(255,153,0,.1)', color: 'var(--accent)' }}><AlertTriangle size={19} /></span>
              <div className="flex-1">
                <h2 id="lock-title" className="text-xl font-bold">Your domains will be locked</h2>
                <p id="lock-body" className="mt-3 text-sm leading-6" style={{ color: 'var(--muted)' }}>
                  Once you start any test or submit any domain, you <strong style={{ color: 'var(--text)' }}>will not be able to edit your domains</strong>.
                  Make sure your selection is final before you begin.
                </p>
              </div>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
              <Link to="/recruitment/subdomain" className="action-secondary flex-1 justify-center">Change my domains</Link>
              <button type="button" autoFocus onClick={() => setLockWarningSeen(true)} className="action flex-1 justify-center">I understand, continue</button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
