import React, { useRef, useState, useMemo } from 'react';
import { 
  X,
  Trophy, 
  Crown, 
  Download, 
  Copy, 
  Check, 
  Calendar, 
  Users, 
  Sparkles,
  Award,
  Palette,
  Eye,
  EyeOff,
  Columns,
  Maximize2
} from 'lucide-react';
import { toPng, toJpeg, toBlob } from 'html-to-image';
import { Season, Item, Result } from '../../types';
import { getParticipantStats, compareParticipantsByWins, ParticipantStat } from '../../utils/statsUtils';

interface SeasonPosterModalProps {
  isOpen: boolean;
  onClose: () => void;
  season: Season | null;
  allSeasons: Season[];
  results: Result[];
  items: Item[];
  appTitle: string;
}

type PosterTheme = 'studio_dark' | 'gold_championship' | 'cyber_neon';
type DisplayFilter = 'top5' | 'top10' | 'top20' | 'top30' | 'top50' | 'only_winners' | 'all';
type ColumnLayout = 'auto' | '1' | '2';

interface ThemeConfig {
  containerBg: string;
  borderColor: string;
  accentColor: string;
  accentBg: string;
  accentBorder: string;
  headerGradient: string;
  badgeBg: string;
  leaderCard: string;
  badgeText: string;
}

interface PosterContentProps {
  appTitle: string;
  seasonName: string;
  isFinished: boolean;
  dateRangeText: string;
  themeConfig: ThemeConfig;
  totalWins: number;
  winnersStats: ParticipantStat[];
  stats: ParticipantStat[];
  first: ParticipantStat | null;
  second: ParticipantStat | null;
  third: ParticipantStat | null;
  displayedList: ParticipantStat[];
  useTwoColumns: boolean;
}

const PosterContent: React.FC<PosterContentProps> = ({
  appTitle,
  seasonName,
  isFinished,
  dateRangeText,
  themeConfig,
  totalWins,
  winnersStats,
  stats,
  first,
  second,
  third,
  displayedList,
  useTwoColumns,
}) => {
  // Split into 2 columns if requested
  const mid = Math.ceil(displayedList.length / 2);
  const col1 = useTwoColumns ? displayedList.slice(0, mid) : displayedList;
  const col2 = useTwoColumns ? displayedList.slice(mid) : [];

  const renderRankingTable = (list: ParticipantStat[], startIndex: number) => {
    return (
      <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl overflow-hidden shadow-inner flex flex-col">
        <div className="flex items-center justify-between bg-slate-900/90 py-2.5 px-4 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-800">
          <div className="w-12">Pos</div>
          <div className="flex-1 px-2">Participante / Opção</div>
          <div className="text-right w-16">Sorteios</div>
        </div>

        <div className="divide-y divide-slate-800/50">
          {list.length === 0 ? (
            <div className="py-4 text-center text-xs text-slate-500">Sem participantes nesta coluna</div>
          ) : (
            list.map((st, i) => {
              const globalIndex = startIndex + i;
              const isWinner = st.winsCount > 0;
              const isFirst = globalIndex === 0 && isWinner;
              const isSecond = globalIndex === 1 && isWinner;
              const isThird = globalIndex === 2 && isWinner;

              return (
                <div
                  key={st.name}
                  className={`flex items-center justify-between py-2.5 px-4 text-xs transition-colors ${
                    isFirst ? 'bg-amber-500/10 font-semibold' : ''
                  }`}
                >
                  <div className="w-12 flex items-center gap-1.5 shrink-0">
                    <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black font-mono shrink-0 ${
                      isFirst ? 'bg-amber-500 text-slate-950' :
                      isSecond ? 'bg-slate-300 text-slate-950' :
                      isThird ? 'bg-amber-700 text-amber-100' :
                      'bg-slate-800 text-slate-400'
                    }`}>
                      {globalIndex + 1}
                    </span>
                  </div>

                  <div className="flex-1 px-2 truncate min-w-0">
                    <span className={`truncate block ${isFirst ? 'text-amber-200 font-bold' : isWinner ? 'text-slate-100 font-medium' : 'text-slate-400'}`}>
                      {st.name}
                    </span>
                  </div>

                  <div className="w-16 text-right font-mono font-bold shrink-0">
                    <span className={isWinner ? 'text-amber-400 text-sm' : 'text-slate-600'}>
                      {st.winsCount}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      className={`w-full ${themeConfig.containerBg} border ${themeConfig.borderColor} rounded-3xl p-7 text-white relative shadow-2xl font-sans select-none box-border`}
    >
      {/* Background Ambient Lighting & Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[520px] h-[240px] bg-gradient-to-b from-amber-500/10 via-orange-500/5 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -right-20 w-72 h-72 bg-red-600/10 blur-3xl pointer-events-none" />
      <div className="absolute -top-10 -left-10 w-72 h-72 bg-blue-600/10 blur-3xl pointer-events-none" />

      {/* Top Header Ribbon */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-4 mb-6 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20 border border-amber-400/40 shrink-0">
            <Trophy size={22} className="text-slate-950 fill-slate-950" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block leading-tight">
              {appTitle.toUpperCase()}
            </span>
            <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
              <Sparkles size={11} /> RESULTADOS OFICIAIS
            </span>
          </div>
        </div>

        <div className="text-right">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider border shadow-sm bg-slate-900/90 border-slate-700 text-slate-200">
            <Calendar size={12} className="text-amber-400" />
            <span>{seasonName}</span>
            {isFinished && <span className="text-red-400 ml-1">• Finalizada</span>}
          </div>
          <p className="text-[10px] text-slate-400 mt-1 font-mono">{dateRangeText}</p>
        </div>
      </div>

      {/* Poster Main Banner & Title */}
      <div className="text-center mb-6 relative z-10">
        <h1 className={`text-3xl sm:text-4xl font-black uppercase tracking-tight bg-gradient-to-r ${themeConfig.headerGradient} bg-clip-text text-transparent drop-shadow-sm`}>
          RESULTADO DA TEMPORADA
        </h1>
        <p className="text-xs font-medium text-slate-400 mt-1 uppercase tracking-widest">
          Quadro de Honra e Ranking de Participantes Sorteados
        </p>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-3 gap-3 mb-6 relative z-10">
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3.5 text-center shadow-inner">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Sorteios Realizados</span>
          <span className="text-2xl font-black text-white font-mono mt-0.5 block">{totalWins}</span>
        </div>
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3.5 text-center shadow-inner">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Participantes Sorteados</span>
          <span className="text-2xl font-black text-amber-400 font-mono mt-0.5 block">{winnersStats.length}</span>
        </div>
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3.5 text-center shadow-inner">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total de Participantes</span>
          <span className="text-2xl font-black text-slate-200 font-mono mt-0.5 block">{stats.length}</span>
        </div>
      </div>

      {/* Podium Highlights (1st, 2nd, 3rd) */}
      {first && first.winsCount > 0 ? (
        <div className="mb-6 relative z-10">
          {/* 1st Place - Champion Banner */}
          <div className={`${themeConfig.leaderCard} rounded-2xl p-4 sm:p-5 border relative overflow-hidden mb-3.5`}>
            <div className="absolute top-0 right-0 w-44 h-44 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <div className="relative shrink-0">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-600 flex items-center justify-center text-slate-950 font-black text-2xl shadow-xl shadow-amber-500/30 border border-amber-300">
                    1º
                  </div>
                  <Crown size={22} className="text-amber-300 fill-amber-300 absolute -top-3.5 -right-2 drop-shadow-md" />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-400/20 text-amber-300 border border-amber-400/30">
                      {isFinished ? '🏆 MAIS SORTEADO DA TEMPORADA' : '⭐ LÍDER DE SORTEIOS'}
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1 truncate">
                    {first.name}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {first.lastWinTimestamp ? `Último sorteio: ${new Date(first.lastWinTimestamp).toLocaleDateString('pt-BR')}` : 'Contemplado na temporada'}
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-3xl font-black text-amber-300 font-mono block leading-none">
                  {first.winsCount}
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest text-amber-400/80">
                  {first.winsCount === 1 ? 'Sorteio' : 'Sorteios'}
                </span>
              </div>
            </div>
          </div>

          {/* 2nd and 3rd Place Mini-Cards */}
          {(second || third) && (
            <div className="grid grid-cols-2 gap-3">
              {second && (
                <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-200 text-sm shrink-0">
                      2º
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block leading-tight">2º Mais Sorteado</span>
                      <span className="text-sm font-bold text-white truncate block">{second.name}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-lg font-black text-slate-200 font-mono leading-none block">{second.winsCount}</span>
                    <span className="text-[9px] uppercase font-semibold text-slate-400">sorteios</span>
                  </div>
                </div>
              )}

              {third && (
                <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-amber-950/40 border border-amber-800/40 flex items-center justify-center font-bold text-amber-400 text-sm shrink-0">
                      3º
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold uppercase text-amber-400/80 block leading-tight">3º Mais Sorteado</span>
                      <span className="text-sm font-bold text-white truncate block">{third.name}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-lg font-black text-amber-400 font-mono leading-none block">{third.winsCount}</span>
                    <span className="text-[9px] uppercase font-semibold text-amber-500/80">sorteios</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-slate-950/50 border border-slate-800/80 rounded-2xl p-7 text-center mb-6 relative z-10">
          <Trophy size={32} className="text-slate-600 mx-auto mb-2 opacity-50" />
          <p className="text-sm text-slate-300 font-medium">Nenhum resultado registrado nesta temporada ainda.</p>
          <span className="text-xs text-slate-500">Gire a roleta de sorteios para registrar os primeiros participantes sorteados no quadro de honra.</span>
        </div>
      )}

      {/* Full Classification Table */}
      <div className="relative z-10 mb-6">
        <div className="flex items-center justify-between mb-2.5 px-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Award size={13} className="text-amber-400" /> Ranking de Participantes
          </span>
          <span className="text-[11px] font-mono text-slate-400">
            Exibindo {displayedList.length} de {stats.length} participantes
          </span>
        </div>

        {useTwoColumns ? (
          <div className="grid grid-cols-2 gap-3.5 items-start">
            <div>{renderRankingTable(col1, 0)}</div>
            <div>{renderRankingTable(col2, mid)}</div>
          </div>
        ) : (
          renderRankingTable(col1, 0)
        )}
      </div>

      {/* Official Bottom Seal / Footer */}
      <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400 relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>Documento Oficial • SortStudio Roleta & Sorteios</span>
        </div>
        <div className="font-mono text-slate-500">
          Gerado em {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
};

export const SeasonPosterModal: React.FC<SeasonPosterModalProps> = ({
  isOpen,
  onClose,
  season,
  allSeasons,
  results,
  items,
  appTitle
}) => {
  const exportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [posterTheme, setPosterTheme] = useState<PosterTheme>('studio_dark');
  const [displayFilter, setDisplayFilter] = useState<DisplayFilter>('top10');
  const [columnsMode, setColumnsMode] = useState<ColumnLayout>('auto');
  const [format, setFormat] = useState<'png' | 'jpeg'>('png');
  const [showPreview, setShowPreview] = useState(true);

  // Scoped stats anchored to season end date if finished
  const stats = useMemo(() => {
    return getParticipantStats(items, results, season?.endDate)
      .sort(compareParticipantsByWins);
  }, [items, results, season]);

  const winnersStats = useMemo(() => stats.filter(s => s.winsCount > 0), [stats]);
  const first = winnersStats[0] || null;
  const second = winnersStats[1] || null;
  const third = winnersStats[2] || null;

  const totalWins = useMemo(() => {
    return results.filter(r => r.type === 'winner' || r.type === 'grand_winner' || !r.type).length;
  }, [results]);

  const displayedList = useMemo(() => {
    switch (displayFilter) {
      case 'top5':
        return stats.slice(0, 5);
      case 'top10':
        return stats.slice(0, 10);
      case 'top20':
        return stats.slice(0, 20);
      case 'top30':
        return stats.slice(0, 30);
      case 'top50':
        return stats.slice(0, 50);
      case 'only_winners':
        return stats.filter(s => s.winsCount > 0);
      case 'all':
      default:
        return stats;
    }
  }, [stats, displayFilter]);

  const useTwoColumns = useMemo(() => {
    if (columnsMode === '1') return false;
    if (columnsMode === '2') return true;
    return displayedList.length > 12;
  }, [columnsMode, displayedList.length]);

  const seasonName = season ? season.name : 'Resultados Gerais';
  const isFinished = season ? !!season.endDate && season.endDate <= Date.now() : false;

  const dateRangeText = useMemo(() => {
    if (!season) return 'Histórico Consolidado';
    const startStr = new Date(season.startDate).toLocaleDateString('pt-BR');
    if (season.endDate) {
      const endStr = new Date(season.endDate).toLocaleDateString('pt-BR');
      return `${startStr} até ${endStr}`;
    }
    return `Início em ${startStr} • Em andamento`;
  }, [season]);

  const prepareCapture = async (): Promise<{ target: HTMLDivElement; width: number; height: number; options: any } | null> => {
    const target = exportRef.current;
    if (!target) return null;

    if (document.fonts) {
      await document.fonts.ready;
    }
    await new Promise(r => setTimeout(r, 120));

    const targetWidth = 760;
    // Calculate total height accurately to avoid any cutting off
    const computedHeight = Math.ceil(Math.max(
      target.scrollHeight,
      target.offsetHeight,
      target.getBoundingClientRect().height,
      820
    ));

    const captureOptions = {
      quality: 0.98,
      pixelRatio: 2,
      cacheBust: true,
      width: targetWidth,
      height: computedHeight,
      style: {
        transform: 'none',
        margin: '0',
        top: '0',
        left: '0',
        position: 'static',
        width: `${targetWidth}px`,
        height: `${computedHeight}px`,
        maxHeight: 'none',
        overflow: 'visible',
      }
    };

    return { target, width: targetWidth, height: computedHeight, options: captureOptions };
  };

  const handleDownload = async () => {
    setIsExporting(true);
    try {
      const prep = await prepareCapture();
      if (!prep) return;

      const fn = format === 'png' ? toPng : toJpeg;
      const dataUrl = await fn(prep.target, prep.options);

      const link = document.createElement('a');
      const cleanName = seasonName.toLowerCase().replace(/[^a-z0-9]/gi, '_');
      link.download = `poster_${cleanName}_${Date.now()}.${format}`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Erro ao exportar pôster:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopy = async () => {
    setIsExporting(true);
    try {
      const prep = await prepareCapture();
      if (!prep) return;

      const blob = await toBlob(prep.target, prep.options);
      if (blob && navigator.clipboard && navigator.clipboard.write) {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch (err) {
      console.error('Erro ao copiar imagem:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // Theme-specific styles
  const themeConfig: ThemeConfig = useMemo(() => {
    switch (posterTheme) {
      case 'gold_championship':
        return {
          containerBg: 'bg-gradient-to-b from-[#18140c] via-[#0d0d0f] to-[#141007]',
          borderColor: 'border-amber-500/40',
          accentColor: 'text-amber-400',
          accentBg: 'bg-amber-500/15',
          accentBorder: 'border-amber-500/30',
          headerGradient: 'from-amber-200 via-amber-400 to-yellow-500',
          badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
          leaderCard: 'bg-gradient-to-br from-amber-950/40 via-slate-900/90 to-amber-900/20 border-amber-500/50 shadow-[0_0_30px_rgba(245,158,11,0.15)]',
          badgeText: 'text-amber-400'
        };
      case 'cyber_neon':
        return {
          containerBg: 'bg-gradient-to-b from-[#090b14] via-[#05060b] to-[#080512]',
          borderColor: 'border-cyan-500/40',
          accentColor: 'text-cyan-400',
          accentBg: 'bg-cyan-500/15',
          accentBorder: 'border-cyan-500/30',
          headerGradient: 'from-cyan-300 via-teal-300 to-fuchsia-400',
          badgeBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
          leaderCard: 'bg-gradient-to-br from-cyan-950/40 via-slate-900/90 to-fuchsia-950/20 border-cyan-500/50 shadow-[0_0_30px_rgba(6,182,212,0.15)]',
          badgeText: 'text-cyan-400'
        };
      case 'studio_dark':
      default:
        return {
          containerBg: 'bg-gradient-to-b from-[#0c0e14] via-[#0a0a0f] to-[#120e0e]',
          borderColor: 'border-amber-500/30',
          accentColor: 'text-amber-400',
          accentBg: 'bg-amber-500/15',
          accentBorder: 'border-amber-500/30',
          headerGradient: 'from-amber-300 via-orange-400 to-yellow-500',
          badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
          leaderCard: 'bg-gradient-to-br from-slate-900/95 via-amber-950/20 to-slate-900/95 border-amber-500/40 shadow-[0_0_30px_rgba(245,158,11,0.12)]',
          badgeText: 'text-amber-400'
        };
    }
  }, [posterTheme]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[220] flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800/80 flex items-center justify-between shrink-0 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white">
              <Download size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                Exportar Pôster da Temporada
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {seasonName}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Gere a imagem de classificação oficial completa em alta resolução (sem cortes).
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/60 rounded-xl transition-colors"
            title="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar flex-1 flex flex-col gap-6">
          {/* Options Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-950/50 p-3 sm:p-4 rounded-2xl border border-slate-800/80">
            {/* Theme Selector */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Palette size={13} className="text-amber-400" /> Estilo Visual
              </label>
              <select
                value={posterTheme}
                onChange={(e) => setPosterTheme(e.target.value as PosterTheme)}
                className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="studio_dark">🎲 Studio Dark</option>
                <option value="gold_championship">🏆 Gala Dourada</option>
                <option value="cyber_neon">⚡ Cyber Neon</option>
              </select>
            </div>

            {/* Classification Scope */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Users size={13} className="text-emerald-400" /> Participantes
              </label>
              <select
                value={displayFilter}
                onChange={(e) => setDisplayFilter(e.target.value as DisplayFilter)}
                className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="top5">Top 5 Melhores</option>
                <option value="top10">Top 10 Melhores</option>
                <option value="top20">Top 20 Melhores</option>
                <option value="top30">Top 30 Melhores</option>
                <option value="top50">Top 50 Melhores</option>
                <option value="only_winners">Apenas Sorteados ({winnersStats.length})</option>
                <option value="all">Todos os Participantes ({stats.length})</option>
              </select>
            </div>

            {/* Column Layout */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Columns size={13} className="text-purple-400" /> Organização
              </label>
              <select
                value={columnsMode}
                onChange={(e) => setColumnsMode(e.target.value as ColumnLayout)}
                className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="auto">Automático ({displayedList.length > 12 ? '2 Colunas' : '1 Coluna'})</option>
                <option value="1">1 Coluna</option>
                <option value="2">2 Colunas (Lado a lado)</option>
              </select>
            </div>

            {/* Format Selection */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Sparkles size={13} className="text-cyan-400" /> Formato
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormat('png')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                    format === 'png'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                      : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
                  }`}
                >
                  PNG (2x Nítido)
                </button>
                <button
                  type="button"
                  onClick={() => setFormat('jpeg')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                    format === 'jpeg'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                      : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
                  }`}
                >
                  JPG
                </button>
              </div>
            </div>
          </div>

          {/* Toggle Preview Button */}
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Eye size={14} className="text-amber-400" /> Pré-visualização do Pôster
            </span>
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
            >
              {showPreview ? <EyeOff size={13} /> : <Eye size={13} />}
              <span>{showPreview ? 'Ocultar Prévia' : 'Mostrar Prévia'}</span>
            </button>
          </div>

          {/* INTERACTIVE PREVIEW IN MODAL */}
          {showPreview && (
            <div className="w-full flex justify-center py-2 overflow-x-auto">
              <div className="w-full max-w-[760px] shrink-0">
                <PosterContent
                  appTitle={appTitle}
                  seasonName={seasonName}
                  isFinished={isFinished}
                  dateRangeText={dateRangeText}
                  themeConfig={themeConfig}
                  totalWins={totalWins}
                  winnersStats={winnersStats}
                  stats={stats}
                  first={first}
                  second={second}
                  third={third}
                  displayedList={displayedList}
                  useTwoColumns={useTwoColumns}
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-800/80 bg-slate-950/60 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-all"
          >
            Fechar
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleCopy}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-semibold transition-all active:scale-95 disabled:opacity-50"
            >
              {copied ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
              <span>{copied ? 'Copiado!' : 'Copiar Imagem'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              disabled={isExporting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-50"
            >
              <Download size={16} />
              <span>{isExporting ? 'Gerando Imagem...' : `Baixar Pôster (${format.toUpperCase()})`}</span>
            </button>
          </div>
        </div>
      </div>

      {/* DEDICATED OFFSCREEN CAPTURE ELEMENT (Always mounted, unconstrained, zero scroll offset) */}
      <div
        style={{
          position: 'fixed',
          left: '-9999px',
          top: 0,
          width: '760px',
          zIndex: -9999,
          pointerEvents: 'none',
          opacity: 1,
          overflow: 'visible',
        }}
        aria-hidden="true"
      >
        <div
          ref={exportRef}
          style={{
            width: '760px',
            minHeight: '820px',
            height: 'auto',
            overflow: 'visible',
          }}
        >
          <PosterContent
            appTitle={appTitle}
            seasonName={seasonName}
            isFinished={isFinished}
            dateRangeText={dateRangeText}
            themeConfig={themeConfig}
            totalWins={totalWins}
            winnersStats={winnersStats}
            stats={stats}
            first={first}
            second={second}
            third={third}
            displayedList={displayedList}
            useTwoColumns={useTwoColumns}
          />
        </div>
      </div>
    </div>
  );
};

