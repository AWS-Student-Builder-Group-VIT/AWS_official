import assert from 'node:assert/strict';
import test from 'node:test';

import { calculateGamePoints, isScoredGame, SCORED_GAME_SLUGS } from './gameScoring.js';

const official = (rawScore) => ({ official: true, completed: true, rawScore });

test('scores every Pacman boundary', () => {
  const cases = [[0,4],[999,4],[1000,7],[1499,7],[1500,10],[1999,10],[2000,15],[2499,15],[2500,25],[2999,25],[3000,30],[3999,30],[4000,40]];
  for (const [rawScore, points] of cases) assert.equal(calculateGamePoints('pacman', official(rawScore)), points);
});

test('scores raw-score games at every configured tier', () => {
  const cases = {
    'mario-kart': [[0,5],[1999,5],[2000,8],[2999,8],[3000,13],[3999,13],[4000,18],[4499,18],[4500,25],[4999,25],[5000,30],[5999,30],[6000,40]],
    'asteroid-command': [[0,7],[9999,7],[10000,10],[14999,10],[15000,15],[19999,15],[20000,25],[24999,25],[25000,35],[29999,35],[30000,40],[39999,40],[40000,60]],
    snake: [[0,5],[29,5],[30,10],[44,10],[45,15],[59,15],[60,20],[69,20],[70,25],[79,25],[80,30],[99,30],[100,50]],
    'flappy-bird': [[0,2],[9,2],[10,4],[19,4],[20,6],[29,6],[30,10],[39,10],[40,15],[49,15],[50,20],[69,20],[70,30],[89,30],[90,40],[149,40],[150,100]],
    'fruit-ninja': [[0,5],[49,5],[50,10],[99,10],[100,15],[149,15],[150,20],[199,20],[200,30],[249,30],[250,45],[299,45],[300,60]],
    'gunshot-roulette': [[0,0],[49,0],[50,10],[74,10],[75,20],[99,20],[100,30],[149,30],[150,40],[199,40],[200,50]],
    'hack-type': [[0,5],[14.9,5],[15,10],[24.9,10],[25,15],[34.9,15],[35,20],[44.9,20],[45,30],[59.9,30],[60,40],[79.9,40],[80,50]],
  };
  for (const [game, tiers] of Object.entries(cases)) {
    for (const [rawScore, points] of tiers) assert.equal(calculateGamePoints(game, official(rawScore)), points, `${game} score ${rawScore}`);
  }
});

test('scores completion and achievement games from canonical result fields', () => {
  assert.equal(calculateGamePoints('wordle', { official: true, solved: true }), 20);
  assert.equal(calculateGamePoints('crack-the-code', { official: true, solved: true }), 0);
  assert.equal(calculateGamePoints('level-devil', { official: true, completedLevels: 5 }), 40);
  assert.equal(calculateGamePoints('morse', { official: true, correctCount: 4 }), 20);
  assert.equal(calculateGamePoints('detective-crime', { official: true, solved: true }), 0);
  assert.equal(calculateGamePoints('watergirl-fireboy', { official: true, highestLevel: 5, totalDeaths: 0 }), 0);
});

test('failed, practice, malformed and unlisted results award zero', () => {
  assert.equal(calculateGamePoints('wordle', { official: true, solved: false }), 0);
  assert.equal(calculateGamePoints('pacman', { official: false, completed: true, rawScore: 999999 }), 0);
  assert.equal(calculateGamePoints('pacman', { official: true, completed: false, rawScore: 999999 }), 0);
  assert.equal(calculateGamePoints('pacman', { official: true, completed: true, rawScore: 'oops' }), 0);
  assert.equal(isScoredGame('gunshot-roulette'), true);
  assert.equal(isScoredGame('hack-type'), true);
  assert.equal(isScoredGame('detective-crime'), false);
  assert.equal(isScoredGame('watergirl-fireboy'), false);
  assert.equal(isScoredGame('crack-the-code'), false);
  assert.equal(SCORED_GAME_SLUGS.length, 11);
});
