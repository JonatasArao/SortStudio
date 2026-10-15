import { useEffect, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useWheelActions } from './useWheelActions';
import { playWinSound } from '../utils/audioEngine';

export const useGameLoop = () => {
  const winner = useAppStore((s) => s.winner);
  const setWinner = useAppStore((s) => s.setWinner);

  const {
    handleUpdateItem,
    stopWinSound,
    clearTimeouts,
    stopContinuousAudio,
    spinWheel,
  } = useWheelActions();

  const stopWinSoundRef = useRef(stopWinSound);
  const handleUpdateItemRef = useRef(handleUpdateItem);
  const setWinnerRef = useRef(setWinner);
  const clearTimeoutsRef = useRef(clearTimeouts);
  const stopContinuousAudioRef = useRef(stopContinuousAudio);
  const spinWheelRef = useRef(spinWheel);

  useEffect(() => {
    stopWinSoundRef.current = stopWinSound;
    handleUpdateItemRef.current = handleUpdateItem;
    setWinnerRef.current = setWinner;
    clearTimeoutsRef.current = clearTimeouts;
    stopContinuousAudioRef.current = stopContinuousAudio;
    spinWheelRef.current = spinWheel;
  }, [stopWinSound, handleUpdateItem, setWinner, clearTimeouts, stopContinuousAudio, spinWheel]);

  useEffect(() => {
    if (!winner) return;

    if (winner.isEliminated) {
      const state = useAppStore.getState();
      const isAuto = state.isAutoEliminating || state.autoContinueElimination;

      // Se o popup estiver ativo no modo manual, aguarda a interação do usuário (clique em Próxima Rodada ou Fechar)
      if (!isAuto && state.eliminationOverlayItem) {
        return;
      }

      // Delays snappies no auto-giro com popup visual: turbo (350ms), fast (700ms), normal (1200ms), ou 600ms no modo direto
      const delayMs = isAuto
        ? (state.autoEliminationSpeed === 'turbo' 
            ? 350 
            : state.autoEliminationSpeed === 'fast' 
              ? 700 
              : 1200)
        : 600;

      const timer = setTimeout(() => {
        const liveState = useAppStore.getState();
        const activeItems = liveState.items.filter(
          (i) => i.enabled && i.text.trim() !== "" && i.id !== winner.id
        );

        handleUpdateItemRef.current(winner.id, { enabled: false, isEliminated: true });
        setWinnerRef.current(null);
        liveState.setEliminationOverlayItem(null);

        if (activeItems.length > 1) {
          if (liveState.isAutoEliminating || liveState.autoContinueElimination) {
            setTimeout(() => {
              spinWheelRef.current();
            }, 50);
          }
        } else if (activeItems.length === 1) {
          const grandWinner = activeItems[0];
          clearTimeoutsRef.current();
          stopContinuousAudioRef.current();
          liveState.setIsAutoEliminating(false);

          const actualVolume = liveState.soundEnabled ? liveState.masterVolume / 100 : 0;
          if (actualVolume > 0) {
            const genericCustomWin = liveState.customWinAudios.find(a => a.id === liveState.winSoundType) || null;
            playWinSound(0.6, liveState.winSoundType, genericCustomWin, actualVolume);
          }

          const drawId = crypto.randomUUID();
          liveState.setWinner({ ...grandWinner, type: 'grand_winner', drawId });
          liveState.setResults((prev) => [
            { ...grandWinner, drawId, type: 'grand_winner', timestamp: Date.now() },
            ...prev,
          ]);
        }
      }, delayMs);

      return () => clearTimeout(timer);
    }
  }, [winner]);
};
