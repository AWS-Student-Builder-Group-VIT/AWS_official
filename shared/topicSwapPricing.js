export const TOPIC_SWAP_PRICING = Object.freeze({
  sameTier: 100,
  easyToMedium: 75,
  upgradeToHard: 50,
  downgradeToMedium: 125,
  downgradeToEasy: 150,
});

const DIFFICULTY_RANK = Object.freeze({ easy: 0, medium: 1, hard: 2 });

export function getTopicSwapCost(currentDifficulty, targetDifficulty) {
  const current = String(currentDifficulty || '').trim().toLowerCase();
  const target = String(targetDifficulty || '').trim().toLowerCase();
  const currentRank = DIFFICULTY_RANK[current];
  const targetRank = DIFFICULTY_RANK[target];

  if (!Number.isInteger(currentRank) || !Number.isInteger(targetRank)) return null;
  if (currentRank === targetRank) return TOPIC_SWAP_PRICING.sameTier;
  if (targetRank > currentRank) {
    return target === 'hard' ? TOPIC_SWAP_PRICING.upgradeToHard : TOPIC_SWAP_PRICING.easyToMedium;
  }
  return target === 'medium' ? TOPIC_SWAP_PRICING.downgradeToMedium : TOPIC_SWAP_PRICING.downgradeToEasy;
}

