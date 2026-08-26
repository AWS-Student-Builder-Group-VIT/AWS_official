import { useEffect, useRef } from 'react';
import useFlappyBird from './useFlappyBird';

/* ═══════════════════════════════════════════════════════════
   FLAPPY BIRD ("Glide") — React page wrapper
   The heavy lifting (canvas engine, RAF loop, input, audio)
   lives in the useFlappyBird hook. This component just renders
   the stage + canvas and mounts the engine onto the canvas ref.
   ═══════════════════════════════════════════════════════════ */

const FONTS_HREF =
  'https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;700;800&family=Nunito:wght@400;700;800;900&display=swap';

export default function FlappyBird() {
  const canvasRef = useRef(null);
  useFlappyBird(canvasRef);

  // Load the game fonts once, and clean up on unmount.
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

  return (
    <div
      className="fixed inset-0 flex items-center justify-center overflow-hidden select-none"
      style={{
        background:
          'radial-gradient(1200px 800px at 50% -10%, #3a2a55 0%, #1c1330 55%, #100b1e 100%)',
        touchAction: 'none',
      }}
    >
      <div
        style={{
          position: 'relative',
          borderRadius: '26px',
          overflow: 'hidden',
          background: '#000',
          boxShadow:
            '0 30px 60px -20px rgba(30,15,50,0.55), 0 0 0 6px rgba(255,247,234,0.06), 0 0 0 7px rgba(0,0,0,0.4)',
        }}
      >
        <canvas
          ref={canvasRef}
          width={390}
          height={700}
          style={{
            display: 'block',
            width: 'auto',
            height: 'min(94vh, 780px)',
            maxWidth: '94vw',
            aspectRatio: '390 / 700',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '10px',
            left: 0,
            right: 0,
            textAlign: 'center',
            fontSize: '11px',
            color: 'rgba(255,247,234,0.55)',
            fontFamily: "'Nunito', sans-serif",
            letterSpacing: '0.3px',
            pointerEvents: 'none',
          }}
        >
          space / tap to flap
        </div>
      </div>
    </div>
  );
}
