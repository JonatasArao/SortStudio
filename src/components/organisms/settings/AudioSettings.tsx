import React, { useState } from "react";
import { PlayCircle, Trash2, Plus, Music2, X, Edit2 } from "lucide-react";
import { Toggle } from "../../atoms/Toggle";
import { useAppStore } from "../../../store/useAppStore";
import { useAudioActions } from "../../../hooks/useAppActions";
import { playTickSound, playWinSound, playFailureSound } from '../../../utils/audioEngine';
import { useTranslation } from 'react-i18next';

export const AudioSettings = () => {
  const { t } = useTranslation();
  const soundEnabled = useAppStore(s => s.soundEnabled);
  const setSoundEnabled = useAppStore(s => s.setSoundEnabled);
  const masterVolume = useAppStore(s => s.masterVolume);
  const setMasterVolume = useAppStore(s => s.setMasterVolume);
  const tickSoundType = useAppStore(s => s.tickSoundType);
  const setTickSoundType = useAppStore(s => s.setTickSoundType);
  const customTickAudios = useAppStore(s => s.customTickAudios);
  const winSoundType = useAppStore(s => s.winSoundType);
  const setWinSoundType = useAppStore(s => s.setWinSoundType);
  const eliminationSoundType = useAppStore(s => s.eliminationSoundType);
  const setEliminationSoundType = useAppStore(s => s.setEliminationSoundType);
  const eliminationMode = useAppStore(s => s.eliminationMode);
  const customWinAudios = useAppStore(s => s.customWinAudios);
  const setIsAddAudioModalOpen = useAppStore(s => s.setIsAddAudioModalOpen);
  const setEditingAudio = useAppStore(s => s.setEditingAudio);

  const { removeCustomAudio } = useAudioActions();

  const [activeTab, setActiveTab] = useState<'roleta' | 'vencedor' | 'eliminacao'>('roleta');

  const handleEditAudio = (audio: any) => {
    setEditingAudio(audio);
    setIsAddAudioModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="flex justify-between items-center bg-slate-900/40 border border-slate-800/80 backdrop-blur-md p-5 rounded-2xl shadow-xl">
        <h3 className="font-bold text-white flex items-center gap-3">
          {t('audioSettings.title')}
        </h3>
        <Toggle enabled={soundEnabled} onChange={setSoundEnabled} />
      </div>

      <div className={`space-y-6 transition-opacity ${!soundEnabled && "opacity-50 pointer-events-none"}`}>
        <div className="bg-slate-900/40 border border-slate-800/80 backdrop-blur-md rounded-2xl p-6 space-y-4 shadow-xl">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-slate-300">
              {t('audioSettings.masterVolume')}
            </label>
            <span className="text-xs font-bold bg-slate-950 px-2.5 py-1 rounded-md text-slate-300 border border-slate-800/50">
              {masterVolume}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={masterVolume}
            onChange={(e) => setMasterVolume(Number(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>

        <div className="bg-slate-900/40 border border-slate-800/80 backdrop-blur-md rounded-2xl overflow-hidden shadow-xl">
          <div className="flex border-b border-slate-800/60 bg-slate-950/40">
            <button
              onClick={() => setActiveTab('roleta')}
              className={`flex-1 py-3.5 text-sm font-semibold transition-all ${activeTab === 'roleta' ? 'text-blue-400 border-b-2 border-blue-500 bg-blue-500/5 shadow-[inset_0_-2px_8px_rgba(59,130,246,0.05)]' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-950/20'}`}
            >
              {t('audioSettings.tabWheel')}
            </button>
            <button
              onClick={() => setActiveTab('vencedor')}
              className={`flex-1 py-3.5 text-sm font-semibold transition-all ${activeTab === 'vencedor' ? 'text-blue-400 border-b-2 border-blue-500 bg-blue-500/5 shadow-[inset_0_-2px_8_rgba(59,130,246,0.05)]' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-950/20'}`}
            >
              {t('audioSettings.tabWin')}
            </button>
            {eliminationMode && (
              <button
                onClick={() => setActiveTab('eliminacao')}
                className={`flex-1 py-3.5 text-sm font-semibold transition-all ${activeTab === 'eliminacao' ? 'text-red-400 border-b-2 border-red-500 bg-red-500/5 shadow-[inset_0_-2px_8px_rgba(239,68,68,0.05)]' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-950/20'}`}
              >
                {t('audioSettings.tabElimination')}
              </button>
            )}
          </div>

          <div className="p-5">
             {activeTab === 'roleta' && (
              <div className="space-y-6 animate-in slide-in-from-left-2 fade-in">
                <div className="space-y-3">
                  <label className="text-sm font-medium text-slate-300">
                    {t('audioSettings.defaultTickSounds')}
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {[
                      "click", "beep", "pop", "madeira", "metal", "synth", "drum", "bambu", "vidro"
                    ].map((type) => (
                      <button
                        key={type}
                        onClick={() => {
                          setTickSoundType(type);
                          playTickSound(0.5, type, null, masterVolume / 100);
                        }}
                        className={`py-2 px-3 rounded-lg text-sm font-medium capitalize transition-all ${tickSoundType === type ? "bg-blue-600 text-white shadow-md ring-2 ring-blue-500/50 ring-offset-2 ring-offset-[#252733]" : "bg-[#14151a] text-slate-400 hover:bg-slate-800 border border-slate-700/50"}`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-300">
                      {t('audioSettings.customAudios')}
                    </label>
                    <button
                      onClick={() => {
                        setEditingAudio(null);
                        setIsAddAudioModalOpen(true);
                      }}
                      className="flex items-center gap-1.5 text-xs font-semibold bg-blue-600/10 text-blue-400 hover:bg-blue-600 hover:text-white px-3 py-1.5 rounded-md transition-colors"
                    >
                      <Plus size={14} /> {t('audioSettings.newAudio')}
                    </button>
                  </div>
                  
                  <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar bg-slate-950/45 rounded-xl border border-slate-800/80 p-3 shadow-inner">
                    {customTickAudios.map((audio) => (
                      <div
                        key={audio.id}
                        className={`flex items-center justify-between p-2.5 rounded-xl border transition-all duration-200 ${tickSoundType === audio.id ? "bg-blue-600/15 border-blue-500/40 shadow-[0_0_12px_rgba(59,130,246,0.1)]" : "bg-slate-900/40 border-slate-800/60 hover:border-slate-700/60 hover:bg-slate-900/60"}`}
                      >
                        <div
                          className="flex items-center gap-3 overflow-hidden flex-1 cursor-pointer group"
                          onClick={() => setTickSoundType(audio.id)}
                        >
                          <button
                            className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all ${tickSoundType === audio.id ? "bg-blue-500 text-white" : "bg-slate-700 text-slate-300 group-hover:bg-slate-600 group-hover:text-white"}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              playTickSound(0.5, "click", audio, masterVolume / 100);
                            }}
                          >
                            <PlayCircle size={16} />
                          </button>
                          <div className="flex flex-col overflow-hidden">
                            <span className={`text-sm truncate ${tickSoundType === audio.id ? "text-blue-300 font-medium" : "text-slate-300"}`}>
                              {audio.name}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {audio.isFile ? t('audioSettings.localFile') : t('audioSettings.externalURL')} 
                              {audio.startTime ? ` • Início: ${audio.startTime}s` : ""}
                              {audio.volume !== undefined ? ` • Vol: ${audio.volume}%` : ""}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleEditAudio(audio)}
                            className="text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 p-2 rounded-md transition-colors"
                            title={t('audioSettings.edit')}
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => removeCustomAudio("tick", audio.id)}
                            className="text-slate-500 hover:text-red-400 hover:bg-red-500/10 p-2 rounded-md transition-colors shrink-0"
                            title={t('entryItem.delete')}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {customTickAudios.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-6 text-slate-500 space-y-2">
                        <Music2 size={24} className="opacity-50" />
                        <p className="text-xs italic">{t('audioSettings.noCustomAudio')}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'vencedor' && (
              <div className="space-y-6 animate-in slide-in-from-right-2 fade-in">
                <div className="space-y-3">
                  <label className="text-sm font-medium text-slate-300">
                    {t('audioSettings.defaultWinSounds')}
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {[
                      "tada", "fanfarra", "sino", "harpa", "magia", "orquestra", "aplausos-suaves", "aplausos-fortes", "trombeta", "sino-vitoria", "surpresa"
                    ].map((type) => (
                      <button
                        key={type}
                        onClick={() => {
                          setWinSoundType(type);
                          playWinSound(0.6, type, null, masterVolume / 100);
                        }}
                        className={`py-2 px-3 rounded-lg text-sm font-medium capitalize transition-all ${winSoundType === type ? "bg-blue-600 text-white shadow-md ring-2 ring-blue-500/50 ring-offset-2 ring-offset-[#252733]" : "bg-[#14151a] text-slate-400 hover:bg-slate-800 border border-slate-700/50"}`}
                      >
                        {type.replace("-", " ")}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-300">
                      {t('audioSettings.customAudios')}
                    </label>
                    <button
                      onClick={() => {
                        setEditingAudio(null);
                        setIsAddAudioModalOpen(true);
                      }}
                      className="flex items-center gap-1.5 text-xs font-semibold bg-blue-600/10 text-blue-400 hover:bg-blue-600 hover:text-white px-3 py-1.5 rounded-md transition-colors"
                    >
                      <Plus size={14} /> {t('audioSettings.newAudio')}
                    </button>
                  </div>
                  
                  <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar bg-slate-950/45 rounded-xl border border-slate-800/80 p-3 shadow-inner">
                    {customWinAudios.map((audio) => (
                      <div
                        key={audio.id}
                        className={`flex items-center justify-between p-2.5 rounded-xl border transition-all duration-200 ${winSoundType === audio.id ? "bg-blue-600/15 border-blue-500/40 shadow-[0_0_12px_rgba(59,130,246,0.1)]" : "bg-slate-900/40 border-slate-800/60 hover:border-slate-700/60 hover:bg-slate-900/60"}`}
                      >
                        <div
                          className="flex items-center gap-3 overflow-hidden flex-1 cursor-pointer group"
                          onClick={() => setWinSoundType(audio.id)}
                        >
                          <button
                            className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all ${winSoundType === audio.id ? "bg-blue-500 text-white" : "bg-slate-700 text-slate-300 group-hover:bg-slate-600 group-hover:text-white"}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              playWinSound(0.6, "tada", audio, masterVolume / 100);
                            }}
                          >
                            <PlayCircle size={16} />
                          </button>
                          <div className="flex flex-col overflow-hidden">
                            <span className={`text-sm truncate ${winSoundType === audio.id ? "text-blue-300 font-medium" : "text-slate-300"}`}>
                              {audio.name}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {audio.isFile ? t('audioSettings.localFile') : t('audioSettings.externalURL')}
                              {audio.startTime ? ` • Start: ${audio.startTime}s` : ""}
                              {audio.volume !== undefined ? ` • Vol: ${audio.volume}%` : ""}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleEditAudio(audio)}
                            className="text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 p-2 rounded-md transition-colors"
                            title={t('audioSettings.edit')}
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => removeCustomAudio("win", audio.id)}
                            className="text-slate-500 hover:text-red-400 hover:bg-red-500/10 p-2 rounded-md transition-colors shrink-0"
                            title={t('entryItem.delete')}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {customWinAudios.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-6 text-slate-500 space-y-2">
                        <Music2 size={24} className="opacity-50" />
                        <p className="text-xs italic">{t('audioSettings.noCustomAudio')}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'eliminacao' && eliminationMode && (
              <div className="space-y-6 animate-in slide-in-from-right-2 fade-in">
                <div className="space-y-3">
                  <label className="text-sm font-medium text-slate-300">
                    {t('audioSettings.defaultEliminationSounds')}
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      "failure", "buzzer", "sad_trombone"
                    ].map((type) => (
                      <button
                        key={type}
                        onClick={() => {
                          setEliminationSoundType(type);
                          playFailureSound(masterVolume / 100, type, null);
                        }}
                        className={`py-2 px-3 rounded-lg text-sm font-medium capitalize transition-all ${eliminationSoundType === type ? "bg-red-600 text-white shadow-md ring-2 ring-red-500/50 ring-offset-2 ring-offset-[#252733]" : "bg-[#14151a] text-slate-400 hover:bg-slate-800 border border-slate-700/50"}`}
                      >
                        {type.replace("_", " ")}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-300">
                      {t('audioSettings.customAudiosShared')}
                    </label>
                  </div>
                  
                  <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar bg-slate-950/45 rounded-xl border border-slate-800/80 p-3 shadow-inner">
                    {customWinAudios.map((audio) => (
                      <div
                        key={audio.id}
                        className={`flex items-center justify-between p-2.5 rounded-xl border transition-all duration-200 ${eliminationSoundType === audio.id ? "bg-red-600/15 border-red-500/40 shadow-[0_0_12px_rgba(239,68,68,0.1)]" : "bg-slate-900/40 border-slate-800/60 hover:border-slate-700/60 hover:bg-slate-900/60"}`}
                      >
                        <div
                          className="flex items-center gap-3 overflow-hidden flex-1 cursor-pointer group"
                          onClick={() => setEliminationSoundType(audio.id)}
                        >
                          <button
                            className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all ${eliminationSoundType === audio.id ? "bg-red-500 text-white" : "bg-slate-700 text-slate-300 group-hover:bg-slate-600 group-hover:text-white"}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              playFailureSound(masterVolume / 100, "failure", audio);
                            }}
                          >
                            <PlayCircle size={16} />
                          </button>
                          <div className="flex flex-col overflow-hidden">
                            <span className={`text-sm truncate ${eliminationSoundType === audio.id ? "text-red-300 font-medium" : "text-slate-300"}`}>
                              {audio.name}
                            </span>
                            <span className="text-[10px] text-slate-500">{audio.isFile ? t('audioSettings.localFile') : t('audioSettings.externalURL')}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
