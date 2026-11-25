import React from 'react';
import {
  Flag,
  Video,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Eye,
  Trophy,
  Play,
  Pause,
  X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { RaceTrackStyle } from '../../../types';
import { TOTAL_LAPS } from './trackCircuit';
import { ActiveBroadcastAngle, ManualCameraMode } from './RaceCameraAndAudio';

export interface PhotoFinishEntry {
  id: string;
  name: string;
  color: string;
  rank: number;
  finishTimeSeconds: number;
  gapSeconds: number;
}

export interface FinishBannerState {
  phase: 'hidden' | 'final_stretch' | 'crossed';
  driverId: string;
  driverName: string;
  color: string;
  marginSeconds?: number;
  topThree?: PhotoFinishEntry[];
}

export type RacePlaybackSpeed = 1 | 0.5 | 0.25;

export function getTimingRowHeight(racerCount: number): number {
  return racerCount > 18 ? 26 : 30;
}

interface RaceSlice {
  item: { id: string; text: string };
  color: string;
}

interface RaceHUDProps {
  slices: RaceSlice[];
  isSpinning: boolean;
  hasWinner: boolean;
  canSpin: boolean;
  startPhase: string;
  lightsCount: number;
  isLightsOut: boolean;
  manualCamera: ManualCameraMode;
  onSelectCamera: (mode: ManualCameraMode) => void;
  activeAngle: ActiveBroadcastAngle;
  focusedDriverId: string | null;
  activeBroadcastDriverId: string | null;
  onSelectDriver: (driverId: string | null) => void;
  onCycleDriver: (dir: -1 | 1) => void;
  isHudCollapsed: boolean;
  onToggleHudCollapsed: () => void;
  onStartRace: () => void;
  trackStyle?: RaceTrackStyle;
  finishBanner?: FinishBannerState;
  playbackSpeed: RacePlaybackSpeed;
  onChangePlaybackSpeed: (speed: RacePlaybackSpeed) => void;
  isPaused: boolean;
  onTogglePause: () => void;
  isReplayActive: boolean;
  replayProgress: number;
  replayTimeSeconds: number;
  replayDurationSeconds: number;
  onSeekReplay: (progress: number) => void;
  onRestartReplay: () => void;
  onExitReplay: () => void;
  onRejectFromReplay: () => void;
}

const LIVE_CAMERA_OPTIONS: { id: ManualCameraMode; labelKey: string; fallback: string }[] = [
  { id: 'auto', labelKey: 'race.auto_director', fallback: 'Diretor Auto' },
  { id: 'action', labelKey: 'race.cam_action', fallback: 'Ação' },
  { id: 'bumper', labelKey: 'race.cam_onboard', fallback: 'Onboard' },
  { id: 'rear', labelKey: 'race.cam_rear', fallback: 'Traseira' },
  { id: 'trackside', labelKey: 'race.cam_track', fallback: 'Pista' },
  { id: 'helicopter', labelKey: 'race.cam_air', fallback: 'Aérea' },
];

const REPLAY_CAMERA_OPTIONS: { id: ManualCameraMode; labelKey: string; fallback: string }[] = [
  { id: 'auto', labelKey: 'race.cam_photofinish', fallback: 'Foto-Finish' },
  { id: 'action', labelKey: 'race.cam_action', fallback: 'Ação' },
  { id: 'bumper', labelKey: 'race.cam_onboard', fallback: 'Onboard' },
  { id: 'rear', labelKey: 'race.cam_rear', fallback: 'Traseira' },
  { id: 'trackside', labelKey: 'race.cam_track', fallback: 'Pista' },
  { id: 'helicopter', labelKey: 'race.cam_air', fallback: 'Aérea' },
];

const SPEED_OPTIONS: RacePlaybackSpeed[] = [1, 0.5, 0.25];

const NascarTriStripe = ({ heightClass = 'h-[3px]' }: { heightClass?: string }) => (
  <div className={`w-full flex ${heightClass} shrink-0`} aria-hidden="true">
    <span className="flex-1 bg-[#FACC15]" />
    <span className="flex-1 bg-[#EF4444]" />
    <span className="flex-1 bg-[#2563EB]" />
  </div>
);

export const RaceHUD: React.FC<RaceHUDProps> = ({
  slices,
  isSpinning,
  hasWinner,
  canSpin,
  startPhase,
  lightsCount,
  isLightsOut,
  manualCamera,
  onSelectCamera,
  activeAngle,
  focusedDriverId,
  activeBroadcastDriverId,
  onSelectDriver,
  onCycleDriver,
  isHudCollapsed,
  onToggleHudCollapsed,
  onStartRace,
  trackStyle = 'interlagos',
  finishBanner,
  playbackSpeed,
  onChangePlaybackSpeed,
  isPaused,
  onTogglePause,
  isReplayActive,
  replayProgress,
  replayTimeSeconds,
  replayDurationSeconds,
  onSeekReplay,
  onRestartReplay,
  onExitReplay,
  onRejectFromReplay,
}) => {
  const { t } = useTranslation();
  const isDaytona = trackStyle === 'daytona';
  const rowHeight = getTimingRowHeight(slices.length);

  const currentFocusId = focusedDriverId || activeBroadcastDriverId;
  const showStartLightsBanner = isSpinning && startPhase !== 'idle' && startPhase !== 'racing';
  const showGoBanner = isSpinning && isLightsOut && startPhase === 'racing';
  const showFinishBanner =
    ((isSpinning && !hasWinner && startPhase === 'racing') || isReplayActive) &&
    finishBanner &&
    finishBanner.phase !== 'hidden';

  const showBroadcastDock = (isSpinning && !hasWinner) || isReplayActive;
  const cameraOptions = isReplayActive ? REPLAY_CAMERA_OPTIONS : LIVE_CAMERA_OPTIONS;

  return (
    <>
      {/* Full-Height Left Category-Native Official Broadcast Timing Tower */}
      <aside
        aria-label={t('race.pos', 'POS')}
        className={`absolute top-3 bottom-3 max-sm:bottom-40 sm:top-5 sm:bottom-5 left-3 sm:left-5 z-20 w-56 sm:w-64 flex flex-col overflow-hidden shadow-[0_14px_38px_rgba(0,0,0,0.62)] rounded-lg border ${
          isDaytona
            ? 'bg-[#0e121a]/94 border-white/14'
            : 'bg-[#0b0d13]/94 border-white/12'
        }`}
      >
        {/* Official Category Top Accent Strip */}
        {isDaytona ? (
          <NascarTriStripe heightClass="h-[3px]" />
        ) : (
          <div className="w-full h-[3px] bg-[#E10600] shrink-0" aria-hidden="true" />
        )}

        {/* Broadcast Tower Header */}
        <div
          className={`px-2.5 py-2 border-b flex items-center justify-between gap-2 shrink-0 ${
            isDaytona ? 'bg-[#141924] border-white/12' : 'bg-[#131620] border-white/10'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            {isDaytona ? (
              <span className="inline-flex items-center px-1.5 py-0.5 bg-[#FACC15] text-slate-950 font-display font-extrabold italic text-[10px] tracking-tight uppercase -skew-x-6 rounded-xs shrink-0">
                <span className="skew-x-6 whitespace-nowrap">STOCK</span>
              </span>
            ) : (
              <span className="inline-flex items-center px-1.5 py-0.5 bg-[#E10600] text-white font-display font-extrabold italic text-[10px] tracking-tight uppercase rounded-xs shrink-0">
                F1
              </span>
            )}
            <span className="text-[11px] font-display font-bold tracking-wider uppercase text-white truncate">
              {isDaytona ? 'DAYTONA' : 'INTERLAGOS'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] font-mono tabular-nums font-bold shrink-0">
            <span
              id="gp-lap-display"
              className={isDaytona ? 'text-[#FACC15] whitespace-nowrap' : 'text-white whitespace-nowrap'}
            >
              {t('race.lap', 'VOLTA')} 1/{TOTAL_LAPS}
            </span>
            <span className="text-slate-600" aria-hidden="true">
              ·
            </span>
            <span id="gp-sector-display" className="text-slate-300 whitespace-nowrap">
              S1
            </span>
          </div>
        </div>

        {/* Live Official Flag & Session Strip */}
        <div
          className={`px-2.5 py-1 border-b flex items-center justify-between gap-2 text-[10px] font-mono uppercase tracking-wider shrink-0 ${
            isDaytona ? 'bg-[#0b0e15] border-white/10' : 'bg-[#090b10] border-white/8'
          }`}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              id="gp-flag-swatch"
              className="w-2.5 h-2 rounded-xs bg-slate-500 shrink-0"
              aria-hidden="true"
            />
            <span id="gp-flag-text" className="font-bold text-slate-300 truncate">
              {isDaytona ? 'GRID DAYTONA' : 'GRID DE LARGADA'}
            </span>
          </div>
          <span className="text-slate-500 whitespace-nowrap shrink-0">
            {isReplayActive ? 'REPLAY' : isDaytona ? 'TRI-OVAL' : 'GP'}
          </span>
        </div>

        {/* Full-Height Live Animated Standings Rows */}
        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
          <div
            className="relative w-full transition-all duration-300"
            style={{ height: `${slices.length * rowHeight}px` }}
          >
            {slices.map((slice, i) => {
              const isSelected = focusedDriverId === slice.item.id;
              const isTracked = currentFocusId === slice.item.id;
              return (
                <button
                  key={slice.item.id}
                  type="button"
                  id={`leaderboard-racer-${slice.item.id}`}
                  onClick={() => onSelectDriver(isSelected ? null : slice.item.id)}
                  title={t('race.click_focus', 'Clique para focar a câmera neste piloto')}
                  className={`absolute left-0 right-0 flex items-center gap-2 px-2 border-b border-white/6 text-left transition-transform duration-300 ease-out cursor-pointer ${
                    isSelected
                      ? isDaytona
                        ? 'bg-[#FACC15]/18'
                        : 'bg-[#E10600]/22'
                      : isTracked && (isSpinning || isReplayActive)
                      ? 'bg-white/8'
                      : 'hover:bg-white/6'
                  }`}
                  style={{
                    top: 0,
                    height: `${rowHeight}px`,
                    transform: `translateY(${i * rowHeight}px)`,
                  }}
                >
                  <span
                    id={`leaderboard-rank-${slice.item.id}`}
                    className={`w-5 h-5 flex items-center justify-center text-[11px] font-mono tabular-nums font-extrabold shrink-0 rounded-xs ${
                      isDaytona
                        ? i === 0
                          ? 'bg-[#FACC15] text-slate-950 -skew-x-6'
                          : 'bg-[#1a202e] text-slate-200 -skew-x-6'
                        : i === 0
                        ? 'bg-white text-slate-950'
                        : 'text-slate-300'
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span
                    className="w-1.5 h-3.5 rounded-xs shrink-0"
                    style={{ backgroundColor: slice.color }}
                  />
                  <span className="text-[11px] sm:text-xs font-bold text-slate-100 tracking-wide uppercase truncate flex-1">
                    {slice.item.text}
                  </span>
                  {isSelected && (
                    <Eye
                      className={`w-3 h-3 shrink-0 ${isDaytona ? 'text-[#FACC15]' : 'text-[#ff4d4d]'}`}
                      aria-hidden="true"
                    />
                  )}
                  <span
                    id={`leaderboard-aero-${slice.item.id}`}
                    className="text-[9px] font-mono font-bold tracking-wider uppercase shrink-0 whitespace-nowrap"
                  />
                  <span
                    id={`leaderboard-gap-${slice.item.id}`}
                    className="text-[10px] font-mono tabular-nums text-slate-400 shrink-0 min-w-[46px] text-right whitespace-nowrap"
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* Tower Footer: Manual Focus Override or Grid Count */}
        <div
          className={`px-2.5 py-1.5 border-t flex items-center justify-between gap-2 shrink-0 ${
            isDaytona ? 'bg-[#141924] border-white/12' : 'bg-[#131620] border-white/10'
          }`}
        >
          {focusedDriverId ? (
            <>
              <span
                className={`text-[10px] font-semibold truncate ${
                  isDaytona ? 'text-[#FACC15]' : 'text-amber-400'
                }`}
              >
                {t('race.focus_locked', 'Foco manual ativo')}
              </span>
              <button
                type="button"
                onClick={() => onSelectDriver(null)}
                className="text-[10px] font-semibold text-slate-300 hover:text-white flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <RotateCcw className="w-2.5 h-2.5" />
                <span>Auto</span>
              </button>
            </>
          ) : (
            <div className="w-full flex items-center justify-between text-[10px] font-mono tabular-nums text-slate-400">
              <span className="whitespace-nowrap">
                {slices.length} {t('race.drivers_count', 'PILOTOS')}
              </span>
              <span aria-hidden="true" className="text-slate-600">
                ·
              </span>
              <span className="whitespace-nowrap">
                {TOTAL_LAPS} {t('race.laps_upper', 'VOLTAS')}
              </span>
            </div>
          )}
        </div>
      </aside>

      {/* Top-Center Category-Native Start Sequence Banner */}
      {showStartLightsBanner && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          {isDaytona ? (
            <div className="bg-[#0e121a]/95 border border-white/15 rounded-lg overflow-hidden shadow-2xl min-w-[230px]">
              <NascarTriStripe heightClass="h-[3px]" />
              <div className="px-4 py-2.5 flex flex-col items-center gap-2">
                <div className="flex items-center gap-2">
                  {[0, 1, 2, 3, 4].map((idx) => {
                    const lit = idx < lightsCount;
                    return (
                      <div
                        key={idx}
                        className={`w-4 h-3.5 -skew-x-12 rounded-xs border transition-colors duration-100 ${
                          lit
                            ? 'bg-[#FACC15] border-amber-200 shadow-[0_0_12px_rgba(250,204,21,0.85)]'
                            : 'bg-slate-900 border-slate-700'
                        }`}
                      />
                    );
                  })}
                </div>
                <span className="text-[11px] font-display font-extrabold tracking-[0.14em] uppercase text-slate-100 whitespace-nowrap">
                  {lightsCount >= 5
                    ? t('race.nascar_ready', 'MOTORES LIGADOS · ATENÇÃO')
                    : t('race.nascar_pace', 'ALINHAMENTO DAYTONA')}
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-[#0b0d13]/95 border border-white/15 rounded-lg overflow-hidden shadow-2xl min-w-[230px]">
              <div className="w-full h-[3px] bg-[#E10600]" aria-hidden="true" />
              <div className="px-4 py-2.5 flex flex-col items-center gap-2">
                <div className="flex items-center gap-2.5">
                  {[0, 1, 2, 3, 4].map((idx) => {
                    const lit = idx < lightsCount;
                    return (
                      <div
                        key={idx}
                        className={`w-4 h-4 rounded-full border transition-colors duration-100 ${
                          lit
                            ? 'bg-[#E10600] border-red-300 shadow-[0_0_14px_rgba(225,6,0,0.95)]'
                            : 'bg-slate-900 border-slate-700'
                        }`}
                      />
                    );
                  })}
                </div>
                <span className="text-[11px] font-display font-extrabold tracking-[0.16em] uppercase text-slate-100 whitespace-nowrap">
                  {lightsCount >= 5
                    ? t('race.attention', 'ATENÇÃO PARA A LARGADA')
                    : t('race.start_grid', 'GRID DE LARGADA')}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Lights Out / Green Flag Flash */}
      {showGoBanner && !showFinishBanner && (
        <div
          id="gp-lights-out-banner"
          className="absolute top-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none transition-opacity duration-500"
        >
          {isDaytona ? (
            <div className="bg-emerald-950/95 border border-emerald-400/50 rounded-lg overflow-hidden shadow-2xl">
              <NascarTriStripe heightClass="h-[3px]" />
              <div className="px-4 py-1.5 flex items-center gap-2">
                <Flag className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="text-xs font-display font-extrabold tracking-[0.16em] uppercase text-emerald-300 whitespace-nowrap">
                  {t('race.nascar_green', 'BANDEIRA VERDE · LARGADA!')}
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-[#0b0d13]/95 border border-emerald-400/45 rounded-lg overflow-hidden shadow-2xl">
              <div className="w-full h-[3px] bg-emerald-500" aria-hidden="true" />
              <div className="px-4 py-1.5 flex items-center gap-2">
                <span className="text-xs font-display font-extrabold tracking-[0.16em] uppercase text-emerald-300 whitespace-nowrap">
                  {t('race.away_we_go', 'LUZES APAGADAS · LARGADA!')}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Top-Center Unmistakable Photo-Finish Winner & Final Stretch Scoreboard */}
      {showFinishBanner && finishBanner && (
        <div
          id="gp-finish-winner-banner"
          className="absolute top-3 sm:top-5 left-1/2 -translate-x-1/2 z-30 pointer-events-none max-w-[calc(100vw-2rem)]"
        >
          {finishBanner.phase === 'crossed' ? (
            <div
              className={`bg-[#0b0d13]/96 border rounded-lg overflow-hidden shadow-[0_16px_44px_rgba(0,0,0,0.78)] min-w-[270px] sm:min-w-[340px] ${
                isDaytona ? 'border-[#FACC15]/60' : 'border-amber-400/60'
              }`}
            >
              {isDaytona ? (
                <NascarTriStripe heightClass="h-[3px]" />
              ) : (
                <div className="w-full h-[3px] bg-gradient-to-r from-[#E10600] via-amber-400 to-[#E10600]" aria-hidden="true" />
              )}

              {/* Kicker row */}
              <div className="px-3.5 py-1.5 bg-[#121622] border-b border-white/10 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="text-[10px] font-display font-extrabold tracking-[0.16em] uppercase text-amber-400 whitespace-nowrap">
                    {isReplayActive
                      ? t('race.replay_photofinish', 'REPLAY OFICIAL · FOTO-FINISH')
                      : isDaytona
                      ? t('race.nascar_winner_banner', 'CHEGADA OFICIAL · DAYTONA')
                      : t('race.champion_banner', 'CHEGADA OFICIAL · FOTO-FINISH')}
                  </span>
                </div>
                {typeof finishBanner.marginSeconds === 'number' && finishBanner.marginSeconds > 0 && (
                  <span className="text-[10px] font-mono tabular-nums font-bold text-emerald-400 whitespace-nowrap">
                    +{finishBanner.marginSeconds.toFixed(3)}s
                  </span>
                )}
              </div>

              {/* P1 Winner Highlight */}
              <div className="px-3.5 py-2.5 flex items-center gap-2.5">
                <span
                  className={`w-7 h-7 rounded-xs flex items-center justify-center font-mono tabular-nums font-extrabold text-xs shrink-0 ${
                    isDaytona
                      ? 'bg-[#FACC15] text-slate-950 -skew-x-6'
                      : 'bg-amber-400 text-slate-950'
                  }`}
                >
                  1º
                </span>
                <span
                  className="w-1.5 h-7 rounded-xs shrink-0"
                  style={{ backgroundColor: finishBanner.color }}
                />
                <div className="flex-1 min-w-0">
                  <span className="text-sm sm:text-base font-display font-extrabold text-white uppercase tracking-wide truncate block">
                    {finishBanner.driverName}
                  </span>
                </div>
                {finishBanner.topThree?.[0] && (
                  <span className="text-xs font-mono tabular-nums font-bold text-amber-300 whitespace-nowrap shrink-0">
                    {finishBanner.topThree[0].finishTimeSeconds.toFixed(3)}s
                  </span>
                )}
              </div>

              {/* P2 & P3 Photo-Finish Comparison Strip */}
              {finishBanner.topThree && finishBanner.topThree.length > 1 && (
                <div className="px-3.5 py-1.5 bg-[#080a0f] border-t border-white/10 flex flex-col gap-1">
                  {finishBanner.topThree.slice(1, 3).map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between gap-2 text-[11px] font-mono tabular-nums"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-slate-400 font-bold w-5 shrink-0">{entry.rank}º</span>
                        <span
                          className="w-1.5 h-3 rounded-xs shrink-0"
                          style={{ backgroundColor: entry.color }}
                        />
                        <span className="font-sans font-semibold text-slate-200 uppercase truncate max-w-[160px] sm:max-w-[210px]">
                          {entry.name}
                        </span>
                      </div>
                      <span className="text-slate-300 font-bold whitespace-nowrap shrink-0">
                        +{entry.gapSeconds.toFixed(3)}s
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div
              className={`bg-[#0b0d13]/94 border rounded-lg overflow-hidden shadow-xl ${
                isDaytona ? 'border-[#FACC15]/45' : 'border-white/20'
              }`}
            >
              {isDaytona ? (
                <NascarTriStripe heightClass="h-[2px]" />
              ) : (
                <div className="w-full h-[2px] bg-[#E10600]" aria-hidden="true" />
              )}
              <div className="px-3.5 py-1.5 flex items-center gap-2.5">
                <Flag className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="text-[10px] font-display font-bold tracking-[0.16em] uppercase text-amber-300 whitespace-nowrap">
                  {t('race.final_stretch', 'RETA FINAL')}
                </span>
                <span className="text-slate-600" aria-hidden="true">
                  ·
                </span>
                <span
                  className="w-2 h-3.5 rounded-xs shrink-0"
                  style={{ backgroundColor: finishBanner.color }}
                />
                <span className="text-xs sm:text-sm font-display font-bold text-slate-100 uppercase tracking-wide truncate max-w-[160px] sm:max-w-[220px]">
                  {finishBanner.driverName}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Pre-Race Category-Branded Launch Dock */}
      {!isSpinning && !hasWinner && !isReplayActive && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2.5 w-full max-w-sm px-4">
          <button
            type="button"
            onClick={onStartRace}
            disabled={!canSpin}
            className={`w-full py-3.5 px-6 font-display font-extrabold rounded-lg shadow-2xl border transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-45 disabled:cursor-not-allowed uppercase tracking-[0.14em] text-sm sm:text-base flex items-center justify-center gap-2.5 cursor-pointer whitespace-nowrap ${
              isDaytona
                ? 'bg-[#FACC15] hover:bg-[#fde047] text-slate-950 border-amber-200/60'
                : 'bg-[#E10600] hover:bg-[#ff1e17] text-white border-red-400/40'
            }`}
          >
            <Flag className="w-5 h-5 shrink-0" />
            <span>{t('race.start', 'INICIAR CORRIDA')}</span>
          </button>
          <div className="text-[11px] font-medium text-slate-200 bg-[#0b0d13]/90 px-3.5 py-1.5 rounded-md border border-white/12 flex items-center gap-2 whitespace-nowrap">
            <span className="font-mono tabular-nums font-bold">
              {TOTAL_LAPS} {t('race.laps_label', 'Voltas')}
            </span>
            <span className="text-slate-500" aria-hidden="true">
              ·
            </span>
            <span>
              {isDaytona
                ? t('race.daytona_circuit', 'Daytona Tri-Oval 3D')
                : t('race.interlagos_circuit', 'Interlagos 3D')}
            </span>
            <span className="text-slate-500" aria-hidden="true">
              ·
            </span>
            <span>
              {isDaytona
                ? t('race.nascar_rules', 'Vácuo NASCAR')
                : t('race.aero_rules', 'Vácuo & DRS')}
            </span>
          </div>
        </div>
      )}

      {/* Collapsible Official Broadcast Telemetry, Slow-Motion & Replay Dock */}
      {showBroadcastDock && (
        <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center w-full max-w-4xl px-3">
          <button
            type="button"
            onClick={onToggleHudCollapsed}
            className="mb-1.5 px-3 py-1 rounded-md bg-[#0b0d13]/92 hover:bg-[#141926] border border-white/14 text-[11px] font-semibold text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
          >
            {isHudCollapsed ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                <span>{t('race.show_hud', 'Mostrar Controles')}</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                <span>{t('race.hide_hud', 'Ocultar Controles')}</span>
              </>
            )}
          </button>

          {!isHudCollapsed && (
            <div
              className={`w-full rounded-lg shadow-[0_16px_42px_rgba(0,0,0,0.72)] overflow-hidden border ${
                isDaytona
                  ? 'bg-[#0e121a]/95 border-white/14'
                  : 'bg-[#0b0d13]/95 border-white/14'
              }`}
            >
              {isDaytona ? (
                <NascarTriStripe heightClass="h-[3px]" />
              ) : (
                <div className="w-full h-[3px] bg-[#E10600]" aria-hidden="true" />
              )}

              {/* Replay Control Strip (Active during Automatic Finish Replay) */}
              {isReplayActive && (
                <div className="px-3.5 py-2 bg-[#121726] border-b border-white/10 flex flex-wrap md:flex-nowrap items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`px-2 py-0.5 rounded-xs text-[10px] font-display font-extrabold tracking-wider uppercase whitespace-nowrap ${
                        isDaytona
                          ? 'bg-[#FACC15] text-slate-950 -skew-x-6'
                          : 'bg-[#E10600] text-white'
                      }`}
                    >
                      REPLAY
                    </span>
                    <span className="text-[11px] font-mono tabular-nums text-slate-300 whitespace-nowrap">
                      {replayTimeSeconds.toFixed(1)}s / {replayDurationSeconds.toFixed(1)}s
                    </span>
                  </div>

                  <div className="flex-1 min-w-[140px] flex items-center gap-2">
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.005}
                      value={replayProgress}
                      onChange={(e) => onSeekReplay(parseFloat(e.target.value))}
                      aria-label={t('race.replay_timeline', 'Linha do tempo do replay')}
                      className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-slate-700 ${
                        isDaytona ? 'accent-[#FACC15]' : 'accent-[#E10600]'
                      }`}
                    />
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={onRestartReplay}
                      className="px-2.5 py-1.5 rounded-md bg-white/8 hover:bg-white/15 border border-white/12 text-[11px] font-semibold text-slate-100 flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{t('race.replay_restart', 'Rever')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={onRejectFromReplay}
                      className="px-2.5 py-1.5 rounded-md bg-white/5 hover:bg-red-500/20 border border-white/12 hover:border-red-400/40 text-[11px] font-semibold text-slate-300 hover:text-red-200 flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                      title={t('horizonDisplay.reject', 'Rejeitar')}
                    >
                      <X className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">{t('horizonDisplay.reject', 'Rejeitar')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={onExitReplay}
                      className={`px-3 py-1.5 rounded-md text-[11px] font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer shadow-sm ${
                        isDaytona
                          ? 'bg-[#FACC15] hover:bg-[#fde047] text-slate-950'
                          : 'bg-[#E10600] hover:bg-[#ff1e17] text-white'
                      }`}
                    >
                      <Trophy className="w-3.5 h-3.5" />
                      <span>{t('race.go_podium', 'Ver Pódio')}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Row 1: Category Broadcast Driver Telemetry Pod */}
              <div className="px-3.5 py-2 flex items-center justify-between gap-3 border-b border-white/10 flex-wrap md:flex-nowrap">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => onCycleDriver(-1)}
                      className="w-7 h-7 rounded-md bg-white/6 hover:bg-white/14 border border-white/12 flex items-center justify-center text-slate-200 cursor-pointer"
                      title={t('race.prev_driver', 'Piloto anterior')}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onCycleDriver(1)}
                      className="w-7 h-7 rounded-md bg-white/6 hover:bg-white/14 border border-white/12 flex items-center justify-center text-slate-200 cursor-pointer"
                      title={t('race.next_driver', 'Próximo piloto')}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <span
                    id="onboard-driver-pos"
                    className={`font-mono tabular-nums font-extrabold px-2 py-0.5 text-xs shrink-0 rounded-xs ${
                      isDaytona
                        ? 'bg-[#FACC15] text-slate-950 -skew-x-6'
                        : 'bg-[#E10600] text-white'
                    }`}
                  >
                    P1
                  </span>
                  <span
                    id="onboard-driver-color"
                    className="w-2 h-5 rounded-xs shrink-0 bg-red-500"
                  />
                  <span
                    id="onboard-driver-name"
                    className="text-xs sm:text-sm font-display font-extrabold text-white uppercase tracking-wide truncate max-w-[130px] sm:max-w-[180px]"
                  >
                    {t('race.driver_placeholder', 'PILOTO')}
                  </span>

                  <span
                    id="onboard-aero-state"
                    className="hidden sm:inline-block text-[10px] font-mono font-bold tracking-wider uppercase text-slate-400 whitespace-nowrap"
                  />
                </div>

                {/* Right: Throttle & Brake Bars + 8-LED Shift Strip + Gear + Speed + Gap */}
                <div className="flex items-center gap-3 shrink-0 ml-auto">
                  <div className="hidden lg:flex items-center gap-2.5 px-2.5 py-1 bg-[#141925] rounded-md border border-white/10">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-mono font-bold text-slate-400">ACEL</span>
                      <div className="w-14 h-2 bg-slate-800 rounded-xs overflow-hidden">
                        <div
                          id="onboard-throttle-fill"
                          className="w-full h-full bg-emerald-400 origin-left transition-transform duration-75"
                          style={{ transform: 'scaleX(0)' }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-mono font-bold text-slate-400">FREIO</span>
                      <div className="w-12 h-2 bg-slate-800 rounded-xs overflow-hidden">
                        <div
                          id="onboard-brake-fill"
                          className="w-full h-full bg-[#E10600] origin-left transition-transform duration-75"
                          style={{ transform: 'scaleX(0)' }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="hidden md:flex items-center gap-1" aria-hidden="true">
                    {Array.from({ length: 8 }).map((_, idx) => (
                      <div
                        key={idx}
                        id={`rpm-led-${idx}`}
                        className="w-2 h-3.5 rounded-xs bg-slate-800 transition-colors duration-75"
                      />
                    ))}
                  </div>

                  <div className="flex items-center gap-2 bg-[#141925] px-2.5 py-1 rounded-md border border-white/10 font-mono tabular-nums">
                    <span className="text-[10px] text-slate-400 font-bold">M</span>
                    <span
                      id="onboard-driver-gear"
                      className={`font-extrabold text-xs ${isDaytona ? 'text-[#FACC15]' : 'text-amber-400'}`}
                    >
                      1
                    </span>
                    <span className="text-slate-600" aria-hidden="true">
                      ·
                    </span>
                    <span id="onboard-driver-speed" className="text-white font-bold text-xs min-w-[60px] text-right whitespace-nowrap">
                      0 KM/H
                    </span>
                    <span className="text-slate-600 hidden sm:inline" aria-hidden="true">
                      ·
                    </span>
                    <span
                      id="onboard-driver-gap"
                      className="text-[11px] font-bold text-emerald-400 hidden sm:inline min-w-[46px] text-right whitespace-nowrap"
                    >
                      LÍDER
                    </span>
                  </div>
                </div>
              </div>

              {/* Row 2: Slow-Motion / Pause Playback Controls + Broadcast Camera Director */}
              <div className="px-3 py-1.5 bg-[#080a0f] flex items-center justify-between gap-3 overflow-x-auto no-scrollbar">
                {/* Left: Pause & Slow-Motion Speed Selector */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={onTogglePause}
                    className={`px-2.5 py-1.5 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer border ${
                      isPaused
                        ? 'bg-amber-500/20 text-amber-300 border-amber-400/50'
                        : 'bg-white/6 hover:bg-white/12 text-slate-200 border-white/12'
                    }`}
                    title={isPaused ? t('race.resume', 'Continuar') : t('race.pause', 'Pausar')}
                  >
                    {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                    <span className="hidden sm:inline">
                      {isPaused ? t('race.resume', 'Play') : t('race.pause', 'Pausar')}
                    </span>
                  </button>

                  <div className="flex items-center gap-0.5 bg-[#121622] p-0.5 rounded-md border border-white/10">
                    {SPEED_OPTIONS.map((spd) => {
                      const active = playbackSpeed === spd;
                      return (
                        <button
                          key={spd}
                          type="button"
                          onClick={() => onChangePlaybackSpeed(spd)}
                          className={`px-2 py-1 rounded-xs text-[11px] font-mono tabular-nums font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                            active
                              ? isDaytona
                                ? 'bg-[#FACC15] text-slate-950'
                                : 'bg-[#E10600] text-white'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {spd}x
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Right: Broadcast Camera Selector */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-slate-400 shrink-0 pr-1">
                    <Video className={`w-3.5 h-3.5 shrink-0 ${isDaytona ? 'text-[#FACC15]' : 'text-[#E10600]'}`} />
                    <span className="font-mono font-bold uppercase tracking-wider text-[10px] whitespace-nowrap">
                      {manualCamera === 'auto'
                        ? activeAngle.toUpperCase()
                        : t('race.cam_manual', 'Manual')}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {cameraOptions.map((cam) => {
                      const isActive = manualCamera === cam.id;
                      return (
                        <button
                          key={cam.id}
                          type="button"
                          onClick={() => onSelectCamera(cam.id)}
                          className={`px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                            isActive
                              ? isDaytona
                                ? 'bg-[#FACC15] text-slate-950 font-bold shadow-sm'
                                : 'bg-[#E10600] text-white font-bold shadow-sm'
                              : 'bg-white/5 text-slate-300 hover:bg-white/12 hover:text-white'
                          }`}
                        >
                          {t(cam.labelKey, cam.fallback)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};
