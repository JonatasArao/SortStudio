import React, { useState, useMemo } from 'react';
import { Crown, Sparkles, ChevronDown, ChevronUp, Trophy, ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store/useAppStore';
import { getParticipantStats } from '../../utils/statsUtils';
import { getCurrentSeason, filterResultsByScope } from '../../utils/seasonUtils';

export const Top3WheelOverlay: React.FC = () => {
  const { t } = useTranslation();
  const [isCollapsed, setIsCollapsed] = useState(true);

  const items = useAppStore(s => s.items);
  const results = useAppStore(s => s.results);
  const seasons = useAppStore(s => s.seasons);
  const setIsResultsModalOpen = useAppStore(s => s.setIsResultsModalOpen);

  // Active Season
  const currentSeason = useMemo(() => getCurrentSeason(seasons), [seasons]);
  const seasonName = currentSeason?.name || t('settings.seasons.active') || 'Temporada Atual';

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

  const handleOpenRanking = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResultsModalOpen(true);
  };

  const first = top3[0];
  const second = top3[1];
  const third = top3[2];

  if (isCollapsed) {
    return (
      <div className="absolute top-3 left-3 md:top-4 md:left-4 z-30 pointer-events-auto">
        <button
          onClick={() => setIsCollapsed(false)}
          className="bg-slate-950/85 hover:bg-slate-900 border border-amber-500/40 text-slate-200 rounded-full px-3 py-1.5 shadow-xl backdrop-blur-md flex items-center gap-2 transition-all group hover:scale-105"
          title="Expandir Top 3 Líderes"
        >
          <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs">
            <Crown size={15} className="text-amber-400 fill-amber-400/30 group-hover:rotate-12 transition-transform" />
            <span className="hidden sm:inline font-extrabold tracking-wide">Top 3</span>
          </div>

          <span className="text-[10px] bg-amber-500/20 text-amber-300 font-semibold px-2 py-0.5 rounded-full border border-amber-500/30 max-w-[100px] truncate">
            {seasonName}
          </span>

          {first ? (
            <div className="flex items-center gap-1 text-xs font-semibold text-slate-200 pl-1 border-l border-slate-700/60">
              <span>🥇</span>
              <span className="max-w-[70px] truncate">{first.name}</span>
              <span className="text-amber-400 font-mono text-[11px]">({first.winsCount})</span>
            </div>
          ) : (
            <span className="text-[11px] text-slate-400 pl-1 border-l border-slate-700/60">Sem vitórias</span>
          )}

          <ChevronDown size={14} className="text-slate-400 group-hover:text-amber-400 transition-colors ml-0.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="absolute top-3 left-3 md:top-4 md:left-4 z-30 pointer-events-auto w-72 max-w-[calc(100vw-2rem)]">
      <div className="bg-gradient-to-b from-slate-950/90 via-slate-900/90 to-slate-950/95 border border-amber-500/40 rounded-2xl p-3.5 shadow-2xl backdrop-blur-md relative overflow-hidden transition-all duration-300">
        {/* Subtle glow background */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Top Header */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-[0_0_10px_rgba(245,158,11,0.2)]">
              <Crown size={16} className="fill-amber-400/30" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="text-xs font-extrabold text-amber-300 tracking-wide uppercase truncate">
                  Top 3 Líderes
                </h3>
                <Sparkles size={12} className="text-amber-400 shrink-0" />
              </div>
              <p className="text-[10px] text-slate-400 truncate" title={seasonName}>
                Temporada: <span className="text-amber-300/90 font-semibold">{seasonName}</span>
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsCollapsed(true)}
            className="text-slate-400 hover:text-slate-200 bg-slate-800/60 hover:bg-slate-700/80 p-1 rounded-lg border border-slate-700/50 transition-colors shrink-0"
            title="Recolher Top 3"
          >
            <ChevronUp size={16} />
          </button>
        </div>

        {/* Content */}
        {top3.length === 0 ? (
          <div className="bg-slate-900/60 border border-dashed border-slate-800 rounded-xl p-3 text-center my-1">
            <Trophy size={20} className="text-slate-600 mx-auto mb-1" />
            <p className="text-xs font-semibold text-slate-400">Nenhuma vitória na temporada</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Gire a roleta para registrar o 1º líder!</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1.5 pt-1 items-end">
            {/* 2nd Place */}
            {second ? (
              <div className="bg-slate-900/80 border border-slate-700/50 rounded-xl p-2 text-center flex flex-col items-center relative shadow-md">
                <div className="w-5 h-5 rounded-full bg-slate-400/20 border border-slate-400/50 text-slate-200 text-[9px] font-black flex items-center justify-center -mt-4 shadow-sm">
                  2º
                </div>
                <span className="text-xs font-bold text-slate-200 mt-1 truncate w-full" title={second.name}>
                  {second.name}
                </span>
                <span className="text-[10px] text-slate-400 font-mono font-semibold mt-0.5">
                  {second.winsCount} {second.winsCount === 1 ? 'vit' : 'vit'}
                </span>
              </div>
            ) : (
              <div className="bg-slate-900/30 border border-dashed border-slate-800/60 rounded-xl p-2 text-center flex flex-col items-center opacity-40">
                <span className="text-[9px] text-slate-500 font-semibold">2º Lugar</span>
                <span className="text-[9px] text-slate-600 mt-1">-</span>
              </div>
            )}

            {/* 1st Place */}
            {first && (
              <div className="bg-gradient-to-b from-amber-500/20 via-slate-900/90 to-slate-950 border border-amber-500/60 rounded-xl p-2 text-center flex flex-col items-center relative shadow-lg shadow-amber-500/10 -translate-y-1">
                <div className="w-6 h-6 rounded-full bg-amber-500/30 border border-amber-400 text-amber-300 text-xs font-black flex items-center justify-center -mt-4 shadow-[0_0_10px_rgba(245,158,11,0.3)]">
                  👑
                </div>
                <span className="text-xs font-extrabold text-amber-200 mt-1 truncate w-full" title={first.name}>
                  {first.name}
                </span>
                <span className="text-[10px] text-amber-400 font-mono font-black mt-0.5">
                  {first.winsCount} {first.winsCount === 1 ? 'vit' : 'vit'}
                </span>
              </div>
            )}

            {/* 3rd Place */}
            {third ? (
              <div className="bg-slate-900/80 border border-amber-800/40 rounded-xl p-2 text-center flex flex-col items-center relative shadow-md">
                <div className="w-5 h-5 rounded-full bg-amber-800/30 border border-amber-700/50 text-amber-400 text-[9px] font-black flex items-center justify-center -mt-4 shadow-sm">
                  3º
                </div>
                <span className="text-xs font-bold text-slate-300 mt-1 truncate w-full" title={third.name}>
                  {third.name}
                </span>
                <span className="text-[10px] text-slate-400 font-mono font-semibold mt-0.5">
                  {third.winsCount} {third.winsCount === 1 ? 'vit' : 'vit'}
                </span>
              </div>
            ) : (
              <div className="bg-slate-900/30 border border-dashed border-slate-800/60 rounded-xl p-2 text-center flex flex-col items-center opacity-40">
                <span className="text-[9px] text-slate-500 font-semibold">3º Lugar</span>
                <span className="text-[9px] text-slate-600 mt-1">-</span>
              </div>
            )}
          </div>
        )}

        {/* Footer Link */}
        <button
          onClick={handleOpenRanking}
          className="w-full mt-2.5 pt-2 border-t border-slate-800/80 text-[11px] font-semibold text-amber-400 hover:text-amber-300 flex items-center justify-center gap-1 hover:bg-amber-500/10 py-1 rounded-lg transition-all"
        >
          <span>Ver Ranking Completo</span>
          <ExternalLink size={12} />
        </button>
      </div>
    </div>
  );
};
