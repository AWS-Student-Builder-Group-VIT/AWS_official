import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import awsIcon from '../assets/aws_icon.jpeg';
import { CASE_STUDIES, CASE_STUDY_QUESTIONS } from '../data/quizData';
import { isLoggedIn, getUser, submitScore, fetchMyScores, fetchQuizStatus } from '../utils/auth';
import useScreenshotProtection from '../utils/useScreenshotProtection';

export default function CaseStudyQuiz() {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const movingTimer = useRef(null);

  const meta = CASE_STUDIES.find(c => c.id === caseId);
  const bank = CASE_STUDY_QUESTIONS[caseId];

  const [phase, setPhase] = useState('intro');   // intro | quiz | results
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [isEnteringRoom, setIsEnteringRoom] = useState(false);
  const [quizStartTime, setQuizStartTime] = useState(null);
  const [isMoving, setIsMoving] = useState(false);
  const [scoreSaved, setScoreSaved] = useState(false);
  const [gridState, setGridState] = useState({ x: 0, y: 0, size: 1, isVisible: false });
  const [pastAttempt, setPastAttempt] = useState(null);
  const [scoresLoading, setScoresLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(60);
  const [globalStatus, setGlobalStatus] = useState('active');

  // Screenshot protection — active during quiz and results phases
  const isProtectionActive = phase === 'quiz' || phase === 'results' || phase === 'eliminated';
  const user = getUser();
  const watermarkLabel = user ? `${user.firstName || ''} ${user.lastName || ''} • ${user.email || ''}`.trim() : '';
  const { isBlurred } = useScreenshotProtection(isProtectionActive, watermarkLabel);

  // Auth gate
  useEffect(() => {
    if (!isLoggedIn()) {
      window.dispatchEvent(new Event('open-login-modal'));
      navigate('/');
    } else {
      Promise.all([fetchMyScores(), fetchQuizStatus()]).then(([scores, status]) => {
        const attempt = scores.find(s => s.quiz_id === caseId);
        if (attempt) setPastAttempt(attempt);
        setGlobalStatus(status);
        setScoresLoading(false);
      }).catch(() => setScoresLoading(false));
    }
  }, [navigate, caseId]);

  // Poll quiz status every 5s
  useEffect(() => {
    if (phase === 'results') return; // No need to poll if finished
    const interval = setInterval(async () => {
      const status = await fetchQuizStatus();
      setGlobalStatus(status);

      if (phase === 'quiz' && status === 'inactive') {
        clearInterval(interval);
        alert("Case study is currently on hold by AWS. Your progress so far has been saved.");
        const totalTimeTaken = quizStartTime ? Math.floor((Date.now() - quizStartTime) / 1000) : 0;
        submitScore({
          quizId: caseId,
          quizTitle: meta.title,
          quizType: 'case_study',
          score: score,
          total: bank.questions.length,
          timeTaken: totalTimeTaken
        }).then(() => setPhase('results'));
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [phase, score, bank?.questions?.length, meta, caseId]);

  useEffect(() => {
    if (phase !== 'quiz' || selected !== null) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleTimeOut();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [phase, selected, currentIdx]);

  function handleTimeOut() {
    setSelected(-1);
    setShowExplanation(true);
    setAnswers(prev => [...prev, false]);
  }

  if (!meta || !bank) {
    return (
      <div className="min-h-screen bg-[#0A0C10] flex items-center justify-center">
        <div className="text-center font-mono">
          <div className="text-[#FF9900] text-2xl mb-4">Case study not found</div>
          <button onClick={() => navigate('/quiz')} className="text-[#dbc2ad] border border-white/10 px-4 py-2 text-sm uppercase tracking-widest">← Back to Hub</button>
        </div>
      </div>
    );
  }

  const questions = bank.questions;
  const q = questions[currentIdx];
  const progress = (currentIdx / questions.length) * 100;
  const pct = questions.length ? Math.round((score / questions.length) * 100) : 0;
  const scoreMsg = pct === 100 ? '🏆 Perfect Score!' : pct >= 67 ? '⚡ Well done!' : '🔄 Review the scenario';

  const handleMouseMove = (e) => {
    if (window.innerWidth < 768 || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const sx = Math.floor((e.clientX - rect.left) / 80) * 80;
    const sy = Math.floor((e.clientY - rect.top) / 80) * 80;
    if (!gridState.isVisible || sx !== gridState.x || sy !== gridState.y) {
      const sizes = [1, 2, 4];
      setGridState({ x: sx, y: sy, size: sizes[Math.floor(Math.random() * sizes.length)], isVisible: true });
    }
  };

  function triggerMove() {
    clearTimeout(movingTimer.current);
    setIsMoving(true);
    movingTimer.current = setTimeout(() => setIsMoving(false), 650);
  }

  function handleSelect(idx) {
    if (selected !== null) return;
    setSelected(idx);
    setShowExplanation(true);
    const isCorrect = idx === q.correct;
    setAnswers(prev => [...prev, isCorrect]);
    if (isCorrect) {
      setScore(s => s + 1);
    } else {
      setWrongCount(w => w + 1);
    }
  }

  function handleNext() {
    if (wrongCount >= 2) {
      const totalTimeTaken = quizStartTime ? Math.floor((Date.now() - quizStartTime) / 1000) : 0;
      submitScore({
        quizId: caseId,
        quizTitle: meta.title,
        quizType: 'case_study',
        score,
        total: questions.length,
        timeTaken: totalTimeTaken
      }).then(res => setScoreSaved(res.ok));
      setPhase('eliminated');
      return;
    }

    if (currentIdx + 1 >= questions.length) {
      const totalTimeTaken = quizStartTime ? Math.floor((Date.now() - quizStartTime) / 1000) : 0;
      submitScore({
        quizId: caseId,
        quizTitle: meta.title,
        quizType: 'case_study',
        score,
        total: questions.length,
        timeTaken: totalTimeTaken
      }).then(res => setScoreSaved(res.ok));
      setPhase('results');
    } else {
      setIsEnteringRoom(true);
      setTimeout(() => {
        setCurrentIdx(i => i + 1);
        setSelected(null);
        setShowExplanation(false);
        setTimeLeft(60);
        setIsEnteringRoom(false);
      }, 1500);
    }
  }



  function optionStyle(idx) {
    if (selected === null) return { border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)' };
    if (idx === q.correct) return { border: '1px solid #639922', background: 'rgba(99,153,34,0.18)', color: '#a8e063' };
    if (idx === selected && idx !== q.correct) return { border: '1px solid #E24B4A', background: 'rgba(226,75,74,0.18)', color: '#f87171' };
    return { border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)', opacity: 0.45 };
  }

  function letterBadgeStyle(idx) {
    if (selected === null) return { background: 'rgba(255,255,255,0.08)', color: '#dbc2ad' };
    if (idx === q.correct) return { background: '#639922', color: '#fff' };
    if (idx === selected && idx !== q.correct) return { background: '#E24B4A', color: '#fff' };
    return { background: 'rgba(255,255,255,0.06)', color: '#dbc2ad' };
  }

  const GridBg = () => (
    <div className="fixed inset-0 z-0 pointer-events-none"
      style={{ backgroundImage: 'linear-gradient(to right,rgba(255,255,255,0.05) 1px,transparent 1px),linear-gradient(to bottom,rgba(255,255,255,0.05) 1px,transparent 1px)', backgroundSize: '80px 80px' }} />
  );

  const Navbar = ({ subtitle }) => (
    <nav className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#0A0C10]/80 backdrop-blur-xl flex-shrink-0">
      <div className="flex items-center gap-3">
        <img src={awsIcon} alt="AWS" className="w-7 h-7 rounded-full object-cover" />
        <span className="font-mono text-sm text-[#dbc2ad] tracking-widest uppercase truncate max-w-[200px] md:max-w-none">{subtitle}</span>
      </div>
      <button onClick={() => navigate('/quiz')}
        className="font-mono text-xs text-[#dbc2ad] border border-white/10 px-4 py-2 hover:border-[#FF9900]/50 hover:text-[#FF9900] transition-all uppercase tracking-widest flex-shrink-0">
        ← All Tests
      </button>
    </nav>
  );

  // ── INTRO ─────────────────────────────────────────────────
  if (phase === 'intro') {
    return (
      <div className="min-h-screen bg-[#0A0C10] text-[#f1dfd1] flex flex-col relative overflow-hidden"
        onMouseMove={handleMouseMove} onMouseLeave={() => setGridState(s => ({ ...s, isVisible: false }))}>
        <GridBg />
        <Navbar subtitle="Case Study" />
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-12">
          <div className="max-w-2xl w-full">

            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              {meta.tags.map(t => (
                <span key={t} className="font-mono text-[9px] text-[#FF9900] border border-[#FF9900]/30 px-2 py-0.5 uppercase tracking-widest">{t}</span>
              ))}
            </div>
            <h1 className="font-mono text-2xl md:text-3xl font-bold text-white tracking-widest mb-2">{meta.title}</h1>
            <p className="font-mono text-xs text-[#dbc2ad] mb-8">{meta.subtitle}</p>

            {/* Scenario card */}
            <div className="border border-[#FF9900]/30 bg-[#FF9900]/5 p-5 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1.5 h-1.5 rounded-full bg-[#FF9900]" />
                <span className="font-mono text-[10px] text-[#FF9900] uppercase tracking-widest">Scenario</span>
              </div>
              <p className="font-mono text-xs text-[#dbc2ad] leading-[1.8] whitespace-pre-line">{bank.scenario}</p>
            </div>

            {/* Meta stats */}
            <div className="grid grid-cols-3 gap-3 mb-8">
              {[['Questions', meta.questions], ['Duration', meta.duration], ['Type', 'Case Study']].map(([l, v]) => (
                <div key={l} className="border border-white/10 bg-white/2 p-3 text-center">
                  <div className="font-mono text-lg font-bold text-[#FF9900]">{v}</div>
                  <div className="font-mono text-[9px] text-[#dbc2ad] uppercase tracking-widest mt-0.5">{l}</div>
                </div>
              ))}
            </div>

            {scoresLoading ? (
              <button disabled
                className="w-full bg-white/5 text-[#dbc2ad]/50 border border-white/10 font-mono text-sm px-8 py-4 uppercase tracking-widest flex items-center justify-center gap-2 cursor-not-allowed">
                <span className="material-symbols-outlined text-base animate-spin" style={{animationDuration:'1.2s'}}>autorenew</span>
                CHECKING STATUS...
              </button>
            ) : !pastAttempt ? (
              globalStatus === 'inactive' ? (
                <button disabled
                  className="w-full bg-[#E24B4A]/10 text-[#E24B4A] border border-[#E24B4A]/30 font-mono text-sm font-bold px-8 py-4 uppercase tracking-widest flex items-center justify-center gap-2 cursor-not-allowed">
                  CASE STUDY ON HOLD BY AWS — WAIT FOR START
                  <span className="material-symbols-outlined text-base">pause_circle</span>
                </button>
              ) : (
                  <button
                  onClick={() => { setPhase('quiz'); setTimeLeft(60); setQuizStartTime(Date.now()); }}
                  className="w-full bg-[#FF9900] text-[#111] font-mono text-sm font-bold px-8 py-4 hover:bg-[#ffc082] transition-colors uppercase tracking-widest flex items-center justify-center gap-2">
                  Start Escape Room
                  <span className="material-symbols-outlined text-base">login</span>
                </button>
              )
            ) : (
              <button onClick={() => { setScore(pastAttempt.score); setPhase('results'); }}
                className="w-full bg-white/10 text-white border border-white/20 font-mono text-sm font-bold px-8 py-4 hover:bg-white/20 transition-colors uppercase tracking-widest flex items-center justify-center gap-2">
                SHOW RESULTS (ALREADY ATTEMPTED)
                <span className="material-symbols-outlined text-base">visibility</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── RESULTS & ELIMINATED ────────────────────────────────
  if (phase === 'results' || phase === 'eliminated') {
    const isEliminated = phase === 'eliminated';
    const totalQuestions = pastAttempt && (phase === 'results' || phase === 'eliminated') ? pastAttempt.total : questions.length;
    let displayPct = 0;
    
    if (pastAttempt && pastAttempt.composite_score !== undefined && pastAttempt.composite_score !== null) {
      displayPct = pastAttempt.composite_score;
    } else if (pastAttempt) {
      displayPct = pastAttempt.pct || 0;
    } else if (!isEliminated) {
      const totalTimeTaken = quizStartTime ? Math.floor((Date.now() - quizStartTime) / 1000) : 0;
      const maxTime = totalQuestions * 60;
      const accuracyComponent = (score / totalQuestions) * 100 * 0.7;
      let timeComponent = 0;
      if (totalTimeTaken < maxTime) {
        timeComponent = (1 - (totalTimeTaken / maxTime)) * 100 * 0.3;
      }
      displayPct = Math.min(100, Math.max(0, accuracyComponent + timeComponent)).toFixed(2);
    }
    
    const accuracyPct = totalQuestions ? Math.round((score / totalQuestions) * 100) : 0;
    const scoreMsg = isEliminated ? '💀 SYSTEM FAILURE - ELIMINATED' : displayPct >= 90 ? '🏆 Master Architect!' : displayPct >= 70 ? '⚡ Well done!' : '🔄 Review the scenario';
    const themeColor = isEliminated ? '#E24B4A' : '#FF9900';
    const timeToDisplay = pastAttempt && pastAttempt.time_taken !== undefined && pastAttempt.time_taken !== null 
      ? pastAttempt.time_taken 
      : (quizStartTime ? Math.floor((Date.now() - quizStartTime) / 1000) : 0);

    return (
      <div className="min-h-screen bg-[#0A0C10] text-[#f1dfd1] flex flex-col relative overflow-hidden"
        onMouseMove={handleMouseMove} onMouseLeave={() => setGridState(s => ({ ...s, isVisible: false }))}>
        <GridBg />
        <Navbar subtitle={isEliminated ? "Mission Failed" : "Escape Successful"} />
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-12">
          <div className="max-w-lg w-full">

            {isEliminated && (
              <div className="border border-[#E24B4A]/30 bg-[#E24B4A]/10 p-6 mb-6 text-center animate-pulse">
                <span className="material-symbols-outlined text-4xl text-[#E24B4A] mb-2">warning</span>
                <h2 className="font-mono text-xl font-bold text-[#E24B4A] tracking-widest uppercase">Too Many Errors</h2>
                <p className="font-mono text-xs text-[#E24B4A]/80 mt-2">You made 2 incorrect decisions. The architecture has collapsed.</p>
              </div>
            )}

            <div className="border border-white/10 bg-white/3 p-6 mb-4 flex items-center gap-6">
              <div className="relative flex-shrink-0">
                <svg width="90" height="90" viewBox="0 0 90 90">
                  <circle cx="45" cy="45" r="38" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
                  <circle cx="45" cy="45" r="38" fill="none" stroke={themeColor} strokeWidth="6"
                    strokeDasharray={`${2 * Math.PI * 38}`}
                    strokeDashoffset={`${2 * Math.PI * 38 * (1 - (isEliminated ? accuracyPct : displayPct) / 100)}`}
                    strokeLinecap="round" transform="rotate(-90 45 45)"
                    style={{ transition: 'stroke-dashoffset 1s ease-out' }} />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center font-mono text-sm font-bold text-white">{score}/{totalQuestions}</span>
              </div>
              <div>
                <div className="font-mono text-4xl font-bold" style={{ color: themeColor }}>
                  {isEliminated ? '0.00' : displayPct} <span className="text-xl">pts</span>
                </div>
                <div className="font-mono text-xs text-[#dbc2ad] mt-1">Composite Score</div>
                <div className="font-mono text-sm mt-2" style={{ color: themeColor }}>{scoreMsg}</div>
                <div className="font-mono text-[10px] text-[#dbc2ad]/60 mt-1 uppercase tracking-widest">{meta.title}</div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3 mb-4">
              {[
                { label: 'Accuracy', val: `${accuracyPct}%`, color: '#a8e063', bg: 'rgba(99,153,34,0.12)', border: '#639922' },
                { label: 'Time (s)', val: timeToDisplay, color: '#00a8e0', bg: 'rgba(0,168,224,0.12)', border: '#00a8e0' },
                { label: 'Wrong', val: totalQuestions - score, color: '#f87171', bg: 'rgba(226,75,74,0.12)', border: '#E24B4A' },
                { label: 'Total Qs', val: totalQuestions, color: '#f1dfd1', bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.12)' },
              ].map(s => (
                <div key={s.label} className="p-3 text-center" style={{ border: `1px solid ${s.border}`, background: s.bg }}>
                  <div className="font-mono text-[10px] text-[#dbc2ad] uppercase tracking-widest mb-1 truncate">{s.label}</div>
                  <div className="font-mono text-xl font-bold" style={{ color: s.color }}>{s.val}</div>
                </div>
              ))}
            </div>

            {answers.length > 0 && (
              <div className="border border-white/10 bg-white/3 p-4 mb-4">
                <div className="font-mono text-[10px] text-[#dbc2ad] uppercase tracking-widest mb-3">Answer Trail</div>
                <div className="flex gap-2">
                  {answers.map((correct, i) => (
                    <div key={i} className="flex-1 h-2.5 rounded-sm" style={{ background: correct ? '#639922' : '#E24B4A' }} />
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3">
              <button onClick={() => navigate('/quiz')}
                className="bg-[#FF9900] text-[#111] font-mono text-xs py-3 hover:bg-[#ffc082] transition-colors uppercase tracking-widest font-bold flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-sm">grid_view</span>All Tests
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── QUIZ ──────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0A0C10] text-[#f1dfd1] flex flex-col relative overflow-hidden"
      onMouseMove={handleMouseMove} onMouseLeave={() => setGridState(s => ({ ...s, isVisible: false }))}>
      <GridBg />
      <Navbar subtitle={meta.title} />

      {/* Screenshot protection blur overlay */}
      {isBlurred && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)',
          background: 'rgba(10,12,16,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 56, color: '#FF9900', marginBottom: 16 }}>shield</span>
          <p style={{ fontFamily: 'monospace', color: '#FF9900', fontSize: 18, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
            Quiz Protected
          </p>
          <p style={{ fontFamily: 'monospace', color: '#dbc2ad', fontSize: 12, marginTop: 8, letterSpacing: '0.1em' }}>
            Click here to continue your quiz
          </p>
        </div>
      )}

      {/* Pac-Man Progress */}
      <div className="relative z-10 px-6 pt-5 pb-0 flex-shrink-0">
        <style>{`
          @keyframes pacman-chomp {
            0%   { clip-path: polygon(50% 50%, 100% 15%, 100% 0%, 0% 0%, 0% 100%, 100% 100%, 100% 85%); }
            25%  { clip-path: polygon(50% 50%, 100% 50%, 100% 0%, 0% 0%, 0% 100%, 100% 100%, 100% 50%); }
            50%  { clip-path: polygon(50% 50%, 100% 85%, 100% 100%, 0% 100%, 0% 0%, 100% 0%, 100% 15%); }
            75%  { clip-path: polygon(50% 50%, 100% 50%, 100% 0%, 0% 0%, 0% 100%, 100% 100%, 100% 50%); }
            100% { clip-path: polygon(50% 50%, 100% 15%, 100% 0%, 0% 0%, 0% 100%, 100% 100%, 100% 85%); }
          }
        `}</style>
        <div className="max-w-2xl mx-auto">
          <div className="flex justify-between items-center mb-2">
            <span className="font-mono text-xs text-[#dbc2ad] uppercase tracking-widest">Q {currentIdx + 1} of {questions.length}</span>
            <span className={`font-mono text-xs uppercase tracking-widest ${timeLeft <= 10 ? 'text-[#E24B4A] animate-pulse' : 'text-[#dbc2ad]'}`}>
              ⏱ {timeLeft}s
            </span>
            <span className="font-mono text-xs text-[#dbc2ad] uppercase tracking-widest">{Math.round(progress)}% complete</span>
          </div>
          <div className="relative w-full h-5 flex items-center">
            <div className="absolute inset-y-0 left-0 right-0 flex items-center">
              <div className="w-full h-[6px] rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }} />
            </div>
            <div className="absolute inset-0 flex items-center pointer-events-none">
              {Array.from({ length: questions.length }).map((_, i) => {
                const dotPct = ((i + 0.5) / questions.length) * 100;
                return (
                  <div key={i} className="absolute" style={{ left: `${dotPct}%`, transform: 'translateX(-50%)' }}>
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: dotPct <= progress ? 'transparent' : 'rgba(255,255,255,0.25)', transition: 'background 0.3s ease' }} />
                  </div>
                );
              })}
            </div>
            <div className="absolute left-0 top-1/2 -translate-y-1/2 h-[6px] rounded-full"
              style={{ width: `${progress}%`, background: 'linear-gradient(to right, #FF9900cc, #FF9900)', transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)' }} />
            {progress > 0 && progress < 100 && (
              <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2" style={{ left: `${progress}%`, transition: 'left 0.6s cubic-bezier(0.4,0,0.2,1)', width: 20, height: 20, zIndex: 10 }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#FF9900', animation: isMoving ? 'pacman-chomp 0.45s linear infinite' : 'none', clipPath: isMoving ? undefined : 'polygon(50% 50%, 100% 20%, 100% 0%, 0% 0%, 0% 100%, 100% 100%, 100% 80%)', boxShadow: '0 0 8px rgba(255,153,0,0.6)' }} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Scenario reminder strip */}
      <div className="relative z-10 px-6 pt-4 flex-shrink-0">
        <div className="max-w-2xl mx-auto">
          <details className="border border-[#FF9900]/20 bg-[#FF9900]/5 group">
            <summary className="px-4 py-2 font-mono text-[10px] text-[#FF9900] uppercase tracking-widest cursor-pointer list-none flex items-center justify-between">
              <span>📋 View Scenario</span>
              <span className="group-open:rotate-180 transition-transform duration-200 material-symbols-outlined text-sm">expand_more</span>
            </summary>
            <div className="px-4 pb-3">
              <p className="font-mono text-[11px] text-[#dbc2ad] leading-[1.8]">{bank.scenario}</p>
            </div>
          </details>
        </div>
      </div>

      {/* Quiz content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-6">
        <div className="max-w-2xl w-full">

          <div className="border border-white/10 bg-white/3 p-5 mb-3">
            <div className="flex items-center gap-3 mb-3">
              <span className="font-mono text-[10px] bg-[#FF9900]/20 text-[#FF9900] border border-[#FF9900]/40 px-2 py-0.5 uppercase tracking-widest">{q.category}</span>
              <span className="font-mono text-[10px] text-[#dbc2ad] uppercase tracking-widest">Question {currentIdx + 1}</span>
            </div>
            <p className="font-mono text-sm md:text-base text-white leading-relaxed font-bold">{q.question}</p>
          </div>

          <div className="flex flex-col gap-2.5 mb-3">
            {q.options.map((opt, idx) => {
              const letters = ['A', 'B', 'C', 'D'];
              return (
                <button key={idx} onClick={() => handleSelect(idx)} disabled={selected !== null}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-200"
                  style={{ ...optionStyle(idx), cursor: selected !== null ? 'default' : 'pointer', borderRadius: '2px' }}>
                  <span className="w-7 h-7 flex items-center justify-center font-mono text-xs font-bold flex-shrink-0 rounded-sm" style={letterBadgeStyle(idx)}>
                    {letters[idx]}
                  </span>
                  <span className="font-mono text-sm leading-snug">{opt}</span>
                  {selected !== null && idx === q.correct && <span className="ml-auto material-symbols-outlined text-[#a8e063] text-base flex-shrink-0">check_circle</span>}
                  {selected === idx && idx !== q.correct && <span className="ml-auto material-symbols-outlined text-[#f87171] text-base flex-shrink-0">cancel</span>}
                </button>
              );
            })}
          </div>

          <div className="overflow-hidden transition-all duration-400" style={{ maxHeight: showExplanation ? '140px' : '0', opacity: showExplanation ? 1 : 0 }}>
            <div className="border-l-2 border-[#FF9900] bg-white/3 pl-4 py-3 pr-4 mb-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="font-mono text-[10px] text-[#FF9900] uppercase tracking-widest">Explanation</div>
                {selected === -1 && <span className="font-mono text-[10px] text-[#E24B4A] uppercase tracking-widest font-bold ml-2">(Time's Up!)</span>}
              </div>
              <p className="font-mono text-xs text-[#dbc2ad] leading-relaxed">{q.explanation}</p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="flex gap-1.5 items-center">
              <span className="font-mono text-[10px] text-[#dbc2ad] uppercase tracking-widest mr-2">Integrity:</span>
              {[...Array(2)].map((_, i) => (
                <div key={i} className={`w-3 h-3 rounded-full border ${i < wrongCount ? 'bg-[#E24B4A] border-[#E24B4A] animate-pulse' : 'bg-transparent border-white/20'}`} />
              ))}
            </div>
            <button onClick={handleNext} disabled={selected === null || isEnteringRoom}
              className="flex items-center gap-2 bg-[#FF9900] text-[#111] px-5 py-2.5 font-mono text-xs font-bold hover:bg-[#ffc082] transition-colors uppercase tracking-widest disabled:opacity-30 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-[#dbc2ad]">
              {isEnteringRoom ? 'Unlocking...' : (wrongCount >= 2 ? 'Finish (Eliminated)' : (currentIdx + 1 === questions.length ? 'Escape Room' : 'Next Room'))}
              <span className="material-symbols-outlined text-sm">{isEnteringRoom ? 'lock_open' : 'arrow_forward'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Room Transition Overlay */}
      {isEnteringRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A0C10] animate-[fadeIn_0.2s_ease-out]">
          <div className="text-center">
            <div className="material-symbols-outlined text-[#FF9900] text-6xl mb-4 animate-[spin_1.5s_linear_infinite]">settings</div>
            <h2 className="font-mono text-2xl font-bold text-white tracking-widest uppercase mb-2 animate-[pulse_1s_ease-in-out_infinite]">Unlocking Room {currentIdx + 2}</h2>
            <p className="font-mono text-xs text-[#dbc2ad] uppercase tracking-widest">Bypassing security protocols...</p>
          </div>
        </div>
      )}
    </div>
  );
}
