import assert from 'node:assert/strict';
import test from 'node:test';

import { isAllowedEmail, parseAllowedDomains, allowedDomainsMessage } from './email-domains.js';

test('no configured domains means the gate is off', () => {
  assert.equal(isAllowedEmail('anyone@gmail.com', ''), true);
  assert.equal(isAllowedEmail('anyone@gmail.com', undefined), true);
  assert.deepEqual(parseAllowedDomains(''), []);
});

test('accepts the institutional domain only', () => {
  const list = parseAllowedDomains('vitstudent.ac.in');
  assert.equal(isAllowedEmail('shubham.goenka2025@vitstudent.ac.in', list), true);
  assert.equal(isAllowedEmail('SHUBHAM@VITSTUDENT.AC.IN', list), true, 'case insensitive');
  assert.equal(isAllowedEmail('someone@gmail.com', list), false);
  assert.equal(isAllowedEmail('someone@yahoo.com', list), false);
});

test('rejects lookalike domains', () => {
  const list = parseAllowedDomains('vitstudent.ac.in');
  assert.equal(isAllowedEmail('attacker@notvitstudent.ac.in', list), false);
  assert.equal(isAllowedEmail('attacker@vitstudent.ac.in.evil.com', list), false);
  assert.equal(isAllowedEmail('attacker@vitstudent.ac', list), false);
});

test('accepts subdomains of an allowed domain', () => {
  const list = parseAllowedDomains('vitstudent.ac.in');
  assert.equal(isAllowedEmail('student@mail.vitstudent.ac.in', list), true);
});

test('handles malformed addresses', () => {
  const list = parseAllowedDomains('vitstudent.ac.in');
  for (const bad of ['', null, undefined, 'no-at-sign', '@vitstudent.ac.in', 'trailing@']) {
    assert.equal(isAllowedEmail(bad, list), false, `should reject ${JSON.stringify(bad)}`);
  }
});

test('parses a list and tolerates spacing and @ prefixes', () => {
  assert.deepEqual(parseAllowedDomains(' @vitstudent.ac.in , vit.ac.in '), ['vitstudent.ac.in', 'vit.ac.in']);
});

test('builds a readable message', () => {
  assert.equal(allowedDomainsMessage('vitstudent.ac.in'), 'Use your institutional @vitstudent.ac.in account to apply.');
  assert.equal(allowedDomainsMessage(''), '');
});
