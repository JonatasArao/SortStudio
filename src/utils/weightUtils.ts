import { Result, Item } from '../types';

export const calculateWeights = (
  items: Item[],
  scopedResults: Result[],
  pitySystemEnabled: boolean,
  balanceWeightsByWins: boolean,
  balanceWeightsMode: 'linear' | 'quadratic' | 'cubic',
  ignoreNewItemWeight: boolean,
  newItemWeightMode: 'boosted' | 'max' | 'median' | 'average' | 'min' | 'base',
  antiRepetitionEnabled: boolean,
  antiRepetitionCount: number,
  eliminationMode: boolean,
  wheelType: string,
  applyPityAndBalance: boolean
): (Item & { weight: number })[] => {
  if (eliminationMode || wheelType === 'horizon' || !applyPityAndBalance) {
    return items.map(i => ({ ...i, weight: wheelType === 'horizon' ? 1 : (i.weight !== undefined ? i.weight : 1) }));
  }

  let maxDrawnWeight = 0;
  let hasDrawnItems = false;
  const drawnWeights: number[] = [];

  const intermediateItems = items.map(item => {
    let finalWeight = item.weight !== undefined ? item.weight : 1;
    let extraWeight = 0;
    
    const idx = scopedResults.findIndex((r) => 
      r.id === item.id || r.text.trim().toLowerCase() === item.text.trim().toLowerCase()
    );

    const hasBeenDrawn = idx !== -1;

    if (pitySystemEnabled) {
      if (hasBeenDrawn) {
        extraWeight = idx;
      }
      finalWeight += extraWeight;
    }

    if (balanceWeightsByWins) {
      const winCount = scopedResults.filter((r) => r.id === item.id || r.text.trim().toLowerCase() === item.text.trim().toLowerCase()).length;
      if (winCount > 0) {
        if (balanceWeightsMode === 'linear') {
          finalWeight = finalWeight / (winCount + 1);
        } else if (balanceWeightsMode === 'cubic') {
          finalWeight = finalWeight / Math.pow(winCount + 1, 3);
        } else {
          finalWeight = finalWeight / Math.pow(winCount + 1, 2);
        }
      }
    }

    if (hasBeenDrawn) {
      hasDrawnItems = true;
      drawnWeights.push(finalWeight);
      if (finalWeight > maxDrawnWeight) {
        maxDrawnWeight = finalWeight;
      }
    }

    return {
      item,
      finalWeight,
      hasBeenDrawn
    };
  });

  let matchedWeight = 0;
  if (hasDrawnItems && drawnWeights.length > 0) {
    drawnWeights.sort((a, b) => a - b);
    const minDrawnWeight = drawnWeights[0];
    
    let medianDrawnWeight = 0;
    const mid = Math.floor(drawnWeights.length / 2);
    if (drawnWeights.length % 2 === 0) {
      medianDrawnWeight = (drawnWeights[mid - 1] + drawnWeights[mid]) / 2;
    } else {
      medianDrawnWeight = drawnWeights[mid];
    }
    
    const sumDrawnWeight = drawnWeights.reduce((acc, w) => acc + w, 0);
    const averageDrawnWeight = sumDrawnWeight / drawnWeights.length;

    switch (newItemWeightMode) {
      case 'boosted':
        // A bump of ~30% over the highest weight plus a flat +1 to guarantee an edge even at low weights
        matchedWeight = Math.ceil(maxDrawnWeight * 1.3) + 1;
        break;
      case 'median':
        matchedWeight = medianDrawnWeight;
        break;
      case 'average':
        matchedWeight = averageDrawnWeight;
        break;
      case 'min':
        matchedWeight = minDrawnWeight;
        break;
      case 'max':
      default:
        matchedWeight = maxDrawnWeight;
        break;
    }
  }

  let recentWinnersTexts: string[] = [];
  if (antiRepetitionEnabled && !eliminationMode && items.length > 2) {
    const numRecentToCheck = Math.min(antiRepetitionCount, Math.max(1, items.length - 2));
    recentWinnersTexts = scopedResults.slice(0, numRecentToCheck).map((r) => r.text.trim().toLowerCase());
  }

  return intermediateItems.map(({ item, finalWeight, hasBeenDrawn }) => {
    let weightToApply = finalWeight;

    if (!hasBeenDrawn) {
      if (pitySystemEnabled) {
        if (ignoreNewItemWeight) {
          if (newItemWeightMode === 'base') {
            weightToApply = item.weight !== undefined ? item.weight : 1;
          } else {
            weightToApply = hasDrawnItems ? matchedWeight : (item.weight !== undefined ? item.weight : 1);
          }
        } else {
          weightToApply = (item.weight !== undefined ? item.weight : 1) + scopedResults.length;
        }
      }
    }

    if (recentWinnersTexts.includes(item.text.trim().toLowerCase())) {
      weightToApply = 0;
    }

    return {
      ...item,
      weight: weightToApply
    };
  });
};
