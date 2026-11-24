import { useEffect, useRef, useState } from 'react';
import { Play } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { getSpinTimeRanges } from '../../utils/spinUtils';
import { useWheelData } from '../../hooks/useWheelData';
import { useWheelActions } from '../../hooks/useWheelActions';
import { useTranslation } from 'react-i18next';
import {
  WHEEL_CANVAS_RESOLUTION,
  WHEEL_REFERENCE_SIZE,
  YIQ_CONTRAST_THRESHOLD,
  WHEEL_TOP_OFFSET_DEG,
  DEFAULT_CENTER_IMAGE
} from '../../constants';
import { getStudioTheme } from '../../constants/themes';
import { GhostGraveyardBackground } from './GhostGraveyardBackground';
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
  return yiq >= YIQ_CONTRAST_THRESHOLD ? '#111111' : '#ffffff';
}

export const WheelDisplay = () => {
  const { t } = useTranslation();
  const isSpinning = useAppStore(s => s.isSpinning);
  const rotation = useAppStore(s => s.rotation);
  const spinTime = useAppStore(s => s.spinTime);
  const eliminationSpinTime = useAppStore(s => s.eliminationSpinTime);
  const eliminationMode = useAppStore(s => s.eliminationMode);
  const textSize = useAppStore(s => s.textSize);
  const centerSize = useAppStore(s => s.centerSize);
  const wheelScale = useAppStore(s => s.wheelScale);
  const sliceBorderWidth = useAppStore(s => s.sliceBorderWidth);
  const pointerStyle = useAppStore(s => s.pointerStyle);
  const centerImage = useAppStore(s => s.centerImage);
  const centerBgColor = useAppStore(s => s.centerBgColor);
  const wheelTheme = useAppStore(s => s.wheelTheme);
  const winner = useAppStore(s => s.winner);

  const { validItems, slices } = useWheelData();
  const { spinWheel } = useWheelActions();

  const theme = getStudioTheme(wheelTheme);

  const isFinalRound = eliminationMode && validItems.length === 2;
  let actualSpinTime = isFinalRound
    ? spinTime
    : (eliminationMode ? eliminationSpinTime : spinTime);
  const spinRange = getSpinTimeRanges('classic', !isFinalRound && eliminationMode);
  actualSpinTime = Math.max(spinRange.min, Math.min(spinRange.max, actualSpinTime));

  const spinWheelRef = useRef(spinWheel);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerShapeRef = useRef<SVGPathElement>(null);
  const wheelContainerRef = useRef<HTMLDivElement>(null);
  const [imagesLoaded, setImagesLoaded] = useState(0);

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

  useEffect(() => {
    let loadedCount = 0;
    const slicesWithImages = slices.filter(s => s.item.image);
    if (slicesWithImages.length === 0) {
      setImagesLoaded(prev => prev + 1);
      return;
    }

    slicesWithImages.forEach(slice => {
      if (slice.item.image) {
        const img = new Image();
        img.onload = () => {
          loadedCount++;
          if (loadedCount === slicesWithImages.length) {
            setImagesLoaded(prev => prev + 1);
          }
        };
        img.onerror = () => {
          loadedCount++;
          if (loadedCount === slicesWithImages.length) {
            setImagesLoaded(prev => prev + 1);
          }
        };
        img.src = slice.item.image;
      }
    });
  }, [slices]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const size = WHEEL_CANVAS_RESOLUTION;
    canvas.width = size;
    canvas.height = size;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = width / 2;

    ctx.clearRect(0, 0, width, height);

    const refContainer = WHEEL_REFERENCE_SIZE;
    const scale = size / refContainer;

    slices.forEach((slice) => {
      const startRad = (slice.startAngle - WHEEL_TOP_OFFSET_DEG) * Math.PI / 180;
      const endRad = ((slice.startAngle + slice.angle) - WHEEL_TOP_OFFSET_DEG) * Math.PI / 180;

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startRad, endRad);
      ctx.closePath();
      ctx.fillStyle = slice.color;
      ctx.fill();

      if (sliceBorderWidth > 0) {
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(centerX + Math.cos(startRad) * radius, centerY + Math.sin(startRad) * radius);
        ctx.strokeStyle = 'rgba(0,0,0,0.28)';
        ctx.lineWidth = sliceBorderWidth * scale;
        ctx.stroke();
      }
    });

    slices.forEach((slice) => {
      if (!slice.item.image) return;
      const startRad = (slice.startAngle - WHEEL_TOP_OFFSET_DEG) * Math.PI / 180;
      const endRad = ((slice.startAngle + slice.angle) - WHEEL_TOP_OFFSET_DEG) * Math.PI / 180;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startRad, endRad);
      ctx.closePath();
      ctx.clip();

      const img = new Image();
      img.src = slice.item.image;
      if (img.complete && img.naturalWidth > 0) {
        const imgAspect = img.width / img.height;
        const canvasAspect = 1;
        let drawWidth = width;
        let drawHeight = height;
        let offsetX = 0;
        let offsetY = 0;

        if (imgAspect > canvasAspect) {
          drawHeight = height;
          drawWidth = height * imgAspect;
          offsetX = (width - drawWidth) / 2;
        } else {
          drawWidth = width;
          drawHeight = width / imgAspect;
          offsetY = (height - drawHeight) / 2;
        }
        ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
      }
      ctx.restore();
    });

    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
    gradient.addColorStop(0.5, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.28)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();

    slices.forEach((slice) => {
      const { item, angle, startAngle } = slice;
      const angleRadCenter = ((startAngle + angle / 2) - WHEEL_TOP_OFFSET_DEG) * Math.PI / 180;

      const maxLength = Math.max(item.text.length, 1);
      const innerRadius = centerSize / 2;
      const padding = 20;

      const availableWidthPx = (refContainer / 2) - innerRadius - padding;
      const widthConstrainedSize = availableWidthPx / (maxLength * 0.55);

      const midRadius = innerRadius + (availableWidthPx / 2);
      const availableHeightPx = midRadius * (angle * Math.PI / 180);
      const heightConstrainedSize = availableHeightPx * 0.85;

      const optimalSize = Math.min(widthConstrainedSize, heightConstrainedSize, 50);
      const finalSizePx = optimalSize * (textSize / 100) * 0.65;

      const fontSize = Math.max(finalSizePx * scale, 12);

      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(angleRadCenter);

      ctx.font = `bold ${fontSize}px "Plus Jakarta Sans", sans-serif`;
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";

      ctx.fillStyle = item.image ? '#ffffff' : getContrastYIQ(slice.color);

      ctx.shadowColor = (item.image || getContrastYIQ(slice.color) === '#ffffff') ? 'rgba(0,0,0,0.95)' : 'rgba(255,255,255,0.4)';
      ctx.shadowBlur = 4 * scale;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 2 * scale;

      const textX = radius - (padding * scale) - (10 * scale);
      ctx.fillText(item.text, textX, 0);

      ctx.restore();
    });

  }, [slices, textSize, centerSize, sliceBorderWidth, imagesLoaded]);

  const pointerColor = (() => {
    if (slices.length === 0) return '#f97316';
    const pointerAngle = (90 - (rotation % 360) + 360) % 360;
    const activeSlice = slices.find(
      (slice) => pointerAngle >= slice.startAngle && pointerAngle < slice.endAngle
    ) || slices[slices.length - 1];
    return activeSlice ? activeSlice.color : '#f97316';
  })();

  const pointerStrokeColor = getContrastYIQ(pointerColor);

  useEffect(() => {
    let animationFrameId: number;

    const updatePointerColorRealtime = () => {
      const el = wheelContainerRef.current;
      const shape = pointerShapeRef.current;
      if (!el || !shape || slices.length === 0) {
        animationFrameId = requestAnimationFrame(updatePointerColorRealtime);
        return;
      }

      const style = window.getComputedStyle(el);
      const transform = style.getPropertyValue("transform") || style.getPropertyValue("-webkit-transform");

      let currentRotationDeg = rotation % 360;
      if (transform && transform !== 'none') {
        try {
          if (transform.startsWith('matrix(')) {
            const values = transform.split('(')[1].split(')')[0].split(',');
            const a = parseFloat(values[0]);
            const b = parseFloat(values[1]);
            const angleRad = Math.atan2(b, a);
            let deg = angleRad * (180 / Math.PI);
            if (deg < 0) deg += 360;
            currentRotationDeg = deg;
          }
        } catch (e) {}
      }

      const pointerAngle = (90 - currentRotationDeg + 360) % 360;
      const activeSlice = slices.find(
        (slice) => pointerAngle >= slice.startAngle && pointerAngle < slice.endAngle
      ) || slices[slices.length - 1];

      if (activeSlice) {
        const color = activeSlice.color;
        const strokeColor = getContrastYIQ(color);
        shape.setAttribute('fill', color);
        shape.setAttribute('stroke', strokeColor);
      }

      animationFrameId = requestAnimationFrame(updatePointerColorRealtime);
    };

    if (isSpinning) {
      animationFrameId = requestAnimationFrame(updatePointerColorRealtime);
    } else {
      const el = wheelContainerRef.current;
      const shape = pointerShapeRef.current;
      if (el && shape && slices.length > 0) {
        const pointerAngle = (90 - (rotation % 360) + 360) % 360;
        const activeSlice = slices.find(
          (slice) => pointerAngle >= slice.startAngle && pointerAngle < slice.endAngle
        ) || slices[slices.length - 1];
        if (activeSlice) {
          shape.setAttribute('fill', activeSlice.color);
          shape.setAttribute('stroke', getContrastYIQ(activeSlice.color));
        }
      }
    }

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isSpinning, rotation, slices]);

  const pointerPath =
    pointerStyle === 'needle'
      ? 'M 4 50 L 92 24 L 76 50 L 92 76 Z'
      : pointerStyle === 'badge'
      ? 'M 8 50 L 42 16 L 88 16 C 94 16 96 20 96 26 L 96 74 C 96 80 94 84 88 84 L 42 84 Z'
      : 'M 10 50 L 90 10 L 90 90 Z';

  const canSpin = !isSpinning && !winner && validItems.length >= 2;
  const resolvedCenterImage = centerImage !== undefined ? centerImage : DEFAULT_CENTER_IMAGE;
  const hasCenterImage = resolvedCenterImage.trim() !== '';
  const scaleFactor = wheelScale / 100;

  return (
    <div className={`flex-1 flex flex-col items-center justify-center p-4 lg:p-6 relative bg-gradient-to-br ${theme.stage.bgGradient} overflow-hidden min-h-0 transition-colors duration-500`}>
      <div className={`absolute inset-0 pointer-events-none transition-all duration-500 ${theme.stage.patternClass}`} />
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] h-[380px] md:w-[580px] md:h-[580px] ${theme.stage.outerGlow} rounded-full pointer-events-none transition-all duration-500`} />
      <GhostGraveyardBackground />

      {/* WHEEL CONTAINER */}
      <div
        onClick={() => {
          if (canSpin) spinWheel();
        }}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && canSpin) {
            e.preventDefault();
            spinWheel();
          }
        }}
        role="button"
        tabIndex={canSpin ? 0 : -1}
        aria-label={t("wheelDisplay.ariaLabelSpin")}
        className={`relative flex items-center justify-center shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-[var(--studio-accent)] focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--studio-canvas)] rounded-full transition-all duration-300 ease-out group
        ${canSpin ? 'cursor-pointer hover:scale-[1.02] active:scale-[0.99]' : 'opacity-95'}`}
        style={{
          width: `calc(min(88vw, 72dvh, 660px) * ${scaleFactor})`,
          height: `calc(min(88vw, 72dvh, 660px) * ${scaleFactor})`,
        }}
      >
        {/* Pointer */}
        <div className={`absolute -right-5 md:-right-7 top-1/2 -translate-y-1/2 z-40 ${theme.stage.pointerShadow} pointer-events-none transition-all duration-500`}>
          <svg width="56" height="56" viewBox="0 0 100 100" className="w-[38px] h-[38px] md:w-[56px] md:h-[56px]">
            <path
              ref={pointerShapeRef}
              d={pointerPath}
              fill={pointerColor}
              stroke={pointerStrokeColor}
              strokeWidth="4"
              strokeLinejoin="round"
              className="transition-colors duration-150 ease-out"
            />
            {pointerStyle === 'badge' && (
              <circle cx="68" cy="50" r="9" fill={pointerStrokeColor} opacity="0.85" />
            )}
          </svg>
        </div>

        <div className={`absolute inset-0 rounded-full ${theme.stage.rimBorder} z-20 pointer-events-none transition-all duration-500`} />

        {/* Curved Spin Prompt Overlay */}
        {canSpin && (
          <svg viewBox="0 0 500 500" className="absolute inset-0 w-full h-full pointer-events-none z-30 opacity-95 transition-opacity">
            <path id="curveUp" d="M 120 250 A 130 130 0 0 1 380 250" fill="transparent" />
            <path id="curveDown" d="M 120 250 A 130 130 0 0 0 380 250" fill="transparent" />
            <text
              fill={theme.stage.overlayFill}
              stroke={theme.stage.overlayStroke}
              strokeWidth="7"
              strokeLinejoin="round"
              style={{ paintOrder: 'stroke' }}
              className="font-extrabold text-[30px] tracking-wide"
              textAnchor="middle"
            >
              <textPath href="#curveUp" startOffset="50%">{t("wheelDisplay.clickToSpin")}</textPath>
            </text>
            <text
              fill={theme.stage.overlayFill}
              stroke={theme.stage.overlayStroke}
              strokeWidth="6"
              strokeLinejoin="round"
              style={{ paintOrder: 'stroke' }}
              className="font-bold text-[22px] tracking-wide"
              textAnchor="middle"
            >
              <textPath href="#curveDown" startOffset="50%">{t("wheelDisplay.orPressCtrlEnter")}</textPath>
            </text>
          </svg>
        )}

        <div
          ref={wheelContainerRef}
          className={`w-full h-full rounded-full relative overflow-hidden transition-transform ease-[cubic-bezier(0.15,0.8,0.15,1)] ${theme.stage.wheelContainerBorder} box-border shadow-[inset_0_0_45px_rgba(0,0,0,0.45)]`}
          style={{ transform: `rotate(${rotation}deg)`, transitionDuration: `${actualSpinTime}s`, containerType: 'inline-size' }}
        >
          <canvas
            ref={canvasRef}
            className="w-full h-full block rounded-full"
            style={{ width: '100%', height: '100%' }}
          />
        </div>

        {/* Subtle Glass Reflection */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-white/10 via-transparent to-white/15 pointer-events-none z-20 mix-blend-overlay" />

        {/* Center Cap */}
        <div
          className={`absolute m-auto rounded-full z-30 flex items-center justify-center overflow-hidden pointer-events-none transition-all duration-300 ${theme.stage.centerClasses}`}
          style={{
            width: `${centerSize}px`,
            height: `${centerSize}px`,
            ...(centerBgColor
              ? { backgroundColor: centerBgColor, backgroundImage: 'none' }
              : {}),
          }}
        >
          {centerBgColor !== 'transparent' && (
            <div className="absolute inset-0 rounded-full shadow-[inset_0_2px_10px_rgba(0,0,0,0.3)] pointer-events-none z-10" />
          )}
          {hasCenterImage ? (
            <img
              src={resolvedCenterImage}
              alt="Logo Central"
              className="w-[85%] h-[85%] object-contain rounded-full drop-shadow-md z-0"
              onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_CENTER_IMAGE; }}
            />
          ) : (
            <div
              className="w-1/3 h-1/3 rounded-full opacity-90 shadow-inner"
              style={{ backgroundColor: theme.stage.accentHex }}
            />
          )}
        </div>
      </div>

      {/* Mobile Touch Spin Button */}
      {canSpin && (
        <div className="mt-4 sm:hidden z-30">
          <Button
            variant="primary"
            size="md"
            onClick={() => spinWheel()}
            className="gap-2 px-6"
          >
            <Play size={16} className="fill-current" />
            <span>{t("wheelDisplay.clickToSpin")}</span>
          </Button>
        </div>
      )}

      {validItems.length < 2 && (
        <p className="mt-4 text-xs font-medium z-30 text-[var(--studio-text-secondary)]">
          Adicione pelo menos 2 participantes ativos para girar a roleta.
        </p>
      )}
    </div>
  );
};
