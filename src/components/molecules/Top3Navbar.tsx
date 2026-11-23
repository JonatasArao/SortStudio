import React, { useMemo } from 'react';
import { Crown, ChevronRight, Calendar, Trophy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store/useAppStore';
import { getParticipantStats, compareParticipantsByWins } from '../../utils/statsUtils';
import { getCurrentSeason, filterResultsByScope } from '../../utils/seasonUtils';

export const Top3Navbar: React.FC = () => {
  const { t } = useTranslation();
  const items = useAppStore(s => s.items);
  const results = useAppStore(s => s.results);
  const seasons = useAppStore(s => s.seasons);
  const setIsResultsModalOpen = useAppStore(s => s.setIsResultsModalOpen);

  const currentSeason = useMemo(() => getCurrentSeason(seasons), [seasons]);
  const seasonName = currentSeason?.name || 'Temporada Atual';

  const seasonResults = useMemo(() => {
    return filterResultsByScope(results, seasons, 'current_season');
  }, [results, seasons]);

  const top3 = useMemo(() => {
    const stats = getParticipantStats(items, seasonResults);
    return stats
      .filter(st => st.winsCount > 0)
      .sort(compareParticipantsByWins)
      .slice(0, 3);
  }, [items, seasonResults]);

  const handleOpenResults = () => {
    setIsResultsModalOpen(true);
  };

  const first = top3[0];
  const second = top3[1];
  const third = top3[2];

  return (
    <>
      {/* Mobile (< sm): Compact single-line trigger */}
      <button
        type="button"
        onClick={handleOpenResults}
        className="flex sm:hidden items-center gap-1.5 h-9 px-3 rounded-xl bg-[var(--studio-card)] hover:bg-[var(--studio-card-hover)] border border-[var(--studio-border)] text-amber-700 dark:text-amber-300 transition-colors duration-150 font-semibold text-xs whitespace-nowrap shrink-0"
        title={`${t('sidebar.results.winners', 'Vencedores')} - Ranking e histórico`}
      >
        <Trophy size={14} className="text-amber-500 dark:text-amber-400 shrink-0" />
        <span>{t('sidebar.results.winners', 'Vencedores')}</span>
        {first && (
          <span className="font-mono tabular-nums text-[11px] text-[var(--studio-text-muted)]">
            · {first.winsCount}
          </span>
        )}
      </button>

      {/* Tablet & Desktop (sm+): Clean Broadcast Podium Strip (No nested pill boxes) */}
      <button
        type="button"
        onClick={handleOpenResults}
        className="hidden sm:flex items-center gap-2.5 h-10 px-3.5 rounded-xl bg-[var(--studio-card)] hover:bg-[var(--studio-card-hover)] border border-[var(--studio-border)] hover:border-[var(--studio-border-strong)] text-[var(--studio-text-secondary)] hover:text-[var(--studio-text)] transition-colors duration-150 group max-w-full overflow-hidden whitespace-nowrap"
        title={`${t('sidebar.results.winners', 'Vencedores')} & Ranking (${seasonName})`}
      >
        {/* Season indicator (unboxed inline metadata) */}
        <span className="flex items-center gap-1.5 text-xs font-medium text-[var(--studio-text-secondary)] shrink-0">
          <Calendar size={13} className="text-amber-500 dark:text-amber-400 shrink-0" />
          <span className="truncate max-w-[110px] lg:max-w-[140px]">{seasonName}</span>
        </span>

        <span className="w-px h-4 bg-[var(--studio-border-strong)] shrink-0" aria-hidden="true" />

        {/* Podium readout */}
        {top3.length === 0 ? (
          <span className="flex items-center gap-1.5 text-xs text-[var(--studio-text-muted)] shrink-0">
            <Crown size={13} className="text-amber-500/80 dark:text-amber-400/70 shrink-0" />
            <span>Sem vitórias</span>
          </span>
        ) : (
          <div className="flex items-center gap-2.5 min-w-0">
            {first && (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 dark:text-amber-200 shrink-0">
                <span className="font-mono text-[11px] font-bold text-amber-600 dark:text-amber-400">#1</span>
                <span className="max-w-[75px] md:max-w-[95px] truncate">{first.name}</span>
                <span className="font-mono tabular-nums text-[11px] text-amber-700 dark:text-amber-400/90">
                  {first.winsCount}
                </span>
              </span>
            )}

            {second && (
              <>
                <span className="hidden md:inline text-[var(--studio-text-muted)] text-xs opacity-60" aria-hidden="true">·</span>
                <span className="hidden md:flex items-center gap-1.5 text-xs font-medium text-[var(--studio-text)] shrink-0">
                  <span className="font-mono text-[11px] font-bold text-[var(--studio-text-muted)]">#2</span>
                  <span className="max-w-[65px] lg:max-w-[85px] truncate">{second.name}</span>
                  <span className="font-mono tabular-nums text-[11px] text-[var(--studio-text-muted)]">
                    {second.winsCount}
                  </span>
                </span>
              </>
            )}

            {third && (
              <>
                <span className="hidden xl:inline text-[var(--studio-text-muted)] text-xs opacity-60" aria-hidden="true">·</span>
                <span className="hidden xl:flex items-center gap-1.5 text-xs font-medium text-[var(--studio-text-secondary)] shrink-0">
                  <span className="font-mono text-[11px] font-bold text-amber-700 dark:text-amber-600">#3</span>
                  <span className="max-w-[65px] xl:max-w-[80px] truncate">{third.name}</span>
                  <span className="font-mono tabular-nums text-[11px] text-[var(--studio-text-muted)]">
                    {third.winsCount}
                  </span>
                </span>
              </>
            )}
          </div>
        )}

        <span className="w-px h-4 bg-[var(--studio-border-strong)] shrink-0" aria-hidden="true" />

        {/* Action cue */}
        <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 group-hover:opacity-85 transition-opacity shrink-0">
          <Trophy size={13} className="shrink-0" />
          <span className="hidden md:inline">{t('sidebar.results.winners', 'Vencedores')}</span>
          <ChevronRight size={13} className="opacity-75 group-hover:translate-x-0.5 transition-transform shrink-0" />
        </span>
      </button>
    </>
  );
};
