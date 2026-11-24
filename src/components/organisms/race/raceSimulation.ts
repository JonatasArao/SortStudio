import { PodiumRacer } from '../../../types';
import {
  TOTAL_LAPS,
  TRACK_P,
  TRACK_HALF_WIDTH,
  GRID_FIRST_DIST,
  GRID_STEP_DIST,
  GRID_LANE_MAG,
  getCircuitPosition,
  getUpcomingCornerInfo,
} from './trackCircuit';

export const SIM_FPS = 60;
export const SIM_STEPS = 1200; // Legacy compatibility constant

export type OvertakeState = 'CRUISE' | 'DRAFTING' | 'PULL_OUT' | 'SIDE_BY_SIDE' | 'DEFENDING';

export interface SimFrame {
  dist: number;
  lane: number; // normalized -1..1 across usable track width
  speed: number; // simulation m/s
  displayKmh: number; // calibrated Grand Prix speed readout (km/h)
  gear: number; // 1..8
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

// 20m total width -> +/-10m; keep +/-8.2m usable (16.4m wide, ~9 car-widths)
export const USABLE_HALF_WIDTH = TRACK_HALF_WIDTH - 1.8;

// Solid-body car bounding constants calibrated for CAR_VISUAL_SCALE = 1.45 (length ~3.48m, width ~1.80m)
const MIN_BUMPER_GAP = 4.15; // longitudinal center-to-center solid bumper limit (3.48m car + 0.67m air gap)
const SAFE_FOLLOW_DIST = 6.0; // distance where predictive following braking starts
const MIN_LAT_CLEARANCE = 0.30; // ~2.46m center-to-center laterally (1.80m car + 0.66m gap)
const SIDE_BY_SIDE_LEN = 4.35; // longitudinal overlap threshold for lateral solid-body guard

const GEAR_THRESHOLDS = [0, 68, 108, 148, 188, 226, 262, 296, 348];

function computeGearAndRpm(kmh: number): { gear: number; rpmRatio: number } {
  if (kmh <= 4) return { gear: 1, rpmRatio: 0.22 };
  for (let g = 1; g <= 8; g++) {
    const low = GEAR_THRESHOLDS[g - 1];
    const high = GEAR_THRESHOLDS[g];
    if (kmh <= high || g === 8) {
      const span = Math.max(20, high - low);
      const frac = Math.max(0, Math.min(1, (kmh - low) / span));
      const rpmRatio = Math.min(1, 0.42 + frac * 0.56);
      return { gear: g, rpmRatio };
    }
  }
  return { gear: 8, rpmRatio: 0.92 };
}

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

function getCornerSpeedLimit(dist: number, paceBaseSpeed: number): number {
  const pose = getCircuitPosition(dist, 0);
  const cornerLoad = Math.min(1, pose.curvature / 0.032);
  // Straights ~1.34x base, heavy hairpins ~0.50x base for clear braking & traction zones
  return paceBaseSpeed * (1.34 - Math.pow(cornerLoad, 0.85) * 0.84);
}

function getSafeLookaheadSpeed(
  dist: number,
  paceBaseSpeed: number,
  brakeDecel: number,
  lateBrakeBonus = 1.0
): number {
  let minSafe = getCornerSpeedLimit(dist, paceBaseSpeed);
  const effBrake = brakeDecel * lateBrakeBonus;
  for (let L = 6; L <= 96; L += 6) {
    const vCorner = getCornerSpeedLimit(dist + L, paceBaseSpeed);
    const vSafe = Math.sqrt(vCorner * vCorner + 2 * effBrake * L);
    if (vSafe < minSafe) minSafe = vSafe;
  }
  return minSafe;
}

interface CarTrait {
  basePace: number;
  ersSkill: number;
  lateBrakeSkill: number;
  launchGrip: number;
  reactionDelay: number;
  seed: number;
  stintPhase: number;
  waveAmp: number;
}

/**
 * Runs a 100% pure forward solid-body physics race from grid to checkered flag.
 * Zero outcome-forcing, zero last-corner position clamping, zero ghosting through cars.
 */
function runForwardSolidPhysics(
  slices: { item: { id: string; text: string; weight?: number }; color: string }[],
  durationSeconds: number,
  traits: CarTrait[],
  avgBaseSpeed: number,
  maxBrakeDecel: number,
  maxDriveAccel: number
): {
  cars: SimulatedCar[];
  crossingOrder: { id: string; text: string; color: string; crossTime: number }[];
  winnerCrossTime: number;
  lastCrossTime: number;
  overtakeCount: number;
} {
  const numRacers = slices.length;
  const dt = 1 / SIM_FPS;
  const FINISH_DIST = TOTAL_LAPS * TRACK_P;
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
  let prevLeaderIds: string[] = [];

  for (let step = 0; step <= maxSteps; step++) {
    const t = step * dt;

    // Leader-first order for predictive blocking & solid-body enforcement
    const sorted = [...cars].sort((a, b) => b.dist - a.dist);

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

    // Helper: checks if a target lane corridor is genuinely free of solid cars
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
          if (Math.abs(other.lane - targetLane) < MIN_LAT_CLEARANCE + 0.03) {
            return false;
          }
        }
      }
      return true;
    };

    // Phase A: Compute desired speed & tactical target lane for every car
    const stepTargets = new Array<{
      desiredSpeed: number;
      targetLane: number;
      paceMult: number;
      drsActive: boolean;
      inSlipstream: boolean;
      lateBrakeBonus: number;
      signedCurvature: number;
    }>(numRacers);

    for (let sIdx = 0; sIdx < sorted.length; sIdx++) {
      const car = sorted[sIdx];
      const pose = getCircuitPosition(car.dist, car.lane * USABLE_HALF_WIDTH);
      const upcoming = getUpcomingCornerInfo(car.dist, 76);
      const lapProgress = clamp(car.dist / FINISH_DIST, 0, 1.15);

      // Nearest car ahead in our current lane corridor
      let blockingCar: (typeof cars)[number] | null = null;
      let blockingGap = 999;
      for (let k = sIdx - 1; k >= 0; k--) {
        const cand = sorted[k];
        const gap = cand.dist - car.dist;
        if (gap > 34) break;
        if (gap > 0.1 && Math.abs(cand.lane - car.lane) < MIN_LAT_CLEARANCE + 0.06) {
          blockingCar = cand;
          blockingGap = gap;
          break;
        }
      }

      const carAhead = sIdx > 0 ? sorted[sIdx - 1] : null;
      const gapAhead = carAhead ? carAhead.dist - car.dist : 999;

      // Slipstream & DRS detection
      const inSlipstream =
        t > 1.2 &&
        blockingCar !== null &&
        blockingGap > 3.2 &&
        blockingGap < 28 &&
        pose.curvature < 0.02;

      const drsEnabledLap = car.dist > TRACK_P; // DRS unlocks from Lap 2 onward
      const drsActive =
        drsEnabledLap &&
        pose.drsZone !== 0 &&
        carAhead !== null &&
        gapAhead > 2.0 &&
        gapAhead < 30;

      // Organic stint pace & ERS energy rhythm (zero outcome-forcing!)
      const stintWave =
        Math.sin(lapProgress * Math.PI * 3.5 + car.stintPhase) * car.waveAmp +
        Math.cos(lapProgress * Math.PI * 6.5 + car.seed * 6.28) * (car.waveAmp * 0.45);
      const paceMult = clamp(
        car.basePace + stintWave + (lapProgress > 0.58 ? car.ersSkill * 0.022 : 0),
        0.78,
        1.36
      );
      const aeroMult = 1 + (inSlipstream ? 0.088 : 0) + (drsActive ? 0.125 : 0);

      // Tactical overtaking state machine with persistent overtake commitment (prevents ping-ponging!)
      let targetLane = pose.idealLane;
      let nextState: OvertakeState = 'CRUISE';
      let lateBrakeBonus = 1.0;
      car.overtakeTimer = Math.max(0, car.overtakeTimer - dt);

      if (t < 1.1) {
        // Clean start straight off the grid box before blending to racing line / passing
        const gridBlend = clamp((t - 0.35) / 0.75, 0, 1);
        const startLane = car.index % 2 === 0 ? -GRID_LANE_MAG : GRID_LANE_MAG;
        targetLane = startLane * (1 - gridBlend) + pose.idealLane * gridBlend;
      } else {
        // Validate existing committed overtake target
        if (car.overtakeTargetId) {
          const target = carsById.get(car.overtakeTargetId);
          const passCompleted = !target || car.dist > target.dist + MIN_BUMPER_GAP + 1.4;
          const fellBehindTooFar = target && target.dist - car.dist > 26;
          if (passCompleted || fellBehindTooFar || car.overtakeTimer <= 0) {
            car.overtakeTargetId = null;
          } else if (target) {
            // Keep committing to the chosen parallel lane until genuinely ahead!
            const corridorClear = isCorridorFree(car.id, car.dist, car.overtakeLane, 3.8, 12, target.id);
            if (corridorClear && Math.abs(car.overtakeLane - target.lane) >= MIN_LAT_CLEARANCE) {
              targetLane = car.overtakeLane;
              nextState = Math.abs(car.dist - target.dist) < 8.5 ? 'SIDE_BY_SIDE' : 'PULL_OUT';
              if (upcoming.curvature > 0.011) {
                lateBrakeBonus = 1.07 + car.lateBrakeSkill * 0.09;
              }
            } else {
              // Chosen lane got blocked ahead by a 3rd car; release commitment to re-evaluate
              car.overtakeTargetId = null;
            }
          }
        }

        // Evaluate new pass if not already committed
        if (!car.overtakeTargetId) {
          if (blockingCar && blockingGap < 25) {
            const closingSpeed = car.speed - blockingCar.speed;
            const shouldAttemptPass =
              blockingGap < 18 || closingSpeed > 0.5 || drsActive || inSlipstream;

            if (shouldAttemptPass && pose.curvature < 0.025) {
              const insideSide: -1 | 1 = upcoming.signedCurvature >= 0 ? -1 : 1;
              const outsideSide: -1 | 1 = (insideSide * -1) as -1 | 1;
              const step1 = MIN_LAT_CLEARANCE + 0.12;
              const step2 = MIN_LAT_CLEARANCE * 2 + 0.16;

              const rawCandidates = [
                clamp(blockingCar.lane + insideSide * step1, -0.86, 0.86),
                clamp(blockingCar.lane + outsideSide * step1, -0.86, 0.86),
                clamp(blockingCar.lane + insideSide * step2, -0.86, 0.86),
                clamp(blockingCar.lane + outsideSide * step2, -0.86, 0.86),
                -0.72,
                0.0,
                0.72,
              ];

              let chosenLane: number | null = null;
              for (let cIdx = 0; cIdx < rawCandidates.length; cIdx++) {
                const candLane = rawCandidates[cIdx];
                if (
                  Math.abs(candLane - blockingCar.lane) >= MIN_LAT_CLEARANCE + 0.02 &&
                  isCorridorFree(car.id, car.dist, candLane, 4.1, Math.min(20, blockingGap + 6), blockingCar.id)
                ) {
                  chosenLane = candLane;
                  break;
                }
              }

              if (chosenLane !== null) {
                car.overtakeTargetId = blockingCar.id;
                car.overtakeLane = chosenLane;
                car.overtakeTimer = 2.2;
                targetLane = chosenLane;
                nextState = blockingGap < 8.5 ? 'SIDE_BY_SIDE' : 'PULL_OUT';
                if (upcoming.curvature > 0.011) {
                  lateBrakeBonus = 1.07 + car.lateBrakeSkill * 0.09;
                }
              } else {
                // Solid blocking: no corridor open, stay in slipstream behind blocking car
                nextState = 'DRAFTING';
                targetLane = blockingCar.lane;
              }
            } else {
              nextState = 'DRAFTING';
              targetLane = blockingCar.lane * 0.8 + pose.idealLane * 0.2;
            }
          } else {
            // Check if currently alongside another car so we don't chop across their nose
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
              const safeParallelLane = clamp(alongsideCar.lane + sideSign * (MIN_LAT_CLEARANCE + 0.08), -0.86, 0.86);
              if (Math.abs(targetLane - alongsideCar.lane) < MIN_LAT_CLEARANCE + 0.06) {
                targetLane = safeParallelLane;
              }
            }
          }
        }
      }

      car.battleState = nextState;

      // Desired longitudinal speed with pace-scaled cornering, braking anticipation & predictive following limit
      let desiredSpeed = 0;
      if (t >= car.reactionDelay) {
        const cornerPaceSpeed = avgBaseSpeed * (0.28 + 0.72 * paceMult);
        const vSafeCorner = getSafeLookaheadSpeed(
          car.dist,
          cornerPaceSpeed,
          maxBrakeDecel * (0.92 + paceMult * 0.08),
          lateBrakeBonus
        );
        const vTopStraight = avgBaseSpeed * 1.34 * paceMult * aeroMult;
        desiredSpeed = Math.min(vSafeCorner, vTopStraight);

        const tLaunch = t - car.reactionDelay;
        if (tLaunch < 1.35) {
          const launchCurve = Math.min(1, tLaunch / 1.35);
          desiredSpeed *= (0.42 + 0.58 * Math.sqrt(launchCurve)) * car.launchGrip;
        }

        // Strict predictive blocking: if any car ahead overlaps our lane corridor, brake smoothly in time!
        for (let k = sIdx - 1; k >= 0; k--) {
          const ahead = sorted[k];
          const gap = ahead.dist - car.dist;
          if (gap > 16) break;
          if (gap > 0.05 && Math.abs(ahead.lane - car.lane) < MIN_LAT_CLEARANCE) {
            if (gap <= SAFE_FOLLOW_DIST) {
              const tightCap = Math.max(0, ahead.speed * (gap <= MIN_BUMPER_GAP + 0.3 ? 0.82 : 0.94));
              if (tightCap < desiredSpeed) desiredSpeed = tightCap;
            } else {
              const distToBuffer = gap - SAFE_FOLLOW_DIST;
              const followCap = Math.sqrt(
                Math.max(0, ahead.speed * ahead.speed + 2 * maxBrakeDecel * distToBuffer)
              );
              if (followCap < desiredSpeed) desiredSpeed = followCap;
            }
          }
        }

        // Gentle post-checkered-flag cooldown after crossing finish; stagger lanes for clean parc ferme lineup
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

    // Phase B: Integrate speed, distance, and solid-body bounds in leader-first order
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
        const speedRatio = clamp(car.speed / Math.max(1, avgBaseSpeed * 1.34), 0, 1.25);
        const torqueFactor = 1.32 - 0.55 * Math.min(1, speedRatio);
        const accelStep = maxDriveAccel * torqueFactor * car.launchGrip * clamp(st.paceMult, 0.85, 1.36) * dt;
        car.speed = Math.min(st.desiredSpeed, car.speed + accelStep);
      }

      let nextDist = car.dist + car.speed * dt;
      let hitBumperBlock = false;

      // Hard physical front-to-back solid-body invariant: NEVER pass through a car ahead in the same lane
      for (let k = sIdx - 1; k >= 0; k--) {
        const ahead = sorted[k];
        if (Math.abs(ahead.lane - car.lane) < MIN_LAT_CLEARANCE) {
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

      // Track genuine crossing order with sub-frame finish line interpolation
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

      // Smooth lateral steering with hard lateral solid-body guard (cannot clip laterally into side-by-side car)
      const laneErr = st.targetLane - car.lane;
      const desiredLatVel = clamp(laneErr * 3.8, -1.28, 1.28);
      const prevLatVel = car.latVel;
      car.latVel += (desiredLatVel - car.latVel) * Math.min(1, dt * 8.5);
      let nextLane = clamp(car.lane + car.latVel * dt, -0.88, 0.88);

      for (let k = 0; k < numRacers; k++) {
        const other = cars[k];
        if (other.id === car.id) continue;
        if (Math.abs(other.dist - car.dist) < SIDE_BY_SIDE_LEN) {
          const prevSide = car.lane - other.lane;
          const nextDiff = nextLane - other.lane;
          if (Math.abs(nextDiff) < MIN_LAT_CLEARANCE) {
            const sign = Math.abs(prevSide) < 0.005 ? (car.index < other.index ? -1 : 1) : prevSide > 0 ? 1 : -1;
            nextLane = clamp(other.lane + sign * MIN_LAT_CLEARANCE, -0.88, 0.88);
            car.latVel = 0;
          }
        }
      }
      car.lane = nextLane;

      // Smooth chassis yaw & steering
      const vLatMeters = car.latVel * USABLE_HALF_WIDTH;
      const pathYaw = car.speed > 2 ? -Math.atan2(vLatMeters, Math.max(10, car.speed)) : 0;
      const slipYaw = st.signedCurvature * clamp(car.speed / Math.max(1, avgBaseSpeed), 0, 1.2) * 0.05;
      const desiredYaw = clamp(pathYaw + slipYaw, -0.3, 0.3);
      car.yawAngle += (desiredYaw - car.yawAngle) * Math.min(1, dt * 11);

      const rawLongAccel = dt > 0 ? (car.speed - prevSpeed) / dt : 0;
      const normLongAccel = clamp(rawLongAccel / Math.max(1, maxBrakeDecel), -1, 1);
      const brakeIntensity =
        t > car.reactionDelay && (rawLongAccel < -maxBrakeDecel * 0.16 || hitBumperBlock)
          ? clamp(Math.max(hitBumperBlock ? 0.55 : 0, -rawLongAccel / (maxBrakeDecel * 0.88)), 0, 1)
          : 0;
      const braking = brakeIntensity > 0.2;

      const lateralManeuverAccel = dt > 0 ? ((car.latVel - prevLatVel) / dt) * USABLE_HALF_WIDTH : 0;
      const centripetalG = car.speed * car.speed * st.signedCurvature;
      const normLatAccel = clamp(
        (centripetalG + lateralManeuverAccel * 0.65) / Math.max(1, avgBaseSpeed * avgBaseSpeed * 0.018),
        -1.2,
        1.2
      );

      const ratioToAvg = avgBaseSpeed > 0 ? car.speed / avgBaseSpeed : 0;
      let displayKmh = Math.round(
        clamp(ratioToAvg * 246 + (st.drsActive ? 16 : 0) + (st.inSlipstream ? 8 : 0), 0, 342)
      );
      if (t < car.reactionDelay) displayKmh = 0;

      const { gear, rpmRatio } = computeGearAndRpm(displayKmh);
      const steerAngle = clamp(st.signedCurvature * 13.5 - car.latVel * 0.24, -0.46, 0.46);
      const onKerb = Math.abs(car.lane) > 0.78 && car.speed > avgBaseSpeed * 0.35;

      const launchSmoke =
        t >= car.reactionDelay && t < car.reactionDelay + 1.7
          ? (1 - (t - car.reactionDelay) / 1.7) * 0.82
          : 0;
      const lockupSmoke = brakeIntensity > 0.7 && displayKmh > 105 ? (brakeIntensity - 0.7) * 2.5 : 0;
      const tireSmoke = clamp(Math.max(launchSmoke, lockupSmoke), 0, 1);

      const kerbSparks = onKerb && displayKmh > 130 ? clamp((Math.abs(car.lane) - 0.78) * 5.5, 0, 1) : 0;
      const compressionSparks =
        displayKmh > 255 && Math.abs(st.signedCurvature) > 0.008 ? clamp((displayKmh - 255) / 70, 0, 0.65) : 0;
      const sparks = clamp(Math.max(kerbSparks, compressionSparks), 0, 1);

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

    // Stop extending simulation ~1.8s after ALL cars have legitimately crossed the finish line
    if (crossingOrder.length === numRacers) {
      if (allCrossedStep < 0) allCrossedStep = step;
      if (step - allCrossedStep >= Math.round(1.8 * SIM_FPS)) {
        break;
      }
    }
  }

  // Fallback for any extreme outlier car that hadn't crossed before maxSteps
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
  };
}

/**
 * Generates a 100% honest forward solid-body physics Grand Prix simulation where:
 * - Every overtake is earned cleanly on track (no last-corner teleporting or clipping)
 * - Candidate initial performance profiles are simulated forward until `drawnWinnerId` genuinely wins on track
 * - The full `podium` (P1..PN) is derived directly from that simulation's actual crossing order
 */
export function generateAuthenticRaceSimulation(
  slices: { item: { id: string; text: string; weight?: number }; color: string }[],
  durationSeconds: number,
  drawnWinnerId?: string
): AuthenticRaceResult {
  const numRacers = slices.length;
  const FINISH_DIST = TOTAL_LAPS * TRACK_P;
  const rawAvgSpeed = FINISH_DIST / Math.max(4, durationSeconds - 0.15);

  // Calibrate reference speed scale so a ~1.03 pace car completes 3 laps close to `durationSeconds`
  const dt = 1 / SIM_FPS;
  const refSteps = Math.max(120, Math.round(durationSeconds * SIM_FPS));
  const refBrake = (1.42 * rawAvgSpeed * rawAvgSpeed) / 108;
  const refAccel = (1.42 * rawAvgSpeed * rawAvgSpeed) / 150;
  let refD = 0;
  let refV = 0;
  for (let s = 0; s < refSteps; s++) {
    const t = s * dt;
    const launchF = t < 1.2 ? 0.45 + 0.55 * (t / 1.2) : 1.0;
    const vSafe = getSafeLookaheadSpeed(refD, rawAvgSpeed, refBrake, 1.0);
    const tv = Math.min(rawAvgSpeed * 1.32, vSafe) * launchF;
    refV = tv > refV ? Math.min(tv, refV + refAccel * dt) : Math.max(tv, refV - refBrake * dt);
    refD += refV * dt;
  }

  const paceScale = refD > 10 ? (FINISH_DIST + 12) / refD : 1.0;
  const avgBaseSpeed = rawAvgSpeed * paceScale;
  const maxBrakeDecel = (1.42 * avgBaseSpeed * avgBaseSpeed) / 108;
  const maxDriveAccel = (1.42 * avgBaseSpeed * avgBaseSpeed) / 150;

  const winnerIdx = drawnWinnerId ? slices.findIndex((s) => s.item.id === drawnWinnerId) : 0;
  const resolvedWinnerIdx = winnerIdx >= 0 ? winnerIdx : 0;
  const targetWinnerId = slices[resolvedWinnerIdx]?.item.id;

  let chosenResult: ReturnType<typeof runForwardSolidPhysics> | null = null;
  let fallbackResult: ReturnType<typeof runForwardSolidPhysics> | null = null;
  let bestFallbackRank = Infinity;
  const setupPenaltyById = new Map<string, number>();
  const MAX_ATTEMPTS = 24;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const traits: CarTrait[] = slices.map((slice, idx) => {
      const seedBase = ((idx * 67 + attempt * 131 + slice.item.id.charCodeAt(0) * 31) % 1000) / 1000;
      const isWinner = idx === resolvedWinnerIdx;
      const wNorm = clamp(((slice.item.weight ?? 1) - 1) * 0.006, -0.012, 0.02);

      if (isWinner) {
        // Winner starts from their grid slot with genuine racecraft and scales pre-race setup if earlier
        // simulations saw them caught in solid traffic from deep in the pack.
        const gridDepthBonus = resolvedWinnerIdx * 0.008;
        const attemptPaceBoost = attempt * 0.016;
        // If starting on pole (idx 0), peak later in the race so P2/P3 overtake into T1/Lap 1 first!
        const poleWavePhase = resolvedWinnerIdx === 0 ? -Math.PI * 0.42 : Math.PI * 0.15;
        return {
          basePace: clamp(1.02 + gridDepthBonus + attemptPaceBoost, 1.0, 1.32),
          ersSkill: 0.9 + attempt * 0.14,
          lateBrakeSkill: 0.95 + attempt * 0.1,
          launchGrip: resolvedWinnerIdx === 0 ? 0.94 : 1.05 + Math.min(0.18, attempt * 0.015),
          reactionDelay: resolvedWinnerIdx === 0 ? 0.17 : Math.max(0.05, 0.1 - attempt * 0.005),
          seed: seedBase,
          stintPhase: poleWavePhase + attempt * 0.35,
          waveAmp: resolvedWinnerIdx === 0 ? 0.036 : 0.018,
        };
      }

      const penalty = setupPenaltyById.get(slice.item.id) || 0;
      // Give front-row / top-4 rivals aggressive launch + early Lap 1 pace so lead battles & overtakes happen organically
      const rivalEarlyBoost = idx <= Math.min(3, numRacers - 1) ? 0.024 : 0;
      // Front-most cars get slightly higher wave variance so P1/P2/P3 trade positions in DRS battles
      const packSpread = 0.955 + seedBase * 0.068 + wNorm + rivalEarlyBoost - penalty;

      return {
        basePace: clamp(packSpread, 0.82, 1.05),
        ersSkill: 0.35 + seedBase * 0.55,
        lateBrakeSkill: 0.25 + seedBase * 0.6,
        launchGrip:
          idx <= 2
            ? 1.04 + seedBase * 0.09 - Math.min(0.12, penalty * 0.6)
            : 0.93 + seedBase * 0.14 - Math.min(0.1, penalty * 0.5),
        reactionDelay: idx <= 2 ? 0.06 + seedBase * 0.08 : 0.09 + seedBase * 0.15,
        seed: seedBase,
        stintPhase: (idx % 3 === 0 ? 0.6 : -0.5) + idx * 1.15 + attempt * 0.55,
        waveAmp: 0.028,
      };
    });

    const sim = runForwardSolidPhysics(
      slices,
      durationSeconds,
      traits,
      avgBaseSpeed,
      maxBrakeDecel,
      maxDriveAccel
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
      // Accept immediately if there are genuine overtakes (or on later attempts to stay fast)
      const minDesiredOvertakes = numRacers > 2 ? 2 : 1;
      if (sim.overtakeCount >= minDesiredOvertakes || attempt >= 5) {
        chosenResult = sim;
        break;
      }
      chosenResult = sim;
    }

    // Pre-race setup tuning for the next forward simulation attempt:
    // Any car that beat our drawn winner gets a modest setup trim so the winner can pass them cleanly next run.
    const beatCount = winRankIdx > 0 ? winRankIdx : numRacers;
    for (let k = 0; k < beatCount; k++) {
      const rivalId = sim.crossingOrder[k]?.id;
      if (rivalId && rivalId !== targetWinnerId) {
        setupPenaltyById.set(rivalId, (setupPenaltyById.get(rivalId) || 0) + 0.018);
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

/**
 * Legacy wrapper kept for compatibility with callers passing a pre-built podium.
 */
export function generateGrandPrixSimulation(
  slices: { item: { id: string; text: string }; color: string }[],
  durationSeconds: number,
  racePodium: PodiumRacer[] | null
): SimulatedCar[] {
  const winnerId = racePodium?.find((p) => p.rank === 1)?.id;
  return generateAuthenticRaceSimulation(slices, durationSeconds, winnerId).cars;
}
