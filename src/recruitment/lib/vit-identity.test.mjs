import assert from 'node:assert/strict';
import test from 'node:test';

import { splitVitName } from './vit-identity.js';

test('splits a VIT Google name into name and registration number', () => {
  assert.deepEqual(splitVitName('Shubham Goenka 25BAI0156'), { name: 'Shubham Goenka', registrationNumber: '25BAI0156' });
  assert.deepEqual(splitVitName('Dheeksha Tvaaritha K 25BIT0400'), { name: 'Dheeksha Tvaaritha K', registrationNumber: '25BIT0400' });
  assert.deepEqual(splitVitName('  ayush naugariya 24bds0076 '), { name: 'ayush naugariya', registrationNumber: '24BDS0076' });
});

test('leaves names without a registration number alone', () => {
  assert.deepEqual(splitVitName('Arshi Saxena'), { name: 'Arshi Saxena', registrationNumber: null });
  assert.deepEqual(splitVitName('Room 2025 Team'), { name: 'Room 2025 Team', registrationNumber: null });
  assert.deepEqual(splitVitName(undefined), { name: '', registrationNumber: null });
});
