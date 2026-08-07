import { extractYouTubeId } from "../utils/youtubeUtils";
import { createYouTubeAudio } from "../utils/youtubePlayer";
import { useEffect, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import {
  getWheelConfig,
  saveWheelConfig,
  getSettings,
  saveSettings,
  getAudios,
  saveAudios,
  getResults,
  saveResults,
  getSeasons,
  saveSeasons,
} from '../utils/persistence';
import { CustomAudio, CustomAudioItem } from '../types';

export const useAppInitialization = () => {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadAppData = async () => {
      try {
        const wheel = await getWheelConfig();
        const state = useAppStore.getState();

        if (wheel) {
          state.setTitle(wheel.title || "Grande Sorteio da Equipe");
          const usedIds = new Set<string>();
          const cleanedItems = wheel.entries.map((entry: any) => {
            let id = entry.id;
            if (!id || usedIds.has(id)) {
              id = crypto.randomUUID();
            }
            usedIds.add(id);
            return {
              ...entry,
              id,
              weight: entry.weight || 1,
              enabled: entry.enabled !== false,
              text: entry.text || "",
            };
          });
          state.setItems(cleanedItems);
          state.setColors(wheel.colorSettings ? wheel.colorSettings.map((c: any) => c.color) : []);
          if (wheel.customPictureDataUri) state.setCenterImage(wheel.customPictureDataUri);
          if (wheel.winnerMessage) state.setWinMessage(wheel.winnerMessage);
        }

        const settings = await getSettings();
        if (settings) {
          if (settings.spinTime !== undefined) state.setSpinTime(settings.spinTime);
          if (settings.showConfetti !== undefined) state.setShowConfetti(settings.showConfetti);
          if (settings.autoRemoveWinner !== undefined) state.setAutoRemoveWinner(settings.autoRemoveWinner);
          if (settings.soundEnabled !== undefined) state.setSoundEnabled(settings.soundEnabled);
          if (settings.masterVolume !== undefined) state.setMasterVolume(settings.masterVolume);
          if (settings.tickSoundType !== undefined) state.setTickSoundType(settings.tickSoundType);
          if (settings.spinSoundMode !== undefined) state.setSpinSoundMode(settings.spinSoundMode);
          if (settings.winSoundType !== undefined) state.setWinSoundType(settings.winSoundType);
          if (settings.textSize !== undefined) state.setTextSize(settings.textSize);
          if (settings.centerSize !== undefined) state.setCenterSize(settings.centerSize);
          if (settings.isAdvancedEntries !== undefined) state.setIsAdvancedEntries(settings.isAdvancedEntries);
          if (settings.eliminationMessage !== undefined) state.setEliminationMessage(settings.eliminationMessage);
          if (settings.grandWinnerMessage !== undefined) state.setGrandWinnerMessage(settings.grandWinnerMessage);
          if (settings.eliminationMode !== undefined) state.setEliminationMode(settings.eliminationMode);
          if (settings.autoContinueElimination !== undefined) state.setAutoContinueElimination(settings.autoContinueElimination);
          if (settings.balanceWeightsByWins !== undefined) state.setBalanceWeightsByWins(settings.balanceWeightsByWins);
          if (settings.balanceScope !== undefined) state.setBalanceScope(settings.balanceScope);
          if (settings.pitySystemEnabled !== undefined) state.setPitySystemEnabled(settings.pitySystemEnabled);
          if (settings.showPitySystemVisually !== undefined) state.setShowPitySystemVisually(settings.showPitySystemVisually);
          if (settings.antiRepetitionEnabled !== undefined) state.setAntiRepetitionEnabled(settings.antiRepetitionEnabled);
          if (settings.antiRepetitionCount !== undefined) state.setAntiRepetitionCount(settings.antiRepetitionCount);
          if (settings.eliminationSoundType !== undefined) state.setEliminationSoundType(settings.eliminationSoundType);
          if (settings.eliminationSpinTime !== undefined) state.setEliminationSpinTime(settings.eliminationSpinTime);
          if (settings.wheelTheme !== undefined) state.setWheelTheme(settings.wheelTheme);
          if (settings.penaltySaveWins !== undefined) state.setPenaltySaveWins(settings.penaltySaveWins);
        }

        const dbAudios = await getAudios();
        if (dbAudios) {
          const ticks: CustomAudio[] = [];
          const wins: CustomAudio[] = [];

          dbAudios.forEach((item) => {
            const url = item.blob ? URL.createObjectURL(item.blob) : (item.url || "");
            let audioObj: any = null;
            
            if (!item.blob) {
              const ytId = extractYouTubeId(url);
              if (ytId) {
                audioObj = createYouTubeAudio(ytId);
              } else {
                audioObj = new Audio(url);
              }
            } else {
              audioObj = new Audio(url);
            }

            const customAudio: CustomAudio = {
              id: item.id,
              name: item.name,
              url,
              audioObj,
              isFile: !!item.blob,
              mode: item.mode,
              startTime: item.startTime,
              endTime: item.endTime,
              volume: item.volume
            };
            if (item.categories.includes("tick")) ticks.push(customAudio);
            if (item.categories.includes("win")) wins.push(customAudio);
          });
          state.setCustomTickAudios(ticks);
          state.setCustomWinAudios(wins);
        }

        const dbResults = await getResults();
        if (dbResults) {
          state.setResults(dbResults);
        }
        
        const dbSeasons = await getSeasons();
        if (dbSeasons) {
          state.setSeasons(dbSeasons);
        }
      } catch (err) {
        console.error("Failed to load generic data from indexedDB", err);
      } finally {
        setIsLoaded(true);
      }
    };

    loadAppData();
  }, []);

  // Save Wheel Config
  const title = useAppStore(s => s.title);
  const items = useAppStore(s => s.items);
  const colors = useAppStore(s => s.colors);
  const centerImage = useAppStore(s => s.centerImage);
  const winMessage = useAppStore(s => s.winMessage);

  useEffect(() => {
    if (!isLoaded) return;
    saveWheelConfig({
      title,
      entries: items.map(i => ({
        ...i,
        text: i.text,
        weight: i.weight,
        enabled: i.enabled,
        color: i.color,
        message: i.message,
        sound: i.sound,
        image: i.image
      })),
      colorSettings: colors.map(color => ({ color, enabled: true })),
      customPictureDataUri: centerImage,
      winnerMessage: winMessage
    });
  }, [isLoaded, title, items, colors, centerImage, winMessage]);

  // Save Settings
  const spinTime = useAppStore(s => s.spinTime);
  const showConfetti = useAppStore(s => s.showConfetti);
  const autoRemoveWinner = useAppStore(s => s.autoRemoveWinner);
  const soundEnabled = useAppStore(s => s.soundEnabled);
  const masterVolume = useAppStore(s => s.masterVolume);
  const tickSoundType = useAppStore(s => s.tickSoundType);
  const spinSoundMode = useAppStore(s => s.spinSoundMode);
  const winSoundType = useAppStore(s => s.winSoundType);
  const textSize = useAppStore(s => s.textSize);
  const centerSize = useAppStore(s => s.centerSize);
  const isAdvancedEntries = useAppStore(s => s.isAdvancedEntries);
  const eliminationMessage = useAppStore(s => s.eliminationMessage);
  const grandWinnerMessage = useAppStore(s => s.grandWinnerMessage);
  const eliminationMode = useAppStore(s => s.eliminationMode);
  const autoContinueElimination = useAppStore(s => s.autoContinueElimination);
  const balanceWeightsByWins = useAppStore(s => s.balanceWeightsByWins);
  const balanceScope = useAppStore(s => s.balanceScope);
  const pitySystemEnabled = useAppStore(s => s.pitySystemEnabled);
  const showPitySystemVisually = useAppStore(s => s.showPitySystemVisually);
  const antiRepetitionEnabled = useAppStore(s => s.antiRepetitionEnabled);
  const antiRepetitionCount = useAppStore(s => s.antiRepetitionCount);
  const eliminationSoundType = useAppStore(s => s.eliminationSoundType);
  const eliminationSpinTime = useAppStore(s => s.eliminationSpinTime);
  const wheelTheme = useAppStore(s => s.wheelTheme);
  const penaltySaveWins = useAppStore(s => s.penaltySaveWins);

  useEffect(() => {
    if (!isLoaded) return;
    saveSettings({
      spinTime,
      showConfetti,
      autoRemoveWinner,
      soundEnabled,
      masterVolume,
      tickSoundType,
      spinSoundMode,
      winSoundType,
      textSize,
      centerSize,
      isAdvancedEntries,
      eliminationMessage,
      grandWinnerMessage,
      eliminationMode,
      autoContinueElimination,
      balanceWeightsByWins,
      balanceScope,
      pitySystemEnabled,
      showPitySystemVisually,
      antiRepetitionEnabled,
      antiRepetitionCount,
      eliminationSoundType,
      eliminationSpinTime,
      wheelTheme,
      penaltySaveWins
    });
  }, [
    isLoaded, spinTime, showConfetti, autoRemoveWinner, soundEnabled, 
    masterVolume, tickSoundType, spinSoundMode, winSoundType, textSize, 
    centerSize, isAdvancedEntries, eliminationMessage, grandWinnerMessage,
    eliminationMode, autoContinueElimination, balanceWeightsByWins, balanceScope, pitySystemEnabled, showPitySystemVisually, antiRepetitionEnabled, antiRepetitionCount, eliminationSoundType,
    eliminationSpinTime, wheelTheme, penaltySaveWins
  ]);

  // Save Results
  const results = useAppStore(s => s.results);
  useEffect(() => {
    if (!isLoaded) return;
    saveResults(results);
  }, [isLoaded, results]);

  // Save Seasons
  const seasons = useAppStore(s => s.seasons);
  useEffect(() => {
    if (!isLoaded) return;
    saveSeasons(seasons);
  }, [isLoaded, seasons]);

  // Save Audios
  const customTickAudios = useAppStore(s => s.customTickAudios);
  const customWinAudios = useAppStore(s => s.customWinAudios);

  useEffect(() => {
    if (!isLoaded) return;
    const audiosToSave: CustomAudioItem[] = [];

    const processAudio = async (audio: CustomAudio, cat: "tick" | "win") => {
      let existing = audiosToSave.find((a) => a.id === audio.id);
      if (!existing) {
        existing = {
          id: audio.id,
          categories: [cat],
          name: audio.name,
          url: audio.isFile ? undefined : audio.url,
          isFile: audio.isFile,
          mode: audio.mode,
          startTime: audio.startTime,
          endTime: audio.endTime,
          volume: audio.volume,
        };
        if (audio.isFile && audio.url.startsWith("blob:")) {
            try {
                const res = await fetch(audio.url);
                existing.blob = await res.blob();
            } catch (e) {
                console.error("Failed to fetch blob for IDB", e);
            }
        }
        audiosToSave.push(existing);
      } else {
        if (!existing.categories.includes(cat)) {
            existing.categories.push(cat);
        }
      }
    };

    const run = async () => {
      for (const a of customTickAudios) await processAudio(a, "tick");
      for (const a of customWinAudios) await processAudio(a, "win");
      saveAudios(audiosToSave);
    };
    run();
  }, [isLoaded, customTickAudios, customWinAudios]);

  return { isLoaded };
};
