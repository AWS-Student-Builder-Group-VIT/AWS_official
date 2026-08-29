export const multiplier = (capacity) => 1 + (capacity - 1) * 0.35;

export function loadShells(capacity, random = Math.random) {
  const shells = Array.from({ length: capacity }, () => random() < 0.4);
  if (!shells.some(Boolean)) shells[0] = true;
  if (shells.every(Boolean)) shells[0] = false;
  return shells.sort(() => random() - 0.5);
}

export function resolveShot(state, live, target) {
  const gain = Math.floor(state.bet * multiplier(state.capacity));
  const loss = Math.floor(gain * 1.25);
  if (target === 'self') return live
    ? { ...state, playerHp: state.playerHp - 1, pot: Math.max(0, state.pot - loss), extraTurn: false }
    : { ...state, extraTurn: true };
  return live
    ? { ...state, dealerHp: state.dealerHp - 1, pot: state.pot + gain, extraTurn: false }
    : { ...state, extraTurn: false };
}
