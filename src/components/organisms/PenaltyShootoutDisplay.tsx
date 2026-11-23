import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { getSpinTimeRanges } from '../../utils/spinUtils';
import { useWheelData } from '../../hooks/useWheelData';
import { useWheelActions } from '../../hooks/useWheelActions';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Target, Shield, CircleDot, RefreshCw } from 'lucide-react';
import { playTickSound } from '../../utils/audioEngine';
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

function renderTipWithKbd(raw: string) {
  const parts = raw.split(/(<kbd>.*?<\/kbd>)/gi);
  return parts.map((part, i) => {
    const match = part.match(/^<kbd>(.*?)<\/kbd>$/i);
    if (match) {
      return (
        <kbd
          key={i}
          className="px-1.5 py-0.5 mx-0.5 rounded bg-[var(--studio-card)] border border-[var(--studio-border-strong)] text-[var(--studio-text-secondary)] font-mono text-[10px]"
        >
          {match[1]}
        </kbd>
      );
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

interface ActiveBall {
  id: string;
  itemId: string;
  itemText: string;
  color: string;
  targetX: number;
  targetY: number;
  status: 'flying' | 'saved' | 'goal';
  bounceX?: number;
  bounceY?: number;
}

export const PenaltyShootoutDisplay = () => {
  const { t } = useTranslation();
  const isSpinning = useAppStore(s => s.isSpinning);
  const winner = useAppStore(s => s.winner);
  const expectedWinnerId = useAppStore(s => s.expectedWinnerId);
  const spinTime = useAppStore(s => s.spinTime);
  const eliminationMode = useAppStore(s => s.eliminationMode);
  const eliminationSpinTime = useAppStore(s => s.eliminationSpinTime);
  const colors = useAppStore(s => s.colors);
  const wheelTheme = useAppStore(s => s.wheelTheme);
  const textSize = useAppStore(s => s.textSize);
  const wheelScale = useAppStore(s => s.wheelScale);
  const penaltySequence = useAppStore(s => s.penaltySequence);
  const penaltySaveWins = useAppStore(s => s.penaltySaveWins);

  const theme = getStudioTheme(wheelTheme);
  const { validItems, slices } = useWheelData();
  const { spinWheel } = useWheelActions();

  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
  const [kickAnimationState, setKickAnimationState] = useState<'idle' | 'running' | 'shot' | 'result'>('idle');
  const [goalkeeperStyle, setGoalkeeperStyle] = useState<{ x: number; y: number; rotate: number; scale: number }>({ x: 0, y: 0, rotate: 0, scale: 1 });
  const [shotResult, setShotResult] = useState<'goal' | 'save' | null>(null);
  const [kickedHistory, setKickedHistory] = useState<Array<{ name: string; result: 'goal' | 'save'; color: string }>>([]);

  const [activeBalls, setActiveBalls] = useState<ActiveBall[]>([]);
  const [kickerResults, setKickerResults] = useState<Record<string, 'goal' | 'save'>>({});

  const [currentKickerIndex, setCurrentKickerIndex] = useState<number>(0);
  const [activeKicker, setActiveKicker] = useState<typeof validItems[0] | null>(null);
  const [, setTotalKickersCount] = useState<number>(0);

  const goalRef = useRef<HTMLDivElement>(null);
  const targetsRef = useRef<Record<string, HTMLDivElement | null>>({});

  let actualSpinTime = eliminationMode ? eliminationSpinTime : spinTime;
  const spinRange = getSpinTimeRanges('penalty_shootout', eliminationMode);
  actualSpinTime = Math.max(spinRange.min, Math.min(spinRange.max, actualSpinTime));

  const scoreGoals = useMemo(() => {
    return Object.values(kickerResults).filter(r => r === 'goal').length;
  }, [kickerResults]);

  const scoreSaves = useMemo(() => {
    return Object.values(kickerResults).filter(r => r === 'save').length;
  }, [kickerResults]);

  const getTargetCoords = (itemId: string) => {
    const targetElement = targetsRef.current[itemId];
    const goalElement = goalRef.current;
    if (targetElement && goalElement) {
      const targetRect = targetElement.getBoundingClientRect();
      const goalRect = goalElement.getBoundingClientRect();
      const targetX = (targetRect.left + targetRect.width / 2) - (goalRect.left + goalRect.width / 2);
      const targetY = (targetRect.top + targetRect.height / 2) - (goalRect.bottom - 40);
      return { x: targetX, y: targetY };
    }

    const index = validItems.findIndex(i => i.id === itemId);
    const total = validItems.length;
    if (total > 0 && index !== -1) {
      const percent = index / (total - 1 || 1);
      const x = -180 + percent * 360;
      const y = -160 + (index % 2 === 0 ? 30 : -30);
      return { x, y };
    }
    return { x: 0, y: -120 };
  };

  useEffect(() => {
    if (!isSpinning) {
      if (!winner) {
        setActiveBalls([]);
        setKickAnimationState('idle');
        setGoalkeeperStyle({ x: 0, y: 0, rotate: 0, scale: 1 });
        setShotResult(null);
        setHighlightedIndex(null);
        setActiveKicker(null);
        setCurrentKickerIndex(0);
        setTotalKickersCount(0);
        setKickerResults({});
      }
      return;
    }

    setActiveBalls([]);
    setShotResult(null);
    setHighlightedIndex(null);
    setKickerResults({});

    const expectedWinnerItem = validItems.find(item => item.id === expectedWinnerId);
    if (!expectedWinnerItem) return;

    let sequence = penaltySequence;
    if (!sequence || sequence.length === 0) {
      const otherItems = validItems.filter(item => item.id !== expectedWinnerId);
      const shuffledOthers = [...otherItems].sort(() => Math.random() - 0.5);
      sequence = [...shuffledOthers, expectedWinnerItem];
    }

    setTotalKickersCount(sequence.length);

    const KICK_DURATION = 1550;
    const PREPARE_DURATION = 750;
    const RESOLVE_DELAY = 300;

    let activeTimers: ReturnType<typeof setTimeout>[] = [];
    let heartIntervals: ReturnType<typeof setInterval>[] = [];

    sequence.forEach((kicker, seqIdx) => {
      const isWinnerKicker = seqIdx === sequence.length - 1;
      const kickerStartMs = seqIdx * KICK_DURATION;

      const setupTimer = setTimeout(() => {
        setCurrentKickerIndex(seqIdx);
        setActiveKicker(kicker);
        setKickAnimationState('running');
        setShotResult(null);
        setHighlightedIndex(null);
        setGoalkeeperStyle({ x: 0, y: 0, rotate: 0, scale: 1 });

        let goalieSwayLeft = true;
        const swayInt = setInterval(() => {
          setGoalkeeperStyle(prev => ({
            ...prev,
            x: goalieSwayLeft ? -18 : 18,
            rotate: goalieSwayLeft ? -6 : 6,
          }));
          goalieSwayLeft = !goalieSwayLeft;
        }, 220);
        heartIntervals.push(swayInt);

        const thump1 = setTimeout(() => playTickSound(0.3, 'drum', null, 0.7), 150);
        const thump2 = setTimeout(() => playTickSound(0.3, 'drum', null, 0.7), 450);
        activeTimers.push(thump1, thump2);

      }, kickerStartMs);
      activeTimers.push(setupTimer);

      const kickTimer = setTimeout(() => {
        heartIntervals.forEach(clearInterval);
        heartIntervals = [];

        const gridIdx = validItems.findIndex(i => i.id === kicker.id);
        if (gridIdx !== -1) {
          setHighlightedIndex(gridIdx);
        }

        playTickSound(0.7, 'drum', null, 1);

        const { x: targetX, y: targetY } = getTargetCoords(kicker.id);

        const shouldBeSave = penaltySaveWins ? isWinnerKicker : !isWinnerKicker;
        const isGoal = !shouldBeSave;

        const ballId = `ball-${kicker.id}-${seqIdx}`;
        const newBall: ActiveBall = {
          id: ballId,
          itemId: kicker.id,
          itemText: kicker.text,
          color: kicker.color || colors[gridIdx % colors.length] || '#38bdf8',
          targetX,
          targetY: targetY - (isGoal ? 45 : 40),
          status: 'flying'
        };

        setActiveBalls(prev => [...prev, newBall]);
        setKickAnimationState('shot');

        if (shouldBeSave) {
          setGoalkeeperStyle({
            x: targetX,
            y: targetY - 30,
            rotate: targetX < -30 ? -55 : targetX > 30 ? 55 : 0,
            scale: 0.95
          });
        } else {
          const isLeft = targetX < -30;
          const isRight = targetX > 30;
          const wrongX = isLeft ? 100 : isRight ? -100 : (Math.random() > 0.5 ? 120 : -120);
          const wrongY = -60;
          const wrongRotate = isLeft ? 50 : -50;

          setGoalkeeperStyle({
            x: wrongX,
            y: wrongY,
            rotate: wrongRotate,
            scale: 0.9
          });
        }

        const resolutionTimer = setTimeout(() => {
          if (shouldBeSave) {
            playTickSound(0.5, 'madeira', null, 1.2);
            setShotResult('save');
            setKickAnimationState('result');
            setKickerResults(prev => ({ ...prev, [kicker.id]: 'save' }));

            setActiveBalls(prev => prev.map(b => {
              if (b.id === ballId) {
                return {
                  ...b,
                  status: 'saved',
                  bounceX: targetX + (Math.random() > 0.5 ? 50 : -50),
                  bounceY: targetY + 30
                };
              }
              return b;
            }));

            setKickedHistory(prev => [
              {
                name: kicker.text,
                result: 'save',
                color: kicker.color || colors[gridIdx % colors.length] || '#ef4444'
              },
              ...prev.slice(0, 4)
            ]);

            const fadeTimer = setTimeout(() => {
              setActiveBalls(prev => prev.filter(b => b.id !== ballId));
            }, 450);
            activeTimers.push(fadeTimer);

          } else {
            playTickSound(0.75, 'synth', null, 1.2);
            setShotResult('goal');
            setKickAnimationState('result');
            setKickerResults(prev => ({ ...prev, [kicker.id]: 'goal' }));

            setActiveBalls(prev => prev.map(b => {
              if (b.id === ballId) {
                return {
                  ...b,
                  status: 'goal'
                };
              }
              return b;
            }));

            setKickedHistory(prev => [
              {
                name: kicker.text,
                result: 'goal',
                color: kicker.color || colors[gridIdx % colors.length] || '#10b981'
              },
              ...prev.slice(0, 4)
            ]);
          }
        }, RESOLVE_DELAY);
        activeTimers.push(resolutionTimer);

      }, kickerStartMs + PREPARE_DURATION);
      activeTimers.push(kickTimer);
    });

    return () => {
      activeTimers.forEach(clearTimeout);
      heartIntervals.forEach(clearInterval);
    };
  }, [isSpinning, expectedWinnerId, validItems, colors, penaltySequence, penaltySaveWins]);

  useEffect(() => {
    const finalWinnerResult = penaltySaveWins ? 'save' : 'goal';
    if (winner && !isSpinning && shotResult === finalWinnerResult) {
      const winnerName = winner.text;
      const alreadyInHistory = kickedHistory.some(h => h.name === winnerName && h.result === finalWinnerResult);
      if (!alreadyInHistory) {
        setKickedHistory(prev => [
          {
            name: winnerName,
            result: finalWinnerResult,
            color: winner.color || colors[validItems.findIndex(i => i.id === winner.id) % colors.length] || '#38bdf8'
          },
          ...prev.slice(0, 4)
        ]);
      }
    }
  }, [winner, isSpinning, shotResult, penaltySaveWins, colors, validItems]);

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

  const gridColsClass = useMemo(() => {
    const count = validItems.length;
    if (count <= 4) return 'grid-cols-2 md:grid-cols-4';
    if (count <= 9) return 'grid-cols-3';
    if (count <= 16) return 'grid-cols-4';
    return 'grid-cols-5 md:grid-cols-6 lg:grid-cols-8';
  }, [validItems.length]);

  const textScale = Math.max(0.75, Math.min(1.4, textSize / 100));
  const goalScale = Math.max(0.85, Math.min(1.12, wheelScale / 100));

  return (
    <div className={`flex-1 flex flex-col items-center justify-between p-3 sm:p-4 bg-gradient-to-br ${theme.stage.bgGradient} h-full relative overflow-hidden select-none transition-colors duration-500`}>
      <div className={`absolute inset-0 pointer-events-none ${theme.stage.patternClass}`} />
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[420px] ${theme.stage.outerGlow} rounded-full pointer-events-none`} />

      {/* Broadcast Scoreboard */}
      <div className="w-full max-w-xl bg-[var(--studio-surface)]/92 backdrop-blur-md border border-[var(--studio-border)] rounded-xl p-3 z-10 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Trophy className="text-amber-500 dark:text-amber-400 shrink-0" size={14} />
            <span className="text-[11px] font-bold tracking-wider text-[var(--studio-text)] uppercase truncate">
              {eliminationMode ? t('penaltyDisplay.copaElimination') : (penaltySaveWins ? t('penaltyDisplay.defenseWins') : t('penaltyDisplay.shootout'))}
            </span>
          </div>

          <div className="flex items-center gap-2 bg-[var(--studio-input)] px-3 py-1 rounded-lg border border-[var(--studio-border)] font-mono tabular-nums shrink-0">
            <span className="text-[10px] text-[var(--studio-text-muted)] font-semibold uppercase">{t('penaltyDisplay.goals')}</span>
            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{scoreGoals}</span>
            <span className="text-[var(--studio-text-muted)] text-xs">—</span>
            <span className="text-sm font-bold text-red-600 dark:text-red-400">{scoreSaves}</span>
            <span className="text-[10px] text-[var(--studio-text-muted)] font-semibold uppercase">{t('penaltyDisplay.saves')}</span>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-[var(--studio-border)] pt-2 text-[11px] gap-2">
          {isSpinning && activeKicker ? (
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-[var(--studio-text-muted)] text-xs font-medium shrink-0">
                {t('penaltyDisplay.kick')} #{currentKickerIndex + 1}:
              </span>
              <span className="font-semibold text-xs truncate" style={{ color: activeKicker.color || 'var(--studio-text)' }}>
                {activeKicker.text}
              </span>
            </div>
          ) : winner ? (
            <div className="flex items-center gap-1.5 min-w-0">
              <Trophy size={12} className="text-amber-500 dark:text-amber-400 shrink-0" />
              <span className="text-emerald-600 dark:text-emerald-400 text-xs font-semibold shrink-0">{t('penaltyDisplay.champion')}:</span>
              <span className="text-[var(--studio-text)] text-xs font-bold truncate">{winner.text}</span>
            </div>
          ) : (
            <span className="text-[var(--studio-text-muted)] text-[11px] font-medium">{t('penaltyDisplay.readyToStart')}</span>
          )}

          {/* Shootout sequence dots */}
          <div className="flex items-center gap-1.5 shrink-0">
            {isSpinning && penaltySequence && penaltySequence.length > 0 ? (
              penaltySequence.map((kicker, idx) => {
                const isCurrent = idx === currentKickerIndex;
                const isPast = idx < currentKickerIndex;
                const result = kickerResults[kicker.id];

                let dotClass = "bg-[var(--studio-input)] border-[var(--studio-border-strong)]";
                let tooltip = `${t('penaltyDisplay.kicker')} ${idx + 1}`;

                if (isCurrent) {
                  dotClass = "bg-amber-400 border-amber-200 ring-2 ring-amber-400/30";
                  tooltip = `${t('penaltyDisplay.kicking')}: ${kicker.text}`;
                } else if (isPast) {
                  tooltip = `${kicker.text}: ${result === 'goal' ? t('penaltyDisplay.goal') : t('penaltyDisplay.save')}`;
                  if (result === 'goal') {
                    dotClass = "bg-emerald-500 border-emerald-300";
                  } else {
                    dotClass = "bg-red-500 border-red-300";
                  }
                }

                return (
                  <div
                    key={`${kicker.id}-${idx}`}
                    title={tooltip}
                    className={`w-2.5 h-2.5 rounded-full border transition-colors shrink-0 ${dotClass}`}
                  />
                );
              })
            ) : kickedHistory.length > 0 ? (
              <div className="flex gap-1">
                {kickedHistory.slice(0, 8).map((h, i) => (
                  <div
                    key={i}
                    title={`${h.name}: ${h.result === 'goal' ? t('penaltyDisplay.goal') : t('penaltyDisplay.save')}`}
                    className={`w-2 h-2 rounded-full border shrink-0 ${
                      h.result === 'goal'
                        ? 'bg-emerald-500 border-emerald-400'
                        : 'bg-red-500 border-red-400'
                    }`}
                  />
                ))}
              </div>
            ) : (
              <span className="text-[10px] text-[var(--studio-text-muted)] font-mono uppercase tracking-wider">PRONTO</span>
            )}
          </div>
        </div>
      </div>

      {/* Goal & Penalty Spot Arena */}
      <div
        className="flex-1 w-full max-w-4xl flex flex-col justify-end items-center relative min-h-[240px] my-2 sm:my-3 transition-transform duration-200"
        style={{ transform: `scale(${goalScale})` }}
      >

        {/* Pitch Markings */}
        <div className="absolute inset-x-0 bottom-0 h-[70%] bg-gradient-to-t from-emerald-950/20 to-transparent pointer-events-none rounded-b-2xl">
          <div className="w-full h-full opacity-5 bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:100%_40px]" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-80 h-40 border-t border-dashed border-white/15 rounded-t-full" />
        </div>

        {/* Soccer Goal Frame */}
        <div
          ref={goalRef}
          className="w-full bg-[#10131C]/92 border-t-8 border-x-8 border-slate-100 rounded-t-lg relative h-[min(34dvh,235px)] min-h-[185px] shadow-[0_-12px_28px_rgba(0,0,0,0.5)] flex flex-col"
        >
          <div className="absolute inset-0 opacity-15 bg-[linear-gradient(rgba(255,255,255,0.25)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.25)_1px,transparent_1px)] bg-[size:12px_12px]" />

          {/* Target Grid */}
          <div className="flex-1 p-2.5 sm:p-3 overflow-y-auto no-scrollbar relative z-10">
            {validItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 text-sm">
                Adicione pelo menos 2 opções para iniciar a disputa!
              </div>
            ) : (
              <div className={`grid ${gridColsClass} gap-2 h-full items-stretch`}>
                {slices.map((slice, idx) => {
                  const isHighlighted = idx === highlightedIndex;
                  const item = slice.item;
                  const itemColor = slice.color || '#3b82f6';
                  const result = kickerResults[item.id];

                  let bgStyle = 'rgba(11, 13, 19, 0.72)';
                  let borderStyle = 'rgba(255, 255, 255, 0.14)';
                  let textColor = '#e2e8f0';
                  let extraClasses = 'hover:bg-white/[0.04]';

                  if (isHighlighted) {
                    bgStyle = itemColor;
                    borderStyle = '#ffffff';
                    textColor = getContrastYIQ(itemColor);
                    extraClasses = 'scale-[1.03] shadow-lg z-20 font-bold';
                  } else if (result === 'goal') {
                    bgStyle = '#10b981';
                    borderStyle = '#34d399';
                    textColor = '#052e16';
                    extraClasses = 'font-bold';
                  } else if (result === 'save') {
                    bgStyle = '#ef4444';
                    borderStyle = '#f87171';
                    textColor = '#ffffff';
                    extraClasses = 'font-semibold';
                  }

                  return (
                    <div
                      key={item.id}
                      ref={el => { targetsRef.current[item.id] = el; }}
                      style={{
                        backgroundColor: bgStyle,
                        borderColor: borderStyle,
                        color: textColor
                      }}
                      className={`relative rounded-lg border-2 p-2 flex flex-col items-center justify-center text-center transition-all duration-150 min-h-[46px] overflow-hidden ${extraClasses}`}
                    >
                      <div className={`absolute inset-0 pointer-events-none flex items-center justify-center opacity-10 transition-opacity ${isHighlighted ? 'opacity-25' : ''}`}>
                        <Target size={34} className="stroke-[1.5]" />
                      </div>

                      {(item.weight || 1) > 1 && !isHighlighted && !result && (
                        <span className="absolute top-0.5 right-1 text-[9px] font-mono tabular-nums font-bold bg-black/50 text-slate-300 px-1 rounded">
                          x{item.weight}
                        </span>
                      )}

                      {result && (
                        <span className="absolute top-0.5 right-1 text-[9px] font-bold uppercase tracking-wider px-1 py-0.5 rounded leading-none bg-black/45 text-white flex items-center gap-0.5">
                          {result === 'goal' ? (
                            <>
                              <CircleDot size={9} />
                              <span>GOL</span>
                            </>
                          ) : (
                            <>
                              <Shield size={9} />
                              <span>DEF</span>
                            </>
                          )}
                        </span>
                      )}

                      <span
                        className="font-semibold tracking-tight select-none line-clamp-2 truncate max-w-full relative z-10 px-1"
                        style={{ fontSize: `${Math.round(13 * textScale)}px` }}
                      >
                        {item.text}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Goalkeeper Entity */}
          <div
            style={{
              transform: `translate(calc(-50% + ${goalkeeperStyle.x}px), ${goalkeeperStyle.y}px) rotate(${goalkeeperStyle.rotate}deg) scale(${goalkeeperStyle.scale})`,
              transition: isSpinning && (kickAnimationState === 'shot' || kickAnimationState === 'running') ? 'transform 0.28s cubic-bezier(0.1, 0.8, 0.25, 1)' : 'transform 0.15s ease-out',
            }}
            className="absolute left-1/2 bottom-0 w-24 h-28 pointer-events-none z-35 origin-bottom"
          >
            <svg viewBox="0 0 100 120" className="w-full h-full drop-shadow-[0_8px_16px_rgba(0,0,0,0.6)]">
              <path d="M10 40 Q 30 20 50 35 Q 70 20 90 40 L 95 32 Q 70 8 50 25 Q 30 8 5 32 Z" fill="#e2e8f0" stroke="#475569" strokeWidth="2" />
              <circle cx="8" cy="36" r="6" fill="#f97316" stroke="#ea580c" strokeWidth="1" />
              <circle cx="92" cy="36" r="6" fill="#f97316" stroke="#ea580c" strokeWidth="1" />
              <path d="M25 50 L 75 50 L 70 95 L 30 95 Z" fill="#eab308" stroke="#ca8a04" strokeWidth="2" />
              <path d="M35 50 L 35 95 M 50 50 L 50 95 M 65 50 L 65 95" stroke="#111827" strokeWidth="1.5" />
              <path d="M30 95 L 70 95 L 65 112 L 35 112 Z" fill="#1e1b4b" />
              <circle cx="50" cy="30" r="11" fill="#f87171" stroke="#ef4444" strokeWidth="2" />
              <path d="M40 25 Q 50 16 60 25" stroke="#111" strokeWidth="4" fill="none" />
              <circle cx="46" cy="29" r="1.5" fill="#111" />
              <circle cx="54" cy="29" r="1.5" fill="#111" />
              <path d="M46 35 Q 50 38 54 35" stroke="#111" strokeWidth="1.5" fill="none" />
            </svg>
          </div>
        </div>

        {/* Result Overlays */}
        <AnimatePresence mode="wait">
          {isSpinning && activeKicker && (
            <motion.div
              key={`${activeKicker.id}-${shotResult || 'preparing'}`}
              initial={{ scale: 0.85, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.85, opacity: 0, y: -10 }}
              transition={{ type: "spring", damping: 16, stiffness: 180 }}
              className="absolute top-6 z-40 pointer-events-none flex flex-col items-center"
            >
              {shotResult === 'goal' ? (
                <div className="flex flex-col items-center">
                  <div className="bg-emerald-500 text-slate-950 text-2xl sm:text-4xl font-extrabold px-6 py-2.5 rounded-xl shadow-2xl tracking-wider border-2 border-white uppercase flex items-center gap-2.5">
                    <CircleDot size={24} />
                    <span>GOL</span>
                  </div>
                  <div className="bg-[var(--studio-surface)]/95 border border-[var(--studio-border)] text-xs text-[var(--studio-text)] font-semibold px-3.5 py-1 rounded-lg mt-2 shadow-md">
                    <span style={{ color: activeKicker.color || 'var(--studio-text)' }}>{activeKicker.text}</span> balançou a rede
                  </div>
                </div>
              ) : shotResult === 'save' ? (
                <div className="flex flex-col items-center">
                  <div className="bg-red-600 text-white text-2xl sm:text-3xl font-extrabold px-6 py-2.5 rounded-xl shadow-2xl tracking-wider border-2 border-white uppercase flex items-center gap-2.5">
                    <Shield size={24} />
                    <span>DEFESA</span>
                  </div>
                  <div className="bg-[var(--studio-surface)]/95 border border-[var(--studio-border)] text-xs text-[var(--studio-text)] font-semibold px-3.5 py-1 rounded-lg mt-2 shadow-md">
                    O goleiro defendeu a cobrança de <span style={{ color: activeKicker.color || 'var(--studio-text)' }}>{activeKicker.text}</span>
                  </div>
                </div>
              ) : (
                <div className="bg-[var(--studio-surface)]/95 border border-[var(--studio-border)] px-3.5 py-1.5 rounded-lg shadow-lg flex items-center gap-2">
                  <span className="text-xs text-[var(--studio-text-muted)] font-medium">Cobrador:</span>
                  <span
                    className="text-sm font-bold tracking-tight"
                    style={{ color: activeKicker.color || 'var(--studio-text)' }}
                  >
                    {activeKicker.text}
                  </span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Penalty Spot & Balls */}
        <div className="w-full h-20 relative flex justify-center items-center mt-1">
          <div className="w-14 h-6 bg-emerald-950/50 rounded-full blur-[2px] absolute bottom-1 flex items-center justify-center">
            <div className="w-3 h-3 bg-white/45 rounded-full" />
          </div>

          {activeBalls.map(ball => {
            let x = 0;
            let y = 0;
            let scale = 1;
            let rotate = 0;
            let opacity = 1;

            if (ball.status === 'flying') {
              x = ball.targetX;
              y = ball.targetY;
              scale = 0.35;
              rotate = 720;
              opacity = 1;
            } else if (ball.status === 'saved') {
              x = ball.bounceX ?? ball.targetX;
              y = ball.bounceY ?? ball.targetY;
              scale = 0.45;
              rotate = 900;
              opacity = 0;
            } else if (ball.status === 'goal') {
              x = ball.targetX;
              y = ball.targetY - 15;
              scale = 0.3;
              rotate = 1080;
              opacity = 1;
            }

            return (
              <motion.div
                key={ball.id}
                initial={{ x: 0, y: 0, scale: 1, rotate: 0, opacity: 1 }}
                animate={{ x, y, scale, rotate, opacity }}
                transition={{
                  type: "tween",
                  ease: ball.status === 'saved' ? "easeOut" : [0.1, 0.8, 0.25, 1],
                  duration: ball.status === 'saved' ? 0.6 : 0.32
                }}
                className="absolute bottom-8 left-1/2 -translate-x-1/2 w-12 h-12 z-20 pointer-events-none"
              >
                <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_8px_8px_rgba(0,0,0,0.6)]">
                  <circle cx="50" cy="50" r="48" fill="#ffffff" stroke="#111827" strokeWidth="2.5" />
                  <polygon points="50,28 35,38 40,58 60,58 65,38" fill="#111827" />
                  <polygon points="50,28 50,2 25,12 35,38" fill="none" stroke="#111827" strokeWidth="2.5" />
                  <polygon points="35,38 10,42 12,22 25,12" fill="none" stroke="#111827" strokeWidth="2.5" />
                  <polygon points="40,58 20,72 10,42" fill="none" stroke="#111827" strokeWidth="2.5" />
                  <polygon points="50,2 75,12 65,38" fill="none" stroke="#111827" strokeWidth="2.5" />
                  <polygon points="65,38 90,42 88,22 75,12" fill="none" stroke="#111827" strokeWidth="2.5" />
                  <polygon points="60,58 80,72 90,42" fill="none" stroke="#111827" strokeWidth="2.5" />
                  <polygon points="40,58 50,78 60,58" fill="none" stroke="#111827" strokeWidth="2.5" />
                  <polygon points="50,78 45,98 20,72" fill="none" stroke="#111827" strokeWidth="2.5" />
                  <polygon points="50,78 55,98 80,72" fill="none" stroke="#111827" strokeWidth="2.5" />
                </svg>
              </motion.div>
            );
          })}

          {!isSpinning && activeBalls.length === 0 && (
            <button
              type="button"
              className="w-12 h-12 absolute bottom-8 left-1/2 -translate-x-1/2 z-30 cursor-pointer hover:scale-110 active:scale-95 transition-transform"
              onClick={() => {
                if (!isSpinning && !winner && validItems.length >= 2) {
                  spinWheelRef.current();
                }
              }}
              aria-label={t('penaltyDisplay.kickPenalties')}
            >
              <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_10px_10px_rgba(0,0,0,0.8)]">
                <circle cx="50" cy="50" r="48" fill="#ffffff" stroke="#111827" strokeWidth="2.5" />
                <polygon points="50,28 35,38 40,58 60,58 65,38" fill="#111827" />
                <polygon points="50,28 50,2 25,12 35,38" fill="none" stroke="#111827" strokeWidth="2.5" />
                <polygon points="35,38 10,42 12,22 25,12" fill="none" stroke="#111827" strokeWidth="2.5" />
                <polygon points="40,58 20,72 10,42" fill="none" stroke="#111827" strokeWidth="2.5" />
                <polygon points="50,2 75,12 65,38" fill="none" stroke="#111827" strokeWidth="2.5" />
                <polygon points="65,38 90,42 88,22 75,12" fill="none" stroke="#111827" strokeWidth="2.5" />
                <polygon points="60,58 80,72 90,42" fill="none" stroke="#111827" strokeWidth="2.5" />
                <polygon points="40,58 50,78 60,58" fill="none" stroke="#111827" strokeWidth="2.5" />
                <polygon points="50,78 45,98 20,72" fill="none" stroke="#111827" strokeWidth="2.5" />
                <polygon points="50,78 55,98 80,72" fill="none" stroke="#111827" strokeWidth="2.5" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Action Deck */}
      <div className="w-full max-w-sm flex flex-col items-center gap-2 z-10 mb-1 shrink-0">
        <Button
          variant="success"
          size="lg"
          onClick={() => spinWheelRef.current()}
          disabled={isSpinning || validItems.length < 2 || !!winner}
          className="w-full gap-2.5"
        >
          {isSpinning ? (
            <>
              <RefreshCw className="animate-spin" size={18} />
              <span>{t('penaltyDisplay.ongoing')}</span>
            </>
          ) : winner ? (
            <>
              <Trophy size={18} />
              <span>{t('penaltyDisplay.completed')}</span>
            </>
          ) : (
            <>
              <CircleDot size={18} />
              <span>{t('penaltyDisplay.kickPenalties')}</span>
            </>
          )}
        </Button>

        <p className="text-[11px] text-[var(--studio-text-secondary)] text-center">
          {renderTipWithKbd(t('penaltyDisplay.tip'))}
        </p>
      </div>
    </div>
  );
};
