function normalizeRotation(rotation) {
  return ((Number(rotation) % 360) + 360) % 360;
}

export function getSegmentAtPointer(rotation, segmentCount) {
  const count = Math.max(1, Math.trunc(Number(segmentCount) || 1));
  const step = 360 / count;
  const sourceAngle = normalizeRotation(-rotation);
  return Math.min(count - 1, Math.floor(sourceAngle / step));
}

export function createSpinOutcome({
  segmentCount,
  selectedIndex,
  currentRotation = 0,
  fullTurns = 6,
  random = Math.random,
} = {}) {
  const count = Math.max(1, Math.trunc(Number(segmentCount) || 1));
  const chosen = Number.isInteger(selectedIndex)
    ? Math.min(count - 1, Math.max(0, selectedIndex))
    : Math.min(count - 1, Math.floor(Math.max(0, Math.min(0.999999999, random())) * count));
  const step = 360 / count;
  const desiredRotation = normalizeRotation(-(chosen + 0.5) * step);
  const current = Number(currentRotation) || 0;
  const delta = normalizeRotation(desiredRotation - normalizeRotation(current));

  return {
    selectedIndex: chosen,
    rotation: current + Math.max(1, Math.trunc(Number(fullTurns) || 1)) * 360 + delta,
  };
}

