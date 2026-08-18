export const getSpinTimeRanges = (type: string, isEliminationFast = false) => {
  switch (type) {
    case 'race':
      return { min: isEliminationFast ? 15 : 20, max: 60, step: 5 };
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
