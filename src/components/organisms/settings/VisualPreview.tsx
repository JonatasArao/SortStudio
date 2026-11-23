import React, { useMemo, useState } from 'react';
import { RotateCw, RotateCcw, Sun, Moon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../../store/useAppStore';
import { getStudioTheme, PointerStyle } from '../../../constants/themes';
import { DEFAULT_CENTER_IMAGE, WHEEL_REFERENCE_SIZE } from '../../../constants';
import { Button } from '../../atoms/Button';

function getContrastYIQ(hexcolor: string) {
  if (!hexcolor || typeof hexcolor !== 'string' || !hexcolor.startsWith('#')) return '#ffffff';
  let hex = hexcolor.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
  if (hex.length !== 6) return '#ffffff';

  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? '#111111' : '#ffffff';
}

const FALLBACK_LABELS = ['Ana', 'Lucas', 'Marina', 'Pedro', 'Sofia', 'Rafael'];

function renderPreviewPointer(style: PointerStyle, fill: string, stroke: string) {
  if (style === 'needle') {
    return (
      <svg width="30" height="30" viewBox="0 0 100 100" aria-hidden="true">
        <path
          d="M4 50 L92 26 L78 50 L92 74 Z"
          fill={fill}
          stroke={stroke}
          strokeWidth="5"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (style === 'badge') {
    return (
      <svg width="30" height="30" viewBox="0 0 100 100" aria-hidden="true">
        <path
          d="M10 50 L44 16 L88 16 C94 16 96 20 96 26 L96 74 C96 80 94 84 88 84 L44 84 Z"
          fill={fill}
          stroke={stroke}
          strokeWidth="5"
          strokeLinejoin="round"
        />
        <circle cx="68" cy="50" r="10" fill={stroke} opacity="0.85" />
      </svg>
    );
  }
  return (
    <svg width="28" height="28" viewBox="0 0 100 100" aria-hidden="true">
      <polygon
        points="10,50 90,12 90,88"
        fill={fill}
        stroke={stroke}
        strokeWidth="5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export const VisualPreview: React.FC = () => {
  const { t } = useTranslation();
  const wheelTheme = useAppStore((s) => s.wheelTheme);
  const colors = useAppStore((s) => s.colors);
  const textSize = useAppStore((s) => s.textSize);
  const centerSize = useAppStore((s) => s.centerSize);
  const wheelScale = useAppStore((s) => s.wheelScale);
  const sliceBorderWidth = useAppStore((s) => s.sliceBorderWidth);
  const pointerStyle = useAppStore((s) => s.pointerStyle);
  const centerImage = useAppStore((s) => s.centerImage);
  const centerBgColor = useAppStore((s) => s.centerBgColor);
  const items = useAppStore((s) => s.items);
  const resetVisualSettings = useAppStore((s) => s.resetVisualSettings);

  const [previewRotation, setPreviewRotation] = useState(0);
  const theme = useMemo(() => getStudioTheme(wheelTheme), [wheelTheme]);

  const previewItems = useMemo(() => {
    const active = items.filter((item) => item.enabled && item.text.trim() !== '');
    if (active.length >= 2) {
      return active.slice(0, 12).map((item) => item.text.trim());
    }
    return FALLBACK_LABELS;
  }, [items]);

  const palette = colors.length >= 2 ? colors : ['#2563eb', '#ec4899'];

  const slices = useMemo(() => {
    const total = previewItems.length;
    const angle = 360 / total;
    const cx = 100;
    const cy = 100;
    const r = 98;

    return previewItems.map((label, idx) => {
      const startDeg = idx * angle - 90;
      const endDeg = (idx + 1) * angle - 90;
      const startRad = (startDeg * Math.PI) / 180;
      const endRad = (endDeg * Math.PI) / 180;

      const x1 = cx + r * Math.cos(startRad);
      const y1 = cy + r * Math.sin(startRad);
      const x2 = cx + r * Math.cos(endRad);
      const y2 = cy + r * Math.sin(endRad);
      const largeArc = angle > 180 ? 1 : 0;

      const d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
      const midDeg = idx * angle + angle / 2 - 90;
      const color = palette[idx % palette.length];
      const textColor = getContrastYIQ(color);

      return {
        label,
        d,
        midDeg,
        color,
        textColor,
      };
    });
  }, [previewItems, palette]);

  const baseDiameter = 172;
  const scaledDiameter = Math.round(baseDiameter * (wheelScale / 100));
  const scaledCenterPx = Math.max(
    16,
    Math.min(Math.round(scaledDiameter * 0.44), Math.round(centerSize * (scaledDiameter / WHEEL_REFERENCE_SIZE)))
  );
  const labelFontSize = Math.max(5.5, Math.min(13, 8.2 * (textSize / 100) * (previewItems.length > 8 ? 0.85 : 1)));
  const resolvedCenterImage = centerImage !== undefined ? centerImage : DEFAULT_CENTER_IMAGE;
  const hasCenterImage = resolvedCenterImage.trim() !== '';

  const pointerFill = palette[0] || theme.stage.accentHex;
  const pointerStroke = getContrastYIQ(pointerFill);

  const handleTestSpin = () => {
    setPreviewRotation((prev) => prev + 720 + Math.floor(Math.random() * 360));
  };

  return (
    <div className="bg-[var(--studio-card)] border border-[var(--studio-border)] rounded-2xl p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-[var(--studio-text-secondary)]">
          {t('visualSettings.livePreview')}
        </span>
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border border-[var(--studio-border)] bg-[var(--studio-surface)] text-[var(--studio-text-secondary)]"
        >
          {theme.isLight ? <Sun size={11} className="text-amber-500" /> : <Moon size={11} className="text-sky-400" />}
          {theme.isLight ? t('visualSettings.themeLight') : t('visualSettings.themeDark')}
        </span>
      </div>

      {/* Stage Preview */}
      <div
        className={`relative w-full h-60 rounded-xl overflow-hidden flex items-center justify-center bg-gradient-to-br ${theme.stage.bgGradient} border border-[var(--studio-border)]`}
      >
        <div className={`absolute inset-0 pointer-events-none ${theme.stage.patternClass}`} />
        <div className={`absolute w-44 h-44 rounded-full pointer-events-none ${theme.stage.outerGlow}`} />

        <div
          className="relative flex items-center justify-center shrink-0 transition-all duration-200"
          style={{ width: `${scaledDiameter}px`, height: `${scaledDiameter}px` }}
        >
          {/* Pointer */}
          <div className={`absolute -right-3 top-1/2 -translate-y-1/2 z-30 pointer-events-none ${theme.stage.pointerShadow}`}>
            {renderPreviewPointer(pointerStyle, pointerFill, pointerStroke)}
          </div>

          {/* Rotating SVG Wheel */}
          <div
            className={`w-full h-full rounded-full overflow-hidden ${theme.stage.wheelContainerBorder} shadow-xl transition-transform duration-[1800ms] ease-[cubic-bezier(0.15,0.8,0.15,1)]`}
            style={{ transform: `rotate(${previewRotation}deg)` }}
          >
            <svg viewBox="0 0 200 200" className="w-full h-full block">
              {slices.map((slice, idx) => (
                <g key={idx}>
                  <path
                    d={slice.d}
                    fill={slice.color}
                    stroke={sliceBorderWidth > 0 ? 'rgba(0,0,0,0.34)' : 'none'}
                    strokeWidth={sliceBorderWidth * 0.75}
                  />
                  <g transform={`translate(100,100) rotate(${slice.midDeg})`}>
                    <text
                      x={90}
                      y={0}
                      fill={slice.textColor}
                      fontSize={labelFontSize}
                      fontWeight="700"
                      textAnchor="end"
                      dominantBaseline="central"
                      style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                    >
                      {slice.label.length > 10 ? `${slice.label.slice(0, 9)}…` : slice.label}
                    </text>
                  </g>
                </g>
              ))}
            </svg>
          </div>

          {/* Center Emblem */}
          <div
            className={`absolute rounded-full z-20 flex items-center justify-center overflow-hidden pointer-events-none transition-all duration-200 ${theme.stage.centerClasses}`}
            style={{
              width: `${scaledCenterPx}px`,
              height: `${scaledCenterPx}px`,
              ...(centerBgColor
                ? { backgroundColor: centerBgColor, backgroundImage: 'none' }
                : {}),
            }}
          >
            {hasCenterImage ? (
              <img
                src={resolvedCenterImage}
                alt="Emblema Central"
                className="w-[84%] h-[84%] object-contain rounded-full"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = DEFAULT_CENTER_IMAGE;
                }}
              />
            ) : (
              <div
                className="w-1/3 h-1/3 rounded-full opacity-90"
                style={{ backgroundColor: theme.stage.accentHex }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Interactive Spin & UI Token Strip */}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={handleTestSpin}
          className="flex-1 gap-1.5"
        >
          <RotateCw size={14} />
          <span>{t('visualSettings.testSpin')}</span>
        </Button>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={resetVisualSettings}
          title={t('visualSettings.resetAll')}
          className="gap-1.5"
        >
          <RotateCcw size={14} />
          <span className="hidden sm:inline">{t('visualSettings.resetAll')}</span>
        </Button>
      </div>

      {/* Mini UI Token Preview */}
      <div className="pt-2 border-t border-[var(--studio-border)] space-y-2">
        <div className="flex items-center justify-between text-[11px] text-[var(--studio-text-muted)]">
          <span className="font-medium">{t('visualSettings.themePreviewLabel')}</span>
          <span className="font-mono tabular-nums">
            {wheelScale}% · {textSize}% · {centerSize}px
          </span>
        </div>
        <div
          className="rounded-xl p-2.5 border flex items-center justify-between gap-2"
          style={{
            backgroundColor: theme.preview.canvas,
            borderColor: 'var(--studio-border)',
          }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="w-6 h-6 rounded-lg shrink-0 border"
              style={{ backgroundColor: theme.preview.surface, borderColor: 'var(--studio-border)' }}
            />
            <div
              className="px-2 py-1 rounded-md text-[11px] font-semibold truncate"
              style={{ backgroundColor: theme.preview.card, color: theme.preview.text }}
            >
              {t(`themes.${theme.id}`)}
            </div>
          </div>
          <span
            className="px-2.5 py-1 rounded-md text-[10px] font-bold shrink-0"
            style={{
              backgroundColor: theme.cssVars['--studio-accent'],
              color: theme.cssVars['--studio-accent-text'],
            }}
          >
            CTA
          </span>
        </div>
      </div>
    </div>
  );
};
