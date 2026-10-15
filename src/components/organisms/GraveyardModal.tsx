import React, { useState, useMemo } from 'react';
import { 
  Skull, 
  X, 
  RotateCcw, 
  Search, 
  Flame, 
  ShieldAlert, 
  Users, 
  Sparkles, 
  Swords, 
  CheckCircle2,
  Clock
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store/useAppStore';

export const GraveyardModal = () => {
  const { t } = useTranslation();
  const isGraveyardOpen = useAppStore(s => s.isGraveyardOpen);
  const setIsGraveyardOpen = useAppStore(s => s.setIsGraveyardOpen);
  const eliminatedHistory = useAppStore(s => s.eliminatedHistory);
  const items = useAppStore(s => s.items);
  const reviveItem = useAppStore(s => s.reviveItem);
  const reviveAllItems = useAppStore(s => s.reviveAllItems);
  const soundEnabled = useAppStore(s => s.soundEnabled);

  const [searchQuery, setSearchQuery] = useState('');
  const [justRevivedId, setJustRevivedId] = useState<string | null>(null);

  // Survivors currently active
  const survivors = useMemo(() => {
    return items.filter(i => i.enabled && i.text.trim() !== "");
  }, [items]);

  // Filtered eliminated records
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

    // Audio cue if sound is enabled
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
      } catch (e) {
        // audio context fallback
      }
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
      } catch (e) {
        // audio fallback
      }
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={() => setIsGraveyardOpen(false)}
    >
      <div 
        className="relative w-full max-w-4xl max-h-[90vh] bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border-2 border-red-500/40 rounded-3xl shadow-[0_0_80px_rgba(239,68,68,0.25)] flex flex-col overflow-hidden text-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle Eerie Flame Glow Top Aura */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-28 bg-red-600/15 blur-3xl pointer-events-none rounded-full" />
        <div className="absolute -top-12 right-12 w-48 h-48 bg-purple-600/10 blur-3xl pointer-events-none rounded-full" />

        {/* Crypt Header */}
        <div className="relative px-5 sm:px-8 pt-6 pb-4 border-b border-slate-800 flex items-start justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-950 to-slate-900 border border-red-500/50 flex items-center justify-center shadow-[0_0_20px_rgba(239,68,68,0.35)] shrink-0">
              <Skull className="w-6 h-6 text-red-400 drop-shadow animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase flex items-center gap-2">
                  <span>Cemitério dos Eliminados</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-red-950 text-red-400 border border-red-500/40 font-mono font-bold">
                    {eliminatedHistory.length}
                  </span>
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Cripta dos guerreiros que tombaram na batalha. Reviva combatentes individualmente ou ressuscite todos.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsGraveyardOpen(false)}
            className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors shrink-0"
            title="Fechar Cemitério"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Battle Stats Bar */}
        <div className="px-5 sm:px-8 py-3 bg-slate-950/60 border-b border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 shrink-0">
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-900/80 border border-slate-800">
            <Skull className="w-4 h-4 text-red-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Tombados</p>
              <p className="text-sm sm:text-base font-black text-red-300 font-mono leading-none mt-0.5">
                {eliminatedHistory.length}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-900/80 border border-slate-800">
            <Users className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Vivos na Arena</p>
              <p className="text-sm sm:text-base font-black text-emerald-300 font-mono leading-none mt-0.5">
                {survivors.length}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-900/80 border border-slate-800">
            <Swords className="w-4 h-4 text-amber-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Status Geral</p>
              <p className="text-sm sm:text-base font-black text-amber-300 font-mono leading-none mt-0.5 truncate">
                {survivors.length <= 1 ? 'Batalha Concluída' : `${survivors.length} em combate`}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end col-span-2 sm:col-span-1">
            <button
              onClick={handleReviveAll}
              disabled={eliminatedHistory.length === 0}
              className="w-full sm:w-auto h-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs shadow-md shadow-emerald-950/40 transition-all active:scale-95 border border-emerald-400/40"
              title="Ressuscitar todos os guerreiros caídos de volta para a roleta"
            >
              <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-spin" />
              <span>Ressuscitar Todos</span>
            </button>
          </div>
        </div>

        {/* Search Filter Bar */}
        <div className="px-5 sm:px-8 py-3 flex items-center gap-3 shrink-0">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar guerreiro tombado pelo nome..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500/50 transition-colors"
            />
          </div>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="px-2.5 py-2 text-xs text-slate-400 hover:text-white rounded-lg bg-slate-900 border border-slate-800"
            >
              Limpar
            </button>
          )}
        </div>

        {/* Tombstone Grid (Lápides dos Caídos) */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-8 pb-6 custom-scrollbar min-h-[280px]">
          {filteredRecords.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 rounded-2xl border border-dashed border-slate-800 bg-slate-950/40">
              <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-3 text-slate-500">
                <Skull className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-300">
                {searchQuery ? 'Nenhum guerreiro encontrado' : 'A Cripta está Vazia'}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                {searchQuery 
                  ? 'Nenhum participante eliminado corresponde à busca digitada.' 
                  : 'Nenhum guerreiro tombou até o momento. Todos continuam sobrevivendo na arena da roleta!'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
              {filteredRecords.map((record) => {
                const isRecentlyRevived = justRevivedId === record.itemId;
                const formattedTime = new Date(record.eliminatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

                return (
                  <div
                    key={record.id}
                    className="relative bg-gradient-to-b from-slate-900/90 to-slate-950 border border-slate-800 hover:border-red-500/40 rounded-2xl p-4 shadow-lg transition-all duration-200 group flex flex-col justify-between overflow-hidden"
                  >
                    {/* Gravestone Cut Top Outline */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-red-500/30 to-transparent opacity-40 group-hover:opacity-100 transition-opacity" />

                    <div>
                      {/* Lápide Header */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-red-950/80 border border-red-500/30 text-red-300 text-[10px] font-bold uppercase tracking-wider">
                          <span>🪦 Rodada {record.round}</span>
                        </div>
                        {record.rank && (
                          <span className="text-[10px] font-mono text-slate-400 font-semibold">
                            #{record.rank}º Lugar
                          </span>
                        )}
                      </div>

                      {/* Participant Name & Color */}
                      <div className="flex items-center gap-2.5 my-2">
                        {record.color ? (
                          <span 
                            className="w-3.5 h-3.5 rounded-full border border-white/30 shrink-0 shadow-sm"
                            style={{ backgroundColor: record.color }}
                          />
                        ) : (
                          <span className="w-3.5 h-3.5 rounded-full bg-slate-700 shrink-0" />
                        )}
                        <h4 className="text-base font-extrabold text-white truncate drop-shadow-sm group-hover:text-red-200 transition-colors">
                          {record.text}
                        </h4>
                      </div>

                      {/* Timestamp & Epitaph */}
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-1 mb-4 font-mono">
                        <Clock className="w-3 h-3 text-slate-500 shrink-0" />
                        <span>Tombou às {formattedTime}</span>
                      </div>
                    </div>

                    {/* Revive Button */}
                    <button
                      onClick={() => handleReviveSingle(record)}
                      disabled={isRecentlyRevived}
                      className={`w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl font-bold text-xs transition-all active:scale-95 border ${
                        isRecentlyRevived
                          ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300'
                          : 'bg-slate-800/90 hover:bg-emerald-600/90 text-slate-200 hover:text-white border-slate-700/80 hover:border-emerald-500/60'
                      }`}
                      title={`Ressuscitar ${record.text} de volta para a roleta`}
                    >
                      {isRecentlyRevived ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Ressuscitado!</span>
                        </>
                      ) : (
                        <>
                          <RotateCcw className="w-3.5 h-3.5 text-emerald-400 group-hover:rotate-180 transition-transform duration-300" />
                          <span>Ressuscitar Guerreiro</span>
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
