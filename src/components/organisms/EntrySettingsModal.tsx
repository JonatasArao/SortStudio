import React, { useState, useEffect } from 'react';
import {
  X,
  ArrowLeft,
  ArrowRight,
  Plus,
  Copy,
  Trash,
  Settings2,
  PlayCircle,
  Music2,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useWheelData } from '../../hooks/useWheelData';
import { useAudioActions } from '../../hooks/useAppActions';
import { useTranslation } from 'react-i18next';
import { Item } from '../../types';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';

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

  const [tempItem, setTempItem] = useState<Item | null>(null);

  useEffect(() => {
    if (editingEntryId) {
      const item = items.find(i => i.id === editingEntryId);
      if (item) setTempItem({ ...item });
      else setEditingEntryId(null);
    } else {
      setTempItem(null);
    }
  }, [editingEntryId, items, setEditingEntryId]);

  useEffect(() => {
    if (!editingEntryId) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setEditingEntryId(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [editingEntryId, setEditingEntryId]);

  if (!editingEntryId || !tempItem) return null;

  const itemIndex = items.findIndex(i => i.id === editingEntryId);
  const currentValidItem = validItems.find(vi => vi.id === editingEntryId);
  const totalWeight = validItems.reduce((acc, i) => acc + (i.weight !== undefined ? i.weight : 1), 0);
  const effectiveWeight = currentValidItem
    ? currentValidItem.weight
    : tempItem.weight !== undefined
    ? tempItem.weight
    : 1;
  const weightPercentage =
    tempItem.enabled !== false && totalWeight > 0
      ? Math.round((effectiveWeight / totalWeight) * 100)
      : 0;

  const handleSave = () => {
    if (isSpinning) return;
    setItems(prev => prev.map(i => (i.id === tempItem.id ? tempItem : i)));
    setEditingEntryId(null);
  };

  const handleCancel = () => {
    setEditingEntryId(null);
  };

  const handlePrev = () => {
    if (itemIndex > 0) {
      setItems(prev => prev.map(i => (i.id === tempItem.id ? tempItem : i)));
      setEditingEntryId(items[itemIndex - 1].id);
    }
  };

  const handleNext = () => {
    if (itemIndex < items.length - 1) {
      setItems(prev => prev.map(i => (i.id === tempItem.id ? tempItem : i)));
      setEditingEntryId(items[itemIndex + 1].id);
    }
  };

  const handleAdd = () => {
    const newItem = {
      id: crypto.randomUUID(),
      text: 'Nova Entrada',
      weight: 1,
      enabled: true,
    };
    setItems(prev => {
      const updated = prev.map(i => (i.id === tempItem.id ? tempItem : i));
      return [...updated, newItem];
    });
    setEditingEntryId(newItem.id);
  };

  const handleDuplicate = () => {
    const newItem = {
      ...tempItem,
      id: crypto.randomUUID(),
      text: tempItem.text + ' (Cópia)',
    };
    setItems(prev => {
      const newItems = [...prev];
      newItems.splice(itemIndex + 1, 0, newItem);
      return newItems;
    });
    setEditingEntryId(newItem.id);
  };

  const handleDelete = () => {
    setItems(prev => prev.filter(i => i.id !== editingEntryId));
    setEditingEntryId(null);
  };

  const winSoundOptions = [
    'tada',
    'fanfarra',
    'sino',
    'harpa',
    'magia',
    'orquestra',
    'aplausos-suaves',
    'aplausos-fortes',
    'trombeta',
    'sino-vitoria',
    'surpresa',
  ];

  const hasCustomAudio = customWinAudios && customWinAudios.length > 0;

  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-md z-[200] flex items-center justify-center p-4"
      onClick={handleCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="bg-[var(--studio-surface)] border border-[var(--studio-border-strong)] text-[var(--studio-text)] w-[600px] max-w-full rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-[var(--studio-border)] bg-[var(--studio-surface-elevated)]">
          <div className="flex items-center gap-2.5 text-[var(--studio-text)] font-display font-bold text-base">
            <Settings2 size={18} className="text-[var(--studio-accent-fg)]" />
            <span>{t('entrySettings.customizeEntry')}</span>
          </div>
          <button
            type="button"
            onClick={handleCancel}
            className="w-8 h-8 rounded-lg bg-[var(--studio-card)] hover:bg-[var(--studio-card-hover)] text-[var(--studio-text-muted)] hover:text-[var(--studio-text)] border border-[var(--studio-border-strong)] flex items-center justify-center transition-colors"
            aria-label={t('common.close', 'Fechar')}
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {/* Item Navigator */}
          <div className="flex items-center justify-between px-5 sm:px-6 py-3 border-b border-[var(--studio-border)] bg-[var(--studio-input)]">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handlePrev}
                disabled={itemIndex === 0}
                className="w-8 h-8 rounded-lg bg-[var(--studio-card)] hover:bg-[var(--studio-card-hover)] border border-[var(--studio-border-strong)] flex items-center justify-center text-[var(--studio-text)] disabled:opacity-30 transition-colors"
                aria-label="Anterior"
              >
                <ArrowLeft size={14} />
              </button>
              <span className="text-[var(--studio-text-secondary)] font-mono tabular-nums font-medium text-xs">
                {itemIndex + 1} {t('entrySettings.of')} {items.length}
              </span>
              <button
                type="button"
                onClick={handleNext}
                disabled={itemIndex === items.length - 1}
                className="w-8 h-8 rounded-lg bg-[var(--studio-card)] hover:bg-[var(--studio-card-hover)] border border-[var(--studio-border-strong)] flex items-center justify-center text-[var(--studio-text)] disabled:opacity-30 transition-colors"
                aria-label="Próximo"
              >
                <ArrowRight size={14} />
              </button>
            </div>
            <Button variant="secondary" size="sm" onClick={handleAdd}>
              <Plus size={14} />
              <span>{t('sidebar.entries.add')}</span>
            </Button>
          </div>

          <div className="p-5 sm:p-6 space-y-6">
            {/* Quick Actions */}
            <div className="flex flex-wrap justify-between items-center gap-3 bg-[var(--studio-card)] p-3.5 rounded-xl border border-[var(--studio-border)]">
              <label className="flex items-center gap-2.5 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={tempItem.enabled !== false}
                  onChange={e => setTempItem({ ...tempItem, enabled: e.target.checked })}
                  className="w-4 h-4 rounded text-[var(--studio-accent)] bg-[var(--studio-input)] border-[var(--studio-border-strong)] cursor-pointer accent-[var(--studio-accent)]"
                />
                <span className="text-sm font-medium text-[var(--studio-text)]">
                  {t('entrySettings.visibleOnWheel')}
                </span>
              </label>

              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={handleDuplicate}>
                  <Copy size={13} />
                  <span>{t('entrySettings.duplicate')}</span>
                </Button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-red-500/15 hover:bg-red-600 text-red-700 dark:text-red-400 hover:text-white border border-red-500/30 text-xs font-semibold transition-colors"
                >
                  <Trash size={13} />
                  <span>{t('entrySettings.delete')}</span>
                </button>
              </div>
            </div>

            {/* Text & Weight */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 flex flex-col">
                <label className="text-sm font-medium text-[var(--studio-text-secondary)]">
                  {t('entrySettings.text')}
                </label>
                <Input
                  type="text"
                  value={tempItem.text}
                  onChange={e => setTempItem({ ...tempItem, text: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-[var(--studio-text-secondary)]">
                    {t('entryItem.weight')}{' '}
                    {weightPercentage > 0 && (
                      <span className="text-xs font-mono tabular-nums text-[var(--studio-accent-fg)] ml-1">
                        ({weightPercentage}% {t('entrySettings.chance')})
                      </span>
                    )}
                  </label>
                </div>
                <div className="flex items-center bg-[var(--studio-input)] border border-[var(--studio-border-strong)] rounded-xl overflow-hidden h-[var(--studio-control-h)]">
                  <button
                    type="button"
                    onClick={() =>
                      setTempItem({
                        ...tempItem,
                        weight: Math.max(0.1, Number(tempItem.weight !== undefined ? tempItem.weight : 1) - 1),
                      })
                    }
                    className="w-10 h-full flex items-center justify-center text-[var(--studio-text-muted)] hover:text-[var(--studio-text)] hover:bg-[var(--studio-card-hover)] transition-colors"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    className="flex-1 bg-transparent text-center text-[var(--studio-text)] font-mono tabular-nums font-medium border-none focus:outline-none focus:ring-0 text-sm"
                    value={tempItem.weight !== undefined ? tempItem.weight : 1}
                    onChange={e =>
                      setTempItem({
                        ...tempItem,
                        weight: Math.max(0.1, parseFloat(e.target.value) || 0.1),
                      })
                    }
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setTempItem({
                        ...tempItem,
                        weight: Number(tempItem.weight !== undefined ? tempItem.weight : 1) + 1,
                      })
                    }
                    className="w-10 h-full flex items-center justify-center text-[var(--studio-text-muted)] hover:text-[var(--studio-text)] hover:bg-[var(--studio-card-hover)] transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Slice Color */}
            <div className="space-y-2.5 bg-[var(--studio-card)] p-4 rounded-xl border border-[var(--studio-border)]">
              <label className="text-sm font-medium text-[var(--studio-text)] block">
                {t('entrySettings.sliceColor', 'Cor da Fatia')}
              </label>
              <div className="flex items-center gap-4">
                <div className="relative w-24 h-10 rounded-lg overflow-hidden border border-[var(--studio-border-strong)] hover:border-[var(--studio-accent)] transition-colors cursor-pointer">
                  <input
                    type="color"
                    className="absolute inset-0 w-full h-[150%] -translate-y-1/4 cursor-pointer"
                    value={tempItem.color || '#cccccc'}
                    onChange={e => setTempItem({ ...tempItem, color: e.target.value })}
                  />
                  {tempItem.color && (
                    <button
                      type="button"
                      onClick={e => {
                        e.preventDefault();
                        e.stopPropagation();
                        setTempItem({ ...tempItem, color: undefined });
                      }}
                      className="absolute top-1 right-1 bg-black/70 text-white p-1 rounded hover:bg-red-600 transition-colors z-20"
                      title={t('entrySettings.removeColor', 'Remover Cor')}
                    >
                      <X size={11} />
                    </button>
                  )}
                </div>
                <span className="text-xs font-mono text-[var(--studio-text-muted)]">
                  {tempItem.color || t('entrySettings.defaultColor', 'Cor padrão')}
                </span>
              </div>
            </div>

            {/* Win Message */}
            <div className="space-y-2 flex flex-col">
              <label className="text-sm font-medium text-[var(--studio-text-secondary)]">
                {t('entrySettings.winMessage')}
              </label>
              <Input
                type="text"
                placeholder={t('entrySettings.winMessagePlh')}
                value={tempItem.message || ''}
                onChange={e => setTempItem({ ...tempItem, message: e.target.value })}
              />
            </div>

            {/* Custom Win Sound */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-[var(--studio-text-secondary)]">
                  {t('entrySettings.customSound')}
                </label>
                {tempItem.sound && (
                  <button
                    type="button"
                    onClick={() => setTempItem({ ...tempItem, sound: undefined })}
                    className="text-xs text-[var(--studio-accent-fg)] hover:underline"
                  >
                    {t('entrySettings.useDefaultSound')}
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {winSoundOptions.map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setTempItem({ ...tempItem, sound: type })}
                    className={`h-9 px-2.5 rounded-lg text-xs font-medium capitalize transition-colors border ${
                      tempItem.sound === type
                        ? 'bg-[var(--studio-accent)] text-[var(--studio-accent-text)] border-[var(--studio-accent)]'
                        : 'bg-[var(--studio-card)] text-[var(--studio-text-muted)] hover:text-[var(--studio-text)] border-[var(--studio-border)]'
                    }`}
                  >
                    {type.replace('-', ' ')}
                  </button>
                ))}
              </div>

              <div className="bg-[var(--studio-card)] rounded-xl border border-[var(--studio-border)] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-[var(--studio-text)]">{t('entrySettings.uploadedAudios')}</p>
                  <Button variant="secondary" size="sm" onClick={() => setIsAddAudioModalOpen(true)}>
                    <Plus size={13} />
                    <span>{t('entrySettings.newAudio')}</span>
                  </Button>
                </div>
                {hasCustomAudio ? (
                  <div className="space-y-2 max-h-[150px] overflow-y-auto custom-scrollbar pr-1">
                    {customWinAudios.map(audio => (
                      <div
                        key={audio.id}
                        className={`flex items-center justify-between p-2 rounded-lg border transition-colors ${
                          tempItem.sound === audio.id
                            ? 'bg-[var(--studio-accent-soft)] border-[var(--studio-accent)]/50'
                            : 'bg-[var(--studio-input)] border-[var(--studio-border)]'
                        }`}
                      >
                        <div
                          className="flex items-center gap-2.5 overflow-hidden flex-1 cursor-pointer"
                          onClick={() => setTempItem({ ...tempItem, sound: audio.id })}
                        >
                          <button
                            type="button"
                            className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                              tempItem.sound === audio.id
                                ? 'bg-[var(--studio-accent)] text-[var(--studio-accent-text)]'
                                : 'bg-[var(--studio-card)] text-[var(--studio-text-secondary)]'
                            }`}
                            onClick={e => {
                              e.stopPropagation();
                              if (audio.audioObj) {
                                audio.audioObj.currentTime = 0;
                                audio.audioObj.play().catch(() => {});
                              }
                            }}
                          >
                            <PlayCircle size={14} />
                          </button>
                          <span className="text-xs truncate text-[var(--studio-text)]">{audio.name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeCustomAudio('win', audio.id)}
                          className="text-[var(--studio-text-muted)] hover:text-red-600 dark:hover:text-red-400 p-1.5 shrink-0 ml-2"
                        >
                          <Trash size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-4 text-[var(--studio-text-muted)] space-y-1">
                    <Music2 size={18} className="opacity-50" />
                    <p className="text-xs">{t('entrySettings.noAudio')}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="px-5 sm:px-6 py-4 border-t border-[var(--studio-border)] flex justify-end gap-3 bg-[var(--studio-surface-elevated)]">
          <Button variant="ghost" onClick={handleCancel}>
            {t('entrySettings.cancel')}
          </Button>
          <Button variant="primary" onClick={handleSave}>
            {t('entrySettings.saveBtn')}
          </Button>
        </div>
      </div>
    </div>
  );
};
