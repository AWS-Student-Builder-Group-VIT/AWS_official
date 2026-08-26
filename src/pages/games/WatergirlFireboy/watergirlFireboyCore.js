export function scoreWatergirlAttempt({ gems = 0, secondsRemaining = 0, success = false }) {
  const base = Math.max(0, gems) * 100;
  const timeBonus = success ? Math.max(0, Math.floor(secondsRemaining)) * 10 : 0;
  return { base, timeBonus, total: base + timeBonus };
}

export function summarizeWatergirl(attempts) {
  const bestScore = attempts.length ? Math.max(...attempts.map(({ score = 0 }) => Math.max(0, score))) : 0;
  return { bestScore, points: Number((bestScore / 100).toFixed(1)) };
}
