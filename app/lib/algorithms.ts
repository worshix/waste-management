import { Rank, Depot, Route } from './types';
import { calculateDistance } from './distance';

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Nearest Neighbor Algorithm
 * Visits the nearest unvisited location at each step
 */
export function nearestNeighborRoute(depot: Depot, locations: Rank[]): Route {
  if (locations.length === 0) {
    return {
      id: generateId(),
      algorithmUsed: 'Nearest Neighbor',
      locations: [],
      depot,
      totalDistance: 0,
      estimatedTime: 0,
      generatedAt: new Date(),
    };
  }

  const route: Rank[] = [];
  const unvisited = [...locations];
  let current = { lat: depot.lat, lng: depot.lng };
  let totalDistance = 0;

  while (unvisited.length > 0) {
    let nearestIndex = 0;
    let minDistance = Infinity;

    unvisited.forEach((location, index) => {
      const distance = calculateDistance(
        current.lat,
        current.lng,
        location.lat,
        location.lng
      );
      if (distance < minDistance) {
        minDistance = distance;
        nearestIndex = index;
      }
    });

    const nearest = unvisited[nearestIndex];
    route.push(nearest);
    totalDistance += minDistance;
    current = { lat: nearest.lat, lng: nearest.lng };
    unvisited.splice(nearestIndex, 1);
  }

  // Return to depot
  totalDistance += calculateDistance(
    current.lat,
    current.lng,
    depot.lat,
    depot.lng
  );

  return {
    id: generateId(),
    algorithmUsed: 'Nearest Neighbor',
    locations: route,
    depot,
    totalDistance,
    estimatedTime: (totalDistance / 30) * 60, // Assuming 30 km/h average speed
    generatedAt: new Date(),
  };
}

/**
 * Priority-Weighted Nearest Neighbor Algorithm
 * Considers both distance and priority/fill level
 */
export function priorityWeightedRoute(depot: Depot, locations: Rank[]): Route {
  if (locations.length === 0) {
    return {
      id: generateId(),
      algorithmUsed: 'Priority-Weighted',
      locations: [],
      depot,
      totalDistance: 0,
      estimatedTime: 0,
      generatedAt: new Date(),
    };
  }

  const route: Rank[] = [];
  const unvisited = [...locations];
  let current = { lat: depot.lat, lng: depot.lng };
  let totalDistance = 0;

  const priorityWeights = { high: 3, medium: 2, low: 1 };

  while (unvisited.length > 0) {
    let bestIndex = 0;
    let bestScore = -Infinity;

    unvisited.forEach((location, index) => {
      const distance = calculateDistance(
        current.lat,
        current.lng,
        location.lat,
        location.lng
      );
      const priorityWeight = priorityWeights[location.priority];
      const fillFactor = location.fillLevel / 100;

      // Higher score = better choice
      // Closer distance + higher priority + higher fill = higher score
      const score = (priorityWeight * 10 + fillFactor * 20) / (distance + 0.1);

      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    });

    const best = unvisited[bestIndex];
    const distanceToNext = calculateDistance(
      current.lat,
      current.lng,
      best.lat,
      best.lng
    );
    
    route.push(best);
    totalDistance += distanceToNext;
    current = { lat: best.lat, lng: best.lng };
    unvisited.splice(bestIndex, 1);
  }

  // Return to depot
  totalDistance += calculateDistance(
    current.lat,
    current.lng,
    depot.lat,
    depot.lng
  );

  return {
    id: generateId(),
    algorithmUsed: 'Priority-Weighted',
    locations: route,
    depot,
    totalDistance,
    estimatedTime: (totalDistance / 30) * 60,
    generatedAt: new Date(),
  };
}

/**
 * Compare multiple routing algorithms
 */
export function compareAlgorithms(
  depot: Depot,
  locations: Rank[]
): { nearestNeighbor: Route; priorityWeighted: Route } {
  return {
    nearestNeighbor: nearestNeighborRoute(depot, locations),
    priorityWeighted: priorityWeightedRoute(depot, locations),
  };
}
