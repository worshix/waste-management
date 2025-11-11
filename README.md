# Harare CBD Garbage Route Optimizer

## Project Overview
A route optimization system for garbage collection trucks operating in Harare CBD, Zimbabwe. The system focuses on high-traffic areas (ranks/bus stations) that accumulate garbage quickly and need frequent collection.

## Current Implementation Status

### ✅ Completed
- Interactive map centered on Harare CBD using Leaflet.js and OpenStreetMap
- Four initial collection points (ranks) pinpointed:
  - Fourth Street Rank (High Priority, -17.8252, 31.0522)
  - Copa Cabana (High Priority, -17.8292, 31.0518)
  - Roadport (Medium Priority, -17.8312, 31.0475)
  - Market Square (High Priority, -17.8275, 31.0495)
- Modern responsive UI with sidebar showing collection points
- Priority levels (high/medium/low) with color coding
- Fill level indicators for each location
- Collapsible sidebar for mobile responsiveness

### 🚧 To Be Implemented

#### Phase 1: Core Functionality (Current Sprint)
1. **Depot Location Management**
   - Allow user to click on map to set depot location (truck origin/end point)
   - Display depot marker with distinct icon (truck icon)
   - Store depot coordinates in React state
   - Show depot in sidebar with "Set as Depot" option

2. **Dynamic Location Management**
   - Implement "Add Location" functionality (+ button in sidebar)
   - Allow users to click map to add new collection points
   - Form to input: location name, priority level, initial fill rate
   - Edit existing locations (name, priority, fill rate)
   - Delete locations
   - All data stored in React state (no database yet)

3. **Route Optimization Algorithms**
   Implement three routing algorithms for comparison:

   **a) Nearest Neighbor Algorithm (Baseline)**
   - Start from depot
   - Visit nearest unvisited location
   - Return to depot
   - Calculate total distance

   **b) Priority-Weighted Nearest Neighbor (Main Algorithm)**
   - Consider both distance AND priority/fill level
   - Formula: `score = distance / (priority_weight * fill_level_factor)`
   - High priority locations visited first if fill level > threshold
   - Prevents overflow at critical locations

   **c) Genetic Algorithm (Advanced - Optional)**
   - Population of random routes
   - Fitness function: minimize distance + prioritize high-fill locations
   - Selection, crossover, mutation operations
   - Run for N generations

4. **Distance Calculation**
   - Implement Haversine formula for calculating distance between GPS coordinates
   - Function signature: `calculateDistance(lat1, lng1, lat2, lng2) => distance in km`
   - Consider using Leaflet's built-in distance calculation: `map.distance([lat1, lng1], [lat2, lng2])`

5. **Route Visualization**
   - Draw route polyline on map when "Generate Route" is clicked
   - Color-code route segments (e.g., gradient from start to end)
   - Show route order with numbered markers (1, 2, 3...)
   - Display route information:
     - Total distance (km)
     - Estimated time (assume average speed)
     - Number of stops
     - Order of locations visited

6. **Route Comparison**
   - Allow user to compare different algorithms side-by-side
   - Show metrics for each algorithm:
     - Total distance
     - Time to complete
     - Average priority of locations served
   - Highlight the most efficient route

7. **Simulation Feature (Time-based)**
   - Simulate bins filling over time
   - Fill rates per location (garbage/hour based on foot traffic)
   - Show real-time fill levels updating
   - Alert when locations reach critical levels (>80%)
   - Suggest when next collection run should happen

#### Phase 2: Enhanced Features (Future)
- Multiple truck routing (Vehicle Routing Problem)
- Time windows (collect between X and Y hours)
- Truck capacity constraints
- Historical data visualization
- Export routes to PDF/CSV

## Technical Stack

### Frontend
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Map**: Leaflet.js with OpenStreetMap tiles
- **Icons**: lucide-react

### Backend (Future)
- **Database**: SQLite with Prisma ORM (not implemented yet)
- **API**: Next.js API Routes

### Key Dependencies
```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.0.0",
    "leaflet": "^1.9.4",
    "lucide-react": "latest",
    "tailwindcss": "^3.0.0"
  },
  "devDependencies": {
    "@types/leaflet": "^1.9.0",
    "typescript": "^5.0.0"
  }
}
```

## Data Structures

### Location/Rank Type
```typescript
interface Rank {
  id: string;
  name: string;
  lat: number;
  lng: number;
  priority: 'high' | 'medium' | 'low';
  fillLevel: number; // 0-100%
  fillRate: number; // percentage per hour
  capacity: number; // in kg or liters
}
```

### Depot Type
```typescript
interface Depot {
  id: string;
  name: string;
  lat: number;
  lng: number;
}
```

### Route Type
```typescript
interface Route {
  id: string;
  algorithmUsed: string;
  locations: Rank[];
  depot: Depot;
  totalDistance: number; // in km
  estimatedTime: number; // in minutes
  generatedAt: Date;
}
```

## Algorithm Implementation Guidelines

### 1. Haversine Distance Formula
```typescript
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}
```

### 2. Nearest Neighbor Algorithm
```typescript
function nearestNeighborRoute(depot: Depot, locations: Rank[]): Route {
  const route: Rank[] = [];
  const unvisited = [...locations];
  let current = { lat: depot.lat, lng: depot.lng };
  let totalDistance = 0;

  while (unvisited.length > 0) {
    let nearestIndex = 0;
    let minDistance = Infinity;

    unvisited.forEach((location, index) => {
      const distance = calculateDistance(current.lat, current.lng, location.lat, location.lng);
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
  totalDistance += calculateDistance(current.lat, current.lng, depot.lat, depot.lng);

  return {
    id: generateId(),
    algorithmUsed: 'Nearest Neighbor',
    locations: route,
    depot,
    totalDistance,
    estimatedTime: totalDistance / 30 * 60, // Assuming 30 km/h average speed
    generatedAt: new Date()
  };
}
```

### 3. Priority-Weighted Algorithm
```typescript
function priorityWeightedRoute(depot: Depot, locations: Rank[]): Route {
  const route: Rank[] = [];
  const unvisited = [...locations];
  let current = { lat: depot.lat, lng: depot.lng };
  let totalDistance = 0;

  const priorityWeights = { high: 3, medium: 2, low: 1 };
  const fillThreshold = 70; // Priority override if fill > 70%

  while (unvisited.length > 0) {
    let bestIndex = 0;
    let bestScore = -Infinity;

    unvisited.forEach((location, index) => {
      const distance = calculateDistance(current.lat, current.lng, location.lat, location.lng);
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
    route.push(best);
    totalDistance += calculateDistance(current.lat, current.lng, best.lat, best.lng);
    current = { lat: best.lat, lng: best.lng };
    unvisited.splice(bestIndex, 1);
  }

  totalDistance += calculateDistance(current.lat, current.lng, depot.lat, depot.lng);

  return {
    id: generateId(),
    algorithmUsed: 'Priority-Weighted',
    locations: route,
    depot,
    totalDistance,
    estimatedTime: totalDistance / 30 * 60,
    generatedAt: new Date()
  };
}
```

## UI/UX Requirements

### Map Interactions
- Click map to add new location or set depot
- Click marker to view/edit location details
- Drag markers to reposition (optional)
- Zoom and pan controls

### Sidebar Features
- List of all collection points with priority badges
- Fill level progress bars with color coding:
  - Green: 0-40%
  - Amber: 41-70%
  - Red: 71-100%
- Add/Edit/Delete buttons for each location
- Algorithm selection dropdown
- "Generate Route" button
- "Set Depot" button
- Route metrics display after generation

### Route Visualization
- Polyline showing route path
- Numbered markers (1→2→3...)
- Different colors for different algorithms when comparing
- Route summary card with metrics

## File Structure
```
/app
  /components
    - Map.tsx (Leaflet map component)
    - Sidebar.tsx (Location list and controls)
    - LocationForm.tsx (Add/Edit location modal)
    - RouteDisplay.tsx (Route visualization and metrics)
  /lib
    - algorithms.ts (Routing algorithms)
    - distance.ts (Distance calculations)
    - types.ts (TypeScript interfaces)
  /api (Future - for database operations)
  page.tsx (Main page)
  layout.tsx
  globals.css
```

## Development Notes

### Current Storage Strategy
- All data stored in React state (useState)
- No persistence between sessions
- Focus on algorithm implementation and UI/UX

### Future Database Schema (Prisma + SQLite)
```prisma
model Rank {
  id        String   @id @default(uuid())
  name      String
  lat       Float
  lng       Float
  priority  String
  fillLevel Float
  fillRate  Float
  capacity  Float
  createdAt DateTime @default(now())
}

model Depot {
  id        String   @id @default(uuid())
  name      String
  lat       Float
  lng       Float
  createdAt DateTime @default(now())
}

model Route {
  id            String   @id @default(uuid())
  algorithmUsed String
  totalDistance Float
  estimatedTime Float
  createdAt     DateTime @default(now())
}
```

## Testing Scenarios

1. **Add multiple locations** and generate route
2. **Change priorities** and see route adjustment
3. **Simulate fill levels** increasing over time
4. **Compare algorithms** side-by-side
5. **Set depot** at different locations and observe route changes
6. **Edge cases**: 
   - Only one location
   - No depot set
   - All locations at 100% fill
   - Very distant locations

## Performance Considerations
- Limit map markers for performance (max ~50 locations)
- Debounce map interactions
- Memoize distance calculations
- Use Web Workers for complex algorithms (future)

## Accessibility
- Keyboard navigation for sidebar
- Screen reader labels for map markers
- Color-blind friendly palette
- ARIA labels for interactive elements

## Resources
- [Leaflet Documentation](https://leafletjs.com/)
- [OpenStreetMap](https://www.openstreetmap.org/)
- [Vehicle Routing Problem](https://en.wikipedia.org/wiki/Vehicle_routing_problem)
- [Haversine Formula](https://en.wikipedia.org/wiki/Haversine_formula)

## Known Limitations (Prototype Phase)
- No real road network (uses straight-line distances)
- No traffic considerations
- Single truck only
- No time windows
- No capacity constraints
- No persistence (no database yet)

---

**Next Immediate Steps:**
1. Implement depot location setting
2. Add location management (add/edit/delete)
3. Implement distance calculation
4. Code nearest neighbor algorithm
5. Code priority-weighted algorithm
6. Visualize routes on map
7. Display route metrics