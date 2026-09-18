// VIT Google accounts are named "Full Name 25BAI0156" or have registration numbers
// in their email address (2-digit year, 2-4 letter branch, 4-5 digit roll, e.g. 22BCE1045, 25BAI0156, 21BDS0021).
const REGISTRATION_REGEX = /(\d{2}[A-Za-z]{2,4}\d{4,5})/i;

export function splitVitName(googleName, email = '') {
  const raw = String(googleName ?? '').trim();
  let match = raw.match(REGISTRATION_REGEX);
  let name = raw;
  let regNo = null;

  if (match) {
    regNo = match[1].toUpperCase();
    name = raw.replace(REGISTRATION_REGEX, ' ').replace(/\s+/g, ' ').trim();
  } else if (email) {
    const emailPrefix = String(email).split('@')[0];
    const emailMatch = emailPrefix.match(REGISTRATION_REGEX);
    if (emailMatch) {
      regNo = emailMatch[1].toUpperCase();
    }
  }

  return { name: name || raw, registrationNumber: regNo };
}
