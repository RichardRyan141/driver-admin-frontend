import React, { useState, useEffect } from 'react';
import { Search, Filter, Eye, CheckCircle, XCircle, Clock, Package, MapPin, User, Calendar, X, Image as ImageIcon, ZoomIn } from 'lucide-react';
import { deliveriesAPI } from '../services/api';

const DeliveryStatus = () => {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [deliveryImages, setDeliveryImages] = useState({
    signage: null,
    items: [],
    driverOrder: null
  });
  const [loadingImages, setLoadingImages] = useState(false);

  useEffect(() => {
    fetchDeliveries();
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

  const loadDeliveryImages = async (deliveryId) => {
    setLoadingImages(true);

    try {
      // Call backend to get proof of delivery files
      const response = await deliveriesAPI.getById(deliveryId); 
      const data = response.data;

      // Assuming your backend returns a structure like:
      // { proofOfDelivery: { packageImages: [], locationImage: '', signature: '' } }

      setDeliveryImages({
        signage: data.proofOfDelivery?.locationImage || null,
        items: data.proofOfDelivery?.packageImages || [],
        driverOrder: data.proofOfDelivery?.signature || null,
      });

    } catch (err) {
      console.error('Error loading delivery images:', err);
    } finally {
      setLoadingImages(false);
    }
  };

  const handleViewDetails = async (delivery) => {
    setSelectedDelivery(delivery);
    if (delivery.status === 'completed' || delivery.status === 'approved') {
      await loadDeliveryImages(delivery.id);
    }
    setShowDetailModal(true);
  };

  const handleImageClick = (imageUrl) => {
    setSelectedImage(imageUrl);
    setShowImageModal(true);
  };

  const handleApprove = async (delivery) => {
    if (window.confirm(`Approve delivery "${delivery.title}"?\n\nPlease ensure you have reviewed all proof-of-delivery images.`)) {
      try {
        await deliveriesAPI.approve(delivery.id);
        alert('Delivery approved successfully!');
        fetchDeliveries();
        if (selectedDelivery?.id === delivery.id) {
          setShowDetailModal(false);
        }
      } catch (error) {
        console.error('Error approving delivery:', error);
        alert(error.response?.data?.message || 'Failed to approve delivery');
      }
    }
  };

  const handleReject = async (delivery) => {
    const reason = prompt('Please enter rejection reason (optional):');
    if (reason !== null) {
      if (window.confirm(`Reject and unassign delivery "${delivery.title}"? This will set it back to pending status.`)) {
        try {
          await deliveriesAPI.update(delivery.id, {
            status: 'pending',
            assignedDriverId: null,
            driverName: null,
            completedAt: null,
            rejectionReason: reason || 'No reason provided'
          });
          alert('Delivery rejected and set back to pending');
          fetchDeliveries();
          if (selectedDelivery?.id === delivery.id) {
            setShowDetailModal(false);
          }
        } catch (error) {
          console.error('Error rejecting delivery:', error);
          alert('Failed to reject delivery');
        }
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

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <Clock className="w-5 h-5" />;
      case 'assigned': return <Package className="w-5 h-5" />;
      case 'completed': return <CheckCircle className="w-5 h-5" />;
      case 'approved': return <CheckCircle className="w-5 h-5" />;
      default: return <Package className="w-5 h-5" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'assigned': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'approved': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusBadge = (status) => {
    return (
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${getStatusColor(status)}`}>
        {getStatusIcon(status)}
        <span className="font-semibold capitalize">{status}</span>
      </div>
    );
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp._seconds * 1000);
    return date.toLocaleString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const stats = {
    total: deliveries.length,
    pending: deliveries.filter(d => d.status === 'pending').length,
    assigned: deliveries.filter(d => d.status === 'assigned').length,
    completed: deliveries.filter(d => d.status === 'completed').length,
    approved: deliveries.filter(d => d.status === 'approved').length,
  };

  // Determine grid layout based on number of items
  const getItemGridClass = (itemCount) => {
    if (itemCount === 1) return 'grid-cols-1';
    if (itemCount === 2) return 'grid-cols-2';
    if (itemCount === 3) return 'grid-cols-3';
    if (itemCount === 4) return 'grid-cols-2 md:grid-cols-2';
    return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4';
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Delivery Status</h1>
        <p className="text-gray-600">Monitor and manage all delivery statuses</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-600 mb-1">Total</p>
          <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg shadow border border-yellow-200">
          <p className="text-sm text-yellow-700 mb-1">Pending</p>
          <p className="text-2xl font-bold text-yellow-800">{stats.pending}</p>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg shadow border border-blue-200">
          <p className="text-sm text-blue-700 mb-1">Assigned</p>
          <p className="text-2xl font-bold text-blue-800">{stats.assigned}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg shadow border border-green-200">
          <p className="text-sm text-green-700 mb-1">Completed</p>
          <p className="text-2xl font-bold text-green-800">{stats.completed}</p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg shadow border border-purple-200">
          <p className="text-sm text-purple-700 mb-1">Approved</p>
          <p className="text-2xl font-bold text-purple-800">{stats.approved}</p>
        </div>
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
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="assigned">Assigned</option>
              <option value="completed">Completed (Needs Approval)</option>
              <option value="approved">Approved</option>
            </select>
          </div>
        </div>
      </div>

      {/* Deliveries List */}
      <div className="bg-white rounded-lg shadow">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading deliveries...</p>
          </div>
        ) : filteredDeliveries.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500 text-lg">No deliveries found</p>
            <p className="text-gray-400 text-sm mt-2">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Delivery</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Destination</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Driver</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredDeliveries.map((delivery) => (
                  <tr key={delivery.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-semibold text-gray-800">{delivery.title}</div>
                        <div className="text-sm text-gray-500 flex items-center gap-1">
                          <Package className="w-3 h-3" />
                          {delivery.items?.length || 0} items
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-start gap-2 text-sm text-gray-600">
                        <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span className="line-clamp-2">{delivery.destination}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {delivery.driverName ? (
                        <div className="flex items-center gap-2 text-sm">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-blue-600" />
                          </div>
                          <span className="font-medium text-gray-800">{delivery.driverName}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(delivery.status)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {formatDate(delivery.createdAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleViewDetails(delivery)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="View Details"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        {delivery.status === 'completed' && (
                          <>
                            <button
                              onClick={() => handleApprove(delivery)}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
                              title="Approve"
                            >
                              <CheckCircle className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleReject(delivery)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                              title="Reject"
                            >
                              <XCircle className="w-5 h-5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedDelivery && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center z-10">
              <div>
                <h2 className="text-xl font-bold text-gray-800">Delivery Details</h2>
                <p className="text-sm text-gray-600">{selectedDelivery.title}</p>
              </div>
              <button onClick={() => setShowDetailModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Status */}
              <div>
                <label className="text-sm font-semibold text-gray-600 block mb-2">Status</label>
                {getStatusBadge(selectedDelivery.status)}
              </div>

              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-gray-600 block mb-1">Title</label>
                  <p className="text-gray-900">{selectedDelivery.title}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600 block mb-1">Created At</label>
                  <p className="text-gray-900">{formatDate(selectedDelivery.createdAt)}</p>
                </div>
              </div>

              {/* Description */}
              {selectedDelivery.description && (
                <div>
                  <label className="text-sm font-semibold text-gray-600 block mb-1">Description</label>
                  <p className="text-gray-900">{selectedDelivery.description}</p>
                </div>
              )}

              {/* Destination */}
              <div>
                <label className="text-sm font-semibold text-gray-600 block mb-1">Destination</label>
                <div className="flex items-start gap-2 text-gray-900">
                  <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                  <span>{selectedDelivery.destination}</span>
                </div>
              </div>

              {/* Driver Info */}
              {selectedDelivery.driverName && (
                <div>
                  <label className="text-sm font-semibold text-gray-600 block mb-2">Assigned Driver</label>
                  <div className="flex items-center gap-3 bg-blue-50 p-3 rounded-lg border border-blue-200">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-blue-600" />
                    </div>
                    <span className="font-medium text-gray-800">{selectedDelivery.driverName}</span>
                  </div>
                </div>
              )}

              {/* Items */}
              <div>
                <label className="text-sm font-semibold text-gray-600 block mb-2">Items ({selectedDelivery.items?.length || 0})</label>
                <div className="space-y-2">
                  {selectedDelivery.items?.map((item, index) => (
                    <div key={index} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                      <span className="text-gray-900">{item.name}</span>
                      <span className="text-gray-600 font-semibold">Qty: {item.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Proof of Delivery Images */}
              {(selectedDelivery.status === 'completed' || selectedDelivery.status === 'approved') && (
                <div className="border-t pt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <ImageIcon className="w-5 h-5 text-blue-600" />
                    <label className="text-lg font-bold text-gray-800">Proof of Delivery</label>
                  </div>

                  {loadingImages ? (
                    <div className="py-12 text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="mt-4 text-gray-600">Loading images...</p>
                    </div>
                  ) : (
                    <>
                      {/* Signage Photo */}
                      {deliveryImages.signage && (
                        <div className="mb-6">
                          <h4 className="text-sm font-semibold text-gray-700 mb-3">Store Signage</h4>
                          <img
                            src={deliveryImages.signage}
                            alt="Store Signage"
                            onClick={() => handleImageClick(deliveryImages.signage)}
                            className="w-full h-64 object-cover rounded-lg cursor-pointer hover:opacity-80 transition"
                          />
                        </div>
                      )}

                      {/* Item Photos */}
                      {deliveryImages.items.length > 0 && (
                        <div className="mb-6">
                          <h4 className="text-sm font-semibold text-gray-700 mb-3">
                            Items Photos ({deliveryImages.items.length})
                          </h4>
                          <div className={`grid ${getItemGridClass(deliveryImages.items.length)} gap-4`}>
                            {deliveryImages.items.map((imgUrl, idx) => (
                              <div key={idx} className="relative">
                                <img
                                  src={imgUrl}
                                  alt={`Item ${idx + 1}`}
                                  onClick={() => handleImageClick(imgUrl)}
                                  className="w-full h-40 object-cover rounded-lg cursor-pointer hover:opacity-80 transition"
                                />
                                <div className="absolute top-2 left-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
                                  Item {idx + 1}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Driver Order Photo */}
                      {deliveryImages.driverOrder && (
                        <div className="mb-4">
                          <h4 className="text-sm font-semibold text-gray-700 mb-3">Driver Order (DO)</h4>
                          <img
                            src={deliveryImages.driverOrder}
                            alt="Driver Order"
                            onClick={() => handleImageClick(deliveryImages.driverOrder)}
                            className="w-full h-64 object-cover rounded-lg cursor-pointer hover:opacity-80 transition"
                          />
                        </div>
                      )}

                      {/* Warning if no images found */}
                      {!deliveryImages.signage && deliveryImages.items.length === 0 && !deliveryImages.driverOrder && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                          <ImageIcon className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
                          <p className="text-yellow-800 font-semibold">No proof-of-delivery images found</p>
                          <p className="text-yellow-600 text-sm mt-1">The driver may not have uploaded the images yet.</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Timestamps */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedDelivery.completedAt && (
                  <div>
                    <label className="text-sm font-semibold text-gray-600 block mb-1">Completed At</label>
                    <p className="text-gray-900">{formatDate(selectedDelivery.completedAt)}</p>
                  </div>
                )}
                {selectedDelivery.approvedAt && (
                  <div>
                    <label className="text-sm font-semibold text-gray-600 block mb-1">Approved At</label>
                    <p className="text-gray-900">{formatDate(selectedDelivery.approvedAt)}</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              {selectedDelivery.status === 'completed' && (
                <div className="flex gap-3 pt-4 border-t">
                  <button
                    onClick={() => handleApprove(selectedDelivery)}
                    className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition font-semibold"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Approve Delivery
                  </button>
                  <button
                    onClick={() => handleReject(selectedDelivery)}
                    className="flex-1 flex items-center justify-center gap-2 bg-red-600 text-white px-4 py-3 rounded-lg hover:bg-red-700 transition font-semibold"
                  >
                    <XCircle className="w-5 h-5" />
                    Reject & Request Re-upload
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Image Zoom Modal */}
      {showImageModal && selectedImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[60] p-4"
          onClick={() => setShowImageModal(false)}
        >
          <div className="relative max-w-6xl max-h-[90vh] w-full h-full flex items-center justify-center">
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute top-4 right-4 text-white hover:text-gray-300 bg-black bg-opacity-50 rounded-full p-2"
            >
              <X className="w-8 h-8" />
            </button>
            <img
              src={selectedImage}
              alt="Zoomed view"
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliveryStatus;