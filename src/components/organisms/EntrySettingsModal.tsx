import React, { useState, useEffect, useRef } from "react";
import {
  X,
  ArrowLeft,
  ArrowRight,
  Plus,
  Copy,
  Trash,
  Settings2,
  PlayCircle,
  Upload,
  Image as ImageIcon,
  Music2
} from "lucide-react";
import { useAppStore } from "../../store/useAppStore";
import { useWheelData } from "../../hooks/useWheelData";
import { useAudioActions } from "../../hooks/useAppActions";
import { useTranslation } from "react-i18next";
import { Item } from "../../types";

export const EntrySettingsModal = () => {
  const { t } = useTranslation();
  const items = useAppStore(s => s.items);
  const setItems = useAppStore(s => s.setItems);
  const editingEntryId = useAppStore(s => s.editingEntryId);
  const setEditingEntryId = useAppStore(s => s.setEditingEntryId);
  const isSpinning = useAppStore(s => s.isSpinning);
  const customWinAudios = useAppStore(s => s.customWinAudios);
  const setIsAddAudioModalOpen = useAppStore(s => s.setIsAddAudioModalOpen);
  
  const { validItems } = useWheelData();
  const { removeCustomAudio } = useAudioActions();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [tempItem, setTempItem] = useState<Item | null>(null);

  useEffect(() => {
    if (editingEntryId) {
      const item = items.find((i) => i.id === editingEntryId);
      if (item) setTempItem({ ...item });
      else setEditingEntryId(null);
    } else {
      setTempItem(null);
    }
  }, [editingEntryId, items, setEditingEntryId]);

  if (!editingEntryId || !tempItem) return null;

  const itemIndex = items.findIndex((i) => i.id === editingEntryId);
  const totalWeight = validItems.reduce((acc, i) => acc + (i.weight || 1), 0);
  const weightPercentage =
    tempItem.enabled !== false
      ? Math.round(
          ((tempItem.weight || 1) /
            (totalWeight -
              (items[itemIndex]?.enabled !== false
                ? items[itemIndex]?.weight || 1
                : 0) +
              (tempItem.weight || 1))) *
            100,
        )
      : 0;

  const handleSave = () => {
    if (isSpinning) return;
    setItems((prev) => prev.map((i) => (i.id === tempItem.id ? tempItem : i)));
    setEditingEntryId(null);
  };

  const handleCancel = () => {
    setEditingEntryId(null);
  };

  const handlePrev = () => {
    if (itemIndex > 0) {
      setItems((prev) =>
        prev.map((i) => (i.id === tempItem.id ? tempItem : i)),
      );
      setEditingEntryId(items[itemIndex - 1].id);
    }
  };

  const handleNext = () => {
    if (itemIndex < items.length - 1) {
      setItems((prev) =>
        prev.map((i) => (i.id === tempItem.id ? tempItem : i)),
      );
      setEditingEntryId(items[itemIndex + 1].id);
    }
  };

  const handleAdd = () => {
    const newItem = {
      id: crypto.randomUUID(),
      text: "Nova Entrada",
      weight: 1,
      enabled: true,
    };
    setItems((prev) => {
      const updated = prev.map((i) => (i.id === tempItem.id ? tempItem : i));
      return [...updated, newItem];
    });
    setEditingEntryId(newItem.id);
  };

  const handleDuplicate = () => {
    const newItem = {
      ...tempItem,
      id: crypto.randomUUID(),
      text: tempItem.text + " (Cópia)",
    };
    setItems((prev) => {
      const newItems = [...prev];
      newItems.splice(itemIndex + 1, 0, newItem);
      return newItems;
    });
    setEditingEntryId(newItem.id);
  };

  const handleDelete = () => {
    setItems((prev) => prev.filter((i) => i.id !== editingEntryId));
    setEditingEntryId(null);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setTempItem((prev) =>
          prev ? { ...prev, image: ev.target?.result as string } : null,
        );
      };
      reader.readAsDataURL(file);
    }
  };

  const winSoundOptions = [
    "tada",
    "fanfarra",
    "sino",
    "harpa",
    "magia",
    "orquestra",
    "aplausos-suaves",
    "aplausos-fortes",
    "trombeta",
    "sino-vitoria",
    "surpresa",
  ];

  const hasCustomAudio = customWinAudios && customWinAudios.length > 0;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#1a1b23] border border-slate-700 w-[600px] max-w-full rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50 bg-[#22242f]">
          <div className="flex items-center gap-2 text-white font-semibold">
            <Settings2 size={20} className="text-blue-400" /> {t('entrySettings.customizeEntry')}
          </div>
          <button
            onClick={handleCancel}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-white/5 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-0 custom-scrollbar">
          {/* Top nav */}
          <div className="flex items-center justify-between px-6 py-3 border-b border-slate-700/50 bg-[#1e2029]">
            <div className="flex items-center gap-4">
              <button
                onClick={handlePrev}
                disabled={itemIndex === 0}
                className="bg-slate-700/50 hover:bg-slate-600 p-1.5 rounded-full text-white disabled:opacity-30 transition-colors"
              >
                <ArrowLeft size={16} />
              </button>
              <div className="text-slate-300 font-medium text-xs">
                {itemIndex + 1} {t('entrySettings.of')} {items.length}
              </div>
              <button
                onClick={handleNext}
                disabled={itemIndex === items.length - 1}
                className="bg-slate-700/50 hover:bg-slate-600 p-1.5 rounded-full text-white disabled:opacity-30 transition-colors"
              >
                <ArrowRight size={16} />
              </button>
            </div>
            <button
              onClick={handleAdd}
              className="flex items-center gap-1.5 text-xs font-medium bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white px-3 py-1.5 rounded-full transition-colors"
            >
              <Plus size={14} /> {t('sidebar.entries.add')}
            </button>
          </div>

          <div className="p-6 space-y-8">             {/* Quick Actions */}
            <div className="flex justify-between items-center bg-[#252733] p-3 rounded-xl border border-slate-700/50">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className="relative flex items-center justify-center w-5 h-5 rounded border border-slate-600 bg-slate-800 group-hover:border-blue-500 transition-colors">
                  <input
                    type="checkbox"
                    checked={tempItem.enabled !== false}
                    onChange={(e) =>
                      setTempItem({ ...tempItem, enabled: e.target.checked })
                    }
                    className="absolute opacity-0 w-full h-full cursor-pointer"
                  />
                  {tempItem.enabled !== false && (
                    <div className="w-2.5 h-2.5 bg-blue-500 rounded-sm" />
                  )}
                </div>
                <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">
                  {t('entrySettings.visibleOnWheel')}
                </span>
              </label>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleDuplicate}
                  className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                >
                  <Copy size={14} /> {t('entrySettings.duplicate')}
                </button>
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-1.5 bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                >
                  <Trash size={14} /> {t('entrySettings.delete')}
                </button>
              </div>
            </div>

            {/* Texto & Peso */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">
                  {t('entrySettings.text')}
                </label>
                <input
                  type="text"
                  value={tempItem.text}
                  onChange={(e) =>
                    setTempItem({ ...tempItem, text: e.target.value })
                  }
                  className="w-full bg-[#252733] text-white border border-slate-700 rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-slate-300">
                    {t('entryItem.weight')}{" "}
                    {weightPercentage > 0 && (
                      <span className="text-xs text-blue-400 ml-1">
                        ({weightPercentage}% {t('entrySettings.chance')})
                      </span>
                    )}
                  </label>
                </div>
                <div className="flex items-center bg-[#252733] border border-slate-700 rounded-xl overflow-hidden h-[42px]">
                  <button
                    onClick={() =>
                      setTempItem({
                        ...tempItem,
                        weight: Math.max(0.1, Number((tempItem.weight || 1)) - 1),
                      })
                    }
                    className="w-10 h-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    className="flex-1 bg-transparent text-center text-white font-medium border-none focus:outline-none focus:ring-0"
                    value={tempItem.weight || 1}
                    onChange={(e) =>
                      setTempItem({
                        ...tempItem,
                        weight: Math.max(0.1, parseFloat(e.target.value) || 0.1),
                      })
                    }
                  />
                  <button
                    onClick={() =>
                      setTempItem({
                        ...tempItem,
                        weight: Number((tempItem.weight || 1)) + 1,
                      })
                    }
                    className="w-10 h-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Fundo da Fatia (Cor ou Imagem) */}
            <div className="space-y-3 bg-[#252733] p-4 rounded-xl border border-slate-700/50">
              <label className="text-sm font-medium text-slate-300">
                {t('entrySettings.sliceBackground')}
              </label>
              <p className="text-xs text-slate-500 mb-2">{t('entrySettings.appearanceDesc')}</p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Image Uploader takes precedence */}
                <div className="flex-1">
                  {!tempItem.image ? (
                    <div
                      className="bg-[#1e2029] rounded-lg p-4 h-[80px] flex items-center justify-center border-2 border-dashed border-slate-700 hover:border-blue-500/50 hover:bg-slate-800 transition-colors cursor-pointer"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        ref={fileInputRef}
                        className="hidden"
                      />
                      <div className="flex flex-col items-center gap-1">
                        <ImageIcon size={20} className="text-slate-400" />
                        <span className="text-slate-400 font-medium text-xs">
                          {t('entrySettings.addImage')}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="relative bg-[#1e2029] border border-slate-700 rounded-lg flex items-center justify-center h-[80px] overflow-hidden group">
                      <img
                        src={tempItem.image}
                        alt={t('entrySettings.sliceBackground')}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            fileInputRef.current?.click();
                          }}
                          className="p-2 text-white hover:text-blue-400 transition-colors"
                          title={t('entrySettings.changeImage')}
                        >
                          <Upload size={18} />
                        </button>
                        <button
                          onClick={() =>
                            setTempItem({ ...tempItem, image: undefined })
                          }
                          className="p-2 text-white hover:text-red-400 transition-colors"
                          title={t('entrySettings.removeImage')}
                        >
                          <Trash size={18} />
                        </button>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        ref={fileInputRef}
                        className="hidden"
                      />
                    </div>
                  )}
                </div>

                {/* Color Picker (disabled visually if image is present) */}
                <div className={`relative w-[120px] shrink-0 h-[80px] rounded-lg overflow-hidden border-2 transition-colors ${tempItem.image ? 'border-slate-800 opacity-30 cursor-not-allowed' : 'border-slate-700 hover:border-blue-500 group'}`}>
                  {!tempItem.image && (
                     <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 transition-opacity pointer-events-none z-10">
                       <span className="text-xs font-medium text-white drop-shadow-md">{t('entrySettings.cropColor')}</span>
                     </div>
                  )}
                  <input
                    type="color"
                    disabled={!!tempItem.image}
                    className="absolute inset-0 w-full h-[150%] -translate-y-1/4 cursor-pointer disabled:cursor-not-allowed"
                    value={tempItem.color || "#cccccc"}
                    onChange={(e) =>
                      setTempItem({ ...tempItem, color: e.target.value })
                    }
                  />
                  {tempItem.color && !tempItem.image && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setTempItem({ ...tempItem, color: undefined });
                      }}
                      className="absolute top-1 right-1 bg-black/60 text-white p-1 rounded hover:bg-red-500 transition-colors z-20"
                      title={t('entrySettings.removeColor')}
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

              </div>
            </div>

            {/* Mensagem Pop-up */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">
                {t('entrySettings.winMessage')}
              </label>
              <input
                type="text"
                placeholder={t("entrySettings.winMessagePlh")}
                value={tempItem.message || ""}
                onChange={(e) =>
                  setTempItem({ ...tempItem, message: e.target.value })
                }
                className="w-full bg-[#252733] text-white border border-slate-700 rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500 transition-colors placeholder:text-slate-600"
              />
            </div>

            {/* Som de Vitória */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-300">
                  {t('entrySettings.customSound')}
                </label>
                {tempItem.sound && (
                  <button
                    onClick={() =>
                      setTempItem({ ...tempItem, sound: undefined })
                    }
                    className="text-xs text-blue-400 hover:text-blue-300 hover:underline transition-colors"
                  >
                    {t('entrySettings.useDefaultSound')}
                  </button>
                )}
              </div>

              {/* Grid of predefined sounds */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {winSoundOptions.map((type) => (
                  <button
                    key={type}
                    onClick={() => setTempItem({ ...tempItem, sound: type })}
                    className={`px-2 py-2 rounded-lg text-xs font-medium capitalize transition-all border ${
                      tempItem.sound === type
                        ? "bg-blue-600 text-white border-blue-500 ring-2 ring-blue-500/50"
                        : "bg-[#252733] text-slate-400 hover:text-slate-200 hover:bg-slate-800 border-slate-700"
                    }`}
                  >
                    {type.replace("-", " ")}
                  </button>
                ))}
              </div>

              {/* Custom audios list if any exist */}
              <div className="bg-[#252733] rounded-xl border border-slate-700/50 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-300">{t('entrySettings.uploadedAudios')}</p>
                  <button
                    onClick={() => setIsAddAudioModalOpen(true)}
                    className="flex items-center gap-1.5 text-xs font-semibold bg-blue-600/10 text-blue-400 hover:bg-blue-600 hover:text-white px-3 py-1.5 rounded-md transition-colors"
                  >
                    <Plus size={14} /> {t('entrySettings.newAudio')}
                  </button>
                </div>
                {hasCustomAudio ? (
                  <div className="space-y-2 max-h-[150px] overflow-y-auto custom-scrollbar pr-2">
                    {customWinAudios.map((audio) => (
                      <div
                        key={audio.id}
                        className={`flex items-center justify-between p-2 rounded-md transition-all border ${
                          tempItem.sound === audio.id
                            ? "bg-blue-600/20 border-blue-500/50"
                            : "bg-[#1e2029] border-slate-700"
                        }`}
                      >
                        <div
                          className="flex items-center gap-2 overflow-hidden flex-1 cursor-pointer"
                          onClick={() => setTempItem({ ...tempItem, sound: audio.id })}
                        >
                           <button
                             className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-all ${tempItem.sound === audio.id ? "bg-blue-500 text-white" : "bg-slate-700 text-slate-300"}`}
                             onClick={(e) => {
                               e.stopPropagation();
                               if (audio.audioObj) {
                                 audio.audioObj.currentTime = 0;
                                 audio.audioObj.play().catch(() => {});
                               }
                             }}
                           >
                            <PlayCircle size={12} />
                          </button>
                          <span className={`text-xs truncate ${tempItem.sound === audio.id ? "text-blue-300 font-medium" : "text-slate-300"}`}>
                            {audio.name}
                          </span>
                        </div>
                        <button
                          onClick={() => removeCustomAudio("win", audio.id)}
                          className="text-slate-500 hover:text-red-400 p-1 shrink-0 ml-2"
                        >
                          <Trash size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-4 text-slate-500 space-y-1">
                    <Music2 size={20} className="opacity-50" />
                    <p className="text-[10px] italic">{t('entrySettings.noAudio')}</p>
                  </div>
                )}
                
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-700/50 flex justify-end gap-3 bg-[#1e2029]">
          <button
            onClick={handleCancel}
            className="px-6 py-2 rounded-lg font-medium text-slate-300 hover:bg-white/5 transition-colors"
          >
            {t('entrySettings.cancel')}
          </button>
          <button
            onClick={handleSave}
            className="px-8 py-2 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-colors shadow-lg shadow-blue-900/20"
          >
            {t('entrySettings.saveBtn')}
          </button>
        </div>
      </div>
    </div>
  );
};
