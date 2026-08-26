import { useEffect, useRef, useState } from 'react';
import { createMarioKartEngine } from './marioKartEngine';
import { summarizeMarioKart } from './marioKartCore';
import './marioKart.css';

const initialHud = { timer: 30, score: 0, coins: 0, speed: 0, lane: 'CENTER' };

export default function MarioKart({ onExit }) {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const [screen, setScreen] = useState('landing');
  const [attempts, setAttempts] = useState([]);
  const [hud, setHud] = useState(initialHud);
  const [muted, setMuted] = useState(false);
  const attempt = attempts.length + 1;

  useEffect(() => {
    engineRef.current = createMarioKartEngine(canvasRef.current, {
      onUpdate: setHud,
      onFinish: (result) => {
        setAttempts((current) => {
          const next = [...current, result];
          setScreen(next.length === 5 ? 'complete' : 'attempt');
          return next;
        });
      },
    });
    const onKey = (event) => {
      if (['ArrowLeft', 'ArrowRight', 'a', 'A', 'd', 'D'].includes(event.key)) event.preventDefault();
      if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') engineRef.current?.setLane(-1);
      if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') engineRef.current?.setLane(1);
    };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); engineRef.current?.destroy(); };
  }, []);

  const start = () => { setScreen('playing'); engineRef.current?.start(); };
  const restart = () => { setAttempts([]); setHud(initialHud); setScreen('landing'); };
  const summary = summarizeMarioKart(attempts);
  const last = attempts.at(-1);

  return <main className="mk-game">
    <div className="mk-shell">
      <canvas ref={canvasRef} aria-label="AWS MarioKart game canvas" />
      <header className="mk-toolbar"><button onClick={onExit}>← Games</button><span>AWS // MARIOKART</span><button onClick={() => { setMuted((value) => { engineRef.current?.mute(!value); return !value; }); }}>{muted ? 'Sound off' : 'Sound on'}</button></header>
      {screen === 'playing' && <section className="mk-hud" aria-live="polite">
        <div><small>Attempt</small><b>{attempt} / 5</b><i>{[1,2,3,4,5].map((n) => <span key={n} className={n === attempt ? 'active' : n < attempt ? 'spent' : ''} />)}</i></div>
        <div className={hud.timer < 8 ? 'danger' : ''}><small>Session remaining</small><b>{hud.timer.toFixed(2)}s</b></div>
        <div><small>Telemetry</small><b>{String(hud.score).padStart(6, '0')}</b></div>
        <div><small>S3 packets · lane</small><b>{hud.coins} · {hud.lane}</b></div>
      </section>}
      {screen === 'landing' && <section className="mk-overlay"><p className="eyebrow">AWS NETWORK RACING</p><h1>AWS <em>MarioKart</em></h1><p>Guide your EC2 data pod through the cloud corridor. Switch lanes, collect S3 packets, and avoid firewall gates.</p><div className="mk-rules"><span>← / A</span> Move left <span>→ / D</span> Move right <span>30 SEC</span> Survive each run</div><button className="mk-primary" onClick={start}>Initialize engine · attempt 1/5</button><button className="mk-link" onClick={onExit}>Back to games</button></section>}
      {screen === 'attempt' && <section className="mk-overlay"><p className="eyebrow">RUN {attempts.length} CONCLUDED</p><h2 className={last.success ? 'success' : 'failure'}>{last.success ? 'SESSION COMPLETE' : 'FIREWALL COLLISION'}</h2><div className="mk-stats"><span>Score <b>{last.score}</b></span><span>S3 packets <b>{last.coins}</b></span><span>Status <b>{last.success ? 'SUCCESS' : 'CRASH'}</b></span></div><button className="mk-primary" onClick={start}>Start attempt {attempt}/5</button><button className="mk-link" onClick={onExit}>Back to games</button></section>}
      {screen === 'complete' && <section className="mk-overlay mk-results"><p className="eyebrow">TOURNAMENT COMPLETE</p><h2>Telemetry finalized</h2><div className="mk-summary"><span><small>Best attempt</small><b>{summary.bestScore}</b></span><span><small>Points awarded</small><b>{summary.points}</b></span><span><small>Rank</small><b>{summary.rank}</b></span></div><ol>{attempts.map((entry, index) => <li key={index}><span>Run {index + 1}</span><b>{entry.score}</b><em>{entry.success ? 'SUCCESS' : 'CRASH'}</em></li>)}</ol><button className="mk-primary" onClick={restart}>Replay tournament</button><button className="mk-link" onClick={onExit}>Back to games</button></section>}
      <nav className="mk-mobile" aria-label="Touch controls"><button onPointerDown={() => engineRef.current?.setLane(-1)}>◀</button><button onPointerDown={() => engineRef.current?.setLane(1)}>▶</button></nav>
    </div>
  </main>;
}
