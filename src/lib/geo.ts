/** Lucena City, Quezon — the default map center when a store has no pin yet. */
export const LUCENA_CENTER = { lat: 13.9314, lng: 121.617 } as const;

/**
 * Universal Google Maps directions link: opens the phone's installed Maps
 * app (or Waze if that's the OS default) on iOS/Android, browser fallback
 * otherwise. Deliberately not a `geo:` URI — those behave inconsistently
 * across platforms and Google's `?api=1` link is more reliable everywhere.
 */
export function googleMapsDirectionsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}
