import React, { useState, useMemo, useEffect } from 'react';
import {
  Skull,
  X,
  RotateCcw,
  Search,
  Users,
  Sparkles,
  Swords,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { Button } from '../atoms/Button';

export const GraveyardModal = () => {
  const isGraveyardOpen = useAppStore(s => s.isGraveyardOpen);
  const setIsGraveyardOpen = useAppStore(s => s.setIsGraveyardOpen);
  const eliminatedHistory = useAppStore(s => s.eliminatedHistory);
  const items = useAppStore(s => s.items);
  const reviveItem = useAppStore(s => s.reviveItem);
  const reviveAllItems = useAppStore(s => s.reviveAllItems);
  const soundEnabled = useAppStore(s => s.soundEnabled);

  const [searchQuery, setSearchQuery] = useState('');
  const [justRevivedId, setJustRevivedId] = useState<string | null>(null);

  useEffect(() => {
    if (!isGraveyardOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsGraveyardOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isGraveyardOpen, setIsGraveyardOpen]);

  const survivors = useMemo(() => {
    return items.filter(i => i.enabled && i.text.trim() !== '');
  }, [items]);

  const filteredRecords = useMemo(() => {
    if (!searchQuery.trim()) return eliminatedHistory;
    const q = searchQuery.toLowerCase();
    return eliminatedHistory.filter(r => r.text.toLowerCase().includes(q));
  }, [eliminatedHistory, searchQuery]);

  if (!isGraveyardOpen) return null;

  const handleReviveSingle = (record: typeof eliminatedHistory[0]) => {
    reviveItem(record.itemId);
    setJustRevivedId(record.itemId);
    setTimeout(() => {
      setJustRevivedId(null);
    }, 1500);

    if (soundEnabled) {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(320, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(780, audioCtx.currentTime + 0.25);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
      } catch (_) {}
    }
  };

  const handleReviveAll = () => {
    reviveAllItems();
    if (soundEnabled) {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(260, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.4);
        gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.45);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.45);
      } catch (_) {}
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
      onClick={() => setIsGraveyardOpen(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-4xl max-h-[88vh] bg-[var(--studio-surface)] border border-[var(--studio-border-strong)] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-[var(--studio-text)]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-[var(--studio-border)] flex items-center justify-between gap-4 shrink-0 bg-[var(--studio-surface-elevated)]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center shrink-0">
              <Skull className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-display text-lg font-bold text-[var(--studio-text)] truncate">
                  Cemitério dos Eliminados
                </h2>
                <span className="text-xs font-mono tabular-nums text-red-600 dark:text-red-400 font-semibold">
                  · {eliminatedHistory.length}
                </span>
              </div>
              <p className="text-xs text-[var(--studio-text-muted)] truncate">
                Reviva combatentes individualmente ou restaure todos para a arena.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsGraveyardOpen(false)}
            className="w-9 h-9 rounded-xl bg-[var(--studio-card)] hover:bg-[var(--studio-card-hover)] text-[var(--studio-text-muted)] hover:text-[var(--studio-text)] border border-[var(--studio-border-strong)] flex items-center justify-center transition-colors shrink-0"
            title="Fechar Cemitério"
            aria-label="Fechar Cemitério"
          >
            <X size={18} />
          </button>
        </div>

        {/* Stats Strip */}
        <div className="px-5 sm:px-6 py-3 bg-[var(--studio-input)] border-b border-[var(--studio-border)] grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-[var(--studio-card)] border border-[var(--studio-border)]">
            <Skull className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] text-[var(--studio-text-muted)]">Tombados</p>
              <p className="text-sm font-bold text-red-700 dark:text-red-300 font-mono tabular-nums leading-tight">
                {eliminatedHistory.length}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-[var(--studio-card)] border border-[var(--studio-border)]">
            <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] text-[var(--studio-text-muted)]">Vivos na arena</p>
              <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300 font-mono tabular-nums leading-tight">
                {survivors.length}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-[var(--studio-card)] border border-[var(--studio-border)]">
            <Swords className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] text-[var(--studio-text-muted)]">Situação</p>
              <p className="text-sm font-bold text-amber-700 dark:text-amber-300 leading-tight truncate">
                {survivors.length <= 1 ? 'Concluída' : `${survivors.length} ativos`}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end col-span-2 sm:col-span-1">
            <Button
              variant="success"
              size="sm"
              onClick={handleReviveAll}
              disabled={eliminatedHistory.length === 0}
              className="w-full h-full min-h-[40px]"
            >
              <Sparkles size={14} />
              <span>Ressuscitar Todos</span>
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-5 sm:px-6 py-3 flex items-center gap-2 shrink-0 border-b border-[var(--studio-border)]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[var(--studio-text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar participante eliminado..."
              className="w-full h-10 pl-10 pr-3 rounded-xl bg-[var(--studio-input)] border border-[var(--studio-border-strong)] text-sm text-[var(--studio-text)] placeholder-[var(--studio-text-muted)] focus:outline-none focus:border-[var(--studio-accent)] transition-colors"
            />
          </div>
          {searchQuery && (
            <Button variant="secondary" size="sm" onClick={() => setSearchQuery('')}>
              Limpar
            </Button>
          )}
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 custom-scrollbar min-h-[260px]">
          {filteredRecords.length === 0 ? (
            <div className="h-60 flex flex-col items-center justify-center text-center p-6 rounded-2xl border border-dashed border-[var(--studio-border-strong)] bg-[var(--studio-input)]/60">
              <div className="w-12 h-12 rounded-xl bg-[var(--studio-card)] border border-[var(--studio-border-strong)] flex items-center justify-center mb-3 text-[var(--studio-text-muted)]">
                <Skull className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-[var(--studio-text)]">
                {searchQuery ? 'Nenhum participante encontrado' : 'Nenhum eliminado ainda'}
              </h3>
              <p className="text-xs text-[var(--studio-text-muted)] max-w-sm mt-1">
                {searchQuery
                  ? 'Nenhum participante eliminado corresponde à busca digitada.'
                  : 'Todos os participantes seguem ativos na disputa.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {filteredRecords.map(record => {
                const isRecentlyRevived = justRevivedId === record.itemId;
                const formattedTime = new Date(record.eliminatedAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                });

                return (
                  <div
                    key={record.id}
                    className="bg-[var(--studio-card)] border border-[var(--studio-border)] hover:border-red-500/35 rounded-xl p-4 transition-colors flex flex-col justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 text-xs text-[var(--studio-text-muted)] mb-2">
                        <span className="inline-flex items-center gap-1.5 text-red-600 dark:text-red-400 font-medium font-mono tabular-nums">
                          <Skull size={12} />
                          <span>Rodada {record.round}</span>
                        </span>
                        {record.rank && (
                          <span className="font-mono tabular-nums text-[var(--studio-text-muted)]">
                            #{record.rank}º
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2.5 my-1.5">
                        <span
                          className="w-3 h-3 rounded-full border border-[var(--studio-border-strong)] shrink-0"
                          style={{ backgroundColor: record.color || '#64748b' }}
                        />
                        <h4 className="text-sm font-bold text-[var(--studio-text)] truncate">{record.text}</h4>
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px] text-[var(--studio-text-muted)] font-mono tabular-nums">
                        <Clock className="w-3 h-3 shrink-0" />
                        <span>{formattedTime}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleReviveSingle(record)}
                      disabled={isRecentlyRevived}
                      className={`w-full h-9 flex items-center justify-center gap-1.5 px-3 rounded-lg font-semibold text-xs transition-colors border ${
                        isRecentlyRevived
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
                          : 'bg-[var(--studio-surface-elevated)] hover:bg-emerald-600 text-[var(--studio-text)] hover:text-white border-[var(--studio-border-strong)] hover:border-emerald-500/40'
                      }`}
                    >
                      {isRecentlyRevived ? (
                        <>
                          <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400" />
                          <span>Ressuscitado</span>
                        </>
                      ) : (
                        <>
                          <RotateCcw size={14} className="text-emerald-600 dark:text-emerald-400" />
                          <span>Ressuscitar</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
