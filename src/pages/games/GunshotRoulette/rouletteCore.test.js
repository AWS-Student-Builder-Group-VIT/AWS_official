import assert from 'node:assert/strict';
import test from 'node:test';
import { multiplier, loadShells, resolveShot } from './rouletteCore.js';

test('roulette multiplier and shell loading keep one live and one blank shell', () => {
  assert.equal(multiplier(3), 1.7);
  const shells = loadShells(3, () => 0);
  assert.ok(shells.some(Boolean));
  assert.ok(shells.some((shell) => !shell));
});

test('live shot at dealer adds the wager to the pending pot', () => {
  const next = resolveShot({ playerHp: 3, dealerHp: 3, pot: 0, bet: 10, capacity: 5 }, true, 'dealer');
  assert.equal(next.dealerHp, 2);
  assert.equal(next.pot, 24);
});

test('blank self shot grants an extra turn without damage', () => {
  const next = resolveShot({ playerHp: 3, dealerHp: 3, pot: 10, bet: 10, capacity: 5 }, false, 'self');
  assert.equal(next.playerHp, 3);
  assert.equal(next.extraTurn, true);
});
