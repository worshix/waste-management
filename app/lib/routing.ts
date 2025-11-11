import { Depot, Rank } from './types';

export interface OSRMRoute {
  distance: number; // in meters
  duration: number; // in seconds
  geometry: {
    coordinates: [number, number][]; // [lng, lat] format
  };
}

/**
 * Fetch route from OSRM API following actual roads
 * @param coordinates Array of [lat, lng] waypoints
 * @returns Route with geometry, distance, and duration
 */
export async function getOSRMRoute(
  coordinates: { lat: number; lng: number }[]
): Promise<OSRMRoute | null> {
  try {
    // OSRM expects coordinates as "lng,lat;lng,lat;..."
    const coords = coordinates
      .map((c) => `${c.lng},${c.lat}`)
      .join(';');

    const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;

    const response = await fetch(url);
    
    if (!response.ok) {
      console.error('OSRM API error:', response.statusText);
      return null;
    }

    const data = await response.json();

    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      console.error('No route found');
      return null;
    }

    return {
      distance: data.routes[0].distance,
      duration: data.routes[0].duration,
      geometry: data.routes[0].geometry,
    };
  } catch (error) {
    console.error('Error fetching OSRM route:', error);
    return null;
  }
}

/**
 * Get real road distance and time for ordered route
 * @param depot Starting/ending depot
 * @param orderedLocations Locations in visit order
 * @returns Real distance in km and duration in minutes
 */
export async function getRealRouteMetrics(
  depot: Depot,
  orderedLocations: Rank[]
): Promise<{ distance: number; duration: number; geometry: any } | null> {
  const waypoints = [
    { lat: depot.lat, lng: depot.lng },
    ...orderedLocations.map((loc) => ({ lat: loc.lat, lng: loc.lng })),
    { lat: depot.lat, lng: depot.lng }, // Return to depot
  ];

  const route = await getOSRMRoute(waypoints);

  if (!route) return null;

  return {
    distance: route.distance / 1000, // Convert to km
    duration: route.duration / 60, // Convert to minutes
    geometry: route.geometry,
  };
}

/**
 * Get route between two points
 * Useful for getting individual segment distances
 */
export async function getSegmentRoute(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): Promise<OSRMRoute | null> {
  return getOSRMRoute([from, to]);
}
