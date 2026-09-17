import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { createClient } from '../lib/supabase.js';
import { cn, formatTime } from '../lib/utils.js';

function CameraPreviewBox({ stream }) {
  const videoRef = useRef(null);
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  if (!stream) return null;

  return (
    <div className="relative mt-4 aspect-video w-full max-w-sm overflow-hidden rounded-xl border border-neutral-700 bg-black">
      <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
      <div className="absolute top-2 left-2 flex items-center gap-1.5 rounded-full bg-black/75 px-2.5 py-1 text-[11px] font-mono text-emerald-400">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
        Camera Verified & Active
      </div>
    </div>
  );
}

function ProctorFloatingBadge({ cameraStream, strikes, maxStrikes = 3, hasScreenShare = false }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream]);

  return (
    <aside
      aria-label="Live proctoring monitor"
      className="fixed bottom-4 right-4 z-40 flex w-48 select-none flex-col overflow-hidden rounded-xl border shadow-2xl transition-all sm:w-56"
      style={{
        borderColor: strikes > 0 ? 'var(--error)' : 'rgba(255,255,255,0.18)',
        background: 'rgba(17, 19, 24, 0.95)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <div className="flex items-center justify-between border-b px-2.5 py-1.5" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
          </span>
          <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-red-400">
            PROCTOR LIVE
          </span>
        </div>
        <span
          className="rounded px-1.5 py-0.5 font-mono text-[10px] font-bold"
          style={{
            background: strikes > 0 ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.06)',
            color: strikes > 0 ? 'var(--error)' : 'var(--muted)',
          }}
        >
          {strikes}/{maxStrikes} Strikes
        </span>
      </div>

      <div className="relative aspect-[4/3] w-full bg-black">
        {cameraStream ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-xs text-neutral-500">
            Camera offline
          </div>
        )}
        <div className="absolute bottom-1.5 left-1.5 rounded bg-black/70 px-1.5 py-0.5 font-mono text-[9px] text-neutral-300">
          {hasScreenShare ? '🖥️ Screen Sharing On' : '📱 Mobile Proctor Active'}
        </div>
      </div>
    </aside>
  );
}

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

  // Proctoring States & Refs
  const cameraStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const [cameraStream, setCameraStream] = useState(null);
  const [screenStream, setScreenStream] = useState(null);
  const [proctorVerified, setProctorVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [strikes, setStrikes] = useState(0);
  const strikesRef = useRef(0);
  const [violationModal, setViolationModal] = useState(null);
  const isMobileDevice = typeof navigator !== 'undefined' && (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    typeof navigator.mediaDevices?.getDisplayMedia !== 'function'
  );

  const stopAllMediaStreams = useCallback(() => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
      setCameraStream(null);
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
      setScreenStream(null);
    }
  }, []);

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
    stopAllMediaStreams();
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    try {
      const payload = await authedFetch('assessment/submit', { subdomainId: trackId, auto, answers });
      // Marks stay hidden until the recruitment team releases them.
      if (payload) { setResult(null); setPhase('submitted'); }
    } catch (err) {
      setError(err.message);
      submittingRef.current = false;
    }
  }, [answers, authedFetch, trackId, stopAllMediaStreams]);

  // Handle anti-cheating violations
  const registerViolation = useCallback((reason) => {
    if (submittingRef.current) return;
    const nextStrikes = strikesRef.current + 1;
    strikesRef.current = nextStrikes;
    setStrikes(nextStrikes);

    if (nextStrikes >= 3) {
      setViolationModal({
        reason,
        strike: nextStrikes,
        isTerminal: true,
      });
      window.setTimeout(() => {
        submit(true);
      }, 2500);
    } else {
      setViolationModal({
        reason,
        strike: nextStrikes,
        isTerminal: false,
      });
    }
  }, [submit]);

  // Request camera and screen share verification
  async function verifyProctoring() {
    setError('');
    setIsVerifying(true);
    try {
      if (!navigator.mediaDevices?.getUserMedia || !navigator.mediaDevices?.getDisplayMedia) {
        throw new Error('Your browser does not support proctoring hardware APIs. Please use Google Chrome, Edge, or Brave on a desktop computer.');
      }

      // 1. Request Webcam
      const cam = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false,
      });
      cameraStreamRef.current = cam;
      setCameraStream(cam);

      // 2. Request Desktop Screen Share
      try {
        const scr = await navigator.mediaDevices.getDisplayMedia({
          video: { displaySurface: 'monitor' },
          audio: false,
        });
        screenStreamRef.current = scr;
        setScreenStream(scr);

        // Detect if user terminates screen share early
        scr.getVideoTracks()[0].onended = () => {
          if (phase === 'test') {
            registerViolation('Screen sharing was stopped. Full desktop sharing is mandatory.');
          } else {
            setProctorVerified(false);
            setError('Screen sharing was ended. Please re-verify to proceed.');
          }
        };
      } catch (scrErr) {
        if (scrErr.name === 'NotAllowedError') {
          throw new Error('Screen sharing permission was declined. Full desktop screen sharing is required.');
        }
        throw scrErr;
      }

      setProctorVerified(true);
    } catch (err) {
      console.error('Proctoring check error:', err);
      stopAllMediaStreams();
      setProctorVerified(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Camera or screen sharing permissions were denied. Both are strictly required for this proctored assessment.');
      } else {
        setError(err.message || 'Unable to access camera or screen. Please check browser permissions.');
      }
    } finally {
      setIsVerifying(false);
    }
  }

  // Initial check on mount
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

      // If attempt is in progress, require re-verifying proctoring hardware before jumping into test
      setPhase('resume');
    })();
  }, [trackId, navigate, supabase, loadQuestions]);

  // Clean up media streams on unmount
  useEffect(() => {
    return () => {
      stopAllMediaStreams();
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, [stopAllMediaStreams]);

  // Anti-cheating listeners during active exam
  useEffect(() => {
    if (phase !== 'test') return undefined;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        registerViolation('Tab switch or window minimization detected.');
      }
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && !submittingRef.current) {
        registerViolation('Exited fullscreen mode. The test must remain in fullscreen.');
      }
    };

    const preventCheatingShortcuts = (e) => {
      if (e.type === 'contextmenu') {
        e.preventDefault();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && ['c', 'v', 'x', 'a', 'u', 'p', 's'].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
      if (e.key === 'F12' || e.key === 'PrintScreen') {
        e.preventDefault();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('contextmenu', preventCheatingShortcuts);
    document.addEventListener('keydown', preventCheatingShortcuts);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('contextmenu', preventCheatingShortcuts);
      document.removeEventListener('keydown', preventCheatingShortcuts);
    };
  }, [phase, registerViolation]);

  // Auto-submit the moment the clock runs out
  useEffect(() => {
    if (phase !== 'test') return undefined;
    if (timeLeft <= 0) { submit(true); return undefined; }
    timerRef.current = window.setInterval(() => setTimeLeft((t) => Math.max(0, t - 1)), 1000);
    return () => window.clearInterval(timerRef.current);
  }, [phase, timeLeft <= 0, submit]);

  async function start() {
    setError('');
    if (!proctorVerified || !cameraStreamRef.current || !screenStreamRef.current) {
      setError('Camera and screen share verification is mandatory before starting.');
      return;
    }
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen().catch(() => {});
      }
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

  async function resumeTest() {
    setError('');
    if (!proctorVerified || !cameraStreamRef.current || !screenStreamRef.current) {
      setError('Camera and screen share verification is mandatory to resume.');
      return;
    }
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen().catch(() => {});
      }
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

  if (isMobileDevice) {
    return (
      <main className="mx-auto max-w-lg p-6 text-center sm:p-10">
        <p className="eyebrow">ROUND 1 / TECHNICAL</p>
        <div
          className="mx-auto my-6 flex h-20 w-20 items-center justify-center rounded-2xl border text-4xl shadow-xl"
          style={{ borderColor: 'rgba(255,153,0,0.3)', background: 'rgba(255,153,0,0.1)' }}
        >
          💻
        </div>
        <h1 className="text-2xl font-bold sm:text-3xl">Please take this exam on a laptop or desktop</h1>
        <p className="mt-4 text-sm leading-6 text-neutral-300">
          This assessment requires webcam proctoring and full-screen sharing, which is not supported on mobile devices.
        </p>
        <p className="mt-3 text-sm font-semibold text-amber-400">
          Please log in and attempt this examination using a laptop or desktop computer.
        </p>

        <div className="mt-8 flex justify-center">
          <Link to="/recruitment/dashboard/round-1" className="action">
            Back to Dashboard
          </Link>
        </div>
      </main>
    );
  }

  if (phase === 'intro' || phase === 'resume') {
    const isResuming = phase === 'resume';
    return (
      <main className="mx-auto max-w-2xl p-6 sm:p-10">
        <p className="eyebrow">ROUND 1 / TECHNICAL</p>
        <h1 className="mt-3 text-3xl font-bold">
          {isResuming ? `Resume ${trackName} Assessment` : `${trackName} assessment`}
        </h1>
        <p className="mt-3 text-sm leading-6" style={{ color: 'var(--muted)' }}>
          {isResuming
            ? 'You have an assessment session in progress. Please re-verify your camera and screen sharing to resume.'
            : `10 questions, 10 minutes, for ${trackName} only. Answers save automatically and the paper submits itself when the timer ends.`}
        </p>

        {/* Proctoring Verification Card */}
        <div
          className="mt-6 rounded-xl border p-5 sm:p-6"
          style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
        >
          <div className="flex items-center justify-between">
            <span className="eyebrow !text-red-400">PROCTORING REQUIREMENTS</span>
            <span
              className="font-mono text-xs font-semibold px-2 py-0.5 rounded"
              style={{
                background: proctorVerified ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                color: proctorVerified ? 'var(--success)' : 'var(--error)',
              }}
            >
              {proctorVerified ? '✓ VERIFIED READY' : '● ACTION REQUIRED'}
            </span>
          </div>

          <div className="mt-4 space-y-2.5 text-xs text-neutral-300">
            <div className="flex items-start gap-2.5">
              <span className="text-base leading-none">📹</span>
              <div>
                <strong className="text-white">Webcam Feed:</strong> Your camera must remain turned on and your face visible throughout the assessment.
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="text-base leading-none">🖥️</span>
              <div>
                <strong className="text-white">Full Screen Share:</strong> When prompted, choose <em>Entire Screen</em> (not a single window or tab).
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="text-base leading-none">⚠️</span>
              <div>
                <strong className="text-white">Anti-Cheating Policy:</strong> Navigating away from this tab, switching windows, exiting fullscreen, or disconnecting screen share logs a <strong>Strike</strong>. Reaching 3 strikes will automatically submit your exam.
              </div>
            </div>
          </div>

          {cameraStream && <CameraPreviewBox stream={cameraStream} />}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            {!proctorVerified ? (
              <button
                type="button"
                onClick={verifyProctoring}
                disabled={isVerifying}
                className="action"
              >
                {isVerifying ? 'Requesting Permissions...' : '📹 Grant Camera & Screen Share'}
              </button>
            ) : (
              <button
                type="button"
                onClick={isResuming ? resumeTest : start}
                className="action !bg-emerald-500 hover:!bg-emerald-600"
              >
                {isResuming ? 'Enter Fullscreen & Resume Assessment →' : `Enter Fullscreen & Start ${trackName} →`}
              </button>
            )}
            <Link to="/recruitment/dashboard/round-1" className="action-secondary">Back to Round 1</Link>
          </div>
        </div>

        {error && (
          <p role="alert" className="mt-6 border p-4 text-sm" style={{ borderColor: 'rgba(239,68,68,.5)', background: 'rgba(239,68,68,.1)', color: 'var(--error)' }}>
            {error}
          </p>
        )}
      </main>
    );
  }

  const question = questions[currentIdx];
  const answered = questions.filter((q) => {
    const value = answers[q.id];
    return Array.isArray(value) ? value.length > 0 : Boolean(value);
  }).length;

  return (
    <div className="flex min-h-screen select-none flex-col" style={{ background: 'var(--bg)' }}>
      {/* Floating Proctor Camera Widget */}
      <ProctorFloatingBadge cameraStream={cameraStream} strikes={strikes} hasScreenShare={Boolean(screenStream)} />

      {/* Proctoring Violation Warning Modal */}
      {violationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
          <div
            className="w-full max-w-md rounded-2xl border p-6 text-center shadow-2xl"
            style={{ borderColor: 'var(--error)', background: 'var(--surface)' }}
          >
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 text-3xl">
              ⚠️
            </div>
            <h3 className="text-xl font-bold text-red-400">
              {violationModal.isTerminal ? 'Assessment Auto-Submitting' : 'Proctoring Violation Warning'}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-neutral-300">
              {violationModal.reason}
            </p>

            <div className="my-5 rounded-lg border border-red-500/30 bg-red-500/10 p-3">
              <p className="font-mono text-xs uppercase tracking-wider text-red-300">
                Strike {violationModal.strike} of 3
              </p>
              <p className="mt-1 text-xs text-neutral-400">
                {violationModal.isTerminal
                  ? 'Maximum strikes exceeded. Your exam has been flagged and submitted for review.'
                  : 'Navigating away, switching tabs, or exiting fullscreen invalidates your attempt.'}
              </p>
            </div>

            {!violationModal.isTerminal ? (
              <button
                type="button"
                onClick={async () => {
                  setViolationModal(null);
                  if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
                    await document.documentElement.requestFullscreen().catch(() => {});
                  }
                }}
                className="action w-full justify-center !min-h-11"
              >
                Return to Fullscreen & Resume
              </button>
            ) : (
              <p className="font-mono text-xs text-neutral-400 animate-pulse">
                Submitting assessment...
              </p>
            )}
          </div>
        </div>
      )}

      <header className="flex items-center justify-between border-b px-5 py-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">Round 1 · {trackName}</span>
          <span className="flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[10px] font-mono font-semibold text-red-400">
            <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" />
            PROCTORED
          </span>
        </div>
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
                  placeholder="Type your answer here…" className="field mt-6 resize-y select-text" />
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
