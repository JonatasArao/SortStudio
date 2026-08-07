import { Season, Result } from '../types';

export const getCurrentSeason = (seasons: Season[]): Season | null => {
  const now = Date.now();
  // Encontra a temporada ativa mais recente (revertendo o array)
  const current = [...seasons].reverse().find(s => s.startDate <= now && (!s.endDate || s.endDate > now));
  return current || null;
};

export const filterResultsByScope = (
  results: Result[],
  seasons: Season[],
  scope: 'all' | 'current_season'
): Result[] => {
  if (scope === 'all') return results;
  
  if (seasons.length === 0) {
    return results; // Se não houver temporadas, não filtra nada
  }

  const currentSeason = getCurrentSeason(seasons);
  if (!currentSeason) {
    // If we filter by current season but there is no current season
    return [];
  }

  const start = currentSeason.startDate;
  const end = currentSeason.endDate || Infinity;
  
  return results.filter(r => {
    const timestamp = r.timestamp || 0;
    return timestamp >= start && timestamp <= end;
  });
};
