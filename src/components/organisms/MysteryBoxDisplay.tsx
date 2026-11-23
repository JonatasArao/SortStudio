import React, { useEffect, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { getSpinTimeRanges } from '../../utils/spinUtils';
import { useWheelData } from '../../hooks/useWheelData';
import { useWheelActions } from '../../hooks/useWheelActions';
import { useTranslation } from 'react-i18next';
import { getStudioTheme } from '../../constants/themes';
import { Button } from '../atoms/Button';

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

  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
  const [userSelectedIndex, setUserSelectedIndex] = useState<number | null>(null);
  const [boxMapping, setBoxMapping] = useState<Record<number, any>>({});
  const [winnerBoxIndex, setWinnerBoxIndex] = useState<number | null>(null);
  const [revealedBoxes, setRevealedBoxes] = useState<Record<number, boolean>>({});
  const [spinProgress, setSpinProgress] = useState(0);
  const [spinStatusText, setSpinStatusText] = useState("");
  const [showFlash, setShowFlash] = useState(false);

  useEffect(() => {
    if (!isSpinning && !winner) {
      setBoxMapping({});
      setWinnerBoxIndex(null);
      setRevealedBoxes({});
      setHighlightedIndex(null);
      setUserSelectedIndex(null);
    }
  }, [isSpinning, winner]);

  useEffect(() => {
    if (isSpinning) {
      setSpinProgress(0);
      let durationSec = eliminationMode ? eliminationSpinTime : spinTime;
      const spinRange = getSpinTimeRanges('mystery_box', eliminationMode);
      durationSec = Math.max(spinRange.min, Math.min(spinRange.max, durationSec));
      const duration = durationSec * 1000;
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

  useEffect(() => {
    if (winner && !isSpinning) {
      setShowFlash(true);
      const timer = setTimeout(() => setShowFlash(false), 500);
      return () => clearTimeout(timer);
    }
  }, [winner, isSpinning]);

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

  useEffect(() => {
    if (winner && !isSpinning && validItems.length > 0) {
      let winIdx = userSelectedIndex;
      if (winIdx === null || winIdx >= validItems.length) {
        winIdx = Math.floor(Math.random() * validItems.length);
        setWinnerBoxIndex(winIdx);
        setHighlightedIndex(winIdx);

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
            newMapping[i] = unchosenItems[unchosenCursor++] || validItems[0];
          }
        }
        setBoxMapping(newMapping);
      } else {
        setWinnerBoxIndex(winIdx);
        setHighlightedIndex(winIdx);
      }

      setRevealedBoxes({ [winIdx]: true });

      const timer = setTimeout(() => {
        const allRevealed: Record<number, boolean> = {};
        for (let i = 0; i < validItems.length; i++) allRevealed[i] = true;
        setRevealedBoxes(allRevealed);
      }, 1500);

      return () => clearTimeout(timer);
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
      setUserSelectedIndex(null);
      spinWheelRef.current(false, false);
    }
  };

  const wheelTheme = useAppStore(state => state.wheelTheme);
  const wheelScale = useAppStore(state => state.wheelScale);
  const textSize = useAppStore(state => state.textSize);
  const theme = getStudioTheme(wheelTheme);

  // Briefcase styling per theme
  let boxFrontBodyClass = "from-slate-100 via-slate-200 to-slate-400";
  let mountClass = "bg-slate-500 border border-slate-600";
  let latchClass = "bg-slate-300 border-slate-400 text-slate-700";
  let cornerClass = "border-slate-400 bg-slate-300/80";
  let badgeClass = "bg-gradient-to-br from-red-600 via-red-700 to-rose-900 border-2 border-slate-200 text-white shadow-[0_4px_10px_rgba(0,0,0,0.45)] w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center";
  let boxHighlightClass = "ring-4 ring-amber-400 border-amber-400 ring-offset-2 ring-offset-[var(--studio-canvas)]";
  let dropShadowColor = "rgba(245,158,11,0.55)";

  switch (wheelTheme) {
    case 'neon':
      boxFrontBodyClass = "from-[#1c003a] via-[#3d0073] to-[#0f0022]";
      mountClass = "bg-fuchsia-600 border border-fuchsia-500";
      latchClass = "bg-zinc-800 border-cyan-500/50 text-cyan-400";
      cornerClass = "border-fuchsia-500/50 bg-fuchsia-950/40";
      badgeClass = "bg-gradient-to-br from-cyan-500 to-fuchsia-600 border-2 border-cyan-300 text-cyan-50 shadow-[0_0_15px_rgba(6,182,212,0.5)] w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center";
      boxHighlightClass = "ring-4 ring-cyan-400 border-cyan-400 ring-offset-2 ring-offset-[#090014]";
      dropShadowColor = "rgba(34,211,238,0.55)";
      break;
    case 'casino':
      boxFrontBodyClass = "from-amber-200 via-yellow-400 to-amber-600";
      mountClass = "bg-amber-800 border border-amber-900";
      latchClass = "bg-yellow-500 border-amber-700 text-amber-950";
      cornerClass = "border-amber-700/60 bg-yellow-500/30";
      badgeClass = "bg-gradient-to-br from-red-600 via-red-800 to-black border-2 border-yellow-400 text-yellow-300 shadow-[0_4px_12px_rgba(0,0,0,0.6)] w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center font-serif italic";
      boxHighlightClass = "ring-4 ring-yellow-400 border-yellow-400 ring-offset-2 ring-offset-[#1a0000]";
      dropShadowColor = "rgba(251,191,36,0.6)";
      break;
    case 'candy':
      boxFrontBodyClass = "from-pink-100 via-pink-200 to-pink-300";
      mountClass = "bg-pink-400 border border-pink-300";
      latchClass = "bg-pink-300 border-pink-400 text-pink-700";
      cornerClass = "border-pink-400 bg-pink-100/40";
      badgeClass = "bg-gradient-to-br from-fuchsia-400 to-pink-500 border-2 border-white text-white shadow-[0_4px_10px_rgba(0,0,0,0.2)] w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center";
      boxHighlightClass = "ring-4 ring-pink-400 border-pink-400 ring-offset-2 ring-offset-[#fdf2f8]";
      dropShadowColor = "rgba(236,72,153,0.55)";
      break;
    case 'dark':
      boxFrontBodyClass = "from-zinc-800 via-zinc-900 to-black";
      mountClass = "bg-zinc-700 border border-zinc-800";
      latchClass = "bg-zinc-800 border-zinc-700 text-zinc-400";
      cornerClass = "border-zinc-700 bg-zinc-900/60";
      badgeClass = "bg-gradient-to-br from-zinc-900 via-zinc-950 to-black border-2 border-zinc-700 text-zinc-100 shadow-[0_4px_10px_rgba(0,0,0,0.5)] w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center";
      boxHighlightClass = "ring-4 ring-white border-white ring-offset-2 ring-offset-[#0a0a0a]";
      dropShadowColor = "rgba(255,255,255,0.5)";
      break;
    case 'emerald':
      boxFrontBodyClass = "from-emerald-100 via-emerald-300 to-teal-500";
      mountClass = "bg-emerald-700 border border-emerald-800";
      latchClass = "bg-emerald-200 border-emerald-400 text-emerald-900";
      cornerClass = "border-emerald-600/60 bg-emerald-400/30";
      badgeClass = "bg-gradient-to-br from-emerald-600 via-emerald-800 to-teal-950 border-2 border-emerald-300 text-emerald-50 shadow-[0_4px_12px_rgba(0,0,0,0.55)] w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center";
      boxHighlightClass = "ring-4 ring-emerald-400 border-emerald-400 ring-offset-2 ring-offset-[#06130e]";
      dropShadowColor = "rgba(16,185,129,0.55)";
      break;
  }

  const minBoxWidth = Math.round(148 * (wheelScale / 100));
  const textScale = Math.max(0.75, Math.min(1.4, textSize / 100));

  return (
    <div className={`flex-1 flex flex-col p-0 relative bg-gradient-to-br ${theme.stage.bgGradient} overflow-hidden min-h-0 items-center justify-center transition-colors duration-500`}>
      <div className={`absolute inset-0 pointer-events-none transition-all duration-500 ${theme.stage.patternClass}`} />
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] h-[380px] md:w-[580px] md:h-[580px] ${theme.stage.outerGlow} rounded-full pointer-events-none transition-colors duration-500`} />

      <div className="w-full h-full flex flex-col overflow-hidden relative transition-colors duration-500">

        {/* Stage Header */}
        <div className="border-b border-[var(--studio-border)] bg-[var(--studio-header)] backdrop-blur-md text-[var(--studio-text)] z-20 flex flex-col justify-center items-center py-3.5 px-4 relative shrink-0 transition-colors duration-300">
          <h2 className="uppercase tracking-[0.22em] font-bold text-center text-base sm:text-xl">
            {isSpinning ? spinStatusText || t("mysteryBox.mixing") : (winner ? t("mysteryBox.chosen") : t("mysteryBox.choose"))}
          </h2>

          {isSpinning && (
            <div className="w-full max-w-md px-4 mt-2.5">
              <div className="w-full bg-[var(--studio-input)] rounded-full h-2 overflow-hidden border border-[var(--studio-border)]">
                <div
                  className="h-full bg-[var(--studio-accent)] rounded-full transition-all duration-100 ease-out"
                  style={{ width: `${spinProgress}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[11px] uppercase tracking-wider font-semibold text-[var(--studio-text-muted)] mt-1">
                <span className="font-mono tabular-nums">{Math.round(spinProgress)}%</span>
                <span className="text-[var(--studio-accent-fg)]">{spinStatusText}</span>
              </div>
            </div>
          )}
        </div>

        {/* Content Area with 3D perspective and safe top padding for handles */}
        <div className="flex-1 relative overflow-y-auto overflow-x-hidden custom-scrollbar px-5 pb-6 pt-9 sm:px-8 sm:pb-8 sm:pt-10 lg:px-12 [perspective:1000px]">
          {showFlash && (
            <div className="absolute inset-0 bg-white/10 z-50 pointer-events-none transition-opacity duration-500" />
          )}

          <div
            className="grid justify-center items-center gap-x-5 gap-y-7 sm:gap-x-6 sm:gap-y-8 w-full mx-auto py-3"
            style={{
              gridTemplateColumns: `repeat(auto-fit, minmax(min(${minBoxWidth}px, 34vw), 1fr))`,
              maxWidth: '1160px'
            }}
          >
            {validItems.map((_, idx) => {
              const isHighlighted = highlightedIndex === idx;
              const isRevealed = revealedBoxes[idx] || false;
              const isWinnerBox = winnerBoxIndex === idx;
              const isDimmed = Object.keys(revealedBoxes).length > 0 && !isWinnerBox;

              const mappedItem = boxMapping[idx] || null;
              const slice = mappedItem ? slices.find(s => s.item.id === mappedItem.id) : null;
              const bgColor = slice?.color || '#3b3464';
              const textColor = getContrastYIQ(bgColor);

              return (
                <div
                  key={idx}
                  className={`group relative transition-all duration-300 ease-out
                    ${!winner && !isSpinning ? 'cursor-pointer hover:-translate-y-1 active:scale-[0.98]' : ''}
                    ${isDimmed ? 'opacity-40 scale-95 pointer-events-none' : 'opacity-100'}
                    ${isHighlighted && !isWinnerBox ? 'z-10 scale-105' : ''}
                    ${isWinnerBox && isRevealed ? 'scale-[1.08] z-30' : ''}
                  `}
                  style={{
                    aspectRatio: '1.35/1',
                    width: '100%',
                    filter: isHighlighted || (isWinnerBox && isRevealed) ? `drop-shadow(0 0 22px ${dropShadowColor})` : undefined,
                  }}
                  onClick={() => handleBoxClick(idx)}
                >
                  {/* 3D Flip Container */}
                  <div className={`relative w-full h-full duration-700 [transform-style:preserve-3d] transition-transform ${isRevealed ? '[transform:rotateY(180deg)]' : ''}`}>

                    {/* Front Face: Briefcase */}
                    <div
                      className={`absolute inset-0 [backface-visibility:hidden] rounded-2xl border-[3px] shadow-xl flex flex-col items-center justify-center transition-all duration-200
                        ${isHighlighted ? boxHighlightClass : 'border-black/25'}
                      `}
                      style={{ transform: 'translate3d(0,0,0)' }}
                    >
                      <div className={`absolute inset-0 rounded-[13px] bg-gradient-to-b overflow-hidden ${boxFrontBodyClass} flex items-center justify-center`}>
                        <div className="absolute inset-x-0 top-[25%] h-[1px] bg-black/15 border-b border-white/10" />
                        <div className="absolute inset-x-0 top-[50%] h-[1px] bg-black/15 border-b border-white/10" />
                        <div className="absolute inset-x-0 top-[75%] h-[1px] bg-black/15 border-b border-white/10" />
                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/15 to-transparent pointer-events-none" />
                      </div>

                      {/* Top Handle */}
                      <div className="absolute -top-[14px] left-1/2 -translate-x-1/2 w-12 h-4 pointer-events-none z-20 flex flex-col items-center justify-end">
                        <div className="w-8 h-2.5 rounded-t-[4px] bg-gradient-to-b from-zinc-700 to-zinc-950 border border-zinc-900 shadow-md" />
                        <div className="flex justify-between w-6 -mt-[1px] h-1">
                          <div className="w-1 h-1.5 bg-zinc-600 rounded-sm" />
                          <div className="w-1 h-1.5 bg-zinc-600 rounded-sm" />
                        </div>
                      </div>
                      <div className={`absolute -top-1 left-[calc(50%-0.8rem)] w-2 h-1.5 ${mountClass} rounded-t-sm pointer-events-none`} />
                      <div className={`absolute -top-1 right-[calc(50%-0.8rem)] w-2 h-1.5 ${mountClass} rounded-t-sm pointer-events-none`} />

                      {/* Latches */}
                      <div className={`absolute top-2 left-3 w-4 h-5 rounded-[3px] border ${latchClass} shadow flex flex-col items-center justify-between py-1 pointer-events-none`}>
                        <div className="w-1.5 h-1.5 bg-black/50 rounded-full flex items-center justify-center">
                          <div className="w-[1px] h-1 bg-zinc-400" />
                        </div>
                        <div className="w-2.5 h-1.5 bg-zinc-300/80 border border-zinc-400 rounded-sm" />
                      </div>
                      <div className={`absolute top-2 right-3 w-4 h-5 rounded-[3px] border ${latchClass} shadow flex flex-col items-center justify-between py-1 pointer-events-none`}>
                        <div className="w-1.5 h-1.5 bg-black/50 rounded-full flex items-center justify-center">
                          <div className="w-[1px] h-1 bg-zinc-400" />
                        </div>
                        <div className="w-2.5 h-1.5 bg-zinc-300/80 border border-zinc-400 rounded-sm" />
                      </div>

                      {/* Corners */}
                      <div className={`absolute top-0 left-0 w-4 h-4 border-t border-l rounded-tl-[13px] ${cornerClass} pointer-events-none`}>
                        <div className="absolute top-[3px] left-[3px] w-1 h-1 bg-black/40 rounded-full" />
                      </div>
                      <div className={`absolute top-0 right-0 w-4 h-4 border-t border-r rounded-tr-[13px] ${cornerClass} pointer-events-none`}>
                        <div className="absolute top-[3px] right-[3px] w-1 h-1 bg-black/40 rounded-full" />
                      </div>
                      <div className={`absolute bottom-0 left-0 w-4 h-4 border-b border-l rounded-bl-[13px] ${cornerClass} pointer-events-none`}>
                        <div className="absolute bottom-[3px] left-[3px] w-1 h-1 bg-black/40 rounded-full" />
                      </div>
                      <div className={`absolute bottom-0 right-0 w-4 h-4 border-b border-r rounded-br-[13px] ${cornerClass} pointer-events-none`}>
                        <div className="absolute bottom-[3px] right-[3px] w-1 h-1 bg-black/40 rounded-full" />
                      </div>

                      {/* Center Medallion */}
                      <div className={`relative z-10 ${badgeClass}`}>
                        <span className="text-lg sm:text-xl font-bold font-mono tabular-nums leading-none select-none">
                          {idx + 1}
                        </span>
                      </div>
                    </div>

                    {/* Back Face: Revealed Content */}
                    <div
                      className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] rounded-2xl border-[3px] shadow-xl flex flex-col items-center justify-center p-3 text-center overflow-hidden"
                      style={{
                        backgroundColor: bgColor,
                        borderColor: isWinnerBox ? '#fbbf24' : 'rgba(255,255,255,0.16)'
                      }}
                    >
                      <div className="absolute inset-1.5 rounded-[10px] border border-white/10 bg-black/25 pointer-events-none" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-transparent pointer-events-none" />

                      {mappedItem && (
                        <div className="relative z-10 w-full flex flex-col items-center justify-center">
                          <span
                            className="font-bold tracking-tight break-words w-full px-1 leading-tight line-clamp-2"
                            style={{ color: textColor, fontSize: `${Math.round(15 * textScale)}px` }}
                          >
                            {mappedItem.text}
                          </span>
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Control Bar */}
        <div className="px-4 py-3.5 shrink-0 flex flex-col sm:flex-row items-center justify-center border-t border-[var(--studio-border)] bg-[var(--studio-header)] backdrop-blur-md gap-3">
          {!winner && !isSpinning && validItems.length >= 2 && (
            <span className="text-xs font-medium hidden sm:inline text-[var(--studio-text-secondary)]">
              {t('mysteryBox.clickBoxOr')}
            </span>
          )}

          <Button
            variant="amber"
            size="lg"
            onClick={startRandomSpin}
            disabled={isSpinning || validItems.length < 2 || winner !== null}
            className="gap-2 px-7"
          >
            <Sparkles size={16} />
            <span>{isSpinning ? t('mysteryBox.shuffling') : t('mysteryBox.randomChoice')}</span>
          </Button>
        </div>

      </div>
    </div>
  );
};
