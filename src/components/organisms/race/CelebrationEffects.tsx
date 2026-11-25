import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { RaceTrackStyle } from '../../../types';
import { getCircuitConfig, getCelebrationArenaPose } from './trackCircuit';

const FW_COUNT = 320;
const _fwDummy = new THREE.Object3D();
const _fwColor = new THREE.Color();
const _champColor = new THREE.Color();
const _goldColor = new THREE.Color('#fbbf24');
const _whiteColor = new THREE.Color('#f8fafc');

/**
 * 3D Stadium Spotlights, Volumetric Light Beams, and Instanced Pyrotechnic Fireworks
 * rendered during the post-race celebration on the Main Straight / Tri-Oval Infield.
 */
export const CelebrationEffects = ({
  isCelebrating,
  championColor,
  isSoftwareGl,
  trackStyle = 'interlagos',
}: {
  isCelebrating: boolean;
  championColor: string;
  isSoftwareGl: boolean;
  trackStyle?: RaceTrackStyle;
}) => {
  const fwMeshRef = useRef<THREE.InstancedMesh>(null);
  const spot1TargetRef = useRef<THREE.Object3D>(new THREE.Object3D());
  const spot2TargetRef = useRef<THREE.Object3D>(new THREE.Object3D());
  const beam1Ref = useRef<THREE.Group>(null);
  const beam2Ref = useRef<THREE.Group>(null);
  const beam3Ref = useRef<THREE.Group>(null);
  const beam4Ref = useRef<THREE.Group>(null);

  const trackHalfWidth = useMemo(() => getCircuitConfig(trackStyle).trackHalfWidth, [trackStyle]);
  const arenaCenter = useMemo(() => getCelebrationArenaPose(trackStyle), [trackStyle]);

  // Pre-allocated firework particle buffers (Zero-GC)
  const fwStateRef = useRef({
    active: new Uint8Array(FW_COUNT),
    age: new Float32Array(FW_COUNT),
    life: new Float32Array(FW_COUNT),
    px: new Float32Array(FW_COUNT),
    py: new Float32Array(FW_COUNT),
    pz: new Float32Array(FW_COUNT),
    vx: new Float32Array(FW_COUNT),
    vy: new Float32Array(FW_COUNT),
    vz: new Float32Array(FW_COUNT),
    palette: new Uint8Array(FW_COUNT), // 0 = champion, 1 = gold, 2 = white
    cursor: 0,
    nextBurstTime: 0,
    burstIdx: 0,
  });

  useEffect(() => {
    spot1TargetRef.current.position.set(arenaCenter.x, arenaCenter.y + 0.2, arenaCenter.z);
    spot2TargetRef.current.position.set(arenaCenter.x, arenaCenter.y + 0.2, arenaCenter.z);
  }, [arenaCenter]);

  useEffect(() => {
    const fw = fwStateRef.current;
    fw.active.fill(0);
    fw.nextBurstTime = 0;
    fw.burstIdx = 0;
    if (!isCelebrating && fwMeshRef.current) {
      _fwDummy.scale.set(0, 0, 0);
      _fwDummy.updateMatrix();
      for (let i = 0; i < FW_COUNT; i++) {
        fwMeshRef.current.setMatrixAt(i, _fwDummy.matrix);
      }
      fwMeshRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [isCelebrating]);

  useFrame((state, delta) => {
    if (!isCelebrating) return;
    const dt = Math.min(0.05, delta);
    const t = state.clock.elapsedTime;

    // 1. Sweep stadium spotlight beams gently around the donut arena on the main straight
    const sweepX = arenaCenter.x + Math.sin(t * 2.1) * 4.8;
    const sweepZ = arenaCenter.z + Math.cos(t * 2.1) * 4.8;
    spot1TargetRef.current.position.set(sweepX, arenaCenter.y + 0.1, sweepZ);
    spot2TargetRef.current.position.set(
      arenaCenter.x - Math.sin(t * 1.6) * 4.0,
      arenaCenter.y + 0.1,
      arenaCenter.z - Math.cos(t * 1.6) * 4.0
    );
    spot1TargetRef.current.updateMatrixWorld();
    spot2TargetRef.current.updateMatrixWorld();

    if (beam1Ref.current) {
      beam1Ref.current.rotation.z = Math.sin(t * 1.9) * 0.14 + 0.36;
      beam1Ref.current.rotation.x = Math.cos(t * 1.3) * 0.08 - 0.52;
    }
    if (beam2Ref.current) {
      beam2Ref.current.rotation.z = Math.cos(t * 1.7) * 0.14 - 0.34;
      beam2Ref.current.rotation.x = Math.sin(t * 1.5) * 0.08 - 0.52;
    }
    if (beam3Ref.current) {
      beam3Ref.current.rotation.z = Math.sin(t * 2.2 + 1.1) * 0.15 + 0.25;
      beam3Ref.current.rotation.x = Math.cos(t * 1.4) * 0.08 + 0.48;
    }
    if (beam4Ref.current) {
      beam4Ref.current.rotation.z = Math.cos(t * 2.0 + 0.7) * 0.15 - 0.28;
      beam4Ref.current.rotation.x = Math.sin(t * 1.6) * 0.08 + 0.48;
    }

    // 2. Spawn & integrate 3D fireworks bursts
    const mesh = fwMeshRef.current;
    if (!mesh) return;
    const fw = fwStateRef.current;

    if (t >= fw.nextBurstTime) {
      fw.nextBurstTime = t + 0.72 + ((fw.burstIdx * 37) % 10) * 0.045;
      const bx = arenaCenter.x - 24 + ((fw.burstIdx * 29) % 54);
      const by = arenaCenter.y + 12.0 + ((fw.burstIdx * 17) % 8);
      const bz = arenaCenter.z + trackHalfWidth + 22 + (((fw.burstIdx * 13) % 14) - 7);
      const sparksPerBurst = 44;

      for (let p = 0; p < sparksPerBurst; p++) {
        const idx = fw.cursor;
        fw.cursor = (idx + 1) % FW_COUNT;

        // Deterministic Fibonacci sphere distribution for crisp spherical firework shell
        const yUnit = 1 - ((p + 0.5) / sparksPerBurst) * 2;
        const rUnit = Math.sqrt(Math.max(0, 1 - yUnit * yUnit));
        const theta = p * 2.3999632 + fw.burstIdx * 0.7;
        const speed = 10.5 + (((p * 19 + fw.burstIdx * 7) % 100) / 100) * 5.5;

        fw.active[idx] = 1;
        fw.age[idx] = 0;
        fw.life[idx] = 1.15 + (((p * 23) % 100) / 100) * 0.45;
        fw.px[idx] = bx;
        fw.py[idx] = by;
        fw.pz[idx] = bz;
        fw.vx[idx] = Math.cos(theta) * rUnit * speed;
        fw.vy[idx] = yUnit * speed + 2.4;
        fw.vz[idx] = Math.sin(theta) * rUnit * speed;
        fw.palette[idx] = p % 5 === 0 ? 2 : p % 2 === 0 ? 0 : 1;
      }
      fw.burstIdx++;
    }

    _champColor.set(championColor || '#ef4444');
    let anyColorUpdated = false;

    for (let i = 0; i < FW_COUNT; i++) {
      if (fw.active[i]) {
        fw.age[i] += dt;
        if (fw.age[i] >= fw.life[i]) {
          fw.active[i] = 0;
          _fwDummy.scale.set(0, 0, 0);
          _fwDummy.updateMatrix();
          mesh.setMatrixAt(i, _fwDummy.matrix);
        } else {
          // Air drag + gravity
          fw.vx[i] *= 1 - 1.4 * dt;
          fw.vz[i] *= 1 - 1.4 * dt;
          fw.vy[i] = fw.vy[i] * (1 - 1.2 * dt) - 8.8 * dt;
          fw.px[i] += fw.vx[i] * dt;
          fw.py[i] += fw.vy[i] * dt;
          fw.pz[i] += fw.vz[i] * dt;

          const frac = 1 - fw.age[i] / fw.life[i];
          const s = 0.22 + frac * 0.42;
          _fwDummy.position.set(fw.px[i], fw.py[i], fw.pz[i]);
          _fwDummy.rotation.set(0, 0, 0);
          _fwDummy.scale.set(s, s, s);
          _fwDummy.updateMatrix();
          mesh.setMatrixAt(i, _fwDummy.matrix);

          const pal = fw.palette[i];
          if (pal === 0) _fwColor.copy(_champColor);
          else if (pal === 1) _fwColor.copy(_goldColor);
          else _fwColor.copy(_whiteColor);
          _fwColor.multiplyScalar(0.4 + frac * 1.1);
          mesh.setColorAt(i, _fwColor);
          anyColorUpdated = true;
        }
      } else {
        _fwDummy.scale.set(0, 0, 0);
        _fwDummy.updateMatrix();
        mesh.setMatrixAt(i, _fwDummy.matrix);
      }
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (anyColorUpdated && mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
    }
  });

  if (!isCelebrating) return null;

  return (
    <group>
      {/* Stadium Spotlights illuminating the Main Straight donut arena (castShadow=false to stay within <=3 shadow budget) */}
      <primitive object={spot1TargetRef.current} />
      <primitive object={spot2TargetRef.current} />
      {!isSoftwareGl && (
        <>
          <spotLight
            position={[arenaCenter.x - 16, arenaCenter.y + 16, arenaCenter.z + trackHalfWidth + 10]}
            target={spot1TargetRef.current}
            angle={0.42}
            penumbra={0.65}
            intensity={180}
            distance={85}
            color="#fef3c7"
          />
          <spotLight
            position={[arenaCenter.x + 18, arenaCenter.y + 15, arenaCenter.z - trackHalfWidth - 8]}
            target={spot2TargetRef.current}
            angle={0.44}
            penumbra={0.65}
            intensity={150}
            distance={85}
            color={championColor || '#38bdf8'}
          />
        </>
      )}

      {/* Soft Volumetric Stadium Spotlight Cones from Grandstand & Pit Towers */}
      <group position={[arenaCenter.x - 12, arenaCenter.y + 9.2, arenaCenter.z + trackHalfWidth + 10]}>
        <group ref={beam1Ref}>
          <mesh position={[0, -13, 0]}>
            <coneGeometry args={[4.6, 26, 20, 1, true]} />
            <meshBasicMaterial
              color="#fef08a"
              transparent
              opacity={0.11}
              side={THREE.DoubleSide}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        </group>
      </group>

      <group position={[arenaCenter.x + 22, arenaCenter.y + 9.2, arenaCenter.z + trackHalfWidth + 10]}>
        <group ref={beam2Ref}>
          <mesh position={[0, -13, 0]}>
            <coneGeometry args={[4.6, 26, 20, 1, true]} />
            <meshBasicMaterial
              color={championColor || '#f8fafc'}
              transparent
              opacity={0.11}
              side={THREE.DoubleSide}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        </group>
      </group>

      <group position={[arenaCenter.x - 10, arenaCenter.y + 6.8, arenaCenter.z - trackHalfWidth - 8]}>
        <group ref={beam3Ref}>
          <mesh position={[0, -11, 0]}>
            <coneGeometry args={[3.8, 22, 20, 1, true]} />
            <meshBasicMaterial
              color="#f8fafc"
              transparent
              opacity={0.1}
              side={THREE.DoubleSide}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        </group>
      </group>

      <group position={[arenaCenter.x + 20, arenaCenter.y + 6.8, arenaCenter.z - trackHalfWidth - 8]}>
        <group ref={beam4Ref}>
          <mesh position={[0, -11, 0]}>
            <coneGeometry args={[3.8, 22, 20, 1, true]} />
            <meshBasicMaterial
              color="#fbbf24"
              transparent
              opacity={0.1}
              side={THREE.DoubleSide}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        </group>
      </group>

      {/* Instanced 3D Fireworks Sparks */}
      <instancedMesh ref={fwMeshRef} args={[undefined, undefined, FW_COUNT]} frustumCulled={false}>
        <icosahedronGeometry args={[0.38, 0]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.95} depthWrite={false} />
      </instancedMesh>
    </group>
  );
};
