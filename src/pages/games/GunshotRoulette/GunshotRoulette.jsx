import { useEffect, useRef, useState } from 'react';
import { loadShells, multiplier, resolveShot } from './rouletteCore.js';
import gunshotUrl from './gunshot.mp3';
import rackUrl from './rack.mp3';
import './gunshotRoulette.css';

const fresh = () => ({ points: 50, pot: 0, playerHp: 3, dealerHp: 3, capacity: 5, bet: 10, shells: [], turn: 'setup', round: 1, message: 'Choose a chamber capacity and load the round.', log: [] });
export default function GunshotRoulette({ onExit }) {
  const [state, setState] = useState(fresh); const timers = useRef([]); const [started, setStarted] = useState(false);
  const later = (fn, ms) => timers.current.push(setTimeout(fn, ms));
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const addLog = (message) => setState(s => ({ ...s, log: [message, ...s.log].slice(0, 6) }));
  const play = (url) => { const audio = new Audio(url); audio.play().catch(() => {}); };
  const load = () => { play(rackUrl); setState(s => ({ ...s, shells: loadShells(s.capacity), turn: 'player', message: 'Chambers loaded. Your move.' })); };
  const endCheck = (next) => {
    if (next.dealerHp <= 0) return { ...fresh(), points: next.points + next.pot, round: next.round + 1, message: `Dealer eliminated. ${next.pot} points banked.` };
    if (next.playerHp <= 0) return { ...fresh(), message: 'You were eliminated. Bankroll restored to 50.' };
    return next;
  };
  const fire = (target, dealer = false) => setState(s => {
    if (!dealer && s.turn !== 'player') return s;
    const [live, ...shells] = s.shells; const targetKey = target === 'player' ? 'self' : target; play(live ? gunshotUrl : rackUrl);
    let next = resolveShot(s, live, targetKey); next = { ...next, shells, turn: 'busy', message: live ? 'BANG.' : 'CLICK.' };
    next = endCheck(next); const actor = dealer ? 'Dealer' : 'You'; addLog(`${actor} fired ${live ? 'a live shell' : 'a blank shell'}.`);
    if (next.turn === 'setup') return next;
    if (!shells.length) return { ...next, turn: 'setup', round: s.round + 1, message: 'Round cleared. Load another chamber.' };
    if (!dealer && next.extraTurn) return { ...next, turn: 'player', message: 'Blank self-shot: bonus turn.' };
    if (!dealer) later(() => dealerTurn(), 850);
    else if (next.extraTurn) later(() => dealerTurn(), 850);
    else next.turn = 'player';
    return next;
  });
  const dealerTurn = () => setState(s => {
    if (!s.shells.length || s.turn === 'setup') return s;
    const live = s.shells[0]; const target = live ? (Math.random() < .8 ? 'player' : 'self') : (Math.random() < .75 ? 'self' : 'player');
    later(() => fire(target, true), 450); return { ...s, turn: 'busy', message: `Dealer targets ${target === 'self' ? 'themself' : 'you'}…` };
  });
  return <main className="aws-roulette"><header><b>AWS GUNSHOT ROULETTE</b><span>ROUND {state.round} · BANK <strong>{state.points}</strong></span></header>{!started ? <section className="ar-land"><p>RISK PROTOCOL // LIVE OR BLANK</p><h1>TAKE THE<br/><em>SHOT.</em></h1><p>Outplay the dealer, manage your pot, and survive the chamber.</p><button onClick={() => setStarted(true)}>ENTER THE TABLE</button><button className="ghost" onClick={onExit}>BACK TO GAMES</button></section> : <section className="ar-stage"><aside><h2>PLAYER</h2><div className="hearts">{'♥'.repeat(state.playerHp)}<i>{'♥'.repeat(3 - state.playerHp)}</i></div><small>Pending pot</small><strong>{state.pot} pts</strong></aside><div className="ar-table"><p>CAPACITY {state.capacity} · MULTIPLIER ×{multiplier(state.capacity).toFixed(2)}</p><div className="chambers">{state.shells.map((_, i) => <span key={i}/>)}</div><h2>{state.message}</h2><div className="actions"><button disabled={state.turn !== 'player'} onClick={() => fire('dealer')}>SHOOT DEALER</button><button className="ghost" disabled={state.turn !== 'player'} onClick={() => fire('self')}>SHOOT SELF</button></div><div className="setup"><label>CHAMBER { [3,4,5,6,7,8].map(n => <button key={n} disabled={state.turn !== 'setup'} className={n===state.capacity?'chosen':''} onClick={() => setState(s=>({...s,capacity:n}))}>{n}</button>)}</label><label>WAGER <input type="range" min="5" max={Math.max(5,state.points)} step="5" value={Math.min(state.bet,state.points)} disabled={state.turn !== 'setup'} onChange={e=>setState(s=>({...s,bet:+e.target.value}))}/>{state.bet}</label><button disabled={state.turn !== 'setup'} onClick={load}>LOAD ROUND</button></div></div><aside><h2>DEALER</h2><div className="hearts">{'♥'.repeat(state.dealerHp)}<i>{'♥'.repeat(3 - state.dealerHp)}</i></div><small>40% live shell chance</small></aside><footer>{state.log.map((item,i)=><p key={i}>› {item}</p>)}</footer></section>}</main>;
}
