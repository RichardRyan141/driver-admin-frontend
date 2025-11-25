import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { locationsAPI, driversAPI, deliveriesAPI } from '../services/api';
import { Navigation, User, Package, Clock, MapPin, RefreshCw, X, AlertCircle } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom marker icons
const createDriverIcon = (status) => {
  const colors = {
    online: '#10b981',
    offline: '#6b7280',
    delivering: '#3b82f6',
  };
  
  const color = colors[status] || colors.offline;
  
  return L.divIcon({
    className: 'custom-driver-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 32px;
        height: 32px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
        </svg>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
};

const createDeliveryIcon = () => {
  return L.divIcon({
    className: 'custom-delivery-marker',
    html: `
      <div style="
        background-color: #f59e0b;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
        </svg>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
};

// Component to recenter map
const RecenterMap = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);
  return null;
};

const Map = () => {
  const [drivers, setDrivers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [showOffline, setShowOffline] = useState(true);
  const mapRef = useRef(null);

  // Default center (Surabaya, Indonesia)
  const defaultCenter = [-7.2575, 112.7521];
  const [mapCenter, setMapCenter] = useState(defaultCenter);

  // Move fetchData before useEffect
  const fetchData = useCallback(async () => {
    try {
      const [driversRes, locationsRes, deliveriesRes] = await Promise.all([
        driversAPI.getAll(),
        locationsAPI.getAllLocations(),
        deliveriesAPI.getAll()
      ]);

      setDrivers(driversRes.data);
      setLocations(locationsRes.data || []);
      setDeliveries(deliveriesRes.data);
      setLastUpdate(new Date());
      setLoading(false);
    } catch (error) {
      console.error('Error fetching map data:', error);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    
    let interval;
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchData();
      }, 10000); // Update every 10 seconds
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, fetchData]);

  const getDriverLocation = (driverId) => {
    return locations.find(loc => loc.userId === driverId);
  };

  const getDriverDeliveries = (driverId) => {
    return deliveries.filter(delivery => 
      delivery.assignedDriverId === driverId && 
      (delivery.status === 'assigned' || delivery.status === 'completed')
    );
  };

  const isLocationRecent = (timestamp) => {
    if (!timestamp) return false;
    const locationTime = timestamp._seconds ? timestamp._seconds * 1000 : new Date(timestamp).getTime();
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    return (now - locationTime) < fiveMinutes;
  };

  const getDriverStatus = (driver) => {
    const location = getDriverLocation(driver.id);
    if (!location) return 'offline';
    
    const isRecent = isLocationRecent(location.timestamp);
    if (!isRecent) return 'offline';
    
    const hasActiveDeliveries = deliveries.some(
      delivery => delivery.assignedDriverId === driver.id && delivery.status === 'assigned'
    );
    
    return hasActiveDeliveries ? 'delivering' : 'online';
  };

  const handleDriverClick = (driver) => {
    setSelectedDriver(driver);
    const location = getDriverLocation(driver.id);
    if (location) {
      setMapCenter([location.latitude, location.longitude]);
    }
  };

  const handleRefresh = () => {
    fetchData();
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp._seconds ? new Date(timestamp._seconds * 1000) : new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatSpeed = (speed) => {
    if (!speed) return '0 km/h';
    return `${Math.round(speed)} km/h`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return 'text-green-600 bg-green-100';
      case 'offline': return 'text-gray-600 bg-gray-100';
      case 'delivering': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const driversWithLocation = drivers
    .map(driver => ({
      ...driver,
      location: getDriverLocation(driver.id),
      status: getDriverStatus(driver),
      deliveries: getDriverDeliveries(driver.id)
    }))
    .filter(driver => driver.location && (showOffline || driver.status !== 'offline'));

  const onlineCount = driversWithLocation.filter(driver => driver.status !== 'offline').length;
  const deliveringCount = driversWithLocation.filter(driver => driver.status === 'delivering').length;
  const offlineCount = driversWithLocation.filter(driver => driver.status === 'offline').length;

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm p-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Live Tracking Map</h1>
          <p className="text-sm text-gray-600">
            Last updated: {formatTime(lastUpdate)}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-gray-700">{onlineCount} Online</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span className="text-gray-700">{deliveringCount} Delivering</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gray-400"></div>
              <span className="text-gray-700">{offlineCount} Offline</span>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={showOffline}
              onChange={(e) => setShowOffline(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            Show offline
          </label>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            Auto-refresh
          </label>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Sidebar */}
        <div className="w-80 bg-white shadow-lg overflow-y-auto">
          <div className="p-4 border-b">
            <h2 className="font-bold text-gray-800">Drivers ({driversWithLocation.length})</h2>
          </div>
          
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading...</p>
            </div>
          ) : driversWithLocation.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <AlertCircle className="w-12 h-12 mx-auto mb-2 text-gray-400" />
              <p className="font-semibold">No drivers to display</p>
              <p className="text-sm mt-1">
                {locations.length === 0 
                  ? 'No location data available yet' 
                  : 'Try enabling "Show offline" to see all drivers'}
              </p>
            </div>
          ) : (
            driversWithLocation.map((driver) => {
              const isRecent = isLocationRecent(driver.location.timestamp);
              
              return (
                <div
                  key={driver.id}
                  onClick={() => handleDriverClick(driver)}
                  className={`p-4 border-b cursor-pointer transition ${
                    selectedDriver?.id === driver.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-800">{driver.fullname}</h3>
                        <p className="text-xs text-gray-500">{driver.phone}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(driver.status)}`}>
                      {driver.status}
                    </span>
                  </div>

                  <div className="ml-13 space-y-1 text-sm text-gray-600">
                    {driver.location.speed && (
                      <div className="flex items-center gap-2">
                        <Navigation className="w-3 h-3" />
                        <span>{formatSpeed(driver.location.speed)}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Clock className="w-3 h-3" />
                      <span className={!isRecent ? 'text-orange-600 font-semibold' : ''}>
                        {formatTimestamp(driver.location.timestamp)}
                        {!isRecent && ' (old)'}
                      </span>
                    </div>
                    {driver.deliveries.length > 0 && (
                      <div className="flex items-center gap-2">
                        <Package className="w-3 h-3" />
                        <span>{driver.deliveries.length} active deliveries</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Map */}
        <div className="flex-1 relative">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <div className="text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading map...</p>
              </div>
            </div>
          ) : driversWithLocation.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <AlertCircle className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-xl font-semibold text-gray-800 mb-2">No Location Data</h3>
                <p className="text-gray-600">Waiting for drivers to start sharing their location</p>
              </div>
            </div>
          ) : (
            <MapContainer
              center={mapCenter}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
              ref={mapRef}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <RecenterMap center={mapCenter} />

              {/* Driver Markers with Routes */}
              {driversWithLocation.map((driver) => {
                const driverDeliveries = driver.deliveries;
                const routePoints = [
                  [driver.location.latitude, driver.location.longitude],
                  ...driverDeliveries
                    .filter(delivery => delivery.destination)
                    .map(delivery => {
                      // Dummy coordinates near the driver for visualization
                      const offset = Math.random() * 0.02;
                      return [
                        driver.location.latitude + offset,
                        driver.location.longitude + offset
                      ];
                    })
                ];

                return (
                  <React.Fragment key={driver.id}>
                    {/* Driver Marker */}
                    <Marker
                      position={[driver.location.latitude, driver.location.longitude]}
                      icon={createDriverIcon(driver.status)}
                    >
                      <Popup>
                        <div className="p-2 min-w-[200px]">
                          <h3 className="font-bold text-gray-800 mb-2">{driver.fullname}</h3>
                          <div className="space-y-1 text-sm">
                            <p className="text-gray-600">Status: <span className={`font-semibold ${driver.status === 'online' ? 'text-green-600' : driver.status === 'delivering' ? 'text-blue-600' : 'text-gray-600'}`}>{driver.status}</span></p>
                            {driver.location.speed && (
                              <p className="text-gray-600">Speed: {formatSpeed(driver.location.speed)}</p>
                            )}
                            <p className="text-gray-600">Phone: {driver.phone}</p>
                            <p className="text-gray-600 text-xs">Updated: {formatTimestamp(driver.location.timestamp)}</p>
                            {driver.deliveries.length > 0 && (
                              <div className="mt-2 pt-2 border-t">
                                <p className="font-semibold text-gray-700 mb-1">Active Deliveries:</p>
                                {driver.deliveries.map((delivery, idx) => (
                                  <p key={delivery.id} className="text-xs text-gray-600">
                                    {idx + 1}. {delivery.title}
                                  </p>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </Popup>
                    </Marker>

                    {/* Route Line */}
                    {driver.deliveries.length > 0 && driver.status !== 'offline' && (
                      <Polyline
                        positions={routePoints}
                        color={driver.status === 'delivering' ? '#3b82f6' : '#10b981'}
                        weight={3}
                        opacity={0.6}
                        dashArray="10, 10"
                      />
                    )}

                    {/* Delivery Point Markers */}
                    {driverDeliveries.map((delivery, idx) => {
                      const offset = Math.random() * 0.02;
                      const deliveryPos = [
                        driver.location.latitude + offset,
                        driver.location.longitude + offset
                      ];

                      return (
                        <Marker
                          key={delivery.id}
                          position={deliveryPos}
                          icon={createDeliveryIcon()}
                        >
                          <Popup>
                            <div className="p-2 min-w-[200px]">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded">
                                  #{idx + 1}
                                </span>
                                <h3 className="font-bold text-gray-800">{delivery.title}</h3>
                              </div>
                              <div className="space-y-1 text-sm">
                                <p className="text-gray-600 flex items-start gap-1">
                                  <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                  <span>{delivery.destination}</span>
                                </p>
                                <p className="text-gray-600">Items: {delivery.items?.length || 0}</p>
                                <p className="text-gray-600">Status: <span className="font-semibold capitalize">{delivery.status}</span></p>
                              </div>
                            </div>
                          </Popup>
                        </Marker>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </MapContainer>
          )}
        </div>
      </div>

      {/* Selected Driver Info Panel */}
      {selectedDriver && (
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-xl p-4 max-w-md z-[1000]">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="w-7 h-7 text-blue-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-800">{selectedDriver.fullname}</h3>
                <p className="text-sm text-gray-600">{selectedDriver.phone}</p>
              </div>
            </div>
            <button
              onClick={() => setSelectedDriver(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-gray-50 p-2 rounded">
              <p className="text-gray-600 text-xs">Status</p>
              <p className={`font-semibold capitalize ${selectedDriver.status === 'online' ? 'text-green-600' : selectedDriver.status === 'delivering' ? 'text-blue-600' : 'text-gray-600'}`}>
                {selectedDriver.status}
              </p>
            </div>
            <div className="bg-gray-50 p-2 rounded">
              <p className="text-gray-600 text-xs">Speed</p>
              <p className="font-semibold text-gray-800">
                {formatSpeed(getDriverLocation(selectedDriver.id)?.speed)}
              </p>
            </div>
            <div className="bg-gray-50 p-2 rounded">
              <p className="text-gray-600 text-xs">Active Deliveries</p>
              <p className="font-semibold text-gray-800">
                {getDriverDeliveries(selectedDriver.id).length}
              </p>
            </div>
            <div className="bg-gray-50 p-2 rounded">
              <p className="text-gray-600 text-xs">Last Update</p>
              <p className="font-semibold text-gray-800 text-xs">
                {formatTimestamp(getDriverLocation(selectedDriver.id)?.timestamp)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Map;