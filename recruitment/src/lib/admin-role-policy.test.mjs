import test from 'node:test';
import assert from 'node:assert/strict';

async function loadPolicy() {
  try {
    return await import('./admin-role-policy.mjs');
  } catch {
    return {};
  }
}

test('allows only roles explicitly granted access to an admin capability', async () => {
  const { hasAdminRole } = await loadPolicy();
  const check = hasAdminRole ?? (() => false);

  assert.equal(check('super_admin', ['super_admin', 'recruitment_admin']), true);
  assert.equal(check('recruitment_admin', ['super_admin', 'recruitment_admin']), true);
  assert.equal(check('candidate', ['super_admin', 'recruitment_admin']), false);
  assert.equal(check(undefined, ['super_admin', 'recruitment_admin']), false);
});
