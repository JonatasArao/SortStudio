import React, { useEffect } from 'react';
import { Trophy, Crown } from 'lucide-react';
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
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center justify-center transition-all animate-in slide-in-from-bottom-10 fade-in duration-500 w-full max-w-lg px-4">
        <div className="bg-slate-950/90 border border-amber-500/30 backdrop-blur-xl px-5 py-4 rounded-2xl w-full shadow-[0_10px_40px_rgba(0,0,0,0.8)] text-center flex flex-col gap-4 relative overflow-hidden">
            
            {/* Race finish flag pattern decorative top bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-[repeating-linear-gradient(45deg,#fff,#fff_10px,#000_10px,#000_20px)] opacity-50"></div>
            
            <div className="flex items-center gap-4 text-left">
               <Icon className={`${iconColor} drop-shadow-[0_0_15px_${dropShadowColor}] animate-bounce`} size={40} />
               <div className="flex-1">
                 <p className="text-[10px] text-amber-400 font-black uppercase tracking-[0.2em]">{customMessage}</p>
                 <h2 className="text-xl font-black text-white drop-shadow-lg leading-tight uppercase italic truncate">{winner.text}</h2>
               </div>
            </div>

            {/* Compact Visual Podium Steps */}
            {racePodium && racePodium.length > 0 && (
              <div className="flex items-center justify-center gap-3 w-full bg-slate-900/50 rounded-xl p-2 border border-slate-800/50">
                
                {/* 2nd Place Step */}
                {racePodium[1] && (
                  <div className="flex items-center gap-2 flex-1 min-w-0 transition-all duration-500 delay-100">
                    <div className="w-6 h-6 rounded-full border border-slate-400 flex-shrink-0 flex items-center justify-center font-black text-white text-[10px]" style={{ backgroundColor: racePodium[1].color }}>2</div>
                    <div className="text-[10px] font-bold text-slate-300 truncate">{racePodium[1].text}</div>
                  </div>
                )}

                {/* 1st Place Step */}
                {racePodium[0] && (
                  <div className="flex items-center gap-2 flex-1 min-w-0 transition-all duration-500 bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20">
                    <div className="w-7 h-7 rounded-full border-2 border-yellow-400 flex-shrink-0 flex items-center justify-center font-black text-slate-950 text-xs shadow-[0_0_10px_rgba(250,204,21,0.3)]" style={{ backgroundColor: racePodium[0].color }}>1</div>
                    <div className="text-xs font-black text-yellow-400 truncate">{racePodium[0].text}</div>
                  </div>
                )}

                {/* 3rd Place Step */}
                {racePodium[2] && (
                  <div className="flex items-center gap-2 flex-1 min-w-0 transition-all duration-500 delay-200">
                    <div className="w-6 h-6 rounded-full border border-amber-700 flex-shrink-0 flex items-center justify-center font-black text-white text-[10px]" style={{ backgroundColor: racePodium[2].color }}>3</div>
                    <div className="text-[10px] font-bold text-amber-600 truncate">{racePodium[2].text}</div>
                  </div>
                )}
              </div>
            )}
            
            <div className="flex flex-row gap-3 w-full mt-1">
              <button 
                onClick={() => {
                  stopWinSound();
                  const state = useAppStore.getState();
                  if (winner.drawId) {
                    state.setResults(prev => prev.filter(r => r.drawId !== winner.drawId));
                  }
                  setWinner(null);
                }}
                className="flex-1 bg-slate-800/80 hover:bg-red-600/90 text-slate-300 hover:text-white px-3 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-wider transition-colors border border-slate-700/50"
              >
                {t('horizonDisplay.reject')}
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
                className="flex-[2] bg-amber-500 hover:bg-amber-400 text-slate-900 px-3 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-wider transition-colors shadow-[0_0_15px_rgba(245,158,11,0.2)] border border-amber-600 flex items-center justify-center gap-2"
              >
                {t('horizonDisplay.accept')}
              </button>
            </div>
        </div>
      </div>
    );
  }

  if (wheelType === 'penalty_shootout') {
    return (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] flex sm:flex-row flex-col items-center justify-center p-4 transition-all animate-in slide-in-from-bottom-10 fade-in duration-300 w-full max-w-4xl">
        <div className="bg-slate-950/80 backdrop-blur-xl px-6 py-5 rounded-3xl w-full shadow-[0_0_80px_rgba(16,185,129,0.25)] border border-emerald-500/40 text-center flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex-1 text-left flex flex-col">
              <div className="flex items-center gap-3">
                 <Icon className={`${iconColor} drop-shadow-[0_0_10px_${dropShadowColor}] animate-bounce`} size={32} />
                 <div>
                   <p className="text-xs text-emerald-400 font-bold uppercase tracking-[0.2em]">{customMessage}</p>
                   <h2 className="text-2xl font-extrabold text-white break-words drop-shadow-lg leading-tight line-clamp-2">{winner.text}</h2>
                 </div>
              </div>
            </div>
            
            <div className="flex flex-row gap-3">
              <button 
                onClick={() => {
                  stopWinSound();
                  const state = useAppStore.getState();
                  if (winner.drawId) {
                    state.setResults(prev => prev.filter(r => r.drawId !== winner.drawId));
                  }
                  setWinner(null);
                }}
                className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 shadow-[0_0_20px_rgba(239,68,68,0.2)] text-white px-5 py-3 rounded-xl font-black text-sm transition-all hover:-translate-y-1"
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
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-[0_0_20px_rgba(16,185,129,0.2)] text-white px-5 py-3 rounded-xl font-black text-sm transition-all hover:-translate-y-1"
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
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] flex sm:flex-row flex-col items-center justify-center p-4 transition-all animate-in slide-in-from-bottom-10 fade-in duration-300 w-full max-w-4xl">
        <div className="bg-slate-950/80 backdrop-blur-xl px-6 py-5 rounded-3xl w-full shadow-[0_0_80px_rgba(245,158,11,0.25)] border border-amber-500/40 text-center flex flex-col sm:flex-row items-center gap-6">
            <div className="flex-1 text-left sm:flex flex-col">
              <div className="flex items-center gap-3">
                 <Icon className={`${iconColor} drop-shadow-[0_0_10px_${dropShadowColor}] animate-bounce`} size={32} />
                 <div>
                   <p className="text-xs text-amber-500/80 font-bold uppercase tracking-[0.2em]">{customMessage}</p>
                   <h2 className="text-2xl font-extrabold text-white break-words drop-shadow-lg leading-tight line-clamp-2">{winner.text}</h2>
                 </div>
              </div>
            </div>
            
            <div className="flex flex-row gap-3">
              <button 
                onClick={() => {
                  stopWinSound();
                  const state = useAppStore.getState();
                  if (winner.drawId) {
                    state.setResults(prev => prev.filter(r => r.drawId !== winner.drawId));
                  }
                  setWinner(null);
                }}
                className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 shadow-[0_0_20px_rgba(239,68,68,0.2)] text-white px-5 py-3 rounded-xl font-black text-sm transition-all hover:-translate-y-1"
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
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-[0_0_20px_rgba(16,185,129,0.2)] text-white px-5 py-3 rounded-xl font-black text-sm transition-all hover:-translate-y-1"
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
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center justify-center p-4 transition-all animate-in slide-in-from-bottom-10 fade-in duration-300 w-full max-w-xl">
        <div className="bg-slate-950/90 backdrop-blur-xl px-6 py-5 rounded-3xl w-full shadow-[0_0_80px_rgba(245,158,11,0.35)] border-2 border-amber-500/50 text-center flex flex-col sm:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-4 text-left">
            <div 
              style={{ backgroundColor: winner.color || '#3b82f6' }}
              className="w-16 h-16 rounded-full border-2 border-white shadow-[inset_-4px_-4px_8px_rgba(0,0,0,0.6),0_6px_15px_rgba(0,0,0,0.6)] shrink-0 flex flex-col items-center justify-center text-white relative"
            >
              <div className="absolute top-1 left-2 w-5 h-2 bg-white/60 rounded-full" />
              <div className="bg-white text-slate-950 rounded-full w-7 h-7 flex items-center justify-center font-black text-xs">
                B
              </div>
            </div>
            <div>
              <p className="text-[10px] text-amber-400 font-extrabold uppercase tracking-widest">{t('bingo.winnerBall') || "BOLA SORTEADA!"}</p>
              <h2 className="text-2xl font-black text-white break-words drop-shadow-md leading-tight">{winner.text}</h2>
            </div>
          </div>

          <div className="flex flex-row gap-2.5 shrink-0">
            <button 
              onClick={() => {
                stopWinSound();
                const state = useAppStore.getState();
                if (winner.drawId) {
                  state.setResults(prev => prev.filter(r => r.drawId !== winner.drawId));
                }
                setWinner(null);
              }}
              className="bg-slate-900 hover:bg-red-600 text-slate-300 hover:text-white px-4 py-2.5 rounded-xl font-black text-xs transition-all border border-slate-800"
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
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 px-5 py-2.5 rounded-xl font-black text-xs transition-all shadow-lg border-b-2 border-amber-700"
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 transition-all animate-in fade-in duration-300">
      <div className="bg-slate-950/85 px-8 sm:px-12 py-12 rounded-[2.5rem] max-w-lg w-full shadow-[0_0_100px_rgba(245,158,11,0.25)] border border-slate-800/80 text-center animate-in zoom-in-95 duration-500 relative overflow-hidden group">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[200%] h-32 bg-amber-500/5 blur-[60px] pointer-events-none" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[200%] h-32 bg-fuchsia-500/5 blur-[60px] pointer-events-none" />
        
        <Icon className={`mx-auto ${iconColor} mb-6 drop-shadow-[0_0_25px_${dropShadowColor}] relative z-10 animate-[bounce_2s_infinite]`} size={90} />
        <p className="text-sm text-amber-500/90 font-black uppercase tracking-[0.4em] mb-4 relative z-10 drop-shadow-md">{customMessage}</p>
        <h2 className="text-4xl sm:text-6xl font-black text-white mb-12 break-words relative z-10 drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)] leading-tight">{winner.text}</h2>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center relative z-10">
          <button 
            onClick={() => {
              stopWinSound();
              // Rejeitado: removemos do historico para que nao seja contabilizado
              const state = useAppStore.getState();
              if (winner.drawId) {
                state.setResults(prev => prev.filter(r => r.drawId !== winner.drawId));
              }
              setWinner(null);
            }}
            className="flex-1 bg-gradient-to-br from-slate-900 to-slate-950 hover:from-red-600 hover:to-rose-700 text-slate-300 hover:text-white px-6 py-4 rounded-2xl font-black text-lg transition-all duration-300 hover:-translate-y-1 shadow-lg hover:shadow-[0_10px_30px_rgba(239,68,68,0.4)] border border-slate-800 hover:border-red-500/50"
          >
            {t('horizonDisplay.reject').toUpperCase()}
          </button>
          <button 
            onClick={() => {
              stopWinSound();
              // Aceitado: fluxo normal
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
            className="flex-1 bg-gradient-to-br from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 shadow-[0_10px_30px_rgba(245,158,11,0.3)] hover:shadow-[0_15px_40px_rgba(245,158,11,0.5)] text-white px-6 py-4 rounded-2xl font-black text-lg transition-all duration-300 hover:-translate-y-1 border-b-4 border-orange-700 hover:border-orange-600 active:translate-y-1 active:border-b-0"
          >
            {t('horizonDisplay.accept').toUpperCase()}
          </button>
        </div>
      </div>
    </div>
  );
};
