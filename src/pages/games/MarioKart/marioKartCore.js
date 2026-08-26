export function summarizeMarioKart(attempts) {
  const scores = attempts.map(({ score = 0 }) => Math.max(0, Math.round(score)));
  const bestScore = scores.length ? Math.max(...scores) : 0;
  const totalScore = scores.reduce((sum, score) => sum + score, 0);
  const points = Math.floor(bestScore / 25);
  const rank = bestScore >= 1500 ? 'Cloud Champion' : bestScore >= 750 ? 'Solutions Architect' : bestScore >= 300 ? 'Cloud Practitioner' : 'Cloud Explorer';
  return { bestScore, totalScore, points, rank };
}
