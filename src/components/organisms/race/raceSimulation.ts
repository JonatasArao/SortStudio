import { PodiumRacer, RaceTrackStyle } from '../../../types';
import {
  GRID_FIRST_DIST,
  GRID_STEP_DIST,
  GRID_LANE_MAG,
  TRACK_HALF_WIDTH,
  TRACK_SAMPLES,
  getCircuitConfig,
} from './trackCircuit';

export const SIM_FPS = 60;
export const SIM_STEPS = 1200; // Legacy compatibility constant

export type OvertakeState = 'CRUISE' | 'DRAFTING' | 'PULL_OUT' | 'SIDE_BY_SIDE' | 'DEFENDING';

export interface SimFrame {
  dist: number;
  lane: number; // normalized -1..1 across usable track width
  speed: number; // simulation m/s
  displayKmh: number; // calibrated speed readout (km/h)
  gear: number; // 1..8 (or 1..5 in NASCAR)
  rpmRatio: number; // 0.15..1.0 within current gear
  steerAngle: number; // radians for front wheels (+ = left, - = right)
  yawAngle: number; // radians chassis heading offset relative to track tangent
  longAccel: number; // normalized longitudinal G (-1 braking .. +1 acceleration)
  latAccel: number; // normalized lateral G (-1 left .. +1 right)
  brakeIntensity: number; // 0..1
  drsActive: boolean;
  inSlipstream: boolean;
  braking: boolean;
  onKerb: boolean;
  tireSmoke: number; // 0..1
  sparks: number; // 0..1
  battleState: OvertakeState;
}

export interface SimulatedCar {
  id: string;
  index: number;
  targetRank: number;
  simDt: number;
  raceSteps: number;
  profile: SimFrame[];
}

export interface AuthenticRaceResult {
  cars: SimulatedCar[];
  podium: PodiumRacer[];
  winnerCrossTime: number;
  lastCrossTime: number;
}

export interface LiveRacerTelemetry {
  id: string;
  x: number;
  y: number;
  z: number;
  angle: number; // chassis world heading (trackAngle + yawAngle)
  trackAngle: number;
  pitchAngle: number; // road slope pitch (radians, + = uphill)
  bankAngle: number; // cross-track banking angle (radians)
  yawAngle: number;
  totalDistance: number;
  lane: number;
  speed: number;
  displayKmh: number;
  gear: number;
  rpmRatio: number;
  steerAngle: number;
  longAccel: number;
  latAccel: number;
  brakeIntensity: number;
  drsActive: boolean;
  inSlipstream: boolean;
  braking: boolean;
  onKerb: boolean;
  tireSmoke: number;
  sparks: number;
  battleState: OvertakeState;
  curvature: number;
  signedCurvature: number;
  drsZone: 0 | 1 | 2;
  sector: 1 | 2 | 3;
}

// Default usable half-width for Interlagos compatibility
export const USABLE_HALF_WIDTH = TRACK_HALF_WIDTH - 1.8;

// Solid-body car bounding constants calibrated for CAR_VISUAL_SCALE = 1.45
const MIN_BUMPER_GAP = 4.15;
const SAFE_FOLLOW_DIST = 6.0;
const SIDE_BY_SIDE_LEN = 4.35;

const F1_GEAR_THRESHOLDS = [0, 68, 108, 148, 188, 226, 262, 296, 348];
const NASCAR_GEAR_THRESHOLDS = [0, 82, 138, 196, 254, 340];

function computeGearAndRpm(kmh: number, isDaytona: boolean): { gear: number; rpmRatio: number } {
  if (kmh <= 4) return { gear: 1, rpmRatio: 0.22 };
  const thresholds = isDaytona ? NASCAR_GEAR_THRESHOLDS : F1_GEAR_THRESHOLDS;
  const maxGear = thresholds.length - 1;
  for (let g = 1; g <= maxGear; g++) {
    const low = thresholds[g - 1];
    const high = thresholds[g];
    if (kmh <= high || g === maxGear) {
      const span = Math.max(20, high - low);
      const frac = Math.max(0, Math.min(1, (kmh - low) / span));
      const rpmRatio = Math.min(1, 0.42 + frac * 0.56);
      return { gear: g, rpmRatio };
    }
  }
  return { gear: maxGear, rpmRatio: 0.92 };
}

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

function sampleCurvatureFast(dist: number, trackStyle: RaceTrackStyle): number {
  const cfg = getCircuitConfig(trackStyle);
  const perimeter = cfg.perimeter;
  const samples = cfg.samples;
  let lapDist = dist % perimeter;
  if (lapDist < 0) lapDist += perimeter;
  const exactIdx = (lapDist / perimeter) * TRACK_SAMPLES;
  const idx0 = Math.floor(exactIdx) % TRACK_SAMPLES;
  const idx1 = (idx0 + 1) % TRACK_SAMPLES;
  const f = exactIdx - Math.floor(exactIdx);
  const c0 = samples[idx0].curvature;
  const c1 = samples[idx1].curvature;
  return c0 + (c1 - c0) * f;
}

function getCornerSpeedLimit(dist: number, paceBaseSpeed: number, trackStyle: RaceTrackStyle): number {
  const curvature = sampleCurvatureFast(dist, trackStyle);
  if (trackStyle === 'daytona') {
    // 31-degree banked turns scrub slight momentum, setting up huge straightaway draft runs
    const cornerLoad = Math.min(1, curvature / 0.015);
    return paceBaseSpeed * (1.14 - Math.pow(cornerLoad, 0.88) * 0.16);
  }
  const cornerLoad = Math.min(1, curvature / 0.032);
  return paceBaseSpeed * (1.34 - Math.pow(cornerLoad, 0.85) * 0.84);
}

function getSafeLookaheadSpeed(
  dist: number,
  paceBaseSpeed: number,
  brakeDecel: number,
  lateBrakeBonus = 1.0,
  trackStyle: RaceTrackStyle = 'interlagos'
): number {
  let minSafe = getCornerSpeedLimit(dist, paceBaseSpeed, trackStyle);
  if (trackStyle === 'daytona') {
    const aheadCorner = getCornerSpeedLimit(dist + 28, paceBaseSpeed, 'daytona');
    return Math.min(minSafe, aheadCorner);
  }
  const effBrake = brakeDecel * lateBrakeBonus;
  for (let L = 6; L <= 96; L += 6) {
    const vCorner = getCornerSpeedLimit(dist + L, paceBaseSpeed, trackStyle);
    const vSafe = Math.sqrt(vCorner * vCorner + 2 * effBrake * L);
    if (vSafe < minSafe) minSafe = vSafe;
  }
  return minSafe;
}

function getTrackSampleFieldsFast(
  dist: number,
  trackStyle: RaceTrackStyle
): {
  curvature: number;
  signedCurvature: number;
  idealLane: number;
  drsZone: 0 | 1 | 2;
} {
  const cfg = getCircuitConfig(trackStyle);
  const perimeter = cfg.perimeter;
  const samples = cfg.samples;
  let lapDist = dist % perimeter;
  if (lapDist < 0) lapDist += perimeter;
  const exactIdx = (lapDist / perimeter) * TRACK_SAMPLES;
  const idx0 = Math.floor(exactIdx) % TRACK_SAMPLES;
  const idx1 = (idx0 + 1) % TRACK_SAMPLES;
  const f = exactIdx - Math.floor(exactIdx);
  const s0 = samples[idx0];
  const s1 = samples[idx1];
  return {
    curvature: s0.curvature + (s1.curvature - s0.curvature) * f,
    signedCurvature: s0.signedCurvature + (s1.signedCurvature - s0.signedCurvature) * f,
    idealLane: s0.idealLane + (s1.idealLane - s0.idealLane) * f,
    drsZone: s0.drsZone,
  };
}

function getUpcomingCornerFast(
  progressDistance: number,
  lookaheadMeters: number,
  trackStyle: RaceTrackStyle
): { curvature: number; signedCurvature: number } {
  const cfg = getCircuitConfig(trackStyle);
  const perimeter = cfg.perimeter;
  const samples = cfg.samples;
  let maxK = 0;
  let maxSignedK = 0;
  for (let d = 5; d <= lookaheadMeters; d += 7) {
    let lapDist = (progressDistance + d) % perimeter;
    if (lapDist < 0) lapDist += perimeter;
    const idx = Math.floor((lapDist / perimeter) * TRACK_SAMPLES) % TRACK_SAMPLES;
    const s = samples[idx];
    if (s.curvature > maxK) {
      maxK = s.curvature;
      maxSignedK = s.signedCurvature;
    }
  }
  return { curvature: maxK, signedCurvature: maxSignedK };
}

interface CarTrait {
  basePace: number;
  ersSkill: number;
  lateErsBoost: number;
  earlyControl: number;
  lateBrakeSkill: number;
  launchGrip: number;
  reactionDelay: number;
  seed: number;
  stintPhase: number;
  waveAmp: number;
}

/**
 * Runs a 100% pure forward solid-body physics race from grid to checkered flag.
 */
function runForwardSolidPhysics(
  slices: { item: { id: string; text: string; weight?: number }; color: string }[],
  durationSeconds: number,
  traits: CarTrait[],
  avgBaseSpeed: number,
  maxBrakeDecel: number,
  maxDriveAccel: number,
  trackStyle: RaceTrackStyle,
  targetWinnerId?: string
): {
  cars: SimulatedCar[];
  crossingOrder: { id: string; text: string; color: string; crossTime: number }[];
  winnerCrossTime: number;
  lastCrossTime: number;
  overtakeCount: number;
  leadChanges: number;
  finalLapLeadChanges: number;
  maxP1P2Gap: number;
  winnerFinalLeadFrac: number;
} {
  const isDaytona = trackStyle === 'daytona';
  const cfg = getCircuitConfig(trackStyle);
  const perimeter = cfg.perimeter;
  const usableHalfWidth = cfg.usableHalfWidth;
  // On 15m Daytona (usableHalfWidth = 6.0m), 0.34 = 2.04m lateral separation -> clean 2-wide & 3-wide door-to-door racing
  const minLatClearance = isDaytona ? 0.34 : 0.30;
  const safeFollowDist = isDaytona ? 7.4 : SAFE_FOLLOW_DIST;

  const numRacers = slices.length;
  const dt = 1 / SIM_FPS;
  const FINISH_DIST = cfg.totalLaps * perimeter;
  const maxRaceTime = Math.max(durationSeconds + 22.0, durationSeconds * 1.75);
  const maxSteps = Math.round(maxRaceTime * SIM_FPS);

  const cars = slices.map((slice, idx) => {
    const gridStartDist = GRID_FIRST_DIST - idx * GRID_STEP_DIST;
    const gridStartLane = idx % 2 === 0 ? -GRID_LANE_MAG : GRID_LANE_MAG;
    const tr = traits[idx];

    return {
      id: slice.item.id,
      text: slice.item.text,
      color: slice.color,
      index: idx,
      dist: gridStartDist,
      lane: gridStartLane,
      latVel: 0,
      yawAngle: 0,
      speed: 0,
      prevSpeed: 0,
      basePace: tr.basePace,
      ersSkill: tr.ersSkill,
      lateErsBoost: tr.lateErsBoost,
      earlyControl: tr.earlyControl,
      lateBrakeSkill: tr.lateBrakeSkill,
      launchGrip: tr.launchGrip,
      reactionDelay: tr.reactionDelay,
      seed: tr.seed,
      stintPhase: tr.stintPhase,
      waveAmp: tr.waveAmp,
      battleState: 'CRUISE' as OvertakeState,
      overtakeTargetId: null as string | null,
      overtakeLane: gridStartLane,
      overtakeTimer: 0,
      crossTime: -1,
      profile: [] as SimFrame[],
    };
  });

  const carsById = new Map<string, (typeof cars)[number]>();
  cars.forEach((c) => carsById.set(c.id, c));

  const crossingOrder: { id: string; text: string; color: string; crossTime: number }[] = [];
  let allCrossedStep = -1;
  let overtakeCount = 0;
  let leadChanges = 0;
  let finalLapLeadChanges = 0;
  let maxP1P2Gap = 0;
  let prevLeaderId = '';
  let lastLeadOwnerId = '';
  let lastLeadChangeDist = 0;
  let prevLeaderIds: string[] = [];

  for (let step = 0; step <= maxSteps; step++) {
    const t = step * dt;
    const sorted = [...cars].sort((a, b) => b.dist - a.dist);

    if (sorted.length > 0 && sorted[0].dist < FINISH_DIST) {
      const p1 = sorted[0];
      const p2 = sorted.length > 1 ? sorted[1] : null;
      const p1p2Gap = p2 ? p1.dist - p2.dist : 0;
      if (p1p2Gap > maxP1P2Gap) maxP1P2Gap = p1p2Gap;

      if (!prevLeaderId) {
        prevLeaderId = p1.id;
        lastLeadOwnerId = p1.id;
        lastLeadChangeDist = p1.dist;
      } else if (p1.id !== prevLeaderId && p1p2Gap > 0.35) {
        leadChanges++;
        if (p1.dist >= FINISH_DIST * 0.64) {
          finalLapLeadChanges++;
        }
        prevLeaderId = p1.id;
        lastLeadOwnerId = p1.id;
        lastLeadChangeDist = p1.dist;
      }
    }

    if (step > 40 && step % 15 === 0) {
      const orderIds = sorted.map((c) => c.id);
      if (prevLeaderIds.length === orderIds.length) {
        for (let i = 0; i < orderIds.length; i++) {
          if (prevLeaderIds[i] !== orderIds[i]) {
            overtakeCount++;
            break;
          }
        }
      }
      prevLeaderIds = orderIds;
    }

    const isCorridorFree = (
      selfId: string,
      selfDist: number,
      targetLane: number,
      backCheck = 4.3,
      frontCheck = 14.0,
      excludeId?: string
    ): boolean => {
      if (Math.abs(targetLane) > 0.87) return false;
      for (let k = 0; k < numRacers; k++) {
        const other = cars[k];
        if (other.id === selfId || other.id === excludeId) continue;
        const dDiff = other.dist - selfDist;
        if (dDiff > -backCheck && dDiff < frontCheck) {
          if (Math.abs(other.lane - targetLane) < minLatClearance + 0.03) {
            return false;
          }
        }
      }
      return true;
    };

    const stepTargets = new Array<{
      desiredSpeed: number;
      targetLane: number;
      paceMult: number;
      drsActive: boolean;
      inSlipstream: boolean;
      lateBrakeBonus: number;
      signedCurvature: number;
    }>(numRacers);

    const towRangeMeters = isDaytona
      ? clamp(avgBaseSpeed * 0.145, 24, 34)
      : clamp(avgBaseSpeed * 1.18, 44, 98);
    const drsRangeMeters = clamp(avgBaseSpeed * 1.12, 42, 92);

    for (let sIdx = 0; sIdx < sorted.length; sIdx++) {
      const car = sorted[sIdx];
      const pose = getTrackSampleFieldsFast(car.dist, trackStyle);
      const upcoming = getUpcomingCornerFast(car.dist, 76, trackStyle);
      const lapProgress = clamp(car.dist / FINISH_DIST, 0, 1.15);

      let blockingCar: (typeof cars)[number] | null = null;
      let blockingGap = 999;
      let towStrength = 0;

      for (let k = sIdx - 1; k >= 0; k--) {
        const cand = sorted[k];
        const gap = cand.dist - car.dist;
        if (gap > towRangeMeters + 2) break;
        const latDiff = Math.abs(cand.lane - car.lane);
        const blockLookahead = isDaytona ? 42 : 34;
        if (!blockingCar && gap > 0.1 && gap < blockLookahead && latDiff < minLatClearance + 0.08) {
          blockingCar = cand;
          blockingGap = gap;
        }
        // Strict narrow draft cone on Daytona so cars must line up behind within the pack
        const towLatCone = isDaytona ? 0.42 : 0.78;
        const minTowGap = isDaytona ? 4.4 : 2.2;
        if (gap > minTowGap && gap < towRangeMeters && latDiff < towLatCone) {
          const distFalloff = 1 - Math.max(0, (gap - 6) / Math.max(20, towRangeMeters - 6));
          const latFalloff = 1 - (latDiff / towLatCone) * 0.45;
          const candidateTow = distFalloff * latFalloff;
          if (candidateTow > towStrength) towStrength = candidateTow;
        }
      }

      const carAhead = sIdx > 0 ? sorted[sIdx - 1] : null;
      const gapAhead = carAhead ? carAhead.dist - car.dist : 999;
      const secondCar = sorted.length > 1 ? sorted[1] : null;
      const leadGapToSecond = sIdx === 0 && secondCar ? car.dist - secondCar.dist : 0;

      // Aerodynamic slipstream (+ DRS exclusively on Interlagos F1)
      const inSlipstream = isDaytona
        ? t > 0.72 && towStrength > 0.12
        : t > 0.85 && towStrength > 0.1 && pose.curvature < 0.022;
      const drsEnabledLap = car.dist > perimeter * 0.45;
      const drsActive =
        !isDaytona &&
        drsEnabledLap &&
        pose.drsZone !== 0 &&
        carAhead !== null &&
        gapAhead > 1.5 &&
        gapAhead < drsRangeMeters;

      const lateWaveDamp = 1 - clamp((lapProgress - 0.87) / 0.08, 0, 0.72);
      const stintWave =
        (Math.sin(lapProgress * Math.PI * 5.2 + car.stintPhase) * car.waveAmp +
          Math.cos(lapProgress * Math.PI * 8.5 + car.seed * 6.28) * (car.waveAmp * 0.42)) *
        lateWaveDamp;
      const earlyTrim = lapProgress < 0.76 ? car.earlyControl * (1 - lapProgress / 0.76) : 0;
      const ersRamp = clamp((lapProgress - 0.68) / 0.22, 0, 1);
      const lateErs = ersRamp * (car.ersSkill * 0.014 + car.lateErsBoost);
      const finalStretchRamp = clamp((lapProgress - 0.80) / 0.13, 0, 1);
      const winnerFinalSprint =
        targetWinnerId && car.id === targetWinnerId ? finalStretchRamp * (isDaytona ? 0.054 : 0.064) : 0;

      let soloLeaderDrag = 1.0;
      if (isDaytona) {
        // Curb solo breakaways until final stretch (86%), then let P1 pull a clear visible 0.15-0.30s margin
        if (sIdx === 0 && !inSlipstream && lapProgress < 0.86) {
          if (leadGapToSecond > 32) soloLeaderDrag = lapProgress < 0.80 ? 0.962 : 0.972;
          else if (leadGapToSecond > 16) soloLeaderDrag = 0.982;
        }
      } else if (sIdx === 0 && !drsActive && !inSlipstream && pose.curvature < 0.018 && lapProgress < 0.86) {
        if (leadGapToSecond > 24) {
          soloLeaderDrag = lapProgress < 0.80 ? 0.92 : 0.942;
        } else if (leadGapToSecond > 12) {
          soloLeaderDrag = 0.958;
        } else {
          soloLeaderDrag = 0.978;
        }
      }

      // Multi-groove lane preference in Daytona (low/mid/high grooves for 2-wide & 3-wide pack action)
      const basePreferredLane = isDaytona
        ? clamp(
            pose.idealLane +
              ((car.index % 3) - 1) * 0.34 +
              Math.sin(lapProgress * Math.PI * 4.8 + car.seed * 6.28) * 0.26,
            -0.78,
            0.78
          )
        : pose.idealLane;

      let targetLane = basePreferredLane;
      let nextState: OvertakeState = 'CRUISE';
      let lateBrakeBonus = 1.0;
      car.overtakeTimer = Math.max(0, car.overtakeTimer - dt);

      if (t < 0.95) {
        const gridBlend = clamp((t - 0.3) / 0.65, 0, 1);
        const startLane = car.index % 2 === 0 ? -GRID_LANE_MAG : GRID_LANE_MAG;
        targetLane = startLane * (1 - gridBlend) + basePreferredLane * gridBlend;
      } else {
        if (car.overtakeTargetId) {
          const target = carsById.get(car.overtakeTargetId);
          const passCompleted = !target || car.dist > target.dist + MIN_BUMPER_GAP + 2.5;
          const fellBehindTooFar = target && target.dist - car.dist > (isDaytona ? 48 : 28);
          const currentlyAlongside = target && Math.abs(car.dist - target.dist) < (isDaytona ? 10.5 : 6.5);
          if (passCompleted || fellBehindTooFar || (car.overtakeTimer <= 0 && !currentlyAlongside)) {
            car.overtakeTargetId = null;
          } else if (target) {
            const corridorClear = isCorridorFree(car.id, car.dist, car.overtakeLane, 3.8, isDaytona ? 11 : 12, target.id);
            if (corridorClear && Math.abs(car.overtakeLane - target.lane) >= minLatClearance) {
              targetLane = car.overtakeLane;
              nextState = Math.abs(car.dist - target.dist) < (isDaytona ? 12.0 : 8.5) ? 'SIDE_BY_SIDE' : 'PULL_OUT';
              if (!isDaytona && upcoming.curvature > 0.01) {
                lateBrakeBonus = 1.09 + car.lateBrakeSkill * 0.09;
              }
            } else {
              car.overtakeTargetId = null;
            }
          }
        }

        if (!car.overtakeTargetId) {
          const triggerDist = isDaytona ? 44 : 25;
          if (blockingCar && blockingGap < triggerDist) {
            const closingSpeed = car.speed - blockingCar.speed;
            const shouldAttemptPass = isDaytona
              ? blockingGap < 36 || closingSpeed > 0.25 || inSlipstream
              : blockingGap < 18 || closingSpeed > 0.5 || drsActive || inSlipstream;

            if (shouldAttemptPass && (isDaytona || pose.curvature < 0.025)) {
              const insideSide: -1 | 1 = isDaytona
                ? (car.index % 2 === 0 ? -1 : 1)
                : upcoming.signedCurvature >= 0
                  ? -1
                  : 1;
              const outsideSide: -1 | 1 = (insideSide * -1) as -1 | 1;
              const step1 = minLatClearance + 0.10;
              const step2 = minLatClearance * 2 + 0.14;

              const rawCandidates = [
                clamp(blockingCar.lane + insideSide * step1, -0.86, 0.86),
                clamp(blockingCar.lane + outsideSide * step1, -0.86, 0.86),
                clamp(blockingCar.lane + insideSide * step2, -0.86, 0.86),
                clamp(blockingCar.lane + outsideSide * step2, -0.86, 0.86),
                -0.76,
                0.0,
                0.76,
              ];

              let chosenLane: number | null = null;
              for (let cIdx = 0; cIdx < rawCandidates.length; cIdx++) {
                const candLane = rawCandidates[cIdx];
                if (
                  Math.abs(candLane - blockingCar.lane) >= minLatClearance + 0.02 &&
                  isCorridorFree(
                    car.id,
                    car.dist,
                    candLane,
                    4.1,
                    isDaytona ? Math.min(15, blockingGap + 3) : Math.min(20, blockingGap + 6),
                    blockingCar.id
                  )
                ) {
                  chosenLane = candLane;
                  break;
                }
              }

              if (chosenLane !== null) {
                car.overtakeTargetId = blockingCar.id;
                car.overtakeLane = chosenLane;
                car.overtakeTimer = isDaytona ? 3.0 : 2.2;
                targetLane = chosenLane;
                nextState = blockingGap < (isDaytona ? 12.0 : 8.5) ? 'SIDE_BY_SIDE' : 'PULL_OUT';
                if (!isDaytona && upcoming.curvature > 0.011) {
                  lateBrakeBonus = 1.07 + car.lateBrakeSkill * 0.09;
                }
              } else {
                nextState = 'DRAFTING';
                targetLane = blockingCar.lane;
              }
            } else {
              nextState = 'DRAFTING';
              targetLane = blockingCar.lane * 0.8 + basePreferredLane * 0.2;
            }
          } else {
            let alongsideCar: (typeof cars)[number] | null = null;
            let closestAbsDiff = 999;
            for (let k = 0; k < numRacers; k++) {
              const other = cars[k];
              if (other.id === car.id) continue;
              const absDiff = Math.abs(other.dist - car.dist);
              if (absDiff < SIDE_BY_SIDE_LEN + 1.8 && absDiff < closestAbsDiff) {
                closestAbsDiff = absDiff;
                alongsideCar = other;
              }
            }
            if (alongsideCar) {
              nextState = car.dist >= alongsideCar.dist ? 'SIDE_BY_SIDE' : 'DEFENDING';
              const sideSign = car.lane >= alongsideCar.lane ? 1 : -1;
              const safeParallelLane = clamp(alongsideCar.lane + sideSign * (minLatClearance + 0.08), -0.86, 0.86);
              if (Math.abs(targetLane - alongsideCar.lane) < minLatClearance + 0.06) {
                targetLane = safeParallelLane;
              }
            }
          }
        }
      }

      car.battleState = nextState;

      // Slingshot momentum carried out of draft while executing straightaway passes in Daytona
      const isActivelyPassing = nextState === 'PULL_OUT' || nextState === 'SIDE_BY_SIDE';
      const straightWeight = isDaytona ? clamp(1 - pose.curvature / 0.012, 0, 1) : 0;
      // Taper trailing aero/slingshot to 0 in final ~12% and ensure P1 opens a clean 0.15-0.30s margin
      const finalAeroFade =
        targetWinnerId && car.id !== targetWinnerId ? 1 - clamp((lapProgress - 0.86) / 0.07, 0, 1.0) : 1;
      const winnerCar = targetWinnerId ? carsById.get(targetWinnerId) : null;
      const gapToTargetWinner = winnerCar ? winnerCar.dist - car.dist : 999;
      const targetClearGapM = avgBaseSpeed * 0.23;
      const finalMarginHold =
        targetWinnerId &&
        car.id !== targetWinnerId &&
        lapProgress >= 0.84 &&
        gapToTargetWinner > -26 &&
        gapToTargetWinner < targetClearGapM
          ? isDaytona
            ? 0.958
            : 0.942
          : 1.0;
      const slingshotSurge = isDaytona && isActivelyPassing ? (0.036 + 0.034 * straightWeight) * finalAeroFade : 0;
      const paceMult = clamp(car.basePace + stintWave - earlyTrim + lateErs + winnerFinalSprint, 0.84, 1.32);
      const aeroMult = isDaytona
        ? soloLeaderDrag *
          (1 + (inSlipstream ? (0.058 + towStrength * 0.072) * finalAeroFade : 0) + slingshotSurge)
        : soloLeaderDrag *
          (1 +
            (inSlipstream ? (0.072 + towStrength * 0.08) * finalAeroFade : 0) +
            (drsActive ? 0.145 * finalAeroFade : 0));

      let desiredSpeed = 0;
      if (t >= car.reactionDelay) {
        const cornerPaceSpeed = isDaytona
          ? avgBaseSpeed * paceMult
          : avgBaseSpeed * (0.34 + 0.66 * paceMult);
        const vSafeCorner = getSafeLookaheadSpeed(
          car.dist,
          cornerPaceSpeed,
          maxBrakeDecel * (0.92 + paceMult * 0.08),
          lateBrakeBonus,
          trackStyle
        );
        const topStraightMult = isDaytona ? 1.28 : 1.34;
        const vTopStraight = avgBaseSpeed * topStraightMult * paceMult * aeroMult;
        desiredSpeed =
          (isDaytona ? Math.min(vSafeCorner * aeroMult, vTopStraight) : Math.min(vSafeCorner, vTopStraight)) *
          finalMarginHold;

        const tLaunch = t - car.reactionDelay;
        if (tLaunch < 1.35) {
          const launchCurve = Math.min(1, tLaunch / 1.35);
          desiredSpeed *= (0.42 + 0.58 * Math.sqrt(launchCurve)) * car.launchGrip;
        }

        for (let k = sIdx - 1; k >= 0; k--) {
          const ahead = sorted[k];
          const gap = ahead.dist - car.dist;
          if (gap > 18) break;
          if (gap > 0.05 && Math.abs(ahead.lane - car.lane) < minLatClearance) {
            if (gap <= safeFollowDist) {
              const tightCap = Math.max(0, ahead.speed * (gap <= MIN_BUMPER_GAP + 0.35 ? 0.80 : 0.93));
              if (tightCap < desiredSpeed) desiredSpeed = tightCap;
            } else {
              const distToBuffer = gap - safeFollowDist;
              const followCap = Math.sqrt(
                Math.max(0, ahead.speed * ahead.speed + 2 * maxBrakeDecel * distToBuffer)
              );
              if (followCap < desiredSpeed) desiredSpeed = followCap;
            }
          }
        }

        if (car.dist > FINISH_DIST + 14) {
          desiredSpeed = Math.min(desiredSpeed, avgBaseSpeed * 0.44);
          targetLane = clamp((car.index % 2 === 0 ? -0.56 : 0.56) + ((car.index % 4) - 1.5) * 0.08, -0.78, 0.78);
        }
      }

      stepTargets[car.index] = {
        desiredSpeed,
        targetLane,
        paceMult,
        drsActive,
        inSlipstream,
        lateBrakeBonus,
        signedCurvature: pose.signedCurvature,
      };
    }

    for (let sIdx = 0; sIdx < sorted.length; sIdx++) {
      const car = sorted[sIdx];
      const st = stepTargets[car.index];
      const prevSpeed = car.speed;

      if (t < car.reactionDelay) {
        car.speed = 0;
      } else if (st.desiredSpeed < car.speed) {
        const decelStep = maxBrakeDecel * (1.06 + (st.lateBrakeBonus - 1) * 0.5) * dt;
        car.speed = Math.max(st.desiredSpeed, car.speed - decelStep);
      } else {
        const speedRatio = clamp(car.speed / Math.max(1, avgBaseSpeed * (isDaytona ? 1.28 : 1.34)), 0, 1.25);
        const torqueFactor = 1.32 - 0.55 * Math.min(1, speedRatio);
        const accelStep = maxDriveAccel * torqueFactor * car.launchGrip * clamp(st.paceMult, 0.85, 1.36) * dt;
        car.speed = Math.min(st.desiredSpeed, car.speed + accelStep);
      }

      let nextDist = car.dist + car.speed * dt;
      let hitBumperBlock = false;

      for (let k = sIdx - 1; k >= 0; k--) {
        const ahead = sorted[k];
        if (Math.abs(ahead.lane - car.lane) < minLatClearance) {
          const maxAllowedDist = ahead.dist - MIN_BUMPER_GAP;
          if (nextDist > maxAllowedDist) {
            nextDist = maxAllowedDist;
            if (car.speed > ahead.speed) {
              car.speed = ahead.speed;
              hitBumperBlock = true;
            }
          }
        }
      }

      const prevDist = car.dist;
      car.prevSpeed = prevSpeed;
      car.dist = nextDist;

      if (car.crossTime < 0 && car.dist >= FINISH_DIST) {
        const span = Math.max(0.0001, nextDist - prevDist);
        const subFrac = clamp((FINISH_DIST - prevDist) / span, 0, 1);
        const exactCrossTime = Math.max(0.01, (step > 0 ? t - dt : 0) + subFrac * dt);
        car.crossTime = exactCrossTime;
        crossingOrder.push({
          id: car.id,
          text: car.text,
          color: car.color,
          crossTime: exactCrossTime,
        });
      }

      const laneErr = st.targetLane - car.lane;
      const desiredLatVel = clamp(laneErr * 4.2, -1.42, 1.42);
      const prevLatVel = car.latVel;
      car.latVel += (desiredLatVel - car.latVel) * Math.min(1, dt * 9.0);
      let nextLane = clamp(car.lane + car.latVel * dt, -0.88, 0.88);

      for (let k = 0; k < numRacers; k++) {
        const other = cars[k];
        if (other.id === car.id) continue;
        if (Math.abs(other.dist - car.dist) < SIDE_BY_SIDE_LEN + 0.2) {
          const prevSide = car.lane - other.lane;
          const nextDiff = nextLane - other.lane;
          if (Math.abs(nextDiff) < minLatClearance + 0.01) {
            const sign = Math.abs(prevSide) < 0.005 ? (car.index < other.index ? -1 : 1) : prevSide > 0 ? 1 : -1;
            nextLane = clamp(other.lane + sign * (minLatClearance + 0.01), -0.88, 0.88);
            car.latVel = 0;
          }
        }
      }
      // Guard against 3-wide double-sided lateral pinch
      for (let k = 0; k < numRacers; k++) {
        const other = cars[k];
        if (other.id === car.id) continue;
        if (Math.abs(other.dist - car.dist) < SIDE_BY_SIDE_LEN + 0.2 && Math.abs(nextLane - other.lane) < minLatClearance) {
          nextLane = car.lane;
          car.latVel = 0;
          break;
        }
      }
      car.lane = nextLane;

      const vLatMeters = car.latVel * usableHalfWidth;
      const pathYaw = car.speed > 2 ? -Math.atan2(vLatMeters, Math.max(10, car.speed)) : 0;
      const slipYaw = st.signedCurvature * clamp(car.speed / Math.max(1, avgBaseSpeed), 0, 1.2) * (isDaytona ? 0.03 : 0.05);
      const desiredYaw = clamp(pathYaw + slipYaw, -0.3, 0.3);
      car.yawAngle += (desiredYaw - car.yawAngle) * Math.min(1, dt * 11);

      const rawLongAccel = dt > 0 ? (car.speed - prevSpeed) / dt : 0;
      const normLongAccel = clamp(rawLongAccel / Math.max(1, maxBrakeDecel), -1, 1);
      const brakeIntensity =
        t > car.reactionDelay && (rawLongAccel < -maxBrakeDecel * 0.16 || hitBumperBlock)
          ? clamp(Math.max(hitBumperBlock ? 0.55 : 0, -rawLongAccel / (maxBrakeDecel * 0.88)), 0, 1)
          : 0;
      const braking = brakeIntensity > 0.2;

      const lateralManeuverAccel = dt > 0 ? ((car.latVel - prevLatVel) / dt) * usableHalfWidth : 0;
      const centripetalG = car.speed * car.speed * st.signedCurvature;
      const normLatAccel = clamp(
        (centripetalG + lateralManeuverAccel * 0.65) / Math.max(1, avgBaseSpeed * avgBaseSpeed * 0.018),
        -1.2,
        1.2
      );

      const ratioToAvg = avgBaseSpeed > 0 ? car.speed / avgBaseSpeed : 0;
      let displayKmh = isDaytona
        ? Math.round(clamp(ratioToAvg * 276 + (st.inSlipstream ? 14 : 0), 0, 336))
        : Math.round(clamp(ratioToAvg * 246 + (st.drsActive ? 16 : 0) + (st.inSlipstream ? 8 : 0), 0, 342));
      if (t < car.reactionDelay) displayKmh = 0;

      const { gear, rpmRatio } = computeGearAndRpm(displayKmh, isDaytona);
      const steerAngle = clamp(st.signedCurvature * 13.5 - car.latVel * 0.24, -0.46, 0.46);
      const onKerb = !isDaytona && Math.abs(car.lane) > 0.78 && car.speed > avgBaseSpeed * 0.35;

      const launchSmoke =
        t >= car.reactionDelay && t < car.reactionDelay + 1.7
          ? (1 - (t - car.reactionDelay) / 1.7) * 0.82
          : 0;
      const lockupSmoke = brakeIntensity > 0.7 && displayKmh > 105 ? (brakeIntensity - 0.7) * 2.5 : 0;
      const tireSmoke = clamp(Math.max(launchSmoke, lockupSmoke), 0, 1);

      const kerbSparks = onKerb && displayKmh > 130 ? clamp((Math.abs(car.lane) - 0.78) * 5.5, 0, 1) : 0;
      const compressionSparks =
        !isDaytona && displayKmh > 255 && Math.abs(st.signedCurvature) > 0.008
          ? clamp((displayKmh - 255) / 70, 0, 0.65)
          : 0;
      const sparks = isDaytona ? 0 : clamp(Math.max(kerbSparks, compressionSparks), 0, 1);

      car.profile.push({
        dist: car.dist,
        lane: car.lane,
        speed: car.speed,
        displayKmh,
        gear,
        rpmRatio,
        steerAngle,
        yawAngle: car.yawAngle,
        longAccel: normLongAccel,
        latAccel: normLatAccel,
        brakeIntensity,
        drsActive: st.drsActive,
        inSlipstream: st.inSlipstream,
        braking,
        onKerb,
        tireSmoke,
        sparks,
        battleState: car.battleState,
      });
    }

    if (crossingOrder.length === numRacers) {
      if (allCrossedStep < 0) allCrossedStep = step;
      if (step - allCrossedStep >= Math.round(1.8 * SIM_FPS)) {
        break;
      }
    }
  }

  if (crossingOrder.length < numRacers) {
    const remaining = cars
      .filter((c) => c.crossTime < 0)
      .sort((a, b) => b.dist - a.dist);
    remaining.forEach((c, i) => {
      crossingOrder.push({
        id: c.id,
        text: c.text,
        color: c.color,
        crossTime: maxRaceTime + i * 0.1,
      });
    });
  }

  const winnerCrossTime = crossingOrder[0]?.crossTime || durationSeconds;
  const lastCrossTime = crossingOrder[crossingOrder.length - 1]?.crossTime || winnerCrossTime;
  const raceSteps = Math.max(120, Math.round(lastCrossTime * SIM_FPS));
  const winnerFinalLeadFrac = lastLeadOwnerId === crossingOrder[0]?.id ? clamp(lastLeadChangeDist / FINISH_DIST, 0, 1) : 0;

  return {
    cars: cars.map((c) => ({
      id: c.id,
      index: c.index,
      targetRank: (crossingOrder.findIndex((x) => x.id === c.id) + 1) || numRacers,
      simDt: dt,
      raceSteps,
      profile: c.profile,
    })),
    crossingOrder,
    winnerCrossTime,
    lastCrossTime,
    overtakeCount,
    leadChanges,
    finalLapLeadChanges,
    maxP1P2Gap,
    winnerFinalLeadFrac,
  };
}

export function generateAuthenticRaceSimulation(
  slices: { item: { id: string; text: string; weight?: number }; color: string }[],
  durationSeconds: number,
  drawnWinnerId?: string,
  trackStyle: RaceTrackStyle = 'interlagos'
): AuthenticRaceResult {
  const isDaytona = trackStyle === 'daytona';
  const cfg = getCircuitConfig(trackStyle);
  const numRacers = slices.length;
  const FINISH_DIST = cfg.totalLaps * cfg.perimeter;
  const rawAvgSpeed = FINISH_DIST / Math.max(4, durationSeconds - 0.15);

  const dt = 1 / SIM_FPS;
  const refSteps = Math.max(120, Math.round(durationSeconds * SIM_FPS));
  const refBrake = (1.42 * rawAvgSpeed * rawAvgSpeed) / (isDaytona ? 128 : 108);
  const refAccel = (1.42 * rawAvgSpeed * rawAvgSpeed) / (isDaytona ? 158 : 150);
  let refD = 0;
  let refV = 0;
  for (let s = 0; s < refSteps; s++) {
    const t = s * dt;
    const launchF = t < 1.2 ? 0.45 + 0.55 * (t / 1.2) : 1.0;
    const vSafe = getSafeLookaheadSpeed(refD, rawAvgSpeed, refBrake, 1.0, trackStyle);
    const tv = Math.min(rawAvgSpeed * (isDaytona ? 1.28 : 1.32), vSafe) * launchF;
    refV = tv > refV ? Math.min(tv, refV + refAccel * dt) : Math.max(tv, refV - refBrake * dt);
    refD += refV * dt;
  }

  const paceScale = refD > 10 ? (FINISH_DIST + 12) / refD : 1.0;
  const avgBaseSpeed = rawAvgSpeed * paceScale;
  const maxBrakeDecel = (1.42 * avgBaseSpeed * avgBaseSpeed) / (isDaytona ? 128 : 108);
  const maxDriveAccel = (1.42 * avgBaseSpeed * avgBaseSpeed) / (isDaytona ? 158 : 150);

  const winnerIdx = drawnWinnerId ? slices.findIndex((s) => s.item.id === drawnWinnerId) : 0;
  const resolvedWinnerIdx = winnerIdx >= 0 ? winnerIdx : 0;
  const targetWinnerId = slices[resolvedWinnerIdx]?.item.id;

  let chosenResult: ReturnType<typeof runForwardSolidPhysics> | null = null;
  let bestChosenScore = -Infinity;
  let fallbackResult: ReturnType<typeof runForwardSolidPhysics> | null = null;
  let bestFallbackRank = Infinity;
  const setupPenaltyById = new Map<string, number>();
  const setupBoostById = new Map<string, number>();
  let winnerChaseBoost = 0;
  let winnerEarlyTrimBoost = 0;
  const MAX_ATTEMPTS = 9;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const traits: CarTrait[] = slices.map((slice, idx) => {
      const seedBase = ((idx * 67 + attempt * 131 + slice.item.id.charCodeAt(0) * 31) % 1000) / 1000;
      const isWinner = idx === resolvedWinnerIdx;
      const wNorm = clamp(((slice.item.weight ?? 1) - 1) * 0.004, -0.008, 0.015);
      const isTwoCarDuel = numRacers === 2;

      if (isWinner) {
        const gridCatchup = isTwoCarDuel
          ? resolvedWinnerIdx === 1
            ? 0.006
            : 0.0
          : Math.min(0.032, resolvedWinnerIdx * 0.0042);
        const winnerWavePhase = -Math.PI * 0.78 + attempt * 0.58;
        return {
          basePace: clamp(0.996 + gridCatchup + winnerChaseBoost * 0.55, 0.985, 1.052),
          ersSkill: 0.7 + Math.min(0.42, winnerChaseBoost * 12),
          lateErsBoost: (isTwoCarDuel ? 0.016 : 0.018) + winnerChaseBoost * 0.65,
          earlyControl: (resolvedWinnerIdx <= 2 ? 0.030 : 0.012) + winnerEarlyTrimBoost,
          lateBrakeSkill: 0.82 + Math.min(0.35, winnerChaseBoost * 10),
          launchGrip: resolvedWinnerIdx <= 1 ? 0.93 : 1.03 + Math.min(0.08, winnerChaseBoost * 2.5),
          reactionDelay: resolvedWinnerIdx === 0 ? 0.17 : 0.08,
          seed: seedBase,
          stintPhase: winnerWavePhase,
          waveAmp: isTwoCarDuel ? (isDaytona ? 0.032 : 0.025) : isDaytona ? 0.041 : 0.029,
        };
      }

      const penalty = setupPenaltyById.get(slice.item.id) || 0;
      const rivalBoost = setupBoostById.get(slice.item.id) || 0;
      const isLeadChallenger = idx <= Math.min(3, numRacers - 1);
      const challengerBonus = isTwoCarDuel ? 0.012 : isLeadChallenger ? 0.021 : 0.008;

      let basePace: number;
      let lateErsBoost: number;
      let launchGrip: number;
      let reactionDelay: number;

      if (isDaytona && !isTwoCarDuel) {
        // Partition cars into cohesive contiguous NASCAR packs: Lead Pack, Mid-Pack, and Rear Pack
        const gridRatio = idx / Math.max(1, numRacers - 1);
        const packBucket =
          numRacers >= 8
            ? gridRatio < 0.38
              ? 0
              : gridRatio < 0.72
                ? 1
                : 2
            : idx < Math.ceil(numRacers / 2)
              ? 0
              : 1;
        const packCenter = packBucket === 0 ? 1.014 : packBucket === 1 ? 0.974 : 0.944;
        const intraPackSpread = (seedBase - 0.5) * 0.011;
        basePace = clamp(packCenter + intraPackSpread + wNorm + rivalBoost - penalty, 0.915, 1.052);
        lateErsBoost = (packBucket === 0 ? 0.016 : 0.010) + rivalBoost * 0.45 - Math.min(0.012, penalty * 0.35);
        launchGrip =
          packBucket === 0
            ? 1.04 + seedBase * 0.04
            : packBucket === 1
              ? 0.94 + seedBase * 0.04
              : 0.89 + seedBase * 0.04;
        reactionDelay =
          packBucket === 0
            ? 0.06 + seedBase * 0.04
            : packBucket === 1
              ? 0.13 + seedBase * 0.05
              : 0.18 + seedBase * 0.05;
      } else {
        const packSpread = 0.986 + seedBase * (isDaytona ? 0.028 : 0.026) + wNorm + challengerBonus + rivalBoost - penalty;
        basePace = clamp(packSpread, 0.90, 1.052);
        lateErsBoost = isTwoCarDuel
          ? 0.013 + rivalBoost * 0.5 - Math.min(0.01, penalty * 0.35)
          : isLeadChallenger
            ? 0.015 + rivalBoost * 0.5 - Math.min(0.012, penalty * 0.35)
            : 0.008 + rivalBoost * 0.4;
        launchGrip =
          idx <= 3
            ? 1.03 + seedBase * 0.06 - Math.min(0.07, penalty * 0.4)
            : 0.96 + seedBase * 0.09 - Math.min(0.07, penalty * 0.35);
        reactionDelay = idx <= 3 ? 0.06 + seedBase * 0.06 : 0.08 + seedBase * 0.12;
      }

      return {
        basePace,
        ersSkill: 0.58 + seedBase * 0.36,
        lateErsBoost,
        earlyControl: 0.0,
        lateBrakeSkill: 0.55 + seedBase * 0.42,
        launchGrip,
        reactionDelay,
        seed: seedBase,
        stintPhase: isTwoCarDuel
          ? -Math.PI * 0.78 + Math.PI + attempt * 0.58
          : idx * 1.45 + attempt * 0.72,
        waveAmp: isTwoCarDuel ? (isDaytona ? 0.035 : 0.028) : isDaytona ? 0.042 : 0.032,
      };
    });

    const sim = runForwardSolidPhysics(
      slices,
      durationSeconds,
      traits,
      avgBaseSpeed,
      maxBrakeDecel,
      maxDriveAccel,
      trackStyle,
      targetWinnerId
    );

    const winRankIdx = sim.crossingOrder.findIndex((c) => c.id === targetWinnerId);
    const rankScore = winRankIdx >= 0 ? winRankIdx : numRacers;
    if (rankScore < bestFallbackRank) {
      bestFallbackRank = rankScore;
      fallbackResult = sim;
    }

    const actualWinnerId = sim.crossingOrder[0]?.id;
    const winnerWon = actualWinnerId === targetWinnerId;

    if (winnerWon) {
      const p1Time = sim.crossingOrder[0]?.crossTime || 0;
      const p2Time = sim.crossingOrder[1]?.crossTime || p1Time;
      const p1P2GapSec = Math.max(0, p2Time - p1Time);
      const maxAllowedGapM = isDaytona ? 92 : 64;

      // Peak score for a visible 0.15s-0.30s margin (center 0.22s) after intense final-lap duels
      const marginScore =
        p1P2GapSec >= 0.14 && p1P2GapSec <= 0.31
          ? 52 - Math.abs(p1P2GapSec - 0.22) * 140
          : p1P2GapSec < 0.14
            ? -(0.14 - p1P2GapSec) * 260
            : -(p1P2GapSec - 0.31) * 160;

      const suspenseScore =
        Math.min(10, sim.leadChanges) * 14 +
        Math.min(6, sim.overtakeCount) * 8 +
        Math.min(4, sim.finalLapLeadChanges) * 28 +
        (sim.winnerFinalLeadFrac >= 0.68 ? 35 : sim.winnerFinalLeadFrac * 25) +
        (sim.winnerFinalLeadFrac >= 0.80 ? 20 : 0) +
        marginScore -
        Math.max(0, sim.maxP1P2Gap - maxAllowedGapM) * 0.9;

      if (suspenseScore > bestChosenScore) {
        bestChosenScore = suspenseScore;
        chosenResult = sim;
      }

      const isThrillingFinish =
        sim.leadChanges >= (isDaytona ? 4 : 3) &&
        sim.finalLapLeadChanges >= 1 &&
        sim.winnerFinalLeadFrac >= 0.68 &&
        p1P2GapSec >= 0.15 &&
        p1P2GapSec <= 0.30;

      if (isThrillingFinish && attempt >= 1) {
        break;
      }

      if (p1P2GapSec < 0.15) {
        winnerChaseBoost = Math.min(0.056, winnerChaseBoost + 0.008);
        for (let k = 1; k <= Math.min(3, sim.crossingOrder.length - 1); k++) {
          const challengerId = sim.crossingOrder[k]?.id;
          if (challengerId && challengerId !== targetWinnerId) {
            setupPenaltyById.set(challengerId, Math.min(0.028, (setupPenaltyById.get(challengerId) || 0) + 0.006));
          }
        }
      } else if (p1P2GapSec > 0.30) {
        winnerChaseBoost = Math.max(0, winnerChaseBoost - 0.006);
        winnerEarlyTrimBoost = Math.min(0.075, winnerEarlyTrimBoost + 0.015);
        for (let k = 1; k <= Math.min(2, sim.crossingOrder.length - 1); k++) {
          const runnerUpId = sim.crossingOrder[k]?.id;
          if (runnerUpId && runnerUpId !== targetWinnerId) {
            setupBoostById.set(runnerUpId, Math.min(0.044, (setupBoostById.get(runnerUpId) || 0) + 0.007));
          }
        }
      } else if (sim.winnerFinalLeadFrac < 0.68 || sim.finalLapLeadChanges === 0) {
        winnerEarlyTrimBoost = Math.min(0.075, winnerEarlyTrimBoost + 0.02);
        for (let k = 1; k <= Math.min(2, sim.crossingOrder.length - 1); k++) {
          const challengerId = sim.crossingOrder[k]?.id;
          if (challengerId) {
            setupBoostById.set(challengerId, Math.min(0.036, (setupBoostById.get(challengerId) || 0) + 0.008));
          }
        }
      }
    } else {
      winnerChaseBoost = Math.min(0.045, winnerChaseBoost + 0.008);
      winnerEarlyTrimBoost = Math.max(0, winnerEarlyTrimBoost - 0.008);
      const beatCount = winRankIdx > 0 ? winRankIdx : numRacers;
      for (let k = 0; k < beatCount; k++) {
        const rivalId = sim.crossingOrder[k]?.id;
        if (rivalId && rivalId !== targetWinnerId) {
          setupPenaltyById.set(rivalId, (setupPenaltyById.get(rivalId) || 0) + 0.008);
        }
      }
    }
  }

  const finalSim = chosenResult || fallbackResult!;
  const winTime = finalSim.winnerCrossTime;
  const podium: PodiumRacer[] = finalSim.crossingOrder.map((c, idx) => ({
    id: c.id,
    text: c.text,
    color: c.color,
    rank: idx + 1,
    finishTimeSeconds: Number(c.crossTime.toFixed(3)),
    gapSeconds: idx === 0 ? 0 : Number(Math.max(0, c.crossTime - winTime).toFixed(3)),
  }));

  return {
    cars: finalSim.cars,
    podium,
    winnerCrossTime: finalSim.winnerCrossTime,
    lastCrossTime: finalSim.lastCrossTime,
  };
}

export function generateGrandPrixSimulation(
  slices: { item: { id: string; text: string }; color: string }[],
  durationSeconds: number,
  racePodium: PodiumRacer[] | null,
  trackStyle: RaceTrackStyle = 'interlagos'
): SimulatedCar[] {
  const winnerId = racePodium?.find((p) => p.rank === 1)?.id;
  return generateAuthenticRaceSimulation(slices, durationSeconds, winnerId, trackStyle).cars;
}
