import { useState, useEffect } from 'react';
import CloudIntelligenceAdmin from './CloudIntelligenceAdmin';
import {
  adminLogin,
  fetchAdminScores,
  fetchAdminStats,
  fetchQuizStatus,
  updateQuizStatus,
} from '../utils/auth';

const QUIZ_TYPE_COLOR = {
  quiz:       { bg: 'rgba(255,153,0,0.15)',  border: 'rgba(255,153,0,0.5)',  text: '#FF9900' },
  case_study: { bg: 'rgba(168,85,247,0.15)', border: 'rgba(168,85,247,0.5)', text: '#c084fc' },
};

function fmt(dateStr) {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
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
    <div className="font-product min-h-screen bg-[#0A0C10] flex items-center justify-center px-4"
      style={{ backgroundImage: 'linear-gradient(to right,rgba(255,255,255,0.04) 1px,transparent 1px),linear-gradient(to bottom,rgba(255,255,255,0.04) 1px,transparent 1px)', backgroundSize: '80px 80px' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 px-3.5 py-1.5 font-mono text-xs text-[#dbc2ad] uppercase tracking-widest mb-4">
            <span className="w-2 h-2 rounded-full bg-[#FF9900] animate-pulse" />
            Admin Access
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold text-white tracking-tight leading-tight">Admin<br /><span className="text-[#FF9900]">Panel</span></h1>
          <p className="font-mono text-xs text-[#dbc2ad] mt-2">AWS Student Builder Group</p>
        </div>

        <form onSubmit={handleSubmit} className="border border-white/10 bg-white/3 p-7 sm:p-8 space-y-5">
          <div>
            <label className="font-mono text-[10px] text-[#dbc2ad] uppercase tracking-widest block mb-2 font-bold">Admin ID</label>
            <input
              type="text"
              value={adminId}
              onChange={(e) => setAdminId(e.target.value)}
              placeholder="Enter admin ID"
              className="w-full bg-white/5 border border-white/10 px-4 py-3 font-mono text-sm text-white focus:outline-none focus:border-[#FF9900] transition-colors placeholder-white/20"
              autoComplete="username"
            />
          </div>

          <div>
            <label className="font-mono text-[10px] text-[#dbc2ad] uppercase tracking-widest block mb-2 font-bold">Password</label>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
                placeholder="Enter admin password"
                className="w-full bg-white/5 border border-white/10 px-4 py-3 font-mono text-sm text-white focus:outline-none focus:border-[#FF9900] transition-colors placeholder-white/20 pr-10"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPwd(!showPwd)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#dbc2ad] hover:text-white transition-colors cursor-pointer bg-transparent border-none"
              >
                <span className="material-symbols-outlined text-lg">{showPwd ? 'visibility_off' : 'visibility'}</span>
              </button>
            </div>
          </div>

          {err && (
            <div className="bg-[#E24B4A]/10 border border-[#E24B4A]/40 px-4 py-2.5 font-mono text-xs text-[#f87171]">
              {err}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#FF9900] text-[#111] font-mono text-xs font-bold py-3.5 uppercase tracking-widest hover:bg-[#ffaa22] transition-colors disabled:opacity-50 cursor-pointer border-none"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Dashboard ──────────────────────────────────────────────────
function Dashboard({ token, onLogout }) {
  const [activeTab, setActiveTab] = useState('cloud-intelligence'); // 'cloud-intelligence' | 'quiz'

  // Quiz state
  const [scores, setScores] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [viewMode, setViewMode] = useState('attempts');
  const [quizStatus, setQuizStatus] = useState('inactive');
  const [terminateQuizModalOpen, setTerminateQuizModalOpen] = useState(false);
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
          userMap[r.email] = { first_name: r.first_name, last_name: r.last_name, email: r.email, attempts: 0, bestScores: {} };
        }
        userMap[r.email].attempts += 1;
        const currentScore = parseFloat(r.composite_score || r.pct || 0);
        if (!userMap[r.email].bestScores[r.quiz_id] || currentScore > userMap[r.email].bestScores[r.quiz_id]) {
          userMap[r.email].bestScores[r.quiz_id] = currentScore;
        }
      });
      const computedLeaderboard = Object.values(userMap).map(u => ({
        ...u,
        total_score: parseFloat(Object.values(u.bestScores).reduce((sum, v) => sum + v, 0).toFixed(2))
      })).sort((a, b) => b.total_score - a.total_score);
      if (st) { st.leaderboard = computedLeaderboard; st.topScorers = computedLeaderboard.slice(0, 5); }
    }

    setScores(s);
    setStats(st);
    setQuizStatus(status);
    setLoading(false);
  };

  useEffect(() => {
    void loadQuizData();
  }, [token]);

  const handleStatusChange = async (action) => {
    if (action === 'terminate') { setTerminateQuizModalOpen(true); return; }
    const res = await updateQuizStatus(token, action);
    if (res.ok) setQuizStatus(res.status);
    else notify('Failed to change status: ' + res.error);
  };

  const confirmTerminateQuiz = async () => {
    setTerminateQuizModalOpen(false);
    const res = await updateQuizStatus(token, 'terminate');
    if (res.ok) { setQuizStatus(res.status); notify('Quiz terminated.'); }
    else notify('Failed: ' + res.error);
  };

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
        const diff = parseFloat(b.composite_score || b.pct || 0) - parseFloat(a.composite_score || a.pct || 0);
        return diff !== 0 ? diff : (a.time_taken || 0) - (b.time_taken || 0);
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
    <div className="font-product min-h-screen bg-[#0A0C10] text-white"
      style={{ backgroundImage: 'linear-gradient(to right,rgba(255,255,255,0.03) 1px,transparent 1px),linear-gradient(to bottom,rgba(255,255,255,0.03) 1px,transparent 1px)', backgroundSize: '80px 80px' }}>

      {/* Header */}
      <div className="border-b border-white/8 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="w-1.5 h-1.5 rounded-full bg-[#FF9900]" />
          <div>
            <p className="text-sm font-semibold text-white leading-tight">Admin Dashboard</p>
            <p className="text-[11px] text-[#dbc2ad]">AWS Student Builder Group</p>
          </div>
        </div>

        {/* Center Tab Switcher */}
        <div className="flex justify-center">
          <div className="flex bg-white/5 border border-white/10 p-1 rounded-lg text-xs">
            <button
              onClick={() => setActiveTab('cloud-intelligence')}
              className={`px-4 py-1.5 uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'cloud-intelligence'
                  ? 'bg-[#FF9900] text-black font-semibold shadow rounded-md'
                  : 'text-[#dbc2ad] hover:text-white'
              }`}
            >
              Cloud Intelligence
            </button>
            <button
              onClick={() => setActiveTab('quiz')}
              className={`px-4 py-1.5 uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'quiz'
                  ? 'bg-[#FF9900] text-black font-semibold shadow rounded-md'
                  : 'text-[#dbc2ad] hover:text-white'
              }`}
            >
              Quizzes &amp; Tests
            </button>
          </div>
        </div>

        <div className="flex items-center justify-end gap-4">
          <button onClick={loadQuizData} className="font-mono text-[10px] text-[#dbc2ad] hover:text-white uppercase tracking-widest flex items-center gap-1 cursor-pointer bg-transparent border-none">
            <span className="material-symbols-outlined text-sm">refresh</span> Refresh
          </button>
          <button onClick={onLogout} className="font-mono text-[10px] text-[#f87171] hover:text-white uppercase tracking-widest cursor-pointer bg-transparent border-none">
            Logout
          </button>
        </div>
      </div>

      {notification && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1a1a1a] border border-[#FF9900]/50 px-5 py-3 font-mono text-sm text-[#FF9900] shadow-xl">
          {notification}
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* ── TAB 1: CLOUD INTELLIGENCE (OUR NEW ASSESSMENT) ── */}
        {activeTab === 'cloud-intelligence' && (
          <CloudIntelligenceAdmin token={token} />
        )}

        {/* ── TAB 2: MAIN BRANCH'S QUIZZES & TESTS ── */}
        {activeTab === 'quiz' && (
          <div>
            {/* Quiz Controls */}
            <div className="mb-8 border border-white/10 bg-white/3 p-5 flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <div className="font-mono text-xs text-[#dbc2ad] uppercase tracking-widest mb-1">Global Quiz Status</div>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${quizStatus === 'active' ? 'bg-[#a8e063] animate-pulse' : 'bg-[#E24B4A]'}`} />
                  <span className={`font-mono text-lg font-bold uppercase ${quizStatus === 'active' ? 'text-[#a8e063]' : 'text-[#E24B4A]'}`}>
                    {quizStatus === 'active' ? 'LIVE (Accepting)' : 'ON HOLD (Blocked)'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3 w-full md:w-auto">
                <button
                  onClick={() => handleStatusChange('initiate')} disabled={quizStatus === 'active'}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-[#a8e063]/10 text-[#a8e063] border border-[#a8e063]/30 px-6 py-3 font-mono text-xs font-bold uppercase tracking-widest hover:bg-[#a8e063]/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer">
                  <span className="material-symbols-outlined text-sm">play_arrow</span> Initiate Quiz
                </button>
                <button
                  onClick={() => handleStatusChange('terminate')} disabled={quizStatus === 'inactive'}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-[#E24B4A]/10 text-[#E24B4A] border border-[#E24B4A]/30 px-6 py-3 font-mono text-xs font-bold uppercase tracking-widest hover:bg-[#E24B4A]/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer">
                  <span className="material-symbols-outlined text-sm">stop</span> Terminate Quiz
                </button>
              </div>
            </div>

            {/* Stats */}
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

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-3 mb-6">
              <div className="flex bg-white/5 border border-white/10 p-1 shrink-0">
                <button onClick={() => setViewMode('attempts')}
                  className={`font-mono text-xs px-4 py-2 uppercase tracking-widest transition-colors cursor-pointer ${viewMode === 'attempts' ? 'bg-[#FF9900] text-[#111] font-bold' : 'text-[#dbc2ad] hover:text-white'}`}>
                  All Attempts
                </button>
                <button onClick={() => setViewMode('leaderboard')}
                  className={`font-mono text-xs px-4 py-2 uppercase tracking-widest transition-colors cursor-pointer ${viewMode === 'leaderboard' ? 'bg-[#FF9900] text-[#111] font-bold' : 'text-[#dbc2ad] hover:text-white'}`}>
                  Leaderboard
                </button>
              </div>
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
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

            {/* Table */}
            {loading ? (
              <div className="text-center py-20 font-mono text-[#dbc2ad]">Loading data...</div>
            ) : (viewMode === 'attempts' && filteredScores.length === 0) || (viewMode === 'leaderboard' && filteredLeaderboard.length === 0) ? (
              <div className="text-center py-20 font-mono text-[#dbc2ad]">No records found.</div>
            ) : viewMode === 'attempts' ? (
              <div className="border border-white/10 overflow-hidden">
                <div className="grid grid-cols-[2fr_2fr_1fr_1fr_1fr_1.5fr] gap-0 bg-white/5 border-b border-white/10 px-4 py-3 hidden md:grid">
                  {['Student', 'Quiz', 'Type', 'Score / Time', 'Composite', 'Date'].map(h => (
                    <span key={h} className="font-mono text-[10px] text-[#dbc2ad] uppercase tracking-widest">{h}</span>
                  ))}
                </div>
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
                <div className="px-4 py-3 bg-white/3 border-t border-white/8 font-mono text-[10px] text-[#dbc2ad]">
                  Showing {filteredScores.length} of {scores.length} attempts
                </div>
              </div>
            ) : (
              <div className="border border-white/10 overflow-hidden">
                <div className="grid grid-cols-[0.5fr_3fr_1fr_1fr] gap-0 bg-white/5 border-b border-white/10 px-4 py-3 hidden md:grid">
                  {['Rank', 'Student', 'Total Score', 'Attempts'].map(h => (
                    <span key={h} className="font-mono text-[10px] text-[#dbc2ad] uppercase tracking-widest">{h}</span>
                  ))}
                </div>
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
                <div className="px-4 py-3 bg-white/3 border-t border-white/8 font-mono text-[10px] text-[#dbc2ad]">
                  Showing {filteredLeaderboard.length} of {stats?.leaderboard?.length || 0} students
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Terminate confirmation modal */}
      {terminateQuizModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-[#111] border border-[#E24B4A]/40 p-6 max-w-sm w-full mx-4">
            <h3 className="font-mono text-lg font-bold text-[#E24B4A] mb-2">Terminate Quiz?</h3>
            <p className="font-mono text-sm text-[#dbc2ad] mb-6">This will block all further quiz submissions. Are you sure?</p>
            <div className="flex gap-3">
              <button onClick={confirmTerminateQuiz}
                className="flex-1 bg-[#E24B4A] text-white font-mono text-sm font-bold py-2.5 uppercase tracking-widest cursor-pointer border-none">
                Terminate
              </button>
              <button onClick={() => setTerminateQuizModalOpen(false)}
                className="flex-1 bg-white/5 border border-white/10 text-[#dbc2ad] font-mono text-sm py-2.5 uppercase tracking-widest cursor-pointer">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Root ───────────────────────────────────────────────────────
export default function AdminPage() {
  const [token, setToken] = useState(() => sessionStorage.getItem('admin-token') || '');

  const handleLogin = (t) => {
    sessionStorage.setItem('admin-token', t);
    setToken(t);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('admin-token');
    setToken('');
  };

  if (!token) return <AdminLogin onLogin={handleLogin} />;
  return <Dashboard token={token} onLogout={handleLogout} />;
}
