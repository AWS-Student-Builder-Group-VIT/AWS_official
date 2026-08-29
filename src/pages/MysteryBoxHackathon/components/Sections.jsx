import { useState, useEffect, useRef } from 'react';
import { motion, useInView } from 'framer-motion';

/* ═══════════════════════════════════════════════════════════
   REUSABLE SUB-COMPONENTS — Mystery Box Hackathon
   ═══════════════════════════════════════════════════════════ */

export function FadeInSection({ children, className = '', delay = 0 }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: false, margin: '-60px' });

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 0.75, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function SectionLabel({ children, className = '' }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: false, margin: '-40px' });

  return (
    <motion.p
      ref={ref}
      className={`font-label-sm text-[11px] tracking-[3px] uppercase font-medium mb-3 text-primary-container ${className}`}
      initial={{ opacity: 0, y: 10 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.p>
  );
}

export function SectionTitle({ children }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: false, margin: '-40px' });

  return (
    <motion.h2
      ref={ref}
      className="font-headline-lg text-headline-lg text-on-surface tracking-widest uppercase mb-4 leading-tight"
      initial={{ opacity: 0, y: 18 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
      transition={{ duration: 0.75, delay: 0.07, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.h2>
  );
}

export function SectionSub({ children, center = false }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: false, margin: '-40px' });

  return (
    <motion.p
      ref={ref}
      className={`text-on-surface-variant text-body-md font-body-md max-w-[580px] ${center ? 'mx-auto' : ''}`}
      initial={{ opacity: 0, y: 14 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
      transition={{ duration: 0.75, delay: 0.14, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.p>
  );
}

export function TypeWriter({ words = ['Hackathon', 'Hack It'], typingDelay = 120, erasingDelay = 80, pauseTime = 2000 }) {
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

export function Divider() {
  return <hr className="border-0 border-t border-white/5 my-0" />;
}
