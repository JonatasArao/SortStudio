const fs = require('fs');

let content = fs.readFileSync('src/hooks/useWheelActions.ts', 'utf8');

if (!content.includes('import { getSpinTimeRanges }')) {
  content = content.replace("import { getSecureRandom, getRandomElement } from '../utils/cryptoRandom';", "import { getSecureRandom, getRandomElement } from '../utils/cryptoRandom';\nimport { getSpinTimeRanges } from '../utils/spinUtils';");
}

content = content.replace(
  "const actualSpinTime = isFinalRound \n      ? state.spinTime \n      : (state.eliminationMode ? state.eliminationSpinTime : state.spinTime);",
  `let actualSpinTime = isFinalRound 
      ? state.spinTime 
      : (state.eliminationMode ? state.eliminationSpinTime : state.spinTime);

    const spinRange = getSpinTimeRanges(state.wheelType, !isFinalRound && state.eliminationMode);
    actualSpinTime = Math.max(spinRange.min, Math.min(spinRange.max, actualSpinTime));`
);

fs.writeFileSync('src/hooks/useWheelActions.ts', content);
