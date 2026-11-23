import React, { useRef, useState } from 'react';
import {
  Type,
  Monitor,
  Image as ImageIcon,
  Palette,
  Plus,
  X,
  Package,
  Dices,
  FlaskConical,
  Disc,
  Layers,
  Flag,
  Target,
  Maximize2,
  Sliders,
  Sparkles,
  Shuffle,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Upload,
  Trash2,
  Ban,
  Sun,
  Moon,
  Check,
  AlertCircle,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../../store/useAppStore';
import { useWheelActions } from '../../../hooks/useWheelActions';
import {
  THEME_LIST,
  COLOR_PALETTE_PRESETS,
  CENTER_EMBLEM_PRESETS,
  PointerStyle,
  UiDensity,
} from '../../../constants/themes';
import { DEFAULT_SLICE_COLORS } from '../../../constants';
import { VisualPreview } from './VisualPreview';
import { Toggle } from '../../atoms/Toggle';
import { Button } from '../../atoms/Button';

const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

export const VisualSettings: React.FC = () => {
  const { t } = useTranslation();

  const wheelType = useAppStore((s) => s.wheelType);
  const setWheelType = useAppStore((s) => s.setWheelType);
  const testModeEnabled = useAppStore((s) => s.testModeEnabled);

  const wheelTheme = useAppStore((s) => s.wheelTheme);
  const setWheelTheme = useAppStore((s) => s.setWheelTheme);

  const textSize = useAppStore((s) => s.textSize);
  const setTextSize = useAppStore((s) => s.setTextSize);
  const centerSize = useAppStore((s) => s.centerSize);
  const setCenterSize = useAppStore((s) => s.setCenterSize);
  const wheelScale = useAppStore((s) => s.wheelScale);
  const setWheelScale = useAppStore((s) => s.setWheelScale);
  const sliceBorderWidth = useAppStore((s) => s.sliceBorderWidth);
  const setSliceBorderWidth = useAppStore((s) => s.setSliceBorderWidth);
  const pointerStyle = useAppStore((s) => s.pointerStyle);
  const setPointerStyle = useAppStore((s) => s.setPointerStyle);
  const uiDensity = useAppStore((s) => s.uiDensity);
  const setUiDensity = useAppStore((s) => s.setUiDensity);

  const centerImage = useAppStore((s) => s.centerImage);
  const setCenterImage = useAppStore((s) => s.setCenterImage);
  const centerBgColor = useAppStore((s) => s.centerBgColor);
  const setCenterBgColor = useAppStore((s) => s.setCenterBgColor);

  const colors = useAppStore((s) => s.colors);
  const newColor = useAppStore((s) => s.newColor);
  const setNewColor = useAppStore((s) => s.setNewColor);
  const updateColor = useAppStore((s) => s.updateColor);
  const moveColor = useAppStore((s) => s.moveColor);
  const shuffleColors = useAppStore((s) => s.shuffleColors);
  const applyColorPalette = useAppStore((s) => s.applyColorPalette);

  const { handleAddColor, handleRemoveColor } = useWheelActions();

  const [autoApplyThemePalette, setAutoApplyThemePalette] = useState(true);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatOptions = [
    { id: 'classic', label: t('visualSettings.classic'), icon: Disc },
    { id: 'horizon', label: t('visualSettings.slot'), icon: Layers },
    { id: 'mystery_box', label: t('visualSettings.boxes'), icon: Package },
    { id: 'race', label: t('visualSettings.race'), icon: Flag },
    { id: 'penalty_shootout', label: t('visualSettings.penalty_shootout'), icon: Target },
    { id: 'bingo', label: t('visualSettings.bingo') || 'Bingo', icon: Dices },
    ...(testModeEnabled
      ? [{ id: 'test', label: t('testMode.button') || 'Modo de Teste', icon: FlaskConical }]
      : []),
  ] as const;

  const activeThemeDef = THEME_LIST.find((th) => th.id === wheelTheme) || THEME_LIST[0];

  const handleSelectTheme = (themeId: string, suggestedPaletteId: string) => {
    setWheelTheme(themeId);
    if (autoApplyThemePalette) {
      const preset = COLOR_PALETTE_PRESETS.find((p) => p.id === suggestedPaletteId);
      if (preset) {
        applyColorPalette(preset.colors);
      }
    }
  };

  const handleApplySuggestedPalette = () => {
    const preset = COLOR_PALETTE_PRESETS.find((p) => p.id === activeThemeDef.suggestedPaletteId);
    if (preset) {
      applyColorPalette(preset.colors);
    }
  };

  const sizePresets = [
    {
      id: 'S',
      label: t('visualSettings.sizeS'),
      wheelScale: 85,
      textSize: 85,
      centerSize: 75,
      sliceBorderWidth: 1,
    },
    {
      id: 'M',
      label: t('visualSettings.sizeM'),
      wheelScale: 100,
      textSize: 100,
      centerSize: 100,
      sliceBorderWidth: 2,
    },
    {
      id: 'L',
      label: t('visualSettings.sizeL'),
      wheelScale: 112,
      textSize: 120,
      centerSize: 125,
      sliceBorderWidth: 3,
    },
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError(t('visualSettings.imageInvalid'));
      return;
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      setUploadError(t('visualSettings.imageTooLarge'));
      return;
    }

    setUploadError(null);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCenterImage(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const colorsMatch = (a: string[], b: string[]) =>
    a.length === b.length && a.every((c, idx) => c.toLowerCase() === b[idx].toLowerCase());

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h3 className="font-display text-lg font-bold text-[var(--studio-text)]">
          {t('visualSettings.title')}
        </h3>
        <p className="text-xs text-[var(--studio-text-muted)] mt-1">
          {t('visualSettings.subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[330px_1fr] gap-6 items-start">
        {/* Sticky Live Preview Column */}
        <div className="xl:sticky xl:top-0">
          <VisualPreview />
        </div>

        {/* Customization Controls Column */}
        <div className="space-y-5 min-w-0">
          {/* 1. Draw Format */}
          <section className="bg-[var(--studio-card)] border border-[var(--studio-border)] rounded-2xl p-5 space-y-3">
            <label className="text-sm font-semibold text-[var(--studio-text)] block">
              {t('visualSettings.wheelFormat')}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
              {formatOptions.map((opt) => {
                const Icon = opt.icon;
                const isSelected = wheelType === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setWheelType(opt.id as any)}
                    className={`p-3 rounded-xl border transition-colors flex flex-col items-center justify-center gap-2 text-center min-h-[84px] ${
                      isSelected
                        ? 'border-[var(--studio-accent)] bg-[var(--studio-accent-soft)] text-[var(--studio-text)]'
                        : 'border-[var(--studio-border)] bg-[var(--studio-input)] text-[var(--studio-text-muted)] hover:border-[var(--studio-border-strong)] hover:text-[var(--studio-text)]'
                    }`}
                  >
                    <Icon
                      size={22}
                      className={isSelected ? 'text-[var(--studio-accent-fg)]' : 'text-[var(--studio-text-muted)]'}
                    />
                    <span className="font-semibold text-xs leading-tight">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* 2. Global Interface Themes */}
          <section className="bg-[var(--studio-card)] border border-[var(--studio-border)] rounded-2xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-sm font-semibold text-[var(--studio-text)] flex items-center gap-2">
                <Sparkles size={15} className="text-[var(--studio-accent-fg)]" />
                <span>{t('visualSettings.visualTheme')}</span>
              </label>

              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleApplySuggestedPalette}
                className="text-xs gap-1.5"
              >
                <Palette size={13} />
                <span>{t('visualSettings.applySuggestedPalette')}</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {THEME_LIST.map((themeDef) => {
                const isSelected = wheelTheme === themeDef.id;
                return (
                  <button
                    key={themeDef.id}
                    type="button"
                    onClick={() => handleSelectTheme(themeDef.id, themeDef.suggestedPaletteId)}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-2.5 ${
                      isSelected
                        ? 'border-[var(--studio-accent)] bg-[var(--studio-accent-soft)] ring-1 ring-[var(--studio-accent)]'
                        : 'border-[var(--studio-border)] bg-[var(--studio-input)] hover:border-[var(--studio-border-strong)]'
                    }`}
                  >
                    {/* Theme Swatch Strip */}
                    <div
                      className="w-full h-9 rounded-lg border p-1.5 flex items-center justify-between"
                      style={{
                        backgroundColor: themeDef.preview.canvas,
                        borderColor: themeDef.cssVars['--studio-border'],
                      }}
                    >
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-4 h-4 rounded-md"
                          style={{ backgroundColor: themeDef.preview.surface }}
                        />
                        <span
                          className="w-4 h-4 rounded-md"
                          style={{ backgroundColor: themeDef.preview.card }}
                        />
                        <span
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: themeDef.preview.accent }}
                        />
                      </div>
                      <span
                        className="text-[10px] font-semibold px-1.5 py-0.5 rounded flex items-center gap-1"
                        style={{
                          backgroundColor: themeDef.preview.card,
                          color: themeDef.preview.text,
                        }}
                      >
                        {themeDef.isLight ? <Sun size={10} /> : <Moon size={10} />}
                        {themeDef.isLight ? t('visualSettings.themeLight') : t('visualSettings.themeDark')}
                      </span>
                    </div>

                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[var(--studio-text)] truncate">
                          {t(`themes.${themeDef.id}`)}
                        </div>
                        <div className="text-[11px] text-[var(--studio-text-muted)] line-clamp-1 mt-0.5">
                          {t(`themes.descriptions.${themeDef.id}`)}
                        </div>
                      </div>
                      {isSelected && (
                        <Check size={15} className="text-[var(--studio-accent-fg)] shrink-0 mt-0.5" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="pt-2 border-t border-[var(--studio-border)] flex items-center justify-between gap-3">
              <span className="text-xs text-[var(--studio-text-secondary)]">
                {t('visualSettings.autoApplyPalette')}
              </span>
              <Toggle
                enabled={autoApplyThemePalette}
                onChange={setAutoApplyThemePalette}
                ariaLabel={t('visualSettings.autoApplyPalette')}
              />
            </div>
          </section>

          {/* 3. Proportions, Pointer & UI Density */}
          <section className="bg-[var(--studio-card)] border border-[var(--studio-border)] rounded-2xl p-5 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm font-semibold text-[var(--studio-text)] flex items-center gap-2">
                <Sliders size={15} className="text-[var(--studio-accent-fg)]" />
                <span>{t('visualSettings.proportions')}</span>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-[var(--studio-text-muted)] mr-1">
                  {t('visualSettings.quickSizes')}:
                </span>
                {sizePresets.map((preset) => {
                  const isActive =
                    wheelScale === preset.wheelScale &&
                    textSize === preset.textSize &&
                    centerSize === preset.centerSize &&
                    sliceBorderWidth === preset.sliceBorderWidth;

                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setWheelScale(preset.wheelScale);
                        setTextSize(preset.textSize);
                        setCenterSize(preset.centerSize);
                        setSliceBorderWidth(preset.sliceBorderWidth);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                        isActive
                          ? 'bg-[var(--studio-accent)] text-[var(--studio-accent-text)] border-[var(--studio-accent)]'
                          : 'bg-[var(--studio-input)] text-[var(--studio-text-secondary)] border-[var(--studio-border)] hover:border-[var(--studio-border-strong)]'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Detailed Sliders */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-medium text-[var(--studio-text-secondary)] flex items-center gap-1.5">
                    <Maximize2 size={13} className="text-[var(--studio-accent-fg)]" />
                    <span>{t('visualSettings.wheelScale')}</span>
                  </label>
                  <span className="text-xs font-mono tabular-nums text-[var(--studio-text)]">{wheelScale}%</span>
                </div>
                <input
                  type="range"
                  min={75}
                  max={115}
                  step={1}
                  value={wheelScale}
                  onChange={(e) => setWheelScale(Number(e.target.value))}
                  className="w-full h-2 bg-[var(--studio-input)] rounded-lg appearance-none cursor-pointer accent-[var(--studio-accent)]"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-medium text-[var(--studio-text-secondary)] flex items-center gap-1.5">
                    <Type size={13} className="text-[var(--studio-accent-fg)]" />
                    <span>{t('visualSettings.textSize')}</span>
                  </label>
                  <span className="text-xs font-mono tabular-nums text-[var(--studio-text)]">{textSize}%</span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={200}
                  step={5}
                  value={textSize}
                  onChange={(e) => setTextSize(Number(e.target.value))}
                  className="w-full h-2 bg-[var(--studio-input)] rounded-lg appearance-none cursor-pointer accent-[var(--studio-accent)]"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-medium text-[var(--studio-text-secondary)] flex items-center gap-1.5">
                    <Monitor size={13} className="text-[var(--studio-accent-fg)]" />
                    <span>{t('visualSettings.centerSize')}</span>
                  </label>
                  <span className="text-xs font-mono tabular-nums text-[var(--studio-text)]">{centerSize}px</span>
                </div>
                <input
                  type="range"
                  min={40}
                  max={180}
                  step={2}
                  value={centerSize}
                  onChange={(e) => setCenterSize(Number(e.target.value))}
                  className="w-full h-2 bg-[var(--studio-input)] rounded-lg appearance-none cursor-pointer accent-[var(--studio-accent)]"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-medium text-[var(--studio-text-secondary)] flex items-center gap-1.5">
                    <Disc size={13} className="text-[var(--studio-accent-fg)]" />
                    <span>{t('visualSettings.sliceBorder')}</span>
                  </label>
                  <span className="text-xs font-mono tabular-nums text-[var(--studio-text)]">{sliceBorderWidth}px</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={6}
                  step={1}
                  value={sliceBorderWidth}
                  onChange={(e) => setSliceBorderWidth(Number(e.target.value))}
                  className="w-full h-2 bg-[var(--studio-input)] rounded-lg appearance-none cursor-pointer accent-[var(--studio-accent)]"
                />
              </div>
            </div>

            {/* Pointer Style & UI Density */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-[var(--studio-border)]">
              <div className="space-y-2">
                <label className="text-xs font-medium text-[var(--studio-text-secondary)] block">
                  {t('visualSettings.pointerStyle')}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['classic', 'needle', 'badge'] as PointerStyle[]).map((style) => {
                    const isSelected = pointerStyle === style;
                    return (
                      <button
                        key={style}
                        type="button"
                        onClick={() => setPointerStyle(style)}
                        className={`px-2.5 py-2 rounded-xl border text-xs font-semibold transition-colors ${
                          isSelected
                            ? 'border-[var(--studio-accent)] bg-[var(--studio-accent-soft)] text-[var(--studio-text)]'
                            : 'border-[var(--studio-border)] bg-[var(--studio-input)] text-[var(--studio-text-muted)] hover:border-[var(--studio-border-strong)]'
                        }`}
                      >
                        {t(`visualSettings.pointers.${style}`)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-[var(--studio-text-secondary)] block">
                  {t('visualSettings.uiDensity')}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['comfortable', 'compact'] as UiDensity[]).map((density) => {
                    const isSelected = uiDensity === density;
                    return (
                      <button
                        key={density}
                        type="button"
                        onClick={() => setUiDensity(density)}
                        className={`px-3 py-2 rounded-xl border text-xs font-semibold transition-colors ${
                          isSelected
                            ? 'border-[var(--studio-accent)] bg-[var(--studio-accent-soft)] text-[var(--studio-text)]'
                            : 'border-[var(--studio-border)] bg-[var(--studio-input)] text-[var(--studio-text-muted)] hover:border-[var(--studio-border-strong)]'
                        }`}
                      >
                        {t(`visualSettings.densities.${density}`)}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          {/* 4. Color Palette Studio */}
          <section className="bg-[var(--studio-card)] border border-[var(--studio-border)] rounded-2xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-sm font-semibold text-[var(--studio-text)] flex items-center gap-2">
                <Palette size={15} className="text-[var(--studio-accent-fg)]" />
                <span>{t('visualSettings.colorPalette')}</span>
                <span className="font-mono tabular-nums text-xs text-[var(--studio-text-muted)]">
                  ({colors.length})
                </span>
              </label>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={shuffleColors}
                  className="text-xs gap-1.5"
                >
                  <Shuffle size={13} />
                  <span>{t('visualSettings.shuffleColors')}</span>
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => applyColorPalette(DEFAULT_SLICE_COLORS)}
                  className="text-xs gap-1.5"
                >
                  <RotateCcw size={13} />
                  <span>{t('visualSettings.resetPalette')}</span>
                </Button>
              </div>
            </div>

            {/* Preset Palettes */}
            <div className="space-y-2">
              <span className="text-xs font-medium text-[var(--studio-text-secondary)] block">
                {t('visualSettings.palettePresets')}
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {COLOR_PALETTE_PRESETS.map((preset) => {
                  const isActive = colorsMatch(colors, preset.colors);
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => applyColorPalette(preset.colors)}
                      className={`p-2.5 rounded-xl border text-left transition-colors space-y-1.5 ${
                        isActive
                          ? 'border-[var(--studio-accent)] bg-[var(--studio-accent-soft)]'
                          : 'border-[var(--studio-border)] bg-[var(--studio-input)] hover:border-[var(--studio-border-strong)]'
                      }`}
                    >
                      <span className="text-[11px] font-semibold text-[var(--studio-text)] block truncate">
                        {t(preset.nameKey, preset.fallbackName)}
                      </span>
                      <div className="flex items-center gap-1">
                        {preset.colors.slice(0, 6).map((hex, idx) => (
                          <span
                            key={idx}
                            className="h-2.5 flex-1 rounded-full border border-black/15"
                            style={{ backgroundColor: hex }}
                          />
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Inline Editable Swatches */}
            <div className="space-y-2.5 pt-2 border-t border-[var(--studio-border)]">
              <span className="text-xs font-medium text-[var(--studio-text-secondary)] block">
                {t('visualSettings.customColors')}
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {colors.map((c, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-1.5 bg-[var(--studio-input)] border border-[var(--studio-border)] rounded-xl p-1.5"
                  >
                    <label
                      className="w-7 h-7 rounded-lg border border-[var(--studio-border-strong)] cursor-pointer shrink-0 overflow-hidden relative"
                      style={{ backgroundColor: c }}
                      title={c}
                    >
                      <input
                        type="color"
                        value={c}
                        onChange={(e) => updateColor(i, e.target.value)}
                        aria-label={`Cor ${i + 1}`}
                        className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                      />
                    </label>
                    <span className="text-[11px] font-mono uppercase text-[var(--studio-text-secondary)] select-none hidden sm:inline">
                      {c}
                    </span>
                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => moveColor(i, 'left')}
                        disabled={i === 0}
                        aria-label={t('visualSettings.moveLeft')}
                        title={t('visualSettings.moveLeft')}
                        className="p-1 rounded hover:bg-[var(--studio-surface-elevated)] text-[var(--studio-text-muted)] hover:text-[var(--studio-text)] disabled:opacity-25"
                      >
                        <ChevronLeft size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveColor(i, 'right')}
                        disabled={i === colors.length - 1}
                        aria-label={t('visualSettings.moveRight')}
                        title={t('visualSettings.moveRight')}
                        className="p-1 rounded hover:bg-[var(--studio-surface-elevated)] text-[var(--studio-text-muted)] hover:text-[var(--studio-text)] disabled:opacity-25"
                      >
                        <ChevronRight size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveColor(i)}
                        disabled={colors.length <= 2}
                        aria-label={t('visualSettings.removeColor')}
                        title={t('visualSettings.removeColor')}
                        className="p-1 rounded hover:bg-red-500/15 text-[var(--studio-text-muted)] hover:text-red-400 disabled:opacity-25"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Add Color Control */}
                <div className="flex items-center">
                  <label className="flex items-center justify-center bg-[var(--studio-input)] border border-[var(--studio-border)] rounded-l-xl px-2 h-10 cursor-pointer">
                    <input
                      type="color"
                      value={newColor}
                      onChange={(e) => setNewColor(e.target.value)}
                      aria-label="Nova cor"
                      className="w-6 h-6 rounded cursor-pointer border-0 p-0 bg-transparent"
                    />
                  </label>
                  <Button
                    type="button"
                    variant="primary"
                    size="md"
                    onClick={handleAddColor}
                    className="rounded-l-none gap-1.5 h-10"
                  >
                    <Plus size={14} />
                    <span>{t('visualSettings.add')}</span>
                  </Button>
                </div>
              </div>
            </div>
          </section>

          {/* 5. Center Emblem Studio */}
          <section className="bg-[var(--studio-card)] border border-[var(--studio-border)] rounded-2xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-sm font-semibold text-[var(--studio-text)] flex items-center gap-2">
                <ImageIcon size={15} className="text-[var(--studio-accent-fg)]" />
                <span>{t('visualSettings.centerImage')}</span>
              </label>

              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs gap-1.5"
                >
                  <Upload size={13} />
                  <span>{t('visualSettings.uploadImage')}</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setUploadError(null);
                    setCenterImage('');
                  }}
                  disabled={centerImage === ''}
                  className="text-xs gap-1.5"
                >
                  <Trash2 size={13} />
                  <span>{t('visualSettings.clearImage')}</span>
                </Button>
              </div>
            </div>

            {uploadError && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400">
                <AlertCircle size={14} className="shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            {/* Emblem Presets */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
              {CENTER_EMBLEM_PRESETS.map((preset) => {
                const isSelected = centerImage === preset.dataUri;
                const thumbBgStyle: React.CSSProperties =
                  centerBgColor === 'transparent'
                    ? {
                        backgroundImage:
                          'linear-gradient(45deg, rgba(148,163,184,0.28) 25%, transparent 25%), linear-gradient(-45deg, rgba(148,163,184,0.28) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(148,163,184,0.28) 75%), linear-gradient(-45deg, transparent 75%, rgba(148,163,184,0.28) 75%)',
                        backgroundSize: '8px 8px',
                        backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0',
                      }
                    : centerBgColor
                    ? { backgroundColor: centerBgColor }
                    : { backgroundColor: activeThemeDef.preview.surface };

                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setUploadError(null);
                      setCenterImage(preset.dataUri);
                    }}
                    className={`p-2.5 rounded-xl border transition-colors flex flex-col items-center justify-center gap-1.5 ${
                      isSelected
                        ? 'border-[var(--studio-accent)] bg-[var(--studio-accent-soft)] text-[var(--studio-text)]'
                        : 'border-[var(--studio-border)] bg-[var(--studio-input)] text-[var(--studio-text-muted)] hover:border-[var(--studio-border-strong)]'
                    }`}
                  >
                    <div
                      className="w-9 h-9 rounded-full border border-[var(--studio-border-strong)] flex items-center justify-center overflow-hidden transition-colors"
                      style={thumbBgStyle}
                    >
                      {preset.dataUri ? (
                        <img
                          src={preset.dataUri}
                          alt={t(preset.labelKey, preset.fallbackLabel)}
                          className="w-7 h-7 object-contain"
                        />
                      ) : (
                        <Ban size={16} className="text-[var(--studio-text-muted)]" />
                      )}
                    </div>
                    <span className="text-[11px] font-medium truncate max-w-full">
                      {t(preset.labelKey, preset.fallbackLabel)}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Center Emblem Background Color */}
            <div className="pt-3 border-t border-[var(--studio-border)] space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-[var(--studio-text-secondary)]">
                  {t('visualSettings.centerBgColor')}
                </span>
                <span className="text-[11px] font-mono text-[var(--studio-text-muted)]">
                  {centerBgColor === ''
                    ? t('visualSettings.centerBgAuto')
                    : centerBgColor === 'transparent'
                    ? t('visualSettings.centerBgTransparent')
                    : centerBgColor.toUpperCase()}
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setCenterBgColor('')}
                  className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                    centerBgColor === ''
                      ? 'border-[var(--studio-accent)] bg-[var(--studio-accent-soft)] text-[var(--studio-text)]'
                      : 'border-[var(--studio-border)] bg-[var(--studio-input)] text-[var(--studio-text-secondary)] hover:border-[var(--studio-border-strong)]'
                  }`}
                >
                  {t('visualSettings.centerBgAuto')}
                </button>

                <button
                  type="button"
                  onClick={() => setCenterBgColor('transparent')}
                  className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors inline-flex items-center gap-1.5 ${
                    centerBgColor === 'transparent'
                      ? 'border-[var(--studio-accent)] bg-[var(--studio-accent-soft)] text-[var(--studio-text)]'
                      : 'border-[var(--studio-border)] bg-[var(--studio-input)] text-[var(--studio-text-secondary)] hover:border-[var(--studio-border-strong)]'
                  }`}
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-[var(--studio-border-strong)] shrink-0"
                    style={{
                      backgroundImage:
                        'linear-gradient(45deg, rgba(148,163,184,0.45) 25%, transparent 25%), linear-gradient(-45deg, rgba(148,163,184,0.45) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(148,163,184,0.45) 75%), linear-gradient(-45deg, transparent 75%, rgba(148,163,184,0.45) 75%)',
                      backgroundSize: '6px 6px',
                      backgroundPosition: '0 0, 0 3px, 3px -3px, -3px 0',
                    }}
                  />
                  <span>{t('visualSettings.centerBgTransparent')}</span>
                </button>

                <div className="h-5 w-px bg-[var(--studio-border)] mx-0.5 hidden sm:block" />

                {['#0f172a', '#ffffff', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#8b5cf6'].map(
                  (presetColor) => {
                    const isActive = centerBgColor.toLowerCase() === presetColor.toLowerCase();
                    return (
                      <button
                        key={presetColor}
                        type="button"
                        onClick={() => setCenterBgColor(presetColor)}
                        aria-label={presetColor}
                        title={presetColor.toUpperCase()}
                        className={`w-7 h-7 rounded-lg border transition-transform hover:scale-105 ${
                          isActive
                            ? 'ring-2 ring-[var(--studio-accent)] ring-offset-2 ring-offset-[var(--studio-card)] border-white/60'
                            : 'border-[var(--studio-border-strong)]'
                        }`}
                        style={{ backgroundColor: presetColor }}
                      />
                    );
                  }
                )}

                <label
                  title={t('visualSettings.centerBgCustom')}
                  className={`relative w-7 h-7 rounded-lg border cursor-pointer flex items-center justify-center overflow-hidden transition-transform hover:scale-105 ${
                    centerBgColor !== '' && centerBgColor !== 'transparent'
                      ? 'border-[var(--studio-accent)] ring-1 ring-[var(--studio-accent)]'
                      : 'border-[var(--studio-border-strong)] bg-[var(--studio-input)]'
                  }`}
                  style={
                    centerBgColor.startsWith('#')
                      ? { backgroundColor: centerBgColor }
                      : undefined
                  }
                >
                  <Palette
                    size={13}
                    className={
                      centerBgColor.startsWith('#')
                        ? 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]'
                        : 'text-[var(--studio-text-secondary)]'
                    }
                  />
                  <input
                    type="color"
                    aria-label={t('visualSettings.centerBgCustom')}
                    value={centerBgColor.startsWith('#') ? centerBgColor : '#0f172a'}
                    onChange={(e) => setCenterBgColor(e.target.value)}
                    className="sr-only"
                  />
                </label>
              </div>
            </div>

            {/* External URL Input */}
            <div className="space-y-1.5">
              <div className="flex items-center bg-[var(--studio-input)] border border-[var(--studio-border)] rounded-xl px-3 h-10 focus-within:border-[var(--studio-accent)] focus-within:ring-2 focus-within:ring-[var(--studio-accent-soft)] transition-colors">
                <ImageIcon size={15} className="text-[var(--studio-text-muted)] mr-2 shrink-0" />
                <input
                  type="text"
                  value={centerImage}
                  onChange={(e) => {
                    setUploadError(null);
                    setCenterImage(e.target.value);
                  }}
                  placeholder={t('visualSettings.centerImagePlh')}
                  className="w-full bg-transparent text-sm text-[var(--studio-text)] outline-none placeholder:text-[var(--studio-text-muted)]"
                />
              </div>
              <p className="text-xs text-[var(--studio-text-muted)]">
                {t('visualSettings.centerImageHint')}
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
