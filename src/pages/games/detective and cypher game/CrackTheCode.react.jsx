import React, { useState, useMemo, useRef, useEffect } from 'react';

// ==========================================================
// 1. DATA & CIPHER TABLES
// ==========================================================
const MORSE_TABLE = {
  A: ".-", B: "-...", C: "-.-.", D: "-..", E: ".", F: "..-.", G: "--.",
  H: "....", I: "..", J: ".---", K: "-.-", L: ".-..", M: "--", N: "-.",
  O: "---", P: ".--.", Q: "--.-", R: ".-.", S: "...", T: "-", U: "..-",
  V: "...-", W: ".--", X: "-..-", Y: "-.--", Z: "--.."
};

const LEVELS = [
  {
    id: 1,
    title: "Signal Alpha",
    type: "Morse Code — Easy",
    code: ".... . .-.. .-.. ---",
    answer: "HELLO",
    hint: "💡 Decode letter by letter using the Morse chart. Each letter is separated by a space; words by ' / '.",
    tool: "morse",
    storyUnlock: "Transmission decoded. Welcome, Agent. Your training begins. Proceed to next signal."
  },
  {
    id: 2,
    title: "Signal Bravo",
    type: "Morse Code — Medium",
    code: ".--- --- .. -. / - .... . / --. .- -- .",
    answer: "JOIN THE GAME",
    hint: "💡 Remember: a forward slash ( / ) means a space between words.",
    tool: "morse",
    storyUnlock: "Good work. The mission has officially begun. Things are about to get harder."
  },
  {
    id: 3,
    title: "Signal Charlie",
    type: "Caesar Cipher — Shift 3",
    code: "WUXVW QR RQH",
    answer: "TRUST NO ONE",
    hint: "💡 Each letter has been shifted forward by 3 positions. Use the Caesar tool and set the shift to 3 to reverse it.",
    tool: "caesar",
    storyUnlock: "Understood. The enemy is everywhere. Stay sharp."
  },
  {
    id: 4,
    title: "Signal Delta",
    type: "Caesar Cipher — Shift 13 (ROT13)",
    code: "ZRRG ZR NG ZVQAVTUG",
    answer: "MEET ME AT MIDNIGHT",
    hint: "💡 This uses ROT13 — a shift of exactly 13. ROT13 is its own inverse: applying it twice returns the original.",
    tool: "caesar",
    storyUnlock: "The rendezvous is set. Almost there, Agent. One final transmission remains."
  },
  {
    id: 5,
    title: "Signal Echo — FINAL",
    type: "Combo: Morse + Caesar",
    code: "PART A (Morse — find the shift):\n... . ...- . -.\n\nPART B (Caesar — decode this):\nDLSJVTL HNLUA",
    answer: "WELCOME AGENT",
    hint: "💡 Step 1: Decode the Morse in Part A to find a word that tells you the shift number. Step 2: Use that number as the Caesar shift to decode Part B.",
    tool: "both",
    storyUnlock: ""
  }
];

// ==========================================================
// 2. EMBEDDED STYLES (Self-Contained)
// ==========================================================
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;900&family=Share+Tech+Mono&family=Inter:wght@400;500;600&display=swap');

  .ctc-root {
    --bg: #050a0e;
    --card: rgba(0, 255, 180, 0.035);
    --card-h: rgba(0, 255, 180, 0.08);
    --cyan: #00ffb4;
    --cyan-dim: rgba(0, 255, 180, 0.12);
    --cyan-glow: rgba(0, 255, 180, 0.35);
    --text: #c8f0e0;
    --text2: #5f9b7b;
    --text3: #224236;
    --border: rgba(0, 255, 180, 0.12);
    --border2: rgba(0, 255, 180, 0.32);
    --red: #ff4f6a;
    --green: #00ffb4;
    --yellow: #ffe066;

    background-color: var(--bg);
    color: var(--text);
    font-family: "Inter", sans-serif;
    min-height: 100vh;
    padding: 24px 16px 80px;
    box-sizing: border-box;
    position: relative;
    overflow-x: hidden;
  }

  .ctc-root *, .ctc-root *::before, .ctc-root *::after {
    box-sizing: border-box;
  }

  .ctc-watermark {
    position: fixed;
    left: -40px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 260px;
    opacity: 0.025;
    pointer-events: none;
    user-select: none;
    z-index: 0;
    filter: hue-rotate(140deg);
  }

  .ctc-wrap {
    position: relative;
    z-index: 1;
    max-width: 840px;
    margin: 0 auto;
  }

  .ctc-nav-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 0 16px;
    border-bottom: 1px solid var(--border);
    margin-bottom: 24px;
    flex-wrap: wrap;
    gap: 12px;
  }

  .ctc-nav-title {
    font-family: "Orbitron", monospace;
    font-size: 0.85rem;
    letter-spacing: 2.5px;
    color: var(--cyan);
    font-weight: 700;
  }

  .ctc-nav-status {
    font-family: "Share Tech Mono", monospace;
    font-size: 0.8rem;
    color: var(--text2);
    letter-spacing: 1px;
  }

  .ctc-intro-hero {
    text-align: center;
    padding: 40px 16px 24px;
  }

  .ctc-badge {
    display: inline-block;
    font-size: 0.72rem;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: var(--cyan);
    background: var(--cyan-dim);
    border: 1px solid var(--border2);
    padding: 6px 18px;
    border-radius: 20px;
    margin-bottom: 24px;
    font-family: "Share Tech Mono", monospace;
  }

  .ctc-intro-hero h1 {
    font-family: "Orbitron", monospace;
    font-weight: 900;
    font-size: clamp(2rem, 5.5vw, 3.4rem);
    color: var(--cyan);
    text-shadow: 0 0 40px var(--cyan-glow);
    line-height: 1.15;
    margin: 0 0 10px 0;
    letter-spacing: 2px;
  }

  .ctc-intro-hero h2 {
    font-family: "Share Tech Mono", monospace;
    font-size: clamp(0.9rem, 2.5vw, 1.2rem);
    color: var(--text2);
    letter-spacing: 3px;
    margin: 0 0 34px 0;
    text-transform: uppercase;
  }

  .ctc-intro-desc {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 28px 32px;
    max-width: 620px;
    margin: 0 auto 36px;
    backdrop-filter: blur(14px);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
  }

  .ctc-intro-desc p {
    font-family: "Share Tech Mono", monospace;
    font-size: 0.88rem;
    color: var(--text2);
    line-height: 1.8;
    margin: 0 0 14px 0;
  }
  .ctc-intro-desc p:last-child {
    margin-bottom: 0;
  }

  .ctc-lvl-preview {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    justify-content: center;
    margin-top: 20px;
  }

  .ctc-lvl-chip {
    background: var(--cyan-dim);
    border: 1px solid var(--border2);
    color: var(--cyan);
    font-family: "Share Tech Mono", monospace;
    font-size: 0.74rem;
    letter-spacing: 1px;
    padding: 6px 14px;
    border-radius: 6px;
  }

  .ctc-btn-cyber {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    background: linear-gradient(135deg, var(--cyan), #00cc88);
    color: #050a0e;
    border: none;
    padding: 13px 34px;
    border-radius: 8px;
    font-family: "Orbitron", monospace;
    font-size: 0.82rem;
    font-weight: 700;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    cursor: pointer;
    transition: all 0.25s ease;
    box-shadow: 0 0 24px var(--cyan-glow);
  }

  .ctc-btn-cyber:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 0 40px rgba(0, 255, 180, 0.5);
  }

  .ctc-btn-cyber:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .ctc-game-header {
    text-align: center;
    padding: 10px 0 16px;
  }

  .ctc-level-label {
    font-family: "Share Tech Mono", monospace;
    font-size: 0.76rem;
    letter-spacing: 3px;
    color: var(--text2);
    text-transform: uppercase;
    margin-bottom: 8px;
  }

  .ctc-level-title {
    font-family: "Orbitron", monospace;
    font-size: clamp(1.4rem, 3.5vw, 2rem);
    font-weight: 700;
    color: var(--cyan);
    text-shadow: 0 0 30px var(--cyan-glow);
    margin-bottom: 6px;
  }

  .ctc-level-type {
    font-family: "Share Tech Mono", monospace;
    font-size: 0.82rem;
    color: var(--text2);
    letter-spacing: 2px;
  }

  .ctc-progress-bar {
    display: flex;
    gap: 10px;
    justify-content: center;
    margin: 18px 0 28px;
  }

  .ctc-prog-node {
    width: 38px;
    height: 7px;
    border-radius: 4px;
    background: var(--text3);
    transition: all 0.35s ease;
  }

  .ctc-prog-node.done {
    background: var(--cyan);
    box-shadow: 0 0 12px var(--cyan-glow);
  }

  .ctc-prog-node.active {
    background: linear-gradient(90deg, var(--cyan), #00cc88);
    box-shadow: 0 0 14px var(--cyan-glow);
  }

  .ctc-msg-card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 26px;
    margin-bottom: 20px;
    backdrop-filter: blur(12px);
  }

  .ctc-msg-label {
    font-family: "Share Tech Mono", monospace;
    font-size: 0.72rem;
    letter-spacing: 3px;
    color: var(--text2);
    text-transform: uppercase;
    margin-bottom: 12px;
  }

  .ctc-msg-code {
    font-family: "Share Tech Mono", monospace;
    font-size: clamp(0.95rem, 2.5vw, 1.25rem);
    color: var(--cyan);
    background: rgba(0, 255, 180, 0.05);
    border: 1px solid var(--border2);
    border-radius: 8px;
    padding: 20px 22px;
    line-height: 1.9;
    white-space: pre-wrap;
    letter-spacing: 1.5px;
    text-shadow: 0 0 12px rgba(0, 255, 180, 0.35);
  }

  .ctc-msg-hint {
    font-family: "Share Tech Mono", monospace;
    font-size: 0.78rem;
    color: #ebd188;
    margin-top: 14px;
    line-height: 1.6;
    padding: 10px 14px;
    background: rgba(255, 224, 102, 0.06);
    border-left: 3px solid var(--yellow);
    border-radius: 4px;
  }

  .ctc-tool-accord {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 12px;
    margin-bottom: 20px;
    overflow: hidden;
  }

  .ctc-tool-toggle {
    width: 100%;
    background: none;
    border: none;
    padding: 14px 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    cursor: pointer;
    color: var(--text2);
    font-family: "Share Tech Mono", monospace;
    font-size: 0.82rem;
    letter-spacing: 2px;
    text-transform: uppercase;
  }

  .ctc-tool-toggle:hover {
    background: var(--card-h);
    color: var(--cyan);
  }

  .ctc-tool-body {
    padding: 20px;
    border-top: 1px solid var(--border);
  }

  .ctc-morse-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(82px, 1fr));
    gap: 7px;
    margin-top: 10px;
  }

  .ctc-morse-cell {
    background: rgba(0, 255, 180, 0.04);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 8px 10px;
    font-family: "Share Tech Mono", monospace;
    display: flex;
    justify-content: space-between;
  }

  .ctc-morse-letter {
    color: var(--cyan);
    font-weight: 700;
  }

  .ctc-morse-code {
    color: var(--text2);
  }

  .ctc-caesar-row {
    display: flex;
    align-items: center;
    gap: 16px;
    margin: 12px 0 16px;
    flex-wrap: wrap;
  }

  .ctc-alpha-map {
    font-family: "Share Tech Mono", monospace;
    font-size: 0.8rem;
    color: var(--text2);
    background: rgba(0, 255, 180, 0.04);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 14px 16px;
    line-height: 2;
    letter-spacing: 1px;
  }

  .ctc-answer-wrap {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 24px;
    margin-bottom: 20px;
  }

  .ctc-answer-label {
    font-family: "Share Tech Mono", monospace;
    font-size: 0.72rem;
    letter-spacing: 3px;
    color: var(--text2);
    text-transform: uppercase;
    margin-bottom: 12px;
  }

  .ctc-answer-row {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }

  .ctc-answer-input {
    flex: 1;
    min-width: 220px;
    background: rgba(0, 255, 180, 0.04);
    border: 1px solid var(--border2);
    border-radius: 8px;
    padding: 14px 18px;
    color: var(--cyan);
    font-family: "Share Tech Mono", monospace;
    font-size: 1.05rem;
    letter-spacing: 2px;
    text-transform: uppercase;
  }

  .ctc-answer-input:focus {
    outline: none;
    border-color: var(--cyan);
    box-shadow: 0 0 0 3px rgba(0, 255, 180, 0.15);
  }

  .ctc-feedback {
    font-family: "Share Tech Mono", monospace;
    font-size: 0.88rem;
    letter-spacing: 1px;
    padding: 14px 18px;
    border-radius: 8px;
    margin-bottom: 18px;
  }

  .ctc-feedback.ok {
    background: rgba(0, 255, 180, 0.1);
    border: 1px solid rgba(0, 255, 180, 0.35);
    color: var(--green);
  }

  .ctc-feedback.err {
    background: rgba(255, 79, 106, 0.1);
    border: 1px solid rgba(255, 79, 106, 0.35);
    color: var(--red);
  }

  .ctc-prize-wrap {
    max-width: 660px;
    margin: 40px auto;
    text-align: center;
  }

  .ctc-prize-icon {
    font-size: 4.8rem;
    margin-bottom: 20px;
  }

  .ctc-prize-title {
    font-family: "Orbitron", monospace;
    font-size: clamp(1.8rem, 4.5vw, 2.5rem);
    font-weight: 900;
    color: var(--cyan);
    text-shadow: 0 0 40px var(--cyan-glow);
    margin-bottom: 12px;
    letter-spacing: 2px;
  }

  .ctc-prize-box {
    background: var(--card);
    border: 1px solid var(--border2);
    border-radius: 14px;
    padding: 32px 28px;
    margin-bottom: 32px;
    position: relative;
  }

  .ctc-access-code {
    font-family: "Orbitron", monospace;
    font-size: clamp(1.2rem, 3.5vw, 1.8rem);
    font-weight: 700;
    color: var(--cyan);
    letter-spacing: 5px;
    text-shadow: 0 0 25px var(--cyan-glow);
    background: rgba(0, 255, 180, 0.08);
    border: 1px solid var(--border2);
    border-radius: 10px;
    padding: 16px 28px;
    margin: 22px 0;
    display: inline-block;
  }
`;

// ==========================================================
// 3. REACT COMPONENT
// ==========================================================
export default function CrackTheCodeGame({ onExit }) {
  const [screen, setScreen] = useState('intro'); // 'intro' | 'game' | 'prize'
  const [currentLevelIdx, setCurrentLevelIdx] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [toolOpen, setToolOpen] = useState(false);
  const [shiftVal, setShiftVal] = useState(3);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const inputRef = useRef(null);
  const currentLevel = LEVELS[currentLevelIdx] || LEVELS[0];
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  const caesarMapping = useMemo(() => {
    let plain = '';
    let coded = '';
    for (let i = 0; i < 26; i++) {
      plain += alphabet[i] + ' ';
      coded += alphabet[(i + shiftVal) % 26] + ' ';
    }
    return { plain: plain.trim(), coded: coded.trim() };
  }, [shiftVal, alphabet]);

  const startGame = () => {
    setCurrentLevelIdx(0);
    setUserAnswer('');
    setFeedback(null);
    setToolOpen(false);
    setScreen('game');
  };

  useEffect(() => {
    if (screen === 'game') {
      setUserAnswer('');
      setFeedback(null);
      setToolOpen(false);
      if (inputRef.current) inputRef.current.focus();
    }
  }, [currentLevelIdx, screen]);

  const handleCheckAnswer = (e) => {
    if (e) e.preventDefault();
    if (isSubmitting) return;

    const cleaned = userAnswer.trim().toUpperCase();
    if (!cleaned) return;

    if (cleaned === currentLevel.answer) {
      setFeedback({
        type: 'ok',
        msg: `✅ Correct! ${currentLevel.storyUnlock}`
      });
      setIsSubmitting(true);

      setTimeout(() => {
        setIsSubmitting(false);
        if (currentLevelIdx + 1 >= LEVELS.length) {
          setScreen('prize');
        } else {
          setCurrentLevelIdx(prev => prev + 1);
        }
      }, 1800);
    } else {
      setFeedback({
        type: 'err',
        msg: '❌ Incorrect decryption. Double-check the cipher shift or Morse code.'
      });
      if (inputRef.current) inputRef.current.select();
    }
  };

  return (
    <div className="ctc-root">
      <style>{STYLES}</style>
      <div className="ctc-watermark">🔐</div>

      <div className="ctc-wrap">
        {/* NAV */}
        <div className="ctc-nav-bar">
          <div className="ctc-nav-title">CRACK THE CODE — CIPHER CHALLENGE</div>
          <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
            {screen === 'game' && (
              <span className="ctc-nav-status">
                Level {currentLevel.id} of {LEVELS.length}
              </span>
            )}
            {onExit && (
              <button
                type="button"
                onClick={onExit}
                style={{
                  background: 'none',
                  border: '1px solid var(--border2)',
                  color: 'var(--cyan)',
                  padding: '6px 12px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontFamily: '"Share Tech Mono", monospace',
                  fontSize: '0.75rem'
                }}
              >
                &larr; Exit
              </button>
            )}
          </div>
        </div>

        {/* INTRO SCREEN */}
        {screen === 'intro' && (
          <div>
            <div className="ctc-intro-hero">
              <div className="ctc-badge">📡 Classified Transmission</div>
              <h1>CRACK THE CODE</h1>
              <h2>Cipher and Morse Cryptanalysis Challenge</h2>
            </div>

            <div className="ctc-intro-desc">
              <p>Intercept and decode a series of encrypted transmissions. Each security tier is more complex than the last.</p>
              <p>Use the built-in decoder tools — Morse chart and Caesar cipher wheel — to solve each puzzle and submit your decrypted answer.</p>
              <p>Five levels stand between you and the final classified message.</p>

              <div className="ctc-lvl-preview">
                <span className="ctc-lvl-chip">🟢 LVL 1 — Morse</span>
                <span className="ctc-lvl-chip">🟡 LVL 2 — Morse</span>
                <span className="ctc-lvl-chip">🟠 LVL 3 — Caesar</span>
                <span className="ctc-lvl-chip">🔴 LVL 4 — ROT13</span>
                <span className="ctc-lvl-chip">🟣 LVL 5 — Combo</span>
              </div>
            </div>

            <div style={{ textAlign: 'center' }}>
              <button className="ctc-btn-cyber" onClick={startGame}>
                ▶ Start Mission
              </button>
            </div>
          </div>
        )}

        {/* GAME SCREEN */}
        {screen === 'game' && (
          <div>
            <div className="ctc-game-header">
              <div className="ctc-level-label">Level {currentLevel.id} of {LEVELS.length}</div>
              <div className="ctc-level-title">{currentLevel.title}</div>
              <div className="ctc-level-type">Type: {currentLevel.type}</div>
            </div>

            <div className="ctc-progress-bar">
              {LEVELS.map((lvl, i) => (
                <div
                  key={lvl.id}
                  className={`ctc-prog-node ${i < currentLevelIdx ? 'done' : i === currentLevelIdx ? 'active' : ''}`}
                />
              ))}
            </div>

            <div className="ctc-msg-card">
              <div className="ctc-msg-label">📡 Incoming Transmission</div>
              <div className="ctc-msg-code">{currentLevel.code}</div>
              {currentLevel.hint && <div className="ctc-msg-hint">{currentLevel.hint}</div>}
            </div>

            {/* Tools */}
            <div className="ctc-tool-accord">
              <button
                type="button"
                className="ctc-tool-toggle"
                onClick={() => setToolOpen(!toolOpen)}
              >
                <span>
                  {currentLevel.tool === 'caesar' ? '🔢 Caesar Cipher Tool' : '📻 Morse Reference Chart'}
                </span>
                <span>{toolOpen ? '▲' : '▼'}</span>
              </button>

              {toolOpen && (
                <div className="ctc-tool-body">
                  {(currentLevel.tool === 'morse' || currentLevel.tool === 'both') && (
                    <div>
                      <div style={{ fontFamily: '"Share Tech Mono", monospace', fontSize: '0.74rem', color: 'var(--text2)', marginBottom: '8px' }}>
                        Morse Code Reference Chart:
                      </div>
                      <div className="ctc-morse-grid">
                        {Object.entries(MORSE_TABLE).map(([l, code]) => (
                          <div key={l} className="ctc-morse-cell">
                            <span className="ctc-morse-letter">{l}</span>
                            <span className="ctc-morse-code">{code}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {(currentLevel.tool === 'caesar' || currentLevel.tool === 'both') && (
                    <div style={{ marginTop: currentLevel.tool === 'both' ? '18px' : '0' }}>
                      <div style={{ fontFamily: '"Share Tech Mono", monospace', fontSize: '0.74rem', color: 'var(--text2)', marginBottom: '8px' }}>
                        Adjust Caesar Shift Offset:
                      </div>
                      <div className="ctc-caesar-row">
                        <label style={{ fontFamily: '"Share Tech Mono", monospace', fontSize: '0.8rem', color: 'var(--text2)' }}>
                          Shift:
                        </label>
                        <input
                          type="range"
                          min="1"
                          max="25"
                          value={shiftVal}
                          onChange={(e) => setShiftVal(parseInt(e.target.value, 10))}
                          style={{ accentColor: 'var(--cyan)', width: '160px' }}
                        />
                        <span style={{ fontFamily: '"Orbitron", monospace', color: 'var(--cyan)', fontWeight: 700 }}>
                          {shiftVal}
                        </span>
                      </div>
                      <div className="ctc-alpha-map">
                        <div><span style={{ color: 'var(--text2)' }}>Plain: </span><span style={{ color: 'var(--cyan)' }}>{caesarMapping.plain}</span></div>
                        <div><span style={{ color: 'var(--text2)' }}>Coded: </span><span style={{ color: 'var(--yellow)' }}>{caesarMapping.coded}</span></div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Answer Input */}
            <div className="ctc-answer-wrap">
              <div className="ctc-answer-label">🔓 Your Decoded Answer</div>
              <form onSubmit={handleCheckAnswer} className="ctc-answer-row">
                <input
                  ref={inputRef}
                  type="text"
                  className="ctc-answer-input"
                  placeholder="Type your answer here..."
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  disabled={isSubmitting}
                  autoComplete="off"
                />
                <button type="submit" className="ctc-btn-cyber" disabled={!userAnswer.trim() || isSubmitting}>
                  Submit Answer
                </button>
              </form>
            </div>

            {feedback && (
              <div className={`ctc-feedback ${feedback.type}`}>{feedback.msg}</div>
            )}
          </div>
        )}

        {/* PRIZE SCREEN */}
        {screen === 'prize' && (
          <div className="ctc-prize-wrap">
            <div className="ctc-prize-icon">🏅</div>
            <h1 className="ctc-prize-title">Mission Complete</h1>
            <p style={{ fontFamily: '"Share Tech Mono", monospace', color: 'var(--text2)', marginBottom: '30px' }}>
              All transmissions decoded. You have earned your clearance, Agent.
            </p>

            <div className="ctc-prize-box">
              <div style={{ fontFamily: '"Share Tech Mono", monospace', fontSize: '0.85rem', color: 'var(--text2)', lineHeight: 1.8 }}>
                TRANSMISSION FROM: DIRECTOR OMEGA<br />
                TO: FIELD AGENT — CLEARANCE GRANTED<br /><br />
                Your access code is:
              </div>
              <div className="ctc-access-code">PHANTOM-7-DELTA</div>
              <div style={{ fontFamily: '"Share Tech Mono", monospace', fontSize: '0.82rem', color: 'var(--text2)', lineHeight: 1.85 }}>
                You have demonstrated exceptional cryptographic skills. Welcome to the inner circle.<br /><br />
                — Director Omega, Level 5 Clearance
              </div>
            </div>

            <div style={{ textAlign: 'center' }}>
              <button className="ctc-btn-cyber" onClick={startGame}>
                🔄 Play Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
