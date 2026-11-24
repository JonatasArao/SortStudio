import * as THREE from 'three';

export const TOTAL_LAPS = 3;
export const TRACK_WIDTH = 20;
export const TRACK_HALF_WIDTH = TRACK_WIDTH / 2;
export const TRACK_SAMPLES = 840;

export const CAR_VISUAL_SCALE = 1.45;
export const GRID_FIRST_DIST = -5.0;
export const GRID_STEP_DIST = 4.6;
export const GRID_LANE_MAG = 0.38;

// Start/Finish anchor on Reta dos Boxes (Subida dos Boxes climb)
const START_FINISH_ANCHOR: [number, number] = [25, 154];

// Lake basin center inside the infield near Descida do Lago (T4)
export const LAKE_CENTER = { x: -86, z: -102, y: -1.15, radiusX: 36, radiusZ: 24 };

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
  curvature: number;
  signedCurvature: number;
  idealLane: number;
  drsZone: 0 | 1 | 2;
  sector: 1 | 2 | 3;
  totalDistance: number;
}

/**
 * Autódromo José Carlos Pace (Interlagos) — Counter-Clockwise 3D Control Points [x, y, z].
 * Sequence:
 *   Subida dos Boxes -> Start/Finish -> S do Senna (T1-T2) -> Curva do Sol (T3) ->
 *   Reta Oposta -> Descida do Lago (T4, lowest point) -> Ferradura (T8) ->
 *   Laranjinha (T9) -> Pinheirinho (T10) -> Bico de Pato (T11-T12) ->
 *   Mergulho (T13) -> Junção (T14) -> Curva do Café (T15) -> Subida dos Boxes.
 */
const INTERLAGOS_CONTROL_POINTS: [number, number, number][] = [
  // Curva do Café -> Subida dos Boxes -> Start/Finish -> Braking T1
  [-92, 6.4, 154],
  [-36, 9.8, 154],
  [25, 13.4, 154],   // Start/Finish Line (uphill climb)
  [90, 15.8, 154],   // Crest before S do Senna
  [142, 15.6, 150],  // T1 braking zone

  // S do Senna (T1 Left -> steep downhill -> T2 Right)
  [172, 13.0, 128],  // T1 apex (Left)
  [168, 10.0, 94],   // Downhill plunge
  [188, 8.0, 74],    // T2 apex (Right)
  [214, 6.6, 52],    // S do Senna exit

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
  [-156, 0.0, -134], // Lowest point of circuit
  [-142, 0.9, -86],  // Exit uphill toward infield

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

function buildCircuitData() {
  const vectors = INTERLAGOS_CONTROL_POINTS.map(([x, y, z]) => new THREE.Vector3(x, y, z));
  const rawCurve = new THREE.CatmullRomCurve3(vectors, true, 'catmullrom', 0.45);
  const totalLength = rawCurve.getLength();

  // Locate parameter t closest to Start/Finish anchor so s=0 aligns with checkered line
  let bestT = 0;
  let bestDistSq = Infinity;
  const probeCount = 3000;
  const tmp = new THREE.Vector3();
  for (let i = 0; i < probeCount; i++) {
    const t = i / probeCount;
    rawCurve.getPointAt(t, tmp);
    const dx = tmp.x - START_FINISH_ANCHOR[0];
    const dz = tmp.z - START_FINISH_ANCHOR[1];
    const dSq = dx * dx + dz * dz;
    if (dSq < bestDistSq) {
      bestDistSq = dSq;
      bestT = t;
    }
  }

  // First pass: extract positions & 3D tangents
  const rawPos: THREE.Vector3[] = [];
  const rawTan: THREE.Vector3[] = [];
  for (let i = 0; i < TRACK_SAMPLES; i++) {
    const u = ((i / TRACK_SAMPLES) + bestT) % 1;
    rawPos.push(rawCurve.getPointAt(u));
    rawTan.push(rawCurve.getTangentAt(u).normalize());
  }

  // Compute exact Reta Oposta DRS Zone 2 bounds from spline coordinates
  DRS_ZONE_2_START = findClosestFraction(rawPos, 138, -52);
  DRS_ZONE_2_END = findClosestFraction(rawPos, -32, -142);

  const samples: TrackSample[] = [];
  const rawAngles: number[] = [];

  for (let i = 0; i < TRACK_SAMPLES; i++) {
    const p = rawPos[i];
    const tan = rawTan[i];

    // Horizontal projection of tangent for consistent XZ heading & lateral normal
    const horizLen = Math.max(0.0001, Math.hypot(tan.x, tan.z));
    const htx = tan.x / horizLen;
    const htz = tan.z / horizLen;

    // Right-hand outward normal in XZ plane relative to forward (htx, htz)
    const nx = -htz;
    const nz = htx;

    // Car local forward is +X; rotation.y = atan2(-htz, htx) aligns +X with (htx, htz)
    const angle = Math.atan2(-htz, htx);
    rawAngles.push(angle);

    // Longitudinal road pitch angle (positive = uphill)
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
      curvature: 0,
      signedCurvature: 0,
      idealLane: 0,
      drsZone,
      sector,
    });
  }

  // Smooth curvature from horizontal heading delta
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

  // Compute authentic F1 outside-apex-outside racing line
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

const CIRCUIT = buildCircuitData();

export const TRACK_P = CIRCUIT.totalLength;
export const CIRCUIT_SAMPLES = CIRCUIT.samples;
const CIRCUIT_DS = CIRCUIT.ds;

// Coarse lookup samples for ultra-fast terrain height queries
const TERRAIN_SAMPLE_STEP = 4;

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
  const ty = s0.ty + (s1.ty - s0.ty) * f;
  const tz = s0.tz + (s1.tz - s0.tz) * f;
  const nx = s0.nx + (s1.nx - s0.nx) * f;
  const nz = s0.nz + (s1.nz - s0.nz) * f;

  const cx = s0.x + (s1.x - s0.x) * f;
  const cy = s0.y + (s1.y - s0.y) * f;
  const cz = s0.z + (s1.z - s0.z) * f;

  return {
    x: cx + nx * laneOffsetMeters,
    y: cy,
    z: cz + nz * laneOffsetMeters,
    tx,
    ty,
    tz,
    nx,
    nz,
    angle: lerpAngle(s0.angle, s1.angle, f),
    pitchAngle: s0.pitchAngle + (s1.pitchAngle - s0.pitchAngle) * f,
    curvature: s0.curvature + (s1.curvature - s0.curvature) * f,
    signedCurvature: s0.signedCurvature + (s1.signedCurvature - s0.signedCurvature) * f,
    idealLane: s0.idealLane + (s1.idealLane - s0.idealLane) * f,
    drsZone: s0.drsZone,
    sector: s0.sector,
    totalDistance: progressDistance,
  };
}

export function getLookaheadCurvature(progressDistance: number, lookaheadMeters: number): number {
  const step = 6;
  let maxK = 0;
  for (let d = 0; d <= lookaheadMeters; d += step) {
    const pose = getCircuitPosition(progressDistance + d, 0);
    if (pose.curvature > maxK) maxK = pose.curvature;
  }
  return maxK;
}

export function getUpcomingCornerInfo(
  progressDistance: number,
  lookaheadMeters: number
): { distance: number; curvature: number; signedCurvature: number } {
  const step = 5;
  let bestDist = lookaheadMeters;
  let maxK = 0;
  let maxSignedK = 0;
  for (let d = 4; d <= lookaheadMeters; d += step) {
    const pose = getCircuitPosition(progressDistance + d, 0);
    if (pose.curvature > maxK) {
      maxK = pose.curvature;
      maxSignedK = pose.signedCurvature;
      bestDist = d;
    }
  }
  return { distance: bestDist, curvature: maxK, signedCurvature: maxSignedK };
}

/**
 * Computes minimum horizontal distance from (x, z) to the circuit centerline and the corresponding road elevation.
 */
export function getNearestTrackInfo(x: number, z: number): { dist: number; trackY: number; sample: TrackSample } {
  let bestIdx = 0;
  let bestDistSq = Infinity;
  for (let i = 0; i < TRACK_SAMPLES; i += TERRAIN_SAMPLE_STEP) {
    const s = CIRCUIT_SAMPLES[i];
    const dx = x - s.x;
    const dz = z - s.z;
    const dSq = dx * dx + dz * dz;
    if (dSq < bestDistSq) {
      bestDistSq = dSq;
      bestIdx = i;
    }
  }

  // Local refinement
  let refinedIdx = bestIdx;
  for (let offset = -TERRAIN_SAMPLE_STEP; offset <= TERRAIN_SAMPLE_STEP; offset++) {
    const idx = (bestIdx + offset + TRACK_SAMPLES) % TRACK_SAMPLES;
    const s = CIRCUIT_SAMPLES[idx];
    const dx = x - s.x;
    const dz = z - s.z;
    const dSq = dx * dx + dz * dz;
    if (dSq < bestDistSq) {
      bestDistSq = dSq;
      refinedIdx = idx;
    }
  }

  const sample = CIRCUIT_SAMPLES[refinedIdx];
  return {
    dist: Math.sqrt(bestDistSq),
    trackY: sample.y,
    sample,
  };
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Continuous 3D Interlagos terrain heightfield:
 * - Conforms smoothly beneath the asphalt, pit lane, and grandstands (never poking through the track)
 * - Carves a natural basin for the Lago de Interlagos near Descida do Lago
 * - Rises gently into São Paulo hillsides around the outer perimeter
 */
export function terrainHeightAt(x: number, z: number): number {
  const { dist, trackY } = getNearestTrackInfo(x, z);

  // Subtle natural rolling hills outside the circuit corridor
  const rollingHills =
    Math.sin(x * 0.011 + 0.5) * Math.cos(z * 0.013 - 0.3) * 4.5 +
    Math.sin(x * 0.024 - z * 0.018) * 1.8;

  // Outer Sao Paulo ridge rise beyond circuit bounds
  const radialOut = Math.hypot(x * 0.78, z * 0.92);
  const perimeterRise = smoothstep(185, 340, radialOut) * 18.0;

  // Lake depression in the infield near Descida do Lago (carved cleanly below LAKE_CENTER.y = -1.15)
  const ldx = (x - LAKE_CENTER.x) / LAKE_CENTER.radiusX;
  const ldz = (z - LAKE_CENTER.z) / LAKE_CENTER.radiusZ;
  const lakeRadial = Math.sqrt(ldx * ldx + ldz * ldz);

  // Smooth terraced plateau strictly for Pit Lane & Prédio dos Boxes (x in [-72, 126], z in [106, 139])
  const pitXBlend = smoothstep(-72, -54, x) * (1 - smoothstep(114, 126, x));
  const pitZBlend = smoothstep(106, 111, z) * (1 - smoothstep(134, 139, z));
  const pitBlend = pitXBlend * pitZBlend;

  const baseTrackBed = trackY - 0.16;
  const naturalTarget = Math.max(-2.4, trackY * 0.68 + 2.2 + rollingHills + perimeterRise);

  // Keep terrain snugly tucked under the track bed up to 13.8m from centerline, then blend outward
  const roadBlend = smoothstep(TRACK_HALF_WIDTH + 3.8, 52, dist);
  let h = baseTrackBed * (1 - roadBlend) + naturalTarget * roadBlend;

  if (pitBlend > 0) {
    // Match Subida dos Boxes elevation across Pit Lane & Pit Building apron
    const pitTrackY =
      x <= 25
        ? 6.4 + Math.max(0, Math.min(1, (x + 92) / 117)) * 7.0
        : 13.4 + Math.max(0, Math.min(1, (x - 25) / 65)) * 2.4;
    h = h * (1 - pitBlend) + (pitTrackY - 0.28) * pitBlend;
  }

  // Carve lake bowl beneath LAKE_CENTER.y (-1.15) with sloped shoreline bank
  if (lakeRadial < 1.38) {
    const basinFactor = 1 - smoothstep(0.68, 1.38, lakeRadial);
    const basinTargetY = LAKE_CENTER.y - 1.45;
    h = h * (1 - basinFactor) + basinTargetY * basinFactor;
  }

  // Enforce strict clearance directly under asphalt & kerbs so terrain never clips
  if (dist < TRACK_HALF_WIDTH + 3.0) {
    h = Math.min(h, trackY - 0.16);
  }

  return h;
}

/**
 * Generates the sculpted 3D Interlagos terrain BufferGeometry with vertex colors
 * (soil shoulders, lush mowed turf, hillside grass, and sandy lake bank).
 */
export function createTerrainGeometry(): THREE.BufferGeometry {
  const width = 760;
  const depth = 680;
  const segX = 144;
  const segZ = 128;

  const geom = new THREE.PlaneGeometry(width, depth, segX, segZ);
  geom.rotateX(-Math.PI / 2);

  const pos = geom.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const y = terrainHeightAt(x, z);
    pos.setY(i, y);

    const { dist } = getNearestTrackInfo(x, z);
    const ldx = (x - LAKE_CENTER.x) / LAKE_CENTER.radiusX;
    const ldz = (z - LAKE_CENTER.z) / LAKE_CENTER.radiusZ;
    const lakeRadial = Math.sqrt(ldx * ldx + ldz * ldz);

    if (lakeRadial < 1.12) {
      // Sandy / damp earth shoreline around Lago de Interlagos
      const shoreMix = smoothstep(0.75, 1.12, lakeRadial);
      c.setRGB(
        0.34 * (1 - shoreMix) + 0.24 * shoreMix,
        0.31 * (1 - shoreMix) + 0.42 * shoreMix,
        0.22 * (1 - shoreMix) + 0.17 * shoreMix
      );
    } else if (dist < TRACK_HALF_WIDTH + 4.5) {
      // Darker compacted shoulder turf right along kerbs
      c.setRGB(0.24, 0.42, 0.18);
    } else {
      // Natural São Paulo grass variation by elevation and organic noise
      const n = Math.sin(x * 0.045) * Math.cos(z * 0.045) * 0.04;
      const elevTint = Math.min(0.08, Math.max(-0.04, y * 0.003));
      c.setRGB(0.22 + elevTint + n, 0.48 + elevTint * 0.5 + n, 0.18 + n * 0.5);
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
 * Builds a 3D ribbon BufferGeometry along the circuit centerline between [leftOffset, rightOffset]
 * with correct counter-clockwise (+Y upward) triangle winding so FrontSide renders crisply from above.
 */
export function createCircuitRibbonGeometry(
  leftOffset: number,
  rightOffset: number,
  yOffset = 0,
  uvRepeatLength = 18,
  startFraction = 0,
  endFraction = 1
): THREE.BufferGeometry {
  const closed = startFraction === 0 && endFraction === 1;
  const startIdx = Math.floor(startFraction * TRACK_SAMPLES);
  const endIdx = closed ? TRACK_SAMPLES : Math.floor(endFraction * TRACK_SAMPLES);
  const count = Math.max(2, endIdx - startIdx + 1);

  const positions = new Float32Array(count * 2 * 3);
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
    const vy = s.y + yOffset;

    const baseVert = k * 2;
    positions[baseVert * 3] = lx;
    positions[baseVert * 3 + 1] = vy;
    positions[baseVert * 3 + 2] = lz;

    positions[(baseVert + 1) * 3] = rx;
    positions[(baseVert + 1) * 3 + 1] = vy;
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
      // Counter-clockwise winding viewed from +Y so FrontSide faces upward!
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

/**
 * Builds the dedicated Interlagos Pit Lane ribbon running along the inside of Reta dos Boxes
 * (entry before Curva do Café -> pit boxes -> exit past S do Senna T1).
 */
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

  const curve = new THREE.CatmullRomCurve3(pitPoints, false, 'catmullrom', 0.45);
  const segs = 80;
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

    const vCoord = (t * length) / 14;
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

/**
 * Builds an extruded 3D vertical safety wall / FIA catch barrier ribbon following the circuit elevation.
 * Automatically omits barrier segments that would intrude upon another leg of the circuit or pit apron.
 */
export function createCircuitBarrierGeometry(
  offset: number,
  height = 1.25,
  thickness = 0.65,
  yBaseOffset = -0.15,
  startFraction = 0,
  endFraction = 1
): THREE.BufferGeometry {
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
    const s = CIRCUIT_SAMPLES[sampleIdx];
    const cx = s.x + s.nx * offset;
    const cz = s.z + s.nz * offset;
    const ix = s.x + s.nx * innerOff;
    const iz = s.z + s.nz * innerOff;
    const ox = s.x + s.nx * outerOff;
    const oz = s.z + s.nz * outerOff;
    const yb = s.y + yBaseOffset;

    // Ensure barrier never crosses any other part of the circuit (e.g. tight hairpins)
    const nearest = getNearestTrackInfo(cx, cz);
    const isClear = nearest.dist >= TRACK_HALF_WIDTH + 2.8;
    validAtStep[k] = isClear ? 1 : 0;

    const v = k * 4;
    positions[v * 3] = ix;
    positions[v * 3 + 1] = yb;
    positions[v * 3 + 2] = iz;

    positions[(v + 1) * 3] = ix;
    positions[(v + 1) * 3 + 1] = yb + height;
    positions[(v + 1) * 3 + 2] = iz;

    positions[(v + 2) * 3] = ox;
    positions[(v + 2) * 3 + 1] = yb + height;
    positions[(v + 2) * 3 + 2] = oz;

    positions[(v + 3) * 3] = ox;
    positions[(v + 3) * 3 + 1] = yb;
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
