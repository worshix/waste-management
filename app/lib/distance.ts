/**
 * Convert degrees to radians
 */
function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * @param lat1 Latitude of point 1
 * @param lng1 Longitude of point 1
 * @param lat2 Latitude of point 2
 * @param lng2 Longitude of point 2
 * @returns Distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculate total distance of a route
 */
export function calculateRouteDistance(
  depot: { lat: number; lng: number },
  locations: { lat: number; lng: number }[]
): number {
  if (locations.length === 0) return 0;

  let totalDistance = 0;

  // Distance from depot to first location
  totalDistance += calculateDistance(
    depot.lat,
    depot.lng,
    locations[0].lat,
    locations[0].lng
  );

  // Distance between consecutive locations
  for (let i = 0; i < locations.length - 1; i++) {
    totalDistance += calculateDistance(
      locations[i].lat,
      locations[i].lng,
      locations[i + 1].lat,
      locations[i + 1].lng
    );
  }

  // Distance from last location back to depot
  totalDistance += calculateDistance(
    locations[locations.length - 1].lat,
    locations[locations.length - 1].lng,
    depot.lat,
    depot.lng
  );

  return totalDistance;
}
