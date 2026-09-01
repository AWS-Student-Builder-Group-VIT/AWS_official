import assert from 'node:assert/strict';
import test from 'node:test';

import { createSpinOutcome, getSegmentAtPointer } from './spinWheelLogic.js';

test('spin rotation places the selected segment under the top pointer', () => {
  for (let index = 0; index < 7; index += 1) {
    const outcome = createSpinOutcome({ segmentCount: 7, selectedIndex: index, currentRotation: 23, fullTurns: 4 });
    assert.equal(getSegmentAtPointer(outcome.rotation, 7), index);
  }
});

test('random selection clamps the upper boundary to the last segment', () => {
  assert.equal(createSpinOutcome({ segmentCount: 7, random: () => 0.999999 }).selectedIndex, 6);
});

