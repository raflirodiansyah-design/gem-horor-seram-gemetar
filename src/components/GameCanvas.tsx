import React, { useRef, useEffect, useState } from 'react';
import { globalAudio } from '../AudioEngine';
import { Player, Siren, GameItem, SonarPing, Particle, Obstacle, Position } from '../types';
import HUD from './HUD';

interface GameCanvasProps {
  difficulty: 'mudah' | 'normal' | 'sulit';
  onGameWon: (time: number) => void;
  onGameLost: (reason: 'SUREN' | 'OXYGEN' | '', time: number) => void;
}

export default function GameCanvas({ difficulty, onGameWon, onGameLost }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // States exposed to React HUD
  const [oxygen, setOxygen] = useState<number>(100);
  const [battery, setBattery] = useState<number>(100);
  const [itemsCollected, setItemsCollected] = useState<string[]>([]);
  const [stressLevel, setStressLevel] = useState<number>(0);
  const [sirenDistance, setSirenDistance] = useState<number>(9999);
  const [sonarActive, setSonarActive] = useState<boolean>(false);
  const [gameTime, setGameTime] = useState<number>(0);
  const [escapeReady, setEscapeReady] = useState<boolean>(false);
  const [distanceToEscape, setDistanceToEscape] = useState<number>(9999);

  // Gameplay Constants based on Difficulty
  const DIFFICULTY_SETTINGS = {
    mudah: {
      O2Depletion: 0.035, // O2 units lost per frame-tick
      batteryDepletion: 0.02,
      sirenPatrolSpeed: 1.1,
      sirenChaseSpeed: 2.2,
      maxItems: 5,
    },
    normal: {
      O2Depletion: 0.05,
      batteryDepletion: 0.033,
      sirenPatrolSpeed: 1.6,
      sirenChaseSpeed: 3.1,
      maxItems: 5,
    },
    sulit: {
      O2Depletion: 0.075,
      batteryDepletion: 0.052,
      sirenPatrolSpeed: 2.4,
      sirenChaseSpeed: 4.4,
      maxItems: 5,
    },
  };

  const currentSettings = DIFFICULTY_SETTINGS[difficulty];

  // Map Constants
  const MAP_SIZE = 2400; // 2400x2400 absolute coordinate board
  const ESCAPE_POD_POS: Position = { x: 1200, y: 1200 };

  // References to keep game loop variables perfectly updated without causing React re-renders which lag the canvas
  const keysStateRef = useRef<{ [key: string]: boolean }>({});
  const mouseStateRef = useRef<Position>({ x: 0, y: 0 });
  const viewportRef = useRef<{ width: number; height: number }>({ width: 800, height: 600 });
  const gameStatsRef = useRef({
    time: 0,
    startTime: Date.now(),
    lastFrameTime: Date.now(),
    isFinished: false,
    jumpscareStarted: false,
    jumpscareTimer: 0,
  });

  // Core Game Entities Refs (prevent double execution/stale scoping)
  const playerRef = useRef<Player>({
    x: 1200,
    y: 1200,
    vx: 0,
    vy: 0,
    angle: 0,
    oxygen: 100,
    battery: 100,
    itemsCollected: [],
    isDead: false,
    deathReason: '',
  });

  const sirenRef = useRef<Siren>({
    x: 400,
    y: 400,
    angle: 0,
    state: 'PATROL',
    targetX: 800,
    targetY: 800,
    speed: currentSettings.sirenPatrolSpeed,
    screechPlayed: false,
    wiggleTime: 0,
  });

  const itemsRef = useRef<GameItem[]>([]);
  const sonarPingsRef = useRef<SonarPing[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const obstaclesRef = useRef<Obstacle[]>([]);

  // 1. Initialise Map and Scatter Items & Obstacles once on load
  useEffect(() => {
    // Generate scattered items
    const parts = [
      { key: 'propeller', name: 'Baling-Baling Mesin', x: 250, y: 300 },
      { key: 'fuel', name: 'Aliran Sel Bahan Bakar', x: 2150, y: 350 },
      { key: 'transmitter', name: 'Antena Transmiter', x: 300, y: 2100 },
      { key: 'chip', name: 'Modul Navigasi GPS', x: 2100, y: 2050 },
      { key: 'core', name: 'Inti Baterai Utama', x: 1200, y: 200 },
    ];

    const generatedItems: GameItem[] = [];

    // Add escape pod parts
    parts.forEach(p => {
      generatedItems.push({
        id: p.key,
        name: p.name,
        type: 'PART',
        partName: p.key,
        iconName: 'PART',
        x: p.x,
        y: p.y,
        collected: false,
        pulseTime: Math.random() * 100,
      });
    });

    // Add scattered O2 Tanks and Batteries
    const fillerPositions: Position[] = [
      { x: 500, y: 800 }, { x: 1900, y: 700 }, { x: 750, y: 1650 }, { x: 1700, y: 1550 },
      { x: 1200, y: 1800 }, { x: 400, y: 1200 }, { x: 2000, y: 1200 }, { x: 1100, y: 650 },
      { x: 800, y: 400 }, { x: 1600, y: 400 }, { x: 1550, y: 2150 }, { x: 750, y: 2200 }
    ];

    fillerPositions.forEach((pos, idx) => {
      const type = idx % 2 === 0 ? 'OXYGEN' : 'BATTERY';
      generatedItems.push({
        id: `filler_${type}_${idx}`,
        name: type === 'OXYGEN' ? 'Tabung Suplai O₂' : 'Sel Baterai Tambahan',
        type: type,
        iconName: type,
        x: pos.x + (Math.random() * 80 - 40),
        y: pos.y + (Math.random() * 80 - 40),
        collected: false,
        pulseTime: Math.random() * 100,
      });
    });

    itemsRef.current = generatedItems;

    // Generate natural rocky obstacles (avoid central escape pod area)
    const generatedObstacles: Obstacle[] = [];
    
    // Add 4 huge circular sea mount blocks around the edges to act as creepy wall barriers
    generatedObstacles.push({ x: 900, y: 900, radius: 110, type: 'ROCK' });
    generatedObstacles.push({ x: 1500, y: 900, radius: 110, type: 'ROCK' });
    generatedObstacles.push({ x: 900, y: 1500, radius: 110, type: 'ROCK' });
    generatedObstacles.push({ x: 1500, y: 1500, radius: 110, type: 'ROCK' });

    // Add lots of smaller decorative rocks, wreckage and vent fields
    for (let i = 0; i < 35; i++) {
      let ox = Math.random() * (MAP_SIZE - 200) + 100;
      let oy = Math.random() * (MAP_SIZE - 200) + 100;
      
      // Keep away from center escape pod
      const distToCenter = Math.hypot(ox - ESCAPE_POD_POS.x, oy - ESCAPE_POD_POS.y);
      if (distToCenter > 180) {
        const typeRoll = Math.random();
        const type = typeRoll < 0.7 ? 'ROCK' : typeRoll < 0.9 ? 'WRECKAGE' : 'VENT';
        const rad = type === 'ROCK' ? Math.random() * 50 + 35 : type === 'WRECKAGE' ? 45 : 30;
        
        generatedObstacles.push({ x: ox, y: oy, radius: rad, type: type as any });
      }
    }

    obstaclesRef.current = generatedObstacles;

    // Trigger initial Web Audio items (ambient, deep sea hum)
    globalAudio.init();
    globalAudio.resume();
  }, [difficulty]);

  // 2. Setup resize listener and mouse tracker
  useEffect(() => {
    const handleResize = () => {
      if (!canvasRef.current || !containerRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      canvasRef.current.width = width;
      canvasRef.current.height = height;
      viewportRef.current = { width, height };
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial sizing

    // Mouse tracker within container
    const handleMouseMove = (e: MouseEvent) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      mouseStateRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };

    window.addEventListener('mousemove', handleMouseMove);

    // Keyboard controls registering
    const handleKeyDown = (e: KeyboardEvent) => {
      keysStateRef.current[e.key.toLowerCase()] = true;
      keysStateRef.current[e.code.toLowerCase()] = true;

      // Sonar triggers
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        triggerSonarPing();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysStateRef.current[e.key.toLowerCase()] = false;
      keysStateRef.current[e.code.toLowerCase()] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Clicking also triggers sonar
    const handleMouseDown = (e: MouseEvent) => {
      // Avoid firing sonar if clicked on a button
      const target = e.target as HTMLElement;
      if (target?.closest('button') || target?.closest('.pointer-events-auto')) {
        return;
      }
      triggerSonarPing();
    };

    window.addEventListener('mousedown', handleMouseDown);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);

  // 3. Play sound of Sonar Ping and register sonar position in game loop
  const triggerSonarPing = () => {
    if (playerRef.current.isDead || gameStatsRef.current.isFinished) return;
    
    // Check if cooldown allows a ping (no other ping or only allow one active ping wave)
    const hasActivePing = sonarPingsRef.current.some(p => p.active && p.radius < p.maxRadius * 0.4);
    if (hasActivePing) return;

    // Trigger Web Audio
    globalAudio.playSonarPing();

    // Trigger flare state for indicators
    setSonarActive(true);
    setTimeout(() => setSonarActive(false), 900);

    // Register active Sonar Ping wave starting from sub position
    sonarPingsRef.current.push({
      x: playerRef.current.x,
      y: playerRef.current.y,
      radius: 0,
      maxRadius: 850,
      alpha: 1,
      speed: 6.5,
      active: true,
    });

    // ALERT THE SIREN! Noise disturbance travels through water columns
    const distToSiren = Math.hypot(sirenRef.current.x - playerRef.current.x, sirenRef.current.y - playerRef.current.y);
    
    // Siren registers sound location
    if (sirenRef.current.state !== 'CHASE') {
      sirenRef.current.state = 'INVESTIGATE';
      sirenRef.current.targetX = playerRef.current.x + (Math.random() * 120 - 60);
      sirenRef.current.targetY = playerRef.current.y + (Math.random() * 120 - 60);
      sirenRef.current.speed = currentSettings.sirenPatrolSpeed * 1.55; // Swim faster to inspect noise
    } else {
      // If already chasing, this confirms exactly where the sub is!
      sirenRef.current.targetX = playerRef.current.x;
      sirenRef.current.targetY = playerRef.current.y;
    }

    // Spawn bubbles in player area due to high energy ping ripple
    for (let i = 0; i < 15; i++) {
      spawnBubbleParticle(playerRef.current.x, playerRef.current.y, Math.random() * 2 * Math.PI, Math.random() * 2 + 1);
    }
  };

  const spawnBubbleParticle = (x: number, y: number, angle: number, speed: number) => {
    particlesRef.current.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 0.25, // float upwards slightly
      size: Math.random() * 3 + 1.5,
      alpha: 0.75,
      color: `rgba(${175 + Math.random() * 80}, ${230 + Math.random() * 25}, 255, 0.7)`,
      life: 0,
      maxLife: Math.random() * 50 + 40,
    });
  };

  // 4. MAIN GAME LOOP (Canvas rendering + Physics updates)
  useEffect(() => {
    let animationId: number;

    const gameLoop = () => {
      const now = Date.now();
      const dt = now - gameStatsRef.current.lastFrameTime;
      gameStatsRef.current.lastFrameTime = now;

      // React Tick tracking (one update per thread second)
      const elapsedSec = Math.floor((now - gameStatsRef.current.startTime) / 1000);
      if (elapsedSec !== gameStatsRef.current.time && !playerRef.current.isDead) {
        gameStatsRef.current.time = elapsedSec;
        setGameTime(elapsedSec);
      }

      updateEntities();
      drawGame();

      animationId = requestAnimationFrame(gameLoop);
    };

    const updateEntities = () => {
      const p = playerRef.current;
      const s = sirenRef.current;

      // Handle Jumpscare state (locks player inputs)
      if (gameStatsRef.current.jumpscareStarted) {
        gameStatsRef.current.jumpscareTimer += 1;
        if (gameStatsRef.current.jumpscareTimer > 85) { // ~1.4 seconds
          gameStatsRef.current.jumpscareStarted = false;
          onGameLost('SUREN', gameStatsRef.current.time);
        }
        return;
      }

      if (p.isDead) return;

      // --- PLAYER UPDATES ---
      let moveX = 0;
      let moveY = 0;

      if (keysStateRef.current['w'] || keysStateRef.current['arrowup'] || keysStateRef.current['keyw']) moveY -= 1;
      if (keysStateRef.current['s'] || keysStateRef.current['arrowdown'] || keysStateRef.current['keys']) moveY += 1;
      if (keysStateRef.current['a'] || keysStateRef.current['arrowleft'] || keysStateRef.current['keya']) moveX -= 1;
      if (keysStateRef.current['d'] || keysStateRef.current['arrowright'] || keysStateRef.current['keyd']) moveX += 1;

      // Normalise movement vector
      let speed = 2.15; // sub maneuverability
      if (difficulty === 'sulit') speed = 2.0; // slightly sluggish under high pressure
      
      const length = Math.hypot(moveX, moveY);
      if (length > 0) {
        p.vx = (moveX / length) * speed;
        p.vy = (moveY / length) * speed;
        // Turn angle towards direction
        p.angle = Math.atan2(p.vy, p.vx);

        // Movement drains Oxygen slightly more + spawns fine thruster bubble particles
        p.oxygen -= currentSettings.O2Depletion * 1.15;
        if (Math.random() < 0.4) {
          // Spawn thruster trail bubble opposite to movement angle
          const oppositeAngle = p.angle + Math.PI + (Math.random() * 0.4 - 0.2);
          spawnBubbleParticle(p.x - Math.cos(p.angle) * 12, p.y - Math.sin(p.angle) * 12, oppositeAngle, 1.2);
        }

        // Inform engine hum pitches
        globalAudio.updateEngineActivity(0.9);
      } else {
        // Linear deceleration
        p.vx *= 0.82;
        p.vy *= 0.82;
        p.oxygen -= currentSettings.O2Depletion * 0.85;

        globalAudio.updateEngineActivity(0.0);
      }

      // Constantly deplete Flashlight battery
      if (p.battery > 0) {
        p.battery -= currentSettings.batteryDepletion;
        if (p.battery <= 0) {
          p.battery = 0;
          globalAudio.playStaticCrackle(); // battery fade static
        }
      }

      // Apply movement vectors
      p.x += p.vx;
      p.y += p.vy;

      // Limit sub bounds to map
      if (p.x < 35) { p.x = 35; p.vx = 0; }
      if (p.x > MAP_SIZE - 35) { p.x = MAP_SIZE - 35; p.vx = 0; }
      if (p.y < 35) { p.y = 35; p.vy = 0; }
      if (p.y > MAP_SIZE - 35) { p.y = MAP_SIZE - 35; p.vy = 0; }

      // Map obstacles collision check
      obstaclesRef.current.forEach((obs) => {
        const dist = Math.hypot(p.x - obs.x, p.y - obs.y);
        const minDist = obs.radius + 15; // 15 is sub bounding radius
        if (dist < minDist) {
          // Push back player out of obstacle
          const pushAngle = Math.atan2(p.y - obs.y, p.x - obs.x);
          p.x = obs.x + Math.cos(pushAngle) * minDist;
          p.y = obs.y + Math.sin(pushAngle) * minDist;
          p.vx = 0;
          p.vy = 0;
        }

        // Spawn geyser bubble streams if they are hydrothermal vents
        if (obs.type === 'VENT' && Math.random() < 0.08) {
          spawnBubbleParticle(obs.x + (Math.random() * 12 - 6), obs.y, -Math.PI/2 - (Math.random() * 0.3 - 0.15), Math.random() * 3 + 2);
        }
      });

      // Update and push exposure states
      setOxygen(Math.max(0, p.oxygen));
      setBattery(Math.max(0, p.battery));

      // Oxygen Depleter Death condition
      if (p.oxygen <= 0) {
        p.isDead = true;
        p.deathReason = 'OXYGEN';
        onGameLost('OXYGEN', gameStatsRef.current.time);
        return;
      }

      // Distance to core escape pod coordinates
      const currentDistToPod = Math.hypot(p.x - ESCAPE_POD_POS.x, p.y - ESCAPE_POD_POS.y);
      setDistanceToEscape(currentDistToPod);

      // VICTORY ESCAPE CONDITION: If escape pod ready (all 5 parts gathered) and players returns to center!
      if (escapeReady && currentDistToPod < 40) {
        gameStatsRef.current.isFinished = true;
        onGameWon(gameStatsRef.current.time);
        return;
      }

      // --- ITEM COLLECTION ---
      itemsRef.current.forEach((item) => {
        if (item.collected) return;

        const dist = Math.hypot(p.x - item.x, p.y - item.y);
        if (dist < 32) {
          item.collected = true;

          if (item.type === 'PART') {
            globalAudio.playPickup('PART');
            const collectedList = [...p.itemsCollected, item.id];
            p.itemsCollected = collectedList;
            setItemsCollected(collectedList);

            // Spawn radiant happy glitter particles on pickup
            for (let i = 0; i < 25; i++) {
              particlesRef.current.push({
                x: item.x,
                y: item.y,
                vx: Math.cos(Math.random() * 2 * Math.PI) * (Math.random() * 4 + 1),
                vy: Math.sin(Math.random() * 2 * Math.PI) * (Math.random() * 4 + 1),
                size: Math.random() * 4 + 2,
                alpha: 1,
                color: '#38bdf8', // beautiful bright sky-blue
                life: 0,
                maxLife: 45,
              });
            }

            // Check if all 5 parts are gathered
            if (collectedList.length === 5) {
              setEscapeReady(true);
            }
          } else if (item.type === 'OXYGEN') {
            globalAudio.playPickup('REFILL');
            p.oxygen = Math.min(100, p.oxygen + 35); // 35% refill O2
            setOxygen(p.oxygen);
          } else if (item.type === 'BATTERY') {
            globalAudio.playPickup('REFILL');
            p.battery = Math.min(100, p.battery + 50); // 50% battery refill
            setBattery(p.battery);
          }
        }
      });

      // --- SIREN (THE MERMAID) AI ENGINE ---
      const sirenDist = Math.hypot(s.x - p.x, s.y - p.y);
      setSirenDistance(sirenDist);

      s.wiggleTime += 0.22; // for tail movement animation

      // Calculate Stress Intensity based on distance
      // Stress starts at 300px away and goes to 100% when right on top
      const panicRadius = 600;
      let stress = 0;
      if (sirenDist < panicRadius) {
        stress = (panicRadius - sirenDist) / panicRadius;
      }
      setStressLevel(stress);
      globalAudio.setThreatLevel(stress);

      // Play jumpscare and initiate death if she catches you!
      if (sirenDist < 36 && !p.isDead) {
        p.isDead = true;
        gameStatsRef.current.jumpscareStarted = true;
        gameStatsRef.current.jumpscareTimer = 0;
        globalAudio.playJumpscare();
        return;
      }

      // State transitions for Siren
      const sightRadius = 250; // default sight line in dark water
      const hearRadius = 450;  // hearing sensitivity
      
      const pMovementSpeed = Math.hypot(p.vx, p.vy);

      if (s.state === 'PATROL') {
        // Can she catch sight of the player?
        // Flashlight points in a certain direction - she also notices if player gets close
        if (sirenDist < sightRadius || (sirenDist < hearRadius && pMovementSpeed > 1.8)) {
          s.state = 'CHASE';
          s.screechPlayed = false;
        } else {
          // Patrol - swim slowly to target node
          const distToSirenTarget = Math.hypot(s.x - s.targetX, s.y - s.targetY);
          if (distToSirenTarget < 25) {
            // Pick a new scattered item location to patrol around
            const randomItem = itemsRef.current[Math.floor(Math.random() * itemsRef.current.length)];
            s.targetX = randomItem.x + (Math.random() * 200 - 100);
            s.targetY = randomItem.y + (Math.random() * 200 - 100);
          }

          // Steer towards target PATROL coordinates
          s.speed = currentSettings.sirenPatrolSpeed;
          steerSirenTowards(s.targetX, s.targetY, s.speed);
        }
      } 
      else if (s.state === 'INVESTIGATE') {
        const distToInspect = Math.hypot(s.x - s.targetX, s.y - s.targetY);
        
        // Did she see or hear the sub while driving to investigate location?
        if (sirenDist < sightRadius || (sirenDist < hearRadius && pMovementSpeed > 1.8)) {
          s.state = 'CHASE';
          s.screechPlayed = false;
        } else if (distToInspect < 30) {
          // Finished inspecting noise, go back to patrol after standard timeout
          s.state = 'PATROL';
        } else {
          // Swim towards investigate target noise coordinates
          s.speed = currentSettings.sirenPatrolSpeed * 1.55;
          steerSirenTowards(s.targetX, s.targetY, s.speed);
        }
      } 
      else if (s.state === 'CHASE') {
        // High pitched scream synth on discovery
        if (!s.screechPlayed) {
          globalAudio.playSirenScreech();
          s.screechPlayed = true;

          // Scream triggers bubbles around Siren face!
          for (let i = 0; i < 18; i++) {
            spawnBubbleParticle(s.x, s.y, Math.random() * 2 * Math.PI, Math.random() * 3 + 1.5);
          }
        }

        // Relentlessly chase direct sub coordinates!
        s.targetX = p.x;
        s.targetY = p.y;
        s.speed = currentSettings.sirenChaseSpeed;
        steerSirenTowards(s.targetX, s.targetY, s.speed);

        // Flashlight flickering if she is super close (flashlight battery anomalies)
        if (sirenDist < 160 && Math.random() < 0.12) {
          globalAudio.playStaticCrackle();
        }

        // Lost sub coordinates? If player stops moving and flashlight battery goes out, she might lose track
        if (sirenDist > 750) {
          s.state = 'PATROL';
        }
      }

      // --- SONAR PINGS & PARTICLE UPDATES ---
      sonarPingsRef.current.forEach((ping) => {
        if (!ping.active) return;
        ping.radius += ping.speed;
        ping.alpha = 1 - (ping.radius / ping.maxRadius);

        if (ping.radius >= ping.maxRadius) {
          ping.active = false;
        }
      });
      sonarPingsRef.current = sonarPingsRef.current.filter((p) => p.active);

      particlesRef.current.forEach((part) => {
        part.life += 1;
        part.x += part.vx;
        part.y += part.vy;
        part.alpha = 1 - (part.life / part.maxLife);
      });
      particlesRef.current = particlesRef.current.filter((p) => p.life < p.maxLife);
    };

    const steerSirenTowards = (tx: number, ty: number, speed: number) => {
      const s = sirenRef.current;
      const angleToTarget = Math.atan2(ty - s.y, tx - s.x);
      
      // Interpolate angle for smooth turns
      const angleDiff = angleToTarget - s.angle;
      // Normalise angle diff into [-PI, PI]
      const normalisedDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));
      s.angle += normalisedDiff * 0.08; // smooth turn factor

      // Move forward in facing direction
      s.x += Math.cos(s.angle) * speed;
      s.y += Math.sin(s.angle) * speed;
    };

    // Begin Loop
    animationId = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [difficulty, escapeReady]);

  // --- RENDERING CANVAS DRAW CODE ---
  const drawGame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const p = playerRef.current;
    const s = sirenRef.current;
    const v = viewportRef.current;

    // 1. Camera Calculations (keeps player centered, offsets map rendering)
    const camX = p.x - v.width / 2;
    const camY = p.y - v.height / 2;

    // Clear Screen with deep midnight blue
    ctx.fillStyle = '#010515';
    ctx.fillRect(0, 0, v.width, v.height);

    // Grid details for seabed (adds visual sense of movement and speed)
    ctx.save();
    ctx.strokeStyle = '#02183a';
    ctx.lineWidth = 1;
    const gridSpacing = 80;
    const startX = -camX % gridSpacing;
    const startY = -camY % gridSpacing;

    for (let x = startX; x < v.width; x += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, v.height);
      ctx.stroke();
    }
    for (let y = startY; y < v.height; y += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(v.width, y);
      ctx.stroke();
    }
    ctx.restore();

    // Map Boundaries box showing warning lines at edges
    ctx.save();
    ctx.strokeStyle = '#e11d48';
    ctx.lineWidth = 4;
    ctx.setLineDash([12, 12]);
    ctx.beginPath();
    ctx.rect(-camX, -camY, MAP_SIZE, MAP_SIZE);
    ctx.stroke();
    ctx.restore();

    // Draw Ocean bottom terrain assets: Geothermal glowing Vent cores, kelps, rocky ridges
    obstaclesRef.current.forEach((obs) => {
      // Calculate screen coordinates
      const sx = obs.x - camX;
      const sy = obs.y - camY;

      // Only draw if inside viewport limits
      if (sx > -obs.radius && sx < v.width + obs.radius && sy > -obs.radius && sy < v.height + obs.radius) {
        ctx.save();

        if (obs.type === 'ROCK') {
          // Draw a rugged dark rocky mound
          ctx.fillStyle = '#081329';
          ctx.strokeStyle = '#112240';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(sx, sy, obs.radius, 0, 2 * Math.PI);
          ctx.fill();
          ctx.stroke();

          // Rocky ridges texture
          ctx.strokeStyle = '#1d4ed8/20';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(sx - 10, sy - 10, obs.radius * 0.7, 0, Math.PI, true);
          ctx.stroke();
        } 
        else if (obs.type === 'WRECKAGE') {
          // Steel rusted metal wreckage
          ctx.fillStyle = '#0e1726';
          ctx.strokeStyle = '#b45309'; // rusted color
          ctx.lineWidth = 2.5;
          ctx.fillRect(sx - obs.radius/2, sy - obs.radius/2, obs.radius, obs.radius);
          ctx.strokeRect(sx - obs.radius/2, sy - obs.radius/2, obs.radius, obs.radius);
          
          // Broken metal truss lines
          ctx.beginPath();
          ctx.moveTo(sx - obs.radius/2, sy - obs.radius/2);
          ctx.lineTo(sx + obs.radius/2, sy + obs.radius/2);
          ctx.moveTo(sx + obs.radius/2, sy - obs.radius/2);
          ctx.lineTo(sx - obs.radius/2, sy + obs.radius/2);
          ctx.stroke();
        } 
        else if (obs.type === 'VENT') {
          // Thermal geyser vent
          ctx.fillStyle = '#0b1329';
          ctx.strokeStyle = '#06b6d4'; // glowing neon blue
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(sx, sy, obs.radius, 0, 2 * Math.PI);
          ctx.fill();
          ctx.stroke();

          // Thermal core glow pulsing
          const glowRad = obs.radius * 0.5 + Math.sin(Date.now() / 200) * 3;
          const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, glowRad);
          grad.addColorStop(0, '#06b6d4');
          grad.addColorStop(0.5, 'rgba(6, 182, 212, 0.4)');
          grad.addColorStop(1, 'rgba(6, 182, 212, 0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(sx, sy, glowRad, 0, 2 * Math.PI);
          ctx.fill();
        }
        ctx.restore();
      }
    });

    // Draw Escape Pod Dock coordinates at 1200, 1200
    ctx.save();
    const podScreenX = ESCAPE_POD_POS.x - camX;
    const podScreenY = ESCAPE_POD_POS.y - camY;
    
    // Draw base ring
    ctx.strokeStyle = escapeReady ? '#10b981' : '#38bdf8';
    ctx.lineWidth = 3;
    ctx.setLineDash(escapeReady ? [] : [6, 4]);
    ctx.beginPath();
    ctx.arc(podScreenX, podScreenY, 65, 0, 2 * Math.PI);
    ctx.stroke();

    // Outer glow pulse
    const podPulse = 65 + Math.sin(Date.now() / 150) * 8;
    const podGrad = ctx.createRadialGradient(podScreenX, podScreenY, 15, podScreenX, podScreenY, podPulse);
    podGrad.addColorStop(0, escapeReady ? 'rgba(16, 185, 129, 0.3)' : 'rgba(56, 189, 248, 0.15)');
    podGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = podGrad;
    ctx.beginPath();
    ctx.arc(podScreenX, podScreenY, podPulse, 0, 2 * Math.PI);
    ctx.fill();

    // Steel Pod capsule structure
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = escapeReady ? '#34d399' : '#0ea5e9';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(podScreenX, podScreenY, 24, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();

    // Core generator pulse dot
    ctx.fillStyle = escapeReady ? '#10b981' : '#f59e0b';
    ctx.beginPath();
    ctx.arc(podScreenX, podScreenY, 6 + Math.sin(Date.now() / 100) * 2, 0, 2 * Math.PI);
    ctx.fill();

    // Escape pod text
    ctx.fillStyle = escapeReady ? '#34d399' : '#38bdf8';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('ESCAPE POD [DOCK 9]', podScreenX, podScreenY - 35);
    ctx.restore();

    // Draw Scattered Items (Modules / Refills)
    itemsRef.current.forEach((item) => {
      if (item.collected) return;

      const sx = item.x - camX;
      const sy = item.y - camY;

      // Only draw if inside viewport
      if (sx > -40 && sx < v.width + 40 && sy > -40 && sy < v.height + 40) {
        ctx.save();

        item.pulseTime += 0.05;
        const bounce = Math.sin(item.pulseTime) * 4;

        if (item.type === 'PART') {
          // Drawing high-importance sub component modules with cyan laser beams pointing up
          ctx.shadowBlur = 12;
          ctx.shadowColor = '#06b6d4';
          
          // Outer halo ring
          ctx.strokeStyle = 'rgba(6, 182, 212, 0.45)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(sx, sy + bounce, 18, 0, 2 * Math.PI);
          ctx.stroke();

          // Steel hex casing
          ctx.fillStyle = '#1a2333';
          ctx.strokeStyle = '#06b6d4';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(sx, sy + bounce, 12, 0, 2 * Math.PI);
          ctx.fill();
          ctx.stroke();

          // Golden inner processor unit
          ctx.fillStyle = '#eab308';
          ctx.beginPath();
          ctx.arc(sx, sy + bounce, 5, 0, 2 * Math.PI);
          ctx.fill();

          // Text labels hovering
          ctx.shadowBlur = 0;
          ctx.fillStyle = '#67e8f9';
          ctx.font = 'bold 9px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(item.name.toUpperCase(), sx, sy + bounce - 20);
        } 
        else if (item.type === 'OXYGEN') {
          // Green glowing oxygen tank
          ctx.fillStyle = '#052e16';
          ctx.strokeStyle = '#10b981';
          ctx.lineWidth = 2;
          ctx.fillRect(sx - 5, sy - 11 + bounce, 10, 22);
          ctx.strokeRect(sx - 5, sy - 11 + bounce, 10, 22);

          // Valve cap
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(sx - 3, sy - 15 + bounce, 6, 4);

          // Label
          ctx.fillStyle = '#a7f3d0';
          ctx.font = '700 8px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('+OXYGEN', sx, sy + bounce - 18);
        } 
        else if (item.type === 'BATTERY') {
          // Yellow electric battery pack
          ctx.fillStyle = '#451a03';
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 2;
          
          ctx.beginPath();
          ctx.roundRect(sx - 7, sy - 9 + bounce, 14, 18, 3);
          ctx.fill();
          ctx.stroke();

          // Electrode brass caps
          ctx.fillStyle = '#fbbf24';
          ctx.fillRect(sx - 4, sy - 12 + bounce, 3, 3);
          ctx.fillRect(sx + 1, sy - 12 + bounce, 3, 3);

          // Energy Bolt Graphic
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(sx - 2, sy - 3 + bounce);
          ctx.lineTo(sx + 2, sy + bounce);
          ctx.lineTo(sx - 2, sy + bounce);
          ctx.lineTo(sx + 2, sy + 3 + bounce);
          ctx.stroke();

          // Label
          ctx.fillStyle = '#fde047';
          ctx.font = '700 8px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('+BATTERY', sx, sy + bounce - 15);
        }

        ctx.restore();
      }
    });

    // Draw Particles (bubbles, sparks, flares)
    particlesRef.current.forEach((part) => {
      const sx = part.x - camX;
      const sy = part.y - camY;

      if (sx > 0 && sx < v.width && sy > 0 && sy < v.height) {
        ctx.save();
        ctx.fillStyle = part.color;
        ctx.globalAlpha = part.alpha;
        ctx.beginPath();
        ctx.arc(sx, sy, part.size, 0, 2 * Math.PI);
        ctx.fill();
        ctx.restore();
      }
    });

    // Draw Sonar Radar Ping expanding outline waves
    sonarPingsRef.current.forEach((ping) => {
      if (!ping.active) return;
      const sx = ping.x - camX;
      const sy = ping.y - camY;

      ctx.save();
      ctx.strokeStyle = `rgba(14, 165, 233, ${ping.alpha})`;
      ctx.lineWidth = 2.5;
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#0284c7';
      ctx.beginPath();
      ctx.arc(sx, sy, ping.radius, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.restore();
    });

    // --- DRAW SIREN (THE SCARY MERMAID) ---
    const ssx = s.x - camX;
    const ssy = s.y - camY;
    
    // Only render Siren if inside viewport
    const isInViewport = ssx > -150 && ssx < v.width + 150 && ssy > -150 && ssy < v.height + 150;
    if (isInViewport) {
      ctx.save();

      // Slightly vibrate her position if she is in CHASE mode for visual intensity
      let rx = ssx;
      let ry = ssy;
      if (s.state === 'CHASE') {
        rx += Math.random() * 3 - 1.5;
        ry += Math.random() * 3 - 1.5;
      }

      ctx.translate(rx, ry);
      ctx.rotate(s.angle);

      // SKELETAL MERMAID AQUATIC TAIL swing pathing
      ctx.beginPath();
      ctx.strokeStyle = s.state === 'CHASE' ? '#991b1b' : '#0d9488'; // deep neon green/cyan vs reddish chase tail
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      // Draw standard double sine curve for skeletal writhing tail
      const tailSegmentLength = 10;
      ctx.moveTo(0, 0);
      for (let i = 1; i <= 6; i++) {
        const segX = -i * tailSegmentLength;
        const segY = Math.sin(s.wiggleTime + i * 0.7) * (11 - i * 1.5);
        ctx.lineTo(segX, segY);
      }
      ctx.stroke();

      // Big creepy translucent turquoise tail fins
      const lastFinX = -6 * tailSegmentLength;
      const lastFinY = Math.sin(s.wiggleTime + 6 * 0.7) * (11 - 6 * 1.5);
      
      ctx.fillStyle = s.state === 'CHASE' ? 'rgba(239, 68, 68, 0.45)' : 'rgba(13, 148, 136, 0.4)';
      ctx.beginPath();
      ctx.moveTo(lastFinX, lastFinY);
      ctx.bezierCurveTo(lastFinX - 15, lastFinY - 20, lastFinX - 35, lastFinY - 10, lastFinX - 30, lastFinY);
      ctx.bezierCurveTo(lastFinX - 35, lastFinY + 10, lastFinX - 15, lastFinY + 20, lastFinX, lastFinY);
      ctx.fill();

      // Draw Mermaid Torso
      ctx.fillStyle = '#475569'; // grey corpse pallor
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1.5;
      
      ctx.beginPath();
      ctx.ellipse(-5, 0, 15, 8, 0, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();

      // Scary skeletal webbed arms
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2.5;
      // Left shoulder/arm
      ctx.beginPath();
      ctx.moveTo(-5, -6);
      ctx.lineTo(8, -14);
      ctx.lineTo(16, -18); // claws pointing forward
      ctx.stroke();
      // Right shoulder/arm
      ctx.beginPath();
      ctx.moveTo(-5, 6);
      ctx.lineTo(8, 14);
      ctx.lineTo(16, 18);
      ctx.stroke();

      // Tiny sharp fingernail claws
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(16, -18, 1.5, 0, 2 * Math.PI);
      ctx.arc(16, 18, 1.5, 0, 2 * Math.PI);
      ctx.fill();

      // Deep sea messy floating hair (drags backward from movement vector)
      ctx.fillStyle = '#061a0f'; // very dark forest green/black hair
      ctx.beginPath();
      ctx.moveTo(-16, -8);
      ctx.bezierCurveTo(-38, -16, -42, -5, -35, 0);
      ctx.bezierCurveTo(-42, 5, -38, 16, -16, 8);
      ctx.closePath();
      ctx.fill();

      // Siren Head sphere
      ctx.fillStyle = '#64748b'; // stone skin
      ctx.beginPath();
      ctx.arc(5, 0, 7.5, 0, 2 * Math.PI);
      ctx.fill();

      // Sharp razor-tooth grinning mouth
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 0.82;
      ctx.beginPath();
      ctx.moveTo(6, -3);
      ctx.lineTo(11, -1);
      ctx.lineTo(6, 1);
      ctx.stroke();

      // GLOWING EVIL RED/CYAN HORROR EYES
      ctx.fillStyle = s.state === 'CHASE' ? '#ef4444' : '#06b6d4'; // Glowing red eyes under chase!
      ctx.shadowBlur = 10;
      ctx.shadowColor = s.state === 'CHASE' ? '#ef4444' : '#06b6d4';
      ctx.beginPath();
      ctx.arc(8, -2.5, 2, 0, 2 * Math.PI);
      ctx.arc(8, 2.5, 2, 0, 2 * Math.PI);
      ctx.fill();

      ctx.restore();
    }

    // --- DRAW EXPLORATION SUBMARINE (THE PLAYER) ---
    const psx = p.x - camX;
    const psy = p.y - camY;
    
    ctx.save();
    ctx.translate(psx, psy);
    ctx.rotate(p.angle);

    // Glowing thruster engine flame
    if (Math.hypot(p.vx, p.vy) > 0.4) {
      const thrusterLength = 12 + Math.sin(Date.now() / 40) * 5;
      const tGrad = ctx.createLinearGradient(-15, 0, -15 - thrusterLength, 0);
      tGrad.addColorStop(0, '#f97316'); // intense orange
      tGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
      ctx.fillStyle = tGrad;
      ctx.beginPath();
      ctx.moveTo(-12, -4);
      ctx.lineTo(-12 - thrusterLength, 0);
      ctx.lineTo(-12, 4);
      ctx.closePath();
      ctx.fill();
    }

    // Steel Sub Casing (Submarine Body pod)
    ctx.fillStyle = '#1e3a8a'; // heavy naval blue
    ctx.strokeStyle = '#60a5fa'; // neon light trim
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, 13, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();

    // Side thruster pods
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(-12, -15, 6, 4);
    ctx.fillRect(-12, 11, 6, 4);

    // Front glowing bubble inspection windshield dome
    ctx.fillStyle = 'rgba(191, 219, 254, 0.7)';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(5, 0, 7, 7, 0, -Math.PI/2, Math.PI/2);
    ctx.fill();
    ctx.stroke();

    // Inner steering dashboard dot
    ctx.fillStyle = '#22c55e'; // glowing green radar panel
    ctx.beginPath();
    ctx.arc(0, 0, 2, 0, 2 * Math.PI);
    ctx.fill();

    ctx.restore();

    // --- 5. IMMERSIVE DYNAMIC DARK MASK & FLASHLIGHT SYSTEM ---
    // Create creepy flashlight shadows
    ctx.save();
    
    // Create dark masking overlay
    const overlay = document.createElement('canvas');
    overlay.width = v.width;
    overlay.height = v.height;
    const oCtx = overlay.getContext('2d');
    if (oCtx) {
      // Background tone of almost solid ocean dark (#010515 with high density opacity)
      oCtx.fillStyle = '#010515';
      oCtx.fillRect(0, 0, v.width, v.height);

      // Flashlight parameters
      const mouseRelativeX = mouseStateRef.current.x;
      const mouseRelativeY = mouseStateRef.current.y;
      
      // Compute angle between sub cockpit on screen and mouse relative position
      const flashlightAngle = Math.atan2(mouseRelativeY - psy, mouseRelativeX - psx);

      // We slice out circles around player and cone of flashlight using composite modes
      oCtx.globalCompositeOperation = 'destination-out';

      // A. Small radius dim circular ambient glow immediately around sub cockpit
      const subAmbientRadius = p.battery > 0 ? 35 : 16; // tiny 16px lock of vision if dead battery
      const subAmbientGrad = oCtx.createRadialGradient(psx, psy, 0, psx, psy, subAmbientRadius);
      subAmbientGrad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
      subAmbientGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.55)');
      subAmbientGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      oCtx.fillStyle = subAmbientGrad;
      oCtx.beginPath();
      oCtx.arc(psx, psy, subAmbientRadius, 0, 2 * Math.PI);
      oCtx.fill();

      // B. Main Flashlight Cone (Only if battery has charge remaining!)
      if (p.battery > 0) {
        // We simulate dynamic flutters if Stress levels are high (creepy flickering senter)
        let flickerFactor = 1.0;
        if (stressLevel > 0.65 && Math.random() < 0.1) {
          flickerFactor = 0.15; // sudden pitch down
        }

        if (flickerFactor > 0.2) {
          const coneRange = 290; // depth range of sub beam
          const coneWidthAngle = 0.55; // 0.55 rad width (~31 deg)

          oCtx.beginPath();
          oCtx.moveTo(psx, psy);
          
          // Flashlight sweep vectors
          const rightBeamX = psx + Math.cos(flashlightAngle + coneWidthAngle / 2) * coneRange;
          const rightBeamY = psy + Math.sin(flashlightAngle + coneWidthAngle / 2) * coneRange;
          const leftBeamX = psx + Math.cos(flashlightAngle - coneWidthAngle / 2) * coneRange;
          const leftBeamY = psy + Math.sin(flashlightAngle - coneWidthAngle / 2) * coneRange;

          // Draw the triangle cone
          oCtx.lineTo(rightBeamX, rightBeamY);
          
          // Draw arc facing the beam
          oCtx.arc(psx, psy, coneRange, flashlightAngle + coneWidthAngle / 2, flashlightAngle - coneWidthAngle / 2, true);
          oCtx.lineTo(psx, psy);
          oCtx.closePath();

          // Apply a radial gradient to fade out flashlight cone with depth distance
          const coneGrad = oCtx.createRadialGradient(psx, psy, 15, psx, psy, coneRange);
          coneGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
          coneGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.45)');
          coneGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

          oCtx.fillStyle = coneGrad;
          oCtx.fill();
        }
      }

      // C. Sonar Wave revealing elements - we subtract (slice out) circles centered at the sub
      // corresponding to the active wavefront positions so that the sonar ripple exposes terrain!
      sonarPingsRef.current.forEach((ping) => {
        if (!ping.active) return;
        const sPpsx = ping.x - camX;
        const sPpsy = ping.y - camY;

        // Sonar ripple rings slice out the darkness momentarily
        const bandWidth = 45; // ripple light band width
        const pingGrad = oCtx.createRadialGradient(
          sPpsx, sPpsy, Math.max(0, ping.radius - bandWidth),
          sPpsx, sPpsy, ping.radius + 3
        );
        pingGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
        pingGrad.addColorStop(0.5, `rgba(255, 255, 255, ${0.85 * ping.alpha})`); // glowing wavefront
        pingGrad.addColorStop(0.9, `rgba(255, 255, 255, ${0.2 * ping.alpha})`);
        pingGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

        oCtx.fillStyle = pingGrad;
        oCtx.beginPath();
        oCtx.arc(sPpsx, sPpsy, ping.radius + 5, 0, 2 * Math.PI);
        oCtx.fill();
      });

      // D. Draw glow on geothermal hydrothermal vents since they are hot cyan spots
      obstaclesRef.current.forEach((obs) => {
        if (obs.type === 'VENT') {
          const vsx = obs.x - camX;
          const vsy = obs.y - camY;

          const ventLightGrad = oCtx.createRadialGradient(vsx, vsy, 0, vsx, vsy, obs.radius * 2);
          ventLightGrad.addColorStop(0, 'rgba(255, 255, 255, 0.7)');
          ventLightGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

          oCtx.fillStyle = ventLightGrad;
          oCtx.beginPath();
          oCtx.arc(vsx, vsy, obs.radius * 2, 0, 2 * Math.PI);
          oCtx.fill();
        }
      });

      // Draw overlay canvas onto main viewport
      ctx.drawImage(overlay, 0, 0);
    }
    ctx.restore();

    // Draw compass coordinates in HUD display circles directly on Canvas margins
    ctx.save();
    ctx.fillStyle = 'rgba(14, 165, 233, 0.65)';
    ctx.font = '8px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`SUB_X: ${p.x.toFixed(1)}m | SUB_Y: ${p.y.toFixed(1)}m`, v.width - 24, v.height - 24);
    ctx.restore();

    // --- 6. TRIGGER THE JUMPSCARE FULL-SCREEN OVERLAY GRAPHICS ---
    if (gameStatsRef.current.jumpscareStarted) {
      ctx.save();
      
      // Shaking screen displacement
      const shakeX = Math.random() * 30 - 15;
      const shakeY = Math.random() * 30 - 15;
      ctx.translate(shakeX, shakeY);

      // Huge terrifying screaming Siren face close up vector graphics
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, v.width, v.height);

      // Digital static lines
      for (let i = 0; i < v.height; i += 4) {
        if (Math.random() < 0.45) {
          ctx.fillStyle = 'rgba(255, 0, 0, 0.08)';
          ctx.fillRect(0, i, v.width, 1.5);
        }
      }

      const centerX = v.width / 2;
      const centerY = v.height / 2;

      // Draw massive skeletal face silhouette
      ctx.fillStyle = '#1e293b'; // pale corpselike skin
      ctx.beginPath();
      ctx.ellipse(centerX, centerY - 20, 150, 200, 0, 0, 2 * Math.PI);
      ctx.fill();

      // Sharp skeletal teeth stretching
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      // Massive open throat circle first
      ctx.arc(centerX, centerY + 30, 45, 0, 2 * Math.PI);
      ctx.fill();
      
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(centerX, centerY + 30, 41, 0, 2 * Math.PI);
      ctx.fill();

      // Sharp pointed teeth lines
      ctx.fillStyle = '#ffffff';
      for (let angle = 0; angle < 2 * Math.PI; angle += 0.28) {
        const tx = centerX + Math.cos(angle) * 41;
        const ty = centerY + 30 + Math.sin(angle) * 41;
        const tipX = centerX + Math.cos(angle) * (33 + Math.random() * 8);
        const tipY = centerY + 30 + Math.sin(angle) * (33 + Math.random() * 8);

        ctx.beginPath();
        ctx.moveTo(tx - 3, ty);
        ctx.lineTo(tipX, tipY);
        ctx.lineTo(tx + 3, ty);
        ctx.closePath();
        ctx.fill();
      }

      // Screaming eyes glowing blood red with flares
      ctx.fillStyle = '#dc2626';
      ctx.shadowBlur = 45;
      ctx.shadowColor = '#ef4444';
      
      ctx.beginPath();
      ctx.ellipse(centerX - 55, centerY - 50, 18, 10, 0, 0, 2 * Math.PI);
      ctx.ellipse(centerX + 55, centerY - 50, 18, 10, 0, 0, 2 * Math.PI);
      ctx.fill();

      // Small glowing pupils
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(centerX - 55, centerY - 50, 4, 0, 2 * Math.PI);
      ctx.arc(centerX + 55, centerY - 50, 4, 0, 2 * Math.PI);
      ctx.fill();

      // Messy pitch black hair flowing to edges
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#03170d';
      for (let i = 0; i < 24; i++) {
        const hairAngle = Math.random() * 2 * Math.PI;
         ctx.beginPath();
         ctx.ellipse(centerX + Math.cos(hairAngle) * 160, centerY - 20 + Math.sin(hairAngle) * 120, 70, 80, 0, 0, 2 * Math.PI);
         ctx.fill();
      }

      // Heavy Blood Vignette flash
      ctx.fillStyle = 'rgba(239, 68, 68, 0.45)';
      ctx.fillRect(0, 0, v.width, v.height);

      ctx.restore();
    }
  };

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden bg-slate-950">
      
      <canvas ref={canvasRef} className="w-full h-full block z-0" />

      {/* Embedded HUD with mapped telemetry */}
      <HUD
        oxygen={oxygen}
        battery={battery}
        itemsCollected={itemsCollected}
        totalParts={DIFFICULTY_SETTINGS[difficulty].maxItems}
        stressLevel={stressLevel}
        sirenDistance={sirenDistance}
        sonarPings={[]}
        escapeReady={escapeReady}
        gameTime={gameTime}
        difficulty={difficulty}
        sonarActive={sonarActive}
        distanceToEscapePod={distanceToEscape}
      />

    </div>
  );
}
