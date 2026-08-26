import React from 'react';
import usewaterGirlFireBoy from './useWaterGirlFireBoy';


export default function WaterGirlFireboy() {
  const {
    canvasRef,
    sessionState,
    currentAttempt,
    maxAttempts,
    liveScore,
    timeRemaining,
    attemptScores,
    bestScore,
    pointsAwarded,
    attemptDetails,
    startSession,
    nextAttempt,
    restartSession
  } = usewaterGirlFireBoy();

  return (
    <div className="wgfb-wrapper">
      {/* Scope styles directly inside wrapper to prevent global leakage */}
      <style dangerouslySetInnerHTML={{ __html: `
        .wgfb-wrapper {
          position: relative;
          display: flex;
          justify-content: center;
          align-items: center;
          color: #f8fafc;
          font-family: 'Outfit', sans-serif;
          user-select: none;
          min-height: 100vh;
          background: radial-gradient(circle at center, #1b2230 0%, #080b11 100%);
        }

        .wgfb-container { 
          background: rgba(19, 25, 33, 0.95);
          border: 1px solid rgba(255, 153, 0, 0.25);
          border-radius: 16px;
          padding: 20px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.7), 0 0 30px rgba(255, 153, 0, 0.05);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          position: relative;
          width: 840px;
          box-sizing: border-box;
        }

        .wgfb-header {
          width: 100%;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          padding-bottom: 12px;
        }

        .wgfb-title-section {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .wgfb-aws-logo {
          width: 28px;
          height: 28px;
          background: linear-gradient(135deg, #ff9900 0%, #ff5500 100%);
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 12px;
          color: #131921;
          box-shadow: 0 0 10px rgba(255, 153, 0, 0.3);
        }

        .wgfb-title-section h1 {
          font-size: 20px;
          font-weight: 800;
          letter-spacing: 1px;
          margin: 0;
          background: linear-gradient(90deg, #ffffff 0%, #ff9900 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .wgfb-stats-bar {
          width: 100%;
          display: grid;
          grid-template-columns: 1.2fr 1fr 1fr;
          align-items: center;
          gap: 16px;
          background: rgba(0, 0, 0, 0.25);
          border-radius: 10px;
          padding: 10px 16px;
          box-sizing: border-box;
        }

        .wgfb-stat-item {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .wgfb-stat-label {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          color: #94a3b8;
          margin-bottom: 4px;
        }

        .wgfb-stat-value {
          font-family: 'JetBrains Mono', monospace;
          font-weight: 700;
          font-size: 20px;
          color: #ff9900;
          text-shadow: 0 0 10px rgba(255, 153, 0, 0.2);
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .wgfb-stat-value.teal {
          color: #00a1c9;
          text-shadow: 0 0 10px rgba(0, 161, 201, 0.2);
        }

        .wgfb-attempts-nodes {
          display: flex;
          gap: 6px;
          margin-top: 4px;
        }

        .wgfb-attempt-node {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #334155;
          border: 1px solid rgba(255,255,255,0.05);
          transition: all 0.3s ease;
        }

        .wgfb-attempt-node.completed {
          background: #ff9900;
          box-shadow: 0 0 8px rgba(255, 153, 0, 0.5);
        }

        .wgfb-attempt-node.active {
          background: #00a1c9;
          box-shadow: 0 0 8px rgba(0, 161, 201, 0.8);
          animation: wgfb-pulseNode 1.5s infinite alternate;
        }

        @keyframes wgfb-pulseNode {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(1.3); opacity: 1; }
        }

        .wgfb-canvas { 
          background-color: #0f131a; 
          border: 2px solid #232f3e; 
          border-radius: 8px;
          box-shadow: inset 0 0 30px rgba(0, 0, 0, 0.8);
          display: block;
        }

        .wgfb-controls-legend {
          width: 100%;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          padding-top: 14px;
        }

        .wgfb-legend-col {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          font-size: 13px;
        }

        .wgfb-legend-badge {
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .wgfb-orange-badge {
          background: rgba(255, 153, 0, 0.15);
          color: #ff9900;
          border: 1px solid rgba(255, 153, 0, 0.3);
        }

        .wgfb-teal-badge {
          background: rgba(0, 161, 201, 0.15);
          color: #00a1c9;
          border: 1px solid rgba(0, 161, 201, 0.3);
        }

        .wgfb-legend-keys {
          font-family: 'JetBrains Mono', monospace;
          font-weight: 700;
          color: #fff;
          background: #232f3e;
          padding: 3px 10px;
          border-radius: 6px;
          border: 1px solid rgba(255,255,255,0.05);
          margin: 2px 0;
        }

        .wgfb-legend-desc {
          color: #64748b;
          font-size: 11px;
        }

        .wgfb-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(10, 14, 20, 0.96);
          border-radius: 16px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          z-index: 10;
          padding: 30px;
          box-sizing: border-box;
          text-align: center;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.3s ease;
        }

        .wgfb-overlay.visible {
          opacity: 1;
          pointer-events: auto;
        }

        .wgfb-overlay h2 {
          font-size: 38px;
          font-weight: 800;
          margin-top: 0;
          margin-bottom: 12px;
          background: linear-gradient(90deg, #ff9900, #ff5500);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          text-transform: uppercase;
          letter-spacing: 2px;
        }

        .wgfb-overlay p {
          font-size: 15px;
          color: #94a3b8;
          max-width: 520px;
          line-height: 1.6;
          margin: 0 0 24px 0;
        }

        .wgfb-btn {
          background: linear-gradient(90deg, #ff9900, #ff6600);
          color: #131921;
          border: none;
          border-radius: 8px;
          padding: 14px 36px;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          font-family: 'Outfit', sans-serif;
          text-transform: uppercase;
          letter-spacing: 1px;
          transition: all 0.2s ease;
          box-shadow: 0 4px 20px rgba(255, 153, 0, 0.35);
        }

        .wgfb-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 24px rgba(255, 153, 0, 0.5);
          background: linear-gradient(90deg, #ffb03a, #ff7700);
        }

        .wgfb-btn:active {
          transform: translateY(1px);
        }

        .wgfb-results-table {
          width: 100%;
          max-width: 440px;
          margin-bottom: 24px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .wgfb-results-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.05);
          padding: 10px 16px;
          border-radius: 8px;
          font-size: 14px;
          transition: all 0.3s ease;
        }

        .wgfb-results-row.best {
          background: rgba(255, 153, 0, 0.08);
          border: 1px solid rgba(255, 153, 0, 0.3);
          box-shadow: 0 0 15px rgba(255, 153, 0, 0.08);
        }

        .wgfb-results-row.failed {
          background: rgba(239, 68, 68, 0.03);
          border: 1px solid rgba(239, 68, 68, 0.15);
          opacity: 0.8;
        }

        .wgfb-row-label {
          font-weight: 600;
        }
        .wgfb-row-label.best-label {
          color: #ff9900;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .wgfb-row-label.failed-label {
          color: #ef4444;
        }

        .wgfb-row-val {
          font-family: 'JetBrains Mono', monospace;
          font-weight: 700;
        }
        .wgfb-row-val.best-val {
          color: #ff9900;
        }
        .wgfb-row-val.failed-val {
          color: #ef4444;
        }

        .wgfb-summary-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(0, 0, 0, 0.3);
          border: 1px dashed rgba(255, 153, 0, 0.3);
          border-radius: 10px;
          padding: 16px 24px;
          width: 100%;
          max-width: 440px;
          box-sizing: border-box;
          margin-bottom: 24px;
        }

        .wgfb-summary-block {
          display: flex;
          flex-direction: column;
          text-align: left;
        }
        .wgfb-summary-block.right-block {
          text-align: right;
          border-left: 1px dashed rgba(255, 255, 255, 0.15);
          padding-left: 24px;
        }

        .wgfb-summary-label {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          color: #94a3b8;
          margin-bottom: 4px;
        }

        .wgfb-summary-val {
          font-size: 32px;
          font-weight: 800;
          line-height: 1.1;
        }
      ` }} />

      <div className="wgfb-container">
        {/* Header Section */}
        <div className="wgfb-header">
          <div className="wgfb-title-section">
            <div className="wgfb-aws-logo">aws</div>
            <h1>Watergirl Fireboy</h1>
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>CO-OP TELEMETRY</div>
        </div>

        {/* HUD Statistics Bar */}
        <div className="wgfb-stats-bar">
          <div className="wgfb-stat-item" style={{ alignItems: 'flex-start' }}>
            <span className="wgfb-stat-label">Mission Runs</span>
            <div className="wgfb-attempts-nodes">
              {Array.from({ length: maxAttempts }).map((_, idx) => {
                const nodeNum = idx + 1;
                let classStr = "wgfb-attempt-node";
                if (nodeNum < currentAttempt) {
                  classStr += " completed";
                } else if (nodeNum === currentAttempt) {
                  classStr += " active";
                }
                return <div key={idx} className={classStr} />;
              })}
            </div>
          </div>
          <div className="wgfb-stat-item">
            <span className="wgfb-stat-label">Time Remaining</span>
            <span
              className="wgfb-stat-value"
              style={{
                color: timeRemaining <= 10 ? '#ef4444' : '#ff9900',
                textShadow: timeRemaining <= 10 ? '0 0 10px rgba(239, 68, 68, 0.4)' : '0 0 10px rgba(255, 153, 0, 0.2)'
              }}
            >
              {timeRemaining}s
            </span>
          </div>
          <div className="wgfb-stat-item" style={{ alignItems: 'flex-end' }}>
            <span className="wgfb-stat-label">Telemetry Score</span>
            <span className="wgfb-stat-value teal">
              {liveScore.toString().padStart(4, '0')}
            </span>
          </div>
        </div>
        
        {/* Canvas Area */}
        <canvas ref={canvasRef} className="wgfb-canvas" width={800} height={600}></canvas>

        {/* Controls Legend Footer */}
        <div className="wgfb-controls-legend">
          <div className="wgfb-legend-col">
            <span className="wgfb-legend-badge wgfb-orange-badge">Compute Core</span>
            <span className="wgfb-legend-keys">▲, ◄, ►</span>
            <span className="wgfb-legend-desc">Survives Orange Lava Pools</span>
          </div>
          <div className="wgfb-legend-col">
            <span className="wgfb-legend-badge wgfb-teal-badge">Storage Node</span>
            <span className="wgfb-legend-keys">W, A, D</span>
            <span className="wgfb-legend-desc">Survives Teal Cooling Fluid Pools</span>
          </div>
        </div>

        {/* Start Overlay Screen */}
        <div className={`wgfb-overlay ${sessionState === "START" ? "visible" : ""}`}>
          <h2>AWS Watergirl Fireboy</h2>
          <p>AWS core elements are offline! Co-op coordinate as the **Compute Core** and **Storage Node** to gather critical Cloud Credits and restore system connectivity at the gateway portals.</p>
          
          <div style={{ display: 'flex', gap: '20px', marginBottom: '28px', textAlign: 'left', width: '100%', maxWidth: '480px', justifyContent: 'center' }}>
            <div style={{ background: 'rgba(255, 153, 0, 0.08)', border: '1px solid rgba(255, 153, 0, 0.25)', padding: '14px', borderRadius: '10px', width: '50%' }}>
              <strong style={{ color: '#ff9900', display: 'block', marginBottom: '4px' }}>🔥 COMPUTE CORE</strong>
              <span style={{ fontSize: '12px', color: '#cbd5e1', display: 'block' }}>Controls: Arrow Keys</span>
              <span style={{ fontSize: '12px', color: '#ef4444', display: 'block', marginTop: '4px' }}>❌ Dies in: Teal Water & Malware</span>
            </div>
            <div style={{ background: 'rgba(0, 161, 201, 0.08)', border: '1px solid rgba(0, 161, 201, 0.25)', padding: '14px', borderRadius: '10px', width: '50%' }}>
              <strong style={{ color: '#00a1c9', display: 'block', marginBottom: '4px' }}>💧 STORAGE NODE</strong>
              <span style={{ fontSize: '12px', color: '#cbd5e1', display: 'block' }}>Controls: W, A, D Keys</span>
              <span style={{ fontSize: '12px', color: '#ef4444', display: 'block', marginTop: '4px' }}>❌ Dies in: Orange Lava & Malware</span>
            </div>
          </div>
          
          <button className="wgfb-btn" onClick={startSession}>Start Mission (5 Attempts)</button>
        </div>

        {/* Attempt End Screen Overlay */}
        <div className={`wgfb-overlay ${sessionState === "ATTEMPT_END" && attemptDetails ? "visible" : ""}`}>
          <h2>{attemptDetails?.titleMessage}</h2>
          <div
            style={{
              fontSize: '26px',
              fontWeight: 800,
              marginBottom: '20px',
              letterSpacing: '1px',
              color: attemptDetails?.success ? '#10b981' : '#ef4444',
              textShadow: attemptDetails?.success ? '0 0 10px rgba(16, 185, 129, 0.3)' : '0 0 10px rgba(239, 68, 68, 0.3)'
            }}
          >
            {attemptDetails?.success ? "SUCCESS" : "RUN FAILURE"}
          </div>
          
          {attemptDetails && (
            <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '20px', width: '340px', marginBottom: '24px', fontFamily: "'JetBrains Mono', monospace", textAlign: 'left', boxSizing: 'border-box', fontSize: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ color: '#94a3b8' }}>Credits Collected:</span>
                <span style={{ color: '#00a1c9' }}>{attemptDetails.gemsCollected}/10</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ color: '#94a3b8' }}>Base Credit Score:</span>
                <span>{attemptDetails.gemsCollected * 100}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '10px' }}>
                <span style={{ color: '#94a3b8' }}>Latency Time Bonus:</span>
                <span style={{ color: '#10b981' }}>+{attemptDetails.timeBonus}</span>
              </div>
              {!attemptDetails.success && attemptDetails.cause && (
                <div style={{ fontSize: '12px', color: '#ef4444', marginBottom: '10px', textAlign: 'center', background: 'rgba(239,68,68,0.1)', padding: '6px', borderRadius: '4px' }}>
                  {attemptDetails.cause}
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '18px', paddingTop: '8px' }}>
                <span>Telemetry Score:</span>
                <span style={{ color: '#ff9900' }}>{attemptDetails.totalScore}</span>
              </div>
            </div>
          )}
          
          <button className="wgfb-btn" onClick={nextAttempt}>
            {currentAttempt < maxAttempts ? `Start Run ${currentAttempt + 1}` : "Analyze Session Telemetry"}
          </button>
        </div>

        {/* Results Screen Overlay */}
        <div className={`wgfb-overlay ${sessionState === "SESSION_END" ? "visible" : ""}`}>
          <h2>Telemetry Report</h2>
          <p>Database transmission finalized. The metrics for all 5 infrastructure runs are summarized below:</p>
          
          <div className="wgfb-results-table">
            {attemptScores.map((record, index) => {
              const isBest = record.score === bestScore && bestScore > 0;
              let rowClass = "wgfb-results-row";
              if (isBest) {
                rowClass += " best";
              } else if (!record.success) {
                rowClass += " failed";
              }

              return (
                <div key={index} className={rowClass}>
                  {isBest ? (
                    <span className="wgfb-row-label best-label">🏆 Run {record.attempt} (Best)</span>
                  ) : !record.success ? (
                    <span className="wgfb-row-label failed-label">⚠️ Run {record.attempt} (Failed)</span>
                  ) : (
                    <span className="wgfb-row-label">✅ Run {record.attempt}</span>
                  )}
                  <span className={`wgfb-row-val ${isBest ? 'best-val' : !record.success ? 'failed-val' : ''}`}>
                    {record.score} pts
                  </span>
                </div>
              );
            })}
          </div>
          
          <div className="wgfb-summary-card">
            <div className="wgfb-summary-block">
              <span className="wgfb-summary-label">Highest Score</span>
              <span className="wgfb-summary-val" style={{ color: '#ff9900', textShadow: '0 0 10px rgba(255,153,0,0.25)' }}>
                {bestScore}
              </span>
            </div>
            <div className="wgfb-summary-block right-block">
              <span className="wgfb-summary-label">Credits Awarded</span>
              <span className="wgfb-summary-val" style={{ color: '#10b981', textShadow: '0 0 10px rgba(16,185,129,0.25)' }}>
                {pointsAwarded}
              </span>
            </div>
          </div>
          
          <button className="wgfb-btn" onClick={restartSession}>Replay Session</button>
        </div>
      </div>
    </div>
  );
}