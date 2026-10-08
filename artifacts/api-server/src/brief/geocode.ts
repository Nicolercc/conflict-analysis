import { logger } from "../lib/logger";

/**
 * Map coordinates come from a geocoder, not from the model. The model names a
 * place; the place is looked up, and the model's own coordinates are used only
 * to notice when the lookup found a different place with the same name.
 */
export type LatLng = { lat: number; lng: number };
type Unknown = { lat: null; lng: null };
const UNKNOWN: Unknown = { lat: null, lng: null };

const ENDPOINT = process.env["GEOCODER_URL"] ?? "https://nominatim.openstreetmap.org/search";
const USER_AGENT =
  process.env["GEOCODER_USER_AGENT"] ?? "Vantage/1.0 (+https://conflict-analysis-vantage.vercel.app)";
// Nominatim's usage policy: at most one request a second, identified, and cached.
const MIN_GAP_MS = Number(process.env["GEOCODER_MIN_GAP_MS"] ?? 1_100);
const TIMEOUT_MS = 5_000;
/** Longest a brief waits for all of its places; anything still pending is left off the map. */
const BUDGET_MS = Number(process.env["GEOCODER_BUDGET_MS"] ?? 9_000);
/** Further apart than this, the lookup and the model are talking about different places. */
const MAX_DISAGREEMENT_KM = 300;
const CACHE_MAX = 2_000;

/** null = looked up and not found; a failed lookup is not cached. */
const cache = new Map<string, LatLng | null>();
let nextSlot = 0;

export function resetGeocoder() {
  cache.clear();
  nextSlot = 0;
}

export function distanceKm(a: LatLng, b: LatLng): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

const keyOf = (place: string) => place.toLowerCase().replace(/\s+/g, " ").trim();

/** Look one place name up. Throws when the geocoder cannot be reached. */
async function lookup(place: string): Promise<LatLng | null> {
  const key = keyOf(place);
  if (cache.has(key)) return cache.get(key) ?? null;

  const now = Date.now();
  const start = Math.max(now, nextSlot);
  nextSlot = start + MIN_GAP_MS;
  if (start > now) await new Promise((r) => setTimeout(r, start - now));
  // Another brief may have resolved the same place while this one queued.
  if (cache.has(key)) return cache.get(key) ?? null;

  const res = await fetch(`${ENDPOINT}?format=jsonv2&limit=1&accept-language=en&q=${encodeURIComponent(place)}`, {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`geocoder answered ${res.status}`);
  const rows = (await res.json()) as Array<{ lat?: string; lon?: string; addresstype?: string }>;
  const lat = Number(rows[0]?.lat);
  const lng = Number(rows[0]?.lon);
  // A whole country is not a place to pin: its centre would look like a specific location.
  const specific = rows[0]?.addresstype !== "country";
  const found = rows[0] && specific && Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value as string);
  cache.set(key, found);
  return found;
}

/**
 * Coordinates for a named place, or unknown. A pin needs two independent
 * answers that agree: the geocoder's result for the name, and the model's own
 * estimate nearby. The pin is dropped when the place has no name, the model
 * gave no estimate, the lookup fails or finds nothing, or the two are far
 * apart — a vague name such as "Sudan and United Nations" can otherwise
 * resolve to an unrelated place.
 */
export async function locate(place: string, modelGuess: LatLng | Unknown): Promise<LatLng | Unknown> {
  const name = place.replace(/\s+/g, " ").trim();
  if (name.length < 2 || modelGuess.lat === null) return UNKNOWN;
  let found: LatLng | null;
  try {
    found = await lookup(name);
  } catch (err) {
    logger.warn({ err, place: name }, "geocoder unavailable; place left off the map");
    return UNKNOWN;
  }
  if (!found) return UNKNOWN;
  if (distanceKm(found, modelGuess) > MAX_DISAGREEMENT_KM) {
    logger.info({ place: name, found, modelGuess }, "geocoder and model disagree; place left off the map");
    return UNKNOWN;
  }
  return found;
}

type Located = { lat: number | null; lng: number | null };
type BriefPlaces = {
  location: Located & { city: string; country: string };
  relatedEvents: Array<Located & { place?: string | null }>;
};

const joinPlace = (...parts: Array<string | null | undefined>) =>
  parts.map((p) => (p ?? "").trim()).filter(Boolean).join(", ");

/** Replace every coordinate in a brief with a geocoded one, or with unknown. */
export async function locateBrief<T extends BriefPlaces>(brief: T): Promise<T> {
  const deadline = new Promise<"late">((r) => setTimeout(() => r("late"), BUDGET_MS).unref());
  const within = async (work: Promise<LatLng | Unknown>) => {
    const result = await Promise.race([work, deadline]);
    return result === "late" ? UNKNOWN : result;
  };
  const guess = (l: Located): LatLng | Unknown =>
    l.lat !== null && l.lng !== null ? { lat: l.lat, lng: l.lng } : UNKNOWN;

  const [hub, ...events] = await Promise.all([
    // A country alone is not a place to pin: its centre would look like a specific location.
    within(
      brief.location.city.trim()
        ? locate(joinPlace(brief.location.city, brief.location.country), guess(brief.location))
        : Promise.resolve(UNKNOWN),
    ),
    ...brief.relatedEvents.map((ev) => within(locate(ev.place ?? "", guess(ev)))),
  ]);
  return {
    ...brief,
    location: { ...brief.location, ...hub },
    relatedEvents: brief.relatedEvents.map((ev, i) => ({ ...ev, ...events[i] })),
  };
}
