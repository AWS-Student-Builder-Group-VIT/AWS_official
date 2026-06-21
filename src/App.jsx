import { useState, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import AwsStudentBuilderLoader from './components/AwsStudentBuilderLoader';
import MobilePreloader from './components/MobilePreloader';
import Hero from './components/Hero';
import Marquee from './components/Marquee';
import About from './components/About';
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
import awsIcon from './assets/aws_icon.jpeg';

import AdminPage from './pages/AdminPage';
import AccountPage from './pages/AccountPage';
import LoginPage from './pages/LoginPage';
import { checkSessionValidity } from './utils/auth';

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

const MENU_ITEMS = [
  { label: 'Home',         ariaLabel: 'Go to home section',    link: '#home' },
  { label: 'About',        ariaLabel: 'Learn about us',         link: '#about' },
  { label: 'Events',       ariaLabel: 'View our events',        link: '#features' },
  { label: 'Why Us',       ariaLabel: 'Why join us',            link: '#why-join-us' },
  { label: 'Builders',     ariaLabel: 'Meet the builders',      link: '#builders' },
  { label: 'Blog',         ariaLabel: 'Read our blog',          link: '#blog' },
];

const SOCIAL_ITEMS = [
  { label: 'GitHub',    link: 'https://github.com/AWS-Student-Builder-Group-VIT' },
  { label: 'LinkedIn',  link: 'https://www.linkedin.com/company/aws-student-builder-group-vit' },
  { label: 'Instagram', link: 'https://www.instagram.com/aws.sbg.vit' },
];

function HomePage() {
  return (
    <main>
      <Hero />
      <Marquee />
      <About />
      <CoreProtocols />
      <WhyJoinUs />
      <TheBuilders />
      <Callout />
      <Blog />
      <Footer />
    </main>
  );
}

export default function App() {
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  // Skip preloader if already shown this session
  const [isLoading, setIsLoading] = useState(() => {
    if (typeof window === 'undefined') return true;
    return !sessionStorage.getItem('preloader-shown');
  });
  const [showIntro, setShowIntro] = useState(false); // GridScan intro stage
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const isMobile = useIsMobile();

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
      {isLoading && (
        isMobile
          ? <MobilePreloader onDone={handlePreloaderDone} />
          : <AwsStudentBuilderLoader onDone={handlePreloaderDone} />
      )}
      {showIntro && <GridScanIntro onDone={handleIntroDone} displayDuration={5} />}
      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />

      {/* StaggeredMenu — fixed overlay, shown only on the homepage */}
      {isHomePage && (
        <StaggeredMenu
          isFixed
          position="right"
          colors={['#1c1a24', '#FF9900']}
          items={MENU_ITEMS}
          socialItems={SOCIAL_ITEMS}
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

      <div className="bg-background text-on-surface bg-grid-pattern min-h-screen relative overflow-x-hidden selection:bg-primary-container selection:text-on-primary-container font-body-md">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/blog/aws-bedrock" element={<BlogBedrock />} />
          <Route path="/blog/aws-lambda" element={<BlogLambda />} />
          <Route path="/blog/predictive-analytics" element={<BlogPredictiveAnalytics />} />
          <Route path="/blog/google-maps-traffic" element={<BlogGoogleMaps />} />

          <Route path="/admin" element={<AdminPage />} />
          <Route path="/account" element={<AccountPage />} />
        </Routes>
      </div>
    </>
  );
}
