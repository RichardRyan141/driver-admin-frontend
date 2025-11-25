import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit, Trash2, Eye, MapPin, Package, X, User } from 'lucide-react';
import { deliveriesAPI, driversAPI } from '../services/api';

const DeliveryPoints = () => {
  const [deliveries, setDeliveries] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    destination: '',
    items: [],
  });
  const [itemInput, setItemInput] = useState({ name: '', quantity: '' });
  const [selectedDriverId, setSelectedDriverId] = useState('');

  useEffect(() => {
    fetchDeliveries();
    fetchDrivers();
  }, []);

  const fetchDeliveries = async () => {
    try {
      setLoading(true);
      const response = await deliveriesAPI.getAll();
      setDeliveries(response.data);
    } catch (error) {
      console.error('Error fetching deliveries:', error);
      alert('Failed to load deliveries');
    } finally {
      setLoading(false);
    }
  };

  const fetchDrivers = async () => {
    try {
      const response = await driversAPI.getAll();
      setDrivers(response.data);
    } catch (error) {
      console.error('Error fetching drivers:', error);
    }
  };

  const handleAddDelivery = () => {
    setModalMode('add');
    setFormData({
      title: '',
      description: '',
      destination: '',
      items: [],
    });
    setShowModal(true);
  };

  const handleEditDelivery = (delivery) => {
    setModalMode('edit');
    setSelectedDelivery(delivery);
    setFormData({
      title: delivery.title || '',
      description: delivery.description || '',
      destination: delivery.destination || '',
      items: delivery.items || [],
    });
    setShowModal(true);
  };

  const handleViewDelivery = (delivery) => {
    setModalMode('view');
    setSelectedDelivery(delivery);
    setShowModal(true);
  };

  const handleAddItem = () => {
    if (itemInput.name && itemInput.quantity) {
      setFormData({
        ...formData,
        items: [...formData.items, { ...itemInput }],
      });
      setItemInput({ name: '', quantity: '' });
    }
  };

  const handleRemoveItem = (index) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (modalMode === 'add') {
        await deliveriesAPI.create(formData);
        alert('Delivery point created successfully!');
      } else if (modalMode === 'edit') {
        await deliveriesAPI.update(selectedDelivery.id, formData);
        alert('Delivery point updated successfully!');
      }
      setShowModal(false);
      fetchDeliveries();
    } catch (error) {
      console.error('Error saving delivery:', error);
      alert(error.response?.data?.message || 'Failed to save delivery');
    }
  };

  const handleDeleteDelivery = async (delivery) => {
    if (window.confirm(`Are you sure you want to delete "${delivery.title}"?`)) {
      try {
        await deliveriesAPI.delete(delivery.id);
        alert('Delivery deleted successfully!');
        fetchDeliveries();
      } catch (error) {
        console.error('Error deleting delivery:', error);
        alert('Failed to delete delivery');
      }
    }
  };

  const handleOpenAssignModal = (delivery) => {
    setSelectedDelivery(delivery);
    setSelectedDriverId(delivery.assignedDriverId || '');
    setShowAssignModal(true);
  };

  const handleAssignDriver = async () => {
    if (!selectedDriverId) {
      alert('Please select a driver');
      return;
    }
    try {
      await deliveriesAPI.assignDriver(selectedDelivery.id, selectedDriverId);
      alert('Driver assigned successfully!');
      setShowAssignModal(false);
      fetchDeliveries();
    } catch (error) {
      console.error('Error assigning driver:', error);
      alert(error.response?.data?.message || 'Failed to assign driver');
    }
  };

  const handleApproveDelivery = async (delivery) => {
    if (window.confirm(`Approve delivery "${delivery.title}"?`)) {
      try {
        await deliveriesAPI.approve(delivery.id);
        alert('Delivery approved!');
        fetchDeliveries();
      } catch (error) {
        console.error('Error approving delivery:', error);
        alert('Failed to approve delivery');
      }
    }
  };

  const filteredDeliveries = deliveries.filter(delivery => {
    const matchesSearch = 
      delivery.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      delivery.destination?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      delivery.driverName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || delivery.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'assigned': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'approved': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp._seconds * 1000);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Delivery Points Management</h1>
        <button
          onClick={handleAddDelivery}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="w-5 h-5" />
          Add Delivery Point
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by title, destination, or driver..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="assigned">Assigned</option>
              <option value="completed">Completed</option>
              <option value="approved">Approved</option>
            </select>
          </div>
        </div>
      </div>

      {/* Deliveries Grid */}
      {loading ? (
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading deliveries...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDeliveries.length === 0 ? (
            <div className="col-span-full text-center py-12 bg-white rounded-lg shadow">
              <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No delivery points found</p>
            </div>
          ) : (
            filteredDeliveries.map((delivery) => (
              <div key={delivery.id} className="bg-white rounded-lg shadow hover:shadow-lg transition p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-bold text-gray-800">{delivery.title}</h3>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(delivery.status)}`}>
                    {delivery.status}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-start gap-2 text-sm text-gray-600">
                    <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{delivery.destination}</span>
                  </div>
                  
                  {delivery.driverName && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <User className="w-4 h-4 flex-shrink-0" />
                      <span>Driver: {delivery.driverName}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Package className="w-4 h-4 flex-shrink-0" />
                    <span>{delivery.items?.length || 0} items</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleViewDelivery(delivery)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition text-sm"
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </button>
                  <button
                    onClick={() => handleEditDelivery(delivery)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition text-sm"
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteDelivery(delivery)}
                    className="px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition text-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {delivery.status === 'pending' && (
                  <button
                    onClick={() => handleOpenAssignModal(delivery)}
                    className="w-full mt-2 px-3 py-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition text-sm font-semibold"
                  >
                    Assign Driver
                  </button>
                )}

                {delivery.status === 'completed' && (
                  <button
                    onClick={() => handleApproveDelivery(delivery)}
                    className="w-full mt-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-semibold"
                  >
                    Approve Delivery
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">
                {modalMode === 'add' ? 'Add New Delivery Point' : modalMode === 'edit' ? 'Edit Delivery Point' : 'Delivery Details'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            {modalMode === 'view' ? (
              <div className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-semibold text-gray-600">Title</label>
                    <p className="text-gray-900">{selectedDelivery?.title}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600">Description</label>
                    <p className="text-gray-900">{selectedDelivery?.description || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600">Destination</label>
                    <p className="text-gray-900">{selectedDelivery?.destination}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600">Status</label>
                    <p><span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(selectedDelivery?.status)}`}>
                      {selectedDelivery?.status}
                    </span></p>
                  </div>
                  {selectedDelivery?.driverName && (
                    <div>
                      <label className="text-sm font-semibold text-gray-600">Assigned Driver</label>
                      <p className="text-gray-900">{selectedDelivery.driverName}</p>
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-semibold text-gray-600 mb-2 block">Items</label>
                    <div className="space-y-2">
                      {selectedDelivery?.items?.map((item, index) => (
                        <div key={index} className="flex justify-between items-center bg-gray-50 p-3 rounded">
                          <span className="text-gray-900">{item.name}</span>
                          <span className="text-gray-600">Qty: {item.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600">Created At</label>
                    <p className="text-gray-900">{formatDate(selectedDelivery?.createdAt)}</p>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Title *</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows="3"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Destination *</label>
                    <input
                      type="text"
                      value={formData.destination}
                      onChange={(e) => setFormData({...formData, destination: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Jl. Example No. 123, Surabaya"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Items *</label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        placeholder="Item name"
                        value={itemInput.name}
                        onChange={(e) => setItemInput({...itemInput, name: e.target.value})}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="text"
                        placeholder="Quantity"
                        value={itemInput.quantity}
                        onChange={(e) => setItemInput({...itemInput, quantity: e.target.value})}
                        className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={handleAddItem}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="space-y-2">
                      {formData.items.map((item, index) => (
                        <div key={index} className="flex justify-between items-center bg-gray-50 p-3 rounded">
                          <span className="text-gray-900">{item.name}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-gray-600">Qty: {item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(index)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    {formData.items.length === 0 && (
                      <p className="text-sm text-gray-500 mt-2">No items added yet</p>
                    )}
                  </div>
                </div>

                <div className="mt-6 flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    disabled={formData.items.length === 0}
                  >
                    {modalMode === 'add' ? 'Create Delivery' : 'Save Changes'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Assign Driver Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">Assign Driver</h2>
              <button onClick={() => setShowAssignModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              <p className="text-gray-600 mb-4">
                Assign a driver to: <strong>{selectedDelivery?.title}</strong>
              </p>

              <label className="block text-sm font-semibold text-gray-700 mb-2">Select Driver</label>
              <select
                value={selectedDriverId}
                onChange={(e) => setSelectedDriverId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              >
                <option value="">-- Select a driver --</option>
                {drivers.map((driver) => (
                  <option key={driver.id} value={driver.id}>
                    {driver.fullname} (@{driver.username})
                  </option>
                ))}
              </select>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssignDriver}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  disabled={!selectedDriverId}
                >
                  Assign Driver
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliveryPoints;