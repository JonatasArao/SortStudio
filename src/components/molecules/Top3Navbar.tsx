import React, { useMemo } from 'react';
import { Crown, ChevronRight, Calendar, Trophy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store/useAppStore';
import { getParticipantStats } from '../../utils/statsUtils';
import { getCurrentSeason, filterResultsByScope } from '../../utils/seasonUtils';

export const Top3Navbar: React.FC = () => {
  const { t } = useTranslation();
  const items = useAppStore(s => s.items);
  const results = useAppStore(s => s.results);
  const seasons = useAppStore(s => s.seasons);
  const setIsResultsModalOpen = useAppStore(s => s.setIsResultsModalOpen);

  // Active Season
  const currentSeason = useMemo(() => getCurrentSeason(seasons), [seasons]);
  const seasonName = currentSeason?.name || 'Temporada Atual';

  // Results scoped to current season
  const seasonResults = useMemo(() => {
    return filterResultsByScope(results, seasons, 'current_season');
  }, [results, seasons]);

  // Top 3 Participants in the current season
  const top3 = useMemo(() => {
    const stats = getParticipantStats(items, seasonResults);
    return stats
      .filter(st => st.winsCount > 0)
      .sort((a, b) => {
        if (b.winsCount !== a.winsCount) return b.winsCount - a.winsCount;
        if (a.lastWinTimestamp && b.lastWinTimestamp) return b.lastWinTimestamp - a.lastWinTimestamp;
        return a.name.localeCompare(b.name);
      })
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
      {/* Mobile Only (< sm): Botão simples e limpo de Vencedores */}
      <button
        type="button"
        onClick={handleOpenResults}
        className="flex sm:hidden items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 active:bg-amber-500/30 border border-amber-500/30 text-amber-300 hover:text-amber-200 transition-all font-bold text-xs shadow-sm active:scale-95 group"
        title={`${t('sidebar.results.winners', 'Vencedores')} - Clique para ver o ranking e histórico`}
      >
        <Trophy size={14} className="text-amber-400 transition-transform duration-200 group-hover:scale-110 group-hover:rotate-6 shrink-0" />
        <span className="leading-none">{t('sidebar.results.winners', 'Vencedores')}</span>
      </button>

      {/* Tablet & Desktop (sm+): Top 3 Completo com Temporada e Pódio */}
      <button
        type="button"
        onClick={handleOpenResults}
        className="hidden sm:flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1 rounded-xl bg-slate-900/85 hover:bg-slate-800/95 border border-slate-800/90 hover:border-slate-700 text-slate-300 hover:text-white transition-all duration-200 group active:scale-95 shadow-sm max-w-full overflow-hidden"
        title={`${t('sidebar.results.winners', 'Vencedores')} & Ranking (${seasonName}) - Clique para abrir o painel completo`}
      >
        {/* Current Season Badge */}
        <div className="flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-lg bg-slate-950/90 border border-slate-800 group-hover:border-amber-500/40 text-amber-300 transition-colors shrink-0 shadow-inner">
          <Calendar size={12} className="text-amber-400 shrink-0" />
          <span className="text-[10px] sm:text-[11px] font-bold tracking-tight truncate max-w-[80px] sm:max-w-[120px]">
            {seasonName}
          </span>
        </div>

        {/* Vertical Divider */}
        <div className="w-px h-3.5 bg-slate-800/90 shrink-0" />

        {/* Top 3 Podium or Empty State */}
        {top3.length === 0 ? (
          <div className="flex items-center gap-1 text-[10px] sm:text-[11px] text-slate-400 font-medium shrink-0">
            <Crown size={12} className="text-amber-400/60 group-hover:text-amber-400 transition-colors shrink-0" />
            <span className="font-semibold text-slate-300">Top 3:</span>
            <span className="text-slate-400">Sem vitórias</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
            {/* 1st Place (Gold) */}
            {first && (
              <div className="flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-amber-200 bg-amber-500/15 hover:bg-amber-500/25 px-1.5 sm:px-2 py-0.5 rounded-lg border border-amber-500/35 transition-colors shrink-0">
                <span className="text-xs">🥇</span>
                <span className="max-w-[60px] sm:max-w-[90px] truncate leading-none">{first.name}</span>
                <span className="text-[10px] text-amber-400 font-mono font-black leading-none">({first.winsCount})</span>
              </div>
            )}

            {/* 2nd Place (Silver - hidden on smaller screens < md) */}
            {second && (
              <div className="hidden md:flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold text-slate-200 bg-slate-800/90 hover:bg-slate-700/80 px-1.5 sm:px-2 py-0.5 rounded-lg border border-slate-700/70 transition-colors shrink-0">
                <span className="text-xs">🥈</span>
                <span className="max-w-[55px] lg:max-w-[80px] truncate leading-none">{second.name}</span>
                <span className="text-[10px] text-slate-400 font-mono font-bold leading-none">({second.winsCount})</span>
              </div>
            )}

            {/* 3rd Place (Bronze - hidden on medium screens < xl) */}
            {third && (
              <div className="hidden xl:flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold text-amber-300/90 bg-amber-950/30 hover:bg-amber-950/50 px-1.5 sm:px-2 py-0.5 rounded-lg border border-amber-900/40 transition-colors shrink-0">
                <span className="text-xs">🥉</span>
                <span className="max-w-[55px] xl:max-w-[75px] truncate leading-none">{third.name}</span>
                <span className="text-[10px] text-amber-500/90 font-mono font-bold leading-none">({third.winsCount})</span>
              </div>
            )}
          </div>
        )}

        {/* Action Cue / Indicador de clique para ver vencedores */}
        <div className="flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-lg bg-emerald-500/10 group-hover:bg-emerald-500/20 border border-emerald-500/25 group-hover:border-emerald-500/40 text-emerald-400 text-[10px] sm:text-[11px] font-semibold transition-all shrink-0 ml-0.5 shadow-sm">
          <Trophy size={11} className="transition-transform duration-200 group-hover:scale-110 group-hover:rotate-6 text-emerald-400 shrink-0" />
          <span className="font-bold tracking-tight">{t('sidebar.results.winners', 'Vencedores')}</span>
          <ChevronRight size={11} className="text-emerald-400/80 group-hover:translate-x-0.5 transition-transform shrink-0" />
        </div>
      </button>
    </>
  );
};
