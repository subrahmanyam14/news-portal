import React, { useState, useEffect } from 'react';
import { Calendar, Search, Menu, X, LogIn, LayoutDashboard, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Navbar = ({ currentDate, onDateChange }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const navigate = useNavigate();

  // Check authentication status on component mount
  useEffect(() => {
    const checkAuthStatus = () => {
      const token = localStorage.getItem('token');
      setIsLoggedIn(!!token);
    };
  
    checkAuthStatus(); // Check initially
  
    window.addEventListener('storage', checkAuthStatus); // Listen for storage updates
  
    return () => {
      window.removeEventListener('storage', checkAuthStatus);
    };
  }, []);
  

  // Safely format date with fallback to today's date if not provided
  const formatDate = (date) => {
    const dateToFormat = date || new Date();
    try {
      return dateToFormat.toLocaleDateString('en-US', { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric' 
      });
    } catch (error) {
      console.error('Date formatting error:', error);
      return new Date().toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    }
  };

  // Handle date change safely
  const handleDateChange = (dateString) => {
    if (!onDateChange) return;
    try {
      const newDate = new Date(dateString);
      if (!isNaN(newDate.getTime())) {
        onDateChange(newDate);
      }
    } catch (error) {
      console.error('Date change error:', error);
    }
  };

  // Get safe date value for input
  const getSafeDateValue = () => {
    if (!currentDate) return new Date().toISOString().split('T')[0];
    try {
      return currentDate.toISOString().split('T')[0];
    } catch (error) {
      return new Date().toISOString().split('T')[0];
    }
  };

  // Handle login navigation
  const handleLogin = () => {
    navigate('/login');
  };

  // Handle dashboard navigation
  const handleDashboard = () => {
    navigate('/dashboard');
  };

  // Handle home navigation
  const handleHome = () => {
    navigate('/');
  };

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsLoggedIn(false);
    navigate('/');
  };

  return (
    <header className="bg-blue-900 text-white shadow-md">
      <div className="container mx-auto px-4 py-4 flex flex-wrap items-center justify-between">
        <div className="flex items-center">
          <div 
            className="mr-4 text-3xl font-bold cursor-pointer"
            onClick={handleHome}
          >
            <span className="text-yellow-400">E-</span> 
            <span className="text-blue-300">Paper</span>
          </div>
          <div className="hidden md:block text-sm">
            <span className="mr-2">|</span>
            <span>A Portrait of Telangana People's Life</span>
          </div>
        </div>
        
        <div className="hidden md:flex items-center space-x-4">
          <button 
            className="flex items-center px-3 py-1 bg-blue-800 rounded hover:bg-blue-700"
            onClick={() => setIsCalendarOpen(!isCalendarOpen)}
          >
            <Calendar className="w-4 h-4 mr-1" />
            <span>{formatDate(currentDate)}</span>
          </button>
          <div className="flex border border-blue-700 rounded overflow-hidden">
            <input 
              type="text" 
              placeholder="Search articles..." 
              className="px-3 py-1 bg-blue-800 text-white placeholder-blue-300 focus:outline-none"
            />
            <button className="px-2 bg-blue-700">
              <Search className="w-4 h-4" />
            </button>
          </div>
          
          {/* Login/Dashboard/Logout Buttons */}
          {isLoggedIn ? (
            <div className="flex space-x-2">
              <button
                onClick={handleDashboard}
                className="flex items-center px-3 py-1 bg-green-600 rounded hover:bg-green-700"
              >
                <LayoutDashboard className="w-4 h-4 mr-1" />
                <span>Dashboard</span>
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center px-3 py-1 bg-red-600 rounded hover:bg-red-700"
              >
                <LogOut className="w-4 h-4 mr-1" />
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogin}
              className="flex items-center px-3 py-1 bg-yellow-500 rounded hover:bg-yellow-600"
            >
              <LogIn className="w-4 h-4 mr-1" />
              <span>Login</span>
            </button>
          )}
        </div>
        
        <button 
          className="md:hidden"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>
      
      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden px-4 py-3 bg-blue-800 flex flex-col space-y-3">
          <button 
            className="flex items-center px-3 py-1 bg-blue-700 rounded"
            onClick={() => setIsCalendarOpen(!isCalendarOpen)}
          >
            <Calendar className="w-4 h-4 mr-1" />
            <span>{formatDate(currentDate)}</span>
          </button>
          
          {/* Mobile Login/Dashboard/Logout Buttons */}
          {isLoggedIn ? (
            <>
              <button
                onClick={handleDashboard}
                className="flex items-center px-3 py-1 bg-green-600 rounded hover:bg-green-700"
              >
                <LayoutDashboard className="w-4 h-4 mr-1" />
                <span>Dashboard</span>
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center px-3 py-1 bg-red-600 rounded hover:bg-red-700"
              >
                <LogOut className="w-4 h-4 mr-1" />
                <span>Logout</span>
              </button>
            </>
          ) : (
            <button
              onClick={handleLogin}
              className="flex items-center px-3 py-1 bg-yellow-500 rounded hover:bg-yellow-600"
            >
              <LogIn className="w-4 h-4 mr-1" />
              <span>Login</span>
            </button>
          )}
        </div>
      )}

      {/* Calendar popup */}
      {isCalendarOpen && (
        <div className="absolute top-20 right-4 md:right-20 bg-white p-4 rounded shadow-lg z-10">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-medium">Select Date</h3>
            <button onClick={() => setIsCalendarOpen(false)}>
              <X className="w-4 h-4" />
            </button>
          </div>
          <input 
            type="date" 
            value={getSafeDateValue()}
            onChange={(e) => {
              handleDateChange(e.target.value);
              setIsCalendarOpen(false);
            }}
            className="border rounded p-2"
            max={new Date().toISOString().split('T')[0]}
          />
        </div>
      )}
    </header>
  );
};

export default Navbar;