import React, { useCallback, useEffect, useMemo, useState } from 'react';
import wordData from '../wordList.json';
import {
  STORAGE_KEY,
  buildPayload,
  createAttempt,
  evaluateGuess,
  finalizeCompletedState,
  formatResultMessage,
  normalizeWordData,
  submitGuess,
} from './wordleCore.js';
import './wordle.css';

const KEY_ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];
const STATUS_PRIORITY = { absent: 1, present: 2, correct: 3 };
const blankRows = () => Array.from({ length: 6 }, () => Array(5).fill(''));

function loadAttempt() {
  try {
    const state = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return state?.version === 1 ? state : null;
  } catch {
    return null;
  }
}

function shareGrid(state) {
  return state.guesses.map((guess) => evaluateGuess(guess, state.answer)
    .map((status) => status === 'correct' ? '🟩' : status === 'present' ? '🟧' : '⬛')
    .join('')).join('\n');
}

export function WordleGame({ onComplete, onExit }) {
  const words = useMemo(() => normalizeWordData(wordData), []);
  const [saved, setSaved] = useState(loadAttempt);
  const [state, setState] = useState(null);
  const [screen, setScreen] = useState('landing');
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const practice = state?.official === false;

  const persist = (next) => {
    if (next.official !== false) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setState(next);
    if (next.official !== false) setSaved(next);
  };

  const begin = (official) => {
    const next = { ...createAttempt(words.solutions), official };
    setInput('');
    setError('');
    setState(next);
    if (official) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setSaved(next);
    }
    setScreen('game');
  };

  const resume = () => {
    if (!saved) return begin(true);
    setState(saved);
    setInput('');
    setError('');
    setScreen(saved.status === 'active' ? 'game' : 'result');
  };

  const finish = useCallback((completed) => {
    if (completed.official === false || completed.completionNotified) return;
    const payload = buildPayload(completed);
    window.dispatchEvent(new CustomEvent('aws-wordle:complete', { detail: payload }));
    try { window.AWSWordleOnComplete?.(payload); } catch (exception) { console.error(exception); }
    onComplete?.(payload);
    const notified = { ...completed, completionNotified: true };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notified));
    setSaved(notified);
    setState(notified);
  }, [onComplete]);

  const submit = useCallback(() => {
    if (!state || state.status !== 'active') return;
    const result = submitGuess(state, input, words.validWords);
    if (result.error) {
      setError(result.error.toUpperCase());
      return;
    }
    const next = result.completed ? finalizeCompletedState(result.state) : result.state;
    persist(next);
    setInput('');
    setError('');
    if (result.completed) {
      finish(next);
      setScreen('result');
    }
  }, [state, input, words, finish]);

  const pressKey = useCallback((key) => {
    if (screen !== 'game' || state?.status !== 'active') return;
    if (key === 'ENTER') submit();
    else if (key === 'BACKSPACE') {
      setInput((value) => value.slice(0, -1));
      setError('');
    } else if (/^[A-Z]$/.test(key)) {
      setInput((value) => value.length < 5 ? value + key : value);
      setError('');
    }
  }, [screen, state, submit]);

  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === 'Enter') pressKey('ENTER');
      else if (event.key === 'Backspace') pressKey('BACKSPACE');
      else pressKey(event.key.toUpperCase());
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [pressKey]);

  const activeState = state || saved;
  const rows = blankRows();
  state?.guesses.forEach((guess, row) => guess.split('').forEach((letter, column) => { rows[row][column] = letter; }));
  if (screen === 'game' && state?.status === 'active') input.split('').forEach((letter, column) => { rows[state.guesses.length][column] = letter; });

  const keyStates = {};
  state?.guesses.forEach((guess) => evaluateGuess(guess, state.answer).forEach((status, index) => {
    const letter = guess[index];
    if (!keyStates[letter] || STATUS_PRIORITY[status] > STATUS_PRIORITY[keyStates[letter]]) keyStates[letter] = status;
  }));

  const startLabel = !saved ? 'START OFFICIAL ATTEMPT' : saved.status === 'active' ? 'RESUME ATTEMPT' : 'VIEW OFFICIAL RESULT';
  const attemptLabel = screen === 'landing' ? 'Standby' : screen === 'result' ? 'Complete' : `Transmission ${state.guesses.length + 1} / 6`;
  const scoreLabel = screen === 'result' ? `${activeState?.score ?? 0} PTS` : practice ? 'PRACTICE MODE' : 'MAX 100 PTS';

  return <div className="aws-wordle">
    <div className="checker-accent" aria-hidden="true" />
    <div className="shell">
      <header className="site-header">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">AWS</div>
          <div className="brand-copy"><strong>STUDENT BUILDER GROUP</strong><span>VIT Vellore // Game Systems</span></div>
        </div>
        <div className="attempt-chip">{practice ? 'Practice Mode' : '01 Attempt Only'}</div>
      </header>

      <main className="game-wrap">
        <section className="intro-copy" aria-labelledby="page-title">
          <div className="eyebrow">Hackathon Protocol 01</div>
          <h1 id="page-title">AWS Builder <span>Wordle</span></h1>
          <p className="terminal-line"><b>&gt;</b> Decode the five-letter signal.<br /><b>&gt;</b> Fewer transmissions unlock a higher score.</p>
          <div className="rules" aria-label="Game rules">
            <div className="rule"><strong>01 // Decode</strong><span>Find one five-letter word in six guesses.</span></div>
            <div className="rule"><strong>02 // Score</strong><span>Earn 100 points, dropping 10 each row.</span></div>
            <div className="rule"><strong>03 // Commit</strong><span>Your single attempt is saved to this browser.</span></div>
          </div>
        </section>

        <section className="game-panel" aria-label="AWS Builder Wordle game">
          <div className="panel-head">
            <div className="panel-label">Signal Matrix // <b>{attemptLabel}</b></div>
            <div className="score-live">{scoreLabel}</div>
          </div>

          <div className="board" aria-label="Guess grid" aria-live="polite">
            {rows.flatMap((row, rowIndex) => row.map((letter, columnIndex) => {
              const guess = state?.guesses[rowIndex];
              const status = guess ? evaluateGuess(guess, state.answer)[columnIndex] : letter ? 'filled' : '';
              return <div key={`${rowIndex}-${columnIndex}`} className={`tile ${status}${guess ? ' reveal' : ''}`} style={{ '--delay': `${columnIndex * 110}ms` }}>{letter}</div>;
            }))}
          </div>

          <div className="keyboard" aria-label="On-screen keyboard">
            {KEY_ROWS.map((row, rowIndex) => <div className="key-row" key={row}>
              {rowIndex === 2 && <button className="key wide" onClick={() => pressKey('ENTER')}>ENTER</button>}
              {[...row].map((letter) => <button className={`key ${keyStates[letter] || ''}`} key={letter} onClick={() => pressKey(letter)}>{letter}</button>)}
              {rowIndex === 2 && <button className="key wide" aria-label="Backspace" onClick={() => pressKey('BACKSPACE')}>DEL</button>}
            </div>)}
          </div>

          {screen === 'landing' && <div className="start-layer">
            <div>
              <div className="start-icon" aria-hidden="true">&gt;_</div>
              <h2>Initialize Puzzle</h2>
              <p>One random signal. Six transmissions. Your attempt is locked when the puzzle ends.</p>
              <button className="primary-button" onClick={resume}>{startLabel}</button>
            </div>
          </div>}

          {screen === 'result' && activeState && <div className="result-layer">
            <div>
              <div className={`result-icon ${activeState.status}`} aria-hidden="true">{activeState.status === 'won' ? '✓' : '×'}</div>
              <h2>{activeState.status === 'won' ? 'Signal Decoded' : 'Signal Lost'}</h2>
              <div className="result-score"><span>{activeState.score}</span><small> PTS</small></div>
              <div className="result-answer">ANSWER // <b>{activeState.answer}</b></div>
              <p>{formatResultMessage(activeState)}</p>
              <div className="result-grid" aria-label="Result grid">{shareGrid(activeState)}</div>
              <div className="result-actions">
                <button className="primary-button" onClick={() => begin(false)}>PRACTICE RETRY</button>
                <button className="secondary-button" onClick={() => onExit ? onExit() : setScreen('landing')}>BACK TO LANDING PAGE</button>
              </div>
            </div>
          </div>}
        </section>
      </main>

      <footer className="footer-line"><span>Build // Learn // Deploy</span><span>System: AWS-SBG-WORDLE-V1</span></footer>
    </div>
    <div className={`toast ${error ? 'show' : ''}`} role="status" aria-live="assertive">{error}</div>
  </div>;
}

export default WordleGame;
