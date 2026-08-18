import React, { useState } from 'react';
import { Download, X, Settings, List, History, Volume2, Palette, Scale, Trophy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../../store/useAppStore';
import { useAppActions } from '../../../hooks/useAppActions';
import { Button } from '../../atoms/Button';
import { Toggle } from '../../atoms/Toggle';

export const ExportModal = () => {
  const { t } = useTranslation();
  const isExportModalOpen = useAppStore(s => s.isExportModalOpen);
  const setIsExportModalOpen = useAppStore(s => s.setIsExportModalOpen);
  const { exportWheel } = useAppActions();

  const [options, setOptions] = useState({
    configVisual: true,
    configRules: true,
    configGeneral: true,
    entries: true,
    results: true,
    seasons: true,
    audio: true
  });

  if (!isExportModalOpen) return null;

  const handleExport = () => {
    exportWheel(options);
    setIsExportModalOpen(false);
  };

  const isAnySelected = Object.values(options).some(val => val);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-slate-900 border border-slate-700/50 rounded-2xl w-full max-w-md shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-slate-800/80 bg-slate-900/80">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Download size={20} className="text-blue-400" />
            {t('settings.system.exportBtn', 'Exportar Roleta')}
          </h2>
          <button 
            onClick={() => setIsExportModalOpen(false)}
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-5 bg-slate-900 overflow-y-auto max-h-[70vh]">
          <p className="text-sm text-slate-300">
            {t('settings.system.exportModalDesc', 'Escolha quais dados você deseja incluir no arquivo de exportação:')}
          </p>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-slate-800/40 rounded-xl border border-slate-700/50">
              <div className="flex items-center gap-3">
                <Palette size={18} className="text-pink-400" />
                <div>
                  <h4 className="text-sm font-semibold text-slate-200">{t('settings.system.exportVisual', 'Aparência e Visuais')}</h4>
                  <p className="text-xs text-slate-400">Tema, cores, tamanho da fonte e imagens</p>
                </div>
              </div>
              <Toggle enabled={options.configVisual} onChange={(v) => setOptions(o => ({ ...o, configVisual: v }))} />
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-800/40 rounded-xl border border-slate-700/50">
              <div className="flex items-center gap-3">
                <Scale size={18} className="text-orange-400" />
                <div>
                  <h4 className="text-sm font-semibold text-slate-200">{t('settings.system.exportRules', 'Regras e Modos')}</h4>
                  <p className="text-xs text-slate-400">Modo de eliminação, pity system, balanceamento</p>
                </div>
              </div>
              <Toggle enabled={options.configRules} onChange={(v) => setOptions(o => ({ ...o, configRules: v }))} />
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-800/40 rounded-xl border border-slate-700/50">
              <div className="flex items-center gap-3">
                <Settings size={18} className="text-blue-400" />
                <div>
                  <h4 className="text-sm font-semibold text-slate-200">{t('settings.system.exportGeneral', 'Configurações Gerais')}</h4>
                  <p className="text-xs text-slate-400">Título, tempo de giro, mensagens e confetes</p>
                </div>
              </div>
              <Toggle enabled={options.configGeneral} onChange={(v) => setOptions(o => ({ ...o, configGeneral: v }))} />
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-800/40 rounded-xl border border-slate-700/50">
              <div className="flex items-center gap-3">
                <List size={18} className="text-emerald-400" />
                <div>
                  <h4 className="text-sm font-semibold text-slate-200">{t('settings.system.exportEntries', 'Entradas')}</h4>
                  <p className="text-xs text-slate-400">Lista atual de opções e participantes</p>
                </div>
              </div>
              <Toggle enabled={options.entries} onChange={(v) => setOptions(o => ({ ...o, entries: v }))} />
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-800/40 rounded-xl border border-slate-700/50">
              <div className="flex items-center gap-3">
                <History size={18} className="text-amber-400" />
                <div>
                  <h4 className="text-sm font-semibold text-slate-200">{t('settings.system.exportResults', 'Resultados da Sessão')}</h4>
                  <p className="text-xs text-slate-400">Registro de sorteios, pódios e penalidades atuais</p>
                </div>
              </div>
              <Toggle enabled={options.results} onChange={(v) => setOptions(o => ({ ...o, results: v }))} />
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-800/40 rounded-xl border border-slate-700/50">
              <div className="flex items-center gap-3">
                <Trophy size={18} className="text-yellow-500" />
                <div>
                  <h4 className="text-sm font-semibold text-slate-200">{t('settings.system.exportSeasons', 'Temporadas e Placares')}</h4>
                  <p className="text-xs text-slate-400">Placares acumulados das temporadas passadas</p>
                </div>
              </div>
              <Toggle enabled={options.seasons} onChange={(v) => setOptions(o => ({ ...o, seasons: v }))} />
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-800/40 rounded-xl border border-slate-700/50">
              <div className="flex items-center gap-3">
                <Volume2 size={18} className="text-purple-400" />
                <div>
                  <h4 className="text-sm font-semibold text-slate-200">{t('settings.system.exportAudio', 'Áudios e Efeitos')}</h4>
                  <p className="text-xs text-slate-400">Sons, links customizados e volume</p>
                </div>
              </div>
              <Toggle enabled={options.audio} onChange={(v) => setOptions(o => ({ ...o, audio: v }))} />
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-slate-800 bg-slate-900 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setIsExportModalOpen(false)}>
            {t('common.cancel', 'Cancelar')}
          </Button>
          <Button 
            variant="primary" 
            onClick={handleExport}
            disabled={!isAnySelected}
            className="gap-2"
          >
            <Download size={16} />
            {t('settings.system.exportBtn', 'Exportar')}
          </Button>
        </div>
      </div>
    </div>
  );
};
