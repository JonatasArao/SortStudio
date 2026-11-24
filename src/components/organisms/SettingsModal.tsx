import { useEffect } from 'react';
import { Settings, X, Sliders, Music, Palette, HardDrive, Calendar } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store/useAppStore';
import { GeneralSettings } from './settings/GeneralSettings';
import { AudioSettings } from './settings/AudioSettings';
import { VisualSettings } from './settings/VisualSettings';
import { SystemSettings } from './settings/SystemSettings';
import { SeasonSettings } from './settings/SeasonSettings';

export const SettingsModal = () => {
  const { t } = useTranslation();
  const isSettingsOpen = useAppStore(s => s.isSettingsOpen);
  const setIsSettingsOpen = useAppStore(s => s.setIsSettingsOpen);
  const settingsTab = useAppStore(s => s.settingsTab);
  const setSettingsTab = useAppStore(s => s.setSettingsTab);

  useEffect(() => {
    if (!isSettingsOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsSettingsOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isSettingsOpen, setIsSettingsOpen]);

  if (!isSettingsOpen) return null;

  const tabs = [
    { id: 'geral', label: t('settings.tabs.general'), icon: Sliders },
    { id: 'visual', label: t('settings.tabs.visual'), icon: Palette },
    { id: 'audio', label: t('settings.tabs.audio'), icon: Music },
    { id: 'temporadas', label: 'Temporadas', icon: Calendar },
    { id: 'sistema', label: t('settings.tabs.system'), icon: HardDrive },
  ] as const;

  const activeTab = settingsTab || 'geral';

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 backdrop-blur-md p-3 sm:p-6"
      onClick={() => setIsSettingsOpen(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('settings.title')}
        className={`bg-[var(--studio-surface)] border border-[var(--studio-border-strong)] text-[var(--studio-text)] w-full ${
          activeTab === 'visual' ? 'max-w-6xl' : 'max-w-4xl'
        } h-full max-h-[800px] rounded-2xl shadow-2xl flex flex-col md:flex-row overflow-hidden transition-[max-width] duration-200`}
        onClick={e => e.stopPropagation()}
      >
        {/* Navigation Rail */}
        <div className="w-full md:w-60 bg-[var(--studio-surface-elevated)] border-b md:border-b-0 md:border-r border-[var(--studio-border)] flex flex-col shrink-0">
          <div className="px-5 py-4 border-b border-[var(--studio-border)] flex justify-between items-center">
            <h2 className="font-display text-base font-bold text-[var(--studio-text)] flex items-center gap-2.5">
              <Settings size={18} className="text-[var(--studio-accent-fg)]" />
              <span>{t('settings.title')}</span>
            </h2>
            <button
              type="button"
              onClick={() => setIsSettingsOpen(false)}
              className="md:hidden w-8 h-8 rounded-lg bg-[var(--studio-card)] text-[var(--studio-text-muted)] hover:text-[var(--studio-text)] border border-[var(--studio-border-strong)] flex items-center justify-center transition-colors"
              aria-label={t('common.close', 'Fechar')}
            >
              <X size={16} />
            </button>
          </div>

          <nav className="p-2.5 flex flex-row md:flex-col gap-1 overflow-x-auto no-scrollbar">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSettingsTab(tab.id)}
                  className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150 shrink-0 whitespace-nowrap ${
                    isSelected
                      ? 'bg-[var(--studio-accent)] text-[var(--studio-accent-text)] shadow-sm'
                      : 'text-[var(--studio-text-muted)] hover:text-[var(--studio-text)] hover:bg-[var(--studio-card-hover)]'
                  }`}
                >
                  <Icon size={16} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content Pane */}
        <div className="flex-1 flex flex-col min-h-0 bg-[var(--studio-surface)]">
          <div className="hidden md:flex justify-between items-center px-6 py-3.5 border-b border-[var(--studio-border)] bg-[var(--studio-surface-elevated)]/60">
            <span className="text-xs font-medium text-[var(--studio-text-muted)]">
              {tabs.find(tb => tb.id === activeTab)?.label}
            </span>
            <button
              type="button"
              onClick={() => setIsSettingsOpen(false)}
              className="w-8 h-8 rounded-lg bg-[var(--studio-card)] hover:bg-[var(--studio-card-hover)] text-[var(--studio-text-muted)] hover:text-[var(--studio-text)] border border-[var(--studio-border-strong)] flex items-center justify-center transition-colors"
              aria-label={t('common.close', 'Fechar')}
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 custom-scrollbar">
            {activeTab === 'geral' && <GeneralSettings />}
            {activeTab === 'audio' && <AudioSettings />}
            {activeTab === 'visual' && <VisualSettings />}
            {activeTab === 'sistema' && <SystemSettings />}
            {activeTab === 'temporadas' && <SeasonSettings />}
          </div>
        </div>
      </div>
    </div>
  );
};
