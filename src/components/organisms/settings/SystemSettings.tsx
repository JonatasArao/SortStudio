import React, { useRef } from 'react';
import { Download, Upload, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppActions } from '../../../hooks/useAppActions';
import { Button } from '../../atoms/Button';

export const SystemSettings = () => {
  const { t, i18n } = useTranslation();
  const { exportWheel, importWheel } = useAppActions();
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
    <div className="flex flex-col gap-8">
      <div>
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 px-1">{t('settings.system.language')}</h3>
        <div className="bg-slate-900/40 border border-slate-800/80 backdrop-blur-md rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <Globe size={16} /> {t('settings.system.interfaceLanguage')}
              </label>
              <p className="text-xs text-slate-500 mt-1">{t('settings.system.languageDesc')}</p>
            </div>
            <Button onClick={toggleLanguage} variant="secondary" className="gap-2 px-4 py-2">
              <Globe size={16} />
              {i18n.language === 'pt-BR' ? 'Português (BR)' : 'English'}
            </Button>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 px-1">{t('settings.system.data')}</h3>
        <div className="bg-slate-900/40 border border-slate-800/80 backdrop-blur-md rounded-2xl p-6 flex flex-col gap-6 shadow-xl">
          <input 
            type="file" 
            accept=".wheel,application/json" 
            ref={fileInputRef} 
            style={{ display: 'none' }} 
            onChange={handleFileChange} 
          />
          
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <Download size={16} /> {t('settings.system.export')}
              </label>
              <p className="text-xs text-slate-500 mt-1">{t('settings.system.exportDesc')}</p>
            </div>
            <Button onClick={exportWheel} variant="secondary" className="gap-2">
              <Download size={16} /> {t('settings.system.exportBtn')}
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <Upload size={16} /> {t('settings.system.import')}
              </label>
              <p className="text-xs text-slate-500 mt-1">{t('settings.system.importDesc')}</p>
            </div>
            <Button onClick={handleImportClick} variant="secondary" className="gap-2">
              <Upload size={16} /> {t('settings.system.importBtn')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
