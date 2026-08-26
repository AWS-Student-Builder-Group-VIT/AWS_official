import { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function useAsteroidvsAsteroid(canvasRef) {
    // React State for rendering the HUD & overlays
    const [score, setScore] = useState(0);
    const [highScore, setHighScore] = useState(() => parseInt(localStorage.getItem('aws_space_high_score')) || 0);
    const [level, setLevel] = useState(1);
    const [shield, setShield] = useState(100);
    const [multiplier, setMultiplier] = useState(1);
    const [attemptsScores, setAttemptsScores] = useState([]);
    const [survivalTimer, setSurvivalTimer] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const [gameStarted, setGameStarted] = useState(false);
    const [isMuted, setIsMuted] = useState(false);

    // Bounding / Spawn Limits
    const maxAttempts = 5;
    const fireCooldown = 180; // ms

    // Refs for rapid engine updates (avoids React re-render lag & stale closures)
    const gameStartedRef = useRef(false);
    const gameOverRef = useRef(false);
    const scoreRef = useRef(0);
    const shieldRef = useRef(100);
    const levelRef = useRef(1);
    const multiplierRef = useRef(1);
    const consecutiveHitsRef = useRef(0);
    const asteroidsDestroyedRef = useRef(0);
    const attemptsScoresRef = useRef([]);
    const survivalTimerRef = useRef(0);
    const isMutedRef = useRef(false);
    const spawnIntervalRef = useRef(1500);

    // Three.js Core Refs
    const sceneRef = useRef(null);
    const cameraRef = useRef(null);
    const rendererRef = useRef(null);
    const starfieldRef = useRef(null);
    const shipRef = useRef(null);
    const lasersRef = useRef([]);
    const asteroidsRef = useRef([]);
    const particlesRef = useRef(null);
    const clockRef = useRef(new THREE.Clock());

    // Audio & Spawn Timer Refs
    const audioCtxRef = useRef(null);
    const asteroidSpawnTimerRef = useRef(0);
    const lastFireTimeRef = useRef(0);
    const shakeIntensityRef = useRef(0);
    const shakeTimeRef = useRef(0);

    // Controls tracking
    const keysRef = useRef({
        ArrowLeft: false, ArrowRight: false, ArrowUp: false, ArrowDown: false,
        KeyA: false, KeyD: false, KeyW: false, KeyS: false,
        Space: false
    });

    // --- SOUND SYNTHESIS ENGINE ---
    const initAudio = () => {
        if (!audioCtxRef.current) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            audioCtxRef.current = new AudioContextClass();
        }
        if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
            audioCtxRef.current.resume();
        }
    };

    const playLaserSound = () => {
        if (isMutedRef.current) return;
        initAudio();
        const ctx = audioCtxRef.current;
        if (!ctx) return;
        
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.15);
        
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
    };

    const playExplosionSound = (size) => {
        if (isMutedRef.current) return;
        initAudio();
        const ctx = audioCtxRef.current;
        if (!ctx) return;
        
        const duration = size === 3 ? 0.4 : size === 2 ? 0.25 : 0.15;
        const bufferSize = ctx.sampleRate * duration;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        const noiseNode = ctx.createBufferSource();
        noiseNode.buffer = buffer;
        
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(size === 3 ? 90 : size === 2 ? 180 : 360, ctx.currentTime);
        filter.Q.setValueAtTime(2.5, ctx.currentTime);
        
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(size === 3 ? 0.35 : size === 2 ? 0.25 : 0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
        
        noiseNode.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        
        noiseNode.start();
        noiseNode.stop(ctx.currentTime + duration);
    };

    const playShieldHitSound = () => {
        if (isMutedRef.current) return;
        initAudio();
        const ctx = audioCtxRef.current;
        if (!ctx) return;
        
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc1.type = 'triangle';
        osc1.frequency.setValueAtTime(160, ctx.currentTime);
        osc1.frequency.linearRampToValueAtTime(30, ctx.currentTime + 0.2);
        
        osc2.type = 'sawtooth';
        osc2.frequency.setValueAtTime(220, ctx.currentTime);
        osc2.frequency.linearRampToValueAtTime(50, ctx.currentTime + 0.25);
        
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);
        
        osc1.start();
        osc2.start();
        osc1.stop(ctx.currentTime + 0.25);
        osc2.stop(ctx.currentTime + 0.25);
    };

    const playLevelUpSound = () => {
        if (isMutedRef.current) return;
        initAudio();
        const ctx = audioCtxRef.current;
        if (!ctx) return;
        
        const now = ctx.currentTime;
        const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
        notes.forEach((freq, index) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + index * 0.08);
            gain.gain.setValueAtTime(0.1, now + index * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.01, now + index * 0.08 + 0.15);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + index * 0.08);
            osc.stop(now + index * 0.08 + 0.15);
        });
    };

    // --- GAME ACTIONS ---
    const startGame = () => {
        initAudio();
        
        // If tournament was finished, clear attempts
        if (attemptsScoresRef.current.length >= maxAttempts) {
            attemptsScoresRef.current = [];
            setAttemptsScores([]);
        }
        
        // Clean active game elements from Three.js scene
        asteroidsRef.current.forEach(a => sceneRef.current.remove(a.mesh));
        lasersRef.current.forEach(l => sceneRef.current.remove(l.mesh));
        asteroidsRef.current = [];
        lasersRef.current = [];
        
        // Reset Ref states
        scoreRef.current = 0;
        levelRef.current = 1;
        shieldRef.current = 100;
        multiplierRef.current = 1;
        consecutiveHitsRef.current = 0;
        asteroidsDestroyedRef.current = 0;
        spawnIntervalRef.current = 1500;
        survivalTimerRef.current = 0;
        
        // Sync React States
        setScore(0);
        setLevel(1);
        setShield(100);
        setMultiplier(1);
        setSurvivalTimer(0);
        
        if (shipRef.current) {
            shipRef.current.position.set(0, -11, 0);
            shipRef.current.rotation.set(0, 0, 0);
            shipRef.current.visible = true;
        }
        
        gameOverRef.current = false;
        setGameOver(false);
        gameStartedRef.current = true;
        setGameStarted(true);
        
        clockRef.current.getDelta(); // reset clock delta
    };

    const toggleMute = () => {
        isMutedRef.current = !isMutedRef.current;
        setIsMuted(isMutedRef.current);
        if (!isMutedRef.current) {
            initAudio();
        }
    };

    // Vector line-segment distance check (prevents laser tunneling)
    const distToSegment = (p, a, b) => {
        const ab = new THREE.Vector3().subVectors(b, a);
        const ap = new THREE.Vector3().subVectors(p, a);
        
        let t = ap.dot(ab) / ab.lengthSq();
        if (isNaN(t)) t = 0;
        t = Math.max(0, Math.min(1, t));
        
        const closest = new THREE.Vector3().addVectors(a, ab.multiplyScalar(t));
        return p.distanceTo(closest);
    };

    const triggerGameOver = () => {
        gameOverRef.current = true;
        setGameOver(true);
        if (shipRef.current) shipRef.current.visible = false;
        
        playExplosionSound(3);
        particlesRef.current.spawnExplosion(shipRef.current.position.x, shipRef.current.position.y, 0, 0xFFFFFF, 35, true);
        particlesRef.current.spawnExplosion(shipRef.current.position.x, shipRef.current.position.y, 0, 0xFF9900, 35, true);
        
        // Record this attempt's score
        const newScores = [...attemptsScoresRef.current, scoreRef.current];
        attemptsScoresRef.current = newScores;
        setAttemptsScores(newScores);
        
        // Update High Score
        if (scoreRef.current > highScore) {
            setHighScore(scoreRef.current);
            localStorage.setItem('aws_space_high_score', scoreRef.current);
        }
    };

    const addScore = (amount) => {
        scoreRef.current += amount * multiplierRef.current;
        setScore(scoreRef.current);
        
        const targetStage = Math.floor(scoreRef.current / 2500) + 1;
        if (targetStage > levelRef.current) {
            levelRef.current = targetStage;
            setLevel(targetStage);
            spawnIntervalRef.current = Math.max(450, 1500 - (levelRef.current - 1) * 140);
            playLevelUpSound();
        }
    };

    const spawnAsteroid = () => {
        if (asteroidsRef.current.length >= 15) return;
        
        const roll = Math.random();
        let size = 1;
        if (roll > 0.6) size = 3;
        else if (roll > 0.25) size = 2;
        
        const radius = size === 3 ? 1.8 : size === 2 ? 1.0 : 0.5;
        const mesh = createAsteroidMesh(radius, size);
        
        const asteroid = {
            mesh,
            size,
            radius,
            yv: -(Math.random() * 4 + 4 + levelRef.current * 0.8),
            xv: (Math.random() - 0.5) * 2.5,
            rx: (Math.random() - 0.5) * 2.5,
            ry: (Math.random() - 0.5) * 2.5,
            rz: (Math.random() - 0.5) * 2.5
        };
        
        asteroid.mesh.position.set(
            (Math.random() - 0.5) * 28,
            16,
            (Math.random() - 0.5) * 2
        );
        
        sceneRef.current.add(asteroid.mesh);
        asteroidsRef.current.push(asteroid);
    };

    const handleAsteroidHit = (asteroid, index) => {
        sceneRef.current.remove(asteroid.mesh);
        asteroidsRef.current.splice(index, 1);
        
        particlesRef.current.spawnExplosion(
            asteroid.mesh.position.x,
            asteroid.mesh.position.y,
            asteroid.mesh.position.z,
            0xFF9900,
            asteroid.size === 3 ? 25 : asteroid.size === 2 ? 16 : 9,
            asteroid.size === 3
        );
        playExplosionSound(asteroid.size);
        
        const pts = asteroid.size === 3 ? 100 : asteroid.size === 2 ? 150 : 250;
        addScore(pts);
        
        if (asteroid.size > 1) {
            const subSize = asteroid.size - 1;
            const pos = asteroid.mesh.position;
            
            for (let k = 0; k < 2; k++) {
                const driftDir = k === 0 ? -1 : 1;
                const subRadius = subSize === 2 ? 1.0 : 0.5;
                const subMesh = createAsteroidMesh(subRadius, subSize);
                
                const subAsteroid = {
                    mesh: subMesh,
                    size: subSize,
                    radius: subRadius,
                    yv: asteroid.yv * 1.15,
                    xv: asteroid.xv + driftDir * (Math.random() * 2.0 + 1.2),
                    rx: (Math.random() - 0.5) * 3,
                    ry: (Math.random() - 0.5) * 3,
                    rz: (Math.random() - 0.5) * 3
                };
                subAsteroid.mesh.position.set(pos.x + driftDir * 0.4, pos.y, pos.z);
                sceneRef.current.add(subAsteroid.mesh);
                asteroidsRef.current.push(subAsteroid);
            }
        }
        
        consecutiveHitsRef.current++;
        if (consecutiveHitsRef.current % 8 === 0) {
            multiplierRef.current++;
            setMultiplier(multiplierRef.current);
        }
        asteroidsDestroyedRef.current++;
    };

    const fireLasers = () => {
        const now = Date.now();
        if (now - lastFireTimeRef.current < fireCooldown) return;
        lastFireTimeRef.current = now;
        
        const leftX = shipRef.current.position.x - 1.5;
        const rightX = shipRef.current.position.x + 1.5;
        const fireY = shipRef.current.position.y - 0.2;
        
        const laserGeom = new THREE.CylinderGeometry(0.08, 0.08, 0.9, 6);
        const laserMat = new THREE.MeshBasicMaterial({ color: 0xFF9900 });
        
        const createLaser = (x, y) => {
            const mesh = new THREE.Mesh(laserGeom, laserMat);
            mesh.position.set(x, y, 0);
            mesh.rotation.x = Math.PI / 2;
            sceneRef.current.add(mesh);
            lasersRef.current.push({
                mesh,
                yv: 42,
                prevPosition: new THREE.Vector3(x, y, 0)
            });
        };
        
        createLaser(leftX, fireY);
        createLaser(rightX, fireY);
        playLaserSound();
        
        particlesRef.current.spawnExplosion(leftX, fireY + 0.5, 0, 0xFF9900, 3, false);
        particlesRef.current.spawnExplosion(rightX, fireY + 0.5, 0, 0xFF9900, 3, false);
    };

    // Procedural Mesh Builders
    const createAsteroidMesh = (radius, size) => {
        const detail = size === 3 || size === 2 ? 1 : 0;
        const geom = new THREE.DodecahedronGeometry(radius, detail);
        
        const pos = geom.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            let x = pos.getX(i);
            let y = pos.getY(i);
            let z = pos.getZ(i);
            const noise = radius * 0.18 * (Math.random() - 0.5);
            pos.setXYZ(i, x + noise, y + noise, z + noise);
        }
        geom.computeVertexNormals();
        
        const mat = new THREE.MeshStandardMaterial({
            color: 0x1d2126,
            roughness: 0.9,
            metalness: 0.15,
            emissive: 0xff4500,
            emissiveIntensity: 0.15,
            flatShading: true
        });
        
        const mesh = new THREE.Mesh(geom, mat);
        mesh.rotation.set(
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
        );
        return mesh;
    };

    const createPlayerShip = () => {
        const shipGroup = new THREE.Group();
        
        const fuselageGeom = new THREE.ConeGeometry(0.7, 3, 8);
        fuselageGeom.rotateX(Math.PI / 2);
        const darkSlateMat = new THREE.MeshStandardMaterial({
            color: 0x19232D,
            roughness: 0.4,
            metalness: 0.8,
            flatShading: true
        });
        const fuselage = new THREE.Mesh(fuselageGeom, darkSlateMat);
        shipGroup.add(fuselage);
        
        const wingGeom = new THREE.BoxGeometry(3.2, 0.15, 0.8);
        const orangeMat = new THREE.MeshStandardMaterial({
            color: 0xFF9900,
            roughness: 0.3,
            metalness: 0.7,
            emissive: 0x331e00,
            flatShading: true
        });
        const wings = new THREE.Mesh(wingGeom, orangeMat);
        wings.position.set(0, -0.4, -0.2);
        wings.rotation.x = 0.2;
        shipGroup.add(wings);

        const leftEngineGeom = new THREE.CylinderGeometry(0.2, 0.25, 0.8, 6);
        leftEngineGeom.rotateX(Math.PI / 2);
        const rightEngineGeom = leftEngineGeom.clone();
        const engineMat = new THREE.MeshStandardMaterial({
            color: 0x232F3E,
            metalness: 0.9,
            roughness: 0.1
        });
        
        const leftEngine = new THREE.Mesh(leftEngineGeom, engineMat);
        leftEngine.position.set(-1.6, -0.4, -0.2);
        const rightEngine = new THREE.Mesh(rightEngineGeom, engineMat);
        rightEngine.position.set(1.6, -0.4, -0.2);
        shipGroup.add(leftEngine, rightEngine);
        
        const cockpitGeom = new THREE.SphereGeometry(0.35, 8, 8);
        cockpitGeom.scale(1, 2, 1);
        cockpitGeom.rotateX(Math.PI / 2);
        const cockpitMat = new THREE.MeshStandardMaterial({
            color: 0xFF9900,
            emissive: 0xFF9900,
            emissiveIntensity: 0.6,
            roughness: 0.1,
            transparent: true,
            opacity: 0.85
        });
        const cockpit = new THREE.Mesh(cockpitGeom, cockpitMat);
        cockpit.position.set(0, 0.3, 0.25);
        shipGroup.add(cockpit);
        
        const fireGeom = new THREE.ConeGeometry(0.25, 0.8, 8);
        fireGeom.rotateX(-Math.PI / 2);
        fireGeom.translate(0, -1.6, 0);
        const fireMat = new THREE.MeshBasicMaterial({
            color: 0xFF9900,
            transparent: true,
            opacity: 0.8
        });
        const thrusterFire = new THREE.Mesh(fireGeom, fireMat);
        shipGroup.add(thrusterFire);
        
        shipGroup.castShadow = true;
        shipGroup.receiveShadow = true;
        shipGroup.userData = { thrusterFire };
        return shipGroup;
    };

    // --- DYNAMIC RENDERING LOOP SETUP ---
    useEffect(() => {
        if (!canvasRef.current) return;

        const scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0x0a0f14, 0.015);
        sceneRef.current = scene;

        const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
        camera.position.set(0, -18, 8);
        camera.lookAt(0, 2, 0);
        cameraRef.current = camera;

        const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setClearColor(0x0a0f14, 1);
        renderer.shadowMap.enabled = true;
        rendererRef.current = renderer;

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.25);
        scene.add(ambientLight);
        
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
        dirLight.position.set(5, 10, 15);
        scene.add(dirLight);
        
        const orangeLight = new THREE.PointLight(0xFF9900, 2.5, 30);
        orangeLight.position.set(0, 0, 5);
        scene.add(orangeLight);

        // Build Starfield
        const starCount = 800;
        const starGeom = new THREE.BufferGeometry();
        const positions = new Float32Array(starCount * 3);
        const colors = new Float32Array(starCount * 3);
        const colorAWS = new THREE.Color(0xFF9900);
        const colorWhite = new THREE.Color(0xFFFFFF);
        
        for (let i = 0; i < starCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 55;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 45;
            positions[i * 3 + 2] = -Math.random() * 50 - 5;
            
            const isOrange = Math.random() < 0.20;
            const color = isOrange ? colorAWS : colorWhite;
            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;
        }
        starGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        starGeom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const canvasStar = document.createElement('canvas');
        canvasStar.width = 16;
        canvasStar.height = 16;
        const ctxStar = canvasStar.getContext('2d');
        const gradStar = ctxStar.createRadialGradient(8, 8, 0, 8, 8, 8);
        gradStar.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradStar.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctxStar.fillStyle = gradStar;
        ctxStar.fillRect(0, 0, 16, 16);
        const starTexture = new THREE.CanvasTexture(canvasStar);
        
        const starMat = new THREE.PointsMaterial({
            size: 0.35,
            map: starTexture,
            vertexColors: true,
            transparent: true,
            opacity: 0.8,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });
        const starfield = new THREE.Points(starGeom, starMat);
        scene.add(starfield);
        starfieldRef.current = starfield;

        // Build Particle Clouds
        class RefParticleSystem {
            constructor(sc) {
                this.scene = sc;
                this.particles = [];
            }
            spawnExplosion(x, y, z, color, count = 25, isBig = false) {
                const group = new THREE.Group();
                const pSize = isBig ? 0.22 : 0.13;
                const geom = new THREE.BoxGeometry(pSize, pSize, pSize);
                const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 });
                const instances = [];
                for (let i = 0; i < count; i++) {
                    const mesh = new THREE.Mesh(geom, mat);
                    mesh.position.set(x, y, z);
                    const speed = (Math.random() * 8 + (isBig ? 5 : 2.5));
                    const angle = Math.random() * Math.PI * 2;
                    const pitch = (Math.random() - 0.5) * Math.PI;
                    const xv = speed * Math.cos(angle) * Math.cos(pitch);
                    const yv = speed * Math.sin(angle) * Math.cos(pitch);
                    const zv = speed * Math.sin(pitch);
                    group.add(mesh);
                    instances.push({ mesh, xv, yv, zv, life: 1.0, decay: Math.random() * 1.6 + 1.2 });
                }
                this.scene.add(group);
                this.particles.push({ group, instances });
            }
            update(dt) {
                for (let i = this.particles.length - 1; i >= 0; i--) {
                    const system = this.particles[i];
                    let allDead = true;
                    system.instances.forEach(p => {
                        if (p.life > 0) {
                            p.mesh.position.x += p.xv * dt;
                            p.mesh.position.y += p.yv * dt;
                            p.mesh.position.z += p.zv * dt;
                            p.xv *= 0.94; p.yv *= 0.94; p.zv *= 0.94;
                            p.life -= p.decay * dt;
                            p.mesh.scale.setScalar(p.life);
                            p.mesh.material.opacity = p.life;
                            if (p.life > 0) allDead = false;
                            else system.group.remove(p.mesh);
                        }
                    });
                    if (allDead) {
                        this.scene.remove(system.group);
                        this.particles.splice(i, 1);
                    }
                }
            }
        }
        particlesRef.current = new RefParticleSystem(scene);

        // Build Space Ship
        const ship = createPlayerShip();
        scene.add(ship);
        ship.visible = false;
        shipRef.current = ship;

        // Input Setup
        const handleKeyDown = (e) => {
            if (keysRef.current.hasOwnProperty(e.code)) {
                keysRef.current[e.code] = true;
                if (e.code === 'Space' || e.code.startsWith('Arrow')) {
                    e.preventDefault();
                }
            }
        };
        const handleKeyUp = (e) => {
            if (keysRef.current.hasOwnProperty(e.code)) {
                keysRef.current[e.code] = false;
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        // Resize Listener
        const handleResize = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener('resize', handleResize);

        // Main Animation Frame
        let animationId;
        const tick = () => {
            animationId = requestAnimationFrame(tick);
            const dt = clockRef.current.getDelta();
            const time = clockRef.current.getElapsedTime();

            // Background Starfield travel speed
            const speed = gameStartedRef.current && !gameOverRef.current ? 12 * dt : 1.5 * dt;
            const pos = starfield.geometry.attributes.position;
            for (let i = 0; i < pos.count; i++) {
                let y = pos.getY(i);
                y -= speed;
                if (y < -22) {
                    y = 22;
                    pos.setX(i, (Math.random() - 0.5) * 55);
                    pos.setZ(i, -Math.random() * 50 - 5);
                }
                pos.setY(i, y);
            }
            pos.needsUpdate = true;

            // Physics Update
            if (gameStartedRef.current && !gameOverRef.current) {
                // Ticks survival timer
                survivalTimerRef.current += dt;
                setSurvivalTimer(survivalTimerRef.current);

                // Asteroids spawn tick
                asteroidSpawnTimerRef.current += dt * 1000;
                if (asteroidSpawnTimerRef.current >= spawnIntervalRef.current) {
                    asteroidSpawnTimerRef.current = 0;
                    spawnAsteroid();
                }

                // Ship Navigation
                let xMov = 0;
                let yMov = 0;
                const shipSpeed = 16.5;
                const keys = keysRef.current;
                
                if (keys.ArrowLeft || keys.KeyA) xMov -= 1;
                if (keys.ArrowRight || keys.KeyD) xMov += 1;
                if (keys.ArrowUp || keys.KeyW) yMov += 1;
                if (keys.ArrowDown || keys.KeyS) yMov -= 1;
                
                ship.position.x += xMov * shipSpeed * dt;
                ship.position.y += yMov * shipSpeed * dt;
                
                ship.position.x = Math.max(-14.2, Math.min(14.2, ship.position.x));
                ship.position.y = Math.max(-13.0, Math.min(-7.0, ship.position.y));

                // Banking rotations
                let targetZRot = 0;
                let targetYRot = 0;
                let targetXRot = 0;
                if (xMov < 0) { targetZRot = 0.52; targetYRot = 0.32; }
                else if (xMov > 0) { targetZRot = -0.52; targetYRot = -0.32; }
                if (yMov > 0) targetXRot = 0.22;
                else if (yMov < 0) targetXRot = -0.22;

                ship.rotation.z += (targetZRot - ship.rotation.z) * 11 * dt;
                ship.rotation.y += (targetYRot - ship.rotation.y) * 11 * dt;
                ship.rotation.x += (targetXRot - ship.rotation.x) * 11 * dt;

                const fireScale = 1.0 + Math.sin(time * 35) * 0.16 + (yMov > 0 ? 0.35 : 0);
                ship.userData.thrusterFire.scale.set(1, fireScale, 1);

                // Laser trigger
                if (keys.Space) {
                    fireLasers();
                }

                // Move Lasers
                const lasers = lasersRef.current;
                for (let i = lasers.length - 1; i >= 0; i--) {
                    const l = lasers[i];
                    l.prevPosition.copy(l.mesh.position);
                    l.mesh.position.y += l.yv * dt;
                    if (l.mesh.position.y > 17) {
                        scene.remove(l.mesh);
                        lasers.splice(i, 1);
                    }
                }

                // Move Asteroids
                const asteroids = asteroidsRef.current;
                for (let i = asteroids.length - 1; i >= 0; i--) {
                    const a = asteroids[i];
                    a.mesh.position.y += a.yv * dt;
                    a.mesh.position.x += a.xv * dt;
                    a.mesh.rotation.x += a.rx * dt;
                    a.mesh.rotation.y += a.ry * dt;
                    a.mesh.rotation.z += a.rz * dt;
                    
                    if (a.mesh.position.y < -16) {
                        scene.remove(a.mesh);
                        asteroids.splice(i, 1);
                    }
                }

                // Lasers vs Asteroids Bounding collision segment
                for (let i = asteroids.length - 1; i >= 0; i--) {
                    const a = asteroids[i];
                    const aPos = a.mesh.position;
                    
                    for (let j = lasers.length - 1; j >= 0; j--) {
                        const l = lasers[j];
                        const dist = distToSegment(aPos, l.prevPosition, l.mesh.position);
                        if (dist < (a.radius + 0.15)) {
                            scene.remove(l.mesh);
                            lasers.splice(j, 1);
                            handleAsteroidHit(a, i);
                            break;
                        }
                    }
                }

                // Ship vs Asteroids Bounding Collision sphere
                for (let i = asteroids.length - 1; i >= 0; i--) {
                    const a = asteroids[i];
                    const aPos = a.mesh.position;
                    const shipPos = ship.position;
                    const dist = aPos.distanceTo(shipPos);
                    
                    if (dist < (a.radius + 0.8)) {
                        scene.remove(a.mesh);
                        asteroids.splice(i, 1);
                        
                        playShieldHitSound();
                        const damage = a.size === 3 ? 35 : a.size === 2 ? 20 : 10;
                        shieldRef.current = Math.max(0, shieldRef.current - damage);
                        setShield(shieldRef.current);
                        
                        consecutiveHitsRef.current = 0;
                        multiplierRef.current = 1;
                        setMultiplier(1);
                        
                        // Screen Shake triggers
                        shakeIntensityRef.current = 0.85;
                        shakeTimeRef.current = 0.45;
                        
                        particlesRef.current.spawnExplosion(shipPos.x, shipPos.y + 0.5, 0, 0xFFFFFF, 12, false);
                        particlesRef.current.spawnExplosion(shipPos.x, shipPos.y + 0.5, 0, 0xFF9900, 12, false);
                        
                        if (shieldRef.current <= 0) {
                            triggerGameOver();
                        }
                    }
                }
            }

            // Global particles & shake decay
            particlesRef.current.update(dt);
            if (shakeTimeRef.current > 0) {
                shakeTimeRef.current -= dt;
                const currentIntensity = (shakeTimeRef.current / 0.45) * shakeIntensityRef.current;
                camera.position.x = (Math.random() - 0.5) * currentIntensity;
                camera.position.z = 8 + (Math.random() - 0.5) * currentIntensity;
                camera.position.y = -18 + (Math.random() - 0.5) * currentIntensity;
            } else {
                camera.position.set(0, -18, 8);
            }

            renderer.render(scene, camera);
        };
        tick();

        // React Cleanup lifecycle (preventing memory leaks)
        return () => {
            cancelAnimationFrame(animationId);
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            window.removeEventListener('resize', handleResize);
            
            if (rendererRef.current) {
                rendererRef.current.dispose();
            }
            
            // Dispose of Three geometries and materials
            scene.traverse((object) => {
                if (object.isMesh) {
                    if (object.geometry) object.geometry.dispose();
                    if (object.material) {
                        if (Array.isArray(object.material)) {
                            object.material.forEach((mat) => mat.dispose());
                        } else {
                            object.material.dispose();
                        }
                    }
                }
            });
            
            // Close Web Audio Context
            if (audioCtxRef.current) {
                audioCtxRef.current.close();
            }
        };
    }, [canvasRef]);

    return {
        score,
        highScore,
        level,
        shield,
        multiplier,
        attemptsScores,
        survivalTimer,
        gameOver,
        gameStarted,
        isMuted,
        maxAttempts,
        startGame,
        toggleMute
    };
}