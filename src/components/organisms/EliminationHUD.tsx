import { useMemo, useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Skull,
  Users,
  Zap,
  Swords,
  Flame,
  Timer,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useWheelActions } from '../../hooks/useWheelActions';

export const EliminationHUD = () => {
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

  const survivors = useMemo(() => {
    return items.filter(i => i.enabled && i.text.trim() !== '');
  }, [items]);

  const totalParticipants = items.filter(i => i.text.trim() !== '').length;
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

  const progressPercent =
    totalParticipants > 0
      ? Math.round((eliminatedCount / Math.max(1, totalParticipants - 1)) * 100)
      : 0;

  return (
    <div className="w-full px-3 sm:px-5 py-2 z-30 select-none bg-[var(--studio-surface-elevated)]/95 border-b border-red-500/25 backdrop-blur-md shrink-0 text-[var(--studio-text)]">
      <div className="max-w-[1440px] mx-auto flex flex-wrap items-center justify-between gap-2 sm:gap-4">
        {/* Round & Battle Progress */}
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 h-8 rounded-lg border text-xs font-semibold whitespace-nowrap ${
              isFinalTwo
                ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/35'
                : 'bg-red-500/12 text-red-700 dark:text-red-300 border-red-500/30'
            }`}
          >
            <Swords size={14} className={isFinalTwo ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'} />
            <span className="font-mono tabular-nums">
              {isFinalTwo ? 'Grande Final' : `Rodada ${eliminationRound}`}
            </span>
          </div>

          <div className="flex items-center gap-2.5 text-xs font-medium whitespace-nowrap">
            <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
              <Users size={14} />
              <span className="font-mono tabular-nums font-bold">{survivors.length}</span>
              <span className="hidden xs:inline text-[var(--studio-text-muted)]">vivos</span>
            </span>

            <span className="text-[var(--studio-text-muted)]" aria-hidden="true">·</span>

            <span className="inline-flex items-center gap-1.5 text-red-600 dark:text-red-400">
              <Skull size={14} />
              <span className="font-mono tabular-nums font-bold">{eliminatedCount}</span>
              <span className="hidden xs:inline text-[var(--studio-text-muted)]">caídos</span>
            </span>
          </div>

          <div
            className="hidden md:block w-28 lg:w-36 bg-[var(--studio-input)] h-1.5 rounded-full overflow-hidden border border-[var(--studio-border)]"
            title={`${progressPercent}% dos competidores eliminados`}
          >
            <div
              className="h-full bg-gradient-to-r from-red-500 to-amber-500 transition-[width] duration-300"
              style={{ width: `${Math.min(100, progressPercent)}%` }}
            />
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={handleManualSpin}
            disabled={isSpinning || hasEnded}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-red-600 hover:bg-red-500 disabled:bg-[var(--studio-card)] disabled:text-[var(--studio-text-muted)] text-white font-semibold text-xs transition-colors border border-red-400/25 disabled:border-[var(--studio-border)] whitespace-nowrap"
            title="Girar próxima rodada da eliminação"
          >
            <Zap size={13} />
            <span className="hidden xs:inline">Girar Rodada</span>
            <span className="xs:hidden">Girar</span>
          </button>

          <button
            type="button"
            onClick={handleToggleAuto}
            disabled={hasEnded}
            className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg font-semibold text-xs border transition-colors whitespace-nowrap disabled:opacity-45 ${
              isAutoEliminating || autoContinueElimination
                ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-800 dark:text-amber-300 border-amber-500/40'
                : 'bg-[var(--studio-card)] hover:bg-[var(--studio-card-hover)] text-[var(--studio-text)] border-[var(--studio-border-strong)]'
            }`}
            title={
              isAutoEliminating || autoContinueElimination
                ? 'Pausar auto-giro contínuo'
                : 'Iniciar auto-giro dinâmico'
            }
          >
            {isAutoEliminating || autoContinueElimination ? (
              <>
                <Pause size={13} className="text-amber-600 dark:text-amber-400" />
                <span>Pausar</span>
              </>
            ) : (
              <>
                <Play size={13} className="text-emerald-600 dark:text-emerald-400" />
                <span>Auto-Giro</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleCycleSpeed}
            className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg bg-[var(--studio-card)] hover:bg-[var(--studio-card-hover)] border border-[var(--studio-border-strong)] text-xs font-medium text-[var(--studio-text)] transition-colors whitespace-nowrap"
            title="Alternar velocidade do auto-giro: Turbo / Rápido / Normal"
          >
            {autoEliminationSpeed === 'turbo' ? (
              <>
                <Zap size={13} className="text-amber-600 dark:text-amber-400" />
                <span className="text-amber-700 dark:text-amber-300">Turbo</span>
              </>
            ) : autoEliminationSpeed === 'fast' ? (
              <>
                <Flame size={13} className="text-orange-600 dark:text-orange-400" />
                <span className="text-orange-700 dark:text-orange-300">Rápido</span>
              </>
            ) : (
              <>
                <Timer size={13} className="text-[var(--studio-text-muted)]" />
                <span className="text-[var(--studio-text-secondary)]">Normal</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setIsGraveyardOpen(true)}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[var(--studio-card)] hover:bg-[var(--studio-card-hover)] text-[var(--studio-text)] border border-[var(--studio-border-strong)] hover:border-red-500/35 text-xs font-semibold transition-colors whitespace-nowrap"
            title="Abrir o Cemitério dos Eliminados"
          >
            <Skull size={13} className="text-red-600 dark:text-red-400" />
            <span className="hidden sm:inline">Cemitério</span>
            {eliminatedCount > 0 && (
              <span className="font-mono tabular-nums text-[11px] text-red-600 dark:text-red-400 font-bold">
                {eliminatedCount}
              </span>
            )}
          </button>

          {confirmReset ? (
            <div className="inline-flex items-center gap-1 h-8 bg-red-500/15 border border-red-500/40 rounded-lg px-2">
              <span className="text-[11px] text-red-700 dark:text-red-200 font-medium">Reiniciar?</span>
              <button
                type="button"
                onClick={() => {
                  resetEliminationBattle();
                  setConfirmReset(false);
                }}
                className="px-2 py-0.5 rounded bg-red-600 hover:bg-red-500 text-white font-semibold text-[11px] transition-colors"
              >
                Sim
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="px-1.5 py-0.5 rounded bg-[var(--studio-card-hover)] text-[var(--studio-text)] text-[11px] transition-colors"
              >
                Não
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              disabled={isSpinning}
              className="w-8 h-8 rounded-lg bg-[var(--studio-card)] hover:bg-[var(--studio-card-hover)] text-[var(--studio-text-muted)] hover:text-amber-600 dark:hover:text-amber-300 border border-[var(--studio-border-strong)] flex items-center justify-center transition-colors disabled:opacity-40"
              title="Reiniciar batalha"
              aria-label="Reiniciar batalha"
            >
              <RotateCcw size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
