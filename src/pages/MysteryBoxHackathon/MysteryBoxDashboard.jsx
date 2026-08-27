import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import awsIcon from '../../assets/aws_icon.jpeg';
import {
  MiniMysteryBox,
  MiniChaosMysteryBox,
  FadeInSection,
  SectionLabel,
  SectionTitle,
  SectionSub,
  Divider,
} from './components';
import { SHOP_ITEMS, POINTS, CHAOS_EVENTS } from './data';
import SpinWheel from './components/SpinWheel';

const TEAM_STORAGE_KEY = 'mystery-box-hackathon-team';
const OWNED_ITEMS_KEY = 'mystery-box-owned-items';

export default function MysteryBoxDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('control'); // 'control', 'shop', 'wheel'

  const [team, setTeam] = useState(() => {
    if (typeof window === 'undefined') return null;
    try {
      const stored = window.localStorage.getItem(TEAM_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [myEmail, setMyEmail] = useState(() => {
    if (typeof window === 'undefined') return '';
    return window.sessionStorage.getItem('mystery-box-hackathon-my-email') || '';
  });

  const [isOpeningLocal, setIsOpeningLocal] = useState(false);
  const [prevIsOpened, setPrevIsOpened] = useState(false);

  // Chaos Box specific states
  const [isChaosOpeningLocal, setIsChaosOpeningLocal] = useState(false);
  const [prevIsChaosOpened, setPrevIsChaosOpened] = useState(false);

  // Simulating 5 hours pass
  const [isChaosSimulated, setIsChaosSimulated] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem('mystery-box-chaos-simulated') === 'true';
  });

  // Countdown timer ticking state
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Shop state: track purchased items locally in localStorage
  const [ownedItems, setOwnedItems] = useState(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = window.localStorage.getItem(OWNED_ITEMS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Success message notification state
  const [notification, setNotification] = useState('');

  // Sync state if localStorage changes in other tabs
  useEffect(() => {
    const handleStorageChange = (event) => {
      if (event.key === TEAM_STORAGE_KEY) {
        try {
          const parsed = event.newValue ? JSON.parse(event.newValue) : null;
          setTeam(parsed);
          if (!parsed) {
            setMyEmail('');
            window.sessionStorage.removeItem('mystery-box-hackathon-my-email');
          }
        } catch (e) {
          console.error('Error syncing team storage:', e);
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Redirect to landing page if not in a team
  useEffect(() => {
    const isMemberOfTeam = team && myEmail && team.members?.some((m) => m.email === myEmail);
    if (!isMemberOfTeam) {
      navigate('/mystery-box-hackathon');
    }
  }, [team, myEmail, navigate]);

  // Set up primary box-opening state changes
  useEffect(() => {
    if (team?.isOpened && !prevIsOpened) {
      setIsOpeningLocal(true);
      const timer = setTimeout(() => {
        setIsOpeningLocal(false);
        setPrevIsOpened(true);
      }, 2000);
      return () => clearTimeout(timer);
    } else if (!team?.isOpened) {
      setPrevIsOpened(false);
      setIsOpeningLocal(false);
    }
  }, [team?.isOpened, prevIsOpened]);

  // Set up chaos box-opening state changes
  useEffect(() => {
    if (team?.isChaosOpened && !prevIsChaosOpened) {
      setIsChaosOpeningLocal(true);
      const timer = setTimeout(() => {
        setIsChaosOpeningLocal(false);
        setPrevIsChaosOpened(true);
      }, 2000);
      return () => clearTimeout(timer);
    } else if (!team?.isChaosOpened) {
      setPrevIsChaosOpened(false);
      setIsChaosOpeningLocal(false);
    }
  }, [team?.isChaosOpened, prevIsChaosOpened]);

  if (!team || !myEmail) {
    return null; // Will redirect in useEffect
  }

  const leader = team.members?.find((member) => member.isLeader) || null;
  const isCurrentLeader = leader && leader.email === myEmail;

  // Primary Box Problem Details
  const questionDesc = team.mysteryQuestion
    ? (typeof team.mysteryQuestion === 'string' ? team.mysteryQuestion : (team.mysteryQuestion.desc || ''))
    : '';
  const questionTitle = team.mysteryQuestion
    ? (typeof team.mysteryQuestion === 'string' ? 'Mystery Challenge' : (team.mysteryQuestion.title || 'Mystery Challenge'))
    : 'Mystery Challenge';
  const questionPoints = team.mysteryQuestion
    ? (typeof team.mysteryQuestion === 'string' ? 100 : (team.mysteryQuestion.points || 100))
    : 100;

  // Chaos Box details & countdown math
  const registeredAt = team.registeredAt || (Date.now() - 60000);
  const targetTime = registeredAt + 5 * 60 * 60 * 1000; // 5 hours in ms
  const isTimeReached = currentTime >= targetTime;
  const secondsLeft = Math.max(0, Math.floor((targetTime - currentTime) / 1000));
  const isChaosUnlocked = isTimeReached || isChaosSimulated;

  const formatTime = (secs) => {
    const h = Math.floor(secs / 3600).toString().padStart(2, '0');
    const m = Math.floor((secs % 3600) / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${h}h ${m}m ${s}s`;
  };

  const persistTeam = (nextTeam) => {
    setTeam(nextTeam);
    if (typeof window !== 'undefined') {
      if (nextTeam) {
        window.localStorage.setItem(TEAM_STORAGE_KEY, JSON.stringify(nextTeam));
      } else {
        window.localStorage.removeItem(TEAM_STORAGE_KEY);
      }
    }
  };

  const handleDisbandOrLeave = () => {
    const isLeader = team.members?.find((member) => member.isLeader)?.email === myEmail;
    if (isLeader) {
      persistTeam(null);
      if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem('mystery-box-hackathon-my-email');
        window.localStorage.removeItem(OWNED_ITEMS_KEY);
        window.localStorage.removeItem('mystery-box-chaos-simulated');
      }
      setMyEmail('');
    } else {
      const updatedMembers = (team.members || []).filter((m) => m.email !== myEmail);
      const updatedTeam = {
        ...team,
        members: updatedMembers,
      };
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(TEAM_STORAGE_KEY, JSON.stringify(updatedTeam));
        window.sessionStorage.removeItem('mystery-box-hackathon-my-email');
      }
      setMyEmail('');
    }
    navigate('/mystery-box-hackathon');
  };

  // Point Shop Purchase handler
  const handlePurchase = (item) => {
    const cost = parseInt(item.price);
    if (isNaN(cost) || (team.points || 0) < cost) return;

    const nextPoints = (team.points || 0) - cost;
    const nextTeam = { ...team, points: nextPoints };
    persistTeam(nextTeam);

    const nextOwned = [...ownedItems, item.title];
    setOwnedItems(nextOwned);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(OWNED_ITEMS_KEY, JSON.stringify(nextOwned));
    }

    setNotification(`Successfully purchased ${item.title}!`);
    setTimeout(() => setNotification(''), 4000);
  };

  // Chaos Box Simulation handler
  const handleSimulateChaosUnlock = () => {
    setIsChaosSimulated(true);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('mystery-box-chaos-simulated', 'true');
    }
    setNotification('Demo: Simulated 5 hours passing. Chaos Mystery Box unlocked!');
    setTimeout(() => setNotification(''), 4000);
  };

  // Unveil Chaos Box handler
  const handleUnveilChaos = () => {
    if (!team.chaosEvent) {
      // Pick a random chaos event
      const randomEvent = CHAOS_EVENTS[Math.floor(Math.random() * CHAOS_EVENTS.length)];
      const updatedTeam = {
        ...team,
        isChaosOpened: true,
        chaosEvent: randomEvent,
        isChaosResolved: false,
      };
      persistTeam(updatedTeam);
    } else {
      const updatedTeam = {
        ...team,
        isChaosOpened: true,
      };
      persistTeam(updatedTeam);
    }
  };

  // Resolve Chaos handler
  const handleResolveChaos = () => {
    const updatedTeam = {
      ...team,
      isChaosResolved: true,
      points: (team.points || 0) + 120, // Add 120 bonus points for resolving chaos!
    };
    persistTeam(updatedTeam);
    setNotification('Chaos threat resolved! +120 pts awarded to your team.');
    setTimeout(() => setNotification(''), 4000);
  };

  // Determine user level based on points
  const points = team.points || 0;
  let level = 'Cloud Rookie';
  let nextLevel = 'SysOps Architect';
  let progressPct = Math.min((points / 150) * 100, 100);

  if (points >= 150 && points < 300) {
    level = 'SysOps Architect';
    nextLevel = 'Cloud Master';
    progressPct = Math.min(((points - 150) / 150) * 100, 100);
  } else if (points >= 300) {
    level = 'Cloud Master';
    nextLevel = 'Infinite Scale';
    progressPct = 100;
  }

  return (
    <div className="min-h-screen bg-background text-on-surface bg-grid-pattern relative flex flex-col md:flex-row animate-fade-in">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 20 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-0 left-1/2 -translate-x-1/2 z-50 bg-green-500 text-black px-6 py-3 rounded-lg font-headline-md font-bold shadow-[0_0_20px_rgba(34,197,94,0.5)] border border-green-400 text-center"
          >
            {notification}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar navigation */}
      <aside className="w-full md:w-64 bg-[#0a0d14]/90 backdrop-blur-2xl border-r border-white/5 p-6 flex flex-col justify-between shrink-0 relative z-20">
        <div>
          {/* Brand header */}
          <div className="flex items-center gap-2.5 pb-6 mb-6 border-b border-white/5">
            <img src={awsIcon} alt="AWS" className="w-8 h-8 rounded-full object-cover border border-primary-container/20" />
            <div>
              <h4 className="text-xs uppercase font-headline-xl tracking-widest text-primary-container font-bold m-0">AWS Cloud Club</h4>
              <p className="text-[9px] uppercase tracking-wider text-on-surface-variant font-label-sm m-0">Mystery Hackathon</p>
            </div>
          </div>

          {/* Navigation links */}
          <nav className="flex flex-col gap-1.5">
            {[
              { id: 'control', label: 'Control Center', icon: '📊' },
              { id: 'shop', label: 'Point Shop', icon: '🛒' },
              { id: 'wheel', label: 'Spin Wheel', icon: '🎰' },
            ].map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-3.5 px-4 py-3 rounded-xl text-left border-0 cursor-pointer transition-all w-full text-sm font-headline-md tracking-wider ${
                    active
                      ? 'bg-primary-container text-background font-bold shadow-[0_0_15px_rgba(255,153,0,0.2)]'
                      : 'bg-transparent text-on-surface-variant hover:text-on-surface hover:bg-white/5'
                  }`}
                >
                  <span className="text-lg">{tab.icon}</span>
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer User detail card + Danger actions */}
        <div className="mt-8 pt-6 border-t border-white/5 flex flex-col gap-4">
          <div className="bg-white/[0.02] border border-white/5 p-3.5 rounded-xl">
            <p className="text-[9px] uppercase tracking-wider text-on-surface-variant font-label-sm m-0">Logged In User</p>
            <h5 className="text-[12px] font-bold text-on-surface truncate mt-1 mb-0">{myEmail}</h5>
            <span className="inline-block mt-1 px-2 py-0.5 text-[9px] bg-primary-container/10 border border-primary-container/20 text-primary-container font-semibold rounded font-label-sm">
              {isCurrentLeader ? 'Leader' : 'Member'}
            </span>
          </div>

          <button
            type="button"
            onClick={handleDisbandOrLeave}
            className="w-full bg-red-950/20 border border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white transition-all py-3 rounded-xl text-xs uppercase font-headline-md tracking-wider cursor-pointer font-bold duration-150"
          >
            {isCurrentLeader ? 'Disband Team' : 'Leave Team'}
          </button>
        </div>
      </aside>

      {/* Main dashboard content container */}
      <main className="flex-1 p-6 md:p-10 flex flex-col min-w-0">
        
        {/* Top Header details bar */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 mb-8 border-b border-white/5">
          <div>
            <span className="text-[10px] uppercase tracking-[0.25em] text-primary-container font-label-sm">Operations Board</span>
            <h2 className="text-3xl font-headline-md text-on-surface m-0 uppercase mt-1 tracking-wider">{team.teamName}</h2>
          </div>

          <div className="flex items-center gap-4 flex-wrap w-full md:w-auto">
            {/* Points Indicator */}
            <div className="bg-green-500/10 border border-green-500/30 text-green-400 font-headline-xl font-bold px-4.5 py-2.5 rounded-2xl flex items-center gap-2 shadow-[0_0_15px_rgba(34,197,94,0.1)]">
              <span className="text-[10px] uppercase text-green-400/80 font-label-sm tracking-wider">Score:</span>
              <span className="text-2xl">{team.points || 0} pts</span>
            </div>

            {/* Code Indicator */}
            <div className="bg-primary-container/10 border border-primary-container/30 text-primary-container font-headline-xl font-bold px-4.5 py-2.5 rounded-2xl flex items-center gap-2">
              <span className="text-[10px] uppercase text-primary-container/80 font-label-sm tracking-wider">Code:</span>
              <span className="text-2xl tracking-[0.1em]">{team.code}</span>
            </div>

            {/* Back Button */}
            <button
              type="button"
              onClick={() => navigate('/mystery-box-hackathon')}
              className="border border-white/10 hover:border-primary-container text-on-surface hover:text-primary-container font-headline-md text-xs uppercase px-4 py-3.5 rounded-xl transition-all cursor-pointer font-semibold"
            >
              ← View Event Info
            </button>
          </div>
        </header>

        {/* Tab content renderer */}
        <div className="flex-1">
          <AnimatePresence mode="wait">
            
            {/* TAB 1: Control Center */}
            {activeTab === 'control' && (
              <motion.div
                key="control"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
                className="grid grid-cols-1 lg:grid-cols-3 gap-6"
              >
                {/* Left Side Main: Boxes & Missions */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                  
                  {/* WIDGET 1: Primary Mystery Box */}
                  <div className="rounded-[24px] border border-primary-container/30 bg-[rgba(255,153,0,0.03)] p-6 shadow-[0_15px_45px_rgba(255,153,0,0.06)] relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-container/50 to-transparent" />
                    
                    <div className="flex justify-between items-center mb-4">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-primary-container font-label-sm m-0">Mission Activation</p>
                      {team.isOpened && (
                        <span className="px-2.5 py-0.5 text-[9px] bg-green-500/10 border border-green-500/30 text-green-400 font-bold rounded uppercase tracking-wider font-label-sm">
                          Active
                        </span>
                      )}
                    </div>

                    {/* Closed Box State */}
                    {!team.isOpened && !isOpeningLocal && (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <motion.div
                          animate={{
                            rotate: [0, -3, 3, -3, 3, 0],
                            scale: [1, 1.02, 1],
                          }}
                          transition={{
                            repeat: Infinity,
                            duration: 4,
                            ease: "easeInOut",
                          }}
                        >
                          <MiniMysteryBox />
                        </motion.div>

                        <h4 className="mt-4 text-xl font-headline-md text-on-surface uppercase tracking-widest">Mystery Box is Sealed</h4>
                        <p className="text-xs text-on-surface-variant max-w-[380px] mt-2 mb-6">Your official hackathon challenge topic is locked inside this container. Prepare your setup before unlocking.</p>

                        {isCurrentLeader ? (
                          <button
                            type="button"
                            onClick={() => {
                              persistTeam({
                                ...team,
                                isOpened: true,
                                points: (team.points || 0) + questionPoints
                              });
                            }}
                            className="bg-primary-container text-background px-7 py-3.5 font-bold font-headline-md uppercase tracking-wider border-0 rounded-xl cursor-pointer hover:bg-primary transition-colors shadow-[0_0_20px_rgba(255,153,0,0.4)] hover:scale-105 transform duration-150 text-sm"
                          >
                            Unveil Mystery Topic
                          </button>
                        ) : (
                          <div className="flex items-center gap-2.5 bg-white/[0.02] border border-white/5 px-4 py-3 rounded-xl">
                            <span className="w-2.5 h-2.5 rounded-full bg-primary-container animate-ping" />
                            <p className="text-xs text-on-surface-variant m-0">
                              Waiting for Team Leader ({leader?.email || 'Leader'}) to open the box...
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Opening / Transition State */}
                    {isOpeningLocal && (
                      <div className="flex flex-col items-center justify-center py-10 text-center overflow-hidden">
                        <motion.div
                          animate={{
                            rotate: [-8, 8, -8, 8, -8, 8, 0],
                            scale: [1, 1.2, 1.4, 0.8, 1.8, 0],
                            filter: ["brightness(1)", "brightness(1.5)", "brightness(2)"],
                          }}
                          transition={{
                            duration: 2,
                            ease: "easeInOut",
                          }}
                        >
                          <MiniMysteryBox />
                        </motion.div>
                        <motion.h4
                          animate={{ opacity: [0.5, 1, 0.5] }}
                          transition={{ repeat: Infinity, duration: 0.5 }}
                          className="mt-6 text-sm font-headline-md text-primary-container uppercase tracking-[0.2em]"
                        >
                          ⚡ Decrypting Problem Statement... ⚡
                        </motion.h4>
                      </div>
                    )}

                    {/* Revealed State */}
                    {team.isOpened && !isOpeningLocal && (
                      <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                      >
                        <div className="flex items-center justify-between text-xs uppercase tracking-widest font-semibold font-label-sm border-b border-white/5 pb-3">
                          <div className="flex items-center gap-2 text-green-400">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            Challenge Decrypted
                          </div>
                          <div className="text-primary-container font-bold">
                            +{questionPoints} PTS ADDED
                          </div>
                        </div>

                        <h4 className="mt-4 text-lg font-headline-md text-on-surface uppercase tracking-wide">
                          Subject: {questionTitle}
                        </h4>

                        <div className="mt-3 p-5 rounded-xl border border-primary-container/20 bg-background/60 relative overflow-hidden">
                          <div className="absolute top-0 left-0 w-1 h-full bg-primary-container" />
                          <p className="text-[14px] leading-7 text-on-surface-variant font-body-md m-0">
                            {questionDesc}
                          </p>
                        </div>

                        <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-white/5 pt-4">
                          <p className="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant font-label-sm m-0">
                            Authorized Decryption By: <span className="text-on-surface font-bold">{leader?.email}</span>
                          </p>
                          <span className="text-[10px] uppercase tracking-wider text-green-400 font-semibold font-label-sm">
                            System Status: Ready to Build
                          </span>
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {/* WIDGET 2: Chaos Mystery Box */}
                  <div className="rounded-[24px] border border-red-500/20 bg-[rgba(239,68,68,0.01)] p-6 shadow-[0_15px_45px_rgba(239,68,68,0.02)] relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500/30 to-transparent" />
                    
                    <div className="flex justify-between items-center mb-4">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-red-400 font-label-sm m-0">Chaos Mode Injector</p>
                      {team.isChaosOpened && (
                        <span className={`px-2.5 py-0.5 text-[9px] font-bold rounded uppercase tracking-wider font-label-sm ${
                          team.isChaosResolved ? 'bg-green-500/10 border border-green-500/30 text-green-400' : 'bg-red-500/10 border border-red-500/30 text-red-400 animate-pulse'
                        }`}>
                          {team.isChaosResolved ? 'Threat Mitigated ✓' : 'Threat Active ⚡'}
                        </span>
                      )}
                    </div>

                    {/* Stage A: Countdown Timer / Wait State */}
                    {!isChaosUnlocked && !team.isChaosOpened && (
                      <div className="flex flex-col items-center justify-center py-6 text-center">
                        <div className="w-14 h-14 rounded-full bg-red-950/20 border border-red-500/20 flex items-center justify-center text-red-400 text-xl font-bold mb-4">
                          🔒
                        </div>
                        <h4 className="text-md font-headline-md text-on-surface uppercase tracking-wider mb-1.5">Chaos Mystery Box is Locked</h4>
                        <p className="text-xs text-on-surface-variant max-w-[420px] mt-1.5 mb-4">
                          A surprise challenge revision or system block is schedule-injected into your cockpit 5 hours after registration.
                        </p>
                        
                        {/* Countdown display */}
                        <div className="font-headline-xl text-3xl text-red-400 font-bold px-5 py-2.5 bg-red-950/10 border border-red-500/25 rounded-2xl tracking-[0.12em] mb-5">
                          {formatTime(secondsLeft)}
                        </div>

                        {/* Demo simulator button */}
                        <button
                          type="button"
                          onClick={handleSimulateChaosUnlock}
                          className="bg-transparent hover:bg-red-500/15 border border-red-500/30 text-red-400 px-4 py-2 text-[11px] font-headline-md uppercase tracking-wider rounded-lg transition-all cursor-pointer font-bold"
                        >
                          ⏩ Simulate 5 Hours Passing (Demo)
                        </button>
                      </div>
                    )}

                    {/* Stage B: Unlocked but Sealed (Ready to open) */}
                    {isChaosUnlocked && !team.isChaosOpened && !isChaosOpeningLocal && (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <motion.div
                          animate={{
                            rotate: [0, -3, 3, -3, 3, 0],
                            scale: [1, 1.02, 1],
                          }}
                          transition={{
                            repeat: Infinity,
                            duration: 3,
                            ease: "easeInOut",
                          }}
                        >
                          <MiniChaosMysteryBox />
                        </motion.div>

                        <h4 className="mt-4 text-xl font-headline-md text-red-400 uppercase tracking-widest">Chaos Box is Ready</h4>
                        <p className="text-xs text-on-surface-variant max-w-[380px] mt-2 mb-6">The countdown has expired. A chaos event has been assigned. Decrypt it to reveal your team's live threat.</p>

                        {isCurrentLeader ? (
                          <button
                            type="button"
                            onClick={handleUnveilChaos}
                            className="bg-red-500 text-black px-7 py-3.5 font-bold font-headline-md uppercase tracking-wider border-0 rounded-xl cursor-pointer hover:bg-red-400 transition-colors shadow-[0_0_20px_rgba(239,68,68,0.4)] hover:scale-105 transform duration-150 text-sm"
                          >
                            Decrypt Chaos Event
                          </button>
                        ) : (
                          <div className="flex items-center gap-2.5 bg-red-950/10 border border-red-500/20 px-4 py-3 rounded-xl">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                            <p className="text-xs text-on-surface-variant m-0">
                              Waiting for Team Leader ({leader?.email || 'Leader'}) to open the chaos box...
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Stage C: Opening Animation */}
                    {isChaosOpeningLocal && (
                      <div className="flex flex-col items-center justify-center py-10 text-center overflow-hidden">
                        <motion.div
                          animate={{
                            rotate: [-8, 8, -8, 8, -8, 8, 0],
                            scale: [1, 1.2, 1.4, 0.8, 1.8, 0],
                            filter: ["brightness(1)", "brightness(1.5)", "brightness(2)"],
                          }}
                          transition={{
                            duration: 2,
                            ease: "easeInOut",
                          }}
                        >
                          <MiniChaosMysteryBox />
                        </motion.div>
                        <motion.h4
                          animate={{ opacity: [0.5, 1, 0.5] }}
                          transition={{ repeat: Infinity, duration: 0.5 }}
                          className="mt-6 text-sm font-headline-md text-red-400 uppercase tracking-[0.2em]"
                        >
                          ⚡ Injecting Disruption Script... ⚡
                        </motion.h4>
                      </div>
                    )}

                    {/* Stage D: Opened / Decrypted Threat details */}
                    {team.isChaosOpened && !isChaosOpeningLocal && team.chaosEvent && (
                      <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                      >
                        <div className="flex items-center justify-between text-xs uppercase tracking-widest font-semibold font-label-sm border-b border-white/5 pb-3">
                          <div className={`flex items-center gap-2 ${team.isChaosResolved ? 'text-green-400' : 'text-red-400 animate-pulse'}`}>
                            <span className={`w-2 h-2 rounded-full ${team.isChaosResolved ? 'bg-green-500' : 'bg-red-500 animate-ping'}`} />
                            {team.isChaosResolved ? 'Chaos Solved' : 'Live Threat Detected'}
                          </div>
                          <div className="text-red-400 font-bold">
                            {team.isChaosResolved ? '+120 PTS AWARDED' : 'RESOLVE FOR +120 PTS'}
                          </div>
                        </div>

                        <h4 className="mt-4 text-lg font-headline-md text-on-surface uppercase tracking-wide">
                          Threat ID: {team.chaosEvent.icon} {team.chaosEvent.title}
                        </h4>

                        <div className={`mt-3 p-5 rounded-xl border relative overflow-hidden bg-background/60`}>
                          <div className={`absolute top-0 left-0 w-1 h-full ${team.isChaosResolved ? 'bg-green-500' : 'bg-red-500'}`} />
                          <p className="text-[14px] leading-7 text-on-surface-variant font-body-md m-0">
                            {team.chaosEvent.desc}
                          </p>
                        </div>

                        <div className="mt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-white/5 pt-4">
                          <div>
                            <p className="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant font-label-sm m-0">
                              Threat Vector: Injected Mid-Build
                            </p>
                          </div>
                          
                          {team.isChaosResolved ? (
                            <span className="px-4 py-2.5 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-bold uppercase tracking-wider font-headline-md">
                              Threat Mitigated ✓
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={handleResolveChaos}
                              className="bg-red-500 hover:bg-red-400 text-black px-5 py-3 text-xs font-bold font-headline-md uppercase tracking-wider rounded-xl cursor-pointer border-0 transition-transform active:scale-[0.98]"
                            >
                              ⚙ Deploy Mitigation Patch
                            </button>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {/* Sandbox Deliverables Widget */}
                  <div className="bg-white/[0.02] border border-white/5 p-6 rounded-[24px]">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant font-label-sm mb-4">Milestones &amp; Deliverables</p>
                    <div className="space-y-3.5">
                      {[
                        { title: 'Decrypt Mystery Box Topic', desc: 'Initialize hackathon by decrypting the sealed topic statement.', status: team.isOpened ? 'complete' : 'pending' },
                        { title: 'Architecture Mapping', desc: 'Draft your AWS architecture stack diagram and submit it to organizers.', status: team.isOpened ? 'in-progress' : 'pending' },
                        { title: 'Resolve Injected Chaos Event', desc: 'Mitigate the surprise system block injected by the second mystery box.', status: team.isChaosResolved ? 'complete' : (team.isChaosOpened ? 'in-progress' : 'pending') },
                        { title: 'Final Deployment', desc: 'Host application and prepare the 3-minute pitch presentation.', status: 'pending' }
                      ].map((item, idx) => (
                        <div key={idx} className="flex gap-4 p-4 rounded-xl border border-white/5 bg-white/[0.01]">
                          <div className="flex-shrink-0 mt-0.5">
                            {item.status === 'complete' && <span className="text-green-400 text-lg">✓</span>}
                            {item.status === 'in-progress' && <span className="w-4 h-4 rounded-full border-2 border-primary-container border-t-transparent animate-spin inline-block" />}
                            {item.status === 'pending' && <span className="text-on-surface-variant/40 text-lg">○</span>}
                          </div>
                          <div>
                            <h5 className={`text-sm font-headline-md uppercase m-0 tracking-wide ${item.status === 'complete' ? 'line-through text-on-surface-variant/60' : 'text-on-surface'}`}>{item.title}</h5>
                            <p className="text-xs text-on-surface-variant mt-1 m-0 font-body-md">{item.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Side Info Widgets */}
                <div className="flex flex-col gap-6">
                  
                  {/* Stats Progress Level widget */}
                  <div className="bg-white/[0.02] border border-white/5 p-6 rounded-[24px]">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant font-label-sm mb-2">Team standing</p>
                    <h4 className="text-lg font-headline-md text-primary-container uppercase m-0 tracking-widest">{level}</h4>
                    
                    {/* Progress slider */}
                    <div className="mt-4">
                      <div className="flex justify-between text-[10px] text-on-surface-variant font-label-sm mb-1.5">
                        <span>XP Progress</span>
                        <span>Next Rank: {nextLevel}</span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-primary-container rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(255,153,0,0.5)]" style={{ width: `${progressPct}%` }} />
                      </div>
                    </div>

                    <Divider className="my-5" />

                    <p className="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant font-label-sm mb-3">Scores Breakdown</p>
                    <div className="space-y-3">
                      {POINTS.slice(0, 3).map((p, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs font-label-sm border-b border-white/5 pb-2">
                          <span className="text-on-surface-variant">{p.icon} {p.name}</span>
                          <span className="text-primary-container font-bold">{p.val} pts</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Members Widget */}
                  <div className="bg-white/[0.02] border border-white/5 p-6 rounded-[24px]">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant font-label-sm mb-4">Live Teammates</p>
                    <div className="space-y-3">
                      {team.members?.map((member, index) => (
                        <div key={index} className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-[#15131d]/30">
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Avatar */}
                            <div className="w-8 h-8 rounded-lg bg-primary-container/10 border border-primary-container/20 flex items-center justify-center font-bold text-xs text-primary-container">
                              {member.email.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <h5 className="text-xs font-bold text-on-surface truncate m-0">{member.email}</h5>
                              <p className="text-[9px] text-on-surface-variant mt-0.5 m-0 font-label-sm">VIT Student</p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                            <span className="px-2 py-0.5 text-[8px] bg-white/5 text-on-surface font-semibold rounded font-label-sm">
                              {member.isLeader ? 'Leader' : 'Member'}
                            </span>
                            <span className="flex items-center gap-1 text-[8px] text-green-400 font-label-sm">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                              active
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              </motion.div>
            )}

            {/* TAB 2: Point Shop */}
            {activeTab === 'shop' && (
              <motion.div
                key="shop"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
              >
                <div className="bg-white/[0.02] border border-white/5 p-6 rounded-[24px] mb-6">
                  <h3 className="text-xl font-headline-md text-on-surface uppercase tracking-widest mt-0 mb-1.5">Advantage Point Shop</h3>
                  <p className="text-xs text-on-surface-variant m-0 font-body-md">Exchange your decrypted event points for developer resources, mentoring support, or presentation bonuses.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {SHOP_ITEMS.map((item, i) => {
                    const priceVal = parseInt(item.price);
                    const isOwned = ownedItems.includes(item.title);
                    const canAfford = points >= priceVal;

                    return (
                      <div
                        key={i}
                        className="p-5 border flex flex-col justify-between"
                        style={{
                          background: 'linear-gradient(135deg, rgba(255,153,0,0.04), rgba(255,153,0,0.01))',
                          border: '1px solid rgba(255,153,0,0.15)',
                          borderRadius: '16px',
                          minHeight: '200px'
                        }}
                      >
                        <div>
                          <div className="flex justify-between items-start gap-2 mb-3">
                            <span className="inline-block px-3 py-1 text-[11px] font-bold font-label-sm bg-primary-container/10 border border-primary-container/30 text-primary-container rounded-full">
                              {item.price}
                            </span>
                            {isOwned && (
                              <span className="px-2.5 py-0.5 text-[9px] bg-green-500/10 border border-green-500/30 text-green-400 font-bold rounded uppercase tracking-wider font-label-sm">
                                Owned ✓
                              </span>
                            )}
                          </div>
                          <h4 className="text-sm text-on-surface font-headline-md uppercase tracking-wider mb-2">{item.title}</h4>
                          <p className="text-xs text-on-surface-variant font-body-md leading-relaxed m-0">{item.desc}</p>
                        </div>

                        <div className="mt-5">
                          {isOwned ? (
                            <button
                              disabled
                              className="w-full bg-green-500/10 border border-green-500/20 text-green-400 py-2.5 rounded-xl text-xs uppercase font-headline-md tracking-wider font-semibold cursor-not-allowed"
                            >
                              Unlocked ✓
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handlePurchase(item)}
                              disabled={!canAfford}
                              className={`w-full py-2.5 rounded-xl text-xs uppercase font-headline-md tracking-wider font-bold border-0 transition-all cursor-pointer ${
                                canAfford
                                  ? 'bg-primary-container text-background hover:bg-primary shadow-[0_0_15px_rgba(255,153,0,0.2)] active:scale-[0.98]'
                                  : 'bg-white/5 text-on-surface-variant/40 cursor-not-allowed'
                              }`}
                            >
                              {canAfford ? 'Purchase Advantage' : 'Not Enough Points'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* TAB 3: Spin Wheel */}
            {activeTab === 'wheel' && (
              <motion.div
                key="wheel"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
                className="max-w-[700px] mx-auto"
              >
                <div className="bg-white/[0.02] border border-white/5 p-6 rounded-[24px] text-center mb-6">
                  <h3 className="text-xl font-headline-md text-on-surface uppercase tracking-widest mt-0 mb-1.5">🎰 Golden Spin Wheel</h3>
                  <p className="text-xs text-on-surface-variant max-w-[500px] mx-auto font-body-md">Spin the wheel to earn wildcards, judging perks, or bonus points. Spins require 1 Spin Token.</p>
                </div>

                <div className="bg-white/[0.02] border border-white/5 p-6 rounded-[24px] flex justify-center shadow-[0_15px_50px_rgba(255,153,0,0.05)]">
                  <SpinWheel />
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

      </main>

    </div>
  );
}
