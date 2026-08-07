import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useWheelData } from '../../hooks/useWheelData';
import { useWheelActions } from '../../hooks/useWheelActions';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Target, Users, RefreshCw } from 'lucide-react';
import { playTickSound } from '../../utils/audioEngine';

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
  const penaltySequence = useAppStore(s => s.penaltySequence);
  const penaltySaveWins = useAppStore(s => s.penaltySaveWins);

  const { validItems, slices } = useWheelData();
  const { spinWheel } = useWheelActions();

  // Selected kicker index & target highlight sequence
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
  const [kickAnimationState, setKickAnimationState] = useState<'idle' | 'running' | 'shot' | 'result'>('idle');
  const [goalkeeperStyle, setGoalkeeperStyle] = useState<{ x: number; y: number; rotate: number; scale: number }>({ x: 0, y: 0, rotate: 0, scale: 1 });
  const [shotResult, setShotResult] = useState<'goal' | 'save' | null>(null);
  const [kickedHistory, setKickedHistory] = useState<Array<{ name: string; result: 'goal' | 'save'; color: string }>>([]);

  const [activeBalls, setActiveBalls] = useState<ActiveBall[]>([]);
  const [kickerResults, setKickerResults] = useState<Record<string, 'goal' | 'save'>>({});

  // Sequential shootouts state
  const [currentKickerIndex, setCurrentKickerIndex] = useState<number>(0);
  const [activeKicker, setActiveKicker] = useState<typeof validItems[0] | null>(null);
  const [totalKickersCount, setTotalKickersCount] = useState<number>(0);

  const goalRef = useRef<HTMLDivElement>(null);
  const targetsRef = useRef<Record<string, HTMLDivElement | null>>({});

  const actualSpinTime = eliminationMode ? eliminationSpinTime : spinTime;

  const scoreGoals = useMemo(() => {
    return Object.values(kickerResults).filter(r => r === 'goal').length;
  }, [kickerResults]);

  const scoreSaves = useMemo(() => {
    return Object.values(kickerResults).filter(r => r === 'save').length;
  }, [kickerResults]);

  // Helper to calculate target coordinate relative to bottom center of goal area
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
    
    // Spread out beautifully based on index as fallback
    const index = validItems.findIndex(i => i.id === itemId);
    const total = validItems.length;
    if (total > 0 && index !== -1) {
      const percent = index / (total - 1 || 1); // 0 to 1
      const x = -180 + percent * 360;
      const y = -160 + (index % 2 === 0 ? 30 : -30);
      return { x, y };
    }
    return { x: 0, y: -120 };
  };

  // Spinning sequence & turn-based penalty shootout timeline
  useEffect(() => {
    if (!isSpinning) {
      if (!winner) {
        // Clear balls and reset keeper on idle
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

    // --- SPINNING MODE STARTED ---
    setActiveBalls([]);
    setShotResult(null);
    setHighlightedIndex(null);
    setKickerResults({});

    const expectedWinnerItem = validItems.find(item => item.id === expectedWinnerId);
    if (!expectedWinnerItem) return;

    // Use shared penalty sequence or fall back to constructing one dynamically
    let sequence = penaltySequence;
    if (!sequence || sequence.length === 0) {
      const otherItems = validItems.filter(item => item.id !== expectedWinnerId);
      const shuffledOthers = [...otherItems].sort(() => Math.random() - 0.5);
      sequence = [...shuffledOthers, expectedWinnerItem];
    }

    setTotalKickersCount(sequence.length);

    const KICK_DURATION = 1550; // Dynamic, highly tense duration
    const PREPARE_DURATION = 750; // High-tension goalkeeper sways duration
    const RESOLVE_DELAY = 300; // Fast-paced ball flight

    let activeTimers: ReturnType<typeof setTimeout>[] = [];
    let heartIntervals: ReturnType<typeof setInterval>[] = [];

    sequence.forEach((kicker, seqIdx) => {
      const isWinnerKicker = seqIdx === sequence.length - 1;
      const kickerStartMs = seqIdx * KICK_DURATION;

      // 1. Preparation Phase (t = 0 inside KICK_DURATION slot)
      const setupTimer = setTimeout(() => {
        setCurrentKickerIndex(seqIdx);
        setActiveKicker(kicker);
        setKickAnimationState('running');
        setShotResult(null);
        setHighlightedIndex(null);
        setGoalkeeperStyle({ x: 0, y: 0, rotate: 0, scale: 1 });
        
        // Goalkeeper sways back and forth on the line with high visual fidelity
        let goalieSwayLeft = true;
        const swayInt = setInterval(() => {
          setGoalkeeperStyle(prev => ({
            ...prev,
            x: goalieSwayLeft ? -18 : 18,
            rotate: goalieSwayLeft ? -6 : 6,
          }));
          goalieSwayLeft = !goalieSwayLeft;
        }, 220); // Faster sway for increased tension!
        heartIntervals.push(swayInt);

        // Play authentic double heartbeat tension sounds
        const thump1 = setTimeout(() => playTickSound(0.3, 'drum', null, 0.7), 150);
        const thump2 = setTimeout(() => playTickSound(0.3, 'drum', null, 0.7), 450);
        activeTimers.push(thump1, thump2);

      }, kickerStartMs);
      activeTimers.push(setupTimer);

      // 2. The Kick / Shot Phase (t = PREPARE_DURATION)
      const kickTimer = setTimeout(() => {
        // Stop keeper's idle sway immediately
        heartIntervals.forEach(clearInterval);
        heartIntervals = [];

        // Find and highlight this kicker's target area in the net
        const gridIdx = validItems.findIndex(i => i.id === kicker.id);
        if (gridIdx !== -1) {
          setHighlightedIndex(gridIdx);
        }

        // Play loud, crisp kick sound
        playTickSound(0.7, 'drum', null, 1);

        const { x: targetX, y: targetY } = getTargetCoords(kicker.id);

        const shouldBeSave = penaltySaveWins ? isWinnerKicker : !isWinnerKicker;
        const isGoal = !shouldBeSave;

        // Spawn ball at penalty spot
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

        // Goalkeeper dive logic
        if (shouldBeSave) {
          // DEFESA: Goalkeeper dives perfectly to block the shot
          setGoalkeeperStyle({
            x: targetX,
            y: targetY - 30,
            rotate: targetX < -30 ? -55 : targetX > 30 ? 55 : 0,
            scale: 0.95
          });
        } else {
          // GOL: Goalkeeper dives late or wrong direction
          const isLeft = targetX < -30;
          const isRight = targetX > 30;
          let wrongX = isLeft ? 100 : isRight ? -100 : (Math.random() > 0.5 ? 120 : -120);
          let wrongY = -60;
          let wrongRotate = isLeft ? 50 : -50;

          setGoalkeeperStyle({
            x: wrongX,
            y: wrongY,
            rotate: wrongRotate,
            scale: 0.9
          });
        }

        // 3. Resolution Phase (t = PREPARE_DURATION + RESOLVE_DELAY)
        const resolutionTimer = setTimeout(() => {
          if (shouldBeSave) {
            // DEFESA!
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

            // Save to shootout history
            setKickedHistory(prev => [
              {
                name: kicker.text,
                result: 'save',
                color: kicker.color || colors[gridIdx % colors.length] || '#ef4444'
              },
              ...prev.slice(0, 4)
            ]);

            // Clean up the saved ball shortly after, keeping screen clear
            const fadeTimer = setTimeout(() => {
              setActiveBalls(prev => prev.filter(b => b.id !== ballId));
            }, 450);
            activeTimers.push(fadeTimer);

          } else {
            // GOOOOOL!!!
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

            // Save to shootout history
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

  // Track shootout history on final winner resolution
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

  // Keyboard support: Ctrl + Enter
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

  // Dynamic grid setup for target sectors in the net
  const gridColsClass = useMemo(() => {
    const count = validItems.length;
    if (count <= 4) return 'grid-cols-2 md:grid-cols-4';
    if (count <= 9) return 'grid-cols-3';
    if (count <= 16) return 'grid-cols-4';
    return 'grid-cols-5 md:grid-cols-6 lg:grid-cols-8';
  }, [validItems.length]);

  return (
    <div className="flex-1 flex flex-col items-center justify-between p-4 bg-radial from-[#0d1f10] via-[#050b06] to-[#010301] h-full relative overflow-hidden select-none">
      
      {/* Stadium ambient light overlay */}
      <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-[#10b981]/15 to-transparent pointer-events-none" />
      
      {/* Stadium floodlights graphics */}
      <div className="absolute top-2 left-6 right-6 flex justify-between pointer-events-none opacity-45">
        <div className="w-16 h-8 bg-sky-400 blur-md rounded-full shadow-[0_0_40px_#38bdf8]" />
        <div className="w-24 h-12 bg-white/20 blur-xl rounded-full" />
        <div className="w-16 h-8 bg-sky-400 blur-md rounded-full shadow-[0_0_40px_#38bdf8]" />
      </div>

      {/* Scoreboard - Elegant Minimalist Design */}
      <div className="w-full max-w-xl bg-slate-950/70 backdrop-blur-md border border-slate-800/80 rounded-2xl p-3 shadow-lg z-10 flex flex-col gap-2.5 mt-1 relative overflow-hidden">
        {/* Top line: Mode & Score */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Trophy className="text-amber-400" size={13} />
            <span className="text-[10px] font-black tracking-wider text-slate-400 uppercase font-mono">
              {eliminationMode ? t('penaltyDisplay.copaElimination') : (penaltySaveWins ? t('penaltyDisplay.defenseWins') : t('penaltyDisplay.shootout'))}
            </span>
          </div>

          {/* Minimalist Score badge */}
          <div className="flex items-center gap-2 bg-slate-900/90 px-3 py-1 rounded-lg border border-slate-800/80 font-mono">
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">{t('penaltyDisplay.goals')}</span>
            <span className="text-sm font-black text-emerald-400">{scoreGoals}</span>
            <span className="text-slate-700 text-xs">—</span>
            <span className="text-sm font-black text-red-400">{scoreSaves}</span>
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">{t('penaltyDisplay.saves')}</span>
          </div>
        </div>

        {/* Bottom line: Current status and Dots Timeline */}
        <div className="flex items-center justify-between border-t border-slate-900/60 pt-2 text-[11px]">
          {isSpinning && activeKicker ? (
            <div className="flex items-center gap-1.5 animate-pulse">
              <span className="flex h-1.5 w-1.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
              </span>
              <span className="text-slate-300 text-[10px] font-medium leading-none">
                {t('penaltyDisplay.kick')} #{currentKickerIndex + 1}: <span className="font-bold" style={{ color: activeKicker.color || '#fff' }}>{activeKicker.text}</span>
              </span>
            </div>
          ) : winner ? (
            <div className="flex items-center gap-1">
              <span className="text-emerald-400 text-[10px] font-bold">🏆 {t('penaltyDisplay.champion')}:</span>
              <span className="text-amber-400 text-[10px] font-black truncate max-w-[120px]">{winner.text}</span>
            </div>
          ) : (
            <span className="text-slate-500 font-mono text-[9px] uppercase tracking-wider">{t('penaltyDisplay.readyToStart')}</span>
          )}

          {/* Minimalist timeline dots */}
          <div className="flex items-center gap-1.5">
            {isSpinning && penaltySequence && penaltySequence.length > 0 ? (
              penaltySequence.map((kicker, idx) => {
                const isCurrent = idx === currentKickerIndex;
                const isPast = idx < currentKickerIndex;
                const result = kickerResults[kicker.id];

                let dotClass = "bg-slate-900/80 border-slate-800";
                let tooltip = `${t('penaltyDisplay.kicker')} ${idx + 1}`;

                if (isCurrent) {
                  dotClass = "bg-amber-500 border-amber-300 ring-2 ring-amber-400/30 scale-110 animate-pulse";
                  tooltip = `${t('penaltyDisplay.kicking')}: ${kicker.text}`;
                } else if (isPast) {
                  tooltip = `${kicker.text}: ${result === 'goal' ? t('penaltyDisplay.goalEmoji') : t('penaltyDisplay.saveEmoji')}`;
                  if (result === 'goal') {
                    dotClass = "bg-emerald-500 border-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]";
                  } else {
                    dotClass = "bg-red-500 border-red-400 shadow-[0_0_8px_rgba(239,68,68,0.5)]";
                  }
                }

                return (
                  <div
                    key={`${kicker.id}-${idx}`}
                    title={tooltip}
                    className={`w-2.5 h-2.5 rounded-full border transition-all duration-300 shrink-0 ${dotClass}`}
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
              <span className="text-[8px] text-slate-600 font-mono uppercase tracking-widest">LIVE</span>
            )}
          </div>
        </div>
      </div>

      {/* Goal & Penalty Spot Arena */}
      <div className="flex-1 w-full max-w-4xl flex flex-col justify-end items-center relative min-h-[280px] my-4">
        
        {/* Pitch Markings (Grass lines) */}
        <div className="absolute inset-x-0 bottom-0 h-[70%] bg-gradient-to-t from-emerald-950/20 to-transparent pointer-events-none rounded-b-3xl">
          {/* Alternating pitch stripe effect */}
          <div className="w-full h-full opacity-5 bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:100%_40px]" />
          {/* Penalty box arc lines */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-80 h-40 border-t border-dashed border-white/10 rounded-t-full" />
        </div>

        {/* The Soccer Goal frame container */}
        <div 
          ref={goalRef}
          className="w-full bg-[#111] border-t-8 border-x-8 border-white rounded-t-lg relative h-[240px] shadow-[0_-15px_30px_rgba(16,185,129,0.1)] flex flex-col"
        >
          {/* Net background mesh pattern */}
          <div className="absolute inset-0 opacity-15 bg-[linear-gradient(rgba(255,255,255,0.25)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.25)_1px,transparent_1px)] bg-[size:12px_12px]" />
          
          {/* Corner structural diagonal supports */}
          <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-white/40 -translate-x-1 -translate-y-1 rotate-45" />
          <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-white/40 translate-x-1 -translate-y-1 -rotate-45" />

          {/* Goal Targets Grid */}
          <div className="flex-1 p-3 overflow-y-auto no-scrollbar relative z-10">
            {validItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 italic text-sm">
                Adicione pelo menos 2 opções para iniciar a disputa!
              </div>
            ) : (
              <div className={`grid ${gridColsClass} gap-2 h-full items-stretch`}>
                {slices.map((slice, idx) => {
                  const isHighlighted = idx === highlightedIndex;
                  const item = slice.item;
                  const itemColor = slice.color || '#3b82f6';
                  const result = kickerResults[item.id];
                  
                  let bgStyle = 'rgba(15, 23, 42, 0.4)'; // Neutral slate-900/40
                  let borderStyle = 'rgba(51, 65, 85, 0.5)'; // Neutral slate-700/50
                  let textColor = '#cbd5e1'; // slate-300
                  let extraClasses = 'hover:bg-slate-800/30';

                  if (isHighlighted) {
                    bgStyle = itemColor;
                    borderStyle = '#ffffff';
                    textColor = getContrastYIQ(itemColor);
                    extraClasses = 'scale-105 shadow-[0_0_15px_rgba(255,255,255,0.5)] z-20 font-black';
                  } else if (result === 'goal') {
                    bgStyle = '#10b981'; // Solid green for GOAL
                    borderStyle = '#34d399';
                    textColor = '#ffffff';
                    extraClasses = 'shadow-[0_0_12px_rgba(16,185,129,0.45)] border-emerald-400 font-black';
                  } else if (result === 'save') {
                    bgStyle = '#ef4444'; // Solid red for SAVE
                    borderStyle = '#f87171';
                    textColor = '#ffffff';
                    extraClasses = 'shadow-[0_0_12px_rgba(239,68,68,0.45)] border-red-400 font-bold';
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
                      className={`relative rounded-lg border-2 p-2 flex flex-col items-center justify-center text-center transition-all duration-150 shadow-sm min-h-[50px] overflow-hidden ${extraClasses}`}
                    >
                      {/* Grid Item Soccer Target Bullseye circle indicator */}
                      <div className={`absolute inset-0 pointer-events-none flex items-center justify-center opacity-10 transition-opacity ${isHighlighted ? 'opacity-30' : ''}`}>
                        <Target size={40} className="stroke-[1.5]" />
                      </div>

                      {/* Display Weight fraction if larger than 1 */}
                      {(item.weight || 1) > 1 && !isHighlighted && !result && (
                        <span className="absolute top-0.5 right-1 text-[8px] font-mono font-bold bg-slate-900/60 text-slate-300 px-1 rounded">
                          x{item.weight}
                        </span>
                      )}

                      {/* Result Badge */}
                      {result && (
                        <span className="absolute top-0.5 right-1 text-[9px] font-black uppercase tracking-wider px-1 py-0.5 rounded leading-none bg-slate-950/40 text-white flex items-center gap-0.5">
                          {result === 'goal' ? '⚽ GOL' : '🧤 DEF'}
                        </span>
                      )}

                      {/* Name of Option */}
                      <span className="text-xs md:text-sm font-bold tracking-tight select-none line-clamp-2 truncate max-w-full relative z-10 px-1">
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
            {/* Goalie Silhouette SVG Graphic */}
            <svg viewBox="0 0 100 120" className="w-full h-full drop-shadow-[0_8px_16px_rgba(0,0,0,0.6)]">
              {/* Arms Outstretched */}
              <path d="M10 40 Q 30 20 50 35 Q 70 20 90 40 L 95 32 Q 70 8 50 25 Q 30 8 5 32 Z" fill="#e2e8f0" stroke="#475569" strokeWidth="2" />
              {/* Goalkeeper Gloves */}
              <circle cx="8" cy="36" r="6" fill="#f97316" stroke="#ea580c" strokeWidth="1" />
              <circle cx="92" cy="36" r="6" fill="#f97316" stroke="#ea580c" strokeWidth="1" />
              {/* Goalkeeper Jersey Torso */}
              <path d="M25 50 L 75 50 L 70 95 L 30 95 Z" fill="#eab308" stroke="#ca8a04" strokeWidth="2" />
              {/* Stripes/Jersey details */}
              <path d="M35 50 L 35 95 M 50 50 L 50 95 M 65 50 L 65 95" stroke="#111827" strokeWidth="1.5" />
              {/* Goalie Pants */}
              <path d="M30 95 L 70 95 L 65 112 L 35 112 Z" fill="#1e1b4b" />
              {/* Head / Helmet */}
              <circle cx="50" cy="30" r="11" fill="#f87171" stroke="#ef4444" strokeWidth="2" />
              {/* Hair/Cap */}
              <path d="M40 25 Q 50 16 60 25" stroke="#111" strokeWidth="4" fill="none" />
              {/* Face details */}
              <circle cx="46" cy="29" r="1.5" fill="#111" />
              <circle cx="54" cy="29" r="1.5" fill="#111" />
              <path d="M46 35 Q 50 38 54 35" stroke="#111" strokeWidth="1.5" fill="none" />
            </svg>
          </div>
        </div>

        {/* Cinematic Celebration & Result Overlays */}
        <AnimatePresence mode="wait">
          {isSpinning && activeKicker && (
            <motion.div 
              key={`${activeKicker.id}-${shotResult || 'preparing'}`}
              initial={{ scale: 0.7, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.7, opacity: 0, y: -15 }}
              transition={{ type: "spring", damping: 12, stiffness: 120 }}
              className="absolute top-12 z-40 pointer-events-none flex flex-col items-center"
            >
              {shotResult === 'goal' ? (
                <div className="flex flex-col items-center">
                  <div className="bg-gradient-to-r from-emerald-500 via-yellow-400 to-emerald-500 text-slate-900 text-4xl md:text-5xl font-black px-8 py-3 rounded-2xl shadow-[0_0_50px_rgba(16,185,129,0.7)] tracking-wider border-4 border-white uppercase flex items-center gap-3 animate-bounce">
                    ⚽ GOL !!! ⚽
                  </div>
                  <div className="bg-slate-900/90 border border-slate-700/80 text-xs text-slate-300 font-bold px-4 py-1.5 rounded-full mt-3 shadow-md">
                    <span style={{ color: activeKicker.color || '#fff' }}>{activeKicker.text}</span> balançou a rede!
                  </div>
                </div>
              ) : shotResult === 'save' ? (
                <div className="flex flex-col items-center">
                  <div className="bg-gradient-to-r from-red-600 via-red-500 to-orange-600 text-white text-3xl md:text-4xl font-black px-8 py-3 rounded-2xl shadow-[0_0_50px_rgba(239,68,68,0.7)] tracking-wider border-4 border-white uppercase flex items-center gap-3 animate-pulse">
                    🧤 DEFESA !!! 🧤
                  </div>
                  <div className="bg-slate-900/90 border border-slate-700/80 text-xs text-slate-300 font-bold px-4 py-1.5 rounded-full mt-3 shadow-md">
                    O goleiro defendeu a cobrança de <span style={{ color: activeKicker.color || '#fff' }}>{activeKicker.text}</span>!
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center animate-in fade-in duration-200">
                  <div className="bg-slate-950/90 border border-slate-700/50 px-4 py-1.5 rounded-full shadow-[0_4px_15px_rgba(0,0,0,0.5)] text-center flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                    <span className="text-xs text-slate-300 font-medium">Cobrador:</span>
                    <span 
                      className="text-sm font-black tracking-tight drop-shadow-sm"
                      style={{ color: activeKicker.color || '#fff' }}
                    >
                      {activeKicker.text}
                    </span>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Penalty Spot & Dynamic Soccer Balls Rendering */}
        <div className="w-full h-20 relative flex justify-center items-center mt-2">
          {/* Penalty Spot Grass circle */}
          <div className="w-14 h-6 bg-emerald-950/45 rounded-full blur-[2px] absolute bottom-1 flex items-center justify-center">
            {/* The white dot itself */}
            <div className="w-3 h-3 bg-white/45 rounded-full" />
          </div>

          {/* Map of Active Balls in Flight/Bounce */}
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
              opacity = 0; // Fade out on bounce
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
                {/* 3D Soccer Ball SVG Vector */}
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
                  <circle cx="50" cy="50" r="48" fill="url(#ballGlowDynamic)" opacity="0.4" pointerEvents="none" />
                  <defs>
                    <radialGradient id="ballGlowDynamic" cx="30%" cy="30%" r="70%">
                      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
                      <stop offset="50%" stopColor="#888888" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="#000000" stopOpacity="0.9" />
                    </radialGradient>
                  </defs>
                </svg>
              </motion.div>
            );
          })}

          {/* If idle, show static interactive ball on penalty spot */}
          {!isSpinning && activeBalls.length === 0 && (
            <div
              className="w-12 h-12 absolute bottom-8 left-1/2 -translate-x-1/2 z-30 cursor-pointer hover:scale-110 active:scale-95 transition-transform"
              onClick={() => {
                if (!isSpinning && !winner && validItems.length >= 2) {
                  spinWheelRef.current();
                }
              }}
            >
              <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_12px_12px_rgba(0,0,0,0.8)]">
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
                <circle cx="50" cy="50" r="48" fill="url(#ballGlowStatic)" opacity="0.3" pointerEvents="none" />
                <defs>
                  <radialGradient id="ballGlowStatic" cx="30%" cy="30%" r="70%">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
                    <stop offset="50%" stopColor="#888888" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#000000" stopOpacity="0.9" />
                  </radialGradient>
                </defs>
              </svg>
            </div>
          )}
        </div>
      </div>

      {/* Controller Buttons / Action Deck */}
      <div className="w-full max-w-sm flex flex-col items-center gap-3 z-10 mb-2">
        <button
          onClick={() => spinWheelRef.current()}
          disabled={isSpinning || validItems.length < 2 || !!winner}
          className={`w-full py-4 px-6 rounded-2xl font-black text-base uppercase tracking-wider flex items-center justify-center gap-3 shadow-lg transition-all duration-300 ${
            isSpinning || validItems.length < 2 || !!winner
              ? 'bg-slate-800 border border-slate-700 text-slate-500 cursor-not-allowed shadow-none'
              : 'bg-gradient-to-r from-emerald-500 to-sky-500 hover:from-emerald-400 hover:to-sky-400 text-slate-950 hover:scale-[1.02] active:scale-[0.98] shadow-[0_8px_24px_rgba(16,185,129,0.35)] cursor-pointer'
          }`}
        >
          {isSpinning ? (
            <>
              <RefreshCw className="animate-spin text-slate-950 animate-duration-1000" size={20} />
              <span className="animate-pulse">{t('penaltyDisplay.ongoing')}</span>
            </>
          ) : winner ? (
            <>
              <Trophy size={20} />
              <span>{t('penaltyDisplay.completed')}</span>
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><path d="M2 12h20"/></svg>
              <span>{t('penaltyDisplay.kickPenalties')}</span>
            </>
          )}
        </button>

        {/* Tip caption */}
        <p 
          className="text-[10px] text-slate-500 font-medium tracking-tight"
          dangerouslySetInnerHTML={{ __html: t('penaltyDisplay.tip') }}
        />
      </div>

    </div>
  );
};
