import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { saveSession } from '../utils/auth';

const API_URL = import.meta.env.VITE_API_URL || '';

export default function LoginPage() {
  const [tab, setTab] = useState('login');
  const [showPwd, setShowPwd] = useState(false);
  const [showPwd2, setShowPwd2] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSwitchTab = (newTab) => {
    setTab(newTab);
    setMsg({ text: '', type: '' });
  };

  const handleLogin = async () => {
    const email = document.getElementById('l-email').value.trim();
    const pwd = document.getElementById('l-pwd').value;
    if (!email || !pwd) { setMsg({ text: 'Please fill in all fields.', type: 'error' }); return; }
    if (!email.includes('@')) { setMsg({ text: 'Please enter a valid email.', type: 'error' }); return; }
    
    setIsLoading(true);
    setMsg({ text: '', type: '' });
    try {
      const response = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pwd }),
      });
      const data = await response.json();
      
      if (!response.ok) {
        setMsg({ text: data.error || 'Login failed', type: 'error' });
        return;
      }
      
      saveSession(data.token, data.user);
      setMsg({ text: '✓ Sign in successful! Redirecting...', type: 'success' });
      window.dispatchEvent(new CustomEvent('auth-success', { detail: { type: 'login', user: data.user } }));
      window.dispatchEvent(new Event('auth-change'));
      setTimeout(() => { navigate('/quiz'); }, 1000);
    } catch (err) {
      setMsg({ text: 'Network error. Please try again later.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    const first = document.getElementById('r-first').value.trim();
    const last = document.getElementById('r-last').value.trim();
    const email = document.getElementById('r-email').value.trim();
    const pwd = document.getElementById('r-pwd').value;
    const pwd2 = document.getElementById('r-pwd2').value;
    
    if (!first || !last || !email || !pwd) { setMsg({ text: 'Please fill in all fields.', type: 'error' }); return; }
    if (!email.toLowerCase().endsWith('@vitstudent.ac.in')) { setMsg({ text: 'Only VIT students (@vitstudent.ac.in) are allowed.', type: 'error' }); return; }
    if (pwd.length < 8) { setMsg({ text: 'Password must be at least 8 characters.', type: 'error' }); return; }
    if (pwd !== pwd2) { setMsg({ text: 'Passwords do not match.', type: 'error' }); return; }
    
    setIsLoading(true);
    setMsg({ text: '', type: '' });
    try {
      const response = await fetch(`${API_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName: first, lastName: last, email, password: pwd }),
      });
      const data = await response.json();
      
      if (!response.ok) {
        setMsg({ text: data.error || 'Registration failed', type: 'error' });
        return;
      }
      
      saveSession(data.token, data.user);
      setMsg({ text: '✓ Account created! Welcome to the network.', type: 'success' });
      window.dispatchEvent(new CustomEvent('auth-success', { detail: { type: 'register', user: data.user } }));
      window.dispatchEvent(new Event('auth-change'));
      setTimeout(() => { navigate('/quiz'); }, 1000);
    } catch (err) {
      setMsg({ text: 'Network error. Please try again later.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0c] p-4 relative overflow-hidden">
      {/* Optional faint grid/bg effect if desired, otherwise purely blank as requested */}
      
      <motion.div 
        className="bg-[#111318] border border-white/10 rounded-2xl p-6 md:p-8 max-w-[440px] w-full shadow-2xl z-10"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", duration: 0.5, bounce: 0.2 }}
      >
        <div className="flex items-center justify-between mb-6 pr-6">
          <div>
            <div className="text-xl font-bold text-white mb-1">
              {tab === 'login' ? 'Welcome back' : 'Join the network'}
            </div>
            <div className="text-sm text-on-surface-variant">
              {tab === 'login' ? 'Sign in to your account' : 'Create your free account'}
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-primary-container/10 flex items-center justify-center border border-primary-container/20">
            <span className="material-symbols-outlined text-primary-container">
              {tab === 'login' ? 'login' : 'group'}
            </span>
          </div>
        </div>

        <div className="flex border-b border-white/10 mb-6">
          <button 
            className={`flex-1 pb-3 text-sm font-medium transition-all flex items-center justify-center gap-2 border-b-2 ${tab === 'login' ? 'border-primary-container text-primary-container' : 'border-transparent text-on-surface-variant hover:text-white'}`}
            onClick={() => handleSwitchTab('login')}
          >
            <span className="material-symbols-outlined text-[18px]">login</span> Sign in
          </button>
          <button 
            className={`flex-1 pb-3 text-sm font-medium transition-all flex items-center justify-center gap-2 border-b-2 ${tab === 'register' ? 'border-primary-container text-primary-container' : 'border-transparent text-on-surface-variant hover:text-white'}`}
            onClick={() => handleSwitchTab('register')}
          >
            <span className="material-symbols-outlined text-[18px]">person_add</span> Register
          </button>
        </div>

        <div className="space-y-4">
          <AnimatePresence mode="wait">
            {tab === 'login' ? (
              <motion.div key="login" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                <div className="mb-4">
                  <label className="block text-xs font-medium text-on-surface-variant mb-2">Email address</label>
                  <input id="l-email" type="email" placeholder="you@example.com" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-all placeholder-white/30" />
                </div>
                <div className="mb-6">
                  <label className="block text-xs font-medium text-on-surface-variant mb-2">Password</label>
                  <div className="relative">
                    <input id="l-pwd" type={showPwd ? "text" : "password"} placeholder="Enter your password" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-all pr-10 placeholder-white/30" />
                    <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-white transition-colors" onClick={() => setShowPwd(!showPwd)}>
                      <span className="material-symbols-outlined text-[18px]">{showPwd ? 'visibility' : 'visibility_off'}</span>
                    </button>
                  </div>
                </div>
                <button onClick={handleLogin} disabled={isLoading} className="w-full bg-primary-container text-background font-bold text-sm py-3 rounded-lg hover:bg-[#ffb033] transition-colors uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed">
                  {isLoading ? 'Signing in...' : 'Sign in to your account'}
                </button>
                {msg.text && (
                  <div className={`mt-4 p-3 rounded-lg text-xs text-center font-medium ${msg.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                    {msg.text}
                  </div>
                )}
                
                <div className="flex items-center gap-3 my-5">
                  <div className="h-px bg-white/10 flex-1"></div>
                  <span className="text-xs text-on-surface-variant">or</span>
                  <div className="h-px bg-white/10 flex-1"></div>
                </div>
                
                <button onClick={() => handleSwitchTab('register')} className="w-full bg-transparent border border-white/20 text-white font-medium text-sm py-3 rounded-lg hover:bg-white/5 transition-colors flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">person_add</span> Create a new account
                </button>
              </motion.div>
            ) : (
              <motion.div key="register" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="block text-xs font-medium text-on-surface-variant mb-2">First name</label>
                    <input id="r-first" type="text" placeholder="Ravi" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-all placeholder-white/30" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-on-surface-variant mb-2">Last name</label>
                    <input id="r-last" type="text" placeholder="Kumar" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-all placeholder-white/30" />
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-xs font-medium text-on-surface-variant mb-2">Email address</label>
                  <input id="r-email" type="email" placeholder="you@example.com" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-all placeholder-white/30" />
                </div>

                <div className="mb-4">
                  <label className="block text-xs font-medium text-on-surface-variant mb-2">Password</label>
                  <div className="relative">
                    <input id="r-pwd" type={showPwd ? "text" : "password"} placeholder="Min. 8 characters" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-all pr-10 placeholder-white/30" />
                    <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-white transition-colors" onClick={() => setShowPwd(!showPwd)}>
                      <span className="material-symbols-outlined text-[18px]">{showPwd ? 'visibility' : 'visibility_off'}</span>
                    </button>
                  </div>
                </div>
                <div className="mb-5">
                  <label className="block text-xs font-medium text-on-surface-variant mb-2">Confirm password</label>
                  <div className="relative">
                    <input id="r-pwd2" type={showPwd2 ? "text" : "password"} placeholder="Repeat password" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-all pr-10 placeholder-white/30" />
                    <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-white transition-colors" onClick={() => setShowPwd2(!showPwd2)}>
                      <span className="material-symbols-outlined text-[18px]">{showPwd2 ? 'visibility' : 'visibility_off'}</span>
                    </button>
                  </div>
                </div>
                
                <button onClick={handleRegister} disabled={isLoading} className="w-full bg-primary-container text-background font-bold text-sm py-3 rounded-lg hover:bg-[#ffb033] transition-colors uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed">
                  {isLoading ? 'Creating account...' : 'Create my account'}
                </button>
                {msg.text && (
                  <div className={`mt-4 p-3 rounded-lg text-xs text-center font-medium ${msg.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                    {msg.text}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
