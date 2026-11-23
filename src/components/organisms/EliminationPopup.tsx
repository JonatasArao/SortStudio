import React, { useEffect, useCallback } from 'react';
import { Skull, Ghost, X, ArrowRight } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useWheelActions } from '../../hooks/useWheelActions';
import { playWinSound } from '../../utils/audioEngine';
import { Button } from '../atoms/Button';

export const EliminationPopup: React.FC = () => {
  const eliminationOverlayItem = useAppStore(s => s.eliminationOverlayItem);
  const setEliminationOverlayItem = useAppStore(s => s.setEliminationOverlayItem);
  const eliminationMessage = useAppStore(s => s.eliminationMessage);
  const isAutoEliminating = useAppStore(s => s.isAutoEliminating);
  const autoContinueElimination = useAppStore(s => s.autoContinueElimination);
  const setWinner = useAppStore(s => s.setWinner);

  const { handleUpdateItem, spinWheel, clearTimeouts, stopContinuousAudio } = useWheelActions();

  const handleDismiss = useCallback(
    (shouldSpinNext: boolean = false) => {
      if (!eliminationOverlayItem) return;

      const itemId = eliminationOverlayItem.id;
      const liveState = useAppStore.getState();

      handleUpdateItem(itemId, { enabled: false, isEliminated: true });
      setEliminationOverlayItem(null);
      setWinner(null);

      const remainingSurvivors = liveState.items.filter(
        i => i.enabled && i.text.trim() !== '' && i.id !== itemId
      );

      if (remainingSurvivors.length === 1) {
        const grandWinner = remainingSurvivors[0];
        clearTimeouts();
        stopContinuousAudio();
        liveState.setIsAutoEliminating(false);

        const actualVolume = liveState.soundEnabled ? liveState.masterVolume / 100 : 0;
        if (actualVolume > 0) {
          const genericCustomWin =
            liveState.customWinAudios.find(a => a.id === liveState.winSoundType) || null;
          playWinSound(0.6, liveState.winSoundType, genericCustomWin, actualVolume);
        }

        const drawId = crypto.randomUUID();
        liveState.setWinner({ ...grandWinner, type: 'grand_winner', drawId });
        liveState.setResults(prev => [
          { ...grandWinner, drawId, type: 'grand_winner', timestamp: Date.now() },
          ...prev,
        ]);
      } else if (remainingSurvivors.length > 1 && shouldSpinNext) {
        setTimeout(() => {
          spinWheel();
        }, 100);
      }
    },
    [
      eliminationOverlayItem,
      handleUpdateItem,
      setEliminationOverlayItem,
      setWinner,
      clearTimeouts,
      stopContinuousAudio,
      spinWheel,
    ]
  );

  useEffect(() => {
    if (!eliminationOverlayItem) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleDismiss(false);
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleDismiss(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [eliminationOverlayItem, handleDismiss]);

  const isAuto = isAutoEliminating || autoContinueElimination;

  if (!eliminationOverlayItem || isAuto) return null;

  const round = eliminationOverlayItem.round || 1;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-md p-4"
      onClick={() => handleDismiss(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="bg-[var(--studio-surface)] text-[var(--studio-text)] border border-red-500/35 px-6 sm:px-8 py-7 rounded-2xl max-w-[92vw] sm:max-w-md w-full shadow-2xl text-center relative overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => handleDismiss(false)}
          className="absolute top-4 right-4 w-9 h-9 rounded-xl bg-[var(--studio-card)] hover:bg-[var(--studio-card-hover)] text-[var(--studio-text-muted)] hover:text-[var(--studio-text)] transition-colors border border-[var(--studio-border-strong)] flex items-center justify-center"
          title="Fechar"
          aria-label="Fechar"
        >
          <X size={16} />
        </button>

        {/* Unboxed inline metadata */}
        <div className="flex items-center justify-center gap-2 text-xs text-[var(--studio-text-muted)] font-medium mb-5">
          <span className="inline-flex items-center gap-1.5 text-red-600 dark:text-red-400 font-mono tabular-nums font-semibold">
            <Skull size={13} />
            <span>Rodada {round}</span>
          </span>
          <span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-300">
            <Ghost size={13} />
            <span>Virou Fantasma</span>
          </span>
        </div>

        {/* Emblem */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-2xl bg-red-500/15 border border-red-500/35 flex items-center justify-center">
            <Skull className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
        </div>

        <p className="text-xs text-red-600 dark:text-red-400 font-semibold uppercase tracking-widest mb-1.5">
          {eliminationMessage || 'Eliminado da Batalha'}
        </p>

        <div className="flex items-center justify-center gap-2.5 my-2">
          {eliminationOverlayItem.color && (
            <span
              className="w-3.5 h-3.5 rounded-full border border-[var(--studio-border-strong)] shrink-0"
              style={{ backgroundColor: eliminationOverlayItem.color }}
            />
          )}
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-[var(--studio-text)] break-words leading-tight">
            {eliminationOverlayItem.text}
          </h2>
        </div>

        <p className="text-xs text-[var(--studio-text-muted)] mt-2 mb-6 max-w-xs mx-auto">
          Agora flutuando como fantasma no fundo da roleta padrão.
        </p>

        <div className="flex flex-row gap-3 w-full">
          <Button variant="secondary" onClick={() => handleDismiss(false)} className="flex-1">
            Fechar
          </Button>
          <Button variant="danger" onClick={() => handleDismiss(true)} className="flex-1">
            <span>Próxima Rodada</span>
            <ArrowRight size={15} />
          </Button>
        </div>
      </div>
    </div>
  );
};
