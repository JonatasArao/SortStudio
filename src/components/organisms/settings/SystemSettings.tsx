import React, { useRef } from 'react';
import { Download, Upload, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppActions } from '../../../hooks/useAppActions';
import { useAppStore } from '../../../store/useAppStore';
import { Button } from '../../atoms/Button';

export const SystemSettings = () => {
  const { t, i18n } = useTranslation();
  const { importWheel } = useAppActions();
  const setIsExportModalOpen = useAppStore(s => s.setIsExportModalOpen);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const toggleLanguage = () => {
    const nextLng = i18n.language === 'pt-BR' ? 'en' : 'pt-BR';
    i18n.changeLanguage(nextLng);
    localStorage.setItem('app_language', nextLng);
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="text-xs font-semibold text-[var(--studio-text-muted)] uppercase tracking-wider mb-3">
          {t('settings.system.language')}
        </h3>
        <div className="bg-[var(--studio-card)] border border-[var(--studio-border)] rounded-xl p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-[var(--studio-text)] flex items-center gap-2">
                <Globe size={16} className="text-[var(--studio-accent-fg)]" /> {t('settings.system.interfaceLanguage')}
              </div>
              <p className="text-xs text-[var(--studio-text-muted)] mt-1">{t('settings.system.languageDesc')}</p>
            </div>
            <Button onClick={toggleLanguage} variant="secondary" className="gap-2 shrink-0">
              <Globe size={15} />
              {i18n.language === 'pt-BR' ? 'Português (BR)' : 'English'}
            </Button>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold text-[var(--studio-text-muted)] uppercase tracking-wider mb-3">
          {t('settings.system.data')}
        </h3>
        <div className="bg-[var(--studio-card)] border border-[var(--studio-border)] rounded-xl p-4 sm:p-5 flex flex-col gap-5">
          <input
            type="file"
            accept=".wheel,application/json"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-[var(--studio-border)]">
            <div>
              <div className="text-sm font-medium text-[var(--studio-text)] flex items-center gap-2">
                <Download size={16} className="text-[var(--studio-accent-fg)]" /> {t('settings.system.export')}
              </div>
              <p className="text-xs text-[var(--studio-text-muted)] mt-1">{t('settings.system.exportDesc')}</p>
            </div>
            <Button onClick={() => setIsExportModalOpen(true)} variant="secondary" className="gap-2 shrink-0">
              <Download size={15} /> {t('settings.system.exportBtn')}
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-[var(--studio-text)] flex items-center gap-2">
                <Upload size={16} className="text-[var(--studio-accent-fg)]" /> {t('settings.system.import')}
              </div>
              <p className="text-xs text-[var(--studio-text-muted)] mt-1">{t('settings.system.importDesc')}</p>
            </div>
            <Button onClick={handleImportClick} variant="secondary" className="gap-2 shrink-0">
              <Upload size={15} /> {t('settings.system.importBtn')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
