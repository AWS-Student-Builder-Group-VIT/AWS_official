import { useEffect, useRef, useState } from 'react';
import { GridScan } from './GridScan';

/**
 * GridScanIntro
 * Full-screen Three.js GridScan overlay with "We ARE the best" centered text.
 * Plays after the preloader ends, then fades out and calls onDone.
 *
 * Props:
 *   onDone          — called after fade-out completes
 *   displayDuration — total seconds to show before fading (default 6)
 */
export default function GridScanIntro({ onDone, displayDuration = 6 }) {
  const [phase, setPhase] = useState('entering'); // entering | visible | fading | done
  const timerRef = useRef(null);
  const [displayedText, setDisplayedText] = useState('');
  const fullText = "Beyond the Localhost.";

  useEffect(() => {
    const enter = setTimeout(() => setPhase('visible'), 80);
    return () => clearTimeout(enter);
  }, []);

  useEffect(() => {
    if (phase === 'visible') {
      let i = 0;
      const interval = setInterval(() => {
        setDisplayedText(fullText.substring(0, i + 1));
        i++;
        if (i >= fullText.length) clearInterval(interval);
      }, 70);
      return () => clearInterval(interval);
    }
  }, [phase]);

  useEffect(() => {
    if (phase !== 'visible') return;
    timerRef.current = setTimeout(() => setPhase('fading'), displayDuration * 1000);
    return () => clearTimeout(timerRef.current);
  }, [phase, displayDuration]);

  const handleTransitionEnd = (e) => {
    // Only act on the opacity transition of the root element
    if (e.target !== e.currentTarget) return;
    if (phase === 'fading') {
      setPhase('done');
      if (typeof onDone === 'function') onDone();
    }
  };

  if (phase === 'done') return null;

  return (
    <div
      onTransitionEnd={handleTransitionEnd}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9998,
        background: '#0a0a0c',
        opacity: phase === 'fading' ? 0 : 1,
        transition: 'opacity 0.9s cubic-bezier(0.4, 0, 0.2, 1)',
        overflow: 'hidden',
      }}
    >
      {/* ── Three.js GridScan fills entire screen ── */}
      <div style={{ position: 'absolute', inset: 0 }}>
        <GridScan
          sensitivity={0.55}
          lineThickness={1}
          linesColor="#2F293A"
          scanColor="#FF9900"
          scanOpacity={0.3}
          gridScale={0.1}
          lineStyle="solid"
          lineJitter={0.1}
          scanDirection="pingpong"
          noiseIntensity={0.01}
          scanGlow={0.5}
          scanSoftness={2}
          scanDuration={2}
          scanDelay={2}
          scanOnClick={false}
          enablePost={true}
          bloomIntensity={0.15}
          chromaticAberration={0.002}
          style={{ width: '100%', height: '100%' }}
        />
      </div>

      {/* ── Centered text overlay ── */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
          gap: '12px',
        }}
      >
        {/* Main headline */}
        <h1
          style={{
            fontFamily: "'Space Mono', 'Courier New', monospace",
            fontSize: 'clamp(2.2rem, 7vw, 5.5rem)',
            fontWeight: 700,
            color: '#ffffff',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            textAlign: 'center',
            lineHeight: 1.1,
            margin: 0,
            padding: '0 24px',
            opacity: phase === 'entering' ? 0 : 1,
            transform: phase === 'entering' ? 'translateY(20px)' : 'translateY(0)',
            transition: 'opacity 1s ease 0.4s, transform 1s ease 0.4s',
            textShadow: '0 0 60px rgba(255, 153, 0, 0.3), 0 4px 12px rgba(0,0,0,0.9)',
          }}
        >
          {displayedText}
          <span
            className="animate-pulse"
            style={{
              color: '#FF9900',
              textShadow: '0 0 30px rgba(255,153,0,0.7), 0 0 60px rgba(255,153,0,0.3)',
            }}
          >
            _
          </span>
        </h1>


      </div>

      {/* Corner accent dots */}
      {['top-left','top-right','bottom-left','bottom-right'].map((pos) => (
        <div
          key={pos}
          style={{
            position: 'absolute',
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: '#FF9900',
            boxShadow: '0 0 10px #FF9900, 0 0 20px rgba(255,153,0,0.4)',
            opacity: 0.7,
            ...(pos === 'top-left'     && { top: '24px',    left:  '24px'  }),
            ...(pos === 'top-right'    && { top: '24px',    right: '24px'  }),
            ...(pos === 'bottom-left'  && { bottom: '24px', left:  '24px'  }),
            ...(pos === 'bottom-right' && { bottom: '24px', right: '24px'  }),
          }}
        />
      ))}
    </div>
  );
}
