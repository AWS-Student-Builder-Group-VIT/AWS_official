import { useEffect, useRef, useCallback } from 'react';

const PROGRESS_KEYFRAMES = [
  { t: 0, v: 0 },
  { t: 300, v: 8 },
  { t: 800, v: 28 },
  { t: 1300, v: 45 },
  { t: 1800, v: 62 },
  { t: 2200, v: 74 },
  { t: 2700, v: 85 },
  { t: 3100, v: 93 },
  { t: 3500, v: 100 },
];

const STEP_THRESHOLDS = [0, 25, 55, 90];
const lerp = (a, b, t) => a + (b - a) * t;

/**
 * MobilePreloader — AWS Student Builder Group · VIT Vellore
 * Portrait mobile preloader (375×812 optimized).
 * 
 * Props:
 *   onDone  — callback fired after the preloader fades out
 */
export default function MobilePreloader({ onDone }) {
  const preloaderRef = useRef(null);
  const fillRef      = useRef(null);
  const pctRef       = useRef(null);
  const stepsRef     = useRef([]);
  const particlesRef = useRef(null);
  const rafRef       = useRef(null);
  const doneRef      = useRef(false);
  const currentStep  = useRef(-1);

  const getProgress = useCallback((elapsed) => {
    if (elapsed <= 0) return 0;
    if (elapsed >= PROGRESS_KEYFRAMES[PROGRESS_KEYFRAMES.length - 1].t) return 100;
    for (let i = 1; i < PROGRESS_KEYFRAMES.length; i++) {
      const prev = PROGRESS_KEYFRAMES[i - 1], curr = PROGRESS_KEYFRAMES[i];
      if (elapsed >= prev.t && elapsed <= curr.t) {
        const t = (elapsed - prev.t) / (curr.t - prev.t);
        const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
        return lerp(prev.v, curr.v, eased);
      }
    }
    return 100;
  }, []);

  const setStep = useCallback((idx) => {
    if (idx === currentStep.current) return;
    const steps = stepsRef.current;
    if (currentStep.current >= 0 && steps[currentStep.current]) {
      steps[currentStep.current].classList.remove('mp-step--active');
      steps[currentStep.current].classList.add('mp-step--exit');
    }
    currentStep.current = idx;
    if (steps[idx]) {
      steps[idx].classList.remove('mp-step--exit');
      steps[idx].classList.add('mp-step--active');
    }
  }, []);

  // ── Progress animation loop ──
  useEffect(() => {
    let barStart = null;

    const tick = (ts) => {
      if (!barStart) barStart = ts;
      const elapsed = ts - barStart;
      const pct = Math.min(100, getProgress(elapsed));
      const rounded = Math.round(pct);

      if (fillRef.current) fillRef.current.style.width = pct + '%';
      if (pctRef.current) pctRef.current.textContent = rounded + '%';

      // Update step message
      for (let i = STEP_THRESHOLDS.length - 1; i >= 0; i--) {
        if (pct >= STEP_THRESHOLDS[i]) { setStep(i); break; }
      }

      if (pct < 100) {
        rafRef.current = requestAnimationFrame(tick);
      } else if (!doneRef.current) {
        doneRef.current = true;
        // Hold final message, then fade out
        setTimeout(() => {
          if (preloaderRef.current) {
            preloaderRef.current.classList.add('mp-fade-out');
          }
          setTimeout(() => {
            if (typeof onDone === 'function') onDone();
          }, 500);
        }, 600);
      }
    };

    // Start progress after 1.2s delay
    const delayTimer = setTimeout(() => {
      rafRef.current = requestAnimationFrame(tick);
    }, 1200);

    return () => {
      clearTimeout(delayTimer);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [getProgress, setStep, onDone]);

  // ── Spawn floating particles ──
  useEffect(() => {
    const container = particlesRef.current;
    if (!container) return;
    const count = 12;
    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      p.className = 'mp-particle';
      const size = 1.5 + Math.random() * 2;
      p.style.width  = size + 'px';
      p.style.height = size + 'px';
      p.style.left   = (8 + Math.random() * 84) + '%';
      p.style.bottom = (60 + Math.random() * 140) + 'px';
      p.style.animationDuration = (5 + Math.random() * 4) + 's';
      p.style.animationDelay    = (Math.random() * 4) + 's';
      container.appendChild(p);
    }
    return () => { container.innerHTML = ''; };
  }, []);

  // ═══════════════════════════════════════════════════════════
  // ALL STYLES — prefixed with "mp-" to avoid collisions
  // with the desktop AwsStudentBuilderLoader
  // ═══════════════════════════════════════════════════════════
  const css = `
    /* ── Container ── */
    .mp-preloader {
      position: fixed;
      inset: 0;
      width: 100vw;
      height: 100vh;
      background: #0A0C10;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      z-index: 99999;
      touch-action: none;
      -webkit-user-select: none;
      user-select: none;
      padding:
        env(safe-area-inset-top)
        env(safe-area-inset-right)
        env(safe-area-inset-bottom)
        env(safe-area-inset-left);
      transition: opacity 0.5s ease-out;
    }
    .mp-fade-out {
      opacity: 0;
      pointer-events: none;
    }

    /* ── Animated grid background ── */
    .mp-grid {
      position: absolute;
      inset: -40px 0 0 0;
      width: 100%;
      height: calc(100% + 80px);
      background-image:
        linear-gradient(to right, rgba(255, 153, 0, 0.035) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(255, 153, 0, 0.035) 1px, transparent 1px);
      background-size: 40px 40px;
      animation: mp-gridScroll 6s linear infinite;
    }
    @keyframes mp-gridScroll {
      0%   { transform: translateY(-40px); }
      100% { transform: translateY(0); }
    }

    /* ── Concentric glow rings ── */
    .mp-rings {
      position: absolute;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      pointer-events: none;
    }
    .mp-ring {
      position: absolute;
      border-radius: 50%;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      animation: mp-pulse 3.5s ease-in-out infinite;
    }
    .mp-ring--outer {
      width: 340px; height: 340px;
      border: 1px solid rgba(255, 153, 0, 0.06);
      animation-delay: 0s;
    }
    .mp-ring--mid {
      width: 260px; height: 260px;
      border: 1px solid rgba(255, 153, 0, 0.08);
      animation-delay: 0.6s;
    }
    .mp-ring--inner {
      width: 180px; height: 180px;
      border: 1px solid rgba(255, 153, 0, 0.10);
      animation-delay: 1.2s;
    }
    @keyframes mp-pulse {
      0%, 100% { transform: translate(-50%, -50%) scale(1);    opacity: 0.5; }
      50%      { transform: translate(-50%, -50%) scale(1.06);  opacity: 1; }
    }

    /* ── Corner bracket accents ── */
    .mp-corner {
      position: absolute;
      width: 20px; height: 20px;
      z-index: 5;
      opacity: 0.25;
    }
    .mp-corner--tl { top: 24px; left: 24px;     border-top: 1.5px solid #FF9900; border-left: 1.5px solid #FF9900; }
    .mp-corner--tr { top: 24px; right: 24px;    border-top: 1.5px solid #FF9900; border-right: 1.5px solid #FF9900; }
    .mp-corner--bl { bottom: 24px; left: 24px;  border-bottom: 1.5px solid #FF9900; border-left: 1.5px solid #FF9900; }
    .mp-corner--br { bottom: 24px; right: 24px; border-bottom: 1.5px solid #FF9900; border-right: 1.5px solid #FF9900; }

    /* ── Floating particles ── */
    .mp-particle {
      position: absolute;
      background: #FF9900;
      border-radius: 50%;
      opacity: 0;
      z-index: 3;
      animation: mp-float linear infinite;
    }
    @keyframes mp-float {
      0%   { opacity: 0;    transform: translateY(0) scale(1); }
      15%  { opacity: 0.45; }
      75%  { opacity: 0.15; }
      100% { opacity: 0;    transform: translateY(-200px) scale(0.3); }
    }

    /* ── Content stack ── */
    .mp-content {
      position: relative;
      z-index: 10;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }

    /* AWS logo text */
    .mp-aws {
      font-family: 'Space Mono', monospace, sans-serif;
      font-size: 48px;
      font-weight: 900;
      color: #FF9900;
      letter-spacing: -1px;
      line-height: 1;
      margin-bottom: 16px;
      opacity: 0;
      transform: scale(0.7) translateY(20px);
      animation: mp-logoIn 0.8s cubic-bezier(0.22, 1, 0.36, 1) 0.3s forwards;
    }
    @keyframes mp-logoIn {
      to { opacity: 1; transform: scale(1) translateY(0); }
    }

    /* STUDENT BUILDER */
    .mp-student {
      font-family: 'Space Mono', monospace, sans-serif;
      font-size: 22px;
      font-weight: 700;
      color: #FF9900;
      letter-spacing: 3px;
      text-transform: uppercase;
      margin-bottom: 6px;
      opacity: 0;
      transform: translateY(16px);
      animation: mp-fadeUp 0.7s cubic-bezier(0.22, 1, 0.36, 1) 0.6s forwards;
    }

    /* VIT · Vellore */
    .mp-vit {
      font-family: 'Inter', sans-serif;
      font-size: 13px;
      font-weight: 500;
      color: rgba(255, 255, 255, 0.55);
      letter-spacing: 4px;
      text-transform: uppercase;
      margin-bottom: 4px;
      opacity: 0;
      transform: translateY(16px);
      animation: mp-fadeUp 0.7s cubic-bezier(0.22, 1, 0.36, 1) 0.75s forwards;
    }

    /* Community */
    .mp-community {
      font-family: 'Inter', sans-serif;
      font-size: 11px;
      font-weight: 400;
      color: rgba(255, 153, 0, 0.5);
      letter-spacing: 6px;
      text-transform: uppercase;
      margin-bottom: 20px;
      opacity: 0;
      transform: translateY(16px);
      animation: mp-fadeUp 0.7s cubic-bezier(0.22, 1, 0.36, 1) 0.85s forwards;
    }

    /* Tagline */
    .mp-tagline {
      font-family: 'Inter', sans-serif;
      font-size: 12px;
      font-weight: 400;
      color: rgba(255, 255, 255, 0.3);
      letter-spacing: 1px;
      margin-bottom: 48px;
      opacity: 0;
      transform: translateY(16px);
      animation: mp-fadeUp 0.7s cubic-bezier(0.22, 1, 0.36, 1) 0.95s forwards;
    }

    @keyframes mp-fadeUp {
      to { opacity: 1; transform: translateY(0); }
    }

    /* ── Progress section ── */
    .mp-progress {
      width: 240px;
      opacity: 0;
      transform: translateY(16px);
      animation: mp-fadeUp 0.7s cubic-bezier(0.22, 1, 0.36, 1) 1.05s forwards;
    }
    .mp-progress__header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }
    .mp-progress__label {
      font-family: 'Space Mono', monospace, sans-serif;
      font-size: 10px;
      font-weight: 400;
      color: rgba(255, 255, 255, 0.35);
      letter-spacing: 2px;
      text-transform: uppercase;
    }
    .mp-progress__pct {
      font-family: 'Space Mono', monospace, sans-serif;
      font-size: 11px;
      font-weight: 700;
      color: #FF9900;
      letter-spacing: 1px;
      min-width: 32px;
      text-align: right;
    }
    .mp-progress__track {
      width: 100%;
      height: 3px;
      background: rgba(255, 255, 255, 0.06);
      border-radius: 2px;
      overflow: visible;
      position: relative;
    }
    .mp-progress__fill {
      height: 100%;
      width: 0%;
      background: linear-gradient(90deg, #FF9900 0%, #FFB84D 80%, #ffe6b3 100%);
      border-radius: 2px;
      position: relative;
    }
    .mp-progress__fill::after {
      content: '';
      position: absolute;
      right: -5px;
      top: 50%;
      transform: translateY(-50%);
      width: 10px;
      height: 10px;
      background: radial-gradient(circle, rgba(255, 200, 80, 0.9) 0%, transparent 70%);
      border-radius: 50%;
      animation: mp-dotGlow 0.4s ease-in-out infinite alternate;
    }
    @keyframes mp-dotGlow {
      from { opacity: 0.5; transform: translateY(-50%) scale(0.9); }
      to   { opacity: 1;   transform: translateY(-50%) scale(1.2); }
    }

    /* ── Step messages ── */
    .mp-steps {
      margin-top: 18px;
      height: 20px;
      position: relative;
      text-align: center;
      overflow: hidden;
    }
    .mp-step {
      font-family: 'Inter', sans-serif;
      font-size: 10px;
      color: rgba(255, 153, 0, 0.55);
      letter-spacing: 1.5px;
      text-transform: uppercase;
      position: absolute;
      width: 100%;
      left: 0;
      top: 0;
      opacity: 0;
      transform: translateY(10px);
      transition: opacity 0.35s ease, transform 0.35s ease;
    }
    .mp-step--active {
      opacity: 1;
      transform: translateY(0);
    }
    .mp-step--exit {
      opacity: 0;
      transform: translateY(-10px);
    }
  `;

  return (
    <div className="mp-preloader" ref={preloaderRef}>
      <style>{css}</style>

      {/* Animated grid background */}
      <div className="mp-grid" />

      {/* Concentric glow rings */}
      <div className="mp-rings">
        <div className="mp-ring mp-ring--outer" />
        <div className="mp-ring mp-ring--mid" />
        <div className="mp-ring mp-ring--inner" />
      </div>

      {/* Corner bracket accents */}
      <div className="mp-corner mp-corner--tl" />
      <div className="mp-corner mp-corner--tr" />
      <div className="mp-corner mp-corner--bl" />
      <div className="mp-corner mp-corner--br" />

      {/* Floating particles */}
      <div ref={particlesRef} />

      {/* Content */}
      <div className="mp-content">
        <div className="mp-aws">AWS</div>
        <div className="mp-student">STUDENT BUILDER</div>
        <div className="mp-vit">VIT · Vellore</div>
        <div className="mp-community">Community</div>
        <p className="mp-tagline">Build · Deploy · Innovate</p>

        <div className="mp-progress">
          <div className="mp-progress__header">
            <span className="mp-progress__label">Initializing</span>
            <span className="mp-progress__pct" ref={pctRef}>0%</span>
          </div>
          <div className="mp-progress__track">
            <div className="mp-progress__fill" ref={fillRef} />
          </div>
          <div className="mp-steps">
            <div className="mp-step" ref={el => stepsRef.current[0] = el}>Connecting to cloud...</div>
            <div className="mp-step" ref={el => stepsRef.current[1] = el}>Loading services...</div>
            <div className="mp-step" ref={el => stepsRef.current[2] = el}>Configuring stack...</div>
            <div className="mp-step" ref={el => stepsRef.current[3] = el}>Ready to build ✦</div>
          </div>
        </div>
      </div>
    </div>
  );
}
