export function isAllowedOrigin(origin, configuredOrigins = []) {
  if (!origin) return true;

  return configuredOrigins.includes(origin)
    || /^https:\/\/[^/]+\.vercel\.app$/.test(origin)
    || /^http:\/\/(?:localhost|127\.0\.0\.1):\d+$/.test(origin);
}
