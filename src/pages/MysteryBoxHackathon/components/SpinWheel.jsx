import { useState, useRef } from 'react';
import { WHEEL_SEGMENTS } from '../data';

/* ═══════════════════════════════════════════════════════════
   WHEEL COMPONENT — Mystery Box Hackathon
   ═══════════════════════════════════════════════════════════ */

function polarToCart(cx, cy, r, angle) {
  const rad = (angle * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

export default function SpinWheel() {
  const [spinning, setSpinning] = useState(false);
  const [totalRotation, setTotalRotation] = useState(0);
  const [result, setResult] = useState('');
  const wheelRef = useRef(null);

  const cx = 140, cy = 140, r = 120;
  const total = WHEEL_SEGMENTS.length;
  const step = 360 / total;

  const segments = WHEEL_SEGMENTS.map((s, i) => {
    const startAngle = i * step - 90;
    const endAngle = (i + 1) * step - 90;
    const p1 = polarToCart(cx, cy, r, startAngle);
    const p2 = polarToCart(cx, cy, r, endAngle);
    const mid = polarToCart(cx, cy, r * 0.65, (startAngle + endAngle) / 2);
    const largeArc = step > 180 ? 1 : 0;
    const d = `M ${cx} ${cy} L ${p1.x} ${p1.y} A ${r} ${r} 0 ${largeArc} 1 ${p2.x} ${p2.y} Z`;

    return (
      <g key={i}>
        <path d={d} fill={s.color} stroke={s.stroke} strokeWidth="1.5" />
        <text x={mid.x} y={mid.y} textAnchor="middle" dominantBaseline="middle"
              fill={s.stroke} fontSize="9" fontWeight="600" fontFamily="'Space Mono', monospace">
          {s.label}
        </text>
      </g>
    );
  });

  const spin = () => {
    if (spinning) return;
    setSpinning(true);
    setResult('Spinning...');
    const extra = 360 * 8 + Math.random() * 360;
    const newTotal = totalRotation + extra;
    setTotalRotation(newTotal);

    setTimeout(() => {
      const norm = ((newTotal % 360) + 360) % 360;
      const ptr = (360 - norm + 90) % 360;
      const idx = Math.floor(ptr / step) % total;
      const seg = WHEEL_SEGMENTS[idx];
      setResult(seg.label.includes('Luck') ? '😅 Better luck next time!' : `🎉 You won: ${seg.label}!`);
      setSpinning(false);
    }, 3100);
  };

  return (
    <div className="flex flex-col items-center mt-10 gap-8">
      <div className="relative w-[280px] h-[280px]">
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-2xl z-10"
             style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}>▼</div>
        <svg
          ref={wheelRef}
          viewBox="0 0 280 280"
          width="280" height="280"
          style={{
            transition: 'transform 3s cubic-bezier(0.17, 0.67, 0.12, 0.99)',
            transform: `rotate(${totalRotation}deg)`,
          }}
        >
          <circle cx="140" cy="140" r="130" fill="#1a1200" stroke="#FF9900" strokeWidth="2" />
          {segments}
          <circle cx="140" cy="140" r="22" fill="#0A0C10" stroke="#FF9900" strokeWidth="2" />
          <text x="140" y="145" textAnchor="middle" fontSize="14" fill="#FF9900" fontWeight="700">SPIN</text>
        </svg>
      </div>
      <button
        onClick={spin}
        className="bg-primary-container text-background px-9 py-3.5 font-headline-md text-label-md uppercase tracking-widest font-bold transition-transform active:scale-[0.97] cursor-pointer border-0 hover:bg-primary"
      >
        🎰 Spin (1 Token)
      </button>
      <div className="flex items-center gap-2 bg-white/[0.03] border border-white/10 px-4 py-2.5 text-[13px] text-on-surface-variant font-label-sm">
        🪙 Earn tokens via quizzes, challenges, milestones &amp; bonus tasks
      </div>
      {result && (
        <p className="text-body-md font-headline-md text-primary-container min-h-[24px]">{result}</p>
      )}
    </div>
  );
}
