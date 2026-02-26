import { logger } from '@/shared/lib/logger';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;

export interface GeocodingResult {
  lat: number;
  lng: number;
  /** The best-matching formatted place name returned by Mapbox */
  placeName: string;
}

/**
 * Geocode an address string into coordinates using the Mapbox Geocoding API.
 *
 * - Biased towards Mexico (`country=mx`) for better results.
 * - Returns `null` when the token is missing or no results are found.
 * - Safe to call on every render — wrap calls with your own cache/state.
 */
export async function geocodeAddress(
  address: string,
): Promise<GeocodingResult | null> {
  if (!MAPBOX_TOKEN) {
    logger.warn('geocodeAddress: VITE_MAPBOX_TOKEN is not configured');
    return null;
  }

  const trimmed = address.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(trimmed)}.json`,
    );
    url.searchParams.set('access_token', MAPBOX_TOKEN);
    url.searchParams.set('limit', '1');
    url.searchParams.set('language', 'es');
    // Bias results to Mexico
    url.searchParams.set('country', 'mx');

    const response = await fetch(url.toString());

    if (!response.ok) {
      logger.error('geocodeAddress: Mapbox API error', {
        status: response.status,
      });
      return null;
    }

    const data = await response.json();
    const feature = data?.features?.[0];

    if (!feature) return null;

    const [lng, lat] = feature.center as [number, number];

    return {
      lat,
      lng,
      placeName: feature.place_name ?? trimmed,
    };
  } catch (err) {
    logger.error('geocodeAddress: unexpected error', err);
    return null;
  }
}
