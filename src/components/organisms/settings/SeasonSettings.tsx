import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Calendar, Power, Edit2, X } from 'lucide-react';
import { useAppStore } from '../../../store/useAppStore';
import { Season } from '../../../types';
import { Toggle } from '../../atoms/Toggle';

export const SeasonSettings = () => {
  const { t } = useTranslation();
  const seasons = useAppStore(s => s.seasons);
  const setSeasons = useAppStore(s => s.setSeasons);
  const balanceScope = useAppStore(s => s.balanceScope);
  const setBalanceScope = useAppStore(s => s.setBalanceScope);
  
  const [newSeasonName, setNewSeasonName] = useState('');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const [editingSeasonId, setEditingSeasonId] = useState<string | null>(null);
  const [seasonToDelete, setSeasonToDelete] = useState<string | null>(null);

  const resetForm = () => {
    setNewSeasonName('');
    setCustomStart('');
    setCustomEnd('');
    setEditingSeasonId(null);
  };

  const handleEditSeason = (season: Season) => {
    setEditingSeasonId(season.id);
    setNewSeasonName(season.name);
    setCustomStart(new Date(season.startDate).toISOString().split('T')[0]);
    setCustomEnd(season.endDate ? new Date(season.endDate).toISOString().split('T')[0] : '');
  };

  const handleAddOrUpdateSeason = () => {
    if (!newSeasonName.trim()) return;
    
    const now = Date.now();
    let startDate = now;
    let endDate: number | undefined = undefined;

    if (customStart) {
      const [year, month, day] = customStart.split('-');
      if (year && month && day) {
        const parsedStart = new Date(Number(year), Number(month) - 1, Number(day), 0, 0, 0).getTime();
        if (!isNaN(parsedStart)) startDate = parsedStart;
      }
    }
    
    if (customEnd) {
      const [year, month, day] = customEnd.split('-');
      if (year && month && day) {
        const parsedEnd = new Date(Number(year), Number(month) - 1, Number(day), 23, 59, 59).getTime();
        if (!isNaN(parsedEnd)) endDate = parsedEnd;
      }
    }

    if (editingSeasonId) {
      setSeasons(seasons.map(s => s.id === editingSeasonId ? {
        ...s,
        name: newSeasonName.trim(),
        startDate,
        endDate
      } : s));
    } else {
      let updatedSeasons = seasons;
      
      // If the new season has no end date, it becomes the active season.
      // So we must close any currently active season right before this one starts.
      if (!endDate) {
        updatedSeasons = seasons.map(s => {
          if (!s.endDate) {
            return { ...s, endDate: startDate - 1 };
          }
          return s;
        });
      }

      const newSeason: Season = {
        id: crypto.randomUUID(),
        name: newSeasonName.trim(),
        startDate,
        endDate
      };
      
      setSeasons([...updatedSeasons, newSeason]);
    }

    resetForm();
  };

  const handleCloseSeason = (id: string) => {
    const now = Date.now();
    setSeasons(seasons.map(s => s.id === id ? { ...s, endDate: now } : s));
  };

  const handleDeleteSeason = (id: string) => {
    setSeasonToDelete(id);
  };

  const confirmDelete = () => {
    if (seasonToDelete) {
      setSeasons(seasons.filter(s => s.id !== seasonToDelete));
      setSeasonToDelete(null);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString() + ' ' + new Date(timestamp).toLocaleTimeString();
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-white mb-2">{t('settings.seasons.title')}</h3>
        <p className="text-sm text-slate-400 mb-6">
          {t('settings.seasons.desc')}
        </p>

        <div className="bg-[#14151a] p-4 rounded-xl border border-slate-700/50 space-y-5">
          <div className="space-y-4">
            <div>
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5 ml-1">
                {t('settings.seasons.namePlaceholder').replace(' (ex: Verão 2024)', '')}
              </label>
              <input
                type="text"
                value={newSeasonName}
                onChange={(e) => setNewSeasonName(e.target.value)}
                placeholder={t('settings.seasons.namePlaceholder')}
                className="w-full bg-[#0f1015] border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors shadow-inner"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block ml-1">
                  {t('settings.seasons.startDate')}
                </label>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="w-full bg-[#0f1015] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 [color-scheme:dark] transition-colors"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block ml-1">
                  {t('settings.seasons.endDate')}
                </label>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="w-full bg-[#0f1015] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 [color-scheme:dark] transition-colors"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              {editingSeasonId && (
                <button
                  onClick={resetForm}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2.5 rounded-lg font-bold transition-all flex items-center justify-center gap-2 border border-slate-700/50"
                >
                  <X size={18} /> {t('settings.seasons.cancel')}
                </button>
              )}
              <button
                onClick={handleAddOrUpdateSeason}
                disabled={!newSeasonName.trim()}
                className="flex-[2] bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/30"
              >
                {editingSeasonId ? <Edit2 size={18} /> : <Plus size={18} />}
                {editingSeasonId ? t('settings.seasons.update') : t('settings.seasons.save')}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#14151a] p-5 rounded-xl border border-slate-700/50">
        <h4 className="text-sm font-semibold text-white mb-4">{t('settings.seasons.registered')}</h4>
        <div className="space-y-3">
          {seasons.length === 0 ? (
            <p className="text-sm text-slate-500">{t('settings.seasons.empty')}</p>
          ) : (
            [...seasons].reverse().map(season => {
              const isActive = !season.endDate;
              return (
                <div key={season.id} className={`p-4 rounded-lg border transition-colors ${isActive ? 'bg-blue-900/20 border-blue-500/50' : 'bg-[#0f1015] border-slate-700/50'} flex justify-between items-center`}>
                  <div>
                    <h5 className="font-medium text-white flex items-center gap-2">
                      {season.name} {isActive && <span className="text-[10px] uppercase font-bold bg-blue-600 px-2 py-0.5 rounded-full tracking-wider">{t('settings.seasons.active')}</span>}
                    </h5>
                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-1 opacity-80">
                      <Calendar size={12} />
                      {formatDate(season.startDate)} - {season.endDate ? formatDate(season.endDate) : t('settings.seasons.now')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {seasonToDelete === season.id ? (
                      <div className="flex gap-2 items-center bg-red-950/40 p-1.5 rounded-lg border border-red-900/50">
                        <span className="text-[10px] text-red-300 font-bold px-2 uppercase">{t('settings.seasons.confirmDelete')}</span>
                        <button
                          onClick={confirmDelete}
                          className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white text-[10px] rounded font-bold transition-colors uppercase"
                        >
                          {t('settings.seasons.yes')}
                        </button>
                        <button
                          onClick={() => setSeasonToDelete(null)}
                          className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white text-[10px] rounded font-bold transition-colors uppercase"
                        >
                          {t('settings.seasons.no')}
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => handleEditSeason(season)}
                          className={`p-2 rounded-lg transition-colors ${editingSeasonId === season.id ? 'text-blue-400 bg-blue-400/10' : 'text-slate-400 hover:bg-slate-800'}`}
                          title={t('settings.seasons.edit')}
                        >
                          <Edit2 size={18} />
                        </button>
                        {isActive && (
                          <button
                            onClick={() => handleCloseSeason(season.id)}
                            className="p-2 text-orange-400 hover:bg-orange-400/10 rounded-lg transition-colors"
                            title={t('settings.seasons.close')}
                          >
                            <Power size={18} />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteSeason(season.id)}
                          className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                          title={t('settings.seasons.delete')}
                        >
                          <Trash2 size={18} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

    </div>
  );
};
