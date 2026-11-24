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
  getCircuitPosition,
  createCircuitRibbonGeometry,
  createCircuitBarrierGeometry,
} from './trackCircuit';
import { LiveRacerTelemetry, SimFrame, SIM_STEPS, USABLE_HALF_WIDTH } from './raceSimulation';

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
    scene.environmentIntensity = 0.85;

    return () => {
      scene.environment = null;
      envTarget.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);

  const skyTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createLinearGradient(0, 0, 0, 256);
      grad.addColorStop(0.0, '#091124');
      grad.addColorStop(0.45, '#172544');
      grad.addColorStop(0.72, '#31456a');
      grad.addColorStop(0.86, '#9a5b40');
      grad.addColorStop(0.95, '#d97745');
      grad.addColorStop(1.0, '#1e293b');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 16, 256);
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
      <color attach="background" args={['#1d2a44']} />
      <fogExp2 attach="fog" args={['#26344d', 0.0022]} />
      <mesh scale={[-1, 1, 1]}>
        <sphereGeometry args={[520, 32, 20]} />
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
    // Base dark slate asphalt
    ctx.fillStyle = '#1b2029';
    ctx.fillRect(0, 0, 512, 512);

    // Darker rubberized racing groove down the center
    const groove = ctx.createLinearGradient(0, 0, 512, 0);
    groove.addColorStop(0, 'rgba(10,12,16,0)');
    groove.addColorStop(0.32, 'rgba(8,10,14,0.38)');
    groove.addColorStop(0.5, 'rgba(6,8,12,0.52)');
    groove.addColorStop(0.68, 'rgba(8,10,14,0.38)');
    groove.addColorStop(1, 'rgba(10,12,16,0)');
    ctx.fillStyle = groove;
    ctx.fillRect(0, 0, 512, 512);

    // Subtle aggregate grain
    for (let i = 0; i < 6000; i++) {
      const x = (i * 73) % 512;
      const y = (i * 197 + Math.floor(i / 512) * 31) % 512;
      const shade = i % 3 === 0 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.08)';
      ctx.fillStyle = shade;
      ctx.fillRect(x, y, 2, 2);
    }

    // Crisp FIA white track boundary lines
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(14, 0, 10, 512);
    ctx.fillRect(488, 0, 10, 512);
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
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(0, 64, 64, 64);
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fillRect(0, 0, 64, 4);
    ctx.fillRect(0, 64, 64, 4);
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
    ctx.fillStyle = '#193b27';
    ctx.fillRect(0, 0, 512, 512);
    // Subtle mowed circuit turf bands
    ctx.fillStyle = '#1e462e';
    for (let y = 0; y < 512; y += 64) {
      ctx.fillRect(0, y, 512, 32);
    }
    for (let i = 0; i < 4500; i++) {
      const x = (i * 113) % 512;
      const y = (i * 251) % 512;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.06)';
      ctx.fillRect(x, y, 2, 2);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(40, 40);
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
    <group position={[startPose.x, 0, startPose.z]} rotation={[0, startPose.angle, 0]}>
      {/* Two Steel Truss Towers */}
      <mesh position={[0, 4.3, TRACK_HALF_WIDTH + 1.6]} castShadow receiveShadow>
        <boxGeometry args={[0.9, 9.0, 0.9]} />
        <meshStandardMaterial color="#1e293b" metalness={0.85} roughness={0.25} />
      </mesh>
      <mesh position={[0, 4.3, -TRACK_HALF_WIDTH - 1.6]} castShadow receiveShadow>
        <boxGeometry args={[0.9, 9.0, 0.9]} />
        <meshStandardMaterial color="#1e293b" metalness={0.85} roughness={0.25} />
      </mesh>

      {/* Overhead Bridge Span */}
      <mesh position={[0, 8.6, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.4, 0.9, TRACK_WIDTH + 4.4]} />
        <meshStandardMaterial color="#0f172a" metalness={0.88} roughness={0.18} />
      </mesh>

      {/* Sponsor-style Dark Timing Fascia */}
      <mesh position={[0.62, 8.6, 0]}>
        <boxGeometry args={[0.25, 0.65, TRACK_WIDTH + 2.0]} />
        <meshStandardMaterial color="#b91c1c" metalness={0.3} roughness={0.45} />
      </mesh>

      {/* Light Pod Housing */}
      <mesh position={[0, 7.1, 0]} castShadow>
        <boxGeometry args={[1.35, 1.45, 11.2]} />
        <meshStandardMaterial color="#020617" metalness={0.9} roughness={0.15} />
      </mesh>

      {/* 5 FIA Dual Light Columns */}
      {[-4.0, -2.0, 0, 2.0, 4.0].map((zOffset, idx) => {
        const isRedLit = !isLightsOut && idx < lightsCount;
        const isGreenLit = isLightsOut;

        return (
          <group key={idx} position={[0.7, 7.1, zOffset]}>
            <mesh position={[-0.04, 0, 0]}>
              <boxGeometry args={[0.08, 1.25, 1.45]} />
              <meshStandardMaterial color="#000000" roughness={0.9} />
            </mesh>

            {/* Top Dual Red Lights */}
            {[-0.32, 0.32].map((lz, j) => (
              <mesh key={`r-${j}`} position={[0.03, 0.3, lz]}>
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
              <mesh key={`g-${j}`} position={[0.03, -0.3, lz]}>
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
      const startDist = -6 - idx * 6.8;
      const laneSide = idx % 2 === 0 ? -0.45 : 0.45;
      const laneOffset = laneSide * USABLE_HALF_WIDTH;
      return getCircuitPosition(startDist, laneOffset);
    });
  }, [total]);

  return (
    <group>
      {slots.map((pos, idx) => (
        <group key={idx} position={[pos.x, -0.165, pos.z]} rotation={[0, pos.angle, 0]}>
          {/* Grid Box Front Line */}
          <mesh position={[1.45, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.25, 2.2]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.6} polygonOffset polygonOffsetFactor={-2} />
          </mesh>
          {/* Side Brackets */}
          <mesh position={[0.85, 0, 1.05]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[1.3, 0.16]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.6} polygonOffset polygonOffsetFactor={-2} />
          </mesh>
          <mesh position={[0.85, 0, -1.05]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[1.3, 0.16]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.6} polygonOffset polygonOffsetFactor={-2} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

const TyreSmoke = () => {
  const groupRef = useRef<THREE.Group>(null);
  const particles = useMemo(
    () =>
      Array.from({ length: 14 }).map((_, i) => ({
        side: i % 2 === 0 ? 1 : -1,
        seed: i * 0.37,
        speed: 1.3 + (i % 4) * 0.35,
      })),
    []
  );

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.children.forEach((child, i) => {
      const p = particles[i];
      const age = (t * p.speed + p.seed) % 1.1;
      const prog = age / 1.1;
      child.position.set(-0.95 - prog * 2.4, 0.14 + prog * 0.65, p.side * 0.42 + Math.sin(age * 11) * 0.08);
      const s = 0.25 + prog * 1.15;
      child.scale.set(s, s, s);
      const mesh = child as THREE.Mesh;
      if (mesh.material instanceof THREE.MeshStandardMaterial) {
        mesh.material.opacity = Math.max(0, (1 - prog) * 0.55);
      }
    });
  });

  return (
    <group ref={groupRef}>
      {particles.map((_, i) => (
        <mesh key={i}>
          <sphereGeometry args={[0.26, 7, 7]} />
          <meshStandardMaterial color="#e2e8f0" transparent opacity={0.45} roughness={1} depthWrite={false} />
        </mesh>
      ))}
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
  const smokeRef = useRef<THREE.Group>(null);

  const raceData = useRef({
    startTime: 0,
    wheelSpin: 0,
    finalPose: null as LiveRacerTelemetry | null,
  });

  const gridLane = index % 2 === 0 ? -0.45 : 0.45;
  const gridStartDist = -6 - index * 6.8;
  const gridPose = useMemo(() => getCircuitPosition(gridStartDist, gridLane * USABLE_HALF_WIDTH), [gridStartDist, gridLane]);

  useFrame((state, delta) => {
    if (!groupRef.current || !chassisTiltRef.current) return;
    const clampedDelta = Math.min(0.05, delta);

    if (isSpinning) {
      if (startPhase === 'racing') {
        if (raceData.current.startTime === 0) {
          raceData.current.startTime = state.clock.elapsedTime;
        }
        const elapsed = state.clock.elapsedTime - raceData.current.startTime;

        let dist = gridStartDist;
        let lane = gridLane;
        let speed = 0;
        let displayKmh = 0;
        let gear = 1;
        let steerAngle = 0;
        let drsActive = false;
        let inSlipstream = false;
        let braking = false;

        if (simProfile && simProfile.length > 0) {
          const maxIndex = simProfile.length - 1;
          const simDt = spinDurationSeconds / SIM_STEPS;
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
            steerAngle = p.steerAngle;
            drsActive = p.drsActive;
            inSlipstream = p.inSlipstream;
            braking = p.braking;
          } else {
            const p1 = simProfile[idx];
            const p2 = simProfile[idx + 1];
            dist = p1.dist + (p2.dist - p1.dist) * frac;
            lane = p1.lane + (p2.lane - p1.lane) * frac;
            speed = p1.speed + (p2.speed - p1.speed) * frac;
            displayKmh = Math.round(p1.displayKmh + (p2.displayKmh - p1.displayKmh) * frac);
            gear = p1.gear;
            steerAngle = p1.steerAngle + (p2.steerAngle - p1.steerAngle) * frac;
            drsActive = p1.drsActive;
            inSlipstream = p1.inSlipstream;
            braking = p1.braking;
          }
        }

        const trackPose = getCircuitPosition(dist, lane * USABLE_HALF_WIDTH);
        groupRef.current.position.set(trackPose.x, -0.17, trackPose.z);
        groupRef.current.rotation.y = trackPose.angle;

        // Suspension pitch (squat on launch/acceleration, dive on braking) & corner roll
        const launchPitch = elapsed < 2.0 ? -0.055 * (1 - elapsed / 2.0) : 0;
        const brakePitch = braking ? 0.045 : 0;
        const cornerRoll = Math.max(-0.08, Math.min(0.08, trackPose.signedCurvature * 2.2));
        chassisTiltRef.current.rotation.z = THREE.MathUtils.damp(
          chassisTiltRef.current.rotation.z,
          launchPitch + brakePitch,
          10,
          clampedDelta
        );
        chassisTiltRef.current.rotation.x = THREE.MathUtils.damp(
          chassisTiltRef.current.rotation.x,
          cornerRoll,
          8,
          clampedDelta
        );
        chassisTiltRef.current.rotation.y =
          elapsed < 1.6 ? Math.sin(elapsed * 28 + index * 2.4) * 0.025 * (1 - elapsed / 1.6) : 0;

        // Wheel spin & steering
        raceData.current.wheelSpin -= speed * clampedDelta * 2.2;
        for (let w = 0; w < 4; w++) {
          const wm = wheelRefs.current[w];
          if (wm) wm.rotation.y = raceData.current.wheelSpin;
        }
        if (frontLeftSteerRef.current) frontLeftSteerRef.current.rotation.y = steerAngle;
        if (frontRightSteerRef.current) frontRightSteerRef.current.rotation.y = steerAngle;

        // DRS flap articulation
        if (drsFlapRef.current) {
          const targetDrsRot = drsActive ? 0.48 : 0;
          drsFlapRef.current.rotation.z = THREE.MathUtils.damp(
            drsFlapRef.current.rotation.z,
            targetDrsRot,
            14,
            clampedDelta
          );
        }

        // Brake / ERS rain light
        if (rainLightRef.current) {
          rainLightRef.current.emissiveIntensity = braking ? 5.5 : 0.45;
        }

        // Slipstream / DRS aero ribbons
        if (aeroTrailRef.current) {
          aeroTrailRef.current.visible = drsActive || inSlipstream;
        }

        // Launch tyre smoke
        if (smokeRef.current) {
          smokeRef.current.visible = elapsed < 2.1;
        }

        const liveTelemetry: LiveRacerTelemetry = {
          id: item.id,
          x: trackPose.x,
          z: trackPose.z,
          angle: trackPose.angle,
          totalDistance: dist,
          lane,
          speed,
          displayKmh,
          gear,
          steerAngle,
          drsActive,
          inSlipstream,
          braking,
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
        groupRef.current.position.set(gridPose.x, -0.17, gridPose.z);
        groupRef.current.rotation.y = gridPose.angle;
        chassisTiltRef.current.rotation.set(0, 0, 0);
        if (drsFlapRef.current) drsFlapRef.current.rotation.z = 0;
        if (aeroTrailRef.current) aeroTrailRef.current.visible = false;
        if (smokeRef.current) smokeRef.current.visible = false;

        const gridTelemetry: LiveRacerTelemetry = {
          id: item.id,
          x: gridPose.x,
          z: gridPose.z,
          angle: gridPose.angle,
          totalDistance: gridStartDist,
          lane: gridLane,
          speed: 0,
          displayKmh: 0,
          gear: 1,
          steerAngle: 0,
          drsActive: false,
          inSlipstream: false,
          braking: false,
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
        groupRef.current.position.set(pose.x, -0.17, pose.z);
        groupRef.current.rotation.y = pose.angle;
      } else {
        groupRef.current.position.set(gridPose.x, -0.17, gridPose.z);
        groupRef.current.rotation.y = gridPose.angle;
      }

      if (isWinner && pose) {
        // Post-race celebratory donuts
        chassisTiltRef.current.rotation.y -= 4.2 * clampedDelta;
        chassisTiltRef.current.rotation.x = -0.07;
        chassisTiltRef.current.rotation.z = -0.05;
        if (smokeRef.current) smokeRef.current.visible = true;
      } else {
        chassisTiltRef.current.rotation.set(0, 0, 0);
        if (smokeRef.current) smokeRef.current.visible = false;
      }
      if (aeroTrailRef.current) aeroTrailRef.current.visible = false;
    }
  });

  const labelFontSize = Math.max(0.55, Math.min(1.05, 0.78 * textScale));

  return (
    <group ref={groupRef} position={[gridPose.x, -0.17, gridPose.z]}>
      <group ref={chassisTiltRef} scale={[2.1, 2.1, 2.1]}>
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
        <group ref={smokeRef} visible={false}>
          <TyreSmoke />
        </group>
      </group>

      <Billboard position={[0, 2.45, 0]}>
        <Text
          fontSize={labelFontSize}
          color="#f8fafc"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.09}
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
      kerb: createKerbTexture(maxAniso),
      turf: createTurfTexture(maxAniso),
      checkered: createCheckeredTexture(maxAniso),
    };
  }, [maxAniso]);

  const geometries = useMemo(() => {
    const asphalt = createCircuitRibbonGeometry(-TRACK_HALF_WIDTH, TRACK_HALF_WIDTH, -0.18, 22);
    const outerKerb = createCircuitRibbonGeometry(TRACK_HALF_WIDTH, TRACK_HALF_WIDTH + 1.2, -0.172, 6);
    const innerKerb = createCircuitRibbonGeometry(-TRACK_HALF_WIDTH - 1.2, -TRACK_HALF_WIDTH, -0.172, 6);

    // DRS Zone strips along inside edges of Zone 1 (0.92..1.0 and 0.0..0.09) & Zone 2 (0.51..0.66)
    const drsStrip1a = createCircuitRibbonGeometry(-TRACK_HALF_WIDTH + 0.5, -TRACK_HALF_WIDTH + 1.15, -0.168, 12, 0.92, 1.0);
    const drsStrip1b = createCircuitRibbonGeometry(-TRACK_HALF_WIDTH + 0.5, -TRACK_HALF_WIDTH + 1.15, -0.168, 12, 0.0, 0.09);
    const drsStrip2 = createCircuitRibbonGeometry(-TRACK_HALF_WIDTH + 0.5, -TRACK_HALF_WIDTH + 1.15, -0.168, 12, 0.51, 0.66);

    // Gravel runoff beds on major corners
    const gravelEast = createCircuitRibbonGeometry(TRACK_HALF_WIDTH + 1.2, TRACK_HALF_WIDTH + 8.5, -0.22, 14, 0.14, 0.44);
    const gravelWest = createCircuitRibbonGeometry(TRACK_HALF_WIDTH + 1.2, TRACK_HALF_WIDTH + 8.5, -0.22, 14, 0.68, 0.91);

    const outerBarrier = createCircuitBarrierGeometry(TRACK_HALF_WIDTH + 9.2, 1.25, 0.7, -0.25);
    const innerBarrier = createCircuitBarrierGeometry(-TRACK_HALF_WIDTH - 3.6, 1.05, 0.65, -0.25);

    return {
      asphalt,
      outerKerb,
      innerKerb,
      drsStrip1a,
      drsStrip1b,
      drsStrip2,
      gravelEast,
      gravelWest,
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

  // Instanced Trees around autodrome perimeter (zero overlapping with track)
  const treeCount = 180;
  const trunkMeshRef = useRef<THREE.InstancedMesh>(null);
  const crownMeshRef = useRef<THREE.InstancedMesh>(null);

  useEffect(() => {
    if (!trunkMeshRef.current || !crownMeshRef.current) return;
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    let placed = 0;

    for (let i = 0; i < 600 && placed < treeCount; i++) {
      // Deterministic pseudo-random scatter
      const r1 = Math.sin(i * 12.9898) * 43758.5453;
      const rand1 = r1 - Math.floor(r1);
      const r2 = Math.sin(i * 78.233) * 43758.5453;
      const rand2 = r2 - Math.floor(r2);
      const r3 = Math.sin(i * 39.346) * 43758.5453;
      const rand3 = r3 - Math.floor(r3);

      const x = (rand1 - 0.5) * 460;
      const z = (rand2 - 0.5) * 380;

      // Ensure distance from every track centerline sample > 26m
      let minTrackDistSq = Infinity;
      for (let s = 0; s < TRACK_SAMPLES; s += 6) {
        const samp = CIRCUIT_SAMPLES[s];
        const dx = x - samp.x;
        const dz = z - samp.z;
        const dSq = dx * dx + dz * dz;
        if (dSq < minTrackDistSq) minTrackDistSq = dSq;
      }
      if (minTrackDistSq < 26 * 26) continue;

      const scale = 0.85 + rand3 * 0.65;
      dummy.position.set(x, 1.3 * scale - 0.25, z);
      dummy.scale.set(scale, scale, scale);
      dummy.rotation.y = rand1 * Math.PI * 2;
      dummy.updateMatrix();
      trunkMeshRef.current.setMatrixAt(placed, dummy.matrix);

      dummy.position.set(x, 4.1 * scale - 0.25, z);
      dummy.scale.set(scale, scale * (0.9 + rand2 * 0.25), scale);
      dummy.updateMatrix();
      crownMeshRef.current.setMatrixAt(placed, dummy.matrix);

      color.setHSL(0.36 + (rand3 - 0.5) * 0.05, 0.45, 0.22 + rand1 * 0.09);
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

  // Trackside DRS Sign Boards
  const drsBoards = useMemo(() => {
    const totalS = CIRCUIT_SAMPLES[TRACK_SAMPLES - 1].s;
    const d1 = getCircuitPosition(0.93 * totalS, -TRACK_HALF_WIDTH - 2.2);
    const d2 = getCircuitPosition(0.52 * totalS, -TRACK_HALF_WIDTH - 2.2);
    return [d1, d2];
  }, []);

  return (
    <group>
      {/* Ground Turf Plane */}
      <mesh position={[0, -0.3, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[1200, 1200]} />
        <meshStandardMaterial map={textures.turf} roughness={0.96} />
      </mesh>

      {/* Asphalt Ribbon */}
      <mesh geometry={geometries.asphalt} receiveShadow>
        <meshStandardMaterial map={textures.asphalt} roughness={0.82} metalness={0.05} />
      </mesh>

      {/* FIA Red/White Kerbs */}
      <mesh geometry={geometries.outerKerb} receiveShadow>
        <meshStandardMaterial
          map={textures.kerb}
          roughness={0.75}
          polygonOffset
          polygonOffsetFactor={-1}
          polygonOffsetUnits={-1}
        />
      </mesh>
      <mesh geometry={geometries.innerKerb} receiveShadow>
        <meshStandardMaterial
          map={textures.kerb}
          roughness={0.75}
          polygonOffset
          polygonOffsetFactor={-1}
          polygonOffsetUnits={-1}
        />
      </mesh>

      {/* DRS Zone Emerald Edge Strips */}
      {[geometries.drsStrip1a, geometries.drsStrip1b, geometries.drsStrip2].map((g, i) => (
        <mesh key={`drs-${i}`} geometry={g}>
          <meshStandardMaterial
            color="#10b981"
            emissive="#10b981"
            emissiveIntensity={0.45}
            roughness={0.5}
            polygonOffset
            polygonOffsetFactor={-2}
          />
        </mesh>
      ))}

      {/* Gravel Runoff Traps */}
      <mesh geometry={geometries.gravelEast} receiveShadow>
        <meshStandardMaterial color="#948c7e" roughness={0.98} />
      </mesh>
      <mesh geometry={geometries.gravelWest} receiveShadow>
        <meshStandardMaterial color="#948c7e" roughness={0.98} />
      </mesh>

      {/* Continuous Safety Barriers */}
      <mesh geometry={geometries.outerBarrier} castShadow receiveShadow>
        <meshStandardMaterial color="#475569" roughness={0.65} metalness={0.35} />
      </mesh>
      <mesh geometry={geometries.innerBarrier} castShadow receiveShadow>
        <meshStandardMaterial color="#cbd5e1" roughness={0.6} metalness={0.2} />
      </mesh>

      {/* Checkered Start/Finish Line */}
      <mesh position={[startPose.x, -0.165, startPose.z]} rotation={[-Math.PI / 2, 0, startPose.angle]} receiveShadow>
        <planeGeometry args={[3.6, TRACK_WIDTH - 0.6]} />
        <meshStandardMaterial
          map={textures.checkered}
          roughness={0.75}
          polygonOffset
          polygonOffsetFactor={-2}
        />
      </mesh>

      {/* Start Light Gantry & Grid Markings */}
      <StartLightGantry lightsCount={lightsCount} isLightsOut={isLightsOut} />
      <StartingGridMarkings total={totalRacers} />

      {/* Main Straight Grandstand & Pit Complex */}
      <group position={[0, -0.25, 75 + TRACK_HALF_WIDTH + 16]}>
        <mesh position={[0, 4.2, 0]} castShadow receiveShadow>
          <boxGeometry args={[95, 8.4, 12]} />
          <meshStandardMaterial color="#1e293b" roughness={0.7} metalness={0.2} />
        </mesh>
        <mesh position={[0, 9.2, -1]} castShadow>
          <boxGeometry args={[98, 0.7, 15]} />
          <meshStandardMaterial color="#dc2626" roughness={0.45} metalness={0.35} />
        </mesh>
        {/* Tiered Seating Accent */}
        <mesh position={[0, 4.5, -5.6]}>
          <boxGeometry args={[92, 4.8, 1.2]} />
          <meshStandardMaterial color="#334155" roughness={0.85} />
        </mesh>
      </group>

      {/* Pit Complex Building (Inner Side of Main Straight) */}
      <group position={[0, -0.25, 75 - TRACK_HALF_WIDTH - 10]}>
        <mesh position={[0, 3.2, 0]} castShadow receiveShadow>
          <boxGeometry args={[82, 6.4, 9]} />
          <meshStandardMaterial color="#0f172a" roughness={0.65} metalness={0.35} />
        </mesh>
        <mesh position={[0, 6.6, 0]}>
          <boxGeometry args={[84, 0.5, 9.8]} />
          <meshStandardMaterial color="#38bdf8" emissive="#0284c7" emissiveIntensity={0.65} roughness={0.3} />
        </mesh>
      </group>

      {/* Trackside DRS Zone Indicator Boards */}
      {drsBoards.map((b, i) => (
        <group key={`drs-board-${i}`} position={[b.x, 1.2, b.z]} rotation={[0, b.angle, 0]}>
          <mesh>
            <boxGeometry args={[0.25, 1.4, 0.25]} />
            <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.9, 0]}>
            <boxGeometry args={[2.2, 0.85, 0.2]} />
            <meshStandardMaterial color="#064e3b" emissive="#10b981" emissiveIntensity={1.2} />
          </mesh>
        </group>
      ))}

      {/* Instanced Perimeter Trees */}
      <instancedMesh ref={trunkMeshRef} args={[undefined, undefined, treeCount]} castShadow receiveShadow>
        <cylinderGeometry args={[0.22, 0.38, 2.6, 7]} />
        <meshStandardMaterial color="#452719" roughness={0.95} />
      </instancedMesh>
      <instancedMesh ref={crownMeshRef} args={[undefined, undefined, treeCount]} castShadow receiveShadow>
        <coneGeometry args={[2.1, 4.8, 7]} />
        <meshStandardMaterial color="#1e462e" roughness={0.88} />
      </instancedMesh>
    </group>
  );
};

export { createContactShadowTexture };
