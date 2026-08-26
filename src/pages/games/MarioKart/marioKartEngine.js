const WIDTH = 800;
const HEIGHT = 600;
const LANES = [265, 400, 535];

export function createMarioKartEngine(canvas, callbacks = {}) {
  const ctx = canvas.getContext('2d');
  let frame = 0;
  let running = false;
  let destroyed = false;
  let muted = false;
  let last = performance.now();
  let timer = 30;
  let lane = 1;
  let targetLane = 1;
  let score = 0;
  let coins = 0;
  let speed = 260;
  let spawnClock = 0;
  let objects = [];
  let particles = [];
  let audio;

  canvas.width = WIDTH;
  canvas.height = HEIGHT;

  const sound = (frequency, duration = 0.08, type = 'square') => {
    if (muted || destroyed) return;
    try {
      audio ??= new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.type = type;
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.08, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
      oscillator.connect(gain).connect(audio.destination);
      oscillator.start();
      oscillator.stop(audio.currentTime + duration);
    } catch { /* audio is optional */ }
  };

  const burst = (x, y, color) => {
    for (let i = 0; i < 12; i += 1) particles.push({ x, y, vx: (Math.random() - .5) * 180, vy: (Math.random() - .5) * 180, life: .55, color });
  };

  const emit = () => callbacks.onUpdate?.({ timer, score: Math.round(score), coins, speed: Math.round(speed), lane: ['LEFT', 'CENTER', 'RIGHT'][targetLane] });

  const finish = (success) => {
    if (!running) return;
    running = false;
    sound(success ? 880 : 95, .3, success ? 'sine' : 'sawtooth');
    callbacks.onFinish?.({ score: Math.round(score), coins, success });
  };

  const spawn = () => {
    const objectLane = Math.floor(Math.random() * 3);
    const coin = Math.random() < .58;
    objects.push({ lane: objectLane, y: -45, type: coin ? 'coin' : 'firewall', spin: 0 });
  };

  const drawTrack = (travel) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    gradient.addColorStop(0, '#071018'); gradient.addColorStop(1, '#111a21');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = '#1f2933'; ctx.beginPath(); ctx.moveTo(205, HEIGHT); ctx.lineTo(325, 0); ctx.lineTo(475, 0); ctx.lineTo(595, HEIGHT); ctx.fill();
    ctx.strokeStyle = '#ff990055'; ctx.lineWidth = 3;
    for (const x of [330, 470]) { ctx.setLineDash([24, 24]); ctx.lineDashOffset = travel; ctx.beginPath(); ctx.moveTo(x, HEIGHT); ctx.lineTo(380 + (x - 400) * .3, 0); ctx.stroke(); }
    ctx.setLineDash([]);
    for (let y = (travel * 2) % 90; y < HEIGHT; y += 90) { ctx.fillStyle = '#ff990022'; ctx.fillRect(205, y, 390, 3); }
  };

  const drawPod = (x) => {
    ctx.save(); ctx.translate(x, 500);
    ctx.shadowBlur = 24; ctx.shadowColor = '#ff9900'; ctx.fillStyle = '#ff9900';
    ctx.beginPath(); ctx.roundRect(-38, -30, 76, 62, 15); ctx.fill();
    ctx.shadowBlur = 0; ctx.fillStyle = '#111820'; ctx.fillRect(-26, -17, 52, 22);
    ctx.fillStyle = '#f8fafc'; ctx.font = 'bold 13px monospace'; ctx.textAlign = 'center'; ctx.fillText('EC2', 0, -2);
    ctx.fillStyle = '#04beff'; ctx.fillRect(-31, 24, 14, 7); ctx.fillRect(17, 24, 14, 7); ctx.restore();
  };

  const loop = (now) => {
    if (destroyed) return;
    const dt = Math.min(.04, (now - last) / 1000); last = now;
    drawTrack(-now * .22);
    if (running) {
      timer = Math.max(0, timer - dt); speed = Math.min(520, speed + dt * 3.5); score += dt * speed * .11; spawnClock += dt;
      if (spawnClock > Math.max(.36, .82 - speed / 1300)) { spawnClock = 0; spawn(); }
      lane += (targetLane - lane) * Math.min(1, dt * 13);
      const podX = LANES[0] + lane * (LANES[1] - LANES[0]);
      objects.forEach((object) => { object.y += (speed + 120) * dt; object.spin += dt * 6; });
      for (let i = objects.length - 1; i >= 0; i -= 1) {
        const object = objects[i];
        if (object.y > 455 && object.y < 550 && Math.abs(LANES[object.lane] - podX) < 58) {
          objects.splice(i, 1);
          if (object.type === 'firewall') { burst(podX, 500, '#ff3838'); finish(false); }
          else { coins += 1; score += 125; burst(podX, 490, '#ff9900'); sound(720 + coins * 12); }
        } else if (object.y > HEIGHT + 50) objects.splice(i, 1);
      }
      if (timer <= 0) finish(true);
      emit();
    }
    for (const object of objects) {
      const x = LANES[object.lane];
      if (object.type === 'coin') { ctx.save(); ctx.translate(x, object.y); ctx.rotate(object.spin); ctx.fillStyle = '#ffb31a'; ctx.shadowBlur = 18; ctx.shadowColor = '#ff9900'; ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#111'; ctx.font = 'bold 16px monospace'; ctx.textAlign = 'center'; ctx.fillText('S3', 0, 6); ctx.restore(); }
      else { ctx.fillStyle = '#cf2f2f'; ctx.shadowBlur = 14; ctx.shadowColor = '#ff3838'; ctx.fillRect(x - 48, object.y - 20, 96, 40); ctx.shadowBlur = 0; ctx.fillStyle = '#fff'; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center'; ctx.fillText('FIREWALL', x, object.y + 4); }
    }
    particles = particles.filter((particle) => { particle.x += particle.vx * dt; particle.y += particle.vy * dt; particle.life -= dt; ctx.globalAlpha = Math.max(0, particle.life * 2); ctx.fillStyle = particle.color; ctx.fillRect(particle.x, particle.y, 5, 5); return particle.life > 0; }); ctx.globalAlpha = 1;
    drawPod(LANES[0] + lane * (LANES[1] - LANES[0]));
    frame = requestAnimationFrame(loop);
  };

  frame = requestAnimationFrame(loop);
  return {
    start() { timer = 30; lane = 1; targetLane = 1; score = 0; coins = 0; speed = 260; objects = []; particles = []; running = true; last = performance.now(); sound(440, .12); emit(); },
    setLane(direction) { if (!running) return; targetLane = Math.max(0, Math.min(2, targetLane + direction)); sound(250 + targetLane * 70, .04); },
    mute(value) { muted = value; if (muted) audio?.suspend(); else audio?.resume(); },
    resize() {},
    destroy() { destroyed = true; running = false; cancelAnimationFrame(frame); audio?.close().catch(() => {}); objects = []; particles = []; },
  };
}
