import { create } from 'zustand';
import { Item, Result, CustomAudio, PodiumRacer, Season } from '../types';
import {
  DEFAULT_WHEEL_TITLE,
  DEFAULT_WIN_MESSAGE,
  DEFAULT_SPIN_TIME_SECONDS,
  DEFAULT_ELIMINATION_SPIN_TIME,
  DEFAULT_SLICE_COLORS,
  DEFAULT_CENTER_IMAGE
} from '../constants';

interface AppState {
  // General
  title: string;
  setTitle: (title: string) => void;
  winMessage: string;
  setWinMessage: (winMessage: string) => void;
  eliminationMessage: string;
  setEliminationMessage: (eliminationMessage: string) => void;
  grandWinnerMessage: string;
  setGrandWinnerMessage: (grandWinnerMessage: string) => void;
  wheelTheme: string;
  setWheelTheme: (theme: string) => void;
  eliminationSpinTime: number;
  setEliminationSpinTime: (spinTime: number) => void;
  spinTime: number;
  setSpinTime: (spinTime: number) => void;
  showConfetti: boolean;
  setShowConfetti: (showConfetti: boolean) => void;
  autoRemoveWinner: boolean;
  setAutoRemoveWinner: (autoRemoveWinner: boolean) => void;

  // Game Modes
  eliminationMode: boolean;
  setEliminationMode: (eliminationMode: boolean) => void;
  penaltySaveWins: boolean;
  setPenaltySaveWins: (penaltySaveWins: boolean) => void;
  autoContinueElimination: boolean;
  setAutoContinueElimination: (autoContinueElimination: boolean) => void;
  balanceWeightsByWins: boolean;
  balanceWeightsMode: 'linear' | 'quadratic' | 'cubic';
  setBalanceWeightsMode: (mode: 'linear' | 'quadratic' | 'cubic') => void;
  setBalanceWeightsByWins: (balanceWeightsByWins: boolean) => void;
  balanceScope: 'all' | 'current_season';
  setBalanceScope: (scope: 'all' | 'current_season') => void;
  
  seasons: Season[];
  setSeasons: (seasons: Season[] | ((prev: Season[]) => Season[])) => void;
  pitySystemEnabled: boolean;
  setPitySystemEnabled: (pitySystemEnabled: boolean) => void;
  ignoreNewItemWeight: boolean;
  setIgnoreNewItemWeight: (val: boolean) => void;
  newItemWeightMode: 'boosted' | 'max' | 'median' | 'average' | 'min' | 'base';
  setNewItemWeightMode: (mode: 'boosted' | 'max' | 'median' | 'average' | 'min' | 'base') => void;
  showPitySystemVisually: boolean;
  setShowPitySystemVisually: (show: boolean) => void;
  antiRepetitionEnabled: boolean;
  setAntiRepetitionEnabled: (antiRepetitionEnabled: boolean) => void;
  antiRepetitionCount: number;
  setAntiRepetitionCount: (count: number) => void;
  pityWeights: Record<string, number>;
  setPityWeights: (weights: Record<string, number> | ((prev: Record<string, number>) => Record<string, number>)) => void;

  // Items / Entries
  items: Item[];
  setItems: (items: Item[] | ((prev: Item[]) => Item[])) => void;
  isAdvancedEntries: boolean;
  setIsAdvancedEntries: (isAdvancedEntries: boolean) => void;
  
  // Visual/Colors
  wheelType: 'classic' | 'horizon' | 'mystery_box' | 'race' | 'penalty_shootout' | 'bingo';
  setWheelType: (wheelType: 'classic' | 'horizon' | 'mystery_box' | 'race' | 'penalty_shootout' | 'bingo') => void;
  colors: string[];
  setColors: (colors: string[] | ((prev: string[]) => string[])) => void;
  newColor: string;
  setNewColor: (newColor: string) => void;
  centerImage: string;
  setCenterImage: (centerImage: string) => void;
  textSize: number;
  setTextSize: (textSize: number) => void;
  centerSize: number;
  setCenterSize: (centerSize: number) => void;

  // Audio Settings
  soundEnabled: boolean;
  setSoundEnabled: (soundEnabled: boolean) => void;
  masterVolume: number;
  setMasterVolume: (masterVolume: number) => void;
  tickSoundType: string;
  setTickSoundType: (tickSoundType: string) => void;
  spinSoundMode: string;
  setSpinSoundMode: (spinSoundMode: string) => void;
  winSoundType: string;
  setWinSoundType: (winSoundType: string) => void;
  eliminationSoundType: string;
  setEliminationSoundType: (eliminationSoundType: string) => void;

  // Custom Audios
  customTickAudios: CustomAudio[];
  setCustomTickAudios: (audios: CustomAudio[] | ((prev: CustomAudio[]) => CustomAudio[])) => void;
  newTickUrl: string;
  setNewTickUrl: (newTickUrl: string) => void;
  customWinAudios: CustomAudio[];
  setCustomWinAudios: (audios: CustomAudio[] | ((prev: CustomAudio[]) => CustomAudio[])) => void;
  newWinUrl: string;
  setNewWinUrl: (newWinUrl: string) => void;

  winSoundPlayedInRace: boolean;
  setWinSoundPlayedInRace: (winSoundPlayedInRace: boolean) => void;

  // Wheel State
  isSpinning: boolean;
  setIsSpinning: (isSpinning: boolean) => void;
  expectedWinnerId?: string;
  setExpectedWinnerId: (id?: string) => void;
  rotation: number;
  setRotation: (rotation: number | ((prev: number) => number)) => void;
  winner: Item | null;
  setWinner: (winner: Item | null) => void;
  results: Result[];
  setResults: (results: Result[] | ((prev: Result[]) => Result[])) => void;
  racePodium: PodiumRacer[];
  setRacePodium: (podium: PodiumRacer[]) => void;
  penaltySequence: Item[];
  setPenaltySequence: (sequence: Item[]) => void;

  // UI State
  editingEntryId: string | null;
  setEditingEntryId: (id: string | null) => void;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (isOpen: boolean) => void;
  isResultsModalOpen: boolean;
  setIsResultsModalOpen: (isOpen: boolean) => void;
  settingsTab: string;
  setSettingsTab: (tab: string) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  leftActiveTab: string;
  setLeftActiveTab: (tab: string) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
  isLeftSidebarOpen: boolean;
  setIsLeftSidebarOpen: (isOpen: boolean) => void;
  isAddAudioModalOpen: boolean;
  setIsAddAudioModalOpen: (isOpen: boolean) => void;
  isExportModalOpen: boolean;
  setIsExportModalOpen: (isOpen: boolean) => void;
  editingAudio: CustomAudio | null;
  setEditingAudio: (audio: CustomAudio | null) => void;

  // Active Timers and Audio (Non-serializable but deterministic refs)
  spinTimeoutRef: NodeJS.Timeout | null;
  setSpinTimeoutRef: (timeout: NodeJS.Timeout | null) => void;
  tickTimeoutsRef: NodeJS.Timeout[];
  setTickTimeoutsRef: (timeouts: NodeJS.Timeout[] | ((prev: NodeJS.Timeout[]) => NodeJS.Timeout[])) => void;
  continuousAudioRef: HTMLAudioElement | null;
  setContinuousAudioRef: (audio: HTMLAudioElement | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  title: DEFAULT_WHEEL_TITLE,
  setTitle: (title) => set({ title }),
  winMessage: DEFAULT_WIN_MESSAGE,
  setWinMessage: (winMessage) => set({ winMessage }),
  eliminationMessage: "ELIMINADO 💀",
  setEliminationMessage: (eliminationMessage) => set({ eliminationMessage }),
  grandWinnerMessage: "GRANDE VENCEDOR!",
  setGrandWinnerMessage: (grandWinnerMessage) => set({ grandWinnerMessage }),
  wheelTheme: 'default',
  setWheelTheme: (wheelTheme) => set({ wheelTheme }),
  eliminationSpinTime: DEFAULT_ELIMINATION_SPIN_TIME,
  setEliminationSpinTime: (eliminationSpinTime) => set({ eliminationSpinTime }),
  spinTime: DEFAULT_SPIN_TIME_SECONDS,
  setSpinTime: (spinTime) => set({ spinTime }),
  showConfetti: true,
  setShowConfetti: (showConfetti) => set({ showConfetti }),
  autoRemoveWinner: false,
  setAutoRemoveWinner: (autoRemoveWinner) => set({ autoRemoveWinner }),

  eliminationMode: false,
  setEliminationMode: (eliminationMode) => set({ eliminationMode }),
  penaltySaveWins: false,
  setPenaltySaveWins: (penaltySaveWins) => set({ penaltySaveWins }),
  autoContinueElimination: true,
  setAutoContinueElimination: (autoContinueElimination) => set({ autoContinueElimination }),
  balanceWeightsByWins: false,
  balanceWeightsMode: 'quadratic',
  setBalanceWeightsMode: (balanceWeightsMode) => set({ balanceWeightsMode }),
  setBalanceWeightsByWins: (balanceWeightsByWins) => set({ balanceWeightsByWins }),
  balanceScope: 'all',
  setBalanceScope: (balanceScope) => set({ balanceScope }),
  seasons: [],
  setSeasons: (seasons) => set((state) => ({ seasons: typeof seasons === 'function' ? seasons(state.seasons) : seasons })),
  pitySystemEnabled: false,
  setPitySystemEnabled: (pitySystemEnabled) => set({ pitySystemEnabled }),
  ignoreNewItemWeight: false,
  setIgnoreNewItemWeight: (ignoreNewItemWeight) => set({ ignoreNewItemWeight }),
  newItemWeightMode: 'boosted',
  setNewItemWeightMode: (newItemWeightMode) => set({ newItemWeightMode }),
  showPitySystemVisually: true,
  setShowPitySystemVisually: (show) => set({ showPitySystemVisually: show }),
  antiRepetitionEnabled: false,
  setAntiRepetitionEnabled: (antiRepetitionEnabled) => set({ antiRepetitionEnabled }),
  antiRepetitionCount: 5,
  setAntiRepetitionCount: (count) => set({ antiRepetitionCount: count }),
  pityWeights: {},
  setPityWeights: (weights) => set((state) => ({ pityWeights: typeof weights === 'function' ? weights(state.pityWeights) : weights })),

  items: [
    { id: crypto.randomUUID(), text: "Opção 1", weight: 1, enabled: true },
    { id: crypto.randomUUID(), text: "Opção 2", weight: 1, enabled: true },
    { id: crypto.randomUUID(), text: "Opção 3", weight: 1, enabled: true },
    { id: crypto.randomUUID(), text: "Opção 4", weight: 1, enabled: true },
    { id: crypto.randomUUID(), text: "Opção 5", weight: 1, enabled: true },
    { id: crypto.randomUUID(), text: "Opção 6", weight: 1, enabled: true },
  ],
  setItems: (items) => set((state) => ({ items: typeof items === 'function' ? items(state.items) : items })),
  isAdvancedEntries: false,
  setIsAdvancedEntries: (isAdvancedEntries) => set({ isAdvancedEntries }),

  wheelType: 'classic',
  setWheelType: (wheelType) => set({ wheelType }),

  colors: DEFAULT_SLICE_COLORS,
  setColors: (colors) => set((state) => ({ colors: typeof colors === 'function' ? colors(state.colors) : colors })),
  newColor: "#10b981",
  setNewColor: (newColor) => set({ newColor }),
  centerImage: DEFAULT_CENTER_IMAGE,
  setCenterImage: (centerImage) => set({ centerImage }),
  textSize: 100,
  setTextSize: (textSize) => set({ textSize }),
  centerSize: 100,
  setCenterSize: (centerSize) => set({ centerSize }),

  soundEnabled: true,
  setSoundEnabled: (soundEnabled) => set((state) => {
    if (state.continuousAudioRef) {
      state.continuousAudioRef.volume = soundEnabled ? state.masterVolume / 100 : 0;
    }
    return { soundEnabled };
  }),
  masterVolume: 100,
  setMasterVolume: (masterVolume) => set((state) => {
    if (state.continuousAudioRef) {
      state.continuousAudioRef.volume = state.soundEnabled ? masterVolume / 100 : 0;
    }
    return { masterVolume };
  }),
  tickSoundType: "click",
  setTickSoundType: (tickSoundType) => set({ tickSoundType }),
  spinSoundMode: "tick",
  setSpinSoundMode: (spinSoundMode) => set({ spinSoundMode }),
  winSoundType: "tada",
  setWinSoundType: (winSoundType) => set({ winSoundType }),
  eliminationSoundType: "failure",
  setEliminationSoundType: (eliminationSoundType) => set({ eliminationSoundType }),

  customTickAudios: [],
  setCustomTickAudios: (customTickAudios) => set((state) => ({ customTickAudios: typeof customTickAudios === 'function' ? customTickAudios(state.customTickAudios) : customTickAudios })),
  newTickUrl: "",
  setNewTickUrl: (newTickUrl) => set({ newTickUrl }),
  customWinAudios: [],
  setCustomWinAudios: (customWinAudios) => set((state) => ({ customWinAudios: typeof customWinAudios === 'function' ? customWinAudios(state.customWinAudios) : customWinAudios })),
  newWinUrl: "",
  setNewWinUrl: (newWinUrl) => set({ newWinUrl }),

  winSoundPlayedInRace: false,
  setWinSoundPlayedInRace: (winSoundPlayedInRace) => set({ winSoundPlayedInRace }),

  isSpinning: false,
  setIsSpinning: (isSpinning) => set({ isSpinning }),
  expectedWinnerId: undefined,
  setExpectedWinnerId: (expectedWinnerId) => set({ expectedWinnerId }),
  rotation: 0,
  setRotation: (rotation) => set((state) => ({ rotation: typeof rotation === 'function' ? rotation(state.rotation) : rotation })),
  winner: null,
  setWinner: (winner) => set({ winner }),
  results: [],
  setResults: (results) => set((state) => ({ results: typeof results === 'function' ? results(state.results) : results })),
  racePodium: [],
  setRacePodium: (racePodium) => set({ racePodium }),
  penaltySequence: [],
  setPenaltySequence: (penaltySequence) => set({ penaltySequence }),

  editingEntryId: null,
  setEditingEntryId: (editingEntryId) => set({ editingEntryId }),
  isSettingsOpen: false,
  setIsSettingsOpen: (isSettingsOpen) => set({ isSettingsOpen }),
  isResultsModalOpen: false,
  setIsResultsModalOpen: (isResultsModalOpen) => set({ isResultsModalOpen }),
  settingsTab: "geral",
  setSettingsTab: (settingsTab) => set({ settingsTab }),
  activeTab: "entradas",
  setActiveTab: (activeTab) => set({ activeTab }),
  leftActiveTab: "estatisticas",
  setLeftActiveTab: (leftActiveTab) => set({ leftActiveTab }),
  isSidebarOpen: true,
  setIsSidebarOpen: (isSidebarOpen) => set({ isSidebarOpen }),
  isLeftSidebarOpen: false,
  setIsLeftSidebarOpen: (isLeftSidebarOpen) => set({ isLeftSidebarOpen }),
  isAddAudioModalOpen: false,
  setIsAddAudioModalOpen: (isAddAudioModalOpen) => set({ isAddAudioModalOpen }),
  isExportModalOpen: false,
  setIsExportModalOpen: (isExportModalOpen) => set({ isExportModalOpen }),
  editingAudio: null,
  setEditingAudio: (editingAudio) => set({ editingAudio }),

  spinTimeoutRef: null,
  setSpinTimeoutRef: (spinTimeoutRef) => set({ spinTimeoutRef }),
  tickTimeoutsRef: [],
  setTickTimeoutsRef: (tickTimeoutsRef) => set((state) => ({ tickTimeoutsRef: typeof tickTimeoutsRef === 'function' ? tickTimeoutsRef(state.tickTimeoutsRef) : tickTimeoutsRef })),
  continuousAudioRef: null,
  setContinuousAudioRef: (continuousAudioRef) => set({ continuousAudioRef }),
}));
