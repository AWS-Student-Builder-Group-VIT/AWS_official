export function asteroidStage(score) {
  return Math.floor(Math.max(0, score) / 2500) + 1;
}

export function summarizeAsteroidTournament(scores) {
  const bestScore = scores.length ? Math.max(...scores.map((score) => Math.max(0, score))) : 0;
  return { bestScore, points: Number((bestScore / 100).toFixed(2)) };
}
