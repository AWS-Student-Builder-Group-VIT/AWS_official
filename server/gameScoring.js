export const SCORING_VERSION = 1;

export const SCORED_GAME_SLUGS = Object.freeze([
  'pacman',
  'mario-kart',
  'asteroid-command',
  'snake',
  'flappy-bird',
  'watergirl-fireboy',
  'fruit-ninja',
  'wordle',
  'crack-the-code',
  'detective-crime',
  'level-devil',
  'morse',
]);

const tier = (score, boundaries) => {
  if (!Number.isFinite(score) || score < 0) return 0;
  let points = 0;
  for (const [minimum, award] of boundaries) {
    if (score < minimum) break;
    points = award;
  }
  return points;
};

const SCORE_TIERS = Object.freeze({
  pacman: [[0,4],[1000,7],[1500,10],[2000,15],[2500,25],[3000,30],[4000,40]],
  'mario-kart': [[0,5],[2000,8],[3000,13],[4000,18],[4500,25],[5000,30],[6000,40]],
  'asteroid-command': [[0,7],[10000,10],[15000,15],[20000,25],[25000,35],[30000,40],[40000,60]],
  snake: [[0,5],[30,10],[45,15],[60,20],[70,25],[80,30],[100,50]],
  'flappy-bird': [[0,2],[10,4],[20,6],[30,10],[40,15],[50,20],[70,30],[90,40],[150,100]],
  'fruit-ninja': [[0,5],[50,10],[100,15],[150,20],[200,30],[250,45],[300,60]],
});

const clampInteger = (value, minimum, maximum) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return minimum;
  return Math.max(minimum, Math.min(maximum, Math.trunc(number)));
};

export function isScoredGame(gameSlug) {
  return SCORED_GAME_SLUGS.includes(gameSlug);
}

export function calculateGamePoints(gameSlug, result = {}) {
  if (!isScoredGame(gameSlug) || result.official !== true) return 0;

  if (SCORE_TIERS[gameSlug]) {
    if (result.completed !== true) return 0;
    return tier(Number(result.rawScore), SCORE_TIERS[gameSlug]);
  }

  if (gameSlug === 'wordle') return result.solved === true ? 20 : 0;
  if (gameSlug === 'crack-the-code') return result.solved === true ? 20 : 0;
  if (gameSlug === 'detective-crime') return result.solved === true ? 10 : 0;
  if (gameSlug === 'level-devil') return clampInteger(result.completedLevels, 0, 5) * 8;
  if (gameSlug === 'morse') return clampInteger(result.correctCount, 0, 5) * 5;

  if (gameSlug === 'watergirl-fireboy') {
    const highestLevel = clampInteger(result.highestLevel, 0, 5);
    const levelPoints = [0, 15, 20, 30, 45, 50][highestLevel];
    const noDeathsBonus = highestLevel > 0 && Number(result.totalDeaths) === 0 ? 15 : 0;
    return levelPoints + noDeathsBonus;
  }

  return 0;
}
