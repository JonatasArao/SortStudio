import { filterResultsByScope } from "../utils/seasonUtils";
import { calculateWeights } from "../utils/weightUtils";
import { useCallback } from 'react';
import { useAppStore } from '../store/useAppStore';
import { getSecureRandom, secureShuffle } from '../utils/cryptoRandom';
import { getSpinTimeRanges } from '../utils/spinUtils';
import { getAudioCtx, playTickSound, playWinSound, playFailureSound, stopWinSound, stopRaceAudio } from '../utils/audioEngine';
import { useWheelData } from './useWheelData';
import {
  FULL_CIRCLE_DEG,
  WHEEL_TOP_OFFSET_DEG,
  SLICE_RANDOM_OFFSET_MULTIPLIER,
  SLICE_RANDOM_OFFSET_SUBTRACTOR,
  MIN_EXTRA_SPINS,
  TICK_BASE_DELAY_MS,
  TICK_DELAY_MULTIPLIER,
  SPIN_COMPLETION_SOUND_THRESHOLD_MS,
  RACE_START_DELAY_MS
} from '../constants';

export const updateContinuousAudioVolume = () => {
  const state = useAppStore.getState();
  const { continuousAudioRef } = state;
  if (continuousAudioRef) {
    const actualVolume = state.soundEnabled ? state.masterVolume / 100 : 0;
    continuousAudioRef.volume = actualVolume;
  }
};

export const playRaceDefinedAudio = () => {
  const state = useAppStore.getState();
  if (!state.soundEnabled || state.masterVolume <= 0) return;

  const actualVolume = state.masterVolume / 100;
  const selectedCustomTick = state.customTickAudios.find((a) => a.id === state.tickSoundType);

  if (selectedCustomTick && selectedCustomTick.audioObj) {
    const audioObj = selectedCustomTick.audioObj;
    const customVol = selectedCustomTick.volume !== undefined ? selectedCustomTick.volume / 100 : 1;
    audioObj.volume = actualVolume * customVol;
    audioObj.loop = true;
    if (typeof selectedCustomTick.startTime === 'number') {
      audioObj.startTime = selectedCustomTick.startTime;
    }
    if (typeof selectedCustomTick.endTime === 'number') {
      audioObj.endTime = selectedCustomTick.endTime;
    }
    if (audioObj instanceof HTMLAudioElement) {
      audioObj.currentTime = selectedCustomTick.startTime || 0;
    }
    const playResult = audioObj.play();
    if (playResult && typeof playResult.catch === 'function') {
      playResult.catch(() => {});
    }
    state.setContinuousAudioRef(audioObj);
  } else {
    let delay = TICK_BASE_DELAY_MS;
    let currentTime = 0;
    let actualSpinTime = state.spinTime;
    const isFinalRound = state.eliminationMode && state.items.filter(i => i.enabled && !i.isEliminated).length === 2;
    const isElimFast = !isFinalRound && state.eliminationMode;
    const spinRangeAudio = getSpinTimeRanges(state.wheelType, isElimFast);
    actualSpinTime = isElimFast ? state.eliminationSpinTime : state.spinTime;
    actualSpinTime = Math.max(spinRangeAudio.min, Math.min(spinRangeAudio.max, actualSpinTime));
    const spinDurationMs = actualSpinTime * 1000;

    const playNextTickTimer = () => {
      const liveState = useAppStore.getState();
      if (!liveState.isSpinning) return;
      const liveVolume = liveState.soundEnabled ? liveState.masterVolume / 100 : 0;
      if (liveVolume > 0) {
        playTickSound(0.5, liveState.tickSoundType, selectedCustomTick?.audioObj || null, liveVolume);
      }

      const progress = currentTime / spinDurationMs;
      delay = TICK_BASE_DELAY_MS + Math.pow(progress, 3) * TICK_DELAY_MULTIPLIER;
      currentTime += delay;
      const timeout = setTimeout(playNextTickTimer, delay);
      useAppStore.getState().setTickTimeoutsRef(prev => [...prev, timeout]);
    };
    playNextTickTimer();
  }
};

export const useWheelActions = () => {

  const { slices } = useWheelData();

  const clearTimeouts = () => {
    const state = useAppStore.getState();
    if (state.spinTimeoutRef) clearTimeout(state.spinTimeoutRef);
    state.tickTimeoutsRef.forEach(clearTimeout);
    state.setSpinTimeoutRef(null);
    state.setTickTimeoutsRef([]);
  };

  const stopContinuousAudio = () => {
    stopRaceAudio();
    const state = useAppStore.getState();
    const { continuousAudioRef } = state;
    if (continuousAudioRef) {
      continuousAudioRef.pause();
      continuousAudioRef.currentTime = 0;
      state.setContinuousAudioRef(null);
    }
  };

  const handleAddEmptyItem = () => {
    const { isSpinning, setItems } = useAppStore.getState();
    if (!isSpinning) {
      setItems((prev) => [
        ...prev,
        { id: crypto.randomUUID(), text: "", weight: 1, enabled: true },
      ]);
    }
  };

  const handleUpdateItem = (id: string, updates: any) => {
    useAppStore.getState().setItems((prev: any[]) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  const handleRemoveItem = (id: string) => {
    const { isSpinning, setItems } = useAppStore.getState();
    if (!isSpinning) setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleMoveItem = (id: string, dir: "up" | "down") => {
    const { isSpinning, setItems } = useAppStore.getState();
    if (isSpinning) return;
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.id === id);
      if (idx < 0) return prev;
      if (dir === "up" && idx > 0) {
        const newItems = [...prev];
        [newItems[idx - 1], newItems[idx]] = [newItems[idx], newItems[idx - 1]];
        return newItems;
      }
      if (dir === "down" && idx < prev.length - 1) {
        const newItems = [...prev];
        [newItems[idx + 1], newItems[idx]] = [newItems[idx], newItems[idx + 1]];
        return newItems;
      }
      return prev;
    });
  };

  const handleShuffle = () => {
    const { isSpinning, setItems } = useAppStore.getState();
    if (!isSpinning) setItems((prev) => secureShuffle(prev));
  };

  const handleToggleSelectAll = () => {
    const { isSpinning, items, setItems } = useAppStore.getState();
    if (isSpinning || items.length === 0) return;
    const allSelected = items.every((i) => i.enabled !== false);
    setItems((prev) => prev.map((item) => ({ ...item, enabled: !allSelected })));
  };

  const handleSelectAll = () => {
    const { isSpinning, setItems } = useAppStore.getState();
    if (!isSpinning) {
      setItems((prev) => prev.map((item) => ({ ...item, enabled: true })));
    }
  };

  const handleDeselectAll = () => {
    const { isSpinning, setItems } = useAppStore.getState();
    if (!isSpinning) {
      setItems((prev) => prev.map((item) => ({ ...item, enabled: false })));
    }
  };

  const handleSort = () => {
    const { isSpinning, setItems } = useAppStore.getState();
    if (!isSpinning) {
      setItems((prev) =>
        [...prev].sort((a, b) => a.text.localeCompare(b.text))
      );
    }
  };

  const handleAddColor = () => {
    const { newColor, setColors } = useAppStore.getState();
    setColors((prev) => [...prev, newColor]);
  };

  const handleRemoveColor = (indexToRemove: number) => {
    useAppStore.getState().setColors((prev) => {
      if (prev.length <= 2) return prev;
      return prev.filter((_, idx) => idx !== indexToRemove);
    });
  };

  const spinWheel = useCallback((fastSpin: boolean = false, ignoreWeights: boolean = false, forcedWinnerId?: string) => {
    const state = useAppStore.getState();
    const currentItems = state.items;
    const scopedResults = filterResultsByScope(state.results, state.seasons, state.balanceScope);
    const currentValidItems = currentItems.filter((i) => i.enabled && i.text.trim() !== "");
    
    if (state.isSpinning || currentValidItems.length < 2) return;
    const ctx = getAudioCtx();
    if (ctx && ctx.state === "suspended") ctx.resume();

    state.setWinSoundPlayedInRace(false);
    state.setIsSpinning(true);
    if (!state.autoContinueElimination || !state.eliminationMode) {
      state.setWinner(null);
    }
    clearTimeouts();

    let itemsWithFinalWeights = currentValidItems.map(i => ({ ...i, weight: ignoreWeights ? 1 : (i.weight !== undefined ? i.weight : 1) }));
    if (!ignoreWeights) {
      itemsWithFinalWeights = calculateWeights(
        currentValidItems,
        scopedResults,
        state.pitySystemEnabled,
        state.balanceWeightsByWins,
        state.balanceWeightsMode,
        state.ignoreNewItemWeight,
        state.newItemWeightMode,
        state.antiRepetitionEnabled,
        state.antiRepetitionCount,
        state.eliminationMode,
        state.wheelType,
        true // applyPityAndBalance is always true during actual spin
      );
    }

    const getActualWeight = (item: any) => {
      const found = itemsWithFinalWeights.find(i => i.id === item.id);
      return found ? found.weight : 1;
    };

    let totalWeight = currentValidItems.reduce(
      (acc, item) => acc + getActualWeight(item),
      0,
    );
    if (totalWeight <= 0) totalWeight = currentValidItems.length;

    const pickWinnerIndex = () => {
      let randomWeight = getSecureRandom() * totalWeight;
      let currentWeight = 0;
      for (let i = 0; i < currentValidItems.length; i++) {
        currentWeight += getActualWeight(currentValidItems[i]);
        if (randomWeight < currentWeight) {
          return i;
        }
      }
      return 0;
    };

    let winIndex = 0;
    if (forcedWinnerId) {
      const idx = currentValidItems.findIndex(i => i.id === forcedWinnerId);
      if (idx !== -1) {
        winIndex = idx;
      }
    } else {
      winIndex = pickWinnerIndex();

    }

    const winnerId = currentValidItems[winIndex].id;
    const winSlice = slices.find(s => s.item.id === winnerId);
    if (!winSlice) {
      state.setIsSpinning(false);
      state.setExpectedWinnerId(undefined);
      return;
    }

    state.setExpectedWinnerId(winnerId);

    // If it's a 3D race, generate the complete podium sequence
    if (state.wheelType === 'race') {
      const winnerId = currentValidItems[winIndex].id;
      
      const remainingSlices = slices
        .filter(s => s.item.id !== winnerId)
        .map(s => ({
          id: s.item.id,
          text: s.item.text,
          color: s.color,
          score: (s.item.weight !== undefined ? item.weight : 1) * 0.5 + getSecureRandom() * 5
        }));

      remainingSlices.sort((a, b) => b.score - a.score);

      const podium = [
        {
          id: winnerId,
          text: currentValidItems[winIndex].text,
          color: winSlice.color,
          rank: 1
        },
        ...remainingSlices.map((item, index) => ({
          id: item.id,
          text: item.text,
          color: item.color,
          rank: index + 2
        }))
      ];
      
      state.setRacePodium(podium);
    }

    let penaltyDurationMs = 5000;
    if (state.wheelType === 'penalty_shootout') {
      const winnerId = currentValidItems[winIndex].id;
      const expectedWinnerItem = currentValidItems[winIndex];

      const otherItems = currentValidItems.filter(item => item.id !== winnerId);
      const shuffledOthers = [...otherItems].sort(() => getSecureRandom() - 0.5);

      const sequence = [...shuffledOthers, expectedWinnerItem];

      state.setPenaltySequence(sequence);

      const KICK_DURATION = 1550;
      const activeKicksCount = sequence.length;
      penaltyDurationMs = activeKicksCount * KICK_DURATION;
    }

    const randomOffset = state.wheelType === 'horizon' 
      ? 0 
      : getSecureRandom() * (winSlice.angle * SLICE_RANDOM_OFFSET_MULTIPLIER) - winSlice.angle * SLICE_RANDOM_OFFSET_SUBTRACTOR;
    const sliceCenter = winSlice.startAngle + winSlice.angle / 2;
    const targetAngle = FULL_CIRCLE_DEG + WHEEL_TOP_OFFSET_DEG - sliceCenter + randomOffset;

    const isFinalRound = state.eliminationMode && currentValidItems.length === 2;
    let actualSpinTime = isFinalRound 
      ? state.spinTime 
      : (state.eliminationMode ? state.eliminationSpinTime : state.spinTime);

    const spinRange = getSpinTimeRanges(state.wheelType, !isFinalRound && state.eliminationMode);
    actualSpinTime = Math.max(spinRange.min, Math.min(spinRange.max, actualSpinTime));

    const isMysteryBox = state.wheelType === 'mystery_box';
    const isInstantSpin = isMysteryBox && fastSpin;
    let spinDurationMs = isInstantSpin ? 50 : actualSpinTime * 1000;

    if (state.wheelType === 'penalty_shootout' && !isInstantSpin) {
      spinDurationMs = penaltyDurationMs;
    } else if (state.wheelType === 'race' && !isInstantSpin) {
      // Add a small 1s buffer for finish line crossing
      spinDurationMs = RACE_START_DELAY_MS + actualSpinTime * 1000 + 1000;
    }
    // adding a highly random range of extra rotations to add more chaos to the wheel
    const randomExtraRotations = Math.floor(getSecureRandom() * 15) + 6;
    const extraSpins = isMysteryBox ? 0 : FULL_CIRCLE_DEG * (Math.max(MIN_EXTRA_SPINS, Math.floor(actualSpinTime)) + randomExtraRotations);
    
    // Add micro variations to the target angle to jitter the final resting place
    const finalTargetAngle = targetAngle + (getSecureRandom() * 4 - 2); 
    
    // make base current rotation entirely detached from any predictable cadence by picking current base safely
    const currentBase = state.rotation;
    const currentModulo = currentBase % FULL_CIRCLE_DEG;
    const newRotation = currentBase - currentModulo + extraSpins + finalTargetAngle;

    state.setRotation(newRotation);

    const actualVolume = state.soundEnabled ? state.masterVolume / 100 : 0;
    const selectedCustomTick = state.customTickAudios.find((a) => a.id === state.tickSoundType);
    const selectedCustomWin = state.customWinAudios.find((a) => a.id === state.winSoundType)?.audioObj || null;

    if (!isInstantSpin && state.wheelType !== 'race') {
      if (selectedCustomTick && selectedCustomTick.audioObj) {
        if (actualVolume > 0) {
          selectedCustomTick.audioObj.volume = actualVolume;
          selectedCustomTick.audioObj.loop = true;
          if (typeof selectedCustomTick.startTime === 'number') {
            selectedCustomTick.audioObj.startTime = selectedCustomTick.startTime;
          }
          if (typeof selectedCustomTick.endTime === 'number') {
            selectedCustomTick.audioObj.endTime = selectedCustomTick.endTime;
          }
          
          if (state.continuousAudioRef !== selectedCustomTick.audioObj || selectedCustomTick.audioObj.paused) {
            if (selectedCustomTick.audioObj instanceof HTMLAudioElement) {
              selectedCustomTick.audioObj.currentTime = selectedCustomTick.startTime || 0;
            }
            selectedCustomTick.audioObj.play();
          }
          state.setContinuousAudioRef(selectedCustomTick.audioObj);
        }
      } else {
        let delay = TICK_BASE_DELAY_MS;
        let currentTime = 0;

        const playNextTickTimer = () => {
          if (currentTime >= spinDurationMs - SPIN_COMPLETION_SOUND_THRESHOLD_MS) return;
          const liveState = useAppStore.getState();
          const liveVolume = liveState.soundEnabled ? liveState.masterVolume / 100 : 0;
          if (liveVolume > 0) {
            playTickSound(0.5, liveState.tickSoundType, selectedCustomTick?.audioObj || null, liveVolume);
          }

          const progress = currentTime / spinDurationMs;
          delay = TICK_BASE_DELAY_MS + Math.pow(progress, 3) * TICK_DELAY_MULTIPLIER;
          currentTime += delay;
          const timeout = setTimeout(playNextTickTimer, delay);
          
          useAppStore.getState().setTickTimeoutsRef(prev => [...prev, timeout]);
        };
        playNextTickTimer();
      }
    }

    const newSpinTimeout = setTimeout(() => {
      const currentState = useAppStore.getState();
      currentState.setIsSpinning(false);

      const winningItem = currentValidItems[winIndex];
      const isFinalRound = currentState.eliminationMode && currentValidItems.length === 2;

      if (!currentState.eliminationMode || isFinalRound) {
        stopContinuousAudio();
      }

      const drawId = crypto.randomUUID();
      const type = isFinalRound ? 'grand_winner' : (currentState.eliminationMode ? 'eliminated' : 'winner');

      if (currentState.eliminationMode && !isFinalRound) {
        currentState.setWinner({ ...winningItem, isEliminated: true, type: 'eliminated' });
      } else if (isFinalRound) {
        currentState.setWinner({ ...winningItem, isEliminated: false, type: 'grand_winner', drawId });
        // Disable the OTHER item magically to clean state since game is over
        const otherItem = currentValidItems.find(i => i.id !== winningItem.id);
        if (otherItem) {
           currentState.setItems(prev => prev.map(i => i.id === otherItem.id ? { ...i, enabled: false } : i));
        }
      } else {
        currentState.setWinner({ ...winningItem, type: 'winner', drawId });
      }
      
      if (type !== 'eliminated') {
        currentState.setResults((prev) => [
          { ...winningItem, drawId, type, timestamp: Date.now() },
          ...prev,
        ]);
      }

      // Pity system weights are now computed dynamically from results history, no state update needed here.

      const finalState = useAppStore.getState();
      const finalVolume = finalState.soundEnabled ? finalState.masterVolume / 100 : 0;
      if (finalVolume > 0) {
        if (finalState.wheelType === 'race' && finalState.winSoundPlayedInRace) {
          // Already played win sound when the first car crossed the finish line
        } else if (finalState.eliminationMode && !isFinalRound) {
          const genericCustomFail = finalState.customWinAudios.find(a => a.id === finalState.eliminationSoundType) || null;
          playFailureSound(finalVolume, finalState.eliminationSoundType, genericCustomFail);
        } else {
          const customSound = winningItem.sound;
          if (customSound && customSound !== "") {
            const foundCustomAudio =
              finalState.customWinAudios.find((a) => a.id === customSound) || null;
            playWinSound(0.6, customSound, foundCustomAudio, finalVolume);
          } else {
            const genericCustomWin = finalState.customWinAudios.find(a => a.id === finalState.winSoundType) || null;
            playWinSound(0.6, finalState.winSoundType, genericCustomWin, finalVolume);
          }
        }
      }
    }, spinDurationMs);

    state.setSpinTimeoutRef(newSpinTimeout);
  }, [slices]);

  return {
    handleAddEmptyItem,
    handleUpdateItem,
    handleRemoveItem,
    handleMoveItem,
    handleShuffle,
    handleToggleSelectAll,
    handleSelectAll,
    handleDeselectAll,
    handleSort,
    handleAddColor,
    handleRemoveColor,
    spinWheel,
    clearTimeouts,
    stopContinuousAudio,
    stopWinSound
  };
};
