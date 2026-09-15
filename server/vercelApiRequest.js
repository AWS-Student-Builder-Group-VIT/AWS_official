const INTERNAL_PATH_QUERY = '__vercel_api_path';

export function restoreVercelApiPath(request) {
  const parsed = new URL(request.url || '/api', 'http://vercel.local');
  if (parsed.pathname !== '/api' && parsed.pathname !== '/api/') return request.url;

  const forwardedPath = request.query?.[INTERNAL_PATH_QUERY]
    ?? parsed.searchParams.get(INTERNAL_PATH_QUERY);
  if (!forwardedPath) return request.url;

  const pathValue = Array.isArray(forwardedPath)
    ? forwardedPath.join('/')
    : String(forwardedPath);
  const safePath = pathValue.replace(/^\/+|\/+$/g, '');
  parsed.searchParams.delete(INTERNAL_PATH_QUERY);
  const query = parsed.searchParams.toString();
  request.url = `/api/${safePath}${query ? `?${query}` : ''}`;
  return request.url;
}

