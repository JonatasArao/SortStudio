import { useMemo, useState, useEffect } from 'react';
import { Shuffle, SortAsc, SortDesc, Plus, CheckSquare, ChevronDown, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Virtuoso } from 'react-virtuoso';
import { useAppStore } from '../../../store/useAppStore';
import { useWheelData } from '../../../hooks/useWheelData';
import { useWheelActions } from '../../../hooks/useWheelActions';
import { Button } from '../../atoms/Button';
import { EntryItem } from '../../molecules/EntryItem';
import { getParticipantStats, ParticipantStat, compareParticipantsByWins } from '../../../utils/statsUtils';

export const EntriesTab = () => {
  const { t } = useTranslation();
  const items = useAppStore(s => s.items);
  const setItems = useAppStore(s => s.setItems);
  const results = useAppStore(s => s.results);
  const seasons = useAppStore(s => s.seasons);
  const balanceScope = useAppStore(s => s.balanceScope);
  const isSpinning = useAppStore(s => s.isSpinning);
  const colors = useAppStore(s => s.colors);
  const isAdvancedEntries = useAppStore(s => s.isAdvancedEntries);
  const setIsAdvancedEntries = useAppStore(s => s.setIsAdvancedEntries);
  const setEditingEntryId = useAppStore(s => s.setEditingEntryId);

  const activeSeason = useMemo(() => seasons.find(s => !s.endDate), [seasons]);

  const [sortCriteria, setSortCriteria] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>(
    balanceScope === 'current_season' && activeSeason ? activeSeason.id : 'all'
  );
  const [isSortExpanded, setIsSortExpanded] = useState(false);

  useEffect(() => {
    if (balanceScope === 'current_season') {
      setSelectedSeasonId(activeSeason ? activeSeason.id : 'all');
    } else {
      setSelectedSeasonId('all');
    }
  }, [balanceScope, activeSeason]);

  const { validItems } = useWheelData();
  const {
    handleShuffle,
    handleToggleSelectAll,
    handleUpdateItem,
    handleRemoveItem,
    handleAddEmptyItem,
    handleMoveItem,
  } = useWheelActions();

  const totalWeight = validItems.reduce((acc, item) => acc + (item.weight !== undefined ? item.weight : 1), 0) || 1;
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
    let isSeasonFinished = false;
    if (selectedSeasonId !== 'all') {
      const s = seasons.find(s => s.id === selectedSeasonId);
      if (s && s.endDate) {
        refTimestamp = s.endDate;
        isSeasonFinished = true;
      }
    }
    const stats = getParticipantStats(items, filteredResults, refTimestamp, isSeasonFinished);
    const map = new Map<string, ParticipantStat>();
    stats.forEach(st => map.set(st.name.toLowerCase(), st));
    return map;
  }, [items, filteredResults, selectedSeasonId, seasons]);

  const applySort = () => {
    if (isSpinning || items.length < 2) return;
    setItems(prev =>
      [...prev].sort((a, b) => {
        const nameA = a.text.trim().toLowerCase();
        const nameB = b.text.trim().toLowerCase();
        const statA = participantStatsMap.get(nameA);
        const statB = participantStatsMap.get(nameB);

        if (sortCriteria === 'wins') {
          if (statA && statB) {
            const cmp = compareParticipantsByWins(statA, statB);
            return sortOrder === 'asc' ? -cmp : cmp;
          }
          const winsA = statA ? statA.winsCount : 0;
          const winsB = statB ? statB.winsCount : 0;
          if (winsA !== winsB) {
            return sortOrder === 'asc' ? winsA - winsB : winsB - winsA;
          }
          return nameA.localeCompare(nameB);
        }

        let valA: any = nameA;
        let valB: any = nameB;

        if (sortCriteria === 'current_spell') {
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
      {/* Primary list actions */}
      <div className="grid grid-cols-2 gap-2 mb-2.5 shrink-0">
        <Button
          variant="secondary"
          size="sm"
          onClick={handleShuffle}
          disabled={isSpinning || items.length < 2}
          className="w-full"
        >
          <Shuffle size={14} />
          <span>{t('sidebar.entries.shuffle')}</span>
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={applySort}
          disabled={isSpinning || items.length < 2}
          className="w-full"
        >
          <SortAsc size={14} />
          <span>{t('sidebar.entries.sort')}</span>
        </Button>
      </div>

      {/* Collapsible Sort Criteria */}
      <div className="flex flex-col mb-3 shrink-0 bg-[var(--studio-card)] px-3 py-2 rounded-xl border border-[var(--studio-border)]">
        <button
          type="button"
          onClick={() => setIsSortExpanded(!isSortExpanded)}
          aria-expanded={isSortExpanded}
          className="flex items-center justify-between w-full text-xs font-medium text-[var(--studio-text-muted)] hover:text-[var(--studio-text)] transition-colors py-0.5"
        >
          <span>{t('sidebar.entries.sortOptions', 'Opções de ordenação')}</span>
          <ChevronDown
            size={14}
            className={`transition-transform duration-150 ${isSortExpanded ? 'rotate-180 text-[var(--studio-accent-fg)]' : ''}`}
          />
        </button>

        {isSortExpanded && (
          <div className="flex flex-col gap-2 pt-2.5 mt-2 border-t border-[var(--studio-border)]">
            <select
              value={selectedSeasonId}
              onChange={e => setSelectedSeasonId(e.target.value)}
              disabled={isSpinning || items.length < 2}
              className="w-full h-9 bg-[var(--studio-input)] border border-[var(--studio-border-strong)] rounded-lg px-2.5 text-xs text-[var(--studio-text)] focus:outline-none focus:border-[var(--studio-accent)] disabled:opacity-50"
            >
              <option value="all">{t('resultsModal.balanceScopeAll', 'Resultados Gerais (Tudo)')}</option>
              {[...seasons].reverse().map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} {!s.endDate ? '(Ativa)' : ''}
                </option>
              ))}
            </select>

            <div className="flex gap-2">
              <select
                value={sortCriteria}
                onChange={e => setSortCriteria(e.target.value)}
                disabled={isSpinning || items.length < 2}
                className="flex-1 h-9 min-w-0 bg-[var(--studio-input)] border border-[var(--studio-border-strong)] rounded-lg px-2.5 text-xs text-[var(--studio-text)] focus:outline-none focus:border-[var(--studio-accent)] disabled:opacity-50"
              >
                <option value="name">{t('resultsModal.drySpell.sortName')}</option>
                <option value="wins">{t('resultsModal.drySpell.sortWins')}</option>
                <option value="current_spell">{t('resultsModal.drySpell.sortCurrentSpell')}</option>
                <option value="record_spell">{t('resultsModal.drySpell.sortRecordSpell')}</option>
              </select>
              <button
                type="button"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                disabled={isSpinning || items.length < 2}
                className={`w-9 h-9 shrink-0 rounded-lg border transition-colors disabled:opacity-50 flex items-center justify-center bg-[var(--studio-input)] border-[var(--studio-border-strong)] hover:border-[var(--studio-accent)] ${
                  sortOrder === 'desc'
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-[var(--studio-accent-fg)]'
                }`}
                title={sortOrder === 'asc' ? t('resultsModal.drySpell.ascending') : t('resultsModal.drySpell.descending')}
                aria-label={sortOrder === 'asc' ? t('resultsModal.drySpell.ascending') : t('resultsModal.drySpell.descending')}
              >
                {sortOrder === 'asc' ? <SortAsc size={15} /> : <SortDesc size={15} />}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Selection & Mode Controls */}
      <div className="flex justify-between items-center mb-2.5 shrink-0 gap-2">
        <button
          type="button"
          onClick={handleToggleSelectAll}
          disabled={isSpinning || items.length === 0}
          className={`flex items-center gap-1.5 text-xs font-medium h-8 px-2.5 rounded-lg border transition-colors whitespace-nowrap disabled:opacity-45 ${
            allSelected
              ? 'bg-[var(--studio-accent-soft)] border-[var(--studio-border-strong)] text-[var(--studio-accent-fg)]'
              : 'bg-[var(--studio-card)] hover:bg-[var(--studio-card-hover)] border-[var(--studio-border)] text-[var(--studio-text-secondary)]'
          }`}
        >
          <CheckSquare size={13} className={allSelected ? 'text-[var(--studio-accent-fg)]' : 'text-[var(--studio-text-muted)]'} />
          <span>{allSelected ? t('sidebar.entries.deselectAll', 'Desmarcar todas') : t('sidebar.entries.selectAll', 'Selecionar todas')}</span>
        </button>

        <label
          className={`flex items-center gap-2 text-[var(--studio-text-secondary)] font-medium text-xs whitespace-nowrap ${
            isSpinning ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:text-[var(--studio-text)]'
          }`}
        >
          <input
            type="checkbox"
            disabled={isSpinning}
            checked={isAdvancedEntries}
            onChange={e => setIsAdvancedEntries(e.target.checked)}
            className="w-3.5 h-3.5 rounded accent-[var(--studio-accent)] cursor-pointer"
          />
          <span>{t('sidebar.entries.advanced')}</span>
        </label>
      </div>

      {/* Virtualized Entries List or Clean Empty State */}
      <div className="flex-1 min-h-0">
        {items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4 py-8 border border-dashed border-[var(--studio-border-strong)] rounded-2xl bg-[var(--studio-input)]">
            <div className="w-11 h-11 rounded-xl bg-[var(--studio-card)] border border-[var(--studio-border)] flex items-center justify-center mb-3 text-[var(--studio-text-muted)]">
              <Users size={20} />
            </div>
            <p className="text-sm font-semibold text-[var(--studio-text)]">Nenhum participante na lista</p>
            <p className="text-xs text-[var(--studio-text-muted)] mt-1 max-w-[220px]">
              Adicione pelo menos dois participantes abaixo para iniciar o sorteio.
            </p>
          </div>
        ) : (
          <Virtuoso
            className="custom-scrollbar pr-1.5"
            style={{ height: '100%' }}
            data={items}
            itemContent={(index, item) => {
              const validItem = validItems.find(vi => vi.id === item.id);
              const effectiveWeight = validItem ? validItem.weight : item.weight !== undefined ? item.weight : 1;

              return (
                <div className="pb-2">
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
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-[var(--studio-border)] shrink-0">
        <Button
          variant="primary"
          onClick={handleAddEmptyItem}
          disabled={isSpinning}
          className="w-full"
        >
          <Plus size={16} />
          <span>{t('sidebar.entries.add')}</span>
        </Button>
      </div>
    </>
  );
};
