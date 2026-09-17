/**
 * Accepts a link to a GitHub repository and returns its canonical form,
 * https://github.com/<owner>/<repo>, or null when it is not one.
 *
 * Deeper links (a branch, a file, ".git") are reduced to the repository root,
 * so reviewers always land on the project itself.
 */
export function normalizeGithubRepoUrl(input) {
  let url;
  try {
    url = new URL(String(input ?? '').trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'https:') return null;
  if (!['github.com', 'www.github.com'].includes(url.hostname.toLowerCase())) return null;

  const [owner, rawRepo] = url.pathname.split('/').filter(Boolean);
  const repo = rawRepo?.replace(/\.git$/i, '');
  // GitHub usernames: letters, digits and single hyphens, up to 39 characters.
  if (!owner || !/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/.test(owner)) return null;
  if (!repo || !/^[A-Za-z0-9._-]{1,100}$/.test(repo) || repo === '.' || repo === '..') return null;
  return `https://github.com/${owner}/${repo}`;
}
