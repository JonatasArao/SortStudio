import { useState, useEffect } from 'react';
import { Download, X, Settings, List, History, Volume2, Palette, Scale, Trophy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../../store/useAppStore';
import { useAppActions } from '../../../hooks/useAppActions';
import { Button } from '../../atoms/Button';
import { Toggle } from '../../atoms/Toggle';

export const ExportModal = () => {
  const { t } = useTranslation();
  const isExportModalOpen = useAppStore(s => s.isExportModalOpen);
  const setIsExportModalOpen = useAppStore(s => s.setIsExportModalOpen);
  const { exportWheel } = useAppActions();

  const [options, setOptions] = useState({
    configVisual: true,
    configRules: true,
    configGeneral: true,
    entries: true,
    results: true,
    seasons: true,
    audio: true,
  });

  useEffect(() => {
    if (!isExportModalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsExportModalOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isExportModalOpen, setIsExportModalOpen]);

  if (!isExportModalOpen) return null;

  const handleExport = () => {
    exportWheel(options);
    setIsExportModalOpen(false);
  };

  const isAnySelected = Object.values(options).some(val => val);

  const items = [
    { key: 'configVisual' as const, icon: Palette, color: 'text-pink-600 dark:text-pink-400', title: t('settings.system.exportVisual', 'Aparência e Visuais'), desc: 'Tema, cores, tamanho da fonte e imagens' },
    { key: 'configRules' as const, icon: Scale, color: 'text-orange-600 dark:text-orange-400', title: t('settings.system.exportRules', 'Regras e Modos'), desc: 'Modo de eliminação, pity system, balanceamento' },
    { key: 'configGeneral' as const, icon: Settings, color: 'text-[var(--studio-accent-fg)]', title: t('settings.system.exportGeneral', 'Configurações Gerais'), desc: 'Título, tempo de giro, mensagens e confetes' },
    { key: 'entries' as const, icon: List, color: 'text-emerald-600 dark:text-emerald-400', title: t('settings.system.exportEntries', 'Entradas'), desc: 'Lista atual de opções e participantes' },
    { key: 'results' as const, icon: History, color: 'text-amber-600 dark:text-amber-400', title: t('settings.system.exportResults', 'Resultados e Sorteios'), desc: 'Histórico bruto de ganhadores e eliminações' },
    { key: 'seasons' as const, icon: Trophy, color: 'text-amber-600 dark:text-amber-400', title: t('settings.system.exportSeasons', 'Temporadas e Períodos'), desc: 'Marcos temporais e divisões do placar' },
    { key: 'audio' as const, icon: Volume2, color: 'text-purple-600 dark:text-purple-400', title: t('settings.system.exportAudio', 'Áudios e Efeitos'), desc: 'Sons, links customizados e volume' },
  ];

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
      onClick={() => setIsExportModalOpen(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="bg-[var(--studio-surface)] border border-[var(--studio-border-strong)] text-[var(--studio-text)] rounded-2xl w-full max-w-md shadow-2xl flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--studio-border)] bg-[var(--studio-surface-elevated)]">
          <h2 className="font-display text-base font-bold text-[var(--studio-text)] flex items-center gap-2">
            <Download size={18} className="text-[var(--studio-accent-fg)]" />
            <span>{t('settings.system.exportBtn', 'Exportar Roleta')}</span>
          </h2>
          <button
            type="button"
            onClick={() => setIsExportModalOpen(false)}
            className="w-8 h-8 rounded-lg bg-[var(--studio-card)] hover:bg-[var(--studio-card-hover)] text-[var(--studio-text-muted)] hover:text-[var(--studio-text)] border border-[var(--studio-border-strong)] flex items-center justify-center transition-colors"
            aria-label={t('common.close', 'Fechar')}
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4 overflow-y-auto max-h-[70vh] custom-scrollbar">
          <p className="text-sm text-[var(--studio-text-secondary)]">
            {t('settings.system.exportModalDesc', 'Escolha quais dados você deseja incluir no arquivo de exportação:')}
          </p>

          <div className="space-y-2.5">
            {items.map(item => {
              const Icon = item.icon;
              return (
                <div
                  key={item.key}
                  className="flex items-center justify-between gap-3 p-3 bg-[var(--studio-card)] rounded-xl border border-[var(--studio-border)]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon size={17} className={`${item.color} shrink-0`} />
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold text-[var(--studio-text)] truncate">{item.title}</h4>
                      <p className="text-xs text-[var(--studio-text-muted)] truncate">{item.desc}</p>
                    </div>
                  </div>
                  <Toggle
                    enabled={options[item.key]}
                    onChange={v => setOptions(o => ({ ...o, [item.key]: v }))}
                  />
                </div>
              );
            })}
          </div>
        </div>

        <div className="px-5 py-4 border-t border-[var(--studio-border)] bg-[var(--studio-surface-elevated)] flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setIsExportModalOpen(false)}>
            {t('common.cancel', 'Cancelar')}
          </Button>
          <Button variant="primary" onClick={handleExport} disabled={!isAnySelected}>
            <Download size={15} />
            <span>{t('settings.system.exportBtn', 'Exportar')}</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
