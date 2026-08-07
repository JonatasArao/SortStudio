import React from 'react';
import { Settings, X, Sliders, Music, Palette, HardDrive , Calendar } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store/useAppStore';
import { GeneralSettings } from './settings/GeneralSettings';
import { AudioSettings } from './settings/AudioSettings';
import { VisualSettings } from './settings/VisualSettings';
import { SystemSettings } from './settings/SystemSettings';
import { SeasonSettings } from "./settings/SeasonSettings";

export const SettingsModal = () => {
  const { t } = useTranslation();
  const isSettingsOpen = useAppStore(s => s.isSettingsOpen);
  const setIsSettingsOpen = useAppStore(s => s.setIsSettingsOpen);
  const settingsTab = useAppStore(s => s.settingsTab);
  const setSettingsTab = useAppStore(s => s.setSettingsTab);

  if (!isSettingsOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 sm:p-6">
      <div className="bg-[#1a1b23] border border-slate-700 w-full max-w-4xl h-full max-h-[750px] rounded-2xl shadow-2xl flex flex-col md:flex-row overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        <div className="w-full md:w-64 bg-[#14151a] border-b md:border-b-0 md:border-r border-slate-800 flex flex-col shrink-0">
          <div className="p-5 border-b border-slate-800 flex justify-between items-center">
            <h2 className="text-lg font-bold text-white flex items-center gap-2"><Settings className="text-blue-500" /> {t('settings.title')}</h2>
            <button onClick={() => setIsSettingsOpen(false)} className="md:hidden text-slate-400 hover:text-white transition-colors bg-slate-800 p-1.5 rounded-lg">
              <X size={18} />
            </button>
          </div>
          <div className="p-3 flex flex-row md:flex-col gap-2 overflow-x-auto no-scrollbar">
            <button onClick={() => setSettingsTab('geral')} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all shrink-0 ${settingsTab === 'geral' || !settingsTab ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-[#1e2029]'}`}>
              <Sliders size={18} /> {t('settings.tabs.general')}
            </button>
            <button onClick={() => setSettingsTab('visual')} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all shrink-0 ${settingsTab === 'visual' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-[#1e2029]'}`}>
              <Palette size={18} /> {t('settings.tabs.visual')}
            </button>
            <button onClick={() => setSettingsTab('audio')} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all shrink-0 ${settingsTab === 'audio' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-[#1e2029]'}`}>
              <Music size={18} /> {t('settings.tabs.audio')}
            </button>
            <button onClick={() => setSettingsTab('temporadas')} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all shrink-0 ${settingsTab === 'temporadas' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-[#1e2029]'}`}>
              <Calendar size={18} /> Temporadas
            </button>
            <button onClick={() => setSettingsTab('sistema')} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all shrink-0 ${settingsTab === 'sistema' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-[#1e2029]'}`}>
              <HardDrive size={18} /> {t('settings.tabs.system')}
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col min-h-0 bg-[#1e2029]">
          <div className="hidden md:flex justify-end p-4 border-b border-slate-800">
            <button onClick={() => setIsSettingsOpen(false)} className="text-slate-400 hover:text-white transition-colors bg-slate-800/50 hover:bg-slate-700 p-2 rounded-full">
              <X size={20} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
            {(settingsTab === 'geral' || !settingsTab) && <GeneralSettings />}
            {settingsTab === 'audio' && <AudioSettings />}
            {settingsTab === 'visual' && <VisualSettings />}
            {settingsTab === 'sistema' && <SystemSettings />}
            {settingsTab === 'temporadas' && <SeasonSettings />}
          </div>
        </div>
      </div>
    </div>
  );
};
