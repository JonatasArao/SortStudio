import * as THREE from 'three';

export const TOTAL_LAPS = 3;
export const TRACK_WIDTH = 18;
export const TRACK_HALF_WIDTH = TRACK_WIDTH / 2;
export const TRACK_SAMPLES = 720;

export interface TrackSample {
  s: number;
  x: number;
  z: number;
  tx: number;
  tz: number;
  nx: number;
  nz: number;
  angle: number;
  curvature: number;
  signedCurvature: number;
  drsZone: 0 | 1 | 2;
  sector: 1 | 2 | 3;
}

// Control points arranged so Start/Finish sits cleanly at (0, 75) heading +X
const CONTROL_POINTS: [number, number][] = [
  [-80, 75],
  [-20, 75],
  [40, 75],
  [92, 74],
  [134, 58],
  [148, 20],
  [128, -16],
  [94, -26],
  [70, -50],
  [90, -84],
  [52, -108],
  [2, -102],
  [-48, -92],
  [-96, -82],
  [-134, -56],
  [-118, -18],
  [-146, 16],
  [-134, 58],
  [-105, 74],
];

function buildCircuitData() {
  const vectors = CONTROL_POINTS.map(([x, z]) => new THREE.Vector3(x, 0, z));
  const rawCurve = new THREE.CatmullRomCurve3(vectors, true, 'catmullrom', 0.45);
  const totalLength = rawCurve.getLength();

  // Locate parameter t closest to Start/Finish (0, 75) so s=0 aligns with the checkered line
  let bestT = 0;
  let bestDistSq = Infinity;
  const probeCount = 2000;
  const tmp = new THREE.Vector3();
  for (let i = 0; i < probeCount; i++) {
    const t = i / probeCount;
    rawCurve.getPointAt(t, tmp);
    const dSq = tmp.x * tmp.x + (tmp.z - 75) * (tmp.z - 75);
    if (dSq < bestDistSq) {
      bestDistSq = dSq;
      bestT = t;
    }
  }

  const samples: TrackSample[] = [];
  const rawAngles: number[] = [];

  for (let i = 0; i < TRACK_SAMPLES; i++) {
    const u = ((i / TRACK_SAMPLES) + bestT) % 1;
    const p = rawCurve.getPointAt(u);
    const tan = rawCurve.getTangentAt(u).normalize();

    // Right-hand outward normal in XZ plane relative to forward (tx, tz)
    const nx = -tan.z;
    const nz = tan.x;

    // Car local forward is +X; rotation.y = atan2(-tz, tx) aligns +X with (tx, tz)
    const angle = Math.atan2(-tan.z, tan.x);
    rawAngles.push(angle);

    const s = (i / TRACK_SAMPLES) * totalLength;
    const progressFrac = i / TRACK_SAMPLES;
    const sector: 1 | 2 | 3 = progressFrac < 0.333 ? 1 : progressFrac < 0.666 ? 2 : 3;

    // Two DRS zones:
    // Zone 1: Main straight (final exit & start straight: progress 0.91..1.0 and 0.0..0.09)
    // Zone 2: Back straight (progress 0.50..0.67)
    let drsZone: 0 | 1 | 2 = 0;
    if (progressFrac >= 0.92 || progressFrac <= 0.09) {
      drsZone = 1;
    } else if (progressFrac >= 0.51 && progressFrac <= 0.66) {
      drsZone = 2;
    }

    samples.push({
      s,
      x: p.x,
      z: p.z,
      tx: tan.x,
      tz: tan.z,
      nx,
      nz,
      angle,
      curvature: 0,
      signedCurvature: 0,
      drsZone,
      sector,
    });
  }

  // Compute smoothed curvature from angle delta over a window
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

  return { samples, totalLength, ds };
}

const CIRCUIT = buildCircuitData();

export const TRACK_P = CIRCUIT.totalLength;
export const CIRCUIT_SAMPLES = CIRCUIT.samples;
const CIRCUIT_DS = CIRCUIT.ds;

export interface TrackPose {
  x: number;
  z: number;
  tx: number;
  tz: number;
  nx: number;
  nz: number;
  angle: number;
  curvature: number;
  signedCurvature: number;
  drsZone: 0 | 1 | 2;
  sector: 1 | 2 | 3;
  totalDistance: number;
}

function lerpAngle(a: number, b: number, t: number): number {
  let diff = b - a;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return a + diff * t;
}

export function getCircuitPosition(progressDistance: number, laneOffsetMeters = 0): TrackPose {
  let lapDist = progressDistance % TRACK_P;
  if (lapDist < 0) lapDist += TRACK_P;

  const exactIdx = (lapDist / TRACK_P) * TRACK_SAMPLES;
  const idx0 = Math.floor(exactIdx) % TRACK_SAMPLES;
  const idx1 = (idx0 + 1) % TRACK_SAMPLES;
  const f = exactIdx - Math.floor(exactIdx);

  const s0 = CIRCUIT_SAMPLES[idx0];
  const s1 = CIRCUIT_SAMPLES[idx1];

  const tx = s0.tx + (s1.tx - s0.tx) * f;
  const tz = s0.tz + (s1.tz - s0.tz) * f;
  const nx = s0.nx + (s1.nx - s0.nx) * f;
  const nz = s0.nz + (s1.nz - s0.nz) * f;

  const cx = s0.x + (s1.x - s0.x) * f;
  const cz = s0.z + (s1.z - s0.z) * f;

  return {
    x: cx + nx * laneOffsetMeters,
    z: cz + nz * laneOffsetMeters,
    tx,
    tz,
    nx,
    nz,
    angle: lerpAngle(s0.angle, s1.angle, f),
    curvature: s0.curvature + (s1.curvature - s0.curvature) * f,
    signedCurvature: s0.signedCurvature + (s1.signedCurvature - s0.signedCurvature) * f,
    drsZone: s0.drsZone,
    sector: s0.sector,
    totalDistance: progressDistance,
  };
}

/**
 * Queries track curvature ahead of a given track distance for realistic braking anticipation.
 */
export function getLookaheadCurvature(progressDistance: number, lookaheadMeters: number): number {
  const step = 6;
  let maxK = 0;
  for (let d = 0; d <= lookaheadMeters; d += step) {
    const pose = getCircuitPosition(progressDistance + d, 0);
    if (pose.curvature > maxK) maxK = pose.curvature;
  }
  return maxK;
}

/**
 * Builds a closed ribbon BufferGeometry along the circuit centerline between [leftOffset, rightOffset].
 */
export function createCircuitRibbonGeometry(
  leftOffset: number,
  rightOffset: number,
  yHeight = 0,
  uvRepeatLength = 18,
  startFraction = 0,
  endFraction = 1
): THREE.BufferGeometry {
  const closed = startFraction === 0 && endFraction === 1;
  const startIdx = Math.floor(startFraction * TRACK_SAMPLES);
  const endIdx = closed ? TRACK_SAMPLES : Math.floor(endFraction * TRACK_SAMPLES);
  const count = endIdx - startIdx + 1;

  const positions = new Float32Array(count * 2 * 3);
  const normals = new Float32Array(count * 2 * 3);
  const uvs = new Float32Array(count * 2 * 2);
  const indices: number[] = [];

  for (let k = 0; k < count; k++) {
    const sampleIdx = (startIdx + k) % TRACK_SAMPLES;
    const s = CIRCUIT_SAMPLES[sampleIdx];
    const dist = (startIdx + k) * CIRCUIT_DS;
    const vCoord = dist / uvRepeatLength;

    const lx = s.x + s.nx * leftOffset;
    const lz = s.z + s.nz * leftOffset;
    const rx = s.x + s.nx * rightOffset;
    const rz = s.z + s.nz * rightOffset;

    const baseVert = k * 2;
    positions[baseVert * 3] = lx;
    positions[baseVert * 3 + 1] = yHeight;
    positions[baseVert * 3 + 2] = lz;

    positions[(baseVert + 1) * 3] = rx;
    positions[(baseVert + 1) * 3 + 1] = yHeight;
    positions[(baseVert + 1) * 3 + 2] = rz;

    normals[baseVert * 3] = 0;
    normals[baseVert * 3 + 1] = 1;
    normals[baseVert * 3 + 2] = 0;

    normals[(baseVert + 1) * 3] = 0;
    normals[(baseVert + 1) * 3 + 1] = 1;
    normals[(baseVert + 1) * 3 + 2] = 0;

    uvs[baseVert * 2] = 0;
    uvs[baseVert * 2 + 1] = vCoord;

    uvs[(baseVert + 1) * 2] = 1;
    uvs[(baseVert + 1) * 2 + 1] = vCoord;

    if (k < count - 1) {
      const a = baseVert;
      const b = baseVert + 1;
      const c = baseVert + 2;
      const d = baseVert + 3;
      indices.push(a, c, b);
      indices.push(b, c, d);
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geom.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geom.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geom.setIndex(indices);
  geom.computeBoundingSphere();
  return geom;
}

/**
 * Builds an extruded vertical safety wall ribbon along an offset from the centerline.
 */
export function createCircuitBarrierGeometry(
  offset: number,
  height = 1.2,
  thickness = 0.6,
  yBase = -0.2
): THREE.BufferGeometry {
  const halfT = thickness / 2;
  const innerOff = offset - halfT;
  const outerOff = offset + halfT;
  const count = TRACK_SAMPLES + 1;

  // 4 verts per ring (inner-bottom, inner-top, outer-top, outer-bottom)
  const positions = new Float32Array(count * 4 * 3);
  const indices: number[] = [];

  for (let k = 0; k < count; k++) {
    const s = CIRCUIT_SAMPLES[k % TRACK_SAMPLES];
    const ix = s.x + s.nx * innerOff;
    const iz = s.z + s.nz * innerOff;
    const ox = s.x + s.nx * outerOff;
    const oz = s.z + s.nz * outerOff;

    const v = k * 4;
    // 0: inner bottom
    positions[v * 3] = ix;
    positions[v * 3 + 1] = yBase;
    positions[v * 3 + 2] = iz;
    // 1: inner top
    positions[(v + 1) * 3] = ix;
    positions[(v + 1) * 3 + 1] = yBase + height;
    positions[(v + 1) * 3 + 2] = iz;
    // 2: outer top
    positions[(v + 2) * 3] = ox;
    positions[(v + 2) * 3 + 1] = yBase + height;
    positions[(v + 2) * 3 + 2] = oz;
    // 3: outer bottom
    positions[(v + 3) * 3] = ox;
    positions[(v + 3) * 3 + 1] = yBase;
    positions[(v + 3) * 3 + 2] = oz;

    if (k < count - 1) {
      const n = v + 4;
      // Inner face
      indices.push(v, n, v + 1, v + 1, n, n + 1);
      // Top face
      indices.push(v + 1, n + 1, v + 2, v + 2, n + 1, n + 2);
      // Outer face
      indices.push(v + 2, n + 2, v + 3, v + 3, n + 2, n + 3);
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  geom.computeBoundingSphere();
  return geom;
}
