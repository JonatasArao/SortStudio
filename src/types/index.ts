export interface Season {
  id: string;
  name: string;
  startDate: number;
  endDate?: number;
}

export interface Item {
  id: string;
  text: string;
  weight: number;
  enabled: boolean;
  color?: string;
  image?: string;
  message?: string;
  sound?: string;
  isEliminated?: boolean;
  type?: "winner" | "eliminated" | "grand_winner";
  drawId?: string;
}

export interface Result extends Item {
  drawId: string;
  type?: "winner" | "eliminated" | "grand_winner";
  timestamp?: number;
}

export interface PodiumRacer {
  id: string;
  text: string;
  color: string;
  rank: number;
}

export interface CustomAudioItem {
  id: string;
  categories: ("tick" | "win")[];
  name: string;
  blob?: Blob;
  url?: string;
  isFile: boolean;
  mode?: "tick" | "continuous";
  startTime?: number;
  endTime?: number;
  volume?: number;
}

export interface CustomAudio {
  id: string;
  url: string;
  name: string;
  audioObj: HTMLAudioElement | any;
  isFile: boolean;
  mode?: "tick" | "continuous";
  startTime?: number;
  endTime?: number;
  volume?: number;
}

export interface WheelConfig {
  title: string;
  entries: {
    text: string;
    weight: number;
    enabled: boolean;
    color?: string;
    message?: string;
    sound?: string;
    image?: string;
  }[];
  colorSettings: { color: string; enabled: boolean }[];
  customPictureDataUri: string;
  winnerMessage: string;
}

export interface AppSettings {
  spinTime: number;
  showConfetti: boolean;
  autoRemoveWinner: boolean;
  soundEnabled: boolean;
  masterVolume: number;
  tickSoundType: string;
  spinSoundMode: string;
  winSoundType: string;
  textSize: number;
  centerSize: number;
  isAdvancedEntries: boolean;
  eliminationMessage?: string;
  grandWinnerMessage?: string;
  eliminationMode?: boolean;
  autoContinueElimination?: boolean;
  balanceWeightsByWins?: boolean;
  balanceWeightsMode?: 'linear' | 'quadratic' | 'cubic';
  balanceScope?: 'all' | 'current_season';
  pitySystemEnabled?: boolean;
  showPitySystemVisually?: boolean;
  ignoreNewItemWeight?: boolean;
  newItemWeightMode?: 'boosted' | 'max' | 'median' | 'average' | 'min' | 'base';
  antiRepetitionEnabled?: boolean;
  antiRepetitionCount?: number;
  eliminationSoundType?: string;
  eliminationSpinTime?: number;
  wheelTheme?: string;
  penaltySaveWins?: boolean;
}
