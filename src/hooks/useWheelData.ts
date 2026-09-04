import { useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { FULL_CIRCLE_DEG } from '../constants';
import { filterResultsByScope } from '../utils/seasonUtils';
import { calculateWeights } from '../utils/weightUtils';

export const useWheelData = () => {
  const items = useAppStore(state => state.items);
  const colors = useAppStore(state => state.colors);
  const balanceWeightsByWins = useAppStore(state => state.balanceWeightsByWins);
  const balanceWeightsMode = useAppStore(state => state.balanceWeightsMode);
  const balanceScope = useAppStore(state => state.balanceScope);
  const seasons = useAppStore(state => state.seasons);
  const pitySystemEnabled = useAppStore(state => state.pitySystemEnabled);
  const ignoreNewItemWeight = useAppStore(state => state.ignoreNewItemWeight);
  const newItemWeightMode = useAppStore(state => state.newItemWeightMode);
  const antiRepetitionEnabled = useAppStore(state => state.antiRepetitionEnabled);
  const antiRepetitionCount = useAppStore(state => state.antiRepetitionCount);
  const showPitySystemVisually = useAppStore(state => state.showPitySystemVisually);
  const eliminationMode = useAppStore(state => state.eliminationMode);
  const results = useAppStore(state => state.results);
  const wheelType = useAppStore(state => state.wheelType);

  const scopedResults = useMemo(() => filterResultsByScope(results, seasons, balanceScope), [results, seasons, balanceScope]);

  const validItems = useMemo(
    () => {
      const filtered = items.filter((i) => i.text.trim() !== "" && i.enabled);
      return calculateWeights(
        filtered,
        scopedResults,
        pitySystemEnabled,
        balanceWeightsByWins,
        balanceWeightsMode,
        ignoreNewItemWeight,
        newItemWeightMode,
        antiRepetitionEnabled,
        antiRepetitionCount,
        eliminationMode,
        wheelType,
        showPitySystemVisually
      );
    },
    [items, pitySystemEnabled, balanceWeightsByWins,
        balanceWeightsMode, showPitySystemVisually, eliminationMode, scopedResults, wheelType, ignoreNewItemWeight, newItemWeightMode, antiRepetitionEnabled, antiRepetitionCount],
  );

  const { conicGradient, slices } = useMemo(() => {
    const drawableItems = validItems.filter(i => (i.weight !== undefined ? i.weight : 1) > 0);
    const total = drawableItems.length;
    if (total === 0 || colors.length === 0)
      return { conicGradient: "#1e293b", slices: [] };

    let totalWeight = drawableItems.reduce(
      (acc, item) => acc + (item.weight !== undefined ? item.weight : 1),
      0,
    );
    if (totalWeight <= 0) totalWeight = 1;

    let currentAngle = 0;
    const newSlices = drawableItems.map((item, i) => {
      const weight = item.weight !== undefined ? item.weight : 1;
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
