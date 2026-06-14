import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import awsIcon from '../assets/aws_icon.jpeg';
import { QUESTION_BANKS, QUIZZES } from '../data/quizData';
import { isLoggedIn, getUser, submitScore, fetchMyScores, fetchQuizStatus, fetchRoundStatus } from '../utils/auth';
import useScreenshotProtection from '../utils/useScreenshotProtection';

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const SCREEN = { START: 'start', QUIZ: 'quiz', RESULTS: 'results' };

export default function AwsQuiz() {
  const navigate = useNavigate();
  const { quizId } = useParams();
  const quizMeta = QUIZZES.find(q => q.id === quizId) || QUIZZES[0];
  const questionBank = QUESTION_BANKS[quizMeta.id] || QUESTION_BANKS.fundamentals;

  const [screen, setScreen] = useState(SCREEN.START);
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [isMoving, setIsMoving] = useState(false);
  const movingTimer = useRef(null);
  const containerRef = useRef(null);
  const [scoreSaved, setScoreSaved] = useState(false);
  const [pastAttempt, setPastAttempt] = useState(null);
  const [scoresLoading, setScoresLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(60);
  const [globalStatus, setGlobalStatus] = useState('active');
  const [roundStatusMap, setRoundStatusMap] = useState({});
  const [wrongCount, setWrongCount] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [totalTimeSpent, setTotalTimeSpent] = useState(0);
  const [savedCompositeScore, setSavedCompositeScore] = useState(null);
  const [savedTimeTaken, setSavedTimeTaken] = useState(null);

  // Screenshot protection — active during quiz and results screens
  const isProtectionActive = screen === SCREEN.QUIZ || screen === SCREEN.RESULTS;
  const user = getUser();
  const watermarkLabel = user ? `${user.firstName || ''} ${user.lastName || ''} • ${user.email || ''}`.trim() : '';
  const { isBlurred } = useScreenshotProtection(isProtectionActive, watermarkLabel);

  // Auth gate — redirect to home + open login if not logged in
  useEffect(() => {
    if (!isLoggedIn()) {
      window.dispatchEvent(new Event('open-login-modal'));
      navigate('/');
    } else {
      Promise.all([fetchMyScores(), fetchQuizStatus(), fetchRoundStatus()]).then(([scores, status, roundMap]) => {
        const attempt = scores.find(s => s.quiz_id === quizId);
        if (attempt) setPastAttempt(attempt);
        setGlobalStatus(status);
        
        const mergedMap = { ...roundMap };
        const ensureGate = (id) => {
           if (!mergedMap[id]) mergedMap[id] = { attempted: false, qualified: false };
           const past = scores.find(s => s.quiz_id === id);
           if (past) {
             mergedMap[id].attempted = true;
             if (Object.keys(roundMap || {}).length === 0) {
               mergedMap[id].qualified = past.pct >= 70;
             }
           }
        };
        ensureGate('fundamentals');
        ensureGate('advanced');
        ensureGate('security');
        
        setRoundStatusMap(mergedMap);
        setScoresLoading(false);
        
        // Qualification Check
        if (quizId === 'advanced' && !(mergedMap.fundamentals.qualified)) {
          alert("You must qualify from Round 1 to unlock this round.");
          navigate('/quiz');
        } else if (quizId === 'security' && !(mergedMap.advanced.qualified)) {
          alert("You must qualify from Round 2 to unlock this round.");
          navigate('/quiz');
        }
      }).catch(() => setScoresLoading(false));
    }
  }, [navigate, quizId]);

  // Poll quiz status every 5s
  useEffect(() => {
    if (screen === SCREEN.RESULTS) return; // No need to poll if finished
    const interval = setInterval(async () => {
      const status = await fetchQuizStatus();
      setGlobalStatus(status);

      if (screen === SCREEN.QUIZ && status === 'inactive') {
        clearInterval(interval);
        alert("Quiz is currently on hold by AWS. Your progress so far has been saved.");
        
        const totalTime = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
        
        submitScore({
          quizId: quizMeta.id,
          quizTitle: quizMeta.title,
          quizType: 'quiz',
          score: score,
          total: questions.length,
          timeTaken: totalTime,
        }).then(res => {
          if (res.ok) {
            setSavedCompositeScore(res.data?.score?.composite_score);
            setSavedTimeTaken(res.data?.score?.time_taken);
            // Refresh round status to see if they qualified
            fetchRoundStatus().then(setRoundStatusMap);
          }
          setScreen(SCREEN.RESULTS);
        });
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [screen, score, questions.length, quizMeta]);

  useEffect(() => {
    if (screen !== SCREEN.QUIZ || selected !== null) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleTimeOut();
          return 0;
        }
        return prev - 1;
      });
      setTotalTimeSpent(t => t + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [screen, selected, currentIdx]);

  function handleTimeOut() {
    setSelected(-1);
    setShowExplanation(true);
    setAnswers(prev => [...prev, false]);
  }

  function triggerMove() {
    clearTimeout(movingTimer.current);
    setIsMoving(true);
    movingTimer.current = setTimeout(() => setIsMoving(false), 650);
  }

  const handleMouseMove = (e) => {
    if (window.innerWidth < 768 || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const snappedX = Math.floor((e.clientX - rect.left) / 80) * 80;
    const snappedY = Math.floor((e.clientY - rect.top) / 80) * 80;
    if (!gridState.isVisible || snappedX !== gridState.x || snappedY !== gridState.y) {
      const sizes = [1, 2, 4];
      setGridState({ x: snappedX, y: snappedY, size: sizes[Math.floor(Math.random() * sizes.length)], isVisible: true });
    }
  };

  function startQuiz() {
    setQuestions(shuffleArray(questionBank));
    setCurrentIdx(0);
    setSelected(null);
    setAnswers([]);
    setScore(0);
    setScore(0);
    setShowExplanation(false);
    setTimeLeft(60);
    setTotalTimeSpent(0);
    setStartTime(Date.now());
    setScreen(SCREEN.QUIZ);
  }

  function handleSelect(idx) {
    if (selected !== null) return;
    setSelected(idx);
    setShowExplanation(true);
    const isCorrect = idx === questions[currentIdx].correct;
    setAnswers(prev => [...prev, isCorrect]);
    if (isCorrect) setScore(s => s + 1);
  }

  function handleNext() {
    if (currentIdx + 1 >= questions.length) {
      // Save score before showing results
      const totalTime = totalTimeSpent;
      
      const finalScore = score + (selected !== null && selected !== -1 && selected === questions[currentIdx].correct ? 0 : 0);
      
      submitScore({
        quizId: quizMeta.id,
        quizTitle: quizMeta.title,
        quizType: 'quiz',
        score: finalScore,
        total: questions.length,
        timeTaken: totalTime,
      }).then(res => {
        setScoreSaved(res.ok);
        if (res.ok) {
          setSavedCompositeScore(res.data?.score?.composite_score);
          setSavedTimeTaken(res.data?.score?.time_taken);
          // Fetch updated round status for qualifications
          fetchRoundStatus().then(setRoundStatusMap);
        }
      });
      setScreen(SCREEN.RESULTS);
    } else {
      setCurrentIdx(i => i + 1);
      setSelected(null);
      setShowExplanation(false);
      setTimeLeft(60);
      triggerMove();
    }
  }

  function handleBack() {
    if (currentIdx === 0) return;
    triggerMove();
    setAnswers(prev => prev.slice(0, -1));
    if (answers[answers.length - 1]) setScore(s => s - 1);
    setCurrentIdx(i => i - 1);
    setSelected(null);
    setShowExplanation(false);
  }

  const q = questions[currentIdx];
  const totalQuestions = pastAttempt && screen === SCREEN.RESULTS ? pastAttempt.total : questions.length;
  const progress = totalQuestions ? (currentIdx / totalQuestions) * 100 : 0;
  
  let pct = 0;
  if (pastAttempt && screen === SCREEN.RESULTS) {
    pct = pastAttempt.pct || (totalQuestions ? Math.round((score / totalQuestions) * 100) : 0);
  } else {
    pct = totalQuestions ? Math.round((score / totalQuestions) * 100) : 0;
  }
  
  const scoreMsg = pct >= 90 ? '🏆 Cloud Architect!' : pct >= 70 ? '⚡ Well done!' : pct >= 50 ? '📘 Keep learning!' : '🔄 Try again!';

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

  // ── Shared sub-components ─────────────────────────────────
  const GridLayer = () => (
    <div
      className="fixed inset-0 z-0 pointer-events-none"
      style={{
        backgroundImage:
          'linear-gradient(to right,rgba(255,255,255,0.05) 1px,transparent 1px),linear-gradient(to bottom,rgba(255,255,255,0.05) 1px,transparent 1px)',
        backgroundSize: '80px 80px',
      }}
    />
  );

  const PacManBar = () => (
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
      <div className="max-w-xl mx-auto">
        <div className="flex justify-between items-center mb-2">
          <span className="font-mono text-xs text-[#dbc2ad] uppercase tracking-widest">Q {currentIdx + 1} of {questions.length}</span>
          <span className={`font-mono text-xs uppercase tracking-widest ${timeLeft <= 10 ? 'text-[#E24B4A] animate-pulse' : 'text-[#dbc2ad]'}`}>
            ⏱ {timeLeft}s
          </span>
          <span className="font-mono text-xs text-[#dbc2ad] uppercase tracking-widest">{Math.round(progress)}% complete</span>
        </div>
        <div className="relative w-full h-5 flex items-center">
          {/* Track */}
          <div className="absolute inset-y-0 left-0 right-0 flex items-center">
            <div className="w-full h-[6px] rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }} />
          </div>
          {/* Dots */}
          <div className="absolute inset-0 flex items-center pointer-events-none">
            {Array.from({ length: 10 }).map((_, i) => {
              const dotPct = ((i + 0.5) / 10) * 100;
              return (
                <div key={i} className="absolute" style={{ left: `${dotPct}%`, transform: 'translateX(-50%)' }}>
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: dotPct <= progress ? 'transparent' : 'rgba(255,255,255,0.25)', transition: 'background 0.3s ease' }} />
                </div>
              );
            })}
          </div>
          {/* Fill */}
          <div
            className="absolute left-0 top-1/2 -translate-y-1/2 h-[6px] rounded-full"
            style={{ width: `${progress}%`, background: 'linear-gradient(to right,#FF9900cc,#FF9900)', transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)' }}
          />
          {/* Pac-Man */}
          {progress > 0 && progress < 100 && (
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
              style={{ left: `${progress}%`, transition: 'left 0.6s cubic-bezier(0.4,0,0.2,1)', width: 20, height: 20, zIndex: 10 }}
            >
              <div style={{
                width: 20, height: 20, borderRadius: '50%', background: '#FF9900',
                animation: isMoving ? 'pacman-chomp 0.45s linear infinite' : 'none',
                clipPath: isMoving ? undefined : 'polygon(50% 50%,100% 20%,100% 0%,0% 0%,0% 100%,100% 100%,100% 80%)',
                boxShadow: '0 0 8px rgba(255,153,0,0.6)',
              }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════
  // START SCREEN
  // ═══════════════════════════════════════════════════════════
  if (screen === SCREEN.START) {
    return (
      <div className="min-h-screen bg-[#0A0C10] text-[#f1dfd1] flex flex-col relative overflow-hidden"
        onMouseMove={handleMouseMove} onMouseLeave={() => setGridState(s => ({ ...s, isVisible: false }))}>
        <GridLayer />

        <nav className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#0A0C10]/80 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <img src={awsIcon} alt="AWS" className="w-7 h-7 rounded-full object-cover" />
            <span className="font-mono text-sm text-[#dbc2ad] tracking-widest uppercase">{quizMeta.title}</span>
          </div>
          <button onClick={() => navigate('/quiz')}
            className="font-mono text-xs text-[#dbc2ad] border border-white/10 px-4 py-2 hover:border-[#FF9900]/50 hover:text-[#FF9900] transition-all uppercase tracking-widest">
            ← All Tests
          </button>
        </nav>

        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-16">
          <div className="absolute top-0 left-1/4 w-40 h-40 bg-[#FF9900] opacity-10 hidden md:block pointer-events-none" />
          <div className="absolute bottom-20 right-1/4 w-20 h-20 bg-[#FF9900] opacity-10 hidden md:block pointer-events-none" />

          <div className="max-w-xl w-full text-center">
            <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1 font-mono text-xs text-[#dbc2ad] uppercase tracking-widest mb-8">
              <span className="w-2 h-2 rounded-full bg-[#FF9900] animate-pulse" />
              {quizMeta.category}
            </div>

            <h1 className="font-mono text-4xl md:text-5xl font-bold text-white tracking-widest leading-tight mb-4">
              {quizMeta.title.split(' ').map((word, i) => (
                <span key={i}>{i === 1 ? <span className="text-[#FF9900]">{word}</span> : word}{' '}</span>
              ))}
            </h1>

            <p className="text-[#dbc2ad] text-sm leading-relaxed mb-8 border-l-2 border-[#FF9900] pl-5 text-left">
              {quizMeta.subtitle}
            </p>

            <div className="flex flex-wrap gap-1.5 justify-center mb-8">
              {quizMeta.topics.map(t => (
                <span key={t} className="font-mono text-[9px] text-[#dbc2ad] border border-white/10 px-2 py-0.5 uppercase tracking-wider">{t}</span>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-4 mb-10">
              {[[`${quizMeta.questions}`, 'Questions'], ['4', 'Options Each'], [quizMeta.duration, 'Est. Time']].map(([v, l]) => (
                <div key={l} className="border border-white/10 bg-white/3 p-4 text-center">
                  <div className="font-mono text-2xl font-bold text-[#FF9900]">{v}</div>
                  <div className="font-mono text-[10px] text-[#dbc2ad] uppercase tracking-widest mt-1">{l}</div>
                </div>
              ))}
            </div>

            {scoresLoading ? (
              <button disabled
                className="w-full bg-white/5 text-[#dbc2ad]/50 border border-white/10 font-mono text-sm px-8 py-4 uppercase tracking-widest flex items-center justify-center gap-2 cursor-not-allowed">
                <span className="material-symbols-outlined text-base animate-spin" style={{ animationDuration: '1.2s' }}>autorenew</span>
                CHECKING STATUS...
              </button>
            ) : !pastAttempt ? (
              globalStatus === 'inactive' ? (
                <button disabled
                  className="w-full bg-[#E24B4A]/10 text-[#E24B4A] border border-[#E24B4A]/30 font-mono text-sm font-bold px-8 py-4 uppercase tracking-widest flex items-center justify-center gap-2 cursor-not-allowed">
                  QUIZ ON HOLD BY AWS — WAIT FOR START
                  <span className="material-symbols-outlined text-base">pause_circle</span>
                </button>
              ) : (
                <button onClick={startQuiz}
                  className="w-full bg-[#FF9900] text-[#111] font-mono text-sm font-bold px-8 py-4 hover:bg-[#ffc082] transition-colors uppercase tracking-widest flex items-center justify-center gap-2">
                  INITIATE QUIZ
                  <span className="material-symbols-outlined text-base">terminal</span>
                </button>
              )
            ) : (
              <button onClick={() => { setScore(pastAttempt.score); setScreen(SCREEN.RESULTS); }}
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

  // ═══════════════════════════════════════════════════════════
  // RESULTS SCREEN
  // ═══════════════════════════════════════════════════════════
  if (screen === SCREEN.RESULTS) {
    let displayPct = pct;
    const backendScore = pastAttempt ? pastAttempt.composite_score : savedCompositeScore;
    if (backendScore !== null && backendScore !== undefined && (parseFloat(backendScore) > 0 || score === 0)) {
      displayPct = backendScore;
    } else {
      // Fallback calculation if backend returned 0.00 erroneously
      const maxTime = totalQuestions * 60;
      const acc = totalQuestions ? (score / totalQuestions) * 100 * 0.7 : 0;
      const tTaken = pastAttempt && pastAttempt.time_taken !== undefined && pastAttempt.time_taken !== null 
        ? pastAttempt.time_taken 
        : (savedTimeTaken !== null && savedTimeTaken !== undefined ? savedTimeTaken : totalTimeSpent);
      const tc = tTaken < maxTime ? (1 - (tTaken / maxTime)) * 100 * 0.3 : 0;
      displayPct = Math.min(100, Math.max(0, acc + tc)).toFixed(2);
    }

    const timeToDisplay = pastAttempt && pastAttempt.time_taken !== undefined && pastAttempt.time_taken !== null 
      ? pastAttempt.time_taken 
      : (savedTimeTaken !== null && savedTimeTaken !== undefined ? savedTimeTaken : totalTimeSpent);

    return (
      <div className="min-h-screen bg-[#0A0C10] text-[#f1dfd1] flex flex-col relative overflow-hidden"
        onMouseMove={handleMouseMove} onMouseLeave={() => setGridState(s => ({ ...s, isVisible: false }))}>
        <GridLayer />

        <nav className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#0A0C10]/80 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <img src={awsIcon} alt="AWS" className="w-7 h-7 rounded-full object-cover" />
            <span className="font-mono text-sm text-[#dbc2ad] tracking-widest uppercase">AWS QUIZ — Results</span>
          </div>
          <button onClick={() => navigate('/quiz')}
            className="font-mono text-xs text-[#dbc2ad] border border-white/10 px-4 py-2 hover:border-[#FF9900]/50 hover:text-[#FF9900] transition-all uppercase tracking-widest">
            ← All Tests
          </button>
        </nav>

        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-12">
          <div className="max-w-lg w-full">

            <div className="border border-white/10 bg-white/3 p-6 mb-4 flex items-center gap-6">
              <div className="relative flex-shrink-0">
                <svg width="90" height="90" viewBox="0 0 90 90">
                  <circle cx="45" cy="45" r="38" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
                  <circle cx="45" cy="45" r="38" fill="none" stroke="#FF9900" strokeWidth="6"
                    strokeDasharray={`${2 * Math.PI * 38}`}
                    strokeDashoffset={`${2 * Math.PI * 38 * (1 - pct / 100)}`}
                    strokeLinecap="round" transform="rotate(-90 45 45)"
                    style={{ transition: 'stroke-dashoffset 1s ease-out' }} />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center font-mono text-sm font-bold text-white">{score}/{totalQuestions}</span>
              </div>
              <div>
                <div className="font-mono text-4xl font-bold text-[#FF9900]">
                  {displayPct}
                  <span className="text-xl"> pts</span>
                </div>
                <div className="font-mono text-xs text-[#dbc2ad] mt-1">Composite Score</div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3 mb-4">
              {[
                { label: 'Accuracy', val: `${pct}%`, color: '#a8e063', bg: 'rgba(99,153,34,0.12)', border: '#639922' },
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

            {/* Qualification Status */}
            {(roundStatusMap && roundStatusMap[quizId]) && (
              <div className={`mb-4 px-4 py-3 font-mono text-xs flex flex-col items-center justify-center gap-1 transition-all text-center ${roundStatusMap[quizId].qualified ? 'border border-[#639922]/40 bg-[#639922]/10 text-[#a8e063]' : 'border border-[#FF9900]/40 bg-[#FF9900]/10 text-[#FF9900]'}`}>
                <div className="flex items-center gap-2 font-bold text-sm">
                  <span className="material-symbols-outlined">{roundStatusMap[quizId].qualified ? 'military_tech' : 'hourglass_empty'}</span>
                  {roundStatusMap[quizId].qualified ? 'Qualified for Next Round!' : 'Awaiting Final Qualification Cutoff'}
                </div>
                {roundStatusMap[quizId].rank && (
                  <div className="text-[10px] text-white/70">
                    Current Rank: #{roundStatusMap[quizId].rank} of {roundStatusMap[quizId].total} (Top {quizId === 'fundamentals' ? '70%' : '40%'} qualify)
                  </div>
                )}
              </div>
            )}

            {/* DB save indicator */}
            <div className={`mb-4 px-4 py-2.5 font-mono text-[11px] flex items-center gap-2 transition-all ${(scoreSaved || pastAttempt) ? 'border border-[#639922]/40 bg-[#639922]/10 text-[#a8e063]' : 'border border-white/8 bg-white/3 text-[#dbc2ad]'}`}>
              <span className="material-symbols-outlined text-sm">{(scoreSaved || pastAttempt) ? 'cloud_done' : 'cloud_sync'}</span>
              {(scoreSaved || pastAttempt) ? 'Score saved to database ✓' : 'Saving score...'}
            </div>

            {answers.length > 0 && (
              <div className="border border-white/10 bg-white/3 p-4 mb-4">
                <div className="font-mono text-[10px] text-[#dbc2ad] uppercase tracking-widest mb-3">Answer Trail</div>
                <div className="flex gap-2">
                  {answers.map((correct, i) => (
                    <div key={i} className="flex-1 h-2.5 rounded-full" style={{ background: correct ? '#639922' : '#E24B4A' }} title={`Q${i + 1}: ${correct ? 'Correct' : 'Wrong'}`} />
                  ))}
                </div>
                <div className="font-mono text-[10px] text-[#dbc2ad] mt-2 italic">Green = correct · Red = wrong</div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3">
              <button onClick={() => navigate('/quiz')}
                className="bg-[#FF9900] text-[#111] font-mono text-xs py-3 hover:bg-[#ffc082] transition-colors uppercase tracking-widest font-bold flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-sm">grid_view</span>
                All Tests
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // QUIZ SCREEN
  // ═══════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-[#0A0C10] text-[#f1dfd1] flex flex-col relative overflow-hidden"
      onMouseMove={handleMouseMove} onMouseLeave={() => setGridState(s => ({ ...s, isVisible: false }))}>
      <GridLayer />

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

      <nav className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#0A0C10]/80 backdrop-blur-xl flex-shrink-0">
        <div className="flex items-center gap-3">
          <img src={awsIcon} alt="AWS" className="w-7 h-7 rounded-full object-cover" />
          <span className="font-mono text-sm text-[#dbc2ad] tracking-widest uppercase">{quizMeta.title}</span>
        </div>
        <button onClick={() => setScreen(SCREEN.START)}
          className="font-mono text-xs text-[#dbc2ad] border border-white/10 px-4 py-2 hover:border-[#FF9900]/50 hover:text-[#FF9900] transition-all uppercase tracking-widest">
          ← Exit
        </button>
      </nav>

      <PacManBar />

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-8">
        <div className="max-w-xl w-full">

          {/* Question card */}
          <div className="border border-white/10 bg-white/3 p-5 mb-3">
            <div className="flex items-center gap-3 mb-3">
              <span className="font-mono text-[10px] bg-[#FF9900]/20 text-[#FF9900] border border-[#FF9900]/40 px-2 py-0.5 uppercase tracking-widest">
                {q.category}
              </span>
              <span className="font-mono text-[10px] text-[#dbc2ad] uppercase tracking-widest">Question {currentIdx + 1}</span>
            </div>
            <p className="font-mono text-sm md:text-base text-white leading-relaxed font-bold">{q.question}</p>
          </div>

          {/* Options */}
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
                  {selected !== null && idx === q.correct && (
                    <span className="ml-auto material-symbols-outlined text-[#a8e063] text-base flex-shrink-0">check_circle</span>
                  )}
                  {selected === idx && idx !== q.correct && (
                    <span className="ml-auto material-symbols-outlined text-[#f87171] text-base flex-shrink-0">cancel</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Explanation */}
          <div className="overflow-hidden transition-all duration-400"
            style={{ maxHeight: showExplanation ? '120px' : '0', opacity: showExplanation ? 1 : 0 }}>
            <div className="border-l-2 border-[#FF9900] bg-white/3 pl-4 py-3 pr-4 mb-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="font-mono text-[10px] text-[#FF9900] uppercase tracking-widest">Explanation</div>
                {selected === -1 && <span className="font-mono text-[10px] text-[#E24B4A] uppercase tracking-widest font-bold ml-2">(Time's Up!)</span>}
              </div>
              <p className="font-mono text-xs text-[#dbc2ad] leading-relaxed">{q.explanation}</p>
            </div>
          </div>

          {/* Nav buttons */}
          <div className="flex items-center justify-between gap-3">
            <button onClick={handleBack} disabled={currentIdx === 0}
              className="flex items-center gap-2 border border-white/10 px-5 py-2.5 font-mono text-xs text-[#dbc2ad] hover:border-white/25 transition-all uppercase tracking-widest disabled:opacity-30 disabled:cursor-not-allowed">
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              Back
            </button>
            <button onClick={handleNext} disabled={selected === null}
              className="flex items-center gap-2 bg-[#FF9900] text-[#111] px-5 py-2.5 font-mono text-xs font-bold hover:bg-[#ffc082] transition-colors uppercase tracking-widest disabled:opacity-30 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-[#dbc2ad]">
              {currentIdx + 1 === questions.length ? 'See Results' : 'Next'}
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
