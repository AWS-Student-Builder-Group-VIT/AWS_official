import React, { useRef } from 'react';
import useAsteroidvsAsteroid from './useAsteroidVSasteroid';


export default function AsteroidVsAsteroid() {
    const canvasRef = useRef(null);
    const {
        score,
        highScore,
        level,
        shield,
        multiplier,
        attemptsScores,
        survivalTimer,
        gameOver,
        gameStarted,
        isMuted,
        maxAttempts,
        startGame,
        toggleMute
    } = useAsteroidvsAsteroid(canvasRef);

    // Formatter helpers
    const formatNumber = (num) => {
        return num.toLocaleString('en-US', { minimumIntegerDigits: 6, useGrouping: false });
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
    };

    const completedAttempts = attemptsScores.length;
    const isTournamentFinished = completedAttempts >= maxAttempts;
    const bestScore = attemptsScores.length > 0 ? Math.max(...attemptsScores) : 0;
    const teamPoints = (bestScore / 100).toFixed(2);

    return (
        <div className="game-wrapper-react" style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', backgroundColor: '#0a0f14' }}>
            {/* Embedded styles to make the component fully self-contained */}
            <style dangerouslySetInnerHTML={{ __html: `
                @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@500;700&display=swap');

                .game-wrapper-react {
                    --aws-orange: #ff9900;
                    --aws-orange-glow: rgba(255, 153, 0, 0.4);
                    --aws-orange-bright: #ffb347;
                    --aws-dark-charcoal: #19232d;
                    --aws-deep-slate: #232f3e;
                    --aws-black: #0f141a;
                    --critical-red: #ff3c00;
                    color: #eaeded;
                    font-family: 'Rajdhani', sans-serif;
                }

                .game-wrapper-react * {
                    box-sizing: border-box;
                    user-select: none;
                    outline: none;
                }

                /* Canvas positioning */
                .game-canvas-react {
                    display: block;
                    width: 100%;
                    height: 100%;
                    position: absolute;
                    top: 0;
                    left: 0;
                    z-index: 1;
                }

                /* UI Overlays */
                .overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 10;
                    background: radial-gradient(circle, rgba(25, 35, 45, 0.85) 0%, rgba(15, 20, 26, 0.98) 100%);
                    backdrop-filter: blur(8px);
                    transition: opacity 0.5s ease, visibility 0.5s ease;
                }

                .menu-card {
                    background-color: rgba(20, 27, 36, 0.95);
                    border: 2px solid var(--aws-deep-slate);
                    border-radius: 8px;
                    padding: 40px;
                    width: 90%;
                    max-width: 500px;
                    text-align: center;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5), 0 0 20px rgba(255, 153, 0, 0.15);
                    position: relative;
                    overflow: hidden;
                }

                .menu-card::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 3px;
                    background: linear-gradient(90deg, transparent, var(--aws-orange), transparent);
                    animation: scanline 2.5s infinite linear;
                }

                @keyframes scanline {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }

                .glow-text {
                    font-family: 'Orbitron', sans-serif;
                    font-size: 2.5rem;
                    font-weight: 900;
                    margin: 0 0 5px 0;
                    letter-spacing: 2px;
                    color: #ffffff;
                    text-shadow: 0 0 10px rgba(255, 255, 255, 0.1), 0 0 20px var(--aws-orange-glow);
                    line-height: 1.1;
                }

                .glow-text.critical {
                    text-shadow: 0 0 10px rgba(255, 0, 0, 0.2), 0 0 20px rgba(255, 60, 0, 0.4);
                    color: #ffffff;
                }

                .subtitle {
                    font-size: 1.1rem;
                    letter-spacing: 5px;
                    color: var(--aws-orange);
                    margin-bottom: 30px;
                    font-weight: 700;
                }

                /* Controls guide */
                .controls-guide {
                    display: flex;
                    flex-direction: column;
                    gap: 15px;
                    margin-bottom: 35px;
                    text-align: left;
                    background-color: rgba(15, 20, 26, 0.6);
                    padding: 15px;
                    border-radius: 6px;
                    border: 1px solid rgba(255, 153, 0, 0.1);
                }

                .control-item {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .control-item p {
                    margin: 0;
                    font-size: 0.95rem;
                    color: #a2b0b8;
                }

                .key-badge {
                    background-color: var(--aws-deep-slate);
                    border: 1px solid rgba(255, 153, 0, 0.3);
                    border-radius: 4px;
                    padding: 3px 8px;
                    font-family: 'Orbitron', sans-serif;
                    font-size: 0.85rem;
                    color: #ffffff;
                    min-width: 25px;
                    text-align: center;
                    box-shadow: inset 0 0 5px rgba(255, 153, 0, 0.2);
                }

                /* Button */
                .aws-btn {
                    background-color: var(--aws-orange);
                    color: #000000;
                    border: none;
                    border-radius: 4px;
                    padding: 14px 35px;
                    font-family: 'Orbitron', sans-serif;
                    font-size: 1.1rem;
                    font-weight: 700;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    box-shadow: 0 4px 15px rgba(255, 153, 0, 0.3);
                    letter-spacing: 1px;
                }

                .aws-btn:hover {
                    background-color: var(--aws-orange-bright);
                    box-shadow: 0 4px 25px rgba(255, 153, 0, 0.6);
                    transform: translateY(-2px);
                }

                .aws-btn:active {
                    transform: translateY(1px);
                }

                /* HUD Overlay */
                .hud-panel {
                    position: absolute;
                    top: 20px;
                    left: 0;
                    width: 100%;
                    padding: 0 30px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    z-index: 5;
                    pointer-events: none;
                }

                /* HUD elements */
                .stage-tag {
                    font-family: 'Orbitron', sans-serif;
                    font-size: 1.15rem;
                    font-weight: 700;
                    color: #ffffff;
                    border-left: 3px solid var(--aws-orange);
                    padding-left: 10px;
                    letter-spacing: 1px;
                }

                .shield-container {
                    width: 240px;
                    text-align: center;
                }

                .shield-label {
                    font-size: 0.75rem;
                    letter-spacing: 2px;
                    color: #a2b0b8;
                    margin-bottom: 5px;
                }

                .shield-bar-bg {
                    height: 10px;
                    background-color: rgba(35, 47, 62, 0.6);
                    border: 1px solid rgba(255, 153, 0, 0.2);
                    border-radius: 5px;
                    overflow: hidden;
                    box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
                }

                .shield-bar-fill {
                    height: 100%;
                    box-shadow: 0 0 10px rgba(255, 153, 0, 0.7);
                    transition: width 0.3s ease;
                }

                .hud-top-right {
                    display: flex;
                    align-items: center;
                }

                .hud-stat-box {
                    text-align: right;
                }

                .hud-label {
                    font-size: 0.7rem;
                    letter-spacing: 2px;
                    color: #a2b0b8;
                }

                .hud-value {
                    font-family: 'Orbitron', sans-serif;
                    font-size: 1.4rem;
                    font-weight: 700;
                    color: #ffffff;
                }

                .hud-value.highlight {
                    color: var(--aws-orange);
                    text-shadow: 0 0 8px var(--aws-orange-glow);
                }

                /* Stats panel in Game Over */
                .stats-panel {
                    background-color: rgba(15, 20, 26, 0.7);
                    border: 1px solid var(--aws-deep-slate);
                    border-radius: 6px;
                    padding: 15px;
                    margin-bottom: 30px;
                    text-align: left;
                }

                .stat-row {
                    display: flex;
                    justify-content: space-between;
                    padding: 8px 0;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                    font-size: 1rem;
                    color: #a2b0b8;
                }

                .stat-row:last-child {
                    border-bottom: none;
                }

                .stat-row.highlight {
                    color: #ffffff;
                    font-weight: 700;
                }

                .stat-row.highlight .stat-val {
                    color: var(--aws-orange);
                    text-shadow: 0 0 5px var(--aws-orange-glow);
                }

                .stat-val {
                    font-family: 'Orbitron', sans-serif;
                    color: #ffffff;
                }

                /* Mute button styling */
                .mute-container {
                    position: absolute;
                    bottom: 20px;
                    right: 20px;
                    z-index: 6;
                }

                .btn-mute {
                    background-color: rgba(20, 27, 36, 0.7);
                    border: 1px solid var(--aws-deep-slate);
                    width: 44px;
                    height: 44px;
                    border-radius: 50%;
                    cursor: pointer;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    transition: all 0.3s ease;
                }

                .btn-mute:hover {
                    border-color: var(--aws-orange);
                    box-shadow: 0 0 10px var(--aws-orange-glow);
                }

                .btn-mute svg {
                    width: 22px;
                    height: 22px;
                    fill: #a2b0b8;
                    transition: fill 0.3s ease;
                }

                .btn-mute:hover svg {
                    fill: var(--aws-orange);
                }

                .hidden {
                    display: none !important;
                }
            `}} />

            {/* WebGL Canvas Component */}
            <canvas ref={canvasRef} className="game-canvas-react" />

            {/* Start Menu Overlay */}
            {!gameStarted && (
                <div className="overlay">
                    <div className="menu-card">
                        <h1 className="glow-text">ASTEROID<br/><span style={{ color: '#ff9900' }}>vs</span> ASTEROID</h1>
                        <p className="subtitle">3D AWS SPACE COMMAND</p>
                        <div className="controls-guide">
                            <div className="control-item">
                                <span className="key-badge">←</span> <span className="key-badge">→</span> / <span className="key-badge">A</span> <span className="key-badge">D</span>
                                <p>Move Ship Left / Right</p>
                            </div>
                            <div className="control-item">
                                <span className="key-badge">↑</span> <span className="key-badge">↓</span> / <span className="key-badge">W</span> <span className="key-badge">S</span>
                                <p>Slide Ship Forward / Backward</p>
                            </div>
                            <div className="control-item">
                                <span className="key-badge" style={{ width: '110px' }}>SPACEBAR</span>
                                <p>Fire Twin Plasma Lasers</p>
                            </div>
                        </div>
                        <button className="aws-btn" onClick={startGame}>LAUNCH MISSION</button>
                    </div>
                </div>
            )}

            {/* HUD Overlay Panel */}
            {gameStarted && !gameOver && (
                <div className="hud-panel">
                    <div className="hud-top-left" style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                        <div className="stage-tag">STAGE <span>{String(level).padStart(2, '0')}</span></div>
                        <div className="stage-tag" style={{ borderColor: 'var(--aws-orange)' }}>ATTEMPT <span>{completedAttempts + 1} / {maxAttempts}</span></div>
                    </div>
                    
                    <div className="hud-top-center">
                        <div style={{ display: 'flex', gap: '30px', alignItems: 'center' }}>
                            <div className="hud-stat-box" style={{ textAlign: 'center' }}>
                                <div className="hud-label">SURVIVAL TIME</div>
                                <div className="hud-value" style={{ fontSize: '1.25rem', color: 'var(--aws-orange)' }}>{formatTime(survivalTimer)}</div>
                            </div>
                            <div className="shield-container">
                                <div className="shield-label">SHIELD INTEGRITY</div>
                                <div className="shield-bar-bg">
                                    <div 
                                        className="shield-bar-fill" 
                                        style={{ 
                                            width: `${shield}%`,
                                            background: shield < 35 
                                                ? 'linear-gradient(90deg, #ff3c00 0%, #ff0000 100%)' 
                                                : 'linear-gradient(90deg, var(--aws-orange) 0%, #ff4500 100%)'
                                        }} 
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="hud-top-right">
                        <div className="hud-stat-box">
                            <div className="hud-label">SCORE</div>
                            <div className="hud-value">{formatNumber(score)}</div>
                        </div>
                        <div className="hud-stat-box" style={{ marginLeft: '20px' }}>
                            <div className="hud-label">MULTIPLIER</div>
                            <div className="hud-value highlight">x{multiplier}</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Game Over / Tournament Complete Screen */}
            {gameOver && (
                <div className="overlay">
                    <div className="menu-card" style={{ maxWidth: '520px' }}>
                        <h1 className={`glow-text ${!isTournamentFinished ? 'critical' : ''}`}>
                            {!isTournamentFinished ? 'MISSION FAILURE' : 'TOURNAMENT COMPLETE'}
                        </h1>
                        <p className="subtitle" style={{ color: !isTournamentFinished ? '#ff3c00' : 'var(--aws-orange)' }}>
                            {!isTournamentFinished ? 'SHIP INTEGRITY COMPROMISED' : 'ALL 5 OF 5 ATTEMPTS COMPLETED'}
                        </p>
                        
                        {/* Attempts 1-4 standard scorecard */}
                        {!isTournamentFinished ? (
                            <div className="stats-panel">
                                <div className="stat-row">
                                    <span>Final Score</span>
                                    <span className="stat-val">{formatNumber(score)}</span>
                                </div>
                                <div className="stat-row">
                                    <span>Stage Reached</span>
                                    <span className="stat-val">{level}</span>
                                </div>
                                <div className="stat-row highlight">
                                    <span>Personal Best</span>
                                    <span className="stat-val">{formatNumber(highScore)}</span>
                                </div>
                            </div>
                        ) : (
                            /* Final tournament statistics leaderboard */
                            <div className="stats-panel">
                                <div className="stat-row highlight" style={{ justifyContent: 'center', fontSize: '1.15rem', borderBottom: '2px solid var(--aws-deep-slate)', paddingBottom: '8px', marginBottom: '8px' }}>
                                    <span>TOURNAMENT BREAKDOWN</span>
                                </div>
                                <div className="stat-row">
                                    <span>Attempt 1 Score</span>
                                    <span className="stat-val">{formatNumber(attemptsScores[0] || 0)}</span>
                                </div>
                                <div className="stat-row">
                                    <span>Attempt 2 Score</span>
                                    <span className="stat-val">{formatNumber(attemptsScores[1] || 0)}</span>
                                </div>
                                <div className="stat-row">
                                    <span>Attempt 3 Score</span>
                                    <span className="stat-val">{formatNumber(attemptsScores[2] || 0)}</span>
                                </div>
                                <div className="stat-row">
                                    <span>Attempt 4 Score</span>
                                    <span className="stat-val">{formatNumber(attemptsScores[3] || 0)}</span>
                                </div>
                                <div className="stat-row" style={{ borderBottom: '2px solid var(--aws-deep-slate)', paddingBottom: '8px', marginBottom: '8px' }}>
                                    <span>Attempt 5 Score</span>
                                    <span className="stat-val">{formatNumber(attemptsScores[4] || 0)}</span>
                                </div>
                                <div className="stat-row highlight">
                                    <span>TOURNAMENT BEST</span>
                                    <span className="stat-val">{formatNumber(bestScore)}</span>
                                </div>
                                <div className="stat-row highlight" style={{ color: 'var(--aws-orange)', borderTop: '1px dashed rgba(255, 153, 0, 0.4)', paddingTop: '12px', marginTop: '8px', fontSize: '1.15rem' }}>
                                    <span>TEAM POINTS AWARDED</span>
                                    <span className="stat-val" style={{ color: 'var(--aws-orange-bright)', fontSize: '1.25rem' }}>{teamPoints} pts</span>
                                </div>
                            </div>
                        )}
                        
                        {/* Only show launch button if tournament has attempts remaining */}
                        {!isTournamentFinished && (
                            <button className="aws-btn" onClick={startGame}>
                                LAUNCH ATTEMPT {completedAttempts + 1} / {maxAttempts}
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Float Audio Toggle Controls */}
            <div className="mute-container">
                <button className="btn-mute" aria-label="Toggle Sound" onClick={toggleMute}>
                    {isMuted ? (
                        <svg viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.21.05-.42.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9-9.27-3.27zm7.73 1v4.18l-2.09-2.09L12 4z"/></svg>
                    ) : (
                        <svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
                    )}
                </button>
            </div>
        </div>
    );
}