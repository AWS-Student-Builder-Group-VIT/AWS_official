import { useEffect, useRef, useState } from 'react';

// Game Constants
const GRAVITY = 0.5;
const FRICTION = 0.72;
const JUMP_POWER = -12.0;
const MOVE_SPEED = 3.6;
const MAX_ATTEMPTS = 5;
const ATTEMPT_TIME_LIMIT = 45.0;

// Level Layout
const LEVEL = [
  // Outer Walls & Floor
  { x: 0, y: 560, w: 800, h: 40, type: 'wall' },
  { x: 0, y: 0, w: 40, h: 600, type: 'wall' },
  { x: 760, y: 0, w: 40, h: 600, type: 'wall' },
  
  // Platforms (AWS styled, metallic gray)
  { x: 40, y: 470, w: 180, h: 20, type: 'wall' },
  { x: 580, y: 470, w: 180, h: 20, type: 'wall' },
  
  { x: 280, y: 380, w: 240, h: 20, type: 'wall' },
  
  { x: 40, y: 290, w: 180, h: 20, type: 'wall' },
  { x: 550, y: 290, w: 210, h: 20, type: 'wall' },
  
  { x: 280, y: 200, w: 240, h: 20, type: 'wall' },

  // Hazards (Liquid pools)
  { x: 250, y: 550, w: 150, h: 20, type: 'lava' },  // Compute Lava (Red-orange, hazardous to Teal)
  { x: 400, y: 550, w: 150, h: 20, type: 'water' }, // Storage Fluid (Teal, hazardous to Orange)
  { x: 375, y: 350, w: 50, h: 10, type: 'acid' },   // Malware Sludge (Green, hazardous to both)

  // Exits (Gateway Portals)
  { x: 600, y: 230, w: 40, h: 60, type: 'fireExit' },
  { x: 670, y: 230, w: 40, h: 60, type: 'waterExit' }
];

const INITIAL_GEMS = [
  { x: 130, y: 420, w: 16, h: 22, type: 'orange', collected: false },
  { x: 670, y: 420, w: 16, h: 22, type: 'teal', collected: false },
  { x: 320, y: 330, w: 16, h: 22, type: 'orange', collected: false },
  { x: 460, y: 330, w: 16, h: 22, type: 'teal', collected: false },
  { x: 120, y: 240, w: 16, h: 22, type: 'orange', collected: false },
  { x: 400, y: 150, w: 16, h: 22, type: 'teal', collected: false },
  { x: 475, y: 490, w: 16, h: 22, type: 'orange', collected: false }, // above water hazard
  { x: 325, y: 490, w: 16, h: 22, type: 'teal', collected: false },   // above lava hazard
  { x: 200, y: 520, w: 16, h: 22, type: 'orange', collected: false },
  { x: 600, y: 520, w: 16, h: 22, type: 'teal', collected: false }
];

class Player {
  constructor(x, y, color, element, controls) {
    this.x = x;
    this.y = y;
    this.w = 26;
    this.h = 36;
    this.vx = 0;
    this.vy = 0;
    this.color = color;
    this.element = element; // 'fire' or 'water'
    this.controls = controls || {};
    this.grounded = false;
    this.atExit = false;
    this.isDead = false;
  }
}

class Particle {
  constructor(x, y, vx, vy, color, size, maxLife) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.color = color;
    this.size = size;
    this.maxLife = maxLife;
    this.life = maxLife;
  }
  
  update(dt) {
    this.x += this.vx;
    this.y += this.vy;
    this.life -= dt * 1000;
  }
  
  draw(ctx) {
    let alpha = Math.max(0, this.life / this.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = this.size * 2;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// Drawing helper functions outside component for performance
function drawPlatform(ctx, block) {
  ctx.save();
  ctx.fillStyle = "#1e293b";
  ctx.fillRect(block.x, block.y, block.w, block.h);
  
  ctx.fillStyle = "#475569";
  ctx.fillRect(block.x, block.y, block.w, 3);
  
  ctx.strokeStyle = "#334155";
  ctx.lineWidth = 1;
  ctx.strokeRect(block.x, block.y, block.w, block.h);
  ctx.restore();
}

function drawPortal(ctx, block, color, isActive) {
  let cx = block.x + block.w / 2;
  let cy = block.y + block.h / 2;
  let rx = block.w / 2;
  let ry = block.h / 2;
  
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = isActive ? 18 : 6;
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.stroke();
  
  let angle = Date.now() * 0.003;
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = isActive ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.2)";
  
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx * (0.85 - i * 0.25), ry * (0.85 - i * 0.25), angle * (i % 2 === 0 ? 1.2 : -0.8), 0, Math.PI * 2);
    ctx.stroke();
  }
  
  ctx.fillStyle = isActive ? color : "rgba(255,255,255,0.02)";
  ctx.globalAlpha = isActive ? 0.35 : 0.4;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx * 0.6, ry * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawFluid(ctx, block, color, glowColor) {
  ctx.save();
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = 12;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(block.x, block.y + block.h);
  
  let waveSpeed = Date.now() * 0.005;
  for (let px = block.x; px <= block.x + block.w; px += 4) {
    let py = block.y + Math.sin(px * 0.05 + waveSpeed) * 3 + 2;
    ctx.lineTo(px, py);
  }
  ctx.lineTo(block.x + block.w, block.y + block.h);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawFlame(ctx, x, y, w, h, scale, particles) {
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.scale(scale, scale);
  
  let t = Date.now() * 0.015;
  
  let layers = [
    { color: "rgba(180, 40, 0, 0.7)", wMult: 1.15, hMult: 1.2, offset: 0 },
    { color: "rgba(255, 90, 0, 0.9)", wMult: 0.95, hMult: 1.0, offset: 1.5 },
    { color: "rgba(255, 180, 0, 0.95)", wMult: 0.75, hMult: 0.8, offset: 3 },
    { color: "rgba(255, 255, 200, 1)", wMult: 0.45, hMult: 0.5, offset: 4.5 }
  ];
  
  layers.forEach(layer => {
    let flicker = Math.sin(t + layer.offset) * 0.07;
    let fh = h * (layer.hMult + flicker);
    let fw = w * layer.wMult;
    
    ctx.fillStyle = layer.color;
    ctx.shadowColor = "#ff5500";
    ctx.shadowBlur = layer.offset === 0 ? 15 : 0;
    
    ctx.beginPath();
    ctx.moveTo(0, -fh/2);
    ctx.bezierCurveTo(fw/2, -fh/4, fw/2, fh/2, 0, fh/2);
    ctx.bezierCurveTo(-fw/2, fh/2, -fw/2, -fh/4, 0, -fh/2);
    ctx.closePath();
    ctx.fill();
  });
  
  ctx.fillStyle = "#1e293b";
  ctx.beginPath();
  ctx.arc(-4, 2, 2.5, 0, Math.PI*2);
  ctx.arc(4, 2, 2.5, 0, Math.PI*2);
  ctx.fill();
  
  ctx.fillStyle = "#ffd700";
  ctx.beginPath();
  ctx.arc(-4, 2, 0.8, 0, Math.PI*2);
  ctx.arc(4, 2, 0.8, 0, Math.PI*2);
  ctx.fill();
  
  ctx.restore();
  
  if (Math.random() < 0.15) {
    particles.push(new Particle(
      x + w/2 + (Math.random()-0.5)*w, 
      y + Math.random()*h/2, 
      (Math.random()-0.5)*1, -Math.random()*1.5 - 0.5, 
      "rgba(255, 180, 0, 0.7)", Math.random()*2 + 1, 600
    ));
  }
}

function drawDroplet(ctx, x, y, w, h, scale, particles) {
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.scale(scale, scale);
  
  ctx.beginPath();
  ctx.moveTo(0, -h/2);
  ctx.bezierCurveTo(w/2, -h/4, w/2, h/2, 0, h/2);
  ctx.bezierCurveTo(-w/2, h/2, -w/2, -h/4, 0, -h/2);
  ctx.closePath();
  
  let grad = ctx.createRadialGradient(-w/6, -h/6, 2, 0, 0, h/2);
  grad.addColorStop(0, "#73e5ff");
  grad.addColorStop(0.3, "#00a1c9");
  grad.addColorStop(1, "#004758");
  ctx.fillStyle = grad;
  ctx.shadowColor = "#00e5ff";
  ctx.shadowBlur = 12;
  ctx.fill();
  ctx.shadowBlur = 0;
  
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, -h/2);
  ctx.bezierCurveTo(w/2, -h/4, w/2, h/2, 0, h/2);
  ctx.bezierCurveTo(-w/2, h/2, -w/2, -h/4, 0, -h/2);
  ctx.closePath();
  ctx.clip();
  
  ctx.strokeStyle = "rgba(115, 229, 255, 0.4)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(w/4, h/4, w/2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  
  ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
  ctx.beginPath();
  ctx.arc(-4, -6, 2.5, 0, Math.PI*2);
  ctx.fill();
  
  ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
  ctx.beginPath();
  ctx.arc(-6, -2, 1.2, 0, Math.PI*2);
  ctx.fill();
  
  ctx.fillStyle = "#1e293b";
  ctx.beginPath();
  ctx.arc(-4, 3, 2.5, 0, Math.PI*2);
  ctx.arc(4, 3, 2.5, 0, Math.PI*2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(-3.5, 2.5, 0.7, 0, Math.PI*2);
  ctx.arc(4.5, 2.5, 0.7, 0, Math.PI*2);
  ctx.fill();
  
  ctx.restore();
  
  if (Math.random() < 0.1) {
    particles.push(new Particle(
      x + w/2 + (Math.random()-0.5)*w, 
      y + h - Math.random()*10, 
      (Math.random()-0.5)*0.5, -Math.random()*0.8 - 0.2, 
      "rgba(115, 229, 255, 0.5)", Math.random()*1.5 + 0.8, 500
    ));
  }
}

// Audio Synthesizer Hook
const useAudio = () => {
  const audioCtxRef = useRef(null);

  const initAudio = () => {
    if (!audioCtxRef.current) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtxRef.current = new AudioContextClass();
      }
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  };

  const playSound = (freqs, durations, type = 'sine', gainSequence = [1, 0]) => {
    try {
      initAudio();
      const ctx = audioCtxRef.current;
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = type;
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      const now = ctx.currentTime;

      osc.frequency.setValueAtTime(freqs[0], now);
      for (let i = 1; i < freqs.length; i++) {
        osc.frequency.exponentialRampToValueAtTime(freqs[i], now + durations[i - 1]);
      }

      gainNode.gain.setValueAtTime(gainSequence[0] * 0.1, now);
      let totalDur = 0;
      for (let i = 1; i < gainSequence.length; i++) {
        totalDur += durations[i - 1] || 0.1;
        gainNode.gain.exponentialRampToValueAtTime(gainSequence[i] * 0.1, now + totalDur);
      }

      osc.start(now);
      osc.stop(now + totalDur + 0.1);
    } catch (e) {
      console.error('Audio error:', e);
    }
  };

  const playJumpSound = () => {
    playSound([150, 480], [0.15], 'triangle', [1, 0.01]);
  };

  const playCollectSound = () => {
    try {
      initAudio();
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      const now = ctx.currentTime;

      const note1 = ctx.createOscillator();
      const note2 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      const gain2 = ctx.createGain();

      note1.type = 'sine';
      note2.type = 'sine';

      note1.connect(gain1);
      gain1.connect(ctx.destination);
      note2.connect(gain2);
      gain2.connect(ctx.destination);

      gain1.gain.setValueAtTime(0.04, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      note1.frequency.setValueAtTime(523.25, now); // C5
      note1.start(now);
      note1.stop(now + 0.12);

      gain2.gain.setValueAtTime(0.04, now + 0.06);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      note2.frequency.setValueAtTime(659.25, now + 0.06); // E5
      note2.start(now + 0.06);
      note2.stop(now + 0.22);
    } catch (e) {
      console.error(e);
    }
  };

  const playDeathSound = () => {
    playSound([250, 40], [0.4], 'sawtooth', [1.2, 0.01]);
  };

  const playWinSound = () => {
    try {
      initAudio();
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      const now = ctx.currentTime;
      const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.04, now + i * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.35);
        osc.start(now + i * 0.07);
        osc.stop(now + i * 0.07 + 0.4);
      });
    } catch (e) {
      console.error(e);
    }
  };

  return { initAudio, playJumpSound, playCollectSound, playDeathSound, playWinSound };
};

// Main custom game engine hook
export default function usewaterGirlFireBoy() {
  const canvasRef = useRef(null);
  const { initAudio, playJumpSound, playCollectSound, playDeathSound, playWinSound } = useAudio();

  // React State for Telemetry HUD & Overlays
  const [sessionState, setSessionState] = useState("START"); // START, PLAYING, ATTEMPT_END, SESSION_END
  const [gameState, setGameState] = useState("playing"); // playing, dying, won, lost
  const [currentAttempt, setCurrentAttempt] = useState(1);
  const [liveScore, setLiveScore] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(45);
  const [attemptScores, setAttemptScores] = useState([]);
  const [bestScore, setBestScore] = useState(0);
  const [pointsAwarded, setPointsAwarded] = useState("0.0");
  const [attemptDetails, setAttemptDetails] = useState(null);

  // Mutable Game Loop Refs to prevent re-render lags
  const sessionStateRef = useRef("START");
  const gameStateRef = useRef("playing");
  const currentAttemptRef = useRef(1);
  const attemptTimerRef = useRef(45.0);
  const currentScoreRef = useRef(0);
  const attemptScoresRef = useRef([]);

  const fireboyRef = useRef(null);
  const watergirlRef = useRef(null);
  const gemsRef = useRef([]);
  const particlesRef = useRef([]);
  const keysRef = useRef({});
  const requestRef = useRef(null);
  const lastTimeRef = useRef(0);
  const timeRemainingRef = useRef(45);

  // Sync ref with state
  useEffect(() => {
    sessionStateRef.current = sessionState;
  }, [sessionState]);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // Handle Event Listeners for controls Snappy input
  useEffect(() => {
    const handleKeyDown = (e) => {
      initAudio();
      if (e.code === "Space") {
        e.preventDefault();
        if (sessionStateRef.current === "START") {
          startSession();
        } else if (sessionStateRef.current === "ATTEMPT_END") {
          nextAttempt();
        } else if (sessionStateRef.current === "SESSION_END") {
          restartSession();
        }
      }
      keysRef.current[e.code] = true;
    };

    const handleKeyUp = (e) => {
      keysRef.current[e.code] = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // Particle Generation triggers
  const spawnCollectBurst = (x, y, color) => {
    for (let i = 0; i < 12; i++) {
      let angle = Math.random() * Math.PI * 2;
      let speed = Math.random() * 2 + 1;
      particlesRef.current.push(new Particle(
        x, y, 
        Math.cos(angle)*speed, Math.sin(angle)*speed, 
        color, Math.random()*3 + 2, 600
      ));
    }
  };

  const spawnDeathBurst = (x, y, color) => {
    for (let i = 0; i < 30; i++) {
      let angle = Math.random() * Math.PI * 2;
      let speed = Math.random() * 4 + 1.5;
      particlesRef.current.push(new Particle(
        x, y, 
        Math.cos(angle)*speed, Math.sin(angle)*speed, 
        color, Math.random()*4 + 3, 1000
      ));
    }
  };

  const spawnFootprintParticles = (player) => {
    if (Math.abs(player.vx) > 0.5 && player.grounded && Math.random() < 0.25) {
      let col = player.element === 'fire' ? 'rgba(255, 153, 0, 0.4)' : 'rgba(0, 161, 201, 0.4)';
      particlesRef.current.push(new Particle(
        player.x + player.w/2 + (Math.random()-0.5)*10, 
        player.y + player.h - 2, 
        (Math.random()-0.5)*1.5, -Math.random()*1, 
        col, Math.random()*2 + 1, 400
      ));
    }
  };

  const checkCollision = (rect1, rect2) => {
    return (
      rect1.x < rect2.x + rect2.w &&
      rect1.x + rect1.w > rect2.x &&
      rect1.y < rect2.y + rect2.h &&
      rect1.y + rect1.h > rect2.y
    );
  };

  const updatePlayer = (player) => {
    if (gameStateRef.current !== "playing") return;

    // Snappy Horizontal Movement
    if (keysRef.current[player.controls.left]) {
      player.vx = -MOVE_SPEED;
    } else if (keysRef.current[player.controls.right]) {
      player.vx = MOVE_SPEED;
    } else {
      player.vx *= FRICTION;
    }

    // Snappy Jump
    if (keysRef.current[player.controls.jump] && player.grounded) {
      player.vy = JUMP_POWER;
      player.grounded = false;
      playJumpSound();
    }

    // Apply gravity
    player.vy += GRAVITY;

    // Move X and wall collision
    player.x += player.vx;
    for (let block of LEVEL) {
      if (block.type === 'wall' && checkCollision(player, block)) {
        if (player.vx > 0) player.x = block.x - player.w;
        if (player.vx < 0) player.x = block.x + block.w;
        player.vx = 0;
      }
    }

    // Move Y and wall collision
    player.y += player.vy;
    player.grounded = false;
    player.atExit = false;

    for (let block of LEVEL) {
      if (checkCollision(player, block)) {
        if (block.type === 'wall') {
          if (player.vy > 0) { // Landing on top
            player.y = block.y - player.h;
            player.vy = 0;
            player.grounded = true;
          } else if (player.vy < 0) { // Ceiling hit
            player.y = block.y + block.h;
            player.vy = 0;
          }
        }
        
        // Liquid element hazards
        if (block.type === 'lava' && player.element !== 'fire') {
          killPlayer(player, "Storage Node melted in thermal lava!");
        }
        if (block.type === 'water' && player.element !== 'water') {
          killPlayer(player, "Compute Core short-circuited in cooling fluid!");
        }
        if (block.type === 'acid') {
          killPlayer(player, "Security breach: Malware payload detected!");
        }

        // Exits portals overlap
        if (block.type === 'fireExit' && player.element === 'fire') player.atExit = true;
        if (block.type === 'waterExit' && player.element === 'water') player.atExit = true;
      }
    }

    spawnFootprintParticles(player);
  };

  const killPlayer = (player, cause) => {
    if (gameStateRef.current !== "playing") return;
    gameStateRef.current = "dying";
    setGameState("dying");
    player.isDead = true;

    spawnDeathBurst(player.x + player.w / 2, player.y + player.h / 2, player.element === 'fire' ? '#ff9900' : '#00a1c9');
    playDeathSound();

    setTimeout(() => {
      failAttempt(cause);
    }, 1200);
  };

  const failAttempt = (cause) => {
    gameStateRef.current = "lost";
    setGameState("lost");
    const gemsCollected = gemsRef.current.filter(g => g.collected).length;
    const totalAttemptScore = currentScoreRef.current;

    const newRecord = {
      attempt: currentAttemptRef.current,
      score: totalAttemptScore,
      success: false,
      gems: gemsCollected,
      timeBonus: 0,
      cause: cause
    };

    const updated = [...attemptScoresRef.current, newRecord];
    attemptScoresRef.current = updated;
    setAttemptScores(updated);

    sessionStateRef.current = "ATTEMPT_END";
    setSessionState("ATTEMPT_END");
    setAttemptDetails({
      success: false,
      titleMessage: `Run ${currentAttemptRef.current} Concluded`,
      gemsCollected,
      totalScore: totalAttemptScore,
      timeBonus: 0,
      cause
    });
  };

  const winAttempt = () => {
    gameStateRef.current = "won";
    setGameState("won");
    const gemsCollected = gemsRef.current.filter(g => g.collected).length;
    const timeBonus = Math.floor(attemptTimerRef.current) * 10;
    const totalAttemptScore = currentScoreRef.current + timeBonus;

    const newRecord = {
      attempt: currentAttemptRef.current,
      score: totalAttemptScore,
      success: true,
      gems: gemsCollected,
      timeBonus: timeBonus
    };

    const updated = [...attemptScoresRef.current, newRecord];
    attemptScoresRef.current = updated;
    setAttemptScores(updated);

    playWinSound();

    sessionStateRef.current = "ATTEMPT_END";
    setSessionState("ATTEMPT_END");
    setAttemptDetails({
      success: true,
      titleMessage: `Run ${currentAttemptRef.current} Concluded`,
      gemsCollected,
      totalScore: totalAttemptScore,
      timeBonus,
      cause: "Gateway Synced Successfully!"
    });
  };

  const checkGems = () => {
    for (let gem of gemsRef.current) {
      if (gem.collected) continue;

      if (gem.type === 'orange' && checkCollision(fireboyRef.current, gem)) {
        gem.collected = true;
        currentScoreRef.current += 100;
        setLiveScore(currentScoreRef.current);
        spawnCollectBurst(gem.x + gem.w / 2, gem.y + gem.h / 2, '#ff9900');
        playCollectSound();
      } else if (gem.type === 'teal' && checkCollision(watergirlRef.current, gem)) {
        gem.collected = true;
        currentScoreRef.current += 100;
        setLiveScore(currentScoreRef.current);
        spawnCollectBurst(gem.x + gem.w / 2, gem.y + gem.h / 2, '#00a1c9');
        playCollectSound();
      }
    }
  };

  // --- CORE GAME ENGINE UPDATE & REDRAW LOOPS ---
  const updateGame = (dt) => {
    // Update particles in all overlay states
    const particles = particlesRef.current;
    for (let i = particles.length - 1; i >= 0; i--) {
      particles[i].update(dt);
      if (particles[i].life <= 0) {
        particles.splice(i, 1);
      }
    }

    if (sessionStateRef.current === "PLAYING") {
      if (gameStateRef.current === "playing") {
        attemptTimerRef.current -= dt;
        if (attemptTimerRef.current <= 0) {
          attemptTimerRef.current = 0;
          playDeathSound();
          failAttempt("Time Expired!");
        } else {
          const ceilTime = Math.ceil(attemptTimerRef.current);
          if (ceilTime !== timeRemainingRef.current) {
            timeRemainingRef.current = ceilTime;
            setTimeRemaining(ceilTime);
          }
        }

        if (fireboyRef.current) updatePlayer(fireboyRef.current);
        if (watergirlRef.current) updatePlayer(watergirlRef.current);
        checkGems();

        if (fireboyRef.current?.atExit && watergirlRef.current?.atExit) {
          winAttempt();
        }
      }
    }
  };

  const drawGame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Draw grid technology background
    let bgGrad = ctx.createRadialGradient(400, 300, 40, 400, 300, 500);
    bgGrad.addColorStop(0, "#131924");
    bgGrad.addColorStop(1, "#0a0c12");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.strokeStyle = "rgba(255, 255, 255, 0.015)";
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Draw Platforms, Hazards & Portals
    for (let block of LEVEL) {
      if (block.type === 'wall') {
        drawPlatform(ctx, block);
      } else if (block.type === 'lava') {
        drawFluid(ctx, block, "rgba(255, 85, 0, 0.85)", "#ff5500");
      } else if (block.type === 'water') {
        drawFluid(ctx, block, "rgba(0, 161, 201, 0.85)", "#00a1c9");
      } else if (block.type === 'acid') {
        drawFluid(ctx, block, "rgba(16, 185, 129, 0.85)", "#10b981");
      } else if (block.type === 'fireExit') {
        drawPortal(ctx, block, '#ff9900', fireboyRef.current?.atExit);
      } else if (block.type === 'waterExit') {
        drawPortal(ctx, block, '#00a1c9', watergirlRef.current?.atExit);
      }
    }

    // Draw Collectible Credits (Gems)
    let gemRotation = Date.now() * 0.003;
    for (let gem of gemsRef.current) {
      if (gem.collected) continue;
      
      ctx.save();
      let bobOffset = Math.sin(Date.now() * 0.004 + gem.x) * 4;
      ctx.translate(gem.x + gem.w/2, gem.y + gem.h/2 + bobOffset);
      ctx.rotate(gemRotation);
      
      let gemColor = gem.type === 'orange' ? '#ff9900' : '#00a1c9';
      ctx.fillStyle = gemColor;
      ctx.shadowColor = gemColor;
      ctx.shadowBlur = 10;
      
      ctx.beginPath();
      ctx.moveTo(0, -gem.h/2);
      ctx.lineTo(gem.w/2, 0);
      ctx.lineTo(0, gem.h/2);
      ctx.lineTo(-gem.w/2, 0);
      ctx.closePath();
      ctx.fill();
      
      ctx.strokeStyle = "rgba(255,255,255,0.4)";
      ctx.lineWidth = 1;
      ctx.stroke();
      
      ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.moveTo(0, -gem.h/4);
      ctx.lineTo(gem.w/4, 0);
      ctx.lineTo(0, gem.h/4);
      ctx.lineTo(-gem.w/4, 0);
      ctx.closePath();
      ctx.fill();
      
      ctx.restore();
    }

    // Draw Volumetric Element Characters
    if (sessionStateRef.current === "PLAYING" || sessionStateRef.current === "START") {
      if (fireboyRef.current && !fireboyRef.current.isDead) {
        let breathingScale = 1.0 + Math.sin(Date.now() * 0.008) * 0.04;
        drawFlame(ctx, fireboyRef.current.x, fireboyRef.current.y, fireboyRef.current.w, fireboyRef.current.h, breathingScale, particlesRef.current);
      }
      
      if (watergirlRef.current && !watergirlRef.current.isDead) {
        let breathingScale = 1.0 + Math.sin(Date.now() * 0.008 + Math.PI) * 0.04;
        drawDroplet(ctx, watergirlRef.current.x, watergirlRef.current.y, watergirlRef.current.w, watergirlRef.current.h, breathingScale, particlesRef.current);
      }
    }

    // Draw active particle systems
    for (let particle of particlesRef.current) {
      particle.draw(ctx);
    }
  };

  const gameLoop = (time) => {
    if (lastTimeRef.current === 0) lastTimeRef.current = time;
    let dt = (time - lastTimeRef.current) / 1000;
    if (dt > 0.1) dt = 0.1;
    lastTimeRef.current = time;

    updateGame(dt);
    drawGame();

    requestRef.current = requestAnimationFrame(gameLoop);
  };

  // Mount/Unmount Game Loop
  useEffect(() => {
    fireboyRef.current = new Player(100, 500, '#ff9900', 'fire');
    watergirlRef.current = new Player(680, 500, '#00a1c9', 'water');
    gemsRef.current = INITIAL_GEMS.map(g => ({ ...g }));

    requestRef.current = requestAnimationFrame(gameLoop);
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, []);

  // Action methods exposed to UI
  const startSession = () => {
    initAudio();
    currentAttemptRef.current = 1;
    setCurrentAttempt(1);
    attemptScoresRef.current = [];
    setAttemptScores([]);
    sessionStateRef.current = "PLAYING";
    setSessionState("PLAYING");
    initAttempt();
  };

  const initAttempt = () => {
    gameStateRef.current = "playing";
    setGameState("playing");
    attemptTimerRef.current = ATTEMPT_TIME_LIMIT;
    setTimeRemaining(ATTEMPT_TIME_LIMIT);
    timeRemainingRef.current = ATTEMPT_TIME_LIMIT;
    currentScoreRef.current = 0;
    setLiveScore(0);
    setAttemptDetails(null);

    keysRef.current = {};
    fireboyRef.current = new Player(100, 500, '#ff9900', 'fire', { left: 'ArrowLeft', right: 'ArrowRight', jump: 'ArrowUp' });
    watergirlRef.current = new Player(680, 500, '#00a1c9', 'water', { left: 'KeyA', right: 'KeyD', jump: 'KeyW' });
    
    gemsRef.current = INITIAL_GEMS.map(g => ({ ...g }));
    particlesRef.current = [];
    lastTimeRef.current = 0;
  };

  const nextAttempt = () => {
    initAudio();
    if (currentAttemptRef.current < MAX_ATTEMPTS) {
      currentAttemptRef.current += 1;
      setCurrentAttempt(currentAttemptRef.current);
      sessionStateRef.current = "PLAYING";
      setSessionState("PLAYING");
      initAttempt();
    } else {
      showResultsOverlay();
    }
  };

  const showResultsOverlay = () => {
    sessionStateRef.current = "SESSION_END";
    setSessionState("SESSION_END");

    let highest = 0;
    attemptScoresRef.current.forEach(a => {
      if (a.score > highest) highest = a.score;
    });
    setBestScore(highest);
    setPointsAwarded((highest / 100).toFixed(1));
  };

  const restartSession = () => {
    initAudio();
    startSession();
  };

  return {
    canvasRef,
    sessionState,
    gameState,
    currentAttempt,
    maxAttempts: MAX_ATTEMPTS,
    liveScore,
    timeRemaining,
    attemptScores,
    bestScore,
    pointsAwarded,
    attemptDetails,
    startSession,
    nextAttempt,
    restartSession
  };
}