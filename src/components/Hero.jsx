import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import InteractiveHeroGrid from './InteractiveHeroGrid';
import { getUser } from '../utils/auth';
import ScrollFloat from './ScrollFloat';
import hqSvg from '../assets/aws_club_hq.svg';

export default function Hero() {
  const [welcomeMsg, setWelcomeMsg] = useState(null);
  const [displayedMsg, setDisplayedMsg] = useState('');

  // Initialize welcome message from stored session on mount
  useEffect(() => {
    const user = getUser();
    if (user) {
      const text = `Welcome back ${user.first_name}`;
      setWelcomeMsg(text);
      setDisplayedMsg(''); // Start empty to trigger typewriter animation
    }
  }, []);

  // Listen for fresh login/register events (typewriter effect)
  useEffect(() => {
    const handler = (e) => {
      const { type, user } = e.detail;
      const text = type === 'login' ? `Welcome back ${user.first_name}` : `Welcome ${user.first_name}`;
      setWelcomeMsg(text);
      setDisplayedMsg(''); // Reset to trigger typewriter
    };
    window.addEventListener('auth-success', handler);
    return () => window.removeEventListener('auth-success', handler);
  }, []);

  // Clear welcome on logout
  useEffect(() => {
    const handler = () => {
      const user = getUser();
      if (!user) {
        setWelcomeMsg(null);
        setDisplayedMsg('');
      }
    };
    window.addEventListener('auth-change', handler);
    return () => window.removeEventListener('auth-change', handler);
  }, []);

  // Typewriter effect — only runs when displayedMsg is reset to ''
  useEffect(() => {
    if (!welcomeMsg || displayedMsg === welcomeMsg) return;
    let i = displayedMsg.length;
    const interval = setInterval(() => {
      setDisplayedMsg(welcomeMsg.substring(0, i + 1));
      i++;
      if (i >= welcomeMsg.length) {
        clearInterval(interval);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [welcomeMsg, displayedMsg === '']);
  const levitateTransition = (delay) => ({
    repeat: Infinity,
    duration: 5,
    ease: 'easeInOut',
    delay: delay,
  });

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
    <section
      className="relative min-h-[90vh] flex flex-col pt-12 pb-16 overflow-hidden w-full px-container-padding"
      id="home"
    >
      {/* Layer 0: The Floating Orange Blocks */}
      <motion.div
        animate={levitateAnimation}
        transition={levitateTransition(0)}
        className="absolute top-0 left-1/4 w-[160px] h-[160px] bg-[#FF9900] z-0 hidden md:block"
      ></motion.div>
      <motion.div
        animate={levitateAnimation}
        transition={levitateTransition(1.5)}
        className="absolute top-[160px] left-[12.5%] w-[80px] h-[80px] bg-[#FF9900] z-0 hidden md:block"
      ></motion.div>
      <motion.div
        animate={levitateAnimation}
        transition={levitateTransition(3)}
        className="absolute top-[160px] right-[20%] w-[80px] h-[80px] bg-[#FF9900] z-0 hidden md:block"
      ></motion.div>

      {/* Layer 10: The Interactive Hover Area */}
      <InteractiveHeroGrid />

      {/* Layer 20: The Content Wrapper */}
      <div className="relative z-20 w-full mt-32 md:mt-48 grid grid-cols-1 md:grid-cols-2 gap-8 items-center text-left pointer-events-auto">
        {/* Left Column */}
        <div className="flex flex-col items-start">
          {welcomeMsg && (
            <div className="mb-4 inline-flex items-center gap-2 bg-[#FF9900]/10 border border-[#FF9900]/30 px-4 py-2 text-[#FF9900] font-mono text-sm uppercase tracking-widest shadow-[0_0_15px_rgba(255,153,0,0.2)] animate-pulse">
              <span className="material-symbols-outlined text-sm">terminal</span>
              {displayedMsg}<span className="animate-pulse">_</span>
            </div>
          )}

          {/* Headline */}
          <div className="mb-18 flex flex-col items-start gap-16">
            <ScrollFloat
              animationDuration={1}
              ease='back.inOut(2)'
              scrollStart='top bottom'
              scrollEnd='bottom center'
              stagger={0.03}
              containerClassName="!m-0"
              textClassName="font-headline-xl text-[40px] md:text-[64px] text-white tracking-widest leading-tight font-bold !text-left"
            >
              BUILD.
            </ScrollFloat>
            <ScrollFloat
              animationDuration={1}
              ease='back.inOut(2)'
              scrollStart='top bottom'
              scrollEnd='bottom center'
              stagger={0.03}
              containerClassName="!m-0"
              textClassName="font-headline-xl text-[40px] md:text-[64px] text-white tracking-widest leading-tight font-bold !text-left"
            >
              LEARN.
            </ScrollFloat>
            <ScrollFloat
              animationDuration={1}
              ease='back.inOut(2)'
              scrollStart='top bottom'
              scrollEnd='bottom center'
              stagger={0.03}
              containerClassName="!m-0"
              textClassName="font-headline-xl text-[40px] md:text-[64px] text-white tracking-widest leading-tight font-bold !text-left"
            >
              DEPLOY.
            </ScrollFloat>
          </div>
        </div>

        {/* Right Column — HQ Illustration */}
        <div className="relative h-full min-h-[500px] flex items-center justify-center p-4 overflow-hidden group">
          <img
            src={hqSvg}
            alt="AWS Club HQ"
            className="w-full h-full object-contain opacity-80 group-hover:opacity-100 transition-opacity duration-700 -translate-y-12 scale-[1.3]"
          />
        </div>
      </div>
    </section>
  );
}
