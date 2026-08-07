import React, { useState, useMemo, useEffect } from 'react';
import { X, Check, ListOrdered, Trophy, Download, AlertCircle, Trash2, Crown, ChevronDown, ChevronUp, ArrowDown, ArrowUp, Flame, Clock, Search, Sparkles, ArrowUpDown, SortDesc, SortAsc } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store/useAppStore';
import { ResultItem } from '../molecules/ResultItem';
import { Button } from '../atoms/Button';
import { getParticipantStats, ParticipantStat } from '../../utils/statsUtils';

const formatTimeDiff = (ms: number) => {
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  if (days > 0) return `${days}d`;
  const hours = Math.floor(ms / (1000 * 60 * 60));
  if (hours > 0) return `${hours}h`;
  const mins = Math.floor(ms / (1000 * 60));
  if (mins > 0) return `${mins}m`;
  const secs = Math.floor(ms / 1000);
  return `${secs}s`;
};

const RankingItem = ({ st, index, t, i18n, isSeasonActive, isLeader }: { st: ParticipantStat, index: number, t: any, i18n: any, isSeasonActive: boolean, isLeader: boolean }) => {
  const [expanded, setExpanded] = useState(false);
  const isWonToday = st.hasWon && st.daysWithoutWin === 0 && isSeasonActive;
  const isWonOnLastDay = st.hasWon && st.daysWithoutWin === 0 && !isSeasonActive;
  const isLongSpell = st.daysWithoutWin >= 10 || !st.hasWon;

  return (
    <div className={`bg-slate-900/40 transition-colors rounded-lg border flex flex-col shadow-sm overflow-hidden ${
      isLeader 
        ? 'border-amber-500/30 bg-gradient-to-br from-slate-900/40 to-amber-500/5 shadow-[0_0_15px_rgba(245,158,11,0.05)]' 
        : 'border-slate-800/80'
    } ${!isSeasonActive ? 'opacity-90' : ''}`}>
      <div 
        className="py-2.5 px-3.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-900/70"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 border ${
            isLeader ? 'bg-amber-500/20 border-amber-500/40 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.2)]' :
            isWonToday ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.25)]' :
            isWonOnLastDay ? 'bg-blue-500/20 border-blue-500/40 text-blue-300' :
            isLongSpell ? 'bg-amber-500/15 border-amber-500/30 text-amber-400' :
            'bg-blue-500/15 border-blue-500/30 text-blue-400'
          }`}>
            {index + 1}º
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`font-semibold text-sm leading-tight truncate ${isLeader ? 'text-amber-200' : 'text-slate-100'}`}>{st.name}</span>
              {isLeader && (
                <Crown size={14} className="text-amber-400 fill-amber-400/20" />
              )}
              {isSeasonActive && (
                st.isOnWheel ? (
                  <span className="text-[10px] leading-none font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {t('resultsModal.drySpell.activeOnWheel')}
                  </span>
                ) : (
                  <span className="text-[10px] leading-none font-medium px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/50">
                    {t('resultsModal.drySpell.inactive')}
                  </span>
                )
              )}
            </div>

            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
              <span>
                {st.hasWon && st.lastWinTimestamp 
                  ? t('resultsModal.drySpell.lastWinDate', { date: new Date(st.lastWinTimestamp).toLocaleDateString(i18n.language) })
                  : st.firstSeenTimestamp 
                  ? t('resultsModal.drySpell.firstSeen', { date: new Date(st.firstSeenTimestamp).toLocaleDateString(i18n.language) })
                  : t('resultsModal.drySpell.neverWon')}
              </span>
            </p>
          </div>
        </div>

        {/* Counter Badge */}
        <div className="shrink-0 flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <span className={`text-xs font-semibold block ${isLeader ? 'text-amber-400' : 'text-slate-400'}`}>
              {isLeader && !isSeasonActive && <span className="mr-1.5 text-[9px] uppercase tracking-wider">Campeão!</span>}
              {isLeader && isSeasonActive && <span className="mr-1.5 text-[9px] uppercase tracking-wider">Líder</span>}
              {st.winsCount} {st.winsCount === 1 ? t('resultsModal.ranking.win') : t('resultsModal.ranking.wins')}
            </span>
          </div>

          <div className={`px-2.5 py-1 rounded-md border text-xs font-bold flex items-center gap-1.5 shadow-inner ${
            isWonToday 
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
              : isWonOnLastDay
              ? 'bg-blue-500/20 text-blue-200 border-blue-500/40'
              : st.daysWithoutWin > 7 || !st.hasWon
              ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
              : 'bg-slate-800 text-slate-400 border-slate-700'
          }`}>
            {isWonToday ? (
              t('resultsModal.drySpell.wonToday')
            ) : isWonOnLastDay ? (
              "Venceu no fim"
            ) : st.hasWon ? (
              <>
                <Clock size={12} />
                {st.daysWithoutWin}d
              </>
            ) : (
              "Sem vitórias"
            )}
          </div>
          
          <div className="text-slate-500 ml-1">
             {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </div>
      </div>
      
      {expanded && (
        <div className="px-3 pb-3 pt-3 border-t border-slate-800/50 bg-slate-900/20">
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {st.drawsWithoutWin > 0 && (
                <div className="bg-slate-900/50 border border-slate-700/50 rounded-md p-2.5 flex flex-col justify-center shadow-sm">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">Jejum Atual (Sorteios)</span>
                  <span className="text-sm text-slate-300 font-medium">{st.drawsWithoutWin} {t('resultsModal.drySpell.drawsCount', { count: st.drawsWithoutWin }).split(' ')[1] || 'vezes'}</span>
                </div>
              )}
              {st.maxDaysWithoutWin !== undefined && st.maxDaysWithoutWin > 0 && (
                <div className="bg-slate-900/50 border border-slate-700/50 rounded-md p-2.5 flex flex-col justify-center shadow-sm">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">Jejum Recorde (Dias)</span>
                  <span className="text-sm text-slate-300 font-medium">{st.maxDaysWithoutWin} {t('resultsModal.drySpell.daysWithoutWin', { count: st.maxDaysWithoutWin }).split(' ')[1] || 'dias'}</span>
                </div>
              )}
              {st.maxDrawsWithoutWin !== undefined && st.maxDrawsWithoutWin > 0 && (
                <div className="bg-slate-900/50 border border-slate-700/50 rounded-md p-2.5 flex flex-col justify-center shadow-sm">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">Jejum Recorde (Sorteios)</span>
                  <span className="text-sm text-slate-300 font-medium">{st.maxDrawsWithoutWin} {t('resultsModal.drySpell.drawsCount', { count: st.maxDrawsWithoutWin }).split(' ')[1] || 'vezes'}</span>
                </div>
              )}
              {st.avgDaysBetweenWins !== null && st.avgDaysBetweenWins > 0 && (
                <div className="bg-slate-900/50 border border-slate-700/50 rounded-md p-2.5 flex flex-col justify-center shadow-sm">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">Tempo Médio p/ Vitória</span>
                  <span className="text-sm text-slate-300 font-medium">{st.avgDaysBetweenWins} {t('resultsModal.drySpell.daysWithoutWin', { count: Math.ceil(st.avgDaysBetweenWins) }).split(' ')[1] || 'dias'}</span>
                </div>
              )}
              {st.winRate !== undefined && st.winRate > 0 && (
                <div className="bg-slate-900/50 border border-slate-700/50 rounded-md p-2.5 flex flex-col justify-center shadow-sm">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">Taxa de Vitória</span>
                  <span className="text-sm text-emerald-400 font-semibold">{st.winRate}%</span>
                </div>
              )}
              {st.luckiestDayOfWeek !== undefined && st.luckiestDayOfWeek !== null && (
                <div className="bg-slate-900/50 border border-slate-700/50 rounded-md p-2.5 flex flex-col justify-center shadow-sm">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">Dia + Sortudo</span>
                  <span className="text-sm text-slate-300 font-medium">
                    {i18n.language === 'en' 
                      ? ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][st.luckiestDayOfWeek]
                      : ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][st.luckiestDayOfWeek]}
                  </span>
                </div>
              )}
            </div>
            
            <div className="mt-1">
              <p className="text-xs font-semibold text-slate-300 mb-2.5">Histórico de vitórias:</p>
              {st.winTimestamps && st.winTimestamps.length > 0 ? (
                <div className="flex flex-wrap items-center gap-y-3">
                  {st.winTimestamps.map((ts: number, idx: number) => {
                    const isLast = idx === st.winTimestamps.length - 1;
                    let diffText = "";
                    if (!isLast) {
                      const prevTs = st.winTimestamps[idx + 1];
                      const diffMs = ts - prevTs;
                      diffText = formatTimeDiff(diffMs);
                    }
                    return (
                      <React.Fragment key={idx}>
                        <span title={new Date(ts).toLocaleString(i18n.language)} className="text-xs px-2 py-1 rounded-md bg-slate-800/60 text-slate-300 border border-slate-700/50 hover:bg-slate-700/50 hover:text-white transition-colors cursor-default">
                          {new Date(ts).toLocaleDateString(i18n.language, { day: '2-digit', month: '2-digit', year: '2-digit' })}
                        </span>
                        {!isLast && (
                          <div className="flex flex-col items-center mx-2">
                            <span className="text-[10px] font-medium text-slate-500 leading-none mb-1" title="Diferença">{diffText}</span>
                            <div className="h-[1px] w-8 bg-slate-700/50"></div>
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">
                   Nenhuma vitória registrada.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export const ResultsModal = () => {
  const { t, i18n } = useTranslation();
  const isResultsModalOpen = useAppStore(s => s.isResultsModalOpen);
  const setIsResultsModalOpen = useAppStore(s => s.setIsResultsModalOpen);
  const results = useAppStore(s => s.results);
  const seasons = useAppStore(s => s.seasons);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>('all');

  useEffect(() => {
    if (isResultsModalOpen) {
      const activeSeason = seasons.find(s => !s.endDate);
      setSelectedSeasonId(activeSeason ? activeSeason.id : 'all');
    }
  }, [isResultsModalOpen]); // Removed seasons dependency so it only resets when opening

  const setResults = useAppStore(s => s.setResults);
  const items = useAppStore(s => s.items);

  const [activeTab, setActiveTab] = useState<'historico' | 'ranking' | 'importar'>('historico');
  const filteredBySeason = useMemo(() => {
    if (selectedSeasonId === "all") return results;
    const season = seasons.find(s => s.id === selectedSeasonId);
    if (!season) return results;
    const end = season.endDate || Infinity;
    return results.filter(r => (r.timestamp || 0) >= season.startDate && (r.timestamp || 0) <= end);
  }, [results, seasons, selectedSeasonId]);
  const currentSeason = useMemo(() => {
    if (selectedSeasonId === 'all') return null;
    return seasons.find(s => s.id === selectedSeasonId) || null;
  }, [selectedSeasonId, seasons]);

  const isSeasonActive = useMemo(() => {
    if (selectedSeasonId === 'all') return true;
    return currentSeason ? !currentSeason.endDate : true;
  }, [currentSeason, selectedSeasonId]);

  const [filterMode, setFilterMode] = useState<'draw' | 'date'>('draw');
  const [customStartDraw, setCustomStartDraw] = useState('');
  const [customEndDraw, setCustomEndDraw] = useState('');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [customInterval, setCustomInterval] = useState('10');
  const [intervalOrder, setIntervalOrder] = useState<'asc' | 'desc'>('desc');
  const [importText, setImportText] = useState('');
  const [isConfirmingClearAll, setIsConfirmingClearAll] = useState(false);
  const [isFilterCollapsed, setIsFilterCollapsed] = useState(true);

  const [drySpellSearch, setDrySpellSearch] = useState('');
  const [drySpellSort, setDrySpellSort] = useState<'current_spell' | 'record_spell' | 'wins' | 'name'>('wins');
  const [drySpellOrder, setDrySpellOrder] = useState<'asc' | 'desc'>('desc');
  const [drySpellOnlyOnWheel, setDrySpellOnlyOnWheel] = useState(false);

  const filteredResults = useMemo(() => {
    return filteredBySeason.filter((r, i) => {
      const originalIndex = filteredBySeason.length - i;
      
      if (filterMode === 'draw') {
        let start = parseInt(customStartDraw, 10);
        let end = parseInt(customEndDraw, 10);
        const min = Math.min(start, end);
        const max = Math.max(start, end);
        
        if (!isNaN(min) && originalIndex < min) return false;
        if (!isNaN(max) && originalIndex > max) return false;
      }
      
      if (filterMode === 'date') {
        if (customStartDate && r.timestamp) {
          const itemDate = new Date(r.timestamp);
          itemDate.setHours(0, 0, 0, 0);
          const startDate = new Date(customStartDate);
          startDate.setHours(0, 0, 0, 0);
          
          const localStartDate = new Date(startDate.getTime() + startDate.getTimezoneOffset() * 60000);
          if (itemDate < localStartDate) return false;
        }
        
        if (customEndDate && r.timestamp) {
          const itemDate = new Date(r.timestamp);
          itemDate.setHours(0, 0, 0, 0);
          const endDate = new Date(customEndDate);
          endDate.setHours(0, 0, 0, 0);
          
          const localEndDate = new Date(endDate.getTime() + endDate.getTimezoneOffset() * 60000);
          if (itemDate > localEndDate) return false;
        }
      }

      return true;
    });
  }, [filteredBySeason, customStartDraw, customEndDraw, customStartDate, customEndDate, filterMode]);

  const allParticipantStats = useMemo(() => {
    let refTimestamp: number | undefined = undefined;
    if (selectedSeasonId !== 'all') {
      const s = seasons.find(s => s.id === selectedSeasonId);
      if (s && s.endDate) {
        refTimestamp = s.endDate;
      }
    }
    return getParticipantStats(items, filteredResults, refTimestamp);
  }, [items, filteredResults, selectedSeasonId, seasons]);

  const statsMap = useMemo(() => {
    const map = new Map<string, ParticipantStat>();
    allParticipantStats.forEach(st => {
      map.set(st.name.toLowerCase(), st);
    });
    return map;
  }, [allParticipantStats]);

  const longestDrySpellParticipant = useMemo(() => {
    let list = [...allParticipantStats];
    if (drySpellOnlyOnWheel) {
      list = list.filter(p => p.isOnWheel);
    }
    if (list.length === 0) return null;
    return list.sort((a, b) => b.daysWithoutWin - a.daysWithoutWin)[0];
  }, [allParticipantStats, drySpellOnlyOnWheel]);

  const averageDrySpell = useMemo(() => {
    let list = allParticipantStats;
    if (drySpellOnlyOnWheel) {
      list = list.filter(p => p.isOnWheel);
    }
    const winners = list.filter(s => s.hasWon);
    if (winners.length === 0) return 0;
    const sum = winners.reduce((acc, curr) => acc + curr.daysWithoutWin, 0);
    return Math.round((sum / winners.length) * 10) / 10;
  }, [allParticipantStats, drySpellOnlyOnWheel]);

  const neverWonCount = useMemo(() => {
    let list = allParticipantStats;
    if (drySpellOnlyOnWheel) {
      list = list.filter(p => p.isOnWheel);
    }
    return list.filter(s => !s.hasWon).length;
  }, [allParticipantStats, drySpellOnlyOnWheel]);

  const filteredDrySpellList = useMemo(() => {
    let list = [...allParticipantStats];

    if (drySpellOnlyOnWheel) {
      list = list.filter(p => p.isOnWheel);
    }

    if (drySpellSearch.trim()) {
      const q = drySpellSearch.toLowerCase().trim();
      list = list.filter(p => p.name.toLowerCase().includes(q));
    }

    list.sort((a, b) => {
      let comp = 0;
      if (drySpellSort === 'wins') {
        comp = a.winsCount - b.winsCount;
        if (comp === 0) comp = b.daysWithoutWin - a.daysWithoutWin;
      } else if (drySpellSort === 'current_spell') {
        comp = a.daysWithoutWin - b.daysWithoutWin;
        if (comp === 0) comp = a.drawsWithoutWin - b.drawsWithoutWin;
      } else if (drySpellSort === 'record_spell') {
        comp = a.maxDaysWithoutWin - b.maxDaysWithoutWin;
        if (comp === 0) comp = a.daysWithoutWin - b.daysWithoutWin;
      } else if (drySpellSort === 'name') {
        comp = a.name.localeCompare(b.name);
      }
      
      return drySpellOrder === 'desc' ? -comp : comp;
    });

    return list;
  }, [allParticipantStats, drySpellSearch, drySpellSort, drySpellOnlyOnWheel, drySpellOrder]);

  const exportResults = () => {
    if (filteredBySeason.length === 0) return;
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Posição,Nome,Status,ID_do_Sorteio,Data\n"
      + filteredBySeason.map((r, i) => {
          const dateStr = r.timestamp ? new Date(r.timestamp).toLocaleDateString('pt-BR') : '';
          return `${filteredBySeason.length - i},"${r.text.replace(/"/g, '""')}","${r.type || 'winner'}","${r.drawId}","${dateStr}"`;
        }).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "historico_roleta.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImport = () => {
    const lines = importText.split('\n').map(l => l.trim()).filter(l => l);
    if (!lines.length) return;

    const parseCSVLine = (str: string) => {
      const result = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < str.length; i++) {
        const char = str[i];
        if (char === '"' && str[i+1] === '"' && inQuotes) {
          current += '"';
          i++;
        } else if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current);
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current);
      return result;
    };

    const isCSV = lines[0].includes('Posição,Nome,Status') || lines[0].includes('Posição,Text,Status');
    const startIndex = isCSV ? 1 : 0;
    
    const newResults = [];
    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      if (isCSV) {
        const cols = parseCSVLine(line);
        if (cols.length >= 2) {
          const text = cols[1];
          const type = cols[2] === 'loser' ? 'loser' : 'winner';
          const drawId = cols[3] || `imported-${crypto.randomUUID()}`;
          const dateStr = cols[4];
          
          let timestamp = Date.now();
          if (dateStr) {
            const parts = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})(?:[ ,]+(\d{2}):(\d{2}):(\d{2}))?/);
            if (parts) {
              const [_, d, m, y, h, min, s] = parts;
              timestamp = new Date(parseInt(y), parseInt(m)-1, parseInt(d), parseInt(h || '0'), parseInt(min || '0'), parseInt(s || '0')).getTime();
            } else {
              const parsed = Date.parse(dateStr);
              if (!isNaN(parsed)) timestamp = parsed;
            }
          }

          newResults.push({
            id: crypto.randomUUID(),
            text,
            weight: 1,
            enabled: true,
            drawId,
            type,
            timestamp,
          });
        }
      } else {
        let text = line;
        let timestamp = Date.now();
        
        // Try to extract date from the end of the line (e.g. "Maria, 12/05/2023 14:30:00" or "João 12/05/2023")
        const dateMatch = line.match(/(.*?)(?:,?\s*)(\d{2}\/\d{2}\/\d{4}(?:[ ,]+\d{2}:\d{2}:\d{2})?)$/);
        
        if (dateMatch) {
          text = dateMatch[1].trim();
          const dateStr = dateMatch[2];
          const parts = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})(?:[ ,]+(\d{2}):(\d{2}):(\d{2}))?/);
          if (parts) {
            const [_, d, m, y, h, min, s] = parts;
            timestamp = new Date(parseInt(y), parseInt(m)-1, parseInt(d), parseInt(h || '0'), parseInt(min || '0'), parseInt(s || '0')).getTime();
          }
        }

        newResults.push({
          id: crypto.randomUUID(),
          text,
          weight: 1,
          enabled: true,
          drawId: `imported-${crypto.randomUUID()}`,
          type: 'winner' as const,
          timestamp,
        });
      }
    }

    setResults(prev => [...newResults, ...prev]);
    setImportText('');
    setActiveTab('historico');
  };

  const handleClearResults = () => {
    if (filteredResults.length === 0) return;
    setIsConfirmingClearAll(true);
  };

  const confirmClearAll = () => {
    const idsToRemove = new Set(filteredResults.map(r => r.drawId));
    setResults(prev => prev.filter(r => !idsToRemove.has(r.drawId)));
    setIsConfirmingClearAll(false);
  };

  const isBoxSelectedByDate = (res: any) => {
    if (!customStartDate && !customEndDate) return true;
    if (!res.timestamp) return false;

    const itemDate = new Date(res.timestamp);
    itemDate.setHours(0, 0, 0, 0);
    
    if (customStartDate) {
      const startDate = new Date(customStartDate);
      startDate.setHours(0, 0, 0, 0);
      const localStartDate = new Date(startDate.getTime() + startDate.getTimezoneOffset() * 60000);
      if (itemDate < localStartDate) return false;
    }
    
    if (customEndDate) {
      const endDate = new Date(customEndDate);
      endDate.setHours(0, 0, 0, 0);
      const localEndDate = new Date(endDate.getTime() + endDate.getTimezoneOffset() * 60000);
      if (itemDate > localEndDate) return false;
    }
    
    return true;
  };

  const isBoxSelected = (index: number) => {
    let start = parseInt(customStartDraw, 10);
    let end = parseInt(customEndDraw, 10);
    if (isNaN(start) && isNaN(end)) {
      return true;
    }
    if (!isNaN(start) && !isNaN(end)) {
      const min = Math.min(start, end);
      const max = Math.max(start, end);
      return index >= min && index <= max;
    }
    if (!isNaN(start)) return index === start;
    if (!isNaN(end)) return index === end;
    return false;
  };

  const handleBoxClick = (index: number) => {
    const start = parseInt(customStartDraw, 10);
    const end = parseInt(customEndDraw, 10);

    if (isNaN(start) || isNaN(end)) {
      setCustomStartDraw(index.toString());
      setCustomEndDraw(index.toString());
    } else {
      if (start === end) {
        if (index > start) {
          setCustomEndDraw(index.toString());
        } else {
          setCustomStartDraw(index.toString());
        }
      } else {
        setCustomStartDraw(index.toString());
        setCustomEndDraw(index.toString());
      }
    }
  };

  const quickSelects = useMemo(() => {
    if (filteredBySeason.length === 0) return [];
    const options = [];
    
    options.push({
      label: 'Todos',
      start: 1,
      end: filteredBySeason.length
    });

    const intervalSize = Math.max(1, parseInt(customInterval, 10) || 10);
    
    const chunks = Math.ceil(filteredBySeason.length / intervalSize);
    if (intervalOrder === 'asc') {
      for (let i = 0; i < chunks; i++) {
        const start = i * intervalSize + 1;
        const end = Math.min((i + 1) * intervalSize, filteredBySeason.length);
        options.push({
          label: `${start}-${end}`,
          start,
          end
        });
      }
    } else {
      for (let i = 0; i < chunks; i++) {
        const end = filteredBySeason.length - i * intervalSize;
        const start = Math.max(1, end - intervalSize + 1);
        options.push({
          label: `${end}-${start}`,
          start,
          end
        });
      }
    }
    return options;
  }, [filteredBySeason.length, customInterval, intervalOrder]);

  if (!isResultsModalOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md"
      onClick={() => setIsResultsModalOpen(false)}
    >
      <div 
        className="w-full max-w-3xl max-h-[90vh] sm:max-h-[85vh] bg-slate-950/80 border border-slate-800/80 backdrop-blur-xl rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800/60 bg-slate-900/40 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="p-2 bg-blue-500/10 rounded-xl border border-blue-500/20 shadow-inner">
              <Trophy size={20} className="text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-100 leading-tight">{t('resultsModal.title')}</h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">{t('resultsModal.subtitle')}</p>
            </div>
          </div>
          <button 
            onClick={() => setIsResultsModalOpen(false)}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-xl transition-colors focus:outline-none"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-4 py-2 border-b border-slate-800/60 flex justify-between items-center bg-slate-900/20 shrink-0">
    <div className="text-sm font-semibold text-slate-300">Temporada:</div>
    <select
      value={selectedSeasonId}
      onChange={(e) => setSelectedSeasonId(e.target.value)}
      className="bg-[#0f1015] border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500 w-full sm:max-w-[250px]"
    >
      <option value="all">Resultados Gerais (Tudo)</option>
      {seasons.map(s => (
        <option key={s.id} value={s.id}>{s.name} {!s.endDate ? '(Ativa)' : ''}</option>
      )).reverse()}
    </select>
  </div>
  <div className="flex w-full bg-slate-950/40 border-b border-slate-800/60 shrink-0 overflow-x-auto no-scrollbar">
          <button 
            onClick={() => setActiveTab('historico')}
            className={`flex-1 min-w-[120px] text-xs sm:text-sm font-semibold py-3 transition-all border-b-2 ${activeTab === 'historico' ? 'text-white border-blue-500 bg-blue-500/5 shadow-[inset_0_-2px_10px_rgba(59,130,246,0.05)]' : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-900/20'}`}
          >
            {t('resultsModal.tabs.history')}
          </button>
          <button 
            onClick={() => setActiveTab('ranking')}
            className={`flex-1 min-w-[140px] sm:min-w-[150px] text-xs sm:text-sm font-semibold py-3 transition-all border-b-2 flex items-center justify-center gap-1.5 ${activeTab === 'ranking' ? 'text-amber-400 border-amber-500 bg-amber-500/5 shadow-[inset_0_-2px_10px_rgba(245,158,11,0.05)]' : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-900/20'}`}
          >
            <Trophy size={14} className={activeTab === 'ranking' ? "text-amber-400 shrink-0" : "text-slate-400 shrink-0"} />
            {t('resultsModal.tabs.ranking')}
          </button>
          <button 
            onClick={() => setActiveTab('importar')}
            className={`flex-1 min-w-[120px] text-xs sm:text-sm font-semibold py-3 transition-all border-b-2 ${activeTab === 'importar' ? 'text-white border-blue-500 bg-blue-500/5 shadow-[inset_0_-2px_10px_rgba(59,130,246,0.05)]' : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-900/20'}`}
          >
            {t('resultsModal.tabs.import')}
          </button>
        </div>

        <div className="p-4 sm:p-5 flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-4">
          
          {!isSeasonActive && currentSeason && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/5 border border-amber-500/10 rounded-lg shrink-0 -mt-2 mb-1">
              <Clock size={12} className="text-amber-500/70" />
              <span className="text-[10px] font-bold text-amber-500/70 uppercase tracking-wider">
                Temporada Encerrada ({new Date(currentSeason.endDate!).toLocaleDateString(i18n.language)})
              </span>
            </div>
          )}
          
          {(activeTab === 'historico' || activeTab === 'ranking') && (
            <div className="flex flex-col pb-2 border-b border-slate-800/50 shrink-0 relative z-20">
              <button 
                onClick={() => setIsFilterCollapsed(!isFilterCollapsed)}
                className="flex items-center justify-between w-full py-2 px-1 text-slate-400 hover:text-slate-300 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <ListOrdered size={18} />
                  <span className="text-sm font-medium">{t('resultsModal.filter.title')}</span>
                </div>
                {isFilterCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
              </button>

              {!isFilterCollapsed && (
                <div className="flex flex-col gap-3 bg-slate-950/30 p-4 rounded-2xl border border-slate-800/80 mt-2 shadow-inner">
                  <div className="flex flex-col sm:flex-row gap-6">
                    <div className="flex flex-col gap-4 sm:w-64 shrink-0">
                      <div className="flex bg-slate-950/50 p-1 rounded-xl border border-slate-800/80">
                        <button 
                          onClick={() => setFilterMode('draw')}
                          className={`flex-1 text-xs font-semibold py-1.5 px-2 rounded-lg transition-all ${filterMode === 'draw' ? 'bg-blue-600/15 text-blue-400 shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                          {t('resultsModal.filter.typeDraw')}
                        </button>
                        <button 
                          onClick={() => setFilterMode('date')}
                          className={`flex-1 text-xs font-semibold py-1.5 px-2 rounded-lg transition-all ${filterMode === 'date' ? 'bg-blue-600/15 text-blue-400 shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                          {t('resultsModal.filter.typeDate')}
                        </button>
                      </div>

                      {filterMode === 'draw' && (
                        <div className="flex flex-col gap-3">
                          <div className="flex items-center gap-2 w-full">
                            <label className="text-xs font-medium text-slate-400 flex-1">{t('resultsModal.filter.groupBy')}</label>
                            <div className="flex items-center gap-1.5">
                              <input 
                                type="number" 
                                min="1"
                                value={customInterval}
                                onChange={(e) => setCustomInterval(e.target.value)}
                                className="bg-slate-950/45 border border-slate-800 rounded-lg px-2.5 py-1 w-16 text-xs text-white focus:outline-none focus:border-blue-500/80 focus:ring-1 focus:ring-blue-500/30"
                              />
                              <button
                                onClick={() => setIntervalOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                                className="p-1.5 bg-slate-950/50 border border-slate-800 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900/60 transition-all"
                              >
                                {intervalOrder === 'asc' ? <ArrowDown size={14} /> : <ArrowUp size={14} />}
                              </button>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 w-full">
                            <label className="text-xs font-medium text-slate-400 flex-1">{t('resultsModal.filter.start')}</label>
                            <input 
                              type="number" 
                              min="1"
                              placeholder="20"
                              value={customStartDraw}
                              onChange={(e) => setCustomStartDraw(e.target.value)}
                              className="bg-slate-950/45 border border-slate-800 rounded-lg px-2 py-1 w-28 text-xs text-white focus:outline-none focus:border-blue-500/80 focus:ring-1 focus:ring-blue-500/30"
                            />
                          </div>
                          
                          <div className="flex items-center gap-2 w-full">
                            <label className="text-xs font-medium text-slate-400 flex-1">{t('resultsModal.filter.end')}</label>
                            <input 
                              type="number" 
                              min="1"
                              placeholder="30"
                              value={customEndDraw}
                              onChange={(e) => setCustomEndDraw(e.target.value)}
                              className="bg-slate-950/45 border border-slate-800 rounded-lg px-2 py-1 w-28 text-xs text-white focus:outline-none focus:border-blue-500/80 focus:ring-1 focus:ring-blue-500/30"
                            />
                          </div>
                        </div>
                      )}

                      {filterMode === 'date' && (
                        <div className="flex flex-col gap-3">
                          <div className="flex items-center gap-2 w-full">
                            <label className="text-xs font-medium text-slate-400 flex-1">{t('resultsModal.filter.startDate')}</label>
                            <input 
                              type="date" 
                              value={customStartDate}
                              onChange={(e) => setCustomStartDate(e.target.value)}
                              className="bg-slate-950/45 border border-slate-800 rounded-lg px-2 py-1 w-28 text-xs text-white focus:outline-none focus:border-blue-500/80 focus:ring-1 focus:ring-blue-500/30 [color-scheme:dark]"
                            />
                          </div>
                          
                          <div className="flex items-center gap-2 w-full">
                            <label className="text-xs font-medium text-slate-400 flex-1">{t('resultsModal.filter.endDate')}</label>
                            <input 
                              type="date" 
                              value={customEndDate}
                              onChange={(e) => setCustomEndDate(e.target.value)}
                              className="bg-slate-950/45 border border-slate-800 rounded-lg px-2 py-1 w-28 text-xs text-white focus:outline-none focus:border-blue-500/80 focus:ring-1 focus:ring-blue-500/30 [color-scheme:dark]"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-col gap-3 flex-1">
                      {filterMode === 'draw' && quickSelects.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {quickSelects.map((opt, idx) => (
                            <button
                              key={idx}
                              onClick={() => {
                                setCustomStartDraw(opt.start.toString());
                                setCustomEndDraw(opt.end.toString());
                              }}
                              className="px-2.5 py-1 text-[11px] font-semibold bg-slate-950/50 text-slate-300 rounded-lg hover:bg-slate-900 hover:text-white transition-colors border border-slate-800/80"
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      )}
                      
                      {filteredBySeason.length > 0 && (
                        <div className="flex flex-col">
                          {filterMode === 'date' && (
                            <div className="text-[11px] font-medium text-slate-400 mb-2 flex items-center gap-1.5 px-0.5">
                               <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                               <span>
                                 {t('resultsModal.filter.selected')} <strong className="text-white ml-1">{filteredBySeason.filter(r => isBoxSelectedByDate(r)).length}</strong>
                               </span>
                            </div>
                          )}
                          <div className="flex flex-wrap gap-1 p-0.5">
                            {Array.from({ length: filteredBySeason.length }).map((_, i) => {
                              const index = i + 1;
                              const res = filteredBySeason[filteredBySeason.length - index];
                              const selected = filterMode === 'draw' ? isBoxSelected(index) : isBoxSelectedByDate(res);
                              return (
                                <button
                                  key={index}
                                  onClick={() => {
                                    if (filterMode === 'date') setFilterMode('draw');
                                    handleBoxClick(index);
                                  }}
                                  className={`w-4 h-4 rounded-[3px] transition-all duration-200 ${
                                    selected 
                                      ? 'ring-1 ring-blue-500 ring-offset-1 ring-offset-slate-900 scale-110 opacity-100 z-10 shadow-sm' 
                                      : 'opacity-40 hover:opacity-100 hover:scale-105'
                                  }`}
                                  style={{ 
                                    backgroundColor: res.color || '#4a72ff'
                                  }}
                                  title={`${t("resultsModal.draw")} ${index}: ${res.text}`}
                                />
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'historico' && (
            <div className="flex flex-col">
              <div className="flex justify-between items-center mb-3 px-1">
                <span className="text-sm font-medium text-slate-400">
                  {t('resultsModal.history.showing')} {filteredResults.length} {t('resultsModal.history.results')}
                </span>
                <div className="flex gap-3">
                  {filteredBySeason.length > 0 && (
                    <button onClick={exportResults} className="text-sm text-blue-400 hover:text-blue-300 transition-colors font-semibold flex items-center gap-1">
                      <Download size={16} /> {t('resultsModal.history.export')}
                    </button>
                  )}
                  {filteredBySeason.length > 0 && (
                    isConfirmingClearAll ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-red-400 font-medium">Limpar tudo?</span>
                        <button onClick={confirmClearAll} className="p-1 text-red-400 hover:text-white hover:bg-red-500 rounded transition-colors" title="Sim">
                          <Check size={16} />
                        </button>
                        <button onClick={() => setIsConfirmingClearAll(false)} className="p-1 text-slate-400 hover:text-white hover:bg-slate-600 rounded transition-colors" title="Não">
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <button onClick={handleClearResults} className="text-sm text-red-400 hover:text-red-300 transition-colors font-semibold flex items-center gap-1">
                        <Trash2 size={16} /> {t('resultsModal.history.clearAll')}
                      </button>
                    )
                  )}
                </div>
              </div>
              
              <div className="space-y-3 pb-2 flex flex-col">
                {filteredResults.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-slate-500 gap-4 py-8 opacity-70">
                    <div className="p-4 bg-slate-800/50 rounded-full border border-slate-700/50">
                      <ListOrdered size={48} className="text-slate-600" />
                    </div>
                    <p className="text-lg">{t('resultsModal.history.empty')}</p>
                  </div>
                ) : (
                  filteredResults.map((result, i) => {
                    const originalIndex = filteredBySeason.length - filteredBySeason.findIndex(r => r.drawId === result.drawId);
                    const dateLabel = result.timestamp ? new Date(result.timestamp).toLocaleDateString(i18n.language) : t('resultsModal.history.unknownDate');
                    return (
                      <div key={result.drawId} className="relative group">
                        <ResultItem 
                          result={result} 
                          index={originalIndex}
                          onRemove={(resultToRemove) => {
                            console.log("Removing result with drawId:", resultToRemove.drawId);
                            setResults(prev => prev.filter(r => r.drawId !== resultToRemove.drawId));
                          }}
                        />
                        <div className="absolute right-12 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-mono opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 px-2.5 py-1.5 rounded shadow-lg border border-slate-700 pointer-events-none">
                          {dateLabel}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {activeTab === 'ranking' && (
            <div className="flex flex-col gap-3">
              {/* Summary Header Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 shrink-0">
                <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/20 rounded-xl px-3 py-2 flex items-center gap-2.5 shadow-inner">
                  <div className="p-1.5 bg-amber-500/20 rounded-lg border border-amber-500/30 text-amber-400 shrink-0">
                    <Flame size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-amber-400/90 font-medium truncate leading-tight">{t('resultsModal.drySpell.longestSpell')}</p>
                    <p className="text-sm font-bold text-white truncate leading-tight">
                      {longestDrySpellParticipant 
                        ? `${longestDrySpellParticipant.name} (${longestDrySpellParticipant.daysWithoutWin}d)` 
                        : '-'}
                    </p>
                  </div>
                </div>

                <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl px-3 py-2 flex items-center gap-2.5 hidden sm:flex">
                  <div className="p-1.5 bg-blue-500/10 rounded-lg border border-blue-500/20 text-blue-400 shrink-0">
                    <Clock size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-slate-400 font-medium truncate leading-tight">{t('resultsModal.drySpell.averageSpell')}</p>
                    <p className="text-sm font-bold text-white truncate leading-tight">{averageDrySpell} {t('resultsModal.drySpell.daysWithoutWin', { count: averageDrySpell }).split(' ')[1] || 'dias'}</p>
                  </div>
                </div>

                <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl px-3 py-2 flex items-center gap-2.5">
                  <div className="p-1.5 bg-rose-500/10 rounded-lg border border-rose-500/20 text-rose-400 shrink-0">
                    <AlertCircle size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-slate-400 font-medium truncate leading-tight">{t('resultsModal.drySpell.neverWonCount')}</p>
                    <p className="text-sm font-bold text-white truncate leading-tight">{neverWonCount}</p>
                  </div>
                </div>
              </div>

              {/* Search & Sort Controls */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0 bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/60">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={drySpellSearch}
                    onChange={(e) => setDrySpellSearch(e.target.value)}
                    placeholder={t('resultsModal.drySpell.searchPlaceholder')}
                    className="w-full bg-slate-900/80 border border-slate-800 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/80"
                  />
                </div>

                <div className="flex items-center flex-wrap gap-3 shrink-0">
                  <label className="flex items-center gap-1.5 cursor-pointer group">
                    <div className="relative flex items-center justify-center">
                      <input 
                        type="checkbox" 
                        className="peer sr-only" 
                        checked={drySpellOnlyOnWheel}
                        onChange={(e) => setDrySpellOnlyOnWheel(e.target.checked)}
                      />
                      <div className="w-7 h-4 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-500 border border-slate-700/50"></div>
                    </div>
                    <span className="text-[11px] text-slate-300 font-medium group-hover:text-white transition-colors select-none">{t('resultsModal.drySpell.onlyOnWheel')}</span>
                  </label>
                  
                  <div className="w-px h-4 bg-slate-800/80 mx-0.5 hidden sm:block"></div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <label className="text-[11px] text-slate-400 font-medium whitespace-nowrap hidden sm:block">{t('resultsModal.drySpell.sortBy')}</label>
                    <div className="flex items-center gap-1">
                      <select
                        value={drySpellSort}
                        onChange={(e: any) => setDrySpellSort(e.target.value)}
                        className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-[11px] text-slate-200 focus:outline-none focus:border-amber-500/80 [color-scheme:dark]"
                      >
                        <option value="wins">{t('resultsModal.drySpell.sortWins')}</option>
                        <option value="current_spell">{t('resultsModal.drySpell.sortCurrentSpell')}</option>
                        <option value="record_spell">{t('resultsModal.drySpell.sortRecordSpell')}</option>
                        <option value="name">{t('resultsModal.drySpell.sortName')}</option>
                      </select>
                      
                      <button
                        onClick={() => setDrySpellOrder(drySpellOrder === 'asc' ? 'desc' : 'asc')}
                        className={`p-1.5 rounded-lg border transition-all ${
                          drySpellOrder === 'desc' 
                            ? 'bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700' 
                            : 'bg-slate-800 border-slate-700 text-blue-400 hover:bg-slate-700'
                        }`}
                        title={drySpellOrder === 'asc' ? t('resultsModal.drySpell.ascending') : t('resultsModal.drySpell.descending')}
                      >
                        {drySpellOrder === 'asc' ? <SortAsc size={14} /> : <SortDesc size={14} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* List of participants */}
              <div className="space-y-2 pb-1 flex flex-col pr-1">
                {filteredDrySpellList.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-slate-500 gap-3 py-8 opacity-70">
                    <Clock size={40} className="text-slate-600" />
                    <p className="text-sm">{t('resultsModal.drySpell.noParticipants')}</p>
                  </div>
                ) : (
                  (() => {
                    const maxWins = filteredDrySpellList.length > 0 
                      ? Math.max(...filteredDrySpellList.map(p => p.winsCount)) 
                      : 0;
                      
                    return filteredDrySpellList.map((st, index) => {
                      const isLeader = st.winsCount > 0 && st.winsCount === maxWins;
                      
                      return (
                        <RankingItem 
                          key={st.name} 
                          st={st} 
                          index={index} 
                          t={t} 
                          i18n={i18n} 
                          isSeasonActive={isSeasonActive} 
                          isLeader={isLeader}
                        />
                      );
                    });
                  })()
                )}
              </div>

            </div>
          )}

          {activeTab === 'importar' && (
            <div className="flex flex-col gap-6 text-slate-300 pb-2">
              <div className="flex flex-col min-h-[250px]">
                <label className="text-base font-semibold text-slate-300 mb-3 block">
                  {t('resultsModal.import.title')}
                </label>
                <div className="flex-1 bg-slate-950/45 p-1.5 rounded-2xl border border-slate-800/80 shadow-inner">
                  <textarea
                    className="w-full h-full bg-transparent p-3 text-sm text-white resize-none focus:outline-none placeholder-slate-600 custom-scrollbar"
                    placeholder={t('resultsModal.import.placeholder')}
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="shrink-0 space-y-4">
                <div className="bg-blue-500/5 border border-blue-500/20 p-4 rounded-2xl flex items-start gap-3">
                  <AlertCircle size={20} className="text-blue-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-200/90 leading-relaxed">
                    {t('resultsModal.import.info1')}<b>{t('sidebar.tabs.results')}</b>{t('resultsModal.import.info2')}<b>{t('resultsModal.tabs.ranking')}</b>. <br/>{t('resultsModal.import.info3')}
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  {filteredBySeason.length > 0 ? (
                    isConfirmingClearAll ? (
                      <div className="flex gap-2 w-full">
                        <Button variant="danger" onClick={confirmClearAll} className="flex-1 gap-1 py-3 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs" title="Confirmar">
                          <Check size={16} /> Sim
                        </Button>
                        <Button variant="secondary" onClick={() => setIsConfirmingClearAll(false)} className="flex-1 gap-1 py-3 rounded-2xl bg-slate-700 hover:bg-slate-600 text-white text-xs" title="Cancelar">
                          <X size={16} /> Não
                        </Button>
                      </div>
                    ) : (
                      <Button variant="danger" onClick={handleClearResults} className="w-full gap-2 py-3 rounded-2xl border border-red-500/20 bg-red-950/15 hover:bg-red-950/25 text-red-400">
                        <Trash2 size={18} /> {t('resultsModal.history.clearAll')}
                      </Button>
                    )
                  ) : <div></div>}
                  <Button onClick={handleImport} disabled={!importText.trim()} className="w-full gap-2 py-3 rounded-2xl shadow-lg bg-gradient-to-br from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-indigo-500/20">
                    <Download size={18} /> {t('resultsModal.import.btn')}
                  </Button>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
