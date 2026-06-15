import { useNavigate } from 'react-router-dom';
import { useState, useRef } from 'react';
import { QUIZZES, CASE_STUDIES } from '../data/quizData';
import { fetchRoundStatus, isLoggedIn, fetchMyScores } from '../utils/auth';
import { useEffect } from 'react';

const DIFFICULTY_COLOR = {
  Beginner:     { bg: 'rgba(99,153,34,0.15)',   border: '#639922',  text: '#a8e063' },
  Intermediate: { bg: 'rgba(255,153,0,0.15)',   border: '#FF9900',  text: '#FF9900' },
  Advanced:     { bg: 'rgba(168,85,247,0.15)',  border: '#a855f7',  text: '#c084fc' },
};

export default function QuizHub() {
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const [gridState, setGridState] = useState({ x: 0, y: 0, size: 1, isVisible: false });
  const [hoveredQuiz, setHoveredQuiz] = useState(null);
  const [hoveredCase, setHoveredCase] = useState(null);
  const [roundStatusMap, setRoundStatusMap] = useState({});

  useEffect(() => {
    if (isLoggedIn()) {
      Promise.all([fetchRoundStatus(), fetchMyScores()]).then(([serverRoundMap, myScores]) => {
        const mergedMap = { ...serverRoundMap };
        
        // Fallback logic in case the deployed backend doesn't have round-status
        const ensureGate = (id) => {
           if (!mergedMap[id]) mergedMap[id] = { attempted: false, qualified: false };
           
           const attempt = myScores.find(s => s.quiz_id === id);
           if (attempt) {
             mergedMap[id].attempted = true;
             // Always enforce local score check over backend outdated logic
             const scoreToUse = attempt.composite_score !== undefined && attempt.composite_score !== null ? parseFloat(attempt.composite_score) : attempt.pct;
             let requiredPct = 70;
             if (id === 'fundamentals') requiredPct = 50;
             if (id === 'advanced') requiredPct = 60;
             if (id === 'security') requiredPct = 70;
             mergedMap[id].qualified = scoreToUse >= requiredPct;
           }
        };

        ensureGate('fundamentals');
        ensureGate('advanced');
        ensureGate('security');
        
        setRoundStatusMap(mergedMap);
      });
    }
  }, []);

  const handleMouseMove = (e) => {
    if (window.innerWidth < 768) return;
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const snappedX = Math.floor((e.clientX - rect.left) / 80) * 80;
    const snappedY = Math.floor((e.clientY - rect.top) / 80) * 80;
    if (!gridState.isVisible || snappedX !== gridState.x || snappedY !== gridState.y) {
      const sizes = [1, 2, 4];
      setGridState({ x: snappedX, y: snappedY, size: sizes[Math.floor(Math.random() * sizes.length)], isVisible: true });
    }
  };

  return (
    <div
      className="min-h-screen bg-[#0A0C10] text-[#f1dfd1] relative overflow-x-hidden"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setGridState(s => ({ ...s, isVisible: false }))}
    >
      {/* Grid background */}
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)',
          backgroundSize: '80px 80px',
        }}
      />

      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#0A0C10]/80 backdrop-blur-xl sticky top-0">
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm text-[#dbc2ad] tracking-widest uppercase">AWS STUDENT BUILDER GROUP</span>
        </div>
        <button
          onClick={() => navigate('/')}
          className="font-mono text-xs text-[#dbc2ad] border border-white/10 px-4 py-2 hover:border-[#FF9900]/50 hover:text-[#FF9900] transition-all uppercase tracking-widest"
        >
          ← Home
        </button>
      </nav>

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-12">

        <div className="mb-14">

          <h1 className="font-mono text-4xl md:text-5xl font-bold text-white tracking-widest leading-tight mb-4">
            QUALIFICATION<br /><span className="text-[#FF9900]">ROUNDS</span>
          </h1>
          <p className="text-[#dbc2ad] text-sm leading-relaxed border-l-2 border-[#FF9900] pl-4 max-w-xl">
            You must score high enough to qualify for the next round. Scores are calculated using 70% accuracy and 30% time taken.
          </p>
        </div>

        {/* ── Section: Regular Quizzes ── */}
        <div className="mb-14">
          <div className="flex items-center gap-4 mb-6">
            <div className="font-mono text-[10px] text-[#dbc2ad] uppercase tracking-[0.15em]">Topic Quizzes</div>
            <div className="flex-1 h-px bg-white/8" />
            <div className="font-mono text-[10px] text-[#FF9900] uppercase tracking-widest">{QUIZZES.length} Available</div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {QUIZZES.map((quiz) => {
              const diff = DIFFICULTY_COLOR[quiz.category];
              
              let isLocked = false;
              let lockMessage = '';
              let statusText = '';
              
              if (quiz.id === 'advanced') {
                isLocked = !(roundStatusMap?.fundamentals?.qualified);
                lockMessage = 'Qualify from Round 1 to unlock';
              } else if (quiz.id === 'security') {
                isLocked = !(roundStatusMap?.advanced?.qualified);
                lockMessage = 'Qualify from Round 2 to unlock';
              }
              
              const isHovered = hoveredQuiz === quiz.id && !isLocked;
              const hasAttempted = roundStatusMap[quiz.id]?.attempted;
              const isQualified = roundStatusMap[quiz.id]?.qualified;
              
              if (hasAttempted) {
                statusText = isQualified ? '✅ QUALIFIED' : '❌ DISQUALIFIED';
              }

              return (
                <div
                  key={quiz.id}
                  onMouseEnter={() => setHoveredQuiz(quiz.id)}
                  onMouseLeave={() => setHoveredQuiz(null)}
                  className={`relative flex flex-col border bg-white/2 transition-all duration-300 ${isLocked ? 'opacity-50 cursor-not-allowed grayscale' : 'cursor-pointer group'}`}
                  style={{
                    borderColor: isHovered ? quiz.color : 'rgba(255,255,255,0.1)',
                    boxShadow: isHovered ? `0 0 20px ${quiz.color}22` : 'none',
                  }}
                  onClick={() => {
                    if (!isLocked) navigate(`/quiz/${quiz.id}`);
                  }}
                >
                  {/* Top accent bar */}
                  <div className="h-0.5 w-full transition-all duration-300" style={{ background: isHovered ? quiz.color : 'transparent' }} />

                  <div className="p-5 flex flex-col flex-1 relative">
                    {/* Badge row */}
                    <div className="flex items-center justify-between mb-4">
                      <span
                        className="font-mono text-[10px] uppercase tracking-widest px-2 py-0.5"
                        style={{ background: diff.bg, color: diff.text, border: `1px solid ${diff.border}` }}
                      >
                        {quiz.category}
                      </span>
                      <span className="font-mono text-[10px] text-[#dbc2ad]">⏱ {quiz.duration}</span>
                    </div>

                    <h3 className="font-mono text-base font-bold text-white mb-1 leading-snug">{quiz.title}</h3>
                    <p className="font-mono text-[11px] text-[#dbc2ad] leading-relaxed mb-4 flex-1">{quiz.subtitle}</p>

                    {statusText && (
                      <div className="mb-4 text-[10px] font-mono font-bold" style={{ color: isQualified ? '#a8e063' : '#FF9900' }}>
                        {statusText} {roundStatusMap[quiz.id]?.rank && `(Rank #${roundStatusMap[quiz.id].rank})`}
                      </div>
                    )}

                    {/* CTA */}
                    <button
                      disabled={isLocked}
                      className="w-full font-mono text-xs py-2.5 uppercase tracking-widest flex items-center justify-center gap-2 transition-all duration-200"
                      style={{
                        background: isHovered ? quiz.color : 'rgba(255,255,255,0.05)',
                        color: isHovered ? '#111' : (isLocked ? '#666' : '#dbc2ad'),
                        fontWeight: isHovered ? 700 : 400,
                      }}
                    >
                      {isLocked ? (
                        <>
                          <span className="material-symbols-outlined text-sm">lock</span>
                          {lockMessage}
                        </>
                      ) : (
                        <>
                          {hasAttempted ? 'View Results' : 'Start Round'}
                          <span className="material-symbols-outlined text-sm">arrow_forward</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>



        {/* Footer note */}
        <div className="mt-14 border-t border-white/5 pt-6 text-center">
          <p className="font-mono text-[10px] text-[#dbc2ad]/50 uppercase tracking-widest">
            AWS Student Builder Group @ VIT · All quizzes include instant feedback & explanations
          </p>
        </div>
      </div>
    </div>
  );
}
