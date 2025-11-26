import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import { locationsAPI, driversAPI, deliveriesAPI } from '../services/api';
import { Navigation, User, Package, Clock, MapPin, RefreshCw, X, AlertCircle, History, Calendar, Eye, EyeOff } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom marker icons
const createDriverIcon = (status, isLatest = true) => {
  const colors = {
    online: '#10b981',
    offline: '#6b7280',
    delivering: '#3b82f6',
  };
  
  const color = colors[status] || colors.offline;
  const size = isLatest ? 40 : 28;
  const iconSize = isLatest ? 20 : 16;
  
  return L.divIcon({
    className: 'custom-driver-marker',
    html: `
      <div style="
        background-color: ${color};
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        border: ${isLatest ? '4px' : '3px'} solid white;
        box-shadow: 0 3px 12px rgba(0,0,0,0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        ${!isLatest ? 'opacity: 0.7;' : ''}
      ">
        <svg width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="white">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
        </svg>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size/2, size/2],
    popupAnchor: [0, -size/2],
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
  const [driverLocations, setDriverLocations] = useState({});
  const [deliveries, setDeliveries] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [visibleDrivers, setVisibleDrivers] = useState(new Set());
  const [selectedDate, setSelectedDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [showOffline, setShowOffline] = useState(true);
  const [showLocationHistory, setShowLocationHistory] = useState(true);
  const mapRef = useRef(null);

  // Default center (Surabaya, Indonesia)
  const defaultCenter = [-7.2575, 112.7521];
  const [mapCenter, setMapCenter] = useState(defaultCenter);

  // Set default date to today
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setSelectedDate(today);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [driversRes, deliveriesRes] = await Promise.all([
        driversAPI.getAll(),
        deliveriesAPI.getAll()
      ]);

      const driversData = driversRes.data;
      setDrivers(driversData);
      setDeliveries(deliveriesRes.data);

      // Initialize visible drivers to all drivers
      if (visibleDrivers.size === 0) {
        setVisibleDrivers(new Set(driversData.map(d => d.id)));
      }

      // Fetch location history for each driver
      const locationPromises = driversData.map(async (driver) => {
        try {
          const locationRes = await locationsAPI.getDriverLocation(driver.id);
          return { driverId: driver.id, data: locationRes.data };
        } catch (error) {
          console.error(`Error fetching location for driver ${driver.id}:`, error);
          return { driverId: driver.id, data: null };
        }
      });

      const locationsResults = await Promise.all(locationPromises);
      const locationsMap = {};
      locationsResults.forEach(result => {
        if (result.data && result.data.logs) {
          locationsMap[result.driverId] = result.data.logs;
        }
      });

      setDriverLocations(locationsMap);
      setLastUpdate(new Date());
      setLoading(false);
    } catch (error) {
      console.error('Error fetching map data:', error);
      setLoading(false);
    }
  }, [visibleDrivers.size]);

  useEffect(() => {
    fetchData();
    
    let interval;
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchData();
      }, 30000); // Update every 30 seconds
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, fetchData]);

  const filterLocationsByDate = (logs, date) => {
    if (!date || !logs) return logs;
    
    const selectedDateObj = new Date(date);
    selectedDateObj.setHours(0, 0, 0, 0);
    const nextDay = new Date(selectedDateObj);
    nextDay.setDate(nextDay.getDate() + 1);

    return logs.filter(log => {
      let logDate;
      
      // Handle Firestore Timestamp object
      if (log.timestamp && log.timestamp._seconds) {
        logDate = new Date(log.timestamp._seconds * 1000);
      } 
      // Handle milliseconds timestamp
      else if (typeof log.timestamp === 'number') {
        logDate = new Date(log.timestamp);
      }
      // Handle Date string
      else {
        logDate = new Date(log.timestamp);
      }
      
      const isInRange = logDate >= selectedDateObj && logDate < nextDay;
      
      return isInRange;
    });
  };

  const getLatestLocation = (driverId) => {
    const logs = driverLocations[driverId];
    if (!logs || logs.length === 0) return null;
    console.log(driverId, "Loc log:", logs)
    
    const filteredLogs = filterLocationsByDate(logs, selectedDate);
    console.log(driverId, "Filtered logs", filteredLogs)
    return filteredLogs.length > 0 ? filteredLogs[0] : null;
  };

  const getFilteredLocationHistory = (driverId) => {
    const logs = driverLocations[driverId] || [];
    return filterLocationsByDate(logs, selectedDate);
  };

  const getDriverDeliveries = (driverId) => {
    return deliveries.filter(delivery => 
      delivery.assignedDriverId === driverId && 
      (delivery.status === 'assigned' || delivery.status === 'completed')
    );
  };

  const isLocationRecent = (timestamp) => {
    if (!timestamp) return false;
    
    let locationTime;
    if (timestamp._seconds) {
      // Firestore Timestamp
      locationTime = timestamp._seconds * 1000;
    } else if (typeof timestamp === 'number') {
      // Milliseconds
      locationTime = timestamp;
    } else {
      // Date string or object
      locationTime = new Date(timestamp).getTime();
    }
    
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    return (now - locationTime) < fiveMinutes;
  };

  const getDriverStatus = (driver) => {
    const latestLocation = getLatestLocation(driver.id);
    if (!latestLocation) return 'offline';
    
    const isRecent = isLocationRecent(latestLocation.timestamp);
    if (!isRecent) return 'offline';
    
    const hasActiveDeliveries = deliveries.some(
      delivery => delivery.assignedDriverId === driver.id && delivery.status === 'assigned'
    );
    
    return hasActiveDeliveries ? 'delivering' : 'online';
  };

  const handleDriverClick = (driver) => {
    setSelectedDriver(driver);
    const latestLocation = getLatestLocation(driver.id);
    if (latestLocation) {
      setMapCenter([latestLocation.latitude, latestLocation.longitude]);
    }
  };

  const toggleDriverVisibility = (driverId) => {
    setVisibleDrivers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(driverId)) {
        newSet.delete(driverId);
      } else {
        newSet.add(driverId);
      }
      return newSet;
    });
  };

  const toggleAllDrivers = () => {
    if (visibleDrivers.size === drivers.length) {
      setVisibleDrivers(new Set());
    } else {
      setVisibleDrivers(new Set(drivers.map(d => d.id)));
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
    
    let date;
    if (timestamp._seconds) {
      // Firestore Timestamp
      date = new Date(timestamp._seconds * 1000);
    } else if (typeof timestamp === 'number') {
      // Milliseconds
      date = new Date(timestamp);
    } else {
      // Date string or object
      date = new Date(timestamp);
    }
    
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
      latestLocation: getLatestLocation(driver.id),
      locationHistory: getFilteredLocationHistory(driver.id),
      status: getDriverStatus(driver),
      deliveries: getDriverDeliveries(driver.id)
    }))
    .filter(driver => driver.latestLocation && (showOffline || driver.status !== 'offline'));

  const visibleDriversWithLocation = driversWithLocation.filter(driver => 
    visibleDrivers.has(driver.id)
  );
  console.log("vis driver:", driversWithLocation)
  console.log("drivers", drivers)

  const onlineCount = driversWithLocation.filter(driver => driver.status !== 'offline').length;
  const deliveringCount = driversWithLocation.filter(driver => driver.status === 'delivering').length;
  const offlineCount = driversWithLocation.filter(driver => driver.status === 'offline').length;

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm p-4">
        <div className="flex justify-between items-center mb-3">
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
            <button
              onClick={handleRefresh}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* Filters Row */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-600" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={showLocationHistory}
              onChange={(e) => setShowLocationHistory(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            Show history trail
          </label>
          
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={showOffline}
              onChange={(e) => setShowOffline(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            Show offline
          </label>
          
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            Auto-refresh
          </label>

          <button
            onClick={toggleAllDrivers}
            className="ml-auto text-sm text-blue-600 hover:text-blue-800 font-semibold"
          >
            {visibleDrivers.size === drivers.length ? 'Hide All' : 'Show All'}
          </button>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Sidebar */}
        <div className="w-80 bg-white shadow-lg overflow-y-auto">
          <div className="p-4 border-b">
            <h2 className="font-bold text-gray-800">
              Drivers ({visibleDriversWithLocation.length}/{driversWithLocation.length} visible)
            </h2>
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
                {Object.keys(driverLocations).length === 0 
                  ? 'No location data available yet' 
                  : `No location data for ${selectedDate}`}
              </p>
            </div>
          ) : (
            driversWithLocation.map((driver) => {
              const isVisible = visibleDrivers.has(driver.id);
              const isRecent = isLocationRecent(driver.latestLocation.timestamp);
              
              return (
                <div
                  key={driver.id}
                  className={`p-4 border-b transition ${
                    selectedDriver?.id === driver.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div 
                      className="flex items-center gap-3 flex-1 cursor-pointer"
                      onClick={() => handleDriverClick(driver)}
                    >
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-800 truncate">{driver.fullname}</h3>
                        <p className="text-xs text-gray-500">{driver.phone}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(driver.status)}`}>
                        {driver.status}
                      </span>
                      <button
                        onClick={() => toggleDriverVisibility(driver.id)}
                        className={`p-1 rounded ${isVisible ? 'text-blue-600 bg-blue-100' : 'text-gray-400 bg-gray-100'} hover:opacity-80 transition`}
                        title={isVisible ? 'Hide on map' : 'Show on map'}
                      >
                        {isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="ml-13 space-y-1 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <History className="w-3 h-3" />
                      <span>{driver.locationHistory.length} points today</span>
                    </div>
                    {driver.latestLocation.speed !== undefined && (
                      <div className="flex items-center gap-2">
                        <Navigation className="w-3 h-3" />
                        <span>{formatSpeed(driver.latestLocation.speed)}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Clock className="w-3 h-3" />
                      <span className={!isRecent ? 'text-orange-600 font-semibold' : ''}>
                        {formatTimestamp(driver.latestLocation.timestamp)}
                        {!isRecent && ' (old)'}
                      </span>
                    </div>
                    {driver.deliveries.length > 0 && (
                      <div className="flex items-center gap-2">
                        <Package className="w-3 h-3" />
                        <span>{driver.deliveries.length} active</span>
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
          ) : visibleDriversWithLocation.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <AlertCircle className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-xl font-semibold text-gray-800 mb-2">No Drivers Visible</h3>
                <p className="text-gray-600">Select drivers from the sidebar to view on map</p>
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

              {/* Driver Location History and Markers */}
              {visibleDriversWithLocation.map((driver) => {
                const logs = driver.locationHistory;
                
                // Create polyline connecting all location points
                const pathPoints = logs.map(log => [log.latitude, log.longitude]);

                // Colors based on driver status
                const pathColor = driver.status === 'delivering' ? '#3b82f6' : driver.status === 'online' ? '#10b981' : '#6b7280';

                return (
                  <React.Fragment key={driver.id}>
                    {/* Path line connecting all locations - THICKER AND MORE VISIBLE */}
                    {showLocationHistory && logs.length > 1 && (
                      <Polyline
                        positions={pathPoints}
                        color={pathColor}
                        weight={4}
                        opacity={0.8}
                      />
                    )}

                    {/* Show all location points as larger dots */}
                    {showLocationHistory && logs.slice(1).map((log, index) => (
                      <CircleMarker
                        key={`${driver.id}-${index}`}
                        center={[log.latitude, log.longitude]}
                        radius={5}
                        fillColor={pathColor}
                        fillOpacity={0.8}
                        color="white"
                        weight={2}
                      >
                        <Popup>
                          <div className="text-xs">
                            <p className="font-semibold">{driver.fullname}</p>
                            <p>{formatTimestamp(log.timestamp)}</p>
                            {log.speed !== undefined && <p>Speed: {formatSpeed(log.speed)}</p>}
                          </div>
                        </Popup>
                      </CircleMarker>
                    ))}

                    {/* Latest location (larger marker) */}
                    <Marker
                      position={[driver.latestLocation.latitude, driver.latestLocation.longitude]}
                      icon={createDriverIcon(driver.status, true)}
                    >
                      <Popup>
                        <div className="p-2 min-w-[200px]">
                          <h3 className="font-bold text-gray-800 mb-2">{driver.fullname}</h3>
                          <div className="space-y-1 text-sm">
                            <p className="text-gray-600">Status: <span className={`font-semibold ${driver.status === 'online' ? 'text-green-600' : driver.status === 'delivering' ? 'text-blue-600' : 'text-gray-600'}`}>{driver.status}</span></p>
                            {driver.latestLocation.speed !== undefined && (
                              <p className="text-gray-600">Speed: {formatSpeed(driver.latestLocation.speed)}</p>
                            )}
                            <p className="text-gray-600">Phone: {driver.phone}</p>
                            <p className="text-gray-600 text-xs">Updated: {formatTimestamp(driver.latestLocation.timestamp)}</p>
                            <p className="text-gray-600 text-xs">Points today: {logs.length}</p>
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

                    {/* Delivery Point Markers */}
                    {driver.deliveries.map((delivery, idx) => {
                      const offset = Math.random() * 0.02;
                      const deliveryPos = [
                        driver.latestLocation.latitude + offset,
                        driver.latestLocation.longitude + offset
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
      {selectedDriver && visibleDrivers.has(selectedDriver.id) && (
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
                {formatSpeed(getLatestLocation(selectedDriver.id)?.speed)}
              </p>
            </div>
            <div className="bg-gray-50 p-2 rounded">
              <p className="text-gray-600 text-xs">Points ({selectedDate})</p>
              <p className="font-semibold text-gray-800">
                {selectedDriver.locationHistory.length}
              </p>
            </div>
            <div className="bg-gray-50 p-2 rounded">
              <p className="text-gray-600 text-xs">Last Update</p>
              <p className="font-semibold text-gray-800 text-xs">
                {formatTimestamp(getLatestLocation(selectedDriver.id)?.timestamp)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default Map;