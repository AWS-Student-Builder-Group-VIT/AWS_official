import { lazy, Suspense, useState, useEffect } from 'react';
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
import LoginModal from './components/LoginModal';
import StaggeredMenu from './components/StaggeredMenu';
import awsIcon from './assets/aws_icon.jpeg';

import { checkSessionValidity, getUser, logout } from './utils/auth';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const AccountPage = lazy(() => import('./pages/AccountPage'));
const BlogBedrock = lazy(() => import('./pages/BlogBedrock'));
const BlogLambda = lazy(() => import('./pages/BlogLambda'));
const BlogPredictiveAnalytics = lazy(() => import('./pages/BlogPredictiveAnalytics'));
const BlogGoogleMaps = lazy(() => import('./pages/BlogGoogleMaps'));
const GamesPage = lazy(() => import('./pages/GamesPage'));
const GridScanIntro = lazy(() => import('./components/GridScanIntro'));
const QuizPage = lazy(() => import('./pages/quiz/index.jsx'));
const RecruitmentApp = lazy(() => import('./recruitment/Recruitment.jsx'));

const gameComponents = {
  'flappy-bird': lazy(() => import('./pages/games/FlappyBird/FlappyBird.jsx')),
  'fruit-ninja': lazy(() => import('./pages/games/FruitNinja/FruitNinja.jsx')),
  snake: lazy(() => import('./pages/games/SnakeGame/SnakeGame.jsx')),
  wordle: lazy(() => import('./pages/games/ASCII-Wordle/src/WordleGame.jsx')),
  'crack-the-code': lazy(() => import('./pages/games/detective and cypher game/CrackTheCode.react.jsx')),
  'level-devil': lazy(() => import('./pages/games/level-devil/src/LevelDevilGame.jsx')),
  morse: lazy(() => import('./pages/games/Morse-Game/src/MorseGame.jsx')),
  pacman: lazy(() => import('./pages/games/PacmanGame/PacmanGame.jsx')),
  'mario-kart': lazy(() => import('./pages/games/MarioKart/MarioKart.jsx')),
  'asteroid-command': lazy(() => import('./pages/games/AsteroidCommand/AsteroidCommand.jsx')),
  'gunshot-roulette': lazy(() => import('./pages/games/GunshotRoulette/GunshotRoulette.jsx')),
  'hack-type': lazy(() => import('./pages/games/HackType/HackType.jsx')),
};

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
      <CoreProtocols />
      <WhyJoinUs />
      <TheBuilders />
      <Callout />
      <Blog />
      <Footer />
    </main>
  );
}

function GameRoute({ Component }) {
  const navigate = useNavigate();
  return <Component onExit={() => navigate('/games')} />;
}

function GamePageRoute() {
  const { gameSlug } = useParams();
  const Component = gameComponents[gameSlug];
  if (!Component) return <RouteLoading />;
  return <GameRoute Component={Component} />;
}

function RouteLoading() {
  return (
    <main className="min-h-screen bg-[#080b11] text-[#ff9900] grid place-items-center p-6">
      <p className="uppercase tracking-[0.2em] text-sm animate-pulse">Loading AWS experience…</p>
    </main>
  );
}

function RecruitmentRedirect() {
  useEffect(() => {
    const configuredUrl = import.meta.env.VITE_RECRUITMENT_URL?.trim();
    const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);
    const target = configuredUrl || (isLocal
      ? `${window.location.protocol}//${window.location.hostname}:3001/recruitment`
      : null);

    if (target) window.location.replace(target);
  }, []);

  const hasProductionUrl = Boolean(import.meta.env.VITE_RECRUITMENT_URL?.trim());
  const isLocal = typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname);

  if (!hasProductionUrl && !isLocal) {
    return (
      <main className="min-h-screen bg-[#080b11] text-white grid place-items-center p-6">
        <div className="max-w-lg border border-white/10 bg-white/5 p-8">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#ff9900]">Recruitment portal</p>
          <h1 className="mt-4 text-2xl font-semibold">Portal URL is not configured</h1>
          <p className="mt-3 text-sm leading-6 text-white/65">
            Set VITE_RECRUITMENT_URL to the deployed recruitment application URL and rebuild the main site.
          </p>
        </div>
      </main>
    );
  }

  return <RouteLoading />;
}

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const isHomePage = location.pathname === '/';
  const isGamesRoute = location.pathname.startsWith('/games');

  const [isLoading, setIsLoading] = useState(() => {
    if (typeof window === 'undefined') return true;
    return !sessionStorage.getItem('preloader-shown');
  });
  const [showIntro, setShowIntro] = useState(false);
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
    {
      label: 'Join Cloud',
      ariaLabel: 'Join Cloud recruitment',
      link: '/recruitment',
      onClick: (e) => {
        e?.preventDefault();
        navigate('/recruitment');
      },
    },
    ...(user
      ? [
          {
            label: 'Account',
            ariaLabel: 'Manage your account',
            link: '/account',
            onClick: (e) => {
              e?.preventDefault();
              navigate('/account');
            },
          },
        ]
      : []),
  ];

  const socialItems = [
    { label: 'GitHub', link: 'https://github.com/AWS-Student-Builder-Group-VIT' },
    { label: 'LinkedIn', link: 'https://www.linkedin.com/company/awsbuilder-vit/' },
    { label: 'Instagram', link: 'https://www.instagram.com/awsbuilder_vit' },
    ...(user ? [{ label: 'Logout', onClick: () => { logout(); window.dispatchEvent(new Event('auth-change')); } }] : [])
  ];

  useEffect(() => {
    checkSessionValidity();
  }, []);

  const [resourcesReady, setResourcesReady] = useState(false);

  useEffect(() => {
    const handleOpenModal = () => setIsLoginModalOpen(true);
    window.addEventListener('open-login-modal', handleOpenModal);
    return () => window.removeEventListener('open-login-modal', handleOpenModal);
  }, []);

  useEffect(() => {
    if (!isLoading) return;

    let resolved = false;
    const markReady = () => {
      if (resolved) return;
      resolved = true;
      setResourcesReady(true);
    };

    const onLoad = () => {
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

  const handlePreloaderDone = () => {
    const finish = () => {
      sessionStorage.setItem('preloader-shown', '1');
      setIsLoading(false);
      setShowIntro(true);
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
      {showIntro && !isGamesRoute && (
        <Suspense fallback={null}>
          <GridScanIntro onDone={handleIntroDone} onFadeStart={() => setIntroFading(true)} displayDuration={5} />
        </Suspense>
      )}
      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />

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
        <Suspense fallback={<RouteLoading />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/blog/aws-bedrock" element={<BlogBedrock />} />
            <Route path="/blog/aws-lambda" element={<BlogLambda />} />
            <Route path="/blog/predictive-analytics" element={<BlogPredictiveAnalytics />} />
            <Route path="/blog/google-maps-traffic" element={<BlogGoogleMaps />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/quiz" element={<QuizPage />} />
            <Route path="/account" element={<AccountPage />} />
            <Route path="/recruitment/*" element={<RecruitmentApp />} />
            <Route path="/games" element={<GamesPage />} />
            <Route path="/games/:gameSlug" element={<GamePageRoute />} />
          </Routes>
        </Suspense>
      </div>
    </>
  );
}
