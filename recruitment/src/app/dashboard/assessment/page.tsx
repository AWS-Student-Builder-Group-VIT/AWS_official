'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { formatTime, cn } from '@/lib/utils';
import { technicalAssessmentTracks } from '@/lib/assessment-track-rules.mjs';
import type { AssessmentQuestion, AssessmentAttempt, CandidateProfile, CandidateSubdomainChoice, SavedAnswers } from '@/types';

const TOTAL_QUESTIONS = 5;

export default function AssessmentPage() {
  const router = useRouter();
  const supabase = createClient();
  const [phase, setPhase] = useState<'loading' | 'intro' | 'test' | 'submitted'>('loading');
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [attempt, setAttempt] = useState<AssessmentAttempt | null>(null);
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [answers, setAnswers] = useState<SavedAnswers>({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [roundStartAt, setRoundStartAt] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [error, setError] = useState('');
  const timerRef = useRef<NodeJS.Timeout>();

  const autosave = useCallback(async (qId: string, ans: string | string[], attemptId: string) => {
    await supabase.from('assessment_answers').upsert({
      attempt_id: attemptId,
      question_id: qId,
      answer: ans,
      saved_at: new Date().toISOString(),
    }, { onConflict: 'attempt_id,question_id' });
  }, [supabase]);

  const submit = useCallback(async (auto = false) => {
    if (!attempt) return;
    clearInterval(timerRef.current);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push('/login'); return; }
    const response = await fetch('/api/assessment/submit', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ auto, answers }),
    });
    const result = await response.json();
    if (!response.ok) { setError(result.error ?? 'Unable to submit the assessment.'); return; }
    setPhase('submitted');
  }, [attempt, answers, router, supabase]);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const [{ data: p }, { data: schedule }, { data: existingAttempt }] = await Promise.all([
        supabase.from('candidate_profiles').select('*, domain:domains(*), subdomain:subdomains(*), subdomain_choices:candidate_subdomain_choices(*, subdomain:subdomains(*, domain:domains(*)))').eq('id', user.id).single(),
        supabase.from('recruitment_settings').select('value').eq('key', 'round_0_start_at').maybeSingle(),
        supabase.from('assessment_attempts').select('*').eq('candidate_id', user.id).maybeSingle(),
      ]);
      const scheduleValue = schedule?.value as { at?: string | null } | null;
      setRoundStartAt(scheduleValue?.at ?? null);

      if (!p) { router.push('/profile/complete'); return; }
      setProfile(p);
      if (existingAttempt) setAttempt(existingAttempt);

      if (!p.subdomain_id) { setError('Please select a domain and subdomain first.'); setPhase('intro'); return; }
      if (p.round_0_status === 'submitted' || p.round_0_status === 'qualified' || p.round_0_status === 'not_qualified') {
        setPhase('submitted');
        return;
      }

      if (existingAttempt && existingAttempt.status === 'in_progress') {
        // Load questions for this attempt
        const { data: qs } = await supabase.rpc('get_attempt_questions', { p_attempt_id: existingAttempt.id });
        const safeQuestions = (qs ?? []) as AssessmentQuestion[];
        const ordered = (existingAttempt.question_ids as string[]).map(
          (id: string) => safeQuestions.find((q: AssessmentQuestion) => q.id === id)
        ).filter(Boolean) as AssessmentQuestion[];
        setQuestions(ordered);

        // Load saved answers
        const { data: savedAnswers } = await supabase
          .from('assessment_answers')
          .select('*')
          .eq('attempt_id', existingAttempt.id);
        const ansMap: SavedAnswers = {};
        savedAnswers?.forEach((a) => { ansMap[a.question_id] = a.answer; });
        setAnswers(ansMap);

        const elapsed = Math.floor((Date.now() - new Date(existingAttempt.started_at).getTime()) / 1000);
        const remaining = Math.max(0, existingAttempt.time_limit_seconds - elapsed);
        setTimeLeft(remaining);
        setPhase(remaining > 0 ? 'test' : 'loading');
        if (remaining <= 0) {
          const { data: { session } } = await supabase.auth.getSession();
          const response = session ? await fetch('/api/assessment/submit', {
            method: 'POST',
            headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ auto: true, answers: ansMap }),
          }) : null;
          if (response?.ok) setPhase('submitted');
          else { const result = response ? await response.json() : null; setError(result?.error ?? 'Unable to submit the assessment.'); setPhase('intro'); }
          return;
        }
      } else {
        setPhase('intro');
      }
    };
    load();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  // Timer
  useEffect(() => {
    if (phase !== 'test') return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { clearInterval(timerRef.current); submit(true); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [phase, submit]);

  const startAttempt = async () => {
    if (!tracks.length) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push('/login'); return; }
    const response = await fetch('/api/assessment/start', { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}` } });
    const result = await response.json();
    const newAttempt = result.attempt as AssessmentAttempt | undefined;
    if (!response.ok || !newAttempt) { setError(result.error ?? 'Failed to start'); return; }

    const { data: shuffled, error: questionsError } = await supabase.rpc('get_attempt_questions', { p_attempt_id: newAttempt.id });
    if (questionsError || !shuffled) { setError('Unable to load assessment questions.'); return; }

    setAttempt(newAttempt);
    setQuestions(shuffled as AssessmentQuestion[]);
    setTimeLeft(newAttempt.time_limit_seconds);
    setPhase('test');
  };

  const handleAnswer = (qId: string, value: string | string[]) => {
    setAnswers((prev) => ({ ...prev, [qId]: value }));
    if (attempt) autosave(qId, value, attempt.id);
  };

  const handleMultiSelect = (qId: string, optId: string) => {
    const current = (answers[qId] as string[]) ?? [];
    const updated = current.includes(optId)
      ? current.filter((x) => x !== optId)
      : [...current, optId];
    handleAnswer(qId, updated);
  };

  if (phase === 'loading') return <Spinner />;

  const tracks = technicalAssessmentTracks([...(profile?.subdomain_choices ?? [])]
    .sort((a, b) => a.priority - b.priority)
    .map((choice) => ({
      ...choice,
      domainSlug: choice.subdomain?.domain?.slug ?? '',
    }))) as CandidateSubdomainChoice[];
  const trackCount = tracks.length;
  const roundOpen = Boolean(roundStartAt && now >= new Date(roundStartAt).getTime());

  if (phase === 'submitted') {
    const marksReleased = Boolean(attempt?.results_released_at && attempt.score != null);
    return (
      <div className="flex h-screen items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="mb-4 text-5xl">✅</div>
          <h2 className="mb-2 text-2xl font-bold text-text">{marksReleased ? 'Assessment Result' : 'Assessment Submitted'}</h2>
          {marksReleased ? <div className="mb-6 border border-accent/40 bg-surface p-5"><p className="text-sm text-muted">Your marks</p><p className="mt-2 font-mono text-3xl font-bold text-accent">{attempt?.score} / {attempt?.total_marks ?? '—'}</p></div> : <p className="mb-6 text-muted">Results will be released shortly.</p>}
          <a href="/dashboard" className="inline-block rounded-xl bg-accent px-6 py-3 font-semibold text-bg hover:bg-accent-muted transition">
            Back to Dashboard
          </a>
        </div>
      </div>
    );
  }

  if (phase === 'intro') {
    if (!trackCount) {
      return (
        <div className="mx-auto max-w-2xl p-6">
          <p className="eyebrow">ROUND 1 / TECHNICAL</p>
          <h1 className="mt-3 text-2xl font-bold text-text">No Technical assessment required</h1>
          <p className="mt-3 text-muted">Your selected domains use written Round 1 responses only.</p>
          <a href="/dashboard/round-1" className="action mt-6">Return to Round 1 →</a>
        </div>
      );
    }
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <h1 className="mb-2 text-2xl font-bold text-text">Round 1 — Technical Assessment</h1>
        <p className="mb-6 text-muted">Complete five questions for each selected Technical specialization in one timed assessment.</p>

        {error && <div className="mb-4 rounded-lg border border-error/30 bg-error/10 p-3 text-sm text-error">{error}</div>}

        <div className="rounded-xl border border-border bg-surface p-6 space-y-4 mb-6">
          <div className="flex items-center gap-3"><span className="text-xl">⏱</span><div><p className="font-medium text-text">{25 * trackCount} minutes</p><p className="text-sm text-muted">Each Technical specialization receives 25 minutes.</p></div></div>
          <div className="flex items-center gap-3"><span className="text-xl">📝</span><div><p className="font-medium text-text">{TOTAL_QUESTIONS * trackCount} Questions</p><p className="text-sm text-muted">Five questions from each Technical specialization.</p></div></div>
          <div className="flex items-center gap-3"><span className="text-xl">💾</span><div><p className="font-medium text-text">Auto-saved</p><p className="text-sm text-muted">Answers save automatically. Closing the page won't lose progress.</p></div></div>
          <div className="flex items-center gap-3"><span className="text-xl">🔒</span><div><p className="font-medium text-text">One attempt only</p><p className="text-sm text-muted">You cannot retake the assessment once started.</p></div></div>
        </div>

        {roundOpen ? <button onClick={startAttempt} className="rounded-xl bg-accent px-8 py-3.5 font-semibold text-bg transition hover:bg-accent-muted">Start Technical assessment →</button> : <div className="border border-border bg-surface p-5"><p className="label">ROUND 1 START</p><p className="mt-2 font-mono text-sm text-accent">{roundStartAt ? new Date(roundStartAt).toLocaleString() : 'To be announced'}</p><p className="mt-2 text-xs text-muted">The start button will appear automatically when the round begins.</p></div>}
      </div>
    );
  }

  // Test phase
  const q = questions[currentIdx];
  const answered = Object.keys(answers).length;
  const timerDanger = timeLeft < 180;

  return (
    <div className="flex h-screen flex-col bg-bg">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-surface px-6 py-3">
        <span className="text-sm font-medium text-text">Round 1 · AWS SBG Assessment</span>
        <div className={cn('font-mono text-lg font-bold', timerDanger ? 'text-error animate-pulse' : 'text-accent')}>
          {formatTime(timeLeft)}
        </div>
        <div className="text-sm text-muted">{answered}/{questions.length} answered</div>
      </div>

      {tracks.length > 1 && <div className="flex border-b border-border bg-panel px-4 sm:px-6" role="tablist" aria-label="Assessment subdomains">{tracks.map((track) => {
        const firstQuestion = questions.findIndex((question) => question.subdomain_id === track.subdomain_id);
        const active = q?.subdomain_id === track.subdomain_id;
        const trackQuestions = questions.filter((question) => question.subdomain_id === track.subdomain_id);
        const trackAnswered = trackQuestions.filter((question) => answers[question.id] !== undefined && answers[question.id] !== '').length;
        return <button key={track.subdomain_id} role="tab" aria-selected={active} disabled={firstQuestion < 0} onClick={() => setCurrentIdx(firstQuestion)} className={`border-b-2 px-4 py-3 text-left font-mono text-xs uppercase transition ${active ? 'border-accent text-accent' : 'border-transparent text-muted hover:text-text'}`}><span className="block">{track.subdomain?.name}</span><span className="mt-1 block text-[10px] opacity-70">{trackAnswered}/{trackQuestions.length} answered</span></button>;
      })}</div>}

      <div className="flex flex-1 overflow-hidden">
        {/* Question navigator */}
        <div className="hidden w-48 flex-col gap-1 overflow-auto border-r border-border bg-surface p-4 lg:flex">
          <p className="mb-2 text-xs font-semibold text-muted uppercase tracking-wide">Questions</p>
          {questions.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIdx(i)}
              className={cn(
                'rounded-lg py-2 text-sm font-medium transition',
                i === currentIdx ? 'bg-accent text-bg' :
                answers[questions[i]?.id] ? 'bg-success/20 text-success' :
                'bg-panel text-muted hover:bg-border'
              )}
            >
              Q{i + 1}
            </button>
          ))}
          <button
            onClick={() => submit(false)}
            className="mt-4 rounded-lg bg-error/20 py-2 text-sm font-medium text-error hover:bg-error/30 transition"
          >
            Submit
          </button>
        </div>

        {/* Question body */}
        <div className="flex-1 overflow-auto p-6">
          {q && (
            <div className="max-w-2xl mx-auto">
              <div className="mb-2 flex items-center gap-3">
                <span className="text-xs font-mono text-muted">Q{currentIdx + 1}/{questions.length}</span>
                <span className="rounded-full bg-panel px-2 py-0.5 text-xs text-muted capitalize">{q.difficulty}</span>
              </div>

              <p className="mb-6 text-lg text-text leading-relaxed">{q.question_text}</p>

              {q.question_type === 'mcq' && q.options && (
                <div className="space-y-3">
                  {q.options.map((opt) => (
                    <label key={opt.id} className={cn(
                      'flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition',
                      answers[q.id] === opt.id
                        ? 'border-accent bg-accent/10'
                        : 'border-border bg-surface hover:border-accent/40'
                    )}>
                      <input type="radio" name={q.id} value={opt.id} checked={answers[q.id] === opt.id}
                        onChange={() => handleAnswer(q.id, opt.id)} className="mt-0.5 accent-[#FF9900]" />
                      <span className="text-text">{opt.text}</span>
                    </label>
                  ))}
                </div>
              )}

              {q.question_type === 'multiple_select' && q.options && (
                <div className="space-y-3">
                  <p className="text-sm text-muted mb-2">Select all that apply.</p>
                  {q.options.map((opt) => {
                    const checked = (answers[q.id] as string[] ?? []).includes(opt.id);
                    return (
                      <label key={opt.id} className={cn(
                        'flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition',
                        checked ? 'border-accent bg-accent/10' : 'border-border bg-surface hover:border-accent/40'
                      )}>
                        <input type="checkbox" checked={checked}
                          onChange={() => handleMultiSelect(q.id, opt.id)} className="mt-0.5 accent-[#FF9900]" />
                        <span className="text-text">{opt.text}</span>
                      </label>
                    );
                  })}
                </div>
              )}

              {q.question_type === 'short_answer' && (
                <textarea
                  value={(answers[q.id] as string) ?? ''}
                  onChange={(e) => handleAnswer(q.id, e.target.value)}
                  rows={5}
                  placeholder="Type your answer here…"
                  className="w-full rounded-xl border border-border bg-surface p-4 text-text placeholder-dim focus:border-accent transition resize-none"
                />
              )}

              {/* Navigation */}
              <div className="mt-8 flex items-center justify-between">
                <button
                  onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
                  disabled={currentIdx === 0}
                  className="rounded-lg border border-border px-5 py-2.5 text-sm text-muted disabled:opacity-30 hover:border-muted hover:text-text transition"
                >
                  ← Previous
                </button>
                {currentIdx < questions.length - 1 ? (
                  <button
                    onClick={() => setCurrentIdx((i) => i + 1)}
                    className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-bg hover:bg-accent-muted transition"
                  >
                    Next →
                  </button>
                ) : (
                  <button
                    onClick={() => submit(false)}
                    className="rounded-lg bg-success/80 px-5 py-2.5 text-sm font-medium text-white hover:bg-success transition"
                  >
                    Submit Assessment
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent" />
    </div>
  );
}
