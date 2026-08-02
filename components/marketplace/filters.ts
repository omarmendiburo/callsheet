/*
 * Filter plumbing shared by the three marketplace surfaces (spec §4.3, §4.4,
 * §5.4). Filters are GET params, toggled by navigating to a new URL — there
 * are no search inputs (DESIGN law: chips are the only discovery mechanism).
 *
 * Pure functions only; no server or client imports, so both the server pages
 * and the (server-rendered) chip links can share them.
 */

export type Params = Record<string, string | string[] | undefined>;

/* First value of a possibly-repeated query param. */
export function one(params: Params, key: string): string | undefined {
  const v = params[key];
  return Array.isArray(v) ? v[0] : v;
}

/*
 * Build an href that sets `key` to `value` (or clears it when value is
 * undefined or already-active), preserving every other current param. This is
 * what makes a chip a toggle: clicking the active chip clears the filter.
 */
export function toggleHref(
  base: string,
  params: Params,
  key: string,
  value: string | undefined,
  currentlyActive: boolean,
): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (k === key) continue;
    if (v == null) continue;
    if (Array.isArray(v)) {
      for (const item of v) sp.append(k, item);
    } else {
      sp.append(k, v);
    }
  }
  if (value !== undefined && !currentlyActive) sp.set(key, value);
  const qs = sp.toString();
  return qs ? `${base}?${qs}` : base;
}

export const RADIUS_OPTIONS = [25, 50, 100] as const;
export const RATE_OPTIONS = [250, 400, 550, 700] as const;
