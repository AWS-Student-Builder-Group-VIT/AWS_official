import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { restoreVercelApiPath } from './vercelApiRequest.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function listJavaScriptFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? listJavaScriptFiles(target) : [target];
  }));
  return nested.flat().filter((file) => file.endsWith('.js'));
}

test('Vercel exposes one Express catch-all function', async () => {
  const files = await listJavaScriptFiles(path.join(root, 'api'));
  assert.deepEqual(files.map((file) => path.relative(root, file).replaceAll('\\', '/')), ['api/index.js']);
  const entrypoint = await readFile(path.join(root, 'api', 'index.js'), 'utf8');
  assert.match(entrypoint, /dbReady/);
  assert.match(entrypoint, /server\/index\.js/);
  assert.match(entrypoint, /restoreVercelApiPath/);
});

test('Vercel routes API traffic before the SPA fallback', async () => {
  const config = JSON.parse(await readFile(path.join(root, 'vercel.json'), 'utf8'));
  assert.deepEqual(config.rewrites, [
    { source: '/api/:path*', destination: '/api?__vercel_api_path=:path*' },
    { source: '/(.*)', destination: '/index.html' },
  ]);
});

test('Vercel API rewrite restores the original Express route and query', () => {
  const request = {
    url: '/api?__vercel_api_path=mystery-box%2Fsession&source=test',
    query: { __vercel_api_path: 'mystery-box/session', source: 'test' },
  };

  restoreVercelApiPath(request);

  assert.equal(request.url, '/api/mystery-box/session?source=test');
});

test('direct API requests remain unchanged', () => {
  const request = {
    url: '/api/health?source=test',
    query: { source: 'test' },
  };

  restoreVercelApiPath(request);

  assert.equal(request.url, '/api/health?source=test');
});
