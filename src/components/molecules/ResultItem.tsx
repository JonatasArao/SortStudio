import React, { useState } from 'react';
import { Trophy, Skull, Crown, Trash2, Check, X } from 'lucide-react';
import { Result } from '../../types';
import { useTranslation } from 'react-i18next';

interface ResultItemProps {
  result: Result;
  index: number;
  onRemove?: (result: Result) => void;
}

export const ResultItem: React.FC<ResultItemProps> = ({ result, index, onRemove }) => {
  const { t } = useTranslation();
  const [isConfirming, setIsConfirming] = useState(false);
  
  const isEliminated = result.type === 'eliminated';
  const isGrandWinner = result.type === 'grand_winner';
  
  let Icon = Trophy;
  let label = t("resultItem.winner");
  let colorTheme = "from-emerald-900/40 to-emerald-800/10 border-emerald-500/30 text-emerald-400";
  let iconColor = "text-emerald-400";
  let textColor = "text-emerald-100";
  let numberColor = "text-emerald-500/50";

  if (isEliminated) {
    Icon = Skull;
    label = t("resultItem.eliminated");
    colorTheme = "from-red-900/30 to-red-800/10 border-red-500/20 text-red-400/80";
    iconColor = "text-red-400/70";
    textColor = "text-red-200/50 line-through decoration-red-500/30";
    numberColor = "text-red-500/40";
  } else if (isGrandWinner) {
    Icon = Crown;
    label = t("resultItem.grandChampion");
    colorTheme = "from-yellow-900/40 to-yellow-800/20 border-yellow-500/50 text-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.1)]";
    iconColor = "text-yellow-400 drop-shadow-md";
    textColor = "text-yellow-50 font-bold";
    numberColor = "text-yellow-500/80 font-black";
  }

  return (
    <div className={`bg-gradient-to-r border rounded-xl p-3 flex flex-col gap-1.5 transition-all hover:-translate-y-[1px] hover:shadow-md ${colorTheme}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 overflow-hidden">
          <span className={`text-[11px] font-black w-4 text-left shrink-0 ${numberColor}`}>#{index}</span>
          <span className={`text-sm ${textColor} truncate`} title={result.text}>
            {result.text}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md bg-black/25 ${iconColor}`}>
            <Icon size={12} strokeWidth={2.5} />
            <span className="text-[10px] uppercase font-bold tracking-wider">{label}</span>
          </div>
          {onRemove && (
            isConfirming ? (
              <div className="flex items-center gap-1 bg-red-950/30 rounded-md p-0.5 border border-red-500/20">
                <button
                  onClick={() => onRemove(result)}
                  className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded transition-colors"
                  title={t('resultItem.confirm') || 'Confirmar'}
                >
                  <Check size={14} />
                </button>
                <button
                  onClick={() => setIsConfirming(false)}
                  className="p-1 text-slate-400 hover:text-slate-300 hover:bg-slate-700/50 rounded transition-colors"
                  title={t('resultItem.cancel') || 'Cancelar'}
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsConfirming(true)}
                className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                title={t('resultItem.remove') || 'Remover resultado'}
              >
                <Trash2 size={14} />
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
};
