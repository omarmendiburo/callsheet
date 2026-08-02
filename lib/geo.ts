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

const EXTRA_CITIES: Record<string, { lat: number; lng: number }> = {
  escondido: { lat: 33.1192, lng: -117.0864 },
  "san marcos": { lat: 33.1434, lng: -117.1661 },
  vista: { lat: 33.2, lng: -117.2425 },
  "la mesa": { lat: 32.7678, lng: -117.0231 },
  santee: { lat: 32.8384, lng: -116.9739 },
  poway: { lat: 32.9628, lng: -117.0359 },
  coronado: { lat: 32.6859, lng: -117.1831 },
  "imperial beach": { lat: 32.5839, lng: -117.1131 },
  "del mar": { lat: 32.9595, lng: -117.2653 },
  "solana beach": { lat: 32.9912, lng: -117.2712 },
  "spring valley": { lat: 32.7448, lng: -116.9989 },
  "lemon grove": { lat: 32.7426, lng: -117.0314 },
  anaheim: { lat: 33.8366, lng: -117.9143 },
  riverside: { lat: 33.9806, lng: -117.3755 },
  "san jose": { lat: 37.3382, lng: -121.8863 },
};

export function geocodeCity(
  city: string,
): { lat: number; lng: number } | null {
  const key = city.trim().toLowerCase();
  return CITY_TABLE[key] ?? EXTRA_CITIES[key] ?? null;
}

/* ZIP resolution (owner's ask 2026-08-02: zip is the primary location
 * input). Exact five-digit map for San Diego County's cities, then a
 * three-digit prefix fallback across Southern California and the other
 * launch metros. Unknown ZIPs resolve to null like unknown cities. */

const ZIP5: Record<string, string> = {};
const zip5 = (city: string, ...zips: string[]) => {
  for (const z of zips) ZIP5[z] = city;
};
zip5("Chula Vista", "91909", "91910", "91911", "91913", "91914", "91915");
zip5("National City", "91950");
zip5("El Cajon", "92019", "92020", "92021");
zip5("Encinitas", "92007", "92023", "92024");
zip5("Carlsbad", "92008", "92009", "92010", "92011");
zip5("Oceanside", "92054", "92055", "92056", "92057", "92058");
zip5("Escondido", "92025", "92026", "92027", "92029");
zip5("San Marcos", "92069", "92078");
zip5("Vista", "92081", "92083", "92084");
zip5("La Mesa", "91941", "91942");
zip5("Santee", "92071");
zip5("Poway", "92064");
zip5("Coronado", "92118");
zip5("Imperial Beach", "91932");
zip5("Del Mar", "92014");
zip5("Solana Beach", "92075");
zip5("Spring Valley", "91977", "91978");
zip5("Lemon Grove", "91945");

const ZIP3: Record<string, string> = {
  "919": "San Diego",
  "920": "San Diego",
  "921": "San Diego",
  "900": "Los Angeles",
  "901": "Los Angeles",
  "902": "Los Angeles",
  "903": "Los Angeles",
  "904": "Los Angeles",
  "905": "Los Angeles",
  "906": "Los Angeles",
  "907": "Long Beach",
  "908": "Long Beach",
  "910": "Los Angeles",
  "911": "Los Angeles",
  "912": "Los Angeles",
  "913": "Los Angeles",
  "914": "Los Angeles",
  "915": "Los Angeles",
  "916": "Los Angeles",
  "917": "Los Angeles",
  "918": "Los Angeles",
  "923": "Riverside",
  "924": "Riverside",
  "925": "Riverside",
  "926": "Irvine",
  "927": "Irvine",
  "928": "Anaheim",
  "940": "San Francisco",
  "941": "San Francisco",
  "944": "San Francisco",
  "945": "Oakland",
  "946": "Oakland",
  "950": "San Jose",
  "951": "San Jose",
  "021": "Boston",
  "022": "Boston",
};

export type ResolvedLocation = {
  city: string;
  lat: number | null;
  lng: number | null;
};

/* One resolver for every location field: a five-digit ZIP maps to its city
 * name + coordinates; anything else is treated as a city name (stored as
 * typed, coordinates from the table when known). */
export function resolveLocation(input: string): ResolvedLocation {
  const raw = input.trim();
  const zipMatch = raw.match(/^(\d{5})(?:-\d{4})?$/);
  if (zipMatch) {
    const zip = zipMatch[1];
    const cityName = ZIP5[zip] ?? ZIP3[zip.slice(0, 3)] ?? null;
    if (cityName) {
      const geo = geocodeCity(cityName);
      return { city: cityName, lat: geo?.lat ?? null, lng: geo?.lng ?? null };
    }
    // Unknown ZIP: keep it as the display string, honest null coords.
    return { city: raw, lat: null, lng: null };
  }
  const geo = geocodeCity(raw);
  return { city: raw, lat: geo?.lat ?? null, lng: geo?.lng ?? null };
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
