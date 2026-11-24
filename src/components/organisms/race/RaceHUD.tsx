import React from 'react';
import {
  Flag,
  Video,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Gauge,
  Eye,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { TOTAL_LAPS } from './trackCircuit';
import { ActiveBroadcastAngle, ManualCameraMode } from './RaceCameraAndAudio';

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
}

const CAMERA_OPTIONS: { id: ManualCameraMode; labelKey: string; fallback: string }[] = [
  { id: 'auto', labelKey: 'race.auto_director', fallback: 'Diretor Auto' },
  { id: 'action', labelKey: 'race.cam_action', fallback: 'Ação' },
  { id: 'bumper', labelKey: 'race.cam_onboard', fallback: 'Onboard' },
  { id: 'rear', labelKey: 'race.cam_rear', fallback: 'Traseira' },
  { id: 'trackside', labelKey: 'race.cam_track', fallback: 'Pista' },
  { id: 'helicopter', labelKey: 'race.cam_air', fallback: 'Aérea' },
];

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
}) => {
  const { t } = useTranslation();

  const currentFocusId = focusedDriverId || activeBroadcastDriverId;
  const showStartLightsBanner = isSpinning && startPhase !== 'idle' && startPhase !== 'racing';
  const showGoBanner = isSpinning && isLightsOut && startPhase === 'racing';

  return (
    <>
      {/* Top-Left Live Timing Tower (Clickable to Lock Camera Focus on Any Driver) */}
      <aside
        aria-label={t('race.pos', 'POS')}
        className="absolute top-3 left-3 sm:top-5 sm:left-5 z-20 w-52 sm:w-60 bg-[#0c101a]/90 border border-white/12 rounded-xl overflow-hidden shadow-2xl"
      >
        <div className="bg-[#121826] px-3 py-2 border-b border-white/10 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[11px] font-bold tracking-wider uppercase text-slate-200">
            <span className="w-1.5 h-3 bg-red-500 rounded-xs shrink-0" />
            <span>{t('race.pos', 'POS')}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-mono tabular-nums font-bold">
            <span id="gp-lap-display" className="text-red-400">
              {t('race.lap', 'VOLTA')} 1/{TOTAL_LAPS}
            </span>
            <span className="text-slate-500" aria-hidden="true">
              ·
            </span>
            <span id="gp-sector-display" className="text-slate-300">
              S1
            </span>
          </div>
        </div>

        <div
          className="relative transition-all duration-300"
          style={{ height: `${Math.min(slices.length, 10) * 34}px`, overflowY: slices.length > 10 ? 'auto' : 'hidden' }}
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
                className={`absolute left-0 right-0 h-[34px] flex items-center gap-2 px-2.5 border-b border-white/6 text-left transition-transform duration-300 ease-out cursor-pointer ${
                  isSelected
                    ? 'bg-amber-500/20'
                    : isTracked && isSpinning
                    ? 'bg-white/8'
                    : 'hover:bg-white/6'
                }`}
                style={{ top: 0, transform: `translateY(${i * 34}px)` }}
              >
                <span
                  id={`leaderboard-rank-${slice.item.id}`}
                  className="w-4 text-center text-[11px] font-mono tabular-nums font-bold text-slate-400 shrink-0"
                >
                  {i + 1}
                </span>
                <span
                  className="w-1.5 h-4 rounded-xs shrink-0"
                  style={{ backgroundColor: slice.color }}
                />
                <span className="text-xs font-semibold text-slate-100 truncate flex-1">
                  {slice.item.text}
                </span>
                {isSelected && (
                  <Eye className="w-3 h-3 text-amber-400 shrink-0" aria-hidden="true" />
                )}
                <span
                  id={`leaderboard-aero-${slice.item.id}`}
                  className="text-[9px] font-mono font-bold tracking-wider uppercase shrink-0"
                />
                <span
                  id={`leaderboard-gap-${slice.item.id}`}
                  className="text-[10px] font-mono tabular-nums text-slate-400 shrink-0 min-w-[48px] text-right"
                />
              </button>
            );
          })}
        </div>

        {focusedDriverId && (
          <div className="px-2.5 py-1.5 bg-[#121826] border-t border-white/10 flex items-center justify-between">
            <span className="text-[10px] text-amber-400 font-semibold truncate">
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
          </div>
        )}
      </aside>

      {/* Top-Center Start Lights Strip */}
      {showStartLightsBanner && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <div className="bg-[#0c101a]/92 border border-white/15 rounded-xl px-4 py-2.5 shadow-2xl flex flex-col items-center gap-2">
            <div className="flex items-center gap-2.5">
              {[0, 1, 2, 3, 4].map((idx) => {
                const lit = idx < lightsCount;
                return (
                  <div
                    key={idx}
                    className={`w-4 h-4 rounded-full border transition-colors duration-100 ${
                      lit
                        ? 'bg-red-500 border-red-300 shadow-[0_0_12px_rgba(239,68,68,0.9)]'
                        : 'bg-slate-900 border-slate-700'
                    }`}
                  />
                );
              })}
            </div>
            <span className="text-[11px] font-bold tracking-widest uppercase text-slate-200 whitespace-nowrap">
              {lightsCount >= 5
                ? t('race.attention', 'ATENÇÃO PARA A LARGADA')
                : t('race.start_grid', 'GRID DE LARGADA')}
            </span>
          </div>
        </div>
      )}

      {showGoBanner && (
        <div
          id="gp-lights-out-banner"
          className="absolute top-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none transition-opacity duration-500"
        >
          <div className="bg-emerald-950/92 border border-emerald-400/40 rounded-xl px-4 py-1.5 shadow-xl flex items-center gap-2">
            <span className="text-xs font-extrabold tracking-widest uppercase text-emerald-300 whitespace-nowrap">
              {t('race.away_we_go', 'LUZES APAGADAS · LARGADA!')}
            </span>
          </div>
        </div>
      )}

      {/* Pre-Race Launch Button (Bottom Center when Idle and no WinnerModal open) */}
      {!isSpinning && !hasWinner && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2.5 w-full max-w-sm px-4">
          <button
            type="button"
            onClick={onStartRace}
            disabled={!canSpin}
            className="w-full py-3.5 px-6 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl shadow-2xl border border-red-400/35 transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-45 disabled:cursor-not-allowed uppercase tracking-[0.14em] text-sm sm:text-base flex items-center justify-center gap-2.5 cursor-pointer"
          >
            <Flag className="w-5 h-5 text-white shrink-0" />
            <span className="whitespace-nowrap">{t('race.start', 'INICIAR CORRIDA')}</span>
          </button>
          <div className="text-[11px] font-medium text-slate-300/90 bg-[#0c101a]/80 px-3 py-1 rounded-lg border border-white/10 flex items-center gap-2 whitespace-nowrap">
            <span>{TOTAL_LAPS} {t('race.laps_label', 'Voltas')}</span>
            <span aria-hidden="true">·</span>
            <span>{t('race.interlagos_circuit', 'Interlagos 3D')}</span>
            <span aria-hidden="true">·</span>
            <span>{t('race.aero_rules', 'Vácuo & DRS')}</span>
          </div>
        </div>
      )}

      {/* Collapsible Broadcast Telemetry & Camera Control Dock during Race */}
      {isSpinning && !hasWinner && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center w-full max-w-3xl px-3">
          {/* Collapse / Expand Handle */}
          <button
            type="button"
            onClick={onToggleHudCollapsed}
            className="mb-1.5 px-3 py-1 rounded-lg bg-[#0c101a]/90 hover:bg-[#151b2b] border border-white/12 text-[11px] font-semibold text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
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
            <div className="w-full bg-[#0c101a]/92 border border-white/14 rounded-xl shadow-2xl overflow-hidden">
              {/* Row 1: Focused Driver Live Telemetry */}
              <div className="px-3.5 py-2.5 flex items-center justify-between gap-3 border-b border-white/8 flex-wrap sm:flex-nowrap">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => onCycleDriver(-1)}
                      className="w-7 h-7 rounded-md bg-white/6 hover:bg-white/12 border border-white/10 flex items-center justify-center text-slate-200 cursor-pointer"
                      title={t('race.prev_driver', 'Piloto anterior')}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onCycleDriver(1)}
                      className="w-7 h-7 rounded-md bg-white/6 hover:bg-white/12 border border-white/10 flex items-center justify-center text-slate-200 cursor-pointer"
                      title={t('race.next_driver', 'Próximo piloto')}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <span
                    id="onboard-driver-pos"
                    className="bg-amber-500 text-slate-950 font-mono tabular-nums font-bold px-2 py-0.5 rounded text-xs shrink-0"
                  >
                    P1
                  </span>
                  <span
                    id="onboard-driver-color"
                    className="w-2.5 h-4 rounded-xs shrink-0 bg-red-500"
                  />
                  <span
                    id="onboard-driver-name"
                    className="text-xs sm:text-sm font-bold text-slate-100 uppercase tracking-wide truncate max-w-[140px] sm:max-w-[200px]"
                  >
                    {t('race.driver_placeholder', 'PILOTO')}
                  </span>

                  <span
                    id="onboard-aero-state"
                    className="hidden sm:inline-block text-[10px] font-mono font-bold tracking-wider uppercase text-slate-400 whitespace-nowrap"
                  />
                </div>

                <div className="flex items-center gap-3 shrink-0 ml-auto">
                  {/* RPM LED Strip */}
                  <div className="hidden md:flex items-center gap-1" aria-hidden="true">
                    {Array.from({ length: 8 }).map((_, idx) => (
                      <div
                        key={idx}
                        id={`rpm-led-${idx}`}
                        className="w-2 h-3 rounded-xs bg-slate-800 transition-colors duration-75"
                      />
                    ))}
                  </div>

                  <div className="flex items-center gap-2 bg-[#121826] px-2.5 py-1 rounded-lg border border-white/10 font-mono tabular-nums">
                    <Gauge className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="text-[11px] text-slate-400">M</span>
                    <span id="onboard-driver-gear" className="text-amber-400 font-bold text-xs">
                      1
                    </span>
                    <span className="text-slate-600" aria-hidden="true">
                      ·
                    </span>
                    <span id="onboard-driver-speed" className="text-slate-100 font-bold text-xs min-w-[58px] text-right">
                      0 KM/H
                    </span>
                    <span className="text-slate-600 hidden sm:inline" aria-hidden="true">
                      ·
                    </span>
                    <span id="onboard-driver-gap" className="text-[11px] font-semibold text-emerald-400 hidden sm:inline min-w-[46px] text-right">
                      LÍDER
                    </span>
                  </div>
                </div>
              </div>

              {/* Row 2: Camera Director & Angle Controls */}
              <div className="px-3 py-2 bg-[#090c14]/90 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 shrink-0 pr-1">
                  <Video className="w-3.5 h-3.5 text-red-400 shrink-0" />
                  <span className="hidden sm:inline font-medium whitespace-nowrap">
                    {manualCamera === 'auto'
                      ? `${t('race.cam_active', 'Câmera')}: ${activeAngle.toUpperCase()}`
                      : t('race.cam_manual', 'Manual')}
                  </span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {CAMERA_OPTIONS.map((cam) => {
                    const isActive = manualCamera === cam.id;
                    return (
                      <button
                        key={cam.id}
                        type="button"
                        onClick={() => onSelectCamera(cam.id)}
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          isActive
                            ? 'bg-red-600 text-white shadow-sm'
                            : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        {t(cam.labelKey, cam.fallback)}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};
