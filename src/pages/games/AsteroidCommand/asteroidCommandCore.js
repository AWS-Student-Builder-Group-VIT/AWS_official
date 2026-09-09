export function asteroidStage(score) {
  return Math.floor(Math.max(0, score) / 2500) + 1;
}

export function summarizeAsteroidTournament(scores) {
  const bestScore = scores.length ? Math.max(...scores.map((score) => Math.max(0, score))) : 0;
  return { bestScore, points: Number((bestScore / 100).toFixed(2)) };
}

export function summarizeAsteroidRun(score) {
  const safeScore = Math.max(0, Number(score) || 0);
  return { score: safeScore, points: Number((safeScore / 100).toFixed(2)), attempts: 1 };
}
