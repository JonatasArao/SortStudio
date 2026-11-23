import React from 'react';
import { ArrowUp, ArrowDown, Settings2, X, Palette, Eye, EyeOff, Clock, Trophy, Skull, Ban } from 'lucide-react';
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
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
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
  const baseWeight = item.weight !== undefined ? item.weight : 1;
  const currentWeight = effectiveWeight !== undefined ? effectiveWeight : baseWeight;
  const weightPercentage = item.enabled !== false ? Math.round((currentWeight / totalWeight) * 100) : 0;
  const itemColor = item.color || color || '#cccccc';
  const weightAdjusted = currentWeight !== baseWeight;

  if (!isAdvancedEntries) {
    return (
      <div
        className={`flex items-center gap-2 px-2.5 py-2 rounded-xl border transition-colors duration-150 group ${
          item.enabled === false
            ? 'bg-[var(--studio-input)] border-[var(--studio-border)] opacity-55'
            : 'bg-[var(--studio-card)] border-[var(--studio-border)] hover:border-[var(--studio-border-strong)] hover:bg-[var(--studio-card-hover)]'
        }`}
      >
        <label
          className={`relative shrink-0 w-5 h-5 rounded-full ring-1 ring-black/15 dark:ring-white/20 transition-transform hover:scale-110 ${
            isSpinning ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
          }`}
          style={{ backgroundColor: itemColor }}
          title={t('entryItem.changeColor')}
        >
          <input
            type="color"
            disabled={isSpinning}
            value={itemColor}
            onChange={e => onUpdate(item.id, { color: e.target.value })}
            className="absolute opacity-0 w-0 h-0"
          />
        </label>

        <div className="flex-1 flex flex-col min-w-0">
          <input
            type="text"
            value={item.text}
            onChange={e => onUpdate(item.id, { text: e.target.value })}
            className={`w-full min-w-0 bg-transparent border-none text-[var(--studio-text)] placeholder:text-[var(--studio-text-muted)] font-medium focus:outline-none focus:ring-0 px-1 py-0.5 text-sm ${
              item.enabled === false ? 'line-through text-[var(--studio-text-muted)]' : ''
            }`}
            placeholder={t('entryItem.placeholderCompact')}
            disabled={isSpinning}
          />

          {(item.isEliminated || stat) && (
            <div className="flex items-center gap-1.5 px-1 text-[11px] leading-tight text-[var(--studio-text-muted)] truncate">
              {item.isEliminated && (
                <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 font-medium">
                  <Skull size={11} />
                  <span>Eliminado</span>
                </span>
              )}
              {item.isEliminated && stat && <span aria-hidden="true">·</span>}
              {stat && (
                <span
                  className={`inline-flex items-center gap-1 font-medium ${
                    stat.hasWon && stat.daysWithoutWin === 0
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : !stat.hasWon
                      ? 'text-[var(--studio-text-muted)]'
                      : stat.daysWithoutWin > 7
                      ? 'text-amber-700 dark:text-amber-400'
                      : 'text-blue-700 dark:text-blue-400'
                  }`}
                  title={stat.hasWon ? `${stat.daysWithoutWin} dia(s) sem ganhar` : 'Sem vitórias registradas'}
                >
                  {stat.hasWon ? (
                    stat.daysWithoutWin === 0 ? (
                      <>
                        <Trophy size={10} />
                        <span>Hoje</span>
                      </>
                    ) : (
                      <>
                        <Clock size={10} />
                        <span className="font-mono tabular-nums">{stat.daysWithoutWin}d</span>
                      </>
                    )
                  ) : (
                    <span>Sem vitórias</span>
                  )}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Probability readout & touch-accessible actions */}
        <div className="flex items-center gap-1 shrink-0">
          <span
            className={`text-xs font-mono tabular-nums font-semibold px-1.5 py-0.5 rounded-md ${
              currentWeight === 0
                ? 'text-rose-600 dark:text-rose-400'
                : weightAdjusted
                ? 'text-amber-700 dark:text-amber-400'
                : 'text-[var(--studio-text-secondary)]'
            }`}
            title={`${t('entryItem.effectiveWeight')}: ${currentWeight.toFixed(2)}${
              weightAdjusted ? ` (${t('entryItem.adjustedByBalance')})` : ''
            }`}
          >
            {weightPercentage}%
          </span>

          <div className="flex items-center gap-0.5 opacity-90 sm:opacity-45 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={() => onUpdate(item.id, { enabled: item.enabled === false })}
              disabled={isSpinning}
              className="w-8 h-8 flex items-center justify-center text-[var(--studio-text-muted)] hover:text-[var(--studio-text)] rounded-lg hover:bg-[var(--studio-accent-soft)] transition-colors disabled:opacity-40"
              title={item.enabled !== false ? t('entryItem.disable') : t('entryItem.enable')}
              aria-label={item.enabled !== false ? t('entryItem.disable') : t('entryItem.enable')}
            >
              {item.enabled !== false ? <Eye size={15} /> : <EyeOff size={15} />}
            </button>
            <button
              type="button"
              onClick={() => onRemove(item.id)}
              disabled={isSpinning}
              className="w-8 h-8 flex items-center justify-center text-[var(--studio-text-muted)] hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors disabled:opacity-40"
              title={t('entryItem.delete')}
              aria-label={t('entryItem.delete')}
            >
              <X size={15} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex items-stretch gap-2.5 p-3 rounded-xl border transition-colors duration-150 ${
        item.enabled === false
          ? 'bg-[var(--studio-input)] border-[var(--studio-border)] opacity-60'
          : 'bg-[var(--studio-card)] border-[var(--studio-border)] hover:border-[var(--studio-border-strong)]'
      }`}
    >
      {/* Left: Reorder Controls */}
      <div className="flex flex-col items-center justify-center gap-1 shrink-0">
        <button
          type="button"
          onClick={() => onMove(item.id, 'up')}
          disabled={isSpinning || index === 0}
          className="w-7 h-7 flex items-center justify-center text-[var(--studio-text-muted)] hover:text-[var(--studio-text)] hover:bg-[var(--studio-accent-soft)] rounded-lg disabled:opacity-25 transition-colors"
          aria-label="Mover para cima"
        >
          <ArrowUp size={14} />
        </button>
        <button
          type="button"
          onClick={() => onMove(item.id, 'down')}
          disabled={isSpinning || index === totalItems - 1}
          className="w-7 h-7 flex items-center justify-center text-[var(--studio-text-muted)] hover:text-[var(--studio-text)] hover:bg-[var(--studio-accent-soft)] rounded-lg disabled:opacity-25 transition-colors"
          aria-label="Mover para baixo"
        >
          <ArrowDown size={14} />
        </button>
      </div>

      {/* Center: Name, Status Metadata & Weight */}
      <div className="flex-1 flex flex-col gap-2 min-w-0">
        <input
          type="text"
          value={item.text}
          onChange={e => onUpdate(item.id, { text: e.target.value })}
          className={`w-full bg-[var(--studio-input)] border border-[var(--studio-border-strong)] rounded-lg px-3 py-1.5 text-sm text-[var(--studio-text)] focus:outline-none focus:border-[var(--studio-accent)] transition-colors placeholder:text-[var(--studio-text-muted)] ${
            item.enabled === false ? 'line-through text-[var(--studio-text-muted)]' : ''
          }`}
          placeholder={t('entryItem.placeholderFull')}
          disabled={isSpinning}
        />

        {(item.isEliminated || stat) && (
          <div className="flex items-center gap-2 text-[11px] text-[var(--studio-text-muted)] px-0.5 truncate">
            {item.isEliminated && (
              <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 font-medium">
                <Skull size={11} />
                <span>Eliminado</span>
              </span>
            )}
            {item.isEliminated && stat && <span aria-hidden="true">·</span>}
            {stat && (
              <span
                className={`inline-flex items-center gap-1 font-medium ${
                  stat.hasWon && stat.daysWithoutWin === 0
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : !stat.hasWon
                    ? 'text-[var(--studio-text-muted)]'
                    : stat.daysWithoutWin > 7
                    ? 'text-amber-700 dark:text-amber-400'
                    : 'text-blue-700 dark:text-blue-400'
                }`}
                title={
                  stat.hasWon && stat.lastWinTimestamp
                    ? `Última vitória: ${new Date(stat.lastWinTimestamp).toLocaleDateString()}`
                    : 'Sem vitórias registradas'
                }
              >
                {stat.hasWon ? (
                  stat.daysWithoutWin === 0 ? (
                    <>
                      <Trophy size={11} />
                      <span>Ganhou hoje</span>
                    </>
                  ) : (
                    <>
                      <Clock size={11} />
                      <span className="font-mono tabular-nums">{stat.daysWithoutWin}d sem ganhar</span>
                    </>
                  )
                ) : (
                  <span>Sem vitórias</span>
                )}
              </span>
            )}
          </div>
        )}

        <div className="flex items-center gap-2">
          <label
            className={`relative flex items-center justify-center w-9 h-9 rounded-lg overflow-hidden border border-[var(--studio-border-strong)] shrink-0 ${
              isSpinning ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:scale-105 transition-transform'
            }`}
            style={{ backgroundColor: itemColor }}
            title={t('entryItem.changeColor')}
          >
            <input
              type="color"
              disabled={isSpinning}
              value={itemColor}
              onChange={e => onUpdate(item.id, { color: e.target.value })}
              className="absolute opacity-0 inset-0 w-full h-full cursor-pointer"
            />
            <Palette size={15} color={getContrastYIQ(itemColor)} />
          </label>

          <div
            className={`flex-1 flex items-center bg-[var(--studio-input)] border border-[var(--studio-border-strong)] rounded-lg overflow-hidden focus-within:border-[var(--studio-accent)] transition-colors h-9 ${
              isSpinning ? 'opacity-50' : ''
            }`}
          >
            <span className="px-2.5 text-xs font-medium text-[var(--studio-text-muted)] border-r border-[var(--studio-border)] h-full flex items-center shrink-0">
              {t('entryItem.weight')}
            </span>
            <input
              type="number"
              min="0.1"
              step="0.1"
              disabled={isSpinning}
              value={baseWeight}
              onChange={e => onUpdate(item.id, { weight: Number(e.target.value) })}
              className="flex-1 w-full min-w-[2.5rem] bg-transparent text-[var(--studio-text)] font-mono tabular-nums border-none focus:outline-none px-1.5 text-xs text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            {weightAdjusted && (
              <span
                className={`px-1.5 text-[11px] font-mono tabular-nums font-semibold h-full flex items-center gap-0.5 border-l border-[var(--studio-border)] shrink-0 ${
                  currentWeight === 0
                    ? 'text-rose-600 dark:text-rose-400'
                    : currentWeight > baseWeight
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-amber-700 dark:text-amber-400'
                }`}
                title={`${t('entryItem.adjustedByBalance')}: ${baseWeight}\n${t('entryItem.effectiveWeight')}: ${currentWeight.toFixed(2)}`}
              >
                {currentWeight === 0 ? (
                  <Ban size={11} />
                ) : (
                  `${currentWeight > baseWeight ? '+' : ''}${(currentWeight - baseWeight).toFixed(1)}`
                )}
              </span>
            )}
            <span
              className={`px-2 text-xs font-mono tabular-nums font-semibold border-l border-[var(--studio-border)] h-full flex items-center min-w-[3rem] justify-center shrink-0 ${
                currentWeight === 0 ? 'text-rose-600 dark:text-rose-400' : 'text-[var(--studio-accent-fg)]'
              }`}
              title={`${t('entryItem.effectiveWeight')}: ${currentWeight.toFixed(2)}`}
            >
              {weightPercentage}%
            </span>
          </div>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex flex-col items-center justify-between shrink-0">
        <button
          type="button"
          onClick={() => onRemove(item.id)}
          disabled={isSpinning}
          className="w-8 h-8 flex items-center justify-center text-[var(--studio-text-muted)] hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-30"
          title={t('entryItem.delete')}
          aria-label={t('entryItem.delete')}
        >
          <X size={16} />
        </button>

        <button
          type="button"
          onClick={() => onEditSettings(item.id)}
          disabled={isSpinning}
          className="w-8 h-8 flex items-center justify-center text-[var(--studio-accent-fg)] hover:text-[var(--studio-accent-text)] bg-[var(--studio-accent-soft)] hover:bg-[var(--studio-accent)] rounded-lg transition-colors disabled:opacity-30"
          title={t('entryItem.sliceSettings')}
          aria-label={t('entryItem.sliceSettings')}
        >
          <Settings2 size={15} />
        </button>

        <button
          type="button"
          onClick={() => onUpdate(item.id, { enabled: item.enabled === false })}
          disabled={isSpinning}
          className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors disabled:opacity-30 ${
            item.enabled !== false
              ? 'text-[var(--studio-text-secondary)] hover:text-[var(--studio-text)] hover:bg-[var(--studio-accent-soft)]'
              : 'text-[var(--studio-text-muted)] hover:text-[var(--studio-text)] hover:bg-[var(--studio-card-hover)]'
          }`}
          title={item.enabled !== false ? t('entryItem.disable') : t('entryItem.enable')}
          aria-label={item.enabled !== false ? t('entryItem.disable') : t('entryItem.enable')}
        >
          {item.enabled !== false ? <Eye size={15} /> : <EyeOff size={15} />}
        </button>
      </div>
    </div>
  );
};
