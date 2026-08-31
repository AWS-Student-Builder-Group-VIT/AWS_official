import { useCallback, useEffect, useRef, useState } from 'react';
import useFruitNinja from './useFruitNinja';

/* ═══════════════════════════════════════════════════════════
   FRUIT NINJA ("Blade & Blossom") — React page wrapper
   The canvas engine lives in the useFruitNinja hook.
   This component renders the overlays (start screen, HUD,
   combo text, game-over panel, flash effect) driven by
   state updates emitted from the hook.
   ═══════════════════════════════════════════════════════════ */

const FONTS_HREF =
  'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Rajdhani:wght@500;600;700&display=swap';

export default function FruitNinja({ onComplete }) {
  const canvasRef = useRef(null);

  // Game state driven by the engine hook
  const [phase, setPhase] = useState('start'); // start | playing | gameover
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [best, setBest] = useState(0);
  const [, setCombo] = useState(0);
  const [comboLabel, setComboLabel] = useState('');
  const [isNewBest, setIsNewBest] = useState(false);
  const [flash, setFlash] = useState(false);

  // Combo text fade-out timer
  const comboTimeout = useRef(null);
  const completionSent = useRef(false);
  const [comboVisible, setComboVisible] = useState(false);

  const onState = useCallback((s) => {
    if (s.phase !== undefined) setPhase(s.phase);
    if (s.score !== undefined) setScore(s.score);
    if (s.lives !== undefined) setLives(s.lives);
    if (s.best !== undefined) setBest(s.best);
    if (s.combo !== undefined) setCombo(s.combo);
    if (s.isNewBest !== undefined) setIsNewBest(s.isNewBest);
    if (s.phase === 'playing') completionSent.current = false;
    if (s.phase === 'gameover' && !completionSent.current) {
      completionSent.current = true;
      onComplete?.({ official: true, score: Number(s.score) || 0 });
    }

    if (s.comboLabel) {
      setComboLabel(s.comboLabel);
      setComboVisible(true);
      clearTimeout(comboTimeout.current);
      comboTimeout.current = setTimeout(() => setComboVisible(false), 700);
    }

    if (s.flash) {
      setFlash(true);
      setTimeout(() => setFlash(false), 500);
    }
  }, [onComplete]);

  const api = useFruitNinja(canvasRef, onState);

  // Load game fonts
  useEffect(() => {
    if (document.querySelector(`link[href="${FONTS_HREF}"]`)) return undefined;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = FONTS_HREF;
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  const handlePlay = () => api.current.start();

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#05070c',
        overflow: 'hidden',
        fontFamily: "'Rajdhani', sans-serif",
        color: '#e9edf5',
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        style={{ position: 'absolute', top: 0, left: 0, display: 'block', touchAction: 'none', cursor: 'crosshair' }}
      />

      {/* HUD — visible during play */}
      {phase === 'playing' && (
        <div style={styles.hud}>
          <div>
            <div style={styles.scoreLabel}>Score</div>
            <div style={styles.score}>{score}</div>
          </div>
          <div style={styles.livesWrap}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{ ...styles.life, ...(i >= lives ? styles.lifeLost : {}) }} />
            ))}
          </div>
        </div>
      )}

      {/* Combo text */}
      <div
        style={{
          ...styles.comboText,
          opacity: comboVisible ? 1 : 0,
          transform: comboVisible
            ? 'translate(-50%,-50%) scale(1.15)'
            : 'translate(-50%,-60%) scale(0.9)',
        }}
      >
        {comboLabel}
      </div>

      {/* Flash overlay (bomb hit) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: '#ff2e4d',
          opacity: flash ? 0.85 : 0,
          pointerEvents: 'none',
          zIndex: 15,
          transition: flash ? 'none' : 'opacity .5s ease',
        }}
      />

      {/* Start screen overlay */}
      {phase === 'start' && (
        <div style={styles.overlay}>
          <div style={styles.kicker}>Blade &amp; Blossom</div>
          <h1 style={styles.title}>FRUIT<br />NINJA</h1>
          <p style={styles.subtitle}>
            Swipe across the screen to slice flying fruit. Chain slices for combos,
            but never touch a bomb — one cut and it's over.
          </p>
          <button style={styles.btn} onClick={handlePlay}>Play</button>
          <div style={styles.howto}>
            <div style={styles.howtoItem}><span style={{ fontSize: 22 }}>🖱️</span>Click &amp; drag to slice</div>
            <div style={styles.howtoItem}><span style={{ fontSize: 22 }}>💣</span>Avoid the bombs</div>
            <div style={styles.howtoItem}><span style={{ fontSize: 22 }}>🔥</span>Chain hits for combos</div>
          </div>
        </div>
      )}

      {/* Game over overlay */}
      {phase === 'gameover' && (
        <div style={styles.overlay}>
          <div style={{ ...styles.kicker, color: '#ff2e4d' }}>Blade Broken</div>
          <h1 style={{ ...styles.title, fontSize: 'min(13vw, 84px)' }}>GAME OVER</h1>
          <div style={{ ...styles.newBest, opacity: isNewBest ? 1 : 0 }}>★ New Best ★</div>
          <div style={styles.statRow}>
            <div style={styles.statBlock}>
              <div style={styles.statNum}>{score}</div>
              <div style={styles.statLbl}>Score</div>
            </div>
            <div style={styles.statBlock}>
              <div style={{ ...styles.statNum, color: '#ffc93c' }}>{best}</div>
              <div style={styles.statLbl}>Best</div>
            </div>
          </div>
          <button style={styles.btn} onClick={handlePlay}>Slice Again</button>
        </div>
      )}
    </div>
  );
}

/* ── Inline styles (matching the original HTML's CSS) ── */
const styles = {
  hud: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    padding: '22px 28px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    pointerEvents: 'none',
    zIndex: 5,
    boxSizing: 'border-box',
  },
  scoreLabel: {
    fontSize: 12,
    letterSpacing: 4,
    color: '#7d8aa3',
    textTransform: 'uppercase',
  },
  score: {
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: 52,
    lineHeight: 1,
    letterSpacing: 2,
    color: '#e9edf5',
    textShadow: '0 0 18px rgba(111,240,255,0.35)',
  },
  livesWrap: {
    display: 'flex',
    gap: 10,
  },
  life: {
    width: 30,
    height: 30,
    borderRadius: '50%',
    background: 'radial-gradient(circle at 35% 30%, #ff8095, #ff2e4d 65%, #7a0f22 100%)',
    boxShadow: '0 0 10px rgba(255,46,77,0.6)',
    transition: 'transform .3s ease, opacity .3s ease, filter .3s ease',
  },
  lifeLost: {
    opacity: 0.18,
    filter: 'grayscale(1)',
    transform: 'scale(0.7)',
    boxShadow: 'none',
  },
  comboText: {
    position: 'absolute',
    top: '26%',
    left: '50%',
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: 64,
    letterSpacing: 3,
    color: '#ffc93c',
    textShadow: '0 0 22px rgba(255,201,60,0.8), 0 0 6px #fff',
    pointerEvents: 'none',
    zIndex: 6,
    whiteSpace: 'nowrap',
    transition: 'opacity .6s ease, transform .6s ease',
  },
  overlay: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'radial-gradient(circle at 50% 30%, rgba(20,26,40,0.92), rgba(3,5,9,0.97) 70%)',
    zIndex: 20,
    textAlign: 'center',
    padding: 20,
  },
  kicker: {
    fontSize: 14,
    letterSpacing: 6,
    color: '#29e0a8',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  title: {
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: 'min(15vw, 110px)',
    lineHeight: 0.9,
    letterSpacing: 3,
    background: 'linear-gradient(180deg,#ffffff 0%, #cfe7ff 40%, #6ff0ff 100%)',
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    color: 'transparent',
    textShadow: '0 0 40px rgba(111,240,255,0.25)',
    margin: '0 0 6px 0',
  },
  subtitle: {
    color: '#7d8aa3',
    fontSize: 17,
    maxWidth: 440,
    margin: '0 0 34px 0',
    lineHeight: 1.5,
  },
  btn: {
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: 26,
    letterSpacing: 4,
    textTransform: 'uppercase',
    color: '#08110c',
    background: 'linear-gradient(180deg,#5cffc7,#29e0a8)',
    border: 'none',
    padding: '16px 46px',
    borderRadius: 100,
    cursor: 'pointer',
    boxShadow: '0 10px 30px rgba(41,224,168,0.35), inset 0 -4px 0 rgba(0,0,0,0.15)',
    transition: 'transform .15s ease, box-shadow .15s ease',
  },
  howto: {
    display: 'flex',
    gap: 26,
    marginTop: 6,
    color: '#7d8aa3',
    fontSize: 13,
  },
  howtoItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
  },
  newBest: {
    fontSize: 13,
    letterSpacing: 3,
    color: '#ffc93c',
    textTransform: 'uppercase',
    marginTop: -20,
    marginBottom: 20,
  },
  statRow: {
    display: 'flex',
    gap: 38,
    marginBottom: 30,
  },
  statBlock: {
    textAlign: 'center',
  },
  statNum: {
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: 48,
    lineHeight: 1,
  },
  statLbl: {
    fontSize: 12,
    letterSpacing: 3,
    color: '#7d8aa3',
    textTransform: 'uppercase',
  },
};
