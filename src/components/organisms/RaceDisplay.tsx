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
import { TOTAL_LAPS, TRACK_P } from './race/trackCircuit';
import {
  generateGrandPrixSimulation,
  LiveRacerTelemetry,
  SimulatedCar,
} from './race/raceSimulation';
import {
  ProceduralEnvironment,
  CircuitScenery,
  GrandPrixRacer,
  createContactShadowTexture,
} from './race/RaceModels';
import {
  RaceCameraAndAudio,
  ManualCameraMode,
  ActiveBroadcastAngle,
} from './race/RaceCameraAndAudio';
import { RaceHUD } from './race/RaceHUD';

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
  activeWinnerId,
  focusedDriverId,
  broadcastDriverId,
  standingsOrderRef,
}: {
  slices: { item: { id: string; text: string }; color: string }[];
  positionsRef: React.MutableRefObject<LiveRacerTelemetry[]>;
  leaderPosRef: React.MutableRefObject<LiveRacerTelemetry | null>;
  isSpinning: boolean;
  activeWinnerId?: string;
  focusedDriverId: string | null;
  broadcastDriverId: string | null;
  standingsOrderRef: React.MutableRefObject<string[]>;
}) => {
  const { t } = useTranslation();
  const finishOrderRef = useRef<string[]>([]);
  const lastDomSyncRef = useRef(0);

  const lapWord = t('race.lap', 'VOLTA');
  const finishedWord = t('race.finished', 'CORRIDA FINALIZADA');
  const finishBadge = t('race.finish_badge', 'FIM');

  useEffect(() => {
    if (isSpinning || !activeWinnerId) {
      finishOrderRef.current = [];
      slices.forEach((slice, rank) => {
        const row = document.getElementById(`leaderboard-racer-${slice.item.id}`);
        const rankEl = document.getElementById(`leaderboard-rank-${slice.item.id}`);
        const aeroEl = document.getElementById(`leaderboard-aero-${slice.item.id}`);
        const gapEl = document.getElementById(`leaderboard-gap-${slice.item.id}`);
        if (row) {
          row.style.transform = `translateY(${rank * 34}px)`;
          row.style.opacity = '1';
        }
        if (rankEl) rankEl.textContent = String(rank + 1);
        if (aeroEl) aeroEl.textContent = '';
        if (gapEl) gapEl.textContent = '';
      });
      const lapEl = document.getElementById('gp-lap-display');
      if (lapEl) {
        lapEl.textContent = `${lapWord} 1/${TOTAL_LAPS}`;
        lapEl.className = 'text-red-400';
      }
      const sectorEl = document.getElementById('gp-sector-display');
      if (sectorEl) sectorEl.textContent = 'S1';
    }
  }, [isSpinning, activeWinnerId, slices, lapWord]);

  useFrame((state) => {
    if (!positionsRef.current || positionsRef.current.length === 0) return;
    // Throttle DOM mutations to ~20Hz for smooth main-thread performance
    if (state.clock.elapsedTime - lastDomSyncRef.current < 0.05) return;
    lastDomSyncRef.current = state.clock.elapsedTime;

    const finishLine = TOTAL_LAPS * TRACK_P;

    const racers = slices.map((slice, idx) => {
      const tel = positionsRef.current[idx];
      const dist = tel ? tel.totalDistance : 0;
      if (isSpinning && dist >= finishLine && !finishOrderRef.current.includes(slice.item.id)) {
        finishOrderRef.current.push(slice.item.id);
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
        row.style.transform = `translateY(${rank * 34}px)`;
        row.style.opacity = hasFinished && rank > 0 ? '0.68' : '1';
      }
      if (rankEl) rankEl.textContent = String(rank + 1);

      if (aeroEl) {
        if (hasFinished) {
          aeroEl.textContent = finishBadge;
          aeroEl.className = 'text-[9px] font-mono font-bold tracking-wider uppercase text-emerald-400 shrink-0';
        } else if (r.tel?.drsActive) {
          aeroEl.textContent = 'DRS';
          aeroEl.className = 'text-[9px] font-mono font-bold tracking-wider uppercase text-emerald-400 shrink-0';
        } else if (r.tel?.inSlipstream) {
          aeroEl.textContent = 'VÁCUO';
          aeroEl.className = 'text-[9px] font-mono font-bold tracking-wider uppercase text-sky-400 shrink-0';
        } else {
          aeroEl.textContent = '';
        }
      }

      if (gapEl) {
        if (!isSpinning && !activeWinnerId) {
          gapEl.textContent = '';
        } else if (rank === 0) {
          gapEl.textContent = 'P1';
          gapEl.className = 'text-[10px] font-mono tabular-nums text-amber-400 font-bold shrink-0 min-w-[34px] text-right';
        } else {
          const deltaM = Math.max(0, leaderDist - r.dist);
          gapEl.textContent = `+${deltaM.toFixed(0)}m`;
          gapEl.className = 'text-[10px] font-mono tabular-nums text-slate-400 shrink-0 min-w-[34px] text-right';
        }
      }
    });

    // Update Lap & Sector
    const lapEl = document.getElementById('gp-lap-display');
    const sectorEl = document.getElementById('gp-sector-display');
    const leaderTel = leaderPosRef.current || racers[0]?.tel;
    if (lapEl && leaderTel) {
      if (leaderTel.totalDistance >= finishLine) {
        lapEl.textContent = finishedWord;
        lapEl.className = 'text-emerald-400';
      } else {
        const currentLap = Math.min(TOTAL_LAPS, Math.max(1, Math.floor(Math.max(0, leaderTel.totalDistance) / TRACK_P) + 1));
        lapEl.textContent = `${lapWord} ${currentLap}/${TOTAL_LAPS}`;
        lapEl.className = 'text-red-400';
      }
    }
    if (sectorEl && leaderTel) {
      sectorEl.textContent = leaderTel.totalDistance >= finishLine ? 'FIN' : `S${leaderTel.sector}`;
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
        if (tel?.drsActive) {
          aeroEl.textContent = '· DRS ATIVO';
          aeroEl.className = 'hidden sm:inline-block text-[10px] font-mono font-bold tracking-wider uppercase text-emerald-400 whitespace-nowrap';
        } else if (tel?.inSlipstream) {
          aeroEl.textContent = '· NO VÁCUO';
          aeroEl.className = 'hidden sm:inline-block text-[10px] font-mono font-bold tracking-wider uppercase text-sky-400 whitespace-nowrap';
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
          gapEl.className = 'text-[11px] font-semibold text-emerald-400 hidden sm:inline min-w-[46px] text-right';
        } else {
          const behindGap = Math.max(0, racers[0].dist - focusRacer.dist);
          gapEl.textContent = `-${behindGap.toFixed(1)}m`;
          gapEl.className = 'text-[11px] font-semibold text-amber-400 hidden sm:inline min-w-[46px] text-right';
        }
      }

      const activeLeds = Math.round((Math.min(330, kmh) / 330) * 8);
      for (let i = 0; i < 8; i++) {
        const led = document.getElementById(`rpm-led-${i}`);
        if (led) {
          if (i < activeLeds) {
            led.style.backgroundColor = i < 3 ? '#22c55e' : i < 6 ? '#eab308' : '#ef4444';
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
  standingsOrderRef,
  isSoftwareGl,
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
  standingsOrderRef: React.MutableRefObject<string[]>;
  isSoftwareGl: boolean;
}) => {
  const isSpinning = useAppStore((s) => s.isSpinning);
  const expectedWinnerId = useAppStore((s) => s.expectedWinnerId);
  const winner = useAppStore((s) => s.winner);
  const spinTime = useAppStore((s) => s.spinTime);
  const eliminationMode = useAppStore((s) => s.eliminationMode);
  const eliminationSpinTime = useAppStore((s) => s.eliminationSpinTime);
  const racePodium = useAppStore((s) => s.racePodium);
  const textSize = useAppStore((s) => s.textSize);

  const { stopContinuousAudio } = useWheelActions();

  const isFinalRound = eliminationMode && validItems.length === 2;
  const activeWinnerId = isSpinning || winner ? winner?.id || expectedWinnerId : undefined;

  let actualSpinTime = isFinalRound ? spinTime : eliminationMode ? eliminationSpinTime : spinTime;
  const spinRange = getSpinTimeRanges('race', !isFinalRound && eliminationMode);
  actualSpinTime = Math.max(spinRange.min, Math.min(spinRange.max, actualSpinTime));
  const durationSeconds = actualSpinTime;

  const racerPositionsRef = useRef<LiveRacerTelemetry[]>([]);
  const leaderPosRef = useRef<LiveRacerTelemetry | null>(null);
  const winnerPosRef = useRef<LiveRacerTelemetry | null>(null);
  const hasPlayedWinSoundRef = useRef(false);
  const hasStoppedAudioRef = useRef(false);

  const [simData, setSimData] = useState<SimulatedCar[] | null>(null);

  const shadowTex = useMemo(() => createContactShadowTexture(), []);
  useEffect(() => {
    return () => {
      shadowTex.dispose();
    };
  }, [shadowTex]);

  useEffect(() => {
    if (isSpinning) {
      hasPlayedWinSoundRef.current = false;
      hasStoppedAudioRef.current = false;
      racerPositionsRef.current = [];
      leaderPosRef.current = null;
      winnerPosRef.current = null;
      const generated = generateGrandPrixSimulation(slices, durationSeconds, racePodium);
      setSimData(generated);
    } else {
      setSimData(null);
    }
  }, [isSpinning, slices, durationSeconds, racePodium]);

  const FINISH_LINE_DIST = TOTAL_LAPS * TRACK_P;

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

        if (startPhase === 'racing') {
          if (!hasPlayedWinSoundRef.current && leader && leader.totalDistance >= FINISH_LINE_DIST) {
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
    [activeWinnerId, isSpinning, startPhase, FINISH_LINE_DIST, slices, stopContinuousAudio]
  );

  const textScale = textSize / 100;

  return (
    <>
      <ProceduralEnvironment />

      {/* Calibrated 3-point Warm Key / Cool Fill / Rim Lighting Rig */}
      <hemisphereLight args={['#93c5fd', '#1e293b', 0.65]} />
      <directionalLight
        position={[85, 115, 45]}
        intensity={2.05}
        color="#fff0d4"
        castShadow={!isSoftwareGl}
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
        shadow-camera-left={-180}
        shadow-camera-right={180}
        shadow-camera-top={160}
        shadow-camera-bottom={-160}
        shadow-camera-near={10}
        shadow-camera-far={360}
      />
      <directionalLight position={[-95, 50, -85]} intensity={0.6} color="#7dd3fc" />

      <LeaderboardBridge
        slices={slices}
        positionsRef={racerPositionsRef}
        leaderPosRef={leaderPosRef}
        isSpinning={isSpinning}
        activeWinnerId={activeWinnerId}
        focusedDriverId={focusedDriverId}
        broadcastDriverId={broadcastDriverId}
        standingsOrderRef={standingsOrderRef}
      />

      <RaceCameraAndAudio
        isSpinning={isSpinning}
        expectedWinnerId={activeWinnerId}
        positionsRef={racerPositionsRef}
        leaderPosRef={leaderPosRef}
        winnerPosRef={winnerPosRef}
        startPhase={startPhase}
        manualCamera={manualCamera}
        focusedDriverId={focusedDriverId}
        onBroadcastStateChange={onBroadcastStateChange}
      />

      <CircuitScenery
        totalRacers={slices.length}
        lightsCount={lightsCount}
        isLightsOut={isLightsOut}
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
  const masterVolume = useAppStore((s) => s.masterVolume);
  const soundEnabled = useAppStore((s) => s.soundEnabled);
  const { spinWheel: handleSpinClick } = useWheelActions();

  // Preserve slices during spin and celebration so cars stay on track
  const raceSlicesRef = useRef(liveSlices);
  if (!isSpinning && !winner) {
    raceSlicesRef.current = liveSlices;
  }
  const slices =
    (isSpinning || winner) && raceSlicesRef.current.length > 0 ? raceSlicesRef.current : liveSlices;

  const [startPhase, setStartPhase] = useState<
    'idle' | 'grid' | 'lights_1' | 'lights_2' | 'lights_3' | 'lights_4' | 'lights_5' | 'lights_hold' | 'racing'
  >('idle');
  const [lightsCount, setLightsCount] = useState(0);
  const [isLightsOut, setIsLightsOut] = useState(false);

  // Interactive broadcast director & manual controls
  const [manualCamera, setManualCamera] = useState<ManualCameraMode>('auto');
  const [activeAngle, setActiveAngle] = useState<ActiveBroadcastAngle>('idle');
  const [focusedDriverId, setFocusedDriverId] = useState<string | null>(null);
  const [broadcastDriverId, setBroadcastDriverId] = useState<string | null>(null);
  const [isHudCollapsed, setIsHudCollapsed] = useState(false);

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

  // Clean up WebGL context listeners & race audio on unmount
  useEffect(() => {
    return () => {
      stopRaceAudio();
    };
  }, []);

  // Pre-race 5-Light F1 Start Sequence synced with RACE_START_DELAY_MS
  useEffect(() => {
    const timeouts: NodeJS.Timeout[] = [];

    if (isSpinning) {
      setStartPhase('grid');
      setLightsCount(0);
      setIsLightsOut(false);

      const vol = soundEnabled ? masterVolume / 100 : 0;
      playEngineRevBeep(0.35, vol);

      timeouts.push(
        setTimeout(() => {
          setStartPhase('lights_1');
          setLightsCount(1);
          playStartLightBeep(vol);
        }, 700)
      );
      timeouts.push(
        setTimeout(() => {
          setStartPhase('lights_2');
          setLightsCount(2);
          playStartLightBeep(vol);
        }, 1400)
      );
      timeouts.push(
        setTimeout(() => {
          setStartPhase('lights_3');
          setLightsCount(3);
          playStartLightBeep(vol);
        }, 2100)
      );
      timeouts.push(
        setTimeout(() => {
          setStartPhase('lights_4');
          setLightsCount(4);
          playStartLightBeep(vol);
        }, 2800)
      );
      timeouts.push(
        setTimeout(() => {
          setStartPhase('lights_5');
          setLightsCount(5);
          playStartLightBeep(vol);
        }, 3500)
      );
      timeouts.push(
        setTimeout(() => {
          setStartPhase('lights_hold');
          playEngineRevBeep(0.85, vol);
        }, 4200)
      );
      timeouts.push(
        setTimeout(() => {
          setStartPhase('racing');
          setLightsCount(0);
          setIsLightsOut(true);
          playLightsOutGoSound(vol);
          playRaceDefinedAudio();
        }, RACE_START_DELAY_MS)
      );
    } else {
      setStartPhase('idle');
      setLightsCount(0);
      setIsLightsOut(false);
    }

    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, [isSpinning, soundEnabled, masterVolume]);

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

  const canSpin = slices.length > 1 && !isSpinning;

  return (
    <div className="relative flex-1 h-full bg-[#0f172a] overflow-hidden select-none">
      <RaceHUD
        slices={slices}
        isSpinning={isSpinning}
        hasWinner={Boolean(winner)}
        canSpin={canSpin}
        startPhase={startPhase}
        lightsCount={lightsCount}
        isLightsOut={isLightsOut}
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
          camera={{ position: [-36, 18, 95], fov: 45, near: 0.4, far: 1200 }}
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
              standingsOrderRef={standingsOrderRef}
              isSoftwareGl={glProbe.isSoftwareGl}
            />
          </React.Suspense>
        </Canvas>
      )}
    </div>
  );
};
