import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import NewspaperViewer from './components/NewspaperViewer';
import LoadingSpinner from './components/LoadingSpinner';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import Login from './components/Login';

const App = () => {

  const [currentDate, setCurrentDate] = useState(new Date());


  // Protected route component
  const ProtectedRoute = ({ children }) => {
    const isAuthenticated = localStorage.getItem('token') !== null;

    if (!isAuthenticated) {
      return <Navigate to="/login" />;
    }

    return children;
  };


  const handleDateChange = (date) => {
    setCurrentDate(new Date(date));
  };


  return (
    <Router>
      <div className="flex flex-col min-h-screen">
        <Navbar
          currentDate={currentDate}
          onDateChange={handleDateChange}
        />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path='/' element={<NewspaperViewer currentDate={currentDate}
            onDateChange={handleDateChange} />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <>
                  <Dashboard />
                </>
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
        <Footer/>
      </div>
    </Router>
  );
};

export default App;

