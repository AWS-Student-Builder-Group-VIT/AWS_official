import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import awsIcon from '../assets/aws_icon.jpeg';
import vitLogo from '../assets/id3Zck2kbe_logos.svg';
import { getUser, logout } from '../utils/auth';

const navLinks = [
  { label: 'Home', href: '#home', sectionId: 'home' },
  { label: 'About', href: '#about', sectionId: 'about' },
  { label: 'Events', href: '#features', sectionId: 'features' },
  { label: 'Why ?', href: '#why-join-us', sectionId: 'why-join-us' },
  { label: 'The Builders', href: '#builders', sectionId: 'builders' },
  { label: 'Blog', href: '#blog', sectionId: 'blog' },
];

export default function Navbar() {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('home');
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0, opacity: 0 });
  const [user, setUser] = useState(getUser());
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 60);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleAuthChange = () => setUser(getUser());
    window.addEventListener('auth-change', handleAuthChange);
    return () => window.removeEventListener('auth-change', handleAuthChange);
  }, []);

  const linkRefs = useRef([]);
  const navRef = useRef(null);

  // Update indicator position whenever activeSection changes
  useEffect(() => {
    const activeIdx = navLinks.findIndex((l) => l.sectionId === activeSection);
    const el = linkRefs.current[activeIdx];
    const nav = navRef.current;
    if (!el || !nav) return;
    const navRect = nav.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    setIndicatorStyle({
      left: elRect.left - navRect.left,
      width: elRect.width,
      opacity: 1,
    });
  }, [activeSection]);

  // Active section tracker via IntersectionObserver
  useEffect(() => {
    const observers = [];
    navLinks.forEach(({ sectionId }) => {
      const el = document.getElementById(sectionId);
      if (!el) return;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveSection(sectionId);
        },
        { rootMargin: '-30% 0px -60% 0px', threshold: 0 }
      );
      observer.observe(el);
      observers.push(observer);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, []);

  return (
    <nav className={`bg-background/80 backdrop-blur-xl border-b border-white/5 fixed top-0 left-0 w-full z-50 flex justify-between items-center px-container-padding py-4 max-w-full transition-transform duration-500 ease-in-out ${isScrolled ? '-translate-y-full' : 'translate-y-0'}`}>
      {/* Logo */}
      <div className="font-headline-md text-headline-md text-on-surface tracking-tighter uppercase flex items-center gap-2 min-w-0 overflow-hidden mr-2 flex-1">
        <img src={awsIcon} alt="AWS Club Logo" className="object-contain flex-shrink-0" style={{ width: '48px', height: '48px' }} />
        <span className="text-[#FF9900] text-3xl font-light mx-4 pb-1">&times;</span>
        <img src={vitLogo} alt="VIT Logo" className="object-contain flex-shrink-0" style={{ filter: 'brightness(0) invert(1)', width: '48px', height: '48px' }} />
      </div>

      {/* Desktop Nav Links */}
      <div className="hidden md:flex gap-6 items-center relative" ref={navRef}>
        {navLinks.map((link, idx) => (
          <a
            key={link.label}
            ref={(el) => (linkRefs.current[idx] = el)}
            className={
              link.sectionId === activeSection
                ? 'text-white font-bold font-label-md text-label-md transition-colors duration-300 pb-1'
                : 'text-on-surface-variant font-label-md text-label-md hover:text-primary-container transition-colors duration-300 pb-1'
            }
            href={link.href}
          >
            {link.label}
          </a>
        ))}

        {/* Sliding indicator line */}
        <span
          className="absolute bottom-[-6px] h-[2px] bg-primary-container rounded-full pointer-events-none"
          style={{
            left: indicatorStyle.left,
            width: indicatorStyle.width,
            opacity: indicatorStyle.opacity,
            transition: 'left 0.4s cubic-bezier(0.4, 0, 0.2, 1), width 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease',
          }}
        />
      </div>



      {/* Desktop CTA / User Dropdown */}
      {!user ? (
        <a
          className="hidden md:inline-flex bg-primary-container text-background font-headline-md text-label-md px-6 py-2 hover:bg-primary transition-colors items-center gap-2 uppercase tracking-widest animate-attention group cursor-pointer ml-6"
          href="#join"
          onClick={(e) => { e.preventDefault(); window.dispatchEvent(new Event('open-login-modal')); }}
        >
          JOIN CLOUD
          <span className="material-symbols-outlined text-sm inline-block group-hover:animate-arrow-swing">arrow_forward</span>
        </a>
      ) : (
        <div className="hidden md:block relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 hover:bg-white/10 transition-colors"
          >
            <span className="material-symbols-outlined text-primary-container text-xl">account_circle</span>
            <span className="font-mono text-sm text-white uppercase tracking-widest">{user.first_name}</span>
            <span className="material-symbols-outlined text-on-surface-variant text-sm">
              {dropdownOpen ? 'expand_less' : 'expand_more'}
            </span>
          </button>
          
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-[#111318] border border-white/10 shadow-xl overflow-hidden z-50">
              <button
                onClick={() => { setDropdownOpen(false); navigate('/account'); }}
                className="w-full text-left px-4 py-3 font-mono text-sm text-on-surface-variant hover:text-white hover:bg-white/5 transition-colors flex items-center gap-2 border-b border-white/5"
              >
                <span className="material-symbols-outlined text-sm">manage_accounts</span>
                Account
              </button>
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  logout();
                  window.dispatchEvent(new Event('auth-change'));
                  navigate('/');
                }}
                className="w-full text-left px-4 py-3 font-mono text-sm text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">logout</span>
                Logout
              </button>
            </div>
          )}
        </div>
      )}

      {/* Mobile Menu Button */}
      <button
        className="md:hidden text-on-surface flex-shrink-0 p-1"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle navigation menu"
      >
        <span className="material-symbols-outlined">
          {mobileOpen ? 'close' : 'menu'}
        </span>
      </button>

      {/* Mobile Menu Overlay */}
      {mobileOpen && (
        <div className="absolute top-full left-0 w-full bg-background/95 backdrop-blur-xl border-b border-white/10 flex flex-col items-start px-container-padding py-6 gap-4 md:hidden">
          {navLinks.map((link) => (
            <a
              key={link.label}
              className={
                link.sectionId === activeSection
                  ? 'text-white font-bold font-label-md text-label-md border-l-2 border-primary-container pl-3 transition-all duration-300'
                  : 'text-on-surface-variant font-label-md text-label-md hover:text-primary-container transition-colors duration-300'
              }
              href={link.href}
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <div className="mt-4 pt-4 border-t border-white/10 w-full flex flex-col gap-3">

            {!user ? (
              <a
                className="bg-primary-container text-background font-headline-md text-label-md px-6 py-2 hover:bg-primary transition-colors items-center gap-2 uppercase tracking-widest inline-flex animate-attention group cursor-pointer w-max"
                href="#join"
                onClick={(e) => { e.preventDefault(); setMobileOpen(false); window.dispatchEvent(new Event('open-login-modal')); }}
              >
                JOIN CLOUD
                <span className="material-symbols-outlined text-sm inline-block group-hover:animate-arrow-swing">arrow_forward</span>
              </a>
            ) : (
              <>
                <button
                  onClick={() => { setMobileOpen(false); navigate('/account'); }}
                  className="text-left font-label-md text-white text-label-md flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">manage_accounts</span>
                  ACCOUNT
                </button>
                <button
                  onClick={() => {
                    setMobileOpen(false);
                    logout();
                    window.dispatchEvent(new Event('auth-change'));
                    navigate('/');
                  }}
                  className="text-left font-label-md text-red-400 text-label-md flex items-center gap-2 mt-2"
                >
                  <span className="material-symbols-outlined text-sm">logout</span>
                  LOGOUT
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
