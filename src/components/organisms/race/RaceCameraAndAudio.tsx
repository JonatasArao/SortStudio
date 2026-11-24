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
  const currentCamPos = useRef(new THREE.Vector3(-4, 24, 186));
  const currentLookAt = useRef(new THREE.Vector3(25, 14.5, 154));
  const targetFov = useRef(46);

  const activeAngleRef = useRef<ActiveBroadcastAngle>('idle');
  const activeDriverIdRef = useRef<string | null>(null);
  const lastSwitchTimeRef = useRef(0);
  const nextCutIntervalRef = useRef(3.2);
  const raceLaunchTimeRef = useRef<number | null>(null);
  const hasInitializedLaunchCutRef = useRef(false);
  const tracksidePosRef = useRef(new THREE.Vector3(60, 18.5, 170));
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
        const gridCamX = startPose.x + startPose.tx * 16 - startPose.nx * 10.5;
        const gridCamZ = startPose.z + startPose.tz * 16 - startPose.nz * 10.5;
        _desiredCamPos.set(gridCamX, startPose.y + 3.2, gridCamZ);

        const lookFwd = startPhase === 'racing' ? THREE.MathUtils.lerp(-4, 16, Math.min(1, launchElapsed / 2.6)) : -6;
        _desiredLookAt.set(
          startPose.x + startPose.tx * lookFwd,
          startPose.y + 1.35 + startPose.ty * lookFwd,
          startPose.z + startPose.tz * lookFwd
        );
        targetFov.current = 36;

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

          // Pick focus driver if not locked manually (prioritize active overtakes & lead battle)
          if (!focusedDriverId && sortedCars.length > 0) {
            const p1p2Gap = sortedCars.length > 1 ? sortedCars[0].totalDistance - sortedCars[1].totalDistance : 999;
            const p2p3Gap = sortedCars.length > 2 ? sortedCars[1].totalDistance - sortedCars[2].totalDistance : 999;
            const activeAttacker = sortedCars.find(
              (c) => c.battleState === 'SIDE_BY_SIDE' || c.battleState === 'PULL_OUT'
            );

            if (leaderProgress > 0.84) {
              // Final-lap battle: track P2 attacking P1 or P1 defending into the final corner
              activeDriverIdRef.current =
                p1p2Gap < 14 && leaderProgress < 0.96 && Math.random() < 0.55
                  ? sortedCars[1].id
                  : sortedCars[0].id;
            } else if (p1p2Gap < 16) {
              activeDriverIdRef.current = Math.random() < 0.55 ? sortedCars[1].id : sortedCars[0].id;
            } else if (activeAttacker) {
              activeDriverIdRef.current = activeAttacker.id;
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
          if (
            currentFocusCar?.drsActive ||
            currentFocusCar?.inSlipstream ||
            currentFocusCar?.battleState === 'SIDE_BY_SIDE' ||
            focusIdx > 0
          ) {
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
              ? 2.4 + Math.random() * 1.0
              : 3.1 + Math.random() * 1.4;

          if (chosenAngle === 'trackside' && currentFocusCar) {
            const aheadPose = getCircuitPosition(currentFocusCar.totalDistance + 36, 0);
            const side = Math.random() > 0.5 ? 1 : -1;
            tracksidePosRef.current.set(
              aheadPose.x + aheadPose.nx * side * 15.5,
              aheadPose.y + 3.8 + Math.random() * 1.2,
              aheadPose.z + aheadPose.nz * side * 15.5
            );
          }
        }

        const resolvedDriverId = focusedDriverId || activeDriverIdRef.current || sortedCars[0]?.id || null;
        const targetCar: LiveRacerTelemetry =
          sortedCars.find((c) => c.id === resolvedDriverId) ||
          sortedCars[0] ||
          leaderPosRef.current || {
            id: '',
            x: 25,
            y: 13.4,
            z: 154,
            angle: 0,
            trackAngle: 0,
            pitchAngle: 0.05,
            yawAngle: 0,
            totalDistance: 0,
            lane: 0,
            speed: 0,
            displayKmh: 0,
            gear: 1,
            rpmRatio: 0.25,
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

        // True chassis heading for onboard/rear T-cams; slightly yaw-damped heading for chase cam
        const chaseHeading = targetCar.trackAngle + targetCar.yawAngle * 0.45;
        const dx = Math.cos(targetCar.angle);
        const dz = -Math.sin(targetCar.angle);
        const cdx = Math.cos(chaseHeading);
        const cdz = -Math.sin(chaseHeading);

        // If user is in manual trackside and car passed far away, re-anchor tripod ahead
        if (chosenAngle === 'trackside') {
          _carWorldPos.set(targetCar.x, targetCar.y + 1, targetCar.z);
          if (tracksidePosRef.current.distanceTo(_carWorldPos) > 78) {
            const aheadPose = getCircuitPosition(targetCar.totalDistance + 38, 0);
            const side = (Math.floor(targetCar.totalDistance / 80) % 2 === 0 ? 1 : -1) * 15.5;
            tracksidePosRef.current.set(
              aheadPose.x + aheadPose.nx * side,
              aheadPose.y + 4.0,
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
        const speedNorm = Math.min(1, targetCar.displayKmh / 330);
        const slopeSin = Math.sin(targetCar.pitchAngle || 0);

        switch (chosenAngle) {
          case 'finish': {
            const fp = getCircuitPosition(0, 0);
            _desiredCamPos.set(
              fp.x + fp.tx * 20 - fp.nx * 10.5,
              fp.y + 3.9,
              fp.z + fp.tz * 20 - fp.nz * 10.5
            );
            _desiredLookAt.set(fp.x - fp.tx * 12, fp.y + 0.9 - fp.ty * 12, fp.z - fp.tz * 12);
            targetFov.current = 40;
            dampRate = 8;
            break;
          }
          case 'trackside': {
            _desiredCamPos.copy(tracksidePosRef.current);
            _desiredLookAt.set(targetCar.x + dx * 4, targetCar.y + 0.9, targetCar.z + dz * 4);
            targetFov.current = 32;
            dampRate = 40; // instant tripod placement
            lookDamp = 16;
            break;
          }
          case 'tv': {
            _desiredCamPos.set(
              targetCar.x - 19 * cdx - 13 * cdz,
              targetCar.y + 10.8,
              targetCar.z - 19 * cdz + 13 * cdx
            );
            _desiredLookAt.set(
              targetCar.x + 10 * cdx,
              targetCar.y + 0.9 + slopeSin * 10,
              targetCar.z + 10 * cdz
            );
            targetFov.current = 35;
            dampRate = 5.5;
            break;
          }
          case 'helicopter': {
            const orbit = elapsed * 0.38;
            _desiredCamPos.set(
              targetCar.x + Math.sin(orbit) * 24,
              targetCar.y + 22 + Math.sin(orbit * 0.6) * 2.5,
              targetCar.z + Math.cos(orbit) * 24
            );
            _desiredLookAt.set(targetCar.x + 5 * cdx, targetCar.y + 0.8, targetCar.z + 5 * cdz);
            targetFov.current = 37;
            dampRate = 5;
            break;
          }
          case 'bumper': {
            // F1 T-Cam Onboard over driver helmet & halo following 3D track pitch
            _desiredCamPos.set(targetCar.x + 0.08 * dx, targetCar.y + 1.36, targetCar.z + 0.08 * dz);
            _desiredLookAt.set(
              targetCar.x + 28 * dx,
              targetCar.y + 0.82 + slopeSin * 28,
              targetCar.z + 28 * dz
            );
            targetFov.current = 60 + speedNorm * 8;
            dampRate = 45;
            lookDamp = 45;
            break;
          }
          case 'rear': {
            // Rear-facing T-Cam looking back at chasing pack along 3D slope
            _desiredCamPos.set(targetCar.x - 0.42 * dx, targetCar.y + 1.42, targetCar.z - 0.42 * dz);
            _desiredLookAt.set(
              targetCar.x - 26 * dx,
              targetCar.y + 0.85 - slopeSin * 26,
              targetCar.z - 26 * dz
            );
            targetFov.current = 58;
            dampRate = 45;
            lookDamp = 45;
            break;
          }
          case 'action':
          default: {
            // Dynamic Broadcast Chase Cam with speed-linked FOV widening and slope elevation tracking
            _desiredCamPos.set(
              targetCar.x - 9.2 * cdx + 2.3 * cdz,
              targetCar.y + 2.85 - slopeSin * 6.5,
              targetCar.z - 9.2 * cdz - 2.3 * cdx
            );
            _desiredLookAt.set(
              targetCar.x + 14 * cdx,
              targetCar.y + 1.0 + slopeSin * 14,
              targetCar.z + 14 * cdz
            );
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

        // Real-time F1 audio telemetry (gears, RPM curve, downshift overrun, tire load & kerb impacts)
        const appState = useAppStore.getState();
        const masterVol = appState.soundEnabled ? appState.masterVolume / 100 : 0;
        if (masterVol > 0 && startPhase === 'racing') {
          _carWorldPos.set(targetCar.x, targetCar.y + 1.0, targetCar.z);
          const distToCam = camera.position.distanceTo(_carWorldPos);

          updateRaceEngineAudio(
            targetCar.displayKmh,
            distToCam,
            chosenAngle,
            dt,
            masterVol,
            true,
            targetCar.gear,
            targetCar.rpmRatio,
            targetCar.braking
          );

          const corneringLoad = Math.min(
            1,
            Math.max(Math.abs(targetCar.latAccel) * 0.85, targetCar.brakeIntensity * 0.72)
          );
          updateTireSquealAudio(corneringLoad, targetCar.displayKmh, masterVol);

          if (targetCar.onKerb && targetCar.displayKmh > 80) {
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
        const arena = getCircuitPosition(6, 0);
        const sweep = Math.sin(elapsed * 0.34) * 0.98;
        _desiredCamPos.set(
          arena.x + Math.sin(sweep) * 17.5,
          arena.y + 3.0 + Math.sin(elapsed * 0.48) * 0.35,
          arena.z - Math.cos(sweep) * 16.5
        );
        // Keep the donut arena near screen center (well above the compact bottom card) while keeping grandstand fireworks in upper sky
        _desiredLookAt.set(arena.x, arena.y + 0.95, arena.z + 1.5);
        targetFov.current = 54;
      } else {
        const gridFocus = getCircuitPosition(-14, 0);
        const orbit = elapsed * 0.14;
        _desiredCamPos.set(
          gridFocus.x + Math.sin(orbit) * 38,
          gridFocus.y + 15 + Math.sin(orbit * 0.7) * 2.5,
          gridFocus.z + Math.cos(orbit) * 38
        );
        _desiredLookAt.set(gridFocus.x + 8, gridFocus.y + 1.5, gridFocus.z);
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
