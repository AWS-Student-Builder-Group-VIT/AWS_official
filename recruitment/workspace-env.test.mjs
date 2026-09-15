import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';
import nextEnv from '@next/env';

import { loadWorkspaceEnv } from './workspace-env.mjs';

const { loadEnvConfig, resetEnv } = nextEnv;

test('reloads recruitment configuration from the repository root after Next has loaded the app directory', async () => {
  const workspace = await mkdtemp(path.join(tmpdir(), 'aws-sbg-env-'));
  const recruitment = path.join(workspace, 'recruitment');
  await mkdir(recruitment);
  await writeFile(path.join(workspace, '.env.local'), 'WORKSPACE_ENV_PROBE=loaded-from-root\n');
  delete process.env.WORKSPACE_ENV_PROBE;

  try {
    loadEnvConfig(recruitment, true, console, true);
    loadWorkspaceEnv(pathToFileURL(path.join(recruitment, 'next.config.mjs')).href, true);
    assert.equal(process.env.WORKSPACE_ENV_PROBE, 'loaded-from-root');
  } finally {
    resetEnv();
    delete process.env.WORKSPACE_ENV_PROBE;
    await rm(workspace, { recursive: true, force: true });
  }
});
