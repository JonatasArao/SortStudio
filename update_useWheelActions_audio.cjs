const fs = require('fs');

let content = fs.readFileSync('src/hooks/useWheelActions.ts', 'utf8');

content = content.replace(
  "const actualSpinTime = state.spinTime;",
  `let actualSpinTime = state.spinTime;
    const isFinalRound = state.eliminationMode && state.items.filter(i => i.enabled && !i.isEliminated).length === 2;
    const isElimFast = !isFinalRound && state.eliminationMode;
    const spinRangeAudio = getSpinTimeRanges(state.wheelType, isElimFast);
    actualSpinTime = isElimFast ? state.eliminationSpinTime : state.spinTime;
    actualSpinTime = Math.max(spinRangeAudio.min, Math.min(spinRangeAudio.max, actualSpinTime));`
);

fs.writeFileSync('src/hooks/useWheelActions.ts', content);
