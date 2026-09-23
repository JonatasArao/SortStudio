import React, { useEffect } from 'react';
import { Trophy, Crown, Car } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useWheelActions } from '../../hooks/useWheelActions';
import { useTranslation } from 'react-i18next';

export const WinnerModal = () => {
  const { t } = useTranslation();
  const winner = useAppStore(s => s.winner);
  const setWinner = useAppStore(s => s.setWinner);
  const winMessage = useAppStore(s => s.winMessage);
  const grandWinnerMessage = useAppStore(s => s.grandWinnerMessage);
  const autoRemoveWinner = useAppStore(s => s.autoRemoveWinner);
  const wheelType = useAppStore(s => s.wheelType);
  const racePodium = useAppStore(s => s.racePodium);
  
  const { handleRemoveItem, stopWinSound } = useWheelActions();
  
  useEffect(() => {
    return () => {
      stopWinSound();
    };
  }, [stopWinSound]);

  if (!winner || winner.isEliminated) return null;
  
  const isGrandWinner = winner.type === 'grand_winner';
  
  let customMessage = winner.message || winMessage;
  let Icon = Trophy;
  let iconColor = "text-yellow-400";
  let dropShadowColor = "rgba(250,204,21,0.5)";

  if (isGrandWinner) {
    customMessage = grandWinnerMessage;
    Icon = Crown;
    iconColor = "text-yellow-300";
    dropShadowColor = "rgba(253,224,71,0.8)";
  }

  if (wheelType === 'race') {
    return (
      <div className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center justify-center transition-all animate-in slide-in-from-bottom-10 fade-in duration-500 w-full max-w-lg px-3 sm:px-4">
        <div className="bg-slate-950/95 border border-amber-500/30 backdrop-blur-xl px-4 sm:px-5 py-3 sm:py-4 rounded-2xl w-full shadow-[0_10px_40px_rgba(0,0,0,0.8)] text-center flex flex-col gap-3 sm:gap-4 relative overflow-hidden">
            
            {/* Race finish flag pattern decorative top bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-[repeating-linear-gradient(45deg,#fff,#fff_10px,#000_10px,#000_20px)] opacity-50"></div>
            
            <div className="flex items-center gap-3 sm:gap-4 text-left">
               <div className="relative shrink-0 flex items-center justify-center">
                 <Icon className={`${iconColor} drop-shadow-[0_0_15px_${dropShadowColor}] animate-bounce`} size={28} />
                 {winner.color && (
                   <div 
                     className="w-8 h-8 rounded-xl flex items-center justify-center border border-white/30 shadow-md shrink-0 ml-1.5"
                     style={{ backgroundColor: winner.color }}
                     title={winner.text}
                   >
                     <Car className="w-4 h-4 text-white drop-shadow" />
                   </div>
                 )}
               </div>
               <div className="flex-1 min-w-0">
                 <p className="text-[9px] sm:text-[10px] text-amber-400 font-black uppercase tracking-[0.2em]">{customMessage}</p>
                 <h2 className="text-lg sm:text-xl font-black text-white drop-shadow-lg leading-tight uppercase italic truncate">{winner.text}</h2>
               </div>
            </div>

            {/* Compact Visual Podium Steps */}
            {racePodium && racePodium.length > 0 && (
              <div className="flex items-center justify-center gap-2 sm:gap-3 w-full bg-slate-900/50 rounded-xl p-2 border border-slate-800/50">
                {racePodium.slice(0, 3).map((runner, idx) => (
                  <div key={runner.id} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-800/60 border border-slate-700/50 text-[10px] sm:text-xs">
                    <span>{idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}</span>
                    <span className="font-bold text-slate-200 truncate max-w-[70px] xs:max-w-[90px]">{runner.text}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-row gap-2.5">
              <button 
                onClick={() => {
                  stopWinSound();
                  const state = useAppStore.getState();
                  if (winner.drawId) {
                    state.setResults(prev => prev.filter(r => r.drawId !== winner.drawId));
                  }
                  setWinner(null);
                }}
                className="flex-1 bg-slate-900 hover:bg-red-600 text-slate-300 hover:text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl font-black text-xs transition-all border border-slate-800"
              >
                {t('horizonDisplay.reject').toUpperCase()}
              </button>
              <button 
                onClick={() => {
                  stopWinSound();
                  if (isGrandWinner) {
                      const state = useAppStore.getState();
                      state.setItems(state.items.map(i => ({ ...i, enabled: true })));
                      state.setPityWeights({});
                      setWinner(null);
                  } else {
                      if (autoRemoveWinner) {
                        handleRemoveItem(winner.id);
                      }
                      setWinner(null);
                  }
                }}
                className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl font-black text-xs transition-all shadow-lg border-b-2 border-amber-700"
              >
                {t('horizonDisplay.accept').toUpperCase()}
              </button>
            </div>
        </div>
      </div>
    );
  }

  if (wheelType === 'penalty_shootout') {
    return (
      <div className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center justify-center p-3 sm:p-4 transition-all animate-in slide-in-from-bottom-10 fade-in duration-300 w-full max-w-lg">
        <div className="bg-slate-950/90 backdrop-blur-xl px-4 sm:px-6 py-4 rounded-2xl sm:rounded-3xl w-full shadow-[0_0_80px_rgba(16,185,129,0.25)] border border-emerald-500/40 text-center flex flex-col gap-3 sm:gap-4">
            <div className="flex items-center gap-3 text-left">
               <Icon className={`${iconColor} drop-shadow-[0_0_10px_${dropShadowColor}] animate-bounce shrink-0`} size={28} />
               <div className="flex-1 min-w-0">
                 <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-[0.2em]">{customMessage}</p>
                 <h2 className="text-xl sm:text-2xl font-extrabold text-white truncate drop-shadow-lg leading-tight">{winner.text}</h2>
               </div>
            </div>
            
            <div className="flex flex-row gap-2.5">
              <button 
                onClick={() => {
                  stopWinSound();
                  const state = useAppStore.getState();
                  if (winner.drawId) {
                    state.setResults(prev => prev.filter(r => r.drawId !== winner.drawId));
                  }
                  setWinner(null);
                }}
                className="flex-1 bg-slate-900 hover:bg-red-600 text-slate-300 hover:text-white px-3 sm:px-4 py-2.5 rounded-xl font-black text-xs transition-all border border-slate-800"
              >
                {t('horizonDisplay.reject').toUpperCase()}
              </button>
              <button 
                onClick={() => {
                  stopWinSound();
                  if (isGrandWinner) {
                      const state = useAppStore.getState();
                      state.setItems(state.items.map(i => ({ ...i, enabled: true })));
                      state.setPityWeights({});
                      setWinner(null);
                  } else {
                      if (autoRemoveWinner) {
                        handleRemoveItem(winner.id);
                      }
                      setWinner(null);
                  }
                }}
                className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-[0_0_20px_rgba(16,185,129,0.2)] text-white px-3 sm:px-4 py-2.5 rounded-xl font-black text-xs transition-all"
              >
                {t('horizonDisplay.accept').toUpperCase()}
              </button>
            </div>
        </div>
      </div>
    );
  }

  if (wheelType === 'mystery_box') {
    return (
      <div className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center justify-center p-3 sm:p-4 transition-all animate-in slide-in-from-bottom-10 fade-in duration-300 w-full max-w-lg">
        <div className="bg-slate-950/90 backdrop-blur-xl px-4 sm:px-6 py-4 rounded-2xl sm:rounded-3xl w-full shadow-[0_0_80px_rgba(245,158,11,0.25)] border border-amber-500/40 text-center flex flex-col gap-3 sm:gap-4">
            <div className="flex items-center gap-3 text-left">
               <Icon className={`${iconColor} drop-shadow-[0_0_10px_${dropShadowColor}] animate-bounce shrink-0`} size={28} />
               <div className="flex-1 min-w-0">
                 <p className="text-[10px] text-amber-500/80 font-bold uppercase tracking-[0.2em]">{customMessage}</p>
                 <h2 className="text-xl sm:text-2xl font-extrabold text-white truncate drop-shadow-lg leading-tight">{winner.text}</h2>
               </div>
            </div>
            
            <div className="flex flex-row gap-2.5">
              <button 
                onClick={() => {
                  stopWinSound();
                  const state = useAppStore.getState();
                  if (winner.drawId) {
                    state.setResults(prev => prev.filter(r => r.drawId !== winner.drawId));
                  }
                  setWinner(null);
                }}
                className="flex-1 bg-slate-900 hover:bg-red-600 text-slate-300 hover:text-white px-3 sm:px-4 py-2.5 rounded-xl font-black text-xs transition-all border border-slate-800"
              >
                {t('horizonDisplay.reject').toUpperCase()}
              </button>
              <button 
                onClick={() => {
                  stopWinSound();
                  if (isGrandWinner) {
                      const state = useAppStore.getState();
                      state.setItems(state.items.map(i => ({ ...i, enabled: true })));
                      state.setPityWeights({});
                      setWinner(null);
                  } else {
                      if (autoRemoveWinner) {
                        handleRemoveItem(winner.id);
                      }
                      setWinner(null);
                  }
                }}
                className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 px-3 sm:px-4 py-2.5 rounded-xl font-black text-xs transition-all shadow-lg border-b-2 border-amber-700"
              >
                {t('horizonDisplay.accept').toUpperCase()}
              </button>
            </div>
        </div>
      </div>
    );
  }

  if (wheelType === 'bingo') {
    return (
      <div className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center justify-center p-3 sm:p-4 transition-all animate-in slide-in-from-bottom-10 fade-in duration-300 w-full max-w-lg">
        <div className="bg-slate-950/90 backdrop-blur-xl px-4 sm:px-6 py-4 rounded-2xl sm:rounded-3xl w-full shadow-[0_0_80px_rgba(245,158,11,0.35)] border border-amber-500/50 text-center flex flex-col gap-3 sm:gap-4">
          <div className="flex items-center gap-3 text-left">
            <div 
              style={{ backgroundColor: winner.color || '#3b82f6' }}
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 border-white shadow-[inset_-3px_-3px_6px_rgba(0,0,0,0.6),0_4px_10px_rgba(0,0,0,0.6)] shrink-0 flex flex-col items-center justify-center text-white relative"
            >
              <div className="absolute top-0.5 left-1.5 w-3.5 h-1.5 bg-white/60 rounded-full" />
              <div className="bg-white text-slate-950 rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center font-black text-[10px] sm:text-xs">
                B
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[9px] sm:text-[10px] text-amber-400 font-extrabold uppercase tracking-widest">{t('bingo.winnerBall') || "BOLA SORTEADA!"}</p>
              <h2 className="text-xl sm:text-2xl font-black text-white truncate drop-shadow-md leading-tight">{winner.text}</h2>
            </div>
          </div>

          <div className="flex flex-row gap-2.5">
            <button 
              onClick={() => {
                stopWinSound();
                const state = useAppStore.getState();
                if (winner.drawId) {
                  state.setResults(prev => prev.filter(r => r.drawId !== winner.drawId));
                }
                setWinner(null);
              }}
              className="flex-1 bg-slate-900 hover:bg-red-600 text-slate-300 hover:text-white px-3 sm:px-4 py-2.5 rounded-xl font-black text-xs transition-all border border-slate-800"
            >
              {t('horizonDisplay.reject').toUpperCase()}
            </button>
            <button 
              onClick={() => {
                stopWinSound();
                if (isGrandWinner) {
                    const state = useAppStore.getState();
                    state.setItems(state.items.map(i => ({ ...i, enabled: true })));
                    state.setPityWeights({});
                    setWinner(null);
                } else {
                    if (autoRemoveWinner) {
                      handleRemoveItem(winner.id);
                    }
                    setWinner(null);
                }
              }}
              className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 px-3 sm:px-4 py-2.5 rounded-xl font-black text-xs transition-all shadow-lg border-b-2 border-amber-700"
            >
              {t('horizonDisplay.accept').toUpperCase()}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (wheelType === 'horizon') {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 transition-all animate-in fade-in duration-300">
      <div className="bg-slate-900/95 px-6 sm:px-10 py-8 sm:py-12 rounded-[2rem] max-w-[90vw] sm:max-w-lg w-full shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7)] border border-slate-700/50 text-center relative overflow-hidden group">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[150%] h-40 bg-amber-500/10 blur-[80px] pointer-events-none" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[150%] h-40 bg-emerald-500/10 blur-[80px] pointer-events-none" />
        
        <Icon className={`mx-auto ${iconColor} mb-4 sm:mb-6 drop-shadow-[0_0_30px_${dropShadowColor}] relative z-10 animate-bounce w-16 h-16 sm:w-20 sm:h-20`} />
        
        <p className="text-xs sm:text-sm text-amber-400 font-extrabold uppercase tracking-widest mb-2 sm:mb-3 relative z-10">{customMessage}</p>
        
        <h2 className="text-4xl sm:text-5xl font-black text-white mb-8 sm:mb-10 break-words relative z-10 drop-shadow-md leading-tight">{winner.text}</h2>
        
        <div className="flex flex-row gap-3 sm:gap-4 w-full justify-center relative z-10">
          <button 
            onClick={() => {
              stopWinSound();
              const state = useAppStore.getState();
              if (winner.drawId) {
                state.setResults(prev => prev.filter(r => r.drawId !== winner.drawId));
              }
              setWinner(null);
            }}
            className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 px-2 sm:px-6 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl font-bold text-xs sm:text-sm transition-all duration-200 border border-red-500/30 hover:border-red-500/50"
          >
            {t('horizonDisplay.reject').toUpperCase()}
          </button>
          <button 
            onClick={() => {
              stopWinSound();
              if (isGrandWinner) {
                  const state = useAppStore.getState();
                  state.setItems(state.items.map(i => ({ ...i, enabled: true })));
                  state.setPityWeights({});
                  setWinner(null);
              } else {
                  if (autoRemoveWinner) {
                    handleRemoveItem(winner.id);
                  }
                  setWinner(null);
              }
            }}
            className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 px-2 sm:px-6 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl font-bold text-xs sm:text-sm transition-all duration-200 shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] border border-emerald-400 hover:border-emerald-300"
          >
            {t('horizonDisplay.accept').toUpperCase()}
          </button>
        </div>
      </div>
    </div>
  );
};
