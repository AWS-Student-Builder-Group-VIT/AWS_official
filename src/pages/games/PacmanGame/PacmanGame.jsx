import { useCallback, useEffect, useRef, useState } from 'react';

// ==========================================
// 1. INLINE STYLES (Self-Contained in Single File)
// ==========================================
const PACMAN_STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');

.pacman-wrapper {
  width: 100%;
  min-height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #050508;
  font-family: 'Press Start 2P', monospace, sans-serif;
  color: #ffffff;
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
  padding: 12px;
  box-sizing: border-box;
}

.pacman-cabinet {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #000000;
  padding: 10px 14px;
  border-radius: 12px;
  box-shadow: 0 0 50px rgba(33, 33, 255, 0.25), 0 0 100px rgba(0, 0, 0, 0.95);
  border: 3px solid #1a1a4a;
  max-width: 100%;
}

.pacman-hud {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 12px;
  font-size: 11px;
  color: #ffffff;
  letter-spacing: 1px;
}

.pacman-hud-col {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.pacman-hud-label {
  color: #ff0000;
  font-size: 10px;
}

.pacman-hud-val {
  color: #ffffff;
}

.pacman-canvas-wrap {
  position: relative;
  width: min(92vw, 448px);
  aspect-ratio: 28 / 31;
  background: #000000;
  border: 2px solid #2121ff;
  border-radius: 6px;
  overflow: hidden;
  box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.8), 0 0 15px rgba(33, 33, 255, 0.3);
}

.pacman-canvas {
  display: block;
  width: 100%;
  height: 100%;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}

.pacman-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  z-index: 20;
  text-align: center;
  padding: 20px;
  backdrop-filter: blur(3px);
}

.pacman-ov-title {
  font-size: clamp(20px, 5vw, 28px);
  color: #ffff00;
  text-shadow: 0 0 20px rgba(255, 255, 0, 0.6);
}

.pacman-ov-desc {
  font-size: 9px;
  color: #aaaaaa;
  line-height: 2.2;
  max-width: 340px;
}

.pacman-ov-desc b {
  color: #00ffff;
}

.pacman-arcade-btn {
  font-family: 'Press Start 2P', monospace;
  font-size: 11px;
  padding: 12px 24px;
  color: #000000;
  background: #ffff00;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  text-transform: uppercase;
  box-shadow: 0 4px 0 #999900, 0 0 20px rgba(255, 255, 0, 0.4);
  transition: transform 0.08s ease;
}

.pacman-arcade-btn:active {
  transform: translateY(3px);
  box-shadow: 0 1px 0 #999900;
}

.pacman-bottom-bar {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 12px 0 12px;
  font-size: 11px;
}

.pacman-lives-display {
  color: #ffff00;
  letter-spacing: 4px;
  font-size: 14px;
}

.pacman-hint {
  font-size: 8px;
  color: #666688;
}

.pacman-controls-bar {
  margin-top: 8px;
  display: flex;
  gap: 10px;
  justify-content: center;
  width: 100%;
}

.pacman-mini-btn {
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  padding: 6px 12px;
  color: #ffffff;
  background: #181830;
  border: 1px solid #333366;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.1s ease;
}

.pacman-mini-btn:hover {
  background: #2a2a50;
}

/* Touch D-Pad */
.pacman-dpad {
  display: none;
  margin-top: 8px;
  grid-template-columns: repeat(3, 44px);
  grid-template-rows: repeat(3, 44px);
  gap: 6px;
}

.pacman-dbtn {
  background: #181830;
  border: 2px solid #32326e;
  color: #00ffff;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  cursor: pointer;
}

.pacman-dbtn:active {
  background: #32326e;
  transform: translateY(2px);
}

.pacman-d-up { grid-column: 2; grid-row: 1; }
.pacman-d-left { grid-column: 1; grid-row: 2; }
.pacman-d-right { grid-column: 3; grid-row: 2; }
.pacman-d-down { grid-column: 2; grid-row: 3; }

@media (hover: none) and (pointer: coarse), (max-height: 720px) {
  .pacman-dpad { display: grid; }
  .pacman-cabinet { padding: 6px; }
}
`;

// ==========================================
// 2. CONSTANTS & ARCADE MAP (28 cols x 31 rows)
// ==========================================
const TILE = 16;
const COLS = 28;
const ROWS = 31;

const MAP = [
  "############################",
  "#............##............#",
  "#.####.#####.##.#####.####.#",
  "#o####.#####.##.#####.####o#",
  "#.####.#####.##.#####.####.#",
  "#..........................#",
  "#.####.##.########.##.####.#",
  "#.####.##.########.##.####.#",
  "#......##....##....##......#",
  "######.##### ## #####.######",
  "     #.##### ## #####.#     ",
  "     #.##          ##.#     ",
  "     #.## ###--### ##.#     ",
  "######.## #gggggg# ##.######",
  "TTTTTT.   #gggggg#   .TTTTTT",
  "######.## #gggggg# ##.######",
  "     #.## ######## ##.#     ",
  "     #.##          ##.#     ",
  "     #.## ######## ##.#     ",
  "######.## ######## ##.######",
  "#............##............#",
  "#.####.#####.##.#####.####.#",
  "#.####.#####.##.#####.####.#",
  "#o..##................##..o#",
  "###.##.##.########.##.##.###",
  "###.##.##.########.##.##.###",
  "#......##....##....##......#",
  "#.##########.##.##########.#",
  "#.##########.##.##########.#",
  "#..........................#",
  "############################"
];

const DIRS = {
  UP:    { x: 0,  y: -1, name: 'UP',    opp: 'DOWN' },
  LEFT:  { x: -1, y: 0,  name: 'LEFT',  opp: 'RIGHT' },
  DOWN:  { x: 0,  y: 1,  name: 'DOWN',  opp: 'UP' },
  RIGHT: { x: 1,  y: 0,  name: 'RIGHT', opp: 'LEFT' },
  NONE:  { x: 0,  y: 0,  name: 'NONE',  opp: 'NONE' }
};
const D4 = [DIRS.UP, DIRS.LEFT, DIRS.DOWN, DIRS.RIGHT];

function canMoveTo(grid, c, r, isEaten) {
  if (r < 0 || r >= ROWS) return false;
  if (c < 0 || c >= COLS) return true; // Tunnel wrap
  const t = grid[r]?.[c];
  if (t === '#') return false;
  if (t === '-' && !isEaten) return false;
  if (t === 'g' && !isEaten) return false;
  return true;
}

// ==========================================
// 3. SYNTHESIZED AUDIO ENGINE
// ==========================================
class SoundSynth {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.wakaAlt = false;
  }
  init() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }
  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }
  destroy() {
    if (this.ctx) {
      try { this.ctx.close(); } catch { /* Audio context may already be closed. */ }
      this.ctx = null;
    }
  }
  waka() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    this.wakaAlt = !this.wakaAlt;
    const sf = this.wakaAlt ? 440 : 320;
    const ef = this.wakaAlt ? 260 : 180;
    osc.frequency.setValueAtTime(sf, t);
    osc.frequency.exponentialRampToValueAtTime(ef, t + 0.08);
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.01, t + 0.08);
    osc.connect(g);
    g.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.08);
  }
  eatGhost() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.linearRampToValueAtTime(1000, t + 0.35);
    g.gain.setValueAtTime(0.2, t);
    g.gain.exponentialRampToValueAtTime(0.01, t + 0.35);
    osc.connect(g);
    g.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.35);
  }
  death() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    for (let i = 0; i < 11; i++) {
      const st = t + i * 0.1;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(500 - i * 35, st);
      osc.frequency.exponentialRampToValueAtTime(Math.max(50, 180 - i * 14), st + 0.09);
      g.gain.setValueAtTime(0.18, st);
      g.gain.exponentialRampToValueAtTime(0.01, st + 0.09);
      osc.connect(g);
      g.connect(this.ctx.destination);
      osc.start(st);
      osc.stop(st + 0.09);
    }
  }
  intro() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const notes = [
      [493.88, 0.12], [987.77, 0.12], [739.99, 0.12], [622.25, 0.12],
      [987.77, 0.06], [739.99, 0.18], [622.25, 0.24],
      [523.25, 0.12], [1046.50, 0.12], [783.99, 0.12], [659.25, 0.12],
      [1046.50, 0.06], [783.99, 0.18], [659.25, 0.24]
    ];
    let t = this.ctx.currentTime + 0.05;
    notes.forEach(([f, dur]) => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(0.15, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.connect(g);
      g.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + dur);
      t += dur;
    });
  }
}

// ==========================================
// 4. ENTITY CLASSES
// ==========================================
class Pacman {
  constructor() {
    this.reset();
  }
  reset() {
    this.x = 13 * TILE + TILE / 2;
    this.y = 23 * TILE + TILE / 2;
    this.dir = DIRS.LEFT;
    this.nextDir = DIRS.LEFT;
    this.speed = 1.9;
    this.mouth = 0.2;
    this.mouthDir = 1;
    this.alive = true;
  }
  update(grid, game) {
    if (game.state !== 'playing') return;

    if (this.nextDir.name === this.dir.opp) {
      this.dir = this.nextDir;
    }

    const curTileX = Math.floor(this.x / TILE);
    const curTileY = Math.floor(this.y / TILE);
    const cx = curTileX * TILE + TILE / 2;
    const cy = curTileY * TILE + TILE / 2;

    if (this.dir === DIRS.NONE) {
      if (this.nextDir !== DIRS.NONE && canMoveTo(grid, curTileX + this.nextDir.x, curTileY + this.nextDir.y, false)) {
        this.dir = this.nextDir;
      }
    }

    if (this.dir !== DIRS.NONE) {
      const dx = this.dir.x * this.speed;
      const dy = this.dir.y * this.speed;
      const oldX = this.x, oldY = this.y;
      const newX = oldX + dx, newY = oldY + dy;

      let crossedCenter = false;
      if (this.dir === DIRS.RIGHT && oldX <= cx && newX >= cx) crossedCenter = true;
      if (this.dir === DIRS.LEFT  && oldX >= cx && newX <= cx) crossedCenter = true;
      if (this.dir === DIRS.DOWN  && oldY <= cy && newY >= cy) crossedCenter = true;
      if (this.dir === DIRS.UP    && oldY >= cy && newY <= cy) crossedCenter = true;

      if (crossedCenter) {
        this.x = cx;
        this.y = cy;

        if (this.nextDir !== this.dir && this.nextDir !== DIRS.NONE) {
          if (canMoveTo(grid, curTileX + this.nextDir.x, curTileY + this.nextDir.y, false)) {
            this.dir = this.nextDir;
          }
        }

        if (!canMoveTo(grid, curTileX + this.dir.x, curTileY + this.dir.y, false)) {
          this.dir = DIRS.NONE;
        }

        const rem = this.speed - Math.hypot(oldX - cx, oldY - cy);
        if (rem > 0 && this.dir !== DIRS.NONE) {
          this.x += this.dir.x * rem;
          this.y += this.dir.y * rem;
        }
      } else {
        this.x = newX;
        this.y = newY;
      }

      this.mouth += 0.04 * this.mouthDir;
      if (this.mouth > 0.45) { this.mouth = 0.45; this.mouthDir = -1; }
      if (this.mouth < 0.02) { this.mouth = 0.02; this.mouthDir = 1; }
    }

    if (this.x < -TILE / 2) this.x = COLS * TILE + TILE / 2;
    else if (this.x > COLS * TILE + TILE / 2) this.x = -TILE / 2;

    // Eat pellets
    const eatTileX = Math.round((this.x - TILE / 2) / TILE);
    const eatTileY = Math.round((this.y - TILE / 2) / TILE);
    if (eatTileY >= 0 && eatTileY < ROWS && eatTileX >= 0 && eatTileX < COLS) {
      const item = grid[eatTileY][eatTileX];
      if (item === '.' || item === 'o') {
        grid[eatTileY][eatTileX] = ' ';
        game.dotsLeft--;
        game.audio.waka();

        if (item === '.') {
          game.score += 10;
        } else {
          game.score += 50;
          game.triggerFrightened();
        }

        if (game.score > game.highScore) {
          game.highScore = game.score;
          localStorage.setItem('pacman_high', String(game.highScore));
        }
        game.onHudUpdate(game.score, game.highScore, game.level, game.lives);

        if (game.dotsLeft <= 0) {
          game.state = 'win';
          game.stateTimer = 180;
        }
      }
    }
  }

  draw(ctx, state, stateTimer) {
    if (state === 'dying') {
      const prog = 1 - stateTimer / 75;
      const r = TILE / 2 - 1;
      const a = Math.PI * Math.min(prog * 1.5, 1.0);
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(Math.PI * 0.5);
      ctx.fillStyle = '#ffff00';
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(0.5, r * (1 - prog * 0.8)), a, Math.PI * 2 - a);
      ctx.lineTo(0, 0);
      ctx.fill();
      ctx.restore();
      return;
    }

    let rot = 0;
    if (this.dir === DIRS.LEFT) rot = Math.PI;
    else if (this.dir === DIRS.UP) rot = -Math.PI / 2;
    else if (this.dir === DIRS.DOWN) rot = Math.PI / 2;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(rot);
    ctx.fillStyle = '#ffff00';
    ctx.beginPath();
    ctx.arc(0, 0, TILE / 2 - 1, this.mouth * Math.PI, (2 - this.mouth) * Math.PI);
    ctx.lineTo(0, 0);
    ctx.fill();
    ctx.restore();
  }
}

class Ghost {
  constructor(name, color, sx, sy, scx, scy, inHouse, releaseDelay) {
    this.name = name;
    this.color = color;
    this.sx = sx;
    this.sy = sy;
    this.scatterTarget = { x: scx, y: scy };
    this.inHouse = inHouse;
    this.releaseDelay = releaseDelay;
    this.reset();
  }
  reset() {
    this.x = this.sx * TILE + TILE / 2;
    this.y = this.sy * TILE + TILE / 2;
    this.dir = DIRS.UP;
    this.mode = this.inHouse ? 'house' : 'scatter';
    this.speed = 1.6;
    this.bobDir = 1;
    this.anim = 0;
    this.exitStep = 0;
  }
  getTarget(pac, blinky) {
    if (this.mode === 'eaten') return { x: 13, y: 11 };
    if (this.mode === 'frightened') {
      return { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) };
    }
    if (this.mode === 'scatter') return this.scatterTarget;

    const ptx = Math.floor(pac.x / TILE);
    const pty = Math.floor(pac.y / TILE);

    switch (this.name) {
      case 'BLINKY': return { x: ptx, y: pty };
      case 'PINKY': return { x: ptx + pac.dir.x * 4, y: pty + pac.dir.y * 4 };
      case 'INKY': {
        const ax = ptx + pac.dir.x * 2;
        const ay = pty + pac.dir.y * 2;
        const bx = Math.floor(blinky.x / TILE);
        const by = Math.floor(blinky.y / TILE);
        return { x: ax + (ax - bx), y: ay + (ay - by) };
      }
      case 'CLYDE': {
        const gx = Math.floor(this.x / TILE);
        const gy = Math.floor(this.y / TILE);
        const d = Math.hypot(gx - ptx, gy - pty);
        return d > 8 ? { x: ptx, y: pty } : this.scatterTarget;
      }
      default:
        return { x: ptx, y: pty };
    }
  }
  update(grid, pac, blinky, game) {
    if (game.state !== 'playing') return;
    this.anim += 0.15;

    if (this.mode === 'house') {
      this.y += 0.4 * this.bobDir;
      const homeY = this.sy * TILE + TILE / 2;
      if (this.y > homeY + 5) this.bobDir = -1;
      if (this.y < homeY - 5) this.bobDir = 1;

      if (game.globalTimer >= this.releaseDelay) {
        this.mode = 'exiting';
        this.exitStep = 0;
      }
      return;
    }

    if (this.mode === 'exiting') {
      const doorX = 13 * TILE + TILE / 2;
      const doorY = 11 * TILE + TILE / 2;

      if (this.exitStep === 0) {
        const dx = doorX - this.x;
        if (Math.abs(dx) <= 1.5) {
          this.x = doorX;
          this.exitStep = 1;
        } else {
          this.x += Math.sign(dx) * 1.4;
        }
      } else if (this.exitStep === 1) {
        if (this.y <= doorY) {
          this.y = doorY;
          this.mode = game.frightenedTimer > 0 ? 'frightened' : 'scatter';
          this.dir = DIRS.LEFT;
        } else {
          this.y -= 1.4;
          this.dir = DIRS.UP;
        }
      }
      return;
    }

    if (this.mode === 'eaten') {
      const doorX = 13 * TILE + TILE / 2;
      const doorY = 11 * TILE + TILE / 2;
      if (Math.hypot(this.x - doorX, this.y - doorY) <= 4) {
        this.x = doorX;
        this.y = 14 * TILE + TILE / 2;
        this.mode = 'exiting';
        this.exitStep = 1;
        return;
      }
    }

    let spd = this.speed;
    const curTileX = Math.floor(this.x / TILE);
    const curTileY = Math.floor(this.y / TILE);

    if (curTileY === 14 && (curTileX <= 5 || curTileX >= 22)) spd = 0.8;
    else if (this.mode === 'frightened') spd = 0.95;
    else if (this.mode === 'eaten') spd = 3.2;

    const dx = this.dir.x * spd;
    const dy = this.dir.y * spd;
    const oldX = this.x, oldY = this.y;
    const newX = oldX + dx, newY = oldY + dy;

    const cx = curTileX * TILE + TILE / 2;
    const cy = curTileY * TILE + TILE / 2;

    let crossedCenter = false;
    if (this.dir === DIRS.RIGHT && oldX <= cx && newX >= cx) crossedCenter = true;
    if (this.dir === DIRS.LEFT  && oldX >= cx && newX <= cx) crossedCenter = true;
    if (this.dir === DIRS.DOWN  && oldY <= cy && newY >= cy) crossedCenter = true;
    if (this.dir === DIRS.UP    && oldY >= cy && newY <= cy) crossedCenter = true;

    if (crossedCenter) {
      this.x = cx;
      this.y = cy;
      const target = this.getTarget(pac, blinky);
      let bestDir = null;
      let minDistance = Infinity;

      for (const d of D4) {
        if (d.name === this.dir.opp) continue;
        const nx = curTileX + d.x;
        const ny = curTileY + d.y;

        if (canMoveTo(grid, nx, ny, this.mode === 'eaten')) {
          const distSq = (nx - target.x) ** 2 + (ny - target.y) ** 2;
          if (distSq < minDistance) {
            minDistance = distSq;
            bestDir = d;
          }
        }
      }

      if (bestDir) {
        this.dir = bestDir;
      } else {
        for (const d of D4) {
          if (canMoveTo(grid, curTileX + d.x, curTileY + d.y, this.mode === 'eaten')) {
            this.dir = d;
            break;
          }
        }
      }

      const rem = spd - Math.hypot(oldX - cx, oldY - cy);
      if (rem > 0 && this.dir !== DIRS.NONE) {
        this.x += this.dir.x * rem;
        this.y += this.dir.y * rem;
      }
    } else {
      this.x = newX;
      this.y = newY;
    }

    if (this.x < -TILE / 2) this.x = COLS * TILE + TILE / 2;
    else if (this.x > COLS * TILE + TILE / 2) this.x = -TILE / 2;
  }

  draw(ctx, frightenedTimer) {
    const r = TILE / 2 - 1;
    const x = this.x, y = this.y;
    let col = this.color;
    const isFright = this.mode === 'frightened';
    const isEyes = this.mode === 'eaten';

    if (isFright) {
      const flash = frightenedTimer < 120 && Math.floor(frightenedTimer / 10) % 2 === 0;
      col = flash ? '#ffffff' : '#2121ff';
    }

    if (!isEyes) {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(x, y - 1, r, Math.PI, 0, false);
      const by = y + r;
      ctx.lineTo(x + r, by);

      const step = Math.floor(this.anim) % 2;
      const bw = (r * 2) / 3;
      for (let i = 0; i < 3; i++) {
        const wx = x + r - bw * (i + 1);
        const wy = (i % 2 === step) ? by - 3 : by;
        ctx.lineTo(wx + bw / 2, wy);
        ctx.lineTo(wx, by);
      }
      ctx.lineTo(x - r, y - 1);
      ctx.closePath();
      ctx.fill();

      if (isFright) {
        ctx.strokeStyle = col === '#ffffff' ? '#ff0000' : '#ffb8ae';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x - 5, y + 2);
        ctx.lineTo(x - 3, y + 4);
        ctx.lineTo(x - 1, y + 2);
        ctx.lineTo(x + 1, y + 4);
        ctx.lineTo(x + 3, y + 2);
        ctx.lineTo(x + 5, y + 4);
        ctx.stroke();
      }
    }

    const ex = this.dir.x * 2.2, ey = this.dir.y * 2.2;
    if (isFright) {
      ctx.fillStyle = col === '#ffffff' ? '#ff0000' : '#ffb8ae';
      ctx.beginPath();
      ctx.arc(x - 3, y - 2, 1.4, 0, Math.PI * 2);
      ctx.arc(x + 3, y - 2, 1.4, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x - 3.5, y - 2, 3.2, 0, Math.PI * 2);
      ctx.arc(x + 3.5, y - 2, 3.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#2121ff';
      ctx.beginPath();
      ctx.arc(x - 3.5 + ex, y - 2 + ey, 1.6, 0, Math.PI * 2);
      ctx.arc(x + 3.5 + ex, y - 2 + ey, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawWallTile(ctx, grid, r, c, x, y) {
  const up = r > 0 && grid[r - 1][c] === '#';
  const dn = r < ROWS - 1 && grid[r + 1][c] === '#';
  const lt = c > 0 && grid[r][c - 1] === '#';
  const rt = c < COLS - 1 && grid[r][c + 1] === '#';

  ctx.strokeStyle = '#2121ff';
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';

  const cx = x + TILE / 2, cy = y + TILE / 2;
  ctx.beginPath();
  if (up) { ctx.moveTo(cx, cy); ctx.lineTo(cx, y); }
  if (dn) { ctx.moveTo(cx, cy); ctx.lineTo(cx, y + TILE); }
  if (lt) { ctx.moveTo(cx, cy); ctx.lineTo(x, cy); }
  if (rt) { ctx.moveTo(cx, cy); ctx.lineTo(x + TILE, cy); }
  if (!up && !dn && !lt && !rt) ctx.arc(cx, cy, 3, 0, Math.PI * 2);
  ctx.stroke();
}

// ==========================================
// 5. REACT COMPONENT
// ==========================================
export default function PacmanGame({ onComplete }) {
  const canvasRef = useRef(null);
  const audioRef = useRef(null);
  const gameRef = useRef(null);
  const rafIdRef = useRef(null);
  const completionSentRef = useRef(false);

  // React State for HUD & UI Controls
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('pacman_high') || '0', 10);
  });
  const [level, setLevel] = useState(1);
  const [lives, setLives] = useState(3);
  const [soundOn, setSoundOn] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [overlay, setOverlay] = useState({
    show: true,
    title: 'PAC-MAN',
    desc: 'Use ARROW KEYS or WASD to move. Eat all dots to clear the level. Grab a Power Pellet to turn ghosts blue and eat them for bonus points!',
    btnText: 'START GAME'
  });

  const handleHudUpdate = (newScore, newHighScore, newLevel, newLives) => {
    setScore(newScore);
    setHighScore(newHighScore);
    setLevel(newLevel);
    setLives(newLives);
  };

  const handleGameOver = useCallback((finalScore) => {
    if (!completionSentRef.current) {
      completionSentRef.current = true;
      onComplete?.({ official: true, score: Number(finalScore) || 0 });
    }
    setOverlay({
      show: true,
      title: 'GAME OVER',
      desc: 'You ran out of lives! Click below to try again.',
      btnText: 'PLAY AGAIN'
    });
  }, [onComplete]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const audio = new SoundSynth();
    audioRef.current = audio;

    // Build fresh map grid
    const createGrid = () => {
      const g = [];
      let dots = 0;
      for (let r = 0; r < ROWS; r++) {
        const row = [];
        for (let c = 0; c < COLS; c++) {
          const ch = MAP[r][c];
          row.push(ch);
          if (ch === '.' || ch === 'o') dots++;
        }
        g.push(row);
      }
      return { grid: g, totalDots: dots };
    };

    const initial = createGrid();

    const pacman = new Pacman();
    const blinky = new Ghost('BLINKY', '#ff0000', 13, 11, 25, -3, false, 0);
    const pinky  = new Ghost('PINKY',  '#ffb8ff', 13, 14, 2,  -3, true,  60);
    const inky   = new Ghost('INKY',   '#00ffff', 11, 14, 27, 34, true,  240);
    const clyde  = new Ghost('CLYDE',  '#ffb852', 15, 14, 0,  34, true,  420);
    const ghosts = [blinky, pinky, inky, clyde];

    const game = {
      grid: initial.grid,
      totalDots: initial.totalDots,
      dotsLeft: initial.totalDots,
      score: 0,
      highScore: parseInt(localStorage.getItem('pacman_high') || '0', 10),
      lives: 3,
      level: 1,
      state: 'title', // 'title', 'ready', 'playing', 'dying', 'win', 'gameover'
      stateTimer: 0,
      globalTimer: 0,
      frightenedTimer: 0,
      ghostChain: 0,
      isPaused: false,
      popups: [],
      audio,
      pacman,
      ghosts,
      blinky,
      onHudUpdate: handleHudUpdate,
      onGameOver: () => handleGameOver(game.score),
      triggerFrightened: () => {
        game.frightenedTimer = 360;
        game.ghostChain = 0;
        ghosts.forEach(g => {
          if (g.mode === 'scatter' || g.mode === 'chase') {
            g.mode = 'frightened';
            g.dir = DIRS[g.dir.opp] || g.dir;
          }
        });
      },
      checkCollisions: () => {
        if (game.state !== 'playing') return;
        ghosts.forEach(g => {
          if (g.mode === 'house' || g.mode === 'exiting' || g.mode === 'eaten') return;
          const dist = Math.hypot(pacman.x - g.x, pacman.y - g.y);
          if (dist < 10) {
            if (g.mode === 'frightened') {
              g.mode = 'eaten';
              game.ghostChain++;
              const pts = 200 * Math.pow(2, game.ghostChain - 1);
              game.score += pts;
              audio.eatGhost();
              game.popups.push({ x: g.x, y: g.y, txt: String(pts), life: 50, max: 50 });
              game.onHudUpdate(game.score, game.highScore, game.level, game.lives);
            } else {
              game.state = 'dying';
              game.stateTimer = 75;
              audio.death();
            }
          }
        });
      },
      resetRound: () => {
        pacman.reset();
        ghosts.forEach(g => g.reset());
        game.frightenedTimer = 0;
        game.globalTimer = 0;
        game.state = 'ready';
        game.stateTimer = 90;
      },
      startNewGame: () => {
        completionSentRef.current = false;
        const fresh = createGrid();
        game.grid = fresh.grid;
        game.totalDots = fresh.totalDots;
        game.dotsLeft = fresh.totalDots;
        game.score = 0;
        game.lives = 3;
        game.level = 1;
        game.resetRound();
        game.onHudUpdate(game.score, game.highScore, game.level, game.lives);
        setOverlay(prev => ({ ...prev, show: false }));
        audio.intro();
      }
    };
    gameRef.current = game;

    // Keyboard listener
    const KEY_MAP = {
      'ArrowUp': DIRS.UP, 'KeyW': DIRS.UP, 'w': DIRS.UP, 'W': DIRS.UP,
      'ArrowLeft': DIRS.LEFT, 'KeyA': DIRS.LEFT, 'a': DIRS.LEFT, 'A': DIRS.LEFT,
      'ArrowDown': DIRS.DOWN, 'KeyS': DIRS.DOWN, 's': DIRS.DOWN, 'S': DIRS.DOWN,
      'ArrowRight': DIRS.RIGHT, 'KeyD': DIRS.RIGHT, 'd': DIRS.RIGHT, 'D': DIRS.RIGHT
    };

    const handleKeyDown = (e) => {
      if (KEY_MAP[e.code] || KEY_MAP[e.key]) {
        audio.init();
        pacman.nextDir = KEY_MAP[e.code] || KEY_MAP[e.key];
        e.preventDefault();
      } else if (e.code === 'KeyP' || e.key === 'p' || e.key === 'P') {
        game.isPaused = !game.isPaused;
        setIsPaused(game.isPaused);
      }
    };
    window.addEventListener('keydown', handleKeyDown, { passive: false });

    // Touch on Canvas
    let tsX = 0, tsY = 0;
    const handleTouchStart = (e) => {
      audio.init();
      const t = e.changedTouches[0];
      tsX = t.clientX;
      tsY = t.clientY;
    };
    const handleTouchEnd = (e) => {
      const t = e.changedTouches[0];
      const dx = t.clientX - tsX, dy = t.clientY - tsY;
      if (Math.abs(dx) > Math.abs(dy)) {
        if (Math.abs(dx) > 15) pacman.nextDir = dx > 0 ? DIRS.RIGHT : DIRS.LEFT;
      } else {
        if (Math.abs(dy) > 15) pacman.nextDir = dy > 0 ? DIRS.DOWN : DIRS.UP;
      }
    };
    canvas.addEventListener('touchstart', handleTouchStart, { passive: true });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: true });

    // Render loop
    const render = () => {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw maze grid
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const t = game.grid[r][c];
          const x = c * TILE, y = r * TILE;

          if (t === '#') {
            drawWallTile(ctx, game.grid, r, c, x, y);
          } else if (t === '.') {
            ctx.fillStyle = '#ffcfb3';
            ctx.fillRect(x + TILE / 2 - 1.5, y + TILE / 2 - 1.5, 3, 3);
          } else if (t === 'o') {
            const pulse = Math.sin(Date.now() / 150) * 1.0;
            ctx.fillStyle = '#ffcfb3';
            ctx.beginPath();
            ctx.arc(x + TILE / 2, y + TILE / 2, 4.5 + pulse, 0, Math.PI * 2);
            ctx.fill();
          } else if (t === '-') {
            ctx.fillStyle = '#ffb8ff';
            ctx.fillRect(x, y + TILE / 2 - 1.5, TILE, 3);
          }
        }
      }

      // Draw entities
      if (game.state !== 'dying') {
        ghosts.forEach(g => g.draw(ctx, game.frightenedTimer));
      }
      pacman.draw(ctx, game.state, game.stateTimer);

      // Floating Score Popups
      ctx.font = '9px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      game.popups.forEach(p => {
        ctx.globalAlpha = p.life / p.max;
        ctx.fillStyle = '#00ffff';
        ctx.fillText(p.txt, p.x, p.y);
        p.y -= 0.3;
        p.life--;
      });
      game.popups = game.popups.filter(p => p.life > 0);
      ctx.globalAlpha = 1;

      // In-Game State Overlays
      if (game.state === 'ready') {
        ctx.fillStyle = '#ffff00';
        ctx.font = '12px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('READY!', canvas.width / 2, 17 * TILE + 6);
      } else if (game.state === 'win') {
        ctx.fillStyle = '#00ffff';
        ctx.font = '12px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('LEVEL CLEARED!', canvas.width / 2, 17 * TILE + 6);
      }
    };

    // Main 60 FPS Engine Loop
    const loop = () => {
      if (!game.isPaused) {
        if (game.state === 'ready') {
          game.stateTimer--;
          if (game.stateTimer <= 0) game.state = 'playing';
        } else if (game.state === 'playing') {
          game.globalTimer++;
          if (game.frightenedTimer > 0) {
            game.frightenedTimer--;
            if (game.frightenedTimer === 0) {
              ghosts.forEach(g => { if (g.mode === 'frightened') g.mode = 'scatter'; });
            }
          }
          pacman.update(game.grid, game);
          ghosts.forEach(g => g.update(game.grid, pacman, blinky, game));
          game.checkCollisions();
        } else if (game.state === 'dying') {
          game.stateTimer--;
          if (game.stateTimer <= 0) {
            game.lives--;
            game.onHudUpdate(game.score, game.highScore, game.level, game.lives);
            if (game.lives <= 0) {
              game.state = 'gameover';
              game.onGameOver();
            } else {
              game.resetRound();
            }
          }
        } else if (game.state === 'win') {
          game.stateTimer--;
          if (game.stateTimer <= 0) {
            game.level++;
            const fresh = createGrid();
            game.grid = fresh.grid;
            game.totalDots = fresh.totalDots;
            game.dotsLeft = fresh.totalDots;
            game.resetRound();
            game.onHudUpdate(game.score, game.highScore, game.level, game.lives);
          }
        }
      }

      render();
      rafIdRef.current = requestAnimationFrame(loop);
    };

    rafIdRef.current = requestAnimationFrame(loop);

    // Cleanup function
    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      window.removeEventListener('keydown', handleKeyDown);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchend', handleTouchEnd);
      audio.destroy();
    };
  }, [handleGameOver]);

  const handleStartGame = () => {
    if (gameRef.current) {
      gameRef.current.startNewGame();
    }
  };

  const handleToggleSound = () => {
    if (audioRef.current) {
      const enabled = audioRef.current.toggle();
      setSoundOn(enabled);
    }
  };

  const handleTogglePause = () => {
    if (gameRef.current) {
      gameRef.current.isPaused = !gameRef.current.isPaused;
      setIsPaused(gameRef.current.isPaused);
    }
  };

  const handleDpadDir = (dirKey) => {
    if (audioRef.current) audioRef.current.init();
    if (gameRef.current?.pacman && DIRS[dirKey]) {
      gameRef.current.pacman.nextDir = DIRS[dirKey];
    }
  };

  return (
    <div className="pacman-wrapper">
      {/* Injected Scoped CSS */}
      <style dangerouslySetInnerHTML={{ __html: PACMAN_STYLES }} />

      <div className="pacman-cabinet">
        {/* Top Arcade HUD */}
        <div className="pacman-hud">
          <div className="pacman-hud-col">
            <span className="pacman-hud-label">1UP</span>
            <span className="pacman-hud-val">{(score < 10 ? '0' : '') + score}</span>
          </div>
          <div className="pacman-hud-col" style={{ textAlign: 'center' }}>
            <span className="pacman-hud-label">HIGH SCORE</span>
            <span className="pacman-hud-val">{(highScore < 10 ? '0' : '') + highScore}</span>
          </div>
          <div className="pacman-hud-col" style={{ textAlign: 'right' }}>
            <span className="pacman-hud-label">LEVEL</span>
            <span className="pacman-hud-val">{level}</span>
          </div>
        </div>

        {/* Canvas & Overlay Container */}
        <div className="pacman-canvas-wrap">
          <canvas
            ref={canvasRef}
            id="gameCanvas"
            className="pacman-canvas"
            width="448"
            height="496"
          />

          {overlay.show && (
            <div className="pacman-overlay">
              <div className="pacman-ov-title">{overlay.title}</div>
              {overlay.desc && <div className="pacman-ov-desc">{overlay.desc}</div>}
              <button
                className="pacman-arcade-btn"
                onClick={handleStartGame}
              >
                {overlay.btnText}
              </button>
            </div>
          )}
        </div>

        {/* Bottom Lives Bar */}
        <div className="pacman-bottom-bar">
          <div className="pacman-lives-display">
            {'● '.repeat(Math.max(0, lives)).trim()}
          </div>
          <div className="pacman-hint">P TO PAUSE</div>
        </div>

        {/* Control Buttons */}
        <div className="pacman-controls-bar">
          <button className="pacman-mini-btn" onClick={handleToggleSound}>
            SOUND: {soundOn ? 'ON' : 'OFF'}
          </button>
          <button className="pacman-mini-btn" onClick={handleTogglePause}>
            {isPaused ? 'RESUME' : 'PAUSE'}
          </button>
          <button className="pacman-mini-btn" onClick={handleStartGame}>
            RESTART
          </button>
        </div>

        {/* Touch D-Pad for Mobile & Tablets */}
        <div className="pacman-dpad">
          <button
            className="pacman-dbtn pacman-d-up"
            onTouchStart={(e) => { e.preventDefault(); handleDpadDir('UP'); }}
            onMouseDown={() => handleDpadDir('UP')}
          >
            ▲
          </button>
          <button
            className="pacman-dbtn pacman-d-left"
            onTouchStart={(e) => { e.preventDefault(); handleDpadDir('LEFT'); }}
            onMouseDown={() => handleDpadDir('LEFT')}
          >
            ◀
          </button>
          <button
            className="pacman-dbtn pacman-d-right"
            onTouchStart={(e) => { e.preventDefault(); handleDpadDir('RIGHT'); }}
            onMouseDown={() => handleDpadDir('RIGHT')}
          >
            ▶
          </button>
          <button
            className="pacman-dbtn pacman-d-down"
            onTouchStart={(e) => { e.preventDefault(); handleDpadDir('DOWN'); }}
            onMouseDown={() => handleDpadDir('DOWN')}
          >
            ▼
          </button>
        </div>
      </div>
    </div>
  );
}
