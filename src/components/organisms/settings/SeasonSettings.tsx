import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Calendar, Power, Edit2, X, Check } from 'lucide-react';
import { useAppStore } from '../../../store/useAppStore';
import { Season } from '../../../types';
import { Button } from '../../atoms/Button';
import { Input } from '../../atoms/Input';

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
    return new Date(timestamp).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit'
    }) + ' ' + new Date(timestamp).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-semibold text-[var(--studio-text)] mb-1">{t('settings.seasons.title')}</h3>
        <p className="text-xs sm:text-sm text-[var(--studio-text-muted)] mb-4 leading-relaxed">
          {t('settings.seasons.desc')}
        </p>

        <div className="bg-[var(--studio-card)] p-4 sm:p-5 rounded-xl border border-[var(--studio-border)] space-y-4">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--studio-text-secondary)] block">
                {t('settings.seasons.namePlaceholder').replace(' (ex: Verão 2024)', '')}
              </label>
              <Input
                type="text"
                value={newSeasonName}
                onChange={(e) => setNewSeasonName(e.target.value)}
                placeholder={t('settings.seasons.namePlaceholder')}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--studio-text-secondary)] block">
                  {t('settings.seasons.startDate')}
                </label>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="w-full min-h-[var(--studio-control-h)] bg-[var(--studio-input)] border border-[var(--studio-border-strong)] rounded-lg px-3 py-2 text-sm text-[var(--studio-text)] focus:outline-none focus:border-[var(--studio-accent)] transition-colors font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--studio-text-secondary)] block">
                  {t('settings.seasons.endDate')}
                </label>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="w-full min-h-[var(--studio-control-h)] bg-[var(--studio-input)] border border-[var(--studio-border-strong)] rounded-lg px-3 py-2 text-sm text-[var(--studio-text)] focus:outline-none focus:border-[var(--studio-accent)] transition-colors font-mono"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              {editingSeasonId && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={resetForm}
                  className="flex-1 gap-2"
                >
                  <X size={16} /> {t('settings.seasons.cancel')}
                </Button>
              )}
              <Button
                type="button"
                variant="primary"
                onClick={handleAddOrUpdateSeason}
                disabled={!newSeasonName.trim()}
                className="flex-[2] gap-2"
              >
                {editingSeasonId ? <Edit2 size={16} /> : <Plus size={16} />}
                {editingSeasonId ? t('settings.seasons.update') : t('settings.seasons.save')}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Escopo de Contabilização */}
      <div className="bg-[var(--studio-card)] p-4 sm:p-5 rounded-xl border border-[var(--studio-border)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-semibold text-[var(--studio-text)]">
              {t('settings.general.balanceScope', 'Escopo de Contabilização de Resultados')}
            </h4>
            <p className="text-xs text-[var(--studio-text-muted)] mt-0.5 leading-relaxed">
              {t('settings.general.balanceScopeDesc', 'Define se o balanceamento de vitórias e estatísticas considera apenas a temporada atual ou o histórico geral acumulado.')}
            </p>
          </div>
          <div className="flex items-center gap-1 bg-[var(--studio-input)] p-1 rounded-lg border border-[var(--studio-border)] shrink-0">
            <button
              type="button"
              onClick={() => setBalanceScope('current_season')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                balanceScope === 'current_season'
                  ? 'bg-[var(--studio-accent)] text-[var(--studio-accent-text)]'
                  : 'text-[var(--studio-text-muted)] hover:text-[var(--studio-text)]'
              }`}
            >
              Temporada Atual
            </button>
            <button
              type="button"
              onClick={() => setBalanceScope('all')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                balanceScope === 'all'
                  ? 'bg-[var(--studio-accent)] text-[var(--studio-accent-text)]'
                  : 'text-[var(--studio-text-muted)] hover:text-[var(--studio-text)]'
              }`}
            >
              Resultado Geral
            </button>
          </div>
        </div>
      </div>

      {/* Registered Seasons */}
      <div className="bg-[var(--studio-card)] p-4 sm:p-5 rounded-xl border border-[var(--studio-border)]">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--studio-text-muted)] mb-3.5">
          {t('settings.seasons.registered')}
        </h4>
        <div className="space-y-2.5">
          {seasons.length === 0 ? (
            <p className="text-sm text-[var(--studio-text-muted)]">{t('settings.seasons.empty')}</p>
          ) : (
            [...seasons].reverse().map(season => {
              const isActive = !season.endDate;
              return (
                <div
                  key={season.id}
                  className={`p-3.5 rounded-lg border transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isActive
                      ? 'bg-[var(--studio-accent-soft)] border-[var(--studio-accent)]/40'
                      : 'bg-[var(--studio-surface-elevated)] border-[var(--studio-border)]'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h5 className="font-semibold text-sm text-[var(--studio-text)] truncate">{season.name}</h5>
                      {isActive && (
                        <span className="text-[10px] uppercase font-bold text-[var(--studio-accent-fg)] tracking-wider">
                          · {t('settings.seasons.active')}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--studio-text-muted)] mt-1 flex items-center gap-1.5 font-mono tabular-nums">
                      <Calendar size={12} className="shrink-0" />
                      <span>{formatDate(season.startDate)} — {season.endDate ? formatDate(season.endDate) : t('settings.seasons.now')}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                    {seasonToDelete === season.id ? (
                      <div className="flex gap-1.5 items-center bg-red-500/10 px-2 py-1 rounded-lg border border-red-500/30">
                        <span className="text-[11px] text-red-700 dark:text-red-300 font-semibold pr-1">{t('settings.seasons.confirmDelete')}</span>
                        <button
                          type="button"
                          onClick={confirmDelete}
                          className="p-1.5 bg-red-600 hover:bg-red-500 text-white rounded-md transition-colors"
                          title={t('settings.seasons.yes')}
                        >
                          <Check size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setSeasonToDelete(null)}
                          className="p-1.5 bg-[var(--studio-card-hover)] text-[var(--studio-text-secondary)] rounded-md transition-colors"
                          title={t('settings.seasons.no')}
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => handleEditSeason(season)}
                          className={`p-2 rounded-lg transition-colors ${
                            editingSeasonId === season.id
                              ? 'text-[var(--studio-accent-fg)] bg-[var(--studio-accent-soft)]'
                              : 'text-[var(--studio-text-muted)] hover:text-[var(--studio-text)] hover:bg-[var(--studio-card-hover)]'
                          }`}
                          title={t('settings.seasons.edit')}
                          aria-label={t('settings.seasons.edit')}
                        >
                          <Edit2 size={16} />
                        </button>
                        {isActive && (
                          <button
                            type="button"
                            onClick={() => handleCloseSeason(season.id)}
                            className="p-2 text-amber-600 dark:text-amber-400 hover:bg-amber-500/15 rounded-lg transition-colors"
                            title={t('settings.seasons.close')}
                            aria-label={t('settings.seasons.close')}
                          >
                            <Power size={16} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteSeason(season.id)}
                          className="p-2 text-[var(--studio-text-muted)] hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          title={t('settings.seasons.delete')}
                          aria-label={t('settings.seasons.delete')}
                        >
                          <Trash2 size={16} />
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
