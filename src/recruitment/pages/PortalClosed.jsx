import { useState } from 'react';
import { createClient } from '../lib/supabase.js';
import { useNavigate } from 'react-router-dom';
import awsIcon from '../../assets/aws_icon.jpeg';

export default function PortalClosed() {
  const [supabase] = useState(createClient);
  const [loggingOut, setLoggingOut] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    setLoggingOut(true);
    await supabase.auth.signOut();
    navigate('/recruitment/login', { replace: true });
  };

  return (
    <main className="portal-closed-root">
      {/* Animated background grid */}
      <div className="pc-grid" aria-hidden="true" />

      {/* Floating orbs */}
      <div className="pc-orb pc-orb--1" aria-hidden="true" />
      <div className="pc-orb pc-orb--2" aria-hidden="true" />

      <div className="pc-card">
        {/* Header */}
        <div className="pc-header">
          <img src={awsIcon} alt="AWS SBG" className="pc-logo" />
          <span className="pc-eyebrow">AWS Student Builder Group · VIT</span>
        </div>

        {/* Status badge */}
        <div className="pc-badge">
          <span className="pc-badge__dot" />
          INTERVIEWS IN PROGRESS
        </div>

        {/* Main heading */}
        <h1 className="pc-heading">
          Recruitment Portal
          <br />
          <span className="pc-heading--accent">Has Been Closed</span>
        </h1>

        {/* Divider */}
        <div className="pc-divider" />

        {/* Message block */}
        <div className="pc-message">
          <p className="pc-message__primary">
            AWS interviews are currently in progress.
          </p>
          <div className="pc-callout">
            <p className="pc-callout__title">MAILS HAVE BEEN SENT TO QUALIFIED ENROLLEES</p>
            <p className="pc-callout__body">
              Please check your registered institutional email inbox for interview schedules and instructions.
            </p>
          </div>
        </div>

        {/* Info cards */}
        <div className="pc-info-grid">
          <div className="pc-info-card">
            <span className="pc-info-card__icon">⚠️</span>
            <div>
              <p className="pc-info-card__title">Important Note on Round 1 vs Interview</p>
              <p className="pc-info-card__body">
                The website shows only <strong>Round 1 qualified</strong>. It <em>does not mean</em> you are qualified for the interview. After Round 2, our team manually verified all submitted repositories, and students were selected based on that evaluation.
              </p>
            </div>
          </div>

          <div className="pc-info-card">
            <span className="pc-info-card__icon">✉️</span>
            <div>
              <p className="pc-info-card__title">Interview Invitations Dispatched</p>
              <p className="pc-info-card__body">
                All candidates shortlisted for the interview round have already received an email with their slot details. If you did not receive an email, you were not shortlisted for the interview.
              </p>
            </div>
          </div>

          <div className="pc-info-card">
            <span className="pc-info-card__icon">🔒</span>
            <div>
              <p className="pc-info-card__title">Portal Access Closed</p>
              <p className="pc-info-card__body">
                The recruitment portal is closed. Candidate entry, profile editing, and task submissions are no longer accessible.
              </p>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="pc-footer">
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="pc-logout-btn"
          >
            {loggingOut ? 'Signing out…' : '→ Sign Out'}
          </button>
          <p className="pc-footer__note">
            AWS SBG · VIT Vellore &nbsp;|&nbsp; Recruitment Drive 2026
          </p>
        </div>
      </div>

      <style>{`
        /* ── Portal Closed page ───────────────────────────── */
        .portal-closed-root {
          position: relative;
          min-height: 100dvh;
          display: grid;
          place-items: center;
          padding: 2rem 1rem;
          background: var(--bg);
          overflow: hidden;
        }

        /* animated grid overlay */
        .pc-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(255,153,0,.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,153,0,.04) 1px, transparent 1px);
          background-size: 48px 48px;
          mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 100%);
          animation: pc-grid-pulse 8s ease-in-out infinite alternate;
        }
        @keyframes pc-grid-pulse {
          from { opacity: 0.4; }
          to   { opacity: 1; }
        }

        /* floating glow orbs */
        .pc-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(120px);
          pointer-events: none;
        }
        .pc-orb--1 {
          width: 480px; height: 480px;
          background: rgba(255,153,0,.12);
          top: -120px; left: -100px;
          animation: pc-float 12s ease-in-out infinite alternate;
        }
        .pc-orb--2 {
          width: 360px; height: 360px;
          background: rgba(255,153,0,.07);
          bottom: -80px; right: -60px;
          animation: pc-float 10s ease-in-out 2s infinite alternate-reverse;
        }
        @keyframes pc-float {
          from { transform: translate(0, 0) scale(1); }
          to   { transform: translate(30px, 20px) scale(1.08); }
        }

        /* card */
        .pc-card {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 680px;
          background: var(--surface);
          border: 1px solid rgba(255,153,0,.18);
          padding: clamp(2rem, 5vw, 3rem);
          box-shadow: 0 0 0 1px rgba(255,153,0,.06),
                      0 24px 80px -12px rgba(0,0,0,.6),
                      inset 0 1px 0 rgba(255,153,0,.1);
          animation: pc-card-in .6s cubic-bezier(.16,1,.3,1) both;
        }
        @keyframes pc-card-in {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* header */
        .pc-header {
          display: flex;
          align-items: center;
          gap: .875rem;
          margin-bottom: 1.75rem;
        }
        .pc-logo {
          width: 44px; height: 44px;
          border-radius: 8px;
          object-fit: contain;
          border: 1px solid var(--border);
          background: rgba(0,0,0,.4);
          padding: 6px;
          flex-shrink: 0;
        }
        .pc-eyebrow {
          font-family: 'Geist Mono', ui-monospace, monospace;
          font-size: .625rem;
          letter-spacing: .18em;
          text-transform: uppercase;
          color: var(--accent);
        }

        /* status badge */
        .pc-badge {
          display: inline-flex;
          align-items: center;
          gap: .5rem;
          border: 1px solid rgba(255,153,0,.35);
          background: rgba(255,153,0,.08);
          padding: .3rem .875rem;
          font-family: 'Geist Mono', ui-monospace, monospace;
          font-size: .625rem;
          letter-spacing: .18em;
          text-transform: uppercase;
          color: var(--accent);
          margin-bottom: 1.5rem;
        }
        .pc-badge__dot {
          width: 7px; height: 7px;
          border-radius: 50%;
          background: var(--accent);
          animation: pc-blink 1.4s ease-in-out infinite;
        }
        @keyframes pc-blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: .2; }
        }

        /* heading */
        .pc-heading {
          font-size: clamp(2rem, 5vw, 3rem);
          font-weight: 800;
          line-height: 1.1;
          letter-spacing: -.03em;
          color: var(--text);
          margin-bottom: 1.5rem;
        }
        .pc-heading--accent {
          color: var(--accent);
        }

        /* divider */
        .pc-divider {
          height: 1px;
          background: linear-gradient(90deg, var(--accent) 0%, transparent 100%);
          opacity: .25;
          margin-bottom: 1.75rem;
        }

        /* message */
        .pc-message {
          margin-bottom: 2rem;
        }
        .pc-message__primary {
          font-size: 1.0625rem;
          font-weight: 600;
          color: var(--text);
          margin-bottom: .875rem;
        }
        .pc-callout {
          border: 1px solid rgba(255,153,0,.35);
          background: rgba(255,153,0,.08);
          padding: 1rem 1.25rem;
          margin-top: .75rem;
        }
        .pc-callout__title {
          font-family: 'Geist Mono', ui-monospace, monospace;
          font-size: .8125rem;
          font-weight: 700;
          letter-spacing: .1em;
          color: var(--accent);
          margin-bottom: .35rem;
        }
        .pc-callout__body {
          font-size: .875rem;
          color: var(--muted);
          line-height: 1.5;
        }

        /* info grid */
        .pc-info-grid {
          display: flex;
          flex-direction: column;
          gap: .875rem;
          margin-bottom: 2rem;
        }
        .pc-info-card {
          display: flex;
          gap: 1rem;
          align-items: flex-start;
          border: 1px solid var(--border);
          background: var(--panel);
          padding: 1rem 1.25rem;
          transition: border-color .2s;
        }
        .pc-info-card:hover {
          border-color: rgba(255,153,0,.3);
        }
        .pc-info-card__icon {
          font-size: 1.25rem;
          line-height: 1;
          margin-top: .1rem;
          flex-shrink: 0;
        }
        .pc-info-card__title {
          font-size: .8125rem;
          font-weight: 700;
          letter-spacing: .04em;
          color: var(--text);
          text-transform: uppercase;
          margin-bottom: .25rem;
        }
        .pc-info-card__body {
          font-size: .875rem;
          color: var(--muted);
          line-height: 1.65;
        }
        .pc-info-card__body em {
          color: var(--warning);
          font-style: normal;
          font-weight: 600;
        }

        /* footer */
        .pc-footer {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 1rem;
          border-top: 1px solid var(--border);
          padding-top: 1.5rem;
        }
        .pc-logout-btn {
          display: inline-flex;
          align-items: center;
          gap: .5rem;
          min-height: 2.5rem;
          padding: .5rem 1.25rem;
          background: transparent;
          color: var(--muted);
          font-family: 'Geist Mono', ui-monospace, monospace;
          font-size: .75rem;
          text-transform: uppercase;
          letter-spacing: .1em;
          border: 1px solid var(--border);
          cursor: pointer;
          transition: border-color .15s, color .15s;
        }
        .pc-logout-btn:hover:not(:disabled) {
          border-color: var(--accent);
          color: var(--accent);
        }
        .pc-logout-btn:disabled {
          opacity: .5;
          cursor: not-allowed;
        }
        .pc-footer__note {
          font-family: 'Geist Mono', ui-monospace, monospace;
          font-size: .625rem;
          letter-spacing: .12em;
          text-transform: uppercase;
          color: var(--dim);
        }
      `}</style>
    </main>
  );
}
