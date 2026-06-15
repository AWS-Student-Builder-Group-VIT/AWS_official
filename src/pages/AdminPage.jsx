import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminLogin, fetchAdminScores, fetchAdminStats, fetchQuizStatus, updateQuizStatus } from '../utils/auth';

const QUIZ_TYPE_COLOR = {
  quiz:       { bg: 'rgba(255,153,0,0.15)',  border: 'rgba(255,153,0,0.5)',  text: '#FF9900' },
  case_study: { bg: 'rgba(168,85,247,0.15)', border: 'rgba(168,85,247,0.5)', text: '#c084fc' },
};

function fmt(dateStr) {
  return new Date(dateStr).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#dbc2ad] hover:text-white">
                <span className="material-symbols-outlined text-lg">{showPwd ? 'visibility' : 'visibility_off'}</span>
              </button>
            </div>
          </div>
          {err && <div className="mb-4 font-mono text-xs text-[#f87171] bg-red-500/10 border border-red-500/20 px-3 py-2">{err}</div>}
          <button type="submit" disabled={loading}
            className="w-full bg-[#FF9900] text-[#111] font-mono text-sm font-bold py-3 hover:bg-[#ffc082] transition-colors uppercase tracking-widest disabled:opacity-50">
            {loading ? 'Authenticating...' : 'Access Dashboard'}
          </button>
        </form>

      </div>
    </div>
  );
}

// ── Dashboard ──────────────────────────────────────────────────
function Dashboard({ token, onLogout }) {
  const [scores, setScores] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('date'); // date | score | name

  const [quizStatus, setQuizStatus] = useState('inactive');

  const load = async () => {
    setLoading(true);
    const [s, st, status] = await Promise.all([
      fetchAdminScores(token), 
      fetchAdminStats(token),
      fetchQuizStatus()
    ]);
    setScores(s);
    setStats(st);
    setQuizStatus(status);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [token]);

  const handleStatusChange = async (action) => {
    if (action === 'terminate' && !window.confirm('Are you sure you want to terminate? All active sessions will be closed.')) return;
    const res = await updateQuizStatus(token, action);
    if (res.ok) setQuizStatus(res.status);
    else alert('Failed to change status: ' + res.error);
  };

  const filtered = scores
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

  return (
    <div className="min-h-screen bg-[#0A0C10] text-[#f1dfd1]"
      style={{ backgroundImage: 'linear-gradient(to right,rgba(255,255,255,0.04) 1px,transparent 1px),linear-gradient(to bottom,rgba(255,255,255,0.04) 1px,transparent 1px)', backgroundSize: '80px 80px' }}>

      {/* Navbar */}
      <nav className="sticky top-0 z-20 flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#0A0C10]/90 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs bg-[#FF9900] text-[#111] px-2 py-0.5 font-bold uppercase tracking-widest">ADMIN</span>
          <span className="font-mono text-sm text-[#dbc2ad] uppercase tracking-widest">AWS Quiz Dashboard</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={load} title="Refresh Data"
            className="font-mono text-xs text-[#dbc2ad] border border-white/10 px-3 py-2 hover:border-[#00a8e0]/50 hover:text-[#00a8e0] transition-all flex items-center justify-center">
            <span className="material-symbols-outlined text-sm">refresh</span>
          </button>
          <button onClick={onLogout}
            className="font-mono text-xs text-[#dbc2ad] border border-white/10 px-4 py-2 hover:border-[#FF9900]/50 hover:text-[#FF9900] transition-all uppercase tracking-widest flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">logout</span> Logout
          </button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-10">

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
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-[#a8e063]/10 text-[#a8e063] border border-[#a8e063]/30 px-6 py-3 font-mono text-xs font-bold uppercase tracking-widest hover:bg-[#a8e063]/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed">
              <span className="material-symbols-outlined text-sm">play_arrow</span>
              Initiate Quiz
            </button>
            <button 
              onClick={() => handleStatusChange('terminate')}
              disabled={quizStatus === 'inactive'}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-[#E24B4A]/10 text-[#E24B4A] border border-[#E24B4A]/30 px-6 py-3 font-mono text-xs font-bold uppercase tracking-widest hover:bg-[#E24B4A]/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed">
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
                    <ScoreBadge pct={parseInt(s.avg_pct)} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-3 mb-6">
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
          <div className="text-center py-20 font-mono text-[#dbc2ad]">Loading scores...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 font-mono text-[#dbc2ad]">No records found.</div>
        ) : (
          <div className="border border-white/10 overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-[2fr_2fr_1fr_1fr_1fr_1.5fr] gap-0 bg-white/5 border-b border-white/10 px-4 py-3 hidden md:grid">
              {['Student', 'Quiz', 'Type', 'Score / Time', 'Composite', 'Date'].map(h => (
                <span key={h} className="font-mono text-[10px] text-[#dbc2ad] uppercase tracking-widest">{h}</span>
              ))}
            </div>

            {/* Rows */}
            <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto">
              {filtered.map(r => {
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
              Showing {filtered.length} of {scores.length} records
            </div>
          </div>
        )}
      </div>
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
