import test from 'node:test';
import assert from 'node:assert/strict';

async function loadVerifier() {
  try {
    return await import('./admin-credentials.mjs');
  } catch {
    return {};
  }
}

test('accepts only the exact configured admin ID and password', async () => {
  const { verifyAdminCredentials } = await loadVerifier();
  const actual = verifyAdminCredentials?.(
    { adminId: 'aws-admin', password: 'correct horse battery staple' },
    { adminId: 'aws-admin', password: 'correct horse battery staple' },
  ) ?? false;

  assert.equal(actual, true);
});

test('rejects an incorrect admin ID or password', async () => {
  const { verifyAdminCredentials } = await loadVerifier();
  const verify = verifyAdminCredentials ?? (() => true);
  const configured = { adminId: 'aws-admin', password: 'correct horse battery staple' };

  assert.equal(verify({ adminId: 'candidate', password: configured.password }, configured), false);
  assert.equal(verify({ adminId: configured.adminId, password: 'wrong-password' }, configured), false);
});

test('rejects access when either server credential is missing', async () => {
  const { verifyAdminCredentials } = await loadVerifier();
  const verify = verifyAdminCredentials ?? (() => true);
  const supplied = { adminId: 'aws-admin', password: 'correct horse battery staple' };

  assert.equal(verify(supplied, { adminId: '', password: supplied.password }), false);
  assert.equal(verify(supplied, { adminId: supplied.adminId, password: '' }), false);
});
