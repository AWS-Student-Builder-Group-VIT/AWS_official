// VIT Google accounts are named "Full Name 25BAI0156". Split that into the
// person's name and their registration number (2-digit year, 3-letter
// programme, 4-digit roll).
const REGISTRATION_IN_NAME = /\s*\b(\d{2}[A-Za-z]{3}\d{4})\b\s*/;

export function splitVitName(googleName) {
  const raw = String(googleName ?? '').trim();
  const match = raw.match(REGISTRATION_IN_NAME);
  if (!match) return { name: raw, registrationNumber: null };
  const name = raw.replace(REGISTRATION_IN_NAME, ' ').replace(/\s+/g, ' ').trim();
  return { name: name || raw, registrationNumber: match[1].toUpperCase() };
}
