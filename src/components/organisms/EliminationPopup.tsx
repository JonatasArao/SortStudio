import React, { useEffect, useCallback } from 'react';
import { Skull, Ghost, X, ArrowRight } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useWheelActions } from '../../hooks/useWheelActions';
import { playWinSound } from '../../utils/audioEngine';

export const EliminationPopup: React.FC = () => {
  const eliminationOverlayItem = useAppStore(s => s.eliminationOverlayItem);
  const setEliminationOverlayItem = useAppStore(s => s.setEliminationOverlayItem);
  const eliminationMessage = useAppStore(s => s.eliminationMessage);
  const isAutoEliminating = useAppStore(s => s.isAutoEliminating);
  const autoContinueElimination = useAppStore(s => s.autoContinueElimination);
  const setWinner = useAppStore(s => s.setWinner);

  const { handleUpdateItem, spinWheel, clearTimeouts, stopContinuousAudio } = useWheelActions();

  const handleDismiss = useCallback((shouldSpinNext: boolean = false) => {
    if (!eliminationOverlayItem) return;

    const itemId = eliminationOverlayItem.id;
    const liveState = useAppStore.getState();

    // Marca o participante como desativado e eliminado (transformando-o no fantasma do fundo)
    handleUpdateItem(itemId, { enabled: false, isEliminated: true });
    setEliminationOverlayItem(null);
    setWinner(null);

    // Identifica sobreviventes restantes
    const remainingSurvivors = liveState.items.filter(
      i => i.enabled && i.text.trim() !== '' && i.id !== itemId
    );

    if (remainingSurvivors.length === 1) {
      // Coroa o Grande Campeão
      const grandWinner = remainingSurvivors[0];
      clearTimeouts();
      stopContinuousAudio();
      liveState.setIsAutoEliminating(false);

      const actualVolume = liveState.soundEnabled ? liveState.masterVolume / 100 : 0;
      if (actualVolume > 0) {
        const genericCustomWin = liveState.customWinAudios.find(a => a.id === liveState.winSoundType) || null;
        playWinSound(0.6, liveState.winSoundType, genericCustomWin, actualVolume);
      }

      const drawId = crypto.randomUUID();
      liveState.setWinner({ ...grandWinner, type: 'grand_winner', drawId });
      liveState.setResults(prev => [
        { ...grandWinner, drawId, type: 'grand_winner', timestamp: Date.now() },
        ...prev,
      ]);
    } else if (remainingSurvivors.length > 1 && shouldSpinNext) {
      setTimeout(() => {
        spinWheel();
      }, 100);
    }
  }, [eliminationOverlayItem, handleUpdateItem, setEliminationOverlayItem, setWinner, clearTimeouts, stopContinuousAudio, spinWheel]);

  // Keyboard shortcut listener (Space/Enter to continue, Esc to close)
  useEffect(() => {
    if (!eliminationOverlayItem) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleDismiss(false);
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleDismiss(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [eliminationOverlayItem, handleDismiss]);

  const isAuto = isAutoEliminating || autoContinueElimination;

  if (!eliminationOverlayItem || isAuto) return null;

  const round = eliminationOverlayItem.round || 1;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 transition-all animate-in fade-in duration-200"
      onClick={() => handleDismiss(false)}
    >
      <div 
        className="bg-slate-950/95 border border-red-500/40 px-6 sm:px-10 py-7 sm:py-9 rounded-[2rem] max-w-[92vw] sm:max-w-md w-full shadow-[0_20px_70px_rgba(239,68,68,0.3)] text-center relative overflow-hidden group"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow de fundo */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[160%] h-36 bg-red-600/15 blur-[60px] pointer-events-none" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[160%] h-32 bg-purple-600/10 blur-[60px] pointer-events-none" />

        {/* Botão Fechar X */}
        <button
          onClick={() => handleDismiss(false)}
          className="absolute top-4 right-4 p-2 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors z-20 border border-slate-800"
          title="Fechar"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Badges superiores */}
        <div className="flex items-center justify-center gap-2 mb-4 relative z-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-950/80 border border-red-500/30 text-red-300 text-xs font-bold uppercase tracking-wider shadow-sm">
            <Skull className="w-3.5 h-3.5 text-red-400 animate-pulse" />
            Rodada {round}
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-950/80 border border-indigo-500/30 text-indigo-300 text-xs font-medium">
            <Ghost className="w-3.5 h-3.5 text-indigo-400" />
            Virou Fantasma
          </span>
        </div>

        {/* Ícone Caveira */}
        <div className="relative z-10 my-2 flex justify-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-b from-red-500/20 to-red-950/40 border border-red-500/40 flex items-center justify-center shadow-[0_0_25px_rgba(239,68,68,0.35)] animate-bounce">
            <Skull className="w-9 h-9 sm:w-11 sm:h-11 text-red-400 drop-shadow-[0_0_12px_rgba(239,68,68,0.8)]" />
          </div>
        </div>

        {/* Mensagem de eliminação */}
        <p className="text-xs sm:text-sm text-red-400/90 font-black uppercase tracking-[0.25em] mb-1.5 relative z-10">
          {eliminationMessage || 'ELIMINADO DA BATALHA'}
        </p>

        {/* Nome do Participante */}
        <div className="flex items-center justify-center gap-2.5 my-3 relative z-10">
          {eliminationOverlayItem.color && (
            <div 
              className="w-4 h-4 rounded-full border border-white/40 shrink-0 shadow-sm"
              style={{ backgroundColor: eliminationOverlayItem.color }}
            />
          )}
          <h2 className="text-2xl sm:text-3xl font-black text-white break-words drop-shadow-md leading-tight">
            {eliminationOverlayItem.text}
          </h2>
        </div>

        <p className="text-[11px] sm:text-xs text-slate-400 mb-6 relative z-10 max-w-xs mx-auto">
          Agora flutuando como fantasma no fundo da roleta padrão!
        </p>

        {/* Botões de Ação */}
        <div className="flex flex-row gap-2.5 sm:gap-3 w-full justify-center relative z-10">
          <button 
            onClick={() => handleDismiss(false)}
            className="flex-1 bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white px-3 sm:px-5 py-3 rounded-xl font-bold text-xs sm:text-sm transition-all border border-slate-700/60"
          >
            Fechar
          </button>
          <button 
            onClick={() => handleDismiss(true)}
            className="flex-1 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white px-3 sm:px-5 py-3 rounded-xl font-extrabold text-xs sm:text-sm transition-all shadow-[0_0_20px_rgba(239,68,68,0.3)] hover:shadow-[0_0_25px_rgba(239,68,68,0.5)] flex items-center justify-center gap-1.5 border border-red-400/40"
          >
            <span>Próxima Rodada</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
