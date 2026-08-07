import React, { useMemo } from 'react';
import { Shuffle, SortAsc, Plus } from 'lucide-react';
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
  const results = useAppStore(s => s.results);
  const isSpinning = useAppStore(s => s.isSpinning);
  const colors = useAppStore(s => s.colors);
  const isAdvancedEntries = useAppStore(s => s.isAdvancedEntries);
  const setIsAdvancedEntries = useAppStore(s => s.setIsAdvancedEntries);
  const setEditingEntryId = useAppStore(s => s.setEditingEntryId);

  const { validItems } = useWheelData();
  const { 
    handleShuffle, handleSort,
    handleUpdateItem, handleRemoveItem, handleAddEmptyItem, handleMoveItem
  } = useWheelActions();

  const totalWeight = validItems.reduce((acc, item) => acc + (item.weight || 1), 0) || 1;

  const participantStatsMap = useMemo(() => {
    const stats = getParticipantStats(items, results);
    const map = new Map<string, ParticipantStat>();
    stats.forEach(st => map.set(st.name.toLowerCase(), st));
    return map;
  }, [items, results]);

  return (
    <>
      <div className="flex gap-3 mb-4 shrink-0">
        <Button onClick={handleShuffle} disabled={isSpinning || items.length < 2} className="flex-1 w-full gap-2 text-sm">
          <Shuffle size={16} /> {t('sidebar.entries.shuffle')}
        </Button>
        <Button onClick={handleSort} disabled={isSpinning || items.length < 2} className="flex-1 w-full gap-2 text-sm">
          <SortAsc size={16} /> {t('sidebar.entries.sort')}
        </Button>
      </div>

      <div className="flex justify-between items-center mb-4 shrink-0 px-1">
        <div className="text-xs font-medium text-slate-400 bg-slate-800/50 px-2.5 py-1 rounded-full border border-slate-700/50">
          {items.filter(i => i.enabled !== false).length} {items.filter(i => i.enabled !== false).length === 1 ? t('sidebar.entries.participant') : t('sidebar.entries.participants')}
        </div>
        <label className={`flex items-center gap-2 text-white font-medium text-sm ${isSpinning ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
          <input 
            type="checkbox" 
            disabled={isSpinning}
            checked={isAdvancedEntries}
            onChange={(e) => setIsAdvancedEntries(e.target.checked)}
            className="w-4 h-4 rounded text-blue-500 bg-slate-800 border-slate-700 disabled:cursor-not-allowed" 
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

