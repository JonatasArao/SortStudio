import React, { useState, useEffect } from 'react';
import { 
  Volume2, 
  VolumeX, 
  Settings, 
  Maximize, 
  Minimize, 
  Trophy, 
  Disc, 
  Layers, 
  Package, 
  Flag, 
  Target, 
  Sparkles,
  Dices
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store/useAppStore';

export const Header = () => {
  const { t } = useTranslation();
  const title = useAppStore(s => s.title);
  const soundEnabled = useAppStore(s => s.soundEnabled);
  const setSoundEnabled = useAppStore(s => s.setSoundEnabled);
  const setIsSettingsOpen = useAppStore(s => s.setIsSettingsOpen);
  const wheelType = useAppStore(s => s.wheelType);
  const setWheelType = useAppStore(s => s.setWheelType);

  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  const getModeStyle = (type: string, active: boolean) => {
    const configs = {
      classic: {
        activeBg: 'bg-blue-500/15 border-blue-500/30 text-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.15)]',
        hover: 'hover:text-blue-300 hover:bg-blue-500/5',
      },
      horizon: {
        activeBg: 'bg-pink-500/15 border-pink-500/30 text-pink-400 shadow-[0_0_12px_rgba(236,72,153,0.15)]',
        hover: 'hover:text-pink-300 hover:bg-pink-500/5',
      },
      mystery_box: {
        activeBg: 'bg-amber-500/15 border-amber-500/30 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.15)]',
        hover: 'hover:text-amber-300 hover:bg-amber-500/5',
      },
      race: {
        activeBg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.15)]',
        hover: 'hover:text-emerald-300 hover:bg-emerald-500/5',
      },
      penalty_shootout: {
        activeBg: 'bg-sky-500/15 border-sky-500/30 text-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.15)]',
        hover: 'hover:text-sky-300 hover:bg-sky-500/5',
      },
      bingo: {
        activeBg: 'bg-indigo-500/15 border-indigo-500/30 text-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.15)]',
        hover: 'hover:text-indigo-300 hover:bg-indigo-500/5',
      }
    };

    const config = configs[type as keyof typeof configs] || configs.classic;

    if (active) {
      return `${config.activeBg} border`;
    }
    return `text-slate-400 hover:text-slate-200 border-transparent ${config.hover}`;
  };

  return (
    <header className="px-6 py-3.5 bg-slate-950/45 backdrop-blur-md border-b border-slate-800/80 flex items-center justify-between shadow-xl z-20 shrink-0 sticky top-0 transition-all duration-300">
      {/* Brand Logo & App Title */}
      <div className="flex items-center gap-3 w-full max-w-sm group">
        <div className="relative flex items-center justify-center w-10 h-10 rounded-2xl bg-slate-950/80 border border-slate-800 shadow-inner group-hover:border-blue-500/40 transition-colors duration-500 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/10 via-purple-600/10 to-pink-600/10 group-hover:scale-110 transition-transform duration-500" />
          <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-2xl blur-md opacity-20 group-hover:opacity-45 transition-opacity duration-500 animate-[pulse_3s_ease-in-out_infinite]" />
          <Disc className="w-5.5 h-5.5 text-blue-400 relative z-10 animate-[spin_12s_linear_infinite] group-hover:text-purple-400 transition-colors duration-500" />
        </div>
        <div className="flex flex-col">
          <h1 className="text-sm md:text-base font-extrabold text-white tracking-tight leading-tight group-hover:text-slate-200 transition-colors truncate">
            {title || "SortStudio"}
          </h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Sparkles className="w-2.5 h-2.5 text-slate-500" />
            <span className="text-[9px] text-slate-500 font-mono tracking-widest uppercase font-bold">
              {t('visualSettings.' + wheelType) || "Roleta"}
            </span>
          </div>
        </div>
      </div>
      
      {/* Game Mode Switcher (Unified Glass Pill Selector) */}
      <div className="hidden md:flex items-center bg-slate-950/70 p-1.5 rounded-2xl border border-slate-800/80 shadow-inner max-w-2xl">
        <button 
          onClick={() => setWheelType('classic')}
          className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all duration-300 flex items-center gap-2 ${getModeStyle('classic', wheelType === 'classic')}`}
        >
          <Disc size={14} className={wheelType === 'classic' ? 'animate-[spin_4s_linear_infinite]' : ''} />
          <span className="hidden lg:inline">{t('visualSettings.classic')}</span>
        </button>
        <button 
          onClick={() => setWheelType('horizon')}
          className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all duration-300 flex items-center gap-2 ${getModeStyle('horizon', wheelType === 'horizon')}`}
        >
          <Layers size={14} />
          <span className="hidden lg:inline">{t('visualSettings.slot')}</span>
        </button>
        <button 
          onClick={() => setWheelType('mystery_box')}
          className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all duration-300 flex items-center gap-2 ${getModeStyle('mystery_box', wheelType === 'mystery_box')}`}
        >
          <Package size={14} className={wheelType === 'mystery_box' ? 'animate-bounce' : ''} />
          <span className="hidden lg:inline">{t('visualSettings.boxes')}</span>
        </button>
        <button 
          onClick={() => setWheelType('race')}
          className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all duration-300 flex items-center gap-2 ${getModeStyle('race', wheelType === 'race')}`}
        >
          <Flag size={14} />
          <span className="hidden lg:inline">{t('visualSettings.race')}</span>
        </button>
        <button 
          onClick={() => setWheelType('penalty_shootout')}
          className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all duration-300 flex items-center gap-2 ${getModeStyle('penalty_shootout', wheelType === 'penalty_shootout')}`}
        >
          <Target size={14} />
          <span className="hidden lg:inline">{t('visualSettings.penalty_shootout')}</span>
        </button>
        <button 
          onClick={() => setWheelType('bingo')}
          className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all duration-300 flex items-center gap-2 ${getModeStyle('bingo', wheelType === 'bingo')}`}
        >
          <Dices size={14} className={wheelType === 'bingo' ? 'animate-bounce' : ''} />
          <span className="hidden lg:inline">{t('visualSettings.bingo') || 'Bingo'}</span>
        </button>
      </div>

      {/* Control Actions Section */}
      <div className="flex items-center gap-2.5">
        {/* Fullscreen Button */}
        <button 
          onClick={toggleFullscreen}
          className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-400 hover:border-slate-700/80 hover:bg-slate-800/80 hover:text-white transition-all duration-200 active:scale-95 flex items-center justify-center group"
          title={isFullscreen ? t('header.exitFullscreen') : t('header.fullscreen')}
        >
          {isFullscreen ? (
            <Minimize size={18} className="transition-transform duration-200 group-hover:scale-110" />
          ) : (
            <Maximize size={18} className="transition-transform duration-200 group-hover:scale-110" />
          )}
        </button>

        {/* Sound Toggle Button */}
        <button 
          onClick={() => setSoundEnabled(!soundEnabled)}
          className={`relative p-2.5 rounded-xl border transition-all duration-200 active:scale-95 group flex items-center justify-center ${
            soundEnabled 
              ? 'bg-blue-500/10 border-blue-500/20 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.1)]' 
              : 'bg-slate-900/60 border-slate-800 text-slate-500 hover:border-slate-700/80 hover:bg-slate-800/80 hover:text-white'
          }`}
          title={soundEnabled ? t("header.mute") : t("header.unmute")}
        >
          {soundEnabled ? (
            <Volume2 size={18} className="transition-transform duration-200 group-hover:scale-110" />
          ) : (
            <VolumeX size={18} className="transition-transform duration-200 group-hover:scale-110" />
          )}
        </button>
        
        {/* Winners / Podium Trophy Button */}
        <button 
          onClick={() => useAppStore.getState().setIsResultsModalOpen(true)}
          className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/30 transition-all duration-200 active:scale-95 group font-medium"
          title={t("header.history")}
        >
          <Trophy size={18} className="text-emerald-400 transition-transform duration-200 group-hover:scale-110 group-hover:rotate-6" />
          <span className="text-xs font-semibold hidden md:block">{t('sidebar.results.winners')}</span>
        </button>
        
        {/* Settings Button */}
        <button 
          onClick={() => setIsSettingsOpen(true)}
          className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20 hover:border-indigo-500/30 transition-all duration-200 active:scale-95 group font-medium"
        >
          <Settings size={18} className="text-indigo-400 transition-transform duration-300 group-hover:rotate-45" />
          <span className="text-xs font-semibold hidden md:block">{t('settings.title')}</span>
        </button>
      </div>
    </header>
  );
};

