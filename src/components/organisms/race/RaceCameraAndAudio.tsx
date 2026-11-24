import React, { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore } from '../../../store/useAppStore';
import {
  updateRaceEngineAudio,
  updateTireSquealAudio,
  playKerbImpactSound,
  stopRaceAudio,
} from '../../../utils/audioEngine';
import { TOTAL_LAPS, TRACK_P, getCircuitPosition } from './trackCircuit';
import { LiveRacerTelemetry } from './raceSimulation';

export type ManualCameraMode = 'auto' | 'action' | 'bumper' | 'rear' | 'trackside' | 'helicopter' | 'tv';
export type ActiveBroadcastAngle =
  | 'idle'
  | 'grid'
  | 'action'
  | 'bumper'
  | 'rear'
  | 'trackside'
  | 'helicopter'
  | 'tv'
  | 'finish';

// Pre-allocated vectors at module scope to prevent GC churn in 60fps loop
const _desiredCamPos = new THREE.Vector3();
const _desiredLookAt = new THREE.Vector3();
const _carWorldPos = new THREE.Vector3();

export const RaceCameraAndAudio = ({
  isSpinning,
  expectedWinnerId,
  positionsRef,
  leaderPosRef,
  winnerPosRef,
  startPhase,
  manualCamera,
  focusedDriverId,
  onBroadcastStateChange,
}: {
  isSpinning: boolean;
  expectedWinnerId?: string;
  positionsRef: React.MutableRefObject<LiveRacerTelemetry[]>;
  leaderPosRef: React.MutableRefObject<LiveRacerTelemetry | null>;
  winnerPosRef: React.MutableRefObject<LiveRacerTelemetry | null>;
  startPhase: string;
  manualCamera: ManualCameraMode;
  focusedDriverId: string | null;
  onBroadcastStateChange: (angle: ActiveBroadcastAngle, targetDriverId: string | null) => void;
}) => {
  const { camera } = useThree();
  const currentCamPos = useRef(new THREE.Vector3(-28, 12, 92));
  const currentLookAt = useRef(new THREE.Vector3(0, 1.5, 75));
  const targetFov = useRef(46);

  const activeAngleRef = useRef<ActiveBroadcastAngle>('idle');
  const activeDriverIdRef = useRef<string | null>(null);
  const lastSwitchTimeRef = useRef(0);
  const nextCutIntervalRef = useRef(3.2);
  const raceLaunchTimeRef = useRef<number | null>(null);
  const hasInitializedLaunchCutRef = useRef(false);
  const tracksidePosRef = useRef(new THREE.Vector3(35, 4.2, 89));
  const recentAnglesRef = useRef<ActiveBroadcastAngle[]>([]);

  useEffect(() => {
    if (!isSpinning) {
      activeAngleRef.current = 'idle';
      targetFov.current = 45;
      raceLaunchTimeRef.current = null;
      hasInitializedLaunchCutRef.current = false;
      recentAnglesRef.current = [];
      onBroadcastStateChange('idle', focusedDriverId);
    }
  }, [isSpinning, focusedDriverId, onBroadcastStateChange]);

  useFrame((state, delta) => {
    const dt = Math.min(0.05, delta);
    const persCam = camera as THREE.PerspectiveCamera;
    const elapsed = state.clock.elapsedTime;

    if (startPhase === 'racing' && raceLaunchTimeRef.current === null) {
      raceLaunchTimeRef.current = elapsed;
    } else if (startPhase !== 'racing') {
      raceLaunchTimeRef.current = null;
    }

    const launchElapsed =
      startPhase === 'racing' && raceLaunchTimeRef.current !== null
        ? elapsed - raceLaunchTimeRef.current
        : 0;

    if (isSpinning) {
      const validCars = (positionsRef.current || []).filter((p) => p && p.id);
      const sortedCars = [...validCars].sort((a, b) => b.totalDistance - a.totalDistance);

      // Grid / launch camera during 5-light sequence & first 2.6s of launch (unless user forced manual angle)
      if (
        manualCamera === 'auto' &&
        startPhase !== 'idle' &&
        (startPhase !== 'racing' || launchElapsed < 2.6)
      ) {
        hasInitializedLaunchCutRef.current = false;
        const startPose = getCircuitPosition(0, 0);
        const gridCamX = startPose.x + startPose.tx * 22 - startPose.nx * 13;
        const gridCamZ = startPose.z + startPose.tz * 22 - startPose.nz * 13;
        _desiredCamPos.set(gridCamX, 3.6, gridCamZ);

        const lookFwd = startPhase === 'racing' ? THREE.MathUtils.lerp(-4, 18, Math.min(1, launchElapsed / 2.6)) : -6;
        _desiredLookAt.set(
          startPose.x + startPose.tx * lookFwd,
          1.7,
          startPose.z + startPose.tz * lookFwd
        );
        targetFov.current = 34;

        if (activeAngleRef.current !== 'grid') {
          activeAngleRef.current = 'grid';
          currentCamPos.current.copy(_desiredCamPos);
          currentLookAt.current.copy(_desiredLookAt);
          onBroadcastStateChange('grid', focusedDriverId || sortedCars[0]?.id || null);
        }

        currentCamPos.current.x = THREE.MathUtils.damp(currentCamPos.current.x, _desiredCamPos.x, 5, dt);
        currentCamPos.current.y = THREE.MathUtils.damp(currentCamPos.current.y, _desiredCamPos.y, 5, dt);
        currentCamPos.current.z = THREE.MathUtils.damp(currentCamPos.current.z, _desiredCamPos.z, 5, dt);
        currentLookAt.current.x = THREE.MathUtils.damp(currentLookAt.current.x, _desiredLookAt.x, 7, dt);
        currentLookAt.current.y = THREE.MathUtils.damp(currentLookAt.current.y, _desiredLookAt.y, 7, dt);
        currentLookAt.current.z = THREE.MathUtils.damp(currentLookAt.current.z, _desiredLookAt.z, 7, dt);

        camera.position.copy(currentCamPos.current);
        camera.lookAt(currentLookAt.current);
        stopRaceAudio();
      } else {
        // Active race director or manual override
        const totalRaceDist = TOTAL_LAPS * TRACK_P;
        const leaderDist = sortedCars[0]?.totalDistance || 0;
        const leaderProgress = leaderDist / totalRaceDist;
        const isPhotoFinish = manualCamera === 'auto' && leaderProgress > 0.962;

        if (!hasInitializedLaunchCutRef.current && startPhase === 'racing') {
          hasInitializedLaunchCutRef.current = true;
          lastSwitchTimeRef.current = elapsed;
          nextCutIntervalRef.current = 3.2;
          if (manualCamera === 'auto') {
            activeAngleRef.current = 'action';
            activeDriverIdRef.current = sortedCars[0]?.id || null;
            recentAnglesRef.current = ['action'];
            onBroadcastStateChange('action', focusedDriverId || activeDriverIdRef.current);
          }
        }

        let chosenAngle: ActiveBroadcastAngle = activeAngleRef.current;
        if (manualCamera !== 'auto') {
          chosenAngle = manualCamera;
        } else if (isPhotoFinish) {
          chosenAngle = 'finish';
        } else if (elapsed - lastSwitchTimeRef.current > nextCutIntervalRef.current) {
          lastSwitchTimeRef.current = elapsed;

          // Pick focus driver if not locked manually
          if (!focusedDriverId && sortedCars.length > 0) {
            const p1p2Gap = sortedCars.length > 1 ? sortedCars[0].totalDistance - sortedCars[1].totalDistance : 999;
            const p2p3Gap = sortedCars.length > 2 ? sortedCars[1].totalDistance - sortedCars[2].totalDistance : 999;

            if (leaderProgress > 0.72) {
              activeDriverIdRef.current = sortedCars[0].id;
            } else if (p1p2Gap < 18) {
              activeDriverIdRef.current = Math.random() < 0.55 ? sortedCars[1].id : sortedCars[0].id;
            } else if (p2p3Gap < 16) {
              activeDriverIdRef.current = Math.random() < 0.5 ? sortedCars[2].id : sortedCars[1].id;
            } else {
              activeDriverIdRef.current = sortedCars[0].id;
            }
          }

          const currentFocusCar =
            sortedCars.find((c) => c.id === (focusedDriverId || activeDriverIdRef.current)) || sortedCars[0];
          const focusIdx = sortedCars.findIndex((c) => c.id === currentFocusCar?.id);

          // Context-aware TV director angle selection
          const candidates: ActiveBroadcastAngle[] = ['action', 'trackside', 'tv', 'helicopter'];
          if (currentFocusCar?.drsActive || currentFocusCar?.inSlipstream || focusIdx > 0) {
            candidates.push('bumper');
          }
          if (focusIdx === 0 && sortedCars.length > 1 && sortedCars[0].totalDistance - sortedCars[1].totalDistance < 22) {
            candidates.push('rear');
          }

          const filtered = candidates.filter(
            (m) => m !== activeAngleRef.current && !recentAnglesRef.current.slice(-1).includes(m)
          );
          const pool = filtered.length > 0 ? filtered : candidates;
          chosenAngle = pool[Math.floor(Math.random() * pool.length)];

          recentAnglesRef.current.push(chosenAngle);
          if (recentAnglesRef.current.length > 3) recentAnglesRef.current.shift();

          nextCutIntervalRef.current =
            chosenAngle === 'bumper' || chosenAngle === 'rear'
              ? 2.2 + Math.random() * 0.9
              : 3.0 + Math.random() * 1.4;

          if (chosenAngle === 'trackside' && currentFocusCar) {
            const aheadPose = getCircuitPosition(currentFocusCar.totalDistance + 36, 0);
            const side = Math.random() > 0.5 ? 1 : -1;
            tracksidePosRef.current.set(
              aheadPose.x + aheadPose.nx * side * 14,
              4.0 + Math.random() * 1.5,
              aheadPose.z + aheadPose.nz * side * 14
            );
          }
        }

        const resolvedDriverId = focusedDriverId || activeDriverIdRef.current || sortedCars[0]?.id || null;
        const targetCar =
          sortedCars.find((c) => c.id === resolvedDriverId) ||
          sortedCars[0] ||
          leaderPosRef.current || {
            id: '',
            x: 0,
            z: 75,
            angle: 0,
            totalDistance: 0,
            lane: 0,
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

        const dx = Math.cos(targetCar.angle);
        const dz = -Math.sin(targetCar.angle);

        // If user is in manual trackside and car passed far away, re-anchor tripod ahead
        if (chosenAngle === 'trackside') {
          _carWorldPos.set(targetCar.x, 1, targetCar.z);
          if (tracksidePosRef.current.distanceTo(_carWorldPos) > 78) {
            const aheadPose = getCircuitPosition(targetCar.totalDistance + 38, 0);
            const side = (Math.floor(targetCar.totalDistance / 80) % 2 === 0 ? 1 : -1) * 14;
            tracksidePosRef.current.set(
              aheadPose.x + aheadPose.nx * side,
              4.2,
              aheadPose.z + aheadPose.nz * side
            );
          }
        }

        const isAngleCut = chosenAngle !== activeAngleRef.current;
        if (isAngleCut || resolvedDriverId !== activeDriverIdRef.current) {
          activeAngleRef.current = chosenAngle;
          activeDriverIdRef.current = resolvedDriverId;
          onBroadcastStateChange(chosenAngle, resolvedDriverId);
        }

        let dampRate = 7.5;
        let lookDamp = 12;
        const speedNorm = Math.min(1, targetCar.displayKmh / 320);

        switch (chosenAngle) {
          case 'finish': {
            const fp = getCircuitPosition(0, 0);
            _desiredCamPos.set(fp.x + fp.tx * 20 - fp.nx * 10, 4.2, fp.z + fp.tz * 20 - fp.nz * 10);
            _desiredLookAt.set(fp.x - fp.tx * 8, 1.0, fp.z - fp.tz * 8);
            targetFov.current = 38;
            dampRate = 8;
            break;
          }
          case 'trackside': {
            _desiredCamPos.copy(tracksidePosRef.current);
            _desiredLookAt.set(targetCar.x + dx * 4, 1.0, targetCar.z + dz * 4);
            targetFov.current = 32;
            dampRate = 40; // instant tripod placement
            lookDamp = 16;
            break;
          }
          case 'tv': {
            _desiredCamPos.set(targetCar.x - 24 * dx - 16 * dz, 13.5, targetCar.z - 24 * dz + 16 * dx);
            _desiredLookAt.set(targetCar.x + 10 * dx, 1.0, targetCar.z + 10 * dz);
            targetFov.current = 35;
            dampRate = 5.5;
            break;
          }
          case 'helicopter': {
            const orbit = elapsed * 0.38;
            _desiredCamPos.set(
              targetCar.x + Math.sin(orbit) * 26,
              25 + Math.sin(orbit * 0.6) * 2.5,
              targetCar.z + Math.cos(orbit) * 26
            );
            _desiredLookAt.set(targetCar.x + 5 * dx, 0.8, targetCar.z + 5 * dz);
            targetFov.current = 36;
            dampRate = 5;
            break;
          }
          case 'bumper': {
            // F1 T-Cam Onboard over driver helmet & halo
            _desiredCamPos.set(targetCar.x + 0.1 * dx, 1.82, targetCar.z + 0.1 * dz);
            _desiredLookAt.set(targetCar.x + 28 * dx, 0.9, targetCar.z + 28 * dz);
            targetFov.current = 60 + speedNorm * 8;
            dampRate = 45;
            lookDamp = 45;
            break;
          }
          case 'rear': {
            // Rear-facing T-Cam looking back at chasing pack
            _desiredCamPos.set(targetCar.x - 0.55 * dx, 1.9, targetCar.z - 0.55 * dz);
            _desiredLookAt.set(targetCar.x - 26 * dx, 0.95, targetCar.z - 26 * dz);
            targetFov.current = 58;
            dampRate = 45;
            lookDamp = 45;
            break;
          }
          case 'action':
          default: {
            // Dynamic Broadcast Chase Cam with speed-linked FOV widening
            _desiredCamPos.set(
              targetCar.x - 12.2 * dx + 3.2 * dz,
              3.5,
              targetCar.z - 12.2 * dz - 3.2 * dx
            );
            _desiredLookAt.set(targetCar.x + 12 * dx, 1.1, targetCar.z + 12 * dz);
            targetFov.current = 48 + speedNorm * 10 + (targetCar.drsActive ? 3 : 0);
            dampRate = 10;
            lookDamp = 15;
            break;
          }
        }

        if (isAngleCut || currentCamPos.current.distanceTo(_desiredCamPos) > 45) {
          currentCamPos.current.copy(_desiredCamPos);
          currentLookAt.current.copy(_desiredLookAt);
        } else {
          currentCamPos.current.x = THREE.MathUtils.damp(currentCamPos.current.x, _desiredCamPos.x, dampRate, dt);
          currentCamPos.current.y = THREE.MathUtils.damp(currentCamPos.current.y, _desiredCamPos.y, dampRate, dt);
          currentCamPos.current.z = THREE.MathUtils.damp(currentCamPos.current.z, _desiredCamPos.z, dampRate, dt);

          currentLookAt.current.x = THREE.MathUtils.damp(currentLookAt.current.x, _desiredLookAt.x, lookDamp, dt);
          currentLookAt.current.y = THREE.MathUtils.damp(currentLookAt.current.y, _desiredLookAt.y, lookDamp, dt);
          currentLookAt.current.z = THREE.MathUtils.damp(currentLookAt.current.z, _desiredLookAt.z, lookDamp, dt);
        }

        camera.position.copy(currentCamPos.current);
        camera.lookAt(currentLookAt.current);

        // Real-time audio telemetry
        const appState = useAppStore.getState();
        const masterVol = appState.soundEnabled ? appState.masterVolume / 100 : 0;
        if (masterVol > 0 && startPhase === 'racing') {
          _carWorldPos.set(targetCar.x, 1.0, targetCar.z);
          const distToCam = camera.position.distanceTo(_carWorldPos);

          updateRaceEngineAudio(targetCar.displayKmh, distToCam, chosenAngle, dt, masterVol, true);

          const corneringLoad = Math.min(1, (targetCar.curvature / 0.028) * (targetCar.displayKmh / 210));
          updateTireSquealAudio(corneringLoad, targetCar.displayKmh, masterVol);

          if (targetCar.curvature > 0.015 && Math.abs(targetCar.lane) > 0.58 && targetCar.displayKmh > 80) {
            playKerbImpactSound(masterVol);
          }
        } else {
          stopRaceAudio();
        }
      }
    } else {
      stopRaceAudio();
      // Idle orbit over Start Grid or Post-Race Winner celebration
      const celebrateTarget =
        winnerPosRef.current && winnerPosRef.current.totalDistance > 0
          ? winnerPosRef.current
          : leaderPosRef.current && leaderPosRef.current.totalDistance > 0
          ? leaderPosRef.current
          : null;

      if (expectedWinnerId && celebrateTarget) {
        const orbit = elapsed * 0.35;
        _desiredCamPos.set(
          celebrateTarget.x + Math.sin(orbit) * 14,
          5.6,
          celebrateTarget.z + Math.cos(orbit) * 14
        );
        _desiredLookAt.set(celebrateTarget.x, 1.1, celebrateTarget.z);
      } else {
        const gridFocus = getCircuitPosition(-14, 0);
        const orbit = elapsed * 0.14;
        _desiredCamPos.set(
          gridFocus.x + Math.sin(orbit) * 42,
          17 + Math.sin(orbit * 0.7) * 3,
          gridFocus.z + Math.cos(orbit) * 42
        );
        _desiredLookAt.set(gridFocus.x + 8, 1.5, gridFocus.z);
      }

      currentCamPos.current.x = THREE.MathUtils.damp(currentCamPos.current.x, _desiredCamPos.x, 3.5, dt);
      currentCamPos.current.y = THREE.MathUtils.damp(currentCamPos.current.y, _desiredCamPos.y, 3.5, dt);
      currentCamPos.current.z = THREE.MathUtils.damp(currentCamPos.current.z, _desiredCamPos.z, 3.5, dt);
      currentLookAt.current.x = THREE.MathUtils.damp(currentLookAt.current.x, _desiredLookAt.x, 4.5, dt);
      currentLookAt.current.y = THREE.MathUtils.damp(currentLookAt.current.y, _desiredLookAt.y, 4.5, dt);
      currentLookAt.current.z = THREE.MathUtils.damp(currentLookAt.current.z, _desiredLookAt.z, 4.5, dt);

      camera.position.copy(currentCamPos.current);
      camera.lookAt(currentLookAt.current);
    }

    if (persCam.fov !== undefined && Math.abs(persCam.fov - targetFov.current) > 0.08) {
      persCam.fov = THREE.MathUtils.damp(persCam.fov, targetFov.current, 6, dt);
      persCam.updateProjectionMatrix();
    }
  });

  return null;
};
