import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';

// Global assets (shared across the whole app)
import awsIcon from '../../assets/aws_icon.jpeg';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '225205318470-pn0cdqbs39jg8b60lem10e6fs9vh72q4.apps.googleusercontent.com';

function decodeJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error('Error decoding Google JWT:', e);
    return null;
  }
}

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

const TEAM_STORAGE_KEY = 'mystery-box-hackathon-team';

const MYSTERY_BOX_QUESTIONS = [
  {
    title: 'Serverless Student Portal',
    desc: 'Design a serverless, highly-scalable backend on AWS (Lambda, API Gateway, DynamoDB) that allows student clubs to manage events, registrations, and announcements with zero server costs.',
    points: 150
  },
  {
    title: 'AWS Cost-Optimizer Dashboard',
    desc: 'Create a dashboard app that analyzes AWS billing reports to find idle EC2 instances, underutilized S3 buckets, and provides actionable recommendations to save costs.',
    points: 120
  },
  {
    title: 'AI Study Companion',
    desc: 'Build a web app using Amazon Bedrock and AWS Lambda that allows students to upload syllabus docs or notes and automatically generates interactive quizzes and flashcards.',
    points: 180
  },
  {
    title: 'Cloud Resume Builder with CI/CD',
    desc: 'Design a web app that helps students build their resume and deploys it automatically as a static website on AWS S3/CloudFront, integrated with a mock GitHub Action pipeline.',
    points: 100
  },
  {
    title: 'Real-time Collaborative Whiteboard',
    desc: 'Develop a real-time collaborative whiteboard app using AWS AppSync or WebSockets that allows student teams to map out architectural diagrams synchronously.',
    points: 160
  },
  {
    title: 'Smart Campus Navigation Engine',
    desc: 'Build a campus guide prototype using AWS Location Service and Amazon Lex that helps new students navigate a campus, find classrooms, and ask assistant bots for help.',
    points: 140
  },
  {
    title: 'IoT Smart Energy Monitor',
    desc: 'Design a simulated IoT dashboard using AWS IoT Core that ingests temperature and power data from smart classrooms, visualizes it, and alerts admins when energy waste is detected.',
    points: 130
  },
  {
    title: 'Automated Code Debugger Bot',
    desc: 'Develop an automated code reviewer tool that integrates with a Git repo, runs code analysis via Amazon CodeGuru or Bedrock, and leaves helpful debugging comments on student pull requests.',
    points: 170
  },
  {
    title: 'IVS Stream Hub',
    desc: 'Create a low-latency streaming hub using Amazon IVS (Interactive Video Service) that allows developers to stream technical workshops and embed interactive live chat polls.',
    points: 150
  },
  {
    title: 'Attendance via Face Recognition',
    desc: 'Build a fast attendance system prototype that allows event organizers to take a photo of attendees and verify their registration in real-time using Amazon Rekognition.',
    points: 160
  }
];

const createTeamCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i += 1) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
};

const getMysteryQuestion = () => {
  return MYSTERY_BOX_QUESTIONS[Math.floor(Math.random() * MYSTERY_BOX_QUESTIONS.length)];
};

function MysteryBoxHackathonInner() {
  const navigate = useNavigate();

  const [team, setTeam] = useState(() => {
    if (typeof window === 'undefined') return null;
    try {
      const savedTeam = window.localStorage.getItem(TEAM_STORAGE_KEY);
      return savedTeam ? JSON.parse(savedTeam) : null;
    } catch {
      return null;
    }
  });
  const [myEmail, setMyEmail] = useState(() => {
    if (typeof window === 'undefined') return '';
    return window.sessionStorage.getItem('mystery-box-hackathon-my-email') || '';
  });

  const isMemberOfTeam = team && myEmail && team.members?.some((m) => m.email === myEmail);



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
  const [registerOpen, setRegisterOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [googleUser, setGoogleUser] = useState(null);
  const [googleJoinUser, setGoogleJoinUser] = useState(null);
  const [registerForm, setRegisterForm] = useState({
    email: '',
    regNo: '',
    teamName: '',
    isLeader: true,
  });
  const [joinForm, setJoinForm] = useState({
    email: '',
    regNo: '',
    teamCode: '',
  });
  const [formError, setFormError] = useState('');
  const [joinError, setJoinError] = useState('');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const shouldLockScroll = registerOpen || joinOpen;
    document.body.style.overflow = shouldLockScroll ? 'hidden' : '';

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setRegisterOpen(false);
        setJoinOpen(false);
      }
    };

    if (shouldLockScroll) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [registerOpen, joinOpen]);

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

  const handleGoogleRegisterSuccess = (credentialResponse) => {
    setFormError('');
    if (!credentialResponse?.credential) {
      setFormError('Failed to receive Google credential.');
      return;
    }
    const decoded = decodeJwt(credentialResponse.credential);
    if (!decoded || !decoded.email) {
      setFormError('Failed to parse Google account information.');
      return;
    }
    const email = decoded.email.toLowerCase().trim();
    setGoogleUser({
      email,
      name: decoded.name || 'Participant',
      picture: decoded.picture || '',
      givenName: decoded.given_name || '',
      familyName: decoded.family_name || '',
    });
    setRegisterForm((prev) => ({ ...prev, email }));
  };

  const handleGoogleJoinSuccess = (credentialResponse) => {
    setJoinError('');
    if (!credentialResponse?.credential) {
      setJoinError('Failed to receive Google credential.');
      return;
    }
    const decoded = decodeJwt(credentialResponse.credential);
    if (!decoded || !decoded.email) {
      setJoinError('Failed to parse Google account information.');
      return;
    }
    const email = decoded.email.toLowerCase().trim();
    setGoogleJoinUser({
      email,
      name: decoded.name || 'Participant',
      picture: decoded.picture || '',
      givenName: decoded.given_name || '',
      familyName: decoded.family_name || '',
    });
    setJoinForm((prev) => ({ ...prev, email }));
  };

  const handleRegisterSubmit = async (event) => {
    event.preventDefault();
    setFormError('');

    if (!googleUser || !googleUser.email) {
      setFormError('Please sign in with your Google account first.');
      return;
    }

    const email = googleUser.email.trim().toLowerCase();
    const regNo = registerForm.regNo.trim().toUpperCase();
    const teamName = registerForm.teamName.trim();

    if (!regNo) {
      setFormError('Registration number / Student ID is required.');
      return;
    }

    if (!teamName) {
      setFormError('Team name is required.');
      return;
    }

    if (!registerForm.isLeader) {
      setFormError('Only the team leader can create a team. Please use the Join Team option with a team code.');
      return;
    }

    const newCode = createTeamCode();
    const mysteryQ = getMysteryQuestion();
    const newMembers = [
      {
        email,
        regNo,
        name: googleUser.name,
        picture: googleUser.picture,
        isLeader: true,
      },
    ];

    try {
      const res = await fetch('/api/mystery-box/teams/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: newCode,
          teamName,
          mysteryQuestion: mysteryQ,
          members: newMembers,
          isOpened: false,
          points: 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'Failed to create team.');
        return;
      }

      const createdTeam = data.team;
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem('mystery-box-hackathon-my-email', email);
      }
      setMyEmail(email);
      persistTeam(createdTeam);
      setRegisterForm({ email: '', regNo: '', teamName: '', isLeader: true });
      setGoogleUser(null);
      setRegisterOpen(false);
      navigate('/mystery-box-hackathon/dashboard');
    } catch (err) {
      console.error('Error creating team:', err);
      // Fallback to local
      const localTeam = {
        code: newCode,
        teamName,
        mysteryQuestion: mysteryQ,
        isOpened: false,
        points: 0,
        registeredAt: Date.now(),
        members: newMembers,
      };
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem('mystery-box-hackathon-my-email', email);
      }
      setMyEmail(email);
      persistTeam(localTeam);
      setRegisterForm({ email: '', regNo: '', teamName: '', isLeader: true });
      setGoogleUser(null);
      setRegisterOpen(false);
      navigate('/mystery-box-hackathon/dashboard');
    }
  };

  const handleJoinSubmit = async (event) => {
    event.preventDefault();
    setJoinError('');

    if (!googleJoinUser || !googleJoinUser.email) {
      setJoinError('Please sign in with your Google account first.');
      return;
    }

    const email = googleJoinUser.email.trim().toLowerCase();
    const regNo = joinForm.regNo.trim().toUpperCase();
    const teamCode = joinForm.teamCode.trim().toUpperCase();

    if (!regNo) {
      setJoinError('Registration number / Student ID is required.');
      return;
    }

    if (!teamCode) {
      setJoinError('Please enter the team code.');
      return;
    }

    try {
      const res = await fetch('/api/mystery-box/teams/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamCode,
          member: {
            email,
            regNo,
            name: googleJoinUser.name,
            picture: googleJoinUser.picture,
          }
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setJoinError(data.error || 'That team code does not exist. Please ask your team leader.');
        return;
      }

      const joinedTeam = data.team;
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem('mystery-box-hackathon-my-email', email);
      }
      setMyEmail(email);
      persistTeam(joinedTeam);

      setJoinForm({ email: '', regNo: '', teamCode: '' });
      setGoogleJoinUser(null);
      setJoinOpen(false);
      navigate('/mystery-box-hackathon/dashboard');
    } catch (err) {
      console.error('Error joining team:', err);
      setJoinError('Network error joining team. Please check the code and try again.');
    }
  };



  const stepColors = {
    orange: { bg: 'rgba(255,153,0,0.15)', border: '#FF9900', text: '#FF9900' },
    blue:   { bg: 'rgba(0,168,255,0.15)', border: '#00A8FF', text: '#00A8FF' },
    purple: { bg: 'rgba(124,77,255,0.15)', border: '#7C4DFF', text: '#7C4DFF' },
  };

  /* ── Floating orange squares — same as homepage hero ── */
  const FLOATING_SQUARES = [
    { top: '2%',  left: '8%',  size: 120, delay: 0,    opacity: 0.7  },
    { top: '5%',  right: '12%', size: 80,  delay: 1.2,  opacity: 0.5  },
    { top: '12%', left: '65%',  size: 60,  delay: 2.5,  opacity: 0.35 },
    { top: '18%', left: '3%',   size: 50,  delay: 0.8,  opacity: 0.3  },
    { top: '25%', right: '5%',  size: 100, delay: 1.8,  opacity: 0.5  },
    { top: '30%', left: '45%',  size: 40,  delay: 3.2,  opacity: 0.25 },
    { top: '35%', left: '15%',  size: 70,  delay: 0.5,  opacity: 0.4  },
    { top: '42%', right: '18%', size: 90,  delay: 2.0,  opacity: 0.45 },
    { top: '48%', left: '75%',  size: 55,  delay: 1.5,  opacity: 0.3  },
    { top: '55%', left: '5%',   size: 110, delay: 0.3,  opacity: 0.55 },
    { top: '60%', right: '8%',  size: 45,  delay: 2.8,  opacity: 0.3  },
    { top: '65%', left: '55%',  size: 65,  delay: 1.0,  opacity: 0.35 },
    { top: '72%', left: '20%',  size: 85,  delay: 3.5,  opacity: 0.4  },
    { top: '78%', right: '25%', size: 50,  delay: 0.7,  opacity: 0.3  },
    { top: '85%', left: '10%',  size: 75,  delay: 2.2,  opacity: 0.45 },
    { top: '90%', right: '15%', size: 60,  delay: 1.6,  opacity: 0.35 },
    { top: '95%', left: '40%',  size: 95,  delay: 0.4,  opacity: 0.4  },
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
    <>
      {/* ═══════════ MODALS OUTSIDE MAIN WRAPPER ═══════════ */}
      {registerOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center px-4 pointer-events-auto"
          style={{
            zIndex: 99999,
            background: 'radial-gradient(circle at center, rgba(255,153,0,0.16), rgba(0,0,0,0.86) 42%, rgba(0,0,0,0.95) 100%)',
            backdropFilter: 'blur(6px)',
          }}
          onClick={() => {
            setRegisterOpen(false);
            setFormError('');
          }}
        >
          <div
            className="relative z-10 w-full max-w-md rounded-[28px] border border-[#ffb347]/80 bg-[#120d09] p-6 shadow-[0_0_0_2px_rgba(255,153,0,0.22),0_25px_80px_rgba(0,0,0,0.95)] pointer-events-auto"
            style={{
              background: 'linear-gradient(180deg, rgba(34,23,17,0.98) 0%, rgba(18,13,9,0.98) 100%)',
              boxShadow: '0 0 0 2px rgba(255,153,0,0.24), 0 30px 90px rgba(0,0,0,0.9)',
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-primary-container font-label-sm">Create Team</p>
                <h3 className="mt-2 text-2xl font-headline-md text-on-surface">Register Your Team</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setRegisterOpen(false);
                  setFormError('');
                }}
                className="text-xl text-on-surface-variant transition-colors hover:text-primary-container bg-transparent border-none cursor-pointer"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              {/* Google Auth Step */}
              {!googleUser ? (
                <div className="rounded-2xl border border-[#ff9900]/30 bg-[#221b16]/70 p-5 text-center flex flex-col items-center justify-center space-y-3">
                  <div className="w-10 h-10 rounded-full bg-[#ff9900]/10 flex items-center justify-center border border-[#ff9900]/30 text-[#ff9900]">
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-white font-semibold text-sm">Step 1: Sign in with Google</h4>
                    <p className="text-xs text-on-surface-variant mt-0.5">Use your Google account (VIT or External)</p>
                  </div>
                  <div className="w-full flex justify-center pt-2">
                    <GoogleLogin
                      onSuccess={handleGoogleRegisterSuccess}
                      onError={() => setFormError('Google sign in was cancelled or failed.')}
                      theme="filled_black"
                      shape="pill"
                      size="large"
                      text="continue_with"
                      width="100%"
                    />
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    {googleUser.picture ? (
                      <img src={googleUser.picture} alt="Avatar" className="w-9 h-9 rounded-full border border-emerald-400/50 object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold text-xs flex-shrink-0">
                        {googleUser.name?.charAt(0) || 'V'}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-white truncate">{googleUser.name}</span>
                        <span className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1 py-0.2 rounded font-mono font-medium flex-shrink-0">✓ Verified</span>
                      </div>
                      <p className="text-[11px] text-emerald-200/80 font-mono mt-0.5 truncate">{googleUser.email}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setGoogleUser(null); setRegisterForm(prev => ({ ...prev, email: '' })); }}
                    className="text-xs text-white/50 hover:text-red-400 underline cursor-pointer bg-transparent border-none ml-2 flex-shrink-0"
                  >
                    Change
                  </button>
                </div>
              )}

              {/* Team Registration Form (Enabled after Google Auth) */}
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div>
                  <label className="mb-1 block text-[12px] uppercase tracking-[0.16em] text-on-surface-variant font-label-sm">Registration No. / College ID</label>
                  <input
                    type="text"
                    value={registerForm.regNo}
                    onChange={(event) => setRegisterForm({ ...registerForm, regNo: event.target.value })}
                    className="w-full rounded-xl border border-[#ff9900]/30 bg-[#221b16] px-3 py-2.5 text-sm text-white outline-none transition focus:border-[#ff9900] focus:ring-2 focus:ring-[#ff9900]/25 uppercase font-mono placeholder:normal-case placeholder:font-sans"
                    placeholder="e.g. 22BCE1234 or College Roll No."
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[12px] uppercase tracking-[0.16em] text-on-surface-variant font-label-sm">Team Name</label>
                  <input
                    type="text"
                    value={registerForm.teamName}
                    onChange={(event) => setRegisterForm({ ...registerForm, teamName: event.target.value })}
                    className="w-full rounded-xl border border-[#ff9900]/30 bg-[#221b16] px-3 py-2.5 text-sm text-white outline-none transition focus:border-[#ff9900] focus:ring-2 focus:ring-[#ff9900]/25"
                    placeholder="Cloud Chaos Crew"
                    required
                  />
                </div>

                <label className="flex items-center gap-3 rounded-xl border border-[#ff9900]/20 bg-[#221b16] px-3 py-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={registerForm.isLeader}
                    onChange={(event) => setRegisterForm({ ...registerForm, isLeader: event.target.checked })}
                    className="h-4 w-4 accent-[#ff9900]"
                  />
                  <span className="text-sm text-white">I am the team leader</span>
                </label>

                {formError && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 font-medium">
                    ⚠️ {formError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!googleUser}
                  className={`w-full rounded-xl px-4 py-3 text-sm font-headline-md uppercase tracking-[0.18em] transition border-none cursor-pointer ${
                    googleUser 
                      ? 'bg-primary-container text-background hover:bg-primary shadow-[0_0_20px_rgba(255,153,0,0.3)]' 
                      : 'bg-white/10 text-white/40 cursor-not-allowed'
                  }`}
                >
                  {googleUser ? 'Create Team →' : 'Sign in with Google First'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {joinOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center px-4 pointer-events-auto"
          style={{
            zIndex: 99999,
            background: 'radial-gradient(circle at center, rgba(255,153,0,0.16), rgba(0,0,0,0.86) 42%, rgba(0,0,0,0.95) 100%)',
            backdropFilter: 'blur(6px)',
          }}
          onClick={() => {
            setJoinOpen(false);
            setJoinError('');
          }}
        >
          <div
            className="relative z-10 w-full max-w-md rounded-[28px] border border-[#ffb347]/80 bg-[#120d09] p-6 shadow-[0_0_0_2px_rgba(255,153,0,0.22),0_25px_80px_rgba(0,0,0,0.95)] pointer-events-auto"
            style={{
              background: 'linear-gradient(180deg, rgba(34,23,17,0.98) 0%, rgba(18,13,9,0.98) 100%)',
              boxShadow: '0 0 0 2px rgba(255,153,0,0.24), 0 30px 90px rgba(0,0,0,0.9)',
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-primary-container font-label-sm">Join Team</p>
                <h3 className="mt-2 text-2xl font-headline-md text-on-surface">Enter Team Code</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setJoinOpen(false);
                  setJoinError('');
                }}
                className="text-xl text-on-surface-variant transition-colors hover:text-primary-container bg-transparent border-none cursor-pointer"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              {/* Google Auth Step */}
              {!googleJoinUser ? (
                <div className="rounded-2xl border border-[#ff9900]/30 bg-[#221b16]/70 p-5 text-center flex flex-col items-center justify-center space-y-3">
                  <div className="w-10 h-10 rounded-full bg-[#ff9900]/10 flex items-center justify-center border border-[#ff9900]/30 text-[#ff9900]">
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-white font-semibold text-sm">Step 1: Sign in with Google</h4>
                    <p className="text-xs text-on-surface-variant mt-0.5">Use your Google account (VIT or External)</p>
                  </div>
                  <div className="w-full flex justify-center pt-2">
                    <GoogleLogin
                      onSuccess={handleGoogleJoinSuccess}
                      onError={() => setJoinError('Google sign in was cancelled or failed.')}
                      theme="filled_black"
                      shape="pill"
                      size="large"
                      text="continue_with"
                      width="100%"
                    />
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    {googleJoinUser.picture ? (
                      <img src={googleJoinUser.picture} alt="Avatar" className="w-9 h-9 rounded-full border border-emerald-400/50 object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold text-xs flex-shrink-0">
                        {googleJoinUser.name?.charAt(0) || 'V'}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-white truncate">{googleJoinUser.name}</span>
                        <span className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1 py-0.2 rounded font-mono font-medium flex-shrink-0">✓ Verified</span>
                      </div>
                      <p className="text-[11px] text-emerald-200/80 font-mono mt-0.5 truncate">{googleJoinUser.email}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setGoogleJoinUser(null); setJoinForm(prev => ({ ...prev, email: '' })); }}
                    className="text-xs text-white/50 hover:text-red-400 underline cursor-pointer bg-transparent border-none ml-2 flex-shrink-0"
                  >
                    Change
                  </button>
                </div>
              )}

              {/* Join Form (Enabled after Google Auth) */}
              <form onSubmit={handleJoinSubmit} className="space-y-4">
                <div>
                  <label className="mb-1 block text-[12px] uppercase tracking-[0.16em] text-on-surface-variant font-label-sm">Registration No. / College ID</label>
                  <input
                    type="text"
                    value={joinForm.regNo}
                    onChange={(event) => setJoinForm({ ...joinForm, regNo: event.target.value })}
                    className="w-full rounded-xl border border-[#ff9900]/30 bg-[#221b16] px-3 py-2.5 text-sm text-white outline-none transition focus:border-[#ff9900] focus:ring-2 focus:ring-[#ff9900]/25 uppercase font-mono placeholder:normal-case placeholder:font-sans"
                    placeholder="e.g. 22BCE9876 or College Roll No."
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[12px] uppercase tracking-[0.16em] text-on-surface-variant font-label-sm">Team Code</label>
                  <input
                    type="text"
                    value={joinForm.teamCode}
                    onChange={(event) => setJoinForm({ ...joinForm, teamCode: event.target.value })}
                    className="w-full rounded-xl border border-[#ff9900]/30 bg-[#221b16] px-3 py-2.5 text-sm text-white outline-none transition focus:border-[#ff9900] focus:ring-2 focus:ring-[#ff9900]/25 uppercase font-mono tracking-wider placeholder:normal-case placeholder:tracking-normal placeholder:font-sans"
                    placeholder="e.g. 7X9K2L"
                    required
                  />
                </div>

                {joinError && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 font-medium">
                    ⚠️ {joinError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!googleJoinUser}
                  className={`w-full rounded-xl px-4 py-3 text-sm font-headline-md uppercase tracking-[0.18em] transition border-none cursor-pointer ${
                    googleJoinUser 
                      ? 'bg-primary-container text-background hover:bg-primary shadow-[0_0_20px_rgba(255,153,0,0.3)]' 
                      : 'bg-white/10 text-white/40 cursor-not-allowed'
                  }`}
                >
                  {googleJoinUser ? 'Join Team →' : 'Sign in with Google First'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ MAIN PAGE CONTAINER ═══════════ */}
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
        <nav className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-white/5 flex justify-between items-center px-container-padding py-3.5">
          <div className="flex items-center gap-2">
            <img src={awsIcon} alt="AWS Student Builder Club" className="w-8 h-8 rounded-full object-cover" />
            <span className="font-headline-md text-label-md text-primary-container uppercase tracking-widest">AWS Student Builder Club</span>
          </div>
          <div className="hidden md:flex gap-7">
            {['How It Works', 'Points', 'Chaos', 'Prizes'].map((link) => (
              <a
                key={link}
                href={`#${link.toLowerCase().replace(/ /g, '-')}`}
                className="text-[13px] text-on-surface-variant hover:text-primary-container transition-colors duration-200 font-label-sm no-underline"
              >
                {link}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-3">
            {isMemberOfTeam ? (
              <button
                type="button"
                onClick={() => navigate('/mystery-box-hackathon/dashboard')}
                className="bg-primary-container text-background px-5 py-2 text-[13px] font-headline-md uppercase tracking-widest border-0 cursor-pointer hover:bg-primary transition-colors"
              >
                Go to Dashboard
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setJoinOpen(true)}
                  className="border border-white/10 bg-transparent px-4 py-2 text-[11px] font-headline-md uppercase tracking-[0.18em] text-on-surface transition-colors hover:border-primary-container hover:text-primary-container cursor-pointer"
                >
                  Join Team
                </button>
                <button
                  type="button"
                  onClick={() => setRegisterOpen(true)}
                  className="bg-primary-container text-background px-5 py-2 text-[13px] font-headline-md uppercase tracking-widest border-0 cursor-pointer hover:bg-primary transition-colors"
                >
                  Register Now
                </button>
              </>
            )}
          </div>
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
              <h1 className="font-headline-xl text-on-surface leading-[1.05] mb-4 uppercase tracking-widest flex flex-col items-start relative z-10">
                <span className="text-[clamp(42px,8vw,96px)]">Mystery</span>
                <span className="text-[clamp(42px,8vw,96px)]">Box</span>
                <span className="text-[clamp(42px,8vw,96px)] text-primary-container" style={{ textShadow: '0 0 30px rgba(255,153,0,0.4)' }}>
                  <TypeWriter words={['Hackathon', 'Hack It']} typingDelay={120} />
                </span>
              </h1>

              <p className="text-[clamp(18px,2.5vw,24px)] text-primary-container font-headline-md mb-5 uppercase tracking-widest relative z-10">
                Build. Adapt. Survive.
              </p>

              <p className="text-on-surface-variant text-body-md font-body-md mb-9 max-w-[480px] relative z-10">
                A hackathon where coding skills, strategy, teamwork, and adaptability matter equally.
                Your topic arrives in a box. Your fate arrives in chaos.
              </p>

              <div className="flex gap-3.5 flex-wrap relative z-10">
                <button
                  type="button"
                  onClick={() => setRegisterOpen(true)}
                  className="bg-primary-container text-background px-7 py-3.5 font-bold text-[15px] font-headline-md uppercase tracking-widest border-0 cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(255,153,0,0.4)] hover:bg-primary transition-all"
                >
                  Register Now →
                </button>
                <button
                  type="button"
                  onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
                  className="bg-transparent text-on-surface px-7 py-3.5 font-semibold text-[15px] font-headline-md uppercase tracking-widest cursor-pointer border border-white/10 hover:border-primary-container hover:text-primary-container transition-all"
                >
                  Learn More
                </button>
              </div>

              {/* Stats */}
              <div className="flex gap-8 mt-10 flex-wrap relative z-10">
                {[
                  { val: '24h', label: 'Duration', color: '#FF9900' },
                  { val: '∞', label: 'Possibilities', color: '#00A8FF' },
                  { val: '7', label: 'Chaos Events', color: '#7C4DFF' },
                ].map((s) => (
                  <div key={s.label}>
                    <div className="text-[28px] font-bold font-headline-xl tracking-widest" style={{ color: s.color === '#FF9900' ? 'var(--color-primary-container)' : s.color }}>{s.val}</div>
                    <div className="text-[12px] text-on-surface-variant font-label-sm uppercase tracking-widest">{s.label}</div>
                  </div>
                ))}
              </div>
            </FadeInSection>

            <FadeInSection delay={0.2} className="flex items-center justify-center relative z-10">
              <MysteryBoxSVG />
            </FadeInSection>
          </div>
        </section>



        <Divider />

        {/* ═══════════ HOW IT WORKS ═══════════ */}
        <section className="py-20 px-container-padding max-w-[1100px] mx-auto relative z-10" id="how-it-works">
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
        <section className="relative z-10" style={{ background: 'linear-gradient(135deg, rgba(255,153,0,0.03), rgba(255,153,0,0.01))' }}>
          <div className="py-20 px-6 max-w-[1100px] mx-auto">
            <FadeInSection className="text-center">
              <SectionLabel>Core Rules</SectionLabel>
              <SectionTitle>
                Not Your <span className="text-primary-container" style={{ textShadow: '0 0 30px rgba(255,153,0,0.4)' }}>Ordinary</span> Hackathon
              </SectionTitle>
              <SectionSub center>No templates. No pre-built repos. Pure raw innovation under pressure.</SectionSub>
            </FadeInSection>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-10">
              {RULES.map((rule, i) => (
                <FadeInSection key={i} delay={i * 0.08}>
                  <div className="relative overflow-hidden border border-white/[0.08] p-7"
                       style={{
                         background: 'linear-gradient(135deg, rgba(255,153,0,0.05), rgba(255,153,0,0.02))',
                         borderRadius: '2px',
                       }}>
                    <div className="absolute top-0 left-0 right-0 h-[2px]"
                         style={{ background: 'linear-gradient(90deg, #FF9900, #ff6b00)' }} />
                    <div className="inline-block px-2.5 py-0.5 text-[10px] font-bold tracking-[1px] uppercase mb-3 font-label-sm"
                         style={{ background: 'rgba(255,80,80,0.15)', border: '1px solid rgba(255,80,80,0.3)', color: '#ff5050' }}>
                      ⚡ RULE
                    </div>
                    <div className="text-[28px] mb-3.5">{rule.icon}</div>
                    <h4 className="text-[17px] font-headline-md text-on-surface mb-2 uppercase tracking-widest">{rule.title}</h4>
                    <p className="text-[13px] text-on-surface-variant font-body-md">{rule.desc}</p>
                  </div>
                </FadeInSection>
              ))}
            </div>
          </div>
        </section>

        <Divider />

        {/* ═══════════ POINTS SYSTEM ═══════════ */}
        <section className="py-20 px-6 max-w-[1100px] mx-auto relative z-10" id="points">
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
              <div className="flex items-center justify-between flex-wrap gap-3 mb-7">
                <div>
                  <div className="text-[12px] text-on-surface-variant tracking-[2px] uppercase font-label-sm">Your Team Score</div>
                  <div className="text-[48px] font-bold text-primary-container font-headline-xl leading-none">
                    {team ? (team.points || 0) : 0}
                  </div>
                </div>
                <div className="flex gap-2 items-center">
                  <span className="text-[12px] text-on-surface-variant font-label-sm">Level</span>
                  <span className="text-[12px] font-semibold px-3 py-1 font-label-sm"
                        style={{ background: 'rgba(255,153,0,0.2)', border: '1px solid rgba(255,153,0,0.4)', color: 'var(--color-primary-container)' }}>
                    Rookie
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
                {POINTS.map((p, i) => (
                  <div key={i} className="flex items-center gap-3 bg-white/[0.03] border border-white/[0.06] p-4"
                       style={{ borderRadius: '2px' }}>
                    <div className="w-9 h-9 flex items-center justify-center text-[16px] flex-shrink-0"
                         style={{ background: `${p.color}22`, borderRadius: '2px' }}>
                      {p.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[18px] font-bold text-primary-container font-headline-md">{p.val}</div>
                      <div className="text-[11px] text-on-surface-variant font-label-sm">{p.name}</div>
                      <div className="h-1 bg-white/[0.08] mt-1.5 overflow-hidden" style={{ borderRadius: '1px' }}>
                        <div className="h-full transition-all duration-1000" style={{ width: `${p.pct}%`, background: p.color, borderRadius: '1px' }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </FadeInSection>
        </section>

        <Divider />

        {/* ═══════════ POINT SHOP ═══════════ */}
        <section className="relative z-10" style={{ background: 'linear-gradient(135deg, rgba(255,153,0,0.04), rgba(255,153,0,0.02))' }}>
          <div className="py-20 px-6 max-w-[1100px] mx-auto">
            <FadeInSection>
              <SectionLabel>Point Shop</SectionLabel>
              <SectionTitle>
                Spend Smart. <span className="text-tertiary">Win Smarter.</span>
              </SectionTitle>
              <SectionSub>Convert your earned points into competitive advantages. Every purchase is a strategic decision.</SectionSub>
            </FadeInSection>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-8">
              {SHOP_ITEMS.map((item, i) => (
                <FadeInSection key={i} delay={i * 0.06}>
                  <div className="p-6 border transition-all duration-200 hover:-translate-y-1 hover:border-[rgba(255,153,0,0.5)] cursor-default"
                       style={{
                         background: 'linear-gradient(135deg, rgba(255,153,0,0.08), rgba(255,153,0,0.03))',
                         border: '1px solid rgba(255,153,0,0.25)',
                         borderRadius: '2px',
                       }}>
                    <span className="inline-block px-3 py-1 text-[13px] font-bold mb-3.5 font-label-sm"
                          style={{ background: 'rgba(255,153,0,0.15)', border: '1px solid rgba(255,153,0,0.3)', color: 'var(--color-primary-container)', borderRadius: '20px' }}>
                      {item.price}
                    </span>
                    <h4 className="text-[15px] text-on-surface mb-2 font-headline-md uppercase tracking-widest">{item.title}</h4>
                    <p className="text-[13px] text-on-surface-variant font-body-md">{item.desc}</p>
                  </div>
                </FadeInSection>
              ))}
            </div>
          </div>
        </section>

        <Divider />

        {/* ═══════════ MYSTERY BOX ═══════════ */}
        <section className="py-20 px-6 max-w-[1100px] mx-auto relative z-10">
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

          <FadeInSection delay={0.2}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-[11px] tracking-[2px] uppercase font-semibold mb-3.5 font-label-sm" style={{ color: '#ffcc00' }}>
                  🏆 Rewards
                </p>
                <div className="flex flex-col gap-2.5">
                  {REWARDS.map((r, i) => (
                    <div key={i} className="p-5 border"
                         style={{
                           background: 'linear-gradient(135deg, rgba(255,153,0,0.1), rgba(255,200,0,0.05))',
                           border: '1px solid rgba(255,153,0,0.3)',
                           borderRadius: '2px',
                         }}>
                      <div className="text-[10px] tracking-[2px] uppercase font-bold mb-2 font-label-sm" style={{ color: '#ffcc00' }}>✦ REWARD</div>
                      <div className="text-[14px] font-semibold text-on-surface font-headline-md">{r}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[11px] tracking-[2px] uppercase font-semibold mb-3.5 font-label-sm" style={{ color: '#ff4466' }}>
                  💀 Twists
                </p>
                <div className="flex flex-col gap-2.5">
                  {TWISTS.map((t, i) => (
                    <div key={i} className="p-5 border"
                         style={{
                           background: 'linear-gradient(135deg, rgba(255,50,50,0.08), rgba(200,0,200,0.05))',
                           border: '1px solid rgba(255,50,50,0.2)',
                           borderRadius: '2px',
                         }}>
                      <div className="text-[10px] tracking-[2px] uppercase font-bold mb-2 font-label-sm" style={{ color: '#ff4466' }}>⚡ TWIST</div>
                      <div className="text-[14px] font-semibold text-on-surface font-headline-md">{t}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </FadeInSection>
        </section>

        <Divider />

        {/* ═══════════ CHAOS MODE ═══════════ */}
        <section id="chaos" className="relative z-10" style={{ background: 'linear-gradient(135deg, rgba(255,0,0,0.04), rgba(200,0,0,0.02))' }}>
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
                    <span className="absolute -top-2.5 -right-2.5 text-[60px] opacity-[0.04] pointer-events-none select-none">⚠</span>
                    <div className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[1.5px] uppercase mb-2.5 font-label-sm" style={{ color: '#ff5050' }}>
                      <span className="w-1.5 h-1.5 rounded-full bg-[#ff5050] animate-pulse" />
                      INCOMING EVENT
                    </div>
                    <h4 className="text-[15px] font-headline-md text-on-surface mb-1.5 uppercase tracking-widest">{evt.icon} {evt.title}</h4>
                    <p className="text-[12px] text-on-surface-variant font-body-md">{evt.desc}</p>
                  </div>
                </FadeInSection>
              ))}
            </div>
          </div>
        </section>

        <Divider />

        {/* ═══════════ WHEEL OF FORTUNE ═══════════ */}
        <section className="py-20 px-6 max-w-[1100px] mx-auto relative z-10">
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
        <section id="prizes" className="relative z-10" style={{ background: 'linear-gradient(135deg, rgba(255,153,0,0.04), rgba(255,153,0,0.02))' }}>
          <div className="py-20 px-6 max-w-[1100px] mx-auto">
            <FadeInSection>
              <SectionLabel>Exclusive Rewards</SectionLabel>
              <SectionTitle>
                Legendary <span className="text-primary-container" style={{ textShadow: '0 0 30px rgba(255,153,0,0.4)' }}>Rewards</span>
              </SectionTitle>
              <SectionSub>Only the wheel can unlock these. Mythic rarity. Game-changing power.</SectionSub>
            </FadeInSection>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-8">
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
                  <div className="text-[32px] mb-3">🥇</div>
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
                  <div className="text-[32px] mb-3">🃏</div>
                  <h3 className="text-[22px] mb-4 font-headline-md uppercase tracking-widest" style={{ color: '#b24dff' }}>Wildcard Advantage</h3>
                  <p className="text-[13px] text-on-surface-variant mb-4 font-body-md">Choose any one of the following advantages:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {['Remove One Penalty', '+100 Points', 'Additional Hint', 'Extra Pitch Time'].map(opt => (
                      <div key={opt} className="p-2.5 text-[13px] text-on-surface border text-center"
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
        <section className="py-20 px-6 max-w-[1100px] mx-auto relative z-10">
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
                  <div className="text-[32px] mb-2.5">{p.icon}</div>
                  <div className="text-[20px] font-bold font-headline-xl mb-1" style={{ color: '#ff4444' }}>{p.val}</div>
                  <div className="text-[13px] text-on-surface-variant font-label-sm">{p.name}</div>
                </div>
              </FadeInSection>
            ))}
          </div>
        </section>

        <Divider />

        {/* ═══════════ SECOND CHANCE ARENA ═══════════ */}
        <section className="relative z-10" style={{ background: 'radial-gradient(ellipse at center, rgba(255,50,50,0.07), transparent 60%)' }}>
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
                  ⚔️ ARENA ⚔️
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
          className="text-center py-24 px-6 relative z-10"
          style={{
            background: 'radial-gradient(ellipse at 50% 0%, rgba(255,153,0,0.12), transparent 60%), radial-gradient(ellipse at 50% 100%, rgba(255,153,0,0.1), transparent 60%)',
          }}
        >
          <FadeInSection>
            <div className="text-[64px] mb-4">🏆</div>
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

            <button
              type="button"
              onClick={() => setRegisterOpen(true)}
              className="bg-primary-container text-background px-10 py-4 font-bold text-[17px] font-headline-md uppercase tracking-widest border-0 cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(255,153,0,0.4)] hover:bg-primary transition-all rounded-md"
            >
              Register Now →
            </button>
          </FadeInSection>
        </section>

        {/* ═══════════ FOOTER ═══════════ */}
        <footer className="border-t border-white/10 max-w-[1100px] mx-auto px-6 py-8 flex justify-between items-center flex-wrap gap-3 relative z-10">
          <div className="flex items-center gap-2">
            <img src={awsIcon} alt="AWS Student Builder Club" className="w-5 h-5 rounded-full object-cover" />
            <span className="font-headline-md text-label-md text-primary-container uppercase tracking-widest">AWS Student Builder Club</span>
          </div>
          <div className="text-[13px] text-on-surface-variant font-label-sm uppercase tracking-widest">Mystery Box Hackathon — Build. Adapt. Survive.</div>
          <div className="text-[13px] text-on-surface-variant font-label-sm uppercase tracking-widest">© 2026 AWS Student Builder Club</div>
        </footer>

      </div>
    </>
  );
}

export default function MysteryBoxHackathon(props) {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <MysteryBoxHackathonInner {...props} />
    </GoogleOAuthProvider>
  );
}