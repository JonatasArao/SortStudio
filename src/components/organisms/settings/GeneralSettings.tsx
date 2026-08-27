import React, { useEffect, useMemo } from 'react';
import { Sparkles, Clock, Trash2, Skull, Crown, Settings, Gamepad2, Scale, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Toggle } from '../../atoms/Toggle';
import { Input } from '../../atoms/Input';
import { useAppStore } from '../../../store/useAppStore';
import { getSpinTimeRanges } from '../../../utils/spinUtils';

const SectionCard = ({ title, icon, children }: { title: string, icon: React.ReactNode, children: React.ReactNode }) => (
  <div className="bg-slate-900/40 border border-slate-800/80 backdrop-blur-md rounded-2xl p-5 shadow-lg flex flex-col gap-5">
    <h4 className="text-base font-semibold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
      {icon} {title}
    </h4>
    <div className="flex flex-col gap-5">
      {children}
    </div>
  </div>
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
  const penaltySaveWins = useAppStore(s => s.penaltySaveWins);
  const setPenaltySaveWins = useAppStore(s => s.setPenaltySaveWins);



  const spinRange = useMemo(() => getSpinTimeRanges(wheelType, false), [wheelType]);
  const elimSpinRange = useMemo(() => getSpinTimeRanges(wheelType, true), [wheelType]);

  useEffect(() => {
    if (spinTime < spinRange.min) setSpinTime(spinRange.min);
    else if (spinTime > spinRange.max) setSpinTime(spinRange.max);
    
    if (eliminationSpinTime < elimSpinRange.min) setEliminationSpinTime(elimSpinRange.min);
    else if (eliminationSpinTime > elimSpinRange.max) setEliminationSpinTime(elimSpinRange.max);
  }, [wheelType, spinRange, elimSpinRange, spinTime, eliminationSpinTime, setSpinTime, setEliminationSpinTime]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300 pb-10">
      <h3 className="text-lg font-bold text-white mb-2">{t('settings.general.title')}</h3>

      <SectionCard title={t('settings.general.basicInfo', 'Informações Básicas')} icon={<Settings size={18} className="text-blue-400" />}>
        <div className="space-y-2 flex flex-col">
          <label className="text-sm font-medium text-slate-300">{t('settings.general.drawName')}</label>
          <Input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-[#14151a] border border-slate-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none transition-colors" />
        </div>
        
        {eliminationMode ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 flex flex-col">
              <label className="text-sm font-medium text-slate-300 flex items-center gap-2"><Skull size={14} className="text-red-400"/> {t('settings.general.eliminationMessage')}</label>
              <Input type="text" value={eliminationMessage} onChange={(e) => setEliminationMessage(e.target.value)} placeholder={t('settings.general.eliminationMessagePlh')} className="w-full bg-[#14151a] border border-slate-700 rounded-lg p-3 text-white focus:border-red-500 outline-none transition-colors" />
            </div>
            <div className="space-y-2 flex flex-col">
              <label className="text-sm font-medium text-slate-300 flex items-center gap-2"><Crown size={14} className="text-yellow-400"/> {t('settings.general.winnerMessage')}</label>
              <Input type="text" value={grandWinnerMessage} onChange={(e) => setGrandWinnerMessage(e.target.value)} placeholder={t('settings.general.winnerMessagePlh')} className="w-full bg-[#14151a] border border-slate-700 rounded-lg p-3 text-white focus:border-yellow-500 outline-none transition-colors" />
            </div>
          </div>
        ) : (
          <div className="space-y-2 flex flex-col">
            <label className="text-sm font-medium text-slate-300">{t('settings.general.winMessage')}</label>
            <Input type="text" value={winMessage} onChange={(e) => setWinMessage(e.target.value)} placeholder={t('settings.general.winMessagePlh')} className="w-full bg-[#14151a] border border-slate-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none transition-colors" />
          </div>
        )}

        <div className="space-y-2 pt-2 border-t border-slate-800/80">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-slate-300 flex items-center gap-2"><Clock size={16} className="text-blue-400"/> {eliminationMode ? t('settings.general.spinTimeFinal') : t('settings.general.spinTime')}</label>
            <span className="text-xs font-bold bg-blue-600/20 px-2 py-1 rounded text-blue-400 border border-blue-500/20">{spinTime} {t('settings.general.seconds')}</span>
          </div>
          <input 
            type="range" 
            min={spinRange.min} 
            max={spinRange.max} 
            step={spinRange.step} 
            value={spinTime} 
            onChange={(e) => setSpinTime(Number(e.target.value))} 
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500 mt-3" 
          />
        </div>
      </SectionCard>

      <SectionCard title={t('settings.general.gameModes', 'Modos de Jogo')} icon={<Gamepad2 size={18} className="text-purple-400" />}>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 pr-4">
              <label className="text-sm font-medium text-slate-200 flex items-center gap-2">⚔️ {t('settings.general.eliminationMode')}</label>
              <p className="text-xs text-slate-400 mt-1">{t('settings.general.eliminationModeDesc')}</p>
            </div>
            <Toggle enabled={eliminationMode} onChange={setEliminationMode} />
          </div>
          
          {eliminationMode && (
            <div className="flex flex-col gap-4 pl-4 ml-2 border-l-2 border-purple-500/30">
              <div className="flex items-center justify-between bg-slate-950/40 p-3 rounded-lg border border-slate-800/60">
                <div className="flex-1 pr-4">
                  <label className="text-sm font-medium text-slate-300">{t('settings.general.autoContinue')}</label>
                  <p className="text-xs text-slate-500 mt-0.5">{t('settings.general.autoContinueDesc')}</p>
                </div>
                <Toggle enabled={autoContinueElimination} onChange={setAutoContinueElimination} />
              </div>
              <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-800/60 space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-slate-300">{t('settings.general.fastSpinTime')}</label>
                  <span className="text-xs font-bold bg-red-600/20 px-2 py-1 rounded text-red-400 border border-red-500/20">{eliminationSpinTime} {t('settings.general.seconds')}</span>
                </div>
                <input 
                  type="range" 
                  min={elimSpinRange.min} 
                  max={elimSpinRange.max} 
                  step={elimSpinRange.step} 
                  value={eliminationSpinTime} 
                  onChange={(e) => setEliminationSpinTime(Number(e.target.value))} 
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-red-500 mt-3" 
                />
              </div>
            </div>
          )}
        </div>

        {wheelType === 'penalty_shootout' && (
          <div className="flex items-center justify-between pt-4 border-t border-slate-800/80">
            <div className="flex-1 pr-4">
              <label className="text-sm font-medium text-slate-200 flex items-center gap-2">🧤 {t('settings.general.penaltySaveWins')}</label>
              <p className="text-xs text-slate-400 mt-1">{t('settings.general.penaltySaveWinsDesc')}</p>
            </div>
            <Toggle enabled={penaltySaveWins} onChange={setPenaltySaveWins} />
          </div>
        )}
      </SectionCard>

      <SectionCard title={t('settings.general.balance')} icon={<Scale size={18} className="text-emerald-400" />}>
        <div className="flex items-center justify-between">
          <div className="flex-1 pr-4">
            <label className="text-sm font-medium text-slate-200 flex items-center gap-2">🔄 {t('settings.general.antiRepetition')}</label>
            <p className="text-xs text-slate-400 mt-1">{t('settings.general.antiRepetitionDesc')}</p>
          </div>
          <Toggle enabled={antiRepetitionEnabled} onChange={setAntiRepetitionEnabled} />
        </div>
        {antiRepetitionEnabled && (
          <div className="flex items-center justify-between bg-slate-950/40 p-3 rounded-lg border border-slate-800/60 ml-4">
            <label className="text-sm text-slate-300">{t('settings.general.avoidLastX')}</label>
            <input 
              type="number"
              min="1"
              max="20"
              value={antiRepetitionCount}
              onChange={(e) => setAntiRepetitionCount(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-16 bg-slate-900 text-white border border-slate-700 rounded-lg px-2 py-1 text-sm text-center focus:border-emerald-500 focus:outline-none"
            />
          </div>
        )}

        <div className="pt-4 border-t border-slate-800/80 space-y-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex-1 pr-4">
                <label className="text-sm font-medium text-slate-200 flex items-center gap-2">📉 {t('settings.general.reduceByWins')}</label>
                <p className="text-xs text-slate-400 mt-1">{t('settings.general.reduceByWinsDesc')}</p>
              </div>
              <Toggle enabled={balanceWeightsByWins} onChange={setBalanceWeightsByWins} />
            </div>
            {balanceWeightsByWins && (
              <div className="pl-4 ml-2 border-l-2 border-slate-800/60 mt-1 flex flex-col gap-2">
                {[
                  { id: 'linear', label: t('settings.general.balanceWeightsModeLinear', 'Suave (Linear)'), desc: t('settings.general.balanceWeightsModeLinearDesc', 'chances = peso / (vitórias + 1)') },
                  { id: 'quadratic', label: t('settings.general.balanceWeightsModeQuadratic', 'Moderado (Quadrático)'), desc: t('settings.general.balanceWeightsModeQuadraticDesc', 'chances = peso / (vitórias + 1)²') },
                  { id: 'cubic', label: t('settings.general.balanceWeightsModeCubic', 'Agressivo (Cúbico)'), desc: t('settings.general.balanceWeightsModeCubicDesc', 'chances = peso / (vitórias + 1)³') },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => setBalanceWeightsMode(mode.id as any)}
                    className={`text-left p-3 rounded-lg border transition-all ${
                      balanceWeightsMode === mode.id 
                        ? 'bg-emerald-500/10 border-emerald-500/50 ring-1 ring-emerald-500/20' 
                        : 'bg-slate-950/40 border-slate-800/60 hover:bg-slate-900 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-semibold ${balanceWeightsMode === mode.id ? 'text-emerald-400' : 'text-slate-300'}`}>
                        {mode.label}
                      </span>
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${balanceWeightsMode === mode.id ? 'border-emerald-500 bg-emerald-500/20' : 'border-slate-600'}`}>
                        {balanceWeightsMode === mode.id && <div className="w-2 h-2 rounded-full bg-emerald-400" />}
                      </div>
                    </div>
                    <p className={`text-xs mt-1 ${balanceWeightsMode === mode.id ? 'text-emerald-500/80' : 'text-slate-500'}`}>
                      {mode.desc}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-between pt-2 border-t border-slate-800/40">
            <div className="flex-1 pr-4">
              <label className="text-sm font-medium text-slate-200 flex items-center gap-2">📈 {t('settings.general.pitySystem')}</label>
              <p className="text-xs text-slate-400 mt-1">{t('settings.general.pitySystemDesc')}</p>
            </div>
            <Toggle enabled={pitySystemEnabled} onChange={setPitySystemEnabled} />
          </div>

          {(pitySystemEnabled || balanceWeightsByWins) && (
            <div className="flex flex-col gap-3 pl-4 ml-2 border-l-2 border-emerald-500/30">
              <div className="flex items-center justify-between bg-slate-950/40 p-3 rounded-lg border border-slate-800/60">
                <label className="text-sm text-slate-300">{t('settings.general.showPity')}</label>
                <Toggle 
                  enabled={showPitySystemVisually}
                  onChange={setShowPitySystemVisually}
                />
              </div>
              
              <div className="flex flex-col gap-2 bg-slate-950/40 p-3 rounded-lg border border-slate-800/60">
                <div className="flex items-center justify-between">
                  <div className="flex-1 pr-4">
                    <label className="text-sm font-medium text-slate-300">{t('settings.general.ignoreNewItemWeight', 'Equiparar chances de novos')}</label>
                    <p className="text-xs text-slate-500 mt-0.5">{t('settings.general.ignoreNewItemWeightDesc', 'Participantes nunca sorteados recebem peso com base nos que já participaram.')}</p>
                  </div>
                  <Toggle 
                    enabled={ignoreNewItemWeight}
                    onChange={setIgnoreNewItemWeight}
                  />
                </div>
                {ignoreNewItemWeight && (
                  <div className="pt-3 border-t border-slate-800/60 mt-1 flex flex-col gap-2">
                    {[
                      { id: 'boosted', label: t('settings.general.newItemWeightModeBoosted', 'Acelerado (Recomendado)'), desc: t('settings.general.newItemWeightModeBoostedDesc', 'Leve vantagem sobre o participante mais azarado (Maior peso + 30%).') },
                      { id: 'max', label: t('settings.general.newItemWeightModeMax'), desc: t('settings.general.newItemWeightModeMaxDesc') },
                      { id: 'average', label: t('settings.general.newItemWeightModeAverage'), desc: t('settings.general.newItemWeightModeAverageDesc') },
                      { id: 'median', label: t('settings.general.newItemWeightModeMedian'), desc: t('settings.general.newItemWeightModeMedianDesc') },
                      { id: 'min', label: t('settings.general.newItemWeightModeMin'), desc: t('settings.general.newItemWeightModeMinDesc') },
                      { id: 'base', label: t('settings.general.newItemWeightModeBase', 'Peso original'), desc: t('settings.general.newItemWeightModeBaseDesc', 'Apenas o peso padrão (1).') },
                    ].map((mode) => (
                      <button
                        key={mode.id}
                        onClick={() => setNewItemWeightMode(mode.id as any)}
                        className={`text-left p-3 rounded-lg border transition-all ${
                          newItemWeightMode === mode.id 
                            ? 'bg-emerald-500/10 border-emerald-500/50 ring-1 ring-emerald-500/20' 
                            : 'bg-slate-900 border-slate-700/50 hover:bg-slate-800 hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-sm font-semibold ${newItemWeightMode === mode.id ? 'text-emerald-400' : 'text-slate-300'}`}>
                            {mode.label}
                          </span>
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${newItemWeightMode === mode.id ? 'border-emerald-500 bg-emerald-500/20' : 'border-slate-600'}`}>
                            {newItemWeightMode === mode.id && <div className="w-2 h-2 rounded-full bg-emerald-400" />}
                          </div>
                        </div>
                        <p className={`text-xs mt-1 ${newItemWeightMode === mode.id ? 'text-emerald-500/80' : 'text-slate-500'}`}>
                          {mode.desc}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-800/60 space-y-2">
                <div>
                  <label className="text-sm font-medium text-slate-300">{t('settings.general.balanceScope')}</label>
                  <p className="text-xs text-slate-500 mt-0.5">{t('settings.general.balanceScopeDesc')}</p>
                </div>
                <div className="flex items-center justify-between bg-slate-900/50 p-2 rounded-md border border-slate-800">
                  <span className="text-sm text-slate-300 font-medium">
                    {balanceScope === 'current_season' ? t('settings.general.balanceScopeCurrent') : t('settings.general.balanceScopeAll')}
                  </span>
                  <Toggle 
                    enabled={balanceScope === 'current_season'}
                    onChange={(v) => setBalanceScope(v ? 'current_season' : 'all')}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </SectionCard>

      <SectionCard title={t('settings.general.postDraw', 'Pós-Sorteio e Visuais')} icon={<Zap size={18} className="text-amber-400" />}>
        <div className="flex items-center justify-between">
          <div className="flex-1 pr-4">
            <label className="text-sm font-medium text-slate-200 flex items-center gap-2"><Sparkles size={16} className="text-amber-400"/> {t('settings.general.confetti')}</label>
            <p className="text-xs text-slate-400 mt-1">{t('settings.general.confettiDesc')}</p>
          </div>
          <Toggle enabled={showConfetti} onChange={setShowConfetti} />
        </div>
        <div className="flex items-center justify-between pt-4 border-t border-slate-800/80">
          <div className="flex-1 pr-4">
            <label className="text-sm font-medium text-slate-200 flex items-center gap-2"><Trash2 size={16} className="text-red-400"/> {t('settings.general.autoRemove')}</label>
            <p className="text-xs text-slate-400 mt-1">{t('settings.general.autoRemoveDesc')}</p>
          </div>
          <Toggle enabled={autoRemoveWinner} onChange={setAutoRemoveWinner} />
        </div>
      </SectionCard>

    </div>
  );
};