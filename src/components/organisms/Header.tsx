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
  Dices,
  Download,
  Upload,
  ChevronDown,
  MoreVertical,
  FlaskConical,
  Users,
  Check,
  LucideIcon,
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
  const testModeEnabled = useAppStore(s => s.testModeEnabled);
  const wheelType = useAppStore(s => s.wheelType);
  const setWheelType = useAppStore(s => s.setWheelType);
  const isSidebarOpen = useAppStore(s => s.isSidebarOpen);
  const setIsSidebarOpen = useAppStore(s => s.setIsSidebarOpen);
  const items = useAppStore(s => s.items);
  const { importWheel } = useAppActions();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const [isModeDropdownOpen, setIsModeDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const activeParticipantsCount = items.filter(i => i.enabled !== false && i.text.trim() !== '').length;

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
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsModeDropdownOpen(false);
        setIsMobileMenuOpen(false);
      }
    };
    if (isModeDropdownOpen || isMobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
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
      document.documentElement.requestFullscreen().catch(() => {});
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  };

  const MODES: Array<{
    id: 'classic' | 'horizon' | 'mystery_box' | 'race' | 'penalty_shootout' | 'bingo' | 'test';
    label: string;
    description: string;
    icon: LucideIcon;
    iconColor: string;
    activeClass: string;
  }> = [
    {
      id: 'classic',
      label: t('visualSettings.classic') || 'Roleta Clássica',
      description: 'Giro tradicional com ponteiro',
      icon: Disc,
      iconColor: 'text-blue-400',
      activeClass: 'bg-blue-500/15 border-blue-500/35 text-blue-200',
    },
    {
      id: 'horizon',
      label: t('visualSettings.slot') || 'Horizon / Slot',
      description: 'Rolagem horizontal estilo caça-níquel',
      icon: Layers,
      iconColor: 'text-pink-400',
      activeClass: 'bg-pink-500/15 border-pink-500/35 text-pink-200',
    },
    {
      id: 'mystery_box',
      label: t('visualSettings.boxes') || 'Caixas Misteriosas',
      description: 'Sorteio com caixas surpresa',
      icon: Package,
      iconColor: 'text-amber-400',
      activeClass: 'bg-amber-500/15 border-amber-500/35 text-amber-200',
    },
    {
      id: 'race',
      label: t('visualSettings.race') || 'Corrida 3D',
      description: 'Competição em pista com pódio',
      icon: Flag,
      iconColor: 'text-emerald-400',
      activeClass: 'bg-emerald-500/15 border-emerald-500/35 text-emerald-200',
    },
    {
      id: 'penalty_shootout',
      label: t('visualSettings.penalty_shootout') || 'Pênaltis',
      description: 'Cobranças e defesas no gol',
      icon: Target,
      iconColor: 'text-sky-400',
      activeClass: 'bg-sky-500/15 border-sky-500/35 text-sky-200',
    },
    {
      id: 'bingo',
      label: t('visualSettings.bingo') || 'Bingo / Globo',
      description: 'Extração de bolas numeradas',
      icon: Dices,
      iconColor: 'text-indigo-400',
      activeClass: 'bg-indigo-500/15 border-indigo-500/35 text-indigo-200',
    },
    ...(testModeEnabled
      ? [
          {
            id: 'test' as const,
            label: t('testMode.button', 'Modo de Teste'),
            description: 'Laboratório e simulação instantânea',
            icon: FlaskConical,
            iconColor: 'text-purple-400',
            activeClass: 'bg-purple-500/15 border-purple-500/35 text-purple-200',
          },
        ]
      : []),
  ];

  const currentMode = MODES.find(m => m.id === wheelType) || MODES[0];
  const CurrentIcon = currentMode.icon;

  return (
    <header className="px-3 sm:px-5 h-14 sm:h-16 bg-[var(--studio-header)] backdrop-blur-md border-b border-[var(--studio-border)] flex lg:grid lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center justify-between gap-2 sm:gap-4 z-40 shrink-0 sticky top-0 transition-colors duration-300">
      {/* Zone 1: Brand Title & Mode Selector */}
      <div className="flex items-center gap-2.5 min-w-0 justify-self-start" ref={dropdownRef}>
        <div className="w-9 h-9 rounded-xl bg-[var(--studio-card)] border border-[var(--studio-border)] flex items-center justify-center shrink-0">
          <CurrentIcon className={`w-4.5 h-4.5 ${currentMode.iconColor}`} />
        </div>

        <div className="flex items-center gap-2 min-w-0 relative">
          <h1 className="font-display text-sm sm:text-base font-bold text-[var(--studio-text)] tracking-tight truncate max-w-[110px] sm:max-w-[180px] xl:max-w-[240px]">
            {title || 'SortStudio'}
          </h1>

          <span className="hidden xs:inline text-[var(--studio-text-muted)] text-xs opacity-60" aria-hidden="true">/</span>

          <button
            type="button"
            onClick={() => setIsModeDropdownOpen(prev => !prev)}
            aria-expanded={isModeDropdownOpen}
            aria-haspopup="listbox"
            className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg bg-[var(--studio-card)] hover:bg-[var(--studio-card-hover)] border border-[var(--studio-border)] hover:border-[var(--studio-border-strong)] text-[var(--studio-text-secondary)] hover:text-[var(--studio-text)] text-xs font-medium transition-colors duration-150 whitespace-nowrap shrink-0"
            title="Alterar modo de sorteio"
          >
            <span className="truncate max-w-[76px] sm:max-w-[130px]">{currentMode.label}</span>
            <ChevronDown
              size={13}
              className={`text-[var(--studio-text-muted)] transition-transform duration-150 shrink-0 ${
                isModeDropdownOpen ? 'rotate-180 text-[var(--studio-accent-fg)]' : ''
              }`}
            />
          </button>

          {isModeDropdownOpen && (
            <div
              role="listbox"
              aria-label={t('visualSettings.gameMode', 'Modo de Sorteio')}
              className="absolute left-0 top-full mt-2 w-72 max-w-[calc(100vw-24px)] p-1.5 bg-[var(--studio-surface)] border border-[var(--studio-border-strong)] rounded-2xl shadow-2xl z-[100] flex flex-col gap-1"
            >
              <div className="px-3 py-2 flex items-center justify-between border-b border-[var(--studio-border)] mb-0.5">
                <span className="text-xs font-semibold text-[var(--studio-text-secondary)]">
                  {t('visualSettings.gameMode', 'Formato de Sorteio')}
                </span>
                <span className="text-[11px] font-mono tabular-nums text-[var(--studio-text-muted)]">
                  {MODES.length} modos
                </span>
              </div>

              {MODES.map(mode => {
                const Icon = mode.icon;
                const isSelected = wheelType === mode.id;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      setWheelType(mode.id);
                      setIsModeDropdownOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-left border transition-colors duration-150 ${
                      isSelected
                        ? 'bg-[var(--studio-accent-soft)] border-[var(--studio-border-strong)] text-[var(--studio-text)]'
                        : 'text-[var(--studio-text-secondary)] hover:text-[var(--studio-text)] hover:bg-[var(--studio-card)] border-transparent'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-[var(--studio-input)] border border-[var(--studio-border)] flex items-center justify-center shrink-0">
                      <Icon size={16} className={mode.iconColor} />
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-xs font-semibold leading-tight truncate">
                        {mode.label}
                      </span>
                      <span className="text-[11px] text-[var(--studio-text-muted)] mt-0.5 leading-tight truncate">
                        {mode.description}
                      </span>
                    </div>
                    {isSelected && <Check size={14} className="shrink-0 text-[var(--studio-accent-fg)]" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Zone 2: Broadcast Top 3 & Season Hub (Never overlaps neighbors) */}
      <div className="flex items-center justify-center min-w-0 justify-self-center">
        <Top3Navbar />
      </div>

      {/* Zone 3: Studio Controls */}
      <div className="flex items-center gap-1.5 shrink-0 justify-self-end">
        <input
          type="file"
          accept=".wheel,application/json"
          ref={fileInputRef}
          className="hidden"
          onChange={handleFileChange}
        />

        <button
          type="button"
          onClick={toggleFullscreen}
          className="hidden md:flex w-9 h-9 rounded-xl bg-[var(--studio-card)] hover:bg-[var(--studio-card-hover)] border border-[var(--studio-border)] text-[var(--studio-text-muted)] hover:text-[var(--studio-text)] transition-colors duration-150 items-center justify-center"
          title={isFullscreen ? t('header.exitFullscreen') : t('header.fullscreen')}
          aria-label={isFullscreen ? t('header.exitFullscreen') : t('header.fullscreen')}
        >
          {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
        </button>

        <button
          type="button"
          onClick={() => setSoundEnabled(!soundEnabled)}
          className={`w-9 h-9 rounded-xl border transition-colors duration-150 flex items-center justify-center ${
            soundEnabled
              ? 'bg-[var(--studio-accent-soft)] border-[var(--studio-border-strong)] text-[var(--studio-accent-fg)]'
              : 'bg-[var(--studio-card)] border-[var(--studio-border)] text-[var(--studio-text-muted)] hover:text-[var(--studio-text)] hover:bg-[var(--studio-card-hover)]'
          }`}
          title={soundEnabled ? t('header.mute') : t('header.unmute')}
          aria-label={soundEnabled ? t('header.mute') : t('header.unmute')}
          aria-pressed={soundEnabled}
        >
          {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
        </button>

        <button
          type="button"
          onClick={handleImportClick}
          className="hidden sm:flex w-9 h-9 rounded-xl bg-[var(--studio-card)] hover:bg-[var(--studio-card-hover)] border border-[var(--studio-border)] text-[var(--studio-text-secondary)] hover:text-[var(--studio-text)] transition-colors duration-150 items-center justify-center"
          title={t('settings.system.import', 'Importar Roleta (.wheel)')}
          aria-label={t('settings.system.import', 'Importar Roleta (.wheel)')}
        >
          <Upload size={16} />
        </button>

        <button
          type="button"
          onClick={() => setIsExportModalOpen(true)}
          className="hidden sm:flex w-9 h-9 rounded-xl bg-[var(--studio-card)] hover:bg-[var(--studio-card-hover)] border border-[var(--studio-border)] text-[var(--studio-text-secondary)] hover:text-[var(--studio-text)] transition-colors duration-150 items-center justify-center"
          title={t('settings.system.export', 'Exportar Roleta (.wheel)')}
          aria-label={t('settings.system.export', 'Exportar Roleta (.wheel)')}
        >
          <Download size={16} />
        </button>

        <button
          type="button"
          onClick={() => setIsSettingsOpen(true)}
          className="flex w-9 h-9 rounded-xl bg-[var(--studio-card)] hover:bg-[var(--studio-card-hover)] border border-[var(--studio-border)] text-[var(--studio-text-secondary)] hover:text-[var(--studio-text)] transition-colors duration-150 items-center justify-center"
          title={t('settings.title')}
          aria-label={t('settings.title')}
        >
          <Settings size={16} />
        </button>

        {/* Participants / Sidebar Toggle */}
        <button
          type="button"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          aria-expanded={isSidebarOpen}
          className={`flex items-center gap-1.5 h-9 px-2.5 sm:px-3 rounded-xl border text-xs font-semibold transition-colors duration-150 whitespace-nowrap shrink-0 ${
            isSidebarOpen
              ? 'bg-[var(--studio-accent)] border-transparent text-[var(--studio-accent-text)] hover:bg-[var(--studio-accent-hover)]'
              : 'bg-[var(--studio-card)] border-[var(--studio-border)] text-[var(--studio-text-secondary)] hover:bg-[var(--studio-card-hover)] hover:text-[var(--studio-text)]'
          }`}
          title={isSidebarOpen ? t('sidebar.hidePanel') : t('sidebar.showPanel')}
        >
          <Users size={15} className="shrink-0" />
          <span className="hidden xl:inline">{t('sidebar.entries.participants', 'Participantes')}</span>
          <span className="font-mono tabular-nums text-[11px] opacity-90">{activeParticipantsCount}</span>
        </button>

        {/* Mobile overflow menu */}
        <div className="relative sm:hidden" ref={mobileMenuRef}>
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(prev => !prev)}
            className={`w-9 h-9 rounded-xl border transition-colors duration-150 flex items-center justify-center ${
              isMobileMenuOpen
                ? 'bg-[var(--studio-card-hover)] border-[var(--studio-border-strong)] text-[var(--studio-text)]'
                : 'bg-[var(--studio-card)] border-[var(--studio-border)] text-[var(--studio-text-muted)] hover:text-[var(--studio-text)]'
            }`}
            title="Mais opções"
            aria-label="Mais opções"
            aria-expanded={isMobileMenuOpen}
          >
            <MoreVertical size={16} />
          </button>

          {isMobileMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 p-1.5 bg-[var(--studio-surface)] border border-[var(--studio-border-strong)] rounded-2xl shadow-2xl z-[100] flex flex-col gap-1">
              <button
                type="button"
                onClick={() => {
                  handleImportClick();
                  setIsMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-xs font-medium text-[var(--studio-text-secondary)] hover:text-[var(--studio-text)] hover:bg-[var(--studio-card)] transition-colors"
              >
                <Upload size={15} className="text-sky-500 dark:text-sky-400" />
                <span>{t('settings.system.importBtn', 'Importar Roleta')}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsExportModalOpen(true);
                  setIsMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-xs font-medium text-[var(--studio-text-secondary)] hover:text-[var(--studio-text)] hover:bg-[var(--studio-card)] transition-colors"
              >
                <Download size={15} className="text-emerald-600 dark:text-emerald-400" />
                <span>{t('settings.system.exportBtn', 'Exportar Roleta')}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  toggleFullscreen();
                  setIsMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-xs font-medium text-[var(--studio-text-secondary)] hover:text-[var(--studio-text)] hover:bg-[var(--studio-card)] transition-colors"
              >
                {isFullscreen ? (
                  <>
                    <Minimize size={15} className="text-amber-600 dark:text-amber-400" />
                    <span>{t('header.exitFullscreen', 'Sair da Tela Cheia')}</span>
                  </>
                ) : (
                  <>
                    <Maximize size={15} className="text-amber-600 dark:text-amber-400" />
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
