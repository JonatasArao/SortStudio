import React from 'react';
import { ChevronRight } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useTranslation } from 'react-i18next';
import { EntriesTab } from './sidebar/EntriesTab';

export const Sidebar = () => {
  const { t } = useTranslation();
  const isSidebarOpen = useAppStore(s => s.isSidebarOpen);
  const setIsSidebarOpen = useAppStore(s => s.setIsSidebarOpen);
  const items = useAppStore(s => s.items);

  return (
    <>
      {isSidebarOpen && (
        <div className="lg:hidden absolute inset-0 bg-black/60 z-30 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* Sidebar Painel */}
      <div className={`
        absolute lg:relative right-0 top-0 h-full z-40 shrink-0
        transition-[transform,width] duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0 w-[85vw] sm:w-[400px]' : 'translate-x-full lg:translate-x-0 w-[85vw] sm:w-[400px] lg:w-0'}
      `}>
        <div className="absolute top-0 left-0 w-[85vw] sm:w-[400px] h-full bg-slate-950/75 backdrop-blur-xl lg:border-l border-slate-800/60 shadow-2xl flex flex-col">
          
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`absolute top-4 ${isSidebarOpen ? '-left-5' : '-left-12'} w-10 h-10 bg-gradient-to-r from-slate-900/95 to-slate-800/95 hover:from-slate-800 hover:to-slate-700 border border-slate-700/60 hover:border-slate-500 rounded-full flex items-center justify-center text-slate-300 hover:text-white z-50 shadow-xl transition-all duration-300 hover:scale-105 active:scale-95`}
            title={isSidebarOpen ? t("sidebar.hidePanel") : t("sidebar.showPanel")}
          >
            <ChevronRight size={20} className={`transform transition-transform duration-300 ${isSidebarOpen ? '' : 'rotate-180'}`} />
          </button>

          <div className="w-full h-full flex flex-col overflow-hidden">
            <div className="px-6 pl-10 pt-8 pb-4 flex-1 flex flex-col overflow-hidden min-h-0">
              <EntriesTab />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
