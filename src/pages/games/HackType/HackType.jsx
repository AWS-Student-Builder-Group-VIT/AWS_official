import { useEffect, useRef, useState } from 'react';
import {
  calculateStats,
  GAME_TIME_MS,
  restoreState,
  STORAGE_KEY,
  TOTAL_ATTEMPTS,
  WORD_SETS,
} from './hackTypeCore.js';
import './hackType.css';

export default function HackType({ onExit }) {
  const [screen, setScreen] = useState('landing');
  const [save, setSave] = useState(() => restoreState(localStorage.getItem(STORAGE_KEY)));
  const [run, setRun] = useState(null);
  const saveRef = useRef(save);
  const raf = useRef();
  const runStartedAt = run?.started;

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const start = () => {
    const now = performance.now();
    setRun({
      started: now,
      remaining: GAME_TIME_MS,
      correctCharacters: 0,
      incorrectCharacters: 0,
      words: 0,
      active: [],
      input: '',
      lastSpawn: now,
    });
    setScreen('game');
  };

  useEffect(() => {
    if (screen !== 'game' || runStartedAt == null) return undefined;

    const tick = (now) => {
      setRun((current) => {
        if (!current) return current;
        const remaining = Math.max(0, GAME_TIME_MS - (now - current.started));
        const saved = saveRef.current;

        if (!remaining) {
          const stats = calculateStats({ ...current, elapsedMs: GAME_TIME_MS });
          const next = {
            ...saved,
            results: [...saved.results, { ...stats, words: current.words }],
            attempt: saved.attempt + 1,
            completed: saved.attempt === TOTAL_ATTEMPTS,
          };
          saveRef.current = next;
          setSave(next);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
          setScreen(next.completed ? 'complete' : 'result');
          return null;
        }

        const active = current.active
          .map((word) => ({ ...word, y: word.y + 0.028 * (1 + saved.attempt * 0.13) }))
          .filter((word) => word.y < 100);
        const canSpawn = active.length < 4 && now - current.lastSpawn > 1000;
        const words = WORD_SETS[saved.attempt - 1] || WORD_SETS.at(-1);
        return {
          ...current,
          remaining,
          active: canSpawn
            ? [...active, { text: words[Math.floor(Math.random() * words.length)], y: 0, id: now }]
            : active,
          lastSpawn: canSpawn ? now : current.lastSpawn,
        };
      });
      raf.current = requestAnimationFrame(tick);
    };

    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [screen, runStartedAt]);

  const type = (value) => {
    setRun((current) => {
      const match = current.active.find((word) => word.text === value.trim().toLowerCase());
      if (!match) return { ...current, input: value };
      return {
        ...current,
        input: '',
        words: current.words + 1,
        correctCharacters: current.correctCharacters + match.text.length,
        active: current.active.filter((word) => word.id !== match.id),
      };
    });
  };

  if (screen === 'landing') {
    return (
      <main className="aws-hacktype">
        <section className="ht-land">
          <p>AWS GAME SYSTEM // TYPE PROTOCOL</p>
          <h1>HACK<span>//</span>TYPE</h1>
          <p>Five sixty-second attempts. Clear incoming AWS terms before they hit the firewall.</p>
          <button onClick={save.completed ? () => setScreen('complete') : start}>
            {save.completed ? 'VIEW LOCKED RESULT' : `START ATTEMPT ${save.attempt}/5`}
          </button>
          <button className="ghost" onClick={onExit}>BACK TO GAMES</button>
        </section>
      </main>
    );
  }

  if (screen === 'result' || screen === 'complete') {
    return (
      <main className="aws-hacktype">
        <section className="ht-land results">
          <p>{screen === 'complete' ? 'CHALLENGE LOCKED' : 'ATTEMPT COMPLETE'}</p>
          <h1>{screen === 'complete' ? 'FINAL RESULTS' : `ATTEMPT ${save.attempt - 1}`}</h1>
          {save.results.map((result, index) => (
            <p key={index}>
              #{index + 1} · {result.wpm} WPM · {result.accuracy}% ACCURACY · <b>{result.score}</b> SCORE
            </p>
          ))}
          {screen === 'complete'
            ? <button onClick={() => setScreen('landing')}>BACK TO LANDING</button>
            : <button onClick={start}>NEXT ATTEMPT</button>}
          <button className="ghost" onClick={onExit}>BACK TO GAMES</button>
        </section>
      </main>
    );
  }

  const stats = calculateStats({ ...run, elapsedMs: GAME_TIME_MS - run.remaining });
  return (
    <main className="aws-hacktype">
      <header><b>AWS HACK // TYPE</b><span>ATTEMPT {save.attempt}/5 · {Math.ceil(run.remaining / 1000)}s</span></header>
      <section className="ht-stats">
        <span>WPM <b>{stats.wpm}</b></span>
        <span>ACCURACY <b>{stats.accuracy}%</b></span>
        <span>SCORE <b>{stats.score}</b></span>
      </section>
      <section className="ht-field">
        {run.active.map((word) => (
          <b className="word" key={word.id} style={{ top: `${word.y}%`, left: `${10 + (word.id % 75)}%` }}>
            › {word.text}
          </b>
        ))}
        <i />
      </section>
      <form className="ht-input" onSubmit={(event) => { event.preventDefault(); type(run.input); }}>
        <input autoFocus value={run.input} onChange={(event) => type(event.target.value)} placeholder="TYPE TARGET WORD" />
      </form>
    </main>
  );
}
