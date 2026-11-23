import React, { useState, useMemo, useEffect } from 'react';
import { 
  FlaskConical, 
  Play, 
  RotateCcw, 
  Copy, 
  Check, 
  Download, 
  Search, 
  SlidersHorizontal, 
  Zap, 
  Crown, 
  Flame, 
  BarChart3, 
  ListOrdered, 
  ChevronDown, 
  Calendar, 
  History, 
  FileJson,
  Sparkles,
  ArrowUpDown
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store/useAppStore';
import { filterResultsByScope, getCurrentSeason } from '../../utils/seasonUtils';
import { 
  runTestSimulation, 
  TestSimulationConfig, 
  TestSimulationReport,
  compareTestParticipantsByTotalWins,
  compareTestParticipantsBySimulatedWins,
  compareTestParticipantsByPriorWins
} from '../../utils/testSimulationUtils';

export const TestDisplay: React.FC = () => {
  const { t } = useTranslation();

  const items = useAppStore(s => s.items);
  const colors = useAppStore(s => s.colors);
  const results = useAppStore(s => s.results);
  const seasons = useAppStore(s => s.seasons);
  const balanceScope = useAppStore(s => s.balanceScope);
  const wheelType = useAppStore(s => s.wheelType);

  // App live algorithm settings
  const appPitySystemEnabled = useAppStore(s => s.pitySystemEnabled);
  const appBalanceWeightsByWins = useAppStore(s => s.balanceWeightsByWins);
  const appBalanceWeightsMode = useAppStore(s => s.balanceWeightsMode);
  const appIgnoreNewItemWeight = useAppStore(s => s.ignoreNewItemWeight);
  const appNewItemWeightMode = useAppStore(s => s.newItemWeightMode);
  const appAntiRepetitionEnabled = useAppStore(s => s.antiRepetitionEnabled);
  const appAntiRepetitionCount = useAppStore(s => s.antiRepetitionCount);
  const appEliminationMode = useAppStore(s => s.eliminationMode);

  // Simulation parameters
  const [drawCount, setDrawCount] = useState<number>(100);
  const [customDrawCountInput, setCustomDrawCountInput] = useState<string>('100');
  const [simMode, setSimMode] = useState<'standard' | 'elimination'>(
    appEliminationMode ? 'elimination' : 'standard'
  );
  
  // Scenario selection:
  // 'current_season' = Continuação da temporada atual
  // 'new_season' = Simulação de uma nova temporada (do zero)
  // 'all' = Histórico geral acumulado
  const [scenario, setScenario] = useState<'current_season' | 'new_season' | 'all'>('current_season');

  // Algorithm history scope parameter (wheel balance & pity calculations)
  // "nos parametros é só um indicador pra saber se ta contando o da temporada vigente ou o geral"
  const [algoBalanceScope, setAlgoBalanceScope] = useState<'current_season' | 'all'>(balanceScope);

  useEffect(() => {
    setAlgoBalanceScope(balanceScope);
  }, [balanceScope]);

  // Test-specific algorithm configurations (defaults to live settings)
  const [pityEnabled, setPityEnabled] = useState<boolean>(appPitySystemEnabled);
  const [balanceByWins, setBalanceByWins] = useState<boolean>(appBalanceWeightsByWins);
  const [balanceMode, setBalanceMode] = useState<'linear' | 'quadratic' | 'cubic' | 'relative'>(appBalanceWeightsMode);
  const [ignoreNewItem, setIgnoreNewItem] = useState<boolean>(appIgnoreNewItemWeight);
  const [newItemMode, setNewItemMode] = useState<'boosted' | 'max' | 'median' | 'average' | 'min' | 'base'>(appNewItemWeightMode);
  const [antiRepetition, setAntiRepetition] = useState<boolean>(appAntiRepetitionEnabled);
  const [antiRepetitionNum, setAntiRepetitionNum] = useState<number>(appAntiRepetitionCount);

  // UI state
  const [isParamsExpanded, setIsParamsExpanded] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'table' | 'log'>('table');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<
    'total_wins_desc' | 'sim_wins_desc' | 'prior_wins_desc' | 'delta_desc' | 'dry_desc' | 'name'
  >('total_wins_desc');
  const [historyLogFilter, setHistoryLogFilter] = useState<'all' | 'simulated' | 'prior'>('all');
  const [historyLogSearch, setHistoryLogSearch] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [report, setReport] = useState<TestSimulationReport | null>(null);

  // Check if hypothetical parameters differ from live wheel settings
  const isParamsOverridden = useMemo(() => {
    return (
      algoBalanceScope !== balanceScope ||
      pityEnabled !== appPitySystemEnabled ||
      balanceByWins !== appBalanceWeightsByWins ||
      balanceMode !== appBalanceWeightsMode ||
      ignoreNewItem !== appIgnoreNewItemWeight ||
      newItemMode !== appNewItemWeightMode ||
      antiRepetition !== appAntiRepetitionEnabled ||
      antiRepetitionNum !== appAntiRepetitionCount
    );
  }, [
    algoBalanceScope, balanceScope,
    pityEnabled, appPitySystemEnabled,
    balanceByWins, appBalanceWeightsByWins,
    balanceMode, appBalanceWeightsMode,
    ignoreNewItem, appIgnoreNewItemWeight,
    newItemMode, appNewItemWeightMode,
    antiRepetition, appAntiRepetitionEnabled,
    antiRepetitionNum, appAntiRepetitionCount
  ]);

  // Active items
  const activeItems = useMemo(
    () => items.filter(i => i.enabled && i.text.trim() !== ''),
    [items]
  );

  // Season and history stats
  const activeSeason = useMemo(() => getCurrentSeason(seasons), [seasons]);
  const currentSeasonResults = useMemo(() => filterResultsByScope(results, seasons, 'current_season'), [results, seasons]);
  const totalResultsCount = results.length;

  // Restore test params to app current settings (including balanceScope)
  const handleRestoreAppConfig = () => {
    setPityEnabled(appPitySystemEnabled);
    setBalanceByWins(appBalanceWeightsByWins);
    setBalanceMode(appBalanceWeightsMode);
    setIgnoreNewItem(appIgnoreNewItemWeight);
    setNewItemMode(appNewItemWeightMode);
    setAntiRepetition(appAntiRepetitionEnabled);
    setAntiRepetitionNum(appAntiRepetitionCount);
    setAlgoBalanceScope(balanceScope);
    executeSimulation(undefined, undefined, balanceScope);
  };

  const executeSimulation = (
    countToRun?: number,
    overrideScenario?: 'current_season' | 'new_season' | 'all',
    overrideAlgoScope?: 'current_season' | 'all'
  ) => {
    const finalCount = countToRun !== undefined ? countToRun : drawCount;
    const finalScenario = overrideScenario !== undefined ? overrideScenario : scenario;
    const finalAlgoScope = overrideAlgoScope !== undefined ? overrideAlgoScope : algoBalanceScope;
    if (activeItems.length < 2) return;

    setIsRunning(true);

    setTimeout(() => {
      const config: TestSimulationConfig = {
        drawCount: finalCount,
        mode: simMode,
        simulationScenario: finalScenario,
        balanceScope: finalAlgoScope,
        pitySystemEnabled: pityEnabled,
        balanceWeightsByWins: balanceByWins,
        balanceWeightsMode: balanceMode,
        ignoreNewItemWeight: ignoreNewItem,
        newItemWeightMode: newItemMode,
        antiRepetitionEnabled: antiRepetition,
        antiRepetitionCount: antiRepetitionNum,
        wheelType,
      };

      const result = runTestSimulation(items, results, seasons, config, colors);
      setReport(result);
      setIsRunning(false);
    }, 15);
  };

  // Run automatically on first load or when items change
  useEffect(() => {
    if (!report && activeItems.length >= 2) {
      executeSimulation(100);
    }
  }, [items]);

  const handlePresetClick = (val: number) => {
    setDrawCount(val);
    setCustomDrawCountInput(val.toString());
    executeSimulation(val);
  };

  const handleCustomCountChange = (valStr: string) => {
    setCustomDrawCountInput(valStr);
    const num = parseInt(valStr, 10);
    if (!isNaN(num) && num > 0) {
      setDrawCount(Math.min(50000, num));
    }
  };

  const handleScenarioChange = (newScenario: 'current_season' | 'new_season' | 'all') => {
    setScenario(newScenario);
    executeSimulation(undefined, newScenario);
  };

  const handleAlgoScopeChange = (newScope: 'current_season' | 'all') => {
    setAlgoBalanceScope(newScope);
    executeSimulation(undefined, undefined, newScope);
  };

  const processedStats = useMemo(() => {
    if (!report) return [];
    let list = [...report.participantStats];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p => p.text.toLowerCase().includes(q));
    }

    list.sort((a, b) => {
      if (sortBy === 'total_wins_desc') return compareTestParticipantsByTotalWins(a, b);
      if (sortBy === 'sim_wins_desc') return compareTestParticipantsBySimulatedWins(a, b);
      if (sortBy === 'prior_wins_desc') return compareTestParticipantsByPriorWins(a, b);
      if (sortBy === 'delta_desc') {
        const diff = Math.abs(b.simulatedDelta) - Math.abs(a.simulatedDelta);
        if (diff !== 0) return diff;
        return compareTestParticipantsByTotalWins(a, b);
      }
      if (sortBy === 'dry_desc') {
        const diff = b.maxDrySpell - a.maxDrySpell;
        if (diff !== 0) return diff;
        return compareTestParticipantsByTotalWins(a, b);
      }
      if (sortBy === 'name') return a.text.localeCompare(b.text);
      return compareTestParticipantsByTotalWins(a, b);
    });

    return list;
  }, [report, searchQuery, sortBy]);

  const filteredDrawLog = useMemo(() => {
    if (!report) return [];
    let list = [...report.drawLog];

    if (historyLogFilter === 'simulated') {
      list = list.filter(item => item.type === 'simulated');
    } else if (historyLogFilter === 'prior') {
      list = list.filter(item => item.type === 'prior');
    }

    if (historyLogSearch.trim()) {
      const q = historyLogSearch.toLowerCase().trim();
      list = list.filter(item => item.winnerText.toLowerCase().includes(q));
    }

    return list;
  }, [report, historyLogFilter, historyLogSearch]);

  const simLogCount = useMemo(() => {
    if (!report) return 0;
    return report.drawLog.filter(d => d.type === 'simulated').length;
  }, [report]);

  const priorLogCount = useMemo(() => {
    if (!report) return 0;
    return report.drawLog.filter(d => d.type === 'prior').length;
  }, [report]);

  const handleCopySummary = () => {
    if (!report) return;
    const lines: string[] = [
      `=== RELATÓRIO DO MODO DE TESTE (SORTSTUDIO) ===`,
      `Sorteios Considerados: ${report.combinedTotalDraws.toLocaleString()} (${report.priorDraws} prévios + ${report.totalDraws} no teste atual)`,
      `Tempo de Execução do Teste: ${report.executionTimeMs} ms`,
      `Base de Histórico: ${report.historyScopeLabel}`,
      `Tipo de Simulação: ${report.isStandard ? 'Sorteios Sequenciais' : 'Torneios de Eliminação'}`,
      `Pity Ativo: ${report.config.pitySystemEnabled ? 'Sim' : 'Não'}`,
      `Redução por Vitórias: ${report.config.balanceWeightsByWins ? `Sim (${report.config.balanceWeightsMode})` : 'Não'}`,
      `Anti-Repetição: ${report.config.antiRepetitionEnabled ? `Sim (${report.config.antiRepetitionCount})` : 'Não'}`,
      `Infrações de Anti-Repetição: ${report.antiRepetitionViolations}`,
      ``,
      `--- RANKING CONSOLIDADO (DADOS PRÉVIOS + TESTE ATUAL) ---`,
      ...report.participantStats
        .sort(compareTestParticipantsByTotalWins)
        .map(p => 
          `${p.text}: Total ${p.totalWins} vitórias (${p.priorWins} prévias da temporada + ${p.simulatedWins} no teste atual) | ` +
          `Freq. Total: ${p.totalWinPercentage}% | Freq. Teste: ${p.simulatedWinPercentage}% | Esperado: ${p.expectedChance}% | ` +
          `Desvio Teste: ${p.simulatedDelta > 0 ? `+${p.simulatedDelta}` : p.simulatedDelta}% | Seca Máx: ${p.maxDrySpell}`
        )
    ];

    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleExportCsv = () => {
    if (!report) return;
    const headers = [
      "Participante",
      "Vitorias_Totais_Temporada",
      "Vitorias_Previas_Temporada",
      "Vitorias_Teste_Atual",
      "Frequencia_Total_Percentual",
      "Frequencia_Previa_Percentual",
      "Frequencia_Teste_Percentual",
      "Chance_Teorica_Esperada",
      "Desvio_Teste_Percentual",
      "Desvio_Total_Percentual",
      "Maior_Sequencia",
      "Maior_Seca",
      "Peso_Inicial"
    ];

    const rows = report.participantStats.map(p => [
      `"${p.text.replace(/"/g, '""')}"`,
      p.totalWins,
      p.priorWins,
      p.simulatedWins,
      p.totalWinPercentage,
      p.priorWinPercentage,
      p.simulatedWinPercentage,
      p.expectedChance,
      p.simulatedDelta,
      p.totalDelta,
      p.maxStreak,
      p.maxDrySpell,
      p.initialWeight
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `simulacao_teste_${report.totalDraws}_sorteios.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJson = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `simulacao_teste_${report.totalDraws}_sorteios.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[var(--studio-canvas)] relative select-none">
      
      {/* 1. TOP COMMAND BAR (Unified Full-Page Workspace Toolbar) */}
      <header className="px-3 sm:px-5 py-2.5 bg-[var(--studio-header)] border-b border-[var(--studio-border)] backdrop-blur-md flex flex-wrap items-center justify-between gap-2.5 shrink-0 z-20">
        
        {/* Left Zone: Title & Scenario Switcher */}
        <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-600 dark:text-purple-300 shrink-0">
              <FlaskConical size={16} />
            </div>
            <span className="text-xs sm:text-sm font-bold text-[var(--studio-text)] tracking-tight">
              Modo de Teste
            </span>
          </div>

          <div className="h-4 w-px bg-[var(--studio-border)] hidden sm:block" />

          {/* Scenario Selector: Temporada / Do Zero / Geral */}
          <div className="flex items-center bg-[var(--studio-input)] p-0.5 rounded-lg border border-[var(--studio-border)] text-[11px]">
            <button
              type="button"
              onClick={() => handleScenarioChange('current_season')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                scenario === 'current_season'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-[var(--studio-text-muted)] hover:text-[var(--studio-text)]'
              }`}
              title="Simular a continuação da temporada atual (acumula com resultados já ocorridos)"
            >
              <Calendar size={12} className={scenario === 'current_season' ? 'text-white' : 'text-[var(--studio-text-muted)]'} />
              <span>Temporada</span>
            </button>
            <button
              type="button"
              onClick={() => handleScenarioChange('new_season')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                scenario === 'new_season'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-[var(--studio-text-muted)] hover:text-[var(--studio-text)]'
              }`}
              title="Simulação de uma nova temporada (começa do zero sem histórico prévio)"
            >
              <Sparkles size={12} className={scenario === 'new_season' ? 'text-white' : 'text-[var(--studio-text-muted)]'} />
              <span>Do Zero</span>
            </button>
            <button
              type="button"
              onClick={() => handleScenarioChange('all')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                scenario === 'all'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-[var(--studio-text-muted)] hover:text-[var(--studio-text)]'
              }`}
              title="Simular no histórico geral acumulado (todas as temporadas juntas)"
            >
              <History size={12} className={scenario === 'all' ? 'text-white' : 'text-[var(--studio-text-muted)]'} />
              <span>Geral</span>
            </button>
          </div>

          {/* Simulation Type Segmented Control */}
          <div className="flex items-center bg-[var(--studio-input)] p-0.5 rounded-lg border border-[var(--studio-border)] text-[11px]">
            <button
              type="button"
              onClick={() => {
                setSimMode('standard');
                if (report) executeSimulation();
              }}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all whitespace-nowrap ${
                simMode === 'standard'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-[var(--studio-text-muted)] hover:text-[var(--studio-text)]'
              }`}
            >
              Sequencial
            </button>
            <button
              type="button"
              onClick={() => {
                setSimMode('elimination');
                if (report) executeSimulation();
              }}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all whitespace-nowrap ${
                simMode === 'elimination'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-[var(--studio-text-muted)] hover:text-[var(--studio-text)]'
              }`}
            >
              Eliminação
            </button>
          </div>
        </div>

        {/* Right Zone: Presets + Parameters Drawer Button + Action CTA + Export Icons */}
        <div className="flex items-center gap-2 flex-wrap ml-auto">
          {/* Draw count presets */}
          <div className="flex items-center bg-[var(--studio-input)] p-0.5 rounded-lg border border-[var(--studio-border)] text-xs">
            {[10, 50, 100, 500, 1000].map((num) => (
              <button
                key={num}
                type="button"
                disabled={isRunning || activeItems.length < 2}
                onClick={() => handlePresetClick(num)}
                className={`px-2 py-1 text-[11px] font-bold font-mono tabular-nums rounded transition-all active:scale-95 disabled:opacity-40 whitespace-nowrap ${
                  drawCount === num
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-[var(--studio-text-muted)] hover:text-[var(--studio-text)] hover:bg-[var(--studio-card)]'
                }`}
              >
                {num.toLocaleString()}
              </button>
            ))}

            {/* Custom input */}
            <div className="flex items-center px-1.5 py-0.5 text-[11px] border-l border-[var(--studio-border)]">
              <input
                type="number"
                min="1"
                max="50000"
                value={customDrawCountInput}
                onChange={(e) => handleCustomCountChange(e.target.value)}
                disabled={isRunning}
                aria-label="Quantidade personalizada de sorteios"
                title="Quantidade personalizada de sorteios"
                className="w-12 bg-transparent text-[var(--studio-text)] font-bold outline-none text-center font-mono tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
          </div>

          {/* Toggle Parameters Drawer */}
          <button
            type="button"
            onClick={() => setIsParamsExpanded(!isParamsExpanded)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all whitespace-nowrap relative ${
              isParamsExpanded
                ? 'bg-purple-600/20 text-purple-600 dark:text-purple-300 border-purple-500/40'
                : 'bg-[var(--studio-card)] hover:bg-[var(--studio-card-hover)] text-[var(--studio-text-secondary)] border-[var(--studio-border)] hover:border-[var(--studio-border-strong)]'
            }`}
            title="Ajustar parâmetros hipotéticos de simulação"
          >
            <SlidersHorizontal size={13} className={isParamsExpanded ? 'text-purple-500 dark:text-purple-400' : 'text-[var(--studio-text-muted)]'} />
            <span className="hidden xl:inline">Parâmetros</span>
            {isParamsOverridden && (
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 dark:bg-purple-400" title="Parâmetros personalizados ativos" />
            )}
            <ChevronDown size={12} className={`transition-transform duration-150 ${isParamsExpanded ? 'rotate-180' : ''}`} />
          </button>

          {/* Export Actions in Header */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleCopySummary}
              disabled={!report}
              aria-label={copied ? "Resumo copiado" : "Copiar resumo"}
              className="p-1.5 rounded-lg bg-[var(--studio-card)] hover:bg-[var(--studio-card-hover)] text-[var(--studio-text-muted)] hover:text-[var(--studio-text)] border border-[var(--studio-border)] transition-colors disabled:opacity-30"
              title={copied ? "Copiado!" : "Copiar Resumo"}
            >
              {copied ? <Check size={14} className="text-emerald-500 dark:text-emerald-400" /> : <Copy size={14} />}
            </button>
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={!report}
              aria-label="Exportar CSV"
              className="p-1.5 rounded-lg bg-[var(--studio-card)] hover:bg-[var(--studio-card-hover)] text-[var(--studio-text-muted)] hover:text-[var(--studio-text)] border border-[var(--studio-border)] transition-colors disabled:opacity-30"
              title="Exportar CSV"
            >
              <Download size={14} />
            </button>
            <button
              type="button"
              onClick={handleExportJson}
              disabled={!report}
              aria-label="Exportar JSON"
              className="p-1.5 rounded-lg bg-[var(--studio-card)] hover:bg-[var(--studio-card-hover)] text-[var(--studio-text-muted)] hover:text-[var(--studio-text)] border border-[var(--studio-border)] transition-colors disabled:opacity-30"
              title="Exportar JSON"
            >
              <FileJson size={14} />
            </button>
          </div>

          {/* Primary Simulation CTA Button */}
          <button
            type="button"
            onClick={() => executeSimulation()}
            disabled={isRunning || activeItems.length < 2}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-sm transition-all active:scale-95 disabled:opacity-40 whitespace-nowrap font-mono tabular-nums"
          >
            <Play size={13} className={`fill-current ${isRunning ? 'animate-spin' : ''}`} />
            <span>{isRunning ? 'Simulando...' : `Simular (${drawCount})`}</span>
          </button>
        </div>
      </header>

      {/* 2. EXPANDABLE PARAMETERS DRAWER (Hipotéticos: não afetam a roleta real) */}
      {isParamsExpanded && (
        <div className="bg-[var(--studio-surface)] border-b border-[var(--studio-border)] px-4 lg:px-6 py-3 shrink-0 z-10 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 mb-2.5 border-b border-[var(--studio-border)]">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-[var(--studio-text)]">
                Parâmetros Hipotéticos do Teste
              </span>
              <span className="text-[11px] text-[var(--studio-text-muted)]">
                Experimente sem alterar as configurações reais da roleta
              </span>
            </div>
            <button
              type="button"
              onClick={handleRestoreAppConfig}
              className="text-[11px] text-purple-600 dark:text-purple-300 hover:opacity-80 flex items-center gap-1 font-medium transition-colors"
            >
              <RotateCcw size={11} /> Restaurar parâmetros da roleta
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
            {/* 1. History Scope for Algorithm (Temporada vs Geral) */}
            <div className="bg-[var(--studio-card)] p-3 rounded-xl border border-[var(--studio-border)] flex flex-col justify-between gap-2">
              <div className="flex items-center justify-between gap-2">
                <div className="font-semibold text-[var(--studio-text)] text-[11px]">Histórico no Balanceamento</div>
                <span className="text-[10px] text-[var(--studio-text-muted)] font-mono">
                  {balanceScope === 'current_season' ? 'Temporada' : 'Geral'}
                </span>
              </div>
              <div className="text-[11px] text-[var(--studio-text-muted)] leading-snug">
                Base histórica usada para calcular pesos e piedade.
              </div>
              <div className="grid grid-cols-2 gap-1 bg-[var(--studio-input)] p-0.5 rounded-lg border border-[var(--studio-border)]">
                <button
                  type="button"
                  onClick={() => handleAlgoScopeChange('current_season')}
                  className={`py-1 rounded-md text-[10px] font-bold text-center transition-all ${
                    algoBalanceScope === 'current_season'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-[var(--studio-text-muted)] hover:text-[var(--studio-text)]'
                  }`}
                >
                  Temporada Vigente
                </button>
                <button
                  type="button"
                  onClick={() => handleAlgoScopeChange('all')}
                  className={`py-1 rounded-md text-[10px] font-bold text-center transition-all ${
                    algoBalanceScope === 'all'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-[var(--studio-text-muted)] hover:text-[var(--studio-text)]'
                  }`}
                >
                  Resultado Geral
                </button>
              </div>
            </div>

            {/* 2. Pity System */}
            <div className="bg-[var(--studio-card)] p-3 rounded-xl border border-[var(--studio-border)] flex items-center justify-between gap-3">
              <div>
                <div className="font-semibold text-[var(--studio-text)] text-[11px]">Sistema de Piedade (Pity)</div>
                <div className="text-[11px] text-[var(--studio-text-muted)] mt-0.5">+1 de peso por sorteio sem vitória</div>
              </div>
              <input
                type="checkbox"
                checked={pityEnabled}
                onChange={(e) => setPityEnabled(e.target.checked)}
                aria-label="Ativar sistema de piedade"
                className="w-4 h-4 rounded accent-purple-500 bg-[var(--studio-input)] border-[var(--studio-border)] cursor-pointer shrink-0"
              />
            </div>

            {/* 3. Balance by Wins */}
            <div className="bg-[var(--studio-card)] p-3 rounded-xl border border-[var(--studio-border)] flex flex-col justify-between gap-2">
              <div className="flex items-center justify-between gap-3">
                <div className="font-semibold text-[var(--studio-text)] text-[11px]">Redução por Vitórias</div>
                <input
                  type="checkbox"
                  checked={balanceByWins}
                  onChange={(e) => setBalanceByWins(e.target.checked)}
                  aria-label="Ativar redução por vitórias"
                  className="w-4 h-4 rounded accent-purple-500 bg-[var(--studio-input)] border-[var(--studio-border)] cursor-pointer shrink-0"
                />
              </div>
              {balanceByWins && (
                <select
                  value={balanceMode}
                  onChange={(e) => setBalanceMode(e.target.value as 'linear' | 'quadratic' | 'cubic' | 'relative')}
                  aria-label="Modo de redução por vitórias"
                  className="w-full bg-[var(--studio-input)] border border-[var(--studio-border)] rounded-lg px-2 py-1 text-[11px] text-[var(--studio-text)] focus:outline-none focus:border-purple-500/60"
                >
                  <option value="linear">Linear: peso / (V + 1)</option>
                  <option value="quadratic">Quadrático: peso / (V + 1)²</option>
                  <option value="cubic">Cúbico: peso / (V + 1)³</option>
                  <option value="relative">Relativo: peso × ((min + 1) / (V + 1))³</option>
                </select>
              )}
            </div>

            {/* 4. Anti-Repetition */}
            <div className="bg-[var(--studio-card)] p-3 rounded-xl border border-[var(--studio-border)] flex flex-col justify-between gap-2">
              <div className="flex items-center justify-between gap-3">
                <div className="font-semibold text-[var(--studio-text)] text-[11px]">Anti-Repetição</div>
                <input
                  type="checkbox"
                  checked={antiRepetition}
                  onChange={(e) => setAntiRepetition(e.target.checked)}
                  aria-label="Ativar anti-repetição"
                  className="w-4 h-4 rounded accent-purple-500 bg-[var(--studio-input)] border-[var(--studio-border)] cursor-pointer shrink-0"
                />
              </div>
              {antiRepetition && (
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="text-[var(--studio-text-muted)]">Evitar últimos X:</span>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={antiRepetitionNum}
                    onChange={(e) => setAntiRepetitionNum(Math.max(1, parseInt(e.target.value) || 1))}
                    aria-label="Quantidade de sorteios para evitar repetição"
                    className="w-14 bg-[var(--studio-input)] border border-[var(--studio-border)] rounded-lg px-1.5 py-0.5 text-center font-mono tabular-nums text-[var(--studio-text)] focus:outline-none focus:border-purple-500/60"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. MAIN DASHBOARD STAGE VIEWPORT (Full-height Data & Results Workspace) */}
      <div className="flex-1 overflow-hidden flex flex-col p-3 sm:p-5 gap-3 min-h-0">
        
        {/* Validation Notice when fewer than 2 items */}
        {activeItems.length < 2 && (
          <div className="p-8 bg-[var(--studio-surface)] border border-[var(--studio-border)] rounded-2xl text-center space-y-2 m-auto max-w-md">
            <p className="text-base font-bold text-amber-600 dark:text-amber-300">
              Pelo menos 2 participantes ativos são necessários.
            </p>
            <p className="text-xs text-[var(--studio-text-muted)]">
              Cadastre ou ative entradas na barra lateral direita para iniciar os testes e simulações.
            </p>
          </div>
        )}

        {/* Results Area */}
        {report && activeItems.length >= 2 && (
          <>
            {/* KPI Metrics Strip (Compact, High Density) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 shrink-0">
              {/* Metric 1: Total Considered Draws */}
              <div className="bg-[var(--studio-card)] border border-[var(--studio-border)] rounded-xl px-3.5 py-2.5 flex flex-col justify-between">
                <div className="flex items-center justify-between text-[var(--studio-text-muted)] text-[11px]">
                  <span className="font-semibold text-[var(--studio-text-secondary)]">
                    {scenario === 'current_season'
                      ? 'Sorteios da Temporada'
                      : scenario === 'new_season'
                      ? 'Sorteios da Nova Temporada'
                      : 'Sorteios Gerais'}
                  </span>
                  <Zap size={13} className="text-purple-500 dark:text-purple-400 shrink-0" />
                </div>
                <div className="mt-1.5">
                  <div className="text-lg sm:text-xl font-black text-[var(--studio-text)] font-mono tabular-nums leading-none">
                    {report.combinedTotalDraws.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-[var(--studio-text-muted)] font-mono tabular-nums mt-1 truncate">
                    {scenario === 'new_season' ? (
                      <span className="text-purple-600 dark:text-purple-300">{report.totalDraws} simulados do zero</span>
                    ) : (
                      <>
                        <span className="text-emerald-600 dark:text-emerald-400">{report.priorDraws} prévios</span>
                        <span className="text-[var(--studio-text-muted)] mx-1">·</span>
                        <span className="text-purple-600 dark:text-purple-300">+{report.totalDraws} no teste</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Metric 2: Overall Leader */}
              <div className="bg-[var(--studio-card)] border border-[var(--studio-border)] rounded-xl px-3.5 py-2.5 flex flex-col justify-between">
                <div className="flex items-center justify-between text-[var(--studio-text-muted)] text-[11px]">
                  <span className="font-semibold text-[var(--studio-text-secondary)]">
                    {scenario === 'current_season'
                      ? 'Líder da Temporada'
                      : scenario === 'new_season'
                      ? 'Líder da Nova Temporada'
                      : 'Líder Geral Acumulado'}
                  </span>
                  <Crown size={13} className="text-amber-500 dark:text-amber-400 shrink-0" />
                </div>
                <div className="mt-1.5">
                  <div className="text-sm font-bold text-amber-600 dark:text-amber-300 truncate leading-tight" title={report.topTotalWinner?.text}>
                    {report.topTotalWinner?.text || '—'}
                  </div>
                  <div className="text-[11px] text-[var(--studio-text-muted)] font-mono tabular-nums mt-1 truncate">
                    <strong className="text-[var(--studio-text)]">{report.topTotalWinner?.totalWins || 0}</strong> vitórias{' '}
                    {scenario !== 'new_season' && (
                      <span className="text-[var(--studio-text-muted)]">
                        ({report.topTotalWinner?.priorWins || 0}p + {report.topTotalWinner?.simulatedWins || 0}t)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Metric 3: Test Leader */}
              <div className="bg-[var(--studio-card)] border border-[var(--studio-border)] rounded-xl px-3.5 py-2.5 flex flex-col justify-between">
                <div className="flex items-center justify-between text-[var(--studio-text-muted)] text-[11px]">
                  <span className="font-semibold text-[var(--studio-text-secondary)]">Destaque do Teste</span>
                  <Flame size={13} className="text-purple-500 dark:text-purple-400 shrink-0" />
                </div>
                <div className="mt-1.5">
                  <div className="text-sm font-bold text-purple-600 dark:text-purple-200 truncate leading-tight" title={report.topSimWinner?.text}>
                    {report.topSimWinner?.text || '—'}
                  </div>
                  <div className="text-[11px] text-[var(--studio-text-muted)] font-mono tabular-nums mt-1 truncate">
                    <strong className="text-purple-600 dark:text-purple-300">{report.topSimWinner?.simulatedWins || 0}</strong> no teste{' '}
                    <span className="text-[var(--studio-text-muted)]">({report.topSimWinner?.simulatedWinPercentage || 0}%)</span>
                  </div>
                </div>
              </div>

              {/* Metric 4: Statistical Alignment / Baseline */}
              <div className="bg-[var(--studio-card)] border border-[var(--studio-border)] rounded-xl px-3.5 py-2.5 flex flex-col justify-between">
                <div className="flex items-center justify-between text-[var(--studio-text-muted)] text-[11px]">
                  <span className="font-semibold text-[var(--studio-text-secondary)]">Comportamento</span>
                  <Sparkles size={13} className="text-sky-500 dark:text-sky-400 shrink-0" />
                </div>
                <div className="mt-1.5">
                  <div className="text-sm font-bold text-sky-600 dark:text-sky-200 truncate leading-tight">
                    {report.chiSquaredEvaluation === 'balanced'
                      ? 'Equilibrado'
                      : report.chiSquaredEvaluation === 'skewed_by_rules'
                      ? 'Regras Ativas'
                      : 'Aleatoriedade Natural'}
                  </div>
                  <div className="text-[11px] text-[var(--studio-text-muted)] font-mono tabular-nums mt-1 truncate">
                    <span>{report.executionTimeMs} ms</span>
                    <span className="text-[var(--studio-text-muted)] mx-1">·</span>
                    <span>{report.antiRepetitionViolations} infrações</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation Tabs and Controls Row */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0 pt-0.5">
              
              {/* Tab Selector */}
              <div className="flex items-center bg-[var(--studio-surface)] p-0.5 rounded-xl border border-[var(--studio-border)] w-fit text-xs">
                <button
                  type="button"
                  onClick={() => setActiveTab('table')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
                    activeTab === 'table'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-[var(--studio-text-muted)] hover:text-[var(--studio-text)]'
                  }`}
                >
                  <BarChart3 size={13} />
                  <span>Estatísticas & Tabela</span>
                  <span className="text-[10px] font-mono tabular-nums opacity-80">({processedStats.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('log')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
                    activeTab === 'log'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-[var(--studio-text-muted)] hover:text-[var(--studio-text)]'
                  }`}
                >
                  <ListOrdered size={13} />
                  <span>Histórico de Rodadas</span>
                  <span className="text-[10px] font-mono tabular-nums opacity-80">({report.drawLog.length})</span>
                </button>
              </div>

              {/* Controls per Active Tab */}
              {activeTab === 'table' ? (
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Search input */}
                  <div className="relative flex-1 sm:w-52">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--studio-text-muted)]" />
                    <input
                      type="text"
                      placeholder="Buscar participante..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-[var(--studio-surface)] border border-[var(--studio-border)] rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-[var(--studio-text)] placeholder-[var(--studio-text-muted)] focus:outline-none focus:border-purple-500/70"
                    />
                  </div>

                  {/* Sort dropdown */}
                  <div className="flex items-center gap-1.5 bg-[var(--studio-surface)] border border-[var(--studio-border)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--studio-text-secondary)]">
                    <ArrowUpDown size={12} className="text-[var(--studio-text-muted)] shrink-0" />
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                      aria-label="Ordenar participantes"
                      className="bg-transparent text-xs text-[var(--studio-text)] focus:outline-none pr-1 cursor-pointer"
                    >
                      <option value="total_wins_desc">
                        {scenario === 'new_season' ? 'Total na Nova Temporada' : 'Total Consolidado (Prévio + Atual)'}
                      </option>
                      <option value="sim_wins_desc">Apenas no Teste Atual</option>
                      {scenario !== 'new_season' && (
                        <option value="prior_wins_desc">Apenas Vitórias Prévias</option>
                      )}
                      <option value="delta_desc">Maior Desvio no Teste (+/-)</option>
                      <option value="dry_desc">Maior Seca</option>
                      <option value="name">Nome (A-Z)</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Log Filter */}
                  <div className="flex items-center bg-[var(--studio-surface)] p-0.5 rounded-lg border border-[var(--studio-border)] text-xs font-mono tabular-nums">
                    <button
                      type="button"
                      onClick={() => setHistoryLogFilter('all')}
                      className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
                        historyLogFilter === 'all'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-[var(--studio-text-muted)] hover:text-[var(--studio-text)]'
                      }`}
                    >
                      Todos ({report.drawLog.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setHistoryLogFilter('simulated')}
                      className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
                        historyLogFilter === 'simulated'
                          ? 'bg-purple-600 text-white shadow-sm'
                          : 'text-purple-600 dark:text-purple-300 hover:text-[var(--studio-text)]'
                      }`}
                    >
                      Atuais ({simLogCount})
                    </button>
                    {scenario !== 'new_season' && (
                      <button
                        type="button"
                        onClick={() => setHistoryLogFilter('prior')}
                        className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
                          historyLogFilter === 'prior'
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'text-emerald-600 dark:text-emerald-300 hover:text-[var(--studio-text)]'
                        }`}
                      >
                        Prévios ({priorLogCount})
                      </button>
                    )}
                  </div>

                  {/* Search in log */}
                  <div className="relative sm:w-48">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--studio-text-muted)]" />
                    <input
                      type="text"
                      placeholder="Buscar no histórico..."
                      value={historyLogSearch}
                      onChange={(e) => setHistoryLogSearch(e.target.value)}
                      className="w-full bg-[var(--studio-surface)] border border-[var(--studio-border)] rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-[var(--studio-text)] placeholder-[var(--studio-text-muted)] focus:outline-none focus:border-purple-500/70"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* TAB 1: DATA TABLE (Full Stage Viewport with Sticky Header) */}
            {activeTab === 'table' && (
              <div className="flex-1 bg-[var(--studio-surface)] border border-[var(--studio-border)] rounded-2xl overflow-hidden flex flex-col min-h-0">
                <div className="overflow-auto custom-scrollbar flex-1">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 bg-[var(--studio-header)] backdrop-blur border-b border-[var(--studio-border)] text-[10px] font-bold text-[var(--studio-text-muted)] uppercase tracking-wider z-10">
                      <tr>
                        <th className="py-2.5 px-3.5 sm:px-4"># Pos</th>
                        <th className="py-2.5 px-3.5 sm:px-4">Participante</th>
                        <th className="py-2.5 px-2 sm:px-3 text-center">Peso / Esperado</th>
                        <th className="py-2.5 px-2 sm:px-3 text-center min-w-[140px]">
                          {scenario === 'current_season'
                            ? 'Vitórias na Temporada'
                            : scenario === 'new_season'
                            ? 'Vitórias (Nova Temporada)'
                            : 'Vitórias Totais (Geral)'}
                        </th>
                        <th className="py-2.5 px-3 sm:px-4 min-w-[170px] sm:min-w-[220px]">
                          {scenario === 'new_season'
                            ? 'Frequência Real no Teste'
                            : 'Frequência Real (Prévio + Atual)'}
                        </th>
                        <th className="py-2.5 px-2 sm:px-3 text-center">Desvio Teste</th>
                        <th className="py-2.5 px-2 sm:px-3 text-center">Streak</th>
                        <th className="py-2.5 px-2 sm:px-3 text-center">Seca</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--studio-border)]">
                      {processedStats.map((p, idx) => {
                        const isOver = p.simulatedDelta > 0.5;
                        const isUnder = p.simulatedDelta < -0.5;

                        const totalDrawsRef = Math.max(1, report.combinedTotalDraws);
                        const priorWidthPct = (p.priorWins / totalDrawsRef) * 100;
                        const simWidthPct = (p.simulatedWins / totalDrawsRef) * 100;

                        return (
                          <tr key={p.id} className="hover:bg-[var(--studio-card)] transition-colors">
                            {/* Ranking position */}
                            <td className="py-2.5 px-3.5 sm:px-4 font-mono font-bold text-[11px] text-[var(--studio-text-muted)] tabular-nums">
                              {idx + 1}º
                            </td>

                            {/* Participant info */}
                            <td className="py-2.5 px-3.5 sm:px-4 font-medium text-[var(--studio-text)]">
                              <div className="flex items-center gap-2 min-w-0">
                                <span 
                                  className="w-2.5 h-2.5 rounded-full shrink-0"
                                  style={{ backgroundColor: p.color }} 
                                />
                                <span className="truncate max-w-[130px] sm:max-w-[200px]" title={p.text}>
                                  {p.text}
                                </span>
                              </div>
                            </td>

                            {/* Initial weight & theoretical chance */}
                            <td className="py-2.5 px-2 sm:px-3 text-center text-[var(--studio-text-secondary)] font-mono tabular-nums">
                              <div>{p.initialWeight}</div>
                              <div className="text-[10px] text-[var(--studio-text-muted)]">{p.expectedChance}%</div>
                            </td>

                            {/* Wins breakdown */}
                            <td className="py-2.5 px-2 sm:px-3 text-center">
                              <div className="flex flex-col items-center">
                                <div className="text-sm font-black text-[var(--studio-text)] font-mono tabular-nums">
                                  {p.totalWins.toLocaleString()}
                                </div>
                                {scenario !== 'new_season' ? (
                                  <div className="flex items-center justify-center gap-1.5 mt-0.5 font-mono tabular-nums text-[10px]">
                                    <span 
                                      className="text-emerald-600 dark:text-emerald-400"
                                      title={`${p.priorWins} vitórias prévias`}
                                    >
                                      {p.priorWins}p
                                    </span>
                                    <span className="text-[var(--studio-text-muted)]">·</span>
                                    <span 
                                      className="text-purple-600 dark:text-purple-300"
                                      title={`${p.simulatedWins} vitórias obtidas no teste atual`}
                                    >
                                      +{p.simulatedWins}t
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-purple-600 dark:text-purple-300 font-mono mt-0.5">
                                    nova temporada
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Real Frequency Visualizer (Segmented Bar) */}
                            <td className="py-2.5 px-3 sm:px-4">
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="flex-1 bg-[var(--studio-input)] rounded-full h-2 relative overflow-hidden border border-[var(--studio-border)] flex"
                                    title={scenario === 'new_season' 
                                      ? `Frequência na nova temporada: ${p.totalWinPercentage}% (esperado: ${p.expectedChance}%)`
                                      : `Decomposição: ${p.priorWins} prévias (${p.priorWinPercentage}%) + ${p.simulatedWins} no teste (${p.simulatedWinPercentage}%) | Total: ${p.totalWinPercentage}%`}
                                  >
                                    {/* Segment 1: Prior wins */}
                                    {priorWidthPct > 0 && scenario !== 'new_season' && (
                                      <div
                                        className="h-full bg-emerald-500/85 transition-all duration-300"
                                        style={{ width: `${Math.min(100, Math.max(1, priorWidthPct))}%` }}
                                      />
                                    )}
                                    {/* Segment 2: Simulated wins */}
                                    {simWidthPct > 0 && (
                                      <div
                                        className="h-full bg-purple-500 transition-all duration-300"
                                        style={{ width: `${Math.min(100, Math.max(1, simWidthPct))}%` }}
                                      />
                                    )}
                                    {/* Marker for theoretical chance */}
                                    <div 
                                      className="absolute top-0 bottom-0 w-0.5 bg-[var(--studio-text)] z-10"
                                      style={{ left: `${Math.min(99, Math.max(1, p.expectedChance))}%` }}
                                      title={`Chance teórica esperada: ${p.expectedChance}%`}
                                    />
                                  </div>
                                  <span className="text-[11px] font-mono font-bold text-[var(--studio-text)] w-11 text-right shrink-0 tabular-nums">
                                    {p.totalWinPercentage}%
                                  </span>
                                </div>

                                {scenario !== 'new_season' ? (
                                  <div className="flex items-center justify-between text-[10px] text-[var(--studio-text-muted)] font-mono tabular-nums">
                                    <span className="text-emerald-600 dark:text-emerald-400">
                                      Prévio {p.priorWinPercentage}%
                                    </span>
                                    <span className="text-purple-600 dark:text-purple-300">
                                      Teste {p.simulatedWinPercentage}%
                                    </span>
                                  </div>
                                ) : (
                                  <div className="text-[10px] text-[var(--studio-text-muted)] font-mono tabular-nums text-right">
                                    Esperado {p.expectedChance}%
                                  </div>
                                )}
                              </div>
                            </td>

                            {/* Delta Test vs Expected */}
                            <td className="py-2.5 px-2 sm:px-3 text-center font-mono font-semibold tabular-nums">
                              <div className="flex flex-col items-center">
                                <span className={`text-[11px] ${
                                  isOver 
                                    ? 'text-emerald-600 dark:text-emerald-400' 
                                    : isUnder 
                                    ? 'text-amber-600 dark:text-amber-400' 
                                    : 'text-[var(--studio-text-muted)]'
                                }`}>
                                  {p.simulatedDelta > 0 ? `+${p.simulatedDelta}` : p.simulatedDelta}%
                                </span>
                                {scenario !== 'new_season' && (
                                  <span className="text-[10px] text-[var(--studio-text-muted)] mt-0.5" title="Desvio no consolidado total">
                                    Total {p.totalDelta > 0 ? `+${p.totalDelta}` : p.totalDelta}%
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Streak */}
                            <td className="py-2.5 px-2 sm:px-3 text-center text-[var(--studio-text-secondary)] font-mono tabular-nums">
                              {p.maxStreak > 1 ? (
                                <span className="inline-flex items-center gap-0.5 text-amber-600 dark:text-amber-300 font-semibold">
                                  <Flame size={11} className="text-amber-500 dark:text-amber-400" />
                                  {p.maxStreak}
                                </span>
                              ) : (
                                <span className="text-[var(--studio-text-muted)]">1</span>
                              )}
                            </td>

                            {/* Dry spell */}
                            <td className="py-2.5 px-2 sm:px-3 text-center text-[var(--studio-text-secondary)] font-mono tabular-nums">
                              <span className={p.maxDrySpell > 20 ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-[var(--studio-text-muted)]'}>
                                {p.maxDrySpell}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 2: HISTÓRICO LOG (Full Stage Responsive Grid) */}
            {activeTab === 'log' && (
              <div className="flex-1 bg-[var(--studio-surface)] border border-[var(--studio-border)] rounded-2xl overflow-hidden flex flex-col p-3 min-h-0">
                <div className="overflow-y-auto custom-scrollbar flex-1 pr-1">
                  {filteredDrawLog.length === 0 ? (
                    <div className="py-16 text-center text-[var(--studio-text-muted)] text-xs">
                      Nenhum sorteio encontrado com os filtros selecionados.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                      {filteredDrawLog.map((log) => {
                        const isPrior = log.type === 'prior';

                        return (
                          <div
                            key={log.drawId}
                            className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[var(--studio-card)] border border-[var(--studio-border)] hover:border-[var(--studio-border-strong)] text-xs transition-colors"
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              {/* Order indicator */}
                              <span
                                className={`text-[10px] font-bold font-mono tabular-nums flex items-center gap-1 shrink-0 ${
                                  isPrior ? 'text-emerald-600 dark:text-emerald-400' : 'text-purple-600 dark:text-purple-300'
                                }`}
                              >
                                {isPrior ? <History size={10} /> : <Zap size={10} />}
                                #{log.typeOrder}
                              </span>

                              {/* Participant dot & name */}
                              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                <span 
                                  className="w-2.5 h-2.5 rounded-full shrink-0" 
                                  style={{ backgroundColor: log.winnerColor }}
                                />
                                <span className="truncate font-semibold text-[var(--studio-text)]" title={log.winnerText}>
                                  {log.winnerText}
                                </span>
                              </div>
                            </div>

                            {/* Tag description */}
                            <span className={`text-[10px] font-mono shrink-0 ${isPrior ? 'text-emerald-600 dark:text-emerald-400/80' : 'text-[var(--studio-text-muted)]'}`}>
                              {isPrior ? 'Prévio' : 'Atual'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
};
