export interface Rank {
  id: string;
  name: string;
  lat: number;
  lng: number;
  priority: 'high' | 'medium' | 'low';
  fillLevel: number; // 0-100%
  fillRate: number; // percentage per hour
  capacity: number; // in kg or liters
}

export interface Depot {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export interface Route {
  id: string;
  algorithmUsed: string;
  locations: Rank[];
  depot: Depot;
  totalDistance: number; // in km
  estimatedTime: number; // in minutes
  generatedAt: Date;
}

export type Priority = 'high' | 'medium' | 'low';
