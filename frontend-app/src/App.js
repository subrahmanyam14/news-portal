import React, { useState } from 'react';
import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import { AuthProvider } from './components/AuthContext';
import Dashboard from './components/Dashboard';
import Footer from './components/Footer';
import Login from './components/Login';
import Navbar from './components/Navbar';
import NewspaperViewer from './components/newspaper-viewer/NewspaperViewer';
import SuperAdminDashboard from './components/SuperAdminDashboard';

const App = () => {
  const [currentDate, setCurrentDate] = useState(new Date());

  // Protected route component
  const ProtectedRoute = ({ children }) => {
    const isAuthenticated = localStorage.getItem('token') !== null;
    return isAuthenticated ? children : <Navigate to="/login" />;
  };

  // Super Admin route component
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
        <div className="flex flex-col min-h-screen">
          <Navbar
            currentDate={currentDate}
            onDateChange={handleDateChange}
          />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<NewspaperViewer currentDate={currentDate} onDateChange={handleDateChange} />} />
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
                
                  <SuperAdminDashboard />
                
              }
            />
            <Route path="*" element={<Navigate to="/login" />} />
          </Routes>
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );
};



export default App;
