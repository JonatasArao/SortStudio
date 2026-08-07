import React from 'react';
import { Sparkles, Clock, Trash2, Skull, Crown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Toggle } from '../../atoms/Toggle';
import { Input } from '../../atoms/Input';
import { useAppStore } from '../../../store/useAppStore';

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
  const setBalanceWeightsByWins = useAppStore(s => s.setBalanceWeightsByWins);
  const pitySystemEnabled = useAppStore(s => s.pitySystemEnabled);
  const setPitySystemEnabled = useAppStore(s => s.setPitySystemEnabled);
  const showPitySystemVisually = useAppStore(s => s.showPitySystemVisually);
  const setShowPitySystemVisually = useAppStore(s => s.setShowPitySystemVisually);
  const balanceScope = useAppStore(s => s.balanceScope);
  const setBalanceScope = useAppStore(s => s.setBalanceScope);
  const wheelType = useAppStore(s => s.wheelType);
  const penaltySaveWins = useAppStore(s => s.penaltySaveWins);
  const setPenaltySaveWins = useAppStore(s => s.setPenaltySaveWins);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300 pb-10">
      <div>
        <h3 className="text-lg font-bold text-white mb-4">{t('settings.general.title')}</h3>
        <div className="bg-slate-900/40 border border-slate-800/80 backdrop-blur-md rounded-2xl p-6 space-y-6 shadow-xl">
          <div className="space-y-2 flex flex-col">
            <label className="text-sm font-medium text-slate-300">{t('settings.general.drawName')}</label>
            <Input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-[#14151a] border border-slate-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none transition-colors" />
          </div>
          
          {eliminationMode ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 flex flex-col">
                <label className="text-sm font-medium text-slate-300 flex items-center gap-2"><Skull size={14} /> {t('settings.general.eliminationMessage')}</label>
                <Input type="text" value={eliminationMessage} onChange={(e) => setEliminationMessage(e.target.value)} placeholder={t('settings.general.eliminationMessagePlh')} className="w-full bg-[#14151a] border border-slate-700 rounded-lg p-3 text-white focus:border-red-500 outline-none transition-colors" />
              </div>
              <div className="space-y-2 flex flex-col">
                <label className="text-sm font-medium text-slate-300 flex items-center gap-2"><Crown size={14} /> {t('settings.general.winnerMessage')}</label>
                <Input type="text" value={grandWinnerMessage} onChange={(e) => setGrandWinnerMessage(e.target.value)} placeholder={t('settings.general.winnerMessagePlh')} className="w-full bg-[#14151a] border border-slate-700 rounded-lg p-3 text-white focus:border-yellow-500 outline-none transition-colors" />
              </div>
            </div>
          ) : (
            <div className="space-y-2 flex flex-col">
              <label className="text-sm font-medium text-slate-300">{t('settings.general.winMessage')}</label>
              <Input type="text" value={winMessage} onChange={(e) => setWinMessage(e.target.value)} placeholder={t('settings.general.winMessagePlh')} className="w-full bg-[#14151a] border border-slate-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none transition-colors" />
            </div>
          )}

          <div className="space-y-2 pt-2 border-t border-slate-700">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-slate-300 flex items-center gap-2"><Clock size={16}/> {eliminationMode ? t('settings.general.spinTimeFinal') : t('settings.general.spinTime')}</label>
              <span className="text-xs font-bold bg-blue-600/20 px-2 py-1 rounded text-blue-400 border border-blue-500/20">{spinTime} {t('settings.general.seconds')}</span>
            </div>
            <input type="range" min="1" max="30" value={spinTime} onChange={(e) => setSpinTime(Number(e.target.value))} className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500 mt-3" />
          </div>

          <div className="flex flex-col gap-4 pt-4 border-t border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-slate-300 flex items-center gap-2">⚔️ {t('settings.general.eliminationMode')}</label>
                <p className="text-xs text-slate-500 mt-1">{t('settings.general.eliminationModeDesc')}</p>
              </div>
              <Toggle enabled={eliminationMode} onChange={setEliminationMode} />
            </div>
            {eliminationMode && (
              <>
                <div className="flex items-center justify-between pl-6 py-2 border-l-2 border-slate-700 ml-2">
                  <div>
                    <label className="text-sm font-medium text-slate-300 flex items-center gap-2">{t('settings.general.autoContinue')}</label>
                    <p className="text-xs text-slate-500 mt-1">{t('settings.general.autoContinueDesc')}</p>
                  </div>
                  <Toggle enabled={autoContinueElimination} onChange={setAutoContinueElimination} />
                </div>
                <div className="space-y-2 pl-6 py-2 border-l-2 border-slate-700 ml-2">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium text-slate-300 flex items-center gap-2">{t('settings.general.fastSpinTime')}</label>
                    <span className="text-xs font-bold bg-red-600/20 px-2 py-1 rounded text-red-400 border border-red-500/20">{eliminationSpinTime} {t('settings.general.seconds')}</span>
                  </div>
                  <input type="range" min="0.5" max="30" step="0.5" value={eliminationSpinTime} onChange={(e) => setEliminationSpinTime(Number(e.target.value))} className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-red-500 mt-3" />
                </div>
              </>
            )}
          </div>

          {wheelType === 'penalty_shootout' && (
            <div className="flex items-center justify-between pt-4 border-t border-slate-700">
              <div>
                <label className="text-sm font-medium text-slate-300 flex items-center gap-2">🧤 {t('settings.general.penaltySaveWins')}</label>
                <p className="text-xs text-slate-500 mt-1">{t('settings.general.penaltySaveWinsDesc')}</p>
              </div>
              <Toggle enabled={penaltySaveWins} onChange={setPenaltySaveWins} />
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-slate-700">
            <div>
              <label className="text-sm font-medium text-slate-300 flex items-center gap-2">🔄 {t('settings.general.antiRepetition')}</label>
              <p className="text-xs text-slate-500 mt-1">{t('settings.general.antiRepetitionDesc')}</p>
            </div>
            <Toggle enabled={antiRepetitionEnabled} onChange={setAntiRepetitionEnabled} />
          </div>
          {antiRepetitionEnabled && (
            <div className="flex items-center justify-between bg-slate-950/30 p-4 rounded-xl border border-slate-800/80 ml-4">
              <label className="text-sm text-slate-300">{t('settings.general.avoidLastX')}</label>
              <input 
                type="number"
                min="1"
                max="20"
                value={antiRepetitionCount}
                onChange={(e) => setAntiRepetitionCount(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-16 bg-slate-950 text-white border border-slate-800 rounded-lg px-2 py-1 text-sm text-center focus:border-blue-500 focus:outline-none"
              />
            </div>
          )}

          <div className="pt-4 border-t border-slate-700 space-y-4">
            <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2">⚖️ {t('settings.general.balance')}</h4>
            
            <div className="flex items-center justify-between ml-2">
              <div>
                <label className="text-sm font-medium text-slate-300">📉 {t('settings.general.reduceByWins')}</label>
                <p className="text-xs text-slate-500 mt-1">{t('settings.general.reduceByWinsDesc')}</p>
              </div>
              <Toggle enabled={balanceWeightsByWins} onChange={setBalanceWeightsByWins} />
            </div>
            <div className="flex items-center justify-between ml-2">
              <div>
                <label className="text-sm font-medium text-slate-300">📈 {t('settings.general.pitySystem')}</label>
                <p className="text-xs text-slate-500 mt-1">{t('settings.general.pitySystemDesc')}</p>
              </div>
              <Toggle enabled={pitySystemEnabled} onChange={setPitySystemEnabled} />
            </div>
            {(pitySystemEnabled || balanceWeightsByWins) && (
              <>
                <div className="flex items-center justify-between bg-slate-950/30 p-4 rounded-xl border border-slate-800/80 ml-2">
                  <label className="text-sm text-slate-300">{t('settings.general.showPity')}</label>
                  <Toggle 
                    enabled={showPitySystemVisually}
                    onChange={setShowPitySystemVisually}
                  />
                </div>
                
                <div className="pt-2 border-t border-slate-700/30 ml-2">
                  <div className="flex flex-col gap-2">
                    <div>
                      <label className="text-sm font-medium text-slate-300">{t('settings.general.balanceScope')}</label>
                      <p className="text-xs text-slate-500 mt-0.5">{t('settings.general.balanceScopeDesc')}</p>
                    </div>
                    <div className="flex items-center justify-between bg-slate-950/30 p-4 rounded-xl border border-slate-800/80">
                      <span className="text-sm text-slate-300">
                        {balanceScope === 'current_season' ? t('settings.general.balanceScopeCurrent') : t('settings.general.balanceScopeAll')}
                      </span>
                      <Toggle 
                        enabled={balanceScope === 'current_season'}
                        onChange={(v) => setBalanceScope(v ? 'current_season' : 'all')}
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-700">
            <div>
              <label className="text-sm font-medium text-slate-300 flex items-center gap-2"><Sparkles size={16}/> {t('settings.general.confetti')}</label>
              <p className="text-xs text-slate-500 mt-1">{t('settings.general.confettiDesc')}</p>
            </div>
            <Toggle enabled={showConfetti} onChange={setShowConfetti} />
          </div>
          <div className="flex items-center justify-between pt-4 border-t border-slate-700">
            <div>
              <label className="text-sm font-medium text-slate-300 flex items-center gap-2"><Trash2 size={16}/> {t('settings.general.autoRemove')}</label>
              <p className="text-xs text-slate-500 mt-1">{t('settings.general.autoRemoveDesc')}</p>
            </div>
            <Toggle enabled={autoRemoveWinner} onChange={setAutoRemoveWinner} />
          </div>
        </div>
      </div>
    </div>
  );
};