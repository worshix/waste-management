'use client';
import { useState, useEffect, useRef } from 'react';
import { MapPin, Truck, Navigation, Plus, Menu, X, Edit2, Trash2, MapPinned, Loader2 } from 'lucide-react';
import { Rank, Depot, Route } from './lib/types';
import { nearestNeighborRoute, priorityWeightedRoute, compareAlgorithms } from './lib/algorithms';
import { getRealRouteMetrics } from './lib/routing';

const HarareGarbageRouter = () => {
  const mapRef = useRef(null);
  const [map, setMap] = useState<any>(null);
  const [markers, setMarkers] = useState<any[]>([]);
  const [depotMarker, setDepotMarker] = useState<any>(null);
  const [routePolyline, setRoutePolyline] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [settingDepot, setSettingDepot] = useState(false);
  const [addingLocation, setAddingLocation] = useState(false);
  const [currentRoute, setCurrentRoute] = useState<Route | null>(null);
  const [algorithm, setAlgorithm] = useState<'nearest' | 'priority'>('priority');
  const [showComparison, setShowComparison] = useState(false);
  const [isGeneratingRoute, setIsGeneratingRoute] = useState(false);
  const [routeGeometry, setRouteGeometry] = useState<any>(null);

  // Initial rank locations in Harare CBD
  const initialRanks: Rank[] = [
    { id: '1', name: "Fourth Street Rank", lat: -17.8252, lng: 31.0522, priority: "high", fillLevel: 75, fillRate: 5, capacity: 1000 },
    { id: '2', name: "Copa Cabana", lat: -17.8292, lng: 31.0518, priority: "high", fillLevel: 60, fillRate: 4, capacity: 1000 },
    { id: '3', name: "Roadport", lat: -17.8312, lng: 31.0475, priority: "medium", fillLevel: 45, fillRate: 3, capacity: 800 },
    { id: '4', name: "Market Square", lat: -17.8275, lng: 31.0495, priority: "high", fillLevel: 80, fillRate: 6, capacity: 1200 }
  ];

  const [ranks, setRanks] = useState<Rank[]>(initialRanks);
  const [depot, setDepot] = useState<Depot | null>(null);
  const [editingRank, setEditingRank] = useState<Rank | null>(null);
  const [showLocationForm, setShowLocationForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    priority: 'medium' as 'high' | 'medium' | 'low',
    fillLevel: 50,
    fillRate: 3,
    capacity: 1000,
  });

  useEffect(() => {
    // Load Leaflet CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);

    // Load Leaflet JS
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.async = true;
    script.onload = initMap;
    document.body.appendChild(script);

    return () => {
      if (document.head.contains(link)) document.head.removeChild(link);
      if (document.body.contains(script)) document.body.removeChild(script);
    };
  }, []);

  useEffect(() => {
    if (map) {
      updateMarkers();
    }
  }, [ranks, map]);

  const initMap = () => {
    if (mapRef.current && window.L) {
      const L = window.L;
      
      // Initialize map centered on Harare CBD
      const mapInstance = L.map(mapRef.current).setView([-17.8292, 31.0522], 14);
      
      // Add OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(mapInstance);

      setMap(mapInstance);
      updateMarkersForMap(mapInstance, initialRanks);
    }
  };

  // Add effect to handle map clicks based on mode
  useEffect(() => {
    if (!map) return;

    const handleMapClick = (e: any) => {
      if (settingDepot) {
        handleDepotClick(e.latlng);
      } else if (addingLocation) {
        handleAddLocationClick(e.latlng);
      }
    };

    map.on('click', handleMapClick);

    return () => {
      map.off('click', handleMapClick);
    };
  }, [map, settingDepot, addingLocation]);

  const handleDepotClick = (latlng: any) => {
    if (!map) return;
    const L = window.L;

    // Remove existing depot marker
    if (depotMarker) {
      map.removeLayer(depotMarker);
    }

    // Create depot marker
    const truckIcon = L.divIcon({
      className: 'custom-marker',
      html: `
        <div style="position: relative;">
          <div style="
            width: 40px;
            height: 40px;
            background: #3b82f6;
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
              <path d="M14 18V6a2 2 0 00-2-2H4a2 2 0 00-2 2v11a1 1 0 001 1h2"/>
              <path d="M15 18H9"/>
              <path d="M19 18h2a1 1 0 001-1v-3.65a1 1 0 00-.22-.624l-3.48-4.35A1 1 0 0017.52 8H14"/>
              <circle cx="17" cy="18" r="2"/>
              <circle cx="7" cy="18" r="2"/>
            </svg>
          </div>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });

    const marker = L.marker([latlng.lat, latlng.lng], { icon: truckIcon })
      .addTo(map)
      .bindPopup(`<div style="font-family: system-ui;"><strong>Depot Location</strong></div>`);

    setDepotMarker(marker);
    setDepot({
      id: 'depot-1',
      name: 'Main Depot',
      lat: latlng.lat,
      lng: latlng.lng,
    });
    setSettingDepot(false);
  };

  const handleAddLocationClick = (latlng: any) => {
    setFormData({ ...formData });
    setShowLocationForm(true);
    setAddingLocation(false);
    
    // Store the clicked location temporarily
    (window as any).tempLocation = { lat: latlng.lat, lng: latlng.lng };
  };

  const handleAddLocation = () => {
    const tempLoc = (window as any).tempLocation;
    if (!tempLoc) return;

    const newRank: Rank = {
      id: Date.now().toString(),
      name: formData.name,
      lat: tempLoc.lat,
      lng: tempLoc.lng,
      priority: formData.priority,
      fillLevel: formData.fillLevel,
      fillRate: formData.fillRate,
      capacity: formData.capacity,
    };

    setRanks([...ranks, newRank]);
    setShowLocationForm(false);
    setFormData({ name: '', priority: 'medium', fillLevel: 50, fillRate: 3, capacity: 1000 });
    delete (window as any).tempLocation;
  };

  const handleEditLocation = (rank: Rank) => {
    setEditingRank(rank);
    setFormData({
      name: rank.name,
      priority: rank.priority,
      fillLevel: rank.fillLevel,
      fillRate: rank.fillRate,
      capacity: rank.capacity,
    });
    setShowLocationForm(true);
  };

  const handleUpdateLocation = () => {
    if (!editingRank) return;

    setRanks(ranks.map(r => 
      r.id === editingRank.id 
        ? { ...r, ...formData }
        : r
    ));
    setShowLocationForm(false);
    setEditingRank(null);
    setFormData({ name: '', priority: 'medium', fillLevel: 50, fillRate: 3, capacity: 1000 });
  };

  const handleDeleteLocation = (id: string) => {
    if (confirm('Are you sure you want to delete this location?')) {
      setRanks(ranks.filter(r => r.id !== id));
    }
  };

  const updateMarkersForMap = (mapInstance: any, ranksList: Rank[]) => {
    const L = window.L;
    
    // Clear existing markers
    markers.forEach(m => mapInstance.removeLayer(m.marker));

    // Add markers for each rank
    const newMarkers = ranksList.map(rank => {
      const color = rank.priority === 'high' ? '#ef4444' : rank.priority === 'medium' ? '#f59e0b' : '#22c55e';
      
      const customIcon = L.divIcon({
        className: 'custom-marker',
        html: `
          <div style="position: relative;">
            <div style="
              width: 32px;
              height: 32px;
              background: ${color};
              border: 3px solid white;
              border-radius: 50%;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
              display: flex;
              align-items: center;
              justify-content: center;
            ">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
              </svg>
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const marker = L.marker([rank.lat, rank.lng], { icon: customIcon })
        .addTo(mapInstance)
        .bindPopup(`
          <div style="font-family: system-ui; min-width: 150px;">
            <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600;">${rank.name}</h3>
            <p style="margin: 4px 0; font-size: 12px; color: #666;">
              Priority: <span style="color: ${color}; font-weight: 600; text-transform: uppercase;">${rank.priority}</span>
            </p>
            <p style="margin: 4px 0; font-size: 12px; color: #666;">
              Fill Level: <strong>${rank.fillLevel}%</strong>
            </p>
          </div>
        `);

      return { rankId: rank.id, marker };
    });

    setMarkers(newMarkers);
  };

  const updateMarkers = () => {
    if (!map) return;
    updateMarkersForMap(map, ranks);
  };

  const handleGenerateRoute = async () => {
    if (!depot) {
      alert('Please set a depot location first!');
      return;
    }

    if (ranks.length === 0) {
      alert('Please add at least one collection point!');
      return;
    }

    setIsGeneratingRoute(true);

    try {
      // Step 1: Use algorithm to determine optimal order (fast, uses Haversine)
      const route = algorithm === 'nearest' 
        ? nearestNeighborRoute(depot, ranks)
        : priorityWeightedRoute(depot, ranks);

      // Step 2: Get real road-based route from OSRM
      const realMetrics = await getRealRouteMetrics(depot, route.locations);

      if (realMetrics) {
        // Update route with real road metrics
        const updatedRoute: Route = {
          ...route,
          totalDistance: realMetrics.distance,
          estimatedTime: realMetrics.duration,
        };

        setCurrentRoute(updatedRoute);
        setRouteGeometry(realMetrics.geometry);
        visualizeRoute(updatedRoute, realMetrics.geometry);
      } else {
        // Fallback to straight-line route if OSRM fails
        console.warn('OSRM routing failed, using straight-line route');
        setCurrentRoute(route);
        setRouteGeometry(null);
        visualizeRoute(route, null);
      }
    } catch (error) {
      console.error('Error generating route:', error);
      alert('Failed to generate route. Please try again.');
    } finally {
      setIsGeneratingRoute(false);
    }
  };

  const visualizeRoute = (route: Route, geometry: any) => {
    if (!map) return;
    const L = window.L;

    // Remove existing route
    if (routePolyline) {
      map.removeLayer(routePolyline);
    }

    // Clear existing numbered markers
    markers.forEach(m => map.removeLayer(m.marker));

    let polyline;

    if (geometry && geometry.coordinates) {
      // Use real road geometry from OSRM
      // OSRM returns coordinates as [lng, lat], but Leaflet expects [lat, lng]
      const coordinates = geometry.coordinates.map((coord: [number, number]) => [
        coord[1], // lat
        coord[0], // lng
      ]);

      polyline = L.polyline(coordinates, {
        color: '#3b82f6',
        weight: 5,
        opacity: 0.8,
      }).addTo(map);
    } else {
      // Fallback to straight-line route
      const coordinates = [
        [route.depot.lat, route.depot.lng],
        ...route.locations.map(loc => [loc.lat, loc.lng]),
        [route.depot.lat, route.depot.lng],
      ];

      polyline = L.polyline(coordinates, {
        color: '#3b82f6',
        weight: 4,
        opacity: 0.7,
        dashArray: '10, 10', // Dashed line to indicate it's not real roads
      }).addTo(map);
    }

    setRoutePolyline(polyline);

    // Add numbered markers
    const newMarkers = route.locations.map((loc, index) => {
      const rank = ranks.find(r => r.id === loc.id)!;
      const color = rank.priority === 'high' ? '#ef4444' : rank.priority === 'medium' ? '#f59e0b' : '#22c55e';
      
      const numberedIcon = L.divIcon({
        className: 'custom-marker',
        html: `
          <div style="position: relative;">
            <div style="
              width: 36px;
              height: 36px;
              background: ${color};
              border: 3px solid white;
              border-radius: 50%;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: bold;
              color: white;
              font-size: 16px;
            ">
              ${index + 1}
            </div>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      });

      const marker = L.marker([loc.lat, loc.lng], { icon: numberedIcon })
        .addTo(map)
        .bindPopup(`
          <div style="font-family: system-ui; min-width: 150px;">
            <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600;">Stop ${index + 1}: ${loc.name}</h3>
            <p style="margin: 4px 0; font-size: 12px; color: #666;">
              Priority: <span style="color: ${color}; font-weight: 600; text-transform: uppercase;">${loc.priority}</span>
            </p>
            <p style="margin: 4px 0; font-size: 12px; color: #666;">
              Fill Level: <strong>${loc.fillLevel}%</strong>
            </p>
          </div>
        `);

      return { rankId: loc.id, marker };
    });

    setMarkers(newMarkers);

    // Fit map to show entire route
    map.fitBounds(polyline.getBounds(), { padding: [50, 50] });
  };

  const handleCompareAlgorithms = async () => {
    if (!depot) {
      alert('Please set a depot location first!');
      return;
    }

    setIsGeneratingRoute(true);

    try {
      // Generate both routes with algorithms
      const comparison = compareAlgorithms(depot, ranks);
      
      // Get real metrics for both routes
      const nnMetrics = await getRealRouteMetrics(depot, comparison.nearestNeighbor.locations);
      const pwMetrics = await getRealRouteMetrics(depot, comparison.priorityWeighted.locations);

      // Update routes with real metrics
      if (nnMetrics) {
        comparison.nearestNeighbor.totalDistance = nnMetrics.distance;
        comparison.nearestNeighbor.estimatedTime = nnMetrics.duration;
      }

      if (pwMetrics) {
        comparison.priorityWeighted.totalDistance = pwMetrics.distance;
        comparison.priorityWeighted.estimatedTime = pwMetrics.duration;
      }

      setShowComparison(true);
      
      // Display comparison
      console.log('Algorithm Comparison (Real Road Distances):', {
        nearestNeighbor: {
          distance: comparison.nearestNeighbor.totalDistance.toFixed(2) + ' km',
          time: Math.round(comparison.nearestNeighbor.estimatedTime) + ' min',
          stops: comparison.nearestNeighbor.locations.length,
        },
        priorityWeighted: {
          distance: comparison.priorityWeighted.totalDistance.toFixed(2) + ' km',
          time: Math.round(comparison.priorityWeighted.estimatedTime) + ' min',
          stops: comparison.priorityWeighted.locations.length,
        },
        winner: comparison.nearestNeighbor.totalDistance < comparison.priorityWeighted.totalDistance 
          ? 'Nearest Neighbor (shorter)' 
          : 'Priority-Weighted (better for urgent bins)',
      });

      alert(
        `Algorithm Comparison:\n\n` +
        `Nearest Neighbor:\n` +
        `  Distance: ${comparison.nearestNeighbor.totalDistance.toFixed(2)} km\n` +
        `  Time: ${Math.round(comparison.nearestNeighbor.estimatedTime)} min\n\n` +
        `Priority-Weighted:\n` +
        `  Distance: ${comparison.priorityWeighted.totalDistance.toFixed(2)} km\n` +
        `  Time: ${Math.round(comparison.priorityWeighted.estimatedTime)} min\n\n` +
        `${comparison.nearestNeighbor.totalDistance < comparison.priorityWeighted.totalDistance 
          ? '✓ Nearest Neighbor is shorter' 
          : '✓ Priority-Weighted prioritizes urgent bins'}`
      );
    } catch (error) {
      console.error('Error comparing algorithms:', error);
      alert('Failed to compare algorithms. Please try again.');
    } finally {
      setIsGeneratingRoute(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case 'high': return 'text-red-500 bg-red-50 border-red-200';
      case 'medium': return 'text-amber-500 bg-amber-50 border-amber-200';
      case 'low': return 'text-green-500 bg-green-50 border-green-200';
      default: return 'text-gray-500 bg-gray-50 border-gray-200';
    }
  };

  const getFillLevelColor = (level: number) => {
    if (level >= 70) return 'bg-red-500';
    if (level >= 40) return 'bg-amber-500';
    return 'bg-green-500';
  };

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-80' : 'w-0'} bg-white shadow-lg transition-all duration-300 overflow-hidden flex flex-col`}>
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-bold text-gray-800">Route Optimizer</h1>
            <button 
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 hover:bg-gray-100 rounded"
            >
              <X size={20} />
            </button>
          </div>
          <p className="text-sm text-gray-600">Harare CBD Garbage Collection</p>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Depot Section */}
          {depot && (
            <div className="mb-6 bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Truck size={18} className="text-blue-600" />
                <h3 className="font-semibold text-gray-800">Depot Set</h3>
              </div>
              <p className="text-sm text-gray-600">
                Location: {depot.lat.toFixed(4)}, {depot.lng.toFixed(4)}
              </p>
            </div>
          )}

          {/* Algorithm Selection */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Routing Algorithm
            </label>
            <select
              value={algorithm}
              onChange={(e) => setAlgorithm(e.target.value as 'nearest' | 'priority')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="nearest">Nearest Neighbor</option>
              <option value="priority">Priority-Weighted</option>
            </select>
          </div>

          {/* Collection Points */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
              <MapPin size={20} className="text-blue-600" />
              Collection Points
            </h2>
            <button 
              onClick={() => setAddingLocation(true)}
              className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              title="Click map to add location"
            >
              <Plus size={18} />
            </button>
          </div>

          {addingLocation && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
              📍 Click on the map to add a new collection point
            </div>
          )}

          <div className="space-y-3">
            {ranks.map(rank => (
              <div key={rank.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:shadow-md transition">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-gray-800">{rank.name}</h3>
                  <div className="flex items-center gap-1">
                    <span className={`text-xs px-2 py-1 rounded-full border ${getPriorityColor(rank.priority)}`}>
                      {rank.priority.toUpperCase()}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>Fill Level</span>
                      <span className="font-semibold">{rank.fillLevel}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all ${getFillLevelColor(rank.fillLevel)}`}
                        style={{ width: `${rank.fillLevel}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => handleEditLocation(rank)}
                      className="flex-1 px-3 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded flex items-center justify-center gap-1"
                    >
                      <Edit2 size={12} /> Edit
                    </button>
                    <button
                      onClick={() => handleDeleteLocation(rank.id)}
                      className="flex-1 px-3 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded flex items-center justify-center gap-1"
                    >
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Route Information */}
          {currentRoute && (
            <div className="mt-6 bg-green-50 rounded-lg p-4 border border-green-200">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                Route Summary
                {routeGeometry && (
                  <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded-full">
                    Real Roads
                  </span>
                )}
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Algorithm:</span>
                  <span className="font-semibold">{currentRoute.algorithmUsed}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Distance:</span>
                  <span className="font-semibold">{currentRoute.totalDistance.toFixed(2)} km</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Estimated Time:</span>
                  <span className="font-semibold">{Math.round(currentRoute.estimatedTime)} min</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Stops:</span>
                  <span className="font-semibold">{currentRoute.locations.length}</span>
                </div>
                {routeGeometry && (
                  <div className="pt-2 mt-2 border-t border-green-200 text-xs text-gray-600">
                    ✓ Route follows actual road network
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 space-y-3">
          <button 
            onClick={handleGenerateRoute}
            disabled={!depot || ranks.length === 0 || isGeneratingRoute}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {isGeneratingRoute ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Generating Route...
              </>
            ) : (
              <>
                <Navigation size={18} />
                Generate Route
              </>
            )}
          </button>
          <button 
            onClick={() => {
              setSettingDepot(!settingDepot);
              setAddingLocation(false);
            }}
            className={`w-full ${settingDepot ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'} py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2 ${!settingDepot ? 'hover:bg-gray-200' : ''}`}
          >
            <MapPinned size={18} />
            {settingDepot ? 'Click Map for Depot' : 'Set Depot Location'}
          </button>
          {depot && ranks.length > 0 && (
            <button 
              onClick={handleCompareAlgorithms}
              disabled={isGeneratingRoute}
              className="w-full bg-purple-100 text-purple-700 py-3 rounded-lg font-semibold hover:bg-purple-200 transition flex items-center justify-center gap-2 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {isGeneratingRoute ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Comparing...
                </>
              ) : (
                'Compare Algorithms'
              )}
            </button>
          )}
        </div>
      </div>

      {/* Location Form Modal */}
      {showLocationForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[2000]">
          <div className="bg-white rounded-lg p-6 w-96 max-w-md">
            <h2 className="text-xl font-bold mb-4">
              {editingRank ? 'Edit Location' : 'Add New Location'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Fifth Street Rank"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Priority</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Fill Level ({formData.fillLevel}%)
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={formData.fillLevel}
                  onChange={(e) => setFormData({ ...formData, fillLevel: parseInt(e.target.value) })}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Fill Rate (%/hour)
                </label>
                <input
                  type="number"
                  value={formData.fillRate}
                  onChange={(e) => setFormData({ ...formData, fillRate: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  step="0.1"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Capacity (kg)
                </label>
                <input
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-2 mt-6">
                <button
                  onClick={() => {
                    setShowLocationForm(false);
                    setEditingRank(null);
                    setFormData({ name: '', priority: 'medium', fillLevel: 50, fillRate: 3, capacity: 1000 });
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={editingRank ? handleUpdateLocation : handleAddLocation}
                  disabled={!formData.name}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {editingRank ? 'Update' : 'Add'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Map Container */}
      <div className="flex-1 relative">
        {!sidebarOpen && (
          <button 
            onClick={() => setSidebarOpen(true)}
            className="absolute top-4 left-4 z-[1000] bg-white p-3 rounded-lg shadow-lg hover:bg-gray-50 transition"
          >
            <Menu size={24} />
          </button>
        )}
        
        <div className="absolute top-4 right-4 z-[1000] bg-white p-4 rounded-lg shadow-lg">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow"></div>
              <span className="text-sm text-gray-700">High Priority</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-amber-500 rounded-full border-2 border-white shadow"></div>
              <span className="text-sm text-gray-700">Medium Priority</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow"></div>
              <span className="text-sm text-gray-700">Low Priority</span>
            </div>
            <div className="flex items-center gap-2 pt-2 border-t">
              <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow"></div>
              <span className="text-sm text-gray-700">Depot</span>
            </div>
          </div>
        </div>

        {settingDepot && (
          <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-[1000] bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3">
            <span>🚚 Click on the map to set depot location</span>
            <button
              onClick={() => setSettingDepot(false)}
              className="ml-2 px-3 py-1 bg-white text-blue-600 rounded hover:bg-gray-100 text-sm font-semibold"
            >
              Cancel
            </button>
          </div>
        )}

        {addingLocation && (
          <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-[1000] bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3">
            <span>📍 Click on the map to add a new collection point</span>
            <button
              onClick={() => setAddingLocation(false)}
              className="ml-2 px-3 py-1 bg-white text-green-600 rounded hover:bg-gray-100 text-sm font-semibold"
            >
              Cancel
            </button>
          </div>
        )}

        <div ref={mapRef} className="w-full h-full"></div>
      </div>
    </div>
  );
};

export default HarareGarbageRouter;