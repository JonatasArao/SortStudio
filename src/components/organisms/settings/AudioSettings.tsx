import { useState } from "react";
import { PlayCircle, Trash2, Plus, Music2, Edit2, Volume2 } from "lucide-react";
import { Toggle } from "../../atoms/Toggle";
import { Button } from "../../atoms/Button";
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
    <div className="space-y-5">
      {/* Master Switch */}
      <div className="flex justify-between items-center bg-[var(--studio-card)] border border-[var(--studio-border)] p-4 sm:p-5 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[var(--studio-input)] border border-[var(--studio-border)] flex items-center justify-center text-[var(--studio-accent-fg)]">
            <Volume2 size={18} />
          </div>
          <h3 className="text-sm font-semibold text-[var(--studio-text)]">
            {t('audioSettings.title')}
          </h3>
        </div>
        <Toggle
          enabled={soundEnabled}
          onChange={setSoundEnabled}
          aria-label={t('audioSettings.title')}
        />
      </div>

      <div className={`space-y-5 transition-opacity ${!soundEnabled && "opacity-50 pointer-events-none"}`}>
        {/* Master Volume */}
        <div className="bg-[var(--studio-card)] border border-[var(--studio-border)] rounded-xl p-4 sm:p-5 space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-[var(--studio-text-secondary)]">
              {t('audioSettings.masterVolume')}
            </label>
            <span className="text-xs font-mono tabular-nums font-semibold bg-[var(--studio-input)] px-2.5 py-1 rounded-md text-[var(--studio-text)] border border-[var(--studio-border)]">
              {masterVolume}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={masterVolume}
            onChange={(e) => setMasterVolume(Number(e.target.value))}
            className="w-full h-1.5 bg-[var(--studio-input)] border border-[var(--studio-border)] rounded-lg appearance-none cursor-pointer accent-[var(--studio-accent)]"
          />
        </div>

        {/* Sound Category Tabs */}
        <div className="bg-[var(--studio-card)] border border-[var(--studio-border)] rounded-xl overflow-hidden">
          <div className="flex border-b border-[var(--studio-border)] bg-[var(--studio-surface-elevated)]">
            <button
              type="button"
              onClick={() => setActiveTab('roleta')}
              className={`flex-1 py-3 px-3 text-xs sm:text-sm font-semibold transition-colors border-b-2 ${
                activeTab === 'roleta'
                  ? 'text-[var(--studio-text)] border-[var(--studio-accent)] bg-[var(--studio-accent-soft)]'
                  : 'text-[var(--studio-text-muted)] border-transparent hover:text-[var(--studio-text)] hover:bg-[var(--studio-card-hover)]/40'
              }`}
            >
              {t('audioSettings.tabWheel')}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('vencedor')}
              className={`flex-1 py-3 px-3 text-xs sm:text-sm font-semibold transition-colors border-b-2 ${
                activeTab === 'vencedor'
                  ? 'text-[var(--studio-text)] border-[var(--studio-accent)] bg-[var(--studio-accent-soft)]'
                  : 'text-[var(--studio-text-muted)] border-transparent hover:text-[var(--studio-text)] hover:bg-[var(--studio-card-hover)]/40'
              }`}
            >
              {t('audioSettings.tabWin')}
            </button>
            {eliminationMode && (
              <button
                type="button"
                onClick={() => setActiveTab('eliminacao')}
                className={`flex-1 py-3 px-3 text-xs sm:text-sm font-semibold transition-colors border-b-2 ${
                  activeTab === 'eliminacao'
                    ? 'text-red-700 dark:text-red-300 border-red-500 bg-red-500/[0.08]'
                    : 'text-[var(--studio-text-muted)] border-transparent hover:text-[var(--studio-text)] hover:bg-[var(--studio-card-hover)]/40'
                }`}
              >
                {t('audioSettings.tabElimination')}
              </button>
            )}
          </div>

          <div className="p-4 sm:p-5">
            {activeTab === 'roleta' && (
              <div className="space-y-6">
                <div className="space-y-2.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[var(--studio-text-muted)] block">
                    {t('audioSettings.defaultTickSounds')}
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {[
                      "click", "beep", "pop", "madeira", "metal", "synth", "drum", "bambu", "vidro"
                    ].map((type) => (
                      <button
                        type="button"
                        key={type}
                        onClick={() => {
                          setTickSoundType(type);
                          playTickSound(0.5, type, null, masterVolume / 100);
                        }}
                        className={`min-h-[38px] py-2 px-3 rounded-lg text-sm font-medium capitalize transition-colors border ${
                          tickSoundType === type
                            ? "bg-[var(--studio-accent-soft)] text-[var(--studio-accent-fg)] border-[var(--studio-accent)]"
                            : "bg-[var(--studio-surface-elevated)] text-[var(--studio-text-muted)] border-[var(--studio-border)] hover:bg-[var(--studio-card-hover)] hover:text-[var(--studio-text)]"
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-[var(--studio-text-muted)]">
                      {t('audioSettings.customAudios')}
                    </label>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setEditingAudio(null);
                        setIsAddAudioModalOpen(true);
                      }}
                      className="gap-1.5 text-[var(--studio-accent-fg)] border-[var(--studio-accent)]/35 bg-[var(--studio-accent-soft)]"
                    >
                      <Plus size={14} /> {t('audioSettings.newAudio')}
                    </Button>
                  </div>

                  <div className="space-y-2 max-h-[280px] overflow-y-auto custom-scrollbar bg-[var(--studio-input)] rounded-xl border border-[var(--studio-border)] p-2.5">
                    {customTickAudios.map((audio) => (
                      <div
                        key={audio.id}
                        className={`flex items-center justify-between p-2.5 rounded-lg border transition-colors ${
                          tickSoundType === audio.id
                            ? "bg-[var(--studio-accent-soft)] border-[var(--studio-accent)]/50"
                            : "bg-[var(--studio-surface)] border-[var(--studio-border)] hover:border-[var(--studio-border-strong)]"
                        }`}
                      >
                        <div
                          className="flex items-center gap-3 overflow-hidden flex-1 cursor-pointer group"
                          onClick={() => setTickSoundType(audio.id)}
                        >
                          <button
                            type="button"
                            className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                              tickSoundType === audio.id
                                ? "bg-[var(--studio-accent)] text-[var(--studio-accent-text)]"
                                : "bg-[var(--studio-card)] text-[var(--studio-text-secondary)] border border-[var(--studio-border)] group-hover:text-[var(--studio-text)]"
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              playTickSound(0.5, "click", audio, masterVolume / 100);
                            }}
                            aria-label={audio.name}
                          >
                            <PlayCircle size={16} />
                          </button>
                          <div className="flex flex-col overflow-hidden">
                            <span className={`text-sm truncate ${tickSoundType === audio.id ? "text-[var(--studio-accent-fg)] font-medium" : "text-[var(--studio-text)]"}`}>
                              {audio.name}
                            </span>
                            <span className="text-[11px] text-[var(--studio-text-muted)] font-mono tabular-nums">
                              {audio.isFile ? t('audioSettings.localFile') : t('audioSettings.externalURL')}
                              {audio.startTime ? ` · Início: ${audio.startTime}s` : ""}
                              {audio.volume !== undefined ? ` · Vol: ${audio.volume}%` : ""}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleEditAudio(audio)}
                            className="text-[var(--studio-text-muted)] hover:text-[var(--studio-accent-fg)] hover:bg-[var(--studio-accent-soft)] p-2 rounded-lg transition-colors"
                            title={t('audioSettings.edit')}
                            aria-label={t('audioSettings.edit')}
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeCustomAudio("tick", audio.id)}
                            className="text-[var(--studio-text-muted)] hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10 p-2 rounded-lg transition-colors"
                            title={t('entryItem.delete')}
                            aria-label={t('entryItem.delete')}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {customTickAudios.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-6 text-[var(--studio-text-muted)] space-y-2">
                        <Music2 size={22} className="opacity-50" />
                        <p className="text-xs">{t('audioSettings.noCustomAudio')}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'vencedor' && (
              <div className="space-y-6">
                <div className="space-y-2.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[var(--studio-text-muted)] block">
                    {t('audioSettings.defaultWinSounds')}
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {[
                      "tada", "fanfarra", "sino", "harpa", "magia", "orquestra", "aplausos-suaves", "aplausos-fortes", "trombeta", "sino-vitoria", "surpresa"
                    ].map((type) => (
                      <button
                        type="button"
                        key={type}
                        onClick={() => {
                          setWinSoundType(type);
                          playWinSound(0.6, type, null, masterVolume / 100);
                        }}
                        className={`min-h-[38px] py-2 px-3 rounded-lg text-sm font-medium capitalize transition-colors border ${
                          winSoundType === type
                            ? "bg-[var(--studio-accent-soft)] text-[var(--studio-accent-fg)] border-[var(--studio-accent)]"
                            : "bg-[var(--studio-surface-elevated)] text-[var(--studio-text-muted)] border-[var(--studio-border)] hover:bg-[var(--studio-card-hover)] hover:text-[var(--studio-text)]"
                        }`}
                      >
                        {type.replace("-", " ")}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-[var(--studio-text-muted)]">
                      {t('audioSettings.customAudios')}
                    </label>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setEditingAudio(null);
                        setIsAddAudioModalOpen(true);
                      }}
                      className="gap-1.5 text-[var(--studio-accent-fg)] border-[var(--studio-accent)]/35 bg-[var(--studio-accent-soft)]"
                    >
                      <Plus size={14} /> {t('audioSettings.newAudio')}
                    </Button>
                  </div>

                  <div className="space-y-2 max-h-[280px] overflow-y-auto custom-scrollbar bg-[var(--studio-input)] rounded-xl border border-[var(--studio-border)] p-2.5">
                    {customWinAudios.map((audio) => (
                      <div
                        key={audio.id}
                        className={`flex items-center justify-between p-2.5 rounded-lg border transition-colors ${
                          winSoundType === audio.id
                            ? "bg-[var(--studio-accent-soft)] border-[var(--studio-accent)]/50"
                            : "bg-[var(--studio-surface)] border-[var(--studio-border)] hover:border-[var(--studio-border-strong)]"
                        }`}
                      >
                        <div
                          className="flex items-center gap-3 overflow-hidden flex-1 cursor-pointer group"
                          onClick={() => setWinSoundType(audio.id)}
                        >
                          <button
                            type="button"
                            className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                              winSoundType === audio.id
                                ? "bg-[var(--studio-accent)] text-[var(--studio-accent-text)]"
                                : "bg-[var(--studio-card)] text-[var(--studio-text-secondary)] border border-[var(--studio-border)] group-hover:text-[var(--studio-text)]"
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              playWinSound(0.6, "tada", audio, masterVolume / 100);
                            }}
                            aria-label={audio.name}
                          >
                            <PlayCircle size={16} />
                          </button>
                          <div className="flex flex-col overflow-hidden">
                            <span className={`text-sm truncate ${winSoundType === audio.id ? "text-[var(--studio-accent-fg)] font-medium" : "text-[var(--studio-text)]"}`}>
                              {audio.name}
                            </span>
                            <span className="text-[11px] text-[var(--studio-text-muted)] font-mono tabular-nums">
                              {audio.isFile ? t('audioSettings.localFile') : t('audioSettings.externalURL')}
                              {audio.startTime ? ` · Início: ${audio.startTime}s` : ""}
                              {audio.volume !== undefined ? ` · Vol: ${audio.volume}%` : ""}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleEditAudio(audio)}
                            className="text-[var(--studio-text-muted)] hover:text-[var(--studio-accent-fg)] hover:bg-[var(--studio-accent-soft)] p-2 rounded-lg transition-colors"
                            title={t('audioSettings.edit')}
                            aria-label={t('audioSettings.edit')}
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeCustomAudio("win", audio.id)}
                            className="text-[var(--studio-text-muted)] hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10 p-2 rounded-lg transition-colors"
                            title={t('entryItem.delete')}
                            aria-label={t('entryItem.delete')}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {customWinAudios.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-6 text-[var(--studio-text-muted)] space-y-2">
                        <Music2 size={22} className="opacity-50" />
                        <p className="text-xs">{t('audioSettings.noCustomAudio')}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'eliminacao' && eliminationMode && (
              <div className="space-y-6">
                <div className="space-y-2.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[var(--studio-text-muted)] block">
                    {t('audioSettings.defaultEliminationSounds')}
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      "failure", "buzzer", "sad_trombone"
                    ].map((type) => (
                      <button
                        type="button"
                        key={type}
                        onClick={() => {
                          setEliminationSoundType(type);
                          playFailureSound(masterVolume / 100, type, null);
                        }}
                        className={`min-h-[38px] py-2 px-3 rounded-lg text-sm font-medium capitalize transition-colors border ${
                          eliminationSoundType === type
                            ? "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/50"
                            : "bg-[var(--studio-surface-elevated)] text-[var(--studio-text-muted)] border-[var(--studio-border)] hover:bg-[var(--studio-card-hover)] hover:text-[var(--studio-text)]"
                        }`}
                      >
                        {type.replace("_", " ")}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[var(--studio-text-muted)] block">
                    {t('audioSettings.customAudiosShared')}
                  </label>

                  <div className="space-y-2 max-h-[280px] overflow-y-auto custom-scrollbar bg-[var(--studio-input)] rounded-xl border border-[var(--studio-border)] p-2.5">
                    {customWinAudios.map((audio) => (
                      <div
                        key={audio.id}
                        className={`flex items-center justify-between p-2.5 rounded-lg border transition-colors ${
                          eliminationSoundType === audio.id
                            ? "bg-red-500/15 border-red-500/40"
                            : "bg-[var(--studio-surface)] border-[var(--studio-border)] hover:border-[var(--studio-border-strong)]"
                        }`}
                      >
                        <div
                          className="flex items-center gap-3 overflow-hidden flex-1 cursor-pointer group"
                          onClick={() => setEliminationSoundType(audio.id)}
                        >
                          <button
                            type="button"
                            className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                              eliminationSoundType === audio.id
                                ? "bg-red-500 text-white"
                                : "bg-[var(--studio-card)] text-[var(--studio-text-secondary)] border border-[var(--studio-border)] group-hover:text-[var(--studio-text)]"
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              playFailureSound(masterVolume / 100, "failure", audio);
                            }}
                            aria-label={audio.name}
                          >
                            <PlayCircle size={16} />
                          </button>
                          <div className="flex flex-col overflow-hidden">
                            <span className={`text-sm truncate ${eliminationSoundType === audio.id ? "text-red-700 dark:text-red-200 font-medium" : "text-[var(--studio-text)]"}`}>
                              {audio.name}
                            </span>
                            <span className="text-[11px] text-[var(--studio-text-muted)]">
                              {audio.isFile ? t('audioSettings.localFile') : t('audioSettings.externalURL')}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {customWinAudios.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-6 text-[var(--studio-text-muted)] space-y-2">
                        <Music2 size={22} className="opacity-50" />
                        <p className="text-xs">{t('audioSettings.noCustomAudio')}</p>
                      </div>
                    )}
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
