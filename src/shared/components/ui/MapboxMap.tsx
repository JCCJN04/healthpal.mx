import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface MapboxMapProps {
  /** Latitude of the location */
  lat: number;
  /** Longitude of the location */
  lng: number;
  /** Optional address text shown in the marker popup */
  address?: string;
  /** Zoom level (default: 14) */
  zoom?: number;
  /** Map container height in CSS units (default: '300px') */
  height?: string;
  /** Additional CSS class for the container */
  className?: string;
}

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;

/**
 * Reusable Mapbox GL map component.
 * Renders an interactive map centered on the given coordinates with a marker.
 *
 * Requires `VITE_MAPBOX_TOKEN` to be set in your `.env` file.
 */
export default function MapboxMap({
  lat,
  lng,
  address,
  zoom = 14,
  height = '300px',
  className = '',
}: MapboxMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!MAPBOX_TOKEN) return;
    if (!mapContainerRef.current) return;
    // Prevent re-creating the map if it already exists
    if (mapRef.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [lng, lat],
      zoom,
    });

    // Navigation controls (zoom + compass)
    map.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Marker
    const marker = new mapboxgl.Marker({ color: '#33C7BE' })
      .setLngLat([lng, lat]);

    // Optional popup with address text
    if (address) {
      const popup = new mapboxgl.Popup({ offset: 25 }).setText(address);
      marker.setPopup(popup);
    }

    marker.addTo(map);
    mapRef.current = map;

    // Cleanup on unmount
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // We only want to create the map once per mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update center & marker when coordinates change
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.flyTo({ center: [lng, lat], zoom });
  }, [lat, lng, zoom]);

  if (!MAPBOX_TOKEN) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 rounded-lg text-gray-500 text-sm ${className}`}
        style={{ height }}
      >
        Mapa no disponible — token de Mapbox no configurado.
      </div>
    );
  }

  return (
    <div
      ref={mapContainerRef}
      className={`rounded-lg overflow-hidden ${className}`}
      style={{ height, width: '100%' }}
    />
  );
}
