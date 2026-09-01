import { useState, useEffect, useCallback, useRef } from 'react';
import { Routes, Route, useLocation, useNavigate, useParams } from 'react-router-dom';
import AwsStudentBuilderLoader from './components/AwsStudentBuilderLoader';
import MobilePreloader from './components/MobilePreloader';
import Hero from './components/Hero';
import Marquee from './components/Marquee';
import CoreProtocols from './components/CoreProtocols';
import WhyJoinUs from './components/WhyJoinUs';
import TheBuilders from './components/TheBuilders';
import Callout from './components/Callout';
import Blog from './components/Blog';
import Footer from './components/Footer';
import BlogBedrock from './pages/BlogBedrock';
import BlogLambda from './pages/BlogLambda';
import BlogPredictiveAnalytics from './pages/BlogPredictiveAnalytics';
import BlogGoogleMaps from './pages/BlogGoogleMaps';
import LoginModal from './components/LoginModal';
import GridScanIntro from './components/GridScanIntro';
import StaggeredMenu from './components/StaggeredMenu';
import MacbookScrollSection from './components/MacbookScrollSection';
import awsIcon from './assets/aws_icon.jpeg';
import OfficialGameReceipt from './components/OfficialGameReceipt';

import AdminPage from './pages/AdminPage';
import AccountPage from './pages/AccountPage';
import LoginPage from './pages/LoginPage';
import { checkSessionValidity, getUser, logout } from './utils/auth';
import MysteryBoxHackathon, { MysteryBoxDashboard } from './pages/MysteryBoxHackathon/index.js';
import FlappyBird from './pages/games/FlappyBird/FlappyBird.jsx';
import FruitNinja from './pages/games/FruitNinja/FruitNinja.jsx';
import SnakeGame from './pages/games/SnakeGame/SnakeGame.jsx';
import WordleGame from './pages/games/ASCII-Wordle/src/WordleGame.jsx';
import CrackTheCode from './pages/games/detective and cypher game/CrackTheCode.react.jsx';
import DetectiveCrime from './pages/games/detective and cypher game/DetectiveCrime.react.jsx';
import LevelDevilGame from './pages/games/level-devil/src/LevelDevilGame.jsx';
import MorseGame from './pages/games/Morse-Game/src/MorseGame.jsx';
import PacmanGame from './pages/games/PacmanGame/PacmanGame.jsx';
import MarioKart from './pages/games/MarioKart/MarioKart.jsx';
import WatergirlFireboy from './pages/games/WatergirlFireboy/WatergirlFireboy.jsx';
import AsteroidCommand from './pages/games/AsteroidCommand/AsteroidCommand.jsx';
import GunshotRoulette from './pages/games/GunshotRoulette/GunshotRoulette.jsx';
import HackType from './pages/games/HackType/HackType.jsx';
import GamesPage from './pages/GamesPage';
import { games } from './pages/gamesRegistry';
import { buildOfficialGameReceipt, completeTeamGame, SCORED_TEAM_GAMES, startTeamGame } from './utils/teamGameScoring';

/**
 * Detect mobile viewport (≤768px).
 * Captures the initial value on mount so the loader type
 * doesn't flip mid-animation if the user resizes.
 */
function useIsMobile() {
  const [isMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 768px)').matches;
  });
  return isMobile;
}



function HomePage() {
  return (
    <main>
      <Hero />
      <Marquee />
      {/* MacbookScroll — storytelling bridge between Hero and Events */}
      <MacbookScrollSection />
      <CoreProtocols />
      <WhyJoinUs />
      <TheBuilders />
      <Callout />
      <Blog />
      <Footer />
    </main>
  );
}

function GameRoute({ Component, gameSlug, official = false }) {
  const navigate = useNavigate();
  const [teamGameAttempt, setTeamGameAttempt] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const attemptRef = useRef(null);
  const completionPayloadRef = useRef(null);
  const submissionRef = useRef(null);
  const retrySubmissionRef = useRef(null);

  useEffect(() => {
    if (!official) return undefined;
    let active = true;
    startTeamGame(gameSlug).then((attempt) => {
      if (!active) return;
      attemptRef.current = attempt;
      retrySubmissionRef.current = attempt.retrySubmission || null;
      if (attempt.receipt) setReceipt(buildOfficialGameReceipt(gameSlug, attempt.receipt));
      setTeamGameAttempt(attempt);
    });
    return () => { active = false; };
  }, [gameSlug, official]);

  const handleComplete = useCallback(async (result) => {
    if (!official) return Promise.resolve({ submitted: false });
    if (submissionRef.current) return submissionRef.current;
    completionPayloadRef.current = result;
    setSubmitting(true);
    const submission = completeTeamGame(gameSlug, attemptRef.current, result)
      .then((response) => {
        setReceipt(buildOfficialGameReceipt(gameSlug, response));
        return response;
      })
      .finally(() => setSubmitting(false));
    submissionRef.current = submission;
    return submission;
  }, [gameSlug, official]);

  const retrySubmission = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    const retry = retrySubmissionRef.current
      || (() => completeTeamGame(gameSlug, attemptRef.current, completionPayloadRef.current));
    try {
      const response = await retry();
      setReceipt(buildOfficialGameReceipt(gameSlug, response));
      if (response.submitted) retrySubmissionRef.current = null;
    } finally {
      submissionRef.current = null;
      setSubmitting(false);
    }
  }, [gameSlug, submitting]);

  const game = games.find((entry) => entry.slug === gameSlug);
  const dashboardPath = '/mystery-box-hackathon/dashboard?tab=games';

  if (official && (submitting || receipt)) {
    return (
      <OfficialGameReceipt
        gameTitle={game?.title || gameSlug}
        receipt={receipt}
        submitting={submitting}
        onRetry={retrySubmission}
        onDashboard={() => navigate(dashboardPath)}
        onPractice={() => navigate(game?.path || `/games/${gameSlug}`)}
      />
    );
  }

  if (official && SCORED_TEAM_GAMES.includes(gameSlug) && teamGameAttempt === null) {
    return <main className="min-h-screen bg-[#080b11] text-white grid place-items-center p-6"><p>Checking official team attempt…</p></main>;
  }
  if (official && (teamGameAttempt?.locked || teamGameAttempt?.enabled === false)) {
    return (
      <main className="min-h-screen bg-[#080b11] text-white grid place-items-center p-6 text-center">
        <div><p className="text-[#ff9900] uppercase tracking-widest">Official game unavailable</p><h1 className="text-3xl font-bold mb-4">{teamGameAttempt.error || 'Your team cannot start another official game right now.'}</h1><button className="px-5 py-3 bg-[#ff9900] text-black font-bold rounded" onClick={() => navigate(dashboardPath)}>Back to dashboard</button></div>
      </main>
    );
  }
  return <Component onComplete={official ? handleComplete : undefined} teamGameAttempt={official ? teamGameAttempt : null} onExit={() => navigate(official ? dashboardPath : '/games')} />;
}

function OfficialGameRoute() {
  const { gameSlug } = useParams();
  const Component = gameComponents[gameSlug];
  if (!Component || !SCORED_TEAM_GAMES.includes(gameSlug)) {
    return <main className="min-h-screen bg-[#080b11] text-white grid place-items-center p-6"><p>Official game not found.</p></main>;
  }
  return <GameRoute Component={Component} gameSlug={gameSlug} official />;
}

const gameComponents = {
  'flappy-bird': FlappyBird,
  'fruit-ninja': FruitNinja,
  snake: SnakeGame,
  wordle: WordleGame,
  'crack-the-code': CrackTheCode,
  'detective-crime': DetectiveCrime,
  'level-devil': LevelDevilGame,
  morse: MorseGame,
  pacman: PacmanGame,
  'mario-kart': MarioKart,
  'watergirl-fireboy': WatergirlFireboy,
  'asteroid-command': AsteroidCommand,
  'gunshot-roulette': GunshotRoulette,
  'hack-type': HackType,
};

export default function App() {
  const location = useLocation();
  const isHomePage = location.pathname === '/';
  const isGamesRoute = location.pathname.startsWith('/games');

  // Skip preloader if already shown this session
  const [isLoading, setIsLoading] = useState(() => {
    if (typeof window === 'undefined') return true;
    return !sessionStorage.getItem('preloader-shown');
  });
  const [showIntro, setShowIntro] = useState(false); // GridScan intro stage
  const [introFading, setIntroFading] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const isMobile = useIsMobile();
  const [user, setUser] = useState(() => getUser());

  useEffect(() => {
    const handleAuthChange = () => setUser(getUser());
    window.addEventListener('auth-success', handleAuthChange);
    window.addEventListener('auth-change', handleAuthChange);
    return () => {
      window.removeEventListener('auth-success', handleAuthChange);
      window.removeEventListener('auth-change', handleAuthChange);
    };
  }, []);

  const menuItems = [
    { label: 'Home', ariaLabel: 'Go to home section', link: '#home' },
    { label: 'Events', ariaLabel: 'View our events', link: '#features' },
    { label: 'Why Us', ariaLabel: 'Why join us', link: '#why-join-us' },
    { label: 'Builders', ariaLabel: 'Meet the builders', link: '#builders' },
    { label: 'Blog', ariaLabel: 'Read our blog', link: '#blog' },
    user
      ? { label: 'Account', ariaLabel: 'Manage your account', link: '/account' }
      : { label: 'Join', ariaLabel: 'Join the club', onClick: () => window.dispatchEvent(new Event('open-login-modal')) },
  ];

  const socialItems = [
    { label: 'GitHub', link: 'https://github.com/AWS-Student-Builder-Group-VIT' },
    { label: 'LinkedIn', link: 'https://www.linkedin.com/company/aws-student-builder-group-vit' },
    { label: 'Instagram', link: 'https://www.instagram.com/aws.sbg.vit' },
    ...(user ? [{ label: 'Logout', onClick: () => { logout(); window.dispatchEvent(new Event('auth-change')); } }] : [])
  ];

  // Check session validity on app mount (24h expiry)
  useEffect(() => {
    checkSessionValidity();
  }, []);

  // Track whether all page resources (images, fonts, DOM) are ready
  const [resourcesReady, setResourcesReady] = useState(false);

  useEffect(() => {
    const handleOpenModal = () => setIsLoginModalOpen(true);
    window.addEventListener('open-login-modal', handleOpenModal);
    return () => window.removeEventListener('open-login-modal', handleOpenModal);
  }, []);

  // Wait for all resources: window load + fonts
  useEffect(() => {
    if (!isLoading) return;

    let resolved = false;
    const markReady = () => {
      if (resolved) return;
      resolved = true;
      setResourcesReady(true);
    };

    // Wait for both: full page load (images, scripts) AND fonts
    const onLoad = () => {
      // Fonts may still be loading after window.load
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(markReady);
      } else {
        markReady();
      }
    };

    if (document.readyState === 'complete') {
      onLoad();
    } else {
      window.addEventListener('load', onLoad);
      return () => window.removeEventListener('load', onLoad);
    }
  }, [isLoading]);

  // Desktop: no fixed timer — animation signals completion via onDone

  const handlePreloaderDone = () => {
    const finish = () => {
      sessionStorage.setItem('preloader-shown', '1');
      setIsLoading(false);
      setShowIntro(true); // ← launch GridScan intro
      setIntroFading(false);
    };

    if (resourcesReady) {
      finish();
    } else {
      const check = setInterval(() => {
        if (document.readyState === 'complete') {
          const done = () => {
            clearInterval(check);
            finish();
          };
          if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(done);
          } else {
            done();
          }
        }
      }, 100);
    }
  };

  const handleIntroDone = () => {
    setShowIntro(false);
  };

  return (
    <>
      {isLoading && !isGamesRoute && (
        isMobile
          ? <MobilePreloader onDone={handlePreloaderDone} />
          : <AwsStudentBuilderLoader onDone={handlePreloaderDone} />
      )}
      {showIntro && !isGamesRoute && <GridScanIntro onDone={handleIntroDone} onFadeStart={() => setIntroFading(true)} displayDuration={5} />}
      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />

      {/* StaggeredMenu — fixed overlay, shown only on the homepage */}
      {isHomePage && (
        <StaggeredMenu
          isFixed
          position="right"
          colors={['#1c1a24', '#FF9900']}
          items={menuItems}
          socialItems={socialItems}
          displaySocials={true}
          displayItemNumbering={true}
          logoUrl={awsIcon}
          menuButtonColor="#ffffff"
          openMenuButtonColor="#FF9900"
          accentColor="#FF9900"
          changeMenuColorOnOpen={true}
          closeOnClickAway={true}
        />
      )}

      <div
        className="bg-background text-on-surface bg-grid-pattern min-h-screen relative selection:bg-primary-container selection:text-on-primary-container font-body-md"
        style={{
          transform: (showIntro && !introFading) ? 'scale(0.96)' : 'none',
          opacity: (showIntro && !introFading) ? 0 : 1,
          transition: 'transform 2s cubic-bezier(0.16, 1, 0.3, 1), opacity 1.5s ease-out',
          transformOrigin: 'center center',
        }}
      >
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/blog/aws-bedrock" element={<BlogBedrock />} />
          <Route path="/blog/aws-lambda" element={<BlogLambda />} />
          <Route path="/blog/predictive-analytics" element={<BlogPredictiveAnalytics />} />
          <Route path="/blog/google-maps-traffic" element={<BlogGoogleMaps />} />

          <Route path="/admin" element={<AdminPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/mystery-box-hackathon" element={<MysteryBoxHackathon />} />
          <Route path="/mystery-box-hackathon/dashboard" element={<MysteryBoxDashboard />} />
          <Route path="/mystery-box-hackathon/games/:gameSlug" element={<OfficialGameRoute />} />
          <Route path="/games" element={<GamesPage />} />
          {games.map((game) => <Route key={game.slug} path={game.path} element={<GameRoute Component={gameComponents[game.slug]} gameSlug={game.slug} />} />)}
        </Routes>
      </div>
    </>
  );
}
