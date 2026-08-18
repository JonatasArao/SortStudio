const fs = require('fs');

const files = [
  'src/components/organisms/RaceDisplay.tsx',
  'src/components/organisms/WheelDisplay.tsx',
  'src/components/organisms/HorizonDisplay.tsx',
  'src/components/organisms/MysteryBoxDisplay.tsx',
  'src/components/organisms/PenaltyShootoutDisplay.tsx',
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');

  if (!content.includes('import { getSpinTimeRanges }')) {
    content = content.replace("import { useAppStore } from '../../store/useAppStore';", "import { useAppStore } from '../../store/useAppStore';\nimport { getSpinTimeRanges } from '../../utils/spinUtils';");
  }

  // Common pattern for actualSpinTime
  content = content.replace(
    "const actualSpinTime = isFinalRound ? spinTime : (eliminationMode ? eliminationSpinTime : spinTime);",
    `let actualSpinTime = isFinalRound ? spinTime : (eliminationMode ? eliminationSpinTime : spinTime);\n  const spinRange = getSpinTimeRanges('race', !isFinalRound && eliminationMode);\n  actualSpinTime = Math.max(spinRange.min, Math.min(spinRange.max, actualSpinTime));`
  );
  
  // WheelDisplay pattern
  content = content.replace(
    `const actualSpinTime = isFinalRound \n    ? spinTime \n    : (eliminationMode ? eliminationSpinTime : spinTime);`,
    `let actualSpinTime = isFinalRound \n    ? spinTime \n    : (eliminationMode ? eliminationSpinTime : spinTime);\n  const spinRange = getSpinTimeRanges('classic', !isFinalRound && eliminationMode);\n  actualSpinTime = Math.max(spinRange.min, Math.min(spinRange.max, actualSpinTime));`
  );

  // HorizonDisplay pattern
  content = content.replace(
    `const actualSpinTime = isFinalRound \n    ? spinTime \n    : (eliminationMode ? eliminationSpinTime : spinTime);`,
    `let actualSpinTime = isFinalRound \n    ? spinTime \n    : (eliminationMode ? eliminationSpinTime : spinTime);\n  const spinRange = getSpinTimeRanges('horizon', !isFinalRound && eliminationMode);\n  actualSpinTime = Math.max(spinRange.min, Math.min(spinRange.max, actualSpinTime));`
  );

  // PenaltyShootoutDisplay pattern
  content = content.replace(
    `const actualSpinTime = eliminationMode ? eliminationSpinTime : spinTime;`,
    `let actualSpinTime = eliminationMode ? eliminationSpinTime : spinTime;\n  const spinRange = getSpinTimeRanges('penalty_shootout', eliminationMode);\n  actualSpinTime = Math.max(spinRange.min, Math.min(spinRange.max, actualSpinTime));`
  );

  // MysteryBox pattern
  content = content.replace(
    `const duration = (eliminationMode ? eliminationSpinTime : spinTime) * 1000;`,
    `let durationSec = eliminationMode ? eliminationSpinTime : spinTime;\n       const spinRange = getSpinTimeRanges('mystery_box', eliminationMode);\n       durationSec = Math.max(spinRange.min, Math.min(spinRange.max, durationSec));\n       const duration = durationSec * 1000;`
  );

  fs.writeFileSync(file, content);
}
