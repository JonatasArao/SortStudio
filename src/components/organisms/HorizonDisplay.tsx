import React, { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useWheelData } from '../../hooks/useWheelData';
import { useWheelActions } from '../../hooks/useWheelActions';
import { useTranslation } from 'react-i18next';

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

export const HorizonDisplay = () => {
  const { t } = useTranslation();
  const isSpinning = useAppStore(s => s.isSpinning);
  const rotation = useAppStore(s => s.rotation);
  const spinTime = useAppStore(s => s.spinTime);
  const eliminationMode = useAppStore(s => s.eliminationMode);
  const eliminationSpinTime = useAppStore(s => s.eliminationSpinTime);
  const winner = useAppStore(s => s.winner);
  const setWinner = useAppStore(s => s.setWinner);
  const autoRemoveWinner = useAppStore(s => s.autoRemoveWinner);
  
  const { validItems, slices } = useWheelData();
  const { spinWheel, handleRemoveItem, stopWinSound } = useWheelActions();

  const isFinalRound = eliminationMode && validItems.length === 2;
  const actualSpinTime = isFinalRound 
    ? spinTime 
    : (eliminationMode ? eliminationSpinTime : spinTime);

  const [currentRotation, setCurrentRotation] = useState(rotation);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (isSpinning) {
      let startTime = performance.now();
      const startRotation = currentRotation;
      const targetRotation = rotation;

      const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

      const animate = (time: number) => {
        const elapsed = (time - startTime) / 1000;
        let progress = elapsed / actualSpinTime;
        if (progress > 1) progress = 1;

        const currentEasedProgress = easeOut(progress);
        setCurrentRotation(startRotation + (targetRotation - startRotation) * currentEasedProgress);

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          setCurrentRotation(targetRotation);
        }
      };
      
      animationRef.current = requestAnimationFrame(animate);
      return () => {
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
      }
    } else {
      setCurrentRotation(rotation);
    }
  }, [isSpinning, rotation, actualSpinTime]);

  const spinWheelRef = useRef(spinWheel);
  useEffect(() => {
    spinWheelRef.current = spinWheel;
  }, [spinWheel]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid if typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
         return;
      }
      if (e.ctrlKey && e.key === 'Enter') {
         if (!isSpinning && !winner && validItems.length >= 2) {
            spinWheelRef.current();
         }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSpinning, winner, validItems.length]);

  const REEL_PORTION = 100;
  const TOTAL_HEIGHT = REEL_PORTION * Math.max(1, validItems.length); // Dynamic height roughly based on items count
  const ITEM_BASE_HEIGHT = TOTAL_HEIGHT; // so we map 360 to height

  // In classic: pointer is at 90 deg (3 o'clock). The top of the wheel is 270 deg / -90 deg.
  // Wheel offset is -90 deg.
  // The relative angle pointing to the 3 o'clock is (90 - rot) mod 360.
  // Let's use the same target logic so results map identically to classic.
  // We want the item that has (90 - rot(modulo 360) + 360)%360 within [startAngle, endAngle) to be centered.
  
  const wheelTheme = useAppStore(state => state.wheelTheme);

  // Offset logic
  const pointerAngle = ((90 - currentRotation) % 360 + 360) % 360;
  const offsetY = (pointerAngle / 360) * TOTAL_HEIGHT;

  // Theme Variables
  let bgGradient = "from-[#1a2530] via-[#0d131a] to-[#251000]";
  let outerGlow = "bg-orange-500/5 blur-[100px]";
  let containerBorder = "border-slate-700/50";
  let pointerColor = "border-l-orange-500 border-r-orange-500";
  let targetAreaClass = "border-white/20 bg-white/5";
  let targetAreaActive = "border-orange-400 bg-orange-500/10";
  let containerInnerBg = "bg-[#1a1b26]";
  let bgPattern = <div className="absolute inset-0 opacity-[0.02] bg-[radial-gradient(#fff_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none transition-all duration-500"></div>;

  switch (wheelTheme) {
    case 'neon':
      bgGradient = "from-[#0a0014] via-[#15002b] to-[#0a0014]";
      outerGlow = "bg-fuchsia-600/30 blur-[120px]";
      containerBorder = "border-cyan-500/50 shadow-[0_0_50px_rgba(6,182,212,0.3)]";
      pointerColor = "border-l-cyan-400 border-r-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.8)]";
      targetAreaClass = "border-fuchsia-500/30 bg-fuchsia-500/10";
      targetAreaActive = "border-cyan-400 bg-cyan-400/20 shadow-[0_0_40px_rgba(34,211,238,0.5)]";
      containerInnerBg = "bg-[#090014]";
      bgPattern = (
        <div className="absolute inset-0 opacity-20 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none transition-all duration-500">
           <div className="absolute inset-0 bg-gradient-to-t from-fuchsia-900/10 to-transparent"></div>
        </div>
      );
      break;
    case 'casino':
      bgGradient = "from-[#3b0918] via-[#1a0000] to-[#2d1b00]";
      outerGlow = "bg-amber-500/30 blur-[120px]";
      containerBorder = "border-amber-600/60 shadow-[0_0_60px_rgba(245,158,11,0.2)]";
      pointerColor = "border-l-amber-400 border-r-amber-400 drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]";
      targetAreaClass = "border-amber-500/30 bg-amber-500/5";
      targetAreaActive = "border-amber-300 bg-amber-400/20 shadow-[0_0_50px_rgba(251,191,36,0.3)]";
      containerInnerBg = "bg-[#2d1b00]";
      bgPattern = (
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,rgba(255,215,0,0.15)_0%,transparent_100%)] bg-[size:20px_20px] pointer-events-none transition-all duration-500">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMSIvPgo8cGF0aCBkPSJNMCAwTDggOFpNOCAwTDAgOFoiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLW9wYWNpdHk9IjAuMDUiIHN0cm9rZS13aWR0aD0iMSIvPgo8L3N2Zz4=')] opacity-30"></div>
        </div>
      );
      break;
    case 'candy':
      bgGradient = "from-[#ffe4e6] via-[#fbcfe8] to-[#e0e7ff]";
      outerGlow = "bg-pink-400/40 blur-[100px]";
      containerBorder = "border-white shadow-[0_15px_50px_rgba(244,114,182,0.3)]";
      pointerColor = "border-l-pink-500 border-r-pink-500 drop-shadow-[0_0_10px_rgba(236,72,153,0.5)]";
      targetAreaClass = "border-pink-300 bg-pink-100/50";
      targetAreaActive = "border-pink-500 bg-pink-300/40 shadow-[0_0_30px_rgba(244,114,182,0.4)]";
      containerInnerBg = "bg-white";
      bgPattern = (
        <div className="absolute inset-0 opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMTgiIGN5PSIxOCIgcj0iMiIgZmlsbD0iI2Y0NzJiNiIvPjwvc3ZnPg==')] pointer-events-none transition-all duration-500"></div>
      );
      break;
    case 'dark':
      bgGradient = "from-[#0a0a0a] via-[#121212] to-[#000000]";
      outerGlow = "bg-zinc-500/10 blur-[100px]";
      containerBorder = "border-zinc-800";
      pointerColor = "border-l-zinc-300 border-r-zinc-300";
      targetAreaClass = "border-zinc-700 bg-zinc-800/50";
      targetAreaActive = "border-gray-200 bg-gray-100/10 shadow-[0_0_30px_rgba(255,255,255,0.05)]";
      containerInnerBg = "bg-[#0a0a0a]";
      bgPattern = (
        <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#fff_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none transition-all duration-500"></div>
      );
      break;
  }

  return (
    <div className={`flex-1 flex flex-col items-center justify-center p-4 lg:p-8 relative bg-gradient-to-br ${bgGradient} overflow-hidden min-h-0 transition-colors duration-500`}>
      {bgPattern}
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] md:w-[600px] md:h-[600px] ${outerGlow} rounded-full pointer-events-none transition-colors duration-500`} />

      {/* Reel Container */}
      <div 
        onClick={() => {
           if (!isSpinning && !winner && validItems.length >= 2) spinWheel();
        }}
        className={`w-[90vw] md:w-[500px] h-[60vh] md:h-[500px] ${containerInnerBg} rounded-[2rem] relative overflow-hidden shadow-2xl border transition-all duration-500 box-border
          ${!isSpinning && !winner && validItems.length >= 2 ? `cursor-pointer hover:scale-[1.02] ${containerBorder}` : `border-transparent`}
          ${!isSpinning && winner ? 'shadow-[0_0_80px_rgba(255,0,85,0.2)] border-orange-500/50 scale-100' : 'opacity-95'}
        `}
      >
        
        {/* Transparent frame highlight for winning row */}
        <div className="absolute top-1/2 left-0 w-full h-[120px] -translate-y-1/2 z-30 pointer-events-none box-border flex items-center justify-between transition-all duration-500">
            {/* The white frame in the center */}
            <div className={`absolute inset-0 border-y-[4px] pointer-events-none transition-all duration-500 ${!isSpinning && winner ? targetAreaActive : targetAreaClass} shadow-[inset_0_0_30px_rgba(0,0,0,0.6)] bg-gradient-to-r from-black/20 via-transparent to-black/20`}></div>
            {/* Small triangles pointing inward */}
            <div className={`w-0 h-0 border-y-[16px] border-y-transparent border-l-[20px] ${pointerColor} drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] z-40 relative transition-colors duration-500 -ml-1`}></div>
            <div className={`w-0 h-0 border-y-[16px] border-y-transparent border-r-[20px] ${pointerColor} drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] z-40 relative transition-colors duration-500 -mr-1`}></div>
        </div>

        {/* The reel */}
        <div className="absolute left-0 right-0 top-1/2" style={{ transform: `translateY(-${offsetY}px)` }}>
            {/* We render 5 copies of the entire 360-degree reel to support continuous scrolling up/down indefinitely */}
            {[-2, -1, 0, 1, 2].map((copyIndex) => (
              <div key={copyIndex} className="absolute left-0 right-0" style={{ top: `${copyIndex * TOTAL_HEIGHT}px`, height: `${TOTAL_HEIGHT}px` }}>
                {slices.map((slice, i) => {
                  const top = (slice.startAngle / 360) * TOTAL_HEIGHT;
                  const height = (slice.angle / 360) * TOTAL_HEIGHT;
                  
                  // Limit the visual text size so tiny slices don't overflow completely
                  const isTiny = slice.angle < 5;
                  const textColor = getContrastYIQ(slice.color);
                  
                  return (
                     <div key={i} className="absolute left-0 w-full p-2 box-border border-b-[4px] border-black/60 shadow-[inset_0_2px_4px_rgba(255,255,255,0.1)]" style={{ top: `${top}px`, height: `${height}px`}}>
                        <div className="w-full h-full rounded-md shadow-[inset_0_0_20px_rgba(0,0,0,0.3)] flex overflow-hidden relative group border-[2px] border-black/20" style={{ backgroundColor: slice.color }}>
                            {/* Inner gradient to give cylindrical shading on items */}
                            <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/10 pointer-events-none"></div>
                            
                            {slice.item.image && (
                              <div className="h-full min-w-[80px] md:min-w-[120px] bg-white/10 flex items-center justify-center p-2 border-r-[3px] border-black/20 z-10">
                                <img src={slice.item.image} className="h-full w-full object-contain drop-shadow-lg" alt="" />
                              </div>
                            )}
                            <div className="flex-1 flex flex-col justify-center px-6 relative z-10">
                                <span className={`font-black uppercase tracking-widest truncate drop-shadow-md ${isTiny ? 'text-sm' : 'text-3xl md:text-5xl'}`} style={{ color: textColor }}>
                                  {slice.item.text}
                                </span>
                                {/* Background stylistic element */}
                                <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-white/20 to-transparent pointer-events-none mix-blend-overlay"></div>
                            </div>
                        </div>
                     </div>
                  );
                })}
              </div>
            ))}
        </div>
        
        {/* Top/Bottom shadows for depth (Cylindrical Illusion) */}
        <div className="absolute top-0 left-0 w-full h-[120px] bg-gradient-to-b from-black/95 via-black/40 to-transparent z-40 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-full h-[120px] bg-gradient-to-t from-black/95 via-black/40 to-transparent z-40 pointer-events-none"></div>
        
        {/* Curved Glass Reflection */}
        <div className="absolute inset-0 bg-gradient-to-tr from-white/5 via-transparent to-white/10 pointer-events-none z-50 mix-blend-overlay"></div>
        
      </div>

      {/* Action Area */}
      <div className="mt-8 flex flex-col items-center gap-4 relative z-50 h-[120px]">
        {!isSpinning && !winner && validItems.length >= 2 && (
          <div className="flex flex-col items-center gap-2 animate-in fade-in zoom-in-95 duration-300">
            <p className="text-white/40 text-xs font-bold uppercase tracking-widest leading-none">{t('horizonDisplay.pressEnter')}</p>
          </div>
        )}

        {isSpinning && (
          <div className="text-amber-500/80 font-black text-2xl uppercase tracking-[0.4em] animate-pulse">
            {t('horizonDisplay.spinning')}
          </div>
        )}

        {!isSpinning && winner && (
          <div className="flex flex-col items-center gap-4 animate-in slide-in-from-bottom-5 fade-in duration-300">
            <h3 className="text-orange-400 font-extrabold text-2xl uppercase tracking-widest drop-shadow-[0_0_10px_rgba(249,115,22,0.8)]">
              {winner.type === 'grand_winner' ? t('horizonDisplay.grandWinner') : t('horizonDisplay.winner')}
            </h3>
            <div className="flex w-full justify-center gap-4">
               <button 
                 onClick={(e) => {
                   e.stopPropagation();
                   stopWinSound();
                   const state = useAppStore.getState();
                   if (winner.drawId) {
                     state.setResults(prev => prev.filter(r => r.drawId !== winner.drawId));
                   }
                   setWinner(null);
                 }}
                 className="flex-1 max-w-[200px] bg-gradient-to-r from-red-600/25 to-rose-600/25 hover:from-red-600 hover:to-rose-600 text-red-200 hover:text-white px-6 py-3 rounded-2xl font-black text-base transition-all duration-300 hover:-translate-y-1 shadow-[0_10px_30px_rgba(239,68,68,0.15)] hover:shadow-[0_10px_30px_rgba(239,68,68,0.35)] border border-red-500/30 uppercase tracking-wider"
               >
                 {t('horizonDisplay.reject')}
               </button>
               <button 
                 onClick={(e) => {
                   e.stopPropagation();
                   stopWinSound();
                   if (winner.type === 'grand_winner') {
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
                 className="flex-1 max-w-[200px] bg-gradient-to-r from-emerald-600/25 to-teal-600/25 hover:from-emerald-600 hover:to-teal-600 text-emerald-200 hover:text-white px-6 py-3 rounded-2xl font-black text-base transition-all duration-300 hover:-translate-y-1 shadow-[0_10px_30px_rgba(16,185,129,0.15)] hover:shadow-[0_10px_30px_rgba(16,185,129,0.35)] border border-emerald-500/30 uppercase tracking-wider"
               >
                 {t('horizonDisplay.accept')}
               </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
