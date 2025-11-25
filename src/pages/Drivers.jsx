import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit, Trash2, Eye, Phone, User, X } from 'lucide-react';
import { driversAPI } from '../services/api';

const Drivers = () => {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add', 'edit', 'view'
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [formData, setFormData] = useState({
    fullname: '',
    username: '',
    password: '',
    phone: '',
  });

  useEffect(() => {
    fetchDrivers();
  }, []);

  const fetchDrivers = async () => {
    try {
      setLoading(true);
      const response = await driversAPI.getAll();
      setDrivers(response.data);
    } catch (error) {
      console.error('Error fetching drivers:', error);
      alert('Failed to load drivers');
    } finally {
      setLoading(false);
    }
  };

  const handleAddDriver = () => {
    setModalMode('add');
    setFormData({
      fullname: '',
      username: '',
      password: '',
      phone: '',
    });
    setShowModal(true);
  };

  const handleEditDriver = (driver) => {
    setModalMode('edit');
    setSelectedDriver(driver);
    setFormData({
      fullname: driver.fullname || '',
      username: driver.username || '',
      password: '',
      phone: driver.phone || '',
    });
    setShowModal(true);
  };

  const handleViewDriver = (driver) => {
    setModalMode('view');
    setSelectedDriver(driver);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (modalMode === 'add') {
        await driversAPI.create(formData);
        alert('Driver added successfully!');
      } else if (modalMode === 'edit') {
        const updateData = {
          fullname: formData.fullname,
          phone: formData.phone,
        };
        if (formData.password) {
          updateData.password = formData.password;
        }
        await driversAPI.update(selectedDriver.id, updateData);
        alert('Driver updated successfully!');
      }
      setShowModal(false);
      fetchDrivers();
    } catch (error) {
      console.error('Error saving driver:', error);
      alert(error.response?.data?.message || 'Failed to save driver');
    }
  };

  const handleDeleteDriver = async (driver) => {
    if (window.confirm(`Are you sure you want to delete driver ${driver.fullname}?`)) {
      try {
        await driversAPI.delete(driver.id);
        alert('Driver deleted successfully!');
        fetchDrivers();
      } catch (error) {
        console.error('Error deleting driver:', error);
        alert(error.response?.data?.message || 'Failed to delete driver');
      }
    }
  };

  const filteredDrivers = drivers.filter(driver => {
    const matchesSearch = 
      driver.fullname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.phone?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp._seconds * 1000);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
            <a
                href="/dashboard"
                className="flex items-center gap-2 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition"
            >
                ← Back to Dashboard
            </a>

            <h1 className="text-3xl font-bold text-gray-800">Drivers Management</h1>
        </div>
        <button
          onClick={handleAddDriver}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="w-5 h-5" />
          Add Driver
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by name, username, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Drivers Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading drivers...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Driver</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredDrivers.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                      No drivers found
                    </td>
                  </tr>
                ) : (
                  filteredDrivers.map((driver) => (
                    <tr key={driver.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <User className="h-6 w-6 text-blue-600" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{driver.fullname}</div>
                            <div className="text-sm text-gray-500">@{driver.username}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900">
                          <Phone className="w-4 h-4 mr-2 text-gray-400" />
                          {driver.phone}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(driver.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleViewDriver(driver)}
                            className="text-blue-600 hover:text-blue-900"
                            title="View"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleEditDriver(driver)}
                            className="text-green-600 hover:text-green-900"
                            title="Edit"
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteDriver(driver)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">
                {modalMode === 'add' ? 'Add New Driver' : modalMode === 'edit' ? 'Edit Driver' : 'Driver Details'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            {modalMode === 'view' ? (
              <div className="p-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-gray-600">Full Name</label>
                    <p className="text-gray-900">{selectedDriver?.fullname}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600">Username</label>
                    <p className="text-gray-900">{selectedDriver?.username}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600">Phone</label>
                    <p className="text-gray-900">{selectedDriver?.phone}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600">Role</label>
                    <p className="text-gray-900">{selectedDriver?.role}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600">Created At</label>
                    <p className="text-gray-900">{formatDate(selectedDriver?.createdAt)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600">Updated At</label>
                    <p className="text-gray-900">{formatDate(selectedDriver?.updatedAt)}</p>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name *</label>
                    <input
                      type="text"
                      value={formData.fullname}
                      onChange={(e) => setFormData({...formData, fullname: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Username *</label>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData({...formData, username: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                      disabled={modalMode === 'edit'}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Password {modalMode === 'add' ? '*' : '(leave blank to keep current)'}
                    </label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required={modalMode === 'add'}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Phone *</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
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
                  >
                    {modalMode === 'add' ? 'Add Driver' : 'Save Changes'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Drivers;