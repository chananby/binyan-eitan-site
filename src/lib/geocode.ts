/**
 * Free-form address → { lat, lng } using OpenStreetMap Nominatim.
 *
 * No API key required. Rate limited to ~1 req/sec — fine for our use
 * (admin types address and clicks save). Send a User-Agent per
 * Nominatim usage policy.
 *
 * Returns null on any failure: network, no results, parse error.
 * Caller decides how to surface the failure (UI error, fallback to
 * manual lat/lng input).
 */

export interface GeocodeResult {
  lat: number;
  lng: number;
  display_name: string;
}

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "BinyanEitan-Admin/1.0 (chanan@binyaneitan.com)";

export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  const q = address.trim();
  if (!q) return null;

  try {
    const url = new URL(NOMINATIM_URL);
    url.searchParams.set("q", q);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "1");
    url.searchParams.set("countrycodes", "il"); // bias to Israel — much fewer false matches

    const res = await fetch(url.toString(), {
      headers: { "User-Agent": USER_AGENT, "Accept-Language": "he,en" },
      // Nominatim has aggressive rate limits — never cache wrong results
      cache: "no-store",
    });
    if (!res.ok) return null;

    const data = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
    if (!Array.isArray(data) || data.length === 0) return null;

    const lat = parseFloat(data[0].lat);
    const lng = parseFloat(data[0].lon);
    if (isNaN(lat) || isNaN(lng)) return null;

    return { lat, lng, display_name: data[0].display_name ?? q };
  } catch (e) {
    console.error("[geocode] failed:", e instanceof Error ? e.message : String(e));
    return null;
  }
}
