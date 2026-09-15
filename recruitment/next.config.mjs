import { loadWorkspaceEnv } from './workspace-env.mjs';

loadWorkspaceEnv(import.meta.url);

/** @param {string} phase */
export default function createNextConfig(phase) {
  return {
    distDir: phase === 'phase-development-server' ? '.next-dev' : '.next-build',
    images: { unoptimized: true },
  };
}
