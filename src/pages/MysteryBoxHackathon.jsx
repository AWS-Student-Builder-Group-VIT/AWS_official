import { useState, useEffect, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import awsIcon from '../assets/aws_icon.jpeg';

/* ═══════════════════════════════════════════════════════════
   MYSTERY BOX HACKATHON — Landing Page
   ═══════════════════════════════════════════════════════════ */

/* ── Wheel Data ── */
const WHEEL_SEGMENTS = [
  { label: 'Better Luck', color: '#2a1800', stroke: '#FF9900' },
  { label: 'Better Luck', color: '#1a0020', stroke: '#7C4DFF' },
  { label: 'Better Luck', color: '#001a2a', stroke: '#00A8FF' },
  { label: 'Better Luck', color: '#2a1800', stroke: '#FF9900' },
  { label: 'Better Luck', color: '#1a0020', stroke: '#7C4DFF' },
  { label: '🥇 Golden Pass', color: '#1a1000', stroke: '#FFD700' },
  { label: '🃏 Wildcard', color: '#0f0025', stroke: '#b24dff' },
];

/* ── How It Works Steps ── */
const STEPS = [
  { num: 1, label: 'Team Registration', color: 'orange' },
  { num: 2, label: 'Topic Reveal', color: 'blue' },
  { num: 3, label: 'Build From Scratch', color: 'purple' },
  { num: 4, label: 'Earn Points', color: 'orange' },
  { num: 5, label: 'Unlock Advantages', color: 'blue' },
  { num: 6, label: 'Face Chaos Events', color: 'purple' },
  { num: 7, label: 'Final Pitch', color: 'orange' },
];

/* ── Rules ── */
const RULES = [
  { icon: '🎯', title: 'Topics Assigned On The Spot', desc: 'Zero preparation possible. Your problem statement is revealed only at kickoff. Pure skill, no shortcuts.' },
  { icon: '🔒', title: 'No Pre-Built Projects', desc: 'Everything is built during the event. Bringing existing code will get your team disqualified.' },
  { icon: '⚡', title: 'Real-Time Innovation', desc: 'Ideas born and executed live. Judges observe the build process, not just the outcome.' },
  { icon: '🏗️', title: 'Build Everything During The Event', desc: 'Architecture, design, code, deployment — all within the window. Clock is always ticking.' },
];

/* ── Points Sources ── */
const POINTS = [
  { icon: '🧠', val: '+50', name: 'AWS Quiz', pct: 70, color: '#FF9900' },
  { icon: '🧩', val: '+40', name: 'Cloud Puzzle', pct: 55, color: '#00A8FF' },
  { icon: '🐛', val: '+60', name: 'Debug Challenge', pct: 40, color: '#7C4DFF' },
  { icon: '🗺️', val: '+45', name: 'Treasure Hunt', pct: 30, color: '#00c864' },
  { icon: '⭐', val: '+30', name: 'Bonus Tasks', pct: 60, color: '#ffd700' },
  { icon: '⚡', val: '+80', name: 'Fastest Solver', pct: 20, color: '#ff3264' },
];

/* ── Shop Items ── */
const SHOP_ITEMS = [
  { price: '150 pts', title: 'Mentor Help', desc: '30 minutes with an expert mentor for technical guidance on your build.' },
  { price: '80 pts', title: 'Hint Card', desc: 'Unlock a targeted hint for your current problem from the organizers.' },
  { price: '100 pts', title: 'Technical Review', desc: 'Get a quick code review and feedback from a senior developer.' },
  { price: '120 pts', title: 'Extra Pitch Time', desc: 'Buy 3 additional minutes for your final presentation to the judges.' },
  { price: '200 pts', title: 'Second Chance Token', desc: 'Save your team from elimination. One-time use per team only.' },
  { price: '180 pts', title: 'Reveal Judging Criteria', desc: 'Peek at what judges are scoring most heavily before your pitch.' },
  { price: '250 pts', title: 'Recruit a Friend', desc: 'Add a temporary external collaborator to your team for 2 hours.' },
];

/* ── Mystery Box Rewards & Twists ── */
const REWARDS = ['+100 Points', 'Mentor Assistance', 'Extra Review Time', 'Hint Card', 'Technical Support'];
const TWISTS = ['Technology Restriction', 'Topic Modification', 'Additional Feature Req.', 'Surprise Client Request'];

/* ── Chaos Events ── */
const CHAOS_EVENTS = [
  { icon: '🌐', title: 'Market Shift', desc: 'Your target user persona has changed completely. Rethink your value proposition.' },
  { icon: '💸', title: 'Investor Pitch', desc: 'An investor arrives in 15 minutes. You must pitch your MVP immediately.' },
  { icon: '🔐', title: 'Security Alert', desc: 'A critical vulnerability has been found in your stack. Patch it now.' },
  { icon: '✂️', title: 'Budget Cut', desc: 'Your cloud budget has been slashed by 60%. Optimize your architecture.' },
  { icon: '📈', title: 'Viral Growth', desc: 'Congrats — your app went viral. Now handle 100× the expected load.' },
  { icon: '🔄', title: 'Client Revision', desc: 'The client changed their mind. Major feature redesign required. Today.' },
];

/* ── Penalties ── */
const PENALTIES = [
  { icon: '💸', val: '−50 pts', name: 'Point Loss' },
  { icon: '🃏', val: '−1', name: 'Lose Hint' },
  { icon: '⚙️', val: '+1', name: 'Extra Feature Required' },
  { icon: '⏱️', val: '−2 min', name: 'Reduced Pitch Time' },
  { icon: '🎯', val: '×1', name: 'Surprise Judge Question' },
];

/* ── Finale Pills ── */
const FINALE_PILLS = ['🎁 Mystery Boxes', '⚡ Chaos Cards', '🛒 Point Shop', '🎰 Spin Wheel', '🎤 Final Presentation'];


/* ═══════════════════════════════════════════════════════════
   REUSABLE SUB-COMPONENTS
   ═══════════════════════════════════════════════════════════ */

function FadeInSection({ children, className = '', delay = 0 }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

function SectionLabel({ children, className = '' }) {
  return (
    <p className={`font-label-sm text-[11px] tracking-[3px] uppercase font-medium mb-3 text-primary-container ${className}`}>
      {children}
    </p>
  );
}

function SectionTitle({ children }) {
  return (
    <h2 className="font-headline-lg text-headline-lg text-on-surface tracking-widest uppercase mb-4 leading-tight">
      {children}
    </h2>
  );
}

function SectionSub({ children, center = false }) {
  return (
    <p className={`text-on-surface-variant text-body-md font-body-md max-w-[580px] ${center ? 'mx-auto' : ''}`}>
      {children}
    </p>
  );
}

function TypeWriter({ words = ['Hackathon', 'Hack It'], typingDelay = 120, erasingDelay = 80, pauseTime = 2000 }) {
  const [displayed, setDisplayed] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [loopNum, setLoopNum] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-40px' });

  useEffect(() => {
    if (!isInView) return;

    let timeout;
    const currentWord = words[loopNum % words.length];
    const nextWord = words[(loopNum + 1) % words.length];

    // Find the common prefix to know when to stop backspacing
    let commonPrefixLength = 0;
    while (
      commonPrefixLength < currentWord.length &&
      commonPrefixLength < nextWord.length &&
      currentWord[commonPrefixLength].toLowerCase() === nextWord[commonPrefixLength].toLowerCase()
    ) {
      commonPrefixLength++;
    }

    if (isDeleting) {
      // Backspacing
      if (displayed.length > commonPrefixLength) {
        // Human-like erasing variance (faster than typing)
        const currentErasingDelay = erasingDelay - 20 + Math.random() * 40;
        timeout = setTimeout(() => {
          setDisplayed(currentWord.substring(0, displayed.length - 1));
        }, currentErasingDelay);
      } else {
        setIsDeleting(false);
        setLoopNum(loopNum + 1);
      }
    } else {
      // Typing
      if (displayed.length < currentWord.length) {
        // Human-like typing variance (slower with natural pauses)
        let currentTypingDelay = typingDelay - 40 + Math.random() * 80;
        // Occasional longer pause simulating thinking
        if (Math.random() < 0.1) currentTypingDelay += 150;
        
        timeout = setTimeout(() => {
          setDisplayed(currentWord.substring(0, displayed.length + 1));
        }, currentTypingDelay);
      } else {
        // Pause before deleting
        timeout = setTimeout(() => {
          setIsDeleting(true);
        }, pauseTime);
      }
    }

    return () => clearTimeout(timeout);
  }, [displayed, isDeleting, loopNum, isInView, words, typingDelay, erasingDelay, pauseTime]);

  return (
    <span ref={ref} className="inline-flex items-baseline whitespace-nowrap">
      {displayed}
      <span className="inline-block w-[clamp(4px,0.6vw,8px)] ml-1 md:ml-2 bg-primary-container animate-pulse"
            style={{ height: '0.85em', transform: 'translateY(0.05em)' }} />
    </span>
  );
}

function Divider() {
  return <hr className="border-0 border-t border-white/5 my-0" />;
}

/* ═══════════════════════════════════════════════════════════
   WHEEL COMPONENT
   ═══════════════════════════════════════════════════════════ */

function polarToCart(cx, cy, r, angle) {
  const rad = (angle * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function SpinWheel() {
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
        🪙 Earn tokens via quizzes, challenges, milestones & bonus tasks
      </div>
      {result && (
        <p className="text-body-md font-headline-md text-primary-container min-h-[24px]">{result}</p>
      )}
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════
   MYSTERY BOX SVG
   ═══════════════════════════════════════════════════════════ */

function MysteryBoxSVG({ size = 300 }) {
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

function MiniMysteryBox() {
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


/* ═══════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════ */

export default function MysteryBoxHackathon() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const stepColors = {
    orange: { bg: 'rgba(255,153,0,0.15)', border: '#FF9900', text: '#FF9900' },
    blue:   { bg: 'rgba(0,168,255,0.15)', border: '#00A8FF', text: '#00A8FF' },
    purple: { bg: 'rgba(124,77,255,0.15)', border: '#7C4DFF', text: '#7C4DFF' },
  };

  /* ── Floating orange squares — same as homepage hero ── */
  const FLOATING_SQUARES = [
    { top: '2%',   left: '8%',   size: 120, delay: 0,    opacity: 0.7  },
    { top: '5%',   right: '12%', size: 80,  delay: 1.2,  opacity: 0.5  },
    { top: '12%',  left: '65%',  size: 60,  delay: 2.5,  opacity: 0.35 },
    { top: '18%',  left: '3%',   size: 50,  delay: 0.8,  opacity: 0.3  },
    { top: '25%',  right: '5%',  size: 100, delay: 1.8,  opacity: 0.5  },
    { top: '30%',  left: '45%',  size: 40,  delay: 3.2,  opacity: 0.25 },
    { top: '35%',  left: '15%',  size: 70,  delay: 0.5,  opacity: 0.4  },
    { top: '42%',  right: '18%', size: 90,  delay: 2.0,  opacity: 0.45 },
    { top: '48%',  left: '75%',  size: 55,  delay: 1.5,  opacity: 0.3  },
    { top: '55%',  left: '5%',   size: 110, delay: 0.3,  opacity: 0.55 },
    { top: '60%',  right: '8%',  size: 45,  delay: 2.8,  opacity: 0.3  },
    { top: '65%',  left: '55%',  size: 65,  delay: 1.0,  opacity: 0.35 },
    { top: '72%',  left: '20%',  size: 85,  delay: 3.5,  opacity: 0.4  },
    { top: '78%',  right: '25%', size: 50,  delay: 0.7,  opacity: 0.3  },
    { top: '85%',  left: '10%',  size: 75,  delay: 2.2,  opacity: 0.45 },
    { top: '90%',  right: '15%', size: 60,  delay: 1.6,  opacity: 0.35 },
    { top: '95%',  left: '40%',  size: 95,  delay: 0.4,  opacity: 0.4  },
  ];

  const levitateAnimation = {
    y: [0, -15, 0],
    scale: [1, 1.05, 1],
    boxShadow: [
      '0px 0px 0px 0px rgba(255, 153, 0, 0)',
      '10px 20px 30px -10px rgba(255, 153, 0, 0.5)',
      '0px 0px 0px 0px rgba(255, 153, 0, 0)',
    ],
  };

  return (
    <div className="min-h-screen text-on-surface font-body-md relative overflow-hidden">

      {/* ═══════════ FLOATING ORANGE SQUARES ═══════════ */}
      {FLOATING_SQUARES.map((sq, i) => (
        <motion.div
          key={i}
          animate={levitateAnimation}
          transition={{ repeat: Infinity, duration: 5, ease: 'easeInOut', delay: sq.delay }}
          className="absolute z-0 bg-primary-container hidden md:block pointer-events-none"
          style={{
            top: sq.top,
            left: sq.left,
            right: sq.right,
            width: sq.size,
            height: sq.size,
            opacity: sq.opacity,
          }}
        />
      ))}

      {/* ═══════════ NAV ═══════════ */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-white/5 flex justify-between items-center px-container-padding py-3.5">
        <div className="flex items-center gap-2">
          <img src={awsIcon} alt="AWS Student Builder Club" className="w-8 h-8 rounded-full object-cover" />
          <span className="font-headline-md text-label-md text-primary-container uppercase tracking-widest">AWS Student Builder Club</span>
        </div>
        <div className="hidden md:flex gap-7">
          {['How It Works', 'Points', 'Chaos', 'Prizes'].map(link => (
            <a key={link} href={`#${link.toLowerCase().replace(/ /g, '-')}`}
               className="text-[13px] text-on-surface-variant hover:text-primary-container transition-colors duration-200 font-label-sm no-underline">
              {link}
            </a>
          ))}
        </div>
        <button className="bg-primary-container text-background px-5 py-2 text-[13px] font-headline-md uppercase tracking-widest border-0 cursor-pointer hover:bg-primary transition-colors">
          Register Now
        </button>
      </nav>


      {/* ═══════════ HERO ═══════════ */}
      <section
        className="relative overflow-hidden py-[90px] px-container-padding"
        style={{
          background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(255,153,0,0.1) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 80% 50%, rgba(255,153,0,0.06) 0%, transparent 50%)',
        }}
      >
        <div className="max-w-[1100px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-[60px] items-center">
          <FadeInSection>
            {/* Badge */}

            <h1 className="font-headline-xl text-on-surface leading-[1.05] mb-4 uppercase tracking-widest flex flex-col items-start">
              <span className="text-[clamp(42px,8vw,96px)]">Mystery</span>
              <span className="text-[clamp(42px,8vw,96px)]">Box</span>
              <span className="text-[clamp(42px,8vw,96px)] text-primary-container" style={{ textShadow: '0 0 30px rgba(255,153,0,0.4)' }}>
                <TypeWriter text="Hackathon" delay={120} />
              </span>
            </h1>

            <p className="text-[clamp(18px,2.5vw,24px)] text-primary-container font-headline-md mb-5 uppercase tracking-widest">
              Build. Adapt. Survive.
            </p>

            <p className="text-on-surface-variant text-body-md font-body-md mb-9 max-w-[480px]">
              A hackathon where coding skills, strategy, teamwork, and adaptability matter equally.
              Your topic arrives in a box. Your fate arrives in chaos.
            </p>

            <div className="flex gap-3.5 flex-wrap">
              <button className="bg-primary-container text-background px-7 py-3.5 font-bold text-[15px] font-headline-md uppercase tracking-widest border-0 cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(255,153,0,0.4)] hover:bg-primary transition-all">
                Register Now →
              </button>
              <button className="bg-transparent text-on-surface px-7 py-3.5 font-semibold text-[15px] font-headline-md uppercase tracking-widest cursor-pointer border border-white/10 hover:border-primary-container hover:text-primary-container transition-all">
                Learn More
              </button>
            </div>

            {/* Stats */}
            <div className="flex gap-8 mt-10 flex-wrap">
              {[
                { val: '24h', label: 'Duration', color: '#FF9900' },
                { val: '∞', label: 'Possibilities', color: '#00A8FF' },
                { val: '7', label: 'Chaos Events', color: '#7C4DFF' },
              ].map(s => (
                <div key={s.label}>
                  <div className="text-[28px] font-bold font-headline-xl tracking-widest" style={{ color: s.color === '#FF9900' ? 'var(--color-primary-container)' : s.color }}>{s.val}</div>
                  <div className="text-[12px] text-on-surface-variant font-label-sm uppercase tracking-widest">{s.label}</div>
                </div>
              ))}
            </div>
          </FadeInSection>

          <FadeInSection delay={0.2} className="flex items-center justify-center">
            <MysteryBoxSVG />
          </FadeInSection>
        </div>
      </section>


      <Divider />


      {/* ═══════════ HOW IT WORKS ═══════════ */}
      <section className="py-20 px-container-padding max-w-[1100px] mx-auto" id="how-it-works">
        <FadeInSection>
          <SectionLabel>The Journey</SectionLabel>
          <SectionTitle>
            How It <span className="text-tertiary" style={{ textShadow: '0 0 30px rgba(0,168,255,0.4)' }}>Works</span>
          </SectionTitle>
          <SectionSub>Seven stages between registration and glory. Each one tests something different.</SectionSub>
        </FadeInSection>

        <FadeInSection delay={0.15}>
          <div className="flex flex-wrap items-center justify-center mt-12 gap-0">
            {STEPS.map((s, i) => {
              const c = stepColors[s.color];
              return (
                <div key={i} className="flex items-start">
                  <div className="flex flex-col items-center gap-2.5 w-[120px]">
                    <div className="w-11 h-11 rounded-[12px] flex items-center justify-center text-[15px] font-bold font-headline-md"
                         style={{ background: c.bg, border: `1.5px solid ${c.border}`, color: c.text }}>
                      {s.num}
                    </div>
                    <span className="text-[12px] text-center text-on-surface-variant font-medium font-label-sm">{s.label}</span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className="h-11 flex items-center justify-center w-[30px]">
                      <span className="text-on-surface-variant/30 text-xl font-bold">→</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </FadeInSection>
      </section>


      <Divider />


      {/* ═══════════ CORE RULES ═══════════ */}
      <section style={{ background: 'linear-gradient(135deg, rgba(255,153,0,0.03), rgba(255,153,0,0.01))' }}>
        <div className="py-20 px-6 max-w-[1100px] mx-auto">
          <FadeInSection className="text-center">
            <SectionLabel>Core Rules</SectionLabel>
            <SectionTitle>
              Not Your <span className="text-primary-container" style={{ textShadow: '0 0 30px rgba(255,153,0,0.4)' }}>Ordinary</span> Hackathon
            </SectionTitle>
            <SectionSub center>No templates. No pre-built repos. Pure raw innovation under pressure.</SectionSub>
          </FadeInSection>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-10">
            {RULES.map((rule, i) => (
              <FadeInSection key={i} delay={i * 0.08}>
                <div className="relative overflow-hidden border border-white/[0.08] p-7"
                     style={{
                       background: 'linear-gradient(135deg, rgba(255,153,0,0.05), rgba(255,153,0,0.02))',
                       borderRadius: '2px',
                     }}>
                  {/* Top gradient line */}
                  <div className="absolute top-0 left-0 right-0 h-[2px]"
                       style={{ background: 'linear-gradient(90deg, #FF9900, #ff6b00)' }} />
                  <div className="inline-block px-2.5 py-0.5 text-[10px] font-bold tracking-[1px] uppercase mb-3 font-label-sm"
                       style={{ background: 'rgba(255,80,80,0.15)', border: '1px solid rgba(255,80,80,0.3)', color: '#ff5050' }}>
                    ⚡ RULE
                  </div>
                  <div className="text-[28px] mb-3.5">{rule.icon}</div>
                  <h4 className="text-[17px] font-headline-md text-on-surface mb-2 uppercase tracking-widest">{rule.title}</h4>
                  <p className="text-[13px] text-on-surface-variant font-body-md">{rule.desc}</p>
                </div>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>


      <Divider />


      {/* ═══════════ POINTS SYSTEM ═══════════ */}
      <section className="py-20 px-6 max-w-[1100px] mx-auto" id="points">
        <FadeInSection>
          <SectionLabel>Gamification</SectionLabel>
          <SectionTitle>
            Earn Points. <span className="text-primary-container" style={{ textShadow: '0 0 30px rgba(255,153,0,0.4)' }}>Unlock Power.</span>
          </SectionTitle>
          <SectionSub>Rack up points from six sources. Spend them strategically in the shop.</SectionSub>
        </FadeInSection>

        <FadeInSection delay={0.15}>
          <div className="mt-10 p-8 border"
               style={{ background: 'rgba(255,153,0,0.04)', borderColor: 'rgba(255,153,0,0.15)', borderRadius: '2px' }}>
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3 mb-7">
              <div>
                <div className="text-[12px] text-on-surface-variant tracking-[2px] uppercase font-label-sm">Your Score</div>
                <div className="text-[48px] font-bold text-primary-container font-headline-xl leading-none">0</div>
              </div>
              <div className="flex gap-2 items-center">
                <span className="text-[12px] text-on-surface-variant font-label-sm">Level</span>
                <span className="text-[12px] font-semibold px-3 py-1 font-label-sm"
                      style={{ background: 'rgba(255,153,0,0.2)', border: '1px solid rgba(255,153,0,0.4)', color: 'var(--color-primary-container)' }}>
                  Rookie
                </span>
              </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
              {POINTS.map((p, i) => (
                <div key={i} className="flex items-center gap-3 bg-white/[0.03] border border-white/[0.06] p-4"
                     style={{ borderRadius: '2px' }}>
                  <div className="w-9 h-9 flex items-center justify-center text-[16px] flex-shrink-0"
                       style={{ background: `${p.color}22`, borderRadius: '2px' }}>
                    {p.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[18px] font-bold text-primary-container font-headline-md">{p.val}</div>
                    <div className="text-[11px] text-on-surface-variant font-label-sm">{p.name}</div>
                    <div className="h-1 bg-white/[0.08] mt-1.5 overflow-hidden" style={{ borderRadius: '1px' }}>
                      <div className="h-full transition-all duration-1000" style={{ width: `${p.pct}%`, background: p.color, borderRadius: '1px' }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </FadeInSection>
      </section>


      <Divider />


      {/* ═══════════ POINT SHOP ═══════════ */}
      <section style={{ background: 'linear-gradient(135deg, rgba(255,153,0,0.04), rgba(255,153,0,0.02))' }}>
        <div className="py-20 px-6 max-w-[1100px] mx-auto">
          <FadeInSection>
            <SectionLabel>Point Shop</SectionLabel>
            <SectionTitle>
              Spend Smart. <span className="text-tertiary">Win Smarter.</span>
            </SectionTitle>
            <SectionSub>Convert your earned points into competitive advantages. Every purchase is a strategic decision.</SectionSub>
          </FadeInSection>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-8">
            {SHOP_ITEMS.map((item, i) => (
              <FadeInSection key={i} delay={i * 0.06}>
                <div className="p-6 border transition-all duration-200 hover:-translate-y-1 hover:border-[rgba(255,153,0,0.5)] cursor-default"
                     style={{
                       background: 'linear-gradient(135deg, rgba(255,153,0,0.08), rgba(255,153,0,0.03))',
                       border: '1px solid rgba(255,153,0,0.25)',
                       borderRadius: '2px',
                     }}>
                  <span className="inline-block px-3 py-1 text-[13px] font-bold mb-3.5 font-label-sm"
                        style={{ background: 'rgba(255,153,0,0.15)', border: '1px solid rgba(255,153,0,0.3)', color: 'var(--color-primary-container)', borderRadius: '20px' }}>
                    {item.price}
                  </span>
                  <h4 className="text-[15px] text-on-surface mb-2 font-headline-md uppercase tracking-widest">{item.title}</h4>
                  <p className="text-[13px] text-on-surface-variant font-body-md">{item.desc}</p>
                </div>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>


      <Divider />


      {/* ═══════════ MYSTERY BOX ═══════════ */}
      <section className="py-20 px-6 max-w-[1100px] mx-auto">
        <FadeInSection className="text-center">
          <SectionLabel className="!text-center">Mystery Box</SectionLabel>
          <SectionTitle>
            Expect The <span className="text-primary-container" style={{ textShadow: '0 0 30px rgba(255,153,0,0.4)' }}>Unexpected</span>
          </SectionTitle>
          <SectionSub center>Each team opens a box at a critical moment. Inside is either a weapon or a bomb.</SectionSub>
        </FadeInSection>

        <FadeInSection delay={0.1} className="flex justify-center my-8">
          <MiniMysteryBox />
        </FadeInSection>

        <FadeInSection delay={0.2}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Rewards */}
            <div>
              <p className="text-[11px] tracking-[2px] uppercase font-semibold mb-3.5 font-label-sm" style={{ color: '#ffcc00' }}>
                🏆 Rewards
              </p>
              <div className="flex flex-col gap-2.5">
                {REWARDS.map((r, i) => (
                  <div key={i} className="p-5 border"
                       style={{
                         background: 'linear-gradient(135deg, rgba(255,153,0,0.1), rgba(255,200,0,0.05))',
                         border: '1px solid rgba(255,153,0,0.3)',
                         borderRadius: '2px',
                       }}>
                    <div className="text-[10px] tracking-[2px] uppercase font-bold mb-2 font-label-sm" style={{ color: '#ffcc00' }}>✦ REWARD</div>
                    <div className="text-[14px] font-semibold text-on-surface font-headline-md">{r}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Twists */}
            <div>
              <p className="text-[11px] tracking-[2px] uppercase font-semibold mb-3.5 font-label-sm" style={{ color: '#ff4466' }}>
                💀 Twists
              </p>
              <div className="flex flex-col gap-2.5">
                {TWISTS.map((t, i) => (
                  <div key={i} className="p-5 border"
                       style={{
                         background: 'linear-gradient(135deg, rgba(255,50,50,0.08), rgba(200,0,200,0.05))',
                         border: '1px solid rgba(255,50,50,0.2)',
                         borderRadius: '2px',
                       }}>
                    <div className="text-[10px] tracking-[2px] uppercase font-bold mb-2 font-label-sm" style={{ color: '#ff4466' }}>⚡ TWIST</div>
                    <div className="text-[14px] font-semibold text-on-surface font-headline-md">{t}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </FadeInSection>
      </section>


      <Divider />


      {/* ═══════════ CHAOS MODE ═══════════ */}
      <section id="chaos" style={{ background: 'linear-gradient(135deg, rgba(255,0,0,0.04), rgba(200,0,0,0.02))' }}>
        <div className="py-20 px-6 max-w-[1100px] mx-auto">
          <FadeInSection className="text-center">
            <SectionLabel className="!text-[#ff5050]">Chaos Mode</SectionLabel>
            <SectionTitle>
              Chaos Mode <span style={{ color: '#ff4444' }}>Activated</span>
            </SectionTitle>
            <SectionSub center>Real-world disruptions injected mid-build. Adapt or fall behind.</SectionSub>
          </FadeInSection>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-10">
            {CHAOS_EVENTS.map((evt, i) => (
              <FadeInSection key={i} delay={i * 0.06}>
                <div className="relative overflow-hidden p-5 border"
                     style={{
                       background: 'linear-gradient(135deg, rgba(255,50,50,0.06), rgba(200,0,0,0.03))',
                       border: '1px solid rgba(255,50,50,0.2)',
                       borderRadius: '2px',
                     }}>
                  {/* Warning watermark */}
                  <span className="absolute -top-2.5 -right-2.5 text-[60px] opacity-[0.04] pointer-events-none select-none">⚠</span>
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[1.5px] uppercase mb-2.5 font-label-sm" style={{ color: '#ff5050' }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#ff5050] animate-pulse" />
                    INCOMING EVENT
                  </div>
                  <h4 className="text-[15px] font-headline-md text-on-surface mb-1.5 uppercase tracking-widest">{evt.icon} {evt.title}</h4>
                  <p className="text-[12px] text-on-surface-variant font-body-md">{evt.desc}</p>
                </div>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>


      <Divider />


      {/* ═══════════ WHEEL OF FORTUNE ═══════════ */}
      <section className="py-20 px-6 max-w-[1100px] mx-auto">
        <FadeInSection className="text-center">
          <SectionLabel>Fortune</SectionLabel>
          <SectionTitle>
            Wheel of <span className="text-primary-container" style={{ textShadow: '0 0 30px rgba(255,153,0,0.4)' }}>Fortune</span>
          </SectionTitle>
          <SectionSub center>Spend 1 Token. Spin the wheel. Fortune favors the bold — or punishes the reckless.</SectionSub>
        </FadeInSection>

        <FadeInSection delay={0.15}>
          <SpinWheel />
        </FadeInSection>
      </section>


      <Divider />


      {/* ═══════════ LEGENDARY REWARDS ═══════════ */}
      <section id="prizes" style={{ background: 'linear-gradient(135deg, rgba(255,153,0,0.04), rgba(255,153,0,0.02))' }}>
        <div className="py-20 px-6 max-w-[1100px] mx-auto">
          <FadeInSection>
            <SectionLabel>Exclusive Rewards</SectionLabel>
            <SectionTitle>
              Legendary <span className="text-primary-container" style={{ textShadow: '0 0 30px rgba(255,153,0,0.4)' }}>Rewards</span>
            </SectionTitle>
            <SectionSub>Only the wheel can unlock these. Mythic rarity. Game-changing power.</SectionSub>
          </FadeInSection>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-8">
            {/* Legendary */}
            <FadeInSection delay={0.1}>
              <div className="relative overflow-hidden p-7 border"
                   style={{
                     background: 'linear-gradient(135deg, #1a1400, #2a1a00)',
                     border: '1px solid rgba(255,153,0,0.5)',
                     borderRadius: '2px',
                   }}>
                <div className="absolute inset-0 pointer-events-none"
                     style={{ background: 'linear-gradient(135deg, transparent, rgba(255,153,0,0.05), transparent)' }} />
                <span className="inline-block px-2.5 py-1 text-[10px] tracking-[2px] uppercase font-bold mb-4 font-label-sm"
                      style={{ background: 'linear-gradient(135deg, #ff9900, #ff6b00)', color: '#000' }}>
                  ✦ LEGENDARY · RARE
                </span>
                <div className="text-[32px] mb-3">🥇</div>
                <h3 className="text-[22px] text-primary-container mb-4 font-headline-md uppercase tracking-widest">Golden Mentor Pass</h3>
                <div className="flex flex-col gap-2.5">
                  {['20 Minutes Dedicated Mentor Help', 'Priority Mentor Access', 'Technical Guidance'].map(item => (
                    <div key={item} className="flex items-center gap-2.5 text-[14px] text-on-surface-variant">
                      <span className="text-primary-container">✓</span> {item}
                    </div>
                  ))}
                </div>
              </div>
            </FadeInSection>

            {/* Mythic */}
            <FadeInSection delay={0.18}>
              <div className="relative overflow-hidden p-7 border"
                   style={{
                     background: 'linear-gradient(135deg, #0f0020, #1a0035)',
                     border: '1px solid rgba(255,153,0,0.4)',
                     borderRadius: '2px',
                   }}>
                <span className="inline-block px-2.5 py-1 text-[10px] tracking-[2px] uppercase font-bold mb-4 font-label-sm"
                      style={{ background: 'linear-gradient(135deg, #FF9900, #ff6b00)', color: '#000' }}>
                  ✦ MYTHIC · ULTRA RARE
                </span>
                <div className="text-[32px] mb-3">🃏</div>
                <h3 className="text-[22px] mb-4 font-headline-md uppercase tracking-widest" style={{ color: '#b24dff' }}>Wildcard Advantage</h3>
                <p className="text-[13px] text-on-surface-variant mb-4 font-body-md">Choose any one of the following advantages:</p>
                <div className="grid grid-cols-2 gap-2">
                  {['Remove One Penalty', '+100 Points', 'Additional Hint', 'Extra Pitch Time'].map(opt => (
                    <div key={opt} className="p-2.5 text-[13px] text-on-surface border"
                         style={{ background: 'rgba(255,153,0,0.1)', border: '1px solid rgba(255,153,0,0.2)', borderRadius: '2px' }}>
                      {opt}
                    </div>
                  ))}
                </div>
              </div>
            </FadeInSection>
          </div>
        </div>
      </section>


      <Divider />


      {/* ═══════════ PENALTIES ═══════════ */}
      <section className="py-20 px-6 max-w-[1100px] mx-auto">
        <FadeInSection className="text-center">
          <SectionLabel className="!text-[#ff4444]">Consequences</SectionLabel>
          <SectionTitle>
            Every Decision Has <span style={{ color: '#ff4444' }}>Consequences</span>
          </SectionTitle>
          <SectionSub center>Bad choices hit hard. Stay sharp, spend wisely, and avoid these at all costs.</SectionSub>
        </FadeInSection>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mt-10">
          {PENALTIES.map((p, i) => (
            <FadeInSection key={i} delay={i * 0.06}>
              <div className="text-center p-5 border"
                   style={{
                     background: 'linear-gradient(135deg, rgba(200,0,0,0.08), rgba(100,0,0,0.04))',
                     border: '1px solid rgba(200,0,0,0.2)',
                     borderRadius: '2px',
                   }}>
                <div className="text-[32px] mb-2.5">{p.icon}</div>
                <div className="text-[20px] font-bold font-headline-xl mb-1" style={{ color: '#ff4444' }}>{p.val}</div>
                <div className="text-[13px] text-on-surface-variant font-label-sm">{p.name}</div>
              </div>
            </FadeInSection>
          ))}
        </div>
      </section>


      <Divider />


      {/* ═══════════ SECOND CHANCE ARENA ═══════════ */}
      <section style={{ background: 'radial-gradient(ellipse at center, rgba(255,50,50,0.07), transparent 60%)' }}>
        <div className="py-20 px-6 max-w-[1100px] mx-auto">
          <FadeInSection className="text-center">
            <SectionLabel className="!text-[#ff5050]">Second Chance</SectionLabel>
            <SectionTitle>
              Fight Your <span style={{ color: '#ff4444' }}>Way Back</span>
            </SectionTitle>
            <SectionSub center>Elimination isn't the end. Spend points or conquer a special challenge to re-enter the arena.</SectionSub>
          </FadeInSection>

          <FadeInSection delay={0.15}>
            <div className="text-center mt-10 p-12 border"
                 style={{
                   background: 'radial-gradient(ellipse at center, rgba(255,50,50,0.1) 0%, transparent 70%), rgba(255,255,255,0.02)',
                   border: '1px solid rgba(255,50,50,0.15)',
                   borderRadius: '2px',
                 }}>
              <div className="text-[48px] font-bold font-headline-xl uppercase tracking-widest" style={{ color: '#ff4444', textShadow: '0 0 40px rgba(255,50,50,0.5)' }}>
                ⚔️ ARENA ⚔️
              </div>
              <p className="text-[15px] text-on-surface-variant max-w-[480px] mx-auto mt-4 font-body-md">
                Eliminated teams enter the Second Chance Arena. Beat the challenge. Spend the points. Return to the competition stronger than before.
              </p>
              <div className="flex gap-5 justify-center mt-7 flex-wrap">
                <div className="text-center p-4 px-6 border"
                     style={{ background: 'rgba(255,50,50,0.1)', border: '1px solid rgba(255,50,50,0.2)', borderRadius: '2px' }}>
                  <div className="text-[22px] font-bold font-headline-xl" style={{ color: '#ff5050' }}>200 pts</div>
                  <div className="text-[12px] text-on-surface-variant font-label-sm">Re-entry via Points</div>
                </div>
                <div className="text-center p-4 px-6 border"
                     style={{ background: 'rgba(255,153,0,0.1)', border: '1px solid rgba(255,153,0,0.2)', borderRadius: '2px' }}>
                  <div className="text-[22px] font-bold font-headline-xl text-primary-container">1 Challenge</div>
                  <div className="text-[12px] text-on-surface-variant font-label-sm">Re-entry via Skill</div>
                </div>
              </div>
            </div>
          </FadeInSection>
        </div>
      </section>


      <Divider />


      {/* ═══════════ FINALE ═══════════ */}
      <section
        className="text-center py-24 px-6"
        style={{
          background: 'radial-gradient(ellipse at 50% 0%, rgba(255,153,0,0.12), transparent 60%), radial-gradient(ellipse at 50% 100%, rgba(255,153,0,0.1), transparent 60%)',
        }}
      >
        <FadeInSection>
          <div className="text-[64px] mb-4">🏆</div>
          <SectionLabel className="!text-center">Grand Finale</SectionLabel>
          <h2 className="font-headline-xl text-[clamp(28px,5vw,52px)] text-on-surface mb-5 uppercase tracking-widest">
            The Stage Is Set.{' '}
            <span className="text-primary-container" style={{ textShadow: '0 0 30px rgba(255,153,0,0.4)' }}>Are You Ready?</span>
          </h2>

          <div className="flex flex-wrap gap-3 justify-center my-8">
            {FINALE_PILLS.map(pill => (
              <div key={pill} className="bg-white/[0.04] border border-white/10 px-4 py-2 text-[13px] font-medium text-on-surface-variant font-label-sm rounded-full">
                {pill}
              </div>
            ))}
          </div>

          <p className="text-[clamp(16px,2.5vw,22px)] text-on-surface-variant max-w-[600px] mx-auto mb-10 italic font-body-md">
            "A hackathon where strategy matters as much as coding."
          </p>

          <button className="bg-primary-container text-background px-10 py-4 font-bold text-[17px] font-headline-md uppercase tracking-widest border-0 cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(255,153,0,0.4)] hover:bg-primary transition-all">
            Register Now →
          </button>
        </FadeInSection>
      </section>


      {/* ═══════════ FOOTER ═══════════ */}
      <footer className="border-t border-white/10 max-w-[1100px] mx-auto px-6 py-8 flex justify-between items-center flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <img src={awsIcon} alt="AWS Student Builder Club" className="w-5 h-5 rounded-full object-cover" />
          <span className="font-headline-md text-label-md text-primary-container uppercase tracking-widest">AWS Student Builder Club</span>
        </div>
        <div className="text-[13px] text-on-surface-variant font-label-sm uppercase tracking-widest">Mystery Box Hackathon — Build. Adapt. Survive.</div>
        <div className="text-[13px] text-on-surface-variant font-label-sm uppercase tracking-widest">© 2026 AWS Student Builder Club</div>
      </footer>

    </div>
  );
}
