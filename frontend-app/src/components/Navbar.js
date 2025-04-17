import React, { useState, useEffect } from 'react';
import { Menu, X, LogIn, LayoutDashboard, LogOut, HelpCircle, Shield, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from './AuthContext';

const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [links, setLinks] = useState([]);
  const [loadingLinks, setLoadingLinks] = useState(true);
  const navigate = useNavigate();
  
  // Use the auth context
  const { isLoggedIn, logout } = useAuth();

  // Default links in case API fails
  const defaultLinks = [
    { name: 'About Us', path: '/about', icon: <Info className="w-4 h-4 mr-1" /> },
    { name: 'Security', path: '/security', icon: <Shield className="w-4 h-4 mr-1" /> },
    { name: 'Help', path: '/help', icon: <HelpCircle className="w-4 h-4 mr-1" /> }
  ];

  // Fetch links from API
  useEffect(() => {
    const fetchLinks = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/navlink/get`);
        
        // Transform API response to match our expected format
        const transformedLinks = response.data.map(link => ({
          name: link.name,
          path: link.path,
          _id: link._id,
          icon: getIconForPath(link.path)
        }));
        
        setLinks(transformedLinks);
      } catch (error) {
        console.error('Failed to fetch links, using defaults:', error);
        setLinks(defaultLinks);
      } finally {
        setLoadingLinks(false);
      }
    };

    // Helper function to assign icons based on path
    const getIconForPath = (path) => {
      switch(path) {
        case '/about':
          return <Info className="w-4 h-4 mr-1" />;
        case '/security':
          return <Shield className="w-4 h-4 mr-1" />;
        case '/help':
          return <HelpCircle className="w-4 h-4 mr-1" />;
        default:
          return <Info className="w-4 h-4 mr-1" />;
      }
    };

    fetchLinks();
  }, []);

  const handleNavigation = (path) => {
    navigate(path);
    setIsMobileMenuOpen(false);
  };

  const handleLogin = () => handleNavigation('/login');
  const handleDashboard = () => handleNavigation('/dashboard');
  const handleHome = () => handleNavigation('/');

  const handleLogout = () => {
    // Use the logout function from context
    logout();
    handleHome();
  };

  // Get the links to display (either from API or defaults)
  const displayLinks = loadingLinks ? defaultLinks : (links.length > 0 ? links : defaultLinks);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#403fbb] text-white shadow-md">
      <div className="container mx-auto px-4 py-4 flex flex-wrap items-center justify-between">
        <div className="flex items-center">
          <div 
            className="mr-4 text-3xl font-bold cursor-pointer"
            onClick={handleHome}
          >
            <span className="text-white">E-</span> 
            <span className="text-white">Paper</span>
          </div>
          <div className="hidden md:block text-sm text-white">
            <span className="mr-2">|</span>
            <span>A Portrait of Telangana People's Life</span>
          </div>
        </div>
        
        <div className="hidden md:flex items-center space-x-4">
          {/* Additional Links */}
          {displayLinks.map((link) => (
            <button
              key={link._id || link.path}  // Use _id if available, otherwise fallback to path
              onClick={() => handleNavigation(link.path)}
              className="flex items-center px-3 py-1 text-white hover:text-gray-200 transition-colors"
            >
              {link.icon}
              <span>{link.name}</span>
            </button>
          ))}
          
          {/* Auth Buttons */}
          {isLoggedIn ? (
            <div className="flex space-x-2">
              <button
                onClick={handleDashboard}
                className="flex items-center px-3 py-1 bg-white text-[#403fbb] rounded hover:bg-gray-200 transition-colors"
              >
                <LayoutDashboard className="w-4 h-4 mr-1" />
                <span>Dashboard</span>
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center px-3 py-1 bg-[#403fbb] rounded hover:bg-[#5756c5] transition-colors border border-white"
              >
                <LogOut className="w-4 h-4 mr-1" />
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogin}
              className="flex items-center px-3 py-1 bg-white text-[#403fbb] rounded hover:bg-gray-200 transition-colors"
            >
              <LogIn className="w-4 h-4 mr-1" />
              <span>Login</span>
            </button>
          )}
        </div>
        
        <button 
          className="md:hidden text-white hover:text-gray-200 transition-colors"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>
      
      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden px-4 py-3 bg-[#5756c5] flex flex-col space-y-3">
          {/* Additional Links in Mobile */}
          {displayLinks.map((link) => (
            <button
              key={link._id || link.path}
              onClick={() => handleNavigation(link.path)}
              className="flex items-center justify-center px-3 py-2 text-white hover:text-gray-200 transition-colors"
            >
              {link.icon}
              <span>{link.name}</span>
            </button>
          ))}
          
          {/* Auth Buttons in Mobile */}
          {isLoggedIn ? (
            <>
              <button
                onClick={handleDashboard}
                className="flex items-center justify-center px-3 py-2 bg-white text-[#403fbb] rounded hover:bg-gray-200 transition-colors"
              >
                <LayoutDashboard className="w-5 h-5 mr-2" />
                <span>Dashboard</span>
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center justify-center px-3 py-2 bg-[#403fbb] rounded hover:bg-[#5756c5] transition-colors border border-white"
              >
                <LogOut className="w-5 h-5 mr-2" />
                <span>Logout</span>
              </button>
            </>
          ) : (
            <button
              onClick={handleLogin}
              className="flex items-center justify-center px-3 py-2 bg-white text-[#403fbb] rounded hover:bg-gray-200 transition-colors"
            >
              <LogIn className="w-5 h-5 mr-2" />
              <span>Login</span>
            </button>
          )}
        </div>
      )}
    </header>
  );
};

export default Navbar;