import { PodiumRacer } from '../../../types';
import {
  TOTAL_LAPS,
  TRACK_P,
  TRACK_HALF_WIDTH,
  getCircuitPosition,
  getLookaheadCurvature,
} from './trackCircuit';

export const SIM_STEPS = 1200;

export interface SimFrame {
  dist: number;
  lane: number; // normalized -1..1 across usable track width
  speed: number; // m/s simulation speed
  displayKmh: number; // calibrated Grand Prix speed readout (km/h)
  gear: number; // 1..8
  steerAngle: number; // radians for front wheels
  drsActive: boolean;
  inSlipstream: boolean;
  braking: boolean;
}

export interface SimulatedCar {
  id: string;
  index: number;
  targetRank: number;
  profile: SimFrame[];
}

export interface LiveRacerTelemetry {
  id: string;
  x: number;
  z: number;
  angle: number;
  totalDistance: number;
  lane: number;
  speed: number;
  displayKmh: number;
  gear: number;
  steerAngle: number;
  drsActive: boolean;
  inSlipstream: boolean;
  braking: boolean;
  curvature: number;
  signedCurvature: number;
  drsZone: 0 | 1 | 2;
  sector: 1 | 2 | 3;
}

export const USABLE_HALF_WIDTH = TRACK_HALF_WIDTH - 2.6; // keep wheels safely inside white lines

function computeGearFromKmh(kmh: number): number {
  if (kmh < 65) return 1;
  if (kmh < 105) return 2;
  if (kmh < 145) return 3;
  if (kmh < 185) return 4;
  if (kmh < 225) return 5;
  if (kmh < 260) return 6;
  if (kmh < 292) return 7;
  return 8;
}

/**
 * Generates a curvature-aware, slipstream & DRS-driven Grand Prix simulation
 * guaranteed to finish in the exact `racePodium` order around `durationSeconds`.
 */
export function generateGrandPrixSimulation(
  slices: { item: { id: string; text: string }; color: string }[],
  durationSeconds: number,
  racePodium: PodiumRacer[] | null
): SimulatedCar[] {
  const numRacers = slices.length;
  const dt = durationSeconds / SIM_STEPS;
  const extraSteps = Math.floor(1.6 / dt);
  const totalSteps = SIM_STEPS + extraSteps;

  const FINISH_DIST = TOTAL_LAPS * TRACK_P;
  const spread = Math.min(95, Math.max(36, numRacers * 8.5));

  // Build normalized reference pack trajectory with real braking into corners & chicanes
  const refDist = new Float64Array(totalSteps + 1);
  const refSpeed = new Float64Array(totalSteps + 1);

  const avgBaseSpeed = FINISH_DIST / Math.max(5, durationSeconds - 0.35);
  let simD = 0;
  let simV = 0;

  for (let step = 0; step <= totalSteps; step++) {
    const t = step * dt;
    // Standing launch ramp over first 1.5s
    const launchRamp = Math.min(1, t / 1.5);
    const launchCurve = launchRamp * (2 - launchRamp);

    const localPose = getCircuitPosition(simD, 0);
    const aheadK = getLookaheadCurvature(simD, 32);
    const effectiveK = Math.max(localPose.curvature, aheadK * 0.92);

    // Curvature factor: 0 on straights, 1 at tightest hairpin/chicane
    const cornerLoad = Math.min(1, effectiveK / 0.03);
    const targetMult = 1.24 - cornerLoad * 0.66; // straights ~1.24x, hairpins ~0.58x
    const desiredV = avgBaseSpeed * targetMult * (0.25 + 0.75 * launchCurve);

    // Asymmetric acceleration vs braking responsiveness
    const accelRate = desiredV < simV ? 8.5 : 4.2;
    simV += (desiredV - simV) * Math.min(1, dt * accelRate);
    refSpeed[step] = simV;
    refDist[step] = simD;
    simD += simV * dt;
  }

  // Calibrate scale so reference hits FINISH_DIST + 14m cleanly at step = SIM_STEPS
  const distAtTarget = refDist[SIM_STEPS] || FINISH_DIST;
  const scaleFactor = (FINISH_DIST + 14) / distAtTarget;
  for (let step = 0; step <= totalSteps; step++) {
    refDist[step] *= scaleFactor;
    refSpeed[step] *= scaleFactor;
  }

  // Initialize cars on staggered 2x2 F1 grid behind start/finish line
  const cars = slices.map((slice, idx) => {
    const rank = racePodium
      ? racePodium.find((p) => p.id === slice.item.id)?.rank || numRacers
      : numRacers;
    const gridStartDist = -6 - idx * 6.8;
    const gridStartLane = idx % 2 === 0 ? -0.45 : 0.45;
    const seed = ((idx * 37 + slice.item.id.charCodeAt(0) * 19) % 1000) / 1000;

    return {
      id: slice.item.id,
      index: idx,
      dist: gridStartDist,
      startDist: gridStartDist,
      lane: gridStartLane,
      prevLane: gridStartLane,
      preferredLane: numRacers > 1 ? -0.6 + (idx / (numRacers - 1)) * 1.2 : 0,
      speed: 0,
      prevSpeed: 0,
      targetRank: rank,
      reactionDelay: 0.04 + seed * 0.16,
      launchGrip: 0.65 + seed * 0.65,
      seed,
      profile: [] as SimFrame[],
    };
  });

  // Podium lock-in window: battles stay intense until ~82% race progress, then lock cleanly before checkered flag
  const BLEND_START = 0.76;
  const BLEND_END = 0.94;

  for (let step = 0; step <= totalSteps; step++) {
    const t = step * dt;
    const progress = Math.min(1.0, t / durationSeconds);
    const packDist = refDist[step];
    const packSpeed = refSpeed[step];

    // Sort live order to evaluate slipstream & overtaking
    const sorted = [...cars].sort((a, b) => b.dist - a.dist);

    cars.forEach((car) => {
      const rankFraction = numRacers > 1 ? (car.targetRank - 1) / (numRacers - 1) : 0;
      const pose = getCircuitPosition(car.dist, car.lane * USABLE_HALF_WIDTH);
      const aheadK = getLookaheadCurvature(car.dist, 28);
      const isBrakingZone = aheadK > pose.curvature + 0.004 && aheadK > 0.012;

      // 1. Standing start stagger dissipation over first ~20% of race
      const staggerBlend = progress < 0.24 ? Math.cos((progress / 0.24) * (Math.PI / 2)) : 0;

      // 2. Launch burst variation off the grid
      let launchOffset = 0;
      const tSinceReaction = Math.max(0, t - car.reactionDelay);
      if (tSinceReaction > 0 && tSinceReaction < 4.5) {
        const burst = Math.sin((tSinceReaction / 4.5) * Math.PI);
        launchOffset = car.launchGrip * 14 * burst;
      }

      // 3. Slipstream (Vácuo) & DRS detection relative to car directly ahead
      const carIdxInSorted = sorted.findIndex((c) => c.id === car.id);
      const carAhead = carIdxInSorted > 0 ? sorted[carIdxInSorted - 1] : null;
      const gapAhead = carAhead ? carAhead.dist - car.dist : 999;

      const inLateralWake = carAhead ? Math.abs(carAhead.lane - car.lane) < 0.65 : false;
      const inSlipstream =
        t > 2.2 &&
        carAhead !== null &&
        gapAhead > 3.2 &&
        gapAhead < 24 &&
        inLateralWake &&
        pose.curvature < 0.018;

      const drsEnabledLap = car.dist > TRACK_P; // DRS unlocks from Lap 2 onward
      const drsActive =
        drsEnabledLap &&
        pose.drsZone !== 0 &&
        carAhead !== null &&
        gapAhead > 2.5 &&
        gapAhead < 26;

      // 4. Mid-race organic duel waves (overtakes & counter-attacks)
      const phase = car.index * 1.43 + car.seed * 6.28;
      const waveA = Math.sin(progress * (14 + (car.index % 3) * 3.1) + phase) * 18;
      const waveB = Math.cos(progress * (23 + (car.index % 4) * 2.2) + phase * 0.7) * 9.5;
      const aeroBoost = (inSlipstream ? 7.5 : 0) + (drsActive ? 11.5 : 0);

      // 5. Final podium convergence blend
      let blend = 0;
      if (progress > BLEND_START) {
        const rawB = Math.min(1, (progress - BLEND_START) / (BLEND_END - BLEND_START));
        blend = rawB * rawB * (3 - 2 * rawB);
      }

      // Winner settles slightly ahead of pack center; trailing finishers spread cleanly
      const finalOffset = 10 - rankFraction * spread;

      const targetDist =
        packDist +
        car.startDist * staggerBlend +
        (launchOffset + waveA + waveB + aeroBoost) * (1 - blend) +
        finalOffset * blend;

      const prevDist = car.dist;
      const stepDelta = (targetDist - car.dist) * Math.min(1, dt * 6.8);
      const minForward = t > car.reactionDelay ? Math.max(4, packSpeed * 0.35) * dt : 0;

      car.dist = prevDist + Math.max(minForward, stepDelta);
      car.prevSpeed = car.speed;
      car.speed = dt > 0 ? (car.dist - prevDist) / dt : 0;

      // 6. Racing Line & Overtaking Lateral Logic
      // Apex hugging: shift toward inside of corners based on signed curvature
      const apexBias = Math.max(-0.55, Math.min(0.55, -pose.signedCurvature * 22));
      let targetLane = car.preferredLane * 0.35 + apexBias;

      if (carAhead && gapAhead < 14 && Math.abs(carAhead.lane - car.lane) < 0.52) {
        // Pull out of slipstream to attempt overtake on open side
        targetLane = carAhead.lane > 0 ? Math.max(-0.85, carAhead.lane - 0.78) : Math.min(0.85, carAhead.lane + 0.78);
      } else if (drsActive && carAhead && gapAhead < 18) {
        targetLane = carAhead.lane > 0 ? -0.55 : 0.55;
      }

      // Winner takes clean center-inside racing line into the checkered flag
      if (progress > 0.88 && car.targetRank === 1) {
        targetLane = -0.2;
      }

      car.prevLane = car.lane;
      car.lane += (targetLane - car.lane) * Math.min(1, dt * 4.2);
      car.lane = Math.max(-0.92, Math.min(0.92, car.lane));

      // Store temporary flags for collision pass
      (car as any)._drsActive = drsActive;
      (car as any)._inSlipstream = inSlipstream;
      (car as any)._isBrakingZone = isBrakingZone;
      (car as any)._curvature = pose.signedCurvature;
    });

    // 7. Side-by-side collision avoidance so cars never clip into each other
    if (numRacers > 1) {
      for (let pass = 0; pass < 2; pass++) {
        for (let i = 0; i < numRacers; i++) {
          for (let j = i + 1; j < numRacers; j++) {
            const a = cars[i];
            const b = cars[j];
            const dDiff = a.dist - b.dist;
            const absD = Math.abs(dDiff);
            const lDiff = a.lane - b.lane;
            const absL = Math.abs(lDiff);

            if (absD < 5.2 && absL < 0.44) {
              const pushL = (0.44 - absL) * 0.55;
              const dirL = absL < 0.01 ? (i % 2 === 0 ? 1 : -1) : lDiff > 0 ? 1 : -1;
              a.lane = Math.max(-0.95, Math.min(0.95, a.lane + dirL * pushL));
              b.lane = Math.max(-0.95, Math.min(0.95, b.lane - dirL * pushL));

              const pushD = (5.2 - absD) * 0.04;
              const dirD = dDiff >= 0 ? 1 : -1;
              a.dist += dirD * pushD;
              b.dist -= dirD * pushD;
            }
          }
        }
      }
    }

    // 8. Record final frame telemetry
    cars.forEach((car) => {
      const ratioToAvg = avgBaseSpeed > 0 ? car.speed / avgBaseSpeed : 0;
      const drsActive = Boolean((car as any)._drsActive);
      const inSlipstream = Boolean((car as any)._inSlipstream);
      const isBrakingZone = Boolean((car as any)._isBrakingZone);
      const signedK = Number((car as any)._curvature || 0);

      // Calibrated realistic F1 km/h display (0 km/h on grid, 95-332 km/h racing)
      let displayKmh = Math.round(
        Math.min(336, Math.max(0, ratioToAvg * 242 + (drsActive ? 18 : 0) + (inSlipstream ? 9 : 0)))
      );
      if (t < car.reactionDelay) displayKmh = 0;

      const laneRate = dt > 0 ? (car.lane - car.prevLane) / dt : 0;
      const steerAngle = Math.max(-0.42, Math.min(0.42, -signedK * 11 - laneRate * 0.14));
      const decel = dt > 0 ? (car.speed - car.prevSpeed) / dt : 0;
      const braking = t > 2 && (decel < -7 || isBrakingZone);

      car.profile.push({
        dist: car.dist,
        lane: car.lane,
        speed: car.speed,
        displayKmh,
        gear: computeGearFromKmh(displayKmh),
        steerAngle,
        drsActive,
        inSlipstream,
        braking,
      });
    });
  }

  return cars.map((c) => ({
    id: c.id,
    index: c.index,
    targetRank: c.targetRank,
    profile: c.profile,
  }));
}
