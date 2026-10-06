import { Item, Result, Season } from '../types';
import { calculateWeights } from './weightUtils';
import { getSecureRandom } from './cryptoRandom';
import { filterResultsByScope, getCurrentSeason } from './seasonUtils';

export interface TestSimulationConfig {
  drawCount: number;
  mode: 'standard' | 'elimination';
  simulationScenario: 'current_season' | 'new_season' | 'all';
  balanceScope: 'current_season' | 'all';
  historyScope?: 'current_season' | 'all' | 'none';
  pitySystemEnabled: boolean;
  balanceWeightsByWins: boolean;
  balanceWeightsMode: 'linear' | 'quadratic' | 'cubic';
  ignoreNewItemWeight: boolean;
  newItemWeightMode: 'boosted' | 'max' | 'median' | 'average' | 'min' | 'base';
  antiRepetitionEnabled: boolean;
  antiRepetitionCount: number;
  wheelType: string;
}

export interface ParticipantTestStats {
  id: string;
  text: string;
  color: string;
  itemIndex: number;
  initialWeight: number;
  expectedChance: number;
  priorWins: number;
  simulatedWins: number;
  totalWins: number;
  winCount: number; // alias for totalWins
  priorWinPercentage: number;
  simulatedWinPercentage: number;
  totalWinPercentage: number;
  winPercentage: number; // alias for totalWinPercentage
  delta: number;
  simulatedDelta: number;
  totalDelta: number;
  maxStreak: number;
  maxDrySpell: number;
  firstEliminatedCount?: number;
  averageRank?: number;
  lastTotalWinOrder: number | null;
  lastSimWinOrder: number | null;
  lastPriorWinOrder: number | null;
  lastWinTimestamp: number | null;
  firstSeenTimestamp: number | null;
}

/**
 * Compares two participants by total wins using the exact ranking tie-breaking criteria:
 * 1. Most total wins (descending)
 * 2. Oldest last victory (quem tem a última vitória mais antiga / chegou primeiro naquele número de vitórias)
 * 3. First seen / original order in wheel
 * 4. Alphabetical fallback
 */
export function compareTestParticipantsByTotalWins(a: ParticipantTestStats, b: ParticipantTestStats): number {
  // 1. More wins is better
  if (b.totalWins !== a.totalWins) {
    return b.totalWins - a.totalWins;
  }

  // 2. Tiebreaker: quem tem a última vitória mais antiga (quem chegou primeiro naquele número de vitórias)
  if (a.totalWins > 0 && b.totalWins > 0) {
    if (a.lastTotalWinOrder !== null && b.lastTotalWinOrder !== null && a.lastTotalWinOrder !== b.lastTotalWinOrder) {
      return a.lastTotalWinOrder - b.lastTotalWinOrder;
    }
    if (a.lastWinTimestamp && b.lastWinTimestamp && a.lastWinTimestamp !== b.lastWinTimestamp) {
      return a.lastWinTimestamp - b.lastWinTimestamp;
    }
  }

  // 3. If neither has won: tiebreak by who was seen first / item index
  if (a.itemIndex !== b.itemIndex) {
    return a.itemIndex - b.itemIndex;
  }

  // 4. Alphabetical fallback
  return a.text.localeCompare(b.text);
}

export function compareTestParticipantsBySimulatedWins(a: ParticipantTestStats, b: ParticipantTestStats): number {
  // 1. More simulated wins is better
  if (b.simulatedWins !== a.simulatedWins) {
    return b.simulatedWins - a.simulatedWins;
  }

  // 2. Tiebreaker: quem tem a última vitória no teste mais antiga
  if (a.simulatedWins > 0 && b.simulatedWins > 0) {
    if (a.lastSimWinOrder !== null && b.lastSimWinOrder !== null && a.lastSimWinOrder !== b.lastSimWinOrder) {
      return a.lastSimWinOrder - b.lastSimWinOrder;
    }
  }

  // 3. If neither won: tiebreak by item index
  if (a.itemIndex !== b.itemIndex) {
    return a.itemIndex - b.itemIndex;
  }

  // 4. Alphabetical fallback
  return a.text.localeCompare(b.text);
}

export function compareTestParticipantsByPriorWins(a: ParticipantTestStats, b: ParticipantTestStats): number {
  // 1. More prior wins is better
  if (b.priorWins !== a.priorWins) {
    return b.priorWins - a.priorWins;
  }

  // 2. Tiebreaker: quem tem a última vitória prévia mais antiga
  if (a.priorWins > 0 && b.priorWins > 0) {
    if (a.lastPriorWinOrder !== null && b.lastPriorWinOrder !== null && a.lastPriorWinOrder !== b.lastPriorWinOrder) {
      return a.lastPriorWinOrder - b.lastPriorWinOrder;
    }
  }

  // 3. If neither won: tiebreak by item index
  if (a.itemIndex !== b.itemIndex) {
    return a.itemIndex - b.itemIndex;
  }

  // 4. Alphabetical fallback
  return a.text.localeCompare(b.text);
}

export interface DrawLogItem {
  drawId: string;
  globalOrder: number;
  typeOrder: number;
  type: 'prior' | 'simulated';
  label: string;
  winnerId: string;
  winnerText: string;
  winnerColor: string;
  timestamp?: number;
}

export interface TestSimulationReport {
  config: TestSimulationConfig;
  simulationScenario: 'current_season' | 'new_season' | 'all';
  balanceScope: 'current_season' | 'all';
  scenarioLabel: string;
  totalDraws: number;
  priorDraws: number;
  combinedTotalDraws: number;
  executionTimeMs: number;
  participantStats: ParticipantTestStats[];
  topWinner: ParticipantTestStats | null;
  topTotalWinner: ParticipantTestStats | null;
  topSimWinner: ParticipantTestStats | null;
  topPriorWinner: ParticipantTestStats | null;
  leastWinner: ParticipantTestStats | null;
  chiSquared: number;
  chiSquaredEvaluation: 'balanced' | 'natural_variance' | 'skewed_by_rules';
  antiRepetitionViolations: number;
  drawLog: DrawLogItem[];
  isStandard: boolean;
  activeItemsCount: number;
  baselineHistoryCount: number;
  historyScopeLabel: string;
}

export const runTestSimulation = (
  items: Item[],
  allResults: Result[],
  seasons: Season[],
  config: TestSimulationConfig,
  colors: string[] = []
): TestSimulationReport => {
  const startTime = performance.now();
  const validItems = items.filter((i) => i.enabled && i.text.trim() !== '');

  const scenario: 'current_season' | 'new_season' | 'all' = 
    config.simulationScenario || 
    (config.historyScope === 'none' ? 'new_season' : (config.historyScope || 'current_season'));
  
  const algorithmScope: 'current_season' | 'all' = 
    config.balanceScope || 'current_season';

  const currentSeason = getCurrentSeason(seasons);
  const currentSeasonResults = filterResultsByScope(allResults, seasons, 'current_season');

  // 1. Determine baseline results for display, table stats and accounting based on scenario
  let baselineResults: Result[] = [];
  let scenarioLabel = '';

  if (scenario === 'current_season') {
    baselineResults = currentSeasonResults;
    scenarioLabel = `Continuação da Temporada Atual (${currentSeason?.name || 'Ativa'})`;
  } else if (scenario === 'new_season') {
    baselineResults = []; // Nova temporada simulada do zero!
    scenarioLabel = 'Nova Temporada (Simulada do Zero)';
  } else {
    baselineResults = allResults;
    scenarioLabel = 'Histórico Geral Acumulado';
  }

  const priorDrawsCount = baselineResults.length;
  const historyScopeLabel = scenarioLabel;

  if (validItems.length < 2) {
    return {
      config,
      simulationScenario: scenario,
      balanceScope: algorithmScope,
      scenarioLabel,
      totalDraws: 0,
      priorDraws: priorDrawsCount,
      combinedTotalDraws: priorDrawsCount,
      executionTimeMs: 0,
      participantStats: [],
      topWinner: null,
      topTotalWinner: null,
      topSimWinner: null,
      leastWinner: null,
      topPriorWinner: null,
      chiSquared: 0,
      chiSquaredEvaluation: 'natural_variance',
      antiRepetitionViolations: 0,
      drawLog: [],
      isStandard: config.mode === 'standard',
      activeItemsCount: validItems.length,
      baselineHistoryCount: priorDrawsCount,
      historyScopeLabel,
    };
  }

  // Calculate theoretical base probability
  const totalBaseWeight = validItems.reduce(
    (acc, item) => acc + (item.weight !== undefined && item.weight > 0 ? item.weight : 1),
    0
  );

  const itemColorMap = new Map<string, string>();
  validItems.forEach((item, idx) => {
    const itemColor = item.color || colors[idx % (colors.length || 1)] || '#3b82f6';
    itemColorMap.set(item.id, itemColor);
  });

  const totalRuns = Math.max(1, Math.min(config.drawCount, 50000));
  const isStandard = config.mode === 'standard';

  // Count prior wins for each participant in baselineResults (season or scenario accounting)
  const priorWinsMap = new Map<string, number>();
  validItems.forEach((item) => {
    const itemText = item.text.trim().toLowerCase();
    const count = baselineResults.filter(
      (r) => r.id === item.id || r.text.trim().toLowerCase() === itemText
    ).length;
    priorWinsMap.set(item.id, count);
  });

  // State trackers per participant in the simulation run
  const simulatedWinsMap = new Map<string, number>();
  const currentStreakMap = new Map<string, number>();
  const maxStreakMap = new Map<string, number>();
  const currentDrySpellMap = new Map<string, number>();
  const maxDrySpellMap = new Map<string, number>();
  const firstEliminatedMap = new Map<string, number>();
  const rankSumMap = new Map<string, number>();

  validItems.forEach((item) => {
    simulatedWinsMap.set(item.id, 0);
    currentStreakMap.set(item.id, 0);
    maxStreakMap.set(item.id, 0);
    currentDrySpellMap.set(item.id, 0);
    maxDrySpellMap.set(item.id, 0);
    firstEliminatedMap.set(item.id, 0);
    rankSumMap.set(item.id, 0);
  });

  const drawLog: DrawLogItem[] = [];
  let antiRepetitionViolations = 0;

  // 1. Populate drawLog with prior baseline results (reverse to get chronological order)
  const chronologicalPrior = [...baselineResults].reverse();
  const priorLogLimit = Math.min(300, chronologicalPrior.length);

  const lastPriorWinOrderMap = new Map<string, number>();
  const lastPriorWinTimestampMap = new Map<string, number>();

  for (let i = 0; i < chronologicalPrior.length; i++) {
    const r = chronologicalPrior[i];
    const item = validItems.find(
      (it) => it.id === r.id || it.text.trim().toLowerCase() === r.text.trim().toLowerCase()
    );
    if (item) {
      lastPriorWinOrderMap.set(item.id, i + 1);
      if (r.timestamp) {
        lastPriorWinTimestampMap.set(item.id, r.timestamp);
      }
    }
  }

  // Track the latest win order and timestamp across all draws (prior + simulated)
  const lastTotalWinOrderMap = new Map<string, number>(lastPriorWinOrderMap);
  const lastWinTimestampMap = new Map<string, number>(lastPriorWinTimestampMap);
  const lastSimWinOrderMap = new Map<string, number>();

  for (let i = 0; i < priorLogLimit; i++) {
    const r = chronologicalPrior[i];
    drawLog.push({
      drawId: `prior-${i + 1}`,
      globalOrder: i + 1,
      typeOrder: i + 1,
      type: 'prior',
      label: scenario === 'current_season' ? 'Temporada (Prévio)' : 'Geral (Prévio)',
      winnerId: r.id,
      winnerText: r.text,
      winnerColor: itemColorMap.get(r.id) || '#64748b',
      timestamp: r.timestamp,
    });
  }

  // 2. Determine initial history fed to algorithm for weight, pity, and anti-repetition generation
  // "nos parametros é só um indicador pra saber se ta contando o da temporada vigente ou o geral"
  let initialAlgorithmHistory: Result[] = [];
  if (algorithmScope === 'all') {
    initialAlgorithmHistory = [...allResults];
  } else {
    // algorithmScope === 'current_season'
    if (scenario === 'new_season') {
      // In a simulated brand new season, the season starts with 0 history
      initialAlgorithmHistory = [];
    } else {
      initialAlgorithmHistory = [...currentSeasonResults];
    }
  }

  if (isStandard) {
    // Standard sequential draws: algorithm history accumulates newly drawn results
    let simulatedAlgorithmHistory: Result[] = [...initialAlgorithmHistory];

    for (let drawIndex = 1; drawIndex <= totalRuns; drawIndex++) {
      const weightedItems = calculateWeights(
        validItems,
        simulatedAlgorithmHistory,
        config.pitySystemEnabled,
        config.balanceWeightsByWins,
        config.balanceWeightsMode,
        config.ignoreNewItemWeight,
        config.newItemWeightMode,
        config.antiRepetitionEnabled,
        config.antiRepetitionCount,
        false,
        config.wheelType,
        true
      );

      let recentWinnersSlice: Result[] = [];
      if (config.antiRepetitionEnabled && validItems.length > 2) {
        const numRecentToCheck = Math.min(
          config.antiRepetitionCount,
          Math.max(1, validItems.length - 2)
        );
        recentWinnersSlice = simulatedAlgorithmHistory.slice(0, numRecentToCheck);
      }

      let totalWeight = weightedItems.reduce(
        (sum, item) => sum + (item.weight > 0 ? item.weight : 0),
        0
      );

      let winnerItem: Item;
      if (totalWeight <= 0) {
        winnerItem = validItems[Math.floor(getSecureRandom() * validItems.length)];
      } else {
        const rand = getSecureRandom() * totalWeight;
        let cumulative = 0;
        let picked = weightedItems[0];
        for (let i = 0; i < weightedItems.length; i++) {
          const w = weightedItems[i].weight > 0 ? weightedItems[i].weight : 0;
          cumulative += w;
          if (rand <= cumulative && w > 0) {
            picked = weightedItems[i];
            break;
          }
        }
        winnerItem = picked;
      }

      if (
        config.antiRepetitionEnabled &&
        recentWinnersSlice.length > 0 &&
        recentWinnersSlice.some(
          (r) =>
            r.id === winnerItem.id ||
            r.text.trim().toLowerCase() === winnerItem.text.trim().toLowerCase()
        )
      ) {
        antiRepetitionViolations++;
      }

      validItems.forEach((item) => {
        if (item.id === winnerItem.id) {
          simulatedWinsMap.set(item.id, (simulatedWinsMap.get(item.id) || 0) + 1);
          lastSimWinOrderMap.set(item.id, drawIndex);
          lastTotalWinOrderMap.set(item.id, priorDrawsCount + drawIndex);
          const newStreak = (currentStreakMap.get(item.id) || 0) + 1;
          currentStreakMap.set(item.id, newStreak);
          if (newStreak > (maxStreakMap.get(item.id) || 0)) {
            maxStreakMap.set(item.id, newStreak);
          }
          currentDrySpellMap.set(item.id, 0);
        } else {
          currentStreakMap.set(item.id, 0);
          const newDrySpell = (currentDrySpellMap.get(item.id) || 0) + 1;
          currentDrySpellMap.set(item.id, newDrySpell);
          if (newDrySpell > (maxDrySpellMap.get(item.id) || 0)) {
            maxDrySpellMap.set(item.id, newDrySpell);
          }
        }
      });

      const simTimestamp = Date.now() - (totalRuns - drawIndex) * 100;
      lastWinTimestampMap.set(winnerItem.id, simTimestamp);

      const simResult: Result = {
        ...winnerItem,
        drawId: `test-${drawIndex}`,
        type: 'winner',
        timestamp: simTimestamp,
      };

      if (simulatedAlgorithmHistory.length > 250) {
        simulatedAlgorithmHistory = [simResult, ...simulatedAlgorithmHistory.slice(0, 249)];
      } else {
        simulatedAlgorithmHistory = [simResult, ...simulatedAlgorithmHistory];
      }

      if (drawIndex <= 500) {
        drawLog.push({
          drawId: `sim-${drawIndex}`,
          globalOrder: priorLogLimit + drawIndex,
          typeOrder: drawIndex,
          type: 'simulated',
          label: 'Sorteio Atual (Teste)',
          winnerId: winnerItem.id,
          winnerText: winnerItem.text,
          winnerColor: itemColorMap.get(winnerItem.id) || '#a855f7',
        });
      }
    }
  } else {
    // Elimination tournaments
    for (let tourneyIndex = 1; tourneyIndex <= totalRuns; tourneyIndex++) {
      let pool = [...validItems];
      let round = 1;

      while (pool.length > 1) {
        let totalPoolWeight = pool.reduce(
          (sum, item) => sum + (item.weight !== undefined && item.weight > 0 ? item.weight : 1),
          0
        );

        const rand = getSecureRandom() * totalPoolWeight;
        let cumulative = 0;
        let eliminatedIndex = 0;

        for (let i = 0; i < pool.length; i++) {
          const w = pool[i].weight !== undefined && pool[i].weight > 0 ? pool[i].weight : 1;
          cumulative += w;
          if (rand <= cumulative) {
            eliminatedIndex = i;
            break;
          }
        }

        const eliminatedItem = pool[eliminatedIndex];

        if (round === 1) {
          firstEliminatedMap.set(
            eliminatedItem.id,
            (firstEliminatedMap.get(eliminatedItem.id) || 0) + 1
          );
        }

        const currentRank = pool.length;
        rankSumMap.set(
          eliminatedItem.id,
          (rankSumMap.get(eliminatedItem.id) || 0) + currentRank
        );

        pool.splice(eliminatedIndex, 1);
        round++;
      }

      const grandWinner = pool[0];
      simulatedWinsMap.set(grandWinner.id, (simulatedWinsMap.get(grandWinner.id) || 0) + 1);
      lastSimWinOrderMap.set(grandWinner.id, tourneyIndex);
      lastTotalWinOrderMap.set(grandWinner.id, priorDrawsCount + tourneyIndex);
      rankSumMap.set(grandWinner.id, (rankSumMap.get(grandWinner.id) || 0) + 1);

      if (tourneyIndex <= 500) {
        drawLog.push({
          drawId: `sim-${tourneyIndex}`,
          globalOrder: priorLogLimit + tourneyIndex,
          typeOrder: tourneyIndex,
          type: 'simulated',
          label: 'Sorteio Atual (Teste)',
          winnerId: grandWinner.id,
          winnerText: grandWinner.text,
          winnerColor: itemColorMap.get(grandWinner.id) || '#10b981',
        });
      }
    }
  }

  const combinedTotalDraws = priorDrawsCount + totalRuns;

  // Final Stats compilation with explicit separation of prior and current test data
  const participantStats: ParticipantTestStats[] = validItems.map((item, idx) => {
    const priorWins = priorWinsMap.get(item.id) || 0;
    const simulatedWins = simulatedWinsMap.get(item.id) || 0;
    const totalWins = priorWins + simulatedWins;

    const initialWeight = item.weight !== undefined && item.weight > 0 ? item.weight : 1;
    const expectedChance = Number(((initialWeight / totalBaseWeight) * 100).toFixed(2));
    
    const simulatedWinPercentage = Number(((simulatedWins / totalRuns) * 100).toFixed(2));
    const priorWinPercentage = priorDrawsCount > 0 
      ? Number(((priorWins / priorDrawsCount) * 100).toFixed(2)) 
      : 0;
    const totalWinPercentage = combinedTotalDraws > 0
      ? Number(((totalWins / combinedTotalDraws) * 100).toFixed(2))
      : 0;

    const simulatedDelta = Number((simulatedWinPercentage - expectedChance).toFixed(2));
    const totalDelta = Number((totalWinPercentage - expectedChance).toFixed(2));

    const stats: ParticipantTestStats = {
      id: item.id,
      text: item.text,
      color: itemColorMap.get(item.id) || '#3b82f6',
      itemIndex: idx,
      initialWeight,
      expectedChance,
      priorWins,
      simulatedWins,
      totalWins,
      winCount: totalWins,
      priorWinPercentage,
      simulatedWinPercentage,
      totalWinPercentage,
      winPercentage: totalWinPercentage,
      delta: simulatedDelta,
      simulatedDelta,
      totalDelta,
      maxStreak: maxStreakMap.get(item.id) || 0,
      maxDrySpell: maxDrySpellMap.get(item.id) || 0,
      lastTotalWinOrder: lastTotalWinOrderMap.get(item.id) ?? null,
      lastSimWinOrder: lastSimWinOrderMap.get(item.id) ?? null,
      lastPriorWinOrder: lastPriorWinOrderMap.get(item.id) ?? null,
      lastWinTimestamp: lastWinTimestampMap.get(item.id) ?? null,
      firstSeenTimestamp: null,
    };

    if (!isStandard) {
      stats.firstEliminatedCount = firstEliminatedMap.get(item.id) || 0;
      stats.averageRank = Number(((rankSumMap.get(item.id) || 0) / totalRuns).toFixed(2));
    }

    return stats;
  });

  // Calculate Chi-squared goodness of fit
  let chiSquared = 0;
  participantStats.forEach((p) => {
    const expectedWins = (p.expectedChance / 100) * totalRuns;
    if (expectedWins > 0) {
      chiSquared += Math.pow(p.simulatedWins - expectedWins, 2) / expectedWins;
    }
  });
  chiSquared = Number(chiSquared.toFixed(2));

  let chiSquaredEvaluation: 'balanced' | 'natural_variance' | 'skewed_by_rules' = 'natural_variance';
  if (config.pitySystemEnabled || config.balanceWeightsByWins || config.antiRepetitionEnabled) {
    chiSquaredEvaluation = 'skewed_by_rules';
  } else {
    const df = validItems.length - 1;
    if (chiSquared <= df * 1.5) {
      chiSquaredEvaluation = 'balanced';
    } else {
      chiSquaredEvaluation = 'natural_variance';
    }
  }

  // Calculate top winners across different dimensions using ranking tiebreaker criteria
  const sortedByTotalWins = [...participantStats].sort(compareTestParticipantsByTotalWins);
  const topTotalWinner = sortedByTotalWins[0] || null;

  const sortedBySimWins = [...participantStats].sort(compareTestParticipantsBySimulatedWins);
  const topSimWinner = sortedBySimWins[0] || null;
  const leastWinner = sortedBySimWins[sortedBySimWins.length - 1] || null;

  const sortedByPriorWins = [...participantStats].sort(compareTestParticipantsByPriorWins);
  const topPriorWinner = sortedByPriorWins[0] || null;

  // topWinner is overall top if prior results exist, else simulated top
  const topWinner = (priorDrawsCount > 0 ? topTotalWinner : topSimWinner) || null;

  const executionTimeMs = Number((performance.now() - startTime).toFixed(1));

  return {
    config,
    simulationScenario: scenario,
    balanceScope: algorithmScope,
    scenarioLabel,
    totalDraws: totalRuns,
    priorDraws: priorDrawsCount,
    combinedTotalDraws,
    executionTimeMs,
    participantStats,
    topWinner,
    topTotalWinner,
    topSimWinner,
    leastWinner,
    topPriorWinner,
    chiSquared,
    chiSquaredEvaluation,
    antiRepetitionViolations,
    drawLog,
    isStandard,
    activeItemsCount: validItems.length,
    baselineHistoryCount: priorDrawsCount,
    historyScopeLabel,
  };
};
