import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import awsIcon from '../../assets/aws_icon.jpeg';
import {
  MiniMysteryBox,
  MiniChaosMysteryBox,
  Divider,
} from './components';
import { SHOP_ITEMS, POINTS } from './data';
import SpinWheel from './components/SpinWheel';
import { games } from '../gamesRegistry';
import { SCORED_TEAM_GAMES } from '../../utils/teamGameScoring';
import { fetchMysteryTopics, fetchTeamGameScores, swapTeamTopic } from '../../utils/auth';

const TEAM_STORAGE_KEY = 'mystery-box-hackathon-team';
const OWNED_ITEMS_KEY = 'mystery-box-owned-items';
const HACKATHON_TOKEN_KEY = 'mystery-box-hackathon-token';

export default function MysteryBoxDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(() => new URLSearchParams(location.search).get('tab') === 'games' ? 'games' : 'control');
  const [gameScores, setGameScores] = useState(null);
  const [topicModalOpen, setTopicModalOpen] = useState(false);
  const [topics, setTopics] = useState([]);
  const [topicSwapCost, setTopicSwapCost] = useState(100);
  const [selectedTopicId, setSelectedTopicId] = useState('');

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

  // Shop state mirrors the server-owned inventory for rendering only.
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
  const scoredGames = games.filter((game) => SCORED_TEAM_GAMES.includes(game.slug));
  const playedGameSlugs = new Set(gameScores?.playedGameSlugs || []);

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

  // Live polling from the server. The server balance is authoritative, including debits.
  useEffect(() => {
    if (!team?.code) return;
    const fetchLatestTeam = async () => {
      try {
        const token = window.sessionStorage.getItem(HACKATHON_TOKEN_KEY);
        const res = await fetch(`/api/mystery-box/teams/${team.code}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
        if (res.ok) {
          const freshTeam = await res.json();
          if (freshTeam && freshTeam.code) {
            setTeam(freshTeam);
            setOwnedItems(Array.isArray(freshTeam.ownedItems) ? freshTeam.ownedItems : []);
            if (typeof window !== 'undefined') {
              window.localStorage.setItem(TEAM_STORAGE_KEY, JSON.stringify(freshTeam));
              window.localStorage.setItem(OWNED_ITEMS_KEY, JSON.stringify(freshTeam.ownedItems || []));
            }
          }
        }
      } catch {
        // quiet catch
      }
    };

    fetchLatestTeam();
    const interval = setInterval(fetchLatestTeam, 3000);
    window.addEventListener('aws-team-score:updated', fetchLatestTeam);
    return () => {
      clearInterval(interval);
      window.removeEventListener('aws-team-score:updated', fetchLatestTeam);
    };
  }, [team?.code]);

  useEffect(() => {
    if (!team?.code) return;
    let active = true;
    const loadGameScores = async () => {
      const response = await fetchTeamGameScores(team.code);
      if (active && response.ok) setGameScores(response);
    };
    loadGameScores();
    window.addEventListener('aws-team-score:updated', loadGameScores);
    return () => {
      active = false;
      window.removeEventListener('aws-team-score:updated', loadGameScores);
    };
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
      const startTimer = setTimeout(() => setIsOpeningLocal(true), 0);
      const finishTimer = setTimeout(() => {
        setIsOpeningLocal(false);
        setPrevIsOpened(true);
      }, 2000);
      return () => {
        clearTimeout(startTimer);
        clearTimeout(finishTimer);
      };
    }
  }, [team?.isOpened, prevIsOpened]);

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
      return { title: 'Mystery Challenge', desc: team.mysteryQuestion, points: 100 };
    }
  })();

  const questionDesc = parsedQuestion?.desc || 'Build your serverless or cloud hackathon solution as assigned.';
  const questionTitle = parsedQuestion?.title || 'Mystery Challenge';
  const questionPoints = parsedQuestion?.points || 100;

  const persistTeamLocally = (nextTeam) => {
    setTeam(nextTeam);
    if (typeof window !== 'undefined') {
      if (nextTeam) {
        window.localStorage.setItem(TEAM_STORAGE_KEY, JSON.stringify(nextTeam));
      } else {
        window.localStorage.removeItem(TEAM_STORAGE_KEY);
      }
    }
  };

  const runLeaderAction = async (path, body = {}) => {
    const token = window.sessionStorage.getItem(HACKATHON_TOKEN_KEY);
    const response = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token || ''}` },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Team action failed');

    const refreshed = await fetch(`/api/mystery-box/teams/${team.code}`, {
      headers: { Authorization: `Bearer ${token || ''}` },
    });
    if (!refreshed.ok) throw new Error('Team action completed, but the dashboard could not refresh');
    const freshTeam = await refreshed.json();
    persistTeamLocally(freshTeam);
    const nextOwned = Array.isArray(freshTeam.ownedItems) ? freshTeam.ownedItems : [];
    setOwnedItems(nextOwned);
    window.localStorage.setItem(OWNED_ITEMS_KEY, JSON.stringify(nextOwned));
    return data;
  };

  const handleUnveilMysteryTopic = async () => {
    if (!team || !isCurrentLeader) return;
    try {
      setIsOpeningLocal(true);
      await runLeaderAction(`/api/mystery-box/teams/${team.code}/reveal`);
      setNotification(`Mystery challenge revealed. +${questionPoints} pts awarded.`);
      setTimeout(() => setNotification(''), 4000);
    } catch (error) {
      setNotification(error.message);
      setIsOpeningLocal(false);
    }
  };

  const handleDisbandOrLeave = async () => {
    const isLeader = team.members?.find((member) => member.isLeader)?.email === myEmail;
    if (!isLeader) {
      try {
        const token = window.sessionStorage.getItem(HACKATHON_TOKEN_KEY);
        const response = await fetch(`/api/mystery-box/teams/${team.code}/leave`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token || ''}` },
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not leave the team');
      } catch (error) {
        setNotification(error.message);
        return;
      }
    }
    persistTeamLocally(null);
    window.sessionStorage.removeItem('mystery-box-hackathon-my-email');
    window.sessionStorage.removeItem(HACKATHON_TOKEN_KEY);
    window.localStorage.removeItem(OWNED_ITEMS_KEY);
    window.localStorage.removeItem('mystery-box-chaos-simulated');
    setMyEmail('');
    navigate('/mystery-box-hackathon');
  };

  // Point Shop Purchase handler
  const handlePurchase = async (item) => {
    if (item.id === 'change-topic' || item.isSpecialSwap) {
      if (!isCurrentLeader || team.hasChangedQuestion) return;
      const response = await fetchMysteryTopics();
      if (response.ok) {
        setTopics(response.topics || []);
        setTopicSwapCost(response.topicSwapCost || 100);
        setSelectedTopicId('');
        setTopicModalOpen(true);
      } else {
        setNotification(response.error || 'Could not load challenge topics');
      }
      return;
    }
    const cost = parseInt(item.price);
    if (!isCurrentLeader || isNaN(cost) || (team.points || 0) < cost) return;
    try {
      const itemId = item.id || item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      await runLeaderAction(`/api/mystery-box/teams/${team.code}/purchases`, { itemId });
      setNotification(`Successfully purchased ${item.title}!`);
      setTimeout(() => setNotification(''), 4000);
    } catch (error) {
      setNotification(error.message);
    }
  };

  const handleConfirmTopicSwap = async () => {
    if (!selectedTopicId) return;
    const response = await swapTeamTopic({ code: team.code, topicId: selectedTopicId });
    if (response.ok) {
      const freshTeam = { ...team, mysteryQuestion: response.topic, points: response.balance, hasChangedQuestion: true };
      persistTeamLocally(freshTeam);
      setTopicModalOpen(false);
      setNotification(`Challenge topic changed. -${response.cost || topicSwapCost} pts deducted.`);
      setTimeout(() => setNotification(''), 4000);
    } else {
      setNotification(response.error || 'Could not change challenge topic');
    }
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
    <>
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
              { id: 'games', label: 'Games', icon: '🎮' },
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
            {isCurrentLeader ? 'Sign Out' : 'Leave Team'}
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
                          ease: "easeInOut",
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
                            {member.picture ? (
                              <img src={member.picture} alt="Avatar" className="w-8 h-8 rounded-lg border border-primary-container/30 object-cover flex-shrink-0" />
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-primary-container/10 border border-primary-container/20 flex items-center justify-center font-bold text-xs text-primary-container flex-shrink-0">
                                {(member.name || member.email).slice(0, 2).toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0">
                              <h5 className="text-xs font-bold text-on-surface truncate m-0">{member.name || member.email}</h5>
                              <p className="text-[9px] text-on-surface-variant mt-0.5 m-0 font-label-sm font-mono truncate">{member.email}{member.regNo ? ` • ${member.regNo}` : ''}</p>
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
                    const isTopicSwap = item.id === 'change-topic' || item.isSpecialSwap;
                    const priceVal = isTopicSwap ? topicSwapCost : parseInt(item.price);
                    const isOwned = isTopicSwap ? team.hasChangedQuestion : ownedItems.includes(item.title);
                    const canAfford = isCurrentLeader && points >= priceVal;

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
                              {canAfford ? 'Purchase Advantage' : isCurrentLeader ? 'Not Enough Points' : 'Leader Only'}
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

            {/* TAB 4: Games */}
            {activeTab === 'games' && (
              <motion.div
                key="games"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
              >
                <div className="bg-white/[0.02] border border-white/5 p-6 rounded-[24px] mb-6">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-headline-md text-on-surface uppercase tracking-widest mt-0 mb-1.5">Official Games</h3>
                      <p className="text-xs text-on-surface-variant m-0 font-body-md max-w-3xl">
                        Registered team members may complete up to {gameScores?.maxAttempts ?? team.maxGameAttempts ?? 5} distinct official games. Each game counts once per team. Refreshing or leaving resumes the active slot; replay buttons open Practice and never award points.
                      </p>
                    </div>
                    <div className={`px-4 py-3 rounded-xl border font-headline-md uppercase text-xs tracking-widest ${gameScores?.gamesEnabled ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-300'}`}>
                      {gameScores?.gamesEnabled ? 'Game Mode Active' : 'Game Mode Disabled'}
                    </div>
                  </div>
                  <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-background/60 border border-white/5 rounded-xl p-4">
                      <p className="text-[10px] uppercase tracking-widest text-on-surface-variant m-0">Used Plays</p>
                      <b className="text-2xl text-primary-container">{gameScores?.usedAttempts || 0}/{gameScores?.maxAttempts ?? team.maxGameAttempts ?? 5}</b>
                    </div>
                    <div className="bg-background/60 border border-white/5 rounded-xl p-4">
                      <p className="text-[10px] uppercase tracking-widest text-on-surface-variant m-0">Remaining</p>
                      <b className="text-2xl text-green-400">{gameScores?.remainingAttempts ?? 5}</b>
                    </div>
                    <div className="bg-background/60 border border-white/5 rounded-xl p-4">
                      <p className="text-[10px] uppercase tracking-widest text-on-surface-variant m-0">Completed</p>
                      <b className="text-2xl text-on-surface">{gameScores?.completedAttempts || 0}</b>
                    </div>
                  </div>
                </div>

                {gameScores?.activeAttempt && (
                  <div className="mb-6 border border-[#00a8e0]/40 bg-[#00a8e0]/10 rounded-[18px] p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.2em] text-[#00a8e0] font-label-sm m-0">Active official slot</p>
                      <h4 className="text-lg text-on-surface uppercase tracking-widest mt-2 mb-0">{games.find((game) => game.slug === gameScores.activeAttempt.gameSlug)?.title || gameScores.activeAttempt.gameSlug}</h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate(`/mystery-box-hackathon/games/${gameScores.activeAttempt.gameSlug}`)}
                      className="bg-[#00a8e0] text-white px-5 py-3 rounded-xl font-headline-md text-xs uppercase tracking-widest font-bold cursor-pointer"
                    >
                      Resume Game
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {scoredGames.map((game, index) => {
                    const played = playedGameSlugs.has(game.slug);
                    const blocked = !gameScores?.gamesEnabled || ((gameScores?.remainingAttempts || 0) <= 0 && !gameScores?.activeAttempt);
                    return (
                      <article key={game.slug} className={`border rounded-[18px] p-5 flex flex-col min-h-[210px] ${played ? 'border-emerald-500/30 bg-emerald-500/[0.04]' : 'border-primary-container/15 bg-[rgba(255,153,0,0.03)]'}`}>
                        <div className="flex items-start justify-between gap-3">
                          <span className="text-primary-container font-headline-md text-xs">{String(index + 1).padStart(2, '0')}</span>
                          <span className={`text-[9px] uppercase tracking-widest border px-2 py-1 rounded ${played ? 'text-emerald-400 border-emerald-500/30' : 'text-[#00a8e0] border-[#00a8e0]/30'}`}>{played ? 'Official Completed' : game.status}</span>
                        </div>
                        <h4 className="text-base text-on-surface uppercase tracking-wider mt-5 mb-2">{game.title}</h4>
                        <p className="text-xs text-on-surface-variant leading-6 m-0 flex-1">{game.description}</p>
                        <button
                          type="button"
                          disabled={!played && (blocked || Boolean(gameScores?.activeAttempt))}
                          onClick={() => navigate(played ? game.path : `/mystery-box-hackathon/games/${game.slug}`)}
                          className={`mt-5 py-3 rounded-xl text-xs uppercase tracking-widest font-headline-md font-bold border-0 transition-all ${!played && (blocked || gameScores?.activeAttempt) ? 'bg-white/5 text-on-surface-variant/40 cursor-not-allowed' : played ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 cursor-pointer' : 'bg-primary-container text-background hover:bg-primary cursor-pointer'}`}
                        >
                          {played ? 'Play Again — Practice' : gameScores?.activeAttempt ? 'Resume Active Slot First' : blocked ? 'Unavailable' : 'Play Official Game'}
                        </button>
                      </article>
                    );
                  })}
                </div>

                {gameScores?.attempts?.length > 0 && (
                  <div className="mt-6 bg-white/[0.02] border border-white/5 p-5 rounded-[18px]">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant font-label-sm mb-3">Official Play History</p>
                    <div className="space-y-2">
                      {gameScores.attempts.map((attempt) => (
                        <div key={attempt.attemptId} className="flex justify-between gap-3 text-xs border-b border-white/5 pb-2">
                          <span className="text-on-surface-variant">#{attempt.slotNumber} {games.find((game) => game.slug === attempt.gameSlug)?.title || attempt.gameSlug}</span>
                          <span className={`font-bold ${attempt.voidedAt ? 'text-red-300' : 'text-primary-container'}`}>{attempt.voidedAt ? `voided · ${attempt.points || 0} pts reversed` : `${attempt.status} · ${attempt.points || 0} pts`}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        </div>

      </main>
    </div>
    {topicModalOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <div className="w-full max-w-3xl bg-[#111114] border border-[#FF9900]/40 p-6 rounded-2xl shadow-2xl">
          <div className="flex justify-between items-start gap-4 mb-5">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-primary-container font-label-sm m-0">Point Shop Advantage</p>
              <h3 className="text-xl font-headline-md text-on-surface uppercase tracking-widest mt-1 mb-0">Change Challenge Topic</h3>
              <p className="text-xs text-on-surface-variant mt-2 mb-0">Same-difficulty topic swaps cost {topicSwapCost} points and can be used once per team.</p>
            </div>
            <button onClick={() => setTopicModalOpen(false)} className="text-white/60 hover:text-white border-0 bg-transparent cursor-pointer text-lg">✕</button>
          </div>

          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {topics.map((topic) => {
              const currentId = parsedQuestion?.id;
              const sameTier = String(topic.difficulty || '').toLowerCase() === String(parsedQuestion?.difficulty || '').toLowerCase();
              const isCurrent = topic.id === currentId;
              const canSelect = sameTier && !isCurrent && points >= topicSwapCost && !team.hasChangedQuestion;
              const selected = selectedTopicId === topic.id;
              return (
                <button
                  key={topic.id}
                  type="button"
                  disabled={!canSelect}
                  onClick={() => setSelectedTopicId(topic.id)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${selected ? 'bg-primary-container/20 border-primary-container' : canSelect ? 'bg-white/[0.03] border-white/10 hover:border-primary-container cursor-pointer' : 'bg-white/[0.01] border-white/5 opacity-55 cursor-not-allowed'}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-on-surface font-bold">{topic.title}</span>
                    <span className="text-[9px] uppercase tracking-widest text-primary-container border border-primary-container/30 px-2 py-1 rounded">
                      {topic.difficulty} · {topic.points} pts
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-variant leading-5 mt-2 mb-0">{topic.desc}</p>
                  {!canSelect && (
                    <p className="text-[10px] uppercase tracking-widest text-red-300 mt-2 mb-0">
                      {isCurrent ? 'Current topic' : !sameTier ? 'Same difficulty only' : team.hasChangedQuestion ? 'Swap already used' : 'Not enough points'}
                    </p>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex gap-3 mt-6">
            <button type="button" onClick={() => setTopicModalOpen(false)} className="flex-1 bg-white/5 hover:bg-white/10 text-on-surface-variant py-3 rounded-xl text-xs uppercase font-headline-md tracking-widest font-bold cursor-pointer border-0">
              Cancel
            </button>
            <button type="button" disabled={!selectedTopicId} onClick={handleConfirmTopicSwap} className="flex-1 bg-primary-container disabled:bg-white/5 disabled:text-on-surface-variant/40 text-background py-3 rounded-xl text-xs uppercase font-headline-md tracking-widest font-bold cursor-pointer border-0">
              Confirm Swap
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
