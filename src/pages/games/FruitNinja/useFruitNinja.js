import { useEffect, useRef } from 'react';

/* ═══════════════════════════════════════════════════════════
   FRUIT NINJA ("Blade & Blossom") — canvas 2D engine
   Ported from the standalone HTML build into a React hook.

   The original manipulated the DOM directly (getElementById on
   score/lives/overlays). In React those overlays are rendered
   as JSX from component state, so the engine no longer touches
   the DOM. Instead it:
     • reports state changes (score, lives, combo, phase, best)
       through the onState callback
     • exposes an imperative start() via the returned ref-like API
   The hook owns the full lifecycle: RAF loop, pointer/resize
   listeners and the audio context are all torn down on unmount.

   Persistence: the original used a non-standard window.storage.
   Replaced with localStorage (browser-native equivalent).
   ═══════════════════════════════════════════════════════════ */

const HS_KEY = 'fruitninja:highscore';

/**
 * @param {React.RefObject<HTMLCanvasElement>} canvasRef
 * @param {(s: {phase:string, score:number, lives:number, best:number, combo:number, comboLabel:string, isNewBest:boolean}) => void} onState
 * @returns {React.MutableRefObject<{ start: () => void }>}
 */
export default function useFruitNinja(canvasRef, onState) {
  // Stable handle the component can call (e.g. Play / Retry buttons).
  const apiRef = useRef({ start: () => {} });
  // Keep the latest onState without re-running the effect.
  const onStateRef = useRef(onState);
  useEffect(() => {
    onStateRef.current = onState;
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const ctx = canvas.getContext('2d');
    let W = 0;
    let H = 0;
    let DPR = 1;

    const emit = (extra = {}) => {
      onStateRef.current?.({
        phase: state,
        score,
        lives,
        best: highScore,
        combo,
        comboLabel: '',
        isNewBest: false,
        ...extra,
      });
    };

    function resize() {
      DPR = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = Math.floor(W * DPR);
      canvas.height = Math.floor(H * DPR);
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }

    /* ---------- Audio (synthesized) ---------- */
    let actx = null;
    function ensureAudio() {
      if (!actx) {
        try {
          actx = new (window.AudioContext || window.webkitAudioContext)();
        } catch {
          actx = null;
        }
      }
    }
    function noiseBuffer(duration) {
      const rate = actx.sampleRate;
      const buf = actx.createBuffer(1, rate * duration, rate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
      return buf;
    }
    function playWhoosh(strength) {
      if (!actx) return;
      const t = actx.currentTime;
      const osc = actx.createOscillator();
      const gain = actx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(900 + strength * 300, t);
      osc.frequency.exponentialRampToValueAtTime(120, t + 0.14);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.16 * Math.min(1, strength), t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      osc.connect(gain);
      gain.connect(actx.destination);
      osc.start(t);
      osc.stop(t + 0.18);
    }
    function playSplat() {
      if (!actx) return;
      const t = actx.currentTime;
      const src = actx.createBufferSource();
      src.buffer = noiseBuffer(0.12);
      const filt = actx.createBiquadFilter();
      filt.type = 'lowpass';
      filt.frequency.setValueAtTime(1800, t);
      filt.frequency.exponentialRampToValueAtTime(200, t + 0.12);
      const gain = actx.createGain();
      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
      src.connect(filt);
      filt.connect(gain);
      gain.connect(actx.destination);
      src.start(t);
    }
    function playBoom() {
      if (!actx) return;
      const t = actx.currentTime;
      const osc = actx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, t);
      osc.frequency.exponentialRampToValueAtTime(30, t + 0.5);
      const gain = actx.createGain();
      gain.gain.setValueAtTime(0.55, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
      osc.connect(gain);
      gain.connect(actx.destination);
      osc.start(t);
      osc.stop(t + 0.62);

      const src = actx.createBufferSource();
      src.buffer = noiseBuffer(0.5);
      const filt = actx.createBiquadFilter();
      filt.type = 'lowpass';
      filt.frequency.setValueAtTime(900, t);
      const g2 = actx.createGain();
      g2.gain.setValueAtTime(0.4, t);
      g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      src.connect(filt);
      filt.connect(g2);
      g2.connect(actx.destination);
      src.start(t);
    }
    function playCombo(n) {
      if (!actx) return;
      const t = actx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
      const freq = notes[Math.min(n - 2, notes.length - 1)];
      const osc = actx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      const gain = actx.createGain();
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.22, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
      osc.connect(gain);
      gain.connect(actx.destination);
      osc.start(t);
      osc.stop(t + 0.24);
    }
    function playLifeLost() {
      if (!actx) return;
      const t = actx.currentTime;
      const osc = actx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, t);
      osc.frequency.exponentialRampToValueAtTime(80, t + 0.3);
      const gain = actx.createGain();
      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      osc.connect(gain);
      gain.connect(actx.destination);
      osc.start(t);
      osc.stop(t + 0.32);
    }

    /* ---------- Persistent high score (localStorage) ---------- */
    let highScore = 0;
    try {
      highScore = parseInt(localStorage.getItem(HS_KEY), 10) || 0;
    } catch {
      highScore = 0;
    }
    function saveHighScore() {
      try {
        localStorage.setItem(HS_KEY, String(highScore));
      } catch {
        /* storage unavailable — ignore */
      }
    }

    /* ---------- Constants / state ---------- */
    const GRAVITY = 1700;
    const COMBO_WINDOW = 650;
    const SLOWMO_COMBO_THRESHOLD = 5;

    const FRUIT_DEFS = {
      apple: { rMin: 42, rMax: 52, skin: ['#ff6b78', '#c81e34'], flesh: '#fff2d6', accent: '#7a1424', seed: '#3a1608', points: 10, leaf: '#3fae4a' },
      orange: { rMin: 40, rMax: 48, skin: ['#ffb04d', '#e6720a'], flesh: '#ffcf7a', accent: '#c96500', seed: null, points: 10 },
      watermelon: { rMin: 50, rMax: 60, skin: ['#3fae63', '#0f5c2e'], flesh: '#ff6b7a', accent: '#0b3d1f', seed: '#161616', points: 16, rind: '#e8fff0' },
      pineapple: { rMin: 44, rMax: 52, skin: ['#f0c531', '#c98d0a'], flesh: '#fff1a6', accent: '#a86c00', seed: null, points: 16 },
      kiwi: { rMin: 36, rMax: 42, skin: ['#a4823f', '#6b4f26'], flesh: '#c3e36b', accent: '#2c3d12', seed: '#171200', points: 13, rind: '#e9f2c8' },
      strawberry: { rMin: 32, rMax: 38, skin: ['#ff4d68', '#d81b3f'], flesh: '#ffd9de', accent: '#7a0f22', seed: '#ffd94a', points: 13, leaf: '#3fae4a' },
    };
    const FRUIT_KEYS = Object.keys(FRUIT_DEFS);

    let state = 'start';
    let score = 0;
    let lives = 3;
    let combo = 0;
    let comboTimer = 0;
    let comboBest = 0;
    let timeScale = 1;
    let slowmoTimer = 0;
    let shake = 0;
    let elapsed = 0;
    let spawnTimer = 0;
    let spawnInterval = 1150;
    let objects = [];
    let halves = [];
    let particles = [];
    let popups = [];
    let ripples = [];
    let dust = [];
    let rafId = 0;

    function initDust() {
      dust = [];
      for (let i = 0; i < 40; i++) {
        dust.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.6 + 0.4, vy: -(Math.random() * 10 + 4), a: Math.random() * 0.3 + 0.05 });
      }
    }

    /* ---------- Input / blade trail ---------- */
    let pointerDown = false;
    let trail = [];

    function addTrailPoint(x, y) {
      const now = performance.now();
      trail.push({ x, y, t: now });
      while (trail.length && now - trail[0].t > 160) trail.shift();
      if (state === 'playing' && trail.length >= 2) {
        checkSliceAgainstSegment(trail[trail.length - 2], trail[trail.length - 1]);
      }
    }
    function pointerPos(e) {
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    const onPointerDown = (e) => {
      pointerDown = true;
      ensureAudio();
      const p = pointerPos(e);
      trail = [{ x: p.x, y: p.y, t: performance.now() }];
      if (canvas.setPointerCapture) canvas.setPointerCapture(e.pointerId);
    };
    const onPointerMove = (e) => {
      if (!pointerDown) return;
      const p = pointerPos(e);
      addTrailPoint(p.x, p.y);
    };
    const onPointerUp = () => { pointerDown = false; };
    const onPointerCancel = () => { pointerDown = false; };

    /* ---------- Math helpers ---------- */
    function distToSegmentSq(px, py, ax, ay, bx, by) {
      const abx = bx - ax;
      const aby = by - ay;
      const apx = px - ax;
      const apy = py - ay;
      const abLenSq = abx * abx + aby * aby;
      let t = abLenSq > 0 ? (apx * abx + apy * aby) / abLenSq : 0;
      t = Math.max(0, Math.min(1, t));
      const cx = ax + abx * t;
      const cy = ay + aby * t;
      const dx = px - cx;
      const dy = py - cy;
      return dx * dx + dy * dy;
    }
    const rand = (a, b) => a + Math.random() * (b - a);
    const choice = (arr) => arr[(Math.random() * arr.length) | 0];

    /* ---------- Object factories ---------- */
    function spawnFruit() {
      const key = choice(FRUIT_KEYS);
      const def = FRUIT_DEFS[key];
      const radius = rand(def.rMin, def.rMax);
      const x = rand(W * 0.12, W * 0.88);
      const peak = H * rand(0.38, 0.82);
      const startY = H + radius + 20;
      const vy = -Math.sqrt(2 * GRAVITY * (startY - peak + H * 0.15));
      const biasToCenter = (W / 2 - x) * 0.0009;
      const vx = rand(-160, 160) + biasToCenter * 300;
      objects.push({
        kind: 'fruit', type: key, def, x, y: startY, vx, vy, radius,
        rotation: rand(0, Math.PI * 2), rotSpeed: rand(-3, 3),
        sliced: false, missed: false, id: Math.random(),
      });
    }
    function spawnBomb() {
      const radius = 40;
      const x = rand(W * 0.15, W * 0.85);
      const peak = H * rand(0.35, 0.7);
      const startY = H + radius + 20;
      const vy = -Math.sqrt(2 * GRAVITY * (startY - peak + H * 0.15));
      const vx = rand(-120, 120);
      objects.push({
        kind: 'bomb', x, y: startY, vx, vy, radius,
        rotation: rand(0, Math.PI * 2), rotSpeed: rand(-1.5, 1.5),
        sliced: false, missed: false, id: Math.random(), fuseFlicker: Math.random() * 10,
      });
    }
    function spawnWave() {
      const n = 1 + (Math.random() < Math.min(0.55, elapsed / 40000) ? 1 : 0) + (Math.random() < Math.min(0.25, elapsed / 70000) ? 1 : 0);
      for (let i = 0; i < n; i++) spawnFruit();
      const bombChance = Math.min(0.22, 0.03 + elapsed / 60000);
      if (score > 30 && Math.random() < bombChance) spawnBomb();
    }
    function spawnHalves(fruit, nx, ny) {
      const { def } = fruit;
      for (let i = 0; i < 2; i++) {
        const sign = i === 0 ? 1 : -1;
        halves.push({
          type: fruit.type, def,
          x: fruit.x, y: fruit.y,
          vx: fruit.vx + nx * sign * rand(60, 140),
          vy: fruit.vy + ny * sign * rand(60, 140) - 40,
          radius: fruit.radius,
          rotation: fruit.rotation,
          rotSpeed: fruit.rotSpeed + sign * rand(2, 5),
          side: i === 0 ? 1 : -1,
          sliceAngle: Math.atan2(ny, nx),
          life: 1, id: Math.random(),
        });
      }
    }
    function spawnJuice(x, y, color, count, power) {
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const spd = rand(60, 260) * power;
        particles.push({
          x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - rand(20, 80),
          r: rand(2, 5.5), color, life: 1, decay: rand(0.9, 1.6),
        });
      }
    }
    function spawnPopup(x, y, text, color, big) {
      popups.push({ x, y, text, color, life: 1, vy: -46, big: !!big });
    }
    function spawnRipple(x, y, color) {
      ripples.push({ x, y, r: 6, maxR: rand(70, 110), life: 1, color });
    }

    /* ---------- Slice detection ---------- */
    function checkSliceAgainstSegment(p0, p1) {
      const dx = p1.x - p0.x;
      const dy = p1.y - p0.y;
      const segLen = Math.hypot(dx, dy);
      if (segLen < 3) return;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;

      for (let i = objects.length - 1; i >= 0; i--) {
        const o = objects[i];
        if (o.sliced) continue;
        const rr = o.radius * o.radius;
        if (distToSegmentSq(o.x, o.y, p0.x, p0.y, p1.x, p1.y) <= rr) {
          if (o.kind === 'bomb') triggerBombHit(o);
          else sliceFruit(o, nx, ny);
        }
      }
    }
    function sliceFruit(fruit, nx, ny) {
      fruit.sliced = true;
      objects.splice(objects.indexOf(fruit), 1);

      const now = performance.now();
      if (now - comboTimer < COMBO_WINDOW) combo++;
      else combo = 1;
      comboTimer = now;
      comboBest = Math.max(comboBest, combo);

      const mult = Math.min(1 + (combo - 1) * 0.5, 6);
      const gained = Math.round(fruit.def.points * mult);
      score += gained;

      spawnHalves(fruit, nx, ny);
      spawnJuice(fruit.x, fruit.y, fruit.def.flesh, 14, 1);
      spawnJuice(fruit.x, fruit.y, fruit.def.accent, 6, 0.7);
      spawnRipple(fruit.x, fruit.y, fruit.def.flesh);
      spawnPopup(fruit.x, fruit.y - 10, `+${gained}`, '#ffffff', false);

      playWhoosh(1 + Math.min(combo, 5) * 0.15);
      playSplat();

      let comboLabel = '';
      if (combo >= 2) {
        comboLabel = comboLabelFor(combo);
        playCombo(combo);
      }
      if (combo >= SLOWMO_COMBO_THRESHOLD) {
        timeScale = 0.35;
        slowmoTimer = 380;
      }
      emit({ score, combo, comboLabel });
    }
    function comboLabelFor(n) {
      const labels = ['', '', 'DOUBLE SLICE!', 'TRIPLE SLICE!', 'QUAD SLICE!', 'PENTA SLICE!', 'RAMPAGE!'];
      return n < labels.length ? labels[n] : `${n}x COMBO!!`;
    }
    function triggerBombHit(bomb) {
      bomb.sliced = true;
      objects.splice(objects.indexOf(bomb), 1);
      spawnJuice(bomb.x, bomb.y, '#ffb23c', 26, 1.6);
      spawnJuice(bomb.x, bomb.y, '#ff4d2e', 16, 1.3);
      spawnRipple(bomb.x, bomb.y, '#ff5a2e');
      shake = 26;
      playBoom();
      emit({ flash: true });
      endGame();
    }

    /* ---------- Miss / life handling ---------- */
    function loseLife() {
      lives = Math.max(0, lives - 1);
      playLifeLost();
      shake = Math.max(shake, 10);
      emit({ lives });
      if (lives <= 0) endGame();
    }

    /* ---------- Game flow ---------- */
    function resetGame() {
      score = 0;
      lives = 3;
      combo = 0;
      comboBest = 0;
      comboTimer = 0;
      objects = [];
      halves = [];
      particles = [];
      popups = [];
      ripples = [];
      elapsed = 0;
      spawnTimer = 300;
      spawnInterval = 1150;
      timeScale = 1;
      slowmoTimer = 0;
      shake = 0;
    }
    function startGame() {
      ensureAudio();
      resetGame();
      state = 'playing';
      emit({ phase: 'playing', score: 0, lives: 3, combo: 0, comboLabel: '' });
    }
    function endGame() {
      if (state !== 'playing') return;
      state = 'gameover';
      const isNew = score > highScore;
      if (isNew) {
        highScore = score;
        saveHighScore();
      }
      emit({ phase: 'gameover', score, best: highScore, isNewBest: isNew });
    }

    apiRef.current.start = startGame;

    /* ---------- Draw helpers ---------- */
    function drawBackground() {
      const g = ctx.createRadialGradient(W * 0.5, H * 0.35, 0, W * 0.5, H * 0.35, Math.max(W, H) * 0.8);
      const glowBoost = Math.min(0.18, combo * 0.02);
      g.addColorStop(0, `rgba(29,40,66,${0.9 + glowBoost})`);
      g.addColorStop(0.55, 'rgba(10,14,24,0.98)');
      g.addColorStop(1, '#05070c');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);

      ctx.save();
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = '#0f2e22';
      for (const bx of [W * 0.06, W * 0.94]) {
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(bx - 9, H * 0.15, 18, H * 0.9, 9);
        else ctx.rect(bx - 9, H * 0.15, 18, H * 0.9);
        ctx.fill();
      }
      ctx.restore();

      ctx.save();
      for (const d of dust) {
        ctx.globalAlpha = d.a;
        ctx.fillStyle = '#bfe8ff';
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    function drawFruitShape(o, alphaScale) {
      const { x, y, radius, rotation, def } = o;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      ctx.globalAlpha = alphaScale === undefined ? 1 : alphaScale;

      const grad = ctx.createRadialGradient(-radius * 0.3, -radius * 0.35, radius * 0.15, 0, 0, radius);
      grad.addColorStop(0, def.skin[0]);
      grad.addColorStop(1, def.skin[1]);
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.save();
      ctx.clip();
      if (o.type === 'watermelon') {
        ctx.strokeStyle = 'rgba(10,40,20,0.55)';
        ctx.lineWidth = radius * 0.14;
        for (let i = -2; i <= 2; i++) {
          ctx.beginPath();
          ctx.moveTo(i * radius * 0.4 - radius, -radius);
          ctx.quadraticCurveTo(i * radius * 0.4, 0, i * radius * 0.4 - radius * 0.15, radius);
          ctx.stroke();
        }
      } else if (o.type === 'pineapple') {
        ctx.strokeStyle = 'rgba(140,90,10,0.5)';
        ctx.lineWidth = 2.4;
        for (let d = -radius; d < radius * 1.5; d += radius * 0.32) {
          ctx.beginPath(); ctx.moveTo(d - radius, -radius); ctx.lineTo(d, radius); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(radius - d, -radius); ctx.lineTo(radius * 1.6 - d, radius); ctx.stroke();
        }
      } else if (o.type === 'kiwi') {
        for (let i = 0; i < 40; i++) {
          const a = Math.random() * Math.PI * 2;
          const rr = Math.random() * radius;
          ctx.beginPath();
          ctx.arc(Math.cos(a) * rr, Math.sin(a) * rr, 0.8, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(60,40,10,0.3)';
          ctx.fill();
        }
      } else if (o.type === 'strawberry') {
        ctx.fillStyle = 'rgba(255,220,80,0.85)';
        for (let i = 0; i < 16; i++) {
          const a = Math.random() * Math.PI * 2;
          const rr = Math.random() * radius * 0.85;
          ctx.beginPath();
          ctx.ellipse(Math.cos(a) * rr, Math.sin(a) * rr, 1.6, 2.6, a, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (o.type === 'orange') {
        ctx.fillStyle = 'rgba(180,90,0,0.15)';
        for (let i = 0; i < 30; i++) {
          const a = Math.random() * Math.PI * 2;
          const rr = Math.random() * radius;
          ctx.beginPath();
          ctx.arc(Math.cos(a) * rr, Math.sin(a) * rr, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();

      ctx.beginPath();
      ctx.ellipse(-radius * 0.32, -radius * 0.38, radius * 0.32, radius * 0.18, -0.5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fill();

      if (def.leaf) {
        ctx.fillStyle = '#5a3315';
        ctx.fillRect(-2, -radius - 8, 4, 10);
        ctx.beginPath();
        ctx.ellipse(8, -radius - 6, 9, 5, 0.6, 0, Math.PI * 2);
        ctx.fillStyle = def.leaf;
        ctx.fill();
      }

      ctx.restore();
    }
    function drawBomb(o) {
      const { x, y, radius, rotation } = o;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);

      const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 120 + o.fuseFlicker);
      ctx.shadowColor = `rgba(255,60,20,${0.5 + 0.4 * pulse})`;
      ctx.shadowBlur = 22;

      const grad = ctx.createRadialGradient(-radius * 0.3, -radius * 0.35, radius * 0.1, 0, 0, radius);
      grad.addColorStop(0, '#3a3a42');
      grad.addColorStop(1, '#08080a');
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.ellipse(-radius * 0.3, -radius * 0.35, radius * 0.28, radius * 0.15, -0.5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fill();

      ctx.strokeStyle = '#8a6a3a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, -radius);
      ctx.quadraticCurveTo(8, -radius - 14, 2, -radius - 22);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(2, -radius - 24, 3 + pulse * 2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,${140 + pulse * 80},40,1)`;
      ctx.fill();

      ctx.restore();
    }
    function drawHalf(h) {
      const { x, y, radius, rotation, def, side, life } = h;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      ctx.globalAlpha = Math.max(0, Math.min(1, life));

      ctx.save();
      ctx.beginPath();
      ctx.rect(side > 0 ? 0 : -radius, -radius, radius, radius * 2);
      ctx.clip();
      const grad = ctx.createRadialGradient(-radius * 0.3, -radius * 0.35, radius * 0.1, 0, 0, radius);
      grad.addColorStop(0, def.skin[0]);
      grad.addColorStop(1, def.skin[1]);
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.beginPath();
      ctx.rect(side > 0 ? -1.5 : -radius + 1.5, -radius, radius * 0.16, radius * 2);
      ctx.clip();
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.98, 0, Math.PI * 2);
      ctx.fillStyle = def.flesh;
      ctx.fill();
      if (def.seed) {
        ctx.fillStyle = def.seed;
        for (let i = 0; i < 6; i++) {
          const yy = rand(-radius * 0.6, radius * 0.6);
          ctx.beginPath();
          ctx.ellipse(side > 0 ? rand(1, 4) : rand(-4, -1), yy, 1.6, 2.4, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();

      ctx.restore();
    }
    function drawTrail() {
      if (trail.length < 2) return;
      const t = performance.now();
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      const hot = combo >= 2;
      for (let i = 1; i < trail.length; i++) {
        const p0 = trail[i - 1];
        const p1 = trail[i];
        const age = (t - p1.t) / 160;
        const alpha = Math.max(0, 1 - age);
        const w = Math.max(1.5, 13 * (1 - age));
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.strokeStyle = hot ? `rgba(255,201,60,${alpha})` : `rgba(160,235,255,${alpha})`;
        ctx.shadowColor = hot ? 'rgba(255,201,60,0.9)' : 'rgba(111,240,255,0.9)';
        ctx.shadowBlur = 18;
        ctx.lineWidth = w;
        ctx.stroke();
      }
      ctx.restore();
    }
    function drawParticles() {
      ctx.save();
      for (const p of particles) {
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    function drawRipples() {
      ctx.save();
      for (const r of ripples) {
        ctx.globalAlpha = Math.max(0, r.life) * 0.5;
        ctx.strokeStyle = r.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }
    function drawPopups() {
      ctx.save();
      ctx.textAlign = 'center';
      for (const p of popups) {
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.font = `${p.big ? '700 30px' : '700 22px'} 'Rajdhani', sans-serif`;
        ctx.fillText(p.text, p.x, p.y);
      }
      ctx.restore();
    }
    function draw() {
      ctx.save();
      if (shake > 0) {
        const s = shake;
        ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
      }
      drawBackground();
      drawRipples();
      for (const h of halves) drawHalf(h);
      for (const o of objects) {
        if (o.kind === 'bomb') drawBomb(o);
        else drawFruitShape(o);
      }
      drawParticles();
      drawTrail();
      drawPopups();
      ctx.restore();
    }

    /* ---------- Update ---------- */
    function update(dt, now) {
      elapsed += state === 'playing' ? dt * 1000 : 0;

      if (shake > 0) shake = Math.max(0, shake - dt * 60);
      if (combo > 0 && now - comboTimer > COMBO_WINDOW + 80) combo = 0;

      for (const d of dust) {
        d.y += d.vy * dt;
        if (d.y < -10) {
          d.y = H + 10;
          d.x = Math.random() * W;
        }
      }

      if (state === 'playing') {
        spawnTimer -= dt * 1000;
        const minInterval = 480;
        const curInterval = Math.max(minInterval, spawnInterval - elapsed * 0.012);
        if (spawnTimer <= 0) {
          spawnWave();
          spawnTimer = curInterval * rand(0.8, 1.2);
        }
        for (let i = objects.length - 1; i >= 0; i--) {
          const o = objects[i];
          o.vy += GRAVITY * dt;
          o.x += o.vx * dt;
          o.y += o.vy * dt;
          o.rotation += o.rotSpeed * dt;
          if (o.y - o.radius > H + 40) {
            objects.splice(i, 1);
            if (o.kind === 'fruit') loseLife();
          }
        }
      }

      for (let i = halves.length - 1; i >= 0; i--) {
        const h = halves[i];
        h.vy += GRAVITY * dt;
        h.x += h.vx * dt;
        h.y += h.vy * dt;
        h.rotation += h.rotSpeed * dt;
        h.life -= dt * 0.35;
        if (h.y - h.radius > H + 60 || h.life <= 0) halves.splice(i, 1);
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.vy += GRAVITY * 0.55 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt * p.decay;
        if (p.life <= 0) particles.splice(i, 1);
      }

      for (let i = popups.length - 1; i >= 0; i--) {
        const p = popups[i];
        p.y += p.vy * dt;
        p.life -= dt * 1.1;
        if (p.life <= 0) popups.splice(i, 1);
      }

      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.r += (r.maxR - r.r) * Math.min(1, dt * 6);
        r.life -= dt * 2.2;
        if (r.life <= 0) ripples.splice(i, 1);
      }

      if (!pointerDown && trail.length) {
        const t = performance.now();
        while (trail.length && t - trail[0].t > 160) trail.shift();
      }
    }

    /* ---------- Main loop ---------- */
    let lastT = performance.now();
    let prevNow = lastT;
    function loop(now) {
      let dt = (now - lastT) / 1000;
      lastT = now;
      dt = Math.min(dt, 0.033);
      rafId = requestAnimationFrame(loop);

      if (slowmoTimer > 0) {
        slowmoTimer -= now - prevNow;
        if (slowmoTimer <= 0) timeScale = 1;
      }
      prevNow = now;
      const sdt = dt * timeScale;

      update(sdt, now);
      draw(now);
    }

    /* ---------- Boot ---------- */
    resize();
    initDust();
    window.addEventListener('resize', resize);
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerCancel);

    emit({ best: highScore });
    rafId = requestAnimationFrame(loop);

    /* ---------- Cleanup ---------- */
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerCancel);
      if (actx) {
        actx.close();
        actx = null;
      }
    };
  }, [canvasRef]);

  return apiRef;
}
