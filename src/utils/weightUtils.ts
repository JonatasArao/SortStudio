import { Result, Item } from '../types';

export const calculateWeights = (
  items: Item[],
  scopedResults: Result[],
  pitySystemEnabled: boolean,
  balanceWeightsByWins: boolean,
  ignoreNewItemWeight: boolean,
  newItemWeightMode: 'max' | 'median' | 'average' | 'min' | 'base',
  eliminationMode: boolean,
  wheelType: string,
  applyPityAndBalance: boolean
): (Item & { weight: number })[] => {
  if (eliminationMode || wheelType === 'horizon' || !applyPityAndBalance) {
    return items.map(i => ({ ...i, weight: wheelType === 'horizon' ? 1 : (i.weight || 1) }));
  }

  let maxDrawnWeight = 0;
  let hasDrawnItems = false;
  const drawnWeights: number[] = [];

  const intermediateItems = items.map(item => {
    let finalWeight = item.weight || 1;
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
        finalWeight = finalWeight / (winCount + 1);
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

  return intermediateItems.map(({ item, finalWeight, hasBeenDrawn }) => {
    let weightToApply = finalWeight;

    if (!hasBeenDrawn) {
      if (pitySystemEnabled) {
        if (ignoreNewItemWeight) {
          if (newItemWeightMode === 'base') {
            weightToApply = item.weight || 1;
          } else {
            weightToApply = hasDrawnItems ? matchedWeight : (item.weight || 1);
          }
        } else {
          weightToApply = (item.weight || 1) + scopedResults.length;
        }
      }
    }

    return {
      ...item,
      weight: weightToApply
    };
  });
};
