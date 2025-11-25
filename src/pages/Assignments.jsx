import React, { useState, useEffect } from 'react';
import { Search, Package, User, MapPin, Calendar, CheckCircle, X, AlertCircle } from 'lucide-react';
import { deliveriesAPI, driversAPI } from '../services/api';

const Assignments = () => {
  const [drivers, setDrivers] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [selectedDeliveries, setSelectedDeliveries] = useState([]);
  const [availableDeliveries, setAvailableDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAssignModal, setShowAssignModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [driversRes, deliveriesRes] = await Promise.all([
        driversAPI.getAll(),
        deliveriesAPI.getAll()
      ]);
      setDrivers(driversRes.data);
      setDeliveries(deliveriesRes.data);
      
      // Filter pending deliveries
      const pending = deliveriesRes.data.filter(d => d.status === 'pending');
      setAvailableDeliveries(pending);
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDriver = (driver) => {
    setSelectedDriver(driver);
    setSelectedDeliveries([]);
    
    // Get deliveries assigned to this driver
    const driverDeliveries = deliveries.filter(
      d => d.assignedDriverId === driver.id && d.status !== 'approved'
    );
    setSelectedDeliveries(driverDeliveries);
  };

  const handleOpenAssignModal = () => {
    if (!selectedDriver) {
      alert('Please select a driver first');
      return;
    }
    setShowAssignModal(true);
  };

  const handleToggleDelivery = (delivery) => {
    const isSelected = selectedDeliveries.some(d => d.id === delivery.id);
    
    if (isSelected) {
      setSelectedDeliveries(selectedDeliveries.filter(d => d.id !== delivery.id));
    } else {
      setSelectedDeliveries([...selectedDeliveries, delivery]);
    }
  };

  const handleAssignDeliveries = async () => {
    if (!selectedDriver) {
      alert('Please select a driver');
      return;
    }

    if (selectedDeliveries.length === 0) {
      alert('Please select at least one delivery');
      return;
    }

    try {
      // Get only newly selected deliveries (pending ones)
      const newDeliveries = selectedDeliveries.filter(d => d.status === 'pending');
      
      if (newDeliveries.length === 0) {
        alert('No new deliveries to assign');
        return;
      }

      // Assign each delivery
      await Promise.all(
        newDeliveries.map(delivery => 
          deliveriesAPI.assignDriver(delivery.id, selectedDriver.id)
        )
      );

      alert(`Successfully assigned ${newDeliveries.length} delivery(ies) to ${selectedDriver.fullname}`);
      setShowAssignModal(false);
      fetchData();
      
      // Refresh selected driver's deliveries
      handleSelectDriver(selectedDriver);
    } catch (error) {
      console.error('Error assigning deliveries:', error);
      alert(error.response?.data?.message || 'Failed to assign deliveries');
    }
  };

  const handleUnassignDelivery = async (delivery) => {
    if (window.confirm(`Unassign "${delivery.title}" from ${selectedDriver?.fullname}?`)) {
      try {
        await deliveriesAPI.update(delivery.id, {
          assignedDriverId: null,
          driverName: null,
          status: 'pending'
        });
        alert('Delivery unassigned successfully');
        fetchData();
        handleSelectDriver(selectedDriver);
      } catch (error) {
        console.error('Error unassigning delivery:', error);
        alert('Failed to unassign delivery');
      }
    }
  };

  const filteredDrivers = drivers.filter(driver =>
    driver.fullname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    driver.username?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getDriverStats = (driver) => {
    const assigned = deliveries.filter(
      d => d.assignedDriverId === driver.id && d.status === 'assigned'
    ).length;
    const completed = deliveries.filter(
      d => d.assignedDriverId === driver.id && d.status === 'completed'
    ).length;
    const approved = deliveries.filter(
      d => d.assignedDriverId === driver.id && d.status === 'approved'
    ).length;
    
    return { assigned, completed, approved, total: assigned + completed };
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'assigned': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'approved': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Assignment Management</h1>
        <p className="text-gray-600">Assign delivery points to drivers and manage their routes</p>
      </div>

      {loading ? (
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading data...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Drivers List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b">
                <h2 className="text-lg font-bold text-gray-800 mb-3">Select Driver</h2>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search drivers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="max-h-[600px] overflow-y-auto">
                {filteredDrivers.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <User className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                    <p>No drivers found</p>
                  </div>
                ) : (
                  filteredDrivers.map((driver) => {
                    const stats = getDriverStats(driver);
                    const isSelected = selectedDriver?.id === driver.id;
                    
                    return (
                      <div
                        key={driver.id}
                        onClick={() => handleSelectDriver(driver)}
                        className={`p-4 border-b cursor-pointer transition ${
                          isSelected ? 'bg-blue-50 border-l-4 border-l-blue-600' : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-semibold text-gray-800">{driver.fullname}</h3>
                            <p className="text-sm text-gray-500">@{driver.username}</p>
                          </div>
                          {stats.total > 0 && (
                            <span className="bg-blue-600 text-white text-xs font-semibold px-2 py-1 rounded-full">
                              {stats.total}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex gap-2 text-xs">
                          {stats.assigned > 0 && (
                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              {stats.assigned} assigned
                            </span>
                          )}
                          {stats.completed > 0 && (
                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded">
                              {stats.completed} completed
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Assignment Details */}
          <div className="lg:col-span-2">
            {!selectedDriver ? (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <User className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-xl font-semibold text-gray-800 mb-2">No Driver Selected</h3>
                <p className="text-gray-600">Select a driver from the list to view and manage their assignments</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Driver Info Card */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-800">{selectedDriver.fullname}</h2>
                      <p className="text-gray-600">@{selectedDriver.username} • {selectedDriver.phone}</p>
                    </div>
                    <button
                      onClick={handleOpenAssignModal}
                      className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                    >
                      <Package className="w-5 h-5" />
                      Assign Deliveries
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <p className="text-sm text-blue-600 font-semibold">Assigned</p>
                      <p className="text-2xl font-bold text-blue-700">{getDriverStats(selectedDriver).assigned}</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <p className="text-sm text-green-600 font-semibold">Completed</p>
                      <p className="text-2xl font-bold text-green-700">{getDriverStats(selectedDriver).completed}</p>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <p className="text-sm text-purple-600 font-semibold">Approved</p>
                      <p className="text-2xl font-bold text-purple-700">{getDriverStats(selectedDriver).approved}</p>
                    </div>
                  </div>
                </div>

                {/* Assigned Deliveries */}
                <div className="bg-white rounded-lg shadow">
                  <div className="p-4 border-b">
                    <h3 className="text-lg font-bold text-gray-800">Assigned Deliveries</h3>
                    <p className="text-sm text-gray-600">Current delivery route for this driver</p>
                  </div>

                  <div className="p-4">
                    {selectedDeliveries.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Package className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                        <p>No deliveries assigned yet</p>
                        <button
                          onClick={handleOpenAssignModal}
                          className="mt-4 text-blue-600 hover:text-blue-800 font-semibold"
                        >
                          Assign Deliveries →
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {selectedDeliveries.map((delivery, index) => (
                          <div
                            key={delivery.id}
                            className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <span className="bg-blue-600 text-white text-sm font-bold px-2 py-1 rounded">
                                    #{index + 1}
                                  </span>
                                  <h4 className="font-semibold text-gray-800">{delivery.title}</h4>
                                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(delivery.status)}`}>
                                    {delivery.status}
                                  </span>
                                </div>

                                <div className="space-y-1 ml-11">
                                  <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <MapPin className="w-4 h-4" />
                                    <span>{delivery.destination}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Package className="w-4 h-4" />
                                    <span>{delivery.items?.length || 0} items</span>
                                  </div>
                                </div>
                              </div>

                              {delivery.status === 'assigned' && (
                                <button
                                  onClick={() => handleUnassignDelivery(delivery)}
                                  className="text-red-600 hover:text-red-800 p-2"
                                  title="Unassign"
                                >
                                  <X className="w-5 h-5" />
                                </button>
                              )}

                              {delivery.status === 'completed' && (
                                <div className="text-green-600 p-2">
                                  <CheckCircle className="w-5 h-5" />
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Assign Deliveries Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-gray-800">Assign Deliveries</h2>
                <p className="text-sm text-gray-600">to {selectedDriver?.fullname}</p>
              </div>
              <button onClick={() => setShowAssignModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              {availableDeliveries.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <AlertCircle className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <p>No available deliveries to assign</p>
                  <p className="text-sm mt-1">All deliveries are already assigned or completed</p>
                </div>
              ) : (
                <>
                  <p className="text-gray-600 mb-4">
                    Select deliveries to assign to this driver. They will be added to their current route.
                  </p>

                  <div className="space-y-3 mb-6">
                    {availableDeliveries.map((delivery) => {
                      const isSelected = selectedDeliveries.some(d => d.id === delivery.id);
                      
                      return (
                        <div
                          key={delivery.id}
                          onClick={() => handleToggleDelivery(delivery)}
                          className={`border rounded-lg p-4 cursor-pointer transition ${
                            isSelected 
                              ? 'border-blue-600 bg-blue-50' 
                              : 'border-gray-200 hover:border-blue-300'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="mt-1 w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-800 mb-1">{delivery.title}</h4>
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <MapPin className="w-4 h-4" />
                                  <span>{delivery.destination}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <Package className="w-4 h-4" />
                                  <span>{delivery.items?.length || 0} items</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={() => setShowAssignModal(false)}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAssignDeliveries}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      disabled={selectedDeliveries.filter(d => d.status === 'pending').length === 0}
                    >
                      Assign {selectedDeliveries.filter(d => d.status === 'pending').length} Delivery(ies)
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Assignments;