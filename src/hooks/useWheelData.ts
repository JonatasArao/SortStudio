import { useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { FULL_CIRCLE_DEG } from '../constants';
import { filterResultsByScope } from '../utils/seasonUtils';

export const useWheelData = () => {
  const items = useAppStore(state => state.items);
  const colors = useAppStore(state => state.colors);
  const balanceWeightsByWins = useAppStore(state => state.balanceWeightsByWins);
  const balanceScope = useAppStore(state => state.balanceScope);
  const seasons = useAppStore(state => state.seasons);
  const pitySystemEnabled = useAppStore(state => state.pitySystemEnabled);
  const showPitySystemVisually = useAppStore(state => state.showPitySystemVisually);
  const eliminationMode = useAppStore(state => state.eliminationMode);
  const results = useAppStore(state => state.results);

  const wheelType = useAppStore(state => state.wheelType);

  const scopedResults = useMemo(() => filterResultsByScope(results, seasons, balanceScope), [results, seasons, balanceScope]);
  const validItems = useMemo(
    () => items.filter((i) => i.text.trim() !== "" && i.enabled).map(i => {
      let finalWeight = wheelType === 'horizon' ? 1 : (i.weight || 1);
      let extraWeight = 0;
      if (pitySystemEnabled && showPitySystemVisually && !eliminationMode && wheelType !== 'horizon') {
        const idx = scopedResults.findIndex((r) => 
          r.id === i.id || r.text.trim().toLowerCase() === i.text.trim().toLowerCase()
        );
        extraWeight = idx === -1 ? scopedResults.length : idx;
        finalWeight += extraWeight;
      }
      
      if (balanceWeightsByWins && showPitySystemVisually && !eliminationMode && wheelType !== 'horizon') {
        const winCount = scopedResults.filter((r) => r.id === i.id || r.text.trim().toLowerCase() === i.text.trim().toLowerCase()).length;
        if (winCount > 0) {
           finalWeight = finalWeight / (winCount + 1);
        }
      }
      return {
        ...i,
        weight: finalWeight
      };
    }),
    [items, pitySystemEnabled, balanceWeightsByWins, showPitySystemVisually, eliminationMode, scopedResults, wheelType],
  );

  const { conicGradient, slices } = useMemo(() => {
    const total = validItems.length;
    if (total === 0 || colors.length === 0)
      return { conicGradient: "#1e293b", slices: [] };

    let totalWeight = validItems.reduce(
      (acc, item) => acc + (item.weight || 1),
      0,
    );
    if (totalWeight <= 0) totalWeight = 1;

    let currentAngle = 0;
    const newSlices = validItems.map((item, i) => {
      const weight = item.weight || 1;
      const angle = (weight / totalWeight) * FULL_CIRCLE_DEG;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;
      currentAngle = endAngle;
      return {
        item,
        startAngle,
        endAngle,
        angle,
        color: item.color || colors[i % colors.length],
        index: i,
      };
    });

    const gradientParts = newSlices.map(
      (s) => `${s.color} ${s.startAngle}deg ${s.endAngle}deg`,
    );
    return {
      conicGradient: `conic-gradient(${gradientParts.join(", ")})`,
      slices: newSlices,
    };
  }, [validItems, colors]);

  return { validItems, conicGradient, slices };
};
