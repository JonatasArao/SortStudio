import React, { useMemo } from 'react';
import { Trophy, Crown, ChevronRight, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store/useAppStore';
import { getParticipantStats } from '../../utils/statsUtils';
import { filterResultsByScope } from '../../utils/seasonUtils';

interface Top3LeadersProps {
  compact?: boolean;
  onViewAll?: () => void;
  allTime?: boolean;
}

export const Top3Leaders: React.FC<Top3LeadersProps> = ({ compact = false, onViewAll, allTime = false }) => {
  const { t } = useTranslation();
  const items = useAppStore(s => s.items);
  const results = useAppStore(s => s.results);
  const seasons = useAppStore(s => s.seasons);
  const setIsResultsModalOpen = useAppStore(s => s.setIsResultsModalOpen);

  const scopedResults = useMemo(() => {
    if (allTime) return results;
    return filterResultsByScope(results, seasons, 'current_season');
  }, [results, seasons, allTime]);

  const top3 = useMemo(() => {
    const stats = getParticipantStats(items, scopedResults);
    return stats
      .filter(st => st.winsCount > 0)
      .sort((a, b) => {
        if (b.winsCount !== a.winsCount) return b.winsCount - a.winsCount;
        if (a.lastWinTimestamp && b.lastWinTimestamp) return b.lastWinTimestamp - a.lastWinTimestamp;
        return a.name.localeCompare(b.name);
      })
      .slice(0, 3);
  }, [items, scopedResults]);

  const handleOpenResults = () => {
    if (onViewAll) {
      onViewAll();
    } else {
      setIsResultsModalOpen(true);
    }
  };

  if (top3.length === 0) {
    if (compact) return null;
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 mb-4 shadow-sm text-center">
        <div className="flex items-center justify-center gap-1.5 text-slate-400 text-xs font-semibold mb-1">
          <Trophy size={14} className="text-amber-400" />
          <span>Top 3 Líderes na Roleta</span>
        </div>
        <p className="text-[11px] text-slate-500">Ainda sem vitórias registradas.</p>
      </div>
    );
  }

  const first = top3[0];
  const second = top3[1];
  const third = top3[2];

  if (compact) {
    return (
      <div 
        onClick={handleOpenResults}
        className="cursor-pointer bg-slate-950/80 hover:bg-slate-900/90 border border-amber-500/30 rounded-xl p-2 px-3 shadow-lg backdrop-blur-md transition-all flex items-center gap-2 group"
      >
        <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs shrink-0">
          <Crown size={15} className="text-amber-400 fill-amber-400/20" />
          <span className="hidden sm:inline">Top 3:</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs overflow-x-auto no-scrollbar py-0.5">
          {top3.map((st, idx) => {
            const badgeBg = idx === 0 ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
                            idx === 1 ? 'bg-slate-400/20 text-slate-200 border-slate-400/40' :
                            'bg-amber-800/20 text-amber-400 border-amber-700/40';
            const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉';
            return (
              <div key={st.name} className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[11px] font-medium shrink-0 ${badgeBg}`}>
                <span>{medal}</span>
                <span className="font-semibold max-w-[80px] truncate">{st.name}</span>
                <span className="text-[10px] opacity-75 font-mono">({st.winsCount})</span>
              </div>
            );
          })}
        </div>
        <ChevronRight size={14} className="text-slate-500 group-hover:text-amber-400 transition-colors ml-auto shrink-0" />
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-amber-500/30 rounded-xl p-3.5 mb-4 shadow-xl backdrop-blur-md relative overflow-hidden">
      {/* Decorative ambient glow */}
      <div className="absolute -top-10 -right-10 w-28 h-28 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.2)]">
            <Crown size={16} className="fill-amber-400/30" />
          </div>
          <div>
            <h3 className="text-xs font-extrabold text-amber-300 tracking-wide uppercase flex items-center gap-1">
              Top 3 Líderes
              <Sparkles size={12} className="text-amber-400" />
            </h3>
            <p className="text-[10px] text-slate-400">Líderes de vitórias</p>
          </div>
        </div>
        <button
          onClick={handleOpenResults}
          className="text-[10px] font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 bg-amber-500/10 hover:bg-amber-500/20 px-2 py-1 rounded-md border border-amber-500/20 transition-all"
        >
          <span>Ranking</span>
          <ChevronRight size={12} />
        </button>
      </div>

      {/* Podium Cards */}
      <div className="grid grid-cols-3 gap-2 pt-1 items-end">
        {/* 2nd Place */}
        {second ? (
          <div className="bg-slate-900/80 border border-slate-600/40 rounded-lg p-2 text-center flex flex-col items-center relative shadow-md">
            <div className="w-6 h-6 rounded-full bg-slate-400/20 border border-slate-400/50 text-slate-200 text-[10px] font-extrabold flex items-center justify-center -mt-4 shadow-sm">
              2º
            </div>
            <span className="text-xs font-bold text-slate-200 mt-1 truncate w-full" title={second.name}>
              {second.name}
            </span>
            <span className="text-[10px] text-slate-400 font-medium mt-0.5">
              {second.winsCount} {second.winsCount === 1 ? 'vitória' : 'vitórias'}
            </span>
          </div>
        ) : (
          <div className="bg-slate-900/30 border border-dashed border-slate-800 rounded-lg p-2 text-center flex flex-col items-center opacity-50">
            <span className="text-[10px] text-slate-500 font-semibold">2º Lugar</span>
            <span className="text-[9px] text-slate-600">-</span>
          </div>
        )}

        {/* 1st Place (Center, elevated) */}
        {first && (
          <div className="bg-gradient-to-b from-amber-500/20 to-slate-900/90 border border-amber-500/50 rounded-lg p-2.5 text-center flex flex-col items-center relative shadow-lg shadow-amber-500/10 -translate-y-1">
            <div className="w-7 h-7 rounded-full bg-amber-500/30 border border-amber-400 text-amber-300 text-xs font-black flex items-center justify-center -mt-5 shadow-[0_0_12px_rgba(245,158,11,0.3)]">
              👑
            </div>
            <span className="text-xs font-extrabold text-amber-200 mt-1 truncate w-full" title={first.name}>
              {first.name}
            </span>
            <span className="text-[10px] text-amber-400/90 font-bold mt-0.5">
              {first.winsCount} {first.winsCount === 1 ? 'vitória' : 'vitórias'}
            </span>
          </div>
        )}

        {/* 3rd Place */}
        {third ? (
          <div className="bg-slate-900/80 border border-amber-800/40 rounded-lg p-2 text-center flex flex-col items-center relative shadow-md">
            <div className="w-6 h-6 rounded-full bg-amber-800/30 border border-amber-700/50 text-amber-400 text-[10px] font-extrabold flex items-center justify-center -mt-4 shadow-sm">
              3º
            </div>
            <span className="text-xs font-bold text-slate-300 mt-1 truncate w-full" title={third.name}>
              {third.name}
            </span>
            <span className="text-[10px] text-slate-400 font-medium mt-0.5">
              {third.winsCount} {third.winsCount === 1 ? 'vitória' : 'vitórias'}
            </span>
          </div>
        ) : (
          <div className="bg-slate-900/30 border border-dashed border-slate-800 rounded-lg p-2 text-center flex flex-col items-center opacity-50">
            <span className="text-[10px] text-slate-500 font-semibold">3º Lugar</span>
            <span className="text-[9px] text-slate-600">-</span>
          </div>
        )}
      </div>
    </div>
  );
};
