/**
 * Reads API responses without letting an empty proxy or HTML error page turn
 * into a JSON parsing exception in the UI.
 */
export async function readApiResponse(response, fallback = 'Request failed') {
  let text;
  try {
    text = await response.text();
  } catch {
    return { data: {}, error: `${fallback} (HTTP ${response.status})` };
  }

  let data = {};

  if (text.trim()) {
    try {
      data = JSON.parse(text);
    } catch {
      return {
        data: {},
        error: `${text.trim()} (HTTP ${response.status})`,
      };
    }
  }

  return {
    data,
    error: typeof data?.error === 'string'
      ? data.error
      : `${fallback} (HTTP ${response.status})`,
  };
}
