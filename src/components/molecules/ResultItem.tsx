import React, { useState } from 'react';
import { Trophy, Skull, Crown, Trash2, Check, X } from 'lucide-react';
import { Result } from '../../types';
import { useTranslation } from 'react-i18next';

interface ResultItemProps {
  result: Result;
  index: number;
  dateLabel?: string;
  onRemove?: (result: Result) => void;
}

export const ResultItem: React.FC<ResultItemProps> = ({ result, index, dateLabel, onRemove }) => {
  const { t } = useTranslation();
  const [isConfirming, setIsConfirming] = useState(false);

  const isEliminated = result.type === 'eliminated';
  const isGrandWinner = result.type === 'grand_winner';

  let Icon = Trophy;
  let label = t("resultItem.winner");
  let containerClass = "bg-[var(--studio-card)] border-[var(--studio-border)] hover:border-emerald-500/35";
  let iconColor = "text-emerald-700 dark:text-emerald-400";
  let textColor = "text-[var(--studio-text)] font-medium";
  let numberColor = "text-emerald-700 dark:text-emerald-400/90";

  if (isEliminated) {
    Icon = Skull;
    label = t("resultItem.eliminated");
    containerClass = "bg-[var(--studio-card)]/70 border-red-500/25 hover:border-red-500/40";
    iconColor = "text-red-600 dark:text-red-400/90";
    textColor = "text-[var(--studio-text-muted)] line-through decoration-red-500/40";
    numberColor = "text-red-600 dark:text-red-400/80";
  } else if (isGrandWinner) {
    Icon = Crown;
    label = t("resultItem.grandChampion");
    containerClass = "bg-amber-500/[0.08] border-amber-500/35 hover:border-amber-500/50";
    iconColor = "text-amber-700 dark:text-amber-400";
    textColor = "text-amber-900 dark:text-amber-100 font-semibold";
    numberColor = "text-amber-700 dark:text-amber-400";
  }

  return (
    <div className={`border rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-3 transition-colors ${containerClass}`}>
      <div className="flex items-center gap-3 min-w-0">
        <span className={`text-xs font-mono tabular-nums font-bold w-7 shrink-0 ${numberColor}`}>
          #{index}
        </span>
        <div className="flex flex-col min-w-0">
          <span className={`text-sm ${textColor} truncate`} title={result.text}>
            {result.text}
          </span>
          <div className="flex items-center gap-1.5 text-[11px] text-[var(--studio-text-muted)] mt-0.5">
            <span className={`inline-flex items-center gap-1 font-medium ${iconColor}`}>
              <Icon size={11} strokeWidth={2.25} />
              <span>{label}</span>
            </span>
            {dateLabel && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums text-[var(--studio-text-muted)]">{dateLabel}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {onRemove && (
        <div className="flex items-center shrink-0">
          {isConfirming ? (
            <div className="flex items-center gap-1 bg-red-500/10 rounded-lg p-0.5 border border-red-500/30">
              <button
                type="button"
                onClick={() => onRemove(result)}
                className="p-1.5 text-red-600 dark:text-red-400 hover:text-white hover:bg-red-600 rounded-md transition-colors"
                title={t('resultItem.confirm') || 'Confirmar'}
                aria-label={t('resultItem.confirm') || 'Confirmar'}
              >
                <Check size={14} />
              </button>
              <button
                type="button"
                onClick={() => setIsConfirming(false)}
                className="p-1.5 text-[var(--studio-text-muted)] hover:text-[var(--studio-text)] hover:bg-[var(--studio-card-hover)] rounded-md transition-colors"
                title={t('resultItem.cancel') || 'Cancelar'}
                aria-label={t('resultItem.cancel') || 'Cancelar'}
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsConfirming(true)}
              className="p-2 text-[var(--studio-text-muted)] hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              title={t('resultItem.remove') || 'Remover resultado'}
              aria-label={t('resultItem.remove') || 'Remover resultado'}
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
