import { readdir, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

const roots = ['server', 'src'];
const testFilePattern = /\.test\.(?:js|mjs)$/;
const nodeTestImportPattern = /(?:from\s+['"]node:test['"]|require\(['"]node:test['"]\))/;

async function findNodeTests(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const tests = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      tests.push(...await findNodeTests(entryPath));
    } else if (testFilePattern.test(entry.name)) {
      const source = await readFile(entryPath, 'utf8');
      if (nodeTestImportPattern.test(source)) tests.push(entryPath);
    }
  }

  return tests;
}

const testFiles = (await Promise.all(roots.map(findNodeTests))).flat().sort();

if (testFiles.length === 0) {
  console.error('No Node test files were found.');
  process.exit(1);
}

console.log(`Running ${testFiles.length} Node test files...`);
const result = spawnSync(process.execPath, ['--test', ...testFiles], {
  stdio: 'inherit',
});

if (result.error) throw result.error;
process.exit(result.status ?? 1);
