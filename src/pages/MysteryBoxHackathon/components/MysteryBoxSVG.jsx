import { motion } from 'framer-motion';

/* ═══════════════════════════════════════════════════════════
   MYSTERY BOX SVGs — Mystery Box Hackathon
   ═══════════════════════════════════════════════════════════ */

export function MysteryBoxSVG({ size = 300 }) {
  return (
    <motion.svg
      viewBox="0 0 320 320"
      width={size} height={size}
      animate={{ y: [0, -12, 0] }}
      transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
      style={{ overflow: 'visible' }}
    >
      <defs>
        <radialGradient id="boxGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FF9900" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#FF9900" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="160" cy="240" rx="90" ry="18" fill="url(#boxGlow)" />
      <rect x="80" y="130" width="160" height="110" rx="8" fill="#1a1200" stroke="#FF9900" strokeWidth="1.5" />
      <rect x="76" y="118" width="168" height="30" rx="6" fill="#221800" stroke="#FF9900" strokeWidth="1.5" />
      <rect x="148" y="118" width="24" height="122" rx="4" fill="#FF9900" opacity="0.6" />
      <text x="160" y="188" textAnchor="middle" fontSize="48" fontFamily="Arial">❓</text>
      <circle cx="80" cy="60" r="6" fill="#00A8FF" opacity="0.8" />
      <circle cx="240" cy="80" r="4" fill="#7C4DFF" opacity="0.8" />
      <circle cx="260" cy="40" r="5" fill="#FF9900" opacity="0.6" />
      <circle cx="60" cy="100" r="3" fill="#00A8FF" opacity="0.5" />
      <text x="55" y="72" fontSize="11" fill="#00A8FF" opacity="0.7" fontFamily="monospace">const</text>
      <text x="230" y="52" fontSize="11" fill="#7C4DFF" opacity="0.7" fontFamily="monospace">await</text>
      <text x="260" y="100" fontSize="11" fill="#FF9900" opacity="0.6" fontFamily="monospace">{'S3{}'}</text>
      <path d="M70,40 Q50,30 40,50 Q30,70 50,75 Q70,80 80,60 Z" fill="none" stroke="#00A8FF" strokeWidth="1" opacity="0.4" />
      <path d="M250,130 Q270,120 280,140 Q290,160 270,165 Q250,170 240,150 Z" fill="none" stroke="#FF9900" strokeWidth="1" opacity="0.4" />
    </motion.svg>
  );
}

export function MiniMysteryBox() {
  return (
    <motion.svg
      viewBox="0 0 200 200"
      width="160" height="160"
      animate={{ y: [0, -10, 0] }}
      transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
      style={{ overflow: 'visible' }}
    >
      <ellipse cx="100" cy="175" rx="60" ry="12" fill="rgba(255,153,0,0.15)" />
      <rect x="40" y="90" width="120" height="80" rx="6" fill="#1a1200" stroke="#FF9900" strokeWidth="2" />
      <rect x="36" y="78" width="128" height="22" rx="5" fill="#221800" stroke="#FF9900" strokeWidth="2" />
      <rect x="92" y="78" width="16" height="92" rx="3" fill="#FF9900" opacity="0.7" />
      <text x="100" y="143" textAnchor="middle" fontSize="36">❓</text>
      <circle cx="100" cy="50" r="28" fill="none" stroke="#FF9900" strokeWidth="1" strokeDasharray="4 3" opacity="0.5" />
      <circle cx="100" cy="50" r="38" fill="none" stroke="#FF9900" strokeWidth="0.5" strokeDasharray="2 6" opacity="0.3" />
    </motion.svg>
  );
}

export function MiniChaosMysteryBox() {
  return (
    <motion.svg
      viewBox="0 0 200 200"
      width="160" height="160"
      animate={{ y: [0, -10, 0] }}
      transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
      style={{ overflow: 'visible' }}
    >
      <ellipse cx="100" cy="175" rx="60" ry="12" fill="rgba(255,80,80,0.15)" />
      <rect x="40" y="90" width="120" height="80" rx="6" fill="#150505" stroke="#ff5050" strokeWidth="2" />
      <rect x="36" y="78" width="128" height="22" rx="5" fill="#200808" stroke="#ff5050" strokeWidth="2" />
      <rect x="92" y="78" width="16" height="92" rx="3" fill="#7C4DFF" opacity="0.7" />
      <text x="100" y="143" textAnchor="middle" fontSize="36">⚡</text>
      <circle cx="100" cy="50" r="28" fill="none" stroke="#ff5050" strokeWidth="1" strokeDasharray="4 3" opacity="0.5" />
      <circle cx="100" cy="50" r="38" fill="none" stroke="#ff5050" strokeWidth="0.5" strokeDasharray="2 6" opacity="0.3" />
    </motion.svg>
  );
}
