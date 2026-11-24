import { useEffect, useRef, useState } from 'react';
import { Play, Check, X } from 'lucide-react';
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
  let actualSpinTime = isFinalRound
    ? spinTime
    : (eliminationMode ? eliminationSpinTime : spinTime);
  const spinRange = getSpinTimeRanges('classic', !isFinalRound && eliminationMode);
  actualSpinTime = Math.max(spinRange.min, Math.min(spinRange.max, actualSpinTime));

  const [currentRotation, setCurrentRotation] = useState(rotation);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (isSpinning) {
      const startTime = performance.now();
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
      };
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
  const TOTAL_HEIGHT = REEL_PORTION * Math.max(1, validItems.length);

  const wheelTheme = useAppStore(state => state.wheelTheme);
  const wheelScale = useAppStore(state => state.wheelScale);
  const textSize = useAppStore(state => state.textSize);
  const sliceBorderWidth = useAppStore(state => state.sliceBorderWidth);
  const theme = getStudioTheme(wheelTheme);

  const pointerAngle = ((90 - currentRotation) % 360 + 360) % 360;
  const offsetY = (pointerAngle / 360) * TOTAL_HEIGHT;

  const canSpin = !isSpinning && !winner && validItems.length >= 2;
  const scaleFactor = wheelScale / 100;
  const textScale = Math.max(0.6, Math.min(1.6, textSize / 100));

  return (
    <div className={`flex-1 flex flex-col items-center justify-center p-4 lg:p-6 relative bg-gradient-to-br ${theme.stage.bgGradient} overflow-hidden min-h-0 transition-colors duration-500`}>
      <div className={`absolute inset-0 pointer-events-none transition-all duration-500 ${theme.stage.patternClass}`} />
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] h-[380px] md:w-[560px] md:h-[560px] ${theme.stage.outerGlow} rounded-full pointer-events-none transition-colors duration-500`} />

      {/* Reel Container */}
      <div
        onClick={() => {
          if (canSpin) spinWheel();
        }}
        className={`${theme.stage.horizonBg} rounded-3xl relative overflow-hidden shadow-2xl border-2 transition-all duration-300 box-border shrink-0
          ${canSpin ? `cursor-pointer hover:scale-[1.01] ${theme.stage.horizonBorder}` : theme.stage.horizonBorder}
          ${!isSpinning && winner ? 'border-emerald-500/60' : ''}
        `}
        style={{
          width: `calc(min(90vw, 500px) * ${scaleFactor})`,
          height: `calc(min(56dvh, 450px) * ${scaleFactor})`,
        }}
      >
        {/* Center Target Frame */}
        <div className="absolute top-1/2 left-0 w-full h-[112px] -translate-y-1/2 z-30 pointer-events-none box-border flex items-center justify-between">
          <div className={`absolute inset-0 border-y-[3px] pointer-events-none transition-colors duration-300 ${!isSpinning && winner ? theme.stage.horizonTargetActive : theme.stage.horizonTargetIdle} shadow-[inset_0_0_24px_rgba(0,0,0,0.55)]`} />
          <div className={`w-0 h-0 border-y-[14px] border-y-transparent border-l-[18px] ${theme.stage.horizonPointer} drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] z-40 relative -ml-0.5`} />
          <div className={`w-0 h-0 border-y-[14px] border-y-transparent border-r-[18px] ${theme.stage.horizonPointer} drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] z-40 relative -mr-0.5`} />
        </div>

        {/* Continuous Vertical Reel */}
        <div className="absolute left-0 right-0 top-1/2" style={{ transform: `translateY(-${offsetY}px)` }}>
          {[-2, -1, 0, 1, 2].map((copyIndex) => (
            <div key={copyIndex} className="absolute left-0 right-0" style={{ top: `${copyIndex * TOTAL_HEIGHT}px`, height: `${TOTAL_HEIGHT}px` }}>
              {slices.map((slice, i) => {
                const top = (slice.startAngle / 360) * TOTAL_HEIGHT;
                const height = (slice.angle / 360) * TOTAL_HEIGHT;
                const isTiny = slice.angle < 5;
                const textColor = getContrastYIQ(slice.color);
                const baseFontPx = isTiny ? 14 : 30;

                return (
                  <div
                    key={i}
                    className="absolute left-0 w-full p-1.5 box-border border-black/45"
                    style={{ top: `${top}px`, height: `${height}px`, borderBottomWidth: `${sliceBorderWidth}px` }}
                  >
                    <div className="w-full h-full rounded-lg shadow-[inset_0_0_16px_rgba(0,0,0,0.25)] flex overflow-hidden relative border border-black/20" style={{ backgroundColor: slice.color }}>
                      <div className="flex-1 flex flex-col justify-center px-6 relative z-10">
                        <span
                          className="font-extrabold tracking-tight truncate drop-shadow-sm"
                          style={{ color: textColor, fontSize: `${Math.round(baseFontPx * textScale)}px` }}
                        >
                          {slice.item.text}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Top/Bottom Cylinder Shading */}
        <div className="absolute top-0 left-0 w-full h-[105px] bg-gradient-to-b from-black/90 via-black/40 to-transparent z-40 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-full h-[105px] bg-gradient-to-t from-black/90 via-black/40 to-transparent z-40 pointer-events-none" />
      </div>

      {/* Action Area */}
      <div className="mt-5 flex flex-col items-center gap-2.5 relative z-50 min-h-[76px] shrink-0">
        {canSpin && (
          <div className="flex flex-col items-center gap-2">
            <Button
              variant="primary"
              size="lg"
              onClick={() => spinWheel()}
              className="gap-2 px-7"
            >
              <Play size={16} className="fill-current" />
              <span>{t("wheelDisplay.clickToSpin")}</span>
            </Button>
            <p className="text-xs font-medium text-[var(--studio-text-secondary)]">
              {t('horizonDisplay.pressEnter')}
            </p>
          </div>
        )}

        {isSpinning && (
          <div className="text-[var(--studio-accent-fg)] font-semibold text-base sm:text-lg uppercase tracking-[0.25em] py-2">
            {t('horizonDisplay.spinning')}
          </div>
        )}

        {!isSpinning && winner && (
          <div className="flex flex-col items-center gap-3 animate-in slide-in-from-bottom-3 fade-in duration-200">
            <h3 className="text-emerald-400 font-bold text-lg uppercase tracking-wider">
              {winner.type === 'grand_winner' ? t('horizonDisplay.grandWinner') : t('horizonDisplay.winner')}
            </h3>
            <div className="flex items-center justify-center gap-3">
              <Button
                variant="danger"
                size="md"
                onClick={(e) => {
                  e.stopPropagation();
                  stopWinSound();
                  const state = useAppStore.getState();
                  if (winner.drawId) {
                    state.setResults(prev => prev.filter(r => r.drawId !== winner.drawId));
                  }
                  if (winner.type === 'grand_winner' || state.eliminationMode) {
                    state.resetEliminationBattle();
                  }
                  setWinner(null);
                }}
                className="gap-1.5 min-w-[140px]"
              >
                <X size={16} />
                {t('horizonDisplay.reject')}
              </Button>
              <Button
                variant="success"
                size="md"
                onClick={(e) => {
                  e.stopPropagation();
                  stopWinSound();
                  const state = useAppStore.getState();
                  if (winner.type === 'grand_winner' || state.eliminationMode) {
                    state.resetEliminationBattle();
                    setWinner(null);
                  } else {
                    if (autoRemoveWinner) {
                      handleRemoveItem(winner.id);
                    }
                    setWinner(null);
                  }
                }}
                className="gap-1.5 min-w-[140px]"
              >
                <Check size={16} />
                {t('horizonDisplay.accept')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
