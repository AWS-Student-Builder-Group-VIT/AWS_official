import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeGithubRepoUrl as norm } from './github-url.js';

test('accepts a plain repository link', () => {
  assert.equal(norm('https://github.com/octocat/hello-world'), 'https://github.com/octocat/hello-world');
  assert.equal(norm('  https://github.com/octocat/hello-world  '), 'https://github.com/octocat/hello-world');
});

test('reduces deeper links to the repository root', () => {
  assert.equal(norm('https://github.com/octocat/hello-world/'), 'https://github.com/octocat/hello-world');
  assert.equal(norm('https://github.com/octocat/hello-world.git'), 'https://github.com/octocat/hello-world');
  assert.equal(norm('https://github.com/octocat/hello-world/tree/main/src'), 'https://github.com/octocat/hello-world');
  assert.equal(norm('https://www.github.com/octocat/my.repo_name'), 'https://github.com/octocat/my.repo_name');
});

test('rejects anything that is not a GitHub repository', () => {
  for (const bad of [
    '', null, undefined, 'github.com/octocat/hello-world', 'not a url',
    'http://github.com/octocat/hello-world',       // not https
    'https://gitlab.com/octocat/hello-world',       // wrong host
    'https://github.com.evil.com/octocat/repo',     // lookalike host
    'https://evilgithub.com/octocat/repo',
    'https://github.com/octocat',                   // profile, not a repo
    'https://github.com/',
    'https://github.com/-bad-/repo',                // invalid username
    'https://github.com/octocat/..',
    'javascript:alert(1)',
  ]) {
    assert.equal(norm(bad), null, `should reject ${JSON.stringify(bad)}`);
  }
});
