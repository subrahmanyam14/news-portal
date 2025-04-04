import React, { useState } from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import NewspaperViewer from './components/NewspaperViewer';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import { AuthProvider } from './components/AuthContext';

const App = () => {
  const [currentDate, setCurrentDate] = useState(new Date());

  // Protected route component
  const ProtectedRoute = ({ children }) => {
    const isAuthenticated = localStorage.getItem('token') !== null;
    return isAuthenticated ? children : <Navigate to="/login" />;
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
            <Route path="*" element={<Navigate to="/login" />} />
          </Routes>
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );
};

export default App;