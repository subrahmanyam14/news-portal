import React, { useState } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate
} from 'react-router-dom';

import { AuthProvider } from './components/AuthContext';
import Dashboard from './components/Dashboard';
import Footer from './components/Footer';
import Login from './components/Login';
import Navbar from './components/Navbar';
import NewspaperViewer from './components/newspaper-viewer/NewspaperViewer';
import SuperAdminDashboard from './components/SuperAdminDashboard';
import ImageMetaViewer from './components/ImageMetaViewer';

const App = () => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const ProtectedRoute = ({ children }) => {
    const isAuthenticated = localStorage.getItem('token') !== null;
    return isAuthenticated ? children : <Navigate to="/login" />;
  };

  const SuperAdminRoute = ({ children }) => {
    const isAuthenticated = localStorage.getItem('token') !== null;
    const isSuperAdmin = localStorage.getItem('isSuperAdmin') === 'true';
    return isAuthenticated && isSuperAdmin ? children : <Navigate to="/login" />;
  };

  const handleDateChange = (date) => {
    setCurrentDate(new Date(date));
  };

  return (
    <AuthProvider>
      <Router>
        <Routes>

          {/* Image sharing preview route – NO navbar/footer */}
          <Route path="/view-image" element={<ImageMetaViewer />} />

          {/* Main layout with navbar/footer */}
          <Route path="*" element={
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
          } />

        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
