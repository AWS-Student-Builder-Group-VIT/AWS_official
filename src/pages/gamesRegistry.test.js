import assert from 'node:assert/strict';
import test from 'node:test';
import { games } from './gamesRegistry.js';

test('exposes every current React game through a unique internal route', () => {
  assert.deepEqual(
    games.map(({ slug }) => slug),
    ['flappy-bird', 'fruit-ninja', 'snake', 'wordle', 'crack-the-code', 'detective-crime', 'level-devil', 'morse', 'pacman'],
  );
  assert.equal(new Set(games.map(({ path }) => path)).size, games.length);
  assert.ok(games.every(({ path }) => path.startsWith('/games/') && !path.includes('games_html')));
});
