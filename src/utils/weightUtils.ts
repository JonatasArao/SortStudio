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

  // 1. Identify participants excluded by the anti-repetition system.
  // CRITICAL: Weights of hidden participants (anti-repetition) MUST NOT be included
  // in comparisons or equalization of new participants.
  let recentWinnersSlice: Result[] = [];
  if (antiRepetitionEnabled && !eliminationMode && items.length > 2) {
    const numRecentToCheck = Math.min(antiRepetitionCount, Math.max(1, items.length - 2));
    recentWinnersSlice = scopedResults.slice(0, numRecentToCheck);
  }

  const isAntiRepetitionExcluded = (item: Item) => {
    if (recentWinnersSlice.length === 0) return false;
    const itemText = item.text.trim().toLowerCase();
    return recentWinnersSlice.some(
      (r) => r.id === item.id || r.text.trim().toLowerCase() === itemText
    );
  };

  // 2. Separate items into valid drawn vs new, computing weights for valid drawn items only.
  const validDrawnWeights: number[] = [];

  const intermediateItems = items.map(item => {
    const isExcluded = isAntiRepetitionExcluded(item);
    if (isExcluded) {
      return {
        item,
        isExcluded: true,
        hasBeenDrawn: false,
        finalWeight: 0
      };
    }

    let finalWeight = item.weight !== undefined ? item.weight : 1;
    const itemText = item.text.trim().toLowerCase();
    const idx = scopedResults.findIndex((r) => 
      r.id === item.id || r.text.trim().toLowerCase() === itemText
    );

    const hasBeenDrawn = idx !== -1;

    if (pitySystemEnabled) {
      if (hasBeenDrawn) {
        finalWeight += idx;
      }
    }

    if (balanceWeightsByWins) {
      const winCount = scopedResults.filter((r) => r.id === item.id || r.text.trim().toLowerCase() === itemText).length;
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

    finalWeight = Number(finalWeight.toFixed(2));

    // Only active, valid (non-excluded) participants are considered in drawn weights
    if (hasBeenDrawn && finalWeight > 0) {
      validDrawnWeights.push(finalWeight);
    }

    return {
      item,
      isExcluded: false,
      hasBeenDrawn,
      finalWeight
    };
  });

  // 3. Calculate matched weight using ONLY valid drawn items (excluding anti-repetition hidden participants)
  let matchedWeight = 0;
  const hasValidDrawnItems = validDrawnWeights.length > 0;

  if (hasValidDrawnItems) {
    validDrawnWeights.sort((a, b) => a - b);
    const minDrawnWeight = validDrawnWeights[0];
    const maxDrawnWeight = validDrawnWeights[validDrawnWeights.length - 1];
    
    let medianDrawnWeight = 0;
    const mid = Math.floor(validDrawnWeights.length / 2);
    if (validDrawnWeights.length % 2 === 0) {
      medianDrawnWeight = (validDrawnWeights[mid - 1] + validDrawnWeights[mid]) / 2;
    } else {
      medianDrawnWeight = validDrawnWeights[mid];
    }
    
    const sumDrawnWeight = validDrawnWeights.reduce((acc, w) => acc + w, 0);
    const averageDrawnWeight = sumDrawnWeight / validDrawnWeights.length;

    switch (newItemWeightMode) {
      case 'boosted':
        // Boost: +20% over the highest valid drawn participant (no flat +1)
        matchedWeight = Number((maxDrawnWeight * 1.20).toFixed(2));
        break;
      case 'median':
        matchedWeight = Number(medianDrawnWeight.toFixed(2));
        break;
      case 'average':
        matchedWeight = Number(averageDrawnWeight.toFixed(2));
        break;
      case 'min':
        matchedWeight = Number(minDrawnWeight.toFixed(2));
        break;
      case 'base':
        matchedWeight = 1;
        break;
      case 'max':
      default:
        matchedWeight = Number(maxDrawnWeight.toFixed(2));
        break;
    }
  }

  // 4. Assign tentative weights to new participants
  const intermediateWithWeights = intermediateItems.map(entry => {
    if (entry.isExcluded) {
      return { ...entry, tentativeWeight: 0 };
    }

    if (!entry.hasBeenDrawn) {
      let weightToApply = entry.item.weight !== undefined ? entry.item.weight : 1;
      if (pitySystemEnabled) {
        if (ignoreNewItemWeight) {
          if (newItemWeightMode === 'base') {
            weightToApply = entry.item.weight !== undefined ? entry.item.weight : 1;
          } else {
            weightToApply = hasValidDrawnItems ? matchedWeight : (entry.item.weight !== undefined ? entry.item.weight : 1);
          }
        } else {
          weightToApply = (entry.item.weight !== undefined ? entry.item.weight : 1) + scopedResults.length;
        }
      }
      return { ...entry, tentativeWeight: Number(weightToApply.toFixed(2)) };
    }

    return { ...entry, tentativeWeight: entry.finalWeight };
  });

  // 5. Enforce that newly equalized participants cannot exceed 50% of the total chances
  // compared to all valid active participants (excluding anti-repetition hidden participants).
  return intermediateWithWeights.map((curr, idx, all) => {
    if (curr.isExcluded) {
      return {
        ...curr.item,
        weight: 0
      };
    }

    let finalWeight = curr.tentativeWeight;

    // Apply the 50% maximum chance cap on new participants equalized by pity
    if (!curr.hasBeenDrawn && pitySystemEnabled) {
      const otherValidWeightsSum = all.reduce((sum, other, j) => {
        if (idx === j || other.isExcluded) return sum;
        return sum + other.tentativeWeight;
      }, 0);

      // If weight exceeds the sum of all other valid participants, chance would exceed 50%.
      // We cap the weight at otherValidWeightsSum so chance is at most 50%.
      if (otherValidWeightsSum > 0 && finalWeight > otherValidWeightsSum) {
        finalWeight = Number(otherValidWeightsSum.toFixed(2));
      }
    }

    return {
      ...curr.item,
      weight: finalWeight
    };
  });
};
