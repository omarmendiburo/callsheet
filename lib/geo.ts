/*
 * Geo helpers. PLACEHOLDER geocoder: a static city table (SD-first per the
 * launch-geography decision) instead of a live geocoding API. A real
 * geocoder slots into geocodeCity() without touching callers.
 */

const CITY_TABLE: Record<string, { lat: number; lng: number }> = {
  "san diego": { lat: 32.7157, lng: -117.1611 },
  "chula vista": { lat: 32.6401, lng: -117.0842 },
  oceanside: { lat: 33.1959, lng: -117.3795 },
  carlsbad: { lat: 33.1581, lng: -117.3506 },
  encinitas: { lat: 33.0369, lng: -117.292 },
  "el cajon": { lat: 32.7948, lng: -116.9625 },
  "national city": { lat: 32.6781, lng: -117.0992 },
  tijuana: { lat: 32.5149, lng: -117.0382 },
  "los angeles": { lat: 34.0522, lng: -118.2437 },
  "long beach": { lat: 33.7701, lng: -118.1937 },
  irvine: { lat: 33.6846, lng: -117.8265 },
  "san francisco": { lat: 37.7749, lng: -122.4194 },
  oakland: { lat: 37.8044, lng: -122.2712 },
  boston: { lat: 42.3601, lng: -71.0589 },
};

export function geocodeCity(
  city: string,
): { lat: number; lng: number } | null {
  return CITY_TABLE[city.trim().toLowerCase()] ?? null;
}

export function haversineMiles(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
