import { useEffect, useRef, useState } from 'react';
import { createAsteroidCommandEngine } from './asteroidCommandEngine';
import { summarizeAsteroidRun } from './asteroidCommandCore';
import './asteroidCommand.css';

const blank = { score: 0, shield: 100, stage: 1, multiplier: 1, destroyed: 0, survival: 0 };
const keyMap = { ArrowLeft: 'left', a: 'left', ArrowRight: 'right', d: 'right', ArrowUp: 'up', w: 'up', ArrowDown: 'down', s: 'down', ' ': 'fire' };

export default function AsteroidCommand({ onExit, onComplete }) {
  const hostRef = useRef(null);
  const engineRef = useRef(null);
  const [screen, setScreen] = useState('landing');
  const [hud, setHud] = useState(blank);
  const [result, setResult] = useState(null);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    engineRef.current = createAsteroidCommandEngine(hostRef.current, {
      onUpdate: setHud,
      onFinish: (run) => {
        const next = summarizeAsteroidRun(run.score);
        setResult({ ...run, ...next });
        setScreen('complete');
        onComplete?.({ official: true, score: next.score, attempts: [run] });
        try {
          const high = Math.max(Number(localStorage.getItem('aws_space_high_score')) || 0, next.score);
          localStorage.setItem('aws_space_high_score', String(high));
        } catch { /* storage is optional */ }
      },
    });
    const handle = (value) => (event) => {
      const action = keyMap[event.key];
      if (action) { event.preventDefault(); engineRef.current?.setInput(action, value); }
    };
    const down = handle(true);
    const up = handle(false);
    const resize = () => engineRef.current?.resize();
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('resize', resize);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('resize', resize);
      engineRef.current?.destroy();
    };
  }, [onComplete]);

  const start = () => { setHud(blank); setResult(null); setScreen('playing'); engineRef.current?.start(); };
  const press = (action) => <button onPointerDown={() => engineRef.current?.setInput(action, true)} onPointerUp={() => engineRef.current?.setInput(action, false)} onPointerLeave={() => engineRef.current?.setInput(action, false)}>{({ left: '◀', right: '▶', up: '▲', down: '▼', fire: 'FIRE' })[action]}</button>;

  return <main className="ac-game"><div className="ac-shell"><div className="ac-stage" ref={hostRef} /><header className="ac-toolbar"><button onClick={onExit}>← Games</button><span>AWS // ASTEROID COMMAND</span><button onClick={() => setMuted((value) => { engineRef.current?.mute(!value); return !value; })}>{muted ? 'Sound off' : 'Sound on'}</button></header>
    {screen === 'playing' && <section className="ac-hud"><div><small>Stage</small><b>{String(hud.stage).padStart(2, '0')}</b><small>Official run · 1/1</small></div><div><small>Shield integrity</small><i><span style={{ width: `${hud.shield}%` }} /></i><b>{hud.shield}%</b></div><div><small>Score</small><b>{String(hud.score).padStart(6, '0')}</b><small>{hud.destroyed} destroyed</small></div><div><small>Multiplier</small><b>×{hud.multiplier}</b><small>{Math.floor(hud.survival / 60)}:{String(Math.floor(hud.survival % 60)).padStart(2, '0')}</small></div></section>}
    {screen === 'landing' && <section className="ac-overlay"><p className="eyebrow">3D AWS SPACE DEFENSE</p><h1>Asteroid <em>Command</em></h1><p>Pilot the cloud defense ship, break incoming asteroids with dual lasers, and protect your shield in one official run.</p><div className="ac-rules"><span>WASD / ARROWS</span> Navigate <span>SPACE</span> Fire lasers <span>1 RUN</span> Score awards points</div><button className="ac-primary" onClick={start}>Launch official mission · 1 run</button><button className="ac-link" onClick={onExit}>Back to games</button></section>}
    {screen === 'complete' && <section className="ac-overlay"><p className="eyebrow">OFFICIAL RUN COMPLETE</p><h2>Mission telemetry submitted</h2><div className="ac-stats"><span>Score <b>{result?.score || 0}</b></span><span>Stage <b>{result?.stage || 1}</b></span><span>Survival <b>{Math.floor(result?.survival || 0)}s</b></span></div><p>Your official score is being recorded. Returning to the dashboard…</p><button className="ac-link" onClick={onExit}>Back to dashboard</button></section>}
    <nav className="ac-touch"><div>{press('up')}<span>{press('left')}{press('down')}{press('right')}</span></div>{press('fire')}</nav>
  </div></main>;
}
