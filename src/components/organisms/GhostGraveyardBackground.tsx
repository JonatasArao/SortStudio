import React, { useState } from 'react';
import { Ghost, Skull, RotateCcw, Sparkles, Clock } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

const GHOST_ANCHORS = [
  // Flanco Esquerdo (topo ao rodapé)
  { top: '8%', left: '3%', anim: 'ghostFloatSlow', delay: '0s' },
  { top: '23%', left: '8%', anim: 'ghostFloatMedium', delay: '1.2s' },
  { top: '40%', left: '2%', anim: 'ghostFloatFast', delay: '0.6s' },
  { top: '58%', left: '7%', anim: 'ghostFloatSlow', delay: '2s' },
  { top: '76%', left: '4%', anim: 'ghostFloatMedium', delay: '1.5s' },
  
  // Flanco Direito (evitando top: 42% - 58% na extrema direita onde fica o ponteiro da roleta)
  { top: '8%', right: '3%', anim: 'ghostFloatMedium', delay: '0.8s' },
  { top: '23%', right: '10%', anim: 'ghostFloatSlow', delay: '1.8s' },
  { top: '64%', right: '9%', anim: 'ghostFloatFast', delay: '0.4s' },
  { top: '78%', right: '4%', anim: 'ghostFloatSlow', delay: '2.4s' },

  // Margem Superior (à esquerda e direita do centro)
  { top: '3%', left: '25%', anim: 'ghostFloatFast', delay: '1.1s' },
  { top: '3%', right: '25%', anim: 'ghostFloatMedium', delay: '2.1s' },

  // Margem Inferior (à esquerda e direita do centro)
  { bottom: '3%', left: '26%', anim: 'ghostFloatSlow', delay: '1.4s' },
  { bottom: '3%', right: '26%', anim: 'ghostFloatFast', delay: '0.9s' },

  // Flancos Intermediários para batalhas com muitos eliminados
  { top: '15%', left: '16%', anim: 'ghostFloatSlow', delay: '2.7s' },
  { top: '15%', right: '16%', anim: 'ghostFloatMedium', delay: '1.7s' },
  { bottom: '15%', left: '16%', anim: 'ghostFloatFast', delay: '0.5s' },
  { bottom: '15%', right: '16%', anim: 'ghostFloatSlow', delay: '2.2s' },
];

export const GhostGraveyardBackground: React.FC = () => {
  const eliminationMode = useAppStore(s => s.eliminationMode);
  const wheelType = useAppStore(s => s.wheelType);
  const eliminatedHistory = useAppStore(s => s.eliminatedHistory);
  const reviveItem = useAppStore(s => s.reviveItem);
  const soundEnabled = useAppStore(s => s.soundEnabled);

  const [hoveredGhostId, setHoveredGhostId] = useState<string | null>(null);
  const [justRevivedId, setJustRevivedId] = useState<string | null>(null);

  // Apenas renderiza quando o Modo Eliminação estiver ativo e na Roleta Padrão (classic)
  if (!eliminationMode || wheelType !== 'classic' || eliminatedHistory.length === 0) {
    return null;
  }

  const handleRevive = (itemId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    reviveItem(itemId);
    setJustRevivedId(itemId);
    setTimeout(() => setJustRevivedId(null), 1200);

    if (soundEnabled) {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(350, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(840, audioCtx.currentTime + 0.25);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
      } catch (err) {}
    }
  };

  return (
    <div 
      aria-hidden="true" 
      className="absolute inset-0 pointer-events-none z-15 overflow-hidden select-none"
    >
      {/* Névoa Espectral Ambiente Suave */}
      <div className="absolute inset-0 bg-radial from-transparent via-purple-950/5 to-slate-950/20 pointer-events-none" />

      {/* Fantasmas Flutuantes dos Participantes Eliminados */}
      {eliminatedHistory.map((record, index) => {
        const anchor = GHOST_ANCHORS[index % GHOST_ANCHORS.length];
        const isHovered = hoveredGhostId === record.id;
        const isRevived = justRevivedId === record.itemId;
        const color = record.color || '#94a3b8';
        const formattedTime = new Date(record.eliminatedAt).toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit' 
        });

        // Estilo de posição com base na âncora
        const positionStyle: React.CSSProperties = {
          position: 'absolute',
          top: anchor.top,
          bottom: anchor.bottom,
          left: anchor.left,
          right: anchor.right,
          animation: `${anchor.anim} ${5 + (index % 4)}s ease-in-out infinite`,
          animationDelay: anchor.delay,
        };

        return (
          <div
            key={record.id}
            style={positionStyle}
            onMouseEnter={() => setHoveredGhostId(record.id)}
            onMouseLeave={() => setHoveredGhostId(null)}
            className={`pointer-events-auto transition-all duration-300 ease-out flex flex-col items-center ${
              isHovered ? 'z-50 scale-110 opacity-100' : 'z-10 opacity-45 hover:opacity-90'
            }`}
          >
            {/* Cápsula Espectral do Fantasma */}
            <div 
              className={`relative flex items-center gap-1.5 sm:gap-2 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full backdrop-blur-xs border transition-all duration-300 shadow-lg cursor-pointer ${
                isHovered
                  ? 'bg-slate-900/90 border-red-500/60 shadow-[0_0_20px_rgba(239,68,68,0.4)]'
                  : 'bg-slate-950/60 border-slate-800/80 shadow-[0_0_12px_rgba(0,0,0,0.6)]'
              }`}
              style={{
                boxShadow: isHovered 
                  ? `0 0 25px ${color}60, inset 0 0 10px ${color}30` 
                  : `0 0 12px ${color}30`
              }}
            >
              {/* Efeito Halo / Alma Pulsante */}
              <div 
                className="absolute inset-0 rounded-full blur-md opacity-30 animate-pulse pointer-events-none"
                style={{ backgroundColor: color }}
              />

              {/* Ícone de Fantasma / Espírito */}
              <div 
                className="relative flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full border border-white/20 shadow-inner shrink-0"
                style={{ backgroundColor: `${color}30` }}
              >
                <Ghost 
                  size={13} 
                  className="text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.8)] animate-[pulse_2s_ease-in-out_infinite]" 
                />
              </div>

              {/* Nome do Participante Fantasma */}
              <div className="flex items-center gap-1.5 min-w-0 max-w-[90px] sm:max-w-[130px]">
                <span className="text-[11px] sm:text-xs font-bold text-slate-100 truncate drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
                  {record.text}
                </span>
              </div>

              {/* Tag da Rodada */}
              <span className="text-[9px] sm:text-[10px] font-mono font-black text-red-400 bg-red-950/70 border border-red-500/30 px-1.5 py-0.2 rounded-md shrink-0 flex items-center gap-0.5">
                <Skull size={9} className="text-red-400 shrink-0" />
                <span>R{record.round}</span>
              </span>
            </div>

            {/* Tooltip Detalhado ao Passar o Mouse */}
            {isHovered && (
              <div className="absolute top-full mt-1.5 w-48 p-2.5 bg-slate-950/95 border border-red-500/40 rounded-xl shadow-2xl backdrop-blur-md flex flex-col gap-1.5 animate-in fade-in zoom-in-95 duration-150 z-50 text-left">
                <div className="flex items-center justify-between border-b border-slate-800 pb-1">
                  <span className="text-[10px] font-black uppercase text-red-400 flex items-center gap-1">
                    <Skull size={10} /> Eliminado
                  </span>
                  <span className="text-[9px] font-mono text-slate-400">
                    Rodada {record.round}
                  </span>
                </div>

                <div className="flex items-center gap-1 text-[10px] text-slate-300">
                  <Clock size={10} className="text-slate-500" />
                  <span>Caiu às {formattedTime}</span>
                </div>

                {record.rank && (
                  <div className="text-[10px] text-slate-400">
                    Colocação: <strong className="text-amber-300">#{record.rank}º Lugar</strong>
                  </div>
                )}

                {/* Botão de Ressuscitar Rápido */}
                <button
                  type="button"
                  onClick={(e) => handleRevive(record.itemId, e)}
                  disabled={isRevived}
                  className="mt-1 w-full flex items-center justify-center gap-1 py-1 px-2 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/40 text-emerald-300 hover:text-white text-[10px] font-bold transition-all active:scale-95"
                >
                  <RotateCcw size={10} className={isRevived ? 'animate-spin' : ''} />
                  <span>{isRevived ? 'Ressuscitado!' : 'Ressuscitar'}</span>
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
