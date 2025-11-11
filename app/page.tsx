import { useState, useEffect, useRef } from 'react';
import { MapPin, Truck, Navigation, Plus, Menu, X } from 'lucide-react';

const HarareGarbageRouter = () => {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Initial rank locations in Harare CBD
  const initialRanks = [
    { id: 1, name: "Fourth Street Rank", lat: -17.8252, lng: 31.0522, priority: "high", fillLevel: 75 },
    { id: 2, name: "Copa Cabana", lat: -17.8292, lng: 31.0518, priority: "high", fillLevel: 60 },
    { id: 3, name: "Roadport", lat: -17.8312, lng: 31.0475, priority: "medium", fillLevel: 45 },
    { id: 4, name: "Market Square", lat: -17.8275, lng: 31.0495, priority: "high", fillLevel: 80 }
  ];

  const [ranks, setRanks] = useState(initialRanks);

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
      document.head.removeChild(link);
      document.body.removeChild(script);
    };
  }, []);

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

      // Add markers for each rank
      const newMarkers = initialRanks.map(rank => {
        const color = rank.priority === 'high' ? '#ef4444' : '#f59e0b';
        
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
    }
  };

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'high': return 'text-red-500 bg-red-50 border-red-200';
      case 'medium': return 'text-amber-500 bg-amber-50 border-amber-200';
      case 'low': return 'text-green-500 bg-green-50 border-green-200';
      default: return 'text-gray-500 bg-gray-50 border-gray-200';
    }
  };

  const getFillLevelColor = (level) => {
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
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
              <MapPin size={20} className="text-blue-600" />
              Collection Points
            </h2>
            <button className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
              <Plus size={18} />
            </button>
          </div>

          <div className="space-y-3">
            {ranks.map(rank => (
              <div key={rank.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:shadow-md transition">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-gray-800">{rank.name}</h3>
                  <span className={`text-xs px-2 py-1 rounded-full border ${getPriorityColor(rank.priority)}`}>
                    {rank.priority.toUpperCase()}
                  </span>
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
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 space-y-3">
          <button className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition flex items-center justify-center gap-2">
            <Navigation size={18} />
            Generate Route
          </button>
          <button className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-200 transition flex items-center justify-center gap-2">
            <Truck size={18} />
            Set Depot Location
          </button>
        </div>
      </div>

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
          </div>
        </div>

        <div ref={mapRef} className="w-full h-full"></div>
      </div>
    </div>
  );
};

export default HarareGarbageRouter;