import React, { useEffect, useRef, useState, useMemo } from 'react';
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

export const MysteryBoxDisplay = () => {
  const { t } = useTranslation();
  const isSpinning = useAppStore(s => s.isSpinning);
  const winner = useAppStore(s => s.winner);
  const eliminationMode = useAppStore(s => s.eliminationMode);
  const spinTime = useAppStore(s => s.spinTime);
  const eliminationSpinTime = useAppStore(s => s.eliminationSpinTime);

  const { validItems, slices } = useWheelData();
  const { spinWheel } = useWheelActions();

  // Highlight and user selection
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
  const [userSelectedIndex, setUserSelectedIndex] = useState<number | null>(null);
  
  // Mapping of which item is in which box (by index)
  const [boxMapping, setBoxMapping] = useState<Record<number, any>>({});
  const [winnerBoxIndex, setWinnerBoxIndex] = useState<number | null>(null);
  
  // Control which boxes are flipped (revealed)
  const [revealedBoxes, setRevealedBoxes] = useState<Record<number, boolean>>({});

  // Dynamic drawing stages progress and effects
  const [spinProgress, setSpinProgress] = useState(0);
  const [spinStatusText, setSpinStatusText] = useState("");
  const [showFlash, setShowFlash] = useState(false);

  // Reset phase when there's no spin and no winner
  useEffect(() => {
    if (!isSpinning && !winner) {
      setBoxMapping({});
      setWinnerBoxIndex(null);
      setRevealedBoxes({});
      setHighlightedIndex(null);
      setUserSelectedIndex(null);
    }
  }, [isSpinning, winner]);

  // Progress tracker & playful stage titles
  useEffect(() => {
    if (isSpinning) {
       setSpinProgress(0);
       const duration = (eliminationMode ? eliminationSpinTime : spinTime) * 1000;
       const startTime = performance.now();
       let animId: number;
       
       const update = (now: number) => {
         const elapsed = now - startTime;
         const pct = Math.min((elapsed / duration) * 100, 100);
         setSpinProgress(pct);
         
         if (pct < 25) {
            setSpinStatusText(t("mysteryBox.shuffling_stage_1"));
         } else if (pct < 55) {
            setSpinStatusText(t("mysteryBox.shuffling_stage_2"));
         } else if (pct < 85) {
            setSpinStatusText(t("mysteryBox.shuffling_stage_3"));
         } else {
            setSpinStatusText(t("mysteryBox.shuffling_stage_4"));
         }

         if (elapsed < duration) {
            animId = requestAnimationFrame(update);
         }
       };
       animId = requestAnimationFrame(update);
       return () => cancelAnimationFrame(animId);
    } else {
       setSpinProgress(0);
       setSpinStatusText("");
    }
  }, [isSpinning, spinTime, eliminationSpinTime, eliminationMode, t]);

  // Flash explosion when winner is set
  useEffect(() => {
    if (winner && !isSpinning) {
       setShowFlash(true);
       const t = setTimeout(() => setShowFlash(false), 800);
       return () => clearTimeout(t);
    }
  }, [winner, isSpinning]);

  // Spinning loop: fast shuffle highlight
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isSpinning) {
       let lastBox = -1;
       interval = setInterval(() => {
         let randomBox = Math.floor(Math.random() * validItems.length);
         if (randomBox === lastBox && validItems.length > 1) {
            randomBox = (randomBox + 1) % validItems.length;
         }
         lastBox = randomBox;
         setHighlightedIndex(randomBox);
       }, 75);
    }
    return () => {
       if (interval) clearInterval(interval);
    };
  }, [isSpinning, validItems.length]);

  // When spin finishes and a winner is chosen
  useEffect(() => {
    if (winner && !isSpinning && validItems.length > 0) {
      let winIdx = userSelectedIndex;
      if (winIdx === null || winIdx >= validItems.length) {
         winIdx = Math.floor(Math.random() * validItems.length);
         setWinnerBoxIndex(winIdx);
         setHighlightedIndex(winIdx); // Lock highlight to the winner
         
         const unchosenItems = validItems.filter(i => i.id !== winner.id);
         for (let i = unchosenItems.length - 1; i > 0; i--) {
           const j = Math.floor(Math.random() * (i + 1));
           [unchosenItems[i], unchosenItems[j]] = [unchosenItems[j], unchosenItems[i]];
         }

         const newMapping: Record<number, any> = {};
         let unchosenCursor = 0;
         for (let i = 0; i < validItems.length; i++) {
            if (i === winIdx) {
               newMapping[i] = winner;
            } else {
               newMapping[i] = unchosenItems[unchosenCursor++] || validItems[0]; // fallback
            }
         }
         setBoxMapping(newMapping);
      } else {
         setWinnerBoxIndex(winIdx);
         setHighlightedIndex(winIdx);
      }

      // Reveal sequence
      // 1. Reveal winner box immediately
      setRevealedBoxes({ [winIdx]: true });

      // 2. Reveal all others after a short delay
      const t = setTimeout(() => {
         const allRevealed: Record<number, boolean> = {};
         for (let i = 0; i < validItems.length; i++) allRevealed[i] = true;
         setRevealedBoxes(allRevealed);
      }, 1500);

      return () => clearTimeout(t);
    }
  }, [winner, isSpinning, validItems, userSelectedIndex]);

  const spinWheelRef = useRef(spinWheel);
  useEffect(() => {
    spinWheelRef.current = spinWheel;
  }, [spinWheel]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.ctrlKey && e.key === 'Enter') {
         if (!isSpinning && validItems.length >= 2 && !winner) {
            spinWheelRef.current();
         }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSpinning, validItems.length, winner]);

  const handleBoxClick = (index: number) => {
    if (!isSpinning && !winner && validItems.length >= 2) {
       setUserSelectedIndex(index);
       setHighlightedIndex(index);
       
       const shuffledItems = [...validItems];
       for (let i = shuffledItems.length - 1; i > 0; i--) {
         const j = Math.floor(Math.random() * (i + 1));
         [shuffledItems[i], shuffledItems[j]] = [shuffledItems[j], shuffledItems[i]];
       }
       
       const newMapping: Record<number, any> = {};
       for (let i = 0; i < shuffledItems.length; i++) {
         newMapping[i] = shuffledItems[i];
       }
       setBoxMapping(newMapping);
       
       spinWheelRef.current(true, false, shuffledItems[index].id); 
    }
  };

  const startRandomSpin = () => {
    if (!isSpinning && !winner && validItems.length >= 2) {
       setUserSelectedIndex(null); // System picks
       spinWheelRef.current(false, false); // false for fastSpin, false for ignoreWeights
    }
  };

  const wheelTheme = useAppStore(state => state.wheelTheme);
  
  // Theme Variables
  let bgGradient = "from-[#1c1836] via-[#100e1f] to-[#0a0812]";
  let outerGlow = "bg-orange-500/5 blur-[100px]";
  let containerBorder = "border-[#f59e0b]/40 border-[4px] shadow-amber-900/50";
  let innerBg = "bg-[#0b0a14]";
  let targetAreaClass = "border-amber-500/50 bg-amber-500/5 shadow-[0_0_50px_rgba(245,158,11,0.15)]";

  // Briefcase specific styling
  let boxFrontBodyClass = "from-slate-100 via-slate-200 to-slate-400";
  let handleBorderClass = "border-slate-800";
  let mountClass = "bg-slate-500 border border-slate-600";
  let latchClass = "bg-slate-300 border-slate-400 text-slate-700";
  let cornerClass = "border-slate-400 bg-slate-300/80";
  let badgeClass = "bg-gradient-to-br from-red-600 via-red-700 to-rose-900 border-2 border-slate-200 text-white shadow-[0_4px_10px_rgba(0,0,0,0.45)] w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center";

  let boxHighlightClass = "ring-4 ring-amber-400 border-amber-400 ring-offset-2 ring-offset-slate-900";
  let dropShadowColor = "rgba(245,158,11,0.6)";
  let bgPattern = <div className="absolute inset-0 opacity-[0.02] bg-[radial-gradient(#fff_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none transition-all duration-500"></div>;

  switch (wheelTheme) {
    case 'neon':
      bgGradient = "from-[#0a0014] via-[#15002b] to-[#0a0014]";
      outerGlow = "bg-fuchsia-600/30 blur-[120px]";
      containerBorder = "border-cyan-500/40 border-[4px] shadow-cyan-900/50";
      innerBg = "bg-[#090014]";
      targetAreaClass = "border-cyan-500/50 bg-cyan-500/10 shadow-[0_0_50px_rgba(6,182,212,0.25)]";
      
      boxFrontBodyClass = "from-[#1c003a] via-[#3d0073] to-[#0f0022]";
      handleBorderClass = "border-cyan-400";
      mountClass = "bg-fuchsia-600 border border-fuchsia-500";
      latchClass = "bg-zinc-800 border-cyan-500/50 text-cyan-400";
      cornerClass = "border-fuchsia-500/50 bg-fuchsia-950/40";
      badgeClass = "bg-gradient-to-br from-cyan-500 to-fuchsia-600 border-2 border-cyan-300 text-cyan-50 shadow-[0_0_15px_rgba(6,182,212,0.5)] w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center";

      boxHighlightClass = "ring-4 ring-cyan-400 border-cyan-400 ring-offset-2 ring-offset-[#090014]";
      dropShadowColor = "rgba(34,211,238,0.6)";
      bgPattern = (
        <div className="absolute inset-0 opacity-20 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none transition-all duration-500">
           <div className="absolute inset-0 bg-gradient-to-t from-fuchsia-900/10 to-transparent"></div>
        </div>
      );
      break;
    case 'casino':
      bgGradient = "from-[#3b0918] via-[#1a0000] to-[#2d1b00]";
      outerGlow = "bg-amber-500/30 blur-[120px]";
      containerBorder = "border-amber-600 border-[6px] border-dashed shadow-amber-900/80";
      innerBg = "bg-[#1a0000]";
      targetAreaClass = "border-yellow-500/80 bg-yellow-500/10 shadow-[0_0_60px_rgba(234,179,8,0.2)]";
      
      boxFrontBodyClass = "from-amber-200 via-yellow-400 to-amber-600";
      handleBorderClass = "border-amber-950";
      mountClass = "bg-amber-800 border border-amber-900";
      latchClass = "bg-yellow-500 border-amber-700 text-amber-950";
      cornerClass = "border-amber-700/60 bg-yellow-500/30";
      badgeClass = "bg-gradient-to-br from-red-600 via-red-800 to-black border-2 border-yellow-400 text-yellow-300 shadow-[0_4px_12px_rgba(0,0,0,0.6)] w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center font-serif italic";

      boxHighlightClass = "ring-4 ring-yellow-400 border-yellow-400 ring-offset-2 ring-offset-[#1a0000]";
      dropShadowColor = "rgba(251,191,36,0.6)";
      bgPattern = (
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,rgba(255,215,0,0.15)_0%,transparent_100%)] bg-[size:20px_20px] pointer-events-none transition-all duration-500">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMSIvPgo8cGF0aCBkPSJNMCAwTDggOFpNOCAwTDAgOFoiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLW9wYWNpdHk9IjAuMDUiIHN0cm9rZS13aWR0aD0iMSIvPgo8L3N2Zz4=')] opacity-30"></div>
        </div>
      );
      break;
    case 'candy':
      bgGradient = "from-[#ffe4e6] via-[#fbcfe8] to-[#e0e7ff]";
      outerGlow = "bg-pink-400/40 blur-[100px]";
      containerBorder = "border-pink-300 border-[6px] shadow-pink-300/50";
      innerBg = "bg-[#fff0f5]";
      targetAreaClass = "border-pink-400/80 bg-pink-100/50 shadow-[0_0_40px_rgba(244,114,182,0.3)]";
      
      boxFrontBodyClass = "from-pink-100 via-pink-200 to-pink-300";
      handleBorderClass = "border-pink-500";
      mountClass = "bg-pink-400 border border-pink-300";
      latchClass = "bg-pink-300 border-pink-400 text-pink-700";
      cornerClass = "border-pink-400 bg-pink-100/40";
      badgeClass = "bg-gradient-to-br from-fuchsia-400 to-pink-500 border-2 border-white text-white shadow-[0_4px_10px_rgba(0,0,0,0.2)] w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center";

      boxHighlightClass = "ring-4 ring-pink-400 border-pink-400 ring-offset-2 ring-offset-[#fff0f5]";
      dropShadowColor = "rgba(236,72,153,0.6)";
      bgPattern = (
        <div className="absolute inset-0 opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMTgiIGN5PSIxOCIgcj0iMiIgZmlsbD0iI2Y0NzJiNiIvPjwvc3ZnPg==')] pointer-events-none transition-all duration-500"></div>
      );
      break;
    case 'dark':
      bgGradient = "from-[#0a0a0a] via-[#121212] to-[#000000]";
      outerGlow = "bg-zinc-500/10 blur-[100px]";
      containerBorder = "border-zinc-800 border-[2px]";
      innerBg = "bg-[#0a0a0a]";
      targetAreaClass = "border-zinc-500/50 bg-zinc-800/30 shadow-[0_0_30px_rgba(255,255,255,0.05)]";
      
      boxFrontBodyClass = "from-zinc-800 via-zinc-900 to-black";
      handleBorderClass = "border-zinc-950";
      mountClass = "bg-zinc-700 border border-zinc-800";
      latchClass = "bg-zinc-800 border-zinc-700 text-zinc-400";
      cornerClass = "border-zinc-700 bg-zinc-900/60";
      badgeClass = "bg-gradient-to-br from-zinc-900 via-zinc-950 to-black border-2 border-zinc-700 text-zinc-100 shadow-[0_4px_10px_rgba(0,0,0,0.5)] w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center";

      boxHighlightClass = "ring-4 ring-white border-white ring-offset-2 ring-offset-[#0a0a0a]";
      dropShadowColor = "rgba(255,255,255,0.6)";
      bgPattern = (
        <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#fff_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none transition-all duration-500"></div>
      );
      break;
  }

  // Dimensions

  return (
    <div className={`flex-1 flex flex-col p-0 relative bg-gradient-to-br ${bgGradient} overflow-hidden min-h-0 items-center justify-center transition-all duration-500`}>
      {bgPattern}
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] md:w-[600px] md:h-[600px] ${outerGlow} rounded-full pointer-events-none transition-colors duration-500`} />
      
      <div className={`w-full h-full flex flex-col overflow-hidden relative transition-all duration-500 ${innerBg}`}>
         
         <div className={`border-b z-20 flex flex-col justify-center items-center py-4 relative overflow-hidden shrink-0 transition-all duration-500 shadow-md ${targetAreaClass}`}>
           {/* Glint effect */}
           <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[150%] animate-[shimmer_3s_infinite]"></div>
           <h2 className="uppercase tracking-[0.3em] font-black text-center text-xl md:text-2xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] px-4">
               {isSpinning ? spinStatusText || t("mysteryBox.mixing") : (winner ? t("mysteryBox.chosen") : t("mysteryBox.choose"))}
           </h2>

           {/* Progressive drawing indicator bar */}
           {isSpinning && (
             <div className="w-full max-w-md px-6 mt-2.5 relative z-10 animate-pulse">
               <div className="w-full bg-black/40 rounded-full h-2.5 overflow-hidden p-[1px] border border-white/10">
                 <div 
                   className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 rounded-full transition-all duration-100 ease-out shadow-[0_0_15px_rgba(245,158,11,0.8)]"
                   style={{ width: `${spinProgress}%` }}
                 />
               </div>
               <div className="flex justify-between items-center text-[11px] uppercase tracking-wider font-extrabold text-white/60 mt-1.5 px-1">
                 <span>{Math.round(spinProgress)}%</span>
                 <span className="text-amber-400">{spinStatusText}</span>
               </div>
             </div>
           )}
         </div>

         {/* Content Area with 3D perspective to enable cool flips */}
         <div className="flex-1 relative overflow-y-auto overflow-x-hidden custom-scrollbar p-6 sm:p-8 md:p-10 lg:p-12 [perspective:1000px]">
            
            {/* Dynamic soft flash overlay */}
            {showFlash && (
               <div className="absolute inset-0 bg-white/10 z-50 pointer-events-none animate-[fade-out_0.6s_ease-out_forwards]" />
            )}

            <div 
               className="grid justify-center items-center gap-5 sm:gap-6 md:gap-8 w-full mx-auto py-4"
               style={{ 
                  gridTemplateColumns: `repeat(auto-fit, minmax(min(150px, 30vw), 1fr))`,
                  maxWidth: '1200px'
               }}
            >
               {validItems.map((_, idx) => {
                  
                  const isHighlighted = highlightedIndex === idx;
                  const isRevealed = revealedBoxes[idx] || false;
                  
                  // In post-spin, if winner is chosen, we check if this is the winner box
                  const isWinnerBox = winnerBoxIndex === idx;
                  const isDimmed = Object.keys(revealedBoxes).length > 0 && !isWinnerBox;
                  
                  const mappedItem = boxMapping[idx] || null;
                  const slice = mappedItem ? slices.find(s => s.item.id === mappedItem.id) : null;
                  const bgColor = slice?.color || '#3b3464';
                  const textColor = getContrastYIQ(bgColor);

                  // Calculate stagger delay for idle floating
                  const floatDelay = `${idx * 0.15}s`;

                  return (
                     <div 
                        key={idx} 
                        className={`group relative transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] 
                           ${!winner && !isSpinning ? 'cursor-pointer hover:scale-105 active:scale-98' : ''}
                           ${isDimmed ? 'opacity-40 scale-95 pointer-events-none' : 'opacity-100'}
                           ${isHighlighted && !isWinnerBox ? `drop-shadow-[0_0_20px_${dropShadowColor}] z-10 scale-105 ${isSpinning ? 'animate-[pulse-soft_0.6s_ease-in-out_infinite]' : ''}` : ''}
                           ${isWinnerBox && isRevealed ? `scale-[1.12] z-30 drop-shadow-[0_0_35px_${dropShadowColor}]` : 'scale-100'}
                           ${!isSpinning && !winner ? '' : ''}
                        `}
                        style={{
                           aspectRatio: '1.35/1',
                           width: '100%',
                           animationDelay: !isSpinning && !winner ? floatDelay : undefined
                        }}
                        onClick={() => handleBoxClick(idx)}
                     >
                        {/* 3D Flip Container */}
                        <div className={`relative w-full h-full duration-700 [transform-style:preserve-3d] transition-transform ${isRevealed ? '[transform:rotateY(180deg)]' : ''}`}>
                           
                           {/* Front Face: The Briefcase */}
                           <div 
                              className={`absolute inset-0 [backface-visibility:hidden] rounded-2xl border-[3px] shadow-xl flex flex-col items-center justify-center transition-all duration-300
                                 ${isHighlighted ? boxHighlightClass : 'border-slate-800/20'}
                              `}
                              style={{ transform: 'translate3d(0,0,0)' }}
                           >
                              {/* Briefcase metal body */}
                              <div className={`absolute inset-0 rounded-[13px] bg-gradient-to-b overflow-hidden ${boxFrontBodyClass} flex items-center justify-center`}>
                                 {/* Horizontal grooves/stripes */}
                                 <div className="absolute inset-x-0 top-[25%] h-[1px] bg-black/15 border-b border-white/10"></div>
                                 <div className="absolute inset-x-0 top-[50%] h-[1px] bg-black/15 border-b border-white/10"></div>
                                 <div className="absolute inset-x-0 top-[75%] h-[1px] bg-black/15 border-b border-white/10"></div>
                                 {/* Dynamic sheen highlight */}
                                 <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/15 to-transparent pointer-events-none"></div>
                              </div>

                              {/* Top Handle */}
                              <div className="absolute -top-[14px] left-1/2 -translate-x-1/2 w-12 h-4 pointer-events-none z-20 flex flex-col items-center justify-end">
                                 {/* Solid handle bar */}
                                 <div className={`w-8 h-2.5 rounded-t-[4px] bg-gradient-to-b from-zinc-700 to-zinc-950 border border-zinc-900 shadow-md`} />
                                 {/* Sockets/Mounts connectors */}
                                 <div className="flex justify-between w-6 -mt-[1px] h-1">
                                    <div className={`w-1 h-1.5 bg-zinc-600 rounded-sm`} />
                                    <div className={`w-1 h-1.5 bg-zinc-600 rounded-sm`} />
                                 </div>
                              </div>
                              {/* Handle mounts attached to the body */}
                              <div className={`absolute -top-1 left-[calc(50%-0.8rem)] w-2 h-1.5 ${mountClass} rounded-t-sm shadow-sm pointer-events-none`}></div>
                              <div className={`absolute -top-1 right-[calc(50%-0.8rem)] w-2 h-1.5 ${mountClass} rounded-t-sm shadow-sm pointer-events-none`}></div>

                              {/* Left/Right metallic locks/latches */}
                              <div className={`absolute top-2 left-3 w-4 h-5 rounded-[3px] border ${latchClass} shadow-md flex flex-col items-center justify-between py-1 pointer-events-none`}>
                                 {/* Keyhole or small latch line */}
                                 <div className="w-1.5 h-1.5 bg-black/50 rounded-full flex items-center justify-center">
                                    <div className="w-[1px] h-1 bg-zinc-400" />
                                 </div>
                                 {/* Clip lock */}
                                 <div className="w-2.5 h-1.5 bg-zinc-300/80 border border-zinc-400 rounded-sm" />
                              </div>
                              <div className={`absolute top-2 right-3 w-4 h-5 rounded-[3px] border ${latchClass} shadow-md flex flex-col items-center justify-between py-1 pointer-events-none`}>
                                 {/* Keyhole or small latch line */}
                                 <div className="w-1.5 h-1.5 bg-black/50 rounded-full flex items-center justify-center">
                                    <div className="w-[1px] h-1 bg-zinc-400" />
                                 </div>
                                 {/* Clip lock */}
                                 <div className="w-2.5 h-1.5 bg-zinc-300/80 border border-zinc-400 rounded-sm" />
                              </div>

                              {/* Metallic Corners with "rivets" */}
                              <div className={`absolute top-0 left-0 w-4 h-4 border-t border-l rounded-tl-[13px] ${cornerClass} flex items-center justify-center pointer-events-none`}>
                                 <div className="absolute top-[3px] left-[3px] w-1 h-1 bg-black/40 rounded-full" />
                              </div>
                              <div className={`absolute top-0 right-0 w-4 h-4 border-t border-r rounded-tr-[13px] ${cornerClass} flex items-center justify-center pointer-events-none`}>
                                 <div className="absolute top-[3px] right-[3px] w-1 h-1 bg-black/40 rounded-full" />
                              </div>
                              <div className={`absolute bottom-0 left-0 w-4 h-4 border-b border-l rounded-bl-[13px] ${cornerClass} flex items-center justify-center pointer-events-none`}>
                                 <div className="absolute bottom-[3px] left-[3px] w-1 h-1 bg-black/40 rounded-full" />
                              </div>
                              <div className={`absolute bottom-0 right-0 w-4 h-4 border-b border-r rounded-br-[13px] ${cornerClass} flex items-center justify-center pointer-events-none`}>
                                 <div className="absolute bottom-[3px] right-[3px] w-1 h-1 bg-black/40 rounded-full" />
                              </div>

                              {/* Center Number Badge (Iconic Deal or No Deal medallion) */}
                              <div className={`relative z-10 ${badgeClass}`}>
                                 <span className="text-lg sm:text-xl md:text-2xl font-extrabold tracking-tight leading-none select-none drop-shadow-[0_2px_3px_rgba(0,0,0,0.6)]">
                                    {idx + 1}
                                 </span>
                              </div>
                           </div>

                           {/* Back Face: Revealed Content */}
                           <div 
                              className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] rounded-2xl border-[3px] shadow-[0_0_20px_rgba(0,0,0,0.8)] flex flex-col items-center justify-center p-3 text-center overflow-hidden"
                              style={{ 
                                 backgroundColor: bgColor,
                                 borderColor: isWinnerBox ? '#fbbf24' : '#ffffff20' 
                              }}
                           >
                              {/* Inner velvet lining pattern/border */}
                              <div className="absolute inset-1.5 rounded-[10px] border border-white/10 bg-black/25 pointer-events-none"></div>
                              <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-transparent pointer-events-none"></div>
                              <div className="absolute inset-0 shadow-[inset_0_0_15px_rgba(0,0,0,0.5)] pointer-events-none"></div>
                              
                              {mappedItem && (
                                 <div className="relative z-10 w-full flex flex-col items-center justify-center">
                                    {mappedItem.image && (
                                       <img src={mappedItem.image} alt="" className="w-10 h-10 md:w-14 md:h-14 object-contain mb-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]" />
                                    )}
                                    <span 
                                       className="font-black text-xs sm:text-sm md:text-base uppercase tracking-wider break-words w-full px-1 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] leading-tight line-clamp-2"
                                       style={{ color: textColor }}
                                     >
                                       {mappedItem.text}
                                    </span>
                                 </div>
                              )}
                              
                              {/* If it's the winner, add a special star effect */}
                              {isWinnerBox && (
                                 <div className="absolute -inset-4 bg-gradient-to-r from-amber-400/0 via-amber-400/40 to-amber-400/0 animate-[spin_3s_linear_infinite] pointer-events-none rounded-full blur-xl mix-blend-screen"></div>
                              )}
                           </div>
                           
                        </div>
                     </div>
                  );
               })}
            </div>
         </div>

         {/* Bottom Control Bar */}
         <div className="bg-slate-950/40 p-5 shrink-0 flex flex-col sm:flex-row items-center justify-center border-t border-slate-800/60 gap-4">
            
            {!winner && !isSpinning && validItems.length >= 2 && (
               <div className="text-white/60 text-sm font-bold uppercase tracking-widest hidden sm:block">
                 {t('mysteryBox.clickBoxOr')}
               </div>
            )}

            <button 
               onClick={startRandomSpin} 
               disabled={isSpinning || validItems.length < 2 || winner !== null}
               className={`px-8 py-3.5 uppercase tracking-widest font-black text-lg md:text-xl rounded-2xl shadow-xl transition-all duration-300
                  ${isSpinning || validItems.length < 2 || winner !== null
                     ? 'bg-slate-900 text-slate-500 cursor-not-allowed opacity-40 border border-slate-800' 
                     : 'bg-gradient-to-br from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white hover:-translate-y-1 shadow-[0_10px_30px_rgba(245,158,11,0.2)] hover:shadow-[0_15px_40px_rgba(245,158,11,0.45)]'
                  }
               `}
            >
               {isSpinning ? t('mysteryBox.shuffling') : t('mysteryBox.randomChoice')}
            </button>
            
         </div>

      </div>
    
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-150%); }
          100% { transform: translateX(150%); }
        }
        @keyframes pulse-soft {
          0%, 100% { transform: scale(1.05); filter: brightness(1); }
          50% { transform: scale(1.08); filter: brightness(1.1); }
        }
        @keyframes fade-out {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
};
