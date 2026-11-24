import { DEFAULT_CENTER_IMAGE, DEFAULT_SLICE_COLORS } from '../constants';

type StudioThemeId = 'default' | 'neon' | 'casino' | 'candy' | 'dark' | 'emerald';
export type PointerStyle = 'classic' | 'needle' | 'badge';
export type UiDensity = 'comfortable' | 'compact';

interface StudioThemeDefinition {
  id: StudioThemeId;
  isLight: boolean;
  preview: {
    canvas: string;
    surface: string;
    card: string;
    accent: string;
    text: string;
  };
  suggestedPaletteId: string;
  cssVars: {
    '--studio-canvas': string;
    '--studio-header': string;
    '--studio-surface': string;
    '--studio-surface-elevated': string;
    '--studio-card': string;
    '--studio-card-hover': string;
    '--studio-input': string;
    '--studio-border': string;
    '--studio-border-strong': string;
    '--studio-text': string;
    '--studio-text-secondary': string;
    '--studio-text-muted': string;
    '--studio-accent': string;
    '--studio-accent-hover': string;
    '--studio-accent-soft': string;
    '--studio-accent-text': string;
    '--studio-accent-fg': string;
  };
  stage: {
    bgGradient: string;
    outerGlow: string;
    rimBorder: string;
    wheelContainerBorder: string;
    pointerShadow: string;
    centerClasses: string;
    patternClass: string;
    overlayFill: string;
    overlayStroke: string;
    horizonBg: string;
    horizonBorder: string;
    horizonPointer: string;
    horizonTargetIdle: string;
    horizonTargetActive: string;
    accentHex: string;
  };
}

const STUDIO_THEMES: Record<StudioThemeId, StudioThemeDefinition> = {
  default: {
    id: 'default',
    isLight: false,
    preview: {
      canvas: '#0b0d13',
      surface: '#12151f',
      card: '#161a26',
      accent: '#3b82f6',
      text: '#f1f5f9',
    },
    suggestedPaletteId: 'broadcast',
    cssVars: {
      '--studio-canvas': '#0b0d13',
      '--studio-header': 'rgba(14, 17, 25, 0.96)',
      '--studio-surface': '#12151f',
      '--studio-surface-elevated': '#181c29',
      '--studio-card': '#161a26',
      '--studio-card-hover': '#1d2232',
      '--studio-input': '#0e1119',
      '--studio-border': 'rgba(255, 255, 255, 0.08)',
      '--studio-border-strong': 'rgba(255, 255, 255, 0.16)',
      '--studio-text': '#f8fafc',
      '--studio-text-secondary': '#cbd5e1',
      '--studio-text-muted': '#94a3b8',
      '--studio-accent': '#2563eb',
      '--studio-accent-hover': '#3b82f6',
      '--studio-accent-soft': 'rgba(59, 130, 246, 0.16)',
      '--studio-accent-text': '#ffffff',
      '--studio-accent-fg': '#60a5fa',
    },
    stage: {
      bgGradient: 'from-[#111726] via-[#0B0D13] to-[#12151F]',
      outerGlow: 'bg-blue-500/[0.08] blur-[110px]',
      rimBorder: 'border-[6px] border-white/[0.12] shadow-[0_24px_64px_rgba(0,0,0,0.65)]',
      wheelContainerBorder: 'border border-white/[0.1]',
      pointerShadow: 'drop-shadow-[0_4px_10px_rgba(0,0,0,0.65)]',
      centerClasses: 'bg-[#12151F] border-2 border-white/[0.2] shadow-[0_6px_20px_rgba(0,0,0,0.55)]',
      patternClass: 'opacity-[0.03] bg-[radial-gradient(#fff_1px,transparent_1px)] bg-[size:24px_24px]',
      overlayFill: '#ffffff',
      overlayStroke: 'rgba(11,13,19,0.92)',
      horizonBg: 'bg-[#10131C]',
      horizonBorder: 'border-white/[0.12]',
      horizonPointer: 'border-l-blue-400 border-r-blue-400',
      horizonTargetIdle: 'border-white/25 bg-white/[0.04]',
      horizonTargetActive: 'border-emerald-400 bg-emerald-500/10',
      accentHex: '#3b82f6',
    },
  },
  neon: {
    id: 'neon',
    isLight: false,
    preview: {
      canvas: '#070312',
      surface: '#100824',
      card: '#170c33',
      accent: '#d946ef',
      text: '#f5f3ff',
    },
    suggestedPaletteId: 'cyber_neon',
    cssVars: {
      '--studio-canvas': '#070312',
      '--studio-header': 'rgba(13, 6, 30, 0.96)',
      '--studio-surface': '#100824',
      '--studio-surface-elevated': '#180d36',
      '--studio-card': '#170c33',
      '--studio-card-hover': '#211247',
      '--studio-input': '#0b051c',
      '--studio-border': 'rgba(217, 70, 239, 0.22)',
      '--studio-border-strong': 'rgba(34, 211, 238, 0.38)',
      '--studio-text': '#f5f3ff',
      '--studio-text-secondary': '#e9d5ff',
      '--studio-text-muted': '#a78bfa',
      '--studio-accent': '#c026d3',
      '--studio-accent-hover': '#d946ef',
      '--studio-accent-soft': 'rgba(217, 70, 239, 0.18)',
      '--studio-accent-text': '#ffffff',
      '--studio-accent-fg': '#22d3ee',
    },
    stage: {
      bgGradient: 'from-[#0a0014] via-[#15002b] to-[#0a0014]',
      outerGlow: 'bg-fuchsia-600/25 blur-[120px]',
      rimBorder: 'border-[8px] border-cyan-500/60 shadow-[0_0_70px_rgba(6,182,212,0.45),inset_0_0_35px_rgba(217,70,239,0.4)]',
      wheelContainerBorder: 'border-[3px] border-cyan-500/50',
      pointerShadow: 'drop-shadow-[0_0_16px_rgba(217,70,239,0.9)]',
      centerClasses: 'bg-[#100824] border-[3px] border-fuchsia-500 shadow-[0_0_30px_rgba(217,70,239,0.7)]',
      patternClass: 'opacity-20 bg-[linear-gradient(rgba(34,211,238,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(217,70,239,0.08)_1px,transparent_1px)] bg-[size:36px_36px]',
      overlayFill: '#f5f3ff',
      overlayStroke: 'rgba(10,0,20,0.94)',
      horizonBg: 'bg-[#090014]',
      horizonBorder: 'border-cyan-500/50 shadow-[0_0_45px_rgba(6,182,212,0.25)]',
      horizonPointer: 'border-l-cyan-400 border-r-cyan-400',
      horizonTargetIdle: 'border-fuchsia-500/35 bg-fuchsia-500/10',
      horizonTargetActive: 'border-cyan-400 bg-cyan-400/20 shadow-[0_0_35px_rgba(34,211,238,0.4)]',
      accentHex: '#d946ef',
    },
  },
  casino: {
    id: 'casino',
    isLight: false,
    preview: {
      canvas: '#140406',
      surface: '#20080c',
      card: '#2b0d12',
      accent: '#f59e0b',
      text: '#fef3c7',
    },
    suggestedPaletteId: 'casino_royale',
    cssVars: {
      '--studio-canvas': '#140406',
      '--studio-header': 'rgba(26, 6, 9, 0.96)',
      '--studio-surface': '#20080c',
      '--studio-surface-elevated': '#2b0d12',
      '--studio-card': '#2b0d12',
      '--studio-card-hover': '#391319',
      '--studio-input': '#170507',
      '--studio-border': 'rgba(245, 158, 11, 0.22)',
      '--studio-border-strong': 'rgba(251, 191, 36, 0.42)',
      '--studio-text': '#fefce8',
      '--studio-text-secondary': '#fde68a',
      '--studio-text-muted': '#d6b384',
      '--studio-accent': '#d97706',
      '--studio-accent-hover': '#f59e0b',
      '--studio-accent-soft': 'rgba(245, 158, 11, 0.18)',
      '--studio-accent-text': '#140406',
      '--studio-accent-fg': '#fbbf24',
    },
    stage: {
      bgGradient: 'from-[#3b0918] via-[#1a0000] to-[#2d1b00]',
      outerGlow: 'bg-amber-500/25 blur-[120px]',
      rimBorder: 'border-[14px] border-amber-500 shadow-[0_0_55px_rgba(245,158,11,0.45),inset_0_0_35px_rgba(0,0,0,0.9)] border-double',
      wheelContainerBorder: 'border-[6px] border-amber-900',
      pointerShadow: 'drop-shadow-[0_4px_15px_rgba(0,0,0,0.9)]',
      centerClasses: 'bg-gradient-to-br from-amber-100 via-yellow-500 to-amber-700 border-4 border-amber-900 shadow-[0_4px_25px_rgba(0,0,0,0.85)]',
      patternClass: 'opacity-20 bg-[radial-gradient(circle_at_center,rgba(255,215,0,0.18)_0%,transparent_100%)] bg-[size:20px_20px]',
      overlayFill: '#fef3c7',
      overlayStroke: 'rgba(26,0,0,0.94)',
      horizonBg: 'bg-[#2d1b00]',
      horizonBorder: 'border-amber-600/60 shadow-[0_0_50px_rgba(245,158,11,0.2)]',
      horizonPointer: 'border-l-amber-400 border-r-amber-400',
      horizonTargetIdle: 'border-amber-500/35 bg-amber-500/5',
      horizonTargetActive: 'border-amber-300 bg-amber-400/20 shadow-[0_0_40px_rgba(251,191,36,0.3)]',
      accentHex: '#f59e0b',
    },
  },
  candy: {
    id: 'candy',
    isLight: true,
    preview: {
      canvas: '#fdf2f8',
      surface: '#ffffff',
      card: '#fce7f3',
      accent: '#db2777',
      text: '#3b0764',
    },
    suggestedPaletteId: 'candy_pastel',
    cssVars: {
      '--studio-canvas': '#fdf2f8',
      '--studio-header': 'rgba(255, 247, 251, 0.95)',
      '--studio-surface': '#ffffff',
      '--studio-surface-elevated': '#fdf2f8',
      '--studio-card': '#fce7f3',
      '--studio-card-hover': '#fbcfe8',
      '--studio-input': '#ffffff',
      '--studio-border': 'rgba(157, 23, 77, 0.14)',
      '--studio-border-strong': 'rgba(157, 23, 77, 0.28)',
      '--studio-text': '#2d112b',
      '--studio-text-secondary': '#5c2d57',
      '--studio-text-muted': '#834b7c',
      '--studio-accent': '#db2777',
      '--studio-accent-hover': '#ec4899',
      '--studio-accent-soft': 'rgba(219, 39, 119, 0.12)',
      '--studio-accent-text': '#ffffff',
      '--studio-accent-fg': '#be185d',
    },
    stage: {
      bgGradient: 'from-[#ffe4e6] via-[#fbcfe8] to-[#e0e7ff]',
      outerGlow: 'bg-pink-400/35 blur-[100px]',
      rimBorder: 'border-[10px] border-white shadow-[0_15px_45px_rgba(244,114,182,0.4),inset_0_0_20px_rgba(255,255,255,0.8)]',
      wheelContainerBorder: 'border-[4px] border-white',
      pointerShadow: 'drop-shadow-[0_4px_12px_rgba(244,114,182,0.7)]',
      centerClasses: 'bg-gradient-to-br from-white to-pink-100 border-[5px] border-pink-300 shadow-[0_8px_20px_rgba(244,114,182,0.4)]',
      patternClass: 'opacity-20 bg-[radial-gradient(#ec4899_1px,transparent_1px)] bg-[size:20px_20px]',
      overlayFill: '#831843',
      overlayStroke: 'rgba(255,255,255,0.95)',
      horizonBg: 'bg-white',
      horizonBorder: 'border-pink-200 shadow-[0_15px_45px_rgba(244,114,182,0.28)]',
      horizonPointer: 'border-l-pink-500 border-r-pink-500',
      horizonTargetIdle: 'border-pink-400/70 bg-pink-100/50',
      horizonTargetActive: 'border-pink-500 bg-pink-300/40 shadow-[0_0_25px_rgba(244,114,182,0.35)]',
      accentHex: '#db2777',
    },
  },
  dark: {
    id: 'dark',
    isLight: false,
    preview: {
      canvas: '#060608',
      surface: '#0f0f12',
      card: '#17171c',
      accent: '#e4e4e7',
      text: '#fafafa',
    },
    suggestedPaletteId: 'obsidian_mono',
    cssVars: {
      '--studio-canvas': '#060608',
      '--studio-header': 'rgba(12, 12, 15, 0.96)',
      '--studio-surface': '#0f0f12',
      '--studio-surface-elevated': '#17171c',
      '--studio-card': '#17171c',
      '--studio-card-hover': '#222228',
      '--studio-input': '#09090b',
      '--studio-border': 'rgba(255, 255, 255, 0.09)',
      '--studio-border-strong': 'rgba(255, 255, 255, 0.18)',
      '--studio-text': '#fafafa',
      '--studio-text-secondary': '#d4d4d8',
      '--studio-text-muted': '#a1a1aa',
      '--studio-accent': '#e4e4e7',
      '--studio-accent-hover': '#ffffff',
      '--studio-accent-soft': 'rgba(255, 255, 255, 0.1)',
      '--studio-accent-text': '#09090b',
      '--studio-accent-fg': '#e4e4e7',
    },
    stage: {
      bgGradient: 'from-[#0a0a0a] via-[#121212] to-[#000000]',
      outerGlow: 'bg-zinc-500/10 blur-[100px]',
      rimBorder: 'border-[4px] border-zinc-800 shadow-[0_0_70px_rgba(0,0,0,1)]',
      wheelContainerBorder: 'border-2 border-zinc-800',
      pointerShadow: 'drop-shadow-[0_0_12px_rgba(255,255,255,0.25)]',
      centerClasses: 'bg-[#0a0a0a] border-2 border-zinc-700 shadow-[inset_0_4px_10px_rgba(255,255,255,0.05)]',
      patternClass: 'opacity-[0.03] bg-[radial-gradient(#fff_1px,transparent_1px)] bg-[size:16px_16px]',
      overlayFill: '#fafafa',
      overlayStroke: 'rgba(6,6,8,0.95)',
      horizonBg: 'bg-[#0a0a0a]',
      horizonBorder: 'border-zinc-800',
      horizonPointer: 'border-l-zinc-300 border-r-zinc-300',
      horizonTargetIdle: 'border-zinc-700 bg-zinc-800/50',
      horizonTargetActive: 'border-zinc-200 bg-zinc-100/10',
      accentHex: '#e4e4e7',
    },
  },
  emerald: {
    id: 'emerald',
    isLight: false,
    preview: {
      canvas: '#06130e',
      surface: '#0c1f17',
      card: '#132b21',
      accent: '#10b981',
      text: '#ecfdf5',
    },
    suggestedPaletteId: 'emerald_arena',
    cssVars: {
      '--studio-canvas': '#06130e',
      '--studio-header': 'rgba(10, 27, 20, 0.96)',
      '--studio-surface': '#0c1f17',
      '--studio-surface-elevated': '#132b21',
      '--studio-card': '#132b21',
      '--studio-card-hover': '#1a382c',
      '--studio-input': '#081812',
      '--studio-border': 'rgba(16, 185, 129, 0.16)',
      '--studio-border-strong': 'rgba(52, 211, 153, 0.34)',
      '--studio-text': '#ecfdf5',
      '--studio-text-secondary': '#a7f3d0',
      '--studio-text-muted': '#6ee7b7',
      '--studio-accent': '#059669',
      '--studio-accent-hover': '#10b981',
      '--studio-accent-soft': 'rgba(16, 185, 129, 0.16)',
      '--studio-accent-text': '#ffffff',
      '--studio-accent-fg': '#34d399',
    },
    stage: {
      bgGradient: 'from-[#062118] via-[#06130e] to-[#081a14]',
      outerGlow: 'bg-emerald-500/15 blur-[110px]',
      rimBorder: 'border-[6px] border-emerald-400/30 shadow-[0_24px_64px_rgba(0,0,0,0.7),0_0_45px_rgba(16,185,129,0.2)]',
      wheelContainerBorder: 'border-2 border-emerald-500/35',
      pointerShadow: 'drop-shadow-[0_4px_14px_rgba(16,185,129,0.65)]',
      centerClasses: 'bg-[#0c1f17] border-2 border-emerald-400/50 shadow-[0_6px_22px_rgba(0,0,0,0.65)]',
      patternClass: 'opacity-[0.06] bg-[radial-gradient(#34d399_1px,transparent_1px)] bg-[size:24px_24px]',
      overlayFill: '#ecfdf5',
      overlayStroke: 'rgba(6,19,14,0.92)',
      horizonBg: 'bg-[#0a1c15]',
      horizonBorder: 'border-emerald-500/35',
      horizonPointer: 'border-l-emerald-400 border-r-emerald-400',
      horizonTargetIdle: 'border-emerald-500/35 bg-emerald-500/10',
      horizonTargetActive: 'border-emerald-300 bg-emerald-400/20 shadow-[0_0_30px_rgba(16,185,129,0.35)]',
      accentHex: '#10b981',
    },
  },
};

export const THEME_LIST: StudioThemeDefinition[] = [
  STUDIO_THEMES.default,
  STUDIO_THEMES.neon,
  STUDIO_THEMES.casino,
  STUDIO_THEMES.candy,
  STUDIO_THEMES.dark,
  STUDIO_THEMES.emerald,
];

export const getStudioTheme = (themeId?: string): StudioThemeDefinition => {
  if (themeId && themeId in STUDIO_THEMES) {
    return STUDIO_THEMES[themeId as StudioThemeId];
  }
  return STUDIO_THEMES.default;
};

export const applyThemeToDocument = (themeId?: string): StudioThemeDefinition => {
  const theme = getStudioTheme(themeId);
  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    Object.entries(theme.cssVars).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
    root.style.colorScheme = theme.isLight ? 'light' : 'dark';
    root.dataset.theme = theme.id;
    if (theme.isLight) {
      root.classList.remove('dark');
      root.classList.add('light');
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
    }
  }
  return theme;
};

interface ColorPalettePreset {
  id: string;
  nameKey: string;
  fallbackName: string;
  colors: string[];
}

export const COLOR_PALETTE_PRESETS: ColorPalettePreset[] = [
  {
    id: 'broadcast',
    nameKey: 'visualSettings.palettes.broadcast',
    fallbackName: 'Broadcast Padrão',
    colors: [...DEFAULT_SLICE_COLORS],
  },
  {
    id: 'cyber_neon',
    nameKey: 'visualSettings.palettes.cyberNeon',
    fallbackName: 'Cyber Neon',
    colors: ['#06b6d4', '#d946ef', '#8b5cf6', '#22d3ee', '#ec4899', '#6366f1'],
  },
  {
    id: 'casino_royale',
    nameKey: 'visualSettings.palettes.casinoRoyale',
    fallbackName: 'Cassino Royale',
    colors: ['#b91c1c', '#18181b', '#f59e0b', '#991b1b', '#27272a', '#fbbf24'],
  },
  {
    id: 'candy_pastel',
    nameKey: 'visualSettings.palettes.candyPastel',
    fallbackName: 'Candy Pastel',
    colors: ['#f472b6', '#a78bfa', '#60a5fa', '#34d399', '#fbbf24', '#fb7185'],
  },
  {
    id: 'emerald_arena',
    nameKey: 'visualSettings.palettes.emeraldArena',
    fallbackName: 'Arena Esmeralda',
    colors: ['#059669', '#34d399', '#0d9488', '#84cc16', '#10b981', '#047857'],
  },
  {
    id: 'sunset_heat',
    nameKey: 'visualSettings.palettes.sunsetHeat',
    fallbackName: 'Pôr do Sol',
    colors: ['#f97316', '#ef4444', '#eab308', '#f43f5e', '#fb923c', '#dc2626'],
  },
  {
    id: 'high_contrast',
    nameKey: 'visualSettings.palettes.highContrast',
    fallbackName: 'Alto Contraste',
    colors: ['#2563eb', '#facc15', '#dc2626', '#16a34a', '#9333ea', '#ea580c'],
  },
  {
    id: 'obsidian_mono',
    nameKey: 'visualSettings.palettes.obsidianMono',
    fallbackName: 'Obsidiana Minimal',
    colors: ['#18181b', '#3f3f46', '#71717a', '#a1a1aa', '#27272a', '#d4d4d8'],
  },
];

interface CenterEmblemPreset {
  id: string;
  labelKey: string;
  fallbackLabel: string;
  dataUri: string;
}

export const CENTER_EMBLEM_PRESETS: CenterEmblemPreset[] = [
  {
    id: 'star',
    labelKey: 'visualSettings.emblems.star',
    fallbackLabel: 'Estrela Studio',
    dataUri: DEFAULT_CENTER_IMAGE,
  },
  {
    id: 'trophy',
    labelKey: 'visualSettings.emblems.trophy',
    fallbackLabel: 'Troféu',
    dataUri:
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="none" stroke="%23fbbf24" stroke-width="4"/><path d="M34 26h32v14c0 10-7 18-16 20-9-2-16-10-16-20V26zm-8 4h8v12c-5 0-8-4-8-9v-3zm48 0v3c0 5-3 9-8 9V30h8zm-29 30h10v10H45V60zm-9 10h28v7H36v-7z" fill="%23fbbf24"/></svg>',
  },
  {
    id: 'target',
    labelKey: 'visualSettings.emblems.target',
    fallbackLabel: 'Alvo',
    dataUri:
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="none" stroke="%2338bdf8" stroke-width="4"/><circle cx="50" cy="50" r="31" fill="none" stroke="%23f8fafc" stroke-width="5"/><circle cx="50" cy="50" r="18" fill="none" stroke="%23ef4444" stroke-width="6"/><circle cx="50" cy="50" r="7" fill="%23fbbf24"/></svg>',
  },
  {
    id: 'bolt',
    labelKey: 'visualSettings.emblems.bolt',
    fallbackLabel: 'Raio',
    dataUri:
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="none" stroke="%23c084fc" stroke-width="4"/><polygon points="55,18 30,54 48,54 43,82 70,45 52,45" fill="%23fde047"/></svg>',
  },
  {
    id: 'crown',
    labelKey: 'visualSettings.emblems.crown',
    fallbackLabel: 'Coroa',
    dataUri:
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="none" stroke="%23f59e0b" stroke-width="4"/><polygon points="22,68 26,35 40,50 50,28 60,50 74,35 78,68" fill="%23fbbf24"/><rect x="22" y="70" width="56" height="6" rx="2" fill="%23f59e0b"/></svg>',
  },
  {
    id: 'none',
    labelKey: 'visualSettings.emblems.none',
    fallbackLabel: 'Sem imagem',
    dataUri: '',
  },
];
