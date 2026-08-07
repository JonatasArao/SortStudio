import React from 'react';
import { ArrowUp, ArrowDown, Settings2, X, Palette, Eye, EyeOff, Clock } from 'lucide-react';
import { Item } from '../../types';
import { useTranslation } from 'react-i18next';
import { ParticipantStat } from '../../utils/statsUtils';

function getContrastYIQ(hexcolor: string) {
  if (!hexcolor || typeof hexcolor !== 'string' || !hexcolor.startsWith('#')) return '#ffffff';
  let hex = hexcolor.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  if (hex.length !== 6) return '#ffffff';
  
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return yiq >= 128 ? '#111111' : '#ffffff';
}

interface EntryItemProps {
  item: Item;
  index: number;
  totalItems: number;
  totalWeight: number;
  effectiveWeight?: number;
  isAdvancedEntries: boolean;
  isSpinning: boolean;
  color: string;
  stat?: ParticipantStat;
  onUpdate: (id: string, updates: Partial<Item>) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, direction: 'up' | 'down') => void;
  onEditSettings: (id: string) => void;
}

export const EntryItem: React.FC<EntryItemProps> = ({
  item,
  index,
  totalItems,
  totalWeight,
  effectiveWeight,
  isAdvancedEntries,
  isSpinning,
  color,
  stat,
  onUpdate,
  onRemove,
  onMove,
  onEditSettings,
}) => {
  const { t } = useTranslation();
  const currentWeight = effectiveWeight !== undefined ? effectiveWeight : (item.weight || 1);
  const weightPercentage = item.enabled !== false ? Math.round((currentWeight / totalWeight) * 100) : 0;
  const itemColor = item.color || color || '#cccccc';

  if (!isAdvancedEntries) {
    return (
      <div className={`flex items-center gap-2.5 p-2.5 rounded-xl transition-all border border-transparent hover:bg-slate-800/40 hover:border-slate-700/50 group ${item.enabled === false ? 'opacity-50 grayscale' : ''}`}>
        <label 
          className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center shadow-inner ring-2 ring-slate-800 transition-transform hover:scale-110 ${isSpinning ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
          style={{ backgroundColor: itemColor }}
          title={t('entryItem.changeColor')}
        >
          <input 
            type="color" 
            disabled={isSpinning}
            value={itemColor} 
            onChange={(e) => onUpdate(item.id, { color: e.target.value })}
            className="absolute opacity-0 w-0 h-0"
          />
        </label>
        
        <div className="flex-1 flex items-center gap-1.5 min-w-0">
          <input 
            type="text" 
            value={item.text} 
            onChange={(e) => onUpdate(item.id, { text: e.target.value })}
            className={`flex-1 min-w-0 bg-transparent border-none text-slate-100 font-medium focus:outline-none focus:ring-0 px-1 py-1 text-sm ${item.enabled === false ? 'line-through text-slate-400' : ''}`}
            placeholder={t('entryItem.placeholderCompact')}
            disabled={isSpinning}
          />

          {stat && (
            <span 
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${
                stat.hasWon && stat.daysWithoutWin === 0
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : stat.daysWithoutWin > 7 || !stat.hasWon
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
              }`}
              title={stat.hasWon ? `${stat.daysWithoutWin} dia(s) sem ganhar` : 'Nunca ganhou'}
            >
              {stat.hasWon ? (stat.daysWithoutWin === 0 ? '🏆 Hoje' : `⏳ ${stat.daysWithoutWin}d`) : '⚠️ Nunca'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <span 
            className={`text-xs font-semibold px-2 py-1 rounded-md min-w-[3rem] text-center border ${currentWeight !== (item.weight || 1) ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' : 'text-slate-400 bg-slate-800/60 border-slate-700/50'}`}
            title={`${t('entryItem.effectiveWeight')}: ${currentWeight.toFixed(1)}${currentWeight !== (item.weight || 1) ? ` (${t('entryItem.adjustedByBalance')})` : ''}`}
          >
            {weightPercentage}%
          </span>
          
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
            <button 
              onClick={() => onUpdate(item.id, { enabled: item.enabled === false ? true : false })} 
              disabled={isSpinning} 
              className="text-slate-500 hover:text-slate-300 p-1.5 rounded-lg hover:bg-slate-700/50 transition-colors disabled:opacity-50 focus:opacity-100 focus:outline-none" 
              title={item.enabled !== false ? t('entryItem.disable') : t('entryItem.enable')}
            >
              {item.enabled !== false ? <Eye size={16} /> : <EyeOff size={16} />}
            </button>
            <button 
              onClick={() => onRemove(item.id)} 
              disabled={isSpinning} 
              className="text-slate-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition-colors disabled:opacity-50 focus:opacity-100 focus:outline-none" 
              title={t('entryItem.delete')}
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-stretch gap-3 p-3.5 rounded-xl bg-slate-800/30 border transition-all ${item.enabled === false ? 'border-slate-800 opacity-60 grayscale' : 'border-slate-700/60 hover:border-slate-600'}`}>
      
      {/* Left: Move Controls */}
      <div className="flex flex-col items-center justify-center gap-1.5 opacity-60 hover:opacity-100 transition-opacity">
        <button 
          onClick={() => onMove(item.id, 'up')} 
          disabled={isSpinning || index === 0} 
          className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
        >
          <ArrowUp size={16} />
        </button>
        <button 
          onClick={() => onMove(item.id, 'down')} 
          disabled={isSpinning || index === totalItems - 1} 
          className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
        >
          <ArrowDown size={16} />
        </button>
      </div>

      {/* Center: Inputs */}
      <div className="flex-1 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <input
            type="text" 
            value={item.text} 
            onChange={(e) => onUpdate(item.id, { text: e.target.value })}
            className={`flex-1 w-full bg-slate-900/60 border border-slate-700/80 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors placeholder-slate-600 ${item.enabled === false ? 'line-through text-slate-400' : ''}`}
            placeholder={t('entryItem.placeholderFull')}
            disabled={isSpinning}
          />

          {stat && (
            <span 
              className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border shrink-0 flex items-center gap-1 ${
                stat.hasWon && stat.daysWithoutWin === 0
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : stat.daysWithoutWin > 7 || !stat.hasWon
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
              }`}
              title={stat.hasWon && stat.lastWinTimestamp ? `Última vitória: ${new Date(stat.lastWinTimestamp).toLocaleDateString()}` : 'Nunca ganhou'}
            >
              {stat.hasWon ? (
                stat.daysWithoutWin === 0 ? '🏆 Ganhou hoje' : `⏳ ${stat.daysWithoutWin}d sem ganhar`
              ) : (
                '⚠️ Nunca ganhou'
              )}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          <label 
            className={`relative flex items-center justify-center w-9 h-9 rounded-lg overflow-hidden border border-white/10 shadow-sm transition-transform hover:scale-105 shrink-0 ${isSpinning ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
            style={{ backgroundColor: itemColor }}
            title={t('entryItem.changeColor')}
          >
            <input 
              type="color" 
              disabled={isSpinning}
              value={itemColor} 
              onChange={(e) => onUpdate(item.id, { color: e.target.value })}
              className="absolute opacity-0 inset-0 w-full h-full cursor-pointer disabled:cursor-not-allowed"
            />
            <Palette size={16} color={getContrastYIQ(itemColor)} />
          </label>
          
          <div className={`flex-1 flex items-center bg-slate-900/60 border border-slate-700/80 rounded-lg overflow-hidden focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-colors h-9 ${isSpinning ? 'opacity-50' : ''}`}>
            <div className="px-2 py-1.5 text-xs font-semibold text-slate-400 border-r border-slate-700/80 bg-slate-800/40 h-full flex items-center shrink-0">
              {t('entryItem.weight')}
            </div>
            <input 
              type="number" 
              min="0.1" 
              step="0.1"
              disabled={isSpinning}
              value={item.weight || 1} 
              onChange={(e) => onUpdate(item.id, { weight: Number(e.target.value) })}
              className="flex-1 w-full min-w-[1rem] bg-transparent text-white border-none focus:outline-none px-1 py-1 text-sm disabled:cursor-not-allowed text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            {currentWeight !== (item.weight || 1) && (
              <div 
                className="px-1.5 text-[10px] font-bold text-amber-400 h-full flex items-center justify-center border-l border-slate-700/80 bg-amber-500/10 shrink-0" 
                title={`${t('entryItem.adjustedByBalance')}: ${item.weight || 1}\n${t('entryItem.current')}: ${currentWeight.toFixed(1)}`}
              >
                {currentWeight > (item.weight || 1) ? '▲' : '▼'}{currentWeight.toFixed(1)}
              </div>
            )}
            <div 
              className="px-2 text-xs font-bold text-blue-400 bg-blue-500/10 border-l border-blue-500/20 h-full flex items-center min-w-[3rem] justify-center shrink-0"
              title={`${t('entryItem.effectiveWeight')}: ${currentWeight.toFixed(1)}`}
            >
              {weightPercentage}%
            </div>
          </div>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex flex-col items-center justify-between shrink-0 ml-1">
        <button 
          onClick={() => onRemove(item.id)} 
          disabled={isSpinning} 
          className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-30 disabled:hover:bg-transparent" 
          title={t('entryItem.delete')}
        >
          <X size={18} />
        </button>
        <div className="flex flex-col items-center gap-2 mt-auto">
          <button 
            onClick={() => onEditSettings(item.id)}
            disabled={isSpinning}
            className="p-2 text-blue-400 hover:text-white bg-blue-500/10 hover:bg-blue-500 rounded-lg transition-all disabled:opacity-30 disabled:hover:bg-blue-500/10 disabled:hover:text-blue-400 shadow-sm"
            title={t('entryItem.sliceSettings')}
          >
            <Settings2 size={16} />
          </button>
          
          <label className={`flex items-center justify-center pt-1 transition-colors ${item.enabled !== false ? 'text-blue-400' : 'text-slate-500'} ${isSpinning ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`} title={item.enabled !== false ? t('entryItem.enable') : t('entryItem.disable')}>
            <input 
              type="checkbox" 
              disabled={isSpinning}
              checked={item.enabled !== false}
              onChange={(e) => onUpdate(item.id, { enabled: e.target.checked })}
              className="w-4 h-4 rounded text-blue-500 bg-slate-900 border-slate-700 cursor-pointer disabled:cursor-not-allowed focus:ring-blue-500 focus:ring-offset-slate-800"
            />
          </label>
        </div>
      </div>

    </div>
  );
};
