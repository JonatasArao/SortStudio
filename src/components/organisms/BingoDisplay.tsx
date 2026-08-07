import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useWheelData } from '../../hooks/useWheelData';
import { useWheelActions } from '../../hooks/useWheelActions';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Dices, RotateCcw, Trophy, CircleDot, Play } from 'lucide-react';
import { playTickSound } from '../../utils/audioEngine';

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
  const expectedWinnerId = useAppStore(s => s.expectedWinnerId);
  const results = useAppStore(s => s.results);
  const colors = useAppStore(s => s.colors);

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

  // Letter prefix generator based on bingo letters B-I-N-G-O
  const BINGO_LETTERS = ['B', 'I', 'N', 'G', 'O'];

  // Initialize or update balls inside the globe
  useEffect(() => {
    if (validItems.length === 0) {
      setBalls([]);
      return;
    }

    setBalls(prevBalls => {
      // Map valid items to balls inside cage
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

        // Random initial position inside globe radius (~110px)
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 85;
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

  // Physics animation loop for tumbling balls inside the cage
  useEffect(() => {
    let lastTime = performance.now();

    const animatePhysics = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;

      const globeRadius = 115;
      const ballRadius = 22;

      setBalls(prevBalls => {
        return prevBalls.map(ball => {
          let { x, y, vx, vy, rotation } = ball;

          // Increase velocity and turbulence during spin
          if (isSpinning) {
            const speedMultiplier = 12;
            vx += (Math.random() - 0.5) * speedMultiplier;
            vy += (Math.random() - 0.5) * speedMultiplier;
            // Upward blower force
            vy -= Math.random() * 4;
            rotation += 15;
          } else {
            // Gentle ambient float
            vx += (Math.random() - 0.5) * 0.8;
            vy += (Math.random() - 0.5) * 0.8 + 0.15; // mild gravity
            rotation += 0.5;
          }

          // Apply velocity
          x += vx;
          y += vy;

          // Drag / damping
          vx *= isSpinning ? 0.92 : 0.95;
          vy *= isSpinning ? 0.92 : 0.95;

          // Boundary constraint (inside sphere)
          const distFromCenter = Math.sqrt(x * x + y * y);
          const maxDist = globeRadius - ballRadius;

          if (distFromCenter > maxDist) {
            const angle = Math.atan2(y, x);
            x = Math.cos(angle) * maxDist;
            y = Math.sin(angle) * maxDist;

            // Reflect velocity vector
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

  // Handle extracted ball when winner is picked or during spin resolution
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

  // Keyboard shortcut Ctrl + Enter
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

  // History of drawn balls from results
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

  return (
    <div className="flex-1 flex flex-col items-center justify-between p-4 bg-radial from-[#1e1b4b] via-[#0f0d2e] to-[#08071a] h-full relative overflow-hidden select-none">
      
      {/* Background Neon Spotlight Aura */}
      <div className="absolute top-0 inset-x-0 h-64 bg-gradient-to-b from-indigo-500/10 via-purple-500/5 to-transparent pointer-events-none" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Header Info / Mode Title */}
      <div className="w-full max-w-xl bg-slate-950/70 backdrop-blur-md border border-indigo-500/20 rounded-2xl p-3 shadow-2xl z-10 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black shadow-inner">
            <Dices size={18} className={isSpinning ? 'animate-bounce' : ''} />
          </div>
          <div>
            <h2 className="text-xs font-black text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
              {t('bingo.title') || "GLOBO DE BINGO"}
              <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30 font-sans">
                PRO
              </span>
            </h2>
            <p className="text-[10px] text-slate-400 font-medium">
              {isSpinning 
                ? (t('bingo.drawing') || "Misturando Bolas...") 
                : winner 
                  ? (t('bingo.winnerBall') || "BOLA SORTEADA!") 
                  : `${validItems.length} ${t('bingo.ballsInGlobe') || "Bolas no Globo"}`}
            </p>
          </div>
        </div>

        {/* Stats Pill */}
        <div className="flex items-center gap-2">
          <button 
            onClick={handleShuffle}
            disabled={isSpinning}
            className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-all active:scale-95 disabled:opacity-50"
            title={t('bingo.shuffleGlobe') || "Misturar"}
          >
            <RotateCcw size={15} />
          </button>
          <div className="bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-xl flex items-center gap-2">
            <CircleDot size={14} className="text-emerald-400" />
            <span className="text-xs font-mono font-black text-white">{validItems.length}</span>
            <span className="text-[10px] text-slate-500 font-bold uppercase">{t('sidebar.entries.participants') || "Bolas"}</span>
          </div>
        </div>
      </div>

      {/* Central Interactive Bingo Globe & Machine Stage */}
      <div className="flex-1 w-full max-w-3xl flex flex-col items-center justify-center relative my-2 min-h-[320px]">
        
        {/* Machine Brass Base & Cage Frame */}
        <div className="relative w-80 h-80 sm:w-96 sm:h-96 flex items-center justify-center">
          
          {/* Top Acrylic/Gold Crown */}
          <div className="absolute -top-5 left-1/2 -translate-x-1/2 w-28 h-8 bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-600 rounded-t-full shadow-[0_0_15px_rgba(245,158,11,0.4)] border-t border-amber-200 flex items-center justify-center z-20">
            <div className="w-6 h-3 bg-amber-900/60 rounded-full border border-amber-400/50" />
          </div>

          {/* Golden Stand Legs */}
          <div className="absolute bottom-0 left-4 w-6 h-36 bg-gradient-to-b from-amber-500 via-amber-700 to-amber-900 rounded-b-lg border-x border-amber-300/40 shadow-xl origin-top rotate-[18deg]" />
          <div className="absolute bottom-0 right-4 w-6 h-36 bg-gradient-to-b from-amber-500 via-amber-700 to-amber-900 rounded-b-lg border-x border-amber-300/40 shadow-xl origin-top -rotate-[18deg]" />

          {/* Central Spinning Axle & Crank */}
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-4 bg-gradient-to-r from-amber-700 via-yellow-300 to-amber-700 z-30 shadow-md flex items-center justify-between px-2">
            {/* Left Axle Cap */}
            <div className="w-6 h-6 rounded-full bg-amber-400 border-2 border-amber-200 shadow-lg" />
            
            {/* Right Hand Crank Wheel */}
            <div 
              style={{ transform: `rotate(${crankAngle}deg)` }}
              className="w-12 h-12 rounded-full border-4 border-amber-400 bg-amber-900/80 shadow-lg relative flex items-center justify-center transition-transform duration-75"
            >
              <div className="w-2 h-14 bg-amber-500 rounded-full absolute" />
              <div className="w-4 h-4 rounded-full bg-yellow-300 border border-amber-700 absolute -top-2" />
            </div>
          </div>

          {/* The Transparent Glass Sphere Container */}
          <div className={`relative w-64 h-64 sm:w-72 sm:h-72 rounded-full border-4 border-amber-400/80 shadow-[0_0_60px_rgba(245,158,11,0.25)] bg-radial from-indigo-900/30 via-slate-950/60 to-black/80 backdrop-blur-sm overflow-hidden flex items-center justify-center transition-all ${isSpinning ? 'shadow-[0_0_80px_rgba(245,158,11,0.5)] border-yellow-300' : ''}`}>
            
            {/* Cage Wireframe Grid overlay */}
            <div className="absolute inset-0 rounded-full border-8 border-dashed border-amber-500/20 pointer-events-none animate-[spin_40s_linear_infinite]" />
            <div className="absolute inset-2 rounded-full border-4 border-dotted border-yellow-400/20 pointer-events-none animate-[spin_25s_linear_infinite_reverse]" />

            {/* Specular Glass Highlight Curve */}
            <div className="absolute top-3 left-6 w-32 h-16 bg-gradient-to-b from-white/30 via-white/10 to-transparent rounded-t-full rotate-[-25deg] pointer-events-none" />

            {/* Balls Tumbling Pool Inside Sphere */}
            <div className="relative w-full h-full flex items-center justify-center">
              {balls.map((ball) => (
                <div
                  key={ball.id}
                  style={{
                    transform: `translate(${ball.x}px, ${ball.y}px) rotate(${ball.rotation}deg) scale(${ball.scale})`,
                    backgroundColor: ball.color,
                  }}
                  className="absolute w-11 h-11 rounded-full border-2 border-white/80 shadow-[inset_-4px_-4px_8px_rgba(0,0,0,0.6),0_4px_10px_rgba(0,0,0,0.5)] flex flex-col items-center justify-center text-white transition-transform duration-75 group select-none cursor-pointer"
                >
                  {/* Glossy Top Highlight */}
                  <div className="absolute top-1 left-2 w-4 h-2 bg-white/60 rounded-full pointer-events-none" />
                  
                  {/* Ball Number/Letter Badge */}
                  <div className="bg-white text-slate-950 rounded-full w-6 h-6 flex items-center justify-center font-black text-[9px] shadow-sm leading-none border border-slate-300">
                    {ball.letter}{ball.number}
                  </div>
                  
                  {/* Mini Text Label */}
                  <span className="text-[8px] font-extrabold max-w-[32px] truncate px-0.5 leading-tight drop-shadow-sm text-center">
                    {ball.text}
                  </span>
                </div>
              ))}
            </div>

            {/* Air Blower Particle Effect when spinning */}
            {isSpinning && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-full h-full bg-gradient-to-t from-yellow-500/20 via-transparent to-amber-500/20 animate-pulse" />
                <Sparkles size={48} className="text-yellow-300/40 animate-spin duration-700" />
              </div>
            )}
          </div>

          {/* Bottom Pneumatic Chute & Ramp Outlet */}
          <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-20 h-16 bg-gradient-to-b from-amber-600 via-amber-800 to-slate-950 rounded-b-2xl border-x-2 border-b-2 border-amber-400/60 shadow-2xl flex flex-col items-center justify-end z-20">
            <div className="w-14 h-3 bg-yellow-400/30 rounded-full border border-yellow-300/50 mb-1 animate-pulse" />
          </div>
        </div>

        {/* Selected / Extracted Ball Pedestal Display */}
        <AnimatePresence>
          {extractedBall && !isSpinning && (
            <motion.div
              initial={{ y: 50, scale: 0, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: 30, scale: 0, opacity: 0 }}
              transition={{ type: "spring", damping: 15, stiffness: 120 }}
              className="absolute -bottom-4 z-40 flex flex-col items-center"
            >
              {/* Spotlight Glow */}
              <div className="absolute -inset-6 bg-amber-400/25 rounded-full blur-xl animate-pulse" />

              {/* Big Glossy Extracted Bingo Ball */}
              <div 
                style={{ backgroundColor: extractedBall.color }}
                className="relative w-24 h-24 rounded-full border-4 border-white shadow-[inset_-8px_-8px_16px_rgba(0,0,0,0.6),0_12px_30px_rgba(0,0,0,0.8)] flex flex-col items-center justify-center text-white p-2 text-center"
              >
                {/* Glossy Highlight */}
                <div className="absolute top-2 left-4 w-8 h-4 bg-white/60 rounded-full pointer-events-none" />
                
                {/* White Center Badge */}
                <div className="bg-white text-slate-950 rounded-full w-10 h-10 flex items-center justify-center font-black text-sm shadow-md border border-slate-300 mb-0.5">
                  {extractedBall.letter}{extractedBall.number}
                </div>

                {/* Winner Name */}
                <span className="text-xs font-black tracking-tight drop-shadow-md truncate max-w-[80px]">
                  {extractedBall.text}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bingo Tray / Rack of Previously Drawn Balls */}
      {drawnBalls.length > 0 && (
        <div className="w-full max-w-xl bg-slate-950/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-3 shadow-lg my-2 z-10 flex flex-col gap-2">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
            <span className="font-mono uppercase font-bold text-amber-400/90 flex items-center gap-1.5">
              <Trophy size={13} />
              {t('bingo.lastDrawn') || "Últimas Bolas Sorteadas"}
            </span>
            <span className="text-[10px] font-mono text-slate-500">
              {drawnBalls.length} {t('bingo.drawnCount') || "Sorteadas"}
            </span>
          </div>

          {/* Horizontal Rack Row */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            {drawnBalls.map((b, i) => (
              <motion.div
                key={b.id}
                initial={{ scale: 0, x: -20 }}
                animate={{ scale: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                style={{ backgroundColor: b.color }}
                className="w-9 h-9 rounded-full border border-white/80 shrink-0 shadow-md flex flex-col items-center justify-center text-white relative group cursor-pointer"
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

      {/* Action Deck & Draw Button */}
      <div className="w-full max-w-sm flex flex-col items-center gap-2.5 z-10 mb-1">
        <button
          onClick={() => spinWheelRef.current()}
          disabled={isSpinning || validItems.length < 2 || !!winner}
          className={`w-full py-4 px-6 rounded-2xl font-black text-base uppercase tracking-wider flex items-center justify-center gap-3 shadow-xl transition-all duration-300 ${
            isSpinning || validItems.length < 2 || !!winner
              ? 'bg-slate-800 border border-slate-700 text-slate-500 cursor-not-allowed shadow-none'
              : 'bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 hover:scale-[1.02] active:scale-[0.98] shadow-[0_8px_30px_rgba(245,158,11,0.4)] cursor-pointer border-b-4 border-amber-700'
          }`}
        >
          {isSpinning ? (
            <>
              <Dices className="animate-spin text-slate-950" size={20} />
              <span className="animate-pulse">{t('bingo.drawing') || "Misturando Bolas..."}</span>
            </>
          ) : winner ? (
            <>
              <Trophy size={20} />
              <span>{t('bingo.winnerBall') || "BOLA SORTEADA!"}</span>
            </>
          ) : (
            <>
              <Play size={20} className="fill-slate-950" />
              <span>{t('bingo.drawBall') || "SORTEAR BOLA"}</span>
            </>
          )
          }
        </button>

        {/* Tip caption */}
        <p 
          className="text-[10px] text-slate-500 font-medium tracking-tight"
          dangerouslySetInnerHTML={{ __html: t('bingo.tip') || "Pressione <kbd>Ctrl + Enter</kbd> para sortear uma bola" }}
        />
      </div>

    </div>
  );
};
