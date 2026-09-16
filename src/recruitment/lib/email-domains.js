/**
 * Institutional email gate for recruitment sign-in.
 *
 * The allow list comes from configuration (ALLOWED_EMAIL_DOMAINS on the server,
 * VITE_ALLOWED_EMAIL_DOMAINS in the browser) as a comma-separated list, e.g.
 * "vitstudent.ac.in". An empty or missing list means no restriction, so the
 * gate stays off until it is deliberately switched on.
 */
export function parseAllowedDomains(raw) {
  return String(raw ?? '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase().replace(/^@/, ''))
    .filter(Boolean);
}

export function isAllowedEmail(email, allowedDomains) {
  const domains = Array.isArray(allowedDomains) ? allowedDomains : parseAllowedDomains(allowedDomains);
  if (domains.length === 0) return true;
  const address = String(email ?? '').trim().toLowerCase();
  const at = address.lastIndexOf('@');
  if (at < 1 || at === address.length - 1) return false;
  const domain = address.slice(at + 1);
  // A subdomain of an allowed domain is accepted; a lookalike suffix is not.
  return domains.some((allowed) => domain === allowed || domain.endsWith(`.${allowed}`));
}

/** Message shown when an account is outside the allow list. */
export function allowedDomainsMessage(allowedDomains) {
  const domains = Array.isArray(allowedDomains) ? allowedDomains : parseAllowedDomains(allowedDomains);
  if (domains.length === 0) return '';
  const list = domains.map((d) => `@${d}`).join(' or ');
  return `Use your institutional ${list} account to apply.`;
}
