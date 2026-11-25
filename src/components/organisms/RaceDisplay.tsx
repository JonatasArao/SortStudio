import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Flag, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store/useAppStore';
import { getSpinTimeRanges } from '../../utils/spinUtils';
import { useWheelData } from '../../hooks/useWheelData';
import { useWheelActions, playRaceDefinedAudio } from '../../hooks/useWheelActions';
import {
  playStartLightBeep,
  playLightsOutGoSound,
  playEngineRevBeep,
  playWinSound,
  stopRaceAudio,
} from '../../utils/audioEngine';
import { RACE_START_DELAY_MS } from '../../constants';
import type { RaceTrackStyle } from '../../types';
import { TOTAL_LAPS, getCircuitConfig } from './race/trackCircuit';
import {
  generateAuthenticRaceSimulation,
  LiveRacerTelemetry,
  SimulatedCar,
} from './race/raceSimulation';
import {
  ProceduralEnvironment,
  CircuitScenery,
  GrandPrixRacer,
  TrackEffectsPool,
  createContactShadowTexture,
} from './race/RaceModels';
import { CelebrationEffects } from './race/CelebrationEffects';
import {
  RaceCameraAndAudio,
  ManualCameraMode,
  ActiveBroadcastAngle,
} from './race/RaceCameraAndAudio';
import {
  RaceHUD,
  FinishBannerState,
  PhotoFinishEntry,
  RacePlaybackSpeed,
  getTimingRowHeight,
} from './race/RaceHUD';

const HIDDEN_FINISH_BANNER: FinishBannerState = {
  phase: 'hidden',
  driverId: '',
  driverName: '',
  color: '#ef4444',
};

function detectSoftwareWebGL(): { supported: boolean; isSoftwareGl: boolean } {
  if (typeof document === 'undefined') return { supported: true, isSoftwareGl: false };
  try {
    const probeCanvas = document.createElement('canvas');
    const gl =
      (probeCanvas.getContext('webgl2') as WebGL2RenderingContext | null) ||
      (probeCanvas.getContext('webgl') as WebGLRenderingContext | null);
    if (!gl) return { supported: false, isSoftwareGl: true };
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    const isSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    return { supported: true, isSoftwareGl };
  } catch {
    return { supported: false, isSoftwareGl: true };
  }
}

const LeaderboardBridge = ({
  slices,
  positionsRef,
  leaderPosRef,
  isSpinning,
  isReplayActive,
  replayEpoch,
  startPhase,
  activeWinnerId,
  focusedDriverId,
  broadcastDriverId,
  standingsOrderRef,
  trackStyle = 'interlagos',
}: {
  slices: { item: { id: string; text: string }; color: string }[];
  positionsRef: React.MutableRefObject<LiveRacerTelemetry[]>;
  leaderPosRef: React.MutableRefObject<LiveRacerTelemetry | null>;
  isSpinning: boolean;
  isReplayActive: boolean;
  replayEpoch: number;
  startPhase: string;
  activeWinnerId?: string;
  focusedDriverId: string | null;
  broadcastDriverId: string | null;
  standingsOrderRef: React.MutableRefObject<string[]>;
  trackStyle?: RaceTrackStyle;
}) => {
  const { t } = useTranslation();
  const finishOrderRef = useRef<string[]>([]);
  const lastDomSyncRef = useRef(0);
  const trackPerimeter = getCircuitConfig(trackStyle).perimeter;
  const isDaytona = trackStyle === 'daytona';
  const rowHeight = getTimingRowHeight(slices.length);

  const lapWord = t('race.lap', 'VOLTA');
  const finishedWord = t('race.finished', 'FIM');
  const finishBadge = t('race.finish_badge', 'FIM');

  useEffect(() => {
    finishOrderRef.current = [];
  }, [replayEpoch, isReplayActive]);

  useEffect(() => {
    if ((isSpinning || !activeWinnerId) && !isReplayActive) {
      finishOrderRef.current = [];
      slices.forEach((slice, rank) => {
        const row = document.getElementById(`leaderboard-racer-${slice.item.id}`);
        const rankEl = document.getElementById(`leaderboard-rank-${slice.item.id}`);
        const aeroEl = document.getElementById(`leaderboard-aero-${slice.item.id}`);
        const gapEl = document.getElementById(`leaderboard-gap-${slice.item.id}`);
        if (row) {
          row.style.transform = `translateY(${rank * rowHeight}px)`;
          row.style.opacity = '1';
        }
        if (rankEl) {
          rankEl.textContent = String(rank + 1);
          rankEl.className = isDaytona
            ? rank === 0
              ? 'w-5 h-5 flex items-center justify-center text-[11px] font-mono tabular-nums font-extrabold shrink-0 rounded-xs bg-[#FACC15] text-slate-950 -skew-x-6'
              : 'w-5 h-5 flex items-center justify-center text-[11px] font-mono tabular-nums font-extrabold shrink-0 rounded-xs bg-[#1a202e] text-slate-200 -skew-x-6'
            : rank === 0
            ? 'w-5 h-5 flex items-center justify-center text-[11px] font-mono tabular-nums font-extrabold shrink-0 rounded-xs bg-white text-slate-950'
            : 'w-5 h-5 flex items-center justify-center text-[11px] font-mono tabular-nums font-bold shrink-0 rounded-xs text-slate-300';
        }
        if (aeroEl) aeroEl.textContent = '';
        if (gapEl) gapEl.textContent = '';
      });
      const lapEl = document.getElementById('gp-lap-display');
      if (lapEl) {
        lapEl.textContent = `${lapWord} 1/${TOTAL_LAPS}`;
        lapEl.className = isDaytona ? 'text-[#FACC15] whitespace-nowrap' : 'text-white whitespace-nowrap';
      }
      const sectorEl = document.getElementById('gp-sector-display');
      if (sectorEl) sectorEl.textContent = 'S1';
      const flagSwatch = document.getElementById('gp-flag-swatch');
      const flagText = document.getElementById('gp-flag-text');
      if (flagSwatch) flagSwatch.className = 'w-2.5 h-2 rounded-xs bg-slate-500 shrink-0';
      if (flagText) {
        flagText.textContent = isDaytona ? 'GRID DAYTONA' : 'GRID DE LARGADA';
        flagText.className = 'font-bold text-slate-300 truncate';
      }
    }
  }, [isSpinning, isReplayActive, activeWinnerId, slices, lapWord, isDaytona, rowHeight]);

  useFrame((state) => {
    if (!positionsRef.current || positionsRef.current.length === 0) return;
    // Throttle DOM mutations to ~20Hz for smooth main-thread performance
    if (state.clock.elapsedTime - lastDomSyncRef.current < 0.05) return;
    lastDomSyncRef.current = state.clock.elapsedTime;

    const finishLine = TOTAL_LAPS * trackPerimeter;

    const racers = slices.map((slice, idx) => {
      const tel = positionsRef.current[idx];
      const dist = tel ? tel.totalDistance : 0;
      if ((isSpinning || isReplayActive) && dist >= finishLine && !finishOrderRef.current.includes(slice.item.id)) {
        finishOrderRef.current.push(slice.item.id);
      } else if (isReplayActive && dist < finishLine) {
        const existingIdx = finishOrderRef.current.indexOf(slice.item.id);
        if (existingIdx !== -1) finishOrderRef.current.splice(existingIdx, 1);
      }
      return {
        id: slice.item.id,
        text: slice.item.text,
        color: slice.color,
        dist,
        tel,
      };
    });

    racers.sort((a, b) => {
      const aFin = finishOrderRef.current.indexOf(a.id);
      const bFin = finishOrderRef.current.indexOf(b.id);
      if (aFin !== -1 && bFin !== -1) return aFin - bFin;
      if (aFin !== -1) return -1;
      if (bFin !== -1) return 1;
      return b.dist - a.dist;
    });

    standingsOrderRef.current = racers.map((r) => r.id);

    const leaderDist = racers[0]?.dist || 0;

    racers.forEach((r, rank) => {
      const row = document.getElementById(`leaderboard-racer-${r.id}`);
      const rankEl = document.getElementById(`leaderboard-rank-${r.id}`);
      const aeroEl = document.getElementById(`leaderboard-aero-${r.id}`);
      const gapEl = document.getElementById(`leaderboard-gap-${r.id}`);
      const hasFinished = finishOrderRef.current.includes(r.id);

      if (row) {
        row.style.transform = `translateY(${rank * rowHeight}px)`;
        row.style.opacity = hasFinished && rank > 0 ? '0.68' : '1';
      }
      if (rankEl) {
        rankEl.textContent = String(rank + 1);
        if (hasFinished && rank === 0) {
          rankEl.className = isDaytona
            ? 'w-5 h-5 flex items-center justify-center text-[11px] font-mono tabular-nums font-extrabold shrink-0 rounded-xs bg-amber-400 text-slate-950 -skew-x-6'
            : 'w-5 h-5 flex items-center justify-center text-[11px] font-mono tabular-nums font-extrabold shrink-0 rounded-xs bg-amber-400 text-slate-950';
        } else if (isDaytona) {
          rankEl.className =
            rank === 0
              ? 'w-5 h-5 flex items-center justify-center text-[11px] font-mono tabular-nums font-extrabold shrink-0 rounded-xs bg-[#FACC15] text-slate-950 -skew-x-6'
              : 'w-5 h-5 flex items-center justify-center text-[11px] font-mono tabular-nums font-extrabold shrink-0 rounded-xs bg-[#1a202e] text-slate-200 -skew-x-6';
        } else {
          rankEl.className =
            rank === 0
              ? 'w-5 h-5 flex items-center justify-center text-[11px] font-mono tabular-nums font-extrabold shrink-0 rounded-xs bg-white text-slate-950'
              : 'w-5 h-5 flex items-center justify-center text-[11px] font-mono tabular-nums font-bold shrink-0 rounded-xs text-slate-300';
        }
      }

      if (aeroEl) {
        if (hasFinished) {
          aeroEl.textContent = rank === 0 ? '★ 1º' : finishBadge;
          aeroEl.className =
            rank === 0
              ? 'text-[9px] font-mono font-extrabold tracking-wider uppercase text-amber-400 shrink-0 whitespace-nowrap'
              : 'text-[9px] font-mono font-bold tracking-wider uppercase text-emerald-400 shrink-0 whitespace-nowrap';
        } else if (!isDaytona && r.tel?.drsActive) {
          aeroEl.textContent = 'DRS';
          aeroEl.className = 'text-[9px] font-mono font-bold tracking-wider uppercase text-emerald-400 shrink-0 whitespace-nowrap';
        } else if (isDaytona && r.tel?.battleState === 'SIDE_BY_SIDE') {
          aeroEl.textContent = '2-WIDE';
          aeroEl.className = 'text-[9px] font-mono font-extrabold tracking-wider uppercase text-[#FACC15] shrink-0 whitespace-nowrap';
        } else if (r.tel?.inSlipstream) {
          aeroEl.textContent = 'VÁCUO';
          aeroEl.className = 'text-[9px] font-mono font-bold tracking-wider uppercase text-sky-400 shrink-0 whitespace-nowrap';
        } else if (isDaytona && r.tel?.battleState === 'PULL_OUT') {
          aeroEl.textContent = 'ATAQUE';
          aeroEl.className = 'text-[9px] font-mono font-bold tracking-wider uppercase text-orange-400 shrink-0 whitespace-nowrap';
        } else {
          aeroEl.textContent = '';
        }
      }

      const podiumEntry = (hasFinished || (!isSpinning && !isReplayActive && Boolean(activeWinnerId)))
        ? useAppStore.getState().racePodium?.find((p) => p.id === r.id)
        : undefined;

      if (gapEl) {
        if (!isSpinning && !isReplayActive && !activeWinnerId) {
          gapEl.textContent = '';
        } else if (podiumEntry && typeof podiumEntry.finishTimeSeconds === 'number') {
          if (rank === 0) {
            gapEl.textContent = `${podiumEntry.finishTimeSeconds.toFixed(2)}s`;
            gapEl.className = 'text-[10px] font-mono tabular-nums text-amber-400 font-bold shrink-0 min-w-[46px] text-right whitespace-nowrap';
          } else {
            const g = typeof podiumEntry.gapSeconds === 'number' ? podiumEntry.gapSeconds : 0;
            gapEl.textContent = `+${g.toFixed(2)}s`;
            gapEl.className = 'text-[10px] font-mono tabular-nums text-slate-300 shrink-0 min-w-[46px] text-right whitespace-nowrap';
          }
        } else if (rank === 0) {
          gapEl.textContent = 'LÍDER';
          gapEl.className = `text-[10px] font-mono tabular-nums font-bold shrink-0 min-w-[46px] text-right whitespace-nowrap ${
            isDaytona ? 'text-[#FACC15]' : 'text-amber-400'
          }`;
        } else {
          const deltaM = Math.max(0, leaderDist - r.dist);
          gapEl.textContent = `+${deltaM.toFixed(0)}m`;
          gapEl.className = 'text-[10px] font-mono tabular-nums text-slate-400 shrink-0 min-w-[46px] text-right whitespace-nowrap';
        }
      }
    });

    // Update Lap, Sector & Official Broadcast Flag Indicator
    const lapEl = document.getElementById('gp-lap-display');
    const sectorEl = document.getElementById('gp-sector-display');
    const flagSwatch = document.getElementById('gp-flag-swatch');
    const flagText = document.getElementById('gp-flag-text');
    const leaderTel = leaderPosRef.current || racers[0]?.tel;
    const currentLap = leaderTel
      ? Math.min(TOTAL_LAPS, Math.max(1, Math.floor(Math.max(0, leaderTel.totalDistance) / trackPerimeter) + 1))
      : 1;
    const hasLeaderCrossed = Boolean(leaderTel && leaderTel.totalDistance >= finishLine);

    if (lapEl && leaderTel) {
      if (hasLeaderCrossed) {
        lapEl.textContent = finishedWord;
        lapEl.className = 'text-emerald-400 whitespace-nowrap';
      } else {
        lapEl.textContent = `${lapWord} ${currentLap}/${TOTAL_LAPS}`;
        lapEl.className = isDaytona ? 'text-[#FACC15] whitespace-nowrap' : 'text-white whitespace-nowrap';
      }
    }
    if (sectorEl && leaderTel) {
      sectorEl.textContent = hasLeaderCrossed ? 'FIN' : `S${leaderTel.sector}`;
    }
    if (flagSwatch && flagText) {
      if (!isSpinning && !isReplayActive && !activeWinnerId) {
        flagSwatch.className = 'w-2.5 h-2 rounded-xs bg-slate-500 shrink-0';
        flagText.textContent = isDaytona ? 'GRID DAYTONA' : 'GRID DE LARGADA';
        flagText.className = 'font-bold text-slate-300 truncate';
      } else if (isReplayActive) {
        flagSwatch.className = hasLeaderCrossed
          ? 'w-2.5 h-2 rounded-xs bg-amber-400 shrink-0'
          : 'w-2.5 h-2 rounded-xs bg-sky-400 shrink-0';
        flagText.textContent = hasLeaderCrossed ? 'FOTO-FINISH' : 'REPLAY';
        flagText.className = hasLeaderCrossed ? 'font-extrabold text-amber-400 truncate' : 'font-bold text-sky-400 truncate';
      } else if (isSpinning && startPhase !== 'racing') {
        flagSwatch.className = isDaytona
          ? 'w-2.5 h-2 rounded-xs bg-[#FACC15] shrink-0'
          : 'w-2.5 h-2 rounded-xs bg-[#E10600] shrink-0';
        flagText.textContent = isDaytona ? 'ALINHAMENTO' : 'PROCEDIMENTO';
        flagText.className = isDaytona ? 'font-bold text-[#FACC15] truncate' : 'font-bold text-red-400 truncate';
      } else if (hasLeaderCrossed) {
        flagSwatch.className = 'w-2.5 h-2 rounded-xs bg-amber-400 shrink-0';
        flagText.textContent = 'QUADRICULADA';
        flagText.className = 'font-extrabold text-amber-400 truncate';
      } else if (currentLap >= TOTAL_LAPS) {
        flagSwatch.className = 'w-2.5 h-2 rounded-xs bg-white shrink-0';
        flagText.textContent = isDaytona ? 'BAND. BRANCA' : 'VOLTA FINAL';
        flagText.className = 'font-extrabold text-white truncate';
      } else {
        flagSwatch.className = 'w-2.5 h-2 rounded-xs bg-emerald-500 shrink-0';
        flagText.textContent = isDaytona ? 'BAND. VERDE' : 'PISTA LIVRE';
        flagText.className = 'font-bold text-emerald-400 truncate';
      }
    }

    // Update Bottom Telemetry Bar for Focused Driver
    const targetId = focusedDriverId || broadcastDriverId || racers[0]?.id;
    const focusIdx = racers.findIndex((r) => r.id === targetId);
    const focusRacer = racers[focusIdx >= 0 ? focusIdx : 0];
    if (focusRacer) {
      const tel = focusRacer.tel;
      const posRank = focusIdx >= 0 ? focusIdx + 1 : 1;

      const posEl = document.getElementById('onboard-driver-pos');
      if (posEl) posEl.textContent = `P${posRank}`;

      const colorEl = document.getElementById('onboard-driver-color');
      if (colorEl) colorEl.style.backgroundColor = focusRacer.color;

      const nameEl = document.getElementById('onboard-driver-name');
      if (nameEl && nameEl.textContent !== focusRacer.text) {
        nameEl.textContent = focusRacer.text;
      }

      const aeroEl = document.getElementById('onboard-aero-state');
      if (aeroEl) {
        if (!isDaytona && tel?.drsActive) {
          aeroEl.textContent = '· DRS ATIVO';
          aeroEl.className = 'hidden sm:inline-block text-[10px] font-mono font-bold tracking-wider uppercase text-emerald-400 whitespace-nowrap';
        } else if (isDaytona && tel?.battleState === 'SIDE_BY_SIDE') {
          aeroEl.textContent = '· LADO A LADO';
          aeroEl.className = 'hidden sm:inline-block text-[10px] font-mono font-extrabold tracking-wider uppercase text-[#FACC15] whitespace-nowrap';
        } else if (tel?.inSlipstream) {
          aeroEl.textContent = '· NO VÁCUO';
          aeroEl.className = 'hidden sm:inline-block text-[10px] font-mono font-bold tracking-wider uppercase text-sky-400 whitespace-nowrap';
        } else if (isDaytona && tel?.battleState === 'PULL_OUT') {
          aeroEl.textContent = '· ATAQUE';
          aeroEl.className = 'hidden sm:inline-block text-[10px] font-mono font-bold tracking-wider uppercase text-orange-400 whitespace-nowrap';
        } else if (tel?.braking) {
          aeroEl.textContent = '· FRENAGEM';
          aeroEl.className = 'hidden sm:inline-block text-[10px] font-mono font-bold tracking-wider uppercase text-red-400 whitespace-nowrap';
        } else {
          aeroEl.textContent = '';
        }
      }

      const kmh = tel ? tel.displayKmh : 0;
      const speedEl = document.getElementById('onboard-driver-speed');
      if (speedEl) speedEl.textContent = `${kmh} KM/H`;

      const gearEl = document.getElementById('onboard-driver-gear');
      if (gearEl) gearEl.textContent = String(tel ? tel.gear : 1);

      const gapEl = document.getElementById('onboard-driver-gap');
      if (gapEl) {
        if (posRank === 1) {
          const leadGap = racers.length > 1 ? Math.max(0, racers[0].dist - racers[1].dist) : 0;
          gapEl.textContent = `+${leadGap.toFixed(1)}m`;
          gapEl.className = 'text-[11px] font-bold text-emerald-400 hidden sm:inline min-w-[46px] text-right whitespace-nowrap';
        } else {
          const behindGap = Math.max(0, racers[0].dist - focusRacer.dist);
          gapEl.textContent = `-${behindGap.toFixed(1)}m`;
          gapEl.className = 'text-[11px] font-bold text-amber-400 hidden sm:inline min-w-[46px] text-right whitespace-nowrap';
        }
      }

      // GPU-composited Throttle & Brake bar scales
      const throttleEl = document.getElementById('onboard-throttle-fill');
      const brakeEl = document.getElementById('onboard-brake-fill');
      let throttleFrac = 0;
      let brakeFrac = 0;
      if (isSpinning && startPhase === 'lights_hold') {
        throttleFrac = 0.78;
        brakeFrac = 1;
      } else if (isSpinning && startPhase !== 'racing') {
        throttleFrac = 0;
        brakeFrac = 1;
      } else if (tel && startPhase === 'racing') {
        brakeFrac = Math.min(1, Math.max(0, tel.brakeIntensity));
        if (brakeFrac > 0.16) {
          throttleFrac = 0;
        } else if (tel.speed > 1) {
          throttleFrac = Math.min(
            1,
            Math.max(0.38, 0.62 + tel.longAccel * 0.45 + (tel.drsActive || tel.inSlipstream ? 0.15 : 0))
          );
        }
      }
      if (throttleEl) throttleEl.style.transform = `scaleX(${throttleFrac.toFixed(2)})`;
      if (brakeEl) brakeEl.style.transform = `scaleX(${brakeFrac.toFixed(2)})`;

      // Realistic Shift-Light / Tachometer LED Array driven by gear rpmRatio
      const rpmVal =
        startPhase === 'lights_hold'
          ? 0.85
          : tel && tel.speed > 2
            ? tel.rpmRatio
            : 0;
      const activeLeds = Math.round(Math.min(1, Math.max(0, rpmVal)) * 8);
      for (let i = 0; i < 8; i++) {
        const led = document.getElementById(`rpm-led-${i}`);
        if (led) {
          if (i < activeLeds) {
            if (isDaytona) {
              led.style.backgroundColor = i < 4 ? '#22c55e' : i < 6 ? '#FACC15' : '#ef4444';
            } else {
              led.style.backgroundColor = i < 3 ? '#22c55e' : i < 6 ? '#ef4444' : '#38bdf8';
            }
          } else {
            led.style.backgroundColor = '#1e293b';
          }
        }
      }
    }
  });

  return null;
};

const RaceScene = ({
  slices,
  validItems,
  startPhase,
  lightsCount,
  isLightsOut,
  manualCamera,
  focusedDriverId,
  broadcastDriverId,
  onBroadcastStateChange,
  onFinishBannerChange,
  standingsOrderRef,
  isSoftwareGl,
  playbackSpeed,
  isPaused,
  isReplayActive,
  replaySeekRequest,
  onFinishHoldComplete,
  onReplayTimeUpdate,
  onReplayReachedEnd,
}: {
  slices: { item: { id: string; text: string; sound?: string }; color: string }[];
  validItems: any[];
  startPhase: string;
  lightsCount: number;
  isLightsOut: boolean;
  manualCamera: ManualCameraMode;
  focusedDriverId: string | null;
  broadcastDriverId: string | null;
  onBroadcastStateChange: (angle: ActiveBroadcastAngle, targetDriverId: string | null) => void;
  onFinishBannerChange: (next: FinishBannerState) => void;
  standingsOrderRef: React.MutableRefObject<string[]>;
  isSoftwareGl: boolean;
  playbackSpeed: RacePlaybackSpeed;
  isPaused: boolean;
  isReplayActive: boolean;
  replaySeekRequest: { progress: number; seq: number } | null;
  onFinishHoldComplete: () => void;
  onReplayTimeUpdate: (progress: number, elapsedInClip: number, clipDuration: number) => void;
  onReplayReachedEnd: () => void;
}) => {
  const isSpinning = useAppStore((s) => s.isSpinning);
  const expectedWinnerId = useAppStore((s) => s.expectedWinnerId);
  const winner = useAppStore((s) => s.winner);
  const spinTime = useAppStore((s) => s.spinTime);
  const eliminationMode = useAppStore((s) => s.eliminationMode);
  const eliminationSpinTime = useAppStore((s) => s.eliminationSpinTime);
  const racePodium = useAppStore((s) => s.racePodium);
  const raceSimulationCars = useAppStore((s) => s.raceSimulationCars);
  const pendingRaceDraw = useAppStore((s) => s.pendingRaceDraw);
  const raceTrackStyle = useAppStore((s) => s.raceTrackStyle);
  const textSize = useAppStore((s) => s.textSize);
  const isDaytona = raceTrackStyle === 'daytona';

  const { stopContinuousAudio } = useWheelActions();

  const isFinalRound = eliminationMode && validItems.length === 2;
  const activeWinnerId = isSpinning || winner || isReplayActive ? winner?.id || expectedWinnerId : undefined;

  let actualSpinTime = isFinalRound ? spinTime : eliminationMode ? eliminationSpinTime : spinTime;
  const spinRange = getSpinTimeRanges('race', !isFinalRound && eliminationMode);
  actualSpinTime = Math.max(spinRange.min, Math.min(spinRange.max, actualSpinTime));
  const durationSeconds = actualSpinTime;

  const racerPositionsRef = useRef<LiveRacerTelemetry[]>([]);
  const leaderPosRef = useRef<LiveRacerTelemetry | null>(null);
  const winnerPosRef = useRef<LiveRacerTelemetry | null>(null);
  const lastBannerKeyRef = useRef<string>('hidden');
  const hasPlayedWinSoundRef = useRef(false);
  const hasStoppedAudioRef = useRef(false);
  const hasCompletedHoldRef = useRef(false);
  const lastReplaySyncRef = useRef(0);
  const hasNotifiedReplayEndRef = useRef(false);

  const simTimeRef = useRef(0);
  const timeScaleRef = useRef(1);
  timeScaleRef.current = isPaused ? 0 : playbackSpeed;

  const [simData, setSimData] = useState<SimulatedCar[] | null>(null);

  const shadowTex = useMemo(() => createContactShadowTexture(), []);
  useEffect(() => {
    return () => {
      shadowTex.dispose();
    };
  }, [shadowTex]);

  const winnerCrossTime =
    pendingRaceDraw?.winnerCrossTime ??
    racePodium?.[0]?.finishTimeSeconds ??
    durationSeconds;
  const lastCrossTime =
    pendingRaceDraw?.lastCrossTime ??
    racePodium?.[racePodium.length - 1]?.finishTimeSeconds ??
    winnerCrossTime + 0.5;
  const finishHoldEndTime = Math.max(
    winnerCrossTime + 2.4,
    Math.min(lastCrossTime + 0.65, winnerCrossTime + 3.2)
  );
  const replayStart = Math.max(0, winnerCrossTime - 3.6);
  const replayEnd = winnerCrossTime + 1.5;
  const replayDuration = Math.max(0.5, replayEnd - replayStart);

  const topThreePhotoFinish = useMemo<PhotoFinishEntry[]>(() => {
    return (racePodium || []).slice(0, 3).map((p) => ({
      id: p.id,
      name: p.text,
      color: p.color,
      rank: p.rank,
      finishTimeSeconds: p.finishTimeSeconds,
      gapSeconds: p.gapSeconds,
    }));
  }, [racePodium]);

  const prevSpinningRef = useRef(false);
  useEffect(() => {
    if (isSpinning) {
      if (!prevSpinningRef.current) {
        hasPlayedWinSoundRef.current = false;
        hasStoppedAudioRef.current = false;
        hasCompletedHoldRef.current = false;
        racerPositionsRef.current = [];
        leaderPosRef.current = null;
        winnerPosRef.current = null;
        simTimeRef.current = 0;
        lastBannerKeyRef.current = 'hidden';
        onFinishBannerChange(HIDDEN_FINISH_BANNER);
      }
      prevSpinningRef.current = true;
      if (raceSimulationCars && raceSimulationCars.length === slices.length) {
        setSimData(raceSimulationCars);
      } else {
        const winnerId = racePodium?.find((p) => p.rank === 1)?.id || expectedWinnerId;
        const generated = generateAuthenticRaceSimulation(slices, durationSeconds, winnerId, raceTrackStyle);
        setSimData(generated.cars);
      }
    } else if (isReplayActive) {
      prevSpinningRef.current = false;
      if (raceSimulationCars && raceSimulationCars.length > 0) {
        setSimData(raceSimulationCars);
      }
    } else {
      prevSpinningRef.current = false;
      lastBannerKeyRef.current = 'hidden';
      onFinishBannerChange(HIDDEN_FINISH_BANNER);
      if (!winner) {
        setSimData(null);
      }
    }
  }, [isSpinning, isReplayActive, winner, slices, durationSeconds, racePodium, raceSimulationCars, expectedWinnerId, raceTrackStyle, onFinishBannerChange]);

  // Initialize or seek Replay clock
  useEffect(() => {
    if (isReplayActive) {
      simTimeRef.current = replayStart;
      hasNotifiedReplayEndRef.current = false;
      onReplayTimeUpdate(0, 0, replayDuration);

      const officialId = activeWinnerId || racePodium?.[0]?.id;
      const winSlice = slices.find((s) => s.item.id === officialId) || slices[0];
      if (winSlice) {
        const marginSeconds = racePodium && racePodium.length > 1 ? racePodium[1]?.gapSeconds : undefined;
        lastBannerKeyRef.current = `replay:${winSlice.item.id}`;
        onFinishBannerChange({
          phase: 'crossed',
          driverId: winSlice.item.id,
          driverName: winSlice.item.text,
          color: winSlice.color,
          marginSeconds,
          topThree: topThreePhotoFinish,
        });
      }
    }
  }, [isReplayActive, replayStart, replayDuration, activeWinnerId, racePodium, slices, topThreePhotoFinish, onFinishBannerChange, onReplayTimeUpdate]);

  useEffect(() => {
    if (isReplayActive && replaySeekRequest) {
      const clampedProg = Math.max(0, Math.min(1, replaySeekRequest.progress));
      simTimeRef.current = replayStart + clampedProg * replayDuration;
      hasNotifiedReplayEndRef.current = false;
      onReplayTimeUpdate(clampedProg, clampedProg * replayDuration, replayDuration);
    }
  }, [isReplayActive, replaySeekRequest, replayStart, replayDuration, onReplayTimeUpdate]);

  // Authoritative simulation time-stepping inside 60fps R3F frame loop
  useFrame((state, delta) => {
    const dt = Math.min(0.05, delta);
    const scale = isPaused ? 0 : playbackSpeed;
    timeScaleRef.current = scale;

    if (isSpinning && startPhase === 'racing') {
      simTimeRef.current += dt * scale;
      if (!hasCompletedHoldRef.current && pendingRaceDraw && simTimeRef.current >= finishHoldEndTime) {
        hasCompletedHoldRef.current = true;
        onFinishHoldComplete();
      }
    } else if (isReplayActive) {
      const nextTime = Math.min(replayEnd, Math.max(replayStart, simTimeRef.current + dt * scale));
      simTimeRef.current = nextTime;
      const prog = Math.max(0, Math.min(1, (nextTime - replayStart) / replayDuration));

      if (state.clock.elapsedTime - lastReplaySyncRef.current >= 0.06) {
        lastReplaySyncRef.current = state.clock.elapsedTime;
        onReplayTimeUpdate(prog, nextTime - replayStart, replayDuration);
      }

      if (nextTime >= replayEnd && !hasNotifiedReplayEndRef.current) {
        hasNotifiedReplayEndRef.current = true;
        onReplayTimeUpdate(1, replayDuration, replayDuration);
        onReplayReachedEnd();
      }
    }
  });

  const FINISH_LINE_DIST = TOTAL_LAPS * getCircuitConfig(raceTrackStyle).perimeter;

  const handleUpdatePosition = useCallback(
    (index: number, telemetry: LiveRacerTelemetry, racerId: string) => {
      racerPositionsRef.current[index] = telemetry;
      if (activeWinnerId && racerId === activeWinnerId) {
        winnerPosRef.current = telemetry;
      }

      if (isSpinning) {
        let maxD = -Infinity;
        let leader: LiveRacerTelemetry | null = null;
        for (let i = 0; i < racerPositionsRef.current.length; i++) {
          const t = racerPositionsRef.current[i];
          if (t && t.totalDistance > maxD) {
            maxD = t.totalDistance;
            leader = t;
          }
        }
        leaderPosRef.current = leader;

        const leaderProgress = leader && FINISH_LINE_DIST > 0 ? leader.totalDistance / FINISH_LINE_DIST : 0;

        if (startPhase === 'racing' && leader) {
          if (leader.totalDistance >= FINISH_LINE_DIST) {
            const officialId = activeWinnerId || leader.id;
            const winSlice = slices.find((s) => s.item.id === officialId) || slices.find((s) => s.item.id === leader.id);
            const bannerKey = `crossed:${officialId}`;
            if (winSlice && lastBannerKeyRef.current !== bannerKey) {
              lastBannerKeyRef.current = bannerKey;
              const livePodium = useAppStore.getState().racePodium;
              const marginSeconds = livePodium && livePodium.length > 1 ? livePodium[1]?.gapSeconds : undefined;
              onFinishBannerChange({
                phase: 'crossed',
                driverId: winSlice.item.id,
                driverName: winSlice.item.text,
                color: winSlice.color,
                marginSeconds,
                topThree: (livePodium || []).slice(0, 3).map((p) => ({
                  id: p.id,
                  name: p.text,
                  color: p.color,
                  rank: p.rank,
                  finishTimeSeconds: p.finishTimeSeconds,
                  gapSeconds: p.gapSeconds,
                })),
              });
            }
          } else if (leaderProgress >= 0.87) {
            const leadSlice = slices.find((s) => s.item.id === leader.id);
            const bannerKey = `final_stretch:${leader.id}`;
            if (leadSlice && lastBannerKeyRef.current !== bannerKey) {
              lastBannerKeyRef.current = bannerKey;
              onFinishBannerChange({
                phase: 'final_stretch',
                driverId: leadSlice.item.id,
                driverName: leadSlice.item.text,
                color: leadSlice.color,
              });
            }
          }

          if (!hasPlayedWinSoundRef.current && leader.totalDistance >= FINISH_LINE_DIST) {
            hasPlayedWinSoundRef.current = true;
            const state = useAppStore.getState();
            const vol = state.soundEnabled ? state.masterVolume / 100 : 0;
            if (vol > 0) {
              const winSlice = slices.find((s) => s.item.id === activeWinnerId) || slices[0];
              const customSound = winSlice?.item?.sound;
              if (customSound && customSound !== '') {
                const foundCustom = state.customWinAudios.find((a) => a.id === customSound) || null;
                playWinSound(0.6, customSound, foundCustom, vol);
              } else {
                const genericCustom = state.customWinAudios.find((a) => a.id === state.winSoundType) || null;
                playWinSound(0.6, state.winSoundType, genericCustom, vol);
              }
              state.setWinSoundPlayedInRace(true);
            }
          }

          if (
            !hasStoppedAudioRef.current &&
            racerPositionsRef.current.length >= slices.length &&
            racerPositionsRef.current.every((p) => p && p.totalDistance >= FINISH_LINE_DIST)
          ) {
            hasStoppedAudioRef.current = true;
            stopContinuousAudio();
          }
        }
      }
    },
    [activeWinnerId, isSpinning, startPhase, FINISH_LINE_DIST, slices, stopContinuousAudio, onFinishBannerChange]
  );

  const textScale = textSize / 100;
  const isCelebrating = !isSpinning && Boolean(winner) && !isReplayActive;
  const championColor = slices.find((s) => s.item.id === winner?.id)?.color || '#ef4444';

  return (
    <>
      <ProceduralEnvironment trackStyle={raceTrackStyle} />

      {/* Calibrated 3-point Clear Broadcast Daylight Lighting Rig (brighter coastal sun in Daytona) */}
      <hemisphereLight args={[isDaytona ? '#e0f2fe' : '#bae6fd', '#3f6212', isDaytona ? 1.15 : 0.95]} />
      <directionalLight
        position={[125, 175, 95]}
        intensity={isDaytona ? 2.85 : 2.45}
        color={isDaytona ? '#fffbeb' : '#fff6e0'}
        castShadow={!isSoftwareGl}
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
        shadow-camera-left={isDaytona ? -310 : -240}
        shadow-camera-right={isDaytona ? 310 : 240}
        shadow-camera-top={isDaytona ? 240 : 220}
        shadow-camera-bottom={isDaytona ? -240 : -220}
        shadow-camera-near={15}
        shadow-camera-far={580}
      />
      <directionalLight position={[-115, 75, -110]} intensity={isDaytona ? 0.78 : 0.65} color="#93c5fd" />

      <LeaderboardBridge
        slices={slices}
        positionsRef={racerPositionsRef}
        leaderPosRef={leaderPosRef}
        isSpinning={isSpinning}
        isReplayActive={isReplayActive}
        replayEpoch={replaySeekRequest?.seq ?? 0}
        startPhase={startPhase}
        activeWinnerId={activeWinnerId}
        focusedDriverId={focusedDriverId}
        broadcastDriverId={broadcastDriverId}
        standingsOrderRef={standingsOrderRef}
        trackStyle={raceTrackStyle}
      />

      <RaceCameraAndAudio
        isSpinning={isSpinning}
        isReplayActive={isReplayActive}
        expectedWinnerId={activeWinnerId}
        positionsRef={racerPositionsRef}
        leaderPosRef={leaderPosRef}
        winnerPosRef={winnerPosRef}
        startPhase={startPhase}
        manualCamera={manualCamera}
        focusedDriverId={focusedDriverId}
        onBroadcastStateChange={onBroadcastStateChange}
        trackStyle={raceTrackStyle}
        simTimeRef={simTimeRef}
        timeScaleRef={timeScaleRef}
      />

      <CircuitScenery
        totalRacers={slices.length}
        lightsCount={lightsCount}
        isLightsOut={isLightsOut}
        trackStyle={raceTrackStyle}
      />

      <TrackEffectsPool
        positionsRef={racerPositionsRef}
        isSpinning={isSpinning}
        startPhase={startPhase}
        isCelebrating={isCelebrating}
        isReplayActive={isReplayActive}
        simTimeRef={simTimeRef}
        timeScaleRef={timeScaleRef}
      />

      <CelebrationEffects
        isCelebrating={isCelebrating}
        championColor={championColor}
        isSoftwareGl={isSoftwareGl}
        trackStyle={raceTrackStyle}
      />

      {slices.map((slice, index) => {
        const simProfile = simData ? simData.find((c) => c.id === slice.item.id)?.profile || null : null;
        return (
          <GrandPrixRacer
            key={slice.item.id}
            item={slice.item}
            color={slice.color}
            index={index}
            isSpinning={isSpinning}
            spinDurationSeconds={durationSeconds}
            expectedWinnerId={activeWinnerId}
            onUpdatePosition={handleUpdatePosition}
            simProfile={simProfile}
            isWinner={activeWinnerId === slice.item.id}
            startPhase={startPhase}
            shadowTex={shadowTex}
            textScale={textScale}
            trackStyle={raceTrackStyle}
            simTimeRef={simTimeRef}
            timeScaleRef={timeScaleRef}
            isReplayActive={isReplayActive}
          />
        );
      })}
    </>
  );
};

export const RaceDisplay = () => {
  const { slices: liveSlices, validItems } = useWheelData();
  const { t } = useTranslation();
  const isSpinning = useAppStore((s) => s.isSpinning);
  const winner = useAppStore((s) => s.winner);
  const raceTrackStyle = useAppStore((s) => s.raceTrackStyle);
  const isRaceReplayActive = useAppStore((s) => s.isRaceReplayActive);
  const setIsRaceReplayActive = useAppStore((s) => s.setIsRaceReplayActive);
  const pendingRaceDraw = useAppStore((s) => s.pendingRaceDraw);
  const { spinWheel: handleSpinClick, completeRaceDraw, stopWinSound } = useWheelActions();

  // Preserve slices during spin, replay, and celebration so cars stay on track
  const raceSlicesRef = useRef(liveSlices);
  if (!isSpinning && !winner && !isRaceReplayActive) {
    raceSlicesRef.current = liveSlices;
  }
  const slices =
    (isSpinning || winner || isRaceReplayActive) && raceSlicesRef.current.length > 0
      ? raceSlicesRef.current
      : liveSlices;

  const [startPhase, setStartPhase] = useState<
    'idle' | 'grid' | 'lights_1' | 'lights_2' | 'lights_3' | 'lights_4' | 'lights_5' | 'lights_hold' | 'racing'
  >('idle');
  const [lightsCount, setLightsCount] = useState(0);
  const [isLightsOut, setIsLightsOut] = useState(false);
  const [showGoBanner, setShowGoBanner] = useState(false);

  // Interactive broadcast director, slow-motion, pause & replay controls
  const [manualCamera, setManualCamera] = useState<ManualCameraMode>('auto');
  const [activeAngle, setActiveAngle] = useState<ActiveBroadcastAngle>('idle');
  const [focusedDriverId, setFocusedDriverId] = useState<string | null>(null);
  const [broadcastDriverId, setBroadcastDriverId] = useState<string | null>(null);
  const [isHudCollapsed, setIsHudCollapsed] = useState(false);
  const [finishBanner, setFinishBanner] = useState<FinishBannerState>(HIDDEN_FINISH_BANNER);

  const [playbackSpeed, setPlaybackSpeed] = useState<RacePlaybackSpeed>(1);
  const [isPaused, setIsPaused] = useState(false);
  const [replayProgress, setReplayProgress] = useState(0);
  const [replayTimeSeconds, setReplayTimeSeconds] = useState(0);
  const [replayDurationSeconds, setReplayDurationSeconds] = useState(5.1);
  const [replaySeekRequest, setReplaySeekRequest] = useState<{ progress: number; seq: number } | null>(null);

  const standingsOrderRef = useRef<string[]>([]);

  // WebGL safety probe & context loss handling
  const glProbe = useMemo(() => detectSoftwareWebGL(), []);
  const [contextLost, setContextLost] = useState(false);
  const canvasElRef = useRef<HTMLCanvasElement | null>(null);

  const handleBroadcastStateChange = useCallback(
    (angle: ActiveBroadcastAngle, targetDriverId: string | null) => {
      setActiveAngle(angle);
      setBroadcastDriverId(targetDriverId);
    },
    []
  );

  const handleCycleDriver = useCallback(
    (dir: -1 | 1) => {
      const order =
        standingsOrderRef.current.length > 0
          ? standingsOrderRef.current
          : slices.map((s) => s.item.id);
      if (order.length === 0) return;

      const currentId = focusedDriverId || broadcastDriverId || order[0];
      const idx = order.indexOf(currentId);
      const nextIdx =
        idx === -1 ? 0 : (idx + dir + order.length) % order.length;
      setFocusedDriverId(order[nextIdx]);
    },
    [focusedDriverId, broadcastDriverId, slices]
  );

  // Reset playback defaults when starting a live race
  useEffect(() => {
    if (isSpinning) {
      setPlaybackSpeed(1);
      setIsPaused(false);
      setManualCamera('auto');
      setReplaySeekRequest(null);
    }
  }, [isSpinning]);

  // Configure slow-motion & camera automatically whenever entering Finish Replay
  useEffect(() => {
    if (isRaceReplayActive) {
      setPlaybackSpeed(0.5);
      setIsPaused(false);
      setManualCamera('auto');
      setFocusedDriverId(null);
      setReplaySeekRequest((prev) => ({ progress: 0, seq: (prev?.seq ?? 0) + 1 }));
    }
  }, [isRaceReplayActive]);

  const handleFinishHoldComplete = useCallback(() => {
    completeRaceDraw(glProbe.supported && !contextLost);
  }, [completeRaceDraw, glProbe.supported, contextLost]);

  const handleReplayTimeUpdate = useCallback((progress: number, elapsedInClip: number, clipDuration: number) => {
    setReplayProgress(progress);
    setReplayTimeSeconds(elapsedInClip);
    setReplayDurationSeconds(clipDuration);
  }, []);

  const handleReplayReachedEnd = useCallback(() => {
    setIsPaused(true);
  }, []);

  const handleTogglePause = useCallback(() => {
    setIsPaused((prev) => {
      if (prev && isRaceReplayActive && replayProgress >= 0.995) {
        setReplaySeekRequest((s) => ({ progress: 0, seq: (s?.seq ?? 0) + 1 }));
      }
      return !prev;
    });
  }, [isRaceReplayActive, replayProgress]);

  const handleSeekReplay = useCallback((progress: number) => {
    const clamped = Math.max(0, Math.min(1, progress));
    setReplaySeekRequest((prev) => ({ progress: clamped, seq: (prev?.seq ?? 0) + 1 }));
  }, []);

  const handleRestartReplay = useCallback(() => {
    setIsPaused(false);
    setReplaySeekRequest((prev) => ({ progress: 0, seq: (prev?.seq ?? 0) + 1 }));
  }, []);

  const handleExitReplay = useCallback(() => {
    setIsRaceReplayActive(false);
    setIsPaused(false);
    setPlaybackSpeed(1);
    setManualCamera('auto');
    setFinishBanner(HIDDEN_FINISH_BANNER);
  }, [setIsRaceReplayActive]);

  const handleRejectFromReplay = useCallback(() => {
    stopWinSound();
    stopRaceAudio();
    const state = useAppStore.getState();
    const currentWinner = state.winner;
    if (currentWinner?.drawId) {
      state.setResults((prev) => prev.filter((r) => r.drawId !== currentWinner.drawId));
    }
    setIsRaceReplayActive(false);
    setIsPaused(false);
    setPlaybackSpeed(1);
    setFinishBanner(HIDDEN_FINISH_BANNER);
    if (currentWinner?.type === 'grand_winner' || state.eliminationMode) {
      state.resetEliminationBattle();
    } else {
      state.setWinner(null);
    }
  }, [setIsRaceReplayActive, stopWinSound]);

  // Fallback race completion timer only when WebGL Canvas cannot render
  useEffect(() => {
    if ((!glProbe.supported || contextLost) && isSpinning && startPhase === 'racing' && pendingRaceDraw) {
      const waitMs = Math.round((pendingRaceDraw.lastCrossTime + 0.9) * 1000);
      const timer = setTimeout(() => {
        completeRaceDraw(false);
      }, waitMs);
      return () => clearTimeout(timer);
    }
  }, [glProbe.supported, contextLost, isSpinning, startPhase, pendingRaceDraw, completeRaceDraw]);

  // Clean up WebGL context listeners & race audio on unmount
  useEffect(() => {
    return () => {
      stopRaceAudio();
      useAppStore.getState().setIsRaceReplayActive(false);
    };
  }, []);

  // Pre-race 5-Light F1 Start Sequence synced with RACE_START_DELAY_MS
  useEffect(() => {
    const timeouts: NodeJS.Timeout[] = [];
    const getVol = () => {
      const s = useAppStore.getState();
      return s.soundEnabled ? s.masterVolume / 100 : 0;
    };

    if (isSpinning) {
      setStartPhase('grid');
      setLightsCount(0);
      setIsLightsOut(false);
      setShowGoBanner(false);

      playEngineRevBeep(0.35, getVol());

      timeouts.push(
        setTimeout(() => {
          setStartPhase('lights_1');
          setLightsCount(1);
          playStartLightBeep(getVol());
        }, 700)
      );
      timeouts.push(
        setTimeout(() => {
          setStartPhase('lights_2');
          setLightsCount(2);
          playStartLightBeep(getVol());
        }, 1400)
      );
      timeouts.push(
        setTimeout(() => {
          setStartPhase('lights_3');
          setLightsCount(3);
          playStartLightBeep(getVol());
        }, 2100)
      );
      timeouts.push(
        setTimeout(() => {
          setStartPhase('lights_4');
          setLightsCount(4);
          playStartLightBeep(getVol());
        }, 2800)
      );
      timeouts.push(
        setTimeout(() => {
          setStartPhase('lights_5');
          setLightsCount(5);
          playStartLightBeep(getVol());
        }, 3500)
      );
      timeouts.push(
        setTimeout(() => {
          setStartPhase('lights_hold');
          playEngineRevBeep(0.85, getVol());
        }, 4200)
      );
      timeouts.push(
        setTimeout(() => {
          setStartPhase('racing');
          setLightsCount(0);
          setIsLightsOut(true);
          setShowGoBanner(true);
          playLightsOutGoSound(getVol());
          playRaceDefinedAudio();
        }, RACE_START_DELAY_MS)
      );
      timeouts.push(
        setTimeout(() => {
          setShowGoBanner(false);
        }, RACE_START_DELAY_MS + 2200)
      );
    } else {
      setStartPhase('idle');
      setLightsCount(0);
      setIsLightsOut(false);
      setShowGoBanner(false);
    }

    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, [isSpinning]);

  // Attach webglcontextlost / webglcontextrestored listeners
  useEffect(() => {
    const el = canvasElRef.current;
    if (!el) return;
    const onLost = (e: Event) => {
      e.preventDefault();
      setContextLost(true);
    };
    const onRestored = () => {
      setContextLost(false);
    };
    el.addEventListener('webglcontextlost', onLost);
    el.addEventListener('webglcontextrestored', onRestored);
    return () => {
      el.removeEventListener('webglcontextlost', onLost);
      el.removeEventListener('webglcontextrestored', onRestored);
    };
  }, [glProbe.supported]);

  const canSpin = slices.length > 1 && !isSpinning && !isRaceReplayActive;

  return (
    <div className="relative flex-1 h-full bg-[#0f172a] overflow-hidden select-none">
      <RaceHUD
        slices={slices}
        isSpinning={isSpinning}
        hasWinner={Boolean(winner)}
        canSpin={canSpin}
        startPhase={startPhase}
        lightsCount={lightsCount}
        isLightsOut={showGoBanner}
        manualCamera={manualCamera}
        onSelectCamera={setManualCamera}
        activeAngle={activeAngle}
        focusedDriverId={focusedDriverId}
        activeBroadcastDriverId={broadcastDriverId}
        onSelectDriver={setFocusedDriverId}
        onCycleDriver={handleCycleDriver}
        isHudCollapsed={isHudCollapsed}
        onToggleHudCollapsed={() => setIsHudCollapsed((v) => !v)}
        onStartRace={() => handleSpinClick()}
        trackStyle={raceTrackStyle}
        finishBanner={finishBanner}
        playbackSpeed={playbackSpeed}
        onChangePlaybackSpeed={setPlaybackSpeed}
        isPaused={isPaused}
        onTogglePause={handleTogglePause}
        isReplayActive={isRaceReplayActive}
        replayProgress={replayProgress}
        replayTimeSeconds={replayTimeSeconds}
        replayDurationSeconds={replayDurationSeconds}
        onSeekReplay={handleSeekReplay}
        onRestartReplay={handleRestartReplay}
        onExitReplay={handleExitReplay}
        onRejectFromReplay={handleRejectFromReplay}
      />

      {!glProbe.supported || contextLost ? (
        <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-[#0f172a] text-slate-200 gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-amber-400" />
          </div>
          <h3 className="font-display text-lg font-bold">
            {t('race.webgl_unavailable', 'Renderização 3D WebGL indisponível')}
          </h3>
          <p className="text-sm text-slate-400 max-w-md">
            {t(
              'race.webgl_fallback_desc',
              'A simulação da corrida continua funcionando normalmente e o resultado aparecerá ao término da prova.'
            )}
          </p>
          {!isSpinning && !winner && (
            <button
              type="button"
              onClick={() => handleSpinClick()}
              disabled={!canSpin}
              className="mt-2 py-2.5 px-5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Flag className="w-4 h-4" />
              <span>{t('race.start', 'INICIAR CORRIDA')}</span>
            </button>
          )}
        </div>
      ) : (
        <Canvas
          shadows={!glProbe.isSoftwareGl}
          dpr={glProbe.isSoftwareGl ? 1 : [1, 2]}
          gl={{
            powerPreference: 'high-performance',
            antialias: !glProbe.isSoftwareGl,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.08,
          }}
          camera={{ position: [-4, 24, 186], fov: 45, near: 0.4, far: 1400 }}
          onCreated={({ gl }) => {
            canvasElRef.current = gl.domElement;
            gl.outputColorSpace = THREE.SRGBColorSpace;
          }}
        >
          <React.Suspense fallback={null}>
            <RaceScene
              slices={slices}
              validItems={validItems}
              startPhase={startPhase}
              lightsCount={lightsCount}
              isLightsOut={isLightsOut}
              manualCamera={manualCamera}
              focusedDriverId={focusedDriverId}
              broadcastDriverId={broadcastDriverId}
              onBroadcastStateChange={handleBroadcastStateChange}
              onFinishBannerChange={setFinishBanner}
              standingsOrderRef={standingsOrderRef}
              isSoftwareGl={glProbe.isSoftwareGl}
              playbackSpeed={playbackSpeed}
              isPaused={isPaused}
              isReplayActive={isRaceReplayActive}
              replaySeekRequest={replaySeekRequest}
              onFinishHoldComplete={handleFinishHoldComplete}
              onReplayTimeUpdate={handleReplayTimeUpdate}
              onReplayReachedEnd={handleReplayReachedEnd}
            />
          </React.Suspense>
        </Canvas>
      )}
    </div>
  );
};

