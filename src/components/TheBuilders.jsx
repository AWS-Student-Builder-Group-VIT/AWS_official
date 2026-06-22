import { useState, useEffect, useRef } from 'react';
import awsIcon from '../assets/aws_icon.jpeg';
import ankitImg from '../assets/Board memb/ankit.png';
import vivekPopupImg from '../assets/Board memb/vivek_generated.png';
import vivekImg from '../assets/Board memb/Vivek.jpeg';
import arshiImg from '../assets/Board memb/Arshi_card.jpeg';
import arshiPopupImg from '../assets/Board memb/arshi_generated.png';
import vidiImg from '../assets/Board memb/vidi.jpeg';
import vidiPopupImg from '../assets/Board memb/vidi_generated.png';
import tanishaImg from '../assets/Board memb/tanisha.png';
import tanishaPopupImg from '../assets/Board memb/tanisha_generated.png';
import aeshaImg from '../assets/Board memb/aesha.jpeg';
import aeshaPopupImg from '../assets/Board memb/aesha_gerated.png';
import abhishekImg from '../assets/Board memb/abhishek.jpg';
import abhishekPopupImg from '../assets/Board memb/abhishek_generated.png';
import jaanyaImg from '../assets/Board memb/jannya.jpeg';
import jaanyaPopupImg from '../assets/Board memb/jannya_generated.png';
import ayushImg from '../assets/Board memb/ayush.jpeg';
import ayushPopupImg from '../assets/Board memb/ayush_generated.png';
import pihuImg from '../assets/Board memb/pihu.jpeg';
import pihuPopupImg from '../assets/Board memb/pihu_generated.png';

const BUILDERS = [
  // Outer Ring (5 members) — indices 0-4
  { id: 1, initials: 'AS', fullName: 'Ankit Subedi', role: 'CHAIRPERSON', desc: 'Leads the club vision and drives the AWS community forward.', color: '#FF9900', insta: 'https://www.instagram.com/nepaliguy.np/', linkedin: 'https://www.linkedin.com/in/npankitsubedi/', image: ankitImg },
  { id: 2, initials: 'AS', fullName: 'Aesha Singh', role: 'VICE CHAIRPERSON', desc: 'Orchestrates operations and strategic community growth.', color: '#008296', insta: 'https://www.instagram.com/__aesha.06?igsh=MWwydms5M3JtbnllcA%3D%3D&utm_source=qr', linkedin: 'https://www.linkedin.com/in/aesha-singh-b2b497353?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=ios_app', image: aeshaImg, popupImage: aeshaPopupImg },
  { id: 3, initials: 'VJ', fullName: 'Vidhi Prashant Jain', role: 'SECRETARY', desc: 'Manages documentation, communication, and club coordination.', color: '#E1523D', insta: 'https://www.instagram.com/vidhi.j0606?igsh=bThwN25vamIzMjZm&utm_source=qr', linkedin: 'https://www.linkedin.com/in/vidhi-jain0606/', image: vidiImg, popupImage: vidiPopupImg },
  { id: 4, initials: 'TR', fullName: 'Tanishi Raj', role: 'CO-SECRETARY', desc: 'Supports administrative operations and event logistics.', color: '#8A2BE2', insta: 'https://www.instagram.com/tanishi_raj115/', linkedin: 'https://www.linkedin.com/in/tanishiraj/', image: tanishaImg, popupImage: tanishaPopupImg },
  { id: 5, initials: 'PG', fullName: 'Pihu Gupta', role: 'DESIGN HEAD', desc: 'Creates the visual identity and design language of the club.', color: '#C2185B', insta: 'https://www.instagram.com/_eroda_h/', linkedin: 'https://www.linkedin.com/in/pihu-gupta-676514353/', image: pihuImg, popupImage: pihuPopupImg },
  // Inner Ring (5 members) — indices 5-9
  { id: 6, initials: 'AS', fullName: 'Arshi Saxena', role: 'EVENTS HEAD', desc: 'Plans and executes large-scale bootcamps and hackathons.', color: '#D13212', insta: 'https://www.instagram.com/arshi_saxenaa/', linkedin: 'https://www.linkedin.com/in/arshi-saxena-59268130a', image: arshiImg, popupImage: arshiPopupImg },
  { id: 7, initials: 'AN', fullName: 'Ayush Naugariya', role: 'FINANCE HEAD', desc: 'Manages budgets, sponsorships, and financial planning.', color: '#6A0DAD', insta: 'https://www.instagram.com/ayushnaugariya/', linkedin: 'https://www.linkedin.com/in/ayushnaugariya', image: ayushImg, popupImage: ayushPopupImg },
  { id: 8, initials: 'JB', fullName: 'Jaanya Bagdi', role: 'OUTREACH HEAD', desc: 'Builds partnerships and expands the club network.', color: '#0052CC', insta: 'https://www.instagram.com/jaanya._.08?igsh=dzhvMDZmNGYxM3lx', linkedin: 'https://www.linkedin.com/in/jaanya-bagdi-929228222?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app', image: jaanyaImg, popupImage: jaanyaPopupImg },
  { id: 9, initials: 'VK', fullName: 'Vivek Kashyap', role: 'PUBLICITY HEAD', desc: 'Drives social media presence and campus outreach.', color: '#0070BA', insta: 'https://www.instagram.com/vivek_kashyap121?igsh=MXA1ejI4bXJ1NHp0eA%3D%3D&utm_source=qr', linkedin: 'https://www.linkedin.com/in/vivek-kashyap-402101325?utm_source=share_via&utm_content=profile&utm_medium=member_ios', image: vivekImg, popupImage: vivekPopupImg },
  { id: 10, initials: 'AB', fullName: 'Abhishek Kumar', role: 'TECHNICAL HEAD', desc: 'Architects hands-on cloud workshops and technical infrastructure.', color: '#2E7D32', insta: 'https://www.instagram.com/abhishek_is_error/', linkedin: 'https://www.linkedin.com/in/abhishek-kumar-740171345/', image: abhishekImg, popupImage: abhishekPopupImg },
];

const OUTER_R_DESKTOP = 250;
const INNER_R_DESKTOP = 170;
const OUTER_R_MOBILE = 135;
const INNER_R_MOBILE = 90;
const MOBILE_BP = 640;
const OUTER_IDX = [0, 1, 2, 3, 4];
const INNER_IDX = [5, 6, 7, 8, 9];
const OUTER_SPEED = 0.0004;
const INNER_SPEED = -0.0006;

function getRadii() {
  const isMobile = window.innerWidth <= MOBILE_BP;
  return {
    outer: isMobile ? OUTER_R_MOBILE : OUTER_R_DESKTOP,
    inner: isMobile ? INNER_R_MOBILE : INNER_R_DESKTOP,
  };
}

export default function TheBuilders() {
  const [selectedBuilder, setSelectedBuilder] = useState(null);
  const containerRef = useRef(null);
  const anglesRef = useRef(
    BUILDERS.map((_, i) => {
      if (OUTER_IDX.includes(i)) return (i / OUTER_IDX.length) * Math.PI * 2;
      const j = i - 5;
      return (j / INNER_IDX.length) * Math.PI * 2;
    })
  );
  const pausedRef = useRef(false);
  const animRef = useRef(null);
  const anchorEls = useRef([]);

  // Direct DOM animation loop — matches the reference HTML approach exactly
  useEffect(() => {
    function animate() {
      if (!pausedRef.current && !selectedBuilder) {
        const angles = anglesRef.current;
        for (let i = 0; i < BUILDERS.length; i++) {
          const speed = OUTER_IDX.includes(i) ? OUTER_SPEED : INNER_SPEED;
          angles[i] += speed;
        }
      }

      // Update positions with responsive radii
      const { outer, inner } = getRadii();
      const angles = anglesRef.current;
      for (let i = 0; i < BUILDERS.length; i++) {
        const r = OUTER_IDX.includes(i) ? outer : inner;
        const x = Math.cos(angles[i]) * r;
        const y = Math.sin(angles[i]) * r;
        const el = anchorEls.current[i];
        if (el) {
          el.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
        }
      }

      animRef.current = requestAnimationFrame(animate);
    }

    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [selectedBuilder]);

  const openPopup = (builder) => {
    pausedRef.current = true;
    setSelectedBuilder(builder);
  };

  const closePopup = () => {
    setSelectedBuilder(null);
    pausedRef.current = false;
  };

  return (
    <section className="tb-section" id="builders">
      <style dangerouslySetInnerHTML={{
        __html: `
        /* ═══════════════════════════════════════════
           The Builders — Orbital Section
           ═══════════════════════════════════════════ */

        .tb-section {
          position: relative;
          padding: 96px 24px;
          overflow: hidden;
          background: var(--color-background);
        }

        .tb-header {
          text-align: center;
          margin-bottom: 48px;
        }
        .tb-label {
          font-family: 'Space Mono', monospace;
          font-size: 14px;
          letter-spacing: 4px;
          text-transform: uppercase;
          color: #FF9900;
          font-weight: 600;
          margin-bottom: 8px;
        }
        .tb-title {
          font-family: 'Space Mono', monospace;
          font-size: 48px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #f1dfd1;
          line-height: 1.2;
          margin: 0;
        }

        /* — Orbit Scene — */
        .tb-orbit-scene {
          position: relative;
          width: 100%;
          min-height: 620px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: visible;
        }
        .tb-orbit-container {
          position: relative;
          width: 560px;
          height: 560px;
          flex-shrink: 0;
        }

        /* — Dashed Rings — */
        .tb-ring {
          position: absolute;
          border-radius: 50%;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          pointer-events: none;
        }
        .tb-ring-outer {
          width: 500px;
          height: 500px;
          border: 1.5px dashed rgba(255,153,0,0.25);
        }
        .tb-ring-inner {
          width: 340px;
          height: 340px;
          border: 1.5px dashed rgba(255,153,0,0.35);
        }

        /* — Center Logo — */
        .tb-center {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 110px;
          height: 110px;
          border-radius: 50%;
          z-index: 10;
          background-color: #0A0C10;
          box-shadow: 0 0 0 6px rgba(255,153,0,0.15), 0 0 0 12px rgba(255,153,0,0.07);
          overflow: hidden;
        }
        .tb-center img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          transform: scale(0.85);
        }

        /* — Anchors & Avatars — */
        .tb-anchor {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 0;
          height: 0;
        }
        .tb-avatar {
          position: absolute;
          width: 56px;
          height: 56px;
          border-radius: 50%;
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          transform: translate(-50%, -50%);
          z-index: 5;
          border: 2.5px solid #FF9900;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Inter', sans-serif;
          font-size: 16px;
          font-weight: 700;
          color: #fff;
          user-select: none;
        }
        .tb-avatar:hover {
          transform: translate(-50%, -50%) scale(1.18);
          z-index: 20;
          box-shadow: 0 0 0 4px rgba(255,153,0,0.4);
        }
        .tb-name-tag {
          position: absolute;
          bottom: -22px;
          left: 50%;
          transform: translateX(-50%);
          font-family: 'Space Mono', monospace;
          font-size: 10px;
          font-weight: 600;
          color: #a38d7a;
          white-space: nowrap;
          pointer-events: none;
          background: #0A0C10;
          padding: 2px 6px;
          border-radius: 4px;
          opacity: 0;
          transition: opacity 0.2s;
        }
        .tb-avatar:hover .tb-name-tag {
          opacity: 1;
        }

        /* — Popup — */
        .tb-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0,0,0,0.7);
          backdrop-filter: blur(6px);
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .tb-popup {
          background: #000;
          border: 0.5px solid #222;
          border-radius: 20px;
          padding: 0;
          width: 380px;
          height: 380px;
          position: relative;
          animation: tbPopIn 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards;
          display: flex;
          flex-direction: row;
        }
        @keyframes tbPopIn {
          from { transform: scale(0.85); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .tb-popup-close {
          position: absolute;
          top: 10px;
          right: 10px;
          background: rgba(0,0,0,0.5);
          border: 0.5px solid #333;
          width: 26px;
          height: 26px;
          border-radius: 50%;
          cursor: pointer;
          color: #888;
          font-size: 13px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.2s, background 0.2s;
          z-index: 10;
        }
        .tb-popup-close:hover { color: #fff; background: rgba(255,255,255,0.1); }

        /* Left image panel */
        .tb-popup-img-panel {
          width: 190px;
          min-width: 190px;
          height: 100%;
          background: #111;
          border-top-left-radius: 20px;
          border-bottom-left-radius: 20px;
          position: relative;
        }
        .tb-popup-img-panel img {
          position: absolute;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 210px;
          height: 115%;
          object-fit: cover;
          object-position: top center;
          display: block;
          z-index: 20;
          pointer-events: none;
        }
        /* Fallback initials when no image */
        .tb-popup-img-fallback {
          width: 100%;
          height: 100%;
          border-top-left-radius: 20px;
          border-bottom-left-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Inter', sans-serif;
          font-size: 42px;
          font-weight: 700;
          color: #fff;
        }

        /* Right content panel */
        .tb-popup-content {
          flex: 1;
          padding: 20px 14px 18px;
          border-left: 0.5px solid #1e1e1e;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .tb-popup-name {
          font-family: 'Inter', sans-serif;
          font-size: 19px;
          font-weight: 600;
          color: #fff;
          letter-spacing: 0.4px;
          margin: 0;
        }
        .tb-popup-role {
          font-family: 'Inter', sans-serif;
          font-size: 11px;
          color: #777;
          font-weight: 400;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          margin-top: 8px;
        }
        .tb-popup-socials {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .tb-popup-social-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          width: 100%;
          padding: 8px 0;
          background: #131313;
          border: 0.5px solid #2a2a2a;
          border-radius: 9px;
          text-decoration: none;
          cursor: pointer;
          transition: background 0.15s;
          font-family: 'Inter', sans-serif;
          font-size: 11px;
          color: #bbb;
        }
        .tb-popup-social-btn:hover { background: #1e1e1e; }
        .tb-popup-social-btn .social-icon { font-size: 16px; }
        .tb-popup-social-btn.insta .social-icon { color: #e1306c; }
        .tb-popup-social-btn.linkedin .social-icon { color: #0a66c2; }

        /* ═══════════════════════════════════════════
           MOBILE RESPONSIVE — ≤640px
           ═══════════════════════════════════════════ */
        @media (max-width: 640px) {
          .tb-section {
            padding: 64px 16px;
          }
          .tb-title {
            font-size: 32px;
          }
          .tb-orbit-scene {
            min-height: 380px;
          }
          .tb-orbit-container {
            width: 320px;
            height: 320px;
          }
          .tb-ring-outer {
            width: 280px;
            height: 280px;
          }
          .tb-ring-inner {
            width: 185px;
            height: 185px;
          }
          .tb-center {
            width: 75px;
            height: 75px;
            box-shadow: 0 0 0 4px rgba(255,153,0,0.15), 0 0 0 8px rgba(255,153,0,0.07);
          }
          .tb-avatar {
            width: 44px;
            height: 44px;
            border-width: 2px;
          }
          .tb-name-tag {
            font-size: 8px;
            bottom: -18px;
          }

          /* Popup — vertical stack on mobile */
          .tb-popup {
            width: 90vw;
            max-width: 340px;
            height: auto;
            max-height: 85vh;
            flex-direction: column;
            border-radius: 16px;
          }
          .tb-popup-img-panel {
            width: 100%;
            min-width: unset;
            height: 200px;
            border-top-left-radius: 16px;
            border-top-right-radius: 16px;
            border-bottom-left-radius: 0;
          }
          .tb-popup-img-panel img {
            height: 130%;
            width: auto;
            max-width: none;
          }
          .tb-popup-content {
            padding: 16px;
            border-left: none;
            border-top: 0.5px solid #1e1e1e;
          }
          .tb-popup-name {
            font-size: 17px;
          }
          .tb-popup-socials {
            margin-top: 12px;
          }
        }
      `}} />

      <div className="tb-header">
        <p className="tb-label">meet</p>
        <h2 className="tb-title">The Builders</h2>
      </div>

      <div className="tb-orbit-scene">
        <div className="tb-orbit-container" ref={containerRef}>
          {/* Rings */}
          <div className="tb-ring tb-ring-outer" />
          <div className="tb-ring tb-ring-inner" />

          {/* Center Logo — uses club image */}
          <div className="tb-center">
            <img src={awsIcon} alt="AWS Cloud Club" />
          </div>

          {/* Avatars */}
          {BUILDERS.map((builder, i) => (
            <div
              key={builder.id}
              ref={el => (anchorEls.current[i] = el)}
              className="tb-anchor"
            >
              <div
                className="tb-avatar"
                style={{ background: builder.color }}
                onMouseEnter={() => (pausedRef.current = true)}
                onMouseLeave={() => { if (!selectedBuilder) pausedRef.current = false; }}
                onClick={() => openPopup(builder)}
                aria-label={`${builder.fullName}, ${builder.role}`}
              >
                {builder.image ? (
                  <img src={builder.image} alt={builder.fullName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  builder.initials
                )}
                <span className="tb-name-tag">{builder.fullName.split(' ')[0]}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Popup Modal */}
      {selectedBuilder && (
        <div className="tb-overlay" onClick={closePopup}>
          <div className="tb-popup" onClick={e => e.stopPropagation()}>
            <button className="tb-popup-close" aria-label="Close" onClick={closePopup}>✕</button>

            {/* Left — Image */}
            <div className="tb-popup-img-panel">
              {(selectedBuilder.popupImage || selectedBuilder.image) ? (
                <img src={selectedBuilder.popupImage || selectedBuilder.image} alt={selectedBuilder.fullName} />
              ) : (
                <div className="tb-popup-img-fallback" style={{ background: selectedBuilder.color }}>
                  {selectedBuilder.initials}
                </div>
              )}
            </div>

            {/* Right — Content */}
            <div className="tb-popup-content">
              <div>
                <p className="tb-popup-name">{selectedBuilder.fullName}</p>
                <p className="tb-popup-role">{selectedBuilder.role}</p>
              </div>
              <div className="tb-popup-socials">
                <a className="tb-popup-social-btn insta" href={selectedBuilder.insta} target="_blank" rel="noreferrer">
                  <i className="ti ti-brand-instagram social-icon"></i>
                  Instagram
                </a>
                <a className="tb-popup-social-btn linkedin" href={selectedBuilder.linkedin} target="_blank" rel="noreferrer">
                  <i className="ti ti-brand-linkedin social-icon"></i>
                  LinkedIn
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
