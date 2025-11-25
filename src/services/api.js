import axios from 'axios';

const API_BASE_URL = 'https://driver-admin-backend-production.up.railway.app/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests automatically
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API calls
export const authAPI = {
  login: (username, password) => 
    api.post('/auth/login', { username, password }),
};

// Drivers API calls
export const driversAPI = {
  getAll: () => api.get('/drivers'),
  getById: (id) => api.get(`/drivers/${id}`),
  create: (data) => api.post('/drivers', {
    username: data.username,
    password: data.password,
    fullname: data.fullname,
    phone: data.phone,
  }),
  update: (id, data) => {
    const updateData = {
      fullname: data.fullname,
      phone: data.phone,
    };
    if (data.password) {
      updateData.password = data.password;
    }
    return api.put(`/drivers/${id}`, updateData);
  },
  delete: (id) => api.delete(`/drivers/${id}`),
};

// Deliveries API calls
export const deliveriesAPI = {
  getAll: () => api.get('/deliveries'),
  getById: (id) => api.get(`/deliveries/${id}`),
  getImageById: (id) => api.get(`/deliveries/${id}/proof-of-delivery`),
  create: (data) => api.post('/deliveries', {
    title: data.title,
    description: data.description,
    destination: data.destination,
    items: data.items,
  }),
  update: (id, data) => api.put(`/deliveries/${id}`, data),
  delete: (id) => api.delete(`/deliveries/${id}`),
  assignDriver: (id, driverId) => api.patch(`/deliveries/${id}/assign`, { driverId }),
  markCompleted: (id) => api.post(`/deliveries/${id}/complete`),
  approve: (id) => api.post(`/deliveries/${id}/approve`),
};

export const locationsAPI = {
  getAllLocations: () => api.get('/locations'),
  getDriverLocation: (driverId) => api.get(`/locations/${driverId}`),
};


export default api;