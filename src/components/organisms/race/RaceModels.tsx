import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  TRACK_HALF_WIDTH,
  TRACK_WIDTH,
  CIRCUIT_SAMPLES,
  TRACK_SAMPLES,
  CAR_VISUAL_SCALE,
  GRID_FIRST_DIST,
  GRID_STEP_DIST,
  GRID_LANE_MAG,
  DRS_ZONE_1_START,
  DRS_ZONE_1_END,
  DRS_ZONE_2_START,
  DRS_ZONE_2_END,
  LAKE_CENTER,
  getCircuitPosition,
  createCircuitRibbonGeometry,
  createPitLaneRibbonGeometry,
  createCircuitBarrierGeometry,
  createTerrainGeometry,
  terrainHeightAt,
} from './trackCircuit';
import {
  LiveRacerTelemetry,
  SimFrame,
  SIM_FPS,
  USABLE_HALF_WIDTH,
} from './raceSimulation';

// Pre-allocated helpers at module scope for Zero-GC in 60fps useFrame loops
const _fxDummy = new THREE.Object3D();
const _fxColor = new THREE.Color();

/**
 * Generates procedural studio environment reflections without external HDR network fetches.
 */
export const ProceduralEnvironment = () => {
  const { gl, scene } = useThree();

  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    pmrem.compileEquirectangularShader();
    const envTarget = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envTarget.texture;
    scene.environmentIntensity = 0.72;

    return () => {
      scene.environment = null;
      envTarget.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);

  const skyTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createLinearGradient(0, 0, 0, 256);
      grad.addColorStop(0.0, '#0369a1');
      grad.addColorStop(0.28, '#0ea5e9');
      grad.addColorStop(0.54, '#7dd3fc');
      grad.addColorStop(0.76, '#bae6fd');
      grad.addColorStop(0.88, '#e0f2fe');
      grad.addColorStop(1.0, '#cbd5e1');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 512, 256);

      // Soft high-altitude São Paulo afternoon clouds near horizon
      ctx.fillStyle = 'rgba(255, 255, 255, 0.24)';
      for (let i = 0; i < 22; i++) {
        const cx = ((i * 89 + 23) % 512);
        const cy = 132 + ((i * 19) % 42);
        const rx = 28 + (i % 4) * 16;
        const ry = 7 + (i % 3) * 4;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);

  useEffect(() => {
    return () => {
      skyTexture.dispose();
    };
  }, [skyTexture]);

  return (
    <>
      <color attach="background" args={['#bae6fd']} />
      <fogExp2 attach="fog" args={['#cfe8f7', 0.00115]} />
      <mesh scale={[-1, 1, 1]}>
        <sphereGeometry args={[640, 32, 24]} />
        <meshBasicMaterial map={skyTexture} side={THREE.BackSide} depthWrite={false} fog={false} />
      </mesh>
    </>
  );
};

function createAsphaltTexture(maxAnisotropy: number) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Rich dark F1 charcoal tarmac
    ctx.fillStyle = '#252932';
    ctx.fillRect(0, 0, 512, 512);

    // Subtle lateral shoulder darkening & rubberized racing groove
    const groove = ctx.createLinearGradient(0, 0, 512, 0);
    groove.addColorStop(0.0, 'rgba(18, 20, 26, 0.25)');
    groove.addColorStop(0.14, 'rgba(25, 28, 36, 0)');
    groove.addColorStop(0.35, 'rgba(10, 12, 16, 0.42)');
    groove.addColorStop(0.5, 'rgba(7, 9, 13, 0.56)');
    groove.addColorStop(0.65, 'rgba(10, 12, 16, 0.42)');
    groove.addColorStop(0.86, 'rgba(25, 28, 36, 0)');
    groove.addColorStop(1.0, 'rgba(18, 20, 26, 0.25)');
    ctx.fillStyle = groove;
    ctx.fillRect(0, 0, 512, 512);

    // Multi-tone asphalt aggregate speckle
    for (let i = 0; i < 9000; i++) {
      const x = (i * 73) % 512;
      const y = (i * 197 + Math.floor(i / 512) * 31) % 512;
      const shade =
        i % 4 === 0
          ? 'rgba(255,255,255,0.055)'
          : i % 3 === 0
          ? 'rgba(200,210,225,0.035)'
          : 'rgba(0,0,0,0.12)';
      ctx.fillStyle = shade;
      ctx.fillRect(x, y, 2, 2);
    }

    // Crisp FIA white track limit lines
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(10, 0, 11, 512);
    ctx.fillRect(491, 0, 11, 512);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createPitAsphaltTexture(maxAnisotropy: number) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#2d333f';
    ctx.fillRect(0, 0, 256, 256);

    for (let i = 0; i < 2400; i++) {
      const x = (i * 53) % 256;
      const y = (i * 131) % 256;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.1)';
      ctx.fillRect(x, y, 2, 2);
    }

    // Pit lane fast-lane divider & red pit-box edge
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(16, 0, 6, 256);
    ctx.fillRect(234, 0, 6, 256);
    ctx.fillStyle = '#eab308';
    for (let y = 0; y < 256; y += 32) {
      ctx.fillRect(126, y, 4, 18);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createKerbTexture(maxAnisotropy: number) {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 192;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Authentic Interlagos Brazilian Flag Kerbs (Green / Yellow / White)
    ctx.fillStyle = '#15803d';
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(0, 64, 64, 64);
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 128, 64, 64);

    // Subtle groove shadow & tyre rubber scuffing along inner edge
    ctx.fillStyle = 'rgba(0,0,0,0.16)';
    ctx.fillRect(0, 0, 64, 4);
    ctx.fillRect(0, 64, 64, 4);
    ctx.fillRect(0, 128, 64, 4);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.22)';
    ctx.fillRect(0, 0, 10, 192);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createTurfTexture(maxAnisotropy: number) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Neutral luminance turf detail modulated by terrain vertex colors
    ctx.fillStyle = '#d4e6cf';
    ctx.fillRect(0, 0, 512, 512);
    ctx.fillStyle = '#c6dcb8';
    for (let y = 0; y < 512; y += 64) {
      ctx.fillRect(0, y, 512, 32);
    }
    for (let i = 0; i < 6500; i++) {
      const x = (i * 113) % 512;
      const y = (i * 251) % 512;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.14)' : 'rgba(20,40,15,0.12)';
      ctx.fillRect(x, y, 2, 2);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(48, 48);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createCheckeredTexture(maxAnisotropy: number) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, 512, 128);
    ctx.fillStyle = '#0f172a';
    for (let i = 0; i < 16; i++) {
      for (let j = 0; j < 4; j++) {
        if ((i + j) % 2 === 0) {
          ctx.fillRect(i * 32, j * 32, 32, 32);
        }
      }
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createContactShadowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(64, 64, 12, 64, 64, 60);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.72)');
    grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.32)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
  }
  const tex = new THREE.CanvasTexture(canvas);
  return tex;
}

const StartLightGantry = ({
  lightsCount,
  isLightsOut,
}: {
  lightsCount: number;
  isLightsOut: boolean;
}) => {
  const startPose = useMemo(() => getCircuitPosition(0, 0), []);

  return (
    <group position={[startPose.x, startPose.y, startPose.z]} rotation={[0, startPose.angle, 0]}>
      {/* Two Steel Truss Towers anchored below road edge */}
      <mesh position={[0, 4.1, TRACK_HALF_WIDTH + 1.5]} castShadow receiveShadow>
        <boxGeometry args={[0.95, 9.6, 0.95]} />
        <meshStandardMaterial color="#1e293b" metalness={0.85} roughness={0.25} />
      </mesh>
      <mesh position={[0, 4.1, -TRACK_HALF_WIDTH - 1.5]} castShadow receiveShadow>
        <boxGeometry args={[0.95, 9.6, 0.95]} />
        <meshStandardMaterial color="#1e293b" metalness={0.85} roughness={0.25} />
      </mesh>

      {/* Overhead Bridge Span */}
      <mesh position={[0, 8.6, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.4, 0.9, TRACK_WIDTH + 4.4]} />
        <meshStandardMaterial color="#0f172a" metalness={0.88} roughness={0.18} />
      </mesh>

      {/* Brazilian GP Green/Yellow/Blue Timing Fascia (visible from grid & front cameras) */}
      <mesh position={[-0.62, 8.6, 0]}>
        <boxGeometry args={[0.25, 0.72, TRACK_WIDTH + 2.0]} />
        <meshStandardMaterial color="#15803d" metalness={0.25} roughness={0.45} />
      </mesh>
      <mesh position={[-0.66, 8.26, 0]}>
        <boxGeometry args={[0.22, 0.14, TRACK_WIDTH + 2.0]} />
        <meshStandardMaterial color="#facc15" metalness={0.2} roughness={0.4} />
      </mesh>
      <mesh position={[0.62, 8.6, 0]}>
        <boxGeometry args={[0.25, 0.72, TRACK_WIDTH + 2.0]} />
        <meshStandardMaterial color="#15803d" metalness={0.25} roughness={0.45} />
      </mesh>
      <mesh position={[0.66, 8.26, 0]}>
        <boxGeometry args={[0.22, 0.14, TRACK_WIDTH + 2.0]} />
        <meshStandardMaterial color="#facc15" metalness={0.2} roughness={0.4} />
      </mesh>

      {/* Light Pod Housing */}
      <mesh position={[0, 7.1, 0]} castShadow>
        <boxGeometry args={[1.35, 1.45, 11.2]} />
        <meshStandardMaterial color="#020617" metalness={0.9} roughness={0.15} />
      </mesh>

      {/* 5 FIA Dual Light Columns facing -X directly toward the Starting Grid */}
      {[-4.0, -2.0, 0, 2.0, 4.0].map((zOffset, idx) => {
        const isRedLit = !isLightsOut && idx < lightsCount;
        const isGreenLit = isLightsOut;

        return (
          <group key={idx} position={[-0.7, 7.1, zOffset]}>
            <mesh position={[0.04, 0, 0]}>
              <boxGeometry args={[0.08, 1.25, 1.45]} />
              <meshStandardMaterial color="#000000" roughness={0.9} />
            </mesh>

            {/* Top Dual Red Lights */}
            {[-0.32, 0.32].map((lz, j) => (
              <mesh key={`r-${j}`} position={[-0.03, 0.3, lz]}>
                <sphereGeometry args={[0.19, 16, 16]} />
                <meshStandardMaterial
                  color={isRedLit ? '#ff1e1e' : '#220606'}
                  emissive={isRedLit ? '#ff1e1e' : '#000000'}
                  emissiveIntensity={isRedLit ? 5.5 : 0}
                  roughness={0.2}
                />
              </mesh>
            ))}

            {/* Bottom Dual Green Lights */}
            {[-0.32, 0.32].map((lz, j) => (
              <mesh key={`g-${j}`} position={[-0.03, -0.3, lz]}>
                <sphereGeometry args={[0.19, 16, 16]} />
                <meshStandardMaterial
                  color={isGreenLit ? '#10b981' : '#022017'}
                  emissive={isGreenLit ? '#10b981' : '#000000'}
                  emissiveIntensity={isGreenLit ? 5.5 : 0}
                  roughness={0.2}
                />
              </mesh>
            ))}
          </group>
        );
      })}
    </group>
  );
};

const StartingGridMarkings = ({ total }: { total: number }) => {
  const slots = useMemo(() => {
    return Array.from({ length: total }).map((_, idx) => {
      const startDist = GRID_FIRST_DIST - idx * GRID_STEP_DIST;
      const laneSide = idx % 2 === 0 ? -GRID_LANE_MAG : GRID_LANE_MAG;
      const laneOffset = laneSide * USABLE_HALF_WIDTH;
      return getCircuitPosition(startDist, laneOffset);
    });
  }, [total]);

  return (
    <group>
      {slots.map((pos, idx) => (
        <group key={idx} position={[pos.x, pos.y + 0.02, pos.z]} rotation={[0, pos.angle, pos.pitchAngle]}>
          {/* Grid Box Front Line */}
          <mesh position={[1.0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.2, 1.55]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.6} polygonOffset polygonOffsetFactor={-2} />
          </mesh>
          {/* Side Brackets */}
          <mesh position={[0.58, 0, 0.74]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.9, 0.12]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.6} polygonOffset polygonOffsetFactor={-2} />
          </mesh>
          <mesh position={[0.58, 0, -0.74]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.9, 0.12]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.6} polygonOffset polygonOffsetFactor={-2} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

const TyreSmoke = ({ intensityRef }: { intensityRef: React.MutableRefObject<number> }) => {
  const groupRef = useRef<THREE.Group>(null);
  const particles = useMemo(
    () =>
      Array.from({ length: 14 }).map((_, i) => ({
        side: i % 2 === 0 ? 1 : -1,
        seed: i * 0.37,
        speed: 1.45 + (i % 4) * 0.35,
      })),
    []
  );

  useFrame((state) => {
    if (!groupRef.current) return;
    const intensity = intensityRef.current;
    groupRef.current.visible = intensity > 0.04;
    if (!groupRef.current.visible) return;

    const t = state.clock.elapsedTime;
    groupRef.current.children.forEach((child, i) => {
      const p = particles[i];
      const age = (t * p.speed + p.seed) % 1.05;
      const prog = age / 1.05;
      child.position.set(
        -0.9 - prog * 2.5,
        0.12 + prog * 0.68,
        p.side * 0.44 + Math.sin(age * 11 + p.seed) * 0.1
      );
      const s = (0.24 + prog * 1.15) * (0.65 + intensity * 0.55);
      child.scale.set(s, s, s);
      const mesh = child as THREE.Mesh;
      if (mesh.material instanceof THREE.MeshStandardMaterial) {
        mesh.material.opacity = Math.max(0, (1 - prog) * 0.5 * intensity);
      }
    });
  });

  return (
    <group ref={groupRef} visible={false}>
      {particles.map((_, i) => (
        <mesh key={i}>
          <sphereGeometry args={[0.25, 7, 7]} />
          <meshStandardMaterial color="#e2e8f0" transparent opacity={0.4} roughness={1} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
};

/**
 * Shared Zero-GC InstancedMesh pool rendering asphalt tyre skid marks and titanium plank sparks.
 */
export const TrackEffectsPool = ({
  positionsRef,
  isSpinning,
  startPhase,
  isCelebrating = false,
}: {
  positionsRef: React.MutableRefObject<LiveRacerTelemetry[]>;
  isSpinning: boolean;
  startPhase: string;
  isCelebrating?: boolean;
}) => {
  const SKID_COUNT = 540;
  const SPARK_COUNT = 160;

  const skidMeshRef = useRef<THREE.InstancedMesh>(null);
  const sparkMeshRef = useRef<THREE.InstancedMesh>(null);

  const skidGeom = useMemo(() => {
    const g = new THREE.PlaneGeometry(1, 1);
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);

  useEffect(() => {
    return () => {
      skidGeom.dispose();
    };
  }, [skidGeom]);

  const skidCursorRef = useRef(0);
  const lastSkidTimeRef = useRef(0);

  // Pre-allocated spark particle state arrays (Zero-GC)
  const sparkDataRef = useRef({
    active: new Uint8Array(SPARK_COUNT),
    age: new Float32Array(SPARK_COUNT),
    life: new Float32Array(SPARK_COUNT),
    px: new Float32Array(SPARK_COUNT),
    py: new Float32Array(SPARK_COUNT),
    pz: new Float32Array(SPARK_COUNT),
    vx: new Float32Array(SPARK_COUNT),
    vy: new Float32Array(SPARK_COUNT),
    vz: new Float32Array(SPARK_COUNT),
    yaw: new Float32Array(SPARK_COUNT),
    cursor: 0,
  });

  // Clear pools only when returning to idle (keep marks during post-race celebration)
  useEffect(() => {
    if (!isSpinning && !isCelebrating) {
      if (skidMeshRef.current) {
        _fxDummy.scale.set(0, 0, 0);
        _fxDummy.updateMatrix();
        for (let i = 0; i < SKID_COUNT; i++) {
          skidMeshRef.current.setMatrixAt(i, _fxDummy.matrix);
        }
        skidMeshRef.current.instanceMatrix.needsUpdate = true;
      }
      skidCursorRef.current = 0;
    }
  }, [isSpinning, isCelebrating]);

  useFrame((state, delta) => {
    const dt = Math.min(0.05, delta);
    const elapsed = state.clock.elapsedTime;
    const cars = positionsRef.current;

    // 1. Stamp asphalt skid marks on hard braking, launch wheelspin, kerb slip, or celebratory donuts
    if (skidMeshRef.current && cars && cars.length > 0 && ((isSpinning && startPhase === 'racing') || isCelebrating)) {
      if (elapsed - lastSkidTimeRef.current >= 0.04) {
        lastSkidTimeRef.current = elapsed;
        let updatedSkids = false;

        for (let c = 0; c < cars.length; c++) {
          const tel = cars[c];
          if (!tel) continue;
          const shouldMark = (tel.brakeIntensity > 0.65 && tel.displayKmh > 95) || tel.tireSmoke > 0.45;
          if (!shouldMark) continue;

          const cosA = Math.cos(tel.angle);
          const sinA = Math.sin(tel.angle);
          // Rear axle lies ~1.05m behind car center, wheels ±0.70m laterally at 1.45x scale
          const rearX = tel.x - cosA * 1.05;
          const rearZ = tel.z + sinA * 1.05;
          const sideX = sinA;
          const sideZ = cosA;

          for (let side = -1; side <= 1; side += 2) {
            const idx = skidCursorRef.current;
            skidCursorRef.current = (idx + 1) % SKID_COUNT;
            _fxDummy.position.set(rearX + sideX * side * 0.7, tel.y + 0.022, rearZ + sideZ * side * 0.7);
            _fxDummy.rotation.set(0, tel.angle, tel.pitchAngle || 0);
            _fxDummy.scale.set(1.15, 1, 0.24);
            _fxDummy.updateMatrix();
            skidMeshRef.current.setMatrixAt(idx, _fxDummy.matrix);
            updatedSkids = true;
          }
        }

        if (updatedSkids) {
          skidMeshRef.current.instanceMatrix.needsUpdate = true;
        }
      }
    }

    // 2. Emit & advance titanium plank sparks under kerbs & high-speed compressions
    if (sparkMeshRef.current) {
      const sd = sparkDataRef.current;
      if (cars && cars.length > 0 && isSpinning && startPhase === 'racing') {
        for (let c = 0; c < cars.length; c++) {
          const tel = cars[c];
          if (!tel || tel.sparks < 0.28) continue;
          // Emit 1-2 sparks per active car per frame deterministically
          const emitCount = tel.sparks > 0.65 ? 2 : 1;
          for (let e = 0; e < emitCount; e++) {
            if (((c + e + Math.floor(elapsed * 60)) % 3) !== 0 && tel.sparks < 0.6) continue;
            const idx = sd.cursor;
            sd.cursor = (idx + 1) % SPARK_COUNT;
            const cosA = Math.cos(tel.angle);
            const sinA = Math.sin(tel.angle);
            const jitterSide = (((idx * 37) % 100) / 100 - 0.5) * 0.62;
            const jitterUp = (((idx * 73) % 100) / 100) * 1.6 + 0.8;

            sd.active[idx] = 1;
            sd.age[idx] = 0;
            sd.life[idx] = 0.18 + (((idx * 19) % 100) / 100) * 0.14;
            sd.px[idx] = tel.x - cosA * 1.3 + sinA * jitterSide;
            sd.py[idx] = tel.y + 0.14;
            sd.pz[idx] = tel.z + sinA * 1.3 + cosA * jitterSide;
            // Sparks shoot backward relative to car heading with upward bounce
            const ejectSpeed = Math.max(12, tel.speed * 0.45);
            sd.vx[idx] = -cosA * ejectSpeed + sinA * jitterSide * 4;
            sd.vy[idx] = jitterUp;
            sd.vz[idx] = sinA * ejectSpeed + cosA * jitterSide * 4;
            sd.yaw[idx] = tel.angle;
          }
        }
      }

      let anySparkVisible = false;
      for (let i = 0; i < SPARK_COUNT; i++) {
        if (sd.active[i]) {
          sd.age[i] += dt;
          if (sd.age[i] >= sd.life[i]) {
            sd.active[i] = 0;
            _fxDummy.scale.set(0, 0, 0);
            _fxDummy.updateMatrix();
            sparkMeshRef.current.setMatrixAt(i, _fxDummy.matrix);
          } else {
            anySparkVisible = true;
            sd.vy[i] -= 11.5 * dt;
            sd.px[i] += sd.vx[i] * dt;
            sd.py[i] = sd.py[i] + sd.vy[i] * dt;
            sd.pz[i] += sd.vz[i] * dt;

            const lifeFrac = 1 - sd.age[i] / sd.life[i];
            _fxDummy.position.set(sd.px[i], sd.py[i], sd.pz[i]);
            _fxDummy.rotation.set(0, sd.yaw[i], 0);
            _fxDummy.scale.set(0.6 + lifeFrac * 0.9, 0.7 * lifeFrac, 0.7 * lifeFrac);
            _fxDummy.updateMatrix();
            sparkMeshRef.current.setMatrixAt(i, _fxDummy.matrix);

            _fxColor.setRGB(1.0, 0.55 + lifeFrac * 0.4, 0.12 * lifeFrac);
            sparkMeshRef.current.setColorAt(i, _fxColor);
          }
        } else {
          _fxDummy.scale.set(0, 0, 0);
          _fxDummy.updateMatrix();
          sparkMeshRef.current.setMatrixAt(i, _fxDummy.matrix);
        }
      }
      sparkMeshRef.current.instanceMatrix.needsUpdate = true;
      if (anySparkVisible && sparkMeshRef.current.instanceColor) {
        sparkMeshRef.current.instanceColor.needsUpdate = true;
      }
    }
  });

  return (
    <group>
      <instancedMesh ref={skidMeshRef} args={[skidGeom, undefined, SKID_COUNT]} frustumCulled={false}>
        <meshBasicMaterial
          color="#090b0f"
          transparent
          opacity={0.42}
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={-1}
        />
      </instancedMesh>
      <instancedMesh ref={sparkMeshRef} args={[undefined, undefined, SPARK_COUNT]} frustumCulled={false}>
        <boxGeometry args={[0.55, 0.032, 0.032]} />
        <meshBasicMaterial color="#fbbf24" transparent opacity={0.92} depthWrite={false} />
      </instancedMesh>
    </group>
  );
};

/**
 * Multi-part procedural Grand Prix Formula car with steerable front wheels, rotating tyres,
 * animated DRS upper rear wing flap, and rear ERS/brake light.
 */
const FormulaCarModel = ({
  color,
  drsFlapRef,
  rainLightRef,
  wheelRefs,
  frontLeftSteerRef,
  frontRightSteerRef,
  shadowTex,
  aeroTrailRef,
}: {
  color: string;
  drsFlapRef: React.RefObject<THREE.Group | null>;
  rainLightRef: React.RefObject<THREE.MeshStandardMaterial | null>;
  wheelRefs: React.MutableRefObject<(THREE.Mesh | null)[]>;
  frontLeftSteerRef: React.RefObject<THREE.Group | null>;
  frontRightSteerRef: React.RefObject<THREE.Group | null>;
  shadowTex: THREE.Texture;
  aeroTrailRef: React.RefObject<THREE.Group | null>;
}) => {
  // Sculpted extruded monocoque chassis silhouette
  const bodyGeom = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-1.15, 0.08);
    shape.lineTo(0.45, 0.08);
    shape.lineTo(1.22, 0.11);
    shape.lineTo(1.25, 0.17);
    shape.lineTo(0.42, 0.34);
    shape.lineTo(-0.08, 0.46); // airbox peak
    shape.lineTo(-0.78, 0.42); // shark fin taper
    shape.lineTo(-1.15, 0.24);
    shape.closePath();

    const geom = new THREE.ExtrudeGeometry(shape, {
      depth: 0.42,
      bevelEnabled: true,
      bevelThickness: 0.04,
      bevelSize: 0.03,
      bevelSegments: 2,
    });
    geom.translate(0, 0, -0.21);
    geom.computeVertexNormals();
    return geom;
  }, []);

  // Halo hoop geometry
  const haloGeom = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.02, 0.4, -0.17),
      new THREE.Vector3(0.24, 0.46, -0.11),
      new THREE.Vector3(0.32, 0.42, 0),
      new THREE.Vector3(0.24, 0.46, 0.11),
      new THREE.Vector3(-0.02, 0.4, 0.17),
    ]);
    return new THREE.TubeGeometry(curve, 16, 0.024, 8, false);
  }, []);

  useEffect(() => {
    return () => {
      bodyGeom.dispose();
      haloGeom.dispose();
    };
  }, [bodyGeom, haloGeom]);

  return (
    <group>
      {/* Ground Contact Shadow */}
      <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3.2, 1.85]} />
        <meshBasicMaterial map={shadowTex} transparent opacity={0.85} depthWrite={false} />
      </mesh>

      {/* Carbon Floor & Diffuser Plank */}
      <mesh position={[0, 0.075, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.25, 0.04, 0.86]} />
        <meshStandardMaterial color="#111827" roughness={0.7} metalness={0.25} />
      </mesh>

      {/* Primary Painted Monocoque & Engine Cover */}
      <mesh geometry={bodyGeom} castShadow receiveShadow>
        <meshPhysicalMaterial
          color={color}
          metalness={0.45}
          roughness={0.22}
          clearcoat={1.0}
          clearcoatRoughness={0.1}
        />
      </mesh>

      {/* Sculpted Sidepods (Left & Right) */}
      {[-0.29, 0.29].map((zPos, i) => (
        <mesh key={i} position={[-0.18, 0.2, zPos]} castShadow receiveShadow>
          <boxGeometry args={[0.92, 0.2, 0.24]} />
          <meshPhysicalMaterial
            color={color}
            metalness={0.45}
            roughness={0.22}
            clearcoat={1.0}
            clearcoatRoughness={0.12}
          />
        </mesh>
      ))}

      {/* Sidepod Cooling Intakes (Dark Carbon) */}
      {[-0.29, 0.29].map((zPos, i) => (
        <mesh key={`in-${i}`} position={[0.29, 0.21, zPos]}>
          <boxGeometry args={[0.04, 0.14, 0.19]} />
          <meshStandardMaterial color="#05070a" roughness={0.85} />
        </mesh>
      ))}

      {/* Cockpit Tub & Driver Helmet */}
      <mesh position={[0.1, 0.36, 0]} castShadow>
        <sphereGeometry args={[0.115, 14, 14]} />
        <meshPhysicalMaterial color="#f8fafc" metalness={0.35} roughness={0.18} clearcoat={1.0} />
      </mesh>
      <mesh position={[0.16, 0.37, 0]}>
        <boxGeometry args={[0.09, 0.06, 0.16]} />
        <meshStandardMaterial color="#090d16" metalness={0.95} roughness={0.08} />
      </mesh>

      {/* Halo Safety Structure */}
      <mesh geometry={haloGeom} castShadow>
        <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.28} />
      </mesh>

      {/* Front Wing Main Plane & Endplates */}
      <mesh position={[1.18, 0.09, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.28, 0.035, 1.06]} />
        <meshStandardMaterial color="#111827" roughness={0.55} metalness={0.35} />
      </mesh>
      <mesh position={[1.16, 0.12, 0]} castShadow>
        <boxGeometry args={[0.2, 0.025, 1.02]} />
        <meshPhysicalMaterial color={color} metalness={0.45} roughness={0.25} clearcoat={0.8} />
      </mesh>
      {[-0.53, 0.53].map((zPos, i) => (
        <mesh key={`fwe-${i}`} position={[1.16, 0.14, zPos]} castShadow>
          <boxGeometry args={[0.3, 0.13, 0.03]} />
          <meshPhysicalMaterial color={color} metalness={0.4} roughness={0.3} clearcoat={0.7} />
        </mesh>
      ))}

      {/* Rear Wing Endplates, Main Plane & Articulated DRS Flap */}
      {[-0.36, 0.36].map((zPos, i) => (
        <mesh key={`rwe-${i}`} position={[-1.08, 0.44, zPos]} castShadow>
          <boxGeometry args={[0.32, 0.42, 0.03]} />
          <meshStandardMaterial color="#0f172a" roughness={0.5} metalness={0.4} />
        </mesh>
      ))}
      <mesh position={[-1.08, 0.52, 0]} castShadow>
        <boxGeometry args={[0.22, 0.03, 0.7]} />
        <meshStandardMaterial color="#111827" roughness={0.5} metalness={0.4} />
      </mesh>
      {/* Articulated DRS Upper Flap (opens horizontally when DRS active) */}
      <group ref={drsFlapRef} position={[-1.12, 0.59, 0]}>
        <mesh position={[0.04, 0.02, 0]} rotation={[0, 0, -0.35]} castShadow>
          <boxGeometry args={[0.16, 0.025, 0.68]} />
          <meshPhysicalMaterial color={color} metalness={0.45} roughness={0.22} clearcoat={0.9} />
        </mesh>
      </group>

      {/* Rear Rain / ERS / Brake LED */}
      <mesh position={[-1.17, 0.19, 0]}>
        <boxGeometry args={[0.04, 0.09, 0.07]} />
        <meshStandardMaterial
          ref={rainLightRef}
          color="#ef4444"
          emissive="#ef4444"
          emissiveIntensity={0.6}
          roughness={0.2}
        />
      </mesh>

      {/* Suspension Arms (Visual grounding between chassis & wheels) */}
      <mesh position={[0.74, 0.18, 0]}>
        <boxGeometry args={[0.07, 0.035, 0.88]} />
        <meshStandardMaterial color="#1e293b" metalness={0.75} roughness={0.35} />
      </mesh>
      <mesh position={[-0.74, 0.2, 0]}>
        <boxGeometry args={[0.08, 0.04, 0.88]} />
        <meshStandardMaterial color="#1e293b" metalness={0.75} roughness={0.35} />
      </mesh>

      {/* Front Left Wheel (Steerable) */}
      <group ref={frontLeftSteerRef} position={[0.74, 0.18, 0.48]}>
        <mesh
          ref={(el) => {
            wheelRefs.current[0] = el;
          }}
          rotation={[Math.PI / 2, 0, 0]}
          castShadow
        >
          <cylinderGeometry args={[0.18, 0.18, 0.19, 20]} />
          <meshStandardMaterial color="#111317" roughness={0.88} metalness={0.08} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.105, 0.105, 0.2, 12]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.85} roughness={0.22} />
        </mesh>
      </group>

      {/* Front Right Wheel (Steerable) */}
      <group ref={frontRightSteerRef} position={[0.74, 0.18, -0.48]}>
        <mesh
          ref={(el) => {
            wheelRefs.current[1] = el;
          }}
          rotation={[Math.PI / 2, 0, 0]}
          castShadow
        >
          <cylinderGeometry args={[0.18, 0.18, 0.19, 20]} />
          <meshStandardMaterial color="#111317" roughness={0.88} metalness={0.08} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.105, 0.105, 0.2, 12]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.85} roughness={0.22} />
        </mesh>
      </group>

      {/* Rear Left Wheel */}
      <group position={[-0.74, 0.2, 0.5]}>
        <mesh
          ref={(el) => {
            wheelRefs.current[2] = el;
          }}
          rotation={[Math.PI / 2, 0, 0]}
          castShadow
        >
          <cylinderGeometry args={[0.2, 0.2, 0.24, 20]} />
          <meshStandardMaterial color="#111317" roughness={0.88} metalness={0.08} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.115, 0.115, 0.25, 12]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.85} roughness={0.22} />
        </mesh>
      </group>

      {/* Rear Right Wheel */}
      <group position={[-0.74, 0.2, -0.5]}>
        <mesh
          ref={(el) => {
            wheelRefs.current[3] = el;
          }}
          rotation={[Math.PI / 2, 0, 0]}
          castShadow
        >
          <cylinderGeometry args={[0.2, 0.2, 0.24, 20]} />
          <meshStandardMaterial color="#111317" roughness={0.88} metalness={0.08} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.115, 0.115, 0.25, 12]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.85} roughness={0.22} />
        </mesh>
      </group>

      {/* Slipstream / DRS Wingtip Aero Streaks */}
      <group ref={aeroTrailRef} visible={false}>
        {[-0.35, 0.35].map((zPos, i) => (
          <mesh key={`trail-${i}`} position={[-2.1, 0.56, zPos]}>
            <boxGeometry args={[1.8, 0.018, 0.035]} />
            <meshBasicMaterial color="#38bdf8" transparent opacity={0.45} depthWrite={false} />
          </mesh>
        ))}
      </group>
    </group>
  );
};

export const GrandPrixRacer = ({
  item,
  color,
  index,
  isSpinning,
  spinDurationSeconds,
  expectedWinnerId,
  onUpdatePosition,
  simProfile,
  isWinner,
  startPhase,
  shadowTex,
  textScale,
}: {
  item: { id: string; text: string };
  color: string;
  index: number;
  isSpinning: boolean;
  spinDurationSeconds: number;
  expectedWinnerId?: string;
  onUpdatePosition: (index: number, telemetry: LiveRacerTelemetry, racerId: string) => void;
  simProfile: SimFrame[] | null;
  isWinner: boolean;
  startPhase: string;
  shadowTex: THREE.Texture;
  textScale: number;
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const chassisTiltRef = useRef<THREE.Group>(null);
  const drsFlapRef = useRef<THREE.Group>(null);
  const rainLightRef = useRef<THREE.MeshStandardMaterial>(null);
  const aeroTrailRef = useRef<THREE.Group>(null);
  const wheelRefs = useRef<(THREE.Mesh | null)[]>([]);
  const frontLeftSteerRef = useRef<THREE.Group>(null);
  const frontRightSteerRef = useRef<THREE.Group>(null);
  const smokeIntensityRef = useRef(0);

  const raceData = useRef({
    startTime: 0,
    celebrateStartTime: 0,
    wheelSpin: 0,
    finalPose: null as LiveRacerTelemetry | null,
  });

  const gridLane = index % 2 === 0 ? -GRID_LANE_MAG : GRID_LANE_MAG;
  const gridStartDist = GRID_FIRST_DIST - index * GRID_STEP_DIST;
  const gridPose = useMemo(
    () => getCircuitPosition(gridStartDist, gridLane * USABLE_HALF_WIDTH),
    [gridStartDist, gridLane]
  );
  const donutCenterPose = useMemo(() => getCircuitPosition(6, 0), []);
  const parcFermePose = useMemo(
    () => getCircuitPosition(44 + index * 5.2, (index % 2 === 0 ? -0.58 : 0.58) * USABLE_HALF_WIDTH),
    [index]
  );

  useFrame((state, delta) => {
    if (!groupRef.current || !chassisTiltRef.current) return;
    const clampedDelta = Math.min(0.05, delta);
    const elapsedClock = state.clock.elapsedTime;

    if (isSpinning) {
      raceData.current.celebrateStartTime = 0;
      if (startPhase === 'racing') {
        if (raceData.current.startTime === 0) {
          raceData.current.startTime = elapsedClock;
        }
        const elapsed = elapsedClock - raceData.current.startTime;

        let dist = gridStartDist;
        let lane = gridLane;
        let speed = 0;
        let displayKmh = 0;
        let gear = 1;
        let rpmRatio = 0.22;
        let steerAngle = 0;
        let yawAngle = 0;
        let longAccel = 0;
        let latAccel = 0;
        let brakeIntensity = 0;
        let drsActive = false;
        let inSlipstream = false;
        let braking = false;
        let onKerb = false;
        let tireSmoke = 0;
        let sparks = 0;
        let battleState: LiveRacerTelemetry['battleState'] = 'CRUISE';

        if (simProfile && simProfile.length > 0) {
          const maxIndex = simProfile.length - 1;
          const simDt = 1 / SIM_FPS;
          const exactIdx = elapsed / simDt;
          const idx = Math.min(Math.floor(exactIdx), maxIndex);
          const frac = Math.max(0, Math.min(1, exactIdx - idx));

          if (idx >= maxIndex) {
            const p = simProfile[maxIndex];
            dist = p.dist;
            lane = p.lane;
            speed = p.speed;
            displayKmh = p.displayKmh;
            gear = p.gear;
            rpmRatio = p.rpmRatio;
            steerAngle = p.steerAngle;
            yawAngle = p.yawAngle;
            longAccel = p.longAccel;
            latAccel = p.latAccel;
            brakeIntensity = p.brakeIntensity;
            drsActive = p.drsActive;
            inSlipstream = p.inSlipstream;
            braking = p.braking;
            onKerb = p.onKerb;
            tireSmoke = p.tireSmoke;
            sparks = p.sparks;
            battleState = p.battleState;
          } else {
            const p1 = simProfile[idx];
            const p2 = simProfile[idx + 1];
            dist = p1.dist + (p2.dist - p1.dist) * frac;
            lane = p1.lane + (p2.lane - p1.lane) * frac;
            speed = p1.speed + (p2.speed - p1.speed) * frac;
            displayKmh = Math.round(p1.displayKmh + (p2.displayKmh - p1.displayKmh) * frac);
            gear = p1.gear;
            rpmRatio = p1.rpmRatio + (p2.rpmRatio - p1.rpmRatio) * frac;
            steerAngle = p1.steerAngle + (p2.steerAngle - p1.steerAngle) * frac;
            yawAngle = p1.yawAngle + (p2.yawAngle - p1.yawAngle) * frac;
            longAccel = p1.longAccel + (p2.longAccel - p1.longAccel) * frac;
            latAccel = p1.latAccel + (p2.latAccel - p1.latAccel) * frac;
            brakeIntensity = p1.brakeIntensity + (p2.brakeIntensity - p1.brakeIntensity) * frac;
            drsActive = p1.drsActive;
            inSlipstream = p1.inSlipstream;
            braking = p1.braking;
            onKerb = p1.onKerb;
            tireSmoke = p1.tireSmoke + (p2.tireSmoke - p1.tireSmoke) * frac;
            sparks = p1.sparks + (p2.sparks - p1.sparks) * frac;
            battleState = p1.battleState;
          }
        }

        const trackPose = getCircuitPosition(dist, lane * USABLE_HALF_WIDTH);
        const worldHeading = trackPose.angle + yawAngle;

        groupRef.current.position.set(trackPose.x, trackPose.y + 0.012, trackPose.z);
        groupRef.current.rotation.set(0, worldHeading, trackPose.pitchAngle);

        // Physically grounded suspension dynamics:
        // +Z rotation lifts nose (rear squat on acceleration); -Z rotation drops nose (dive on braking)
        const targetPitch = Math.max(-0.075, Math.min(0.065, longAccel * 0.062));
        // +X rotation tilts top toward +Z (rightward outward roll in left turns)
        const targetRoll = Math.max(-0.095, Math.min(0.095, latAccel * 0.072));
        // Subtle kerb heave vibration when riding apex or exit kerbs
        const kerbBump = onKerb ? Math.sin(elapsedClock * 58 + index * 2.1) * 0.018 + 0.015 : 0;

        chassisTiltRef.current.rotation.z = THREE.MathUtils.damp(
          chassisTiltRef.current.rotation.z,
          targetPitch,
          11,
          clampedDelta
        );
        chassisTiltRef.current.rotation.x = THREE.MathUtils.damp(
          chassisTiltRef.current.rotation.x,
          targetRoll,
          10,
          clampedDelta
        );
        chassisTiltRef.current.position.y = THREE.MathUtils.damp(
          chassisTiltRef.current.position.y,
          kerbBump,
          18,
          clampedDelta
        );
        // Minor wheelspin shimmy only right off the standing launch
        chassisTiltRef.current.rotation.y =
          elapsed < 1.1 ? Math.sin(elapsed * 26 + index * 2.4) * 0.016 * (1 - elapsed / 1.1) : 0;

        // Wheel angular velocity & front steering angle
        raceData.current.wheelSpin -= (speed / (0.19 * CAR_VISUAL_SCALE)) * clampedDelta;
        for (let w = 0; w < 4; w++) {
          const wm = wheelRefs.current[w];
          if (wm) wm.rotation.y = raceData.current.wheelSpin;
        }
        if (frontLeftSteerRef.current) {
          frontLeftSteerRef.current.rotation.y = THREE.MathUtils.damp(
            frontLeftSteerRef.current.rotation.y,
            steerAngle,
            16,
            clampedDelta
          );
        }
        if (frontRightSteerRef.current) {
          frontRightSteerRef.current.rotation.y = THREE.MathUtils.damp(
            frontRightSteerRef.current.rotation.y,
            steerAngle,
            16,
            clampedDelta
          );
        }

        // DRS flap articulation
        if (drsFlapRef.current) {
          const targetDrsRot = drsActive ? 0.5 : 0;
          drsFlapRef.current.rotation.z = THREE.MathUtils.damp(
            drsFlapRef.current.rotation.z,
            targetDrsRot,
            15,
            clampedDelta
          );
        }

        // Brake / ERS rain light (intense glow on braking, subtle ERS harvest blink when in tow)
        if (rainLightRef.current) {
          const ersBlink = inSlipstream && !braking ? (Math.sin(elapsedClock * 24) > 0 ? 2.2 : 0.35) : 0.45;
          rainLightRef.current.emissiveIntensity = braking
            ? 1.5 + brakeIntensity * 5.2
            : ersBlink;
        }

        // Slipstream / DRS aero ribbons
        if (aeroTrailRef.current) {
          aeroTrailRef.current.visible = drsActive || (inSlipstream && displayKmh > 210);
        }

        smokeIntensityRef.current = tireSmoke;

        const liveTelemetry: LiveRacerTelemetry = {
          id: item.id,
          x: trackPose.x,
          y: trackPose.y,
          z: trackPose.z,
          angle: worldHeading,
          trackAngle: trackPose.angle,
          pitchAngle: trackPose.pitchAngle,
          yawAngle,
          totalDistance: dist,
          lane,
          speed,
          displayKmh,
          gear,
          rpmRatio,
          steerAngle,
          longAccel,
          latAccel,
          brakeIntensity,
          drsActive,
          inSlipstream,
          braking,
          onKerb,
          tireSmoke,
          sparks,
          battleState,
          curvature: trackPose.curvature,
          signedCurvature: trackPose.signedCurvature,
          drsZone: trackPose.drsZone,
          sector: trackPose.sector,
        };
        raceData.current.finalPose = liveTelemetry;
        onUpdatePosition(index, liveTelemetry, item.id);
      } else {
        // Pre-start grid lineup
        raceData.current.startTime = 0;
        groupRef.current.position.set(gridPose.x, gridPose.y + 0.012, gridPose.z);
        groupRef.current.rotation.set(0, gridPose.angle, gridPose.pitchAngle);
        chassisTiltRef.current.rotation.set(0, 0, 0);
        chassisTiltRef.current.position.y = 0;
        if (drsFlapRef.current) drsFlapRef.current.rotation.z = 0;
        if (aeroTrailRef.current) aeroTrailRef.current.visible = false;
        smokeIntensityRef.current = startPhase === 'lights_hold' ? 0.18 : 0;

        const gridTelemetry: LiveRacerTelemetry = {
          id: item.id,
          x: gridPose.x,
          y: gridPose.y,
          z: gridPose.z,
          angle: gridPose.angle,
          trackAngle: gridPose.angle,
          pitchAngle: gridPose.pitchAngle,
          yawAngle: 0,
          totalDistance: gridStartDist,
          lane: gridLane,
          speed: 0,
          displayKmh: 0,
          gear: 1,
          rpmRatio: startPhase === 'lights_hold' ? 0.85 : 0.25,
          steerAngle: 0,
          longAccel: 0,
          latAccel: 0,
          brakeIntensity: 0,
          drsActive: false,
          inSlipstream: false,
          braking: false,
          onKerb: false,
          tireSmoke: 0,
          sparks: 0,
          battleState: 'CRUISE',
          curvature: 0,
          signedCurvature: 0,
          drsZone: 1,
          sector: 1,
        };
        onUpdatePosition(index, gridTelemetry, item.id);
      }
    } else {
      raceData.current.startTime = 0;
      const useFinish = (expectedWinnerId || isWinner) && raceData.current.finalPose;
      const pose = useFinish ? raceData.current.finalPose! : null;

      if (pose) {
        if (raceData.current.celebrateStartTime === 0) {
          raceData.current.celebrateStartTime = elapsedClock;
        }
        const celebElapsed = elapsedClock - raceData.current.celebrateStartTime;

        if (isWinner) {
          // Real circular donuts on the open Main Straight with oversteer drift angle & counter-steer
          const radius = 4.4;
          const phi = celebElapsed * 2.65;
          const targetX = donutCenterPose.x + radius * Math.cos(phi);
          const targetZ = donutCenterPose.z - radius * Math.sin(phi);
          const targetY = donutCenterPose.y + 0.012 + Math.sin(donutCenterPose.pitchAngle) * (radius * Math.cos(phi));
          const targetAngle = phi + Math.PI / 2 + 0.56;

          const blendRate = celebElapsed < 1.2 ? 3.8 : 11.5;
          groupRef.current.position.x = THREE.MathUtils.damp(
            groupRef.current.position.x,
            targetX,
            blendRate,
            clampedDelta
          );
          groupRef.current.position.y = THREE.MathUtils.damp(
            groupRef.current.position.y,
            targetY,
            blendRate,
            clampedDelta
          );
          groupRef.current.position.z = THREE.MathUtils.damp(
            groupRef.current.position.z,
            targetZ,
            blendRate,
            clampedDelta
          );

          let angleDiff = targetAngle - groupRef.current.rotation.y;
          while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
          while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
          groupRef.current.rotation.y += angleDiff * Math.min(1, clampedDelta * (celebElapsed < 1.2 ? 5 : 14));
          groupRef.current.rotation.z = donutCenterPose.pitchAngle * Math.cos(groupRef.current.rotation.y);

          chassisTiltRef.current.rotation.y = 0;
          chassisTiltRef.current.rotation.x = THREE.MathUtils.damp(
            chassisTiltRef.current.rotation.x,
            0.088,
            8,
            clampedDelta
          );
          chassisTiltRef.current.rotation.z = THREE.MathUtils.damp(
            chassisTiltRef.current.rotation.z,
            0.048,
            8,
            clampedDelta
          );
          chassisTiltRef.current.position.y = 0;

          // Counter-steer front wheels & spin rear tyres rapidly
          raceData.current.wheelSpin -= 28 * clampedDelta;
          for (let w = 0; w < 4; w++) {
            const wm = wheelRefs.current[w];
            if (wm) wm.rotation.y = raceData.current.wheelSpin;
          }
          if (frontLeftSteerRef.current) {
            frontLeftSteerRef.current.rotation.y = THREE.MathUtils.damp(
              frontLeftSteerRef.current.rotation.y,
              -0.42,
              10,
              clampedDelta
            );
          }
          if (frontRightSteerRef.current) {
            frontRightSteerRef.current.rotation.y = THREE.MathUtils.damp(
              frontRightSteerRef.current.rotation.y,
              -0.42,
              10,
              clampedDelta
            );
          }
          if (rainLightRef.current) {
            rainLightRef.current.emissiveIntensity = Math.sin(elapsedClock * 18) > 0 ? 3.2 : 0.6;
          }

          smokeIntensityRef.current = celebElapsed > 0.35 ? 0.94 : celebElapsed * 2.4;

          onUpdatePosition(index, {
            ...pose,
            x: groupRef.current.position.x,
            y: groupRef.current.position.y,
            z: groupRef.current.position.z,
            angle: groupRef.current.rotation.y,
            tireSmoke: celebElapsed > 0.45 ? 0.96 : 0,
            brakeIntensity: 0,
            displayKmh: 94,
          }, item.id);
        } else {
          // Non-winners smoothly pull off into staggered parc ferme formation past the finish line
          groupRef.current.position.x = THREE.MathUtils.damp(
            groupRef.current.position.x,
            parcFermePose.x,
            2.4,
            clampedDelta
          );
          groupRef.current.position.y = THREE.MathUtils.damp(
            groupRef.current.position.y,
            parcFermePose.y + 0.012,
            2.4,
            clampedDelta
          );
          groupRef.current.position.z = THREE.MathUtils.damp(
            groupRef.current.position.z,
            parcFermePose.z,
            2.4,
            clampedDelta
          );
          let parkDiff = parcFermePose.angle - groupRef.current.rotation.y;
          while (parkDiff > Math.PI) parkDiff -= Math.PI * 2;
          while (parkDiff < -Math.PI) parkDiff += Math.PI * 2;
          groupRef.current.rotation.y += parkDiff * Math.min(1, clampedDelta * 3.5);
          groupRef.current.rotation.z = parcFermePose.pitchAngle;

          chassisTiltRef.current.rotation.set(0, 0, 0);
          chassisTiltRef.current.position.y = 0;
          if (frontLeftSteerRef.current) {
            frontLeftSteerRef.current.rotation.y = THREE.MathUtils.damp(
              frontLeftSteerRef.current.rotation.y,
              0,
              8,
              clampedDelta
            );
          }
          if (frontRightSteerRef.current) {
            frontRightSteerRef.current.rotation.y = THREE.MathUtils.damp(
              frontRightSteerRef.current.rotation.y,
              0,
              8,
              clampedDelta
            );
          }
          if (rainLightRef.current) {
            rainLightRef.current.emissiveIntensity = celebElapsed < 1.4 ? 2.4 : 0.4;
          }
          smokeIntensityRef.current = 0;
        }
      } else {
        raceData.current.celebrateStartTime = 0;
        groupRef.current.position.set(gridPose.x, gridPose.y + 0.012, gridPose.z);
        groupRef.current.rotation.set(0, gridPose.angle, gridPose.pitchAngle);
        chassisTiltRef.current.rotation.set(0, 0, 0);
        chassisTiltRef.current.position.y = 0;
        smokeIntensityRef.current = 0;
      }

      if (aeroTrailRef.current) aeroTrailRef.current.visible = false;
    }
    void spinDurationSeconds;
  });

  const labelFontSize = Math.max(0.45, Math.min(0.88, 0.64 * textScale));

  return (
    <group ref={groupRef} position={[gridPose.x, gridPose.y + 0.012, gridPose.z]}>
      <group ref={chassisTiltRef} scale={[CAR_VISUAL_SCALE, CAR_VISUAL_SCALE, CAR_VISUAL_SCALE]}>
        <FormulaCarModel
          color={color}
          drsFlapRef={drsFlapRef}
          rainLightRef={rainLightRef}
          wheelRefs={wheelRefs}
          frontLeftSteerRef={frontLeftSteerRef}
          frontRightSteerRef={frontRightSteerRef}
          shadowTex={shadowTex}
          aeroTrailRef={aeroTrailRef}
        />
        <TyreSmoke intensityRef={smokeIntensityRef} />
      </group>

      <Billboard position={[0, 1.82, 0]}>
        <Text
          fontSize={labelFontSize}
          color="#f8fafc"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.075}
          outlineColor="#020617"
          fontWeight={700}
        >
          {item.text}
        </Text>
      </Billboard>
    </group>
  );
};

export const CircuitScenery = ({
  totalRacers,
  lightsCount,
  isLightsOut,
}: {
  totalRacers: number;
  lightsCount: number;
  isLightsOut: boolean;
}) => {
  const { gl } = useThree();
  const maxAniso = useMemo(() => gl.capabilities.getMaxAnisotropy(), [gl]);

  const textures = useMemo(() => {
    return {
      asphalt: createAsphaltTexture(maxAniso),
      pitAsphalt: createPitAsphaltTexture(maxAniso),
      kerb: createKerbTexture(maxAniso),
      turf: createTurfTexture(maxAniso),
      checkered: createCheckeredTexture(maxAniso),
    };
  }, [maxAniso]);

  const geometries = useMemo(() => {
    const terrain = createTerrainGeometry();
    const asphalt = createCircuitRibbonGeometry(-TRACK_HALF_WIDTH, TRACK_HALF_WIDTH, 0, 20);
    const pitLane = createPitLaneRibbonGeometry(4.0, 0.015);

    const outerKerb = createCircuitRibbonGeometry(TRACK_HALF_WIDTH, TRACK_HALF_WIDTH + 1.35, 0.014, 7.5);
    const innerKerb = createCircuitRibbonGeometry(-TRACK_HALF_WIDTH - 1.35, -TRACK_HALF_WIDTH, 0.014, 7.5);

    // DRS Zone strips along inside edges of Reta dos Boxes (Zone 1) & Reta Oposta (Zone 2)
    const drsStrip1a = createCircuitRibbonGeometry(-TRACK_HALF_WIDTH + 0.45, -TRACK_HALF_WIDTH + 1.05, 0.02, 12, DRS_ZONE_1_START, 1.0);
    const drsStrip1b = createCircuitRibbonGeometry(-TRACK_HALF_WIDTH + 0.45, -TRACK_HALF_WIDTH + 1.05, 0.02, 12, 0.0, DRS_ZONE_1_END);
    const drsStrip2 = createCircuitRibbonGeometry(-TRACK_HALF_WIDTH + 0.45, -TRACK_HALF_WIDTH + 1.05, 0.02, 12, DRS_ZONE_2_START, DRS_ZONE_2_END);

    // Painted green/blue Interlagos asphalt runoff aprons on iconic corners
    const runoffSenna = createCircuitRibbonGeometry(TRACK_HALF_WIDTH + 1.35, TRACK_HALF_WIDTH + 7.5, -0.025, 16, 0.055, 0.145);
    const runoffSol = createCircuitRibbonGeometry(TRACK_HALF_WIDTH + 1.35, TRACK_HALF_WIDTH + 6.5, -0.025, 16, 0.165, 0.235);
    const runoffLago = createCircuitRibbonGeometry(TRACK_HALF_WIDTH + 1.35, TRACK_HALF_WIDTH + 7.5, -0.025, 16, 0.39, 0.48);
    const runoffJuncao = createCircuitRibbonGeometry(TRACK_HALF_WIDTH + 1.35, TRACK_HALF_WIDTH + 6.8, -0.025, 16, 0.825, 0.905);

    // Gravel runoff beds behind major braking traps (T1 Senna, T4 Descida do Lago, T11 Bico de Pato)
    const gravelSenna = createCircuitRibbonGeometry(TRACK_HALF_WIDTH + 7.5, TRACK_HALF_WIDTH + 13.5, -0.045, 14, 0.065, 0.135);
    const gravelLago = createCircuitRibbonGeometry(TRACK_HALF_WIDTH + 7.5, TRACK_HALF_WIDTH + 13.5, -0.045, 14, 0.40, 0.475);
    const gravelBico = createCircuitRibbonGeometry(-TRACK_HALF_WIDTH - 6.5, -TRACK_HALF_WIDTH - 1.35, -0.045, 14, 0.725, 0.785);

    // Continuous 3D safety barriers (skipping Pit Entry & Pit Exit on inner side)
    const outerBarrier = createCircuitBarrierGeometry(TRACK_HALF_WIDTH + 11.2, 1.3, 0.7, -0.2);
    const innerBarrier = createCircuitBarrierGeometry(-TRACK_HALF_WIDTH - 3.8, 1.05, 0.6, -0.2, 0.135, 0.905);

    return {
      terrain,
      asphalt,
      pitLane,
      outerKerb,
      innerKerb,
      drsStrip1a,
      drsStrip1b,
      drsStrip2,
      runoffSenna,
      runoffSol,
      runoffLago,
      runoffJuncao,
      gravelSenna,
      gravelLago,
      gravelBico,
      outerBarrier,
      innerBarrier,
    };
  }, []);

  useEffect(() => {
    return () => {
      Object.values(textures).forEach((t) => t.dispose());
      Object.values(geometries).forEach((g) => g.dispose());
    };
  }, [textures, geometries]);

  const startPose = useMemo(() => getCircuitPosition(0, 0), []);

  // Key Interlagos landmark poses derived directly from the 3D spline
  const landmarks = useMemo(() => {
    const totalS = CIRCUIT_SAMPLES[TRACK_SAMPLES - 1].s;
    const drs1 = getCircuitPosition((DRS_ZONE_1_START + 0.015) * totalS, -TRACK_HALF_WIDTH - 2.2);
    const drs2 = getCircuitPosition((DRS_ZONE_2_START + 0.015) * totalS, -TRACK_HALF_WIDTH - 2.2);

    // Reta Oposta Grandstand (Setor G) parallel to back straight
    const retaOpostaMid = getCircuitPosition(0.325 * totalS, TRACK_HALF_WIDTH + 19);
    // Pedestrian/Sponsor Bridge spanning Reta Oposta ahead of Setor G
    const bridgeOposta = getCircuitPosition(0.265 * totalS, 0);
    // S do Senna Grandstand overlooking T1-T2
    const sennaStand = getCircuitPosition(0.095 * totalS, TRACK_HALF_WIDTH + 22);

    // Braking distance boards (150m, 100m, 50m) before S do Senna and Descida do Lago
    const brakeBoards = [
      getCircuitPosition(0.042 * totalS, TRACK_HALF_WIDTH + 2.0),
      getCircuitPosition(0.056 * totalS, TRACK_HALF_WIDTH + 2.0),
      getCircuitPosition(0.070 * totalS, TRACK_HALF_WIDTH + 2.0),
      getCircuitPosition(0.365 * totalS, TRACK_HALF_WIDTH + 2.0),
      getCircuitPosition(0.382 * totalS, TRACK_HALF_WIDTH + 2.0),
      getCircuitPosition(0.398 * totalS, TRACK_HALF_WIDTH + 2.0),
    ];

    return { drs1, drs2, retaOpostaMid, bridgeOposta, sennaStand, brakeBoards };
  }, []);

  // Instanced Atlantic Forest trees grounded via terrainHeightAt(x, z)
  const treeCount = 240;
  const trunkMeshRef = useRef<THREE.InstancedMesh>(null);
  const crownMeshRef = useRef<THREE.InstancedMesh>(null);

  useEffect(() => {
    if (!trunkMeshRef.current || !crownMeshRef.current) return;
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    let placed = 0;

    for (let i = 0; i < 1200 && placed < treeCount; i++) {
      const r1 = Math.sin(i * 12.9898) * 43758.5453;
      const rand1 = r1 - Math.floor(r1);
      const r2 = Math.sin(i * 78.233) * 43758.5453;
      const rand2 = r2 - Math.floor(r2);
      const r3 = Math.sin(i * 39.346) * 43758.5453;
      const rand3 = r3 - Math.floor(r3);

      const x = (rand1 - 0.5) * 620;
      const z = (rand2 - 0.5) * 520;

      // Clear of main track corridor (> 28m)
      let minTrackDistSq = Infinity;
      for (let s = 0; s < TRACK_SAMPLES; s += 5) {
        const samp = CIRCUIT_SAMPLES[s];
        const dx = x - samp.x;
        const dz = z - samp.z;
        const dSq = dx * dx + dz * dz;
        if (dSq < minTrackDistSq) minTrackDistSq = dSq;
      }
      if (minTrackDistSq < 28 * 28) continue;

      // Clear of Pit Complex, Main Grandstand & Lago de Interlagos
      if (x > -90 && x < 148 && z > 104 && z < 200) continue;
      const ldx = (x - LAKE_CENTER.x) / (LAKE_CENTER.radiusX + 5);
      const ldz = (z - LAKE_CENTER.z) / (LAKE_CENTER.radiusZ + 5);
      if (ldx * ldx + ldz * ldz < 1.0) continue;

      const groundY = terrainHeightAt(x, z);
      const scale = 0.85 + rand3 * 0.75;

      dummy.position.set(x, groundY + 1.3 * scale - 0.2, z);
      dummy.scale.set(scale, scale, scale);
      dummy.rotation.y = rand1 * Math.PI * 2;
      dummy.updateMatrix();
      trunkMeshRef.current.setMatrixAt(placed, dummy.matrix);

      dummy.position.set(x, groundY + 4.1 * scale - 0.2, z);
      dummy.scale.set(scale * 1.1, scale * (0.95 + rand2 * 0.3), scale * 1.1);
      dummy.updateMatrix();
      crownMeshRef.current.setMatrixAt(placed, dummy.matrix);

      color.setHSL(0.32 + (rand3 - 0.5) * 0.06, 0.52, 0.24 + rand1 * 0.1);
      crownMeshRef.current.setColorAt(placed, color);
      placed++;
    }

    trunkMeshRef.current.count = placed;
    crownMeshRef.current.count = placed;
    trunkMeshRef.current.instanceMatrix.needsUpdate = true;
    crownMeshRef.current.instanceMatrix.needsUpdate = true;
    if (crownMeshRef.current.instanceColor) crownMeshRef.current.instanceColor.needsUpdate = true;
    trunkMeshRef.current.computeBoundingSphere();
    crownMeshRef.current.computeBoundingSphere();
  }, []);

  const garageDoorOffsets = useMemo(() => [-50, -30, -10, 10, 30, 50], []);

  return (
    <group>
      {/* Sculpted 3D Interlagos Terrain */}
      <mesh geometry={geometries.terrain} receiveShadow>
        <meshStandardMaterial
          map={textures.turf}
          vertexColors
          roughness={0.94}
          metalness={0.0}
        />
      </mesh>

      {/* Lago de Interlagos (Infield Lake beside Descida do Lago) */}
      <mesh
        position={[LAKE_CENTER.x, LAKE_CENTER.y, LAKE_CENTER.z]}
        rotation={[-Math.PI / 2, 0, -0.12]}
        scale={[1.08, 0.74, 1]}
        receiveShadow
      >
        <circleGeometry args={[32, 36]} />
        <meshStandardMaterial
          color="#0e7490"
          roughness={0.14}
          metalness={0.55}
          envMapIntensity={1.2}
        />
      </mesh>

      {/* Main Circuit Asphalt Ribbon */}
      <mesh geometry={geometries.asphalt} receiveShadow>
        <meshStandardMaterial map={textures.asphalt} roughness={0.78} metalness={0.05} />
      </mesh>

      {/* Dedicated Pit Lane Asphalt */}
      <mesh geometry={geometries.pitLane} receiveShadow>
        <meshStandardMaterial map={textures.pitAsphalt} roughness={0.82} metalness={0.04} />
      </mesh>

      {/* Interlagos Brazilian Green / Yellow / White Kerbs */}
      <mesh geometry={geometries.outerKerb} receiveShadow>
        <meshStandardMaterial
          map={textures.kerb}
          roughness={0.7}
          polygonOffset
          polygonOffsetFactor={-1}
          polygonOffsetUnits={-1}
        />
      </mesh>
      <mesh geometry={geometries.innerKerb} receiveShadow>
        <meshStandardMaterial
          map={textures.kerb}
          roughness={0.7}
          polygonOffset
          polygonOffsetFactor={-1}
          polygonOffsetUnits={-1}
        />
      </mesh>

      {/* Painted Interlagos Asphalt Runoff Zones */}
      {[
        geometries.runoffSenna,
        geometries.runoffSol,
        geometries.runoffLago,
        geometries.runoffJuncao,
      ].map((g, idx) => (
        <mesh key={`runoff-${idx}`} geometry={g} receiveShadow>
          <meshStandardMaterial color={idx % 2 === 0 ? '#166534' : '#0369a1'} roughness={0.85} />
        </mesh>
      ))}

      {/* DRS Zone Emerald Edge Strips */}
      {[geometries.drsStrip1a, geometries.drsStrip1b, geometries.drsStrip2].map((g, i) => (
        <mesh key={`drs-${i}`} geometry={g}>
          <meshStandardMaterial
            color="#10b981"
            emissive="#10b981"
            emissiveIntensity={0.4}
            roughness={0.5}
            polygonOffset
            polygonOffsetFactor={-2}
          />
        </mesh>
      ))}

      {/* Gravel Runoff Traps */}
      {[geometries.gravelSenna, geometries.gravelLago, geometries.gravelBico].map((g, i) => (
        <mesh key={`gravel-${i}`} geometry={g} receiveShadow>
          <meshStandardMaterial color="#b4ab9c" roughness={0.98} />
        </mesh>
      ))}

      {/* Continuous 3D Safety Barriers */}
      <mesh geometry={geometries.outerBarrier} castShadow receiveShadow>
        <meshStandardMaterial color="#cbd5e1" roughness={0.55} metalness={0.35} />
      </mesh>
      <mesh geometry={geometries.innerBarrier} castShadow receiveShadow>
        <meshStandardMaterial color="#94a3b8" roughness={0.6} metalness={0.25} />
      </mesh>

      {/* Checkered Start/Finish Line aligned flush with uphill Subida dos Boxes gradient */}
      <group
        position={[startPose.x, startPose.y + 0.025, startPose.z]}
        rotation={[0, startPose.angle, startPose.pitchAngle]}
      >
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[3.6, TRACK_WIDTH - 0.6]} />
          <meshStandardMaterial
            map={textures.checkered}
            roughness={0.72}
            polygonOffset
            polygonOffsetFactor={-2}
          />
        </mesh>
      </group>

      {/* Start Light Gantry & Sloped Grid Markings */}
      <StartLightGantry lightsCount={lightsCount} isLightsOut={isLightsOut} />
      <StartingGridMarkings total={totalRacers} />

      {/* Setor A: Main Straight Covered Grandstand (Arquibancada Principal along Subida dos Boxes) */}
      <group position={[18, 13.0, 186]} rotation={[0, 0, 0.052]}>
        {/* Concrete Base Plinth extending deep into hillside */}
        <mesh position={[0, -2.5, 0]} castShadow receiveShadow>
          <boxGeometry args={[128, 9.0, 16]} />
          <meshStandardMaterial color="#334155" roughness={0.88} />
        </mesh>
        {/* Multi-row Spectator Seating Tiers facing Track (-Z) */}
        <mesh position={[0, 3.0, -3.5]} rotation={[-0.36, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[124, 1.2, 11]} />
          <meshStandardMaterial color="#15803d" roughness={0.78} />
        </mesh>
        <mesh position={[0, 4.4, 1.5]} rotation={[-0.36, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[124, 1.2, 7.5]} />
          <meshStandardMaterial color="#eab308" roughness={0.78} />
        </mesh>
        {/* Cantilever Steel Roof Pillars */}
        {[-54, -27, 0, 27, 54].map((px, i) => (
          <mesh key={`gs-col-${i}`} position={[px, 6.4, 6.2]} castShadow>
            <boxGeometry args={[0.9, 9.4, 1.1]} />
            <meshStandardMaterial color="#e2e8f0" metalness={0.65} roughness={0.35} />
          </mesh>
        ))}
        {/* Iconic Angled White & Green Canopy Roof */}
        <mesh position={[0, 11.2, -1.2]} rotation={[0.08, 0, 0]} castShadow>
          <boxGeometry args={[132, 0.75, 19]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.45} metalness={0.25} />
        </mesh>
        <mesh position={[0, 11.15, -10.4]} rotation={[0.08, 0, 0]}>
          <boxGeometry args={[132, 0.85, 0.65]} />
          <meshStandardMaterial color="#16a34a" roughness={0.4} />
        </mesh>
      </group>

      {/* Prédio dos Boxes (Interlagos Pit Building & Paddock Complex) */}
      <group position={[10, 12.6, 113]} rotation={[0, 0, 0.052]}>
        {/* Foundation Plinth */}
        <mesh position={[0, -2.5, 0]} receiveShadow>
          <boxGeometry args={[134, 5.2, 10]} />
          <meshStandardMaterial color="#475569" roughness={0.9} />
        </mesh>
        {/* Ground Floor Team Garages */}
        <mesh position={[0, 2.4, 0]} castShadow receiveShadow>
          <boxGeometry args={[130, 4.8, 9.2]} />
          <meshStandardMaterial color="#1e293b" roughness={0.65} metalness={0.25} />
        </mesh>
        {/* Individual Garage Doors facing Pit Lane (+Z) */}
        {garageDoorOffsets.map((gx, idx) => (
          <mesh key={`gdoor-${idx}`} position={[gx, 1.85, 4.65]}>
            <boxGeometry args={[14, 3.2, 0.22]} />
            <meshStandardMaterial color="#0f172a" roughness={0.5} metalness={0.45} />
          </mesh>
        ))}
        {/* Second-Floor Hospitality Glass Lounge */}
        <mesh position={[0, 6.2, 0.3]} castShadow>
          <boxGeometry args={[126, 2.8, 8.6]} />
          <meshPhysicalMaterial
            color="#0c4a6e"
            metalness={0.85}
            roughness={0.12}
            clearcoat={0.9}
          />
        </mesh>
        {/* Pit Complex Overhanging Roof & Brazilian GP Header Fascia */}
        <mesh position={[0, 8.1, 0.8]} castShadow>
          <boxGeometry args={[132, 0.65, 12.5]} />
          <meshStandardMaterial color="#f1f5f9" roughness={0.4} metalness={0.3} />
        </mesh>
        <mesh position={[0, 8.15, 6.9]}>
          <boxGeometry args={[132, 0.8, 0.4]} />
          <meshStandardMaterial color="#15803d" roughness={0.4} />
        </mesh>
        <mesh position={[0, 7.65, 6.9]}>
          <boxGeometry args={[132, 0.25, 0.42]} />
          <meshStandardMaterial color="#facc15" roughness={0.35} />
        </mesh>
      </group>

      {/* Torre de Controle de Interlagos (Race Control Timing Tower near Pit Exit) */}
      <group position={[88, 15.2, 113]}>
        {/* Structural Pedestal & Shaft */}
        <mesh position={[0, 8.5, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[2.3, 2.8, 19, 12]} />
          <meshStandardMaterial color="#e2e8f0" roughness={0.55} metalness={0.2} />
        </mesh>
        {/* Observation Deck Tiers */}
        <mesh position={[0, 14.5, 0]} castShadow>
          <cylinderGeometry args={[4.4, 3.8, 2.8, 16]} />
          <meshPhysicalMaterial color="#0369a1" metalness={0.85} roughness={0.14} clearcoat={0.9} />
        </mesh>
        <mesh position={[0, 17.6, 0]} castShadow>
          <cylinderGeometry args={[5.2, 4.6, 2.4, 16]} />
          <meshStandardMaterial color="#1e293b" roughness={0.45} metalness={0.45} />
        </mesh>
        <mesh position={[0, 19.3, 0]} castShadow>
          <cylinderGeometry args={[5.6, 5.6, 0.8, 16]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.35} />
        </mesh>
        {/* Timing Mast */}
        <mesh position={[0, 23.0, 0]}>
          <cylinderGeometry args={[0.14, 0.28, 7.2, 8]} />
          <meshStandardMaterial color="#ef4444" metalness={0.7} roughness={0.3} />
        </mesh>
      </group>

      {/* Setor G: Reta Oposta Covered Grandstand */}
      <group
        position={[landmarks.retaOpostaMid.x, landmarks.retaOpostaMid.y - 0.5, landmarks.retaOpostaMid.z]}
        rotation={[0, landmarks.retaOpostaMid.angle, 0]}
      >
        <mesh position={[0, -0.5, 0]} castShadow receiveShadow>
          <boxGeometry args={[86, 9.0, 13]} />
          <meshStandardMaterial color="#334155" roughness={0.88} />
        </mesh>
        <mesh position={[0, 4.8, -2.5]} rotation={[-0.32, 0, 0]} castShadow>
          <boxGeometry args={[82, 1.0, 9.5]} />
          <meshStandardMaterial color="#0284c7" roughness={0.75} />
        </mesh>
        <mesh position={[0, 8.6, 0]} castShadow>
          <boxGeometry args={[88, 0.6, 15]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.45} metalness={0.25} />
        </mesh>
        <mesh position={[0, 8.6, -7.4]}>
          <boxGeometry args={[88, 0.7, 0.4]} />
          <meshStandardMaterial color="#eab308" roughness={0.4} />
        </mesh>
      </group>

      {/* Arquibancada S do Senna (Turn 1-2 Spectator Stand) */}
      <group
        position={[landmarks.sennaStand.x, landmarks.sennaStand.y - 0.5, landmarks.sennaStand.z]}
        rotation={[0, landmarks.sennaStand.angle, 0]}
      >
        <mesh position={[0, -0.5, 0]} castShadow receiveShadow>
          <boxGeometry args={[56, 8.8, 12]} />
          <meshStandardMaterial color="#334155" roughness={0.88} />
        </mesh>
        <mesh position={[0, 4.4, -2.2]} rotation={[-0.32, 0, 0]} castShadow>
          <boxGeometry args={[52, 0.9, 8.5]} />
          <meshStandardMaterial color="#16a34a" roughness={0.78} />
        </mesh>
        <mesh position={[0, 7.8, 0]} castShadow>
          <boxGeometry args={[58, 0.55, 13.5]} />
          <meshStandardMaterial color="#f1f5f9" roughness={0.45} />
        </mesh>
      </group>

      {/* Overhead Sponsor / Pedestrian Bridge spanning Reta Oposta */}
      <group
        position={[landmarks.bridgeOposta.x, landmarks.bridgeOposta.y, landmarks.bridgeOposta.z]}
        rotation={[0, landmarks.bridgeOposta.angle, 0]}
      >
        <mesh position={[0, 4.2, TRACK_HALF_WIDTH + 2.2]} castShadow>
          <boxGeometry args={[1.4, 9.0, 1.4]} />
          <meshStandardMaterial color="#1e293b" metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[0, 4.2, -TRACK_HALF_WIDTH - 2.2]} castShadow>
          <boxGeometry args={[1.4, 9.0, 1.4]} />
          <meshStandardMaterial color="#1e293b" metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[0, 8.5, 0]} castShadow>
          <boxGeometry args={[2.4, 1.8, TRACK_WIDTH + 6.4]} />
          <meshStandardMaterial color="#15803d" roughness={0.45} metalness={0.2} />
        </mesh>
        <mesh position={[0, 7.7, 0]}>
          <boxGeometry args={[2.5, 0.35, TRACK_WIDTH + 6.4]} />
          <meshStandardMaterial color="#facc15" roughness={0.35} />
        </mesh>
      </group>

      {/* Trackside DRS Zone Indicator Boards */}
      {[landmarks.drs1, landmarks.drs2].map((b, i) => (
        <group key={`drs-board-${i}`} position={[b.x, b.y + 1.2, b.z]} rotation={[0, b.angle, 0]}>
          <mesh>
            <boxGeometry args={[0.25, 1.8, 0.25]} />
            <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.9, 0]}>
            <boxGeometry args={[2.2, 0.85, 0.2]} />
            <meshStandardMaterial color="#064e3b" emissive="#10b981" emissiveIntensity={1.1} />
          </mesh>
        </group>
      ))}

      {/* Braking Distance Marker Boards (150m / 100m / 50m) */}
      {landmarks.brakeBoards.map((b, i) => (
        <group key={`brake-board-${i}`} position={[b.x, b.y + 0.9, b.z]} rotation={[0, b.angle, 0]}>
          <mesh>
            <boxGeometry args={[0.16, 1.4, 0.16]} />
            <meshStandardMaterial color="#1e293b" />
          </mesh>
          <mesh position={[0, 0.65, 0]}>
            <boxGeometry args={[0.18, 0.95, 1.5]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.5} />
          </mesh>
          <mesh position={[-0.02, 0.65, 0]}>
            <boxGeometry args={[0.2, 0.28, 1.52]} />
            <meshStandardMaterial color="#dc2626" roughness={0.5} />
          </mesh>
        </group>
      ))}

      {/* Instanced Atlantic Forest Trees */}
      <instancedMesh ref={trunkMeshRef} args={[undefined, undefined, treeCount]} castShadow receiveShadow>
        <cylinderGeometry args={[0.22, 0.38, 2.6, 7]} />
        <meshStandardMaterial color="#452719" roughness={0.95} />
      </instancedMesh>
      <instancedMesh ref={crownMeshRef} args={[undefined, undefined, treeCount]} castShadow receiveShadow>
        <coneGeometry args={[2.2, 4.9, 7]} />
        <meshStandardMaterial color="#166534" roughness={0.88} />
      </instancedMesh>
    </group>
  );
};

export { createContactShadowTexture };
