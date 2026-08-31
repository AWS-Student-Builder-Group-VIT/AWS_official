import { useEffect } from 'react';

/* ═══════════════════════════════════════════════════════════
   FLAPPY BIRD — "Glide" game engine (canvas 2D)
   Ported from the standalone HTML build into a React hook.
   All game state lives inside the effect closure so nothing
   leaks into React renders. The hook is responsible for the
   full lifecycle: it starts the RAF loop + input listeners on
   mount and tears everything down on unmount.
   ═══════════════════════════════════════════════════════════ */

/**
 * Attaches the Flappy Bird engine to a canvas.
 * @param {React.RefObject<HTMLCanvasElement>} canvasRef
 * @param {(result: {official:boolean, score:number}) => void} onComplete
 */
export default function useFlappyBird(canvasRef, onComplete) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    const GROUND_H = 92;
    const PLAY_H = H - GROUND_H;

    const FONT_DISPLAY = "'Baloo 2', 'Nunito', sans-serif";
    const FONT_BODY = "'Nunito', sans-serif";

    let lastTime = 0;
    let shakeTime = 0;
    let shakeMag = 0;
    let rafId = 0;
    let completionSent = false;

    // ---------- Utility ----------
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const lerp = (a, b, t) => a + (b - a) * t;
    const rand = (a, b) => a + Math.random() * (b - a);
    function lerpColor(c1, c2, t) {
      const r1 = c1[0], g1 = c1[1], b1 = c1[2];
      const r2 = c2[0], g2 = c2[1], b2 = c2[2];
      return `rgb(${Math.round(lerp(r1, r2, t))},${Math.round(lerp(g1, g2, t))},${Math.round(lerp(b1, b2, t))})`;
    }
    function circleRectCollide(cx, cy, cr, rx, ry, rw, rh) {
      const nx = clamp(cx, rx, rx + rw);
      const ny = clamp(cy, ry, ry + rh);
      const dx = cx - nx;
      const dy = cy - ny;
      return dx * dx + dy * dy < cr * cr;
    }

    // ---------- Game state ----------
    const STATE = { START: 'start', PLAY: 'play', DEAD: 'dead' };
    let state = STATE.START;
    let score = 0;
    let best = 0;
    let popups = [];
    let flashT = 0;

    // ---------- Difficulty ----------
    function difficulty() {
      const t = clamp(score / 28, 0, 1);
      return {
        t,
        gap: lerp(190, 128, t),
        speed: lerp(2.35, 5.1, t),
        spawnGapPx: lerp(232, 200, t),
      };
    }

    // ---------- Bird skins ----------
    const BIRDS = [
      { name: 'Sunny', bodyLight: '#ffe27a', bodyDark: '#ffbb3d', belly: '#fff6df', wingBack: '#f2b23c', wingLight: '#ffcf5c', wingDark: '#f2a52e', tail: '#e8703a', beak: '#ff6a3d' },
      { name: 'Skylark', bodyLight: '#8fd8ff', bodyDark: '#3fa9dd', belly: '#eaf9ff', wingBack: '#2f8dc4', wingLight: '#a9e4ff', wingDark: '#3fa9dd', tail: '#1f6f9c', beak: '#ff9a3d' },
      { name: 'Robin', bodyLight: '#ff8f6a', bodyDark: '#d9432b', belly: '#f4e9df', wingBack: '#8a8a8a', wingLight: '#b9b9b9', wingDark: '#7a7a7a', tail: '#5c5c5c', beak: '#f2b23c' },
      { name: 'Toucan', bodyLight: '#3a3a3a', bodyDark: '#181818', belly: '#ffffff', wingBack: '#141414', wingLight: '#2b2b2b', wingDark: '#141414', tail: '#141414', beak: '#ffb703' },
      { name: 'Flamingo', bodyLight: '#ffb6d5', bodyDark: '#ff6fa5', belly: '#fff0f6', wingBack: '#ff8fbf', wingLight: '#ffc2dd', wingDark: '#ff6fa5', tail: '#d94f86', beak: '#4a4a4a' },
    ];
    let selectedBird = 0;

    // ---------- Audio (all synthesized) ----------
    let audioCtx = null;
    let masterGain = null;
    let noiseBuf = null;
    let muted = false;
    function ensureAudio() {
      if (audioCtx) {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        return;
      }
      try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        masterGain = audioCtx.createGain();
        masterGain.gain.value = muted ? 0 : 0.5;
        masterGain.connect(audioCtx.destination);
        noiseBuf = audioCtx.createBuffer(1, Math.floor(audioCtx.sampleRate * 0.5), audioCtx.sampleRate);
        const d = noiseBuf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      } catch {
        audioCtx = null;
      }
    }
    function toggleMute() {
      muted = !muted;
      if (masterGain) masterGain.gain.value = muted ? 0 : 0.5;
    }
    function tone(freq, dur, type, vol, delay, freqEnd) {
      if (!audioCtx) return;
      const t0 = audioCtx.currentTime + (delay || 0);
      const osc = audioCtx.createOscillator();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, t0);
      if (freqEnd) osc.frequency.exponentialRampToValueAtTime(freqEnd, t0 + dur);
      const g = audioCtx.createGain();
      g.gain.setValueAtTime(vol || 0.3, t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g);
      g.connect(masterGain);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    }
    function noiseHit(dur, filterFreq, vol, delay) {
      if (!audioCtx) return;
      const t0 = audioCtx.currentTime + (delay || 0);
      const src = audioCtx.createBufferSource();
      src.buffer = noiseBuf;
      const filt = audioCtx.createBiquadFilter();
      filt.type = 'lowpass';
      filt.frequency.value = filterFreq || 1000;
      const g = audioCtx.createGain();
      g.gain.setValueAtTime(vol || 0.3, t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      src.connect(filt);
      filt.connect(g);
      g.connect(masterGain);
      src.start(t0);
      src.stop(t0 + dur + 0.02);
    }
    const playFlap = () => { tone(650, 0.11, 'sine', 0.22, 0, 320); noiseHit(0.07, 1500, 0.06, 0); };
    const playScore = () => { tone(880, 0.09, 'square', 0.16, 0); tone(1174, 0.13, 'square', 0.16, 0.08); };
    const playHit = () => { noiseHit(0.28, 700, 0.35, 0); tone(160, 0.32, 'sawtooth', 0.25, 0, 60); };
    const playGameOverJingle = () => { tone(392, 0.15, 'triangle', 0.18, 0.12); tone(330, 0.15, 'triangle', 0.18, 0.28); tone(262, 0.25, 'triangle', 0.2, 0.44); };
    const playSelect = () => { tone(560, 0.06, 'triangle', 0.14, 0); };

    // ---------- Bird ----------
    const bird = {
      x: 118,
      y: PLAY_H * 0.42,
      r: 15,
      vy: 0,
      rot: 0,
      wingPhase: 0,
      flapPower: 0.16,
      idleBob: 0,
    };
    const GRAVITY = 0.52;
    const JUMP_V = -8.6;
    const MAX_FALL = 11;

    function resetBird() {
      bird.y = PLAY_H * 0.42;
      bird.vy = 0;
      bird.rot = 0;
      bird.wingPhase = 0;
      bird.flapPower = 0.16;
    }
    function flap() {
      bird.vy = JUMP_V;
      bird.flapPower = 0.55;
      spawnFeathers(4);
      playFlap();
    }
    function updateBird(dt) {
      if (state === STATE.PLAY) {
        bird.vy += GRAVITY * dt;
        bird.vy = clamp(bird.vy, -99, MAX_FALL);
        bird.y += bird.vy * dt;
        if (bird.y - bird.r < 0) { bird.y = bird.r; bird.vy = 0.5; }
        if (bird.y + bird.r >= PLAY_H) { bird.y = PLAY_H - bird.r; die(); }
        const targetRot = (clamp(bird.vy * 4.2, -28, 88) * Math.PI) / 180;
        bird.rot = lerp(bird.rot, targetRot, 0.18);
      } else if (state === STATE.START) {
        bird.idleBob += 0.06 * dt;
        bird.y = PLAY_H * 0.42 + Math.sin(bird.idleBob) * 10;
        bird.rot = lerp(bird.rot, Math.sin(bird.idleBob * 0.6) * 0.12, 0.1);
      } else if (state === STATE.DEAD) {
        bird.vy += GRAVITY * dt;
        bird.vy = clamp(bird.vy, -99, MAX_FALL);
        bird.y += bird.vy * dt;
        bird.y = Math.min(bird.y, PLAY_H - bird.r);
        bird.rot = lerp(bird.rot, (Math.PI / 2) * 0.95, 0.12);
      }
      bird.flapPower = lerp(bird.flapPower, state === STATE.PLAY ? 0.16 : 0.22, 0.04 * dt);
      bird.wingPhase += bird.flapPower * dt;
    }
    function drawBird() {
      const skin = BIRDS[selectedBird];
      ctx.save();
      ctx.translate(bird.x, bird.y);
      ctx.rotate(bird.rot);

      ctx.save();
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.ellipse(2, 6, 17, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      const wingLift = Math.sin(bird.wingPhase);

      ctx.fillStyle = skin.tail;
      ctx.beginPath();
      ctx.moveTo(-13, -2);
      ctx.lineTo(-24, -8 - wingLift * 3);
      ctx.lineTo(-24, 4 - wingLift * 3);
      ctx.closePath();
      ctx.fill();

      ctx.save();
      ctx.translate(-2, 3);
      ctx.rotate(wingLift * 0.5 + 0.15);
      ctx.fillStyle = skin.wingBack;
      ctx.beginPath();
      ctx.ellipse(0, 0, 12, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      const grad = ctx.createRadialGradient(-5, -6, 2, 0, 0, 20);
      grad.addColorStop(0, skin.bodyLight);
      grad.addColorStop(1, skin.bodyDark);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(0, 0, 16, 13, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = skin.belly;
      ctx.beginPath();
      ctx.ellipse(-2, 5, 10, 7, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.translate(-1, 1);
      ctx.rotate(-wingLift * 0.9 - 0.2);
      const wgrad = ctx.createLinearGradient(0, -8, 0, 8);
      wgrad.addColorStop(0, skin.wingLight);
      wgrad.addColorStop(1, skin.wingDark);
      ctx.fillStyle = wgrad;
      ctx.beginPath();
      ctx.ellipse(2, 0, 13, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.fillStyle = '#2b1d3d';
      ctx.beginPath();
      ctx.arc(7, -4, 2.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(7.9, -4.9, 0.9, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = skin.beak;
      ctx.beginPath();
      ctx.moveTo(14, -1);
      ctx.lineTo(23, 2);
      ctx.lineTo(14, 5);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    }
    function drawMiniBird(cx, cy, skin, scale) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(scale, scale);
      const grad = ctx.createRadialGradient(-3, -3, 1, 0, 0, 12);
      grad.addColorStop(0, skin.bodyLight);
      grad.addColorStop(1, skin.bodyDark);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(0, 0, 11, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = skin.belly;
      ctx.beginPath();
      ctx.ellipse(-1, 4, 7, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = skin.beak;
      ctx.beginPath();
      ctx.moveTo(9, -1);
      ctx.lineTo(16, 1);
      ctx.lineTo(9, 3);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#2b1d3d';
      ctx.beginPath();
      ctx.arc(4, -3, 1.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // ---------- Particles ----------
    let particles = [];
    function spawnFeathers(n) {
      for (let i = 0; i < n; i++) {
        particles.push({
          x: bird.x - 6,
          y: bird.y + rand(-4, 6),
          vx: rand(-1.6, -0.4) - Math.max(0, -bird.vy * 0.05),
          vy: rand(0.4, 1.6),
          life: 1,
          decay: rand(0.02, 0.035),
          size: rand(2.5, 4.5),
          rot: rand(0, Math.PI * 2),
          color: Math.random() < 0.5 ? '#ffcf5c' : '#fff6df',
          kind: 'feather',
        });
      }
    }
    function spawnBurst() {
      for (let i = 0; i < 18; i++) {
        const ang = rand(0, Math.PI * 2);
        const spd = rand(1.5, 5);
        particles.push({
          x: bird.x,
          y: bird.y,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
          life: 1,
          decay: rand(0.018, 0.03),
          size: rand(2, 5),
          rot: rand(0, Math.PI * 2),
          color: ['#ffbb3d', '#ff6a3d', '#fff6df', '#e8703a'][i % 4],
          kind: 'burst',
        });
      }
    }
    function updateParticles(dt) {
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 0.06 * dt;
        p.life -= p.decay * dt;
        p.rot += 0.1 * dt;
        if (p.life <= 0) particles.splice(i, 1);
      }
    }
    function drawParticles() {
      for (const p of particles) {
        ctx.save();
        ctx.globalAlpha = clamp(p.life, 0, 1);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        if (p.kind === 'feather') {
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size, p.size * 0.5, 0, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        }
        ctx.restore();
      }
    }

    // ---------- Score popups ----------
    function spawnPopup(x, y, text, color) {
      popups.push({ x, y, text, color, life: 1 });
    }
    function updatePopups(dt) {
      for (let i = popups.length - 1; i >= 0; i--) {
        const p = popups[i];
        p.y -= 0.6 * dt;
        p.life -= 0.02 * dt;
        if (p.life <= 0) popups.splice(i, 1);
      }
    }
    function drawPopups() {
      ctx.textAlign = 'center';
      ctx.font = `800 20px ${FONT_DISPLAY}`;
      for (const p of popups) {
        ctx.save();
        ctx.globalAlpha = clamp(p.life, 0, 1);
        ctx.fillStyle = p.color;
        ctx.fillText(p.text, p.x, p.y);
        ctx.restore();
      }
    }

    // ---------- Pipes ----------
    let pipes = [];
    const PIPE_W = 60;
    function resetPipes() {
      pipes = [];
      spawnPipe(W + 120);
      spawnPipe(W + 120 + difficulty().spawnGapPx);
    }
    function spawnPipe(x) {
      const d = difficulty();
      const minTop = 60;
      const maxTop = PLAY_H - 60 - d.gap;
      const top = rand(minTop, Math.max(minTop + 10, maxTop));
      pipes.push({ x, top, gap: d.gap, passed: false });
    }
    function updatePipes(dt) {
      const d = difficulty();
      for (const p of pipes) p.x -= d.speed * dt;
      if (pipes.length && pipes[pipes.length - 1].x < W - d.spawnGapPx) {
        spawnPipe(W + 20);
      }
      while (pipes.length && pipes[0].x < -PIPE_W - 40) {
        pipes.shift();
      }
      for (const p of pipes) {
        if (!p.passed && p.x + PIPE_W < bird.x) {
          p.passed = true;
          score++;
          if (score > best) best = score;
          spawnPopup(bird.x, bird.y - 30, '+1', '#3ddc97');
          flashT = 1;
          playScore();
        }
        if (
          circleRectCollide(bird.x, bird.y, bird.r - 3, p.x, 0, PIPE_W, p.top) ||
          circleRectCollide(bird.x, bird.y, bird.r - 3, p.x, p.top + p.gap, PIPE_W, PLAY_H - (p.top + p.gap))
        ) {
          die();
        }
      }
    }
    function drawPipe(x, top, gap) {
      const capH = 26;
      const capOverhang = 6;
      const bodyGrad = ctx.createLinearGradient(x, 0, x + PIPE_W, 0);
      bodyGrad.addColorStop(0, '#2fae6c');
      bodyGrad.addColorStop(0.5, '#3ddc97');
      bodyGrad.addColorStop(1, '#28935a');

      ctx.fillStyle = bodyGrad;
      ctx.fillRect(x, 0, PIPE_W, Math.max(0, top - capH));
      ctx.fillRect(x - capOverhang, Math.max(0, top - capH), PIPE_W + capOverhang * 2, capH);
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(x + 6, 0, 7, Math.max(0, top - capH));

      const by = top + gap;
      ctx.fillStyle = bodyGrad;
      ctx.fillRect(x, by + capH, PIPE_W, Math.max(0, PLAY_H - (by + capH)));
      ctx.fillRect(x - capOverhang, by, PIPE_W + capOverhang * 2, capH);
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(x + 6, by + capH, 7, Math.max(0, PLAY_H - (by + capH)));

      ctx.strokeStyle = 'rgba(15,60,40,0.35)';
      ctx.lineWidth = 2;
      ctx.strokeRect(x - capOverhang, Math.max(0, top - capH), PIPE_W + capOverhang * 2, capH);
      ctx.strokeRect(x - capOverhang, by, PIPE_W + capOverhang * 2, capH);
    }
    function drawPipes() {
      for (const p of pipes) drawPipe(p.x, p.top, p.gap);
    }

    // ---------- Parallax background ----------
    let clouds = [];
    let hillsBack = [];
    let hillsFront = [];
    function initBG() {
      clouds = [];
      for (let i = 0; i < 6; i++) {
        clouds.push({ x: rand(0, W), y: rand(30, PLAY_H * 0.5), s: rand(0.6, 1.3), spd: rand(0.15, 0.35) });
      }
      hillsBack = genHills(6, PLAY_H * 0.72, 55);
      hillsFront = genHills(5, PLAY_H * 0.82, 70);
    }
    function genHills(n, baseY, amp) {
      const pts = [];
      for (let i = 0; i <= n; i++) {
        pts.push({ x: i * (W / (n - 2)), h: rand(amp * 0.5, amp) });
      }
      return { pts, baseY, offset: 0 };
    }
    function updateBG(dt, speedFactor) {
      for (const c of clouds) {
        c.x -= c.spd * speedFactor * dt;
        if (c.x < -60) { c.x = W + 60; c.y = rand(20, PLAY_H * 0.5); c.s = rand(0.6, 1.3); }
      }
      hillsBack.offset -= 0.28 * speedFactor * dt;
      hillsFront.offset -= 0.5 * speedFactor * dt;
    }
    function drawCloud(x, y, s) {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(s, s);
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath();
      ctx.ellipse(0, 0, 22, 13, 0, 0, Math.PI * 2);
      ctx.ellipse(16, -6, 14, 10, 0, 0, Math.PI * 2);
      ctx.ellipse(-16, -4, 13, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    function drawHills(hillObj, color) {
      const { pts, baseY, offset } = hillObj;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(-40, PLAY_H);
      const span = pts[pts.length - 1].x;
      const wrappedOffset = ((offset % span) + span) % span;
      for (let rep = -1; rep <= 1; rep++) {
        for (let i = 0; i < pts.length; i++) {
          const px = pts[i].x + wrappedOffset + rep * span - 40;
          const py = baseY - pts[i].h;
          ctx.lineTo(px, py);
        }
      }
      ctx.lineTo(W + 40, PLAY_H);
      ctx.closePath();
      ctx.fill();
    }
    function skyColors(t) {
      const topA = [142, 201, 232];
      const topB = [45, 26, 66];
      const midA = [196, 225, 214];
      const midB = [143, 58, 92];
      const sunA = [255, 244, 214];
      const sunB = [255, 140, 110];
      return {
        top: lerpColor(topA, topB, t),
        mid: lerpColor(midA, midB, t),
        sun: lerpColor(sunA, sunB, t),
      };
    }
    function drawBackground(t) {
      const c = skyColors(t);
      const g = ctx.createLinearGradient(0, 0, 0, PLAY_H);
      g.addColorStop(0, c.top);
      g.addColorStop(0.6, c.mid);
      g.addColorStop(1, '#ffe9c7');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, PLAY_H);

      ctx.save();
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = c.sun;
      ctx.shadowColor = c.sun;
      ctx.shadowBlur = 40;
      ctx.beginPath();
      ctx.arc(W * 0.78, PLAY_H * 0.22, 34, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      for (const cl of clouds) drawCloud(cl.x, cl.y, cl.s);

      drawHills(hillsBack, lerpColor([120, 150, 120], [70, 40, 70], t));
      drawHills(hillsFront, lerpColor([88, 120, 90], [50, 26, 50], t));
    }
    function drawGround(offsetPhase) {
      const y = PLAY_H;
      const grad = ctx.createLinearGradient(0, y, 0, H);
      grad.addColorStop(0, '#deb373');
      grad.addColorStop(1, '#a9743f');
      ctx.fillStyle = grad;
      ctx.fillRect(0, y, W, GROUND_H);

      ctx.fillStyle = '#7fbf5a';
      ctx.fillRect(0, y, W, 10);
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      const w = 22;
      const off = ((offsetPhase % w) + w) % w;
      for (let x = -w + off; x < W; x += w) {
        ctx.beginPath();
        ctx.moveTo(x, y + 4);
        ctx.lineTo(x + w * 0.5, y + 10);
        ctx.lineTo(x + w, y + 4);
        ctx.fill();
      }
    }

    // ---------- Death / reset ----------
    function die() {
      if (state !== STATE.PLAY) return;
      state = STATE.DEAD;
      if (!completionSent) {
        completionSent = true;
        onComplete?.({ official: true, score });
      }
      spawnBurst();
      shakeTime = 0.35;
      shakeMag = 8;
      playHit();
      playGameOverJingle();
    }
    function startGame() {
      score = 0;
      completionSent = false;
      resetBird();
      resetPipes();
      particles = [];
      popups = [];
      state = STATE.PLAY;
    }

    // ---------- UI layout ----------
    const SWATCH_R = 24;
    const SWATCH_SPACING = 62;
    const UI = { titleY: PLAY_H * 0.17, chooseY: PLAY_H * 0.47 };
    UI.subtitleY = UI.titleY + 30;
    UI.swatchY = UI.chooseY + 36;
    UI.nameY = UI.swatchY + 42;
    UI.bestY = UI.nameY + 26;
    const MUTE_X = 26;
    const MUTE_Y = 26;
    const MUTE_R = 18;

    // ---------- Input ----------
    function onAction() {
      if (state === STATE.START) { startGame(); flap(); }
      else if (state === STATE.PLAY) { flap(); }
      else if (state === STATE.DEAD) { startGame(); flap(); }
    }
    function getCanvasPos(e) {
      const rect = canvas.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left) * (canvas.width / rect.width),
        y: (e.clientY - rect.top) * (canvas.height / rect.height),
      };
    }
    const muteButtonHit = (x, y) => Math.hypot(x - MUTE_X, y - MUTE_Y) <= MUTE_R + 4;
    function birdSwatchHit(x, y) {
      if (state !== STATE.START) return -1;
      const n = BIRDS.length;
      const startX = W / 2 - (SWATCH_SPACING * (n - 1)) / 2;
      for (let i = 0; i < n; i++) {
        const cx = startX + i * SWATCH_SPACING;
        const cy = UI.swatchY;
        if (Math.hypot(x - cx, y - cy) <= SWATCH_R + 6) return i;
      }
      return -1;
    }

    const onKeyDown = (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        ensureAudio();
        onAction();
      } else if (state === STATE.START && (e.code === 'ArrowLeft' || e.code === 'ArrowRight')) {
        e.preventDefault();
        ensureAudio();
        const dir = e.code === 'ArrowRight' ? 1 : -1;
        selectedBird = (selectedBird + dir + BIRDS.length) % BIRDS.length;
        playSelect();
      }
    };
    const onPointerDown = (e) => {
      e.preventDefault();
      ensureAudio();
      const pos = getCanvasPos(e);
      if (muteButtonHit(pos.x, pos.y)) { toggleMute(); return; }
      const hit = birdSwatchHit(pos.x, pos.y);
      if (hit >= 0) { selectedBird = hit; playSelect(); return; }
      onAction();
    };
    const onTouchStart = (e) => { e.preventDefault(); };

    window.addEventListener('keydown', onKeyDown);
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });

    // ---------- UI overlays ----------
    function roundRect(x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }
    function drawMuteButton() {
      ctx.save();
      ctx.beginPath();
      ctx.arc(MUTE_X, MUTE_Y, MUTE_R, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(20,12,32,0.4)';
      ctx.fill();

      ctx.fillStyle = '#fff7ea';
      ctx.beginPath();
      ctx.moveTo(MUTE_X - 8, MUTE_Y - 4);
      ctx.lineTo(MUTE_X - 3, MUTE_Y - 4);
      ctx.lineTo(MUTE_X + 3, MUTE_Y - 9);
      ctx.lineTo(MUTE_X + 3, MUTE_Y + 9);
      ctx.lineTo(MUTE_X - 3, MUTE_Y + 4);
      ctx.lineTo(MUTE_X - 8, MUTE_Y + 4);
      ctx.closePath();
      ctx.fill();

      ctx.lineCap = 'round';
      if (!muted) {
        ctx.strokeStyle = '#fff7ea';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(MUTE_X + 6, MUTE_Y, 6, -0.6, 0.6); ctx.stroke();
        ctx.beginPath(); ctx.arc(MUTE_X + 6, MUTE_Y, 10, -0.7, 0.7); ctx.stroke();
      } else {
        ctx.strokeStyle = '#ff6a3d';
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(MUTE_X - 10, MUTE_Y - 10); ctx.lineTo(MUTE_X + 12, MUTE_Y + 10); ctx.stroke();
      }
      ctx.restore();
    }
    function drawBirdSwatches() {
      const n = BIRDS.length;
      const startX = W / 2 - (SWATCH_SPACING * (n - 1)) / 2;
      for (let i = 0; i < n; i++) {
        const cx = startX + i * SWATCH_SPACING;
        const cy = UI.swatchY;
        const sel = i === selectedBird;
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, SWATCH_R, 0, Math.PI * 2);
        ctx.fillStyle = sel ? 'rgba(255,247,234,0.95)' : 'rgba(255,247,234,0.5)';
        ctx.fill();
        if (sel) { ctx.lineWidth = 3; ctx.strokeStyle = '#3ddc97'; ctx.stroke(); }
        ctx.restore();
        drawMiniBird(cx, cy, BIRDS[i], sel ? 1.05 : 0.88);
      }
    }
    function drawScoreHUD() {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.font = `800 46px ${FONT_DISPLAY}`;
      ctx.lineWidth = 6;
      ctx.strokeStyle = 'rgba(43,29,61,0.55)';
      ctx.fillStyle = '#fff7ea';
      ctx.strokeText(String(score), W / 2, 92);
      ctx.fillText(String(score), W / 2, 92);
      ctx.restore();
    }
    function drawStartScreen() {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(20,12,32,0.28)';
      ctx.fillRect(0, 0, W, PLAY_H);

      ctx.font = `800 46px ${FONT_DISPLAY}`;
      ctx.fillStyle = '#fff7ea';
      ctx.shadowColor = 'rgba(0,0,0,0.35)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 3;
      ctx.fillText('GLIDE', W / 2, UI.titleY);

      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
      ctx.font = `700 16px ${FONT_BODY}`;
      ctx.fillStyle = 'rgba(255,247,234,0.85)';
      ctx.fillText('tap / space to fly', W / 2, UI.subtitleY);

      ctx.font = `700 13px ${FONT_BODY}`;
      ctx.fillStyle = 'rgba(255,247,234,0.7)';
      ctx.fillText('choose your bird  ·  ← →', W / 2, UI.chooseY);

      drawBirdSwatches();

      ctx.font = `800 15px ${FONT_DISPLAY}`;
      ctx.fillStyle = '#fff7ea';
      ctx.fillText(BIRDS[selectedBird].name, W / 2, UI.nameY);

      if (best > 0) {
        ctx.font = `700 14px ${FONT_BODY}`;
        ctx.fillStyle = 'rgba(255,247,234,0.65)';
        ctx.fillText(`best  ${best}`, W / 2, UI.bestY);
      }
      ctx.restore();
    }
    function drawDeadScreen() {
      ctx.save();
      ctx.fillStyle = 'rgba(20,12,32,0.45)';
      ctx.fillRect(0, 0, W, PLAY_H);

      const cw = 260;
      const ch = 200;
      const cx = (W - cw) / 2;
      const cy = PLAY_H * 0.32;
      ctx.fillStyle = 'rgba(255,247,234,0.96)';
      roundRect(cx, cy, cw, ch, 22);
      ctx.fill();

      ctx.textAlign = 'center';
      ctx.fillStyle = '#2b1d3d';
      ctx.font = `800 26px ${FONT_DISPLAY}`;
      ctx.fillText('Game Over', W / 2, cy + 42);

      ctx.font = `700 13px ${FONT_BODY}`;
      ctx.fillStyle = 'rgba(43,29,61,0.6)';
      ctx.fillText('SCORE', W / 2 - 55, cy + 80);
      ctx.fillText('BEST', W / 2 + 55, cy + 80);

      ctx.font = `800 30px ${FONT_DISPLAY}`;
      ctx.fillStyle = '#ff6a3d';
      ctx.fillText(String(score), W / 2 - 55, cy + 112);
      ctx.fillStyle = '#2fae6c';
      ctx.fillText(String(best), W / 2 + 55, cy + 112);

      ctx.fillStyle = '#ff8a5b';
      roundRect(cx + cw / 2 - 70, cy + ch - 56, 140, 40, 20);
      ctx.fill();
      ctx.fillStyle = '#fff7ea';
      ctx.font = `800 15px ${FONT_DISPLAY}`;
      ctx.fillText('TAP TO RETRY', W / 2, cy + ch - 30);

      ctx.restore();
    }
    function drawDifficultyMeter(t) {
      const w = 90;
      const h = 6;
      const x = W / 2 - w / 2;
      const y = 16;
      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = 'rgba(255,247,234,0.25)';
      roundRect(x, y, w, h, 3);
      ctx.fill();
      ctx.fillStyle = '#3ddc97';
      roundRect(x, y, w * t, h, 3);
      ctx.fill();
      ctx.restore();
    }

    // ---------- Main loop ----------
    function frame(ts) {
      if (!lastTime) lastTime = ts;
      let dt = (ts - lastTime) / 16.6667;
      dt = clamp(dt, 0, 2.4);
      lastTime = ts;

      const d = difficulty();
      const speedFactor = state === STATE.PLAY ? d.speed / 2.35 : 0.6;

      updateBG(dt, speedFactor);
      updateBird(dt);
      if (state === STATE.PLAY) updatePipes(dt);
      updateParticles(dt);
      updatePopups(dt);
      if (shakeTime > 0) shakeTime -= 0.016 * dt;
      if (flashT > 0) flashT -= 0.05 * dt;

      ctx.save();
      if (shakeTime > 0) {
        const m = shakeMag * shakeTime;
        ctx.translate(rand(-m, m), rand(-m, m));
      }

      drawBackground(d.t);
      drawPipes();
      drawGround(-((performance.now() / 1000) * 40 * speedFactor));
      drawParticles();
      drawBird();

      if (flashT > 0) {
        ctx.fillStyle = `rgba(255,255,255,${0.25 * flashT})`;
        ctx.fillRect(0, 0, W, PLAY_H);
      }

      if (state === STATE.PLAY) {
        drawScoreHUD();
        drawDifficultyMeter(d.t);
      }
      drawPopups();

      if (state === STATE.START) drawStartScreen();
      if (state === STATE.DEAD) drawDeadScreen();

      ctx.restore();

      drawMuteButton();

      rafId = requestAnimationFrame(frame);
    }

    initBG();
    rafId = requestAnimationFrame(frame);

    // ---------- Cleanup on unmount ----------
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('keydown', onKeyDown);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('touchstart', onTouchStart);
      if (audioCtx) {
        audioCtx.close();
        audioCtx = null;
      }
    };
  }, [canvasRef, onComplete]);
}
