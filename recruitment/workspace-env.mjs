import nextEnv from '@next/env';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const { loadEnvConfig } = nextEnv;

/**
 * Load the single workspace-level environment file for the recruitment app.
 * Environment variables already supplied by a hosting platform keep priority.
 *
 * @param {string} configUrl
 * @param {boolean} [dev]
 */
export function loadWorkspaceEnv(configUrl, dev = process.env.NODE_ENV !== 'production') {
  const recruitmentDirectory = path.dirname(fileURLToPath(configUrl));
  const workspaceDirectory = path.resolve(recruitmentDirectory, '..');
  // Next loads the app directory before evaluating next.config.mjs. Force a
  // second pass so the workspace root is not skipped by @next/env's cache.
  return loadEnvConfig(workspaceDirectory, dev, console, true);
}
