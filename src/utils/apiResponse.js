export async function readApiResponse(response, fallbackMessage = 'Request failed') {
  const text = await response.text().catch(() => '');
  let data = {};
  if (text) {
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) data = parsed;
    } catch {
      data = {};
    }
  }
  if (response.ok) return { data, error: '' };
  const cleanText = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 240);
  const base = data.error || cleanText || fallbackMessage;
  return { data, error: `${base}${data.error ? '' : ` (HTTP ${response.status})`}` };
}
