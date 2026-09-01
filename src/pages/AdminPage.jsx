import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  adminLogin,
  fetchAdminScores,
  fetchAdminStats,
  fetchQuizStatus,
  updateQuizStatus,
  fetchAdminHackathonTeams,
  fetchAdminHackathonActivity,
  fetchAdminGameMode,
  updateAdminTeamPoints,
  updateAdminGameMode,
  updateAdminTeamGameLimit,
  resetAdminTeamGameAttempt,
  triggerAdminTeamChaos,
  reassignAdminTeamTopic,
  deleteAdminHackathonTeam,
  removeAdminHackathonMember,
} from '../utils/auth';
import { MYSTERY_BOX_QUESTIONS, CHAOS_EVENTS } from './MysteryBoxHackathon/data';

const QUIZ_TYPE_COLOR = {
  quiz:       { bg: 'rgba(255,153,0,0.15)',  border: 'rgba(255,153,0,0.5)',  text: '#FF9900' },
  case_study: { bg: 'rgba(168,85,247,0.15)', border: 'rgba(168,85,247,0.5)', text: '#c084fc' },
};

const ACTIVITY_TYPE_CONFIG = {
  BUFF_PURCHASED:  { icon: '🛒', label: 'Buff Purchased', bg: 'rgba(255,153,0,0.15)', border: 'rgba(255,153,0,0.4)', text: '#FF9900' },
  TOPIC_SWAPPED:   { icon: '🔄', label: 'Topic Swapped',   bg: 'rgba(0,168,224,0.15)',  border: 'rgba(0,168,224,0.4)',  text: '#00a8e0' },
  TOPIC_DECRYPTED: { icon: '🎁', label: 'Box Unveiled',    bg: 'rgba(168,224,99,0.15)', border: 'rgba(168,224,99,0.4)', text: '#a8e063' },
  CHAOS_INJECTED:  { icon: '🌪️', label: 'Chaos Injected', bg: 'rgba(239,68,68,0.15)',  border: 'rgba(239,68,68,0.4)',  text: '#f87171' },
  CHAOS_RESOLVED:  { icon: '✓',  label: 'Chaos Mitigated',bg: 'rgba(52,211,153,0.15)', border: 'rgba(52,211,153,0.4)', text: '#34d399' },
  TEAM_CREATED:    { icon: '👥', label: 'Squad Created',  bg: 'rgba(192,132,252,0.15)',border: 'rgba(192,132,252,0.4)',text: '#c084fc' },
  MEMBER_JOINED:   { icon: '👤', label: 'Member Joined',  bg: 'rgba(129,140,248,0.15)',border: 'rgba(129,140,248,0.4)',text: '#818cf8' },
  POINTS_ADJUSTED: { icon: '⚡', label: 'Points Adjusted',bg: 'rgba(251,191,36,0.15)', border: 'rgba(251,191,36,0.4)', text: '#fbbf24' },
};

function fmt(dateStr) {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ago`;
}

function ScoreBadge({ pct }) {
  const color = pct >= 80 ? '#a8e063' : pct >= 50 ? '#FF9900' : '#f87171';
  const bg    = pct >= 80 ? 'rgba(99,153,34,0.15)' : pct >= 50 ? 'rgba(255,153,0,0.15)' : 'rgba(226,75,74,0.15)';
  return (
    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-sm" style={{ color, background: bg }}>
      {pct}%
    </span>
  );
}

// ── Login Screen ───────────────────────────────────────────────
function AdminLogin({ onLogin }) {
  const [adminId, setAdminId] = useState('');
  const [pwd, setPwd] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!adminId || !pwd) { setErr('Enter both fields.'); return; }
    setLoading(true); setErr('');
    const res = await adminLogin(adminId, pwd);
    setLoading(false);
    if (res.ok) onLogin(res.token);
    else setErr(res.error || 'Invalid credentials');
  }

  return (
    <div className="min-h-screen bg-[#0A0C10] flex items-center justify-center px-4"
      style={{ backgroundImage: 'linear-gradient(to right,rgba(255,255,255,0.04) 1px,transparent 1px),linear-gradient(to bottom,rgba(255,255,255,0.04) 1px,transparent 1px)', backgroundSize: '80px 80px' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1 font-mono text-xs text-[#dbc2ad] uppercase tracking-widest mb-4">
            <span className="w-2 h-2 rounded-full bg-[#FF9900] animate-pulse" />
            Admin Access
          </div>
          <h1 className="font-mono text-3xl font-bold text-white tracking-widest">ADMIN<br /><span className="text-[#FF9900]">PANEL</span></h1>
          <p className="font-mono text-xs text-[#dbc2ad] mt-2">AWS Student Builder Group</p>
        </div>

        <form onSubmit={handleSubmit} className="border border-white/10 bg-white/3 p-6">
          <div className="mb-4">
            <label className="font-mono text-[10px] text-[#dbc2ad] uppercase tracking-widest block mb-2">Admin ID</label>
            <input
              type="text" value={adminId} onChange={e => setAdminId(e.target.value)}
              className="w-full bg-white/5 border border-white/10 px-4 py-3 font-mono text-sm text-white focus:outline-none focus:border-[#FF9900] transition-colors"
              placeholder="aws_admin" autoComplete="off"
            />
          </div>
          <div className="mb-6">
            <label className="font-mono text-[10px] text-[#dbc2ad] uppercase tracking-widest block mb-2">Password</label>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'} value={pwd} onChange={e => setPwd(e.target.value)}
                className="w-full bg-white/5 border border-white/10 px-4 py-3 font-mono text-sm text-white focus:outline-none focus:border-[#FF9900] transition-colors pr-12"
                placeholder="••••••••"
              />
              <button type="button" onClick={() => setShowPwd(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#dbc2ad] hover:text-white cursor-pointer">
                <span className="material-symbols-outlined text-lg">{showPwd ? 'visibility' : 'visibility_off'}</span>
              </button>
            </div>
          </div>
          {err && <div className="mb-4 font-mono text-xs text-[#f87171] bg-red-500/10 border border-red-500/20 px-3 py-2">{err}</div>}
          <button type="submit" disabled={loading}
            className="w-full bg-[#FF9900] text-[#111] font-mono text-sm font-bold py-3 hover:bg-[#ffc082] transition-colors uppercase tracking-widest disabled:opacity-50 cursor-pointer">
            {loading ? 'Authenticating...' : 'Access Dashboard'}
          </button>
        </form>

      </div>
    </div>
  );
}

// ── Dashboard ──────────────────────────────────────────────────
function Dashboard({ token, onLogout }) {
  const [activeTab, setActiveTab] = useState('hackathon'); // 'hackathon' | 'quiz'

  // Quiz state
  const [scores, setScores] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('date'); // date | score | name
  const [viewMode, setViewMode] = useState('attempts'); // 'attempts' | 'leaderboard'
  const [quizStatus, setQuizStatus] = useState('inactive');

  // Hackathon state
  const [hackathonTeams, setHackathonTeams] = useState([]);
  const [hackathonLoading, setHackathonLoading] = useState(true);
  const [hackathonSearch, setHackathonSearch] = useState('');
  const [hackathonFilter, setHackathonFilter] = useState('all');
  const [hackathonSort, setHackathonSort] = useState('points'); // points | newest | name
  const [hackathonSubView, setHackathonSubView] = useState('teams'); // 'teams' | 'activity'

  // Live Activity & Alerts State
  const [activities, setActivities] = useState([]);
  const [liveToast, setLiveToast] = useState(null);
  const [activityFilter, setActivityFilter] = useState('all');

  // Team Inspect Modal (Detailed Information)
  const [inspectTeam, setInspectTeam] = useState(null);

  // In-App Deletion Confirmation Modal State
  const [deleteConfirmTeam, setDeleteConfirmTeam] = useState(null);
  const [terminateQuizModalOpen, setTerminateQuizModalOpen] = useState(false);

  // Hackathon Action Modals
  const [pointsModalTeam, setPointsModalTeam] = useState(null);
  const [pointDeltaInput, setPointDeltaInput] = useState('');
  const [chaosModalTeam, setChaosModalTeam] = useState(null);
  const [selectedChaosEvent, setSelectedChaosEvent] = useState(CHAOS_EVENTS[0]?.title || '');
  const [reassignModalTeam, setReassignModalTeam] = useState(null);
  const [selectedReassignQuestion, setSelectedReassignQuestion] = useState(MYSTERY_BOX_QUESTIONS[0]?.id || '');
  const [resetSwapCheckbox, setResetSwapCheckbox] = useState(false);
  const [gameModeEnabled, setGameModeEnabled] = useState(false);
  const [gameLimitTeam, setGameLimitTeam] = useState(null);
  const [gameLimitInput, setGameLimitInput] = useState('5');
  const [gameResetReason, setGameResetReason] = useState('');

  const [notification, setNotification] = useState('');

  const notify = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 4000);
  };

  const loadQuizData = async () => {
    setLoading(true);
    const [s, st, status] = await Promise.all([
      fetchAdminScores(token), 
      fetchAdminStats(token),
      fetchQuizStatus()
    ]);

    if (s && s.length > 0) {
      const userMap = {};
      s.forEach(r => {
        if (!userMap[r.email]) {
          userMap[r.email] = {
            first_name: r.first_name,
            last_name: r.last_name,
            email: r.email,
            attempts: 0,
            bestScores: {},
          };
        }
        userMap[r.email].attempts += 1;
        
        const currentScore = parseFloat(r.composite_score || r.pct || 0);
        if (!userMap[r.email].bestScores[r.quiz_id] || currentScore > userMap[r.email].bestScores[r.quiz_id]) {
           userMap[r.email].bestScores[r.quiz_id] = currentScore;
        }
      });
      
      const computedLeaderboard = Object.values(userMap).map(u => {
        const total = Object.values(u.bestScores).reduce((sum, val) => sum + val, 0);
        return {
          ...u,
          total_score: parseFloat(total.toFixed(2))
        };
      }).sort((a, b) => b.total_score - a.total_score);
      
      if (st) {
        st.leaderboard = computedLeaderboard;
        st.topScorers = computedLeaderboard.slice(0, 5);
      }
    }

    setScores(s);
    setStats(st);
    setQuizStatus(status);
    setLoading(false);
  };

  const loadHackathonData = async () => {
    const [teams, mode] = await Promise.all([fetchAdminHackathonTeams(token), fetchAdminGameMode(token)]);
    setHackathonTeams(teams);
    if (mode.ok) setGameModeEnabled(mode.enabled);
    setHackathonLoading(false);
  };

  const pollActivities = async () => {
    const actList = await fetchAdminHackathonActivity(token);
    if (actList && actList.length > 0) {
      setActivities(prev => {
        if (prev.length > 0 && actList[0].id !== prev[0].id) {
          // New live activity detected!
          const newEvent = actList[0];
          setLiveToast(newEvent);
          setTimeout(() => setLiveToast(null), 6000);
          loadHackathonData(); // Auto-refresh team stats
        }
        return actList;
      });
    }
  };

  const loadAll = () => {
    loadQuizData();
    loadHackathonData();
    pollActivities();
  };

  useEffect(() => {
    loadAll();
    // Real-time live polling for activity logs and team updates every 2.5 seconds
    const interval = setInterval(() => {
      pollActivities();
    }, 2500);
    return () => clearInterval(interval);
  }, [token]);

  // Quiz Handlers
  const handleStatusChange = async (action) => {
    if (action === 'terminate') {
      setTerminateQuizModalOpen(true);
      return;
    }
    const res = await updateQuizStatus(token, action);
    if (res.ok) setQuizStatus(res.status);
    else notify('Failed to change status: ' + res.error);
  };

  const confirmTerminateQuiz = async () => {
    setTerminateQuizModalOpen(false);
    const res = await updateQuizStatus(token, 'terminate');
    if (res.ok) {
      setQuizStatus('inactive');
      notify('Global Quiz Terminated & Locked.');
    } else {
      notify('Failed to terminate quiz: ' + res.error);
    }
  };

  // Hackathon Handlers
  const handlePointsSubmit = async (delta) => {
    if (!pointsModalTeam) return;
    const val = delta !== undefined ? delta : parseInt(pointDeltaInput);
    if (isNaN(val)) {
      notify('Please enter a valid numeric points value.');
      return;
    }
    const res = await updateAdminTeamPoints(token, { code: pointsModalTeam.code, delta: val });
    if (res.ok) {
      notify(`Adjusted points for ${pointsModalTeam.teamName} (${val >= 0 ? '+' : ''}${val} pts)`);
      setPointsModalTeam(null);
      setPointDeltaInput('');
      loadHackathonData();
      pollActivities();
    } else {
      notify(res.error || 'Failed to update points');
    }
  };

  const handleTriggerChaos = async (isAll = false, resolve = false) => {
    const eventObj = CHAOS_EVENTS.find(e => e.title === selectedChaosEvent) || CHAOS_EVENTS[0];
    const targetCode = isAll ? null : chaosModalTeam?.code;

    const res = await triggerAdminTeamChaos(token, {
      code: targetCode,
      isAll,
      chaosEvent: eventObj,
      resolve,
      isOpened: true
    });

    if (res.ok) {
      notify(resolve ? 'Chaos Event marked as resolved!' : (isAll ? 'Chaos Event injected globally for all teams!' : `Chaos injected for team ${chaosModalTeam?.teamName}!`));
      setChaosModalTeam(null);
      loadHackathonData();
      pollActivities();
    } else {
      notify(res.error || 'Failed to trigger chaos event');
    }
  };

  const handleReassignTopic = async () => {
    if (!reassignModalTeam) return;
    const qObj = MYSTERY_BOX_QUESTIONS.find(q => q.id === selectedReassignQuestion) || MYSTERY_BOX_QUESTIONS[0];
    const res = await reassignAdminTeamTopic(token, {
      code: reassignModalTeam.code,
      mysteryQuestion: qObj,
      resetSwapUsed: resetSwapCheckbox
    });

    if (res.ok) {
      notify(`Reassigned topic for ${reassignModalTeam.teamName} to "${qObj.title}" [${qObj.difficulty}]`);
      setReassignModalTeam(null);
      setResetSwapCheckbox(false);
      loadHackathonData();
      pollActivities();
    } else {
      notify(res.error || 'Failed to reassign topic');
    }
  };

  const handleGameModeToggle = async () => {
    const res = await updateAdminGameMode(token, !gameModeEnabled);
    if (res.ok) {
      setGameModeEnabled(res.enabled);
      notify(`Official game mode ${res.enabled ? 'enabled' : 'disabled'}.`);
    } else {
      notify(res.error || 'Failed to update game mode');
    }
  };

  const handleGameLimitSubmit = async () => {
    if (!gameLimitTeam) return;
    const maxAttempts = parseInt(gameLimitInput, 10);
    if (!Number.isInteger(maxAttempts) || maxAttempts < 0 || maxAttempts > 12) {
      notify('Enter a game limit from 0 to 12.');
      return;
    }
    const res = await updateAdminTeamGameLimit(token, { code: gameLimitTeam.code, maxAttempts });
    if (res.ok) {
      notify(`Updated ${gameLimitTeam.teamName} game limit to ${res.maxAttempts}.`);
      setGameLimitTeam(null);
      loadHackathonData();
    } else {
      notify(res.error || 'Failed to update game limit');
    }
  };

  const handleGameAttemptReset = async (attempt) => {
    if (!gameLimitTeam || !attempt || attempt.voidedAt) return;
    const reason = gameResetReason.trim();
    if (reason.length < 5) {
      notify('Enter an audit reason of at least 5 characters.');
      return;
    }
    const res = await resetAdminTeamGameAttempt(token, {
      code: gameLimitTeam.code,
      gameSlug: attempt.gameSlug,
      reason,
    });
    if (res.ok) {
      notify(`Voided ${attempt.gameSlug}; ${res.reversedPoints || 0} points reversed.`);
      setGameResetReason('');
      setGameLimitTeam(null);
      loadHackathonData();
      pollActivities();
    } else {
      notify(res.error || 'Failed to reset official game attempt');
    }
  };

  const handleRemoveMember = async (team, member) => {
    if (!team?.code || !member?.email || member.isLeader) return;
    const res = await removeAdminHackathonMember(token, { code: team.code, email: member.email });
    if (res.ok) {
      notify(`Removed ${member.email} from ${team.teamName}.`);
      setInspectTeam(res.team);
      loadHackathonData();
      pollActivities();
    } else {
      notify(res.error || 'Failed to remove member');
    }
  };

  // In-app deletion handler (no browser popup)
  const executeDeleteTeam = async () => {
    if (!deleteConfirmTeam) return;
    const teamToDelete = deleteConfirmTeam;
    const res = await deleteAdminHackathonTeam(token, teamToDelete.code);
    if (res.ok) {
      notify(`Squad "${teamToDelete.teamName}" (#${teamToDelete.code}) was permanently deleted.`);
      if (inspectTeam?.code === teamToDelete.code) setInspectTeam(null);
      setDeleteConfirmTeam(null);
      loadHackathonData();
      pollActivities();
    } else {
      notify(res.error || 'Failed to delete team');
    }
  };

  const exportHackathonCsv = () => {
    if (!hackathonTeams || hackathonTeams.length === 0) {
      alert('No hackathon teams to export.');
      return;
    }
    const headers = ['Team Code', 'Team Name', 'Points', 'Difficulty', 'Question Title', 'Topic Changed', 'Chaos Active', 'Members Count', 'Leader Email', 'All Members', 'Registered Date'];
    const rows = hackathonTeams.map(t => {
      const q = typeof t.mysteryQuestion === 'object' ? t.mysteryQuestion : {};
      const leader = (t.members || []).find(m => m.isLeader)?.email || '';
      const allEmails = (t.members || []).map(m => m.email).join('; ');
      return [
        `"${t.code}"`,
        `"${(t.teamName || '').replace(/"/g, '""')}"`,
        t.points || 0,
        `"${q.difficulty || 'Easy'}"`,
        `"${(q.title || 'Sealed').replace(/"/g, '""')}"`,
        t.hasChangedQuestion ? 'YES' : 'NO',
        t.isChaosOpened ? (t.isChaosResolved ? 'RESOLVED' : 'ACTIVE') : 'NO',
        (t.members || []).length,
        `"${leader}"`,
        `"${allEmails}"`,
        `"${fmt(t.registeredAt)}"`
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Mystery_Box_Hackathon_Teams_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Hackathon filtered & sorted teams
  const filteredHackathonTeams = hackathonTeams
    .filter(t => {
      const q = hackathonSearch.toLowerCase();
      const matchSearch = !q ||
        t.code.toLowerCase().includes(q) ||
        (t.teamName || '').toLowerCase().includes(q) ||
        (t.members || []).some(m => (m.email || '').toLowerCase().includes(q) || (m.name || '').toLowerCase().includes(q));

      const parsedQ = typeof t.mysteryQuestion === 'object' ? t.mysteryQuestion : {};
      const diff = (parsedQ.difficulty || 'easy').toLowerCase();

      if (hackathonFilter === 'easy') return matchSearch && diff === 'easy';
      if (hackathonFilter === 'medium') return matchSearch && diff === 'medium';
      if (hackathonFilter === 'hard') return matchSearch && diff === 'hard';
      if (hackathonFilter === 'chaos') return matchSearch && t.isChaosOpened && !t.isChaosResolved;
      if (hackathonFilter === 'swapped') return matchSearch && t.hasChangedQuestion;
      if (hackathonFilter === 'opened') return matchSearch && t.isOpened;

      return matchSearch;
    })
    .sort((a, b) => {
      if (hackathonSort === 'points') return (b.points || 0) - (a.points || 0);
      if (hackathonSort === 'newest') return (b.registeredAt || 0) - (a.registeredAt || 0);
      if (hackathonSort === 'name') return (a.teamName || '').localeCompare(b.teamName || '');
      return 0;
    });

  // Filtered Activities
  const filteredActivities = activities.filter(act => {
    if (activityFilter === 'all') return true;
    return act.eventType === activityFilter;
  });

  // Hackathon Stats
  const totalHackathonParticipants = hackathonTeams.reduce((sum, t) => sum + (t.members || []).length, 0);
  const totalDecryptedCount = hackathonTeams.filter(t => t.isOpened).length;
  const totalChaosCount = hackathonTeams.filter(t => t.isChaosOpened && !t.isChaosResolved).length;
  const avgTeamPoints = hackathonTeams.length ? Math.round(hackathonTeams.reduce((sum, t) => sum + (t.points || 0), 0) / hackathonTeams.length) : 0;

  // Quiz filters
  const filteredScores = scores
    .filter(r => {
      const q = search.toLowerCase();
      const matchSearch = !q || r.email.toLowerCase().includes(q) ||
        `${r.first_name} ${r.last_name}`.toLowerCase().includes(q) ||
        (r.quiz_title || '').toLowerCase().includes(q);
      const matchType = filterType === 'all' || r.quiz_type === filterType;
      return matchSearch && matchType;
    })
    .sort((a, b) => {
      if (sortBy === 'score') {
        const compB = parseFloat(b.composite_score || b.pct || 0);
        const compA = parseFloat(a.composite_score || a.pct || 0);
        if (compB !== compA) return compB - compA;
        return (a.time_taken || 0) - (b.time_taken || 0);
      }
      if (sortBy === 'name') return `${a.first_name}`.localeCompare(`${b.first_name}`);
      return new Date(b.attempted_at) - new Date(a.attempted_at);
    });

  const filteredLeaderboard = (stats?.leaderboard || [])
    .filter(r => {
      const q = search.toLowerCase();
      return !q || r.email.toLowerCase().includes(q) || `${r.first_name} ${r.last_name}`.toLowerCase().includes(q);
    });

  return (
    <div className="min-h-screen bg-[#0A0C10] text-[#f1dfd1]"
      style={{ backgroundImage: 'linear-gradient(to right,rgba(255,255,255,0.04) 1px,transparent 1px),linear-gradient(to bottom,rgba(255,255,255,0.04) 1px,transparent 1px)', backgroundSize: '80px 80px' }}>

      {/* Top Floating Real-time Event Toast Notification */}
      {liveToast && (
        <div className="fixed top-20 right-6 z-50 max-w-sm w-full bg-[#12141a] border border-[#FF9900] p-4 rounded-xl shadow-[0_0_30px_rgba(255,153,0,0.35)] animate-bounce font-mono">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">⚡</span>
              <div>
                <div className="text-[10px] text-[#FF9900] font-bold uppercase tracking-widest flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#FF9900] animate-ping" />
                  LIVE EVENT ALERT
                </div>
                <div className="text-xs font-bold text-white mt-0.5">{liveToast.teamName} (#{liveToast.teamCode})</div>
              </div>
            </div>
            <button onClick={() => setLiveToast(null)} className="text-white/40 hover:text-white border-0 bg-transparent cursor-pointer text-xs">✕</button>
          </div>
          <div className="mt-2 text-xs text-white/90 leading-snug bg-white/5 p-2 rounded border border-white/10">
            {liveToast.message}
          </div>
        </div>
      )}

      {/* Standard Toast Notification */}
      {notification && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-[#FF9900] text-[#111] font-mono text-xs uppercase tracking-wider px-6 py-3 shadow-[0_0_30px_rgba(255,153,0,0.5)] font-bold flex items-center gap-2 border border-white/20">
          <span>⚡</span> {notification}
        </div>
      )}

      {/* Navbar */}
      <nav className="sticky top-0 z-20 flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#0A0C10]/95 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs bg-[#FF9900] text-[#111] px-2 py-0.5 font-bold uppercase tracking-widest">ADMIN</span>
          <span className="font-mono text-sm text-[#dbc2ad] uppercase tracking-widest hidden sm:inline">AWS Operations Command</span>
        </div>

        {/* Section Switch Tabs */}
        <div className="flex bg-white/5 border border-white/10 p-1 rounded">
          <button
            onClick={() => setActiveTab('hackathon')}
            className={`font-mono text-xs px-3.5 py-1.5 uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'hackathon'
                ? 'bg-[#FF9900] text-[#111] font-bold shadow-[0_0_15px_rgba(255,153,0,0.3)]'
                : 'text-[#dbc2ad] hover:text-white'
            }`}
          >
            🎁 Mystery Box Hackathon ({hackathonTeams.length})
          </button>
          <button
            onClick={() => setActiveTab('quiz')}
            className={`font-mono text-xs px-3.5 py-1.5 uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'quiz'
                ? 'bg-[#FF9900] text-[#111] font-bold shadow-[0_0_15px_rgba(255,153,0,0.3)]'
                : 'text-[#dbc2ad] hover:text-white'
            }`}
          >
            📊 Quizzes &amp; Tests
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={loadAll} title="Refresh All Data"
            className="font-mono text-xs text-[#dbc2ad] border border-white/10 px-3 py-2 hover:border-[#00a8e0]/50 hover:text-[#00a8e0] transition-all flex items-center justify-center cursor-pointer">
            <span className="material-symbols-outlined text-sm">refresh</span>
          </button>
          <button onClick={onLogout}
            className="font-mono text-xs text-[#dbc2ad] border border-white/10 px-4 py-2 hover:border-[#FF9900]/50 hover:text-[#FF9900] transition-all uppercase tracking-widest flex items-center gap-2 cursor-pointer">
            <span className="material-symbols-outlined text-sm">logout</span> <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

        {/* ═══════════════════════════════════════════════════════════
            TAB 1: MYSTERY BOX HACKATHON OPERATIONS
           ═══════════════════════════════════════════════════════════ */}
        {activeTab === 'hackathon' && (
          <div>
            {/* Action Bar */}
            <div className="mb-8 border border-[#FF9900]/30 bg-gradient-to-r from-[#FF9900]/10 via-white/5 to-transparent p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="font-mono text-xs text-[#FF9900] uppercase tracking-widest mb-1 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#FF9900] animate-ping" />
                  Live Event Operations &amp; Real-time Audit
                </div>
                <h2 className="font-mono text-2xl font-bold text-white uppercase tracking-wider m-0">
                  Mystery Box Hackathon Hub
                </h2>
                <p className="font-mono text-xs text-[#dbc2ad] mt-1 mb-0">Live team telemetry, topic swaps, vendor shop purchases, and chaos injection controls.</p>
              </div>

              <div className="flex items-center gap-3 flex-wrap w-full md:w-auto">
                <button
                  type="button"
                  onClick={handleGameModeToggle}
                  className={`${gameModeEnabled ? 'bg-green-500/20 border-green-500/50 text-green-300 hover:bg-green-500' : 'bg-red-500/20 border-red-500/50 text-red-300 hover:bg-red-500'} hover:text-white font-mono text-xs font-bold uppercase tracking-wider px-4 py-2.5 transition-all cursor-pointer flex items-center gap-2`}
                >
                  <span>🎮</span> {gameModeEnabled ? 'Disable Game Mode' : 'Enable Game Mode'}
                </button>
                <button
                  type="button"
                  onClick={() => handleTriggerChaos(true, false)}
                  className="bg-red-500/20 border border-red-500/50 hover:bg-red-500 hover:text-white text-red-300 font-mono text-xs font-bold uppercase tracking-wider px-4 py-2.5 transition-all cursor-pointer flex items-center gap-2"
                >
                  <span>🌪️</span> Trigger Chaos (All Teams)
                </button>
                <button
                  type="button"
                  onClick={exportHackathonCsv}
                  className="bg-white/5 border border-white/10 hover:border-[#a8e063] hover:text-[#a8e063] text-white font-mono text-xs font-bold uppercase tracking-wider px-4 py-2.5 transition-all cursor-pointer flex items-center gap-2"
                >
                  <span>📥</span> Export Teams CSV
                </button>
              </div>
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
              {[
                { label: 'Registered Squads', val: hackathonTeams.length, icon: 'groups', color: '#FF9900' },
                { label: 'Total Hackers', val: totalHackathonParticipants, icon: 'badge', color: '#00a8e0' },
                { label: 'Topics Unveiled', val: `${totalDecryptedCount}/${hackathonTeams.length}`, icon: 'lock_open', color: '#a8e063' },
                { label: 'Chaos Injected', val: totalChaosCount, icon: 'warning', color: '#f87171' },
                { label: 'Avg Squad Points', val: `${avgTeamPoints} pts`, icon: 'stars', color: '#c084fc' },
              ].map((s) => (
                <div key={s.label} className="border border-white/10 bg-white/3 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-base" style={{ color: s.color }}>{s.icon}</span>
                    <span className="font-mono text-[10px] text-[#dbc2ad] uppercase tracking-widest truncate">{s.label}</span>
                  </div>
                  <div className="font-mono text-2xl font-bold" style={{ color: s.color }}>{s.val}</div>
                </div>
              ))}
            </div>

            {/* Sub-view Switch: Teams Directory vs Live Activity Feed */}
            <div className="flex items-center justify-between gap-4 mb-6 border-b border-white/10 pb-4">
              <div className="flex bg-white/5 border border-white/10 p-1 rounded">
                <button
                  type="button"
                  onClick={() => setHackathonSubView('teams')}
                  className={`font-mono text-xs px-4 py-2 uppercase tracking-wider cursor-pointer transition-all ${
                    hackathonSubView === 'teams'
                      ? 'bg-[#FF9900] text-[#111] font-bold shadow'
                      : 'text-[#dbc2ad] hover:text-white'
                  }`}
                >
                  📋 Squads Directory ({filteredHackathonTeams.length})
                </button>
                <button
                  type="button"
                  onClick={() => setHackathonSubView('activity')}
                  className={`font-mono text-xs px-4 py-2 uppercase tracking-wider cursor-pointer transition-all flex items-center gap-2 ${
                    hackathonSubView === 'activity'
                      ? 'bg-[#FF9900] text-[#111] font-bold shadow'
                      : 'text-[#dbc2ad] hover:text-white'
                  }`}
                >
                  <span>⚡ Live Activity Stream</span>
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-ping" />
                </button>
              </div>

              {hackathonSubView === 'activity' && (
                <div className="flex items-center gap-2 font-mono text-xs text-[#dbc2ad]">
                  <span>Filter Stream:</span>
                  <select
                    value={activityFilter}
                    onChange={e => setActivityFilter(e.target.value)}
                    className="bg-white/5 border border-white/10 px-3 py-1.5 font-mono text-xs text-[#dbc2ad] focus:outline-none focus:border-[#FF9900]"
                  >
                    <option value="all">All Events</option>
                    <option value="BUFF_PURCHASED">Buffs / Purchases</option>
                    <option value="TOPIC_SWAPPED">Topic Swaps</option>
                    <option value="TOPIC_DECRYPTED">Decryptions</option>
                    <option value="CHAOS_RESOLVED">Chaos Mitigations</option>
                    <option value="TEAM_CREATED">Team Registrations</option>
                    <option value="MEMBER_JOINED">Member Joins</option>
                  </select>
                </div>
              )}
            </div>

            {/* ── SUB-VIEW 1: TEAMS DIRECTORY ── */}
            {hackathonSubView === 'teams' && (
              <div>
                {/* Filter & Search Controls */}
                <div className="flex flex-col md:flex-row gap-3 mb-6">
                  <input
                    type="text"
                    value={hackathonSearch}
                    onChange={e => setHackathonSearch(e.target.value)}
                    placeholder="Search by Team Name, Code (e.g. AB12CD), or Member Email..."
                    className="flex-1 bg-white/5 border border-white/10 px-4 py-2.5 font-mono text-sm text-white focus:outline-none focus:border-[#FF9900] transition-colors placeholder-white/30"
                  />
                  <select
                    value={hackathonFilter}
                    onChange={e => setHackathonFilter(e.target.value)}
                    className="bg-white/5 border border-white/10 px-3 py-2.5 font-mono text-xs text-[#dbc2ad] focus:outline-none focus:border-[#FF9900]"
                  >
                    <option value="all">All Tiers / Categories</option>
                    <option value="easy">Easy Tier (100 pts)</option>
                    <option value="medium">Medium Tier (140 pts)</option>
                    <option value="hard">Hard Tier (180 pts)</option>
                    <option value="opened">Decrypted Topics Only</option>
                    <option value="chaos">Active Chaos Only</option>
                    <option value="swapped">Topic Swapped (1x Used)</option>
                  </select>
                  <select
                    value={hackathonSort}
                    onChange={e => setHackathonSort(e.target.value)}
                    className="bg-white/5 border border-white/10 px-3 py-2.5 font-mono text-xs text-[#dbc2ad] focus:outline-none focus:border-[#FF9900]"
                  >
                    <option value="points">Sort: Score ↓</option>
                    <option value="newest">Sort: Newest Teams</option>
                    <option value="name">Sort: Team Name A–Z</option>
                  </select>
                </div>

                {/* Teams Table */}
                {hackathonLoading ? (
                  <div className="text-center py-20 font-mono text-[#dbc2ad]">Loading hackathon squads...</div>
                ) : filteredHackathonTeams.length === 0 ? (
                  <div className="text-center py-20 font-mono text-[#dbc2ad] border border-white/10 bg-white/3">
                    No teams matching criteria found.
                  </div>
                ) : (
                  <div className="border border-white/10 overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-white/5 border-b border-white/10 font-mono text-[10px] text-[#dbc2ad] uppercase tracking-widest">
                          <th className="py-3.5 px-4">Squad / Code</th>
                          <th className="py-3.5 px-4">Roster (Leader / Members)</th>
                          <th className="py-3.5 px-4">Active Problem Statement</th>
                          <th className="py-3.5 px-4 text-center">Score / Buffs</th>
                          <th className="py-3.5 px-4 text-center">Chaos Mode</th>
                          <th className="py-3.5 px-4 text-right">Admin Operations</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 font-mono text-xs">
                        {filteredHackathonTeams.map((t) => {
                          const q = typeof t.mysteryQuestion === 'object' && t.mysteryQuestion ? t.mysteryQuestion : null;
                          const leader = (t.members || []).find(m => m.isLeader);
                          const isHard = q?.difficulty?.toLowerCase() === 'hard';
                          const isMed = q?.difficulty?.toLowerCase() === 'medium';
                          const tierColor = isHard ? '#c084fc' : (isMed ? '#FF9900' : '#a8e063');

                          return (
                            <tr key={t.code} className="hover:bg-white/3 transition-colors">
                              {/* Team Name & Code */}
                              <td className="py-3.5 px-4 align-top">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-white text-sm">{t.teamName}</span>
                                </div>
                                <div className="mt-1 flex items-center gap-2">
                                  <span className="bg-[#FF9900]/15 text-[#FF9900] border border-[#FF9900]/30 px-2 py-0.5 rounded font-mono font-bold tracking-widest text-[11px]">
                                    #{t.code}
                                  </span>
                                  <span className="text-[10px] text-[#dbc2ad]">{fmt(t.registeredAt)}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setInspectTeam(t)}
                                  className="mt-2 text-[10px] text-[#00a8e0] hover:underline flex items-center gap-1 cursor-pointer bg-transparent border-0 p-0"
                                >
                                  🔍 View Full Squad Dossier
                                </button>
                              </td>

                              {/* Roster */}
                              <td className="py-3.5 px-4 align-top max-w-[220px]">
                                <div className="font-bold text-white flex items-center gap-1 truncate">
                                  <span className="text-[10px] bg-primary-container/20 text-primary-container px-1.5 rounded uppercase">Leader</span>
                                  <span className="truncate">{leader?.name || leader?.email || 'N/A'}</span>
                                </div>
                                <div className="text-[10px] text-[#dbc2ad] mt-1">
                                  {(t.members || []).length} Members registered:
                                  <div className="truncate text-white/60">
                                    {(t.members || []).map(m => m.name || m.email.split('@')[0]).join(', ')}
                                  </div>
                                </div>
                              </td>

                              {/* Problem Statement */}
                              <td className="py-3.5 px-4 align-top max-w-[280px]">
                                {t.isOpened ? (
                                  <div>
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                      <span
                                        className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider"
                                        style={{
                                          background: `${tierColor}20`,
                                          color: tierColor,
                                          border: `1px solid ${tierColor}40`
                                        }}
                                      >
                                        {q?.difficulty || 'Easy'} Tier ({q?.points || 100} pts)
                                      </span>
                                      {t.hasChangedQuestion && (
                                        <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] rounded uppercase font-bold">
                                          Swapped (1x)
                                        </span>
                                      )}
                                    </div>
                                    <div className="font-bold text-white truncate text-sm">{q?.title || 'Unknown Topic'}</div>
                                    <div className="text-[11px] text-[#dbc2ad] line-clamp-2 mt-0.5 leading-snug">{q?.desc}</div>
                                  </div>
                                ) : (
                                  <div className="text-on-surface-variant/60 flex items-center gap-1.5 italic">
                                    <span>🔒</span> Sealed Mystery Box (Not Opened Yet)
                                  </div>
                                )}
                              </td>

                              {/* Points */}
                              <td className="py-3.5 px-4 align-top text-center">
                                <div className="text-lg font-bold text-[#a8e063]">{t.points || 0} pts</div>
                                <div className="text-[9px] text-[#00a8e0] mt-1">
                                  Games: {(t.gameAttempts || []).filter((attempt) => !attempt.voidedAt).length}/{t.maxGameAttempts ?? 5}
                                </div>
                                {t.ownedItems && t.ownedItems.length > 0 && (
                                  <div className="text-[9px] text-[#FF9900] mt-1 truncate max-w-[140px] mx-auto" title={t.ownedItems.join(', ')}>
                                    Buffs: {t.ownedItems.join(', ')}
                                  </div>
                                )}
                              </td>

                              {/* Chaos Status */}
                              <td className="py-3.5 px-4 align-top text-center">
                                {t.isChaosOpened ? (
                                  t.isChaosResolved ? (
                                    <span className="px-2 py-1 bg-green-500/10 border border-green-500/30 text-green-400 font-bold rounded text-[10px] uppercase">
                                      ✓ Mitigated
                                    </span>
                                  ) : (
                                    <div>
                                      <span className="px-2 py-1 bg-red-500/20 border border-red-500/40 text-red-400 font-bold rounded text-[10px] uppercase animate-pulse">
                                        🌪️ Injected
                                      </span>
                                      <div className="text-[10px] text-red-300 mt-1 truncate max-w-[120px]">
                                        {t.chaosEvent?.title || 'Chaos Active'}
                                      </div>
                                    </div>
                                  )
                                ) : (
                                  <span className="text-[10px] text-[#dbc2ad]/50 uppercase">Standby</span>
                                )}
                              </td>

                              {/* Action Buttons */}
                              <td className="py-3.5 px-4 align-top text-right space-x-1 whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPointsModalTeam(t);
                                    setPointDeltaInput('');
                                  }}
                                  title="Inject / Deduct Points"
                                  className="px-2.5 py-1.5 bg-white/5 hover:bg-[#FF9900] hover:text-[#111] border border-white/10 text-white font-mono text-[11px] font-bold uppercase transition-all cursor-pointer rounded"
                                >
                                  ⚡ Points
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setChaosModalTeam(t);
                                    setSelectedChaosEvent(CHAOS_EVENTS[0]?.title || '');
                                  }}
                                  title="Chaos Event Controls"
                                  className="px-2.5 py-1.5 bg-white/5 hover:bg-red-500 hover:text-white border border-white/10 text-red-300 font-mono text-[11px] font-bold uppercase transition-all cursor-pointer rounded"
                                >
                                  🌪️ Chaos
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReassignModalTeam(t);
                                    setSelectedReassignQuestion(MYSTERY_BOX_QUESTIONS[0]?.id || '');
                                    setResetSwapCheckbox(false);
                                  }}
                                  title="Reassign Problem Topic"
                                  className="px-2.5 py-1.5 bg-white/5 hover:bg-[#00a8e0] hover:text-white border border-white/10 text-[#00a8e0] font-mono text-[11px] font-bold uppercase transition-all cursor-pointer rounded"
                                >
                                  🔄 Reassign
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setGameLimitTeam(t);
                                    setGameLimitInput(String(t.maxGameAttempts ?? 5));
                                  }}
                                  title="Set Official Game Limit"
                                  className="px-2.5 py-1.5 bg-white/5 hover:bg-[#a8e063] hover:text-[#111] border border-white/10 text-[#a8e063] font-mono text-[11px] font-bold uppercase transition-all cursor-pointer rounded"
                                >
                                  🎮 Games
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirmTeam(t)}
                                  title="Delete / Disband Team"
                                  className="px-2 py-1.5 bg-red-950/30 hover:bg-red-600 hover:text-white border border-red-500/30 text-red-400 font-mono text-[11px] transition-all cursor-pointer rounded"
                                >
                                  🗑️
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ── SUB-VIEW 2: LIVE ACTIVITY FEED ── */}
            {hackathonSubView === 'activity' && (
              <div className="border border-white/10 bg-white/2 p-6 rounded-xl font-mono">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-ping" />
                    <span className="text-sm font-bold text-white uppercase tracking-wider">Live Audit Trail</span>
                  </div>
                  <span className="text-xs text-[#dbc2ad]">Showing last {filteredActivities.length} events</span>
                </div>

                {filteredActivities.length === 0 ? (
                  <div className="text-center py-16 text-[#dbc2ad]">No activity events recorded yet.</div>
                ) : (
                  <div className="space-y-3 max-h-[650px] overflow-y-auto pr-2">
                    {filteredActivities.map((act) => {
                      const cfg = ACTIVITY_TYPE_CONFIG[act.eventType] || {
                        icon: '⚡', label: act.eventType, bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.2)', text: '#fff'
                      };

                      return (
                        <div
                          key={act.id}
                          className="p-4 rounded-lg border bg-white/[0.02] hover:bg-white/[0.04] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                          style={{ borderColor: cfg.border }}
                        >
                          <div className="flex items-start gap-3">
                            <span className="text-2xl">{cfg.icon}</span>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span
                                  className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
                                  style={{ background: cfg.bg, color: cfg.text, border: `1px solid ${cfg.border}` }}
                                >
                                  {cfg.label}
                                </span>
                                <span className="text-xs font-bold text-white">{act.teamName}</span>
                                <span className="text-[10px] bg-white/10 text-[#FF9900] px-1.5 py-0.2 rounded">#{act.teamCode}</span>
                              </div>
                              <div className="text-xs text-white/90 mt-1 leading-relaxed">{act.message}</div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="text-[11px] text-[#dbc2ad]">{timeAgo(act.createdAt)}</div>
                            <div className="text-[9px] text-white/40">{fmt(act.createdAt)}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            TAB 2: QUIZZES & ASSESSMENTS ADMIN (EXISTING)
           ═══════════════════════════════════════════════════════════ */}
        {activeTab === 'quiz' && (
          <div>
            {/* Global Quiz Controls */}
            <div className="mb-8 border border-white/10 bg-white/3 p-5 flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <div className="font-mono text-xs text-[#dbc2ad] uppercase tracking-widest mb-1">Global Quiz Status</div>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${quizStatus === 'active' ? 'bg-[#a8e063] animate-pulse' : 'bg-[#E24B4A]'}`} />
                  <span className={`font-mono text-lg font-bold uppercase ${quizStatus === 'active' ? 'text-[#a8e063]' : 'text-[#E24B4A]'}`}>
                    {quizStatus === 'active' ? 'LIVE (Accepting)' : 'ON HOLD BY AWS (Blocked)'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3 w-full md:w-auto">
                <button
                  onClick={() => handleStatusChange('initiate')}
                  disabled={quizStatus === 'active'}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-[#a8e063]/10 text-[#a8e063] border border-[#a8e063]/30 px-6 py-3 font-mono text-xs font-bold uppercase tracking-widest hover:bg-[#a8e063]/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer">
                  <span className="material-symbols-outlined text-sm">play_arrow</span>
                  Initiate Quiz
                </button>
                <button
                  onClick={() => handleStatusChange('terminate')}
                  disabled={quizStatus === 'inactive'}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-[#E24B4A]/10 text-[#E24B4A] border border-[#E24B4A]/30 px-6 py-3 font-mono text-xs font-bold uppercase tracking-widest hover:bg-[#E24B4A]/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer">
                  <span className="material-symbols-outlined text-sm">stop</span>
                  Terminate Quiz
                </button>
              </div>
            </div>

            {/* Stats row */}
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                {[
                  { label: 'Students Tested', val: stats.totalStudents, icon: 'group', color: '#FF9900' },
                  { label: 'Total Attempts', val: stats.totalAttempts, icon: 'quiz', color: '#00a8e0' },
                  { label: 'Avg Score', val: `${stats.avgScore}%`, icon: 'trending_up', color: '#a8e063' },
                  { label: 'Quiz Types', val: '3 + CS', icon: 'layers', color: '#c084fc' },
                ].map(s => (
                  <div key={s.label} className="border border-white/10 bg-white/3 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="material-symbols-outlined text-base" style={{ color: s.color }}>{s.icon}</span>
                      <span className="font-mono text-[10px] text-[#dbc2ad] uppercase tracking-widest">{s.label}</span>
                    </div>
                    <div className="font-mono text-3xl font-bold" style={{ color: s.color }}>{s.val}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Top scorers */}
            {stats?.topScorers?.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center gap-4 mb-4">
                  <span className="font-mono text-[10px] text-[#dbc2ad] uppercase tracking-[0.15em]">🏆 Top Scorers</span>
                  <div className="flex-1 h-px bg-white/8" />
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {stats.topScorers.map((s, i) => (
                    <div key={s.email} className="flex-shrink-0 border border-white/10 bg-white/3 p-3 min-w-[160px]">
                      <div className="font-mono text-[10px] text-[#FF9900] mb-1">#{i + 1}</div>
                      <div className="font-mono text-sm text-white font-bold truncate">{s.first_name} {s.last_name}</div>
                      <div className="font-mono text-[10px] text-[#dbc2ad] truncate mb-2">{s.email}</div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] text-[#dbc2ad]">{s.attempts} attempts</span>
                        <span className="font-mono text-sm font-bold text-[#FF9900]">{s.total_score} pts</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-3 mb-6">
              <div className="flex bg-white/5 border border-white/10 p-1 shrink-0">
                <button
                  onClick={() => setViewMode('attempts')}
                  className={`font-mono text-xs px-4 py-2 uppercase tracking-widest transition-colors cursor-pointer ${viewMode === 'attempts' ? 'bg-[#FF9900] text-[#111] font-bold' : 'text-[#dbc2ad] hover:text-white'}`}
                >
                  All Attempts
                </button>
                <button
                  onClick={() => setViewMode('leaderboard')}
                  className={`font-mono text-xs px-4 py-2 uppercase tracking-widest transition-colors cursor-pointer ${viewMode === 'leaderboard' ? 'bg-[#FF9900] text-[#111] font-bold' : 'text-[#dbc2ad] hover:text-white'}`}
                >
                  Leaderboard
                </button>
              </div>
              <input
                type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by name or email..."
                className="flex-1 bg-white/5 border border-white/10 px-4 py-2.5 font-mono text-sm text-white focus:outline-none focus:border-[#FF9900] transition-colors placeholder-white/30"
              />
              <select value={filterType} onChange={e => setFilterType(e.target.value)}
                className="bg-white/5 border border-white/10 px-3 py-2.5 font-mono text-xs text-[#dbc2ad] focus:outline-none focus:border-[#FF9900]">
                <option value="all">All Types</option>
                <option value="quiz">Quizzes</option>
                <option value="case_study">Case Studies</option>
              </select>
              <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                className="bg-white/5 border border-white/10 px-3 py-2.5 font-mono text-xs text-[#dbc2ad] focus:outline-none focus:border-[#FF9900]">
                <option value="date">Sort: Latest</option>
                <option value="score">Sort: Score ↓</option>
                <option value="name">Sort: Name A–Z</option>
              </select>
            </div>

            {/* Scores table */}
            {loading ? (
              <div className="text-center py-20 font-mono text-[#dbc2ad]">Loading data...</div>
            ) : (viewMode === 'attempts' && filteredScores.length === 0) || (viewMode === 'leaderboard' && filteredLeaderboard.length === 0) ? (
              <div className="text-center py-20 font-mono text-[#dbc2ad]">No records found.</div>
            ) : viewMode === 'attempts' ? (
              <div className="border border-white/10 overflow-hidden">
                {/* Header */}
                <div className="grid grid-cols-[2fr_2fr_1fr_1fr_1fr_1.5fr] gap-0 bg-white/5 border-b border-white/10 px-4 py-3 hidden md:grid">
                  {['Student', 'Quiz', 'Type', 'Score / Time', 'Composite', 'Date'].map(h => (
                    <span key={h} className="font-mono text-[10px] text-[#dbc2ad] uppercase tracking-widest">{h}</span>
                  ))}
                </div>

                {/* Rows */}
                <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto">
                  {filteredScores.map(r => {
                    const tc = QUIZ_TYPE_COLOR[r.quiz_type] || QUIZ_TYPE_COLOR.quiz;
                    return (
                      <div key={r.id} className="grid grid-cols-1 md:grid-cols-[2fr_2fr_1fr_1fr_1fr_1.5fr] gap-2 md:gap-0 px-4 py-3 hover:bg-white/3 transition-colors">
                        <div>
                          <div className="font-mono text-sm text-white font-bold">{r.first_name} {r.last_name}</div>
                          <div className="font-mono text-[10px] text-[#dbc2ad]">{r.email}</div>
                        </div>
                        <div className="font-mono text-sm text-[#dbc2ad] flex items-center">{r.quiz_title || r.quiz_id}</div>
                        <div className="flex items-center">
                          <span className="font-mono text-[9px] px-1.5 py-0.5 uppercase tracking-wider" style={{ background: tc.bg, color: tc.text, border: `1px solid ${tc.border}` }}>
                            {r.quiz_type === 'case_study' ? 'Case Study' : 'Quiz'}
                          </span>
                        </div>
                        <div className="font-mono text-sm text-[#dbc2ad] flex items-center">{r.score}/{r.total} ({r.time_taken || 0}s)</div>
                        <div className="flex items-center"><ScoreBadge pct={parseFloat(r.composite_score || r.pct).toFixed(0)} /></div>
                        <div className="font-mono text-[10px] text-[#dbc2ad] flex items-center">{fmt(r.attempted_at)}</div>
                      </div>
                    );
                  })}
                </div>

                {/* Footer */}
                <div className="px-4 py-3 bg-white/3 border-t border-white/8 font-mono text-[10px] text-[#dbc2ad]">
                  Showing {filteredScores.length} of {scores.length} attempts
                </div>
              </div>
            ) : (
              <div className="border border-white/10 overflow-hidden">
                {/* Header */}
                <div className="grid grid-cols-[0.5fr_3fr_1fr_1fr] gap-0 bg-white/5 border-b border-white/10 px-4 py-3 hidden md:grid">
                  {['Rank', 'Student', 'Total Score', 'Attempts'].map(h => (
                    <span key={h} className="font-mono text-[10px] text-[#dbc2ad] uppercase tracking-widest">{h}</span>
                  ))}
                </div>

                {/* Rows */}
                <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto">
                  {filteredLeaderboard.map((r, i) => (
                      <div key={r.email} className="grid grid-cols-1 md:grid-cols-[0.5fr_3fr_1fr_1fr] gap-2 md:gap-0 px-4 py-3 hover:bg-white/3 transition-colors">
                        <div className="font-mono text-sm font-bold text-[#FF9900] flex items-center">#{i + 1}</div>
                        <div>
                          <div className="font-mono text-sm text-white font-bold">{r.first_name} {r.last_name}</div>
                          <div className="font-mono text-[10px] text-[#dbc2ad]">{r.email}</div>
                        </div>
                        <div className="font-mono text-xl font-bold text-[#a8e063] flex items-center">{r.total_score} pts</div>
                        <div className="font-mono text-sm text-[#dbc2ad] flex items-center">{r.attempts}</div>
                      </div>
                  ))}
                </div>

                {/* Footer */}
                <div className="px-4 py-3 bg-white/3 border-t border-white/8 font-mono text-[10px] text-[#dbc2ad]">
                  Showing {filteredLeaderboard.length} of {stats?.leaderboard?.length || 0} students
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* ═══════════════════════════════════════════════════════════
          MODAL 0: FULL SQUAD DOSSIER / DETAILED INSPECT MODAL
         ═══════════════════════════════════════════════════════════ */}
      {inspectTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-2xl bg-[#111114] border border-[#00a8e0]/50 p-6 rounded-2xl shadow-2xl font-mono max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4 border-b border-white/10 pb-3">
              <div>
                <span className="text-[10px] bg-[#00a8e0]/20 text-[#00a8e0] px-2 py-0.5 rounded font-bold uppercase tracking-widest">
                  Squad Dossier #{inspectTeam.code}
                </span>
                <h2 className="text-xl font-bold text-white mt-1 m-0">{inspectTeam.teamName}</h2>
                <div className="text-xs text-[#dbc2ad] mt-0.5">Created: {fmt(inspectTeam.registeredAt)}</div>
              </div>
              <button
                onClick={() => setInspectTeam(null)}
                className="text-white/60 hover:text-white border-0 bg-transparent cursor-pointer text-xl"
              >
                ✕
              </button>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-center">
                <div className="text-[10px] text-[#dbc2ad] uppercase">Score Balance</div>
                <div className="text-xl font-bold text-[#a8e063] mt-0.5">{inspectTeam.points || 0} pts</div>
              </div>
              <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-center">
                <div className="text-[10px] text-[#dbc2ad] uppercase">Topic Swapped</div>
                <div className="text-sm font-bold text-white mt-1">
                  {inspectTeam.hasChangedQuestion ? 'YES (1/1 Used)' : 'NO (Available)'}
                </div>
              </div>
              <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-center">
                <div className="text-[10px] text-[#dbc2ad] uppercase">Chaos Status</div>
                <div className="text-sm font-bold mt-1" style={{ color: inspectTeam.isChaosOpened ? (inspectTeam.isChaosResolved ? '#34d399' : '#f87171') : '#dbc2ad' }}>
                  {inspectTeam.isChaosOpened ? (inspectTeam.isChaosResolved ? 'Mitigated' : 'Active Injected') : 'Standby'}
                </div>
              </div>
              <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-center">
                <div className="text-[10px] text-[#dbc2ad] uppercase">Official Games</div>
                <div className="text-sm font-bold text-[#00a8e0] mt-1">
                  {(inspectTeam.gameAttempts || []).filter((attempt) => !attempt.voidedAt).length}/{inspectTeam.maxGameAttempts ?? 5}
                </div>
              </div>
            </div>

            {/* Active Challenge Details */}
            <div className="mb-6 p-4 bg-white/[0.03] border border-white/10 rounded-xl">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-[#FF9900] uppercase tracking-wider">Active Problem Statement</span>
                <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-white/10 text-white">
                  {inspectTeam.mysteryQuestion?.difficulty || 'Easy'} Tier ({inspectTeam.mysteryQuestion?.points || 100} pts)
                </span>
              </div>
              <div className="text-sm font-bold text-white">{inspectTeam.mysteryQuestion?.title || 'Sealed Box'}</div>
              <div className="text-xs text-[#dbc2ad] mt-1.5 leading-relaxed">{inspectTeam.mysteryQuestion?.desc || 'Not unveiled yet.'}</div>
              {inspectTeam.mysteryQuestion?.tags && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {inspectTeam.mysteryQuestion.tags.map((t, idx) => (
                    <span key={idx} className="px-2 py-0.5 text-[10px] bg-white/5 border border-white/10 text-[#dbc2ad] rounded">
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Complete Roster */}
            <div className="mb-6">
              <div className="text-xs font-bold text-white uppercase tracking-wider mb-2">
                Squad Roster ({(inspectTeam.members || []).length} Members)
              </div>
              <div className="space-y-2">
                {(inspectTeam.members || []).map((m, idx) => (
                  <div key={idx} className="p-3 bg-white/5 border border-white/10 rounded-lg flex justify-between items-center text-xs">
                    <div>
                      <div className="font-bold text-white flex items-center gap-2">
                        <span>{m.name || 'Hacker'}</span>
                        {m.isLeader && (
                          <span className="px-1.5 py-0.5 bg-[#FF9900]/20 text-[#FF9900] border border-[#FF9900]/40 text-[9px] rounded uppercase font-bold">
                            Leader
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#dbc2ad] mt-0.5">{m.email}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {m.regNo && <div className="text-[10px] text-white/50">{m.regNo}</div>}
                      {!m.isLeader && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(inspectTeam, m)}
                          className="px-2 py-1 bg-red-950/40 hover:bg-red-600 border border-red-500/30 text-red-300 hover:text-white text-[10px] uppercase font-bold rounded cursor-pointer"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Owned Store Buffs */}
            <div className="mb-6">
              <div className="text-xs font-bold text-white uppercase tracking-wider mb-2">Purchased Buffs &amp; Inventory</div>
              {inspectTeam.ownedItems && inspectTeam.ownedItems.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {inspectTeam.ownedItems.map((item, idx) => (
                    <span key={idx} className="px-3 py-1 bg-[#FF9900]/10 border border-[#FF9900]/30 text-[#FF9900] text-xs font-bold rounded-lg flex items-center gap-1">
                      <span>✓</span> {item}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-[#dbc2ad]/60 italic">No shop buffs purchased yet.</div>
              )}
            </div>

            {/* Quick Actions Drawer Footer */}
            <div className="flex items-center justify-between gap-2 pt-4 border-t border-white/10 flex-wrap">
              <button
                type="button"
                onClick={() => setDeleteConfirmTeam(inspectTeam)}
                className="px-3 py-2 bg-red-950/40 hover:bg-red-600 border border-red-500/30 text-red-400 hover:text-white font-bold text-xs uppercase cursor-pointer rounded transition-all"
              >
                🗑️ Delete Squad
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPointsModalTeam(inspectTeam);
                    setPointDeltaInput('');
                  }}
                  className="px-3 py-2 bg-[#FF9900] text-[#111] font-bold text-xs uppercase cursor-pointer rounded"
                >
                  ⚡ Adjust Points
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setReassignModalTeam(inspectTeam);
                    setSelectedReassignQuestion(MYSTERY_BOX_QUESTIONS[0]?.id || '');
                    setResetSwapCheckbox(false);
                  }}
                  className="px-3 py-2 bg-[#00a8e0] text-white font-bold text-xs uppercase cursor-pointer rounded"
                >
                  🔄 Reassign Question
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setGameLimitTeam(inspectTeam);
                    setGameLimitInput(String(inspectTeam.maxGameAttempts ?? 5));
                  }}
                  className="px-3 py-2 bg-[#a8e063] text-[#111] font-bold text-xs uppercase cursor-pointer rounded"
                >
                  🎮 Game Limit
                </button>
                <button
                  type="button"
                  onClick={() => setInspectTeam(null)}
                  className="px-4 py-2 bg-white/10 text-white font-bold text-xs uppercase cursor-pointer rounded"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          MODAL 1: POINTS INJECTION / ADJUSTMENT
         ═══════════════════════════════════════════════════════════ */}
      {pointsModalTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#111114] border border-[#FF9900]/40 p-6 rounded-2xl shadow-2xl font-mono">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold text-white uppercase tracking-wider m-0">⚡ Adjust Points</h3>
              <button onClick={() => setPointsModalTeam(null)} className="text-white/60 hover:text-white border-0 bg-transparent cursor-pointer text-lg">✕</button>
            </div>

            <div className="p-3 bg-white/5 border border-white/10 rounded mb-4">
              <div className="text-[10px] text-[#dbc2ad] uppercase">Team:</div>
              <div className="text-sm font-bold text-white">{pointsModalTeam.teamName} (#{pointsModalTeam.code})</div>
              <div className="text-xs text-[#a8e063] mt-1">Current Points: {pointsModalTeam.points || 0} pts</div>
            </div>

            <div className="mb-4">
              <label className="text-[10px] text-[#dbc2ad] uppercase block mb-2">Quick Presets:</label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: '+50 Quiz', val: 50 },
                  { label: '+40 Puzzle', val: 40 },
                  { label: '+80 Speed', val: 80 },
                  { label: '−50 Penalty', val: -50 },
                ].map(p => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => handlePointsSubmit(p.val)}
                    className="p-2 text-[10px] font-bold border border-white/10 bg-white/5 hover:bg-[#FF9900] hover:text-[#111] text-white transition-all cursor-pointer rounded"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <label className="text-[10px] text-[#dbc2ad] uppercase block mb-2">Or Custom Delta (+/- Points):</label>
              <input
                type="number"
                value={pointDeltaInput}
                onChange={e => setPointDeltaInput(e.target.value)}
                placeholder="e.g. 100 or -50"
                className="w-full bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF9900]"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setPointsModalTeam(null)}
                className="flex-1 bg-white/5 hover:bg-white/10 text-[#dbc2ad] py-2.5 text-xs font-bold uppercase cursor-pointer border-0 rounded"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handlePointsSubmit()}
                className="flex-1 bg-[#FF9900] text-[#111] py-2.5 text-xs font-bold uppercase hover:bg-[#ffc082] cursor-pointer border-0 rounded"
              >
                Apply Points
              </button>
            </div>
          </div>
        </div>
      )}

      {gameLimitTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#111114] border border-[#a8e063]/40 p-6 rounded-2xl shadow-2xl font-mono">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold text-white uppercase tracking-wider m-0">🎮 Official Game Limit</h3>
              <button onClick={() => setGameLimitTeam(null)} className="text-white/60 hover:text-white border-0 bg-transparent cursor-pointer text-lg">✕</button>
            </div>

            <div className="p-3 bg-white/5 border border-white/10 rounded mb-4">
              <div className="text-[10px] text-[#dbc2ad] uppercase">Team:</div>
              <div className="text-sm font-bold text-white">{gameLimitTeam.teamName} (#{gameLimitTeam.code})</div>
              <div className="text-xs text-[#00a8e0] mt-1">Used Games: {(gameLimitTeam.gameAttempts || []).filter((attempt) => !attempt.voidedAt).length}/{gameLimitTeam.maxGameAttempts ?? 5}</div>
            </div>

            <label className="text-[10px] text-[#dbc2ad] uppercase block mb-2">Max Official Game Plays:</label>
            <input
              type="number"
              min="0"
              max="12"
              value={gameLimitInput}
              onChange={e => setGameLimitInput(e.target.value)}
              className="w-full bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#a8e063] mb-5"
            />

            <div className="max-h-44 overflow-y-auto border border-white/10 rounded mb-5">
              {(gameLimitTeam.gameAttempts || []).length ? (gameLimitTeam.gameAttempts || []).map((attempt) => (
                <div key={attempt.attemptId} className="flex items-center justify-between gap-3 px-3 py-2 text-xs border-b border-white/5">
                  <span className="text-[#dbc2ad]">#{attempt.slotNumber} {attempt.gameSlug}</span>
                  <span className={attempt.voidedAt ? 'text-red-300' : 'text-[#FF9900]'}>{attempt.voidedAt ? 'voided' : attempt.status} · {attempt.points || 0} pts</span>
                  {!attempt.voidedAt && (
                    <button type="button" onClick={() => handleGameAttemptReset(attempt)} className="px-2 py-1 bg-red-950/40 hover:bg-red-600 border border-red-500/30 text-red-300 hover:text-white text-[10px] uppercase rounded cursor-pointer">Void</button>
                  )}
                </div>
              )) : (
                <div className="px-3 py-4 text-xs text-[#dbc2ad]/60">No official games started yet.</div>
              )}
            </div>

            <label className="text-[10px] text-[#dbc2ad] uppercase block mb-2">Reset audit reason (required before voiding):</label>
            <input
              type="text"
              maxLength="500"
              value={gameResetReason}
              onChange={event => setGameResetReason(event.target.value)}
              placeholder="e.g. Duplicate pre-launch attempt"
              className="w-full bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-400 mb-5"
            />

            {(gameLimitTeam.pointLedger || []).some((entry) => ['game-reset', 'game-reversal'].includes(entry.sourceType)) && (
              <div className="max-h-32 overflow-y-auto border border-white/10 rounded mb-5">
                {(gameLimitTeam.pointLedger || []).filter((entry) => ['game-reset', 'game-reversal'].includes(entry.sourceType)).map((entry) => (
                  <div key={`${entry.sourceType}:${entry.sourceRef}`} className="px-3 py-2 text-[10px] border-b border-white/5">
                    <span className="text-red-300 font-bold">{entry.delta > 0 ? '+' : ''}{entry.delta} pts</span>
                    <span className="text-[#dbc2ad] ml-2">{entry.reason}</span>
                    <span className="text-white/40 ml-2">balance {entry.balanceAfter}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setGameLimitTeam(null)}
                className="flex-1 bg-white/5 hover:bg-white/10 text-[#dbc2ad] py-2.5 text-xs font-bold uppercase cursor-pointer border-0 rounded"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleGameLimitSubmit}
                className="flex-1 bg-[#a8e063] text-[#111] py-2.5 text-xs font-bold uppercase hover:bg-[#c9ff8c] cursor-pointer border-0 rounded"
              >
                Save Limit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          MODAL 2: CHAOS EVENT INJECTION
         ═══════════════════════════════════════════════════════════ */}
      {chaosModalTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#111114] border border-red-500/40 p-6 rounded-2xl shadow-2xl font-mono">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold text-red-400 uppercase tracking-wider m-0">🌪️ Chaos Event Control</h3>
              <button onClick={() => setChaosModalTeam(null)} className="text-white/60 hover:text-white border-0 bg-transparent cursor-pointer text-lg">✕</button>
            </div>

            <div className="p-3 bg-white/5 border border-white/10 rounded mb-4">
              <div className="text-[10px] text-[#dbc2ad] uppercase">Target Team:</div>
              <div className="text-sm font-bold text-white">{chaosModalTeam.teamName} (#{chaosModalTeam.code})</div>
              <div className="text-xs text-red-300 mt-1">
                Current Status: {chaosModalTeam.isChaosOpened ? (chaosModalTeam.isChaosResolved ? 'Resolved' : 'Active Injected') : 'Standby'}
              </div>
            </div>

            <div className="mb-5">
              <label className="text-[10px] text-[#dbc2ad] uppercase block mb-2">Select Chaos Event to Inject:</label>
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {CHAOS_EVENTS.map(ev => (
                  <div
                    key={ev.title}
                    onClick={() => setSelectedChaosEvent(ev.title)}
                    className={`p-3 rounded border transition-all cursor-pointer ${
                      selectedChaosEvent === ev.title
                        ? 'bg-red-500/20 border-red-500 text-white'
                        : 'bg-white/3 border-white/10 hover:bg-white/5 text-[#dbc2ad]'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-xs">
                      <span>{ev.icon}</span>
                      <span>{ev.title}</span>
                    </div>
                    <div className="text-[11px] text-white/70 mt-1">{ev.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleTriggerChaos(false, true)}
                className="bg-green-500/20 hover:bg-green-500 hover:text-white text-green-300 border border-green-500/40 py-2.5 px-3 text-xs font-bold uppercase cursor-pointer rounded"
              >
                ✓ Mark Resolved
              </button>
              <button
                type="button"
                onClick={() => setChaosModalTeam(null)}
                className="flex-1 bg-white/5 hover:bg-white/10 text-[#dbc2ad] py-2.5 text-xs font-bold uppercase cursor-pointer border-0 rounded"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleTriggerChaos(false, false)}
                className="flex-1 bg-red-600 text-white py-2.5 text-xs font-bold uppercase hover:bg-red-500 cursor-pointer border-0 rounded"
              >
                Inject Chaos Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          MODAL 3: REASSIGN CHALLENGE TOPIC
         ═══════════════════════════════════════════════════════════ */}
      {reassignModalTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-xl bg-[#111114] border border-[#00a8e0]/40 p-6 rounded-2xl shadow-2xl font-mono">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold text-[#00a8e0] uppercase tracking-wider m-0">🔄 Reassign Challenge Topic</h3>
              <button onClick={() => setReassignModalTeam(null)} className="text-white/60 hover:text-white border-0 bg-transparent cursor-pointer text-lg">✕</button>
            </div>

            <div className="p-3 bg-white/5 border border-white/10 rounded mb-4 flex justify-between items-center">
              <div>
                <div className="text-[10px] text-[#dbc2ad] uppercase">Target Team:</div>
                <div className="text-sm font-bold text-white">{reassignModalTeam.teamName} (#{reassignModalTeam.code})</div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-[#dbc2ad] block">Current Topic:</span>
                <span className="text-xs text-white font-bold truncate max-w-[180px] block">
                  {reassignModalTeam.mysteryQuestion?.title || 'Sealed'}
                </span>
              </div>
            </div>

            <div className="mb-4">
              <label className="text-[10px] text-[#dbc2ad] uppercase block mb-2">Select New Problem Statement:</label>
              <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                {MYSTERY_BOX_QUESTIONS.map(q => {
                  const isSelected = selectedReassignQuestion === q.id;
                  const isHard = q.difficulty === 'Hard';
                  const isMed = q.difficulty === 'Medium';
                  const color = isHard ? '#c084fc' : (isMed ? '#FF9900' : '#a8e063');

                  return (
                    <div
                      key={q.id}
                      onClick={() => setSelectedReassignQuestion(q.id)}
                      className={`p-3 rounded border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#00a8e0]/20 border-[#00a8e0] text-white'
                          : 'bg-white/3 border-white/10 hover:bg-white/5 text-[#dbc2ad]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-bold text-xs text-white">{q.title}</span>
                        <span
                          className="px-2 py-0.5 text-[9px] font-bold rounded uppercase font-mono"
                          style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}
                        >
                          {q.difficulty} • {q.points} pts
                        </span>
                      </div>
                      <div className="text-[11px] text-white/70 line-clamp-2 leading-snug">{q.desc}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mb-5 flex items-center gap-2 p-2 bg-white/5 rounded border border-white/10">
              <input
                type="checkbox"
                id="resetSwap"
                checked={resetSwapCheckbox}
                onChange={e => setResetSwapCheckbox(e.target.checked)}
                className="cursor-pointer accent-[#00a8e0]"
              />
              <label htmlFor="resetSwap" className="text-xs text-white cursor-pointer select-none">
                Reset 1-Time Topic Swap limit (Allow team leader to use swap again)
              </label>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setReassignModalTeam(null)}
                className="flex-1 bg-white/5 hover:bg-white/10 text-[#dbc2ad] py-2.5 text-xs font-bold uppercase cursor-pointer border-0 rounded"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReassignTopic}
                className="flex-1 bg-[#00a8e0] text-white py-2.5 text-xs font-bold uppercase hover:bg-[#38bdf8] cursor-pointer border-0 rounded"
              >
                Confirm Reassignment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          MODAL 4: IN-APP SQUAD DELETION CONFIRMATION (NO BROWSER POPUP)
         ═══════════════════════════════════════════════════════════ */}
      {deleteConfirmTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#160a0a] border border-red-500/60 p-6 rounded-2xl shadow-[0_0_50px_rgba(239,68,68,0.25)] font-mono animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-xl text-red-400 shrink-0">
                ⚠️
              </div>
              <div>
                <h3 className="text-base font-bold text-red-400 uppercase tracking-wider m-0">Permanent Squad Deletion</h3>
                <span className="text-[10px] text-[#dbc2ad] uppercase tracking-widest">Admin Irreversible Action</span>
              </div>
            </div>

            <div className="p-4 bg-red-950/20 border border-red-500/30 rounded-xl mb-4 text-xs">
              <div className="text-[#dbc2ad] uppercase text-[10px]">Target Squad:</div>
              <div className="text-sm font-bold text-white mt-0.5">{deleteConfirmTeam.teamName}</div>
              <div className="flex items-center gap-2 mt-1.5 text-[11px] text-red-300">
                <span className="bg-red-500/20 px-1.5 py-0.5 rounded font-mono font-bold">#{deleteConfirmTeam.code}</span>
                <span>• {(deleteConfirmTeam.members || []).length} Participants</span>
                <span>• {deleteConfirmTeam.points || 0} Points</span>
              </div>
            </div>

            <p className="text-xs text-white/80 leading-relaxed mb-6">
              Are you sure you want to permanently disband and delete this squad? This will remove all team progress, wipe challenge allocations, and log the removal immediately.
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmTeam(null)}
                className="flex-1 bg-white/5 hover:bg-white/10 text-[#dbc2ad] py-2.5 text-xs font-bold uppercase cursor-pointer border border-white/10 rounded-lg transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeDeleteTeam}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white py-2.5 text-xs font-bold uppercase cursor-pointer border-0 rounded-lg shadow-[0_0_20px_rgba(239,68,68,0.4)] transition-all"
              >
                Confirm &amp; Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          MODAL 5: TERMINATE QUIZ CONFIRMATION (NO BROWSER POPUP)
         ═══════════════════════════════════════════════════════════ */}
      {terminateQuizModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#160a0a] border border-red-500/60 p-6 rounded-2xl shadow-2xl font-mono animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-xl text-red-400 shrink-0">
                🛑
              </div>
              <div>
                <h3 className="text-base font-bold text-red-400 uppercase tracking-wider m-0">Terminate Global Quiz</h3>
                <span className="text-[10px] text-[#dbc2ad] uppercase tracking-widest">Global Status Lock</span>
              </div>
            </div>

            <p className="text-xs text-white/80 leading-relaxed mb-6">
              Are you sure you want to terminate the global quiz? All active participant sessions will be locked and blocked from further submissions.
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setTerminateQuizModalOpen(false)}
                className="flex-1 bg-white/5 hover:bg-white/10 text-[#dbc2ad] py-2.5 text-xs font-bold uppercase cursor-pointer border border-white/10 rounded-lg transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmTerminateQuiz}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white py-2.5 text-xs font-bold uppercase cursor-pointer border-0 rounded-lg transition-all"
              >
                Terminate Quiz
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// ── Page root ──────────────────────────────────────────────────
export default function AdminPage() {
  const navigate = useNavigate();
  const [adminToken, setAdminToken] = useState(() => sessionStorage.getItem('adminToken') || '');

  function handleLogin(token) {
    sessionStorage.setItem('adminToken', token);
    setAdminToken(token);
  }

  function handleLogout() {
    sessionStorage.removeItem('adminToken');
    setAdminToken('');
  }

  if (!adminToken) return <AdminLogin onLogin={handleLogin} />;
  return <Dashboard token={adminToken} onLogout={handleLogout} />;
}
