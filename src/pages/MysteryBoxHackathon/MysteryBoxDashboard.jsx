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
import { SHOP_ITEMS, POINTS, CHAOS_EVENTS, MYSTERY_BOX_QUESTIONS } from './data';
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

  // Question Picker & Confirmation States
  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);
  const [filterTier, setFilterTier] = useState('All'); // 'All', 'Easy', 'Medium', 'Hard'
  const [pendingQuestion, setPendingQuestion] = useState(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);

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

  // Live polling from server so teammates on other devices/windows appear in real-time
  useEffect(() => {
    if (!team?.code) return;
    const fetchLatestTeam = async () => {
      try {
        const res = await fetch(`/api/mystery-box/teams/${team.code}`);
        if (res.ok) {
          const freshTeam = await res.json();
          if (freshTeam && freshTeam.code) {
            setTeam((prev) => {
              if (!prev) return freshTeam;
              return {
                ...freshTeam,
                isOpened: freshTeam.isOpened || prev.isOpened,
                points: Math.max(freshTeam.points || 0, prev.points || 0),
                hasChangedQuestion: freshTeam.hasChangedQuestion || prev.hasChangedQuestion,
              };
            });
            if (typeof window !== 'undefined') {
              window.localStorage.setItem(TEAM_STORAGE_KEY, JSON.stringify(freshTeam));
            }
          }
        }
      } catch (e) {
        // quiet catch
      }
    };

    fetchLatestTeam();
    const interval = setInterval(fetchLatestTeam, 3000);
    return () => clearInterval(interval);
  }, [team?.code]);

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
  const parsedQuestion = (() => {
    if (!team.mysteryQuestion) return null;
    if (typeof team.mysteryQuestion === 'object') return team.mysteryQuestion;
    try {
      return JSON.parse(team.mysteryQuestion);
    } catch {
      return { title: 'Mystery Challenge', desc: team.mysteryQuestion, points: 100, difficulty: 'Easy' };
    }
  })();

  const questionDesc = parsedQuestion?.desc || 'Build your serverless or cloud hackathon solution as assigned.';
  const questionTitle = parsedQuestion?.title || 'Mystery Challenge';
  const questionPoints = parsedQuestion?.points || 100;
  const questionDifficulty = parsedQuestion?.difficulty || (questionPoints >= 170 ? 'Hard' : questionPoints >= 130 ? 'Medium' : 'Easy');
  const questionTags = parsedQuestion?.tags || [];

  // Check if topic change was already used once
  const hasChangedQuestion = Boolean(
    team.hasChangedQuestion ||
    (team.ownedItems || []).includes('Change Challenge Topic') ||
    (team.ownedItems || []).includes('Change Question Topic') ||
    ownedItems.includes('Change Challenge Topic') ||
    ownedItems.includes('Change Question Topic')
  );

  // Dynamic cost calculation based on pricing rules:
  // UPGRADE DIFFICULTY (Discounted incentive for taking on harder challenge):
  // - Medium -> Hard: 50 pts
  // - Easy -> Hard: 50 pts
  // - Easy -> Medium: 75 pts
  // SAME DIFFICULTY:
  // - Easy -> Easy: 100 pts
  // - Medium -> Medium: 100 pts
  // - Hard -> Hard: 100 pts
  // DOWNGRADE DIFFICULTY (Strategic pivot to easier tier):
  // - Medium -> Easy: 125 pts
  // - Hard -> Medium: 125 pts
  // - Hard -> Easy: 150 pts
  const calculateSwapCost = (currentDiff, targetDiff) => {
    const c = (currentDiff || 'Medium').toLowerCase();
    const t = (targetDiff || 'Medium').toLowerCase();

    if (c === 'hard') {
      if (t === 'hard') return 100;
      if (t === 'medium') return 125;
      if (t === 'easy') return 150;
    }
    if (c === 'medium') {
      if (t === 'hard') return 50; // Discounted reward for increasing difficulty!
      if (t === 'medium') return 100;
      if (t === 'easy') return 125;
    }
    if (c === 'easy') {
      if (t === 'hard') return 50; // Discounted reward for increasing difficulty!
      if (t === 'medium') return 75; // Discounted reward for increasing difficulty!
      if (t === 'easy') return 100;
    }
    return 100;
  };

  const minSwapCost = (questionDifficulty || 'Medium').toLowerCase() === 'hard' ? 100 : 50;

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

  const persistTeam = async (nextTeam, activityEvent = null) => {
    setTeam(nextTeam);
    if (typeof window !== 'undefined') {
      if (nextTeam) {
        window.localStorage.setItem(TEAM_STORAGE_KEY, JSON.stringify(nextTeam));
        if (nextTeam.code) {
          try {
            await fetch('/api/mystery-box/teams/update', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                code: nextTeam.code,
                isOpened: nextTeam.isOpened,
                points: nextTeam.points,
                ownedItems: nextTeam.ownedItems || ownedItems,
                chaosEvent: nextTeam.chaosEvent,
                isChaosOpened: nextTeam.isChaosOpened,
                isChaosResolved: nextTeam.isChaosResolved,
                mysteryQuestion: nextTeam.mysteryQuestion,
                hasChangedQuestion: nextTeam.hasChangedQuestion,
                activityEvent: activityEvent,
              }),
            });
          } catch (e) {
            console.error('Error updating team on server:', e);
          }
        }
      } else {
        window.localStorage.removeItem(TEAM_STORAGE_KEY);
      }
    }
  };

  const handleUnveilMysteryTopic = () => {
    if (!team) return;
    setIsOpeningLocal(true);
    const nextPoints = (team.points || 0) + questionPoints;
    const updatedTeam = {
      ...team,
      isOpened: true,
      points: nextPoints,
    };
    persistTeam(updatedTeam, {
      type: 'TOPIC_DECRYPTED',
      message: `Squad "${team.teamName}" unveiled mystery container: "${questionTitle}" [${questionDifficulty}] (+${questionPoints} pts)`,
      details: { topic: questionTitle, points: questionPoints }
    });
    setTimeout(() => {
      setIsOpeningLocal(false);
      setPrevIsOpened(true);
    }, 2000);
  };

  // Step 1: Open Confirmation dialog for a selected question
  const handleSelectQuestion = (q) => {
    if (!isCurrentLeader) {
      setNotification('Only the Team Leader has authorization to change the challenge topic.');
      setTimeout(() => setNotification(''), 4000);
      return;
    }
    if (hasChangedQuestion) {
      setNotification('Topic change has already been used once for this team.');
      setTimeout(() => setNotification(''), 4000);
      return;
    }
    const cost = calculateSwapCost(questionDifficulty, q.difficulty);
    if ((team.points || 0) < cost) {
      setNotification(`Insufficient points. You need ${cost} pts to select this topic.`);
      setTimeout(() => setNotification(''), 4000);
      return;
    }
    setPendingQuestion({ ...q, swapCost: cost });
    setIsConfirming(true);
  };

  // Step 2: Confirm and permanently lock the selected question
  const handleConfirmLockQuestion = async () => {
    if (!pendingQuestion) return;
    if (!isCurrentLeader) {
      setNotification('Only the Team Leader has authorization to lock this question.');
      setTimeout(() => setNotification(''), 4000);
      return;
    }
    if (hasChangedQuestion) {
      setNotification('Topic change has already been used once for this team.');
      setTimeout(() => setNotification(''), 4000);
      return;
    }

    const cost = pendingQuestion.swapCost || 100;
    const currentPts = team.points || 0;
    if (currentPts < cost) {
      setNotification(`Insufficient points. You need ${cost} pts to lock this topic.`);
      setTimeout(() => setNotification(''), 4000);
      return;
    }

    setIsSwapping(true);
    const nextPoints = Math.max(0, currentPts - cost);
    const nextOwned = [...new Set([...ownedItems, 'Change Challenge Topic'])];

    const updatedTeam = {
      ...team,
      mysteryQuestion: {
        id: pendingQuestion.id,
        title: pendingQuestion.title,
        difficulty: pendingQuestion.difficulty,
        points: pendingQuestion.points,
        desc: pendingQuestion.desc,
        tags: pendingQuestion.tags || [],
      },
      points: nextPoints,
      hasChangedQuestion: true,
      ownedItems: nextOwned,
    };

    setOwnedItems(nextOwned);
    await persistTeam(updatedTeam, {
      type: 'TOPIC_SWAPPED',
      message: `Leader swapped challenge topic to "${pendingQuestion.title}" [${pendingQuestion.difficulty}] (-${cost} pts)`,
      details: { oldTopic: questionTitle, newTopic: pendingQuestion.title, cost }
    });

    setIsSwapping(false);
    setIsConfirming(false);
    setPendingQuestion(null);
    setIsSwapModalOpen(false);

    setNotification(`🔒 Locked in new challenge: "${pendingQuestion.title}" [${pendingQuestion.difficulty}]! Deducted ${cost} pts.`);
    setTimeout(() => setNotification(''), 6000);
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
    if (item.isSpecialSwap || item.id === 'change-topic') {
      if (!isCurrentLeader) {
        setNotification('Only the Team Leader can purchase this topic change.');
        setTimeout(() => setNotification(''), 4000);
        return;
      }
      if (hasChangedQuestion) {
        setNotification('This 1-time option has already been used by your team.');
        setTimeout(() => setNotification(''), 4000);
        return;
      }
      setIsSwapModalOpen(true);
      return;
    }

    const cost = parseInt(item.price);
    if (isNaN(cost) || (team.points || 0) < cost) return;

    const nextPoints = (team.points || 0) - cost;
    const nextOwned = [...ownedItems, item.title];
    const nextTeam = { ...team, points: nextPoints, ownedItems: nextOwned };
    
    persistTeam(nextTeam, {
      type: 'BUFF_PURCHASED',
      message: `Squad purchased Advantage Buff: "${item.title}" (-${cost} pts)`,
      details: { item: item.title, cost }
    });

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
    persistTeam(updatedTeam, {
      type: 'CHAOS_RESOLVED',
      message: `Squad mitigated Chaos Event: "${team.chaosEvent?.title || 'Chaos'}" (+120 bonus pts)`,
      details: { chaos: team.chaosEvent?.title }
    });
    setNotification('Awesome! Chaos Event mitigated. +120 Bonus Points awarded!');
    setTimeout(() => setNotification(''), 4000);
  };

  // Determine user level based on points
  const points = team.points || 0;
  let levelTitle = 'Level 1: Cloud Initiate';
  let progressPct = Math.min((points / 150) * 100, 100);
  if (points >= 150 && points < 300) {
    levelTitle = 'Level 2: Architecture Hacker';
    progressPct = Math.min(((points - 150) / 150) * 100, 100);
  } else if (points >= 300) {
    levelTitle = 'Level 3: Master of Chaos';
    progressPct = 100;
  }

  // Difficulty styling helper
  const getDifficultyBadge = (difficulty) => {
    const diff = (difficulty || 'Easy').toLowerCase();
    if (diff === 'hard') {
      return {
        label: 'Hard',
        className: 'bg-purple-500/10 border-purple-500/30 text-purple-400',
        dot: 'bg-purple-400',
      };
    }
    if (diff === 'medium') {
      return {
        label: 'Medium',
        className: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
        dot: 'bg-amber-400',
      };
    }
    return {
      label: 'Easy',
      className: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
      dot: 'bg-emerald-400',
    };
  };

  const currentDiffBadge = getDifficultyBadge(questionDifficulty);

  // Filter questions for display
  const filteredQuestions = MYSTERY_BOX_QUESTIONS.filter((q) => {
    if (filterTier === 'All') return true;
    return q.difficulty.toLowerCase() === filterTier.toLowerCase();
  });

  return (
    <div className="min-h-screen bg-background text-on-surface flex flex-col md:flex-row relative selection:bg-primary-container selection:text-background font-body-md overflow-x-hidden">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-primary-container text-background font-headline-md text-xs uppercase tracking-wider px-6 py-3 rounded-full shadow-[0_0_30px_rgba(255,153,0,0.5)] font-bold flex items-center gap-2 border border-white/20"
          >
            <span>⚡</span> {notification}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar Navigation */}
      <aside className="w-full md:w-80 bg-[#0c0c0e] border-b md:border-b-0 md:border-r border-white/5 p-6 flex flex-col justify-between flex-shrink-0 relative z-20">
        <div>
          {/* Logo Brand Header */}
          <div className="flex items-center gap-3 mb-8">
            <img src={awsIcon} alt="AWS" className="w-8 h-8 rounded-lg object-contain" />
            <div>
              <h1 className="text-sm font-headline-md tracking-wider text-on-surface uppercase m-0 leading-tight">AWS Cloud Club</h1>
              <span className="text-[10px] text-primary-container font-label-sm uppercase tracking-widest">Mystery Box Hackathon</span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex flex-col gap-2 mb-8">
            {[
              { id: 'control', label: 'Mission Control', icon: '🎮' },
              { id: 'shop', label: 'Vendor Point Shop', icon: '🛒' },
              { id: 'wheel', label: 'Spin Wheel', icon: '🎰' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-headline-md uppercase tracking-wider transition-all cursor-pointer border-0 text-left ${
                  activeTab === tab.id
                    ? 'bg-primary-container/10 border border-primary-container/30 text-primary-container font-bold shadow-[0_0_15px_rgba(255,153,0,0.1)]'
                    : 'bg-transparent text-on-surface-variant hover:bg-white/5 hover:text-on-surface'
                }`}
              >
                <span className="text-base">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Team Members List */}
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 mb-6">
            <div className="flex justify-between items-center mb-3">
              <span className="text-[10px] uppercase tracking-widest text-on-surface-variant font-label-sm">Squad Roster</span>
              <span className="text-[10px] text-primary-container font-bold font-mono">{(team.members || []).length}/4</span>
            </div>
            <div className="flex flex-col gap-2.5">
              {(team.members || []).map((m, idx) => (
                <div key={idx} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-white/[0.02] border border-white/5">
                  <div className="flex items-center gap-2 min-w-0">
                    {m.picture ? (
                      <img src={m.picture} alt="" className="w-6 h-6 rounded-full flex-shrink-0" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-primary-container/20 text-primary-container flex items-center justify-center text-[10px] font-bold">
                        {(m.name || m.email || '?').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="text-xs text-on-surface font-headline-md truncate">{m.name || m.email.split('@')[0]}</div>
                      <div className="text-[9px] text-on-surface-variant font-mono truncate">{m.email}</div>
                    </div>
                  </div>
                  {m.isLeader && (
                    <span className="text-[8px] bg-primary-container/10 border border-primary-container/30 text-primary-container px-2 py-0.5 rounded font-bold uppercase tracking-wider font-label-sm">
                      Leader
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Level Progress Indicator */}
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] text-on-surface-variant uppercase tracking-wider font-label-sm">{levelTitle}</span>
              <span className="text-[10px] text-primary-container font-bold font-mono">{points} pts</span>
            </div>
            <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
              <motion.div
                className="bg-gradient-to-r from-primary-container to-primary h-full rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>
          </div>
        </div>

        {/* Disband / Leave Button */}
        <div className="mt-8 pt-4 border-t border-white/5">
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
                      <div className="flex items-center gap-2">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-primary-container font-label-sm m-0">Mission Activation</p>
                        {team.isOpened && (
                          <span className={`px-2.5 py-0.5 text-[9px] border font-bold rounded uppercase tracking-wider font-label-sm ${currentDiffBadge.className}`}>
                            <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${currentDiffBadge.dot}`} />
                            {currentDiffBadge.label} Tier
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {hasChangedQuestion && (
                          <span className="px-2.5 py-0.5 text-[9px] bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold rounded uppercase tracking-wider font-label-sm">
                            Topic Locked (1/1 Used)
                          </span>
                        )}
                        {team.isOpened && (
                          <span className="px-2.5 py-0.5 text-[9px] bg-green-500/10 border border-green-500/30 text-green-400 font-bold rounded uppercase tracking-wider font-label-sm">
                            Active
                          </span>
                        )}
                      </div>
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
                            ease: 'easeInOut',
                          }}
                        >
                          <MiniMysteryBox />
                        </motion.div>

                        <h4 className="mt-4 text-xl font-headline-md text-on-surface uppercase tracking-widest">Mystery Box is Sealed</h4>
                        <p className="text-xs text-on-surface-variant max-w-[380px] mt-2 mb-6">Your official hackathon challenge topic is locked inside this container. Prepare your setup before unlocking.</p>

                        {isCurrentLeader ? (
                          <button
                            type="button"
                            onClick={handleUnveilMysteryTopic}
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
                            filter: ['brightness(1)', 'brightness(1.5)', 'brightness(2)'],
                          }}
                          transition={{
                            duration: 2,
                            ease: 'easeInOut',
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
                        <div className="flex items-center justify-between text-xs uppercase tracking-widest font-semibold font-label-sm border-b border-white/5 pb-3 flex-wrap gap-2">
                          <div className="flex items-center gap-2 text-green-400">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            Challenge Decrypted
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className={`px-2.5 py-0.5 text-[10px] border font-bold rounded uppercase tracking-wider font-label-sm ${currentDiffBadge.className}`}>
                              {questionDifficulty} ({questionPoints} pts)
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-4">
                          <h4 className="text-lg font-headline-md text-on-surface uppercase tracking-wide m-0">
                            Subject: {questionTitle}
                          </h4>

                          {/* Leader Topic Swap Option shortcut - ONLY REVEALED WHEN TEAM HAS SUFFICIENT POINTS */}
                          {isCurrentLeader && !hasChangedQuestion && points >= minSwapCost && (
                            <button
                              type="button"
                              onClick={() => setIsSwapModalOpen(true)}
                              className="self-start sm:self-auto bg-primary-container/10 border border-primary-container/30 hover:bg-primary-container hover:text-background text-primary-container px-3 py-1.5 rounded-lg text-[11px] font-headline-md uppercase tracking-wider transition-all cursor-pointer font-bold flex items-center gap-1.5 shadow-[0_0_10px_rgba(255,153,0,0.15)]"
                            >
                              <span>🔄</span> Change Topic (Shop)
                            </button>
                          )}
                        </div>

                        <div className="mt-3 p-5 rounded-xl border border-primary-container/20 bg-background/60 relative overflow-hidden">
                          <div className="absolute top-0 left-0 w-1 h-full bg-primary-container" />
                          <p className="text-[14px] leading-7 text-on-surface-variant font-body-md m-0">
                            {questionDesc}
                          </p>

                          {questionTags.length > 0 && (
                            <div className="mt-3.5 flex flex-wrap gap-2 pt-3 border-t border-white/5">
                              {questionTags.map((tag, idx) => (
                                <span key={idx} className="px-2 py-0.5 text-[10px] font-mono bg-white/[0.04] border border-white/10 text-on-surface-variant rounded">
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}
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
                  <div className="rounded-[24px] border border-red-500/20 bg-[rgba(239,68,68,0.02)] p-6 shadow-[0_15px_45px_rgba(239,68,68,0.02)] relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500/40 via-red-500/20 to-transparent" />
                    
                    <div className="flex justify-between items-center mb-4">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-red-400 font-label-sm m-0">Chaos Mode Injector</p>
                      <span className="px-2.5 py-0.5 text-[9px] font-bold rounded uppercase tracking-wider font-label-sm bg-red-500/10 border border-red-500/30 text-red-400">
                        Admin Controlled
                      </span>
                    </div>

                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <motion.div
                        animate={{
                          rotate: [0, -2, 2, -2, 0],
                          scale: [1, 1.03, 1],
                        }}
                        transition={{
                          repeat: Infinity,
                          duration: 4,
                          ease: 'easeInOut',
                        }}
                      >
                        <MiniChaosMysteryBox />
                      </motion.div>

                      <div className="mt-5 p-4 rounded-xl border border-red-500/30 bg-red-950/20 max-w-[480px]">
                        <p className="text-[15px] font-headline-md text-red-300 font-bold uppercase tracking-wider m-0">
                          "Chaos event awaits - Revealed by admins after Round 1"
                        </p>
                      </div>

                      <p className="text-xs text-on-surface-variant max-w-[420px] mt-3 mb-0">
                        Stay tuned. When Round 1 concludes, event organizers will trigger the live system disruption for all qualified teams.
                      </p>
                    </div>
                  </div>

                  {/* Sandbox Deliverables Widget */}
                  <div className="bg-white/[0.02] border border-white/5 p-6 rounded-[24px]">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant font-label-sm mb-4">Milestones &amp; Deliverables</p>
                    <div className="space-y-3.5">
                      {[
                        { title: 'Decrypt Mystery Box Topic', desc: 'Initialize hackathon by decrypting the sealed topic statement.', status: team.isOpened ? 'complete' : 'pending' },
                        { title: 'Architecture Mapping', desc: 'Draft your AWS architecture stack diagram and submit it to organizers.', status: team.isOpened ? 'in-progress' : 'pending' },
                        { title: 'Resolve Injected Chaos Event', desc: 'Mitigate the surprise system block injected by the second mystery box.', status: team.isChaosResolved ? 'complete' : (team.isChaosOpened ? 'in-progress' : 'pending') },
                        { title: 'Final Deployment', desc: 'Host application and prepare the 3-minute pitch presentation.', status: 'pending' },
                      ].map((item, idx) => (
                        <div key={idx} className="flex gap-4 p-4 rounded-xl border border-white/5 bg-white/[0.01]">
                          <div className="flex-shrink-0 mt-0.5">
                            {item.status === 'complete' && <span className="text-green-400 text-lg">✓</span>}
                            {item.status === 'in-progress' && <span className="w-4 h-4 rounded-full border-2 border-primary-container border-t-transparent animate-spin inline-block" />}
                            {item.status === 'pending' && <span className="text-on-surface-variant/40 text-lg">○</span>}
                          </div>
                          <div>
                            <h5 className="text-sm font-headline-md text-on-surface uppercase tracking-wide m-0">{item.title}</h5>
                            <p className="text-xs text-on-surface-variant font-body-md mt-1 mb-0">{item.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Side Sidebar: Squad Perks & Mini Shop */}
                <div className="flex flex-col gap-6">
                  
                  {/* Point Generation Card */}
                  <div className="bg-white/[0.02] border border-white/5 p-6 rounded-[24px]">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-xs font-headline-md text-on-surface uppercase tracking-wider m-0">Points Feed</h4>
                      <button
                        type="button"
                        onClick={() => setActiveTab('shop')}
                        className="text-[10px] text-primary-container uppercase font-bold tracking-wider hover:underline bg-transparent border-0 cursor-pointer p-0 font-label-sm"
                      >
                        Open Vendor Shop →
                      </button>
                    </div>

                    <div className="space-y-3">
                      {POINTS.slice(0, 3).map((p, idx) => (
                        <div key={idx} className="p-3.5 rounded-xl border border-white/5 bg-white/[0.01] flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-xl">{p.icon}</span>
                            <div>
                              <div className="text-xs font-headline-md text-on-surface">{p.name}</div>
                              <div className="text-[10px] text-on-surface-variant font-mono">Completion bonus</div>
                            </div>
                          </div>
                          <span className="text-xs font-bold font-mono text-primary-container">{p.val}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Active Squad Perks */}
                  <div className="bg-white/[0.02] border border-white/5 p-6 rounded-[24px]">
                    <h4 className="text-xs font-headline-md text-on-surface uppercase tracking-wider mb-4 m-0">Owned Buffs &amp; Perks</h4>
                    {ownedItems.length === 0 ? (
                      <div className="text-center py-6 text-on-surface-variant/40 text-xs font-body-md">
                        No advantage perks acquired yet. Visit the Vendor Point Shop.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {ownedItems.map((itemTitle, i) => (
                          <div key={i} className="flex items-center justify-between p-3 bg-green-500/5 border border-green-500/20 rounded-xl">
                            <span className="text-xs text-green-300 font-headline-md uppercase tracking-wider">{itemTitle}</span>
                            <span className="text-[10px] text-green-400 font-mono font-bold">READY</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Question Swap Promotion Banner - ONLY REVEALED WHEN TEAM HAS SUFFICIENT POINTS */}
                  {!hasChangedQuestion && isCurrentLeader && points >= minSwapCost && (
                    <div className="p-5 rounded-[24px] border border-primary-container/30 bg-gradient-to-br from-primary-container/10 via-primary-container/5 to-transparent relative overflow-hidden">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">🔄</span>
                        <div>
                          <h5 className="text-xs font-headline-md text-on-surface uppercase tracking-wider m-0">Topic Change Available</h5>
                          <p className="text-[11px] text-on-surface-variant mt-1 mb-3 leading-relaxed">
                            Leader Privilege: Browse and select a specific challenge topic from the question catalog (1-time only).
                          </p>
                          <button
                            type="button"
                            onClick={() => setIsSwapModalOpen(true)}
                            className="bg-primary-container text-background px-4 py-2 rounded-lg text-xs font-headline-md uppercase tracking-wider font-bold hover:bg-primary transition-all cursor-pointer border-0 shadow-[0_0_10px_rgba(255,153,0,0.3)]"
                          >
                            Browse &amp; Change Topic
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

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
                <div className="bg-white/[0.02] border border-white/5 p-6 rounded-[24px] mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h3 className="text-xl font-headline-md text-on-surface uppercase tracking-widest mt-0 mb-1.5">Advantage Point Shop</h3>
                    <p className="text-xs text-on-surface-variant m-0 font-body-md">Exchange your decrypted event points for developer resources, topic changes, mentoring support, or presentation bonuses.</p>
                  </div>
                  <div className="flex items-center gap-2 bg-primary-container/10 border border-primary-container/30 px-4 py-2 rounded-xl text-primary-container font-headline-md text-xs uppercase font-bold">
                    <span>Balance:</span>
                    <span className="text-base text-white">{points} pts</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {SHOP_ITEMS.map((item, i) => {
                    const isSpecial = Boolean(item.isSpecialSwap || item.id === 'change-topic');
                    const isOwned = isSpecial ? hasChangedQuestion : ownedItems.includes(item.title);
                    
                    // For special swap, lowest price dynamically starts from minSwapCost (50 or 100)
                    const priceVal = isSpecial ? minSwapCost : parseInt(item.price);
                    const canAfford = points >= priceVal;

                    return (
                      <div
                        key={i}
                        className={`p-5 border flex flex-col justify-between relative overflow-hidden transition-all ${
                          isSpecial
                            ? 'bg-gradient-to-br from-primary-container/15 via-primary-container/5 to-background border-primary-container/40 shadow-[0_0_25px_rgba(255,153,0,0.1)]'
                            : 'bg-gradient-to-br from-primary-container/[0.04] to-primary-container/[0.01] border-primary-container/15'
                        }`}
                        style={{
                          borderRadius: '16px',
                          minHeight: '220px',
                        }}
                      >
                        {isSpecial && (
                          <div className="absolute top-0 right-0 bg-primary-container text-background text-[9px] font-headline-md uppercase tracking-wider font-bold px-3 py-1 rounded-bl-xl shadow-md">
                            Leader Only • 1x Limit
                          </div>
                        )}

                        <div>
                          <div className="flex justify-between items-start gap-2 mb-3">
                            <span className="inline-block px-3 py-1 text-[11px] font-bold font-label-sm bg-primary-container/10 border border-primary-container/30 text-primary-container rounded-full">
                              {item.price}
                            </span>
                            {isOwned && (
                              <span className="px-2.5 py-0.5 text-[9px] bg-green-500/10 border border-green-500/30 text-green-400 font-bold rounded uppercase tracking-wider font-label-sm">
                                {isSpecial ? 'Locked (1/1) ✓' : 'Owned ✓'}
                              </span>
                            )}
                          </div>
                          <h4 className="text-sm text-on-surface font-headline-md uppercase tracking-wider mb-2">{item.title}</h4>
                          <p className="text-xs text-on-surface-variant font-body-md leading-relaxed m-0">{item.desc}</p>
                        </div>

                        <div className="mt-5">
                          {isSpecial ? (
                            isOwned ? (
                              <button
                                disabled
                                className="w-full bg-amber-500/10 border border-amber-500/20 text-amber-400/60 py-2.5 rounded-xl text-xs uppercase font-headline-md tracking-wider font-semibold cursor-not-allowed"
                              >
                                Topic Locked (1x Limit Reached)
                              </button>
                            ) : !isCurrentLeader ? (
                              <button
                                disabled
                                className="w-full bg-white/5 border border-white/10 text-on-surface-variant/50 py-2.5 rounded-xl text-xs uppercase font-headline-md tracking-wider font-semibold cursor-not-allowed"
                              >
                                Leader Only Purchase
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handlePurchase(item)}
                                disabled={!canAfford}
                                className={`w-full py-2.5 rounded-xl text-xs uppercase font-headline-md tracking-wider font-bold border-0 transition-all cursor-pointer ${
                                  canAfford
                                    ? 'bg-primary-container text-background hover:bg-primary shadow-[0_0_15px_rgba(255,153,0,0.3)] active:scale-[0.98]'
                                    : 'bg-white/5 text-on-surface-variant/40 cursor-not-allowed'
                                }`}
                              >
                                {canAfford ? 'Browse & Select Topic (100-150 pts)' : 'Need 100+ Points'}
                              </button>
                            )
                          ) : isOwned ? (
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

      {/* ═══════════════════════════════════════════════════════════
          QUESTION CATALOG / SELECTION MODAL (LEADER PRIVILEGE)
         ═══════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {isSwapModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isSwapping && !isConfirming && setIsSwapModalOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-md"
            />

            {/* Modal Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl bg-[#111114] border border-primary-container/30 rounded-[28px] p-5 sm:p-7 shadow-[0_20px_60px_rgba(0,0,0,0.9)] overflow-hidden z-10 my-auto max-h-[90vh] flex flex-col"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-container via-amber-400 to-primary-container" />

              {/* Header */}
              <div className="flex justify-between items-start mb-4 flex-shrink-0">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-primary-container uppercase tracking-widest font-label-sm">Vendor Point Shop</span>
                    <span className="text-[9px] bg-primary-container/20 text-primary-container px-2 py-0.5 rounded font-bold uppercase font-mono">
                      Leader Only • 1x Use
                    </span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-headline-md text-on-surface uppercase tracking-wider mt-1 mb-0">Select Challenge Topic</h3>
                </div>
                <button
                  type="button"
                  onClick={() => !isSwapping && !isConfirming && setIsSwapModalOpen(false)}
                  className="bg-white/5 hover:bg-white/10 text-on-surface-variant hover:text-on-surface p-2 rounded-full border-0 cursor-pointer text-sm"
                >
                  ✕
                </button>
              </div>

              {/* Current Active Topic Banner */}
              <div className="p-3.5 sm:p-4 rounded-xl bg-white/[0.02] border border-white/10 mb-4 flex-shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] text-on-surface-variant uppercase font-label-sm tracking-wider block">Your Current Topic:</span>
                  <span className="text-xs sm:text-sm font-headline-md text-on-surface uppercase">{questionTitle}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 text-[9px] font-bold rounded uppercase tracking-wider font-label-sm ${currentDiffBadge.className}`}>
                    {questionDifficulty} ({questionPoints} pts)
                  </span>
                  <span className="text-xs font-mono text-primary-container font-bold bg-primary-container/10 px-3 py-1 rounded-lg border border-primary-container/20">
                    Points: {points} pts
                  </span>
                </div>
              </div>

              {/* Tier Filter Tabs */}
              <div className="flex items-center gap-2 mb-4 flex-shrink-0 overflow-x-auto pb-1">
                {['All', 'Easy', 'Medium', 'Hard'].map((tier) => (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => setFilterTier(tier)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-headline-md uppercase tracking-wider transition-all cursor-pointer border-0 ${
                      filterTier === tier
                        ? 'bg-primary-container text-background font-bold shadow-[0_0_10px_rgba(255,153,0,0.3)]'
                        : 'bg-white/5 text-on-surface-variant hover:bg-white/10 hover:text-on-surface'
                    }`}
                  >
                    {tier === 'All' ? 'All Questions (15)' : `${tier} (${MYSTERY_BOX_QUESTIONS.filter(q => q.difficulty.toLowerCase() === tier.toLowerCase()).length})`}
                  </button>
                ))}
              </div>

              {/* Question Cards Grid (Scrollable) */}
              <div className="overflow-y-auto flex-1 pr-1 space-y-3.5 min-h-[250px]">
                {filteredQuestions.map((q) => {
                  const isCurrent = q.title === questionTitle;
                  const diffBadge = getDifficultyBadge(q.difficulty);
                  const swapCost = calculateSwapCost(questionDifficulty, q.difficulty);
                  const canAfford = points >= swapCost;

                  return (
                    <div
                      key={q.id}
                      className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                        isCurrent
                          ? 'bg-white/[0.01] border-white/5 opacity-60'
                          : 'bg-white/[0.02] border-white/10 hover:border-primary-container/40 hover:bg-white/[0.04]'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <span className={`px-2.5 py-0.5 text-[9px] font-bold rounded uppercase tracking-wider font-label-sm ${diffBadge.className}`}>
                              <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${diffBadge.dot}`} />
                              {q.difficulty} Tier • +{q.points} Pts Reward
                            </span>
                            {isCurrent && (
                              <span className="px-2 py-0.5 text-[9px] bg-primary-container/20 text-primary-container font-bold rounded uppercase font-label-sm">
                                Current Active Topic
                              </span>
                            )}
                          </div>
                          <h4 className="text-sm sm:text-base font-headline-md text-on-surface uppercase tracking-wide m-0">
                            {q.title}
                          </h4>
                          <p className="text-xs text-on-surface-variant font-body-md mt-1.5 mb-2 leading-relaxed">
                            {q.desc}
                          </p>

                          {q.tags && q.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {q.tags.map((t, idx) => (
                                <span key={idx} className="text-[9px] font-mono px-2 py-0.5 bg-white/5 text-on-surface-variant/80 rounded border border-white/5">
                                  #{t}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Action / Cost Column */}
                        <div className="sm:text-right flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-on-surface-variant uppercase font-label-sm">Cost:</span>
                            <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded-lg ${
                              canAfford
                                ? 'bg-primary-container/15 text-primary-container border border-primary-container/30'
                                : 'bg-red-500/10 text-red-400 border border-red-500/30'
                            }`}>
                              {swapCost} pts
                            </span>
                          </div>

                          {isCurrent ? (
                            <button
                              disabled
                              className="px-4 py-2 rounded-xl text-xs uppercase font-headline-md tracking-wider bg-white/5 text-on-surface-variant/40 border border-white/5 cursor-not-allowed"
                            >
                              Current Topic
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSelectQuestion(q)}
                              disabled={!canAfford}
                              className={`px-4 py-2 rounded-xl text-xs uppercase font-headline-md tracking-wider font-bold transition-all border-0 ${
                                canAfford
                                  ? 'bg-primary-container text-background hover:bg-primary shadow-[0_0_15px_rgba(255,153,0,0.3)] cursor-pointer active:scale-95'
                                  : 'bg-white/5 text-on-surface-variant/30 cursor-not-allowed'
                              }`}
                            >
                              {canAfford ? 'Select Question →' : 'Need More Points'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Modal Footer Note */}
              <div className="pt-4 mt-2 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-2 text-on-surface-variant text-[11px] flex-shrink-0">
                <span className="font-label-sm uppercase tracking-wider">
                  ⚠️ Selection locks immediately upon leader confirmation (1-time use only).
                </span>
                <button
                  type="button"
                  onClick={() => setIsSwapModalOpen(false)}
                  className="bg-white/5 hover:bg-white/10 text-on-surface font-headline-md text-xs uppercase px-4 py-2 rounded-lg cursor-pointer border-0"
                >
                  Close Catalog
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════
          CONFIRMATION & LOCK MODAL (FINAL STEP)
         ═══════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {isConfirming && pendingQuestion && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isSwapping && setIsConfirming(false)}
              className="absolute inset-0 bg-black/85 backdrop-blur-lg"
            />

            {/* Confirmation Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-[#141418] border border-amber-500/40 rounded-[28px] p-6 sm:p-8 shadow-[0_25px_70px_rgba(0,0,0,0.95)] overflow-hidden z-10"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-primary-container to-amber-500" />

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-xl flex-shrink-0 text-amber-400">
                  🔒
                </div>
                <div>
                  <span className="text-[10px] text-amber-400 uppercase tracking-widest font-label-sm">Leader Verification</span>
                  <h3 className="text-lg sm:text-xl font-headline-md text-on-surface uppercase tracking-wider m-0">Confirm Topic Lock</h3>
                </div>
              </div>

              {/* Selected Topic Details Box */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 mb-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-on-surface-variant uppercase font-label-sm">New Selected Challenge</span>
                  <span className={`px-2.5 py-0.5 text-[9px] font-bold rounded uppercase tracking-wider font-label-sm ${getDifficultyBadge(pendingQuestion.difficulty).className}`}>
                    {pendingQuestion.difficulty} Tier • +{pendingQuestion.points} pts
                  </span>
                </div>
                <h4 className="text-base font-headline-md text-on-surface uppercase m-0 text-amber-300">
                  {pendingQuestion.title}
                </h4>
                <p className="text-xs text-on-surface-variant mt-2 mb-0 leading-relaxed">
                  {pendingQuestion.desc}
                </p>
              </div>

              {/* Point Deduction Math */}
              <div className="p-4 rounded-xl bg-background/90 border border-white/10 mb-5 grid grid-cols-3 gap-2 text-center text-xs font-headline-md uppercase tracking-wider">
                <div>
                  <span className="text-[10px] text-on-surface-variant block mb-0.5">Current Points</span>
                  <span className="text-white font-mono">{points} pts</span>
                </div>
                <div className="text-amber-400">
                  <span className="text-[10px] text-amber-400/70 block mb-0.5">Deduction</span>
                  <span className="font-mono">−{pendingQuestion.swapCost} pts</span>
                </div>
                <div>
                  <span className="text-[10px] text-on-surface-variant block mb-0.5">Balance After</span>
                  <span className="text-green-400 font-mono">{points - pendingQuestion.swapCost} pts</span>
                </div>
              </div>

              {/* Critical Warning Alert */}
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 mb-6 flex items-start gap-2.5">
                <span className="text-base text-amber-400 mt-0.5">⚠️</span>
                <p className="text-[11px] text-amber-300/90 leading-relaxed m-0 font-body-md">
                  <strong>Final Action:</strong> Once confirmed, this problem statement will be <strong>PERMANENTLY LOCKED</strong> for your team. You <strong>cannot change or reroll again</strong>.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={isSwapping}
                  onClick={() => setIsConfirming(false)}
                  className="flex-1 bg-white/5 hover:bg-white/10 text-on-surface-variant font-headline-md text-xs uppercase tracking-wider py-3.5 rounded-xl transition-all cursor-pointer border-0 font-semibold"
                >
                  ✕ Go Back
                </button>
                <button
                  type="button"
                  disabled={isSwapping}
                  onClick={handleConfirmLockQuestion}
                  className="flex-1 bg-gradient-to-r from-amber-500 to-primary-container text-background font-headline-md text-xs uppercase tracking-wider py-3.5 rounded-xl transition-all border-0 font-bold hover:brightness-110 shadow-[0_0_25px_rgba(255,153,0,0.4)] cursor-pointer active:scale-[0.98]"
                >
                  {isSwapping ? 'Locking Question...' : `Confirm & Lock (−${pendingQuestion.swapCost} pts)`}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
