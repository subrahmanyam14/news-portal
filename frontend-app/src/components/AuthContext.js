import React, { createContext, useState, useEffect, useContext } from 'react';

// Create the context
export const AuthContext = createContext();

// Create a provider component
export const AuthProvider = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if the user is logged in on initial load and handle auto-logout
  useEffect(() => {
    const checkLoginStatus = () => {
      const token = localStorage.getItem('token');
      const userData = localStorage.getItem('user');
      const loginTimestamp = localStorage.getItem('loginTimestamp');

      if (token && userData && loginTimestamp) {
        // Check if 24 hours have passed since login
        const currentTime = Date.now();
        const loginTime = parseInt(loginTimestamp, 10);
        const timeDifference = currentTime - loginTime;
        const hoursPassed = timeDifference / (1000 * 60 * 60);

        if (hoursPassed >= 24) {
          // 24 hours have passed, auto logout
          logout();
        } else {
          // Still within 24 hours, set user as logged in
          setIsLoggedIn(true);
          try {
            setUser(JSON.parse(userData));
          } catch (error) {
            console.error('Error parsing user data:', error);
            logout();
          }

          // Set timeout for auto logout when session expires
          const timeRemaining = (24 * 60 * 60 * 1000) - timeDifference;
          setTimeout(() => {
            logout();
          }, timeRemaining);
        }
      }
      setLoading(false);
    };

    checkLoginStatus();
  }, []);

  // Login function
  const login = (token, userData) => {
    console.log('Logging in user:', userData); // Debug log
    const loginTimestamp = Date.now();
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('loginTimestamp', loginTimestamp.toString());

    setIsLoggedIn(true);
    setUser(userData);
    setLoading(false);
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('loginTimestamp');

    setIsLoggedIn(false);
    setUser(null);
    setLoading(false);
  };

  const value = {
    isLoggedIn,
    user,
    loading,
    login,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};