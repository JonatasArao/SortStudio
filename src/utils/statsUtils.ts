import { Item, Result } from "../types";

export interface ParticipantStat {
  name: string;
  winsCount: number;
  lastWinTimestamp: number | null;
  firstSeenTimestamp: number | null;
  daysWithoutWin: number;
  drawsWithoutWin: number;
  maxDaysWithoutWin: number;
  avgDaysBetweenWins: number | null;
  maxDrawsWithoutWin: number;
  luckiestDayOfWeek: number | null;
  winRate: number;
  hasWon: boolean;
  isOnWheel: boolean;
  winTimestamps: number[];
}

export function getParticipantStats(
  items: Item[],
  results: Result[],
  referenceTimestamp?: number,
): ParticipantStat[] {
  const now = Date.now();
  const refTime = referenceTimestamp !== undefined ? referenceTimestamp : now;
  const todayStart = new Date(refTime).setHours(0, 0, 0, 0);

  let firstGlobalDrawTimestamp: number | null = null;
  if (results.length > 0) {
    firstGlobalDrawTimestamp = results.reduce((min, r) => {
      if (r.timestamp && r.timestamp < min) return r.timestamp;
      return min;
    }, results[0].timestamp || now);
  }

  const map = new Map<
    string,
    {
      displayName: string;
      winsCount: number;
      lastWinTimestamp: number | null;
      firstSeenTimestamp: number | null;
      hasWon: boolean;
      isOnWheel: boolean;
      winTimestamps: number[];
    }
  >();

  // 1. Collect from items currently on wheel
  items.forEach((item) => {
    const name = item.text.trim();
    const key = name.toLowerCase();
    const isOnWheel = item.enabled !== false;
    if (key && !map.has(key)) {
      map.set(key, {
        displayName: name,
        winsCount: 0,
        lastWinTimestamp: null,
        firstSeenTimestamp: null,
        hasWon: false,
        isOnWheel: isOnWheel,
        winTimestamps: [],
      });
    } else if (key && map.has(key)) {
      if (isOnWheel) {
        map.get(key)!.isOnWheel = true;
      }
    }
  });

  // 2. Process results (results is an array of draws)
  results.forEach((res) => {
    const name = res.text.trim();
    const key = name.toLowerCase();
    if (!key) return;
    if (!map.has(key)) {
      map.set(key, {
        displayName: name,
        winsCount: 0,
        lastWinTimestamp: null,
        firstSeenTimestamp: null,
        hasWon: false,
        isOnWheel: false,
        winTimestamps: [],
      });
    }

    const stat = map.get(key)!;
    const ts = res.timestamp || now;

    if (stat.firstSeenTimestamp === null || ts < stat.firstSeenTimestamp) {
      stat.firstSeenTimestamp = ts;
    }

    const isWin =
      res.type === "winner" || res.type === "grand_winner" || !res.type;
    if (isWin) {
      stat.winsCount++;
      stat.hasWon = true;
      if (ts !== null) {
        stat.winTimestamps.push(ts);
      }
      if (stat.lastWinTimestamp === null || ts > stat.lastWinTimestamp) {
        stat.lastWinTimestamp = ts;
      }
    }
  });

  const totalDraws = results.length;

  return Array.from(map.values()).map((stat) => {
    let daysWithoutWin = 0;
    let drawsWithoutWin = 0;

    if (stat.hasWon && stat.lastWinTimestamp !== null) {
      const winDayStart = new Date(stat.lastWinTimestamp).setHours(0, 0, 0, 0);
      const diffTime = todayStart - winDayStart;
      daysWithoutWin = Math.max(
        0,
        Math.floor(diffTime / (1000 * 60 * 60 * 24)),
      );

      // Count draws that occurred after this participant's last win
      let count = 0;
      for (let i = 0; i < results.length; i++) {
        const r = results[i];
        const rTs = r.timestamp || 0;
        if (rTs > stat.lastWinTimestamp) {
          count++;
        } else {
          break;
        }
      }
      drawsWithoutWin = count;
    } else {
      drawsWithoutWin = totalDraws;
      const baseTimestamp =
        firstGlobalDrawTimestamp !== null
          ? firstGlobalDrawTimestamp
          : stat.firstSeenTimestamp;
      if (baseTimestamp !== null) {
        const firstDayStart = new Date(baseTimestamp).setHours(0, 0, 0, 0);
        const diffTime = todayStart - firstDayStart;
        daysWithoutWin = Math.max(
          0,
          Math.floor(diffTime / (1000 * 60 * 60 * 24)),
        );
      } else {
        daysWithoutWin = 0;
      }
    }

    const sortedWins = stat.winTimestamps.sort((a, b) => b - a);
    let maxDaysWithoutWin = daysWithoutWin;

    let sumDaysBetweenWins = 0;

    if (stat.hasWon && sortedWins.length > 0) {
      const baseTimestamp =
        firstGlobalDrawTimestamp !== null
          ? firstGlobalDrawTimestamp
          : stat.firstSeenTimestamp;
      if (baseTimestamp !== null) {
        const firstWinDayStart = new Date(
          sortedWins[sortedWins.length - 1],
        ).setHours(0, 0, 0, 0);
        const baseDayStart = new Date(baseTimestamp).setHours(0, 0, 0, 0);
        const gapStart = Math.max(
          0,
          Math.floor((firstWinDayStart - baseDayStart) / 86400000),
        );
        maxDaysWithoutWin = Math.max(maxDaysWithoutWin, gapStart);
        sumDaysBetweenWins += gapStart;
      }

      for (let i = 0; i < sortedWins.length - 1; i++) {
        const win1DayStart = new Date(sortedWins[i]).setHours(0, 0, 0, 0);
        const win2DayStart = new Date(sortedWins[i + 1]).setHours(0, 0, 0, 0);
        const gap = Math.max(
          0,
          Math.floor((win1DayStart - win2DayStart) / 86400000),
        );
        maxDaysWithoutWin = Math.max(maxDaysWithoutWin, gap);
        sumDaysBetweenWins += gap;
      }
    }

    let avgDaysBetweenWins: number | null = null;
    if (stat.winsCount > 0) {
      avgDaysBetweenWins =
        Math.round((sumDaysBetweenWins / stat.winsCount) * 10) / 10;
    }

    let maxDrawsWithoutWin = drawsWithoutWin;
    let luckiestDayOfWeek: number | null = null;
    let winRate = 0;

    if (stat.winTimestamps.length > 0) {
      const dayCounts = new Array(7).fill(0);
      stat.winTimestamps.forEach((ts) => {
        const day = new Date(ts).getDay();
        dayCounts[day]++;
      });
      let maxDay = -1;
      let maxCount = 0;
      dayCounts.forEach((count, day) => {
        if (count > maxCount) {
          maxCount = count;
          maxDay = day;
        }
      });
      if (maxDay !== -1) luckiestDayOfWeek = maxDay;
    }

    let drawsSinceSeen = 0;
    let currentDrawsGap = 0;
    
    // results is newest first
    for (let i = results.length - 1; i >= 0; i--) {
      const r = results[i];
      const ts = r.timestamp || now;
      if (stat.firstSeenTimestamp !== null && ts >= stat.firstSeenTimestamp) {
        drawsSinceSeen++;
        const isWin =
          r.text.trim().toLowerCase() === stat.displayName.toLowerCase() &&
          (r.type === "winner" || r.type === "grand_winner" || !r.type);
        
        if (isWin) {
          if (currentDrawsGap > maxDrawsWithoutWin) {
            maxDrawsWithoutWin = currentDrawsGap;
          }
          currentDrawsGap = 0;
        } else {
          currentDrawsGap++;
        }
      }
    }
    if (currentDrawsGap > maxDrawsWithoutWin) {
      maxDrawsWithoutWin = currentDrawsGap;
    }
    
    if (drawsSinceSeen > 0) {
       winRate = Math.round((stat.winsCount / drawsSinceSeen) * 1000) / 10;
    }

    return {
      name: stat.displayName,
      winsCount: stat.winsCount,
      lastWinTimestamp: stat.lastWinTimestamp,
      firstSeenTimestamp: stat.firstSeenTimestamp,
      daysWithoutWin,
      drawsWithoutWin,
      maxDaysWithoutWin,
      avgDaysBetweenWins,
      maxDrawsWithoutWin,
      luckiestDayOfWeek,
      winRate,
      hasWon: stat.hasWon,
      isOnWheel: stat.isOnWheel,
      winTimestamps: sortedWins,
    };
  });
}
