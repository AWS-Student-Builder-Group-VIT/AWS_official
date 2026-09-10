import test from 'node:test';
import assert from 'node:assert/strict';
import { getOfficialGameCardAccess } from './officialGameAccess.js';

test('routes every unplayed game to Practice after the official limit is exhausted', () => {
  assert.deepEqual(getOfficialGameCardAccess({
    played: false,
    remainingAttempts: 0,
    gamesEnabled: true,
    activeAttempt: null,
    practicePath: '/games/morse',
    officialPath: '/hackquest/games/morse',
  }), {
    mode: 'practice',
    disabled: false,
    label: 'Play Practice — No Points',
    path: '/games/morse',
  });
});

test('Practice remains available after the limit even when official game mode is disabled', () => {
  const access = getOfficialGameCardAccess({
    played: false,
    remainingAttempts: 0,
    gamesEnabled: false,
    activeAttempt: null,
    practicePath: '/games/snake',
    officialPath: '/hackquest/games/snake',
  });

  assert.equal(access.mode, 'practice');
  assert.equal(access.disabled, false);
  assert.equal(access.path, '/games/snake');
});

test('an unplayed game starts officially while team slots remain', () => {
  assert.deepEqual(getOfficialGameCardAccess({
    played: false,
    remainingAttempts: 2,
    gamesEnabled: true,
    activeAttempt: null,
    practicePath: '/games/wordle',
    officialPath: '/hackquest/games/wordle',
  }), {
    mode: 'official',
    disabled: false,
    label: 'Play Official Game',
    path: '/hackquest/games/wordle',
  });
});

test('a paused official game does not block another unplayed official game', () => {
  const access = getOfficialGameCardAccess({
    played: false,
    remainingAttempts: 3,
    gamesEnabled: true,
    activeAttempt: { gameSlug: 'wordle' },
    practicePath: '/games/morse',
    officialPath: '/hackquest/games/morse',
  });

  assert.deepEqual(access, {
    mode: 'official',
    disabled: false,
    label: 'Play Official Game',
    path: '/hackquest/games/morse',
  });
});

test('a completed game always reopens as unscored Practice when no attempt is active', () => {
  const access = getOfficialGameCardAccess({
    played: true,
    remainingAttempts: 4,
    gamesEnabled: true,
    activeAttempt: null,
    practicePath: '/games/pacman',
    officialPath: '/hackquest/games/pacman',
  });

  assert.equal(access.mode, 'practice');
  assert.equal(access.label, 'Play Again — Practice');
  assert.equal(access.path, '/games/pacman');
});
