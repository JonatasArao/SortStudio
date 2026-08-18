import React, { useState, useEffect, useRef } from 'react';
import { 
  Volume2, 
  VolumeX, 
  Settings, 
  Maximize, 
  Minimize, 
  Disc, 
  Layers, 
  Package, 
  Flag, 
  Target, 
  Sparkles,
  Dices,
  Download,
  Upload,
  ChevronDown,
  MoreVertical,
  LucideIcon
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store/useAppStore';
import { useAppActions } from '../../hooks/useAppActions';
import { Top3Navbar } from '../molecules/Top3Navbar';

export const Header = () => {
  const { t } = useTranslation();
  const title = useAppStore(s => s.title);
  const soundEnabled = useAppStore(s => s.soundEnabled);
  const setSoundEnabled = useAppStore(s => s.setSoundEnabled);
  const setIsSettingsOpen = useAppStore(s => s.setIsSettingsOpen);
  const setIsExportModalOpen = useAppStore(s => s.setIsExportModalOpen);
  const wheelType = useAppStore(s => s.wheelType);
  const setWheelType = useAppStore(s => s.setWheelType);
  const { importWheel } = useAppActions();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const [isModeDropdownOpen, setIsModeDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      importWheel(file);
    }
    e.target.value = '';
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsModeDropdownOpen(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    };
    if (isModeDropdownOpen || isMobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isModeDropdownOpen, isMobileMenuOpen]);

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

  const MODES: Array<{
    id: 'classic' | 'horizon' | 'mystery_box' | 'race' | 'penalty_shootout' | 'bingo';
    label: string;
    description: string;
    icon: LucideIcon;
    iconColor: string;
    activeBg: string;
    iconActiveBg: string;
    dotColor: string;
  }> = [
    {
      id: 'classic',
      label: t('visualSettings.classic') || 'Roleta Clássica',
      description: 'Giro tradicional com ponteiro',
      icon: Disc,
      iconColor: 'text-blue-400',
      activeBg: 'bg-blue-500/15 border border-blue-500/30 text-blue-300',
      iconActiveBg: 'bg-blue-500/20 text-blue-400',
      dotColor: 'bg-blue-400',
    },
    {
      id: 'horizon',
      label: t('visualSettings.slot') || 'Horizon / Slot',
      description: 'Rolagem horizontal estilo caça-níquel',
      icon: Layers,
      iconColor: 'text-pink-400',
      activeBg: 'bg-pink-500/15 border border-pink-500/30 text-pink-300',
      iconActiveBg: 'bg-pink-500/20 text-pink-400',
      dotColor: 'bg-pink-400',
    },
    {
      id: 'mystery_box',
      label: t('visualSettings.boxes') || 'Caixas Misteriosas',
      description: 'Sorteio com caixas surpresa',
      icon: Package,
      iconColor: 'text-amber-400',
      activeBg: 'bg-amber-500/15 border border-amber-500/30 text-amber-300',
      iconActiveBg: 'bg-amber-500/20 text-amber-400',
      dotColor: 'bg-amber-400',
    },
    {
      id: 'race',
      label: t('visualSettings.race') || 'Corrida 3D',
      description: 'Competição em pista com pódio',
      icon: Flag,
      iconColor: 'text-emerald-400',
      activeBg: 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300',
      iconActiveBg: 'bg-emerald-500/20 text-emerald-400',
      dotColor: 'bg-emerald-400',
    },
    {
      id: 'penalty_shootout',
      label: t('visualSettings.penalty_shootout') || 'Pênaltis',
      description: 'Cobranças e defesas no gol',
      icon: Target,
      iconColor: 'text-sky-400',
      activeBg: 'bg-sky-500/15 border border-sky-500/30 text-sky-300',
      iconActiveBg: 'bg-sky-500/20 text-sky-400',
      dotColor: 'bg-sky-400',
    },
    {
      id: 'bingo',
      label: t('visualSettings.bingo') || 'Bingo / Globo',
      description: 'Extração de bolas numeradas',
      icon: Dices,
      iconColor: 'text-indigo-400',
      activeBg: 'bg-indigo-500/15 border border-indigo-500/30 text-indigo-300',
      iconActiveBg: 'bg-indigo-500/20 text-indigo-400',
      dotColor: 'bg-indigo-400',
    },
  ];

  const currentMode = MODES.find(m => m.id === wheelType) || MODES[0];
  const CurrentIcon = currentMode.icon;

  return (
    <header className="px-3 sm:px-6 py-2.5 sm:py-3 bg-slate-950/60 backdrop-blur-md border-b border-slate-800/80 flex items-center justify-between shadow-xl z-40 shrink-0 sticky top-0 transition-all duration-300 gap-2">
      {/* Brand Logo, App Title & Game Mode Dropdown */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <div className="relative flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-slate-950/80 border border-slate-800 shadow-inner hover:border-blue-500/40 transition-colors duration-500 overflow-hidden shrink-0">
          <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/10 via-purple-600/10 to-pink-600/10 hover:scale-110 transition-transform duration-500" />
          <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-xl sm:rounded-2xl blur-md opacity-20 hover:opacity-45 transition-opacity duration-500 animate-[pulse_3s_ease-in-out_infinite]" />
          <CurrentIcon className={`w-4.5 h-4.5 sm:w-5 sm:h-5 ${currentMode.iconColor} relative z-10 transition-transform duration-300`} />
        </div>

        <div className="flex flex-col relative min-w-0" ref={dropdownRef}>
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <h1 className="text-xs sm:text-base font-extrabold text-white tracking-tight leading-tight truncate max-w-[100px] xs:max-w-[150px] sm:max-w-[240px]">
              {title || "SortStudio"}
            </h1>
          </div>

          {/* Mode Dropdown Trigger */}
          <div className="relative mt-0.5">
            <button
              type="button"
              onClick={() => setIsModeDropdownOpen(prev => !prev)}
              className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-0.5 -ml-1 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800/90 hover:border-slate-700 text-slate-300 hover:text-white text-[10px] sm:text-[11px] font-medium transition-all group active:scale-95 shadow-sm"
              title="Alterar modo de sorteio"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${currentMode.dotColor} animate-pulse shrink-0`} />
              <span className="font-semibold text-slate-200 truncate max-w-[70px] xs:max-w-[120px] sm:max-w-none">{currentMode.label}</span>
              <ChevronDown 
                size={11} 
                className={`text-slate-400 group-hover:text-slate-200 transition-transform duration-200 shrink-0 ${isModeDropdownOpen ? 'rotate-180 text-blue-400' : ''}`} 
              />
            </button>

            {/* Dropdown Menu */}
            {isModeDropdownOpen && (
              <div className="absolute left-0 top-full mt-2 w-64 sm:w-72 max-w-[calc(100vw-24px)] p-1.5 bg-slate-950/95 backdrop-blur-xl border border-slate-800/90 rounded-2xl shadow-2xl z-[100] animate-in fade-in zoom-in-95 duration-150 flex flex-col gap-1 ring-1 ring-white/10">
                <div className="px-2.5 py-1.5 flex items-center justify-between border-b border-slate-800/80 mb-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles size={11} className="text-blue-400" />
                    {t('visualSettings.gameMode', 'Modo de Sorteio')}
                  </span>
                  <span className="text-[9px] font-mono text-slate-500">
                    {MODES.length} MODOS
                  </span>
                </div>

                {MODES.map((mode) => {
                  const Icon = mode.icon;
                  const isSelected = wheelType === mode.id;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => {
                        setWheelType(mode.id);
                        setIsModeDropdownOpen(false);
                      }}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition-all duration-150 active:scale-[0.98] ${
                        isSelected
                          ? `${mode.activeBg} shadow-sm`
                          : 'text-slate-300 hover:text-white hover:bg-slate-900/90 border border-transparent'
                      }`}
                    >
                      <div className={`p-1.5 rounded-lg shrink-0 ${isSelected ? mode.iconActiveBg : 'bg-slate-900 border border-slate-800 text-slate-400'}`}>
                        <Icon size={16} className={isSelected ? mode.iconColor : ''} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-semibold leading-tight truncate">
                          {mode.label}
                        </span>
                        <span className="text-[10px] text-slate-400 mt-0.5 leading-tight truncate">
                          {mode.description}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Truly Centered Top 3 & Winners Hub (Mathematically Centered) */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20 flex items-center justify-center max-w-[calc(100%-240px)] xs:max-w-[calc(100%-290px)] sm:max-w-[calc(100%-380px)] md:max-w-[45vw] lg:max-w-[50vw]">
        <div className="pointer-events-auto">
          <Top3Navbar />
        </div>
      </div>

      {/* Control Actions Section (Icon-only buttons for a sleek, clean navbar) */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 z-10">
        {/* Hidden File Input for Import */}
        <input 
          type="file" 
          accept=".wheel,application/json" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          onChange={handleFileChange} 
        />

        {/* Fullscreen Button (Desktop & Tablet md+) */}
        <button 
          onClick={toggleFullscreen}
          className="hidden md:flex p-2 sm:p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-400 hover:border-slate-700/80 hover:bg-slate-800/80 hover:text-white transition-all duration-200 active:scale-95 items-center justify-center group"
          title={isFullscreen ? t('header.exitFullscreen') : t('header.fullscreen')}
        >
          {isFullscreen ? (
            <Minimize size={17} className="transition-transform duration-200 group-hover:scale-110" />
          ) : (
            <Maximize size={17} className="transition-transform duration-200 group-hover:scale-110" />
          )}
        </button>

        {/* Sound Toggle Button */}
        <button 
          onClick={() => setSoundEnabled(!soundEnabled)}
          className={`p-2 sm:p-2.5 rounded-xl border transition-all duration-200 active:scale-95 group flex items-center justify-center ${
            soundEnabled 
              ? 'bg-blue-500/10 border-blue-500/20 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.1)]' 
              : 'bg-slate-900/60 border-slate-800 text-slate-500 hover:border-slate-700/80 hover:bg-slate-800/80 hover:text-white'
          }`}
          title={soundEnabled ? t("header.mute") : t("header.unmute")}
        >
          {soundEnabled ? (
            <Volume2 size={17} className="transition-transform duration-200 group-hover:scale-110" />
          ) : (
            <VolumeX size={17} className="transition-transform duration-200 group-hover:scale-110" />
          )}
        </button>

        {/* Import Button (Desktop & Tablet sm+) */}
        <button 
          onClick={handleImportClick}
          className="hidden sm:flex p-2 sm:p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-300 hover:border-sky-500/40 hover:bg-sky-500/10 hover:text-sky-400 transition-all duration-200 active:scale-95 items-center justify-center group"
          title={t('settings.system.import', 'Importar Roleta (.wheel)')}
        >
          <Upload size={17} className="transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:text-sky-400" />
        </button>

        {/* Export Button (Desktop & Tablet sm+) */}
        <button 
          onClick={() => setIsExportModalOpen(true)}
          className="hidden sm:flex p-2 sm:p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-300 hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:text-emerald-400 transition-all duration-200 active:scale-95 items-center justify-center group"
          title={t('settings.system.export', 'Exportar Roleta (.wheel)')}
        >
          <Download size={17} className="transition-transform duration-200 group-hover:translate-y-0.5 group-hover:text-emerald-400" />
        </button>
        
        {/* Settings Button */}
        <button 
          onClick={() => setIsSettingsOpen(true)}
          className="flex p-2 sm:p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20 hover:border-indigo-500/30 transition-all duration-200 active:scale-95 items-center justify-center group"
          title={t('settings.title')}
        >
          <Settings size={17} className="text-indigo-400 transition-transform duration-300 group-hover:rotate-45" />
        </button>

        {/* Mobile More Actions Menu (Visible only on < sm) */}
        <div className="relative sm:hidden" ref={mobileMenuRef}>
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(prev => !prev)}
            className={`p-2 rounded-xl border transition-all duration-200 active:scale-95 flex items-center justify-center ${
              isMobileMenuOpen 
                ? 'bg-slate-800 border-slate-700 text-white' 
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
            }`}
            title="Mais opções"
          >
            <MoreVertical size={17} />
          </button>

          {/* Mobile Menu Dropdown */}
          {isMobileMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 p-1.5 bg-slate-950/95 backdrop-blur-xl border border-slate-800/90 rounded-2xl shadow-2xl z-[100] animate-in fade-in zoom-in-95 duration-150 flex flex-col gap-1 ring-1 ring-white/10">
              <button
                type="button"
                onClick={() => {
                  handleImportClick();
                  setIsMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-900 active:bg-slate-800 transition-colors"
              >
                <Upload size={16} className="text-sky-400" />
                <span>{t('settings.system.importBtn', 'Importar Roleta')}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsExportModalOpen(true);
                  setIsMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-900 active:bg-slate-800 transition-colors"
              >
                <Download size={16} className="text-emerald-400" />
                <span>{t('settings.system.exportBtn', 'Exportar Roleta')}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  toggleFullscreen();
                  setIsMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-900 active:bg-slate-800 transition-colors"
              >
                {isFullscreen ? (
                  <>
                    <Minimize size={16} className="text-amber-400" />
                    <span>{t('header.exitFullscreen', 'Sair da Tela Cheia')}</span>
                  </>
                ) : (
                  <>
                    <Maximize size={16} className="text-amber-400" />
                    <span>{t('header.fullscreen', 'Tela Cheia')}</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};



