import React, { useMemo, useState } from 'react';
import { Shuffle, SortAsc, SortDesc, Plus, CheckSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Virtuoso } from 'react-virtuoso';
import { useAppStore } from '../../../store/useAppStore';
import { useWheelData } from '../../../hooks/useWheelData';
import { useWheelActions } from '../../../hooks/useWheelActions';
import { Button } from '../../atoms/Button';
import { EntryItem } from '../../molecules/EntryItem';
import { getParticipantStats, ParticipantStat } from '../../../utils/statsUtils';

export const EntriesTab = () => {
  const { t } = useTranslation();
  const items = useAppStore(s => s.items);
  const setItems = useAppStore(s => s.setItems);
  const results = useAppStore(s => s.results);
  const seasons = useAppStore(s => s.seasons);
  const isSpinning = useAppStore(s => s.isSpinning);
  const colors = useAppStore(s => s.colors);
  const isAdvancedEntries = useAppStore(s => s.isAdvancedEntries);
  const setIsAdvancedEntries = useAppStore(s => s.setIsAdvancedEntries);
  const setEditingEntryId = useAppStore(s => s.setEditingEntryId);

  const [sortCriteria, setSortCriteria] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>('all');
  const [isSortExpanded, setIsSortExpanded] = useState(false);

  const { validItems } = useWheelData();
  const { 
    handleShuffle,
    handleToggleSelectAll,
    handleUpdateItem, handleRemoveItem, handleAddEmptyItem, handleMoveItem
  } = useWheelActions();

  const totalWeight = validItems.reduce((acc, item) => acc + (item.weight || 1), 0) || 1;
  const allSelected = items.length > 0 && items.every(i => i.enabled !== false);

  const filteredResults = useMemo(() => {
    if (selectedSeasonId === 'all') return results;
    const season = seasons.find(s => s.id === selectedSeasonId);
    if (!season) return results;
    const end = season.endDate || Infinity;
    return results.filter(r => (r.timestamp || 0) >= season.startDate && (r.timestamp || 0) <= end);
  }, [results, seasons, selectedSeasonId]);

  const participantStatsMap = useMemo(() => {
    let refTimestamp: number | undefined = undefined;
    if (selectedSeasonId !== 'all') {
      const s = seasons.find(s => s.id === selectedSeasonId);
      if (s && s.endDate) {
        refTimestamp = s.endDate;
      }
    }
    const stats = getParticipantStats(items, filteredResults, refTimestamp);
    const map = new Map<string, ParticipantStat>();
    stats.forEach(st => map.set(st.name.toLowerCase(), st));
    return map;
  }, [items, filteredResults, selectedSeasonId, seasons]);

  const applySort = () => {
    if (isSpinning || items.length < 2) return;
    setItems((prev) =>
      [...prev].sort((a, b) => {
        const nameA = a.text.trim().toLowerCase();
        const nameB = b.text.trim().toLowerCase();
        const statA = participantStatsMap.get(nameA);
        const statB = participantStatsMap.get(nameB);
        
        let valA: any = nameA;
        let valB: any = nameB;
        
        if (sortCriteria === 'wins') {
           valA = statA ? statA.winsCount : 0;
           valB = statB ? statB.winsCount : 0;
        } else if (sortCriteria === 'current_spell') {
           valA = statA ? statA.daysWithoutWin : 0;
           valB = statB ? statB.daysWithoutWin : 0;
        } else if (sortCriteria === 'record_spell') {
           valA = statA ? statA.maxDaysWithoutWin : 0;
           valB = statB ? statB.maxDaysWithoutWin : 0;
        }
        
        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return nameA.localeCompare(nameB);
      })
    );
  };

  return (
    <>
      <div className="flex gap-2 mb-2 shrink-0">
        <Button onClick={handleShuffle} disabled={isSpinning || items.length < 2} className="flex-1 w-full gap-2 text-xs h-9 bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300">
          <Shuffle size={14} /> <span>{t('sidebar.entries.shuffle')}</span>
        </Button>
        <Button onClick={applySort} disabled={isSpinning || items.length < 2} className="flex-1 w-full gap-2 text-xs h-9 bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300">
          <SortAsc size={14} /> <span>{t('sidebar.entries.sort')}</span>
        </Button>
      </div>
      
      <div className="flex flex-col gap-2 mb-4 shrink-0 bg-slate-900/50 p-2.5 rounded-xl border border-slate-800">
        <button 
          onClick={() => setIsSortExpanded(!isSortExpanded)}
          className="flex items-center justify-between w-full text-[10px] font-semibold text-slate-500 hover:text-slate-300 uppercase tracking-wider px-1 transition-colors"
        >
          <span>{t('sidebar.entries.sortOptions', 'Opções de Ordenação')}</span>
          <svg className={`w-3 h-3 transition-transform duration-200 ${isSortExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {isSortExpanded && (
          <div className="flex flex-col gap-2.5 mt-2 animate-in slide-in-from-top-1 fade-in duration-200 pb-1">
            <select
              value={selectedSeasonId}
              onChange={(e) => setSelectedSeasonId(e.target.value)}
              disabled={isSpinning || items.length < 2}
              className="w-full h-9 bg-slate-800 border border-slate-700 rounded-lg px-3 text-xs text-slate-300 focus:outline-none focus:border-blue-500/80 [color-scheme:dark] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <option value="all">{t('resultsModal.balanceScopeAll', 'Resultados Gerais (Tudo)')}</option>
              {[...seasons].reverse().map(s => (
                <option key={s.id} value={s.id}>{s.name} {!s.endDate ? '(Ativa)' : ''}</option>
              ))}
            </select>
            
            <div className="flex gap-2">
              <select
                value={sortCriteria}
                onChange={(e) => setSortCriteria(e.target.value)}
                disabled={isSpinning || items.length < 2}
                className="flex-1 h-9 min-w-0 bg-slate-800 border border-slate-700 rounded-lg px-3 text-xs text-slate-300 focus:outline-none focus:border-blue-500/80 [color-scheme:dark] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <option value="name">{t('resultsModal.drySpell.sortName')}</option>
                <option value="wins">{t('resultsModal.drySpell.sortWins')}</option>
                <option value="current_spell">{t('resultsModal.drySpell.sortCurrentSpell')}</option>
                <option value="record_spell">{t('resultsModal.drySpell.sortRecordSpell')}</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                disabled={isSpinning || items.length < 2}
                className={`w-9 h-9 shrink-0 rounded-lg border transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center ${
                  sortOrder === 'desc' 
                    ? 'bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700' 
                    : 'bg-slate-800 border-slate-700 text-blue-400 hover:bg-slate-700'
                }`}
                title={sortOrder === 'asc' ? t('resultsModal.drySpell.ascending') : t('resultsModal.drySpell.descending')}
              >
                {sortOrder === 'asc' ? <SortAsc size={16} /> : <SortDesc size={16} />}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center mb-3 shrink-0 px-1 gap-2 flex-wrap sm:flex-nowrap">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggleSelectAll}
            disabled={isSpinning || items.length === 0}
            className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border transition-all whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed ${
              allSelected 
                ? 'bg-blue-600/20 border-blue-500/40 text-blue-300 hover:bg-blue-600/30' 
                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
            }`}
            title={allSelected ? t('sidebar.entries.deselectAll', 'Desmarcar todas') : t('sidebar.entries.selectAll', 'Selecionar todas')}
          >
            <CheckSquare size={13} className={allSelected ? 'text-blue-400' : 'text-slate-400'} />
            <span>{allSelected ? t('sidebar.entries.deselectAll', 'Desmarcar todas') : t('sidebar.entries.selectAll', 'Selecionar todas')}</span>
          </button>
          <div className="text-xs font-medium text-slate-400 bg-slate-800/50 px-2 py-1 rounded-lg border border-slate-700/50 whitespace-nowrap">
            {items.filter(i => i.enabled !== false).length}/{items.length}
          </div>
        </div>
        <label className={`flex items-center gap-2 text-slate-300 font-medium text-xs ${isSpinning ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:text-white'}`}>
          <input 
            type="checkbox" 
            disabled={isSpinning}
            checked={isAdvancedEntries}
            onChange={(e) => setIsAdvancedEntries(e.target.checked)}
            className="w-3.5 h-3.5 rounded text-blue-500 bg-slate-800 border-slate-700 disabled:cursor-not-allowed cursor-pointer" 
          />
          {t('sidebar.entries.advanced')}
        </label>
      </div>

      <div className="flex-1 min-h-0">
        <Virtuoso
          className="custom-scrollbar pr-2"
          style={{ height: '100%' }}
          data={items}
          itemContent={(index, item) => {
            const validItem = validItems.find(vi => vi.id === item.id);
            const effectiveWeight = validItem ? validItem.weight : item.weight || 1;
            
            return (
              <div className="pb-3">
                <EntryItem
                  item={item}
                  index={index}
                  totalItems={items.length}
                  totalWeight={totalWeight}
                  effectiveWeight={effectiveWeight}
                  isAdvancedEntries={isAdvancedEntries}
                  isSpinning={isSpinning}
                  color={colors[index % (colors.length || 1)] || '#cccccc'}
                  stat={participantStatsMap.get(item.text.trim().toLowerCase())}
                  onUpdate={handleUpdateItem}
                  onRemove={handleRemoveItem}
                  onMove={handleMoveItem}
                  onEditSettings={setEditingEntryId}
                />
              </div>
            );
          }}
        />
      </div>

      <div className="mt-4 pt-4 border-t border-slate-800 shrink-0">
        <Button variant="secondary" onClick={handleAddEmptyItem} disabled={isSpinning} className="w-full gap-2">
          <Plus size={20} /> {t('sidebar.entries.add')}
        </Button>
      </div>
    </>
  );
};

