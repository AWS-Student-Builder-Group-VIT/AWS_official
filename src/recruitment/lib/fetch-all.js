/**
 * PostgREST returns at most 1,000 rows per request by default and silently
 * drops the rest. Admin lists page through with .range() so they stay complete
 * as applications grow past that.
 *
 * `build` must return a fresh query on every call, ordered by a unique column
 * (or ending in one) so pages neither overlap nor skip rows.
 */
export async function fetchAll(build, pageSize = 1000) {
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await build().range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) return rows;
  }
}

/** Split an array into chunks, e.g. to keep `.in()` filters within URL limits. */
export function chunk(items, size) {
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}
