import React, { useState, useEffect } from 'react';
import { Users, Package, MapPin, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import { driversAPI, deliveriesAPI, locationsAPI } from '../services/api';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalDrivers: 0,
    onlineDrivers: 0,
    activeDeliveries: 0,
    totalDeliveryPoints: 0,
    completedToday: 0,
    pendingDeliveries: 0,
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [driversRes, deliveriesRes, locationsRes] = await Promise.all([
        driversAPI.getAll(),
        deliveriesAPI.getAll(),
        locationsAPI.getAllLocations(),
      ]);

      const drivers = driversRes.data;
      const deliveries = deliveriesRes.data;
      const locations = locationsRes.data || [];

      // Calculate online drivers (location updated in last 5 minutes)
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      const onlineDrivers = locations.filter(loc => {
        const timestamp = loc.timestamp?._seconds ? loc.timestamp._seconds * 1000 : new Date(loc.timestamp).getTime();
        return timestamp > fiveMinutesAgo;
      }).length;

      // Count active deliveries (assigned or completed but not approved)
      const activeDeliveries = deliveries.filter(
        d => d.status === 'assigned' || d.status === 'completed'
      ).length;

      // Count pending deliveries
      const pendingDeliveries = deliveries.filter(d => d.status === 'pending').length;

      // Count completed today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const completedToday = deliveries.filter(d => {
        if (d.status !== 'approved' || !d.approvedAt) return false;
        const approvedDate = d.approvedAt._seconds 
          ? new Date(d.approvedAt._seconds * 1000) 
          : new Date(d.approvedAt);
        return approvedDate >= today;
      }).length;

      setStats({
        totalDrivers: drivers.length,
        onlineDrivers: onlineDrivers,
        activeDeliveries: activeDeliveries,
        totalDeliveryPoints: deliveries.length,
        completedToday: completedToday,
        pendingDeliveries: pendingDeliveries,
      });

      // Get recent deliveries for activity feed
      const recent = deliveries
        .sort((a, b) => {
          const timeA = a.updatedAt?._seconds || a.createdAt?._seconds || 0;
          const timeB = b.updatedAt?._seconds || b.createdAt?._seconds || 0;
          return timeB - timeA;
        })
        .slice(0, 5);

      setRecentActivity(recent);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      await fetchDashboardData();
    };

    fetchData();
  }, []);
  
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'assigned': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'approved': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp._seconds ? new Date(timestamp._seconds * 1000) : new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Dashboard Overview</h1>
        <button
          onClick={fetchDashboardData}
          className="text-sm text-blue-600 hover:text-blue-800 font-semibold"
        >
          Refresh Data
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Total Drivers</p>
              <p className="text-3xl font-bold text-gray-800">{stats.totalDrivers}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Online Now</p>
              <p className="text-3xl font-bold text-green-600">{stats.onlineDrivers}</p>
              <p className="text-xs text-gray-500 mt-1">of {stats.totalDrivers} drivers</p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Active Deliveries</p>
              <p className="text-3xl font-bold text-orange-600">{stats.activeDeliveries}</p>
              <p className="text-xs text-gray-500 mt-1">{stats.pendingDeliveries} pending</p>
            </div>
            <div className="bg-orange-100 p-3 rounded-full">
              <Package className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Total Deliveries</p>
              <p className="text-3xl font-bold text-purple-600">{stats.totalDeliveryPoints}</p>
              <p className="text-xs text-gray-500 mt-1">{stats.completedToday} completed today</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-full">
              <MapPin className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Recent Activity</h2>
          
          {recentActivity.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No recent activity</p>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((delivery) => (
                <div
                  key={delivery.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Package className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-800 truncate">{delivery.title}</h3>
                      <p className="text-sm text-gray-600 truncate">{delivery.destination}</p>
                      {delivery.driverName && (
                        <p className="text-xs text-gray-500">Driver: {delivery.driverName}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(delivery.status)}`}>
                      {delivery.status}
                    </span>
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTime(delivery.updatedAt || delivery.createdAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Today's Summary</h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-gray-700">Completed</span>
              </div>
              <span className="text-xl font-bold text-green-600">{stats.completedToday}</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Package className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-gray-700">Active</span>
              </div>
              <span className="text-xl font-bold text-blue-600">{stats.activeDeliveries}</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-yellow-600" />
                <span className="text-sm font-medium text-gray-700">Pending</span>
              </div>
              <span className="text-xl font-bold text-yellow-600">{stats.pendingDeliveries}</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Online Drivers</span>
              </div>
              <span className="text-xl font-bold text-gray-800">
                {stats.onlineDrivers}/{stats.totalDrivers}
              </span>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <a
                href="/delivery-points"
                className="block w-full text-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-semibold"
              >
                Add Delivery Point
              </a>
              <a
                href="/assignments"
                className="block w-full text-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm font-semibold"
              >
                Assign Drivers
              </a>
              <a
                href="/map"
                className="block w-full text-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm font-semibold"
              >
                View Live Map
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;