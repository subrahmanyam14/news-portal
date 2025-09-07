import React, { useState, useEffect } from 'react';
import { Menu, X, LogIn, LayoutDashboard, LogOut, HelpCircle, Shield, Info, UserCog, Edit2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from './AuthContext';

const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [links, setLinks] = useState([]);
  const [loadingLinks, setLoadingLinks] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [showLogoPopup, setShowLogoPopup] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [logoUrl, setLogoUrl] = useState(null);
  const [isLogoLoading, setIsLogoLoading] = useState(true);

  const navigate = useNavigate();

  // Use the auth context
  const { isLoggedIn, logout } = useAuth();

  // Default links in case API fails
  const defaultLinks = [
    { name: 'About Us', path: 'https://example.com/about', icon: <Info className="w-4 h-4 mr-1" />, isExternal: true },
    { name: 'Security', path: 'https://example.com/security', icon: <Shield className="w-4 h-4 mr-1" />, isExternal: true },
    { name: 'Help', path: 'https://example.com/help', icon: <HelpCircle className="w-4 h-4 mr-1" />, isExternal: true }
  ];

  // Check user role when login status changes
  useEffect(() => {
    if (isLoggedIn) {
      const user = JSON.parse(localStorage.getItem('user'));
      setUserRole(user?.role);
    } else {
      setUserRole(null);
    }
  }, [isLoggedIn]);

  // Fetch logo on component mount
  useEffect(() => {
    const fetchLogo = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/logo`);

        // Check if the response is valid and has data
        if (response.status === 200 && response.data.success) {
          setLogoUrl(response.data.data.url);
        }
      } catch (error) {
        console.error('Failed to fetch logo:', error);
        // No action needed as we'll display text if logo isn't available
      } finally {
        setIsLogoLoading(false);
      }
    };

    fetchLogo();

    // Cleanup function to revoke object URL if needed
    return () => {
      if (logoPreview) {
        URL.revokeObjectURL(logoPreview);
      }
    };
  }, []);

  // Fetch links from API
  useEffect(() => {
    const fetchLinks = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/navlink/get`);

        // Transform API response to match our expected format and mark as external
        const transformedLinks = response.data.map(link => ({
          name: link.name,
          path: link.path,
          _id: link._id,
          icon: getIconForPath(link.path),
          isExternal: true // Mark all API-fetched links as external
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
      if (path.includes('about')) {
        return <Info className="w-4 h-4 mr-1" />;
      } else if (path.includes('security')) {
        return <Shield className="w-4 h-4 mr-1" />;
      } else if (path.includes('help')) {
        return <HelpCircle className="w-4 h-4 mr-1" />;
      } else {
        return <Info className="w-4 h-4 mr-1" />;
      }
    };

    fetchLinks();
  }, []);

  const handleNavigation = (path, isExternal) => {
    if (isExternal) {
      // Navigate to external links in the same tab
      window.location.href = path;
    } else {
      // Use react-router for internal navigation
      navigate(path);
    }
    setIsMobileMenuOpen(false);
  };

  const handleLogin = () => navigate('/login');
  const handleDashboard = () => navigate('/dashboard');
  const handleSuperAdmin = () => navigate('/super-admin');
  const handleHome = () => navigate('/');

  const handleLogout = () => {
    // Use the logout function from context
    logout();
    handleHome();
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLogoFile(file);
      // Create preview
      const previewUrl = URL.createObjectURL(file);
      setLogoPreview(previewUrl);
    }
  };

  const handleLogoSubmit = async () => {
    if (!logoFile) return;

    const formData = new FormData();
    formData.append('logo', logoFile);

    try {
      setIsLogoLoading(true);

      // Get authentication token for the protected endpoint
      const token = localStorage.getItem('token');

      const response = await axios.post(`${process.env.REACT_APP_BACKEND_URL}/logo`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.success) {
        setLogoUrl(response.data.data.imageUrl);
      }

      // Close popup
      setShowLogoPopup(false);
      setLogoFile(null);
      setLogoPreview(null);

      // Show success message
      alert('Logo updated successfully!');
    } catch (error) {
      console.error('Failed to upload logo:', error);
      alert('Failed to upload logo. Please try again.');
    } finally {
      setIsLogoLoading(false);
    }
  };

  // Get the links to display (either from API or defaults)
  const displayLinks = loadingLinks ? defaultLinks : (links.length > 0 ? links : defaultLinks);

  const LogoPopup = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">Upload Logo</h2>
          <button
            onClick={() => {
              setShowLogoPopup(false);
              setLogoPreview(null);
              setLogoFile(null);
            }}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="mb-4">
          {logoPreview ? (
            <div className="flex justify-center mb-4">
              <img
                src={logoPreview}
                alt="Logo Preview"
                className="max-h-32 object-contain"
              />
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-300 rounded-md p-6 text-center">
              <p className="text-gray-500">Select an image file to upload</p>
            </div>
          )}
        </div>

        <div className="flex flex-col space-y-4">
          <input
            type="file"
            accept="image/*"
            onChange={handleLogoChange}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded file:border-0
              file:text-sm file:font-semibold
              file:bg-[#403fbb] file:text-white
              hover:file:bg-[#5756c5]"
          />

          <div className="flex justify-end space-x-2">
            <button
              onClick={() => setShowLogoPopup(false)}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleLogoSubmit}
              disabled={!logoFile || isLogoLoading}
              className={`px-4 py-2 bg-[#403fbb] text-white rounded hover:bg-[#5756c5] transition-colors ${(!logoFile || isLogoLoading) ? 'opacity-50 cursor-not-allowed' : ''
                }`}
            >
              {isLogoLoading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <header className="z-50 bg-[#403fbb] text-white shadow-md">
      <div className="container mx-auto md:p-4 md:flex md:flex-wrap md:items-center md:justify-between block">
        <div className="flex items-center justify-center md:justify-start w-full md:w-auto md:mb-0">
          <div
            className="text-3xl font-bold cursor-pointer relative group md:mr-4"
            onClick={handleHome}
          >
            {isLogoLoading ? (
              <div className="flex items-center">
                <span className="text-white">E-</span>
                <span className="text-white">Paper</span>
              </div>
            ) : logoUrl ? (
              <div className="h-fit md:h-10 flex items-center justify-center">
                <img src={logoUrl} alt="E-Paper Logo" className="max-h-full mx-auto md:mx-0" />
                {userRole === 'superadmin' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowLogoPopup(true);
                    }}
                    className="absolute right-0 top-0 translate-x-full -translate-y-1/4 bg-white text-[#403fbb] p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center relative">
                <span className="text-white">E-</span>
                <span className="text-white">Paper</span>
                {userRole === 'superadmin' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowLogoPopup(true);
                    }}
                    className="absolute right-0 top-0 translate-x-full -translate-y-1/4 bg-white text-[#403fbb] p-1 rounded-full"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
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
              key={link._id || link.path}
              onClick={() => handleNavigation(link.path, link.isExternal)}
              className="flex items-center px-3 py-1 text-white hover:text-gray-200 transition-colors"
            >
              {link.icon}
              <span>{link.name}</span>
            </button>
          ))}

          {/* Auth Buttons */}
          {isLoggedIn ? (
            <div className="flex space-x-2">
              {userRole === 'superadmin' && (
                <button
                  onClick={handleSuperAdmin}
                  className="flex items-center px-3 py-1 bg-white text-[#403fbb] rounded hover:bg-gray-200 transition-colors"
                >
                  <UserCog className="w-4 h-4 mr-1" />
                  <span>Super Admin</span>
                </button>
              )}
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

        {/* Mobile menu button in its own container */}
        <div className="md:hidden flex justify-end w-full my-2 pr-2">
          <button
            className="text-white hover:text-gray-200 transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden px-4 py-3 bg-[#5756c5] flex flex-col space-y-3">
          {/* Additional Links in Mobile */}
          {displayLinks.map((link) => (
            <button
              key={link._id || link.path}
              onClick={() => handleNavigation(link.path, link.isExternal)}
              className="flex items-center justify-center px-3 py-2 text-white hover:text-gray-200 transition-colors"
            >
              {link.icon}
              <span>{link.name}</span>
            </button>
          ))}

          {/* Auth Buttons in Mobile */}
          {isLoggedIn ? (
            <>
              {userRole === 'superadmin' && (
                <button
                  onClick={handleSuperAdmin}
                  className="flex items-center justify-center px-3 py-2 bg-white text-[#403fbb] rounded hover:bg-gray-200 transition-colors"
                >
                  <UserCog className="w-5 h-5 mr-2" />
                  <span>Super Admin</span>
                </button>
              )}
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

      {/* Logo Upload Popup */}
      {showLogoPopup && <LogoPopup />}
    </header>
  );
};

export default Navbar;