/**
 * @param {unknown} value
 * @returns {string | null}
 */
export function parseProjectDocumentLink(value) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') throw new Error('Enter a valid HTTP or HTTPS document link.');

  const normalized = value.trim();
  if (!normalized) return null;

  let url;
  try {
    url = new URL(normalized);
  } catch {
    throw new Error('Enter a valid HTTP or HTTPS document link.');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Enter a valid HTTP or HTTPS document link.');
  }

  return url.toString();
}
