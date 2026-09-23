import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Text, Billboard } from '@react-three/drei';
import { Flag } from 'lucide-react';
import * as THREE from 'three';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store/useAppStore';
import { getSpinTimeRanges } from '../../utils/spinUtils';
import { useWheelData } from '../../hooks/useWheelData';
import { useWheelActions, playRaceDefinedAudio } from '../../hooks/useWheelActions';
import { playStartLightBeep, playLightsOutGoSound, playEngineRevBeep, playWinSound, updateRaceEngineAudio, updateTireSquealAudio, playKerbImpactSound, stopRaceAudio } from '../../utils/audioEngine';
import { RACE_START_DELAY_MS } from '../../constants';

const TOTAL_LAPS = 3;
const TRACK_L = 100;
const TRACK_R = 40;
const TRACK_WIDTH = 18;
const TRACK_P = 2 * TRACK_L + 2 * Math.PI * TRACK_R;
const SIM_STEPS = 900;

const getOvalPosition = (progressDistance: number, laneOffset: number) => {
  let lapDistance = progressDistance % TRACK_P;
  if (lapDistance < 0) lapDistance += TRACK_P;
  const currentR = TRACK_R + laneOffset;

  let x: number, z: number, angle: number;

  let d = lapDistance + TRACK_L / 2;
  if (d >= TRACK_P) d -= TRACK_P;

  if (d < TRACK_L) {
    x = -TRACK_L / 2 + d;
    z = currentR;
    angle = 0;
  } else if (d < TRACK_L + Math.PI * TRACK_R) {
    const curveDist = d - TRACK_L;
    const theta = -Math.PI / 2 + (curveDist / (Math.PI * TRACK_R)) * Math.PI;
    x = TRACK_L / 2 + currentR * Math.cos(theta);
    z = -currentR * Math.sin(theta);
    angle = theta + Math.PI / 2;
  } else if (d < 2 * TRACK_L + Math.PI * TRACK_R) {
    const straightDist = d - (TRACK_L + Math.PI * TRACK_R);
    x = TRACK_L / 2 - straightDist;
    z = -currentR;
    angle = Math.PI;
  } else {
    const curveDist = d - (2 * TRACK_L + Math.PI * TRACK_R);
    const theta = Math.PI / 2 + (curveDist / (Math.PI * TRACK_R)) * Math.PI;
    x = -TRACK_L / 2 + currentR * Math.cos(theta);
    z = -currentR * Math.sin(theta);
    angle = theta + Math.PI / 2;
  }

  return { x, z, angle, totalDistance: progressDistance };
};

const generateRaceSimulation = (slices: any[], durationSeconds: number, racePodium: any[] | null) => {
  const numRacers = slices.length;
  // Ensure enough spread so cars aren't overlapping at the finish
  const spread = Math.max(80, numRacers * 12); 
  
  // We want the last car to cross the finish line near progress = 1.0.
  // The last car's finalPosOffset is -spread/2.
  // So packDist - spread/2 = FINISH_LINE
  // targetDistance = FINISH_LINE + spread/2 + (buffer to ensure crossing)
  const targetDistance = (TOTAL_LAPS * TRACK_P) + (spread / 2) + 20.0;

  const cars = slices.map((slice, idx) => {
    const rank = racePodium ? racePodium.find(p => p.id === slice.item.id)?.rank || numRacers : numRacers;
    const gridStartDist = -6 - idx * 8;
    const gridStartLane = idx % 2 === 0 ? -0.5 : 0.5;

    const hash = (idx * 31 + slice.item.id.charCodeAt(0) * 17) % 1000 / 1000;
    const reactionDelay = 0.05 + hash * 0.2;
    const launchPower = 0.5 + hash * 0.8;

    return {
      id: slice.item.id,
      index: idx,
      dist: gridStartDist,
      startDist: gridStartDist,
      lane: gridStartLane,
      preferredLane: numRacers > 1 ? -0.7 + (idx / (numRacers - 1)) * 1.4 : 0,
      speed: 0,
      targetRank: rank,
      reactionDelay,
      launchPower,
      profile: [] as { dist: number; lane: number; speed: number }[],
    };
  });

  const dt = durationSeconds / SIM_STEPS;
  // Run an extra 1.5 seconds of steps so all cars safely pass the finish line
  const extraSteps = Math.floor(1.5 / dt);
  const totalSteps = SIM_STEPS + extraSteps;

  const FINISH_LINE = TOTAL_LAPS * TRACK_P;
  const winnerCrossProgressRaw = (FINISH_LINE - spread / 2) / targetDistance;
  const BLEND_END = Math.pow(Math.max(0.01, winnerCrossProgressRaw), 1 / 1.1) - 0.005; // lock in exactly before finish line
  const BLEND_START = BLEND_END - 0.16; // overtakes until the last curve

  for (let step = 0; step <= totalSteps; step++) {
    const t = step * dt;
    // Map progress from 0 to 1 over durationSeconds
    const rawProgress = t / durationSeconds;
    const progress = Math.min(1.0, rawProgress);

    // Smooth start, constant speed, no deceleration
    // A simple pow function gives a nice acceleration curve from the start
    const packDist = Math.pow(rawProgress, 1.1) * targetDistance; 
    const sortedCars = [...cars].sort((a, b) => b.dist - a.dist);

    cars.forEach(car => {
      const rankFraction = numRacers > 1 ? (car.targetRank - 1) / (numRacers - 1) : 0;
      
      // 1. Launch burst
      let launchBoost = 0;
      const pLaunch = Math.max(0, progress - (car.reactionDelay / durationSeconds));
      if (pLaunch > 0 && pLaunch < 0.25) {
        const burst = Math.sin((pLaunch / 0.25) * Math.PI);
        launchBoost = car.launchPower * 20 * burst;
      }

      // 2. Mid-race noise (fighting for position)
      const uniquePhase = car.index * 1.37;
      const noiseFreq = 18 + (car.index % 4) * 2.5;
      const noise = Math.sin(progress * noiseFreq + uniquePhase) * 26 + Math.cos(progress * (noiseFreq + 7) + uniquePhase * 0.8) * 14;

      // 3. Final positioning blend
      let blend = 0;
      if (progress > BLEND_START) {
        blend = (progress - BLEND_START) / (BLEND_END - BLEND_START);
        blend = Math.min(1.0, blend);
        blend = blend * blend * (3 - 2 * blend); // smoothstep
      }

      const winnerOffset = spread * 0.5;
      const finalPosOffset = winnerOffset - rankFraction * spread;
      
      let staggerBlend = 1.0;
      if (progress < 0.35) {
          staggerBlend = Math.cos((progress / 0.35) * (Math.PI / 2));
      } else {
          staggerBlend = 0.0;
      }
      
      // Calculate where the car SHOULD be
      let targetCarDist = packDist 
                        + car.startDist * staggerBlend
                        + launchBoost * (1 - blend)
                        + noise * (1 - blend) 
                        + finalPosOffset * blend;

      // 4. Smooth longitudinal tracking
      const prevDist = car.dist;
      let targetDistStep = (targetCarDist - car.dist) * Math.min(1, dt * 7.5);

      // Ensure cars never completely stop while racing
      const minSpeed = (targetDistance / durationSeconds) * 0.25;
      if (progress < 1.0 && targetDistStep < minSpeed * dt) {
          targetDistStep = minSpeed * dt;
      }

      car.dist = car.dist + targetDistStep;
      car.speed = (car.dist - prevDist) / dt;

      // 5. Lane Logic
      let targetLane = car.preferredLane;
      const carAhead = sortedCars.find(c => c.dist > car.dist && c.dist < car.dist + 12);
      
      if (carAhead && Math.abs(carAhead.lane - car.lane) < 0.5) {
        targetLane = carAhead.lane > 0 ? carAhead.lane - 0.7 : carAhead.lane + 0.7;
      } else {
        // Weave gently
        targetLane += Math.sin(progress * 28 + car.index) * 0.25;
      }

      if (progress > 0.85 && car.targetRank === 1) {
        targetLane = -0.5; // Winner takes the inside line at the end
      }

      car.lane = car.lane + (targetLane - car.lane) * Math.min(1, dt * 4.5);
      car.lane = Math.max(-1, Math.min(1, car.lane));
    });

    // 6. Collision Avoidance (Push cars apart if they get too close laterally)
    if (numRacers > 1) {
      for (let pass = 0; pass < 2; pass++) {
        for (let i = 0; i < numRacers; i++) {
          for (let j = i + 1; j < numRacers; j++) {
            const carA = cars[i];
            const carB = cars[j];
            
            const distDiff = carA.dist - carB.dist;
            const absDistDiff = Math.abs(distDiff);
            const laneDiff = carA.lane - carB.lane;
            const absLaneDiff = Math.abs(laneDiff);
            
            // Collision box
            if (absDistDiff < 4.5 && absLaneDiff < 0.5) {
              const pushLane = (0.5 - absLaneDiff) * 0.5;
              const dirLane = absLaneDiff < 0.01 ? (i % 2 === 0 ? 1 : -1) : (laneDiff > 0 ? 1 : -1);
              
              carA.lane += dirLane * pushLane;
              carB.lane -= dirLane * pushLane;
              
              // Very slight longitudinal separation to avoid clipping
              const pushDist = (4.5 - absDistDiff) * 0.05;
              const dirDist = distDiff > 0 ? 1 : -1;
              carA.dist += dirDist * pushDist;
              carB.dist -= dirDist * pushDist;
              
              carA.lane = Math.max(-1, Math.min(1, carA.lane));
              carB.lane = Math.max(-1, Math.min(1, carB.lane));
            }
          }
        }
      }
    }

    // 7. Save to profile
    cars.forEach(car => {
      car.profile.push({ dist: car.dist, lane: car.lane, speed: car.speed });
    });
  }

  return cars;
};

const StartLightGantry = ({ lightsCount, isLightsOut }: { lightsCount: number; isLightsOut: boolean }) => {
  return (
    <group position={[0, 0, TRACK_R]}>
      {/* 2 Vertical Steel Pillars */}
      <mesh position={[0, 4, TRACK_WIDTH / 2 + 1.2]} castShadow receiveShadow>
        <boxGeometry args={[0.8, 8.5, 0.8]} />
        <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[0, 4, -TRACK_WIDTH / 2 - 1.2]} castShadow receiveShadow>
        <boxGeometry args={[0.8, 8.5, 0.8]} />
        <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Overhead Truss */}
      <mesh position={[0, 8.0, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.2, 0.8, TRACK_WIDTH + 3.2]} />
        <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Light Panel Housing Box */}
      <mesh position={[0, 6.8, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.4, 1.4, 10.5]} />
        <meshStandardMaterial color="#020617" metalness={0.95} roughness={0.1} />
      </mesh>

      {/* 5 Light Columns */}
      {[-3.8, -1.9, 0, 1.9, 3.8].map((zOffset, index) => {
        const isRedLit = !isLightsOut && index < lightsCount;
        const isGreenLit = isLightsOut;

        return (
          <group key={index} position={[0.72, 6.8, zOffset]}>
            {/* Dark backplate */}
            <mesh position={[-0.05, 0, 0]}>
              <boxGeometry args={[0.08, 1.2, 1.4]} />
              <meshStandardMaterial color="#000000" />
            </mesh>

            {/* Red Light Pair (Top) */}
            <mesh position={[0.02, 0.3, -0.3]}>
              <sphereGeometry args={[0.18, 16, 16]} />
              <meshStandardMaterial
                color={isRedLit ? "#ff0000" : "#1a0404"}
                emissive={isRedLit ? "#ff0000" : "#000000"}
                emissiveIntensity={isRedLit ? 6 : 0}
              />
            </mesh>
            <mesh position={[0.02, 0.3, 0.3]}>
              <sphereGeometry args={[0.18, 16, 16]} />
              <meshStandardMaterial
                color={isRedLit ? "#ff0000" : "#1a0404"}
                emissive={isRedLit ? "#ff0000" : "#000000"}
                emissiveIntensity={isRedLit ? 6 : 0}
              />
            </mesh>

            {/* Green Light Pair (Bottom) */}
            <mesh position={[0.02, -0.3, -0.3]}>
              <sphereGeometry args={[0.18, 16, 16]} />
              <meshStandardMaterial
                color={isGreenLit ? "#10b981" : "#022c22"}
                emissive={isGreenLit ? "#10b981" : "#000000"}
                emissiveIntensity={isGreenLit ? 6 : 0}
              />
            </mesh>
            <mesh position={[0.02, -0.3, 0.3]}>
              <sphereGeometry args={[0.18, 16, 16]} />
              <meshStandardMaterial
                color={isGreenLit ? "#10b981" : "#022c22"}
                emissive={isGreenLit ? "#10b981" : "#000000"}
                emissiveIntensity={isGreenLit ? 6 : 0}
              />
            </mesh>

            {/* Point Light Sources */}
            {isRedLit && <pointLight color="#ef4444" intensity={3} distance={12} />}
            {isGreenLit && <pointLight color="#10b981" intensity={4} distance={16} />}
          </group>
        );
      })}
    </group>
  );
};

const StartingGridMarkings = ({ total = 10 }: { total: number }) => {
  return (
    <group>
      {Array.from({ length: total }).map((_, idx) => {
        const rank = idx + 1;
        const startDist = -6 - idx * 8;
        const laneSide = idx % 2 === 0 ? -0.5 : 0.5;
        const laneOffset = laneSide * ((TRACK_WIDTH - 6) / 2);
        const pos = getOvalPosition(startDist, laneOffset);

        return (
          <group key={idx} position={[pos.x, -0.17, pos.z]} rotation={[-Math.PI / 2, 0, pos.angle]}>
            {/* White Grid Box Outline */}
            <mesh receiveShadow>
              <planeGeometry args={[3.2, 2.0]} />
              <meshStandardMaterial color="#ffffff" transparent opacity={0.15} />
            </mesh>
            <mesh position={[1.5, 0, 0.01]}>
              <planeGeometry args={[0.2, 2.0]} />
              <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.6} />
            </mesh>
            {/* Burnout Rubber Skid Marks */}
            <mesh position={[-1.2, 0.45, 0.005]}>
              <planeGeometry args={[3.8, 0.35]} />
              <meshStandardMaterial color="#050505" transparent opacity={0.7} roughness={0.95} />
            </mesh>
            <mesh position={[-1.2, -0.45, 0.005]}>
              <planeGeometry args={[3.8, 0.35]} />
              <meshStandardMaterial color="#050505" transparent opacity={0.7} roughness={0.95} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};

const TyreSmoke = () => {
  const groupRef = useRef<THREE.Group>(null);

  const particles = useMemo(() => {
    return Array.from({ length: 16 }).map((_, i) => ({
      side: i % 2 === 0 ? 1 : -1,
      seed: i * 0.35,
      speed: 1.2 + (i % 4) * 0.4,
    }));
  }, []);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;

    groupRef.current.children.forEach((child, i) => {
      const p = particles[i];
      const age = (t * p.speed + p.seed) % 1.2;
      const progress = age / 1.2;

      child.position.x = -0.7 - progress * 2.2;
      child.position.y = 0.12 + progress * 0.6;
      child.position.z = p.side * 0.45 + Math.sin(age * 12) * 0.1;

      const s = (0.2 + progress * 0.8) * 1.5;
      child.scale.set(s, s, s);

      const mesh = child as THREE.Mesh;
      if (mesh.material instanceof THREE.MeshStandardMaterial) {
        mesh.material.opacity = Math.max(0, (1 - progress) * 0.65);
      }
    });
  });

  return (
    <group ref={groupRef}>
      {particles.map((_, i) => (
        <mesh key={i}>
          <sphereGeometry args={[0.3, 8, 8]} />
          <meshStandardMaterial
            color="#f1f5f9"
            transparent
            opacity={0.5}
            roughness={1}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
};

const CameraController = ({
  isSpinning,
  expectedWinnerId,
  leaderPosRef,
  positionsRef,
  onModeChange,
  startPhase,
  targetRank,
  setTargetRank,
  cameraMode,
  setCameraMode,
}: {
  isSpinning: boolean;
  expectedWinnerId?: string;
  leaderPosRef: React.MutableRefObject<any>;
  positionsRef: React.MutableRefObject<any[]>;
  onModeChange?: (mode: string) => void;
  startPhase: string;
  targetRank: number;
  setTargetRank: (rank: number) => void;
  cameraMode: string;
  setCameraMode: (mode: string) => void;
}) => {
  const { camera } = useThree();
  const isSpinningRef = useRef(isSpinning);
  const lookAtTarget = useRef(new THREE.Vector3(0, 0, 0));
  const currentCamPos = useRef(new THREE.Vector3(-30, 15, 40));

  const targetFov = useRef(50);
  const lastSwitchTime = useRef(0);
  const nextCutInterval = useRef(3.5);
  const prevCameraMode = useRef('tv');
  const tracksidePos = useRef(new THREE.Vector3(0, 2, 0));
  const hasTriggeredRaceLaunchCam = useRef(false);
  const raceLaunchTimeRef = useRef<number | null>(null);

  // History and usage tracking to guarantee balanced camera usage
  const recentCameraModes = useRef<string[]>([]);
  const cameraUsageCounts = useRef<Record<string, number>>({
    tv: 0,
    trackside: 0,
    action: 0,
    helicopter: 0,
    bumper: 0,
    rear: 0,
    low_side: 0,
  });

  useEffect(() => {
    isSpinningRef.current = isSpinning;
    if (!isSpinning) {
      setCameraMode('idle');
      if (onModeChange) onModeChange('idle');
      targetFov.current = 45;
      hasTriggeredRaceLaunchCam.current = false;
      raceLaunchTimeRef.current = null;
      recentCameraModes.current = [];
      cameraUsageCounts.current = {
        tv: 0,
        trackside: 0,
        action: 0,
        helicopter: 0,
        bumper: 0,
        rear: 0,
        low_side: 0,
      };
    }
  }, [isSpinning, camera, onModeChange, setCameraMode]);

  useFrame((state) => {
    const persCam = camera as THREE.PerspectiveCamera;
    if (persCam.fov !== undefined && Math.abs(persCam.fov - targetFov.current) > 0.1) {
      persCam.fov = THREE.MathUtils.lerp(persCam.fov, targetFov.current, 0.05);
      persCam.updateProjectionMatrix();
    }

    if (startPhase === 'racing' && raceLaunchTimeRef.current === null) {
      raceLaunchTimeRef.current = state.clock.elapsedTime;
    } else if (startPhase !== 'racing') {
      raceLaunchTimeRef.current = null;
    }

    const raceLaunchElapsed = (startPhase === 'racing' && raceLaunchTimeRef.current !== null)
      ? (state.clock.elapsedTime - raceLaunchTimeRef.current)
      : 0;

    if (isSpinningRef.current && startPhase !== 'idle' && (startPhase !== 'racing' || raceLaunchElapsed < 3.2)) {
      // Grid Start Camera View - keep active for ~3.2 seconds into the race so all cars can be seen launching off the line
      hasTriggeredRaceLaunchCam.current = false;
      const targetCamX = 18;
      const targetCamY = 3.5;
      const targetCamZ = TRACK_R + 10;

      const lookTargetX = startPhase === 'racing'
        ? THREE.MathUtils.lerp(-2, 16, Math.min(1.0, raceLaunchElapsed / 3.2))
        : -2;
      const lookTargetY = 2.0;
      const lookTargetZ = TRACK_R;

      targetFov.current = 32;

      if (cameraMode !== 'grid') {
        setCameraMode('grid');
        if (onModeChange) onModeChange('grid');
        currentCamPos.current.set(targetCamX, targetCamY, targetCamZ);
        lookAtTarget.current.set(-2, 2.0, TRACK_R);
      }

      currentCamPos.current.lerp(new THREE.Vector3(targetCamX, targetCamY, targetCamZ), 0.1);
      camera.position.copy(currentCamPos.current);
      lookAtTarget.current.lerp(new THREE.Vector3(lookTargetX, lookTargetY, lookTargetZ), 0.12);
      camera.lookAt(lookAtTarget.current);
    } else if (isSpinningRef.current) {
      // Calculate real-time sorted cars list by totalDistance
      const sortedCars = (positionsRef.current || [])
        .filter(p => p && p.totalDistance !== undefined)
        .sort((a, b) => (b.totalDistance || 0) - (a.totalDistance || 0));

      const effectiveRank = Math.min(targetRank, Math.max(0, sortedCars.length - 1));
      const targetCar = sortedCars[effectiveRank] || leaderPosRef.current || { x: 0, z: TRACK_R, angle: 0, totalDistance: 0 };

      const dx = Math.cos(targetCar.angle || 0);
      const dz = -Math.sin(targetCar.angle || 0);

      const totalRaceDist = TOTAL_LAPS * TRACK_P;
      const progress = (targetCar.totalDistance || 0) / totalRaceDist;

      // Reset camera to dynamic TV shot right at race launch
      if (!hasTriggeredRaceLaunchCam.current && startPhase === 'racing') {
        hasTriggeredRaceLaunchCam.current = true;
        lastSwitchTime.current = state.clock.elapsedTime;
        nextCutInterval.current = 3.2;
        const initialMode = 'action';
        setCameraMode(initialMode);
        if (onModeChange) onModeChange(initialMode);
        targetFov.current = 58;
        prevCameraMode.current = initialMode;
        recentCameraModes.current = [initialMode];
        cameraUsageCounts.current[initialMode] = 1;
      }

      let phase = 'mid';
      if (progress > 0.955) phase = 'finish';
      else if (progress > 0.666) phase = 'final'; // Lap 3 / Final Lap climax phase
      else if (progress < 0.333) phase = 'early'; // Lap 1 grid spread phase

      const leaderDist = sortedCars[0]?.totalDistance || 0;
      const currentLap = Math.min(TOTAL_LAPS, Math.max(1, Math.floor(Math.max(0, leaderDist) / TRACK_P) + 1));

      let isP1P2Battle = false;
      let isP2P3Battle = false;
      if (sortedCars.length > 1) {
        if (sortedCars[0].totalDistance - sortedCars[1].totalDistance < 18) {
          isP1P2Battle = true;
        }
      }
      if (sortedCars.length > 2) {
        if (sortedCars[1].totalDistance - sortedCars[2].totalDistance < 18) {
          isP2P3Battle = true;
        }
      }

      if (phase === 'finish' && cameraMode !== 'finish') {
        setCameraMode('finish');
        if (onModeChange) onModeChange('finish');
        targetFov.current = 40;
        lastSwitchTime.current = state.clock.elapsedTime + 999;
      } else if (phase !== 'finish' && state.clock.elapsedTime - lastSwitchTime.current > nextCutInterval.current) {
        lastSwitchTime.current = state.clock.elapsedTime;

        // Focus selection rule:
        // In Lap 3 (Final Lap climax), ALWAYS prioritize P1 (Pelotão Dianteiro / Leader)
        let chosenRank = 0;
        if (currentLap === 3 || phase === 'final') {
          chosenRank = 0;
        } else if (isP1P2Battle) {
          // On Lap 1 and 2, switch focus during close duels
          chosenRank = Math.random() < 0.6 ? 0 : 1;
        } else if (isP2P3Battle) {
          chosenRank = Math.random() < 0.5 ? 1 : 2;
        } else {
          chosenRank = 0;
        }
        setTargetRank(chosenRank);

        // Storytelling Camera Selection Rule:
        // 1. LAP 1 & LAP 3: NO Cockpit ('bumper') or Rear Mirror ('rear')
        // 2. LAP 2:
        //    - Onboard Frontal ('bumper') ONLY allowed if target is P2 or P3 (chasing P1 ahead)
        //    - Rear Mirror ('rear') ONLY allowed if target is P1 (looking back at P2 behind)
        let candidateModes: string[];
        if (currentLap === 1 || currentLap === 3 || phase === 'early' || phase === 'final') {
          candidateModes = ['tv', 'trackside', 'action', 'helicopter', 'low_side', 'crane'];
        } else {
          // Lap 2 mid-race phase
          if (chosenRank === 0) {
            // Target is P1: Rear Mirror ('rear') allowed, Frontal Cockpit ('bumper') FORBIDDEN
            candidateModes = ['tv', 'trackside', 'action', 'helicopter', 'low_side', 'crane', 'rear'];
          } else {
            // Target is P2 or P3: Frontal Cockpit ('bumper') allowed, Rear Mirror ('rear') FORBIDDEN
            candidateModes = ['tv', 'trackside', 'action', 'helicopter', 'low_side', 'crane', 'bumper'];
          }
        }

        // Find minimum usage count among available candidate cameras to ensure balanced rotation
        const currentCounts = cameraUsageCounts.current;
        const minUsage = Math.min(...candidateModes.map(m => currentCounts[m] || 0));

        const weightedCandidates = candidateModes.map(mode => {
          let weight = 10;

          // Strongly avoid repeating the exact current camera or modes used in the last 2 cuts
          if (mode === cameraMode) {
            weight = 0;
          } else if (recentCameraModes.current.includes(mode)) {
            const indexFromEnd = recentCameraModes.current.length - recentCameraModes.current.lastIndexOf(mode);
            weight -= (4 - indexFromEnd) * 3;
          }

          // Boost cameras that have been used less overall among available candidates
          if ((currentCounts[mode] || 0) === minUsage) {
            weight += 8;
          }

          // Lap-specific cinematic weighting
          if (currentLap === 1 || phase === 'early') {
            // Lap 1: Broadcast TV, action & trackside views of the packed grid
            if (mode === 'tv' || mode === 'action' || mode === 'trackside' || mode === 'helicopter') {
              weight += 6;
            }
          } else if (currentLap === 3 || phase === 'final') {
            // Lap 3: Climax with dynamic low-side, action, trackside & broadcast TV on P1
            if (mode === 'action' || mode === 'low_side' || mode === 'trackside' || mode === 'tv') {
              weight += 8;
            }
          } else {
            // Lap 2: Balanced mid-race battle coverage with onboard cameras
            if (mode === 'bumper' || mode === 'rear' || mode === 'action' || mode === 'low_side') {
              weight += 6;
            }
          }

          return { mode, weight: Math.max(1, weight) };
        });

        // Weighted random pick
        const totalWeight = weightedCandidates.reduce((sum, c) => sum + c.weight, 0);
        let randomVal = Math.random() * totalWeight;
        let newMode = 'tv';

        for (const candidate of weightedCandidates) {
          if (randomVal < candidate.weight) {
            newMode = candidate.mode;
            break;
          }
          randomVal -= candidate.weight;
        }

        // Update history log
        recentCameraModes.current.push(newMode);
        if (recentCameraModes.current.length > 3) {
          recentCameraModes.current.shift();
        }
        cameraUsageCounts.current[newMode] = (cameraUsageCounts.current[newMode] || 0) + 1;
        prevCameraMode.current = newMode;

        // Dynamic cut intervals tailored for climax pacing
        if (phase === 'final') {
          // Final Lap Climax: Rapid high-intensity cuts
          nextCutInterval.current = 1.8 + Math.random() * 1.0;
        } else if (newMode === 'bumper' || newMode === 'rear' || newMode === 'low_side') {
          // Onboard / ground cameras cut faster for visceral energy
          nextCutInterval.current = 2.0 + Math.random() * 0.8;
        } else if (isP1P2Battle || isP2P3Battle) {
          nextCutInterval.current = 2.4 + Math.random() * 1.0;
        } else {
          // Standard mid-race cuts
          nextCutInterval.current = 3.2 + Math.random() * 1.2;
        }

        // Configure Camera FOV & Trackside positioning
        if (newMode === 'trackside') {
          const ahead = 22 + Math.random() * 20;
          const side = (Math.random() > 0.5 ? 1 : -1) * (TRACK_WIDTH / 2 + 8.0 + Math.random() * 7.0);

          tracksidePos.current.set(
            targetCar.x + ahead * dx - side * dz,
            3.2 + Math.random() * 1.8,
            targetCar.z + ahead * dz + side * dx
          );
          targetFov.current = 32 + Math.random() * 6;
        } else if (newMode === 'action') {
          targetFov.current = 48;
        } else if (newMode === 'tv') {
          targetFov.current = 30;
        } else if (newMode === 'bumper') {
          targetFov.current = 62;
        } else if (newMode === 'helicopter') {
          targetFov.current = 34;
        } else if (newMode === 'crane') {
          targetFov.current = 36;
        } else if (newMode === 'rear') {
          targetFov.current = 58;
        } else if (newMode === 'low_side') {
          targetFov.current = 44;
        } else {
          targetFov.current = 48;
        }

        if (newMode !== cameraMode) {
          setCameraMode(newMode);
          if (onModeChange) onModeChange(newMode);
        }
      }

      let targetCamX = targetCar.x;
      let targetCamY = 5;
      let targetCamZ = targetCar.z;

      let lookTargetX = targetCar.x;
      let lookTargetY = 0.8;
      let lookTargetZ = targetCar.z;

      let lerpSpeed = 0.08;
      let lookLerpSpeed = 0.15;

      const shakeAmount = (cameraMode === 'bumper' || cameraMode === 'action') ? 0.015 : 0;
      const shakeX = shakeAmount > 0 ? (Math.random() - 0.5) * shakeAmount : 0;
      const shakeY = shakeAmount > 0 ? (Math.random() - 0.5) * shakeAmount : 0;

      switch (cameraMode) {
        case 'finish':
          targetCamX = 22;
          targetCamY = 4.2;
          targetCamZ = TRACK_R - 8;
          lookTargetX = -5;
          lookTargetY = 0.8;
          lookTargetZ = TRACK_R;
          lerpSpeed = 0.1;
          lookLerpSpeed = 0.25;
          break;
        case 'tv':
          // TV Tower Camera - Elevated cinematic broadcast angle with smooth tracking
          targetCamX = targetCar.x - 28 * dx - 20 * dz;
          targetCamY = 16.0;
          targetCamZ = targetCar.z - 28 * dz + 20 * dx;
          lookTargetX = targetCar.x + 10 * dx;
          lookTargetY = 1.0;
          lookTargetZ = targetCar.z + 10 * dz;
          lerpSpeed = 0.05;
          lookLerpSpeed = 0.12;
          break;
        case 'trackside':
          // TV Trackside Camera - Elevated camera platform with rapid panning sweep
          targetCamX = tracksidePos.current.x;
          targetCamY = tracksidePos.current.y;
          targetCamZ = tracksidePos.current.z;
          lookTargetX = targetCar.x + 8 * dx;
          lookTargetY = 1.0;
          lookTargetZ = targetCar.z + 8 * dz;
          lerpSpeed = 1.0;
          lookLerpSpeed = 0.35;
          break;
        case 'action':
          // Dynamic Broadcast Chase Camera - Well-spaced trailing duel camera
          targetCamX = targetCar.x - 13.0 * dx + 3.8 * dz;
          targetCamY = 3.4;
          targetCamZ = targetCar.z - 13.0 * dz - 3.8 * dx;
          lookTargetX = targetCar.x + 12 * dx;
          lookTargetY = 1.2;
          lookTargetZ = targetCar.z + 12 * dz;
          lerpSpeed = 0.22;
          lookLerpSpeed = 0.35;
          break;
        case 'helicopter':
          // Broadcast Chopper Camera - Smooth orbital tracking around the pack
          {
            const chopperAngle = state.clock.elapsedTime * 0.35;
            const chopperRadius = 24.0;
            targetCamX = targetCar.x + Math.sin(chopperAngle) * chopperRadius;
            targetCamY = 26.0 + Math.sin(chopperAngle * 0.5) * 3.0;
            targetCamZ = targetCar.z + Math.cos(chopperAngle) * chopperRadius;
            lookTargetX = targetCar.x + 4 * dx;
            lookTargetY = 0.5;
            lookTargetZ = targetCar.z + 4 * dz;
            lerpSpeed = 0.08;
            lookLerpSpeed = 0.12;
          }
          break;
        case 'crane':
          // TV Crane / Jib Camera - Sweeping elevated jib arc over corner exits
          {
            const craneProgress = state.clock.elapsedTime * 0.55;
            const craneArc = Math.sin(craneProgress) * 14.0;
            const craneHeight = 11.5 + Math.cos(craneProgress * 0.7) * 3.5;
            targetCamX = targetCar.x - 12 * dx + craneArc * dz;
            targetCamY = Math.max(5.0, craneHeight);
            targetCamZ = targetCar.z - 12 * dz - craneArc * dx;
            lookTargetX = targetCar.x + 10 * dx;
            lookTargetY = 1.0;
            lookTargetZ = targetCar.z + 10 * dz;
            lerpSpeed = 0.10;
            lookLerpSpeed = 0.20;
          }
          break;
        case 'rear':
          // Rear Wing Camera looking directly behind targetCar - Elevated for clear view back
          targetCamX = targetCar.x - 0.65 * dx;
          targetCamY = 2.15;
          targetCamZ = targetCar.z - 0.65 * dz;
          lookTargetX = targetCar.x - 30 * dx;
          lookTargetY = 1.0;
          lookTargetZ = targetCar.z - 30 * dz;
          lerpSpeed = 0.8;
          lookLerpSpeed = 0.8;
          break;
        case 'low_side':
          // Elevated Side-Track Camera - Clear view of wheel-to-wheel battles
          targetCamX = targetCar.x - 5.5 * dx - 13.5 * dz;
          targetCamY = 2.8;
          targetCamZ = targetCar.z - 5.5 * dz + 13.5 * dx;
          lookTargetX = targetCar.x + 10 * dx;
          lookTargetY = 1.1;
          lookTargetZ = targetCar.z + 10 * dz;
          lerpSpeed = 0.16;
          lookLerpSpeed = 0.22;
          break;
        case 'bumper':
          // Roof / Windshield Onboard T-Cam - Elevated forward view over front nose cone
          targetCamX = targetCar.x + 0.65 * dx;
          targetCamY = 2.05;
          targetCamZ = targetCar.z + 0.65 * dz;
          lookTargetX = targetCar.x + 30 * dx;
          lookTargetY = 1.0;
          lookTargetZ = targetCar.z + 30 * dz;
          lerpSpeed = 0.85;
          lookLerpSpeed = 0.85;
          break;
        case 'idle':
        default:
          targetCamX = -30;
          targetCamY = 15;
          targetCamZ = 40;
          lookTargetX = 0;
          lookTargetY = 0;
          lookTargetZ = 0;
          lerpSpeed = 0.05;
          lookLerpSpeed = 0.05;
          break;
      }

      const targetPos = new THREE.Vector3(targetCamX + shakeX, targetCamY + shakeY, targetCamZ);
      if (currentCamPos.current.distanceTo(targetPos) > 35) {
        currentCamPos.current.copy(targetPos);
      } else {
        currentCamPos.current.lerp(targetPos, lerpSpeed);
      }

      camera.position.copy(currentCamPos.current);
      lookAtTarget.current.lerp(new THREE.Vector3(lookTargetX, lookTargetY, lookTargetZ), lookLerpSpeed);
      camera.lookAt(lookAtTarget.current);

      // Real-time audio engine update (Doppler, Engine RPM pitch, Tire squeal, Kerb impact)
      const appState = useAppStore.getState();
      const masterVol = appState.soundEnabled ? appState.masterVolume / 100 : 0;

      if (masterVol > 0 && targetCar && startPhase === 'racing') {
        const speedKmh = Math.max(0, Math.round((targetCar.speed || 0) * 3.6));
        const camPosVec = camera.position;
        const carPosVec = new THREE.Vector3(targetCar.x, 1.0, targetCar.z);
        const distToCam = camPosVec.distanceTo(carPosVec);

        // 1. Engine Doppler & Proximity Audio
        updateRaceEngineAudio(speedKmh, distToCam, cameraMode, state.clock.getDelta(), masterVol, true);

        // 2. Cornering physics for tire squeal & kerb impact
        let lapDist = (targetCar.totalDistance || 0) % TRACK_P;
        if (lapDist < 0) lapDist += TRACK_P;
        let d = lapDist + TRACK_L / 2;
        if (d >= TRACK_P) d -= TRACK_P;

        const isInCurve = (d >= TRACK_L && d < TRACK_L + Math.PI * TRACK_R) || (d >= 2 * TRACK_L + Math.PI * TRACK_R);
        const corneringLoad = isInCurve ? Math.min(1.0, speedKmh / 190) : 0.0;

        // Tire squeal in high-G turns
        updateTireSquealAudio(corneringLoad, speedKmh, masterVol);

        // Kerb impact ("impacto nas zebras")
        const laneOffset = targetCar.lane || 0;
        const isNearKerbEdge = Math.abs(laneOffset) > 0.35 || (d > TRACK_L + 10 && d < TRACK_L + 30);
        if (isInCurve && isNearKerbEdge && speedKmh > 40) {
          playKerbImpactSound(masterVol);
        }
      } else {
        stopRaceAudio();
      }
    } else {
      stopRaceAudio();
      if (expectedWinnerId && leaderPosRef.current) {
        const leader = leaderPosRef.current;
        const t = state.clock.elapsedTime * 0.2;
        camera.position.lerp(new THREE.Vector3(leader.x + Math.sin(t) * 15, 8, leader.z + Math.cos(t) * 15), 0.05);
        lookAtTarget.current.lerp(new THREE.Vector3(leader.x, 1, leader.z), 0.1);
        camera.lookAt(lookAtTarget.current);
      } else {
        const t = state.clock.elapsedTime * 0.1;
        camera.position.lerp(new THREE.Vector3(Math.sin(t) * 50, 20, TRACK_R + 10 + Math.cos(t) * 30), 0.02);
        lookAtTarget.current.lerp(new THREE.Vector3(0, 0, TRACK_R), 0.05);
        camera.lookAt(lookAtTarget.current);
      }
    }
  });

  return null;
};

const CarModel = ({ color }: { color: string }) => {
  return (
    <group>
      {/* Aerodynamic Body */}
      <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.8, 0.35, 0.85]} />
        <meshStandardMaterial color={color} metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Front Nose */}
      <mesh position={[0.9, 0.15, 0]} castShadow receiveShadow rotation={[0, 0, -0.2]}>
        <boxGeometry args={[0.4, 0.15, 0.85]} />
        <meshStandardMaterial color={color} metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Cockpit */}
      <mesh position={[-0.1, 0.52, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.7, 0.3, 0.6]} />
        <meshStandardMaterial color={color} metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Windshield */}
      <mesh position={[0.27, 0.52, 0]} castShadow receiveShadow rotation={[0, 0, -0.4]}>
        <boxGeometry args={[0.05, 0.3, 0.55]} />
        <meshStandardMaterial color="#0a0a0a" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Rear Spoiler */}
      <mesh position={[-0.9, 0.65, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.25, 0.05, 0.9]} />
        <meshStandardMaterial color="#111" metalness={0.9} roughness={0.2} />
      </mesh>
      <mesh position={[-0.85, 0.5, 0.35]} castShadow receiveShadow>
        <boxGeometry args={[0.05, 0.25, 0.05]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      <mesh position={[-0.85, 0.5, -0.35]} castShadow receiveShadow>
        <boxGeometry args={[0.05, 0.25, 0.05]} />
        <meshStandardMaterial color="#111" />
      </mesh>

      {/* Headlights */}
      <mesh position={[1.05, 0.2, 0.25]} castShadow rotation={[0, 0, -0.2]}>
        <boxGeometry args={[0.05, 0.08, 0.2]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={3} />
      </mesh>
      <mesh position={[1.05, 0.2, -0.25]} castShadow rotation={[0, 0, -0.2]}>
        <boxGeometry args={[0.05, 0.08, 0.2]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={3} />
      </mesh>

      {/* Wheels */}
      <mesh position={[0.6, 0.15, 0.45]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.22, 0.22, 0.18, 24]} />
        <meshStandardMaterial color="#111" roughness={0.9} />
      </mesh>
      <mesh position={[0.6, 0.15, -0.45]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.22, 0.22, 0.18, 24]} />
        <meshStandardMaterial color="#111" roughness={0.9} />
      </mesh>
      <mesh position={[-0.6, 0.15, 0.45]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.25, 0.25, 0.2, 24]} />
        <meshStandardMaterial color="#111" roughness={0.9} />
      </mesh>
      <mesh position={[-0.6, 0.15, -0.45]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.25, 0.25, 0.2, 24]} />
        <meshStandardMaterial color="#111" roughness={0.9} />
      </mesh>
    </group>
  );
};

const Racer = ({
  item,
  color,
  index,
  total,
  isSpinning,
  spinDurationSeconds,
  expectedWinnerId,
  onUpdatePosition,
  simProfile,
  isWinner,
  startPhase,
}: {
  item: any;
  color: string;
  index: number;
  total: number;
  isSpinning: boolean;
  spinDurationSeconds: number;
  expectedWinnerId?: string;
  onUpdatePosition?: (index: number, pos: any) => void;
  simProfile: any;
  isWinner: boolean;
  startPhase: string;
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Group>(null);
  const [isLaunching, setIsLaunching] = useState(false);

  const [raceData] = useState(() => ({
    startTime: 0,
    finalPos: { x: 0, z: TRACK_R, angle: 0, totalDistance: 0 }
  }));

  const gridLane = index % 2 === 0 ? -0.5 : 0.5;
  const gridLaneOffset = gridLane * ((TRACK_WIDTH - 6) / 2);
  const gridStartDist = -6 - index * 8;
  const gridPos = getOvalPosition(gridStartDist, gridLaneOffset);

  useFrame((state) => {
    if (!groupRef.current || !meshRef.current) return;

    if (isSpinning) {
      if (startPhase === 'racing') {
        if (raceData.startTime === 0) {
          raceData.startTime = state.clock.elapsedTime;
        }

        const elapsed = state.clock.elapsedTime - raceData.startTime;
        const progress = Math.min(elapsed / spinDurationSeconds, 1.0);

        setIsLaunching(elapsed < 2.5);

        let dist = gridStartDist;
        let lane = gridLane;
        let speed = 0;

        if (simProfile && simProfile.length > 0) {
          const maxIndex = simProfile.length - 1;
          const simDt = spinDurationSeconds / SIM_STEPS;
          const exactIndex = elapsed / simDt;
          const idx = Math.min(Math.floor(exactIndex), maxIndex);
          const fraction = Math.max(0, Math.min(1, exactIndex - idx));

          if (idx >= maxIndex) {
            dist = simProfile[maxIndex].dist;
            lane = simProfile[maxIndex].lane;
            speed = simProfile[maxIndex].speed || 0;
          } else {
            const p1 = simProfile[idx];
            const p2 = simProfile[idx + 1];
            dist = p1.dist + (p2.dist - p1.dist) * fraction;
            lane = p1.lane + (p2.lane - p1.lane) * fraction;
            speed = p1.speed + (p2.speed - p1.speed) * fraction;
          }
        }

        const laneOffset = lane * ((TRACK_WIDTH - 6) / 2);
        const posBase = getOvalPosition(dist, laneOffset);
        const pos = { ...posBase, speed };

        groupRef.current.position.x = pos.x;
        groupRef.current.position.z = pos.z;
        groupRef.current.rotation.y = pos.angle;

        meshRef.current.position.y = Math.abs(Math.sin(dist * 0.5)) * 0.03;

        // Dynamic launch physics animation: rear squat and wheelspin steering oscillation
        if (elapsed < 2.2) {
          const launchFactor = Math.max(0, 1 - elapsed / 2.2);
          // Rear suspension squat under heavy acceleration
          meshRef.current.rotation.z = -0.075 * Math.pow(launchFactor, 1.4);
          // Traction wheelspin wiggle
          meshRef.current.rotation.y = Math.sin(elapsed * 32 + index * 3) * 0.03 * launchFactor;
        } else {
          meshRef.current.rotation.z = 0;
          meshRef.current.rotation.y = 0;
        }

        raceData.finalPos = pos;

        if (onUpdatePosition) {
          onUpdatePosition(index, pos);
        }
      } else {
        // Countdown / Pre-start grid state
        raceData.startTime = 0;
        setIsLaunching(false);
        groupRef.current.position.x = gridPos.x;
        groupRef.current.position.z = gridPos.z;
        groupRef.current.rotation.y = gridPos.angle;

        // Pre-start grid state: stable and grounded
        meshRef.current.position.y = 0;
        meshRef.current.rotation.z = 0;
        meshRef.current.rotation.y = 0;

        if (onUpdatePosition) {
          onUpdatePosition(index, gridPos);
        }
      }
    } else {
      raceData.startTime = 0;
      setIsLaunching(false);
      const resetPos = expectedWinnerId ? raceData.finalPos : gridPos;

      groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, resetPos.x, 0.1);
      groupRef.current.position.z = THREE.MathUtils.lerp(groupRef.current.position.z, resetPos.z, 0.1);
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, resetPos.angle, 0.1);

      if (isWinner && expectedWinnerId) {
        // Post-race donuts celebration
        meshRef.current.position.y = 0.05; // Squat slightly
        meshRef.current.rotation.y -= 0.12; // Spin rapidly for donuts
        meshRef.current.rotation.x = -0.06; // Rear squat from acceleration
        meshRef.current.rotation.z = -0.08; // Body roll during donut
      } else {
        meshRef.current.position.y = 0;
        meshRef.current.rotation.x = 0;
        meshRef.current.rotation.y = 0;
        meshRef.current.rotation.z = 0;
      }
    }
  });

  return (
    <group ref={groupRef} position={[gridPos.x, 0, gridPos.z]}>
      <group ref={meshRef} scale={[2.2, 2.2, 2.2]}>
        <CarModel color={color} />
        {(isLaunching || (isWinner && expectedWinnerId && !isSpinning)) && <TyreSmoke />}
      </group>

      <Billboard position={[0, 2.5, 0]}>
        <Text
          fontSize={0.8}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.1}
          outlineColor="#000000"
        >
          {item.text}
        </Text>
      </Billboard>
    </group>
  );
};

const CheckeredLine = () => {
  const textureRef = useRef<THREE.CanvasTexture | null>(null);

  useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 512, 128);
      ctx.fillStyle = '#111111';
      for (let i = 0; i < 16; i++) {
        for (let j = 0; j < 4; j++) {
          if ((i + j) % 2 === 0) {
            ctx.fillRect(i * 32, j * 32, 32, 32);
          }
        }
      }
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 1);
    textureRef.current = tex;
  }, []);

  return (
    <group position={[0, 0, TRACK_R]}>
      <mesh position={[0, -0.18, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[4, TRACK_WIDTH]} />
        {textureRef.current && <meshStandardMaterial map={textureRef.current} roughness={0.8} />}
      </mesh>
    </group>
  );
};

const LeaderboardUpdater = ({ slices, positionsRef, leaderPosRef, isSpinning, activeWinnerId, targetRank = 0 }: any) => {
  const finishOrder = useRef<string[]>([]);
  const { t } = useTranslation();

  const textLap = t('race.lap', 'LAP');
  const textFinished = t('race.finished', 'RACE FINISHED');
  const textFinishBadge = t('race.finish_badge', 'FINISH');

  useEffect(() => {
    if (isSpinning || !activeWinnerId) {
      finishOrder.current = [];
      slices.forEach((slice: any, rank: number) => {
        const el = document.getElementById(`leaderboard-racer-${slice.item.id}`);
        const statusEl = document.getElementById(`leaderboard-status-${slice.item.id}`);
        if (el) {
          el.style.backgroundColor = "";
          el.style.borderLeft = "none";
          el.style.opacity = "1";
          el.style.transform = `translateY(${rank * 32}px)`;
        }
        if (statusEl) {
          statusEl.innerHTML = '';
        }
      });
      const sectorEl = document.getElementById('sector-display');
      if (sectorEl) {
        sectorEl.innerText = `${textLap} 1/${TOTAL_LAPS}`;
        sectorEl.className = "text-red-500 font-bold";
      }
    }
  }, [isSpinning, activeWinnerId, slices, textLap]);

  useFrame(() => {
    if (!positionsRef.current || positionsRef.current.length === 0) return;

    slices.forEach((slice: any, idx: number) => {
      const dist = positionsRef.current[idx] ? positionsRef.current[idx].totalDistance : 0;
      if (dist >= TOTAL_LAPS * TRACK_P && !finishOrder.current.includes(slice.item.id)) {
        finishOrder.current.push(slice.item.id);
      }
    });

    const racers = slices.map((slice: any, idx: number) => ({
      id: slice.item.id,
      dist: positionsRef.current[idx] ? positionsRef.current[idx].totalDistance : 0
    }));

    racers.sort((a: any, b: any) => {
      const aFinished = finishOrder.current.indexOf(a.id);
      const bFinished = finishOrder.current.indexOf(b.id);

      if (aFinished !== -1 && bFinished !== -1) {
        return aFinished - bFinished;
      } else if (aFinished !== -1) {
        return -1;
      } else if (bFinished !== -1) {
        return 1;
      } else {
        return b.dist - a.dist;
      }
    });

    const effectiveRank = Math.min(targetRank, Math.max(0, racers.length - 1));
    const targetRacer = racers[effectiveRank] || racers[0];
    const targetSlice = slices.find((s: any) => s.item.id === targetRacer?.id);
    const targetSliceIdx = slices.findIndex((s: any) => s.item.id === targetRacer?.id);
    const targetPos = positionsRef.current[targetSliceIdx] || leaderPosRef.current;

    if (targetSlice) {
      const onboardNameEl = document.getElementById('onboard-driver-name');
      if (onboardNameEl && onboardNameEl.innerText !== targetSlice.item.text) {
        onboardNameEl.innerText = targetSlice.item.text;
      }
      const onboardColorEl = document.getElementById('onboard-driver-color');
      if (onboardColorEl && onboardColorEl.dataset.color !== targetSlice.item.color) {
        onboardColorEl.style.backgroundColor = targetSlice.item.color;
        onboardColorEl.dataset.color = targetSlice.item.color;
      }
      const onboardPosEl = document.getElementById('onboard-driver-pos');
      if (onboardPosEl) {
        onboardPosEl.innerText = `P${effectiveRank + 1}`;
      }

      const onboardSpeedEl = document.getElementById('onboard-driver-speed');
      if (onboardSpeedEl && targetPos) {
        const displaySpeed = Math.max(0, Math.round((targetPos.speed || 0) * 3.6));
        onboardSpeedEl.innerText = `${displaySpeed} KM/H`;

        const rpmPercent = Math.min(100, Math.max(0, (displaySpeed / 280) * 100));
        const activeLeds = Math.round((rpmPercent / 100) * 8);
        for (let i = 0; i < 8; i++) {
          const ledEl = document.getElementById(`rpm-led-${i}`);
          if (ledEl) {
            if (i < activeLeds) {
              if (i < 3) ledEl.style.backgroundColor = "#22c55e";
              else if (i < 6) ledEl.style.backgroundColor = "#eab308";
              else ledEl.style.backgroundColor = "#ef4444";
              ledEl.style.opacity = "1";
              ledEl.style.boxShadow = "0 0 5px currentColor";
            } else {
              ledEl.style.backgroundColor = "#334155";
              ledEl.style.opacity = "0.2";
              ledEl.style.boxShadow = "none";
            }
          }
        }
      }

      const onboardGearEl = document.getElementById('onboard-driver-gear');
      if (onboardGearEl && targetPos) {
        const speed = targetPos.speed || 0;
        let gear = '1';
        if (speed > 80) gear = '8';
        else if (speed > 70) gear = '7';
        else if (speed > 60) gear = '6';
        else if (speed > 50) gear = '5';
        else if (speed > 40) gear = '4';
        else if (speed > 30) gear = '3';
        else if (speed > 15) gear = '2';
        onboardGearEl.innerText = gear;
      }

      const onboardGapEl = document.getElementById('onboard-driver-gap');
      if (onboardGapEl && racers.length > 1) {
        let gapText = '';
        if (effectiveRank === 0) {
          const gap = ((racers[0]?.dist || 0) - (racers[1]?.dist || 0)).toFixed(1);
          gapText = `+${gap}m`;
        } else if (effectiveRank === 1) {
          const gap = ((racers[0]?.dist || 0) - (racers[1]?.dist || 0)).toFixed(1);
          gapText = `-${gap}m`;
        } else if (effectiveRank === 2 && racers.length > 2) {
          const gap = ((racers[1]?.dist || 0) - (racers[2]?.dist || 0)).toFixed(1);
          gapText = `-${gap}m`;
        }
        onboardGapEl.innerText = gapText;
      }

      const battleIndicator = document.getElementById('battle-indicator');
      const battleTextEl = document.getElementById('battle-indicator-text');
      if (battleIndicator) {
        let isBattleP1P2 = racers.length > 1 && (racers[0].dist - racers[1].dist < 15) && racers[0].dist < TOTAL_LAPS * TRACK_P;
        let isBattleP2P3 = racers.length > 2 && (racers[1].dist - racers[2].dist < 15) && racers[1].dist < TOTAL_LAPS * TRACK_P;

        if (isBattleP1P2 || isBattleP2P3) {
          battleIndicator.style.display = 'block';
          if (battleTextEl) {
            battleTextEl.innerText = isBattleP1P2 ? t('race.battle_p1_p2', 'DISPUTA P1 ⚡ P2') : t('race.battle_p2_p3', 'DISPUTA P2 ⚡ P3');
          }
        } else {
          battleIndicator.style.display = 'none';
        }
      }
    }

    racers.forEach((racer: any, rank: number) => {
      const el = document.getElementById(`leaderboard-racer-${racer.id}`);
      const rankEl = document.getElementById(`leaderboard-rank-${racer.id}`);
      const statusEl = document.getElementById(`leaderboard-status-${racer.id}`);
      if (el) {
        el.style.transform = `translateY(${rank * 32}px)`;
        if (finishOrder.current.includes(racer.id)) {
          if (rank === 0) {
            el.style.backgroundColor = "rgba(16, 185, 129, 0.15)";
            el.style.borderLeft = "2px solid rgba(16, 185, 129, 1)";
            el.style.opacity = "1";
          } else {
            el.style.backgroundColor = "rgba(15, 23, 42, 0.6)";
            el.style.borderLeft = "none";
            el.style.opacity = "0.6";
          }
        } else {
          el.style.backgroundColor = "";
          el.style.borderLeft = "none";
          el.style.opacity = "1";
        }
      }
      if (rankEl) {
        rankEl.innerText = `${rank + 1}`;
      }
      if (statusEl) {
        if (finishOrder.current.includes(racer.id)) {
          statusEl.innerHTML = `<span class="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded font-bold tracking-widest uppercase">${textFinishBadge}</span>`;
        } else {
          statusEl.innerHTML = '';
        }
      }
    });

    const sectorEl = document.getElementById('sector-display');
    if (sectorEl) {
      const leaderDist = leaderPosRef.current ? leaderPosRef.current.totalDistance : 0;
      const lapsCompleted = Math.floor(leaderDist / TRACK_P);

      if (leaderDist >= TOTAL_LAPS * TRACK_P) {
        sectorEl.innerText = textFinished;
        sectorEl.className = "text-emerald-400 animate-pulse font-bold";
      } else {
        sectorEl.innerText = `${textLap} ${Math.min(lapsCompleted + 1, TOTAL_LAPS)}/${TOTAL_LAPS}`;
        sectorEl.className = "text-red-500 font-bold";
      }
    }
  });
  return null;
};

const Scenery = () => {
  const trees = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 150; i++) {
      let x, z;
      if (Math.random() > 0.5) {
        const isRight = Math.random() > 0.5;
        const angle = isRight ? (Math.random() * Math.PI - Math.PI / 2) : (Math.random() * Math.PI + Math.PI / 2);
        const radius = TRACK_R + TRACK_WIDTH / 2 + 6 + Math.random() * 80;
        x = (isRight ? 1 : -1) * TRACK_L / 2 + Math.cos(angle) * radius;
        z = Math.sin(angle) * radius;
      } else {
        x = (Math.random() - 0.5) * TRACK_L;
        const zOffset = TRACK_R + TRACK_WIDTH / 2 + 6 + Math.random() * 80;
        z = (Math.random() > 0.5 ? 1 : -1) * zOffset;
      }
      const scale = 0.5 + Math.random() * 1.5;
      arr.push({ x, z, scale });
    }
    return arr;
  }, []);

  return (
    <group>
      {trees.map((t, i) => (
        <group key={i} position={[t.x, 0, t.z]} scale={[t.scale, t.scale, t.scale]}>
          <mesh position={[0, 1, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.2, 0.4, 2]} />
            <meshStandardMaterial color="#451a03" roughness={1} />
          </mesh>
          <mesh position={[0, 3, 0]} castShadow receiveShadow>
            <coneGeometry args={[2, 4, 8]} />
            <meshStandardMaterial color="#065f46" roughness={0.8} />
          </mesh>
          <mesh position={[0, 5, 0]} castShadow receiveShadow>
            <coneGeometry args={[1.5, 3, 8]} />
            <meshStandardMaterial color="#065f46" roughness={0.8} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

const RaceScene = ({
  onModeChange,
  startPhase,
  lightsCount,
  isLightsOut,
  targetRank,
  setTargetRank,
  cameraMode,
  setCameraMode,
}: {
  onModeChange: (mode: string) => void;
  startPhase: string;
  lightsCount: number;
  isLightsOut: boolean;
  targetRank: number;
  setTargetRank: (rank: number) => void;
  cameraMode: string;
  setCameraMode: (mode: string) => void;
}) => {
  const kerbTex = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 64, 16);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(0, 0, 32, 16);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(100, 1);
    return tex;
  }, []);

  const kerbTexCurve = useMemo(() => {
    const tex = kerbTex.clone();
    tex.repeat.set(30, 1);
    return tex;
  }, [kerbTex]);

  const { slices, validItems } = useWheelData();
  const isSpinning = useAppStore(state => state.isSpinning);
  const expectedWinnerId = useAppStore(state => state.expectedWinnerId);
  const winner = useAppStore(state => state.winner);
  const spinTime = useAppStore(state => state.spinTime);
  const eliminationMode = useAppStore(state => state.eliminationMode);
  const isFinalRound = eliminationMode && validItems.length === 2;
  const eliminationSpinTime = useAppStore(state => state.eliminationSpinTime);
  const racePodium = useAppStore(state => state.racePodium);

  const activeWinnerId = (isSpinning || winner) ? expectedWinnerId : undefined;

  let actualSpinTime = isFinalRound ? spinTime : (eliminationMode ? eliminationSpinTime : spinTime);
  const spinRange = getSpinTimeRanges('race', !isFinalRound && eliminationMode);
  actualSpinTime = Math.max(spinRange.min, Math.min(spinRange.max, actualSpinTime));
  const spinDurationMs = actualSpinTime * 1000;
  const durationSeconds = spinDurationMs / 1000;

  const racerPositions = useRef(
    new Array(slices.length).fill({ x: 0, z: TRACK_R, angle: 0, totalDistance: 0 })
  );
  const leaderPosRef = useRef({ x: 0, z: TRACK_R, angle: 0, totalDistance: 0 });

  const [simData, setSimData] = useState<any[] | null>(null);

  const { stopContinuousAudio } = useWheelActions();
  const hasTriggeredWinSoundRef = useRef(false);
  const hasStoppedRaceSoundRef = useRef(false);

  useEffect(() => {
    if (isSpinning) {
      hasTriggeredWinSoundRef.current = false;
      hasStoppedRaceSoundRef.current = false;
      racerPositions.current = new Array(slices.length).fill(null).map(() => ({ x: 0, z: TRACK_R, angle: 0, totalDistance: 0 }));
      leaderPosRef.current = { x: 0, z: TRACK_R, angle: 0, totalDistance: 0 };
      const data = generateRaceSimulation(slices, durationSeconds, racePodium);
      setSimData(data);
    } else {
      setSimData(null);
    }
  }, [isSpinning, slices, durationSeconds, racePodium]);

  const FINISH_LINE_DIST = TOTAL_LAPS * TRACK_P;

  const handleUpdatePosition = (index: number, pos: any) => {
    racerPositions.current[index] = pos;
    if (isSpinning) {
      let leaderIndex = 0;
      let maxDist = -9999;
      racerPositions.current.forEach((p, i) => {
        if (p && p.totalDistance > maxDist) {
          maxDist = p.totalDistance;
          leaderIndex = i;
        }
      });
      leaderPosRef.current = racerPositions.current[leaderIndex];

      if (startPhase === 'racing') {
        // 1. Play the win sound when the first car (leader) crosses the finish line
        if (!hasTriggeredWinSoundRef.current && leaderPosRef.current && leaderPosRef.current.totalDistance >= FINISH_LINE_DIST) {
          hasTriggeredWinSoundRef.current = true;

          const state = useAppStore.getState();
          const vol = state.soundEnabled ? state.masterVolume / 100 : 0;
          if (vol > 0) {
            const winningSlice = slices.find(s => s.item.id === activeWinnerId) || slices[0];
            const winningItem = winningSlice?.item;
            const customSound = winningItem?.sound;

            if (customSound && customSound !== "") {
              const foundCustomAudio = state.customWinAudios.find((a) => a.id === customSound) || null;
              playWinSound(0.6, customSound, foundCustomAudio, vol);
            } else {
              const genericCustomWin = state.customWinAudios.find((a) => a.id === state.winSoundType) || null;
              playWinSound(0.6, state.winSoundType, genericCustomWin, vol);
            }
            state.setWinSoundPlayedInRace(true);
          }
        }

        // 2. Stop the continuous background race sound when ALL cars have crossed the finish line
        if (!hasStoppedRaceSoundRef.current) {
          const allCrossed = racerPositions.current.every(p => p && p.totalDistance >= FINISH_LINE_DIST);
          if (allCrossed) {
            hasStoppedRaceSoundRef.current = true;
            stopContinuousAudio();
          }
        }
      }
    }
  };

  return (
    <>
      <LeaderboardUpdater
        slices={slices}
        positionsRef={racerPositions}
        leaderPosRef={leaderPosRef}
        isSpinning={isSpinning}
        activeWinnerId={activeWinnerId}
        targetRank={targetRank}
      />
      <CameraController
        isSpinning={isSpinning}
        expectedWinnerId={activeWinnerId}
        leaderPosRef={leaderPosRef}
        positionsRef={racerPositions}
        onModeChange={onModeChange}
        startPhase={startPhase}
        targetRank={targetRank}
        setTargetRank={setTargetRank}
        cameraMode={cameraMode}
        setCameraMode={setCameraMode}
      />

      <Environment files="https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/venice_sunset_1k.hdr" background blur={0.8} />
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[40, 60, -40]}
        intensity={2}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-80}
        shadow-camera-right={80}
        shadow-camera-top={80}
        shadow-camera-bottom={-80}
      />

      {/* Grass */}
      <mesh position={[0, -0.3, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1000, 1000]} />
        <meshStandardMaterial color="#14532d" roughness={1} />
      </mesh>

      {/* Track Asphalt */}
      <mesh position={[0, -0.2, TRACK_R]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[TRACK_L, TRACK_WIDTH]} />
        <meshStandardMaterial color="#111827" roughness={0.9} />
      </mesh>
      <mesh position={[0, -0.2, -TRACK_R]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[TRACK_L, TRACK_WIDTH]} />
        <meshStandardMaterial color="#111827" roughness={0.9} />
      </mesh>
      <mesh position={[TRACK_L / 2, -0.2, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[TRACK_R - TRACK_WIDTH / 2, TRACK_R + TRACK_WIDTH / 2, 64, 1, -Math.PI / 2, Math.PI]} />
        <meshStandardMaterial color="#111827" roughness={0.9} />
      </mesh>
      <mesh position={[-TRACK_L / 2, -0.2, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[TRACK_R - TRACK_WIDTH / 2, TRACK_R + TRACK_WIDTH / 2, 64, 1, Math.PI / 2, Math.PI]} />
        <meshStandardMaterial color="#111827" roughness={0.9} />
      </mesh>

      {/* Kerbs */}
      <mesh position={[0, -0.19, TRACK_R + TRACK_WIDTH / 2 + 0.5]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[TRACK_L, 1]} />
        <meshStandardMaterial map={kerbTex} roughness={0.8} />
      </mesh>
      <mesh position={[0, -0.19, TRACK_R - TRACK_WIDTH / 2 - 0.5]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[TRACK_L, 1]} />
        <meshStandardMaterial map={kerbTex} roughness={0.8} />
      </mesh>
      <mesh position={[0, -0.19, -TRACK_R + TRACK_WIDTH / 2 + 0.5]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[TRACK_L, 1]} />
        <meshStandardMaterial map={kerbTex} roughness={0.8} />
      </mesh>
      <mesh position={[0, -0.19, -TRACK_R - TRACK_WIDTH / 2 - 0.5]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[TRACK_L, 1]} />
        <meshStandardMaterial map={kerbTex} roughness={0.8} />
      </mesh>
      <mesh position={[TRACK_L / 2, -0.19, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[TRACK_R + TRACK_WIDTH / 2, TRACK_R + TRACK_WIDTH / 2 + 1, 64, 1, -Math.PI / 2, Math.PI]} />
        <meshStandardMaterial map={kerbTexCurve} roughness={0.8} />
      </mesh>
      <mesh position={[TRACK_L / 2, -0.19, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[TRACK_R - TRACK_WIDTH / 2 - 1, TRACK_R - TRACK_WIDTH / 2, 64, 1, -Math.PI / 2, Math.PI]} />
        <meshStandardMaterial map={kerbTexCurve} roughness={0.8} />
      </mesh>
      <mesh position={[-TRACK_L / 2, -0.19, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[TRACK_R + TRACK_WIDTH / 2, TRACK_R + TRACK_WIDTH / 2 + 1, 64, 1, Math.PI / 2, Math.PI]} />
        <meshStandardMaterial map={kerbTexCurve} roughness={0.8} />
      </mesh>
      <mesh position={[-TRACK_L / 2, -0.19, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[TRACK_R - TRACK_WIDTH / 2 - 1, TRACK_R - TRACK_WIDTH / 2, 64, 1, Math.PI / 2, Math.PI]} />
        <meshStandardMaterial map={kerbTexCurve} roughness={0.8} />
      </mesh>

      {/* Outer Walls */}
      <mesh position={[0, 0.5, TRACK_R + TRACK_WIDTH / 2 + 1.5]} receiveShadow castShadow>
        <boxGeometry args={[TRACK_L, 1.5, 1]} />
        <meshStandardMaterial color="#334155" />
      </mesh>
      <mesh position={[0, 0.5, -TRACK_R - TRACK_WIDTH / 2 - 1.5]} receiveShadow castShadow>
        <boxGeometry args={[TRACK_L, 1.5, 1]} />
        <meshStandardMaterial color="#334155" />
      </mesh>

      {/* Inner Walls */}
      <mesh position={[0, 0.2, TRACK_R - TRACK_WIDTH / 2 - 1.5]} receiveShadow castShadow>
        <boxGeometry args={[TRACK_L, 1, 1]} />
        <meshStandardMaterial color="#e2e8f0" />
      </mesh>
      <mesh position={[0, 0.2, -TRACK_R + TRACK_WIDTH / 2 + 1.5]} receiveShadow castShadow>
        <boxGeometry args={[TRACK_L, 1, 1]} />
        <meshStandardMaterial color="#e2e8f0" />
      </mesh>

      {/* Starting Grid Structures */}
      <StartLightGantry lightsCount={lightsCount} isLightsOut={isLightsOut} />
      <StartingGridMarkings total={slices.length} />
      <CheckeredLine />
      <Scenery />

      {slices.map((slice, index) => {
        const color = slice.color;
        const simProfile = simData ? simData.find(c => c.id === slice.item.id)?.profile : null;

        return (
          <Racer
            key={slice.item.id}
            item={slice.item}
            color={color}
            index={index}
            total={slices.length}
            isSpinning={isSpinning}
            spinDurationSeconds={durationSeconds}
            expectedWinnerId={activeWinnerId}
            onUpdatePosition={handleUpdatePosition}
            isWinner={activeWinnerId === slice.item.id}
            simProfile={simProfile}
            startPhase={startPhase}
          />
        );
      })}
    </>
  );
};

export const RaceDisplay = () => {
  const { slices } = useWheelData();
  const { t } = useTranslation();
  const isSpinning = useAppStore(state => state.isSpinning);
  const masterVolume = useAppStore(state => state.masterVolume);
  const soundEnabled = useAppStore(state => state.soundEnabled);
  const { spinWheel: handleSpinClick } = useWheelActions();

  const [cameraMode, setCameraMode] = useState('idle');
  const [targetRank, setTargetRank] = useState<number>(0);
  const [startPhase, setStartPhase] = useState<'idle' | 'grid' | 'lights_1' | 'lights_2' | 'lights_3' | 'lights_4' | 'lights_5' | 'lights_hold' | 'racing'>('idle');
  const [lightsCount, setLightsCount] = useState(0);
  const [isLightsOut, setIsLightsOut] = useState(false);

  const canSpin = slices.length > 1 && !isSpinning;

  useEffect(() => {
    let timeouts: NodeJS.Timeout[] = [];

    if (isSpinning) {
      setStartPhase('grid');
      setTargetRank(0);
      setLightsCount(0);
      setIsLightsOut(false);

      const vol = soundEnabled ? masterVolume / 100 : 0;
      playEngineRevBeep(0.35, vol);

      // Light 1 (700ms)
      timeouts.push(setTimeout(() => {
        setStartPhase('lights_1');
        setLightsCount(1);
        playStartLightBeep(1, vol);
      }, 700));

      // Light 2 (1400ms)
      timeouts.push(setTimeout(() => {
        setStartPhase('lights_2');
        setLightsCount(2);
        playStartLightBeep(2, vol);
      }, 1400));

      // Light 3 (2100ms)
      timeouts.push(setTimeout(() => {
        setStartPhase('lights_3');
        setLightsCount(3);
        playStartLightBeep(3, vol);
      }, 2100));

      // Light 4 (2800ms)
      timeouts.push(setTimeout(() => {
        setStartPhase('lights_4');
        setLightsCount(4);
        playStartLightBeep(4, vol);
      }, 2800));

      // Light 5 (3500ms)
      timeouts.push(setTimeout(() => {
        setStartPhase('lights_5');
        setLightsCount(5);
        playStartLightBeep(5, vol);
      }, 3500));

      // Hold lights (4200ms)
      timeouts.push(setTimeout(() => {
        setStartPhase('lights_hold');
        playEngineRevBeep(0.85, vol);
      }, 4200));

      // Lights out! (At exactly RACE_START_DELAY_MS)
      const raceGoTime = RACE_START_DELAY_MS;

      timeouts.push(setTimeout(() => {
        setStartPhase('racing');
        setLightsCount(0);
        setIsLightsOut(true);
        playLightsOutGoSound(vol);
        playRaceDefinedAudio();
      }, raceGoTime));
    } else {
      setStartPhase('idle');
      setLightsCount(0);
      setIsLightsOut(false);
    }

    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, [isSpinning, soundEnabled, masterVolume]);

  return (
    <div className="relative flex-1 h-full bg-slate-950 overflow-hidden shadow-2xl">
      {/* Race Leaderboard Sidebar HUD */}
      <div className="absolute top-12 left-8 z-10 w-48 bg-slate-900/95 backdrop-blur-md border-t-2 border-t-red-600 rounded-b-lg overflow-hidden shadow-2xl pointer-events-none">
        <div className="bg-slate-800 px-3 py-2 text-white font-black text-[10px] tracking-widest uppercase border-b border-slate-700 flex justify-between items-center">
          <span>{t('race.pos', 'POS')}</span>
          <span id="sector-display" className="text-red-500 font-bold">{t('race.lap', 'LAP')} 1/{TOTAL_LAPS}</span>
        </div>
        <div className="relative pb-1 transition-all duration-300" style={{ height: `${slices.length * 32}px` }}>
          {slices.map((slice, i) => (
            <div
              key={slice.item.id}
              id={`leaderboard-racer-${slice.item.id}`}
              className="absolute left-0 right-0 flex items-center gap-2 bg-slate-900 border-b border-slate-800/80 px-2 py-1.5 transition-transform duration-300 ease-out"
              style={{ top: 0, transform: `translateY(${i * 32}px)` }}
            >
              <div id={`leaderboard-rank-${slice.item.id}`} className="w-5 text-center text-[10px] font-black text-white/50">
                {i + 1}
              </div>
              <div className="w-1.5 h-3.5 rounded-sm" style={{ backgroundColor: slice.color }}></div>
              <div className="text-[11px] font-black tracking-wide uppercase text-white/90 truncate flex-1">{slice.item.text}</div>
              <div id={`leaderboard-status-${slice.item.id}`} className="ml-auto"></div>
            </div>
          ))}
        </div>
      </div>

      {/* Authentic TV Broadcast Graphics Overlay System */}
      <div
        className={`absolute bottom-6 left-1/2 -translate-x-1/2 z-20 transition-all duration-300 flex flex-col items-center max-w-lg w-full px-4 ${
          isSpinning ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none'
        }`}
      >
        {/* CAMERA TYPE 1: ONBOARD COCKPIT & REAR MIRROR TELEMETRY HUD */}
        {(cameraMode === 'bumper' || cameraMode === 'rear') && (
          <div className="bg-slate-950/95 backdrop-blur-md border-b-2 border-b-amber-500 rounded-lg overflow-hidden shadow-2xl flex items-center justify-between px-3.5 py-1.5 border border-slate-800 w-full gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span id="onboard-driver-pos" className="bg-amber-500 text-slate-950 font-black px-1.5 py-0.5 rounded text-[10px] shadow flex-shrink-0">
                P1
              </span>
              <div id="onboard-driver-color" className="w-2.5 h-3.5 rounded-sm flex-shrink-0" />
              <span id="onboard-driver-name" className="text-xs text-white font-black uppercase tracking-wide truncate max-w-[130px]">
                {t('race.driver_placeholder', 'PILOTO')}
              </span>
              <span className="text-[9px] font-black uppercase text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 flex-shrink-0">
                {cameraMode === 'rear' ? 'ESPELHO TRASEIRO' : 'ONBOARD FRONTAL'}
              </span>
            </div>

            <div className="flex items-center gap-2.5 flex-shrink-0">
              <div className="hidden sm:flex items-center gap-1">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} id={`rpm-led-${i}`} className="w-2 h-2.5 rounded-sm bg-slate-800 transition-all duration-75" />
                ))}
              </div>
              <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                <span id="onboard-driver-gear" className="text-amber-400 font-black text-xs">M1</span>
                <span className="text-slate-700 text-[10px]">•</span>
                <span id="onboard-driver-speed" className="text-white font-mono font-bold text-xs">0 KM/H</span>
              </div>
            </div>
          </div>
        )}

        {/* CAMERA TYPE 2: BATTLE & DUEL MODE (ACTION) */}
        {cameraMode === 'action' && (
          <div className="bg-slate-950/95 backdrop-blur-md border-l-4 border-l-amber-500 rounded-r-lg overflow-hidden shadow-2xl flex items-center justify-between px-3.5 py-1.5 border border-slate-800 w-full gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[9px] font-black tracking-widest uppercase text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 flex-shrink-0">
                DISPUTA
              </span>
              <span id="onboard-driver-pos" className="bg-amber-500 text-slate-950 font-black px-1.5 py-0.5 rounded text-[10px] flex-shrink-0">
                P1
              </span>
              <div id="onboard-driver-color" className="w-2.5 h-3.5 rounded-sm flex-shrink-0" />
              <span id="onboard-driver-name" className="text-xs text-white font-black uppercase tracking-wide truncate">
                {t('race.driver_placeholder', 'PILOTO')}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span id="onboard-driver-gap" className="text-[10px] font-mono font-bold text-amber-300">
                +0.0m
              </span>
              <span id="onboard-driver-speed" className="text-white font-mono font-bold text-xs bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                0 KM/H
              </span>
            </div>
          </div>
        )}

        {/* CAMERA TYPE 3: AERIAL HELICOPTER BIRD'S-EYE BUG */}
        {cameraMode === 'helicopter' && (
          <div className="bg-slate-950/95 backdrop-blur-md border-t-2 border-t-cyan-500 rounded-lg px-3.5 py-1.5 shadow-2xl flex items-center justify-between border border-slate-800 w-full gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[9px] font-black tracking-widest uppercase text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20 flex-shrink-0">
                AÉREA 🚁
              </span>
              <span id="onboard-driver-pos" className="bg-cyan-500 text-slate-950 font-black px-1.5 py-0.5 rounded text-[10px] flex-shrink-0">
                P1
              </span>
              <div id="onboard-driver-color" className="w-2.5 h-3.5 rounded-sm flex-shrink-0" />
              <span id="onboard-driver-name" className="text-xs text-white font-black uppercase truncate">
                {t('race.driver_placeholder', 'PILOTO')}
              </span>
            </div>
            <span id="onboard-driver-speed" className="text-white font-mono font-bold text-xs bg-slate-900 px-2 py-0.5 rounded border border-slate-800 flex-shrink-0">
              0 KM/H
            </span>
          </div>
        )}

        {/* CAMERA TYPE 3B: TV CRANE / JIB CAMERA BUG */}
        {cameraMode === 'crane' && (
          <div className="bg-slate-950/95 backdrop-blur-md border-t-2 border-t-purple-500 rounded-lg px-3.5 py-1.5 shadow-2xl flex items-center justify-between border border-slate-800 w-full gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[9px] font-black tracking-widest uppercase text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20 flex-shrink-0">
                GRUA 🎥
              </span>
              <span id="onboard-driver-pos" className="bg-purple-500 text-slate-950 font-black px-1.5 py-0.5 rounded text-[10px] flex-shrink-0">
                P1
              </span>
              <div id="onboard-driver-color" className="w-2.5 h-3.5 rounded-sm flex-shrink-0" />
              <span id="onboard-driver-name" className="text-xs text-white font-black uppercase truncate">
                {t('race.driver_placeholder', 'PILOTO')}
              </span>
            </div>
            <span id="onboard-driver-speed" className="text-white font-mono font-bold text-xs bg-slate-900 px-2 py-0.5 rounded border border-slate-800 flex-shrink-0">
              0 KM/H
            </span>
          </div>
        )}

        {/* CAMERA TYPE 4: START GRID PROCEDURE */}
        {cameraMode === 'grid' && (
          <div className="bg-slate-950/95 backdrop-blur-md border-l-4 border-l-red-600 rounded-r-lg px-3.5 py-1.5 shadow-2xl flex items-center justify-between border border-slate-800 w-full">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
              <span className="text-xs text-white font-bold tracking-wide uppercase">
                GRID DE LARGADA
              </span>
            </div>
          </div>
        )}

        {/* CAMERA TYPE 5: OFFICIAL BROADCAST TV, TRACKSIDE & LOW-SIDE LOWER-THIRD */}
        {(cameraMode === 'tv' || cameraMode === 'trackside' || cameraMode === 'low_side' || cameraMode === 'finish' || cameraMode === 'idle') && (
          <div className="bg-slate-950/95 backdrop-blur-md border-l-4 border-l-red-600 rounded-r-lg overflow-hidden shadow-2xl flex items-center justify-between px-3.5 py-1.5 border border-slate-800 w-full gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
              <span id="onboard-driver-pos" className="bg-amber-500 text-slate-950 font-black px-1.5 py-0.5 rounded text-[10px] flex-shrink-0">
                P1
              </span>
              <div id="onboard-driver-color" className="w-2.5 h-3.5 rounded-sm flex-shrink-0" />
              <span id="onboard-driver-name" className="text-xs text-white font-black uppercase tracking-wide truncate">
                {t('race.driver_placeholder', 'PILOTO')}
              </span>
              <span id="onboard-driver-gap" className="text-[10px] text-amber-400 font-mono font-bold truncate">
                LÍDER
              </span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span id="onboard-driver-speed" className="text-white font-mono font-bold text-xs bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                0 KM/H
              </span>
            </div>
          </div>
        )}
      </div>

      {!isSpinning && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 w-full max-w-sm px-4">
          <button
            onClick={() => handleSpinClick()}
            disabled={!canSpin}
            className="w-full py-4 bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white font-black rounded-lg shadow-2xl border border-red-500/50 transition-all transform hover:-translate-y-1 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-[0.2em] text-lg relative overflow-hidden group flex items-center justify-center gap-3 skew-x-[-5deg]"
          >
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[150%] group-hover:translate-x-[150%] transition-transform duration-700 ease-in-out" />
            <Flag className="w-6 h-6 text-white skew-x-[5deg]" />
            <span className="skew-x-[5deg] font-black italic">{t('race.start', 'START RACE')}</span>
          </button>
        </div>
      )}

      <Canvas 
        shadows="percentage" 
        dpr={[1, 2]} 
        gl={{ powerPreference: "high-performance", antialias: true }}
        camera={{ position: [-40, 30, 40], fov: 50 }}
      >
        <React.Suspense fallback={null}>
          <RaceScene
            onModeChange={setCameraMode}
            startPhase={startPhase}
            lightsCount={lightsCount}
            isLightsOut={isLightsOut}
            targetRank={targetRank}
            setTargetRank={setTargetRank}
            cameraMode={cameraMode}
            setCameraMode={setCameraMode}
          />
        </React.Suspense>
      </Canvas>
    </div>
  );
};
