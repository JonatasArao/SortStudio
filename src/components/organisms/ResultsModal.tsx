import React, { useState, useMemo, useEffect } from 'react';
import { X, Check, ListOrdered, Trophy, Download, AlertCircle, Trash2, Crown, ChevronDown, ChevronUp, ArrowDown, ArrowUp, Flame, Clock, Search, Sparkles, SortDesc, SortAsc, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store/useAppStore';
import { ResultItem } from '../molecules/ResultItem';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { Toggle } from '../atoms/Toggle';
import { getParticipantStats, ParticipantStat, compareParticipantsByWins } from '../../utils/statsUtils';
import { SeasonPosterModal } from './SeasonPosterModal';

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
  const isLongSpell = st.hasWon && st.daysWithoutWin >= 10;

  return (
    <div className={`bg-[var(--studio-card)] transition-colors rounded-xl border flex flex-col overflow-hidden ${
      isLeader
        ? 'border-amber-500/45 bg-amber-500/[0.06]'
        : 'border-[var(--studio-border)]'
    } ${!isSeasonActive ? 'opacity-90' : ''}`}>
      <button
        type="button"
        className="w-full py-3 px-3.5 flex items-center justify-between gap-3 text-left hover:bg-[var(--studio-card-hover)]/40 transition-colors"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-mono tabular-nums font-bold shrink-0 border ${
            isLeader ? 'bg-amber-500/20 border-amber-500/40 text-amber-800 dark:text-amber-300' :
            isWonToday ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-700 dark:text-emerald-300' :
            isWonOnLastDay ? 'bg-blue-500/15 border-blue-500/35 text-blue-700 dark:text-blue-300' :
            !st.hasWon ? 'bg-[var(--studio-input)] border-[var(--studio-border)] text-[var(--studio-text-muted)]' :
            isLongSpell ? 'bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300' :
            'bg-[var(--studio-accent-soft)] border-[var(--studio-accent)]/30 text-[var(--studio-accent-fg)]'
          }`}>
            {index + 1}º
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className={`font-semibold text-sm leading-tight truncate ${isLeader ? 'text-amber-800 dark:text-amber-200' : 'text-[var(--studio-text)]'}`}>
                {st.name}
              </span>
              {isLeader && (
                <Crown size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />
              )}
            </div>

            <p className="text-xs text-[var(--studio-text-muted)] mt-0.5 truncate">
              {isSeasonActive && (
                <>
                  <span className={st.isOnWheel ? 'text-emerald-700 dark:text-emerald-400 font-medium' : 'text-[var(--studio-text-muted)]'}>
                    {st.isOnWheel ? t('resultsModal.drySpell.activeOnWheel') : t('resultsModal.drySpell.inactive')}
                  </span>
                  <span className="mx-1.5" aria-hidden="true">·</span>
                </>
              )}
              <span className="font-mono tabular-nums">
                {st.hasWon && st.lastWinTimestamp
                  ? t('resultsModal.drySpell.lastWinDate', { date: new Date(st.lastWinTimestamp).toLocaleDateString(i18n.language) })
                  : st.firstSeenTimestamp
                  ? t('resultsModal.drySpell.firstSeen', { date: new Date(st.firstSeenTimestamp).toLocaleDateString(i18n.language) })
                  : t('resultsModal.drySpell.neverWon')}
              </span>
            </p>
          </div>
        </div>

        {/* Counter & Status */}
        <div className="shrink-0 flex items-center gap-3">
          <div className="text-right">
            <span className={`text-xs font-semibold block font-mono tabular-nums ${isLeader ? 'text-amber-700 dark:text-amber-300' : 'text-[var(--studio-text)]'}`}>
              {st.winsCount} {st.winsCount === 1 ? t('resultsModal.ranking.win') : t('resultsModal.ranking.wins')}
            </span>
            {isLeader && (
              <span className="text-[10px] uppercase tracking-wider text-amber-700 dark:text-amber-400/90 font-semibold hidden sm:block">
                {!isSeasonActive ? 'Campeão' : 'Líder'}
              </span>
            )}
          </div>

          {isSeasonActive && (
            <div className={`px-2 py-1 rounded-md border text-[11px] flex items-center gap-1 font-mono tabular-nums ${
              isWonToday
                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/35 font-semibold'
                : !st.hasWon
                ? 'bg-[var(--studio-input)] text-[var(--studio-text-muted)] border-[var(--studio-border)]'
                : st.daysWithoutWin > 7
                ? 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30 font-semibold'
                : 'bg-[var(--studio-input)] text-[var(--studio-text-secondary)] border-[var(--studio-border)]'
            }`}>
              {isWonToday ? (
                t('resultsModal.drySpell.wonToday')
              ) : st.hasWon ? (
                <>
                  <Clock size={11} />
                  {st.daysWithoutWin}d
                </>
              ) : (
                "0 vit."
              )}
            </div>
          )}

          <span className="text-[var(--studio-text-muted)]">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="px-3.5 pb-3.5 pt-3 border-t border-[var(--studio-border)] bg-[var(--studio-surface-elevated)]">
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {isSeasonActive && st.drawsWithoutWin > 0 && (
                <div className="bg-[var(--studio-card)] border border-[var(--studio-border)] rounded-lg p-2.5 flex flex-col justify-center">
                  <span className="text-[10px] text-[var(--studio-text-muted)] uppercase tracking-wider font-semibold mb-0.5">Jejum Atual (Sorteios)</span>
                  <span className="text-sm text-[var(--studio-text)] font-mono tabular-nums font-medium">{st.drawsWithoutWin} {t('resultsModal.drySpell.drawsCount', { count: st.drawsWithoutWin }).split(' ')[1] || 'vezes'}</span>
                </div>
              )}
              {isSeasonActive && st.maxDaysWithoutWin !== undefined && st.maxDaysWithoutWin > 0 && (
                <div className="bg-[var(--studio-card)] border border-[var(--studio-border)] rounded-lg p-2.5 flex flex-col justify-center">
                  <span className="text-[10px] text-[var(--studio-text-muted)] uppercase tracking-wider font-semibold mb-0.5">Jejum Recorde (Dias)</span>
                  <span className="text-sm text-[var(--studio-text)] font-mono tabular-nums font-medium">{st.maxDaysWithoutWin} {t('resultsModal.drySpell.daysWithoutWin', { count: st.maxDaysWithoutWin }).split(' ')[1] || 'dias'}</span>
                </div>
              )}
              {isSeasonActive && st.maxDrawsWithoutWin !== undefined && st.maxDrawsWithoutWin > 0 && (
                <div className="bg-[var(--studio-card)] border border-[var(--studio-border)] rounded-lg p-2.5 flex flex-col justify-center">
                  <span className="text-[10px] text-[var(--studio-text-muted)] uppercase tracking-wider font-semibold mb-0.5">Jejum Recorde (Sorteios)</span>
                  <span className="text-sm text-[var(--studio-text)] font-mono tabular-nums font-medium">{st.maxDrawsWithoutWin} {t('resultsModal.drySpell.drawsCount', { count: st.maxDrawsWithoutWin }).split(' ')[1] || 'vezes'}</span>
                </div>
              )}
              {st.avgDaysBetweenWins !== null && st.avgDaysBetweenWins > 0 && (
                <div className="bg-[var(--studio-card)] border border-[var(--studio-border)] rounded-lg p-2.5 flex flex-col justify-center">
                  <span className="text-[10px] text-[var(--studio-text-muted)] uppercase tracking-wider font-semibold mb-0.5">Tempo Médio p/ Vitória</span>
                  <span className="text-sm text-[var(--studio-text)] font-mono tabular-nums font-medium">{st.avgDaysBetweenWins} {t('resultsModal.drySpell.daysWithoutWin', { count: Math.ceil(st.avgDaysBetweenWins) }).split(' ')[1] || 'dias'}</span>
                </div>
              )}
              {st.winRate !== undefined && st.winRate > 0 && (
                <div className="bg-[var(--studio-card)] border border-[var(--studio-border)] rounded-lg p-2.5 flex flex-col justify-center">
                  <span className="text-[10px] text-[var(--studio-text-muted)] uppercase tracking-wider font-semibold mb-0.5">Taxa de Vitória</span>
                  <span className="text-sm text-emerald-700 dark:text-emerald-400 font-mono tabular-nums font-semibold">{st.winRate}%</span>
                </div>
              )}
              {st.luckiestDayOfWeek !== undefined && st.luckiestDayOfWeek !== null && (
                <div className="bg-[var(--studio-card)] border border-[var(--studio-border)] rounded-lg p-2.5 flex flex-col justify-center">
                  <span className="text-[10px] text-[var(--studio-text-muted)] uppercase tracking-wider font-semibold mb-0.5">Dia + Sortudo</span>
                  <span className="text-sm text-[var(--studio-text)] font-medium">
                    {i18n.language === 'en'
                      ? ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][st.luckiestDayOfWeek]
                      : ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][st.luckiestDayOfWeek]}
                  </span>
                </div>
              )}
            </div>

            <div>
              <p className="text-xs font-semibold text-[var(--studio-text-secondary)] mb-2">Histórico de vitórias:</p>
              {st.winTimestamps && st.winTimestamps.length > 0 ? (
                <div className="flex flex-wrap items-center gap-y-2.5">
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
                        <span
                          title={new Date(ts).toLocaleString(i18n.language)}
                          className="text-xs font-mono tabular-nums px-2 py-1 rounded-md bg-[var(--studio-card)] text-[var(--studio-text)] border border-[var(--studio-border)]"
                        >
                          {new Date(ts).toLocaleDateString(i18n.language, { day: '2-digit', month: '2-digit', year: '2-digit' })}
                        </span>
                        {!isLast && (
                          <div className="flex flex-col items-center mx-2">
                            <span className="text-[10px] font-mono tabular-nums text-[var(--studio-text-muted)] leading-none mb-1" title="Diferença">{diffText}</span>
                            <div className="h-[1px] w-7 bg-[var(--studio-border-strong)]" />
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-[var(--studio-text-muted)]">
                  Nenhuma vitória registrada.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

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
  }, [isResultsModalOpen]);

  const setResults = useAppStore(s => s.setResults);
  const items = useAppStore(s => s.items);
  const appTitle = useAppStore(s => s.title);

  const [activeTab, setActiveTab] = useState<'historico' | 'ranking' | 'importar'>('historico');
  const [isPosterModalOpen, setIsPosterModalOpen] = useState(false);

  useEffect(() => {
    if (!isResultsModalOpen || isPosterModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsResultsModalOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isResultsModalOpen, isPosterModalOpen, setIsResultsModalOpen]);

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

  const isSeasonFinished = useMemo(() => {
    return selectedSeasonId !== 'all' && !isSeasonActive;
  }, [selectedSeasonId, isSeasonActive]);

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

  useEffect(() => {
    if (isSeasonFinished && (drySpellSort === 'current_spell' || drySpellSort === 'record_spell')) {
      setDrySpellSort('wins');
    }
  }, [isSeasonFinished, drySpellSort]);

  const filteredResults = useMemo(() => {
    return filteredBySeason.filter((r, i) => {
      const originalIndex = filteredBySeason.length - i;

      if (filterMode === 'draw') {
        const start = parseInt(customStartDraw, 10);
        const end = parseInt(customEndDraw, 10);
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
    return getParticipantStats(items, filteredResults, refTimestamp, isSeasonFinished);
  }, [items, filteredResults, selectedSeasonId, seasons, isSeasonFinished]);

  const longestDrySpellParticipant = useMemo(() => {
    let list = [...allParticipantStats];
    if (!isSeasonFinished && drySpellOnlyOnWheel) {
      list = list.filter(p => p.isOnWheel);
    }
    if (list.length === 0) return null;
    return list.sort((a, b) => b.daysWithoutWin - a.daysWithoutWin)[0];
  }, [allParticipantStats, drySpellOnlyOnWheel, isSeasonFinished]);

  const averageDrySpell = useMemo(() => {
    let list = allParticipantStats;
    if (!isSeasonFinished && drySpellOnlyOnWheel) {
      list = list.filter(p => p.isOnWheel);
    }
    const winners = list.filter(s => s.hasWon);
    if (winners.length === 0) return 0;
    const sum = winners.reduce((acc, curr) => acc + curr.daysWithoutWin, 0);
    return Math.round((sum / winners.length) * 10) / 10;
  }, [allParticipantStats, drySpellOnlyOnWheel, isSeasonFinished]);

  const neverWonCount = useMemo(() => {
    let list = allParticipantStats;
    if (!isSeasonFinished && drySpellOnlyOnWheel) {
      list = list.filter(p => p.isOnWheel);
    }
    return list.filter(s => !s.hasWon).length;
  }, [allParticipantStats, drySpellOnlyOnWheel, isSeasonFinished]);

  const filteredDrySpellList = useMemo(() => {
    let list = [...allParticipantStats];

    if (!isSeasonFinished && drySpellOnlyOnWheel) {
      list = list.filter(p => p.isOnWheel);
    }

    if (drySpellSearch.trim()) {
      const q = drySpellSearch.toLowerCase().trim();
      list = list.filter(p => p.name.toLowerCase().includes(q));
    }

    list.sort((a, b) => {
      if (drySpellSort === 'wins') {
        const res = compareParticipantsByWins(a, b);
        return drySpellOrder === 'desc' ? res : -res;
      }

      let comp = 0;
      if (drySpellSort === 'current_spell') {
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
  }, [allParticipantStats, drySpellSearch, drySpellSort, drySpellOnlyOnWheel, drySpellOrder, isSeasonFinished]);

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
        if (char === '"' && str[i + 1] === '"' && inQuotes) {
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
              timestamp = new Date(parseInt(y), parseInt(m) - 1, parseInt(d), parseInt(h || '0'), parseInt(min || '0'), parseInt(s || '0')).getTime();
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

        const dateMatch = line.match(/(.*?)(?:,?\s*)(\d{2}\/\d{2}\/\d{4}(?:[ ,]+\d{2}:\d{2}:\d{2})?)$/);

        if (dateMatch) {
          text = dateMatch[1].trim();
          const dateStr = dateMatch[2];
          const parts = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})(?:[ ,]+(\d{2}):(\d{2}):(\d{2}))?/);
          if (parts) {
            const [_, d, m, y, h, min, s] = parts;
            timestamp = new Date(parseInt(y), parseInt(m) - 1, parseInt(d), parseInt(h || '0'), parseInt(min || '0'), parseInt(s || '0')).getTime();
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
    const start = parseInt(customStartDraw, 10);
    const end = parseInt(customEndDraw, 10);
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
      className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={() => setIsResultsModalOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-label={t('resultsModal.title')}
    >
      <div
        className="w-full max-w-3xl max-h-[90vh] sm:max-h-[86vh] bg-[var(--studio-surface)] border border-[var(--studio-border-strong)] text-[var(--studio-text)] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-[var(--studio-border)] bg-[var(--studio-surface-elevated)] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[var(--studio-card)] border border-[var(--studio-border)] flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
              <Trophy size={18} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-[var(--studio-text)] leading-tight">{t('resultsModal.title')}</h2>
              <p className="text-xs text-[var(--studio-text-muted)] mt-0.5">{t('resultsModal.subtitle')}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsResultsModalOpen(false)}
            className="p-2 text-[var(--studio-text-muted)] hover:text-[var(--studio-text)] hover:bg-[var(--studio-card-hover)] rounded-lg transition-colors"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Season Toolbar */}
        <div className="px-4 sm:px-6 py-2.5 border-b border-[var(--studio-border)] flex flex-wrap gap-2.5 justify-between items-center bg-[var(--studio-input)]/70 shrink-0">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <span className="text-xs font-medium text-[var(--studio-text-muted)] shrink-0">Temporada:</span>
            <select
              value={selectedSeasonId}
              onChange={(e) => setSelectedSeasonId(e.target.value)}
              className="bg-[var(--studio-card)] border border-[var(--studio-border-strong)] rounded-lg px-3 py-1.5 text-xs sm:text-sm text-[var(--studio-text)] focus:outline-none focus:border-[var(--studio-accent)] w-full sm:max-w-[250px]"
            >
              <option value="all">Resultados Gerais (Tudo)</option>
              {seasons.map(s => (
                <option key={s.id} value={s.id}>{s.name} {!s.endDate ? '(Ativa)' : ''}</option>
              )).reverse()}
            </select>
          </div>

          <Button
            type="button"
            size="sm"
            variant="success"
            onClick={() => setIsPosterModalOpen(true)}
            className="gap-1.5 shrink-0"
            title="Escolha as opções e baixe a imagem oficial de resultados"
          >
            <Sparkles size={14} />
            <span>Exportar Pôster</span>
          </Button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex w-full bg-[var(--studio-surface-elevated)] border-b border-[var(--studio-border)] shrink-0 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('historico')}
            className={`flex-1 min-w-[110px] text-xs sm:text-sm font-semibold py-3 px-3 transition-colors border-b-2 whitespace-nowrap ${
              activeTab === 'historico'
                ? 'text-[var(--studio-text)] border-[var(--studio-accent)] bg-[var(--studio-accent-soft)]'
                : 'text-[var(--studio-text-muted)] border-transparent hover:text-[var(--studio-text)] hover:bg-[var(--studio-card-hover)]/40'
            }`}
          >
            {t('resultsModal.tabs.history')}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ranking')}
            className={`flex-1 min-w-[130px] text-xs sm:text-sm font-semibold py-3 px-3 transition-colors border-b-2 flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeTab === 'ranking'
                ? 'text-amber-700 dark:text-amber-300 border-amber-500 bg-amber-500/[0.08]'
                : 'text-[var(--studio-text-muted)] border-transparent hover:text-[var(--studio-text)] hover:bg-[var(--studio-card-hover)]/40'
            }`}
          >
            <Trophy size={14} className={activeTab === 'ranking' ? "text-amber-600 dark:text-amber-400 shrink-0" : "text-[var(--studio-text-muted)] shrink-0"} />
            {t('resultsModal.tabs.ranking')}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('importar')}
            className={`flex-1 min-w-[110px] text-xs sm:text-sm font-semibold py-3 px-3 transition-colors border-b-2 whitespace-nowrap ${
              activeTab === 'importar'
                ? 'text-[var(--studio-text)] border-[var(--studio-accent)] bg-[var(--studio-accent-soft)]'
                : 'text-[var(--studio-text-muted)] border-transparent hover:text-[var(--studio-text)] hover:bg-[var(--studio-card-hover)]/40'
            }`}
          >
            {t('resultsModal.tabs.import')}
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-4">

          {!isSeasonActive && currentSeason && (
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/[0.08] border border-amber-500/25 rounded-lg shrink-0">
              <Clock size={13} className="text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="text-xs font-medium text-amber-800 dark:text-amber-300 font-mono tabular-nums">
                Temporada encerrada em {new Date(currentSeason.endDate!).toLocaleDateString(i18n.language)}
              </span>
            </div>
          )}

          {(activeTab === 'historico' || activeTab === 'ranking') && (
            <div className="flex flex-col pb-2 border-b border-[var(--studio-border)] shrink-0">
              <button
                type="button"
                onClick={() => setIsFilterCollapsed(!isFilterCollapsed)}
                className="flex items-center justify-between w-full py-1.5 text-[var(--studio-text-muted)] hover:text-[var(--studio-text)] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <ListOrdered size={16} />
                  <span className="text-xs sm:text-sm font-medium">{t('resultsModal.filter.title')}</span>
                </div>
                {isFilterCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
              </button>

              {!isFilterCollapsed && (
                <div className="flex flex-col gap-3 bg-[var(--studio-surface-elevated)] p-4 rounded-xl border border-[var(--studio-border)] mt-2">
                  <div className="flex flex-col sm:flex-row gap-5">
                    <div className="flex flex-col gap-3 sm:w-64 shrink-0">
                      <div className="flex bg-[var(--studio-input)] p-1 rounded-lg border border-[var(--studio-border)]">
                        <button
                          type="button"
                          onClick={() => setFilterMode('draw')}
                          className={`flex-1 text-xs font-semibold py-1.5 px-2 rounded-md transition-colors ${filterMode === 'draw' ? 'bg-[var(--studio-card)] text-[var(--studio-accent-fg)] border border-[var(--studio-border-strong)]' : 'text-[var(--studio-text-muted)] hover:text-[var(--studio-text)]'}`}
                        >
                          {t('resultsModal.filter.typeDraw')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setFilterMode('date')}
                          className={`flex-1 text-xs font-semibold py-1.5 px-2 rounded-md transition-colors ${filterMode === 'date' ? 'bg-[var(--studio-card)] text-[var(--studio-accent-fg)] border border-[var(--studio-border-strong)]' : 'text-[var(--studio-text-muted)] hover:text-[var(--studio-text)]'}`}
                        >
                          {t('resultsModal.filter.typeDate')}
                        </button>
                      </div>

                      {filterMode === 'draw' && (
                        <div className="flex flex-col gap-2.5">
                          <div className="flex items-center gap-2 w-full">
                            <label className="text-xs font-medium text-[var(--studio-text-muted)] flex-1">{t('resultsModal.filter.groupBy')}</label>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                min="1"
                                value={customInterval}
                                onChange={(e) => setCustomInterval(e.target.value)}
                                className="bg-[var(--studio-input)] border border-[var(--studio-border-strong)] rounded-lg px-2.5 py-1 w-16 text-xs text-[var(--studio-text)] font-mono tabular-nums focus:outline-none focus:border-[var(--studio-accent)]"
                              />
                              <button
                                type="button"
                                onClick={() => setIntervalOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                                className="p-1.5 bg-[var(--studio-input)] border border-[var(--studio-border-strong)] rounded-lg text-[var(--studio-text-muted)] hover:text-[var(--studio-text)] transition-colors"
                                aria-label="Inverter ordem"
                              >
                                {intervalOrder === 'asc' ? <ArrowDown size={14} /> : <ArrowUp size={14} />}
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 w-full">
                            <label className="text-xs font-medium text-[var(--studio-text-muted)] flex-1">{t('resultsModal.filter.start')}</label>
                            <input
                              type="number"
                              min="1"
                              placeholder="20"
                              value={customStartDraw}
                              onChange={(e) => setCustomStartDraw(e.target.value)}
                              className="bg-[var(--studio-input)] border border-[var(--studio-border-strong)] rounded-lg px-2.5 py-1 w-24 text-xs text-[var(--studio-text)] font-mono tabular-nums focus:outline-none focus:border-[var(--studio-accent)]"
                            />
                          </div>

                          <div className="flex items-center gap-2 w-full">
                            <label className="text-xs font-medium text-[var(--studio-text-muted)] flex-1">{t('resultsModal.filter.end')}</label>
                            <input
                              type="number"
                              min="1"
                              placeholder="30"
                              value={customEndDraw}
                              onChange={(e) => setCustomEndDraw(e.target.value)}
                              className="bg-[var(--studio-input)] border border-[var(--studio-border-strong)] rounded-lg px-2.5 py-1 w-24 text-xs text-[var(--studio-text)] font-mono tabular-nums focus:outline-none focus:border-[var(--studio-accent)]"
                            />
                          </div>
                        </div>
                      )}

                      {filterMode === 'date' && (
                        <div className="flex flex-col gap-2.5">
                          <div className="flex items-center gap-2 w-full">
                            <label className="text-xs font-medium text-[var(--studio-text-muted)] flex-1">{t('resultsModal.filter.startDate')}</label>
                            <input
                              type="date"
                              value={customStartDate}
                              onChange={(e) => setCustomStartDate(e.target.value)}
                              className="bg-[var(--studio-input)] border border-[var(--studio-border-strong)] rounded-lg px-2 py-1 w-32 text-xs text-[var(--studio-text)] font-mono focus:outline-none focus:border-[var(--studio-accent)]"
                            />
                          </div>

                          <div className="flex items-center gap-2 w-full">
                            <label className="text-xs font-medium text-[var(--studio-text-muted)] flex-1">{t('resultsModal.filter.endDate')}</label>
                            <input
                              type="date"
                              value={customEndDate}
                              onChange={(e) => setCustomEndDate(e.target.value)}
                              className="bg-[var(--studio-input)] border border-[var(--studio-border-strong)] rounded-lg px-2 py-1 w-32 text-xs text-[var(--studio-text)] font-mono focus:outline-none focus:border-[var(--studio-accent)]"
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
                              type="button"
                              key={idx}
                              onClick={() => {
                                setCustomStartDraw(opt.start.toString());
                                setCustomEndDraw(opt.end.toString());
                              }}
                              className="px-2.5 py-1 text-[11px] font-mono tabular-nums font-semibold bg-[var(--studio-input)] text-[var(--studio-text-secondary)] rounded-md hover:bg-[var(--studio-card)] hover:text-[var(--studio-text)] transition-colors border border-[var(--studio-border)]"
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      )}

                      {filteredBySeason.length > 0 && (
                        <div className="flex flex-col">
                          {filterMode === 'date' && (
                            <div className="text-[11px] font-medium text-[var(--studio-text-muted)] mb-2">
                              {t('resultsModal.filter.selected')}{' '}
                              <strong className="text-[var(--studio-text)] font-mono tabular-nums ml-1">
                                {filteredBySeason.filter(r => isBoxSelectedByDate(r)).length}
                              </strong>
                            </div>
                          )}
                          <div className="flex flex-wrap gap-1 p-0.5">
                            {Array.from({ length: filteredBySeason.length }).map((_, i) => {
                              const index = i + 1;
                              const res = filteredBySeason[filteredBySeason.length - index];
                              const selected = filterMode === 'draw' ? isBoxSelected(index) : isBoxSelectedByDate(res);
                              return (
                                <button
                                  type="button"
                                  key={index}
                                  onClick={() => {
                                    if (filterMode === 'date') setFilterMode('draw');
                                    handleBoxClick(index);
                                  }}
                                  className={`w-4 h-4 rounded-[3px] transition-all duration-150 ${
                                    selected
                                      ? 'ring-1 ring-[var(--studio-text)]/80 ring-offset-1 ring-offset-[var(--studio-surface-elevated)] opacity-100 z-10'
                                      : 'opacity-35 hover:opacity-90'
                                  }`}
                                  style={{
                                    backgroundColor: res.color || '#3b82f6'
                                  }}
                                  title={`${t("resultsModal.draw")} ${index}: ${res.text}`}
                                />
                              );
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
              <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
                <span className="text-xs sm:text-sm font-medium text-[var(--studio-text-muted)] font-mono tabular-nums">
                  {t('resultsModal.history.showing')} <strong className="text-[var(--studio-text)]">{filteredResults.length}</strong> {t('resultsModal.history.results')}
                </span>
                <div className="flex items-center gap-3">
                  {filteredBySeason.length > 0 && (
                    <button
                      type="button"
                      onClick={exportResults}
                      className="text-xs sm:text-sm text-[var(--studio-accent-fg)] hover:opacity-80 transition-opacity font-semibold flex items-center gap-1.5"
                    >
                      <Download size={15} /> {t('resultsModal.history.export')}
                    </button>
                  )}
                  {filteredBySeason.length > 0 && (
                    isConfirmingClearAll ? (
                      <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/30 rounded-lg px-2 py-1">
                        <span className="text-xs text-red-700 dark:text-red-300 font-medium">Limpar tudo?</span>
                        <button
                          type="button"
                          onClick={confirmClearAll}
                          className="p-1 text-red-600 dark:text-red-400 hover:text-white hover:bg-red-600 rounded transition-colors"
                          title="Sim"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsConfirmingClearAll(false)}
                          className="p-1 text-[var(--studio-text-muted)] hover:text-[var(--studio-text)] hover:bg-[var(--studio-card-hover)] rounded transition-colors"
                          title="Não"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={handleClearResults}
                        className="text-xs sm:text-sm text-red-600 dark:text-red-400 hover:opacity-80 transition-opacity font-semibold flex items-center gap-1.5"
                      >
                        <Trash2 size={15} /> {t('resultsModal.history.clearAll')}
                      </button>
                    )
                  )}
                </div>
              </div>

              <div className="space-y-2 pb-2 flex flex-col">
                {filteredResults.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-[var(--studio-text-muted)] gap-3 py-10">
                    <div className="p-3.5 bg-[var(--studio-card)] rounded-xl border border-[var(--studio-border)]">
                      <ListOrdered size={32} />
                    </div>
                    <p className="text-sm font-medium">{t('resultsModal.history.empty')}</p>
                  </div>
                ) : (
                  filteredResults.map((result) => {
                    const originalIndex = filteredBySeason.length - filteredBySeason.findIndex(r => r.drawId === result.drawId);
                    const dateLabel = result.timestamp ? new Date(result.timestamp).toLocaleDateString(i18n.language) : t('resultsModal.history.unknownDate');
                    return (
                      <ResultItem
                        key={result.drawId}
                        result={result}
                        index={originalIndex}
                        dateLabel={dateLabel}
                        onRemove={(resultToRemove) => {
                          setResults(prev => prev.filter(r => r.drawId !== resultToRemove.drawId));
                        }}
                      />
                    );
                  })
                )}
              </div>
            </div>
          )}

          {activeTab === 'ranking' && (
            <div className="flex flex-col gap-3">
              {/* Summary Header Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 shrink-0">
                {isSeasonFinished ? (
                  <>
                    <div className="bg-amber-500/[0.08] border border-amber-500/35 rounded-xl px-3 py-2.5 flex items-center gap-2.5">
                      <div className="p-1.5 bg-amber-500/15 rounded-lg border border-amber-500/30 text-amber-600 dark:text-amber-400 shrink-0">
                        <Crown size={15} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] text-amber-800 dark:text-amber-300/90 font-medium truncate">Campeão</p>
                        <p className="text-sm font-semibold text-[var(--studio-text)] truncate font-mono tabular-nums">
                          {allParticipantStats[0] ? `${allParticipantStats[0].name} (${allParticipantStats[0].winsCount})` : '-'}
                        </p>
                      </div>
                    </div>

                    <div className="bg-[var(--studio-card)] border border-[var(--studio-border)] rounded-xl px-3 py-2.5 items-center gap-2.5 hidden sm:flex">
                      <div className="p-1.5 bg-[var(--studio-accent-soft)] rounded-lg border border-[var(--studio-accent)]/25 text-[var(--studio-accent-fg)] shrink-0">
                        <ListOrdered size={15} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] text-[var(--studio-text-muted)] font-medium truncate">Total Sorteios</p>
                        <p className="text-sm font-semibold text-[var(--studio-text)] truncate font-mono tabular-nums">{filteredResults.length}</p>
                      </div>
                    </div>

                    <div className="bg-[var(--studio-card)] border border-[var(--studio-border)] rounded-xl px-3 py-2.5 flex items-center gap-2.5">
                      <div className="p-1.5 bg-emerald-500/12 rounded-lg border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 shrink-0">
                        <Trophy size={15} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] text-[var(--studio-text-muted)] font-medium truncate">Contemplados</p>
                        <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 truncate font-mono tabular-nums">{allParticipantStats.length}</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="bg-amber-500/[0.08] border border-amber-500/30 rounded-xl px-3 py-2.5 flex items-center gap-2.5">
                      <div className="p-1.5 bg-amber-500/15 rounded-lg border border-amber-500/30 text-amber-600 dark:text-amber-400 shrink-0">
                        <Flame size={15} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] text-amber-800 dark:text-amber-300/90 font-medium truncate">{t('resultsModal.drySpell.longestSpell')}</p>
                        <p className="text-sm font-semibold text-[var(--studio-text)] truncate font-mono tabular-nums">
                          {longestDrySpellParticipant
                            ? `${longestDrySpellParticipant.name} (${longestDrySpellParticipant.daysWithoutWin}d)`
                            : '-'}
                        </p>
                      </div>
                    </div>

                    <div className="bg-[var(--studio-card)] border border-[var(--studio-border)] rounded-xl px-3 py-2.5 items-center gap-2.5 hidden sm:flex">
                      <div className="p-1.5 bg-[var(--studio-accent-soft)] rounded-lg border border-[var(--studio-accent)]/25 text-[var(--studio-accent-fg)] shrink-0">
                        <Clock size={15} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] text-[var(--studio-text-muted)] font-medium truncate">{t('resultsModal.drySpell.averageSpell')}</p>
                        <p className="text-sm font-semibold text-[var(--studio-text)] truncate font-mono tabular-nums">
                          {averageDrySpell} {t('resultsModal.drySpell.daysWithoutWin', { count: averageDrySpell }).split(' ')[1] || 'dias'}
                        </p>
                      </div>
                    </div>

                    <div className="bg-[var(--studio-card)] border border-[var(--studio-border)] rounded-xl px-3 py-2.5 flex items-center gap-2.5">
                      <div className="p-1.5 bg-[var(--studio-input)] rounded-lg border border-[var(--studio-border)] text-[var(--studio-text-muted)] shrink-0">
                        <Users size={15} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] text-[var(--studio-text-muted)] font-medium truncate">{t('resultsModal.drySpell.neverWonCount')}</p>
                        <p className="text-sm font-semibold text-[var(--studio-text)] truncate font-mono tabular-nums">{neverWonCount}</p>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Search & Sort Controls */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0 bg-[var(--studio-surface-elevated)] p-2.5 rounded-xl border border-[var(--studio-border)]">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--studio-text-muted)]" />
                  <Input
                    type="text"
                    value={drySpellSearch}
                    onChange={(e) => setDrySpellSearch(e.target.value)}
                    placeholder={t('resultsModal.drySpell.searchPlaceholder')}
                    className="pl-8 py-1.5 text-xs min-h-[36px]"
                  />
                </div>

                <div className="flex items-center flex-wrap gap-3 shrink-0">
                  {!isSeasonFinished && (
                    <>
                      <div className="flex items-center gap-2">
                        <Toggle
                          enabled={drySpellOnlyOnWheel}
                          onChange={setDrySpellOnlyOnWheel}
                          aria-label={t('resultsModal.drySpell.onlyOnWheel')}
                        />
                        <span
                          onClick={() => setDrySpellOnlyOnWheel(!drySpellOnlyOnWheel)}
                          className="text-xs text-[var(--studio-text-secondary)] font-medium cursor-pointer select-none"
                        >
                          {t('resultsModal.drySpell.onlyOnWheel')}
                        </span>
                      </div>

                      <div className="w-px h-4 bg-[var(--studio-border)] hidden sm:block" />
                    </>
                  )}

                  <div className="flex items-center gap-1.5 shrink-0">
                    <label className="text-xs text-[var(--studio-text-muted)] font-medium whitespace-nowrap hidden sm:block">{t('resultsModal.drySpell.sortBy')}</label>
                    <div className="flex items-center gap-1">
                      <select
                        value={drySpellSort}
                        onChange={(e: any) => setDrySpellSort(e.target.value)}
                        className="bg-[var(--studio-input)] border border-[var(--studio-border-strong)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--studio-text)] focus:outline-none focus:border-amber-500"
                      >
                        <option value="wins">{t('resultsModal.drySpell.sortWins')}</option>
                        {!isSeasonFinished && (
                          <>
                            <option value="current_spell">{t('resultsModal.drySpell.sortCurrentSpell')}</option>
                            <option value="record_spell">{t('resultsModal.drySpell.sortRecordSpell')}</option>
                          </>
                        )}
                        <option value="name">{t('resultsModal.drySpell.sortName')}</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => setDrySpellOrder(drySpellOrder === 'asc' ? 'desc' : 'asc')}
                        className={`p-1.5 rounded-lg border transition-colors bg-[var(--studio-input)] border-[var(--studio-border-strong)] hover:bg-[var(--studio-card)] ${
                          drySpellOrder === 'desc' ? 'text-amber-600 dark:text-amber-400' : 'text-[var(--studio-accent-fg)]'
                        }`}
                        title={drySpellOrder === 'asc' ? t('resultsModal.drySpell.ascending') : t('resultsModal.drySpell.descending')}
                        aria-label={drySpellOrder === 'asc' ? t('resultsModal.drySpell.ascending') : t('resultsModal.drySpell.descending')}
                      >
                        {drySpellOrder === 'asc' ? <SortAsc size={15} /> : <SortDesc size={15} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* List of participants */}
              <div className="space-y-2 pb-1 flex flex-col">
                {filteredDrySpellList.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-[var(--studio-text-muted)] gap-3 py-10">
                    <Clock size={32} />
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
            <div className="flex flex-col gap-5 text-[var(--studio-text-secondary)] pb-2">
              <div className="flex flex-col min-h-[240px]">
                <label className="text-sm font-medium text-[var(--studio-text)] mb-2 block">
                  {t('resultsModal.import.title')}
                </label>
                <div className="flex-1 bg-[var(--studio-input)] p-1 rounded-xl border border-[var(--studio-border-strong)] focus-within:border-[var(--studio-accent)] transition-colors">
                  <textarea
                    className="w-full h-full min-h-[220px] bg-transparent p-3 text-sm text-[var(--studio-text)] resize-none focus:outline-none placeholder-[var(--studio-text-muted)] custom-scrollbar font-mono"
                    placeholder={t('resultsModal.import.placeholder')}
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                  />
                </div>
              </div>

              <div className="shrink-0 space-y-4">
                <div className="bg-[var(--studio-accent-soft)] border border-[var(--studio-accent)]/30 p-3.5 rounded-xl flex items-start gap-3">
                  <AlertCircle size={18} className="text-[var(--studio-accent-fg)] shrink-0 mt-0.5" />
                  <p className="text-xs sm:text-sm text-[var(--studio-text-secondary)] leading-relaxed">
                    {t('resultsModal.import.info1')}<strong className="text-[var(--studio-text)]">{t('sidebar.tabs.results')}</strong>{t('resultsModal.import.info2')}<strong className="text-[var(--studio-text)]">{t('resultsModal.tabs.ranking')}</strong>. <br />{t('resultsModal.import.info3')}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {filteredBySeason.length > 0 ? (
                    isConfirmingClearAll ? (
                      <div className="flex gap-2 w-full">
                        <Button variant="danger" onClick={confirmClearAll} className="flex-1 gap-1.5 text-xs">
                          <Check size={15} /> Sim
                        </Button>
                        <Button variant="secondary" onClick={() => setIsConfirmingClearAll(false)} className="flex-1 gap-1.5 text-xs">
                          <X size={15} /> Não
                        </Button>
                      </div>
                    ) : (
                      <Button variant="danger" onClick={handleClearResults} className="w-full gap-2">
                        <Trash2 size={16} /> {t('resultsModal.history.clearAll')}
                      </Button>
                    )
                  ) : <div />}
                  <Button onClick={handleImport} disabled={!importText.trim()} className="w-full gap-2">
                    <Download size={16} /> {t('resultsModal.import.btn')}
                  </Button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      <SeasonPosterModal
        isOpen={isPosterModalOpen}
        onClose={() => setIsPosterModalOpen(false)}
        season={currentSeason}
        allSeasons={seasons}
        results={filteredBySeason}
        items={items}
        appTitle={appTitle}
      />
    </div>
  );
};
