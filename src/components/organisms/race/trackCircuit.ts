import * as THREE from 'three';
import type { RaceTrackStyle } from '../../../types';

export const TOTAL_LAPS = 3;
export const TRACK_WIDTH = 20;
export const TRACK_HALF_WIDTH = TRACK_WIDTH / 2;
export const TRACK_SAMPLES = 840;

export const DAYTONA_TRACK_WIDTH = 15;
export const DAYTONA_HALF_WIDTH = DAYTONA_TRACK_WIDTH / 2;

export const CAR_VISUAL_SCALE = 1.45;
export const GRID_FIRST_DIST = -5.0;
export const GRID_STEP_DIST = 4.6;
export const GRID_LANE_MAG = 0.38;

// Start/Finish anchor on Reta dos Boxes (Subida dos Boxes climb)
const INTERLAGOS_START_ANCHOR: [number, number] = [25, 154];
// Start/Finish anchor on Daytona Tri-Oval Frontstretch
const DAYTONA_START_ANCHOR: [number, number] = [0, 148];

// Lake basin center inside the infield near Descida do Lago (T4)
export const LAKE_CENTER = { x: -86, z: -102, y: -1.15, radiusX: 36, radiusZ: 24 };
// Lake Lloyd center inside Daytona Tri-Oval infield
export const DAYTONA_LAKE_CENTER = { x: 0, z: -20, y: -1.05, radiusX: 72, radiusZ: 32 };

export interface TrackSample {
  s: number;
  x: number;
  y: number;
  z: number;
  tx: number;
  ty: number;
  tz: number;
  nx: number;
  nz: number;
  angle: number;
  pitchAngle: number;
  bankAngle: number;
  curvature: number;
  signedCurvature: number;
  idealLane: number;
  drsZone: 0 | 1 | 2;
  sector: 1 | 2 | 3;
}

export interface TrackPose {
  x: number;
  y: number;
  z: number;
  tx: number;
  ty: number;
  tz: number;
  nx: number;
  nz: number;
  angle: number;
  pitchAngle: number;
  bankAngle: number;
  curvature: number;
  signedCurvature: number;
  idealLane: number;
  drsZone: 0 | 1 | 2;
  sector: 1 | 2 | 3;
  totalDistance: number;
}

export interface CircuitConfig {
  style: RaceTrackStyle;
  totalLaps: number;
  trackWidth: number;
  trackHalfWidth: number;
  usableHalfWidth: number;
  perimeter: number;
  ds: number;
  samples: TrackSample[];
}

/**
 * Autódromo José Carlos Pace (Interlagos) — Counter-Clockwise 3D Control Points [x, y, z].
 */
const INTERLAGOS_CONTROL_POINTS: [number, number, number][] = [
  [-92, 6.4, 154],
  [-36, 9.8, 154],
  [25, 13.4, 154],   // Start/Finish Line (uphill climb)
  [90, 15.8, 154],   // Crest before S do Senna
  [142, 15.6, 150],  // T1 braking zone

  // S do Senna (T1 Left -> steep downhill -> T2 Right)
  [172, 13.0, 128],
  [168, 10.0, 94],
  [188, 8.0, 74],
  [214, 6.6, 52],

  // Curva do Sol (T3 Sweeping Left onto Reta Oposta)
  [224, 5.4, 18],
  [202, 4.4, -20],
  [164, 3.8, -46],

  // Reta Oposta (Long high-speed back straight, DRS Zone 2)
  [100, 2.8, -82],
  [30, 1.9, -120],
  [-44, 1.1, -154],

  // Descida do Lago (T4 Left — lowest elevation point beside the lake)
  [-114, 0.35, -166],
  [-156, 0.0, -134],
  [-142, 0.9, -86],

  // Subida para Ferradura (T5-T7 fast climb)
  [-102, 2.9, -60],
  [-44, 5.1, -48],

  // Ferradura (T8 Sweeping Right horseshoe)
  [18, 6.8, -46],
  [46, 7.6, -14],
  [12, 8.3, 4],

  // Laranjinha (T9 Left)
  [-48, 9.2, -8],
  [-96, 9.9, 8],

  // Pinheirinho (T10 Tight Left)
  [-114, 10.1, 44],
  [-74, 9.6, 58],
  [-22, 8.6, 50],

  // Bico de Pato (T11-T12 Slow Right Hairpin)
  [22, 7.8, 48],
  [36, 6.8, 82],
  [-24, 5.8, 92],

  // Mergulho (T13 Fast dipping Left)
  [-86, 4.4, 92],
  [-142, 3.1, 102],

  // Junção (T14 Heavy-traction Left launching uphill)
  [-170, 2.4, 126],
  [-160, 3.2, 146],
  [-126, 4.6, 154],
];

/**
 * Daytona International Speedway Tri-Oval — Counter-Clockwise 3D Control Points [x, y, z].
 * Features signature Tri-Oval frontstretch dogleg (18°), Turns 1-2 (31°), Backstretch (3°), Turns 3-4 (31°).
 */
const DAYTONA_CONTROL_POINTS: [number, number, number][] = [
  [0, 0, 148],       // Tri-Oval Start/Finish Apex (18° banking)
  [76, 0, 134],      // Tri-Oval exit toward T1
  [146, 0, 114],     // Chute into Turn 1
  [218, 0, 84],      // Turn 1 entry (progressive banking up to 31°)
  [264, 0, 32],      // Turn 1 center
  [264, 0, -40],     // Turn 2 center
  [216, 0, -96],     // Turn 2 exit onto Backstretch
  [136, 0, -124],    // Backstretch east
  [0, 0, -126],      // Backstretch mid (3° flat)
  [-136, 0, -124],   // Backstretch west
  [-216, 0, -96],    // Turn 3 entry
  [-264, 0, -40],    // Turn 3 center
  [-264, 0, 32],     // Turn 4 center
  [-218, 0, 84],     // Turn 4 exit onto Frontstretch
  [-146, 0, 114],    // Chute into Tri-Oval
  [-76, 0, 134],     // Tri-Oval entry
];

// Normalized DRS zone bounds (Zone 2 computed dynamically on Reta Oposta)
export const DRS_ZONE_1_START = 0.905;
export const DRS_ZONE_1_END = 0.088;
export let DRS_ZONE_2_START = 0.255;
export let DRS_ZONE_2_END = 0.405;

function findClosestFraction(samples: { x: number; z: number }[], tx: number, tz: number): number {
  let bestIdx = 0;
  let bestD = Infinity;
  for (let i = 0; i < samples.length; i++) {
    const dx = samples[i].x - tx;
    const dz = samples[i].z - tz;
    const d = dx * dx + dz * dz;
    if (d < bestD) {
      bestD = d;
      bestIdx = i;
    }
  }
  return bestIdx / samples.length;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function buildInterlagosData() {
  const vectors = INTERLAGOS_CONTROL_POINTS.map(([x, y, z]) => new THREE.Vector3(x, y, z));
  const rawCurve = new THREE.CatmullRomCurve3(vectors, true, 'catmullrom', 0.45);
  const totalLength = rawCurve.getLength();

  let bestT = 0;
  let bestDistSq = Infinity;
  const probeCount = 3000;
  const tmp = new THREE.Vector3();
  for (let i = 0; i < probeCount; i++) {
    const t = i / probeCount;
    rawCurve.getPointAt(t, tmp);
    const dx = tmp.x - INTERLAGOS_START_ANCHOR[0];
    const dz = tmp.z - INTERLAGOS_START_ANCHOR[1];
    const dSq = dx * dx + dz * dz;
    if (dSq < bestDistSq) {
      bestDistSq = dSq;
      bestT = t;
    }
  }

  const rawPos: THREE.Vector3[] = [];
  const rawTan: THREE.Vector3[] = [];
  for (let i = 0; i < TRACK_SAMPLES; i++) {
    const u = ((i / TRACK_SAMPLES) + bestT) % 1;
    rawPos.push(rawCurve.getPointAt(u));
    rawTan.push(rawCurve.getTangentAt(u).normalize());
  }

  DRS_ZONE_2_START = findClosestFraction(rawPos, 138, -52);
  DRS_ZONE_2_END = findClosestFraction(rawPos, -32, -142);

  const samples: TrackSample[] = [];
  const rawAngles: number[] = [];

  for (let i = 0; i < TRACK_SAMPLES; i++) {
    const p = rawPos[i];
    const tan = rawTan[i];
    const horizLen = Math.max(0.0001, Math.hypot(tan.x, tan.z));
    const htx = tan.x / horizLen;
    const htz = tan.z / horizLen;
    const nx = -htz;
    const nz = htx;
    const angle = Math.atan2(-htz, htx);
    rawAngles.push(angle);
    const pitchAngle = Math.atan2(tan.y, horizLen);
    const s = (i / TRACK_SAMPLES) * totalLength;
    const progressFrac = i / TRACK_SAMPLES;
    const sector: 1 | 2 | 3 = progressFrac < 0.30 ? 1 : progressFrac < 0.72 ? 2 : 3;

    let drsZone: 0 | 1 | 2 = 0;
    if (progressFrac >= DRS_ZONE_1_START || progressFrac <= DRS_ZONE_1_END) {
      drsZone = 1;
    } else if (progressFrac >= DRS_ZONE_2_START && progressFrac <= DRS_ZONE_2_END) {
      drsZone = 2;
    }

    samples.push({
      s,
      x: p.x,
      y: p.y,
      z: p.z,
      tx: tan.x,
      ty: tan.y,
      tz: tan.z,
      nx,
      nz,
      angle,
      pitchAngle,
      bankAngle: 0,
      curvature: 0,
      signedCurvature: 0,
      idealLane: 0,
      drsZone,
      sector,
    });
  }

  const ds = totalLength / TRACK_SAMPLES;
  const windowHalf = 5;
  for (let i = 0; i < TRACK_SAMPLES; i++) {
    const prevIdx = (i - windowHalf + TRACK_SAMPLES) % TRACK_SAMPLES;
    const nextIdx = (i + windowHalf) % TRACK_SAMPLES;
    let dAngle = rawAngles[nextIdx] - rawAngles[prevIdx];
    while (dAngle > Math.PI) dAngle -= Math.PI * 2;
    while (dAngle < -Math.PI) dAngle += Math.PI * 2;

    const spanDist = windowHalf * 2 * ds;
    const signedK = dAngle / spanDist;
    samples[i].signedCurvature = signedK;
    samples[i].curvature = Math.abs(signedK);
  }

  const rawIdeal = new Float64Array(TRACK_SAMPLES);
  const entryStep = Math.round(28 / ds);
  const midAheadStep = Math.round(12 / ds);
  const exitStep = Math.round(20 / ds);

  for (let i = 0; i < TRACK_SAMPLES; i++) {
    const kHere = samples[i].signedCurvature;
    const kAheadFar = samples[(i + entryStep) % TRACK_SAMPLES].signedCurvature;
    const kAheadMid = samples[(i + midAheadStep) % TRACK_SAMPLES].signedCurvature;
    const kBehind = samples[(i - exitStep + TRACK_SAMPLES) % TRACK_SAMPLES].signedCurvature;

    const apexPull = -kHere * 32;
    const entrySwing = Math.abs(kHere) < 0.009 ? kAheadFar * 19 : 0;
    const midBlend = -kAheadMid * 8.5;
    const exitSwing = Math.abs(kHere) < 0.011 ? kBehind * 15 : 0;

    rawIdeal[i] = Math.max(-0.88, Math.min(0.88, apexPull + entrySwing + midBlend + exitSwing));
  }

  let currIdeal = rawIdeal;
  for (let pass = 0; pass < 4; pass++) {
    const nextIdeal = new Float64Array(TRACK_SAMPLES);
    for (let i = 0; i < TRACK_SAMPLES; i++) {
      let sum = 0;
      for (let k = -6; k <= 6; k++) {
        sum += currIdeal[(i + k + TRACK_SAMPLES) % TRACK_SAMPLES];
      }
      nextIdeal[i] = sum / 13;
    }
    currIdeal = nextIdeal;
  }

  for (let i = 0; i < TRACK_SAMPLES; i++) {
    samples[i].idealLane = Math.max(-0.84, Math.min(0.84, currIdeal[i]));
  }

  return { samples, totalLength, ds };
}

function buildDaytonaData() {
  const vectors = DAYTONA_CONTROL_POINTS.map(([x, y, z]) => new THREE.Vector3(x, y, z));
  const rawCurve = new THREE.CatmullRomCurve3(vectors, true, 'centripetal', 0.5);
  const totalLength = rawCurve.getLength();
  const ds = totalLength / TRACK_SAMPLES;

  let bestT = 0;
  let bestDistSq = Infinity;
  const probeCount = 3000;
  const tmp = new THREE.Vector3();
  for (let i = 0; i < probeCount; i++) {
    const t = i / probeCount;
    rawCurve.getPointAt(t, tmp);
    const dx = tmp.x - DAYTONA_START_ANCHOR[0];
    const dz = tmp.z - DAYTONA_START_ANCHOR[1];
    const dSq = dx * dx + dz * dz;
    if (dSq < bestDistSq) {
      bestDistSq = dSq;
      bestT = t;
    }
  }

  const rawPos: THREE.Vector3[] = [];
  const rawTan: THREE.Vector3[] = [];
  for (let i = 0; i < TRACK_SAMPLES; i++) {
    const u = ((i / TRACK_SAMPLES) + bestT) % 1;
    rawPos.push(rawCurve.getPointAt(u));
    rawTan.push(rawCurve.getTangentAt(u).normalize());
  }

  // Smooth progressive banking profile around Daytona Tri-Oval:
  // 31 deg in Turns 1-2 & 3-4, 18 deg on Tri-Oval frontstretch, 3 deg on Backstretch
  const rawBank = new Float64Array(TRACK_SAMPLES);
  const RAD_31 = (31 * Math.PI) / 180;
  const RAD_18 = (18 * Math.PI) / 180;
  const RAD_3 = (3 * Math.PI) / 180;

  for (let i = 0; i < TRACK_SAMPLES; i++) {
    const p = rawPos[i];
    const turnWeight = smoothstep(125, 195, Math.abs(p.x));
    const straightBank = p.z >= 0 ? RAD_18 : RAD_3;
    rawBank[i] = straightBank * (1 - turnWeight) + RAD_31 * turnWeight;
  }

  // Multi-pass Gaussian-like smoothing on banking so transitions feel fluid at 320 km/h
  let currBank = rawBank;
  for (let pass = 0; pass < 5; pass++) {
    const nextBank = new Float64Array(TRACK_SAMPLES);
    for (let i = 0; i < TRACK_SAMPLES; i++) {
      let sum = 0;
      for (let k = -8; k <= 8; k++) {
        sum += currBank[(i + k + TRACK_SAMPLES) % TRACK_SAMPLES];
      }
      nextBank[i] = sum / 17;
    }
    currBank = nextBank;
  }

  // Anchor inner edge (-DAYTONA_HALF_WIDTH) flush at y = 0, lifting centerline & outer edge smoothly
  const centerY = new Float64Array(TRACK_SAMPLES);
  for (let i = 0; i < TRACK_SAMPLES; i++) {
    centerY[i] = DAYTONA_HALF_WIDTH * Math.sin(currBank[i]);
  }

  const samples: TrackSample[] = [];
  const rawAngles: number[] = [];

  for (let i = 0; i < TRACK_SAMPLES; i++) {
    const p = rawPos[i];
    const tan = rawTan[i];
    const horizLen = Math.max(0.0001, Math.hypot(tan.x, tan.z));
    const htx = tan.x / horizLen;
    const htz = tan.z / horizLen;
    const nx = -htz;
    const nz = htx;
    const angle = Math.atan2(-htz, htx);
    rawAngles.push(angle);

    // Longitudinal slope resulting from smooth banking centerline lift
    const prevY = centerY[(i - 2 + TRACK_SAMPLES) % TRACK_SAMPLES];
    const nextY = centerY[(i + 2) % TRACK_SAMPLES];
    const dy = nextY - prevY;
    const span = 4 * ds;
    const pitchAngle = Math.atan2(dy, span);
    const ty = Math.sin(pitchAngle);
    const horizScale = Math.cos(pitchAngle);

    const s = (i / TRACK_SAMPLES) * totalLength;
    const progressFrac = i / TRACK_SAMPLES;
    const sector: 1 | 2 | 3 = progressFrac < 0.34 ? 1 : progressFrac < 0.67 ? 2 : 3;

    // Wide middle/low racing groove default (pack cars dynamically run 2-wide & 3-wide)
    const grooveBias = -0.18 * smoothstep(135, 220, Math.abs(p.x));

    samples.push({
      s,
      x: p.x,
      y: centerY[i],
      z: p.z,
      tx: htx * horizScale,
      ty,
      tz: htz * horizScale,
      nx,
      nz,
      angle,
      pitchAngle,
      bankAngle: currBank[i],
      curvature: 0,
      signedCurvature: 0,
      idealLane: grooveBias,
      drsZone: 0,
      sector,
    });
  }

  const windowHalf = 6;
  for (let i = 0; i < TRACK_SAMPLES; i++) {
    const prevIdx = (i - windowHalf + TRACK_SAMPLES) % TRACK_SAMPLES;
    const nextIdx = (i + windowHalf) % TRACK_SAMPLES;
    let dAngle = rawAngles[nextIdx] - rawAngles[prevIdx];
    while (dAngle > Math.PI) dAngle -= Math.PI * 2;
    while (dAngle < -Math.PI) dAngle += Math.PI * 2;

    const spanDist = windowHalf * 2 * ds;
    const signedK = dAngle / spanDist;
    samples[i].signedCurvature = signedK;
    samples[i].curvature = Math.abs(signedK);
  }

  return { samples, totalLength, ds };
}

const INTERLAGOS_CIRCUIT = buildInterlagosData();
const DAYTONA_CIRCUIT = buildDaytonaData();

const CIRCUIT_REGISTRY: Record<RaceTrackStyle, CircuitConfig> = {
  interlagos: {
    style: 'interlagos',
    totalLaps: TOTAL_LAPS,
    trackWidth: TRACK_WIDTH,
    trackHalfWidth: TRACK_HALF_WIDTH,
    usableHalfWidth: TRACK_HALF_WIDTH - 1.8,
    perimeter: INTERLAGOS_CIRCUIT.totalLength,
    ds: INTERLAGOS_CIRCUIT.ds,
    samples: INTERLAGOS_CIRCUIT.samples,
  },
  daytona: {
    style: 'daytona',
    totalLaps: TOTAL_LAPS,
    trackWidth: DAYTONA_TRACK_WIDTH,
    trackHalfWidth: DAYTONA_HALF_WIDTH,
    usableHalfWidth: DAYTONA_HALF_WIDTH - 1.5,
    perimeter: DAYTONA_CIRCUIT.totalLength,
    ds: DAYTONA_CIRCUIT.ds,
    samples: DAYTONA_CIRCUIT.samples,
  },
};

export function getCircuitConfig(trackStyle: RaceTrackStyle = 'interlagos'): CircuitConfig {
  return CIRCUIT_REGISTRY[trackStyle] || CIRCUIT_REGISTRY.interlagos;
}

// Legacy default Interlagos exports kept intact
export const TRACK_P = INTERLAGOS_CIRCUIT.totalLength;
export const CIRCUIT_SAMPLES = INTERLAGOS_CIRCUIT.samples;

const TERRAIN_SAMPLE_STEP = 4;

function lerpAngle(a: number, b: number, t: number): number {
  let diff = b - a;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return a + diff * t;
}

export function getCircuitPosition(
  progressDistance: number,
  laneOffsetMeters = 0,
  trackStyle: RaceTrackStyle = 'interlagos'
): TrackPose {
  const cfg = getCircuitConfig(trackStyle);
  const perimeter = cfg.perimeter;
  const samples = cfg.samples;

  let lapDist = progressDistance % perimeter;
  if (lapDist < 0) lapDist += perimeter;

  const exactIdx = (lapDist / perimeter) * TRACK_SAMPLES;
  const idx0 = Math.floor(exactIdx) % TRACK_SAMPLES;
  const idx1 = (idx0 + 1) % TRACK_SAMPLES;
  const f = exactIdx - Math.floor(exactIdx);

  const s0 = samples[idx0];
  const s1 = samples[idx1];

  const tx = s0.tx + (s1.tx - s0.tx) * f;
  const ty = s0.ty + (s1.ty - s0.ty) * f;
  const tz = s0.tz + (s1.tz - s0.tz) * f;
  const nx = s0.nx + (s1.nx - s0.nx) * f;
  const nz = s0.nz + (s1.nz - s0.nz) * f;

  const cx = s0.x + (s1.x - s0.x) * f;
  const cy = s0.y + (s1.y - s0.y) * f;
  const cz = s0.z + (s1.z - s0.z) * f;
  const bankAngle = s0.bankAngle + (s1.bankAngle - s0.bankAngle) * f;
  const cosB = Math.cos(bankAngle);
  const sinB = Math.sin(bankAngle);

  return {
    x: cx + nx * (laneOffsetMeters * cosB),
    y: cy + laneOffsetMeters * sinB,
    z: cz + nz * (laneOffsetMeters * cosB),
    tx,
    ty,
    tz,
    nx,
    nz,
    angle: lerpAngle(s0.angle, s1.angle, f),
    pitchAngle: s0.pitchAngle + (s1.pitchAngle - s0.pitchAngle) * f,
    bankAngle,
    curvature: s0.curvature + (s1.curvature - s0.curvature) * f,
    signedCurvature: s0.signedCurvature + (s1.signedCurvature - s0.signedCurvature) * f,
    idealLane: s0.idealLane + (s1.idealLane - s0.idealLane) * f,
    drsZone: s0.drsZone,
    sector: s0.sector,
    totalDistance: progressDistance,
  };
}

export function getLookaheadCurvature(
  progressDistance: number,
  lookaheadMeters: number,
  trackStyle: RaceTrackStyle = 'interlagos'
): number {
  const step = 6;
  let maxK = 0;
  for (let d = 0; d <= lookaheadMeters; d += step) {
    const pose = getCircuitPosition(progressDistance + d, 0, trackStyle);
    if (pose.curvature > maxK) maxK = pose.curvature;
  }
  return maxK;
}

export function getUpcomingCornerInfo(
  progressDistance: number,
  lookaheadMeters: number,
  trackStyle: RaceTrackStyle = 'interlagos'
): { distance: number; curvature: number; signedCurvature: number } {
  const step = 5;
  let bestDist = lookaheadMeters;
  let maxK = 0;
  let maxSignedK = 0;
  for (let d = 4; d <= lookaheadMeters; d += step) {
    const pose = getCircuitPosition(progressDistance + d, 0, trackStyle);
    if (pose.curvature > maxK) {
      maxK = pose.curvature;
      maxSignedK = pose.signedCurvature;
      bestDist = d;
    }
  }
  return { distance: bestDist, curvature: maxK, signedCurvature: maxSignedK };
}

export function getNearestTrackInfo(
  x: number,
  z: number,
  trackStyle: RaceTrackStyle = 'interlagos'
): { dist: number; trackY: number; sample: TrackSample } {
  const samples = getCircuitConfig(trackStyle).samples;
  let bestIdx = 0;
  let bestDistSq = Infinity;
  for (let i = 0; i < TRACK_SAMPLES; i += TERRAIN_SAMPLE_STEP) {
    const s = samples[i];
    const dx = x - s.x;
    const dz = z - s.z;
    const dSq = dx * dx + dz * dz;
    if (dSq < bestDistSq) {
      bestDistSq = dSq;
      bestIdx = i;
    }
  }

  let refinedIdx = bestIdx;
  for (let offset = -TERRAIN_SAMPLE_STEP; offset <= TERRAIN_SAMPLE_STEP; offset++) {
    const idx = (bestIdx + offset + TRACK_SAMPLES) % TRACK_SAMPLES;
    const s = samples[idx];
    const dx = x - s.x;
    const dz = z - s.z;
    const dSq = dx * dx + dz * dz;
    if (dSq < bestDistSq) {
      bestDistSq = dSq;
      refinedIdx = idx;
    }
  }

  const sample = samples[refinedIdx];
  return {
    dist: Math.sqrt(bestDistSq),
    trackY: sample.y,
    sample,
  };
}

export function terrainHeightAt(
  x: number,
  z: number,
  trackStyle: RaceTrackStyle = 'interlagos'
): number {
  if (trackStyle === 'daytona') {
    const { dist, sample } = getNearestTrackInfo(x, z, 'daytona');
    const signedLat = (x - sample.x) * sample.nx + (z - sample.z) * sample.nz;
    const cosB = Math.max(0.5, Math.cos(sample.bankAngle));
    const sinB = Math.sin(sample.bankAngle);

    // Carved Lake Lloyd depression inside the Daytona infield
    const ldx = (x - DAYTONA_LAKE_CENTER.x) / DAYTONA_LAKE_CENTER.radiusX;
    const ldz = (z - DAYTONA_LAKE_CENTER.z) / DAYTONA_LAKE_CENTER.radiusZ;
    const lakeRadial = Math.sqrt(ldx * ldx + ldz * ldz);

    let h = 0;

    // Gentle Florida coastal berm sloping down outside the outer SAFER wall
    if (signedLat > -DAYTONA_HALF_WIDTH && dist < DAYTONA_HALF_WIDTH + 22) {
      const bankSlopeY = Math.max(0, sample.y + (signedLat / cosB) * sinB - 0.38);
      if (signedLat <= DAYTONA_HALF_WIDTH + 2) {
        h = bankSlopeY;
      } else {
        const outerEdgeY = sample.y + DAYTONA_HALF_WIDTH * sinB - 0.35;
        const bermDrop = smoothstep(DAYTONA_HALF_WIDTH + 2, DAYTONA_HALF_WIDTH + 22, signedLat);
        h = outerEdgeY * (1 - bermDrop);
      }
    }

    // Slight scenic coastal mounds far beyond the stadium perimeter
    const radialOut = Math.hypot(x * 0.72, z * 1.12);
    h += smoothstep(235, 360, radialOut) * 4.5;

    if (lakeRadial < 1.32) {
      const basinFactor = 1 - smoothstep(0.68, 1.32, lakeRadial);
      const basinTargetY = DAYTONA_LAKE_CENTER.y - 1.35;
      h = h * (1 - basinFactor) + basinTargetY * basinFactor;
    }

    // Strict clearance directly beneath banked asphalt & inner apron
    if (dist < DAYTONA_HALF_WIDTH + 3.0) {
      const surfaceY = Math.max(0, sample.y + (signedLat / cosB) * sinB);
      h = Math.min(h, Math.max(-0.08, surfaceY - 0.28));
    }

    return h;
  }

  const { dist, trackY } = getNearestTrackInfo(x, z, 'interlagos');

  const rollingHills =
    Math.sin(x * 0.011 + 0.5) * Math.cos(z * 0.013 - 0.3) * 4.5 +
    Math.sin(x * 0.024 - z * 0.018) * 1.8;

  const radialOut = Math.hypot(x * 0.78, z * 0.92);
  const perimeterRise = smoothstep(185, 340, radialOut) * 18.0;

  const ldx = (x - LAKE_CENTER.x) / LAKE_CENTER.radiusX;
  const ldz = (z - LAKE_CENTER.z) / LAKE_CENTER.radiusZ;
  const lakeRadial = Math.sqrt(ldx * ldx + ldz * ldz);

  const pitXBlend = smoothstep(-72, -54, x) * (1 - smoothstep(114, 126, x));
  const pitZBlend = smoothstep(106, 111, z) * (1 - smoothstep(134, 139, z));
  const pitBlend = pitXBlend * pitZBlend;

  const baseTrackBed = trackY - 0.16;
  const naturalTarget = Math.max(-2.4, trackY * 0.68 + 2.2 + rollingHills + perimeterRise);

  const roadBlend = smoothstep(TRACK_HALF_WIDTH + 3.8, 52, dist);
  let h = baseTrackBed * (1 - roadBlend) + naturalTarget * roadBlend;

  if (pitBlend > 0) {
    const pitTrackY =
      x <= 25
        ? 6.4 + Math.max(0, Math.min(1, (x + 92) / 117)) * 7.0
        : 13.4 + Math.max(0, Math.min(1, (x - 25) / 65)) * 2.4;
    h = h * (1 - pitBlend) + (pitTrackY - 0.28) * pitBlend;
  }

  if (lakeRadial < 1.38) {
    const basinFactor = 1 - smoothstep(0.68, 1.38, lakeRadial);
    const basinTargetY = LAKE_CENTER.y - 1.45;
    h = h * (1 - basinFactor) + basinTargetY * basinFactor;
  }

  if (dist < TRACK_HALF_WIDTH + 3.0) {
    h = Math.min(h, trackY - 0.16);
  }

  return h;
}

export function createTerrainGeometry(trackStyle: RaceTrackStyle = 'interlagos'): THREE.BufferGeometry {
  const isDaytona = trackStyle === 'daytona';
  const width = isDaytona ? 900 : 760;
  const depth = isDaytona ? 640 : 680;
  const segX = isDaytona ? 156 : 144;
  const segZ = isDaytona ? 120 : 128;

  const geom = new THREE.PlaneGeometry(width, depth, segX, segZ);
  geom.rotateX(-Math.PI / 2);

  const pos = geom.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const y = terrainHeightAt(x, z, trackStyle);
    pos.setY(i, y);

    if (isDaytona) {
      const { dist } = getNearestTrackInfo(x, z, 'daytona');
      const ldx = (x - DAYTONA_LAKE_CENTER.x) / DAYTONA_LAKE_CENTER.radiusX;
      const ldz = (z - DAYTONA_LAKE_CENTER.z) / DAYTONA_LAKE_CENTER.radiusZ;
      const lakeRadial = Math.sqrt(ldx * ldx + ldz * ldz);

      if (lakeRadial < 1.12) {
        const shoreMix = smoothstep(0.76, 1.12, lakeRadial);
        c.setRGB(
          0.42 * (1 - shoreMix) + 0.22 * shoreMix,
          0.38 * (1 - shoreMix) + 0.48 * shoreMix,
          0.26 * (1 - shoreMix) + 0.18 * shoreMix
        );
      } else if (dist < DAYTONA_HALF_WIDTH + 6) {
        c.setRGB(0.24, 0.46, 0.18);
      } else {
        const stripe = ((Math.floor((x + 400) / 14) % 2) === 0) ? 0.025 : -0.02;
        const n = Math.sin(x * 0.04) * Math.cos(z * 0.04) * 0.025;
        c.setRGB(0.22 + stripe + n, 0.50 + stripe + n, 0.18 + n * 0.5);
      }
    } else {
      const { dist } = getNearestTrackInfo(x, z, 'interlagos');
      const ldx = (x - LAKE_CENTER.x) / LAKE_CENTER.radiusX;
      const ldz = (z - LAKE_CENTER.z) / LAKE_CENTER.radiusZ;
      const lakeRadial = Math.sqrt(ldx * ldx + ldz * ldz);

      if (lakeRadial < 1.12) {
        const shoreMix = smoothstep(0.75, 1.12, lakeRadial);
        c.setRGB(
          0.34 * (1 - shoreMix) + 0.24 * shoreMix,
          0.31 * (1 - shoreMix) + 0.42 * shoreMix,
          0.22 * (1 - shoreMix) + 0.17 * shoreMix
        );
      } else if (dist < TRACK_HALF_WIDTH + 4.5) {
        c.setRGB(0.24, 0.42, 0.18);
      } else {
        const n = Math.sin(x * 0.045) * Math.cos(z * 0.045) * 0.04;
        const elevTint = Math.min(0.08, Math.max(-0.04, y * 0.003));
        c.setRGB(0.22 + elevTint + n, 0.48 + elevTint * 0.5 + n, 0.18 + n * 0.5);
      }
    }

    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }

  geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geom.computeVertexNormals();
  geom.computeBoundingSphere();
  return geom;
}

/**
 * Builds a 3D banked ribbon BufferGeometry along the circuit centerline between [leftOffset, rightOffset]
 * with correct counter-clockwise (+Y upward) triangle winding.
 */
export function createCircuitRibbonGeometry(
  leftOffset: number,
  rightOffset: number,
  yOffset = 0,
  uvRepeatLength = 18,
  startFraction = 0,
  endFraction = 1,
  trackStyle: RaceTrackStyle = 'interlagos',
  flatYOverride?: number
): THREE.BufferGeometry {
  const cfg = getCircuitConfig(trackStyle);
  const samples = cfg.samples;
  const ds = cfg.ds;

  const closed = startFraction === 0 && endFraction === 1;
  const startIdx = Math.floor(startFraction * TRACK_SAMPLES);
  const endIdx = closed ? TRACK_SAMPLES : Math.floor(endFraction * TRACK_SAMPLES);
  const count = Math.max(2, endIdx - startIdx + 1);

  const positions = new Float32Array(count * 2 * 3);
  const uvs = new Float32Array(count * 2 * 2);
  const indices: number[] = [];

  for (let k = 0; k < count; k++) {
    const sampleIdx = (startIdx + k) % TRACK_SAMPLES;
    const s = samples[sampleIdx];
    const dist = (startIdx + k) * ds;
    const vCoord = dist / uvRepeatLength;

    const cosB = Math.cos(s.bankAngle);
    const sinB = Math.sin(s.bankAngle);

    let lx: number;
    let lz: number;
    let ly: number;
    let rx: number;
    let rz: number;
    let ry: number;

    if (flatYOverride !== undefined) {
      const anchorEdge = rightOffset * cosB;
      const apronWidth = leftOffset - rightOffset;
      rx = s.x + s.nx * anchorEdge;
      rz = s.z + s.nz * anchorEdge;
      ry = flatYOverride + yOffset;
      lx = s.x + s.nx * (anchorEdge + apronWidth);
      lz = s.z + s.nz * (anchorEdge + apronWidth);
      ly = flatYOverride + yOffset;
    } else {
      lx = s.x + s.nx * (leftOffset * cosB);
      lz = s.z + s.nz * (leftOffset * cosB);
      ly = s.y + leftOffset * sinB + yOffset;

      rx = s.x + s.nx * (rightOffset * cosB);
      rz = s.z + s.nz * (rightOffset * cosB);
      ry = s.y + rightOffset * sinB + yOffset;
    }

    const baseVert = k * 2;
    positions[baseVert * 3] = lx;
    positions[baseVert * 3 + 1] = ly;
    positions[baseVert * 3 + 2] = lz;

    positions[(baseVert + 1) * 3] = rx;
    positions[(baseVert + 1) * 3 + 1] = ry;
    positions[(baseVert + 1) * 3 + 2] = rz;

    uvs[baseVert * 2] = 0;
    uvs[baseVert * 2 + 1] = vCoord;

    uvs[(baseVert + 1) * 2] = 1;
    uvs[(baseVert + 1) * 2 + 1] = vCoord;

    if (k < count - 1) {
      const a = baseVert;
      const b = baseVert + 1;
      const c = baseVert + 2;
      const d = baseVert + 3;
      indices.push(a, b, c);
      indices.push(b, d, c);
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geom.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  geom.computeBoundingSphere();
  return geom;
}

export function createPitLaneRibbonGeometry(halfWidth = 3.6, yOffset = 0.015): THREE.BufferGeometry {
  const pitPoints = [
    new THREE.Vector3(-70, 7.5, 135),
    new THREE.Vector3(-48, 8.8, 129),
    new THREE.Vector3(-15, 11.1, 129),
    new THREE.Vector3(20, 13.1, 129),
    new THREE.Vector3(55, 14.6, 129),
    new THREE.Vector3(85, 15.5, 129),
    new THREE.Vector3(108, 15.8, 129),
    new THREE.Vector3(124, 15.8, 132),
  ];

  return buildSplineRibbon(pitPoints, halfWidth, yOffset, 80, 14);
}

/**
 * Builds the flat Daytona Infield Pit Road ribbon entering off Turn 4, running inside the Tri-Oval apron,
 * and merging cleanly back after Turn 1.
 */
export function createDaytonaPitLaneGeometry(halfWidth = 4.2, yOffset = 0.018): THREE.BufferGeometry {
  const pitPoints = [
    new THREE.Vector3(-155, 0, 96),
    new THREE.Vector3(-124, 0, 76),
    new THREE.Vector3(-72, 0, 66),
    new THREE.Vector3(0, 0, 66),
    new THREE.Vector3(72, 0, 66),
    new THREE.Vector3(124, 0, 76),
    new THREE.Vector3(155, 0, 96),
  ];

  return buildSplineRibbon(pitPoints, halfWidth, yOffset, 90, 14);
}

function buildSplineRibbon(
  points: THREE.Vector3[],
  halfWidth: number,
  yOffset: number,
  segs: number,
  uvRepeat: number
): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.45);
  const length = curve.getLength();
  const count = segs + 1;

  const positions = new Float32Array(count * 2 * 3);
  const uvs = new Float32Array(count * 2 * 2);
  const indices: number[] = [];

  for (let k = 0; k < count; k++) {
    const t = k / segs;
    const p = curve.getPointAt(t);
    const tan = curve.getTangentAt(t);
    const hLen = Math.max(0.0001, Math.hypot(tan.x, tan.z));
    const nx = -tan.z / hLen;
    const nz = tan.x / hLen;

    const baseVert = k * 2;
    positions[baseVert * 3] = p.x - nx * halfWidth;
    positions[baseVert * 3 + 1] = p.y + yOffset;
    positions[baseVert * 3 + 2] = p.z - nz * halfWidth;

    positions[(baseVert + 1) * 3] = p.x + nx * halfWidth;
    positions[(baseVert + 1) * 3 + 1] = p.y + yOffset;
    positions[(baseVert + 1) * 3 + 2] = p.z + nz * halfWidth;

    const vCoord = (t * length) / uvRepeat;
    uvs[baseVert * 2] = 0;
    uvs[baseVert * 2 + 1] = vCoord;
    uvs[(baseVert + 1) * 2] = 1;
    uvs[(baseVert + 1) * 2 + 1] = vCoord;

    if (k < count - 1) {
      const a = baseVert;
      const b = baseVert + 1;
      const c = baseVert + 2;
      const d = baseVert + 3;
      indices.push(a, b, c);
      indices.push(b, d, c);
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geom.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  geom.computeBoundingSphere();
  return geom;
}

export function createCircuitBarrierGeometry(
  offset: number,
  height = 1.25,
  thickness = 0.65,
  yBaseOffset = -0.15,
  startFraction = 0,
  endFraction = 1,
  trackStyle: RaceTrackStyle = 'interlagos',
  flatBaseY?: number
): THREE.BufferGeometry {
  const cfg = getCircuitConfig(trackStyle);
  const samples = cfg.samples;

  const closed = startFraction === 0 && endFraction === 1;
  const startIdx = Math.floor(startFraction * TRACK_SAMPLES);
  const endIdx = closed ? TRACK_SAMPLES : Math.floor(endFraction * TRACK_SAMPLES);
  const count = Math.max(2, endIdx - startIdx + 1);

  const halfT = thickness / 2;
  const innerOff = offset - halfT;
  const outerOff = offset + halfT;

  const positions = new Float32Array(count * 4 * 3);
  const validAtStep = new Uint8Array(count);
  const indices: number[] = [];

  for (let k = 0; k < count; k++) {
    const sampleIdx = (startIdx + k) % TRACK_SAMPLES;
    const s = samples[sampleIdx];

    const cosB = flatBaseY !== undefined ? 1 : Math.cos(s.bankAngle);
    const sinB = flatBaseY !== undefined ? 0 : Math.sin(s.bankAngle);

    const cx = s.x + s.nx * (offset * cosB);
    const cz = s.z + s.nz * (offset * cosB);
    const ix = s.x + s.nx * (innerOff * cosB);
    const iz = s.z + s.nz * (innerOff * cosB);
    const ox = s.x + s.nx * (outerOff * cosB);
    const oz = s.z + s.nz * (outerOff * cosB);

    const yIn = flatBaseY !== undefined ? flatBaseY + yBaseOffset : s.y + innerOff * sinB + yBaseOffset;
    const yOut = flatBaseY !== undefined ? flatBaseY + yBaseOffset : s.y + outerOff * sinB + yBaseOffset;

    if (trackStyle === 'interlagos') {
      const nearest = getNearestTrackInfo(cx, cz, 'interlagos');
      validAtStep[k] = nearest.dist >= TRACK_HALF_WIDTH + 2.8 ? 1 : 0;
    } else {
      validAtStep[k] = 1;
    }

    const v = k * 4;
    positions[v * 3] = ix;
    positions[v * 3 + 1] = yIn;
    positions[v * 3 + 2] = iz;

    positions[(v + 1) * 3] = ix;
    positions[(v + 1) * 3 + 1] = yIn + height;
    positions[(v + 1) * 3 + 2] = iz;

    positions[(v + 2) * 3] = ox;
    positions[(v + 2) * 3 + 1] = yOut + height;
    positions[(v + 2) * 3 + 2] = oz;

    positions[(v + 3) * 3] = ox;
    positions[(v + 3) * 3 + 1] = yOut;
    positions[(v + 3) * 3 + 2] = oz;

    if (k > 0 && validAtStep[k] && validAtStep[k - 1]) {
      const prev = (k - 1) * 4;
      const curr = v;
      indices.push(prev, curr, prev + 1, prev + 1, curr, curr + 1);
      indices.push(prev + 1, curr + 1, prev + 2, prev + 2, curr + 1, curr + 2);
      indices.push(prev + 2, curr + 2, prev + 3, prev + 3, curr + 2, curr + 3);
      indices.push(prev + 3, curr + 3, prev, prev, curr + 3, curr);
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  geom.computeBoundingSphere();
  return geom;
}

export function getCelebrationArenaPose(trackStyle: RaceTrackStyle = 'interlagos'): TrackPose {
  if (trackStyle === 'daytona') {
    const base = getCircuitPosition(4, 0, 'daytona');
    return {
      ...base,
      x: base.x,
      y: 0.01,
      z: 126,
      bankAngle: 0,
      pitchAngle: 0,
    };
  }
  return getCircuitPosition(6, 0, 'interlagos');
}
