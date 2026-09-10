import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

test('HackQuest organizer actions use confirmation instead of requesting a typed reason', async () => {
  const [authSource, adminSource] = await Promise.all([
    readFile(new URL('../../utils/auth.js', import.meta.url), 'utf8'),
    readFile(new URL('../AdminPage.jsx', import.meta.url), 'utf8'),
  ]);

  assert.doesNotMatch(authSource, /window\.prompt/);
  assert.doesNotMatch(adminSource, /window\.prompt/);
  assert.match(authSource, /window\.confirm/);
  assert.match(adminSource, /window\.confirm/);
});

test('Spin Wheel does not display internal reward probabilities or decorative-sector copy', async () => {
  const wheelSource = await readFile(new URL('./components/SpinWheel.jsx', import.meta.url), 'utf8');

  assert.doesNotMatch(wheelSource, /Better luck:\s*90%/);
  assert.doesNotMatch(wheelSource, /Sector sizes are decorative/);
});

test('HackQuest participant and admin interfaces do not expose organizer invitations', async () => {
  const [landingSource, editorSource] = await Promise.all([
    readFile(new URL('./MysteryBoxHackathon.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../TeamAdminEditor.jsx', import.meta.url), 'utf8'),
  ]);

  assert.doesNotMatch(landingSource, /TeamInvitations|organizer invitation/i);
  assert.doesNotMatch(editorSource, /invitation|invite new members/i);
});
