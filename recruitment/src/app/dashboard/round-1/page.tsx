'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ExternalLink, Save, Send } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import type {
  CandidateWrittenAnswer,
  WrittenApplicationQuestion,
  WrittenApplicationRule,
} from '@/types';

type SelectedDomain = {
  id: string;
  name: string;
  slug: string;
  tracks: { id: string; name: string }[];
};

type RoundOneResponse = {
  domains: SelectedDomain[];
  questions: WrittenApplicationQuestion[];
  rules: WrittenApplicationRule[];
  answers: CandidateWrittenAnswer[];
  completion: { valid: boolean; missing: string[] };
  writtenFinal: boolean;
  technical: { required: boolean; complete: boolean };
};

type DraftAnswer = { answerText: string; submissionLinks: string[] };
type Drafts = Record<string, DraftAnswer>;

export default function RoundOnePage() {
  const router = useRouter();
  const [supabase] = useState(createClient);
  const [data, setData] = useState<RoundOneResponse | null>(null);
  const [drafts, setDrafts] = useState<Drafts>({});
  const [dirty, setDirty] = useState(false);
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
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
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
        const answer = result.answers.find((item) =>
          item.domain_id === question.domainId && item.question_id === question.id,
        );
        return [question.answerKey, {
          answerText: answer?.answer_text ?? '',
          submissionLinks: answer?.submission_links ?? [],
        }];
      })));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load Round 1.');
    }
  }, [request]);

  useEffect(() => { load(); }, [load]);

  const payload = useCallback(() => ({
    answers: (data?.questions || []).map((question) => ({
      domainId: question.domainId,
      questionId: question.id,
      answerText: drafts[question.answerKey]?.answerText ?? '',
      submissionLinks: drafts[question.answerKey]?.submissionLinks ?? [],
    })),
  }), [data, drafts]);

  const saveDrafts = useCallback(async () => {
    if (!data || !dirty) return;
    setStatus('saving');
    setError('');
    try {
      await request('PUT', payload());
      setDirty(false);
      setStatus('saved');
    } catch (saveError) {
      setStatus('idle');
      setError(saveError instanceof Error ? saveError.message : 'Unable to save your responses.');
    }
  }, [data, dirty, payload, request]);

  useEffect(() => {
    if (!dirty) return;
    const timer = window.setTimeout(saveDrafts, 900);
    return () => window.clearTimeout(timer);
  }, [dirty, saveDrafts]);

  const questionsByDomain = useMemo(() => new Map(
    (data?.domains || [])
      .filter((domain) => domain.slug !== 'technical')
      .map((domain) => [domain.id, (data?.questions || []).filter((question) => question.domainId === domain.id)]),
  ), [data]);

  function updateAnswer(answerKey: string, change: Partial<DraftAnswer>) {
    setDrafts((current) => {
      const previous = current[answerKey] ?? { answerText: '', submissionLinks: [] };
      return { ...current, [answerKey]: { ...previous, ...change } };
    });
    setDirty(true);
    setStatus('idle');
    setError('');
  }

  async function submitWritten() {
    if (!data) return;
    setStatus('submitting');
    setError('');
    try {
      await request('POST', payload());
      setDirty(false);
      await load();
      setStatus('saved');
    } catch (submitError) {
      setStatus('idle');
      setError(submitError instanceof Error ? submitError.message : 'Unable to submit your responses.');
    }
  }

  if (!data && !error) {
    return <main className="grid min-h-[60vh] place-items-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent" /></main>;
  }

  if (!data) {
    return (
      <main className="mx-auto max-w-3xl p-5 sm:p-8">
        <section className="technical-panel p-6">
          <p className="eyebrow">ROUND 1 / SETUP</p>
          <h1 className="mt-3 text-2xl font-bold">Round 1 is not ready yet.</h1>
          <p className="mt-3 text-sm text-error">{error}</p>
          <Link href="/dashboard/domain" className="action-secondary mt-6">Back to domain selection</Link>
        </section>
      </main>
    );
  }

  const writtenDomains = data.domains.filter((domain) => domain.slug !== 'technical');
  const roundComplete = data.writtenFinal && data.technical.complete;

  return (
    <main className="mx-auto max-w-5xl p-5 sm:p-8">
      <header className="flex flex-col justify-between gap-5 border-b border-border pb-6 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">03 / ROUND_1</p>
          <h1 className="mt-3 text-3xl font-bold sm:text-4xl">Show us how you think.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
            Complete the written questions for each non-Technical domain. Technical applicants also complete the timed assessment.
          </p>
        </div>
        <div className="status-chip self-start text-accent">
          {roundComplete ? 'Round 1 complete' : status === 'saving' ? 'Saving…' : status === 'saved' ? 'Draft saved' : 'Draft autosaves'}
        </div>
      </header>

      {error && <p role="alert" className="mt-6 border border-error/50 bg-error/10 p-4 text-sm text-error">{error}</p>}

      <div className="mt-8 space-y-8">
        {writtenDomains.map((domain, index) => {
          const questions = questionsByDomain.get(domain.id) || [];
          const designQuestions = questions.filter((question) => question.group === 'design_tasks');
          const designAnswered = designQuestions.filter((question) => {
            const answer = drafts[question.answerKey];
            return Boolean(answer?.answerText.trim() || answer?.submissionLinks.length);
          }).length;
          const rule = data.rules.find((item) => item.domainId === domain.id && item.group === 'design_tasks');

          return (
            <section key={domain.id} className="technical-panel p-5 sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
                <div>
                  <p className="eyebrow">{String(index + 1).padStart(2, '0')} / {domain.slug.toUpperCase()}</p>
                  <h2 className="mt-2 text-2xl font-bold">{domain.name}</h2>
                  <p className="mt-2 text-xs text-muted">
                    {domain.tracks.length > 1 ? domain.tracks.map((track) => track.name).join(' · ') : 'Whole-domain application'}
                  </p>
                </div>
                {rule && <span className="status-chip text-accent">{designAnswered}/{rule.minimumAnswers} Design tasks</span>}
              </div>

              <div className="mt-6 space-y-7">
                {questions.map((question, questionIndex) => {
                  const answer = drafts[question.answerKey] ?? { answerText: '', submissionLinks: [] };
                  return (
                    <article key={question.answerKey} className={question.group === 'design_tasks' ? 'border border-border bg-bg/40 p-5' : ''}>
                      <label htmlFor={question.answerKey} className="block">
                        <span className="font-mono text-xs uppercase tracking-wider text-accent">
                          {String(questionIndex + 1).padStart(2, '0')} {question.required ? '/ REQUIRED' : '/ CHOOSE ANY TWO'}
                        </span>
                        <span className="mt-2 block text-base font-semibold text-text">{question.prompt}</span>
                        {question.instructions && <span className="mt-2 block text-sm leading-6 text-muted">{question.instructions}</span>}
                      </label>
                      <textarea
                        id={question.answerKey}
                        rows={question.group === 'design_tasks' ? 6 : 5}
                        value={answer.answerText}
                        disabled={data.writtenFinal}
                        onChange={(event) => updateAnswer(question.answerKey, { answerText: event.target.value })}
                        placeholder="Write your response here…"
                        className="field mt-4 min-h-32 resize-y"
                      />
                      {question.responseType === 'long_text_with_links' && (
                        <label className="mt-4 block">
                          <span className="label">Shareable links</span>
                          <input
                            type="url"
                            value={answer.submissionLinks.join(', ')}
                            disabled={data.writtenFinal}
                            onChange={(event) => updateAnswer(question.answerKey, {
                              submissionLinks: event.target.value.split(/[\n,]/).map((link) => link.trim()).filter(Boolean),
                            })}
                            placeholder="https://drive.google.com/..."
                            className="field"
                          />
                        </label>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}

        {data.technical.required && (
          <section className="border border-accent/40 bg-accent/10 p-5 sm:p-7">
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
              <div>
                <p className="eyebrow">TECHNICAL / TIMED_ASSESSMENT</p>
                <h2 className="mt-2 text-xl font-bold">Technical assessment</h2>
                <p className="mt-2 text-sm text-muted">Five questions and 25 minutes for each selected Technical specialization.</p>
              </div>
              {data.technical.complete ? (
                <span className="inline-flex items-center gap-2 font-mono text-xs uppercase text-success"><Check size={16} /> Complete</span>
              ) : (
                <Link href="/dashboard/assessment" className="action">Start or resume <ExternalLink size={15} /></Link>
              )}
            </div>
          </section>
        )}
      </div>

      <div className="sticky bottom-4 mt-8 flex flex-wrap items-center justify-between gap-4 border border-border bg-surface/95 p-4 shadow-2xl backdrop-blur">
        <button type="button" onClick={saveDrafts} disabled={!dirty || status === 'saving' || data.writtenFinal} className="action-secondary">
          <Save size={15} /> Save draft
        </button>
        {data.writtenFinal ? (
          <span className="inline-flex items-center gap-2 font-mono text-xs uppercase text-success"><Check size={16} /> Written responses submitted</span>
        ) : (
          <button type="button" onClick={submitWritten} disabled={status === 'submitting'} className="action">
            <Send size={15} /> {status === 'submitting' ? 'Submitting…' : 'Submit written responses'}
          </button>
        )}
      </div>
    </main>
  );
}
