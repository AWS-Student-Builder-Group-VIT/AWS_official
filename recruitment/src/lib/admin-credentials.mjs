import { createHash, timingSafeEqual } from 'node:crypto';

function digest(value) {
  return createHash('sha256').update(value, 'utf8').digest();
}

/**
 * @param {{ adminId?: unknown, password?: unknown }} supplied
 * @param {{ adminId?: unknown, password?: unknown }} configured
 */
export function verifyAdminCredentials(supplied, configured) {
  if (
    typeof supplied.adminId !== 'string' ||
    typeof supplied.password !== 'string' ||
    typeof configured.adminId !== 'string' ||
    typeof configured.password !== 'string' ||
    configured.adminId.length === 0 ||
    configured.password.length === 0
  ) {
    return false;
  }

  const idMatches = timingSafeEqual(digest(supplied.adminId), digest(configured.adminId));
  const passwordMatches = timingSafeEqual(digest(supplied.password), digest(configured.password));
  return idMatches && passwordMatches;
}
