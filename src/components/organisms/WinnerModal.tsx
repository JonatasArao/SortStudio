import React, { useEffect } from 'react';
import { Trophy, Crown, X, RotateCcw } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useWheelActions } from '../../hooks/useWheelActions';
import { useTranslation } from 'react-i18next';
import { Button } from '../atoms/Button';

export const WinnerModal = () => {
  const { t } = useTranslation();
  const winner = useAppStore(s => s.winner);
  const setWinner = useAppStore(s => s.setWinner);
  const winMessage = useAppStore(s => s.winMessage);
  const grandWinnerMessage = useAppStore(s => s.grandWinnerMessage);
  const autoRemoveWinner = useAppStore(s => s.autoRemoveWinner);
  const wheelType = useAppStore(s => s.wheelType);
  const racePodium = useAppStore(s => s.racePodium);
  const raceSimulationCars = useAppStore(s => s.raceSimulationCars);
  const isRaceReplayActive = useAppStore(s => s.isRaceReplayActive);
  const setIsRaceReplayActive = useAppStore(s => s.setIsRaceReplayActive);

  const { handleRemoveItem, stopWinSound } = useWheelActions();

  useEffect(() => {
    return () => {
      stopWinSound();
    };
  }, [stopWinSound]);

  const handleReject = React.useCallback(() => {
    stopWinSound();
    const state = useAppStore.getState();
    const currentWinner = state.winner;
    if (currentWinner?.drawId) {
      state.setResults(prev => prev.filter(r => r.drawId !== currentWinner.drawId));
    }
    if (currentWinner?.type === 'grand_winner' || state.eliminationMode) {
      state.resetEliminationBattle();
    } else {
      setWinner(null);
    }
  }, [setWinner, stopWinSound]);

  const handleAccept = React.useCallback(() => {
    stopWinSound();
    const state = useAppStore.getState();
    const currentWinner = state.winner;
    if (currentWinner?.type === 'grand_winner' || state.eliminationMode) {
      state.resetEliminationBattle();
    } else {
      if (autoRemoveWinner && currentWinner) {
        handleRemoveItem(currentWinner.id);
      }
      setWinner(null);
    }
  }, [autoRemoveWinner, handleRemoveItem, setWinner, stopWinSound]);

  useEffect(() => {
    if (!winner || winner.isEliminated) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleAccept();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [winner, handleAccept]);

  if (!winner || winner.isEliminated) return null;
  if (wheelType === 'horizon') return null;
  if (wheelType === 'race' && isRaceReplayActive) return null;

  const isGrandWinner = winner.type === 'grand_winner';
  const customMessage = isGrandWinner ? grandWinnerMessage : winner.message || winMessage;
  const Icon = isGrandWinner ? Crown : Trophy;

  // Compact bottom banner for 3D Grand Prix Race (positions & times stay on the left timing tower)
  if (wheelType === 'race') {
    const championFinish = racePodium?.[0]?.finishTimeSeconds;
    const canReplay = raceSimulationCars.length > 0 && racePodium.length > 0;
    return (
      <div className="fixed bottom-4 sm:bottom-5 left-1/2 -translate-x-1/2 z-[100] w-full max-w-lg px-3 sm:px-4">
        <div
          role="dialog"
          aria-modal="false"
          className="bg-[#0c101a]/95 border border-amber-500/35 text-slate-100 px-4 sm:px-5 py-3.5 rounded-2xl w-full shadow-2xl flex flex-col gap-3 relative overflow-hidden"
        >
          <div className="flex items-center gap-3.5 text-left">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center border border-white/20 shrink-0"
              style={{ backgroundColor: winner.color || '#dc2626' }}
            >
              <Trophy className="w-5 h-5 text-white" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-amber-400">
                <span className="truncate">{customMessage}</span>
                {typeof championFinish === 'number' && (
                  <>
                    <span className="text-slate-500" aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums text-slate-200 shrink-0">
                      {championFinish.toFixed(3)}s
                    </span>
                  </>
                )}
              </div>
              <h2 className="font-display text-lg sm:text-xl font-bold text-white truncate leading-tight mt-0.5">
                {winner.text}
              </h2>
            </div>

            <button
              type="button"
              onClick={handleAccept}
              className="w-8 h-8 rounded-lg bg-white/6 hover:bg-white/12 text-slate-300 hover:text-white border border-white/12 flex items-center justify-center shrink-0 transition-colors cursor-pointer"
              aria-label={t('common.close', 'Fechar')}
            >
              <X size={15} />
            </button>
          </div>

          <div className="flex flex-row gap-2">
            {canReplay && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  stopWinSound();
                  setIsRaceReplayActive(true);
                }}
                className="bg-white/8 hover:bg-white/14 text-sky-300 border-sky-400/30 hover:border-sky-400/60 flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{t('race.replay_btn', 'Replay')}</span>
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={handleReject}
              className="flex-1 bg-white/8 hover:bg-white/14 text-slate-200 border-white/12 hover:border-red-500/40 hover:text-red-300 whitespace-nowrap"
            >
              {t('horizonDisplay.reject')}
            </Button>
            <Button variant="amber" size="sm" onClick={handleAccept} className="flex-1 whitespace-nowrap">
              {t('horizonDisplay.accept')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Spatial stage banner for Penalty Shootout and Mystery Box so stage results remain visible
  if (
    wheelType === 'penalty_shootout' ||
    wheelType === 'mystery_box'
  ) {
    const accentBorder =
      wheelType === 'penalty_shootout'
        ? 'border-emerald-500/40'
        : 'border-amber-500/40';
    const accentText =
      wheelType === 'penalty_shootout' ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400';

    return (
      <div className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-[100] w-full max-w-lg px-3 sm:px-4">
        <div
          role="dialog"
          aria-modal="false"
          className={`bg-[var(--studio-surface)]/95 border ${accentBorder} text-[var(--studio-text)] backdrop-blur-xl px-4 sm:px-5 py-4 rounded-2xl w-full shadow-2xl flex flex-col gap-3.5 relative overflow-hidden`}
        >
          <div className="flex items-center gap-3.5 text-left">
            <div className="w-11 h-11 rounded-xl bg-[var(--studio-card)] border border-[var(--studio-border-strong)] flex items-center justify-center shrink-0">
              <Icon className={accentText} size={22} />
            </div>

            <div className="flex-1 min-w-0">
              <p className={`text-[11px] font-semibold uppercase tracking-wider ${accentText}`}>
                {customMessage}
              </p>
              <h2 className="font-display text-lg sm:text-xl font-bold text-[var(--studio-text)] truncate leading-tight mt-0.5">
                {winner.text}
              </h2>
            </div>

            <button
              type="button"
              onClick={handleAccept}
              className="w-8 h-8 rounded-lg bg-[var(--studio-card)] hover:bg-[var(--studio-card-hover)] text-[var(--studio-text-muted)] hover:text-[var(--studio-text)] border border-[var(--studio-border-strong)] flex items-center justify-center shrink-0 transition-colors"
              aria-label={t('common.close', 'Fechar')}
            >
              <X size={15} />
            </button>
          </div>

          <div className="flex flex-row gap-2.5">
            <Button variant="secondary" size="sm" onClick={handleReject} className="flex-1 hover:border-red-500/40 hover:text-red-600 dark:hover:text-red-300">
              {t('horizonDisplay.reject')}
            </Button>
            <Button
              variant={wheelType === 'penalty_shootout' ? 'success' : 'amber'}
              size="sm"
              onClick={handleAccept}
              className="flex-1"
            >
              {t('horizonDisplay.accept')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Classic Centered Modal
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-md p-4"
      onClick={handleAccept}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="bg-[var(--studio-surface)] text-[var(--studio-text)] px-6 sm:px-9 py-8 rounded-2xl max-w-[92vw] sm:max-w-md w-full shadow-2xl border border-[var(--studio-border-strong)] text-center relative overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={handleAccept}
          className="absolute top-4 right-4 w-9 h-9 rounded-xl bg-[var(--studio-card)] hover:bg-[var(--studio-card-hover)] text-[var(--studio-text-muted)] hover:text-[var(--studio-text)] border border-[var(--studio-border-strong)] flex items-center justify-center transition-colors"
          title={t('common.close', 'Fechar')}
          aria-label={t('common.close', 'Fechar')}
        >
          <X size={16} />
        </button>

        <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-amber-500/15 border border-amber-500/35 flex items-center justify-center">
          <Icon className="text-amber-600 dark:text-amber-400 w-8 h-8" />
        </div>

        <p className="text-xs text-amber-700 dark:text-amber-400 font-semibold uppercase tracking-widest mb-2">
          {customMessage}
        </p>

        <div className="flex items-center justify-center gap-2.5 mb-7">
          {winner.color && (
            <span
              className="w-3.5 h-3.5 rounded-full border border-[var(--studio-border-strong)] shrink-0"
              style={{ backgroundColor: winner.color }}
            />
          )}
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-[var(--studio-text)] break-words leading-tight">
            {winner.text}
          </h2>
        </div>

        <div className="flex flex-row gap-3 w-full">
          <Button
            variant="secondary"
            onClick={handleReject}
            className="flex-1 hover:border-red-500/40 hover:text-red-600 dark:hover:text-red-300"
          >
            {t('horizonDisplay.reject')}
          </Button>
          <Button variant="success" onClick={handleAccept} className="flex-1">
            {t('horizonDisplay.accept')}
          </Button>
        </div>
      </div>
    </div>
  );
};
