const fs = require('fs');

let content = fs.readFileSync('src/components/organisms/settings/GeneralSettings.tsx', 'utf8');

content = content.replace("import React from 'react';", "import React, { useEffect, useMemo } from 'react';");

const rangeLogic = `
  const getSpinTimeRanges = (type: string, isEliminationFast = false) => {
    switch (type) {
      case 'race':
        return { min: isEliminationFast ? 15 : 20, max: 120, step: 5 };
      case 'penalty_shootout':
        return { min: isEliminationFast ? 3 : 5, max: 30, step: 1 };
      case 'mystery_box':
        return { min: isEliminationFast ? 1 : 2, max: 30, step: 1 };
      case 'bingo':
        return { min: isEliminationFast ? 1 : 2, max: 30, step: 1 };
      case 'horizon':
      case 'classic':
      default:
        return { min: isEliminationFast ? 0.5 : 1, max: 30, step: isEliminationFast ? 0.5 : 1 };
    }
  };

  const spinRange = useMemo(() => getSpinTimeRanges(wheelType, false), [wheelType]);
  const elimSpinRange = useMemo(() => getSpinTimeRanges(wheelType, true), [wheelType]);

  useEffect(() => {
    if (spinTime < spinRange.min) setSpinTime(spinRange.min);
    else if (spinTime > spinRange.max) setSpinTime(spinRange.max);
    
    if (eliminationSpinTime < elimSpinRange.min) setEliminationSpinTime(elimSpinRange.min);
    else if (eliminationSpinTime > elimSpinRange.max) setEliminationSpinTime(elimSpinRange.max);
  }, [wheelType, spinRange, elimSpinRange, spinTime, eliminationSpinTime, setSpinTime, setEliminationSpinTime]);
`;

content = content.replace("  const setPenaltySaveWins = useAppStore(s => s.setPenaltySaveWins);", "  const setPenaltySaveWins = useAppStore(s => s.setPenaltySaveWins);\n" + rangeLogic);

content = content.replace(
  /<input type="range" min="1" max="30" value=\{spinTime\} onChange=\{\(e\) => setSpinTime\(Number\(e\.target\.value\)\)\} className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500 mt-3" \/>/g,
  `<input type="range" min={spinRange.min} max={spinRange.max} step={spinRange.step} value={spinTime} onChange={(e) => setSpinTime(Number(e.target.value))} className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500 mt-3" />`
);

content = content.replace(
  /<input type="range" min="0\.5" max="30" step="0\.5" value=\{eliminationSpinTime\} onChange=\{\(e\) => setEliminationSpinTime\(Number\(e\.target\.value\)\)\} className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-red-500" \/>/g,
  `<input type="range" min={elimSpinRange.min} max={elimSpinRange.max} step={elimSpinRange.step} value={eliminationSpinTime} onChange={(e) => setEliminationSpinTime(Number(e.target.value))} className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-red-500 mt-3" />`
);

fs.writeFileSync('src/components/organisms/settings/GeneralSettings.tsx', content);
