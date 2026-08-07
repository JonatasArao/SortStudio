import React from 'react';
import { Type, Monitor, Image as ImageIcon, Palette, Plus, X, Briefcase, Dices } from 'lucide-react';
import { useAppStore } from '../../../store/useAppStore';
import { useTranslation } from 'react-i18next';
import { useWheelActions } from '../../../hooks/useWheelActions';

export const VisualSettings = () => {
  const { t } = useTranslation();
  const wheelType = useAppStore(s => s.wheelType);
  const setWheelType = useAppStore(s => s.setWheelType);
  const textSize = useAppStore(s => s.textSize);
  const setTextSize = useAppStore(s => s.setTextSize);
  const centerSize = useAppStore(s => s.centerSize);
  const setCenterSize = useAppStore(s => s.setCenterSize);
  const centerImage = useAppStore(s => s.centerImage);
  const setCenterImage = useAppStore(s => s.setCenterImage);
  const colors = useAppStore(s => s.colors);
  const newColor = useAppStore(s => s.newColor);
  const setNewColor = useAppStore(s => s.setNewColor);
  const wheelTheme = useAppStore(s => s.wheelTheme);
  const setWheelTheme = useAppStore(s => s.setWheelTheme);

  const { handleAddColor, handleRemoveColor } = useWheelActions();

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
      <div>
        <h3 className="text-lg font-bold text-white mb-4">{t('visualSettings.title')}</h3>
        <div className="bg-slate-900/40 border border-slate-800/80 backdrop-blur-md rounded-2xl p-6 space-y-6 shadow-xl">
          <div className="space-y-4">
            <label className="text-sm font-medium text-slate-300 flex items-center gap-2">{t('visualSettings.wheelFormat')}</label>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              <button
                onClick={() => setWheelType('classic')}
                className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${wheelType === 'classic' ? 'border-blue-500 bg-blue-500/10 text-white shadow-[0_0_15px_rgba(59,130,246,0.15)]' : 'border-slate-800/80 bg-slate-950/40 text-slate-400 hover:border-slate-700/60 hover:text-slate-300 hover:bg-slate-950/60 shadow-inner'}`}
              >
                <div className="w-12 h-12 rounded-full border-4 border-current border-t-transparent animate-spin-slow"></div>
                <span className="font-semibold text-sm">{t('visualSettings.classic')}</span>
              </button>
              <button
                onClick={() => setWheelType('horizon')}
                className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${wheelType === 'horizon' ? 'border-pink-500 bg-pink-500/10 text-white shadow-[0_0_15px_rgba(236,72,153,0.15)]' : 'border-slate-800/80 bg-slate-950/40 text-slate-400 hover:border-slate-700/60 hover:text-slate-300 hover:bg-slate-950/60 shadow-inner'}`}
              >
                <div className="w-12 h-12 flex items-center justify-center border-4 border-current">
                  <div className="w-full h-1 bg-current"></div>
                </div>
                <span className="font-semibold text-sm">{t('visualSettings.slot')}</span>
              </button>
              <button
                onClick={() => setWheelType('mystery_box')}
                className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${wheelType === 'mystery_box' ? 'border-amber-500 bg-amber-500/10 text-white shadow-[0_0_15px_rgba(245,158,11,0.15)]' : 'border-slate-800/80 bg-slate-950/40 text-slate-400 hover:border-slate-700/60 hover:text-slate-300 hover:bg-slate-950/60 shadow-inner'}`}
              >
                <div className="w-12 h-12 flex items-center justify-center text-amber-500">
                  <Briefcase size={32} />
                </div>
                <span className="font-semibold text-sm">{t('visualSettings.boxes')}</span>
              </button>
              <button
                onClick={() => setWheelType('race')}
                className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${wheelType === 'race' ? 'border-emerald-500 bg-emerald-500/10 text-white shadow-[0_0_15px_rgba(16,185,129,0.15)]' : 'border-slate-800/80 bg-slate-950/40 text-slate-400 hover:border-slate-700/60 hover:text-slate-300 hover:bg-slate-950/60 shadow-inner'}`}
              >
                <div className="w-12 h-12 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
                </div>
                <span className="font-semibold text-sm">{t('visualSettings.race')}</span>
              </button>
              <button
                onClick={() => setWheelType('penalty_shootout')}
                className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${wheelType === 'penalty_shootout' ? 'border-sky-500 bg-sky-500/10 text-white shadow-[0_0_15px_rgba(56,189,248,0.15)]' : 'border-slate-800/80 bg-slate-950/40 text-slate-400 hover:border-slate-700/60 hover:text-slate-300 hover:bg-slate-950/60 shadow-inner'}`}
              >
                <div className="w-12 h-12 flex items-center justify-center text-sky-400">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 20V4h18v16" /><path d="M3 9h18" strokeDasharray="2,2" opacity="0.5" /><path d="M3 14h18" strokeDasharray="2,2" opacity="0.5" /><circle cx="12" cy="12" r="3" fill="currentColor" /></svg>
                </div>
                <span className="font-semibold text-sm">{t('visualSettings.penalty_shootout')}</span>
              </button>
              <button
                onClick={() => setWheelType('bingo')}
                className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${wheelType === 'bingo' ? 'border-indigo-500 bg-indigo-500/10 text-white shadow-[0_0_15px_rgba(99,102,241,0.15)]' : 'border-slate-800/80 bg-slate-950/40 text-slate-400 hover:border-slate-700/60 hover:text-slate-300 hover:bg-slate-950/60 shadow-inner'}`}
              >
                <div className="w-12 h-12 flex items-center justify-center text-indigo-400">
                  <Dices size={32} />
                </div>
                <span className="font-semibold text-sm">{t('visualSettings.bingo') || 'Bingo'}</span>
              </button>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-700/50">
            <label className="text-sm font-medium text-slate-300 flex items-center gap-2">{t('visualSettings.visualTheme')}</label>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { id: 'default', name: 'Padrão', color: 'bg-slate-700' },
                { id: 'neon', name: 'Neon Cyber', color: 'bg-fuchsia-600' },
                { id: 'casino', name: 'Casino Ouro', color: 'bg-amber-500' },
                { id: 'candy', name: 'Candy', color: 'bg-pink-400' },
                { id: 'dark', name: 'Escuro Minimal', color: 'bg-black border border-slate-800' }
              ].map(theme => (
                <button
                  key={theme.id}
                  onClick={() => setWheelTheme(theme.id)}
                  className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${wheelTheme === theme.id ? 'border-blue-500 bg-blue-500/10 text-white shadow-[0_0_12px_rgba(59,130,246,0.15)]' : 'border-slate-800/60 bg-slate-950/40 text-slate-400 hover:text-slate-300'}`}
                >
                  <div className={`w-8 h-8 rounded-full ${theme.color} ${wheelTheme === theme.id ? 'ring-2 ring-offset-2 ring-offset-slate-900 ring-blue-500' : ''}`}></div>
                  <span className="font-semibold text-xs whitespace-nowrap">{t(`themes.${theme.id}`)}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-700/50">
            <div className="space-y-5">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-slate-300 flex items-center gap-2"><Type size={14}/> {t('visualSettings.textSize')}</label>
                  <span className="text-xs text-slate-400">{textSize}%</span>
                </div>
                <input type="range" min="0" max="200" value={textSize} onChange={(e) => setTextSize(Number(e.target.value))} className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500" />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-slate-300 flex items-center gap-2"><Monitor size={14}/> {t('visualSettings.centerSize')}</label>
                  <span className="text-xs text-slate-400">{centerSize}px</span>
                </div>
                <input type="range" min="40" max="180" value={centerSize} onChange={(e) => setCenterSize(Number(e.target.value))} className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">{t('visualSettings.centerImage')}</label>
              <div className="flex items-center bg-slate-950/45 border border-slate-800/80 rounded-xl p-1.5 focus-within:border-blue-500/80 focus-within:ring-1 focus-within:ring-blue-500/30 transition-all shadow-inner">
                <ImageIcon size={18} className="text-slate-500 mx-2" />
                <input type="text" value={centerImage} onChange={(e) => setCenterImage(e.target.value)} placeholder={t("visualSettings.centerImagePlh")} className="w-full bg-transparent text-sm text-slate-200 outline-none p-1.5" />
              </div>
              <p className="text-xs text-slate-500 mt-2">{t('visualSettings.centerImageHint')}</p>
            </div>
          </div>

          <div className="border-t border-slate-700/50 pt-5 space-y-4">
            <label className="text-sm font-medium text-slate-300 flex items-center gap-2"><Palette size={16}/> {t('visualSettings.colorPalette')} ({colors.length})</label>
            <div className="flex flex-wrap gap-2.5">
              {colors.map((c, i) => (
                <div key={i} className="relative group w-12 h-12 rounded-full shadow-lg border-[3px] border-slate-900/90 hover:scale-105 transition-transform" style={{ backgroundColor: c }}>
                  <button onClick={() => handleRemoveColor(i)} disabled={colors.length <= 2} className="absolute -top-1.5 -right-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:hidden shadow-lg scale-90">
                    <X size={12} />
                  </button>
                </div>
              ))}
              <div className="flex items-center ml-2">
                <div className="flex items-center bg-slate-950/45 border border-slate-800/80 rounded-l-xl p-1.5 h-12">
                  <input type="color" value={newColor} onChange={(e) => setNewColor(e.target.value)} className="w-8 h-8 rounded-lg cursor-pointer border-0 p-0 bg-transparent" />
                </div>
                <button onClick={handleAddColor} className="h-12 bg-blue-600 hover:bg-blue-500 text-white px-5 rounded-r-xl transition-all font-semibold text-sm flex items-center gap-2 shadow-lg shadow-blue-500/10">
                  <Plus size={16}/> {t('visualSettings.add')}
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
