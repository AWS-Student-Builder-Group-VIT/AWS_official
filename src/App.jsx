import { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import AwsStudentBuilderLoader from './components/AwsStudentBuilderLoader';
import MobilePreloader from './components/MobilePreloader';
import Navbar from './components/Navbar';
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
import AwsQuiz from './pages/AwsQuiz';
import QuizHub from './pages/QuizHub';
import CaseStudyQuiz from './pages/CaseStudyQuiz';
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

function HomePage() {
  return (
    <>
      <Navbar />
      <main className="pt-20">
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
    </>
  );
}

export default function App() {
  // Skip preloader if already shown this session
  const [isLoading, setIsLoading] = useState(() => {
    if (typeof window === 'undefined') return true;
    return !sessionStorage.getItem('preloader-shown');
  });
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

  // Shared dismissal logic for both desktop and mobile
  const handlePreloaderDone = () => {
    if (resourcesReady) {
      sessionStorage.setItem('preloader-shown', '1');
      setIsLoading(false);
    } else {
      // Animation finished but resources aren't ready — poll until they are
      const check = setInterval(() => {
        if (document.readyState === 'complete') {
          const finish = () => {
            clearInterval(check);
            sessionStorage.setItem('preloader-shown', '1');
            setIsLoading(false);
          };
          if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(finish);
          } else {
            finish();
          }
        }
      }, 100);
    }
  };

  return (
    <>
      {isLoading && (
        isMobile
          ? <MobilePreloader onDone={handlePreloaderDone} />
          : <AwsStudentBuilderLoader onDone={handlePreloaderDone} />
      )}
      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
      <div className="bg-background text-on-surface bg-grid-pattern min-h-screen relative overflow-x-hidden selection:bg-primary-container selection:text-on-primary-container font-body-md">
        <Routes>
          {/* <Route path="/" element={<HomePage />} /> */}
          <Route path="/" element={<LoginPage />} />
          <Route path="/blog/aws-bedrock" element={<BlogBedrock />} />
          <Route path="/blog/aws-lambda" element={<BlogLambda />} />
          <Route path="/blog/predictive-analytics" element={<BlogPredictiveAnalytics />} />
          <Route path="/blog/google-maps-traffic" element={<BlogGoogleMaps />} />
          <Route path="/quiz" element={<QuizHub />} />
          <Route path="/quiz/:quizId" element={<AwsQuiz />} />
          <Route path="/case-study/:caseId" element={<CaseStudyQuiz />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/account" element={<AccountPage />} />
        </Routes>
      </div>
    </>
  );
}
