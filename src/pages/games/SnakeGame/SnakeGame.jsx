import { useCallback, useEffect, useRef, useState } from 'react';
import useSnakeGame from './useSnakeGame';

/* ═══════════════════════════════════════════════════════════
   SNAKE GAME ("Serpent // Field Runner") — React page
   Canvas engine lives in useSnakeGame. This component
   renders the overlays, HUD, and visual effects.
   ═══════════════════════════════════════════════════════════ */

const FONTS_HREF =
  'https://fonts.googleapis.com/css2?family=Press+Start+2P&family=JetBrains+Mono:wght@400;500;700&display=swap';

export default function SnakeGame() {
  const canvasRef = useRef(null);

  const [phase, setPhase] = useState('start'); // start | playing | paused | gameover | levelup
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [best, setBest] = useState(0);
  const [foodEaten, setFoodEaten] = useState(0);
  const [quota, setQuota] = useState(5);
  const [levelLabel, setLevelLabel] = useState('');
  const [levelObstacles, setLevelObstacles] = useState(0);

  const onState = useCallback((s) => {
    if (s.type === 'init') {
      setBest(s.best);
    } else if (s.type === 'start') {
      setPhase('playing');
    } else if (s.type === 'pause') {
      setPhase('paused');
    } else if (s.type === 'resume') {
      setPhase('playing');
    } else if (s.type === 'gameover') {
      setPhase('gameover');
      setScore(s.score);
      setBest(s.best);
    } else if (s.type === 'levelup') {
      setPhase('levelup');
      setLevel(s.level);
      setLevelLabel(s.label);
      setLevelObstacles(s.obstacles);
      setQuota(s.quota);
      setTimeout(() => setPhase('playing'), 1500);
    } else if (s.type === 'hud') {
      setScore(s.score);
      setLevel(s.level);
      setBest(s.best);
      setFoodEaten(s.foodEaten);
      setQuota(s.quota);
    }
  }, []);

  const api = useSnakeGame(canvasRef, onState);

  // Load fonts
  useEffect(() => {
    if (document.querySelector(`link[href="${FONTS_HREF}"]`)) return undefined;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = FONTS_HREF;
    document.head.appendChild(link);
    return () => { document.head.removeChild(link); };
  }, []);

  const handleStart = () => api.current.start();
  const handlePause = () => api.current.pause();
  const handleResume = () => api.current.resume();

  const isPlaying = phase === 'playing' || phase === 'paused' || phase === 'levelup';

  return (
    <div style={styles.wrap}>
      <canvas ref={canvasRef} style={styles.canvas} />
      <div style={styles.scanlines} />
      <div style={styles.vignette} />

      {/* HUD */}
      {isPlaying && (
        <div style={styles.hud}>
          <div style={styles.hudBlock}>
            <div style={styles.hudLabel}>Score</div>
            <div style={styles.hudValue}>{score}</div>
          </div>
          <div style={{ ...styles.hudBlock, alignItems: 'center' }}>
            <div style={styles.hudLabel}>Level</div>
            <div style={{ ...styles.hudValue, fontSize: 16, color: '#eef3e6' }}>{level}</div>
            <div style={styles.pips}>
              {Array.from({ length: quota }).map((_, i) => (
                <div key={i} style={i < foodEaten ? styles.pipOn : styles.pip} />
              ))}
            </div>
          </div>
          <div style={{ ...styles.hudBlock, alignItems: 'flex-end' }}>
            <div style={styles.hudLabel}>Best</div>
            <div style={{ ...styles.hudValue, fontSize: 16, color: '#eef3e6' }}>{best}</div>
          </div>
        </div>
      )}

      {/* Pause button */}
      {phase === 'playing' && (
        <button style={styles.pauseBtn} onClick={handlePause} aria-label="Pause">
          <span style={{ fontSize: 16, color: '#eef3e6', opacity: 0.75 }}>❚❚</span>
        </button>
      )}

      {/* Start overlay */}
      {phase === 'start' && (
        <div style={styles.overlay}>
          <div style={styles.brand}><span style={styles.dot} /> SERPENT · FIELD RUNNER</div>
          <h1 style={styles.titleBig}>SERPENT</h1>
          <p style={styles.subtitle}>Guide the snake across the field. Eat to grow. Clear each level's quota to advance — the field gets faster and rockier as you go.</p>
          <button style={styles.btn} onClick={handleStart}>Start Run</button>
          <p style={styles.hint}>Swipe to steer · Arrow keys / WASD on desktop<br />Tap top-right to pause</p>
        </div>
      )}

      {/* Level up overlay */}
      {phase === 'levelup' && (
        <div style={styles.overlay}>
          <h1 style={styles.titleNormal}>LEVEL {level}</h1>
          <p style={styles.subtitle}>{levelLabel} · quota {quota}{levelObstacles ? ` · ${levelObstacles} hazards` : ''}</p>
        </div>
      )}

      {/* Pause overlay */}
      {phase === 'paused' && (
        <div style={styles.overlay}>
          <h1 style={styles.titleNormal}>PAUSED</h1>
          <button style={styles.btnSecondary} onClick={handleResume}>Resume</button>
        </div>
      )}

      {/* Game over overlay */}
      {phase === 'gameover' && (
        <div style={styles.overlay}>
          <h1 style={{ ...styles.titleNormal, color: '#e63946' }}>RUN OVER</h1>
          <p style={styles.subtitle}>Score {score} · Level {level}</p>
          <button style={styles.btn} onClick={handleStart}>Try Again</button>
        </div>
      )}
    </div>
  );
}

/* ── Styles ── */
const styles = {
  wrap: {
    position: 'fixed',
    inset: 0,
    touchAction: 'none',
    background: '#0a120b',
    fontFamily: "'JetBrains Mono', monospace",
    color: '#eef3e6',
    overflow: 'hidden',
    userSelect: 'none',
    WebkitTapHighlightColor: 'transparent',
  },
  canvas: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    display: 'block',
  },
  scanlines: {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    background: 'repeating-linear-gradient(to bottom, rgba(0,0,0,0.07) 0px, rgba(0,0,0,0.07) 1px, transparent 2px, transparent 3px)',
    mixBlendMode: 'multiply',
  },
  vignette: {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    boxShadow: 'inset 0 0 min(20vw,160px) min(6vw,40px) rgba(0,0,0,0.6)',
  },
  hud: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '14px 18px 0',
    pointerEvents: 'none',
    zIndex: 5,
    boxSizing: 'border-box',
  },
  hudBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  hudLabel: {
    fontSize: 9,
    letterSpacing: 2,
    color: '#a9bb9d',
    textTransform: 'uppercase',
    textShadow: '0 1px 3px rgba(0,0,0,0.8)',
  },
  hudValue: {
    fontSize: 20,
    fontWeight: 700,
    color: '#ffd23f',
    textShadow: '0 0 10px rgba(255,210,63,0.5), 0 2px 4px rgba(0,0,0,0.8)',
  },
  pips: {
    display: 'flex',
    gap: 4,
    marginTop: 3,
  },
  pip: {
    width: 9,
    height: 4,
    borderRadius: 2,
    background: 'rgba(255,255,255,0.18)',
    boxShadow: '0 1px 2px rgba(0,0,0,0.6)',
  },
  pipOn: {
    width: 9,
    height: 4,
    borderRadius: 2,
    background: '#ffb703',
    boxShadow: '0 0 6px #ffb703',
  },
  pauseBtn: {
    position: 'absolute',
    top: 12,
    right: 14,
    padding: '10px 12px',
    zIndex: 6,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    width: 56,
    height: 56,
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
  },
  overlay: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    background: 'rgba(6,12,7,0.88)',
    textAlign: 'center',
    padding: 24,
    zIndex: 10,
  },
  titleBig: {
    fontFamily: "'Press Start 2P', monospace",
    fontSize: 26,
    color: '#ffd23f',
    margin: 0,
    textShadow: '0 0 14px rgba(255,210,63,0.5)',
    lineHeight: 1.7,
  },
  titleNormal: {
    fontFamily: "'Press Start 2P', monospace",
    fontSize: 16,
    color: '#ffd23f',
    margin: 0,
    textShadow: '0 0 14px rgba(255,210,63,0.5)',
    lineHeight: 1.7,
  },
  subtitle: {
    margin: 0,
    fontSize: 13,
    color: '#c9d6c0',
    lineHeight: 1.8,
    maxWidth: 340,
  },
  brand: {
    fontFamily: "'Press Start 2P', monospace",
    fontSize: 10,
    letterSpacing: 2,
    color: '#ffb703',
    textShadow: '0 0 12px rgba(255,183,3,0.5)',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  dot: {
    display: 'inline-block',
    width: 5,
    height: 5,
    background: '#e63946',
    borderRadius: '50%',
    boxShadow: '0 0 8px #e63946',
  },
  btn: {
    fontFamily: "'Press Start 2P', monospace",
    fontSize: 11,
    letterSpacing: 1,
    color: '#12210f',
    background: 'linear-gradient(180deg, #ffd23f, #e0a800)',
    border: 'none',
    padding: '15px 26px',
    borderRadius: 9,
    cursor: 'pointer',
    boxShadow: '0 4px 0 #a67c00, 0 8px 20px rgba(0,0,0,0.4)',
    marginTop: 8,
  },
  btnSecondary: {
    fontFamily: "'Press Start 2P', monospace",
    fontSize: 11,
    letterSpacing: 1,
    color: '#12210f',
    background: 'linear-gradient(180deg, #6fa04f, #4d7c3f)',
    border: 'none',
    padding: '15px 26px',
    borderRadius: 9,
    cursor: 'pointer',
    boxShadow: '0 4px 0 #325428, 0 8px 20px rgba(0,0,0,0.4)',
    marginTop: 8,
  },
  hint: {
    fontSize: 10.5,
    color: '#8fa084',
    letterSpacing: 0.5,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 1.8,
  },
};
