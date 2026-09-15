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
  return loadEnvConfig(workspaceDirectory, dev);
}
