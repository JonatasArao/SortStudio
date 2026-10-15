import React, { useMemo, useState } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Skull, 
  Users, 
  Zap, 
  Swords, 
  Flame,
  Timer
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store/useAppStore';
import { useWheelActions } from '../../hooks/useWheelActions';

export const EliminationHUD = () => {
  const { t } = useTranslation();
  const [confirmReset, setConfirmReset] = useState(false);
  const eliminationMode = useAppStore(s => s.eliminationMode);
  const eliminationRound = useAppStore(s => s.eliminationRound);
  const eliminatedHistory = useAppStore(s => s.eliminatedHistory);
  const isAutoEliminating = useAppStore(s => s.isAutoEliminating);
  const setIsAutoEliminating = useAppStore(s => s.setIsAutoEliminating);
  const autoEliminationSpeed = useAppStore(s => s.autoEliminationSpeed);
  const setAutoEliminationSpeed = useAppStore(s => s.setAutoEliminationSpeed);
  const isSpinning = useAppStore(s => s.isSpinning);
  const items = useAppStore(s => s.items);
  const autoContinueElimination = useAppStore(s => s.autoContinueElimination);
  const setAutoContinueElimination = useAppStore(s => s.setAutoContinueElimination);
  const resetEliminationBattle = useAppStore(s => s.resetEliminationBattle);
  const setIsGraveyardOpen = useAppStore(s => s.setIsGraveyardOpen);

  const { spinWheel } = useWheelActions();

  // Active living participants
  const survivors = useMemo(() => {
    return items.filter(i => i.enabled && i.text.trim() !== "");
  }, [items]);

  const totalParticipants = items.filter(i => i.text.trim() !== "").length;
  const eliminatedCount = eliminatedHistory.length;
  const isFinalTwo = survivors.length === 2;
  const hasEnded = survivors.length <= 1;

  if (!eliminationMode) return null;

  const handleToggleAuto = () => {
    if (isAutoEliminating || autoContinueElimination) {
      setIsAutoEliminating(false);
      setAutoContinueElimination(false);
    } else {
      setIsAutoEliminating(true);
      setAutoContinueElimination(true);
      if (!isSpinning && survivors.length > 1) {
        spinWheel();
      }
    }
  };

  const handleCycleSpeed = () => {
    if (autoEliminationSpeed === 'fast') {
      setAutoEliminationSpeed('turbo');
    } else if (autoEliminationSpeed === 'turbo') {
      setAutoEliminationSpeed('normal');
    } else {
      setAutoEliminationSpeed('fast');
    }
  };

  const handleManualSpin = () => {
    if (isSpinning || survivors.length < 2) return;
    spinWheel();
  };

  const progressPercent = totalParticipants > 0 
    ? Math.round((eliminatedCount / Math.max(1, totalParticipants - 1)) * 100)
    : 0;

  return (
    <div className="w-full px-3 sm:px-6 py-2 z-30 select-none bg-slate-950/80 border-b border-red-500/20 backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 sm:gap-4">
        
        {/* Telemetria da Rodada (Sem botão de modo na navbar) */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs sm:text-sm">
            <span className={`font-mono tabular-nums font-black px-2.5 py-1 rounded-lg border shadow-sm flex items-center gap-1.5 ${
              isFinalTwo 
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse' 
                : 'bg-red-950/70 text-red-300 border-red-600/30'
            }`}>
              <Swords className="w-3.5 h-3.5 text-red-400" />
              <span>
                {isFinalTwo 
                  ? '🔥 GRANDE FINAL' 
                  : `Rodada ${eliminationRound}`}
              </span>
            </span>
          </div>
        </div>

        {/* Sobreviventes x Eliminados & Barra de Progresso */}
        <div className="flex items-center gap-3 sm:gap-4 flex-1 justify-center min-w-[200px] max-w-md">
          <div className="flex items-center gap-2.5 text-xs sm:text-sm shrink-0 font-medium">
            <span className="flex items-center gap-1 text-emerald-400 font-bold bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded-md">
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-mono tabular-nums">{survivors.length}</span>
              <span className="hidden xs:inline text-[11px] text-emerald-300/80 font-normal">vivos</span>
            </span>

            <span className="text-slate-600 font-bold">vs</span>

            <span className="flex items-center gap-1 text-red-400 font-bold bg-red-950/40 border border-red-500/30 px-2 py-0.5 rounded-md">
              <Skull className="w-3.5 h-3.5 text-red-400" />
              <span className="font-mono tabular-nums">{eliminatedCount}</span>
              <span className="hidden xs:inline text-[11px] text-red-300/80 font-normal">caídos</span>
            </span>
          </div>

          {/* Mini Barra de Progresso da Batalha */}
          <div className="hidden sm:block flex-1 max-w-[130px] bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
            <div 
              className="h-full bg-gradient-to-r from-red-600 via-orange-500 to-yellow-400 transition-all duration-300" 
              style={{ width: `${Math.min(100, progressPercent)}%` }}
              title={`${progressPercent}% dos competidores eliminados`}
            />
          </div>
        </div>

        {/* Controles de Ação Rápida */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          
          {/* Botão de Girar Próxima Rodada Manual */}
          <button
            onClick={handleManualSpin}
            disabled={isSpinning || hasEnded}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold text-xs shadow-md transition-all active:scale-95 border border-red-400/40"
            title="Girar próxima rodada da eliminação"
          >
            <Zap className="w-3.5 h-3.5 text-yellow-300" />
            <span className="hidden xs:inline">Girar Rodada</span>
            <span className="xs:hidden">Girar</span>
          </button>

          {/* Botão de Auto-Giro Dinâmico */}
          <button
            onClick={handleToggleAuto}
            disabled={hasEnded}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs border transition-all active:scale-95 ${
              isAutoEliminating || autoContinueElimination
                ? 'bg-amber-500/25 hover:bg-amber-500/35 text-amber-300 border-amber-500/60 shadow-[0_0_15px_rgba(245,158,11,0.3)] animate-pulse'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
            }`}
            title={isAutoEliminating || autoContinueElimination ? 'Pausar auto-giro contínuo' : 'Iniciar auto-giro dinâmico'}
          >
            {isAutoEliminating || autoContinueElimination ? (
              <>
                <Pause className="w-3.5 h-3.5 text-amber-400" />
                <span>Pausar</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 text-emerald-400" />
                <span>Auto-Giro</span>
              </>
            )}
          </button>

          {/* Seletor de Ritmo/Velocidade do Auto-Giro */}
          <button
            onClick={handleCycleSpeed}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-xs font-semibold transition-all active:scale-95 shadow-sm"
            title="Alternar velocidade do auto-giro: Turbo (0.3s) / Rápido (0.5s) / Normal (0.9s)"
          >
            {autoEliminationSpeed === 'turbo' ? (
              <>
                <Zap className="w-3 h-3 text-yellow-400 animate-bounce" />
                <span className="text-yellow-300 font-bold text-[11px]">Turbo</span>
              </>
            ) : autoEliminationSpeed === 'fast' ? (
              <>
                <Flame className="w-3 h-3 text-orange-400" />
                <span className="text-orange-300 font-bold text-[11px]">Rápido</span>
              </>
            ) : (
              <>
                <Timer className="w-3 h-3 text-slate-400" />
                <span className="text-slate-300 text-[11px]">Normal</span>
              </>
            )}
          </button>

          {/* Botão de Abertura do Cemitério Visual */}
          <button
            onClick={() => setIsGraveyardOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-red-950 to-slate-900 hover:from-red-900 hover:to-slate-800 text-red-200 hover:text-white border border-red-500/40 text-xs font-bold transition-all shadow-sm active:scale-95"
            title="Abrir o Cemitério dos Eliminados (Cripta de Guerreiros Caídos)"
          >
            <span className="text-xs">🪦</span>
            <span>Cemitério</span>
            {eliminatedCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-red-600 text-white text-[10px] font-mono font-bold leading-none">
                {eliminatedCount}
              </span>
            )}
          </button>

          {/* Botão Reiniciar Batalha */}
          {confirmReset ? (
            <div className="flex items-center gap-1 bg-red-950/90 border border-red-500/50 rounded-xl p-0.5 animate-in fade-in duration-150">
              <span className="text-[10px] text-red-200 px-1.5 font-bold">Reiniciar?</span>
              <button
                type="button"
                onClick={() => {
                  resetEliminationBattle();
                  setConfirmReset(false);
                }}
                className="px-2 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white font-black text-[10px] transition-colors"
              >
                Sim
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="px-1.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px]"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmReset(true)}
              disabled={isSpinning}
              className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-amber-300 border border-slate-800 text-xs transition-colors"
              title="Reiniciar Batalha (Ressuscitar todos do início)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}

        </div>

      </div>
    </div>
  );
};
