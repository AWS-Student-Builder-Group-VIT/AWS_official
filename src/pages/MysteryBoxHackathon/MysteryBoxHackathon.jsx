import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Global assets (shared across the whole app)
import awsIcon from '../../assets/aws_icon.jpeg';

// Local Mystery Box Hackathon data + components
import {
  STEPS,
  RULES,
  POINTS,
  SHOP_ITEMS,
  REWARDS,
  TWISTS,
  CHAOS_EVENTS,
  PENALTIES,
  FINALE_PILLS,
} from './data';
import {
  FadeInSection,
  SectionLabel,
  SectionTitle,
  SectionSub,
  TypeWriter,
  Divider,
  SpinWheel,
  MysteryBoxSVG,
  MiniMysteryBox,
} from './components';

/* ═══════════════════════════════════════════════════════════
   MYSTERY BOX HACKATHON — Landing Page
   ═══════════════════════════════════════════════════════════ */

function HorizontalCarousel({ rules }) {
  const [current, setCurrent] = useState(0);
  const containerRef = useRef(null);
  const cooldownRef = useRef(false);

  const go = (i) => {
    setCurrent(Math.max(0, Math.min(rules.length - 1, i)));
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handleWheel = (e) => {
      e.preventDefault();
      if (cooldownRef.current) return;
      cooldownRef.current = true;
      setTimeout(() => { cooldownRef.current = false; }, 600);
      if (e.deltaY > 0 || e.deltaX > 0) go(current + 1);
      else go(current - 1);
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [current, rules.length]);

  return (
    <div className="flex flex-col items-center gap-7 w-full max-w-[900px] mx-auto overflow-visible mt-10">
      <div 
        ref={containerRef}
        className="relative w-full h-[340px] perspective-[1400px]"
      >
        {rules.map((rule, i) => {
          const offset = i - current;
          const abs = Math.abs(offset);
          let transform, opacity, zIndex, pointerEvents;
          
          if (abs === 0) {
            transform = 'translateX(0) rotateY(0deg) scale(1)';
            opacity = 1; zIndex = 5; pointerEvents = 'auto';
          } else if (abs === 1) {
            transform = `translateX(${offset * 240}px) rotateY(${offset * -34}deg) scale(0.82)`;
            opacity = 0.5; zIndex = 3; pointerEvents = 'auto';
          } else if (abs === 2) {
            transform = `translateX(${offset * 200}px) rotateY(${offset * -40}deg) scale(0.6)`;
            opacity = 0; zIndex = 1; pointerEvents = 'none';
          } else {
            transform = `translateX(${offset * 160}px) rotateY(${offset * -40}deg) scale(0.5)`;
            opacity = 0; zIndex = 0; pointerEvents = 'none';
          }

          return (
            <div
              key={i}
              onClick={() => { if (abs !== 0) go(i); }}
              className={`absolute top-0 left-1/2 -ml-[170px] w-[340px] border-t-2 bg-[#121110] p-7 transition-all duration-[550ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] ${abs === 0 ? 'cursor-default border-primary-container' : 'cursor-pointer border-[rgba(255,153,0,0.3)] hover:border-[rgba(255,153,0,0.8)]'}`}
              style={{ transform, opacity, zIndex, pointerEvents }}
            >
              <div className="inline-flex items-center gap-1.5 bg-[rgba(239,68,68,0.12)] text-[#f87171] border border-[rgba(239,68,68,0.3)] text-[11px] font-bold tracking-[1px] uppercase px-2.5 py-1 mb-5 font-label-sm">
                ⚡ RULE
              </div>
              <div className="flex items-baseline gap-2.5 mb-3">
                <span className="font-mono text-[18px] tracking-[0.5px] text-white font-bold">{rule.title}</span>
              </div>
              <p className="text-[#9c968c] text-[14px] leading-[1.6] m-0 font-body-md">{rule.desc}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function VerticalCarousel({ items }) {
  const [current, setCurrent] = useState(0);
  const containerRef = useRef(null);
  const cooldownRef = useRef(false);

  const go = (i) => {
    setCurrent(Math.max(0, Math.min(items.length - 2, i)));
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handleWheel = (e) => {
      e.preventDefault();
      if (cooldownRef.current) return;
      cooldownRef.current = true;
      setTimeout(() => { cooldownRef.current = false; }, 600);
      if (e.deltaY > 0) go(current + 1);
      else go(current - 1);
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [current, items.length]);

  const V_HALF_GAP = 95;
  const V_RADIUS = 260;
  const V_ANGLE_STEP = 30;

  return (
    <div className="flex flex-col md:flex-row items-center justify-center gap-7 w-full mt-8">
      <div 
        ref={containerRef}
        className="relative w-full max-w-[560px] h-[460px] perspective-[1400px] overflow-hidden"
        style={{ transformStyle: 'preserve-3d', maskImage: 'linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%)' }}
      >
        {items.map((item, i) => {
          const offset = i - current;
          let translateY, translateZ, rotateX, opacity, zIndex, pointerEvents;

          if (offset === 0 || offset === 1) {
            translateY = offset === 0 ? -V_HALF_GAP : V_HALF_GAP;
            translateZ = 0;
            rotateX = 0;
            opacity = 1;
            zIndex = 5;
            pointerEvents = 'auto';
          } else {
            const sign = offset < 0 ? -1 : 1;
            const k = sign < 0 ? -offset : offset - 1;
            const angle = k * V_ANGLE_STEP;
            const rad = angle * Math.PI / 180;
            translateY = sign * (V_HALF_GAP + V_RADIUS * Math.sin(rad));
            translateZ = -V_RADIUS * (1 - Math.cos(rad));
            rotateX = -sign * angle;
            opacity = Math.max(0, 0.55 - (k - 1) * 0.4);
            zIndex = 4 - k;
            pointerEvents = k <= 2 ? 'auto' : 'none';
          }

          return (
            <VerticalShopItem 
              key={i} 
              item={item} 
              style={{
                transform: `translateY(${translateY}px) translateZ(${translateZ}px) rotateX(${rotateX}deg)`,
                opacity,
                zIndex,
                pointerEvents,
                marginTop: '-90px'
              }}
              isFocused={offset === 0 || offset === 1}
              onClick={() => {
                if (offset < 0) go(i);
                else if (offset > 1) go(i - 1);
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

function VerticalShopItem({ item, style, isFocused, onClick }) {
  const [flashKey, setFlashKey] = useState(0);

  const handleClick = () => {
    if (isFocused) {
      setFlashKey(prev => prev + 1);
    } else {
      onClick();
    }
  };

  return (
    <div
      className="absolute top-1/2 left-0 w-full h-[180px] border bg-[#121110] p-5 pt-5 pb-[22px] transition-all duration-[550ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] cursor-pointer overflow-hidden"
      style={{
        ...style,
        borderColor: isFocused ? 'var(--color-primary-container)' : 'rgba(255,153,0,0.2)',
      }}
      onClick={handleClick}
    >
      <div className="inline-block bg-[rgba(245,165,36,0.1)] border border-[rgba(255,153,0,0.5)] text-primary-container font-mono font-bold text-[13px] px-3 py-1.5 rounded-full mb-3.5">
        {item.price}
      </div>
      <div className="font-mono text-[15px] tracking-[0.5px] text-white font-bold mb-2 uppercase">{item.title}</div>
      <p className="text-[#9c968c] text-[13px] leading-[1.5] m-0 font-body-md">{item.desc}</p>

      <AnimatePresence mode="wait">
        {flashKey > 0 && (
          <motion.div
            key={flashKey}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.3, 1, 0] }}
            transition={{ duration: 0.55, ease: 'easeInOut' }}
            className="absolute inset-0 z-20 flex items-center justify-center bg-[rgba(245,165,36,0.85)] pointer-events-none"
          >
            <span className="font-mono font-bold text-[14px] tracking-[2px] text-[#1a0f00]">
              UNLOCKED
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

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
                <TypeWriter words={['Hackathon', 'Hack It']} typingDelay={120} />
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
        <div className="pt-10 pb-6 px-6 max-w-[1100px] mx-auto">
          <FadeInSection className="text-center">
            <SectionLabel>Core Rules</SectionLabel>
            <SectionTitle>
              Not Your <span className="text-primary-container" style={{ textShadow: '0 0 30px rgba(255,153,0,0.4)' }}>Ordinary</span> Hackathon
            </SectionTitle>
            <SectionSub center>No templates. No pre-built repos. Pure raw innovation under pressure.</SectionSub>
          </FadeInSection>

          <HorizontalCarousel rules={RULES} />
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
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: false, margin: '-20px' }}
                  transition={{ duration: 0.5, delay: i * 0.1, type: 'spring', stiffness: 100 }}
                  className="group flex items-center gap-3 bg-white/[0.03] border border-white/[0.06] p-4 hover:bg-white/[0.05] transition-colors duration-300"
                  style={{ borderRadius: '2px' }}
                >
                  <div className="w-9 h-9 flex items-center justify-center text-[16px] flex-shrink-0 group-hover:animate-wiggle"
                       style={{ background: `${p.color}22`, borderRadius: '2px' }}>
                    {p.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[18px] font-bold text-primary-container font-headline-md">{p.val}</div>
                    <div className="text-[11px] text-on-surface-variant font-label-sm">{p.name}</div>
                    <div className="h-1 bg-white/[0.08] mt-1.5 overflow-hidden" style={{ borderRadius: '1px' }}>
                      <div className="h-full transition-all duration-1000 group-hover:brightness-125" style={{ width: `${p.pct}%`, background: p.color, borderRadius: '1px' }} />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </FadeInSection>
      </section>


      <Divider />


      {/* ═══════════ POINT SHOP ═══════════ */}
      <section style={{ background: 'linear-gradient(135deg, rgba(255,153,0,0.04), rgba(255,153,0,0.02))' }}>
        <div className="pt-10 pb-6 px-6 max-w-[1100px] mx-auto">
          <FadeInSection>
            <SectionLabel>Point Shop</SectionLabel>
            <SectionTitle>
              Spend Smart. <span className="text-tertiary">Win Smarter.</span>
            </SectionTitle>
            <SectionSub>Convert your earned points into competitive advantages. Every purchase is a strategic decision.</SectionSub>
          </FadeInSection>

          <VerticalCarousel items={SHOP_ITEMS} />
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

        <div className="mt-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Rewards */}
            <div>
              <p className="text-[11px] tracking-[2px] uppercase font-semibold mb-3.5 font-label-sm" style={{ color: '#ffcc00' }}>
                  Rewards
              </p>
              <div className="flex flex-col gap-2.5">
                {REWARDS.map((r, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: false, margin: '-20px' }}
                    transition={{ duration: 0.5, delay: i * 0.15 }}
                    className="p-5 border"
                    style={{
                      background: 'linear-gradient(135deg, rgba(255,153,0,0.1), rgba(255,200,0,0.05))',
                      border: '1px solid rgba(255,153,0,0.3)',
                      borderRadius: '2px',
                    }}
                  >
                    <div className="text-[10px] tracking-[2px] uppercase font-bold mb-2 font-label-sm" style={{ color: '#ffcc00' }}>✦ REWARD</div>
                    <div className="text-[14px] font-semibold text-on-surface font-headline-md">{r}</div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Twists */}
            <div>
              <p className="text-[11px] tracking-[2px] uppercase font-semibold mb-3.5 font-label-sm" style={{ color: '#ff4466' }}>
                Twists
              </p>
              <div className="flex flex-col gap-2.5">
                {TWISTS.map((t, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: false, margin: '-20px' }}
                    transition={{ duration: 0.5, delay: i * 0.15 }}
                    className="p-5 border"
                    style={{
                      background: 'linear-gradient(135deg, rgba(255,50,50,0.08), rgba(200,0,200,0.05))',
                      border: '1px solid rgba(255,50,50,0.2)',
                      borderRadius: '2px',
                    }}
                  >
                    <div className="text-[10px] tracking-[2px] uppercase font-bold mb-2 font-label-sm" style={{ color: '#ff4466' }}>⚡ TWIST</div>
                    <div className="text-[14px] font-semibold text-on-surface font-headline-md">{t}</div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
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
                  <h4 className="text-[15px] font-headline-md text-on-surface mb-1.5 uppercase tracking-widest">{evt.title}</h4>
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
                <h3 className="text-[22px] mb-4 font-headline-md uppercase tracking-widest" style={{ color: '#b24dff' }}>Wildcard Advantage</h3>
                <p className="text-[13px] text-on-surface-variant mb-4 font-body-md">Choose any one of the following advantages:</p>
                <div className="grid grid-cols-2 gap-2">
                  {['Remove One Penalty', '+100 Points', 'Additional Hint'].map(opt => (
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
                ARENA
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
