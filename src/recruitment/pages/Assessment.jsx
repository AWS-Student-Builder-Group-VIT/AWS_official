import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { createClient } from '../lib/supabase.js';
import { cn, formatTime } from '../lib/utils.js';

export default function Assessment() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // Each Technical specialisation is its own timed paper.
  const trackId = searchParams.get('track');
  const [supabase] = useState(createClient);
  const [phase, setPhase] = useState('loading');
  const [attempt, setAttempt] = useState(null);
  const [trackName, setTrackName] = useState('');
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const timerRef = useRef(null);
  const submittingRef = useRef(false);

  const authedFetch = useCallback(async (path, body) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate('/recruitment/login', { replace: true }); return null; }
    const response = await fetch(`/api/recruitment/${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body ?? {}),
    });
    // A missing route or crashed function replies with HTML, not JSON.
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error ?? `Request failed (HTTP ${response.status}).`);
    return payload;
  }, [supabase, navigate]);

  const loadQuestions = useCallback(async (activeAttempt) => {
    const { data, error: rpcError } = await supabase.rpc('get_attempt_questions', { p_attempt_id: activeAttempt.id });
    if (rpcError) throw new Error(rpcError.message);
    const byId = new Map((data ?? []).map((q) => [q.id, q]));
    return (activeAttempt.question_ids ?? []).map((id) => byId.get(id)).filter(Boolean);
  }, [supabase]);

  const submit = useCallback(async (auto = false) => {
    if (submittingRef.current || !trackId) return;
    submittingRef.current = true;
    window.clearInterval(timerRef.current);
    try {
      const payload = await authedFetch('assessment/submit', { subdomainId: trackId, auto, answers });
      // Marks stay hidden until the recruitment team releases them.
      if (payload) { setResult(null); setPhase('submitted'); }
    } catch (err) {
      setError(err.message);
      submittingRef.current = false;
    }
  }, [answers, authedFetch, trackId]);

  useEffect(() => {
    (async () => {
      if (!trackId) { navigate('/recruitment/dashboard/round-1', { replace: true }); return; }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/recruitment/login', { replace: true }); return; }

      const { data: sub } = await supabase.from('subdomains').select('name').eq('id', trackId).maybeSingle();
      setTrackName(sub?.name ?? 'Technical');

      const { data: existing } = await supabase.from('assessment_attempts')
        .select('*').eq('candidate_id', user.id).eq('subdomain_id', trackId).maybeSingle();
      if (!existing) { setPhase('intro'); return; }
      setAttempt(existing);
      if (existing.status !== 'in_progress') {
        const isReleased = existing.results_released_at != null;
        setPhase('submitted');
        setResult(isReleased ? { score: existing.score, totalMarks: existing.total_marks, releasedAt: existing.results_released_at } : null);
        return;
      }

      try {
        setQuestions(await loadQuestions(existing));
      } catch (err) {
        setError(err.message); setPhase('intro'); return;
      }
      const { data: saved } = await supabase.from('assessment_answers').select('question_id,answer').eq('attempt_id', existing.id);
      setAnswers(Object.fromEntries((saved ?? []).map((row) => [row.question_id, row.answer])));

      const elapsed = Math.floor((Date.now() - new Date(existing.started_at).getTime()) / 1000);
      setTimeLeft(Math.max(0, existing.time_limit_seconds - elapsed));
      setPhase('test');
    })();
  }, [trackId]);

  // Auto-submit the moment the clock runs out.
  useEffect(() => {
    if (phase !== 'test') return undefined;
    if (timeLeft <= 0) { submit(true); return undefined; }
    timerRef.current = window.setInterval(() => setTimeLeft((t) => Math.max(0, t - 1)), 1000);
    return () => window.clearInterval(timerRef.current);
  }, [phase, timeLeft <= 0, submit]);

  async function start() {
    setError('');
    try {
      const payload = await authedFetch('assessment/start', { subdomainId: trackId });
      if (!payload) return;
      setAttempt(payload.attempt);
      if (payload.track?.name) setTrackName(payload.track.name);
      setQuestions(await loadQuestions(payload.attempt));
      setTimeLeft(payload.attempt.time_limit_seconds);
      setPhase('test');
    } catch (err) {
      setError(err.message);
    }
  }

  function answerQuestion(questionId, value) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    if (attempt) {
      // Autosave so a closed tab never loses progress.
      supabase.from('assessment_answers').upsert(
        { attempt_id: attempt.id, question_id: questionId, answer: value, saved_at: new Date().toISOString() },
        { onConflict: 'attempt_id,question_id' },
      ).then(() => {});
    }
  }

  function toggleMulti(questionId, optionId) {
    const current = Array.isArray(answers[questionId]) ? answers[questionId] : [];
    answerQuestion(questionId, current.includes(optionId) ? current.filter((id) => id !== optionId) : [...current, optionId]);
  }

  if (phase === 'loading') {
    return <main className="grid min-h-[60vh] place-items-center"><div className="h-8 w-8 animate-spin rounded-full border-2" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} /></main>;
  }

  if (phase === 'submitted') {
    const released = result?.score != null && result?.totalMarks != null;
    return (
      <main className="mx-auto max-w-xl p-6 text-center sm:p-10">
        <p className="eyebrow">ROUND 1 / {trackName.toUpperCase()}</p>
        <h1 className="mt-4 text-3xl font-bold">{released ? 'Assessment Results' : 'Thank You!'}</h1>
        {released ? (
          <div className="mt-6 rounded-xl border p-6" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
            <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Official Marks</p>
            <p className="mt-2 font-mono text-4xl font-bold" style={{ color: 'var(--accent)' }}>
              {result.score} <span className="text-xl font-normal" style={{ color: 'var(--muted)' }}>/ {result.totalMarks} marks</span>
            </p>
            <p className="mt-3 text-xs" style={{ color: 'var(--dim)' }}>
              Official marks released by the recruitment team
            </p>
          </div>
        ) : (
          <div className="mt-6 rounded-xl border p-6" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
            <p className="text-base font-semibold" style={{ color: 'var(--text)' }}>
              Thank you for completing the {trackName} assessment!
            </p>
            <p className="mt-3 text-sm leading-6" style={{ color: 'var(--muted)' }}>
              Your responses have been recorded and submitted successfully. Your score and review will appear here once marks are released by the recruitment team.
            </p>
          </div>
        )}
        <p className="mt-4 text-sm" style={{ color: 'var(--muted)' }}>Your other tracks are unaffected and can be taken separately.</p>
        <Link to="/recruitment/dashboard/round-1" className="action mt-8 inline-flex">Back to Round 1 →</Link>
      </main>
    );
  }

  if (phase === 'intro') {
    return (
      <main className="mx-auto max-w-2xl p-6 sm:p-10">
        <p className="eyebrow">ROUND 1 / TECHNICAL</p>
        <h1 className="mt-4 text-3xl font-bold">{trackName} assessment</h1>
        <p className="mt-4 text-sm leading-6" style={{ color: 'var(--muted)' }}>
          10 questions, 10 minutes, for {trackName} only. Answers save automatically and the paper submits itself when the
          timer ends. One attempt per specialisation — your other tracks stay untouched.
        </p>
        {error && <p role="alert" className="mt-6 border p-4 text-sm" style={{ borderColor: 'rgba(239,68,68,.5)', background: 'rgba(239,68,68,.1)', color: 'var(--error)' }}>{error}</p>}
        <div className="mt-8 flex flex-wrap gap-3">
          <button type="button" onClick={start} className="action">Start {trackName} assessment →</button>
          <Link to="/recruitment/dashboard/round-1" className="action-secondary">Back to Round 1</Link>
        </div>
      </main>
    );
  }

  const question = questions[currentIdx];
  const answered = questions.filter((q) => {
    const value = answers[q.id];
    return Array.isArray(value) ? value.length > 0 : Boolean(value);
  }).length;

  return (
    <div className="flex min-h-screen flex-col" style={{ background: 'var(--bg)' }}>
      <header className="flex items-center justify-between border-b px-5 py-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <span className="text-sm font-medium">Round 1 · {trackName}</span>
        <span className={cn('font-mono text-lg font-bold', timeLeft < 60 && 'animate-pulse')} style={{ color: timeLeft < 60 ? 'var(--error)' : 'var(--accent)' }}>{formatTime(timeLeft)}</span>
        <span className="text-sm" style={{ color: 'var(--muted)' }}>{answered}/{questions.length} answered</span>
      </header>

      {error && <p role="alert" className="border-b p-4 text-sm" style={{ borderColor: 'rgba(239,68,68,.5)', background: 'rgba(239,68,68,.1)', color: 'var(--error)' }}>{error}</p>}

      <div className="flex flex-1">
        <nav className="hidden w-44 flex-col gap-1 border-r p-4 lg:flex" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          <p className="label mb-2">Questions</p>
          <div className="grid grid-cols-4 gap-1.5">
            {questions.map((q, index) => {
              const value = answers[q.id];
              const done = Array.isArray(value) ? value.length > 0 : Boolean(value);
              return (
                <button key={q.id} type="button" onClick={() => setCurrentIdx(index)}
                  className="rounded py-1.5 text-xs font-medium transition"
                  style={{
                    background: index === currentIdx ? 'var(--accent)' : done ? 'rgba(34,197,94,.2)' : 'transparent',
                    color: index === currentIdx ? 'var(--bg)' : done ? 'var(--success)' : 'var(--muted)',
                    border: '1px solid var(--border)',
                  }}>{index + 1}</button>
              );
            })}
          </div>
          <button type="button" onClick={() => submit(false)} className="action mt-5 !min-h-10 justify-center">Submit</button>
        </nav>

        <main className="flex-1 overflow-auto p-5 sm:p-8">
          {question && (
            <div className="mx-auto max-w-2xl">
              <p className="font-mono text-xs" style={{ color: 'var(--muted)' }}>Q{currentIdx + 1}/{questions.length} · {question.marks ?? 1} mark(s)</p>
              <p className="mt-3 text-lg leading-relaxed">{question.question_text}</p>

              {question.question_type === 'mcq' && (
                <div className="mt-6 space-y-3">
                  {(question.options ?? []).map((option) => (
                    <label key={option.id} className="flex cursor-pointer items-start gap-3 border p-4 transition"
                      style={{ borderColor: answers[question.id] === option.id ? 'var(--accent)' : 'var(--border)', background: answers[question.id] === option.id ? 'rgba(255,153,0,.1)' : 'var(--surface)' }}>
                      <input type="radio" name={question.id} checked={answers[question.id] === option.id}
                        onChange={() => answerQuestion(question.id, option.id)} className="mt-0.5 accent-[#FF9900]" />
                      <span>{option.text}</span>
                    </label>
                  ))}
                </div>
              )}

              {question.question_type === 'multiple_select' && (
                <div className="mt-6 space-y-3">
                  <p className="text-sm" style={{ color: 'var(--muted)' }}>Select all that apply.</p>
                  {(question.options ?? []).map((option) => {
                    const checked = Array.isArray(answers[question.id]) && answers[question.id].includes(option.id);
                    return (
                      <label key={option.id} className="flex cursor-pointer items-start gap-3 border p-4 transition"
                        style={{ borderColor: checked ? 'var(--accent)' : 'var(--border)', background: checked ? 'rgba(255,153,0,.1)' : 'var(--surface)' }}>
                        <input type="checkbox" checked={checked} onChange={() => toggleMulti(question.id, option.id)} className="mt-0.5 accent-[#FF9900]" />
                        <span>{option.text}</span>
                      </label>
                    );
                  })}
                </div>
              )}

              {(question.question_type === 'short_answer' || question.question_type === 'code' || question.question_type === 'scenario') && (
                <textarea rows={6} value={typeof answers[question.id] === 'string' ? answers[question.id] : ''}
                  onChange={(event) => answerQuestion(question.id, event.target.value)}
                  placeholder="Type your answer here…" className="field mt-6 resize-y" />
              )}

              <div className="mt-8 flex items-center justify-between gap-3">
                <button type="button" onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))} disabled={currentIdx === 0} className="action-secondary disabled:opacity-40">← Previous</button>
                {currentIdx < questions.length - 1
                  ? <button type="button" onClick={() => setCurrentIdx((i) => i + 1)} className="action">Next →</button>
                  : <button type="button" onClick={() => submit(false)} className="action">Submit {trackName}</button>}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
