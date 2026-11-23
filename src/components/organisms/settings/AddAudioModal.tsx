import React, { useState, useRef, useEffect } from "react";
import { X, Upload, Plus, Music, PlayCircle, StopCircle, Save, Scissors, Volume2, AlertCircle } from "lucide-react";
import { useAudioActions } from "../../../hooks/useAppActions";
import { useTranslation } from "react-i18next";
import { useAppStore } from "../../../store/useAppStore";
import { extractYouTubeId } from "../../../utils/youtubeUtils";
import { YouTubeAudio } from "../../../utils/youtubePlayer";
import { Button } from "../../atoms/Button";
import { Input } from "../../atoms/Input";

interface AddAudioModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddAudioModal: React.FC<AddAudioModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const { addCustomAudio, updateCustomAudio } = useAudioActions();
  const { editingAudio, setEditingAudio, customTickAudios, customWinAudios, masterVolume, spinTime, eliminationMode, eliminationSpinTime } = useAppStore();
  const wheelTime = eliminationMode ? eliminationSpinTime : spinTime;

  const [inputType, setInputType] = useState<"file" | "url">("file");
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [categories, setCategories] = useState<("tick" | "win")[]>(["tick"]);
  const [mode, setMode] = useState<"tick" | "continuous">("continuous");
  const [startTime, setStartTime] = useState<string>("0");
  const [endTime, setEndTime] = useState<string>("0");
  const [volume, setVolume] = useState<number>(100);
  const [duration, setDuration] = useState<number>(0);
  const [isPreviewing, setIsPreviewing] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const ytPlayerRef = useRef<YouTubeAudio | null>(null);
  const durationCheckIntervalRef = useRef<any>(null);

  const sliderContainerRef = useRef<HTMLDivElement | null>(null);
  const isDraggingRangeRef = useRef(false);
  const dragStartRef = useRef<{ x: number; startVal: number; duration: number }>({ x: 0, startVal: 0, duration: 0 });

  const stopPreview = () => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
    if (ytPlayerRef.current) {
      ytPlayerRef.current.pause();
    }
    setIsPreviewing(false);
  };

  const cleanupYtPlayer = () => {
    if (durationCheckIntervalRef.current) {
      clearInterval(durationCheckIntervalRef.current);
      durationCheckIntervalRef.current = null;
    }
    if (ytPlayerRef.current) {
      ytPlayerRef.current.destroy();
      ytPlayerRef.current = null;
    }
  };

  const handleClose = () => {
    stopPreview();
    cleanupYtPlayer();
    setEditingAudio(null);
    setValidationError(null);
    onClose();
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    setValidationError(null);
    if (editingAudio) {
      setName(editingAudio.name);
      setUrl(editingAudio.url);
      setMode(editingAudio.mode || "continuous");
      setStartTime(String(editingAudio.startTime || 0));
      setEndTime(String(editingAudio.endTime || 0));
      setVolume(editingAudio.volume !== undefined ? editingAudio.volume : 100);
      setInputType(editingAudio.isFile ? "file" : "url");

      const cats: ("tick" | "win")[] = [];
      if (customTickAudios.some(a => a.id === editingAudio.id)) cats.push("tick");
      if (customWinAudios.some(a => a.id === editingAudio.id)) cats.push("win");
      setCategories(cats);
    } else {
      setFile(null);
      setUrl("");
      setName("");
      setCategories(["tick"]);
      setMode("continuous");
      setStartTime("0");
      setEndTime("0");
      setVolume(100);
      setInputType("file");
    }
    setDuration(0);
    stopPreview();
    cleanupYtPlayer();
  }, [editingAudio, isOpen]);

  useEffect(() => {
    let objectUrlToRevoke: string | null = null;
    let audioSrc = "";

    if (editingAudio) {
      audioSrc = editingAudio.url;
    } else if (inputType === "file" && file) {
      objectUrlToRevoke = URL.createObjectURL(file);
      audioSrc = objectUrlToRevoke;
    } else if (inputType === "url" && url) {
      audioSrc = url.trim();
    }

    if (!audioSrc) {
      setDuration(0);
      cleanupYtPlayer();
      return;
    }

    const ytId = extractYouTubeId(audioSrc);

    if (ytId) {
      cleanupYtPlayer();
      const ytAudio = new YouTubeAudio(ytId);
      ytPlayerRef.current = ytAudio;

      let attempts = 0;
      durationCheckIntervalRef.current = setInterval(async () => {
        attempts++;
        const d = await ytAudio.getDuration();
        if (d > 0) {
          clearInterval(durationCheckIntervalRef.current);
          durationCheckIntervalRef.current = null;
          const dur = Math.round(d * 10) / 10;
          setDuration(dur);
          if (!editingAudio || !editingAudio.endTime || editingAudio.endTime === 0) {
            setEndTime(String(Math.min(dur, wheelTime)));
          }
        } else if (attempts > 30) {
          clearInterval(durationCheckIntervalRef.current);
          durationCheckIntervalRef.current = null;
        }
      }, 300);

      return () => {
        if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);
      };
    } else {
      cleanupYtPlayer();
      const audio = new Audio(audioSrc);
      const onLoaded = () => {
        if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
          const dur = Math.round(audio.duration * 10) / 10;
          setDuration(dur);
          if (!editingAudio || !editingAudio.endTime || editingAudio.endTime === 0) {
            setEndTime(String(Math.min(dur, wheelTime)));
          }
        }
      };
      audio.addEventListener("loadedmetadata", onLoaded);
      return () => {
        audio.removeEventListener("loadedmetadata", onLoaded);
        if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);
      };
    }
  }, [editingAudio, file, url, inputType]);

  if (!isOpen) return null;

  const maxVal = duration > 0 ? duration : 300;
  const numStart = Math.min(parseFloat(startTime) || 0, maxVal);
  const rawEnd = parseFloat(endTime);
  const numEnd = rawEnd === 0 || rawEnd > maxVal ? maxVal : Math.max(rawEnd, numStart);

  const handleRangePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.preventDefault();
    isDraggingRangeRef.current = true;
    const currentDuration = Math.max(0.1, numEnd - numStart);
    dragStartRef.current = {
      x: e.clientX,
      startVal: numStart,
      duration: currentDuration,
    };
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch (_) {}
  };

  const handleRangePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRangeRef.current || !sliderContainerRef.current) return;
    const containerWidth = sliderContainerRef.current.getBoundingClientRect().width;
    if (containerWidth <= 0) return;

    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaTime = (deltaX / containerWidth) * maxVal;

    const sliceDur = dragStartRef.current.duration;
    let newStart = dragStartRef.current.startVal + deltaTime;

    newStart = Math.max(0, Math.min(maxVal - sliceDur, newStart));
    const newEnd = newStart + sliceDur;

    setStartTime(String(Math.round(newStart * 10) / 10));
    setEndTime(String(Math.round(newEnd * 10) / 10));
  };

  const handleRangePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingRangeRef.current) {
      isDraggingRangeRef.current = false;
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch (_) {}
    }
  };

  const handleSave = () => {
    setValidationError(null);
    if (!name.trim()) {
      setValidationError(t("addAudioModal.alertNoName"));
      return;
    }
    if (categories.length === 0) {
      setValidationError(t("addAudioModal.alertNoCategory"));
      return;
    }

    const sTime = parseFloat(startTime) || 0;
    const eTime = parseFloat(endTime) || 0;

    if (editingAudio) {
      stopPreview();
      cleanupYtPlayer();
      updateCustomAudio(editingAudio.id, {
        name: name.trim(),
        mode,
        startTime: sTime,
        endTime: eTime,
        volume: volume
      });
      setEditingAudio(null);
    } else {
      if (inputType === "file") {
        if (!file) {
          setValidationError(t("addAudioModal.alertNoFile"));
          return;
        }
        stopPreview();
        cleanupYtPlayer();
        addCustomAudio(categories, file, name.trim(), true, mode, sTime, eTime, volume);
      } else {
        if (!url.trim()) {
          setValidationError(t("addAudioModal.alertNoURL"));
          return;
        }
        stopPreview();
        cleanupYtPlayer();
        addCustomAudio(categories, url.trim(), name.trim(), false, mode, sTime, eTime, volume);
      }
    }

    handleClose();
  };

  const toggleCategory = (cat: "tick" | "win") => {
    setValidationError(null);
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return "0s";
    const m = Math.floor(secs / 60);
    const s = (secs % 60).toFixed(1);
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  const activeSrc = editingAudio ? editingAudio.url : (inputType === "file" && file ? URL.createObjectURL(file) : url);
  const activeYtId = extractYouTubeId(activeSrc);

  const handlePreviewSlice = () => {
    if (isPreviewing) {
      stopPreview();
      return;
    }

    if (!activeSrc) return;

    if (activeYtId) {
      if (!ytPlayerRef.current) {
        ytPlayerRef.current = new YouTubeAudio(activeYtId);
      }
      const yt = ytPlayerRef.current;
      yt.startTime = numStart;
      yt.endTime = numEnd;
      yt.volume = (volume / 100) * (masterVolume / 100);
      yt.onEndedCallback = () => setIsPreviewing(false);
      yt.play();
      setIsPreviewing(true);
    } else {
      const audio = new Audio(activeSrc);
      audio.volume = Math.min((volume / 100) * (masterVolume / 100), 1);
      audio.currentTime = numStart;

      const checkTime = () => {
        if (audio.currentTime >= numEnd) {
          audio.pause();
          stopPreview();
          audio.removeEventListener("timeupdate", checkTime);
        }
      };

      audio.addEventListener("timeupdate", checkTime);
      audio.onended = () => stopPreview();

      audio.play().then(() => {
        setIsPreviewing(true);
        previewAudioRef.current = audio;
      }).catch(() => {});
    }
  };

  return (
    <div
      className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-label={editingAudio ? t('audioSettings.edit') : t('addAudioModal.title')}
    >
      <div
        className="bg-[var(--studio-surface)] border border-[var(--studio-border-strong)] text-[var(--studio-text)] w-full max-w-lg rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--studio-border)] bg-[var(--studio-surface-elevated)]">
          <h2 className="text-[var(--studio-text)] font-semibold flex items-center gap-2.5 text-base">
            <Music size={18} className="text-[var(--studio-accent-fg)]" />
            {editingAudio ? t('audioSettings.edit') : t('addAudioModal.title')}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 text-[var(--studio-text-muted)] hover:text-[var(--studio-text)] hover:bg-[var(--studio-card-hover)] rounded-lg transition-colors"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-5 overflow-y-auto custom-scrollbar max-h-[72vh]">
          {validationError && (
            <div className="flex items-center gap-2.5 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-700 dark:text-red-300">
              <AlertCircle size={15} className="text-red-600 dark:text-red-400 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Audio Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--studio-text-secondary)] block">{t('addAudioModal.audioName')}</label>
            <Input
              type="text"
              placeholder={t('addAudioModal.audioNamePlh')}
              value={name}
              onChange={(e) => {
                setValidationError(null);
                setName(e.target.value);
              }}
            />
          </div>

          {!editingAudio && (
            <div className="space-y-2.5">
              <label className="text-xs font-medium text-[var(--studio-text-secondary)] block">{t('addAudioModal.uploadFile')}</label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-[var(--studio-input)] rounded-lg border border-[var(--studio-border)]">
                <button
                  type="button"
                  onClick={() => {
                    setValidationError(null);
                    setInputType('file');
                  }}
                  className={`py-1.5 rounded-md text-xs font-semibold transition-colors ${
                    inputType === 'file' ? 'bg-[var(--studio-card)] text-[var(--studio-text)] border border-[var(--studio-border-strong)]' : 'text-[var(--studio-text-muted)] hover:text-[var(--studio-text)]'
                  }`}
                >
                  {t('addAudioModal.localFile')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setValidationError(null);
                    setInputType('url');
                  }}
                  className={`py-1.5 rounded-md text-xs font-semibold transition-colors ${
                    inputType === 'url' ? 'bg-[var(--studio-card)] text-[var(--studio-text)] border border-[var(--studio-border-strong)]' : 'text-[var(--studio-text-muted)] hover:text-[var(--studio-text)]'
                  }`}
                >
                  {t('addAudioModal.externalURL')}
                </button>
              </div>

              {inputType === "file" ? (
                <div
                  className="bg-[var(--studio-input)] border border-dashed border-[var(--studio-border-strong)] rounded-xl p-5 flex flex-col items-center justify-center cursor-pointer hover:bg-[var(--studio-card)] hover:border-[var(--studio-accent)] transition-colors group"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    type="file"
                    accept="audio/*"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        setValidationError(null);
                        setFile(f);
                        if (!name) setName(f.name.replace(/\.[^/.]+$/, ""));
                      }
                    }}
                  />
                  <Upload size={20} className="text-[var(--studio-text-muted)] group-hover:text-[var(--studio-accent-fg)] mb-2 transition-colors" />
                  <span className="text-xs font-medium text-[var(--studio-text-muted)] group-hover:text-[var(--studio-text)] transition-colors text-center break-all">
                    {file ? file.name : t('addAudioModal.clickToSelect')}
                  </span>
                </div>
              ) : (
                <Input
                  type="url"
                  placeholder="URL (ex: https://www.youtube.com/watch?v=... ou .mp3)"
                  value={url}
                  onChange={(e) => {
                    setValidationError(null);
                    setUrl(e.target.value);
                  }}
                />
              )}
            </div>
          )}

          {/* Dual-Handle Range Slider */}
          <div className="space-y-3.5 bg-[var(--studio-card)] p-4 rounded-xl border border-[var(--studio-border)]">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-semibold text-[var(--studio-text)] flex items-center gap-1.5">
                <Scissors size={14} className="text-[var(--studio-accent-fg)]" />
                Ajustar Trecho do Áudio
              </label>
              {activeSrc && (
                <button
                  type="button"
                  onClick={handlePreviewSlice}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors border ${
                    isPreviewing
                      ? "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/40"
                      : "bg-[var(--studio-accent-soft)] text-[var(--studio-accent-fg)] border-[var(--studio-accent)]/40 hover:opacity-90"
                  }`}
                >
                  {isPreviewing ? <StopCircle size={13} /> : <PlayCircle size={13} />}
                  {isPreviewing ? "Parar" : "Ouvir Trecho"}
                </button>
              )}
            </div>

            <div className="flex justify-between text-xs text-[var(--studio-text-secondary)] font-medium">
              <span>Início: <strong className="text-[var(--studio-accent-fg)] font-mono tabular-nums">{formatTime(numStart)}</strong></span>
              <span>Fim: <strong className="text-[var(--studio-accent-fg)] font-mono tabular-nums">{numEnd >= maxVal ? `${formatTime(maxVal)} (Total)` : formatTime(numEnd)}</strong></span>
            </div>

            <div ref={sliderContainerRef} className="relative w-full h-7 flex items-center select-none py-2">
              <div className="absolute inset-x-0 h-2 bg-[var(--studio-input)] rounded-lg overflow-hidden border border-[var(--studio-border)]" />

              <div
                onPointerDown={handleRangePointerDown}
                onPointerMove={handleRangePointerMove}
                onPointerUp={handleRangePointerUp}
                onPointerCancel={handleRangePointerUp}
                className="absolute h-3 bg-[var(--studio-accent)] hover:bg-[var(--studio-accent-hover)] rounded-md cursor-grab active:cursor-grabbing pointer-events-auto z-20 flex items-center justify-center transition-colors"
                style={{
                  left: `${(numStart / maxVal) * 100}%`,
                  width: `${Math.max(0, ((numEnd - numStart) / maxVal) * 100)}%`,
                }}
                title="Arraste para mover o trecho mantendo a duração"
              >
                <div className="w-3 h-1 bg-white/80 rounded-full" />
              </div>

              <input
                type="range"
                min={0}
                max={maxVal}
                step={0.1}
                value={numStart}
                onChange={(e) => {
                  const val = Math.max(0, Math.min(parseFloat(e.target.value), maxVal - 0.1));
                  setStartTime(String(val));
                  if (numEnd <= val) {
                    setEndTime(String(Math.min(maxVal, val + 0.1)));
                  }
                }}
                className="absolute inset-0 w-full appearance-none bg-transparent pointer-events-none z-30 [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:bg-blue-400 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:bg-blue-400 [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:cursor-pointer"
              />

              <input
                type="range"
                min={0}
                max={maxVal}
                step={0.1}
                value={numEnd}
                onChange={(e) => {
                  const val = Math.max(numStart + 0.1, Math.min(parseFloat(e.target.value), maxVal));
                  setEndTime(String(val));
                }}
                className="absolute inset-0 w-full appearance-none bg-transparent pointer-events-none z-40 [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:bg-blue-400 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:bg-blue-400 [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:cursor-pointer"
              />
            </div>

            <div className="flex justify-between items-center text-[11px] text-[var(--studio-text-muted)] pt-1">
              <span className="font-mono tabular-nums">
                {activeYtId ? "YouTube: " : "Duração: "}
                {duration > 0 ? formatTime(duration) : (activeYtId ? "Detectando..." : "Desconhecida")}
              </span>
              <div className="flex items-center gap-2">
                <span>Trecho: <strong className="text-[var(--studio-accent-fg)] font-mono tabular-nums">{formatTime(Math.max(0, numEnd - numStart))}</strong></span>
                <button
                  type="button"
                  onClick={() => setEndTime(String(Math.min(maxVal, numStart + wheelTime)))}
                  className="text-[11px] px-2 py-0.5 rounded bg-[var(--studio-accent-soft)] text-[var(--studio-accent-fg)] border border-[var(--studio-accent)]/35 hover:opacity-90 font-medium transition-colors font-mono tabular-nums"
                  title="Ajustar duração do trecho para o tempo de rotação da roleta"
                >
                  Max ({wheelTime}s)
                </button>
              </div>
            </div>
          </div>

          {/* Volume Slider */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-[var(--studio-text-secondary)] flex items-center justify-between">
              <span className="flex items-center gap-1.5"><Volume2 size={13} className="text-[var(--studio-text-muted)]" /> {t('audioSettings.volume')}</span>
              <span className="text-[var(--studio-accent-fg)] font-mono tabular-nums font-semibold">{volume}%</span>
            </label>
            <input
              type="range"
              min="0"
              max="200"
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="w-full h-1.5 bg-[var(--studio-input)] border border-[var(--studio-border)] rounded-lg appearance-none cursor-pointer accent-[var(--studio-accent)]"
            />
          </div>

          {!editingAudio && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-[var(--studio-text-secondary)] block">{t('addAudioModal.whereToUse')}</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => toggleCategory("tick")}
                  className={`py-2 px-3 rounded-lg text-xs sm:text-sm border font-medium transition-colors ${
                    categories.includes("tick")
                      ? "bg-[var(--studio-accent-soft)] text-[var(--studio-accent-fg)] border-[var(--studio-accent)]/50"
                      : "bg-[var(--studio-card)] text-[var(--studio-text-muted)] border-[var(--studio-border)] hover:text-[var(--studio-text)]"
                  }`}
                >
                  {t('addAudioModal.spin')}
                </button>
                <button
                  type="button"
                  onClick={() => toggleCategory("win")}
                  className={`py-2 px-3 rounded-lg text-xs sm:text-sm border font-medium transition-colors ${
                    categories.includes("win")
                      ? "bg-[var(--studio-accent-soft)] text-[var(--studio-accent-fg)] border-[var(--studio-accent)]/50"
                      : "bg-[var(--studio-card)] text-[var(--studio-text-muted)] border-[var(--studio-border)] hover:text-[var(--studio-text)]"
                  }`}
                >
                  {t('addAudioModal.win')}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-[var(--studio-border)] bg-[var(--studio-surface-elevated)] flex justify-end gap-2.5 shrink-0">
          <Button type="button" variant="secondary" onClick={handleClose}>
            {t('addAudioModal.cancel')}
          </Button>
          <Button type="button" variant="primary" onClick={handleSave} className="gap-2">
            {editingAudio ? <Save size={15} /> : <Plus size={15} />}
            {editingAudio ? t('addAudioModal.save') : t('addAudioModal.add')}
          </Button>
        </div>
      </div>
    </div>
  );
};
