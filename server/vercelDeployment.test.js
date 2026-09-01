import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

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
  assert.deepEqual(files.map((file) => path.relative(root, file).replaceAll('\\', '/')), ['api/[...path].js']);
  const entrypoint = await readFile(path.join(root, 'api', '[...path].js'), 'utf8');
  assert.match(entrypoint, /dbReady/);
  assert.match(entrypoint, /server\/index\.js/);
});

test('Vercel configuration retains only the SPA fallback rewrite', async () => {
  const config = JSON.parse(await readFile(path.join(root, 'vercel.json'), 'utf8'));
  assert.deepEqual(config.rewrites, [{ source: '/(.*)', destination: '/index.html' }]);
});
