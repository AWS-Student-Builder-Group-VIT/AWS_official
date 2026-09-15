'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, ChevronRight, ExternalLink, FileText, Save, Send, TerminalSquare } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { roundOneCards } from '@/lib/round-one-hub-rules.mjs';
import type { CandidateWrittenAnswer, WrittenApplicationQuestion, WrittenApplicationRule } from '@/types';

type SelectedDomain = { id: string; name: string; slug: string; tracks: { id: string; name: string }[] };
type DomainState = { status: 'not_started' | 'draft' | 'submitted'; hasContent: boolean; valid: boolean; final: boolean; missing: string[] };
type RoundOneResponse = {
  domains: SelectedDomain[];
  questions: WrittenApplicationQuestion[];
  rules: WrittenApplicationRule[];
  answers: CandidateWrittenAnswer[];
  domainStates: Record<string, DomainState>;
  roundOneComplete: boolean;
  technical: { required: boolean; complete: boolean; status: string };
};
type DraftAnswer = { answerText: string; submissionLinks: string[] };
type Drafts = Record<string, DraftAnswer>;
type Card = { key: string; kind: 'written' | 'technical'; title: string; subtitle: string; status: DomainState['status']; domainId?: string; subdomainId?: string };

const statusCopy = { not_started: 'Not started', draft: 'Draft saved', submitted: 'Submitted' };
const statusStyle = {
  not_started: 'border-border text-muted',
  draft: 'border-warning/50 text-warning',
  submitted: 'border-success/50 text-success',
};

export default function RoundOnePage() {
  const router = useRouter();
  const [supabase] = useState(createClient);
  const [data, setData] = useState<RoundOneResponse | null>(null);
  const [drafts, setDrafts] = useState<Drafts>({});
  const [activeDomainId, setActiveDomainId] = useState<string | null>(null);
  const [dirtyDomainId, setDirtyDomainId] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'submitting'>('idle');
  const [error, setError] = useState('');

  const request = useCallback(async (method: 'GET' | 'PUT' | 'POST', body?: unknown) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.replace('/login');
      return null;
    }
    const response = await fetch('/api/round-1/written', {
      method,
      headers: { Authorization: `Bearer ${session.access_token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? 'Unable to load Round 1.');
    return result;
  }, [router, supabase]);

  const load = useCallback(async () => {
    try {
      const result = await request('GET') as RoundOneResponse | null;
      if (!result) return;
      setData(result);
      setDrafts(Object.fromEntries(result.questions.map((question) => {
        const answer = result.answers.find((item) => item.domain_id === question.domainId && item.question_id === question.id);
        return [question.answerKey, { answerText: answer?.answer_text ?? '', submissionLinks: answer?.submission_links ?? [] }];
      })));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load Round 1.');
    }
  }, [request]);

  useEffect(() => { load(); }, [load]);

  const domainPayload = useCallback((domainId: string) => ({
    domainId,
    answers: (data?.questions || []).filter((question) => question.domainId === domainId).map((question) => ({
      domainId,
      questionId: question.id,
      answerText: drafts[question.answerKey]?.answerText ?? '',
      submissionLinks: drafts[question.answerKey]?.submissionLinks ?? [],
    })),
  }), [data, drafts]);

  const saveDomainDraft = useCallback(async (domainId: string) => {
    if (!data || dirtyDomainId !== domainId || data.domainStates[domainId]?.final) return true;
    setStatus('saving');
    setError('');
    try {
      await request('PUT', domainPayload(domainId));
      setDirtyDomainId(null);
      setStatus('saved');
      return true;
    } catch (saveError) {
      setStatus('idle');
      setError(saveError instanceof Error ? saveError.message : 'Unable to save this domain.');
      return false;
    }
  }, [data, dirtyDomainId, domainPayload, request]);

  useEffect(() => {
    if (!activeDomainId || dirtyDomainId !== activeDomainId) return;
    const timer = window.setTimeout(() => { void saveDomainDraft(activeDomainId); }, 900);
    return () => window.clearTimeout(timer);
  }, [activeDomainId, dirtyDomainId, saveDomainDraft]);

  const cards = useMemo(() => data ? roundOneCards(data.domains, data.domainStates, data.technical) as Card[] : [], [data]);
  const activeDomain = data?.domains.find((domain) => domain.id === activeDomainId) ?? null;
  const activeQuestions = (data?.questions || []).filter((question) => question.domainId === activeDomainId);
  const activeState = activeDomainId ? data?.domainStates[activeDomainId] : null;

  function updateAnswer(answerKey: string, change: Partial<DraftAnswer>) {
    if (!activeDomainId || activeState?.final) return;
    setDrafts((current) => {
      const previous = current[answerKey] ?? { answerText: '', submissionLinks: [] };
      return { ...current, [answerKey]: { ...previous, ...change } };
    });
    setDirtyDomainId(activeDomainId);
    setStatus('idle');
    setError('');
  }

  async function backToHub() {
    if (activeDomainId && !(await saveDomainDraft(activeDomainId))) return;
    setActiveDomainId(null);
    await load();
  }

  async function submitDomain() {
    if (!activeDomainId || activeState?.final) return;
    setStatus('submitting');
    setError('');
    try {
      await request('POST', domainPayload(activeDomainId));
      setDirtyDomainId(null);
      setActiveDomainId(null);
      await load();
      setStatus('saved');
    } catch (submitError) {
      setStatus('idle');
      setError(submitError instanceof Error ? submitError.message : 'Unable to submit this domain.');
    }
  }

  if (!data && !error) return <main className="grid min-h-[60vh] place-items-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent" /></main>;

  if (!data) return (
    <main className="mx-auto max-w-3xl p-5 sm:p-8"><section className="technical-panel p-6">
      <p className="eyebrow">ROUND 1 / SETUP</p><h1 className="mt-3 text-2xl font-bold">Round 1 is not ready yet.</h1>
      <p className="mt-3 text-sm text-error">{error}</p><Link href="/dashboard/domain" className="action-secondary mt-6">Back to domain selection</Link>
    </section></main>
  );

  if (activeDomain) {
    const designQuestions = activeQuestions.filter((question) => question.group === 'design_tasks');
    const designAnswered = designQuestions.filter((question) => {
      const answer = drafts[question.answerKey];
      return Boolean(answer?.answerText.trim() || answer?.submissionLinks.length);
    }).length;
    const designRule = data.rules.find((rule) => rule.domainId === activeDomain.id && rule.group === 'design_tasks');

    return (
      <main className="mx-auto max-w-4xl p-5 sm:p-8">
        <button type="button" onClick={backToHub} className="action-secondary !min-h-10 !px-4"><ArrowLeft size={15} /> Back to Round 1</button>
        <header className="mt-6 flex flex-col justify-between gap-5 border-b border-border pb-6 sm:flex-row sm:items-end">
          <div><p className="eyebrow">ROUND 1 / {activeDomain.slug.toUpperCase()}</p><h1 className="mt-3 text-3xl font-bold sm:text-4xl">{activeDomain.name}</h1>
            <p className="mt-3 text-sm text-muted">{activeDomain.tracks.length > 1 ? activeDomain.tracks.map((track) => track.name).join(' · ') : 'Whole-domain application'}</p></div>
          <span className={`status-chip self-start ${statusStyle[activeState?.status ?? 'not_started']}`}>{statusCopy[activeState?.status ?? 'not_started']}</span>
        </header>
        {error && <p role="alert" className="mt-6 border border-error/50 bg-error/10 p-4 text-sm text-error">{error}</p>}
        <section className="technical-panel mt-8 p-5 sm:p-7">
          {designRule && <div className="mb-6 flex justify-end"><span className="status-chip text-accent">{designAnswered}/{designRule.minimumAnswers} Design tasks</span></div>}
          <div className="space-y-8">{activeQuestions.map((question, questionIndex) => {
            const answer = drafts[question.answerKey] ?? { answerText: '', submissionLinks: [] };
            return <article key={question.answerKey} className={question.group === 'design_tasks' ? 'border border-border bg-bg/40 p-5' : ''}>
              <label htmlFor={question.answerKey} className="block"><span className="font-mono text-xs uppercase tracking-wider text-accent">{String(questionIndex + 1).padStart(2, '0')} {question.required ? '/ REQUIRED' : '/ CHOOSE ANY TWO'}</span>
                <span className="mt-2 block text-base font-semibold text-text">{question.prompt}</span>{question.instructions && <span className="mt-2 block text-sm leading-6 text-muted">{question.instructions}</span>}</label>
              <textarea id={question.answerKey} rows={question.group === 'design_tasks' ? 6 : 5} value={answer.answerText} disabled={activeState?.final}
                onChange={(event) => updateAnswer(question.answerKey, { answerText: event.target.value })} placeholder="Write your response here…" className="field mt-4 min-h-32 resize-y disabled:cursor-not-allowed disabled:opacity-70" />
              {question.responseType === 'long_text_with_links' && <label className="mt-4 block"><span className="label">Shareable links</span><input type="url" value={answer.submissionLinks.join(', ')} disabled={activeState?.final}
                onChange={(event) => updateAnswer(question.answerKey, { submissionLinks: event.target.value.split(/[\n,]/).map((link) => link.trim()).filter(Boolean) })}
                placeholder="https://drive.google.com/..." className="field disabled:cursor-not-allowed disabled:opacity-70" /></label>}
            </article>;
          })}</div>
        </section>
        <div className="sticky bottom-4 mt-8 flex flex-wrap items-center justify-between gap-4 border border-border bg-surface/95 p-4 shadow-2xl backdrop-blur">
          {activeState?.final ? <span className="inline-flex items-center gap-2 font-mono text-xs uppercase text-success"><Check size={16} /> This domain is submitted and locked</span> : <>
            <button type="button" onClick={() => activeDomainId && saveDomainDraft(activeDomainId)} disabled={dirtyDomainId !== activeDomainId || status === 'saving'} className="action-secondary"><Save size={15} /> {status === 'saving' ? 'Saving…' : 'Save draft'}</button>
            <button type="button" onClick={submitDomain} disabled={status === 'submitting'} className="action"><Send size={15} /> {status === 'submitting' ? 'Submitting…' : `Submit ${activeDomain.name}`}</button>
          </>}
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl p-5 sm:p-8">
      <header className="flex flex-col justify-between gap-5 border-b border-border pb-6 sm:flex-row sm:items-end"><div><p className="eyebrow">03 / ROUND_1</p><h1 className="mt-3 text-3xl font-bold sm:text-4xl">Choose an application section.</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">Open each selected domain, complete its questions, and submit it separately. Technical cards enter the combined timed assessment.</p></div>
        <span className={`status-chip self-start ${data.roundOneComplete ? 'border-success/50 text-success' : 'text-accent'}`}>{data.roundOneComplete ? 'Round 1 complete' : 'Round 1 in progress'}</span></header>
      {error && <p role="alert" className="mt-6 border border-error/50 bg-error/10 p-4 text-sm text-error">{error}</p>}
      <section className="mt-8 grid gap-4 sm:grid-cols-2">{cards.map((card, index) => {
        const content = <><div className="flex items-start justify-between gap-4"><span className="font-mono text-xs text-accent">{String(index + 1).padStart(2, '0')}</span>{card.kind === 'technical' ? <TerminalSquare size={20} className="text-accent" /> : <FileText size={20} className="text-accent" />}</div>
          <p className="mt-8 font-mono text-[10px] uppercase tracking-[.16em] text-dim">{card.kind === 'technical' ? 'Technical subdomain' : 'Written domain'}</p><h2 className="mt-2 text-xl font-bold">{card.title}</h2>
          <p className="mt-2 min-h-10 text-xs leading-5 text-muted">{card.subtitle}</p><div className="mt-6 flex items-center justify-between gap-3 border-t border-border pt-4"><span className={`status-chip ${statusStyle[card.status]}`}>{statusCopy[card.status]}</span>
            <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase text-accent">{card.status === 'submitted' ? 'Review' : 'Open'}{card.kind === 'technical' ? <ExternalLink size={13} /> : <ChevronRight size={14} />}</span></div></>;
        return card.kind === 'technical'
          ? <Link key={card.key} href={`/dashboard/assessment?track=${encodeURIComponent(card.subdomainId ?? '')}`} className="technical-panel block min-h-64 p-5 transition hover:border-accent sm:p-6">{content}</Link>
          : <button key={card.key} type="button" onClick={() => setActiveDomainId(card.domainId ?? null)} className="technical-panel min-h-64 p-5 text-left transition hover:border-accent sm:p-6">{content}</button>;
      })}</section>
    </main>
  );
}
