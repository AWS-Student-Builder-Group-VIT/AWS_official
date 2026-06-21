import React, { useRef, useEffect } from 'react';

/**
 * Desktop Preloader — Pac-Man eats "AWS STUDENT BUILDER GROUP"
 * Runs ONE time, then fires onDone() when the animation completes.
 *
 * Props:
 *   onDone — callback fired after the Pac-Man finishes eating the text
 */
export default function AwsStudentBuilderLoader({ onDone }) {
  const pacmanRef = useRef(null);

  useEffect(() => {
    const el = pacmanRef.current;
    if (!el) return;

    const handleEnd = () => {
      if (typeof onDone === 'function') onDone();
    };

    el.addEventListener('animationend', handleEnd);
    return () => el.removeEventListener('animationend', handleEnd);
  }, [onDone]);

  const css = `
    .loader-container {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      z-index: 9999;
      background-color: #0a0c10;
      background-image: 
        linear-gradient(to right, rgba(255, 255, 255, 0.05) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(255, 255, 255, 0.05) 1px, transparent 1px);
      background-size: 50px 50px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      transition: opacity 0.5s ease-out;
    }
    .loader-container.loader-fade-out {
      opacity: 0;
      pointer-events: none;
    }

    .bg-square {
      position: absolute;
      background-color: #FFA500;
      z-index: 0;
      opacity: 1;
    }
    
    .sq-1 { width: 150px; height: 150px; top: 100px; left: 150px; }
    .sq-2 { width: 80px; height: 80px; bottom: 200px; left: 100px; }
    .sq-3 { width: 50px; height: 50px; top: 250px; right: 200px; }
    .sq-4 { width: 100px; height: 100px; bottom: 150px; right: 250px; }

    /* The Shared Animation Container */
    .animation-container {
      position: relative;
      display: inline-flex;
      align-items: center;
      z-index: 10;
    }

    /* The Main Text Element — runs ONCE */
    .text-container {
      font-family: 'Space Mono', monospace, sans-serif;
      font-size: 4rem;
      font-weight: bold;
      color: #ffffff;
      text-transform: uppercase;
      white-space: nowrap;
      animation: wipeText 4s 1 linear forwards;
    }

    @keyframes wipeText {
      0% { clip-path: inset(0 0 0 0%); }
      100% { clip-path: inset(0 0 0 100%); }
    }

    /* PAC-MAN — runs ONCE */
    .pacman-wrapper {
      position: absolute;
      top: 50%;
      transform: translate(-50%, -50%);
      width: 80px;
      height: 80px;
      animation: movePacman 4s 1 linear forwards;
      z-index: 20;
    }

    .pacman::before,
    .pacman::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 0;
      height: 0;
      border: 40px solid #FFA500;
      border-radius: 50%;
    }
    
    .pacman::before {
      border-right-color: transparent;
      border-bottom-color: transparent;
      animation: chompTop 0.3s infinite alternate linear;
    }
    
    .pacman::after {
      border-right-color: transparent;
      border-top-color: transparent;
      animation: chompBottom 0.3s infinite alternate linear;
    }

    @keyframes chompTop {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(-35deg); }
    }
    
    @keyframes chompBottom {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(35deg); }
    }

    @keyframes movePacman {
      0% { left: 0%; }
      100% { left: 100%; }
    }

    /* BOTTOM UI */
    .bottom-ui {
      position: absolute;
      bottom: 60px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      z-index: 10;
    }

    .initiating-text {
      color: #FFA500;
      letter-spacing: 0.25em;
      font-weight: bold;
      font-size: 1.25rem;
      font-family: 'Space Mono', monospace, sans-serif;
      animation: pulseOpacity 1.5s infinite alternate ease-in-out;
    }

    @keyframes pulseOpacity {
      0% { opacity: 0.3; }
      100% { opacity: 1; }
    }

    .status-badge {
      display: flex;
      align-items: center;
      gap: 12px;
      border: 1px solid rgba(255, 165, 0, 0.3);
      padding: 8px 20px;
      border-radius: 30px;
      background: rgba(10, 12, 16, 0.8);
      box-shadow: 0 4px 10px rgba(0,0,0,0.5);
    }

    .status-dot {
      width: 12px;
      height: 12px;
      background-color: #FFA500;
      border-radius: 50%;
      box-shadow: 0 0 8px #FFA500;
    }

    .status-text {
      color: #d1d5db;
      font-family: 'Space Mono', monospace, sans-serif;
      font-size: 0.95rem;
      letter-spacing: 0.05em;
    }
  `;

  return (
    <div className="loader-container">
      <style>{css}</style>
      
      {/* 1. Background Squares */}
      <div className="bg-square sq-1"></div>
      <div className="bg-square sq-2"></div>
      <div className="bg-square sq-3"></div>
      <div className="bg-square sq-4"></div>

      {/* 2 & 3. Animation Container holding Text and Pac-Man */}
      <div className="animation-container">
        <div className="text-container">
          AWS STUDENT BUILDER GROUP
        </div>
        
        <div className="pacman-wrapper" ref={pacmanRef}>
          <div className="pacman"></div>
        </div>
      </div>


    </div>
  );
}
