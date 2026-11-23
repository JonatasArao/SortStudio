import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useWheelData } from '../../hooks/useWheelData';
import { useWheelActions } from '../../hooks/useWheelActions';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Dices, RotateCcw, Trophy, CircleDot, Play } from 'lucide-react';
import { getStudioTheme } from '../../constants/themes';
import { Button } from '../atoms/Button';

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

interface BallPos {
  id: string;
  itemId: string;
  text: string;
  color: string;
  letter: string;
  number: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  scale: number;
  rotation: number;
}

export const BingoDisplay = () => {
  const { t } = useTranslation();
  const isSpinning = useAppStore(s => s.isSpinning);
  const winner = useAppStore(s => s.winner);
  const results = useAppStore(s => s.results);
  const colors = useAppStore(s => s.colors);
  const wheelTheme = useAppStore(s => s.wheelTheme);
  const wheelScale = useAppStore(s => s.wheelScale);

  const theme = getStudioTheme(wheelTheme);
  const { validItems, slices } = useWheelData();
  const { spinWheel, handleShuffle } = useWheelActions();

  const [balls, setBalls] = useState<BallPos[]>([]);
  const [extractedBall, setExtractedBall] = useState<BallPos | null>(null);
  const [crankAngle, setCrankAngle] = useState(0);

  const requestRef = useRef<number | null>(null);
  const spinWheelRef = useRef(spinWheel);

  useEffect(() => {
    spinWheelRef.current = spinWheel;
  }, [spinWheel]);

  const BINGO_LETTERS = ['B', 'I', 'N', 'G', 'O'];

  useEffect(() => {
    if (validItems.length === 0) {
      setBalls([]);
      return;
    }

    setBalls(prevBalls => {
      return validItems.map((item, idx) => {
        const existing = prevBalls.find(b => b.itemId === item.id);
        const slice = slices.find(s => s.item.id === item.id);
        const color = item.color || slice?.color || colors[idx % colors.length] || '#3b82f6';
        const letter = BINGO_LETTERS[idx % 5];
        const number = idx + 1;

        if (existing) {
          return {
            ...existing,
            text: item.text,
            color,
            letter,
            number
          };
        }

        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 80;
        return {
          id: `ball-${item.id}`,
          itemId: item.id,
          text: item.text,
          color,
          letter,
          number,
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2,
          scale: 1,
          rotation: Math.random() * 360
        };
      });
    });
  }, [validItems, colors, slices]);

  useEffect(() => {
    const animatePhysics = () => {
      const globeRadius = 108;
      const ballRadius = 21;

      setBalls(prevBalls => {
        return prevBalls.map(ball => {
          let { x, y, vx, vy, rotation } = ball;

          if (isSpinning) {
            const speedMultiplier = 12;
            vx += (Math.random() - 0.5) * speedMultiplier;
            vy += (Math.random() - 0.5) * speedMultiplier;
            vy -= Math.random() * 4;
            rotation += 15;
          } else {
            vx += (Math.random() - 0.5) * 0.8;
            vy += (Math.random() - 0.5) * 0.8 + 0.15;
            rotation += 0.5;
          }

          x += vx;
          y += vy;

          vx *= isSpinning ? 0.92 : 0.95;
          vy *= isSpinning ? 0.92 : 0.95;

          const distFromCenter = Math.sqrt(x * x + y * y);
          const maxDist = globeRadius - ballRadius;

          if (distFromCenter > maxDist) {
            const angle = Math.atan2(y, x);
            x = Math.cos(angle) * maxDist;
            y = Math.sin(angle) * maxDist;

            const normalX = Math.cos(angle);
            const normalY = Math.sin(angle);
            const dot = vx * normalX + vy * normalY;

            vx = (vx - 2 * dot * normalX) * 0.75;
            vy = (vy - 2 * dot * normalY) * 0.75;
          }

          return { ...ball, x, y, vx, vy, rotation };
        });
      });

      if (isSpinning) {
        setCrankAngle(prev => (prev + 12) % 360);
      }

      requestRef.current = requestAnimationFrame(animatePhysics);
    };

    requestRef.current = requestAnimationFrame(animatePhysics);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isSpinning]);

  useEffect(() => {
    if (isSpinning) {
      setExtractedBall(null);
    } else if (winner) {
      const winnerBall = balls.find(b => b.itemId === winner.id) || {
        id: `extracted-${winner.id}`,
        itemId: winner.id,
        text: winner.text,
        color: winner.color || '#3b82f6',
        letter: 'B',
        number: 1,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        scale: 1,
        rotation: 0
      };
      setExtractedBall(winnerBall);
    }
  }, [isSpinning, winner, balls]);

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

  const drawnBalls = useMemo(() => {
    return results.slice(0, 10).map((res, idx) => {
      const letter = BINGO_LETTERS[idx % 5];
      return {
        id: res.drawId || `res-${idx}`,
        text: res.text,
        color: res.color || colors[idx % colors.length] || '#10b981',
        letter,
        number: idx + 1
      };
    });
  }, [results, colors]);

  const globeScale = Math.max(0.8, Math.min(1.15, wheelScale / 100));

  return (
    <div className={`flex-1 flex flex-col items-center justify-between p-3 sm:p-4 bg-gradient-to-br ${theme.stage.bgGradient} h-full relative overflow-hidden select-none transition-colors duration-500`}>
      <div className={`absolute inset-0 pointer-events-none ${theme.stage.patternClass}`} />
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] h-[380px] md:w-[540px] md:h-[540px] ${theme.stage.outerGlow} rounded-full pointer-events-none`} />

      {/* Header Info */}
      <div className="w-full max-w-xl bg-[var(--studio-surface)]/92 backdrop-blur-md border border-[var(--studio-border)] rounded-xl p-3 z-10 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 dark:text-amber-400 shrink-0">
            <Dices size={18} />
          </div>
          <div className="min-w-0">
            <h2 className="text-xs sm:text-sm font-bold text-[var(--studio-text)] uppercase tracking-wider truncate">
              {t('bingo.title') || "GLOBO DE BINGO"}
            </h2>
            <p className="text-xs text-[var(--studio-text-muted)] truncate">
              {isSpinning
                ? (t('bingo.drawing') || "Misturando Bolas...")
                : winner
                  ? (t('bingo.winnerBall') || "Bola sorteada!")
                  : `${validItems.length} ${t('bingo.ballsInGlobe') || "Bolas no Globo"}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleShuffle}
            disabled={isSpinning}
            className="p-2 rounded-lg bg-[var(--studio-card)] border border-[var(--studio-border)] text-[var(--studio-text-secondary)] hover:text-[var(--studio-text)] hover:bg-[var(--studio-card-hover)] transition-colors disabled:opacity-40"
            title={t('bingo.shuffleGlobe') || "Misturar"}
            aria-label={t('bingo.shuffleGlobe') || "Misturar"}
          >
            <RotateCcw size={15} />
          </button>
          <div className="bg-[var(--studio-input)] border border-[var(--studio-border)] px-3 py-1.5 rounded-lg flex items-center gap-1.5">
            <CircleDot size={13} className="text-emerald-500 dark:text-emerald-400" />
            <span className="text-xs font-mono tabular-nums font-bold text-[var(--studio-text)]">{validItems.length}</span>
            <span className="text-[11px] text-[var(--studio-text-muted)] font-medium hidden sm:inline">
              {t('sidebar.entries.participants') || "Bolas"}
            </span>
          </div>
        </div>
      </div>

      {/* Central Interactive Bingo Globe */}
      <div className="flex-1 w-full max-w-3xl flex flex-col items-center justify-center relative my-2 min-h-[260px]">
        <div
          className="relative w-64 h-64 sm:w-80 sm:h-80 flex items-center justify-center transition-transform duration-200"
          style={{ transform: `scale(${globeScale})` }}
        >

          {/* Top Crown */}
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-24 h-7 bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-600 rounded-t-full border-t border-amber-200 flex items-center justify-center z-20">
            <div className="w-5 h-2.5 bg-amber-900/60 rounded-full border border-amber-400/50" />
          </div>

          {/* Golden Stand Legs */}
          <div className="absolute bottom-0 left-3 w-5 h-28 sm:h-32 bg-gradient-to-b from-amber-500 via-amber-700 to-amber-900 rounded-b-lg border-x border-amber-300/40 shadow-xl origin-top rotate-[18deg]" />
          <div className="absolute bottom-0 right-3 w-5 h-28 sm:h-32 bg-gradient-to-b from-amber-500 via-amber-700 to-amber-900 rounded-b-lg border-x border-amber-300/40 shadow-xl origin-top -rotate-[18deg]" />

          {/* Axle & Crank */}
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-3.5 bg-gradient-to-r from-amber-700 via-yellow-300 to-amber-700 z-30 shadow-md flex items-center justify-between px-2">
            <div className="w-5 h-5 rounded-full bg-amber-400 border-2 border-amber-200 shadow-lg" />
            <div
              style={{ transform: `rotate(${crankAngle}deg)` }}
              className="w-10 h-10 rounded-full border-4 border-amber-400 bg-amber-900/80 shadow-lg relative flex items-center justify-center transition-transform duration-75"
            >
              <div className="w-1.5 h-12 bg-amber-500 rounded-full absolute" />
              <div className="w-3.5 h-3.5 rounded-full bg-yellow-300 border border-amber-700 absolute -top-2" />
            </div>
          </div>

          {/* Glass Sphere */}
          <div className={`relative w-56 h-56 sm:w-64 sm:h-64 rounded-full border-4 border-amber-400/80 shadow-[0_0_50px_rgba(245,158,11,0.2)] bg-radial from-indigo-900/30 via-[#0B0D13]/70 to-black/85 backdrop-blur-sm overflow-hidden flex items-center justify-center transition-all ${isSpinning ? 'shadow-[0_0_70px_rgba(245,158,11,0.45)] border-yellow-300' : ''}`}>
            <div className="absolute inset-0 rounded-full border-8 border-dashed border-amber-500/20 pointer-events-none animate-[spin_40s_linear_infinite]" />
            <div className="absolute inset-2 rounded-full border-4 border-dotted border-yellow-400/20 pointer-events-none animate-[spin_25s_linear_infinite_reverse]" />
            <div className="absolute top-3 left-6 w-28 h-14 bg-gradient-to-b from-white/25 via-white/10 to-transparent rounded-t-full rotate-[-25deg] pointer-events-none" />

            <div className="relative w-full h-full flex items-center justify-center">
              {balls.map((ball) => (
                <div
                  key={ball.id}
                  style={{
                    transform: `translate(${ball.x}px, ${ball.y}px) rotate(${ball.rotation}deg) scale(${ball.scale})`,
                    backgroundColor: ball.color,
                  }}
                  className="absolute w-10 h-10 rounded-full border-2 border-white/85 shadow-[inset_-4px_-4px_8px_rgba(0,0,0,0.55),0_4px_10px_rgba(0,0,0,0.45)] flex flex-col items-center justify-center text-white transition-transform duration-75 select-none"
                >
                  <div className="absolute top-1 left-2 w-3.5 h-1.5 bg-white/55 rounded-full pointer-events-none" />
                  <div className="bg-white text-slate-950 rounded-full w-5 h-5 flex items-center justify-center font-black text-[8px] leading-none border border-slate-300">
                    {ball.letter}{ball.number}
                  </div>
                  <span className="text-[7px] font-bold max-w-[30px] truncate px-0.5 leading-tight text-center">
                    {ball.text}
                  </span>
                </div>
              ))}
            </div>

            {isSpinning && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-full h-full bg-gradient-to-t from-amber-500/15 via-transparent to-amber-500/15" />
                <Sparkles size={40} className="text-yellow-300/45 animate-spin duration-700" />
              </div>
            )}
          </div>

          {/* Bottom Chute Outlet */}
          <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 w-16 h-12 bg-gradient-to-b from-amber-600 via-amber-800 to-[#0B0D13] rounded-b-xl border-x-2 border-b-2 border-amber-400/60 shadow-xl flex flex-col items-center justify-end z-20">
            <div className="w-10 h-2 bg-amber-300/35 rounded-full border border-amber-300/50 mb-1" />
          </div>

          {/* Extracted Winner Ball Display */}
          <AnimatePresence>
            {extractedBall && !isSpinning && (
              <motion.div
                initial={{ y: 30, scale: 0.4, opacity: 0 }}
                animate={{ y: 0, scale: 1, opacity: 1 }}
                exit={{ y: 20, scale: 0.4, opacity: 0 }}
                transition={{ type: "spring", damping: 16, stiffness: 160 }}
                className="absolute -bottom-3 z-40 flex flex-col items-center"
              >
                <div
                  style={{ backgroundColor: extractedBall.color }}
                  className="relative w-20 h-20 sm:w-22 sm:h-22 rounded-full border-4 border-white shadow-[inset_-6px_-6px_14px_rgba(0,0,0,0.55),0_10px_28px_rgba(0,0,0,0.85)] flex flex-col items-center justify-center text-white p-1.5 text-center"
                >
                  <div className="absolute top-1.5 left-3.5 w-6 h-3 bg-white/55 rounded-full pointer-events-none" />
                  <div className="bg-white text-slate-950 rounded-full w-8 h-8 flex items-center justify-center font-black text-xs shadow border border-slate-300 mb-0.5">
                    {extractedBall.letter}{extractedBall.number}
                  </div>
                  <span className="text-[11px] font-bold tracking-tight truncate max-w-[70px]">
                    {extractedBall.text}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Drawn Balls Tray */}
      {drawnBalls.length > 0 && (
        <div className="w-full max-w-xl bg-[var(--studio-surface)]/92 backdrop-blur-md border border-[var(--studio-border)] rounded-xl p-3 my-1.5 z-10 flex flex-col gap-2 shrink-0">
          <div className="flex items-center justify-between text-xs text-[var(--studio-text-muted)] font-medium">
            <span className="uppercase font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
              <Trophy size={13} />
              {t('bingo.lastDrawn') || "Últimas Bolas Sorteadas"}
            </span>
            <span className="text-[11px] font-mono tabular-nums text-[var(--studio-text-muted)]">
              {drawnBalls.length} {t('bingo.drawnCount') || "Sorteadas"}
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
            {drawnBalls.map((b, i) => (
              <motion.div
                key={b.id}
                initial={{ scale: 0, x: -16 }}
                animate={{ scale: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                style={{ backgroundColor: b.color }}
                className="w-9 h-9 rounded-full border border-white/80 shrink-0 shadow flex flex-col items-center justify-center text-white relative"
                title={b.text}
              >
                <div className="bg-white text-slate-950 rounded-full w-4 h-4 flex items-center justify-center font-black text-[8px] leading-none">
                  {b.letter}
                </div>
                <span className="text-[7px] font-bold truncate max-w-[30px] leading-tight">
                  {b.text}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Action Deck */}
      <div className="w-full max-w-sm flex flex-col items-center gap-2 z-10 mb-1 shrink-0">
        <Button
          variant="amber"
          size="lg"
          onClick={() => spinWheelRef.current()}
          disabled={isSpinning || validItems.length < 2 || !!winner}
          className="w-full gap-2.5"
        >
          {isSpinning ? (
            <>
              <Dices className="animate-spin" size={18} />
              <span>{t('bingo.drawing') || "Misturando Bolas..."}</span>
            </>
          ) : winner ? (
            <>
              <Trophy size={18} />
              <span>{t('bingo.winnerBall') || "BOLA SORTEADA!"}</span>
            </>
          ) : (
            <>
              <Play size={18} className="fill-current" />
              <span>{t('bingo.drawBall') || "SORTEAR BOLA"}</span>
            </>
          )}
        </Button>

        <p className="text-[11px] text-[var(--studio-text-secondary)] text-center">
          {renderTipWithKbd(t('bingo.tip') || "Pressione <kbd>Ctrl + Enter</kbd> para sortear uma bola")}
        </p>
      </div>
    </div>
  );
};
