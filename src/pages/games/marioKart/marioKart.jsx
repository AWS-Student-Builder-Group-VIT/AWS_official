import React from 'react';
import useMarioKart from './useMarioKart';

export default function MarioKart() {
    const {
        canvasRef,
        gameState,
        currentAttempt,
        attemptTimer,
        attemptScores,
        attemptCoins,
        attemptStatuses,
        currentAttemptScore,
        totalScore,
        bestAttemptScore,
        coinCount,
        transitionTimer,
        activeLaneText,
        gameSpeed,
        startNewGame
    } = useMarioKart();

    // Formatting utilities
    const formatScore = (val) => {
        return Math.round(val).toLocaleString(undefined, {
            minimumIntegerDigits: 6,
            useGrouping: false
        });
    };

    // Circular timer radial math
    const dashOffset = 126 - (attemptTimer / 30.0) * 126;

    // Calculate score points awarded
    const pointsAwarded = Math.round(bestAttemptScore / 25);

    // Calculate rank title
    let rankName = "AWS Cloud Practitioner";
    if (bestAttemptScore >= 6000) {
        rankName = "AWS Certified Cloud Hero 🏆";
    } else if (bestAttemptScore >= 3500) {
        rankName = "AWS Certified Solutions Architect";
    } else if (bestAttemptScore >= 1800) {
        rankName = "AWS Certified Developer";
    }

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', width: '100%', backgroundColor: '#080b0e', padding: '20px' }}>
            <div id="game-container" style={{ position: 'relative', width: '800px', height: '600px', border: '2px solid #232f3e', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#0c1014', boxShadow: '0 0 30px rgba(0,0,0,0.8), 0 0 15px rgba(255, 153, 0, 0.4)' }}>

            {/* Embedded styles to preserve CSS animations, fonts, and dark theme variables */}
            <style dangerouslySetInnerHTML={{ __html: `
                @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Share+Tech+Mono&family=Inter:wght@400;600;800&display=swap');
                
                #game-container * {
                    box-sizing: border-box;
                    user-select: none;
                    -webkit-user-select: none;
                }
                
                .overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(12, 16, 20, 0.92);
                    backdrop-filter: blur(6px);
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    z-index: 10;
                    text-align: center;
                    padding: 40px;
                    font-family: 'Inter', sans-serif;
                    color: white;
                }
                
                h1.title {
                    font-family: 'Orbitron', sans-serif;
                    font-size: 38px;
                    font-weight: 900;
                    margin: 0 0 10px 0;
                    letter-spacing: 2px;
                    text-shadow: 0 0 10px rgba(255, 153, 0, 0.4);
                }
                
                h1.title span {
                    color: #FF9900;
                }
                
                .subtitle {
                    font-size: 15px;
                    color: #aab7c4;
                    max-width: 500px;
                    line-height: 1.5;
                    margin-bottom: 25px;
                }
                
                .controls-card {
                    background: rgba(35, 47, 62, 0.4);
                    border: 1px solid rgba(255, 153, 0, 0.2);
                    border-radius: 8px;
                    padding: 20px;
                    margin-bottom: 25px;
                    width: 100%;
                    max-width: 480px;
                    text-align: left;
                }
                
                .controls-card h3 {
                    margin-top: 0;
                    color: #FF9900;
                    font-family: 'Orbitron', sans-serif;
                    font-size: 15px;
                    letter-spacing: 1px;
                }
                
                .control-row {
                    display: flex;
                    justify-content: space-between;
                    margin: 8px 0;
                    font-size: 14px;
                }
                
                .control-label {
                    color: #aab7c4;
                }
                
                .control-key {
                    font-family: 'Share Tech Mono', monospace;
                    background: #1e252b;
                    border: 1px solid #232f3e;
                    padding: 2px 8px;
                    border-radius: 4px;
                    color: #FF9900;
                }
                
                .btn {
                    background: linear-gradient(135deg, #FF9900, #ff7b00);
                    border: none;
                    color: white;
                    padding: 14px 30px;
                    font-size: 16px;
                    font-weight: 800;
                    font-family: 'Orbitron', sans-serif;
                    letter-spacing: 1px;
                    border-radius: 4px;
                    cursor: pointer;
                    box-shadow: 0 0 15px rgba(255, 153, 0, 0.4);
                    transition: all 0.2s ease;
                }
                
                .btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 0 25px rgba(255, 153, 0, 0.6);
                }
                
                .hud-layer {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    pointer-events: none;
                    z-index: 5;
                    padding: 15px;
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    grid-template-rows: auto 1fr auto;
                    font-family: 'Inter', sans-serif;
                }
                
                .hud-card {
                    background: rgba(12, 16, 20, 0.72);
                    border: 1px solid rgba(255, 153, 0, 0.15);
                    border-radius: 6px;
                    padding: 10px 15px;
                    backdrop-filter: blur(4px);
                    color: white;
                }
                
                .hud-top-left {
                    justify-self: start;
                    align-self: start;
                    min-width: 220px;
                }
                
                .attempt-header {
                    font-family: 'Orbitron', sans-serif;
                    font-size: 11px;
                    letter-spacing: 1px;
                    color: #aab7c4;
                    margin-bottom: 6px;
                    display: flex;
                    justify-content: space-between;
                }
                
                .attempt-bars {
                    display: flex;
                    gap: 4px;
                    margin-bottom: 10px;
                }
                
                .attempt-bar {
                    height: 5px;
                    flex-grow: 1;
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 2px;
                    transition: background 0.3s ease;
                }
                
                .attempt-bar.active {
                    background: #FF9900;
                    box-shadow: 0 0 8px #FF9900;
                }
                
                .attempt-bar.spent {
                    background: #1e252b;
                }
                
                .telemetry-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: baseline;
                    margin: 4px 0;
                }
                
                .telemetry-label {
                    font-size: 10px;
                    color: #aab7c4;
                    text-transform: uppercase;
                }
                
                .telemetry-value {
                    font-family: 'Share Tech Mono', monospace;
                    font-size: 18px;
                    font-weight: bold;
                    color: white;
                }
                
                .telemetry-value.orange {
                    color: #FF9900;
                    text-shadow: 0 0 5px rgba(255, 153, 0, 0.3);
                }
                
                .hud-top-right {
                    justify-self: end;
                    align-self: start;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                
                .timer-svg-container {
                    position: relative;
                    width: 48px;
                    height: 48px;
                }
                
                .timer-svg-container svg {
                    transform: rotate(-90deg);
                }
                
                .timer-bg {
                    fill: none;
                    stroke: rgba(255, 255, 255, 0.05);
                    stroke-width: 4;
                }
                
                .timer-progress {
                    fill: none;
                    stroke: #FF9900;
                    stroke-width: 4;
                    stroke-dasharray: 126;
                    stroke-linecap: round;
                }
                
                .timer-text-container {
                    text-align: right;
                }
                
                .timer-label {
                    font-size: 9px;
                    color: #aab7c4;
                    letter-spacing: 1px;
                    text-transform: uppercase;
                }
                
                .timer-value-digital {
                    font-family: 'Share Tech Mono', monospace;
                    font-size: 24px;
                    font-weight: bold;
                    color: #FF9900;
                    text-shadow: 0 0 8px rgba(255, 153, 0, 0.4);
                }
                
                .timer-value-digital.critical {
                    color: #ff3838;
                    text-shadow: 0 0 10px rgba(255, 56, 56, 0.5);
                    animation: pulse-red 0.5s infinite alternate;
                }
                
                .hud-bottom-left {
                    grid-row: 3;
                    justify-self: start;
                    align-self: end;
                    min-width: 180px;
                }
                
                .hud-bottom-right {
                    grid-row: 3;
                    justify-self: end;
                    align-self: end;
                    min-width: 160px;
                    text-align: right;
                }
                
                #screen-alert {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    border: 0px solid #ff3838;
                    pointer-events: none;
                    z-index: 4;
                    transition: border-width 0.1s ease, background 0.1s ease;
                }
                
                #screen-alert.warning {
                    border-width: 8px;
                    box-shadow: inset 0 0 30px rgba(255, 56, 56, 0.15);
                }
                
                #screen-alert.crash {
                    border-width: 15px;
                    background: rgba(255, 56, 56, 0.25);
                }
                
                .results-table {
                    width: 100%;
                    max-width: 480px;
                    border-collapse: collapse;
                    margin: 20px 0 25px 0;
                }
                
                .results-table th {
                    font-family: 'Orbitron', sans-serif;
                    font-size: 11px;
                    color: #FF9900;
                    border-bottom: 2px solid #232f3e;
                    padding: 8px;
                    text-align: center;
                }
                
                .results-table td {
                    font-family: 'Share Tech Mono', monospace;
                    font-size: 14px;
                    padding: 8px;
                    border-bottom: 1px solid rgba(255,255,255,0.05);
                    text-align: center;
                }
                
                .results-table tr.best-row {
                    background: rgba(255, 153, 0, 0.15);
                    color: #FF9900;
                    font-weight: bold;
                }
                
                .rank-card {
                    background: rgba(255, 153, 0, 0.03);
                    border: 1px dashed #FF9900;
                    border-radius: 6px;
                    padding: 12px 20px;
                    margin-bottom: 20px;
                    width: 100%;
                    max-width: 400px;
                }
                
                .rank-title {
                    font-family: 'Orbitron', sans-serif;
                    font-size: 10px;
                    color: #aab7c4;
                    margin: 0 0 5px 0;
                    text-transform: uppercase;
                }
                
                .rank-name {
                    font-family: 'Orbitron', sans-serif;
                    font-size: 18px;
                    font-weight: bold;
                    color: white;
                    text-shadow: 0 0 8px #FF9900;
                }
                
                .best-score-badge {
                    background: rgba(255, 153, 0, 0.1);
                    border: 2px solid #FF9900;
                    box-shadow: 0 0 20px rgba(255, 153, 0, 0.2);
                    border-radius: 8px;
                    padding: 15px 30px;
                    text-align: center;
                }
                
                .best-score-label {
                    font-family: 'Orbitron', sans-serif;
                    font-size: 12px;
                    letter-spacing: 1px;
                    color: #aab7c4;
                    text-transform: uppercase;
                }
                
                .best-score-val {
                    font-family: 'Orbitron', sans-serif;
                    font-size: 38px;
                    font-weight: 900;
                    color: #FF9900;
                    text-shadow: 0 0 15px #FF9900;
                    margin-top: 5px;
                }
                
                .attempt-stat-row {
                    display: flex;
                    justify-content: space-between;
                    margin: 8px 0;
                    font-size: 16px;
                    font-family: 'Share Tech Mono', monospace;
                }
                
                .attempt-stat-label {
                    color: #aab7c4;
                }
                
                .attempt-stat-val {
                    font-weight: bold;
                    color: white;
                }
                
                #center-msg {
                    position: absolute;
                    top: 40%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    font-family: 'Orbitron', sans-serif;
                    font-size: 38px;
                    font-weight: 900;
                    color: #ff3838;
                    text-shadow: 0 0 20px rgba(255, 56, 56, 0.7);
                    opacity: 0;
                    transition: opacity 0.2s ease, transform 0.2s ease;
                    z-index: 6;
                    pointer-events: none;
                }
                
                #center-msg.active {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1.1);
                }
                
                @keyframes pulse-red {
                    from { opacity: 0.7; }
                    to { opacity: 1; }
                }
            ` }} />

            {/* Main WebGL canvas */}
            <canvas ref={canvasRef} width="800" height="600" style={{ display: 'block', backgroundColor: '#080b0e' }} />

            {/* Screen border warning overlays */}
            <div id="screen-alert" className={gameState === "crashed" ? "crash" : (attemptTimer < 8 && gameState === "playing" ? "warning" : "")} />

            {/* Floating crash text banner */}
            <div id="center-msg" className={gameState === "crashed" ? "active" : ""}>CRASHED</div>

            {/* 1. START OVERLAY SCREEN */}
            {gameState === "start" && (
                <div className="overlay">
                    <h1 className="title">AWS - <span>MarioKart</span></h1>
                    <p className="subtitle">Guide your EC2 Data Pod down the high-speed network fiber. Switch lanes to gather S3 Packet Coins and dodge Firewall Gate obstacles!</p>
                    
                    <div className="controls-card">
                        <h3>DRIVING PROTOCOLS</h3>
                        <div className="control-row">
                            <span className="control-label">Move Left (Switch Lane)</span>
                            <span className="control-key">◀ Arrow</span> / <span className="control-key">A Key</span>
                        </div>
                        <div className="control-row">
                            <span className="control-label">Move Right (Switch Lane)</span>
                            <span className="control-key">▶ Arrow</span> / <span className="control-key">D Key</span>
                        </div>
                        <div className="control-row">
                            <span className="control-label">Collision Penalty</span>
                            <span className="control-key">Obstacle hit = Instant crash fail</span>
                        </div>
                        <div className="control-row">
                            <span className="control-label">Session Target</span>
                            <span className="control-key">Survive 30.00s per attempt</span>
                        </div>
                    </div>

                    <button className="btn" onClick={startNewGame}>
                        INITIALIZE ENGINE (ATTEMPT 1/5)
                    </button>
                </div>
            )}

            {/* 2. REAL-TIME HUD GAMEPLAY STRIPS */}
            {(gameState === "playing" || gameState === "result" || gameState === "crashed") && (
                <div className="hud-layer">
                    {/* Top Left: Attempts and Speed Load */}
                    <div className="hud-card hud-top-left">
                        <div className="attempt-header">
                            <span>Active Session</span>
                            <span>{currentAttempt} / 5</span>
                        </div>
                        <div className="attempt-bars">
                            {[0, 1, 2, 3, 4].map(idx => (
                                <div 
                                    key={idx} 
                                    className={`attempt-bar ${idx < currentAttempt - 1 ? 'spent' : (idx === currentAttempt - 1 ? 'active' : '')}`} 
                                />
                            ))}
                        </div>
                        <div className="telemetry-row">
                            <span className="telemetry-label">Network Load</span>
                            <span className="telemetry-value">
                                {Math.round(gameSpeed * 120)}{' '}
                                <span style={{ fontSize: '11px', color: '#aab7c4' }}>GB/s</span>
                            </span>
                        </div>
                    </div>

                    {/* Top Right: Radial Progress Timer */}
                    <div className="hud-card hud-top-right">
                        <div className="timer-text-container">
                            <div className="timer-label">Session Remaining</div>
                            <div className={`timer-value-digital ${attemptTimer < 8 ? 'critical' : ''}`}>
                                {attemptTimer.toFixed(2)}s
                            </div>
                        </div>
                        <div className="timer-svg-container">
                            <svg width="48" height="48">
                                <circle className="timer-bg" cx="24" cy="24" r="20" />
                                <circle 
                                    className="timer-progress" 
                                    cx="24" cy="24" r="20" 
                                    style={{ 
                                        strokeDashoffset: dashOffset,
                                        stroke: attemptTimer < 8 ? '#ff3838' : '#FF9900'
                                    }}
                                />
                            </svg>
                        </div>
                    </div>

                    {/* Bottom Left: Scoreboard */}
                    <div className="hud-card hud-bottom-left">
                        <div className="telemetry-row" style={{ marginBottom: '2px' }}>
                            <span className="telemetry-label" style={{ fontSize: '9px' }}>Session Best</span>
                            <span className="telemetry-value" style={{ fontSize: '13px', color: '#aab7c4' }}>
                                {formatScore(bestAttemptScore)}
                            </span>
                        </div>
                        <div className="telemetry-row" style={{ marginBottom: '4px' }}>
                            <span className="telemetry-label" style={{ fontSize: '9px', color: '#FF9900' }}>Total Account Score</span>
                            <span className="telemetry-value orange" style={{ fontSize: '14px' }}>
                                {formatScore(totalScore + currentAttemptScore)}
                            </span>
                        </div>
                        <div className="telemetry-row" style={{ borderTop: '1px solid rgba(255,153,0,0.15)', paddingTop: '4px' }}>
                            <span className="telemetry-label" style={{ fontWeight: '800' }}>Current Score</span>
                            <span className="telemetry-value" style={{ fontSize: '20px', color: 'white' }}>
                                {formatScore(currentAttemptScore)}
                            </span>
                        </div>
                    </div>

                    {/* Bottom Right: S3 coins collected & active lane info */}
                    <div className="hud-card hud-bottom-right">
                        <div className="telemetry-row">
                            <span className="telemetry-label">Packets Collected</span>
                            <span className="telemetry-value orange">{coinCount}</span>
                        </div>
                        <div className="telemetry-row">
                            <span className="telemetry-label">Current Lane</span>
                            <span className="telemetry-value" style={{ fontSize: '12px', color: '#aab7c4' }}>
                                {activeLaneText}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* 3. ATTEMPT RESULT OVERLAY */}
            {gameState === "result" && (
                <div className="overlay">
                    <h2 className="attempt-result-title" style={{ fontSize: '28px', fontFamily: 'Orbitron', fontWeight: '900', letterSpacing: '1px', textTransform: 'uppercase', color: attemptStatuses[currentAttempt - 1] === "SUCCESS" ? "#00d26a" : "#ff3838" }}>
                        ATTEMPT {currentAttempt} {attemptStatuses[currentAttempt - 1] === "SUCCESS" ? "COMPLETED" : "CRASHED"}
                    </h2>
                    <p className="subtitle" style={{ marginBottom: '20px' }}>
                        {attemptStatuses[currentAttempt - 1] === "SUCCESS" ? "EC2 Telemetry gathered. Data session closed." : "Connection lost. Packet collision detected."}
                    </p>
                    
                    <div style={{ background: 'rgba(35, 47, 62, 0.4)', padding: '15px 25px', borderRadius: '6px', border: '1px solid rgba(255,153,0,0.15)', marginBottom: '25px', width: '100%', maxWidth: '340px' }}>
                        <div className="attempt-stat-row">
                            <span className="attempt-stat-label">Session Score</span>
                            <span className="attempt-stat-val" style={{ color: '#FF9900' }}>
                                {Math.round(currentAttemptScore).toLocaleString()}
                            </span>
                        </div>
                        <div className="attempt-stat-row">
                            <span className="attempt-stat-label">Packets Gathered</span>
                            <span className="attempt-stat-val">{coinCount}</span>
                        </div>
                        <div className="attempt-stat-row">
                            <span className="attempt-stat-label">Status</span>
                            <span className="attempt-stat-val" style={{ color: attemptStatuses[currentAttempt - 1] === "SUCCESS" ? '#00d26a' : '#ff3838' }}>
                                {attemptStatuses[currentAttempt - 1]}
                            </span>
                        </div>
                    </div>

                    <p style={{ fontFamily: 'Orbitron', fontSize: '16px', color: '#aab7c4', margin: 0 }}>
                        Provisioning Next Attempt in {Math.ceil(transitionTimer)}...
                    </p>
                </div>
            )}

            {/* 4. FINAL DECOMMISSIONED OVERLAY (NO RESTART BUTTON AS REQUESTED) */}
            {gameState === "gameover" && (
                <div className="overlay">
                    <h1 className="title">DECOMMISSIONED</h1>
                    <p className="subtitle" style={{ marginBottom: '10px' }}>
                        All 5 trial attempts exhausted. Account telemetry finalized.
                    </p>
                    
                    <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
                        <div className="best-score-badge" style={{ marginBottom: 0 }}>
                            <div className="best-score-label">Best Attempt Score</div>
                            <div className="best-score-val" id="final-best-score">
                                {bestAttemptScore.toLocaleString()}
                            </div>
                        </div>
                        <div className="best-score-badge" style={{ marginBottom: 0, borderColor: '#00d26a', boxShadow: '0 0 20px rgba(0, 210, 106, 0.2)' }}>
                            <div className="best-score-label" style={{ color: '#aab7c4' }}>Points Awarded (Best/25)</div>
                            <div className="best-score-val" style={{ color: '#00d26a', textShadow: '0 0 15px #00d26a' }} id="final-points-awarded">
                                {pointsAwarded.toLocaleString()}
                            </div>
                        </div>
                    </div>

                    <div className="rank-card">
                        <div className="rank-title">Calculated AWS Engineer Tier</div>
                        <div className="rank-name" id="rank-value">{rankName}</div>
                    </div>

                    <table className="results-table">
                        <thead>
                            <tr>
                                <th>Attempt</th>
                                <th>Score</th>
                                <th>Packets</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[0, 1, 2, 3, 4].map(idx => (
                                <tr key={idx} className={attemptScores[idx] === bestAttemptScore && bestAttemptScore > 0 ? "best-row" : ""}>
                                    <td>Attempt {idx + 1} {attemptScores[idx] === bestAttemptScore && bestAttemptScore > 0 ? '★ (BEST)' : ''}</td>
                                    <td>{attemptScores[idx].toLocaleString()}</td>
                                    <td>{attemptCoins[idx]}</td>
                                    <td style={{ color: attemptStatuses[idx] === 'SUCCESS' ? '#00d26a' : '#ff3838', fontWeight: 'bold' }}>
                                        {attemptStatuses[idx]}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div style={{ display: 'flex', gap: '40px', alignItems: 'baseline', marginBottom: '25px', justifyContent: 'center' }}>
                        <div>
                            <div style={{ fontSize: '10px', color: '#aab7c4', textTransform: 'uppercase', letterSpacing: '1px' }}>Cumulative Account Score</div>
                            <div style={{ fontFamily: 'Share Tech Mono', fontSize: '26px', fontWeight: 'bold', color: '#FF9900' }}>
                                {totalScore.toLocaleString()}
                            </div>
                        </div>
                    </div>
                </div>
            )}
            </div>
        </div>
    );
}