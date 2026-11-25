import React, { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { RaceTrackStyle } from '../../../types';
import { useAppStore } from '../../../store/useAppStore';
import {
  updateRaceEngineAudio,
  updateTireSquealAudio,
  playKerbImpactSound,
  stopRaceAudio,
} from '../../../utils/audioEngine';
import {
  TOTAL_LAPS,
  getCircuitConfig,
  getCircuitPosition,
  getCelebrationArenaPose,
} from './trackCircuit';
import { LiveRacerTelemetry } from './raceSimulation';

export type ManualCameraMode = 'auto' | 'photofinish' | 'action' | 'bumper' | 'rear' | 'trackside' | 'helicopter' | 'tv';
export type ActiveBroadcastAngle =
  | 'idle'
  | 'grid'
  | 'photofinish'
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
  isReplayActive = false,
  expectedWinnerId,
  positionsRef,
  leaderPosRef,
  winnerPosRef,
  startPhase,
  manualCamera,
  focusedDriverId,
  onBroadcastStateChange,
  trackStyle = 'interlagos',
  simTimeRef,
  timeScaleRef,
}: {
  isSpinning: boolean;
  isReplayActive?: boolean;
  expectedWinnerId?: string;
  positionsRef: React.MutableRefObject<LiveRacerTelemetry[]>;
  leaderPosRef: React.MutableRefObject<LiveRacerTelemetry | null>;
  winnerPosRef: React.MutableRefObject<LiveRacerTelemetry | null>;
  startPhase: string;
  manualCamera: ManualCameraMode;
  focusedDriverId: string | null;
  onBroadcastStateChange: (angle: ActiveBroadcastAngle, targetDriverId: string | null) => void;
  trackStyle?: RaceTrackStyle;
  simTimeRef?: React.MutableRefObject<number>;
  timeScaleRef?: React.MutableRefObject<number>;
}) => {
  const { camera } = useThree();
  const isDaytona = trackStyle === 'daytona';
  const cfg = getCircuitConfig(trackStyle);
  const perimeter = cfg.perimeter;
  const halfW = cfg.trackHalfWidth;
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
    if (!isSpinning && !isReplayActive) {
      activeAngleRef.current = 'idle';
      targetFov.current = 45;
      raceLaunchTimeRef.current = null;
      hasInitializedLaunchCutRef.current = false;
      recentAnglesRef.current = [];
      onBroadcastStateChange('idle', focusedDriverId);
    }
  }, [isSpinning, isReplayActive, focusedDriverId, onBroadcastStateChange]);

  useFrame((state, delta) => {
    const dt = Math.min(0.05, delta);
    const persCam = camera as THREE.PerspectiveCamera;
    const wallElapsed = state.clock.elapsedTime;
    const timeScale = timeScaleRef?.current ?? 1;
    const simElapsed = simTimeRef?.current ?? wallElapsed;
    const isActiveBroadcast = isSpinning || isReplayActive;

    if (!isReplayActive && startPhase === 'racing' && raceLaunchTimeRef.current === null) {
      raceLaunchTimeRef.current = simElapsed;
    } else if (startPhase !== 'racing' && !isReplayActive) {
      raceLaunchTimeRef.current = null;
    }

    const launchElapsed =
      !isReplayActive && startPhase === 'racing' && raceLaunchTimeRef.current !== null
        ? Math.max(0, simElapsed - raceLaunchTimeRef.current)
        : 0;

    if (isActiveBroadcast) {
      const validCars = (positionsRef.current || []).filter((p) => p && p.id);
      const sortedCars = [...validCars].sort((a, b) => b.totalDistance - a.totalDistance);

      // Grid / launch camera during 5-light sequence & first 2.5s of launch (unless replay or manual angle)
      if (
        !isReplayActive &&
        manualCamera === 'auto' &&
        startPhase !== 'idle' &&
        (startPhase !== 'racing' || launchElapsed < 2.5)
      ) {
        hasInitializedLaunchCutRef.current = false;
        const startPose = getCircuitPosition(0, 0, trackStyle);
        const gridCamX = startPose.x + startPose.tx * 16 - startPose.nx * (isDaytona ? 13.5 : 10.5);
        const gridCamZ = startPose.z + startPose.tz * 16 - startPose.nz * (isDaytona ? 13.5 : 10.5);
        _desiredCamPos.set(gridCamX, startPose.y + 3.2, gridCamZ);

        const lookFwd = startPhase === 'racing' ? THREE.MathUtils.lerp(-4, 16, Math.min(1, launchElapsed / 2.5)) : -6;
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
        // Active race director, finish-line winner hold, replay, or manual override
        const totalRaceDist = TOTAL_LAPS * perimeter;
        const leaderDist = sortedCars[0]?.totalDistance || 0;
        const leaderProgress = leaderDist / totalRaceDist;
        const isFinalApproach = !isReplayActive && manualCamera === 'auto' && leaderProgress >= 0.87 && leaderProgress < 0.945;
        const isFinishLineShot = !isReplayActive && manualCamera === 'auto' && leaderProgress >= 0.945;

        if (!hasInitializedLaunchCutRef.current && (startPhase === 'racing' || isReplayActive)) {
          hasInitializedLaunchCutRef.current = true;
          lastSwitchTimeRef.current = simElapsed;
          nextCutIntervalRef.current = 3.0;
          if (manualCamera === 'auto') {
            const initAngle: ActiveBroadcastAngle = isReplayActive ? 'photofinish' : 'action';
            activeAngleRef.current = initAngle;
            activeDriverIdRef.current = expectedWinnerId || sortedCars[0]?.id || null;
            recentAnglesRef.current = [initAngle];
            onBroadcastStateChange(initAngle, focusedDriverId || activeDriverIdRef.current);
          }
        }

        let chosenAngle: ActiveBroadcastAngle = activeAngleRef.current;
        if (manualCamera !== 'auto') {
          chosenAngle = manualCamera;
        } else if (isReplayActive) {
          chosenAngle = 'photofinish';
          const officialWinnerCar =
            (expectedWinnerId ? sortedCars.find((c) => c.id === expectedWinnerId) : undefined) || sortedCars[0];
          if (!focusedDriverId && officialWinnerCar) {
            activeDriverIdRef.current = officialWinnerCar.id;
          }
        } else if (isFinishLineShot) {
          chosenAngle = 'finish';
          const officialWinnerCar =
            (expectedWinnerId && leaderProgress >= 0.96
              ? sortedCars.find((c) => c.id === expectedWinnerId)
              : undefined) || sortedCars[0];
          if (!focusedDriverId && officialWinnerCar) {
            activeDriverIdRef.current = officialWinnerCar.id;
          }
        } else if (isFinalApproach) {
          chosenAngle = 'action';
          if (!focusedDriverId && sortedCars[0]) {
            activeDriverIdRef.current = sortedCars[0].id;
          }
        } else if (simElapsed - lastSwitchTimeRef.current > nextCutIntervalRef.current) {
          lastSwitchTimeRef.current = simElapsed;

          // Pick focus driver if not locked manually (prioritize active P1/P2/P3 lead battles)
          if (!focusedDriverId && sortedCars.length > 0) {
            const p1p2Gap = sortedCars.length > 1 ? sortedCars[0].totalDistance - sortedCars[1].totalDistance : 999;
            const p2p3Gap = sortedCars.length > 2 ? sortedCars[1].totalDistance - sortedCars[2].totalDistance : 999;
            const activeAttacker = sortedCars.find(
              (c, idx) => idx <= 3 && (c.battleState === 'SIDE_BY_SIDE' || c.battleState === 'PULL_OUT')
            );

            if (leaderProgress > 0.66) {
              // Final-lap battle: stay locked on the lead fight (P2 attacking P1 or P1 defending)
              activeDriverIdRef.current =
                p1p2Gap < 22 && Math.random() < 0.65 && sortedCars[1]
                  ? sortedCars[1].id
                  : sortedCars[0].id;
            } else if (activeAttacker) {
              activeDriverIdRef.current = activeAttacker.id;
            } else if (p1p2Gap < 22 && sortedCars[1]) {
              activeDriverIdRef.current = Math.random() < 0.62 ? sortedCars[1].id : sortedCars[0].id;
            } else if (p2p3Gap < 18 && sortedCars[2]) {
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
            candidates.push('bumper', 'action');
          }
          if (focusIdx === 0 && sortedCars.length > 1 && sortedCars[0].totalDistance - sortedCars[1].totalDistance < 26) {
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
              : 2.8 + Math.random() * 1.2;

          if (chosenAngle === 'trackside' && currentFocusCar) {
            const aheadPose = getCircuitPosition(currentFocusCar.totalDistance + 34, 0, trackStyle);
            const side = Math.random() > 0.5 ? 1 : -1;
            const lateralOff = isDaytona ? side * (halfW + 3.0) : side * 15.5;
            const tripodY = isDaytona
              ? side > 0
                ? aheadPose.y + halfW * Math.sin(aheadPose.bankAngle) + 3.6
                : 3.4
              : aheadPose.y + 3.8 + Math.random() * 1.2;
            tracksidePosRef.current.set(
              aheadPose.x + aheadPose.nx * lateralOff * Math.cos(aheadPose.bankAngle),
              tripodY,
              aheadPose.z + aheadPose.nz * lateralOff * Math.cos(aheadPose.bankAngle)
            );
          }
        }

        const resolvedDriverId = focusedDriverId || activeDriverIdRef.current || sortedCars[0]?.id || null;
        const targetCar: LiveRacerTelemetry =
          sortedCars.find((c) => c.id === resolvedDriverId) ||
          sortedCars[0] ||
          leaderPosRef.current || {
            id: '',
            x: isDaytona ? 0 : 25,
            y: isDaytona ? 3.7 : 13.4,
            z: isDaytona ? 148 : 154,
            angle: 0,
            trackAngle: 0,
            pitchAngle: isDaytona ? 0 : 0.05,
            bankAngle: isDaytona ? 0.31 : 0,
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
            const aheadPose = getCircuitPosition(targetCar.totalDistance + 36, 0, trackStyle);
            const side = Math.floor(targetCar.totalDistance / 80) % 2 === 0 ? 1 : -1;
            const lateralOff = isDaytona ? side * (halfW + 3.0) : side * 15.5;
            const tripodY = isDaytona
              ? side > 0
                ? aheadPose.y + halfW * Math.sin(aheadPose.bankAngle) + 3.6
                : 3.4
              : aheadPose.y + 4.0;
            tracksidePosRef.current.set(
              aheadPose.x + aheadPose.nx * lateralOff * Math.cos(aheadPose.bankAngle),
              tripodY,
              aheadPose.z + aheadPose.nz * lateralOff * Math.cos(aheadPose.bankAngle)
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
          case 'photofinish': {
            // Crisp Photo-Finish line camera capturing nose-to-nose separation right across the checkered line
            const fp = getCircuitPosition(0, 0, trackStyle);
            const sideDist = isDaytona ? 14.5 : 11.4;
            _desiredCamPos.set(
              fp.x + fp.tx * 9.5 - fp.nx * sideDist,
              fp.y + 2.5,
              fp.z + fp.tz * 9.5 - fp.nz * sideDist
            );
            const pastLine = targetCar.totalDistance >= totalRaceDist;
            const targetPointDist = pastLine ? 0 : 0.3;
            _desiredLookAt.set(
              THREE.MathUtils.lerp(targetCar.x, fp.x - fp.tx * 2.5, targetPointDist),
              targetCar.y + 0.9,
              THREE.MathUtils.lerp(targetCar.z, fp.z - fp.tz * 2.5, targetPointDist)
            );
            targetFov.current = 34;
            dampRate = 12;
            lookDamp = 16;
            break;
          }
          case 'finish': {
            // Broadcast camera at the checkered finish line locking onto the winner as they cross and pull clear
            const fp = getCircuitPosition(0, 0, trackStyle);
            const sideDist = isDaytona ? 14.0 : 11.0;
            _desiredCamPos.set(
              fp.x + fp.tx * 24 - fp.nx * sideDist,
              fp.y + 3.9,
              fp.z + fp.tz * 24 - fp.nz * sideDist
            );
            const pastLine = targetCar.totalDistance >= totalRaceDist;
            const lookX = pastLine ? targetCar.x + dx * 2 : THREE.MathUtils.lerp(targetCar.x, fp.x - fp.tx * 6, 0.2);
            const lookY = pastLine ? targetCar.y + 0.95 : THREE.MathUtils.lerp(targetCar.y + 0.95, fp.y + 0.9, 0.2);
            const lookZ = pastLine ? targetCar.z + dz * 2 : THREE.MathUtils.lerp(targetCar.z, fp.z - fp.tz * 6, 0.2);
            _desiredLookAt.set(lookX, lookY, lookZ);
            targetFov.current = pastLine ? 35 : 38;
            dampRate = 11;
            lookDamp = 16;
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
              targetCar.y + (isDaytona ? 12.2 : 10.8),
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
            const orbit = simElapsed * 0.38;
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
            const camY = isDaytona ? 1.56 : 1.36;
            _desiredCamPos.set(targetCar.x + 0.08 * dx, targetCar.y + camY, targetCar.z + 0.08 * dz);
            _desiredLookAt.set(
              targetCar.x + 28 * dx,
              targetCar.y + (isDaytona ? 0.95 : 0.82) + slopeSin * 28,
              targetCar.z + 28 * dz
            );
            targetFov.current = 60 + speedNorm * 8;
            dampRate = 45;
            lookDamp = 45;
            break;
          }
          case 'rear': {
            const camY = isDaytona ? 1.58 : 1.42;
            _desiredCamPos.set(targetCar.x - 0.42 * dx, targetCar.y + camY, targetCar.z - 0.42 * dz);
            _desiredLookAt.set(
              targetCar.x - 26 * dx,
              targetCar.y + (isDaytona ? 0.96 : 0.85) - slopeSin * 26,
              targetCar.z - 26 * dz
            );
            targetFov.current = 58;
            dampRate = 45;
            lookDamp = 45;
            break;
          }
          case 'action':
          default: {
            // Dynamic Broadcast Chase Cam with speed-linked FOV widening and slope/bank tracking
            const bankLift = isDaytona ? Math.sin(targetCar.bankAngle || 0) * 1.1 : 0;
            const chaseDist = isDaytona ? 8.3 : 9.2;
            const chaseSide = isDaytona ? 2.0 : 2.3;
            _desiredCamPos.set(
              targetCar.x - chaseDist * cdx + chaseSide * cdz,
              targetCar.y + (isDaytona ? 2.75 : 2.95) + bankLift - slopeSin * 6.5,
              targetCar.z - chaseDist * cdz - chaseSide * cdx
            );
            _desiredLookAt.set(
              targetCar.x + 14 * cdx,
              targetCar.y + 1.0 + slopeSin * 14,
              targetCar.z + 14 * cdz
            );
            targetFov.current = 48 + speedNorm * 10 + (targetCar.drsActive || (isDaytona && targetCar.inSlipstream) ? 3 : 0);
            dampRate = 10;
            lookDamp = 15;
            break;
          }
        }

        if (isAngleCut || currentCamPos.current.distanceTo(_desiredCamPos) > 45 || timeScale === 0) {
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

        // Real-time F1/NASCAR audio telemetry scaled by slow-motion / pause
        const appState = useAppStore.getState();
        const masterVol = appState.soundEnabled ? appState.masterVolume / 100 : 0;
        if (masterVol > 0 && timeScale > 0 && (startPhase === 'racing' || isReplayActive)) {
          _carWorldPos.set(targetCar.x, targetCar.y + 1.0, targetCar.z);
          const distToCam = camera.position.distanceTo(_carWorldPos);
          const pitchScaledKmh = targetCar.displayKmh * (0.64 + 0.36 * timeScale);

          updateRaceEngineAudio(
            pitchScaledKmh,
            distToCam,
            chosenAngle,
            dt,
            isReplayActive ? masterVol * 0.7 : masterVol,
            true,
            targetCar.gear,
            targetCar.rpmRatio,
            targetCar.braking
          );

          const corneringLoad = Math.min(
            1,
            Math.max(Math.abs(targetCar.latAccel) * 0.85, targetCar.brakeIntensity * 0.72)
          );
          updateTireSquealAudio(corneringLoad, pitchScaledKmh, isReplayActive ? masterVol * 0.65 : masterVol);

          if (targetCar.onKerb && targetCar.displayKmh > 80 && !isReplayActive) {
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
        const arena = getCelebrationArenaPose(trackStyle);
        const sweep = Math.sin(wallElapsed * 0.34) * 0.98;
        _desiredCamPos.set(
          arena.x + Math.sin(sweep) * 17.5,
          arena.y + 3.0 + Math.sin(wallElapsed * 0.48) * 0.35,
          arena.z - Math.cos(sweep) * 16.5
        );
        // Keep the donut arena near screen center (well above the compact bottom card) while keeping grandstand fireworks in upper sky
        _desiredLookAt.set(arena.x, arena.y + 0.95, arena.z + 1.5);
        targetFov.current = 54;
      } else {
        const gridFocus = getCircuitPosition(-14, 0, trackStyle);
        const orbit = wallElapsed * 0.14;
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
