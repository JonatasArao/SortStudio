import React, { useEffect, useMemo } from 'react';
import {
  Sparkles,
  Clock,
  Trash2,
  Skull,
  Crown,
  Settings,
  Gamepad2,
  Scale,
  Zap,
  Swords,
  Shield,
  FlaskConical,
  Eye,
  Repeat,
  TrendingDown,
  TrendingUp,
  Flame,
  Timer,
  Flag,
  Gauge,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Toggle } from '../../atoms/Toggle';
import { Input } from '../../atoms/Input';
import { useAppStore } from '../../../store/useAppStore';
import { getSpinTimeRanges } from '../../../utils/spinUtils';

const SectionCard = ({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) => (
  <section className="bg-[var(--studio-card)] border border-[var(--studio-border)] rounded-2xl p-5 flex flex-col gap-5">
    <h4 className="font-display text-sm font-bold text-[var(--studio-text)] flex items-center gap-2.5 border-b border-[var(--studio-border)] pb-3">
      {icon}
      <span>{title}</span>
    </h4>
    <div className="flex flex-col gap-5">{children}</div>
  </section>
);

export const GeneralSettings = () => {
  const { t } = useTranslation();
  const title = useAppStore(s => s.title);
  const setTitle = useAppStore(s => s.setTitle);
  const winMessage = useAppStore(s => s.winMessage);
  const setWinMessage = useAppStore(s => s.setWinMessage);
  const eliminationMessage = useAppStore(s => s.eliminationMessage);
  const setEliminationMessage = useAppStore(s => s.setEliminationMessage);
  const grandWinnerMessage = useAppStore(s => s.grandWinnerMessage);
  const setGrandWinnerMessage = useAppStore(s => s.setGrandWinnerMessage);
  const spinTime = useAppStore(s => s.spinTime);
  const setSpinTime = useAppStore(s => s.setSpinTime);
  const showConfetti = useAppStore(s => s.showConfetti);
  const setShowConfetti = useAppStore(s => s.setShowConfetti);
  const autoRemoveWinner = useAppStore(s => s.autoRemoveWinner);
  const setAutoRemoveWinner = useAppStore(s => s.setAutoRemoveWinner);
  const eliminationMode = useAppStore(s => s.eliminationMode);
  const setEliminationMode = useAppStore(s => s.setEliminationMode);
  const autoContinueElimination = useAppStore(s => s.autoContinueElimination);
  const setAutoContinueElimination = useAppStore(s => s.setAutoContinueElimination);
  const eliminationSpinTime = useAppStore(s => s.eliminationSpinTime);
  const setEliminationSpinTime = useAppStore(s => s.setEliminationSpinTime);
  const autoEliminationSpeed = useAppStore(s => s.autoEliminationSpeed);
  const setAutoEliminationSpeed = useAppStore(s => s.setAutoEliminationSpeed);
  const antiRepetitionEnabled = useAppStore(s => s.antiRepetitionEnabled);
  const setAntiRepetitionEnabled = useAppStore(s => s.setAntiRepetitionEnabled);
  const antiRepetitionCount = useAppStore(s => s.antiRepetitionCount);
  const setAntiRepetitionCount = useAppStore(s => s.setAntiRepetitionCount);
  const balanceWeightsByWins = useAppStore(s => s.balanceWeightsByWins);
  const balanceWeightsMode = useAppStore(s => s.balanceWeightsMode);
  const setBalanceWeightsMode = useAppStore(s => s.setBalanceWeightsMode);
  const setBalanceWeightsByWins = useAppStore(s => s.setBalanceWeightsByWins);
  const pitySystemEnabled = useAppStore(s => s.pitySystemEnabled);
  const setPitySystemEnabled = useAppStore(s => s.setPitySystemEnabled);
  const ignoreNewItemWeight = useAppStore(s => s.ignoreNewItemWeight);
  const setIgnoreNewItemWeight = useAppStore(s => s.setIgnoreNewItemWeight);
  const newItemWeightMode = useAppStore(s => s.newItemWeightMode);
  const setNewItemWeightMode = useAppStore(s => s.setNewItemWeightMode);
  const showPitySystemVisually = useAppStore(s => s.showPitySystemVisually);
  const setShowPitySystemVisually = useAppStore(s => s.setShowPitySystemVisually);
  const balanceScope = useAppStore(s => s.balanceScope);
  const setBalanceScope = useAppStore(s => s.setBalanceScope);
  const wheelType = useAppStore(s => s.wheelType);
  const setWheelType = useAppStore(s => s.setWheelType);
  const raceTrackStyle = useAppStore(s => s.raceTrackStyle);
  const setRaceTrackStyle = useAppStore(s => s.setRaceTrackStyle);
  const penaltySaveWins = useAppStore(s => s.penaltySaveWins);
  const setPenaltySaveWins = useAppStore(s => s.setPenaltySaveWins);
  const testModeEnabled = useAppStore(s => s.testModeEnabled);
  const setTestModeEnabled = useAppStore(s => s.setTestModeEnabled);

  const spinRange = useMemo(() => getSpinTimeRanges(wheelType, false), [wheelType]);
  const elimSpinRange = useMemo(() => getSpinTimeRanges(wheelType, true), [wheelType]);

  useEffect(() => {
    if (spinTime < spinRange.min) setSpinTime(spinRange.min);
    else if (spinTime > spinRange.max) setSpinTime(spinRange.max);

    if (eliminationSpinTime < elimSpinRange.min) setEliminationSpinTime(elimSpinRange.min);
    else if (eliminationSpinTime > elimSpinRange.max) setEliminationSpinTime(elimSpinRange.max);
  }, [wheelType, spinRange, elimSpinRange, spinTime, eliminationSpinTime, setSpinTime, setEliminationSpinTime]);

  return (
    <div className="space-y-6 pb-8">
      <h3 className="font-display text-lg font-bold text-[var(--studio-text)]">{t('settings.general.title')}</h3>

      <SectionCard
        title={t('settings.general.basicInfo', 'Informações Básicas')}
        icon={<Settings size={16} className="text-[var(--studio-accent-fg)]" />}
      >
        <div className="space-y-2 flex flex-col">
          <label className="text-sm font-medium text-[var(--studio-text-secondary)]">
            {t('settings.general.drawName')}
          </label>
          <Input type="text" value={title} onChange={e => setTitle(e.target.value)} />
        </div>

        {eliminationMode ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 flex flex-col">
              <label className="text-sm font-medium text-[var(--studio-text-secondary)] flex items-center gap-2">
                <Skull size={14} className="text-red-600 dark:text-red-400" />
                <span>{t('settings.general.eliminationMessage')}</span>
              </label>
              <Input
                type="text"
                value={eliminationMessage}
                onChange={e => setEliminationMessage(e.target.value)}
                placeholder={t('settings.general.eliminationMessagePlh')}
              />
            </div>
            <div className="space-y-2 flex flex-col">
              <label className="text-sm font-medium text-[var(--studio-text-secondary)] flex items-center gap-2">
                <Crown size={14} className="text-amber-600 dark:text-amber-400" />
                <span>{t('settings.general.winnerMessage')}</span>
              </label>
              <Input
                type="text"
                value={grandWinnerMessage}
                onChange={e => setGrandWinnerMessage(e.target.value)}
                placeholder={t('settings.general.winnerMessagePlh')}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-2 flex flex-col">
            <label className="text-sm font-medium text-[var(--studio-text-secondary)]">
              {t('settings.general.winMessage')}
            </label>
            <Input
              type="text"
              value={winMessage}
              onChange={e => setWinMessage(e.target.value)}
              placeholder={t('settings.general.winMessagePlh')}
            />
          </div>
        )}

        <div className="space-y-3 pt-3 border-t border-[var(--studio-border)]">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-[var(--studio-text-secondary)] flex items-center gap-2">
              <Clock size={15} className="text-[var(--studio-accent-fg)]" />
              <span>
                {eliminationMode
                  ? t('settings.general.spinTimeFinal')
                  : t('settings.general.spinTime')}
              </span>
            </label>
            <span className="text-xs font-mono tabular-nums font-semibold text-[var(--studio-accent-fg)]">
              {spinTime} {t('settings.general.seconds')}
            </span>
          </div>
          <input
            type="range"
            min={spinRange.min}
            max={spinRange.max}
            step={spinRange.step}
            value={spinTime}
            onChange={e => setSpinTime(Number(e.target.value))}
            className="w-full h-2 bg-[var(--studio-input)] border border-[var(--studio-border)] rounded-lg appearance-none cursor-pointer accent-[var(--studio-accent)]"
          />
        </div>
      </SectionCard>

      <SectionCard
        title={t('settings.general.gameModes', 'Modos de Jogo')}
        icon={<Gamepad2 size={16} className="text-[var(--studio-accent-fg)]" />}
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium text-[var(--studio-text)] flex items-center gap-2">
                <Swords size={15} className="text-red-600 dark:text-red-400" />
                <span>{t('settings.general.eliminationMode')}</span>
              </label>
              <p className="text-xs text-[var(--studio-text-muted)] mt-1">{t('settings.general.eliminationModeDesc')}</p>
            </div>
            <Toggle enabled={eliminationMode} onChange={setEliminationMode} />
          </div>

          {eliminationMode && (
            <div className="flex flex-col gap-3 pl-4 pt-1 border-t border-[var(--studio-border)]">
              <div className="flex items-center justify-between bg-[var(--studio-input)] p-3.5 rounded-xl border border-[var(--studio-border)] gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium text-[var(--studio-text)]">
                    {t('settings.general.autoContinue')}
                  </label>
                  <p className="text-xs text-[var(--studio-text-muted)] mt-0.5">
                    {t('settings.general.autoContinueDesc')}
                  </p>
                </div>
                <Toggle enabled={autoContinueElimination} onChange={setAutoContinueElimination} />
              </div>

              <div className="bg-[var(--studio-input)] p-3.5 rounded-xl border border-[var(--studio-border)] space-y-2.5">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-[var(--studio-text)]">
                    {t('settings.general.fastSpinTime')}
                  </label>
                  <span className="text-xs font-mono tabular-nums font-semibold text-red-600 dark:text-red-400">
                    {eliminationSpinTime} {t('settings.general.seconds')}
                  </span>
                </div>
                <input
                  type="range"
                  min={elimSpinRange.min}
                  max={elimSpinRange.max}
                  step={elimSpinRange.step}
                  value={eliminationSpinTime}
                  onChange={e => setEliminationSpinTime(Number(e.target.value))}
                  className="w-full h-2 bg-[var(--studio-card)] border border-[var(--studio-border)] rounded-lg appearance-none cursor-pointer accent-red-500"
                />
              </div>

              <div className="bg-[var(--studio-input)] p-3.5 rounded-xl border border-[var(--studio-border)] space-y-2.5">
                <label className="text-sm font-medium text-[var(--studio-text)] block">Ritmo do Auto-Giro</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setAutoEliminationSpeed('turbo')}
                    className={`h-9 px-2 rounded-lg text-xs font-semibold border transition-colors flex items-center justify-center gap-1.5 ${
                      autoEliminationSpeed === 'turbo'
                        ? 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/40'
                        : 'bg-[var(--studio-card)] text-[var(--studio-text-muted)] border-[var(--studio-border)] hover:text-[var(--studio-text)]'
                    }`}
                  >
                    <Zap size={13} />
                    <span>Turbo (0.7s)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAutoEliminationSpeed('fast')}
                    className={`h-9 px-2 rounded-lg text-xs font-semibold border transition-colors flex items-center justify-center gap-1.5 ${
                      autoEliminationSpeed === 'fast'
                        ? 'bg-orange-500/20 text-orange-800 dark:text-orange-300 border-orange-500/40'
                        : 'bg-[var(--studio-card)] text-[var(--studio-text-muted)] border-[var(--studio-border)] hover:text-[var(--studio-text)]'
                    }`}
                  >
                    <Flame size={13} />
                    <span>Rápido (1.2s)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAutoEliminationSpeed('normal')}
                    className={`h-9 px-2 rounded-lg text-xs font-semibold border transition-colors flex items-center justify-center gap-1.5 ${
                      autoEliminationSpeed === 'normal'
                        ? 'bg-[var(--studio-accent-soft)] text-[var(--studio-accent-fg)] border-[var(--studio-accent)]/50'
                        : 'bg-[var(--studio-card)] text-[var(--studio-text-muted)] border-[var(--studio-border)] hover:text-[var(--studio-text)]'
                    }`}
                  >
                    <Timer size={13} />
                    <span>Normal (2.2s)</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {wheelType === 'race' && (
          <div className="pt-4 border-t border-[var(--studio-border)] space-y-3">
            <div>
              <label className="text-sm font-medium text-[var(--studio-text)] flex items-center gap-2">
                <Flag size={15} className="text-red-500" />
                <span>{t('settings.general.raceTrackStyle', 'Personalização do Modo Corrida')}</span>
              </label>
              <p className="text-xs text-[var(--studio-text-muted)] mt-1">
                {t('settings.general.raceTrackStyleDesc', 'Escolha o autódromo e o estilo dos carros quando o modo Corrida estiver ativo.')}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                {
                  id: 'interlagos' as const,
                  title: t('settings.general.raceTrackInterlagos', 'Interlagos · Fórmula 1'),
                  desc: t('settings.general.raceTrackInterlagosDesc', 'Circuito misto com elevações 3D, boxes e zonas de DRS.'),
                  icon: Flag,
                },
                {
                  id: 'daytona' as const,
                  title: t('settings.general.raceTrackDaytona', 'Daytona Oval · NASCAR'),
                  desc: t('settings.general.raceTrackDaytonaDesc', 'Tri-oval a 31°, Stock Cars com aerofólio e vácuo intenso.'),
                  icon: Gauge,
                },
              ].map((option) => {
                const Icon = option.icon;
                const isSelected = raceTrackStyle === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setRaceTrackStyle(option.id)}
                    className={`p-3.5 rounded-xl border text-left transition-colors flex flex-col gap-1.5 cursor-pointer ${
                      isSelected
                        ? 'border-[var(--studio-accent)] bg-[var(--studio-accent-soft)] ring-1 ring-[var(--studio-accent)]'
                        : 'border-[var(--studio-border)] bg-[var(--studio-input)] hover:border-[var(--studio-border-strong)]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-[var(--studio-text)] flex items-center gap-2">
                        <Icon size={15} className={isSelected ? 'text-[var(--studio-accent-fg)]' : 'text-[var(--studio-text-muted)]'} />
                        <span>{option.title}</span>
                      </span>
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                          isSelected
                            ? 'border-[var(--studio-accent)] bg-[var(--studio-accent)]/20'
                            : 'border-[var(--studio-border-strong)]'
                        }`}
                      >
                        {isSelected && <div className="w-2 h-2 rounded-full bg-[var(--studio-accent)]" />}
                      </div>
                    </div>
                    <p className="text-xs text-[var(--studio-text-muted)] leading-relaxed">{option.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {wheelType === 'penalty_shootout' && (
          <div className="flex items-center justify-between pt-4 border-t border-[var(--studio-border)] gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium text-[var(--studio-text)] flex items-center gap-2">
                <Shield size={15} className="text-sky-600 dark:text-sky-400" />
                <span>{t('settings.general.penaltySaveWins')}</span>
              </label>
              <p className="text-xs text-[var(--studio-text-muted)] mt-1">{t('settings.general.penaltySaveWinsDesc')}</p>
            </div>
            <Toggle enabled={penaltySaveWins} onChange={setPenaltySaveWins} />
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-[var(--studio-border)] gap-4">
          <div className="flex-1">
            <label className="text-sm font-medium text-[var(--studio-text)] flex items-center gap-2">
              <FlaskConical size={15} className="text-purple-600 dark:text-purple-400" />
              <span>{t('testMode.button', 'Modo de Teste')}</span>
            </label>
            <p className="text-xs text-[var(--studio-text-muted)] mt-1">
              Exibe o Modo de Teste no seletor de formatos para simulações instantâneas sem salvar dados nem contar na temporada.
            </p>
          </div>
          <Toggle
            enabled={testModeEnabled}
            onChange={val => {
              setTestModeEnabled(val);
              if (!val && wheelType === 'test') {
                setWheelType('classic');
              }
            }}
          />
        </div>
      </SectionCard>

      <SectionCard
        title={t('settings.general.balance')}
        icon={<Scale size={16} className="text-emerald-600 dark:text-emerald-400" />}
      >
        <div className="flex items-center justify-between pb-4 border-b border-[var(--studio-border)] gap-4">
          <div className="flex-1">
            <label className="text-sm font-medium text-[var(--studio-text)] flex items-center gap-2">
              <Eye size={15} className="text-[var(--studio-accent-fg)]" />
              <span>{t('settings.general.showPity')}</span>
            </label>
            <p className="text-xs text-[var(--studio-text-muted)] mt-1">
              {t('settings.general.showPityDesc', 'Reflete visualmente na roleta os pesos e participantes baseados nestas regras.')}
            </p>
          </div>
          <Toggle enabled={showPitySystemVisually} onChange={setShowPitySystemVisually} />
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <label className="text-sm font-medium text-[var(--studio-text)] flex items-center gap-2">
              <Repeat size={15} className="text-emerald-600 dark:text-emerald-400" />
              <span>{t('settings.general.antiRepetition')}</span>
            </label>
            <p className="text-xs text-[var(--studio-text-muted)] mt-1">{t('settings.general.antiRepetitionDesc')}</p>
          </div>
          <Toggle enabled={antiRepetitionEnabled} onChange={setAntiRepetitionEnabled} />
        </div>

        {antiRepetitionEnabled && (
          <div className="flex items-center justify-between bg-[var(--studio-input)] p-3.5 rounded-xl border border-[var(--studio-border)] ml-4">
            <label className="text-sm text-[var(--studio-text-secondary)]">{t('settings.general.avoidLastX')}</label>
            <input
              type="number"
              min="1"
              max="20"
              value={antiRepetitionCount}
              onChange={e => setAntiRepetitionCount(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-16 h-9 bg-[var(--studio-card)] text-[var(--studio-text)] font-mono tabular-nums border border-[var(--studio-border-strong)] rounded-lg px-2 text-sm text-center focus:border-emerald-500 focus:outline-none"
            />
          </div>
        )}

        <div className="pt-4 border-t border-[var(--studio-border)] space-y-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium text-[var(--studio-text)] flex items-center gap-2">
                  <TrendingDown size={15} className="text-amber-600 dark:text-amber-400" />
                  <span>{t('settings.general.reduceByWins')}</span>
                </label>
                <p className="text-xs text-[var(--studio-text-muted)] mt-1">{t('settings.general.reduceByWinsDesc')}</p>
              </div>
              <Toggle enabled={balanceWeightsByWins} onChange={setBalanceWeightsByWins} />
            </div>

            {balanceWeightsByWins && (
              <div className="pl-4 flex flex-col gap-2">
                {[
                  {
                    id: 'linear',
                    label: t('settings.general.balanceWeightsModeLinear', 'Suave (Linear)'),
                    desc: t('settings.general.balanceWeightsModeLinearDesc', 'chances = peso / (vitórias + 1)'),
                  },
                  {
                    id: 'quadratic',
                    label: t('settings.general.balanceWeightsModeQuadratic', 'Moderado (Quadrático)'),
                    desc: t('settings.general.balanceWeightsModeQuadraticDesc', 'chances = peso / (vitórias + 1)²'),
                  },
                  {
                    id: 'cubic',
                    label: t('settings.general.balanceWeightsModeCubic', 'Agressivo (Cúbico)'),
                    desc: t('settings.general.balanceWeightsModeCubicDesc', 'chances = peso / (vitórias + 1)³'),
                  },
                  {
                    id: 'relative',
                    label: t('settings.general.balanceWeightsModeRelative', 'Relativo Dinâmico (Normalizado)'),
                    desc: t('settings.general.balanceWeightsModeRelativeDesc', 'chances = peso × ((mín. vitórias + 1) / (vitórias + 1))³'),
                  },
                ].map(mode => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setBalanceWeightsMode(mode.id as any)}
                    className={`text-left p-3 rounded-xl border transition-colors ${
                      balanceWeightsMode === mode.id
                        ? 'bg-emerald-500/10 border-emerald-500/40'
                        : 'bg-[var(--studio-input)] border-[var(--studio-border)] hover:border-[var(--studio-border-strong)]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-sm font-semibold ${
                          balanceWeightsMode === mode.id ? 'text-emerald-700 dark:text-emerald-400' : 'text-[var(--studio-text)]'
                        }`}
                      >
                        {mode.label}
                      </span>
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          balanceWeightsMode === mode.id
                            ? 'border-emerald-500 bg-emerald-500/20'
                            : 'border-[var(--studio-border-strong)]'
                        }`}
                      >
                        {balanceWeightsMode === mode.id && (
                          <div className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-[var(--studio-text-muted)] mt-1 font-mono">{mode.desc}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-[var(--studio-border)] gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium text-[var(--studio-text)] flex items-center gap-2">
                <TrendingUp size={15} className="text-emerald-600 dark:text-emerald-400" />
                <span>{t('settings.general.pitySystem')}</span>
              </label>
              <p className="text-xs text-[var(--studio-text-muted)] mt-1">{t('settings.general.pitySystemDesc')}</p>
            </div>
            <Toggle enabled={pitySystemEnabled} onChange={setPitySystemEnabled} />
          </div>

          {(pitySystemEnabled || balanceWeightsByWins) && (
            <div className="flex flex-col gap-3 pl-4">
              <div className="flex flex-col gap-3 bg-[var(--studio-input)] p-3.5 rounded-xl border border-[var(--studio-border)]">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <label className="text-sm font-medium text-[var(--studio-text)]">
                      {t('settings.general.ignoreNewItemWeight', 'Equiparar chances de novos')}
                    </label>
                    <p className="text-xs text-[var(--studio-text-muted)] mt-0.5">
                      {t('settings.general.ignoreNewItemWeightDesc', 'Participantes nunca sorteados recebem peso com base nos que já participaram.')}
                    </p>
                  </div>
                  <Toggle enabled={ignoreNewItemWeight} onChange={setIgnoreNewItemWeight} />
                </div>

                {ignoreNewItemWeight && (
                  <div className="pt-3 border-t border-[var(--studio-border)] flex flex-col gap-2">
                    {[
                      {
                        id: 'boosted',
                        label: t('settings.general.newItemWeightModeBoosted', 'Acelerado (Recomendado)'),
                        desc: t('settings.general.newItemWeightModeBoostedDesc', 'Leve vantagem sobre o participante mais azarado (Maior peso + 20%, máx. 50% de chance).'),
                      },
                      {
                        id: 'max',
                        label: t('settings.general.newItemWeightModeMax'),
                        desc: t('settings.general.newItemWeightModeMaxDesc'),
                      },
                      {
                        id: 'average',
                        label: t('settings.general.newItemWeightModeAverage'),
                        desc: t('settings.general.newItemWeightModeAverageDesc'),
                      },
                      {
                        id: 'median',
                        label: t('settings.general.newItemWeightModeMedian'),
                        desc: t('settings.general.newItemWeightModeMedianDesc'),
                      },
                      {
                        id: 'min',
                        label: t('settings.general.newItemWeightModeMin'),
                        desc: t('settings.general.newItemWeightModeMinDesc'),
                      },
                      {
                        id: 'base',
                        label: t('settings.general.newItemWeightModeBase', 'Peso original'),
                        desc: t('settings.general.newItemWeightModeBaseDesc', 'Apenas o peso padrão (1).'),
                      },
                    ].map(mode => (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => setNewItemWeightMode(mode.id as any)}
                        className={`text-left p-3 rounded-xl border transition-colors ${
                          newItemWeightMode === mode.id
                            ? 'bg-emerald-500/10 border-emerald-500/40'
                            : 'bg-[var(--studio-card)] border-[var(--studio-border)] hover:border-[var(--studio-border-strong)]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-sm font-semibold ${
                              newItemWeightMode === mode.id ? 'text-emerald-700 dark:text-emerald-400' : 'text-[var(--studio-text)]'
                            }`}
                          >
                            {mode.label}
                          </span>
                          <div
                            className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                              newItemWeightMode === mode.id
                                ? 'border-emerald-500 bg-emerald-500/20'
                                : 'border-[var(--studio-border-strong)]'
                            }`}
                          >
                            {newItemWeightMode === mode.id && (
                              <div className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-[var(--studio-text-muted)] mt-1">{mode.desc}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-[var(--studio-input)] p-3.5 rounded-xl border border-[var(--studio-border)] space-y-2.5">
                <div>
                  <label className="text-sm font-medium text-[var(--studio-text)]">
                    {t('settings.general.balanceScope')}
                  </label>
                  <p className="text-xs text-[var(--studio-text-muted)] mt-0.5">{t('settings.general.balanceScopeDesc')}</p>
                </div>
                <div className="flex items-center justify-between bg-[var(--studio-card)] px-3 py-2.5 rounded-lg border border-[var(--studio-border)]">
                  <span className="text-sm text-[var(--studio-text)] font-medium">
                    {balanceScope === 'current_season'
                      ? t('settings.general.balanceScopeCurrent')
                      : t('settings.general.balanceScopeAll')}
                  </span>
                  <Toggle
                    enabled={balanceScope === 'current_season'}
                    onChange={v => setBalanceScope(v ? 'current_season' : 'all')}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </SectionCard>

      <SectionCard
        title={t('settings.general.postDraw', 'Pós-Sorteio e Visuais')}
        icon={<Zap size={16} className="text-amber-600 dark:text-amber-400" />}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <label className="text-sm font-medium text-[var(--studio-text)] flex items-center gap-2">
              <Sparkles size={15} className="text-amber-600 dark:text-amber-400" />
              <span>{t('settings.general.confetti')}</span>
            </label>
            <p className="text-xs text-[var(--studio-text-muted)] mt-1">{t('settings.general.confettiDesc')}</p>
          </div>
          <Toggle enabled={showConfetti} onChange={setShowConfetti} />
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-[var(--studio-border)] gap-4">
          <div className="flex-1">
            <label className="text-sm font-medium text-[var(--studio-text)] flex items-center gap-2">
              <Trash2 size={15} className="text-red-600 dark:text-red-400" />
              <span>{t('settings.general.autoRemove')}</span>
            </label>
            <p className="text-xs text-[var(--studio-text-muted)] mt-1">{t('settings.general.autoRemoveDesc')}</p>
          </div>
          <Toggle enabled={autoRemoveWinner} onChange={setAutoRemoveWinner} />
        </div>
      </SectionCard>
    </div>
  );
};