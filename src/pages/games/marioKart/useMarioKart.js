import { useState, useEffect, useRef } from 'react';

// --- GAME CONFIG & GEOMETRY ---
const ATTEMPT_TIME_LIMIT = 30; // 30s per attempt
const MAX_ATTEMPTS = 5;

const horizonY = 150;
const bottomY = 600;
const horizonLanes = [370, 400, 430];
const baseLanes = [180, 400, 620];

export default function useMarioKart() {
    const canvasRef = useRef(null);

    // --- SYNCED STATES FOR REACT OVERLAYS ---
    const [gameState, setGameState] = useState("start"); // "start", "playing", "crashed", "result", "gameover"
    const [currentAttempt, setCurrentAttempt] = useState(1);
    const [attemptTimer, setAttemptTimer] = useState(ATTEMPT_TIME_LIMIT);
    const [attemptScores, setAttemptScores] = useState([0, 0, 0, 0, 0]);
    const [attemptCoins, setAttemptCoins] = useState([0, 0, 0, 0, 0]);
    const [attemptStatuses, setAttemptStatuses] = useState(["CRASH", "CRASH", "CRASH", "CRASH", "CRASH"]);
    const [currentAttemptScore, setCurrentAttemptScore] = useState(0);
    const [totalScore, setTotalScore] = useState(0);
    const [bestAttemptScore, setBestAttemptScore] = useState(0);
    const [coinCount, setCoinCount] = useState(0);
    const [transitionTimer, setTransitionTimer] = useState(3.0);
    const [activeLaneText, setActiveLaneText] = useState("CENTER");

    // --- GAMEPLAY REFS ---
    const playerRef = useRef({
        lane: 1, x: 400, y: 500, width: 54, height: 38, targetX: 400, rollAngle: 0
    });
    const entitiesRef = useRef([]);
    const particlesRef = useRef([]);
    const keysRef = useRef({});
    
    // Telemetry refs
    const gameSpeedRef = useRef(0.8);
    const survivalTimeRef = useRef(0);
    const spawnTimerRef = useRef(0.5);
    const spawnIntervalRef = useRef(0.9);
    const screenShakeRef = useRef(0);
    const crashTimerRef = useRef(0);

    // Audio Refs
    const audioCtxRef = useRef(null);
    const engineOscRef = useRef(null);
    const engineSubOscRef = useRef(null);
    const engineGainRef = useRef(null);
    const noiseBufferRef = useRef(null);
    
    const loopRef = useRef(null);
    const lastTimeRef = useRef(0);

    // --- AUDIO SYNTH CORES ---
    const initAudio = () => {
        if (audioCtxRef.current) return;
        try {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            audioCtxRef.current = new AudioContextClass();
            
            const bufferSize = 2 * audioCtxRef.current.sampleRate;
            noiseBufferRef.current = audioCtxRef.current.createBuffer(1, bufferSize, audioCtxRef.current.sampleRate);
            const data = noiseBufferRef.current.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }

            engineOscRef.current = audioCtxRef.current.createOscillator();
            engineOscRef.current.type = 'sawtooth';
            
            engineSubOscRef.current = audioCtxRef.current.createOscillator();
            engineSubOscRef.current.type = 'triangle';
            engineSubOscRef.current.detune.setValueAtTime(-1200, audioCtxRef.current.currentTime);

            let engineFilter = audioCtxRef.current.createBiquadFilter();
            engineFilter.type = 'lowpass';
            engineFilter.frequency.setValueAtTime(280, audioCtxRef.current.currentTime);

            engineGainRef.current = audioCtxRef.current.createGain();
            engineGainRef.current.gain.setValueAtTime(0.0, audioCtxRef.current.currentTime); 

            engineOscRef.current.connect(engineFilter);
            engineSubOscRef.current.connect(engineFilter);
            engineFilter.connect(engineGainRef.current);
            engineGainRef.current.connect(audioCtxRef.current.destination);
            
            engineOscRef.current.start();
            engineSubOscRef.current.start();
        } catch (e) {
            console.warn(e);
        }
    };

    const playBeep = (freq = 600, duration = 0.1, volume = 0.1) => {
        if (!audioCtxRef.current) return;
        try {
            const ctx = audioCtxRef.current;
            let osc = ctx.createOscillator();
            let gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, ctx.currentTime);
            gain.gain.setValueAtTime(volume, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + duration);
        } catch (e) {}
    };

    const playSwooshSound = () => {
        if (!audioCtxRef.current) return;
        try {
            const ctx = audioCtxRef.current;
            let osc = ctx.createOscillator();
            let gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(150, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(550, ctx.currentTime + 0.12);
            osc.frequency.exponentialRampToValueAtTime(90, ctx.currentTime + 0.22);
            gain.gain.setValueAtTime(0.07, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.0, ctx.currentTime + 0.22);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.22);
        } catch(e) {}
    };

    const playCoinSound = () => {
        if (!audioCtxRef.current) return;
        try {
            const ctx = audioCtxRef.current;
            let now = ctx.currentTime;
            let osc = ctx.createOscillator();
            let gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(987.77, now);          
            osc.frequency.setValueAtTime(1318.51, now + 0.08);   
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(now + 0.25);
        } catch(e) {}
    };

    const playCrashSound = () => {
        if (!audioCtxRef.current) return;
        try {
            const ctx = audioCtxRef.current;
            let now = ctx.currentTime;
            
            let osc = ctx.createOscillator();
            let oscGain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(100, now);
            osc.frequency.exponentialRampToValueAtTime(10, now + 0.45);
            oscGain.gain.setValueAtTime(0.42, now);
            oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
            osc.connect(oscGain);
            oscGain.connect(ctx.destination);
            osc.start();
            osc.stop(now + 0.45);

            let noise = ctx.createBufferSource();
            noise.buffer = noiseBufferRef.current;
            let filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(220, now);
            let noiseGain = ctx.createGain();
            noiseGain.gain.setValueAtTime(0.3, now);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
            noise.connect(filter);
            filter.connect(noiseGain);
            noiseGain.connect(ctx.destination);
            noise.start();
            noise.stop(now + 0.45);
        } catch(e) {}
    };

    const updateAudioNodes = () => {
        if (!audioCtxRef.current || !engineGainRef.current) return;
        const currentGameState = gameState; // closures reading state from state hook
        if (currentGameState !== "playing" && currentGameState !== "crashed") {
            engineGainRef.current.gain.setValueAtTime(0, audioCtxRef.current.currentTime);
            return;
        }

        try {
            let speedRatio = (gameSpeedRef.current - 0.8) / 0.8; 
            let baseFreq = 50; 
            let freq = baseFreq + speedRatio * 80;
            engineOscRef.current.frequency.setTargetAtTime(freq, audioCtxRef.current.currentTime, 0.05);
            engineSubOscRef.current.frequency.setTargetAtTime(freq, audioCtxRef.current.currentTime, 0.05);
            let engineVol = 0.08 + speedRatio * 0.05;
            if (currentGameState === "crashed") engineVol *= 0.2;
            engineGainRef.current.gain.setTargetAtTime(engineVol, audioCtxRef.current.currentTime, 0.05);
        } catch(e) {}
    };

    // --- GAMEPLAY TRIGGERS ---
    const startNewGame = () => {
        setGameState("playing");
        setCurrentAttempt(1);
        setAttemptScores([0, 0, 0, 0, 0]);
        setAttemptCoins([0, 0, 0, 0, 0]);
        setAttemptStatuses(["CRASH", "CRASH", "CRASH", "CRASH", "CRASH"]);
        setTotalScore(0);
        setBestAttemptScore(0);
        startAttemptSession(1);
    };

    const startAttemptSession = (attemptNum) => {
        playerRef.current = {
            lane: 1, x: 400, y: 500, width: 54, height: 38, targetX: 400, rollAngle: 0
        };
        setAttemptTimer(ATTEMPT_TIME_LIMIT);
        setCurrentAttemptScore(0);
        setCoinCount(0);
        setActiveLaneText("CENTER");

        // Reset system load telemetry
        gameSpeedRef.current = 0.8;
        survivalTimeRef.current = 0;
        spawnTimerRef.current = 0.5;
        spawnIntervalRef.current = 0.9;
        screenShakeRef.current = 0;
        crashTimerRef.current = 0;
        
        entitiesRef.current = [];
        particlesRef.current = [];
        keysRef.current = {};
        lastTimeRef.current = performance.now();

        playBeep(523.25, 0.15, 0.1); 
    };

    const endAttempt = (isSuccess) => {
        const currentScoreVal = Math.round(currentAttemptScore);
        const coinsVal = coinCount;
        
        setAttemptScores(prev => {
            const next = [...prev];
            next[currentAttempt - 1] = currentScoreVal;
            const nextBest = Math.max(...next.slice(0, currentAttempt));
            setBestAttemptScore(nextBest);
            setTotalScore(next.reduce((a, b) => a + b, 0));
            return next;
        });

        setAttemptCoins(prev => {
            const next = [...prev];
            next[currentAttempt - 1] = coinsVal;
            return next;
        });

        setAttemptStatuses(prev => {
            const next = [...prev];
            next[currentAttempt - 1] = isSuccess ? "SUCCESS" : "CRASH";
            return next;
        });

        if (currentAttempt < MAX_ATTEMPTS) {
            setGameState("result");
            setTransitionTimer(3.0);
        } else {
            setGameState("gameover");
        }
    };

    const nextAttempt = () => {
        initAudio();
        setCurrentAttempt(prev => {
            const nextVal = prev + 1;
            startAttemptSession(nextVal);
            setGameState("playing");
            return nextVal;
        });
    };

    // --- PARTICLE BURSTS ---
    const spawnCoinBurst = (x, y) => {
        for (let i = 0; i < 15; i++) {
            let angle = Math.random() * Math.PI * 2;
            let speed = 1.5 + Math.random() * 3.5;
            particlesRef.current.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 2 + Math.random() * 3,
                color: Math.random() > 0.4 ? '#FF9900' : '#ffffff',
                life: 0,
                maxLife: 20 + Math.random() * 15
            });
        }
    };

    const spawnCrashExplosion = (x, y) => {
        for (let i = 0; i < 40; i++) {
            let angle = Math.random() * Math.PI * 2;
            let speed = 2.5 + Math.random() * 6;
            particlesRef.current.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 3 + Math.random() * 4,
                color: Math.random() > 0.35 ? '#ff3838' : (Math.random() > 0.5 ? '#FF9900' : '#ffffff'),
                life: 0,
                maxLife: 35 + Math.random() * 25
            });
        }
    };

    // --- PROCESS INPUT KEYBOARD ---
    useEffect(() => {
        const handleKeyDown = (e) => {
            const currentGameState = gameState;
            if (currentGameState !== "playing") {
                initAudio();
                return;
            }

            if (e.code === "ArrowLeft" || e.code === "KeyA") {
                if (playerRef.current.lane > 0) {
                    playerRef.current.lane--;
                    playSwooshSound();
                }
            }
            if (e.code === "ArrowRight" || e.code === "KeyD") {
                if (playerRef.current.lane < 2) {
                    playerRef.current.lane++;
                    playSwooshSound();
                }
            }

            initAudio();
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [gameState]);

    // --- MAIN RENDER PROCESS GAME LOOP ---
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");

        const renderLoop = (time) => {
            let dt = (time - lastTimeRef.current) / 1000;
            if (dt > 0.15) dt = 0.15;
            lastTimeRef.current = time;

            // --- SYSTEM UPDATE LOGIC ---
            if (gameState === "crashed") {
                crashTimerRef.current -= dt;
                
                let playerT = 0.7778;
                playerRef.current.targetX = horizonLanes[playerRef.current.lane] + (baseLanes[playerRef.current.lane] - horizonLanes[playerRef.current.lane]) * playerT;
                playerRef.current.x += (playerRef.current.targetX - playerRef.current.x) * 6 * dt;

                if (crashTimerRef.current <= 0) {
                    endAttempt(false);
                }

                // Update particles only
                for (let i = particlesRef.current.length - 1; i >= 0; i--) {
                    let p = particlesRef.current[i];
                    p.x += p.vx;
                    p.y += p.vy;
                    p.life++;
                    if (p.life >= p.maxLife) particlesRef.current.splice(i, 1);
                }
            } else if (gameState === "result") {
                setTransitionTimer(prev => {
                    let nextVal = prev - dt;
                    if (nextVal <= 0) {
                        nextVal = 0;
                        setTimeout(() => {
                            nextAttempt();
                        }, 20);
                    }
                    return nextVal;
                });
            } else if (gameState === "playing") {
                survivalTimeRef.current += dt;
                
                setAttemptTimer(prev => {
                    let nextVal = prev - dt;
                    if (nextVal <= 0) {
                        nextVal = 0;
                        setCurrentAttemptScore(s => s + 1500); // Survival score bonus
                        setTimeout(() => {
                            endAttempt(true);
                        }, 20);
                    }
                    return nextVal;
                });

                // Gradually scale speed
                gameSpeedRef.current = 0.8 + survivalTimeRef.current * 0.015;
                spawnIntervalRef.current = Math.max(0.4, 0.9 - survivalTimeRef.current * 0.008);
                setCurrentAttemptScore(s => s + dt * 50 * gameSpeedRef.current);

                // Update lane label
                const lanesLabel = ["LEFT", "CENTER", "RIGHT"];
                setActiveLaneText(lanesLabel[playerRef.current.lane]);

                // Lerp player X coordinates and body roll tilt
                let playerT = 0.7778;
                playerRef.current.targetX = horizonLanes[playerRef.current.lane] + (baseLanes[playerRef.current.lane] - horizonLanes[playerRef.current.lane]) * playerT;
                
                let oldX = playerRef.current.x;
                playerRef.current.x += (playerRef.current.targetX - playerRef.current.x) * 22 * dt;
                let vx = (playerRef.current.x - oldX) / dt;
                let targetRoll = -vx * 0.0004; 
                playerRef.current.rollAngle += (targetRoll - playerRef.current.rollAngle) * 15 * dt;

                // Spawning entities
                spawnTimerRef.current += dt;
                if (spawnTimerRef.current >= spawnIntervalRef.current) {
                    spawnTimerRef.current = 0;
                    let randomLane = Math.floor(Math.random() * 3);
                    let type = Math.random() > 0.4 ? 'coin' : 'obstacle';

                    entitiesRef.current.push({
                        lane: randomLane,
                        progress: 0.05,
                        type,
                        active: true,
                        y: horizonY,
                        x: horizonLanes[randomLane]
                    });
                }

                // Entities coordinates updates & collisions
                for (let i = entitiesRef.current.length - 1; i >= 0; i--) {
                    let ent = entitiesRef.current[i];
                    ent.progress += gameSpeedRef.current * dt;

                    if (ent.progress >= 1.0) {
                        if (ent.type === 'obstacle' && ent.active) {
                            setCurrentAttemptScore(s => s + 50); // dodging bonus
                        }
                        entitiesRef.current.splice(i, 1);
                        continue;
                    }

                    let mappedProgress = Math.pow(ent.progress, 1.8);
                    ent.y = horizonY + (bottomY - horizonY) * mappedProgress;

                    let visualDepthT = (ent.y - horizonY) / (bottomY - horizonY);
                    ent.x = horizonLanes[ent.lane] + (baseLanes[ent.lane] - horizonLanes[ent.lane]) * visualDepthT;

                    // Check collisions with player
                    if (ent.active && Math.abs(ent.y - 500) < 32) {
                        if (Math.abs(ent.x - playerRef.current.x) < 42) {
                            ent.active = false;
                            
                            if (ent.type === 'coin') {
                                setCoinCount(c => c + 1);
                                setCurrentAttemptScore(s => s + 100);
                                playCoinSound();
                                spawnCoinBurst(ent.x, ent.y);
                                entitiesRef.current.splice(i, 1);
                            } else {
                                // CRASH TRANSITION
                                playCrashSound();
                                screenShakeRef.current = 18;
                                spawnCrashExplosion(ent.x, ent.y);
                                setGameState("crashed");
                                crashTimerRef.current = 1.0;
                            }
                        }
                    }
                }

                // Update particles lifespan
                for (let i = particlesRef.current.length - 1; i >= 0; i--) {
                    let p = particlesRef.current[i];
                    p.x += p.vx;
                    p.y += p.vy;
                    p.life++;
                    if (p.life >= p.maxLife) particlesRef.current.splice(i, 1);
                }
            }

            if (screenShakeRef.current > 0) screenShakeRef.current -= dt * 35;
            if (screenShakeRef.current < 0) screenShakeRef.current = 0;

            updateAudioNodes();

            // --- CANVAS DRAW CORES ---
            ctx.save();
            if (screenShakeRef.current > 0) {
                let dx = (Math.random() - 0.5) * screenShakeRef.current;
                let dy = (Math.random() - 0.5) * screenShakeRef.current;
                ctx.translate(dx, dy);
            }

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // A. Grid Background
            ctx.fillStyle = '#080b0e';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.strokeStyle = '#121921';
            ctx.lineWidth = 1;
            const gridSpacing = 40;
            for(let x = 0; x < canvas.width; x += gridSpacing) {
                ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
            }
            for(let y = 0; y < canvas.height; y += gridSpacing) {
                ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
            }

            // B. Receding Slate Road (3D perspective highway)
            ctx.fillStyle = '#17202b';
            ctx.beginPath();
            ctx.moveTo(400 - 40, horizonY);
            ctx.lineTo(400 + 40, horizonY);
            ctx.lineTo(400 + 310, bottomY);
            ctx.lineTo(400 - 310, bottomY);
            ctx.closePath();
            ctx.fill();

            // Orange road borders
            ctx.strokeStyle = '#FF9900';
            ctx.lineWidth = 4;
            ctx.save();
            ctx.shadowColor = '#FF9900';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.moveTo(400 - 40, horizonY);
            ctx.lineTo(400 - 310, bottomY);
            ctx.moveTo(400 + 40, horizonY);
            ctx.lineTo(400 + 310, bottomY);
            ctx.stroke();
            ctx.restore();

            // C. Lane dividers
            const drawLaneDivider = (horizonDividerX, baseDividerX) => {
                ctx.save();
                ctx.strokeStyle = 'rgba(255, 153, 0, 0.4)';
                ctx.lineWidth = 2.5;
                ctx.setLineDash([12, 15]);
                ctx.beginPath();
                ctx.moveTo(horizonDividerX, horizonY);
                ctx.lineTo(baseDividerX, bottomY);
                ctx.stroke();
                ctx.restore();
            };
            drawLaneDivider(385, 290);
            drawLaneDivider(415, 510);

            // D. Scrolling Horizontal depth dividers
            let scrollOffset = (survivalTimeRef.current * gameSpeedRef.current * 1.5) % 1.0;
            ctx.strokeStyle = 'rgba(255, 153, 0, 0.18)';
            ctx.lineWidth = 2;
            for (let i = 0; i < 6; i++) {
                let p = ((i + scrollOffset) / 6);
                if (p > 1.0) p -= 1.0;
                let mappedP = Math.pow(p, 2.2);
                let lineY = horizonY + (bottomY - horizonY) * mappedP;
                let wT = (lineY - horizonY) / (bottomY - horizonY);
                let lx = (400 - 40) + (100 - 360) * wT;
                let rx = (400 + 40) + (700 - 440) * wT;
                ctx.beginPath(); ctx.moveTo(lx, lineY); ctx.lineTo(rx, lineY); ctx.stroke();
            }

            // E. Render entities
            entitiesRef.current.forEach(ent => {
                if (!ent.active) return;
                let visualDepthT = (ent.y - horizonY) / (bottomY - horizonY);
                let scale = 0.25 + 0.75 * visualDepthT;
                ctx.save();

                if (ent.type === 'coin') {
                    ctx.translate(ent.x, ent.y - 12 * scale);
                    ctx.scale(scale, scale);
                    
                    let spinVal = Math.cos(Date.now() / 150);
                    let absSpin = Math.abs(spinVal);
                    ctx.shadowColor = '#FF9900';
                    ctx.shadowBlur = 12;

                    ctx.fillStyle = '#ff9900';
                    ctx.beginPath(); ctx.ellipse(0, 0, 16 * absSpin, 16, 0, 0, Math.PI * 2); ctx.fill();

                    ctx.fillStyle = '#1e252b';
                    ctx.beginPath(); ctx.ellipse(0, 0, 12 * absSpin, 12, 0, 0, Math.PI * 2); ctx.fill();

                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 1;
                    ctx.beginPath(); ctx.ellipse(0, 0, 15 * absSpin, 15, 0, 0, Math.PI * 2); ctx.stroke();

                    if (absSpin > 0.3) {
                        ctx.fillStyle = '#FF9900';
                        ctx.font = 'bold 9px monospace';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.scale(spinVal > 0 ? 1 : -1, 1);
                        ctx.fillText('S3', 0, 0);
                    }
                } else {
                    ctx.translate(ent.x, ent.y);
                    ctx.scale(scale, scale);

                    const drawGatePillar = (px) => {
                        ctx.save();
                        ctx.translate(px, 0);
                        ctx.fillStyle = '#090d10'; ctx.fillRect(-6, -60, 12, 60);
                        ctx.fillStyle = '#1e252b'; ctx.strokeStyle = '#ff3838'; ctx.lineWidth = 1.5;
                        ctx.fillRect(-5, -58, 10, 58); ctx.strokeRect(-5, -58, 10, 58);
                        ctx.fillStyle = (Math.floor(Date.now() / 200) % 2 === 0) ? '#ff3838' : '#550000';
                        ctx.fillRect(-2, -52, 4, 3);
                        ctx.fillStyle = (Math.floor(Date.now() / 350) % 2 === 0) ? '#ffea00' : '#444400';
                        ctx.fillRect(-2, -32, 4, 3);
                        ctx.fillStyle = '#00d26a'; ctx.fillRect(-2, -12, 4, 3);
                        ctx.restore();
                    };
                    drawGatePillar(-32);
                    drawGatePillar(32);

                    ctx.strokeStyle = '#1e252b'; ctx.lineWidth = 4;
                    ctx.beginPath(); ctx.moveTo(-32, -54); ctx.lineTo(32, -54); ctx.stroke();

                    ctx.shadowColor = '#ff3838'; ctx.shadowBlur = 15;
                    let shieldGrad = ctx.createLinearGradient(0, -54, 0, 0);
                    shieldGrad.addColorStop(0, 'rgba(255, 56, 56, 0.45)');
                    shieldGrad.addColorStop(1, 'rgba(255, 56, 56, 0.05)');
                    ctx.fillStyle = shieldGrad; ctx.fillRect(-27, -54, 54, 54);

                    ctx.strokeStyle = '#ff3838'; ctx.lineWidth = 1.5;
                    ctx.strokeRect(-27, -54, 54, 54);

                    const errors = ["403", "502", "500", "401"];
                    let errNum = errors[ent.lane % errors.length];
                    ctx.fillStyle = '#ffffff';
                    ctx.font = 'bold 15px "Orbitron", sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText(errNum, 0, -32);
                    ctx.font = 'bold 7px "Orbitron", sans-serif';
                    ctx.fillStyle = 'rgba(255,255,255,0.7)';
                    ctx.fillText('ACCESS DENIED', 0, -16);
                }
                ctx.restore();
            });

            // F. Render particles
            particlesRef.current.forEach(p => {
                let alpha = Math.max(0, p.life / p.maxLife);
                ctx.save();
                ctx.fillStyle = p.color;
                ctx.globalAlpha = 1 - alpha;
                ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
                ctx.restore();
            });

            // G. Render Player Car (Rear view of the data pod)
            const currentGameState = gameState;
            if (currentGameState === "playing" || currentGameState === "result" || currentGameState === "crashed") {
                const player = playerRef.current;
                ctx.save();
                ctx.translate(player.x, player.y);
                ctx.rotate(player.rollAngle);

                ctx.shadowColor = '#FF9900';
                ctx.shadowBlur = 10;

                // Engine flame
                let speedRatio = (gameSpeedRef.current - 0.8) / 0.8;
                let flameSize = 12 + Math.random() * 10 + speedRatio * 8;
                let flameGrad = ctx.createLinearGradient(0, 10, 0, 10 + flameSize);
                flameGrad.addColorStop(0, '#00e5ff');
                flameGrad.addColorStop(1, 'rgba(0, 229, 255, 0)');
                ctx.fillStyle = flameGrad;
                ctx.fillRect(-14, 10, 6, flameSize);
                ctx.fillRect(8, 10, 6, flameSize);

                // Body Shell
                ctx.fillStyle = '#1e252b';
                ctx.strokeStyle = '#FF9900';
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.moveTo(-player.width / 2, 5);
                ctx.lineTo(-player.width / 2 + 6, -player.height + 6);
                ctx.lineTo(player.width / 2 - 6, -player.height + 6);
                ctx.lineTo(player.width / 2, 5);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                // Window
                ctx.fillStyle = '#0c1014';
                ctx.strokeStyle = '#ff9900aa';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(-16, -player.height + 14);
                ctx.lineTo(16, -player.height + 14);
                ctx.lineTo(20, -player.height + 26);
                ctx.lineTo(-20, -player.height + 26);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                // Taillights
                ctx.fillStyle = (currentGameState === "crashed" || Math.abs(player.rollAngle) > 0.04) ? '#ff0000' : '#880000';
                ctx.fillRect(-player.width / 2 + 5, -player.height + 10, 9, 3);
                ctx.fillRect(player.width / 2 - 14, -player.height + 10, 9, 3);

                ctx.fillStyle = '#ffffff';
                ctx.fillRect(-3, -player.height + 20, 2, 2);
                ctx.fillRect(1, -player.height + 20, 2, 2);

                // Spoiler
                ctx.fillStyle = '#0c1014';
                ctx.strokeStyle = '#FF9900';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(-player.width / 2 - 6, -player.height + 6);
                ctx.lineTo(player.width / 2 + 6, -player.height + 6);
                ctx.lineTo(player.width / 2 + 1, -player.height + 1);
                ctx.lineTo(-player.width / 2 - 1, -player.height + 1);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                // Tires
                ctx.fillStyle = '#090d10';
                ctx.fillRect(-player.width / 2 - 2, -15, 3, 20);
                ctx.fillRect(player.width / 2 - 1, -15, 3, 20);

                ctx.restore();
            }

            ctx.restore();

            loopRef.current = requestAnimationFrame(renderLoop);
        };

        loopRef.current = requestAnimationFrame(renderLoop);
        return () => {
            if (loopRef.current) cancelAnimationFrame(loopRef.current);
        };
    }, [gameState]);

    // Expose engine values
    return {
        canvasRef,
        gameState,
        currentAttempt,
        attemptTimer,
        attemptScores,
        attemptCoins,
        attemptStatuses,
        currentAttemptScore,
        totalScore,
        bestAttemptScore,
        coinCount,
        transitionTimer,
        activeLaneText,
        gameSpeed: gameSpeedRef.current,
        startNewGame,
        nextAttempt
    };
}