import { useEffect, useRef } from 'react';

/* ═══════════════════════════════════════════════════════════
   SNAKE GAME ("Serpent // Field Runner") — canvas 2D engine
   Ported from the standalone HTML into a React hook.

   Overlays (start/pause/gameover/level-up/HUD) are rendered
   by React. This hook:
     • drives the canvas (grid, snake, food, obstacles, particles)
     • reports state changes via the onState callback
     • exposes an imperative API (start, resume, pause, setDir)
   ═══════════════════════════════════════════════════════════ */

const LEVELS = [
  { quota: 5, tick: 190, obstacles: 0, label: 'Meadow' },
  { quota: 6, tick: 165, obstacles: 2, label: 'Hedgerow' },
  { quota: 7, tick: 145, obstacles: 4, label: 'Orchard' },
  { quota: 8, tick: 128, obstacles: 6, label: 'Thicket' },
  { quota: 9, tick: 114, obstacles: 8, label: 'Ravine' },
  { quota: 10, tick: 100, obstacles: 10, label: 'Wildwood' },
];
function levelCfg(l) { return LEVELS[Math.min(l - 1, LEVELS.length - 1)]; }

/**
 * @param {React.RefObject<HTMLCanvasElement>} canvasRef
 * @param {(s: object) => void} onState
 * @returns {React.MutableRefObject<{ start: () => void, pause: () => void, resume: () => void, setDir: (dx:number, dy:number) => void }>}
 */
export default function useSnakeGame(canvasRef, onState) {
  const apiRef = useRef({ start() {}, pause() {}, resume() {}, setDir() {} });
  const onStateRef = useRef(onState);
  useEffect(() => { onStateRef.current = onState; });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');

    let COLS = 18;
    let ROWS = 18;
    let cellSize = 0;
    let offX = 0;
    let offY = 0;
    const dpr = Math.max(1, window.devicePixelRatio || 1);

    const emit = (extra = {}) => { onStateRef.current?.(extra); };

    /* ---------- Ground texture ---------- */
    const groundCanvas = document.createElement('canvas');
    const groundCtx = groundCanvas.getContext('2d');
    function seededRand(seed) {
      let s = seed % 2147483647;
      if (s <= 0) s += 2147483646;
      return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
    }
    function buildGroundTexture(w, h) {
      groundCanvas.width = w * dpr;
      groundCanvas.height = h * dpr;
      const g = groundCtx;
      const rnd = seededRand(1337);
      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          const checker = (x + y) % 2 === 0;
          g.fillStyle = checker ? '#3d5a3d' : '#375339';
          g.fillRect((offX + x * cellSize) * dpr, (offY + y * cellSize) * dpr, cellSize * dpr + 1, cellSize * dpr + 1);
        }
      }
      for (let i = 0; i < 130; i++) {
        const px = rnd() * w * dpr;
        const py = rnd() * h * dpr;
        const r = (rnd() * 26 + 10) * dpr;
        const grad = g.createRadialGradient(px, py, 0, px, py, r);
        grad.addColorStop(0, 'rgba(20,35,20,0.18)');
        grad.addColorStop(1, 'rgba(20,35,20,0)');
        g.fillStyle = grad;
        g.beginPath(); g.arc(px, py, r, 0, Math.PI * 2); g.fill();
      }
      for (let i = 0; i < Math.floor(COLS * ROWS * 8); i++) {
        const px = rnd() * w * dpr;
        const py = rnd() * h * dpr;
        const len = (rnd() * 3 + 2) * dpr;
        const hueShift = rnd() * 24 - 12;
        g.strokeStyle = `rgba(${140 + hueShift},${190 + hueShift},${110 + hueShift},${0.22 + rnd() * 0.22})`;
        g.lineWidth = 1 * dpr;
        g.beginPath();
        g.moveTo(px, py);
        g.lineTo(px + (rnd() - 0.5) * 3 * dpr, py - len);
        g.stroke();
      }
      for (let i = 0; i < Math.floor((w * h * dpr * dpr) / 26000); i++) {
        const px = rnd() * w * dpr;
        const py = rnd() * h * dpr;
        const r = (rnd() * 2.6 + 1.2) * dpr;
        g.fillStyle = `rgba(90,90,80,${0.28 + rnd() * 0.28})`;
        g.beginPath(); g.arc(px, py, r, 0, Math.PI * 2); g.fill();
        g.fillStyle = 'rgba(160,160,140,0.22)';
        g.beginPath(); g.arc(px - r * 0.3, py - r * 0.3, r * 0.4, 0, Math.PI * 2); g.fill();
      }
      g.strokeStyle = 'rgba(30,20,12,0.4)';
      g.lineWidth = 5 * dpr;
      g.strokeRect(2 * dpr, 2 * dpr, w * dpr - 4 * dpr, h * dpr - 4 * dpr);
    }

    /* ---------- Resize ---------- */
    function resize() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const targetCell = Math.min(w, h) / 18;
      COLS = Math.max(10, Math.round(w / targetCell));
      ROWS = Math.max(10, Math.round(h / targetCell));
      cellSize = Math.min(w / COLS, h / ROWS);
      offX = (w - COLS * cellSize) / 2;
      offY = (h - ROWS * cellSize) / 2;

      buildGroundTexture(w, h);
      if (snake.length) {
        snake.forEach((s) => { s.x = Math.min(s.x, COLS - 1); s.y = Math.min(s.y, ROWS - 1); });
      }
    }

    /* ---------- Game state ---------- */
    let snake = [{ x: 8, y: 9 }, { x: 7, y: 9 }, { x: 6, y: 9 }];
    let dir = { x: 1, y: 0 };
    let nextDir = { x: 1, y: 0 };
    let food = null;
    let obstacles = [];
    let score = 0;
    let level = 1;
    let best = 0;
    let foodEatenThisLevel = 0;
    let prevSnake = [];
    let tickMs = 190;
    let tickTimer = 0;
    let lastTime = 0;
    let running = false;
    let paused = false;
    let over = false;
    let animT = 0;
    let tongueT = 0;
    let particles = [];
    let rafId = 0;

    try { best = parseInt(localStorage.getItem('snake:best'), 10) || 0; } catch { best = 0; }
    function saveBest() { try { localStorage.setItem('snake:best', String(best)); } catch { /* */ } }

    function cellIsObstacle(c) { return obstacles.some((o) => o.x === c.x && o.y === c.y); }
    function cellOccupiedBySnake(c) { return snake.some((s) => s.x === c.x && s.y === c.y); }
    function randomEmptyCell() {
      let c;
      do { c = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) }; }
      while (cellOccupiedBySnake(c) || cellIsObstacle(c));
      return c;
    }
    function placeObstacles() {
      obstacles = [];
      const count = levelCfg(level).obstacles;
      for (let i = 0; i < count; i++) {
        let c;
        let tries = 0;
        do {
          c = { x: 2 + Math.floor(Math.random() * (COLS - 4)), y: 2 + Math.floor(Math.random() * (ROWS - 4)) };
          tries++;
        } while (tries < 50 && (cellOccupiedBySnake(c) || cellIsObstacle(c) || (Math.abs(c.x - snake[0].x) < 3 && Math.abs(c.y - snake[0].y) < 3)));
        obstacles.push(c);
      }
    }
    function spawnParticles(gx, gy) {
      for (let i = 0; i < 10; i++) {
        particles.push({
          x: offX + (gx + 0.5) * cellSize,
          y: offY + (gy + 0.5) * cellSize,
          vx: (Math.random() - 0.5) * 2.6,
          vy: (Math.random() - 0.5) * 2.6,
          life: 1,
          color: Math.random() > 0.5 ? '255,210,63' : '230,57,70',
        });
      }
    }

    function resetGame() {
      const cx = Math.floor(COLS / 2);
      const cy = Math.floor(ROWS / 2);
      snake = [{ x: cx, y: cy }, { x: cx - 1, y: cy }, { x: cx - 2, y: cy }];
      dir = { x: 1, y: 0 };
      nextDir = { x: 1, y: 0 };
      prevSnake = snake.map((s) => ({ ...s }));
      score = 0;
      level = 1;
      foodEatenThisLevel = 0;
      obstacles = [];
      placeObstacles();
      food = randomEmptyCell();
      tickMs = levelCfg(level).tick;
      tickTimer = 0;
      over = false;
      paused = false;
      particles = [];
    }

    function emitHud() {
      const cfg = levelCfg(level);
      emit({ type: 'hud', score, level, best, foodEaten: foodEatenThisLevel, quota: cfg.quota });
    }

    function tick() {
      dir = nextDir;
      prevSnake = snake.map((s) => ({ ...s }));
      const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

      if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) { gameOver(); return; }
      if (snake.some((s, i) => i > 0 && s.x === head.x && s.y === head.y)) { gameOver(); return; }
      if (cellIsObstacle(head)) { gameOver(); return; }

      snake.unshift(head);

      if (food && head.x === food.x && head.y === food.y) {
        score += 10;
        foodEatenThisLevel++;
        spawnParticles(food.x, food.y);
        if (foodEatenThisLevel >= levelCfg(level).quota) {
          doLevelUp();
        } else {
          food = randomEmptyCell();
        }
      } else {
        snake.pop();
      }
      emitHud();
    }

    function doLevelUp() {
      paused = true;
      level++;
      foodEatenThisLevel = 0;
      placeObstacles();
      food = randomEmptyCell();
      tickMs = levelCfg(level).tick;
      const cfg = levelCfg(level);
      emit({ type: 'levelup', level, label: cfg.label, quota: cfg.quota, obstacles: cfg.obstacles });
      setTimeout(() => { paused = false; }, 1500);
      emitHud();
    }

    function gameOver() {
      running = false;
      over = true;
      if (score > best) { best = score; saveBest(); }
      emit({ type: 'gameover', score, level, best });
      emitHud();
    }

    /* ---------- Input helper ---------- */
    function setDirection(dx, dy) {
      if (dx === -dir.x && dy === -dir.y) return;
      nextDir = { x: dx, y: dy };
    }

    /* ---------- Drawing ---------- */
    const lerp = (a, b, t) => a + (b - a) * t;

    function draw(alpha) {
      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(groundCanvas, 0, 0, groundCanvas.width, groundCanvas.height, 0, 0, w, h);

      // obstacles
      obstacles.forEach((o) => {
        const cx = offX + (o.x + 0.5) * cellSize;
        const cy = offY + (o.y + 0.5) * cellSize;
        const r = cellSize * 0.42;
        ctx.save();
        ctx.translate(cx, cy);
        const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
        grad.addColorStop(0, '#8a8577');
        grad.addColorStop(1, '#4c4a3f');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(0, 0, r, r * 0.86, 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(90,140,70,0.55)';
        ctx.beginPath();
        ctx.ellipse(-r * 0.25, -r * 0.35, r * 0.4, r * 0.22, 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // food
      if (food) {
        const pulse = 1 + Math.sin(animT / 220) * 0.06;
        const cx = offX + (food.x + 0.5) * cellSize;
        const cy = offY + (food.y + 0.5) * cellSize;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(pulse, pulse);
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.beginPath();
        ctx.ellipse(0, cellSize * 0.32, cellSize * 0.28, cellSize * 0.09, 0, 0, Math.PI * 2);
        ctx.fill();
        const g = ctx.createRadialGradient(-cellSize * 0.12, -cellSize * 0.12, cellSize * 0.03, 0, 0, cellSize * 0.34);
        g.addColorStop(0, '#ff6b6b');
        g.addColorStop(1, '#c1121f');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(0, 0, cellSize * 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#5b3a29';
        ctx.lineWidth = cellSize * 0.06;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(0, -cellSize * 0.3);
        ctx.lineTo(cellSize * 0.06, -cellSize * 0.44);
        ctx.stroke();
        ctx.fillStyle = '#5fa84a';
        ctx.beginPath();
        ctx.ellipse(cellSize * 0.14, -cellSize * 0.4, cellSize * 0.12, cellSize * 0.06, -0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        ctx.fillStyle = `rgba(${p.color},${Math.max(p.life, 0)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.045;
        if (p.life <= 0) particles.splice(i, 1);
      }

      // snake
      drawSnake(alpha);
    }

    function drawSnake(alpha) {
      if (!snake.length) return;
      const pts = snake.map((s, i) => {
        const p = prevSnake[i] || s;
        return {
          x: offX + lerp(p.x, s.x, alpha) * cellSize + cellSize / 2,
          y: offY + lerp(p.y, s.y, alpha) * cellSize + cellSize / 2,
        };
      });

      const n = pts.length;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      for (let i = n - 1; i >= 1; i--) {
        const t = 1 - i / n;
        const w = cellSize * (0.62 + 0.2 * t);
        const grad = ctx.createLinearGradient(pts[i].x, pts[i].y, pts[i - 1].x, pts[i - 1].y);
        grad.addColorStop(0, '#3f6a34');
        grad.addColorStop(1, '#8fc16a');
        ctx.strokeStyle = grad;
        ctx.lineWidth = w;
        ctx.beginPath();
        ctx.moveTo(pts[i].x, pts[i].y);
        ctx.lineTo(pts[i - 1].x, pts[i - 1].y);
        ctx.stroke();
        if (i % 2 === 0) {
          ctx.save();
          const ang = Math.atan2(pts[i - 1].y - pts[i].y, pts[i - 1].x - pts[i].x);
          ctx.translate(pts[i].x, pts[i].y);
          ctx.rotate(ang);
          ctx.strokeStyle = 'rgba(20,40,15,0.25)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(0, -w * 0.32);
          ctx.lineTo(0, w * 0.32);
          ctx.stroke();
          ctx.restore();
        }
      }

      // head
      const head = pts[0];
      const ang = Math.atan2(dir.y, dir.x);
      ctx.save();
      ctx.translate(head.x, head.y);
      ctx.rotate(ang);
      const hr = cellSize * 0.42;
      const hg = ctx.createRadialGradient(-hr * 0.3, -hr * 0.3, hr * 0.1, 0, 0, hr);
      hg.addColorStop(0, '#ffe27a');
      hg.addColorStop(1, '#ffb703');
      ctx.fillStyle = hg;
      ctx.beginPath();
      ctx.ellipse(0, 0, hr * 1.05, hr * 0.88, 0, 0, Math.PI * 2);
      ctx.fill();

      // tongue
      if (Math.sin(tongueT / 260) > 0.5) {
        ctx.strokeStyle = '#e63946';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(hr * 0.9, 0);
        ctx.lineTo(hr * 1.5, 0);
        ctx.moveTo(hr * 1.5, 0);
        ctx.lineTo(hr * 1.7, -4);
        ctx.moveTo(hr * 1.5, 0);
        ctx.lineTo(hr * 1.7, 4);
        ctx.stroke();
      }

      // eyes
      ctx.fillStyle = '#12210f';
      ctx.beginPath(); ctx.arc(hr * 0.25, -hr * 0.45, hr * 0.16, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(hr * 0.25, hr * 0.45, hr * 0.16, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(hr * 0.3, -hr * 0.48, hr * 0.05, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(hr * 0.3, hr * 0.42, hr * 0.05, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    /* ---------- Loop ---------- */
    function loop(now) {
      if (!running) return;
      const dt = now - lastTime;
      lastTime = now;
      animT += dt;
      tongueT += dt;

      if (!paused) {
        tickTimer += dt;
        while (tickTimer >= tickMs) {
          tickTimer -= tickMs;
          tick();
          if (!running) break;
        }
      }
      draw(tickTimer / tickMs);
      rafId = requestAnimationFrame(loop);
    }

    /* ---------- API ---------- */
    function startGame() {
      resetGame();
      running = true;
      lastTime = performance.now();
      emitHud();
      emit({ type: 'start' });
      rafId = requestAnimationFrame(loop);
    }
    function pauseGame() {
      if (!running || over) return;
      paused = true;
      emit({ type: 'pause' });
    }
    function resumeGame() {
      if (!running || over) return;
      paused = false;
      emit({ type: 'resume' });
    }

    apiRef.current = { start: startGame, pause: pauseGame, resume: resumeGame, setDir: setDirection };

    /* ---------- Input: keyboard + swipe ---------- */
    const onKeyDown = (e) => {
      switch (e.key) {
        case 'ArrowUp': case 'w': case 'W': setDirection(0, -1); e.preventDefault(); break;
        case 'ArrowDown': case 's': case 'S': setDirection(0, 1); e.preventDefault(); break;
        case 'ArrowLeft': case 'a': case 'A': setDirection(-1, 0); e.preventDefault(); break;
        case 'ArrowRight': case 'd': case 'D': setDirection(1, 0); e.preventDefault(); break;
        case ' ':
          if (paused) resumeGame(); else pauseGame();
          e.preventDefault();
          break;
      }
    };

    let touchStart = null;
    const onTouchStart = (e) => { touchStart = e.touches[0]; };
    const onTouchEnd = (e) => {
      if (!touchStart) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - touchStart.clientX;
      const dy = t.clientY - touchStart.clientY;
      if (Math.max(Math.abs(dx), Math.abs(dy)) > 20) {
        if (Math.abs(dx) > Math.abs(dy)) setDirection(dx > 0 ? 1 : -1, 0);
        else setDirection(0, dy > 0 ? 1 : -1);
      }
      touchStart = null;
    };

    /* ---------- Boot ---------- */
    resize();
    draw(0);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', resize);
    canvas.addEventListener('touchstart', onTouchStart, { passive: true });
    canvas.addEventListener('touchend', onTouchEnd, { passive: true });

    emit({ type: 'init', best });

    /* ---------- Cleanup ---------- */
    return () => {
      cancelAnimationFrame(rafId);
      running = false;
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchend', onTouchEnd);
    };
  }, [canvasRef]);

  return apiRef;
}
