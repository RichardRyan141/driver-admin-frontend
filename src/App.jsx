import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Drivers from './pages/Drivers';
import DeliveryPoints from './pages/DeliveryPoints';
import Assignments from './pages/Assignments';
import DeliveryStatus from './pages/DeliveryStatus';
import Map from './pages/Map';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <Layout>
                  <Routes>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/drivers" element={<Drivers />} />
                    <Route path="/delivery-points" element={<DeliveryPoints />} />
                    <Route path="/assignments" element={<Assignments />} />
                    <Route path="/deliveries" element={<DeliveryStatus />} />
                    <Route path="/map" element={<Map />} />
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;