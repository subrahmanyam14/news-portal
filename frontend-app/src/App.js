import React, { useState } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate
} from 'react-router-dom';

import { AuthProvider, useAuth } from './components/AuthContext';
import Dashboard from './components/Dashboard';
import Footer from './components/Footer';
import Login from './components/Login';
import Navbar from './components/Navbar';
import NewspaperViewer from './components/newspaper-viewer/NewspaperViewer';
import SuperAdminDashboard from './components/SuperAdminDashboard';
import ImageMetaViewer from './components/ImageMetaViewer';

// Create ProtectedRoute component that uses AuthContext
const ProtectedRoute = ({ children }) => {
  const { isLoggedIn, loading } = useAuth();
  
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }
  
  return isLoggedIn ? children : <Navigate to="/login" />;
};

// Create SuperAdminRoute component that uses AuthContext
const SuperAdminRoute = ({ children }) => {
  const { isLoggedIn, user, loading } = useAuth();
  
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }
  
  const isSuperAdmin = isLoggedIn && user && user.role === "superadmin";
  return isSuperAdmin ? children : <Navigate to="/login" />;
};

const AppContent = () => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const handleDateChange = (date) => {
    setCurrentDate(new Date(date));
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar
        currentDate={currentDate}
        onDateChange={handleDateChange}
      />

      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/super-admin"
          element={
            <SuperAdminRoute>
              <SuperAdminDashboard />
            </SuperAdminRoute>
          }
        />
        <Route
          path="/"
          element={
            <NewspaperViewer
              currentDate={currentDate}
              onDateChange={handleDateChange}
            />
          }
        />
      </Routes>

      <Footer />
    </div>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Image sharing preview route – NO navbar/footer */}
          <Route path="/view-image" element={<ImageMetaViewer />} />

          {/* Main layout with navbar/footer */}
          <Route path="*" element={<AppContent />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;