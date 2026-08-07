import { useEffect, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useWheelActions } from './useWheelActions';
import { playWinSound } from '../utils/audioEngine';

export const useGameLoop = () => {
  const winner = useAppStore((s) => s.winner);
  const autoContinueElimination = useAppStore((s) => s.autoContinueElimination);
  const setWinner = useAppStore((s) => s.setWinner);

  const {
    handleUpdateItem,
    stopWinSound,
    spinWheel,
    clearTimeouts,
    stopContinuousAudio,
  } = useWheelActions();

  const spinWheelRef = useRef(spinWheel);
  const stopWinSoundRef = useRef(stopWinSound);
  const handleUpdateItemRef = useRef(handleUpdateItem);
  const setWinnerRef = useRef(setWinner);
  const clearTimeoutsRef = useRef(clearTimeouts);
  const stopContinuousAudioRef = useRef(stopContinuousAudio);

  useEffect(() => {
    spinWheelRef.current = spinWheel;
    stopWinSoundRef.current = stopWinSound;
    handleUpdateItemRef.current = handleUpdateItem;
    setWinnerRef.current = setWinner;
    clearTimeoutsRef.current = clearTimeouts;
    stopContinuousAudioRef.current = stopContinuousAudio;
  }, [spinWheel, stopWinSound, handleUpdateItem, setWinner, clearTimeouts, stopContinuousAudio]);

  useEffect(() => {
    if (!winner) return;

    if (winner.isEliminated) {
      if (autoContinueElimination) {
        const timeout = setTimeout(() => {
          stopWinSoundRef.current();

          const state = useAppStore.getState();
          const activeItems = state.items.filter(
            (i) => i.enabled && i.text.trim() !== "" && i.id !== winner.id
          );

          handleUpdateItemRef.current(winner.id, { enabled: false });

          if (activeItems.length > 1) {
            setTimeout(() => {
              spinWheelRef.current();
            }, 50);
          } else if (activeItems.length === 1) {
            const grandWinner = activeItems[0];
            setTimeout(() => {
               clearTimeoutsRef.current();
               stopContinuousAudioRef.current();
               const updatedState = useAppStore.getState();
               const actualVolume = updatedState.soundEnabled ? updatedState.masterVolume / 100 : 0;
               if (actualVolume > 0) {
                 const genericCustomWin = updatedState.customWinAudios.find(a => a.id === updatedState.winSoundType) || null;
                 playWinSound(0.6, updatedState.winSoundType, genericCustomWin, actualVolume);
               }

               const drawId = crypto.randomUUID();
               updatedState.setWinner({ ...grandWinner, type: 'grand_winner', drawId });
               updatedState.setResults((prev) => [
                 { ...grandWinner, drawId, type: 'grand_winner', timestamp: Date.now() },
                 ...prev,
               ]);
            }, 300);
          }
        }, 50);

        return () => clearTimeout(timeout);
      } else {
        // Manual elimination: Disable the item right away so the wheel updates
        // without waiting for user intervention. The feed will show who was eliminated.
        const timeout = setTimeout(() => {
          const state = useAppStore.getState();
          const activeItems = state.items.filter(
            (i) => i.enabled && i.text.trim() !== "" && i.id !== winner.id
          );

          handleUpdateItemRef.current(winner.id, { enabled: false });
          setWinnerRef.current(null);

          if (activeItems.length === 1) {
            const grandWinner = activeItems[0];
            setTimeout(() => {
               clearTimeoutsRef.current();
               stopContinuousAudioRef.current();
               const updatedState = useAppStore.getState();
               const actualVolume = updatedState.soundEnabled ? updatedState.masterVolume / 100 : 0;
               if (actualVolume > 0) {
                 const genericCustomWin = updatedState.customWinAudios.find(a => a.id === updatedState.winSoundType) || null;
                 playWinSound(0.6, updatedState.winSoundType, genericCustomWin, actualVolume);
               }

               const drawId = crypto.randomUUID();
               updatedState.setWinner({ ...grandWinner, type: 'grand_winner', drawId });
               updatedState.setResults((prev) => [
                 { ...grandWinner, drawId, type: 'grand_winner', timestamp: Date.now() },
                 ...prev,
               ]);
            }, 300);
          }
        }, 1500); // 1.5s delay before slice shrinks so it doesn't instantly vanish on win

        return () => clearTimeout(timeout);
      }
    }
  }, [winner, autoContinueElimination]);
};
