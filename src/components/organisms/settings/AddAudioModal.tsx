import React, { useState, useRef, useEffect } from "react";
import { X, Upload, Plus, Music, PlayCircle, StopCircle, Save, Scissors, Volume2 } from "lucide-react";
import { useAudioActions } from "../../../hooks/useAppActions";
import { useTranslation } from "react-i18next";
import { useAppStore } from "../../../store/useAppStore";
import { extractYouTubeId } from "../../../utils/youtubeUtils";
import { YouTubeAudio } from "../../../utils/youtubePlayer";

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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const ytPlayerRef = useRef<YouTubeAudio | null>(null);
  const durationCheckIntervalRef = useRef<any>(null);

  const sliderContainerRef = useRef<HTMLDivElement | null>(null);
  const isDraggingRangeRef = useRef(false);
  const dragStartRef = useRef<{ x: number; startVal: number; duration: number }>({ x: 0, startVal: 0, duration: 0 });

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

  useEffect(() => {
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

  // Load duration dynamically for both standard audio files and YouTube URLs
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
      // Handle YouTube Audio
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
      // Handle HTML5 Audio
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

  const handleSave = () => {
    if (!name.trim()) {
      alert(t("addAudioModal.alertNoName"));
      return;
    }
    if (categories.length === 0) {
      alert(t("addAudioModal.alertNoCategory"));
      return;
    }

    const sTime = parseFloat(startTime) || 0;
    const eTime = parseFloat(endTime) || 0;

    stopPreview();
    cleanupYtPlayer();

    if (editingAudio) {
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
          alert(t("addAudioModal.alertNoFile"));
          return;
        }
        addCustomAudio(categories, file, name.trim(), true, mode, sTime, eTime, volume);
      } else {
        if (!url.trim()) {
          alert(t("addAudioModal.alertNoURL"));
          return;
        }
        addCustomAudio(categories, url.trim(), name.trim(), false, mode, sTime, eTime, volume);
      }
    }

    handleClose();
  };

  const handleClose = () => {
    stopPreview();
    cleanupYtPlayer();
    setEditingAudio(null);
    onClose();
  };

  const toggleCategory = (cat: "tick" | "win") => {
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

  const maxVal = duration > 0 ? duration : 300;
  const numStart = Math.min(parseFloat(startTime) || 0, maxVal);
  const rawEnd = parseFloat(endTime);
  const numEnd = rawEnd === 0 || rawEnd > maxVal ? maxVal : Math.max(rawEnd, numStart);

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
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-950/80 border border-slate-800/80 backdrop-blur-xl w-full max-w-lg rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/60 bg-slate-900/40">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <Music size={18} className="text-blue-400" /> 
            {editingAudio ? t('audioSettings.edit') : t('addAudioModal.title')}
          </h2>
          <button onClick={handleClose} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-5 overflow-y-auto max-h-[70vh]">
          {/* Nome do Áudio */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">{t('addAudioModal.audioName')}</label>
            <input
              type="text"
              placeholder={t('addAudioModal.audioNamePlh')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-950/45 text-sm text-white px-3.5 py-2.5 rounded-xl border border-slate-800 focus:border-blue-500/80 focus:ring-1 focus:ring-blue-500/30 outline-none transition-all shadow-inner"
            />
          </div>

          {!editingAudio && (
            <div className="space-y-3">
              <label className="text-sm font-medium text-slate-300">{t('addAudioModal.uploadFile')}</label>
              <div className="flex gap-4 mb-2">
                <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                  <input type="radio" checked={inputType === 'file'} onChange={() => setInputType('file')} />
                  {t('addAudioModal.localFile')}
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                  <input type="radio" checked={inputType === 'url'} onChange={() => setInputType('url')} />
                  {t('addAudioModal.externalURL')}
                </label>
              </div>

              {inputType === "file" ? (
                <div
                  className="bg-slate-950/30 border-2 border-dashed border-slate-800/80 rounded-xl p-5 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-900/40 hover:border-blue-500/50 transition-all duration-300 group/drop"
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
                        setFile(f);
                        if (!name) setName(f.name.replace(/\.[^/.]+$/, ""));
                      }
                    }}
                  />
                  <Upload size={20} className="text-slate-500 group-hover/drop:text-blue-400 mb-2 transition-colors" />
                  <span className="text-xs font-medium text-slate-500 group-hover/drop:text-slate-400 transition-colors">
                    {file ? file.name : t('addAudioModal.clickToSelect')}
                  </span>
                </div>
              ) : (
                <input
                  type="url"
                  placeholder="URL (ex: https://www.youtube.com/watch?v=... ou .mp3)"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full bg-slate-950/45 text-sm text-white px-3.5 py-2.5 rounded-xl border border-slate-800 focus:border-blue-500/80 focus:ring-1 focus:ring-blue-500/30 outline-none transition-all shadow-inner"
                />
              )}
            </div>
          )}

          {/* Dual-Handle Range Slider para Cortar o Trecho do Som */}
          <div className="space-y-4 bg-slate-900/50 p-4 rounded-xl border border-slate-800/80">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Scissors size={14} className="text-blue-400" />
                Ajustar Trecho do Áudio (Início e Fim)
              </label>
              {activeSrc && (
                <button
                  type="button"
                  onClick={handlePreviewSlice}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    isPreviewing
                      ? "bg-red-500/20 text-red-400 border border-red-500/40"
                      : "bg-blue-600/20 text-blue-400 border border-blue-500/40 hover:bg-blue-600/30"
                  }`}
                >
                  {isPreviewing ? <StopCircle size={14} /> : <PlayCircle size={14} />}
                  {isPreviewing ? "Parar Teste" : "Ouvir Trecho"}
                </button>
              )}
            </div>

            {/* Marcadores de Tempo */}
            <div className="flex justify-between text-xs text-slate-300 font-medium">
              <span>Início: <strong className="text-blue-400 font-mono">{formatTime(numStart)}</strong></span>
              <span>Fim: <strong className="text-blue-400 font-mono">{numEnd >= maxVal ? `${formatTime(maxVal)} (Total)` : formatTime(numEnd)}</strong></span>
            </div>

            {/* Slider Único com 2 Pontos e Barra Arrastável */}
            <div ref={sliderContainerRef} className="relative w-full h-7 flex items-center select-none py-2">
              {/* Trilha de Fundo */}
              <div className="absolute inset-x-0 h-2 bg-slate-800 rounded-lg overflow-hidden" />

              {/* Trilha Ativa (Entre Início e Fim) - Arrastável para mover o trecho inteiro sem mudar a duração */}
              <div
                onPointerDown={handleRangePointerDown}
                onPointerMove={handleRangePointerMove}
                onPointerUp={handleRangePointerUp}
                onPointerCancel={handleRangePointerUp}
                className="absolute h-3 bg-blue-500 hover:bg-blue-400 active:bg-blue-600 rounded-lg cursor-grab active:cursor-grabbing pointer-events-auto z-20 flex items-center justify-center shadow-md transition-colors group"
                style={{
                  left: `${(numStart / maxVal) * 100}%`,
                  width: `${Math.max(0, ((numEnd - numStart) / maxVal) * 100)}%`,
                }}
                title="Clique e arraste esta barra azul para mover o trecho mantendo a mesma duração"
              >
                <div className="w-3 h-1 bg-white/70 rounded-full group-hover:scale-125 transition-transform" />
              </div>

              {/* Input do Ponto Inicial */}
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
                className="absolute inset-0 w-full appearance-none bg-transparent pointer-events-none z-30 [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:bg-blue-400 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:bg-blue-400 [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:cursor-pointer"
              />

              {/* Input do Ponto Final */}
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
                className="absolute inset-0 w-full appearance-none bg-transparent pointer-events-none z-40 [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:bg-blue-400 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:bg-blue-400 [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:cursor-pointer"
              />
            </div>

            <div className="flex justify-between items-center text-[11px] text-slate-400 italic pt-1">
              <span>
                {activeYtId ? "YouTube: " : "Duração: "}
                {duration > 0 ? formatTime(duration) : (activeYtId ? "Detectando..." : "Desconhecida")}
              </span>
              <div className="flex items-center gap-2">
                <span>Trecho: <strong className="text-blue-400 font-mono not-italic">{formatTime(Math.max(0, numEnd - numStart))}</strong></span>
                <button
                  type="button"
                  onClick={() => setEndTime(String(Math.min(maxVal, numStart + wheelTime)))}
                  className="not-italic text-[10px] px-2 py-0.5 rounded bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/30 font-medium transition-all"
                  title="Ajustar duração do trecho para o tempo de rotação da roleta"
                >
                  Max Roleta ({wheelTime}s)
                </button>
              </div>
            </div>
          </div>

          {/* Volume Slider */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-400 flex items-center gap-1.5 justify-between">
              <span className="flex items-center gap-1.5"><Volume2 size={12} /> {t('audioSettings.volume')}</span>
              <span className="text-blue-400 font-mono">{volume}%</span>
            </label>
            <input
              type="range"
              min="0"
              max="200"
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>

          {!editingAudio && (
            <div className="space-y-3">
              <label className="text-sm font-medium text-slate-300">{t('addAudioModal.whereToUse')}</label>
              <div className="flex gap-2">
                <button
                  onClick={() => toggleCategory("tick")}
                  className={`flex-1 py-2 px-1 rounded-xl text-xs sm:text-sm border font-medium transition-all ${
                    categories.includes("tick")
                      ? "bg-blue-600/15 text-blue-400 border-blue-500/50 shadow-md"
                      : "bg-slate-900/50 text-slate-400 border-slate-800 hover:border-slate-700 hover:bg-slate-900/70"
                  }`}
                >
                  {t('addAudioModal.spin')}
                </button>
                <button
                  onClick={() => toggleCategory("win")}
                  className={`flex-1 py-2 px-1 rounded-xl text-xs sm:text-sm border font-medium transition-all ${
                    categories.includes("win")
                      ? "bg-blue-600/15 text-blue-400 border-blue-500/50 shadow-md"
                      : "bg-slate-900/50 text-slate-400 border-slate-800 hover:border-slate-700 hover:bg-slate-900/70"
                  }`}
                >
                  {t('addAudioModal.win')}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-800/60 bg-slate-900/40 flex justify-end gap-3 shrink-0">
          <button onClick={handleClose} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-400 hover:text-white transition-colors">
            {t('addAudioModal.cancel')}
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-md transition-all active:scale-95 flex items-center gap-2"
          >
            {editingAudio ? <Save size={16} /> : <Plus size={16} />}
            {editingAudio ? t('addAudioModal.save') : t('addAudioModal.add')}
          </button>
        </div>
      </div>
    </div>
  );
};
