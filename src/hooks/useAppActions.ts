import { useAppStore } from '../store/useAppStore';
import { extractYouTubeId } from '../utils/youtubeUtils';
import { createYouTubeAudio } from '../utils/youtubePlayer';

export const useAudioActions = () => {
  const addCustomAudio = (
    categories: ("tick" | "win")[],
    fileOrUrl: File | string,
    name: string,
    isFile = false,
    mode: "tick" | "continuous" = "continuous",
    startTime?: number,
    endTime?: number,
    volume?: number
  ) => {
    const { 
      setCustomTickAudios, setTickSoundType,
      setCustomWinAudios, setWinSoundType,
    } = useAppStore.getState();

    const newId = crypto.randomUUID();
    let url = '';
    let audioObj: any = null;

    if (isFile) {
      url = URL.createObjectURL(fileOrUrl as File);
      audioObj = new Audio(url);
    } else {
      url = fileOrUrl as string;
      const ytId = extractYouTubeId(url);
      if (ytId) {
        audioObj = createYouTubeAudio(ytId);
      } else {
        audioObj = new Audio(url);
      }
    }

    const newAudio = { id: newId, url, name, audioObj, isFile, mode, startTime, endTime, volume };

    if (categories.includes("tick")) {
      setCustomTickAudios((prev) => [...prev, newAudio]);
      setTickSoundType(newId);
    }
    if (categories.includes("win")) {
      setCustomWinAudios((prev) => [...prev, newAudio]);
      setWinSoundType(newId);
    }
  };

  const updateCustomAudio = (
    id: string,
    updates: {
      name?: string;
      mode?: "tick" | "continuous";
      startTime?: number;
      endTime?: number;
      volume?: number;
    }
  ) => {
    const { setCustomTickAudios, setCustomWinAudios } = useAppStore.getState();
    
    const updateFn = (prev: any[]) => prev.map(a => a.id === id ? { ...a, ...updates } : a);
    
    setCustomTickAudios(updateFn);
    setCustomWinAudios(updateFn);
  };

  const removeCustomAudio = (type: "tick" | "win", idToRemove: string) => {
    const state = useAppStore.getState();
    if (type === "tick") {
      const audioToRem = state.customTickAudios.find((a) => a.id === idToRemove);
      if (audioToRem && audioToRem.isFile) URL.revokeObjectURL(audioToRem.url);
      if (audioToRem?.audioObj?.destroy) audioToRem.audioObj.destroy();
      state.setCustomTickAudios((prev) => prev.filter((a) => a.id !== idToRemove));
      if (state.tickSoundType === idToRemove) state.setTickSoundType("click");
    } else if (type === "win") {
      const audioToRem = state.customWinAudios.find((a) => a.id === idToRemove);
      if (audioToRem && audioToRem.isFile) URL.revokeObjectURL(audioToRem.url);
      if (audioToRem?.audioObj?.destroy) audioToRem.audioObj.destroy();
      state.setCustomWinAudios((prev) => prev.filter((a) => a.id !== idToRemove));
      if (state.winSoundType === idToRemove) state.setWinSoundType("tada");
    }
  };

  return { addCustomAudio, removeCustomAudio, updateCustomAudio };
};

export const useAppActions = () => {
  const exportWheel = async () => {
    const state = useAppStore.getState();

    const blobUrlToBase64 = async (blobUrl: string): Promise<string> => {
      try {
        const res = await fetch(blobUrl);
        const blob = await res.blob();
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch (e) {
        console.error("Failed to convert blob to base64", e);
        return blobUrl;
      }
    };

    const processAudiosForExport = async (audios: any[]) => {
      const processed = [];
      for (const a of audios) {
        const audioCopy = { ...a };
        // We don't want to serialize the actual audioObj (which is HTMLAudioElement or youtube player)
        delete audioCopy.audioObj; 
        
        if (audioCopy.isFile && audioCopy.url && audioCopy.url.startsWith("blob:")) {
          audioCopy.url = await blobUrlToBase64(audioCopy.url);
        }
        processed.push(audioCopy);
      }
      return processed;
    };

    const customTickAudios = await processAudiosForExport(state.customTickAudios);
    const customWinAudios = await processAudiosForExport(state.customWinAudios);

    const wheelData = {
      wheels: [
        {
          wheelConfig: {
            title: state.title,
            entries: state.items.map((item) => ({
              text: item.text,
              weight: item.weight,
              enabled: item.enabled,
              color: item.color,
              message: item.message,
              sound: item.sound,
              image: item.image,
            })),
            colorSettings: state.colors.map((color) => ({ color, enabled: true })),
            spinTime: state.spinTime,
            winnerMessage: state.winMessage,
            autoRemoveWinner: state.autoRemoveWinner,
            launchConfetti: state.showConfetti,
            customPictureDataUri: state.centerImage,
            duringSpinSoundVolume: state.masterVolume,
            afterSpinSoundVolume: state.masterVolume,
            type: "color",
            allowDuplicates: true,
            animateWinner: true,
            displayHideButton: true,
            displayRemoveButton: true,
            displayWinnerDialog: true,
            drawOutlines: false,
            drawShadow: true,
            isAdvanced: true,
            maxNames: 1000,
            pageBackgroundColor: "#FFFFFF",
            pictureType: "uploaded",
            playClickWhenWinnerRemoved: false,
            showTitle: true,
            slowSpin: false,
            pointerChangesColor: true,
            pageGradient: true,
            hubSize: "S",
          },
          path: "",
          shareMode: null,
        },
      ],
      sortStudioState: {
        title: state.title,
        winMessage: state.winMessage,
        eliminationMessage: state.eliminationMessage,
        grandWinnerMessage: state.grandWinnerMessage,
        wheelTheme: state.wheelTheme,
        eliminationSpinTime: state.eliminationSpinTime,
        spinTime: state.spinTime,
        showConfetti: state.showConfetti,
        autoRemoveWinner: state.autoRemoveWinner,
        eliminationMode: state.eliminationMode,
        penaltySaveWins: state.penaltySaveWins,
        autoContinueElimination: state.autoContinueElimination,
        balanceWeightsByWins: state.balanceWeightsByWins,
        balanceScope: state.balanceScope,
        seasons: state.seasons,
        pitySystemEnabled: state.pitySystemEnabled,
        showPitySystemVisually: state.showPitySystemVisually,
        antiRepetitionEnabled: state.antiRepetitionEnabled,
        antiRepetitionCount: state.antiRepetitionCount,
        pityWeights: state.pityWeights,
        items: state.items,
        isAdvancedEntries: state.isAdvancedEntries,
        wheelType: state.wheelType,
        colors: state.colors,
        centerImage: state.centerImage,
        textSize: state.textSize,
        centerSize: state.centerSize,
        soundEnabled: state.soundEnabled,
        masterVolume: state.masterVolume,
        tickSoundType: state.tickSoundType,
        spinSoundMode: state.spinSoundMode,
        winSoundType: state.winSoundType,
        eliminationSoundType: state.eliminationSoundType,
        customTickAudios,
        customWinAudios,
        results: state.results,
        racePodium: state.racePodium,
        penaltySequence: state.penaltySequence,
      }
    };

    const dataStr = JSON.stringify(wheelData, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${state.title || "roleta"}.wheel`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const importWheel = (file: File) => {
    const reader = new FileReader();
    const state = useAppStore.getState();

    reader.onload = (e) => {
      try {
        const jsonStr = e.target?.result as string;
        const data = JSON.parse(jsonStr);
        
        if (data.sortStudioState) {
          // New format: full application state
          const stateToSet = data.sortStudioState;

          const recreateAudioObj = (a: any) => {
            let audioObj: any = null;
            if (a.url) {
              if (a.url.includes("youtube.com") || a.url.includes("youtu.be")) {
                const ytId = extractYouTubeId(a.url);
                if (ytId) audioObj = createYouTubeAudio(ytId);
                else audioObj = new Audio(a.url);
              } else {
                audioObj = new Audio(a.url);
              }
            }
            return { ...a, audioObj };
          };

          if (stateToSet.customTickAudios) {
            stateToSet.customTickAudios = stateToSet.customTickAudios.map(recreateAudioObj);
          }
          if (stateToSet.customWinAudios) {
            stateToSet.customWinAudios = stateToSet.customWinAudios.map(recreateAudioObj);
          }

          useAppStore.setState(stateToSet);
          return;
        }
        
        // Old format backward compatibility
        if (data.wheels && data.wheels[0] && data.wheels[0].wheelConfig) {
          const config = data.wheels[0].wheelConfig;
          if (config.title !== undefined) state.setTitle(config.title);
          if (config.entries && Array.isArray(config.entries)) {
            state.setItems(
              config.entries.map((ent: any) => ({
                id: crypto.randomUUID(),
                text: ent.text || "",
                weight: ent.weight !== undefined ? Number(ent.weight) : 1,
                enabled: ent.enabled !== undefined ? Boolean(ent.enabled) : true,
                color: ent.color,
                message: ent.message,
                sound: ent.sound,
                image: ent.image,
              })),
            );
          }
          if (config.colorSettings && Array.isArray(config.colorSettings)) {
            state.setColors(
              config.colorSettings
                .filter((c: any) => c.enabled !== false)
                .map((c: any) => c.color),
            );
          }
          if (config.spinTime !== undefined) state.setSpinTime(config.spinTime);
          if (config.winnerMessage !== undefined) state.setWinMessage(config.winnerMessage);
          if (config.autoRemoveWinner !== undefined) state.setAutoRemoveWinner(config.autoRemoveWinner);
          if (config.launchConfetti !== undefined) state.setShowConfetti(config.launchConfetti);
          if (config.customPictureDataUri !== undefined) state.setCenterImage(config.customPictureDataUri);
          if (config.duringSpinSoundVolume !== undefined) state.setMasterVolume(config.duringSpinSoundVolume);
        }
      } catch (err) {
        console.error("Erro ao importar o arquivo .wheel", err);
        alert("O arquivo fornecido não é um `.wheel` válido.");
      }
    };
    reader.readAsText(file);
  };

  return { exportWheel, importWheel };
};
