import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const Dashboard = () => {
  const [newspaper, setNewspaper] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [pagination, setPagination] = useState({});
  const [availableDates, setAvailableDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [navLinks, setNavLinks] = useState([]);
  const [newLink, setNewLink] = useState({ name: '', path: '' });
  const [editingLink, setEditingLink] = useState(null);
  const [navLinksLoading, setNavLinksLoading] = useState(false);
  const [multipleLinks, setMultipleLinks] = useState('');
  const navigate = useNavigate();

  // Check if user is authenticated
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
    } else {
      fetchNewspaper();
      fetchAvailableDates();
    }
  }, [navigate]);

  // Fetch newspaper data with pagination
  const fetchNewspaper = async (page = 1) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/newspaper/page?page=${page}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setNewspaper(response.data.data);
      setPagination(response.data.pagination);
      setCurrentPage(page);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch newspaper');
    } finally {
      setLoading(false);
    }
  };

  // Fetch newspaper by date
  const fetchNewspaperByDate = async (date) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/newspaper/date?date=${date}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setNewspaper(response.data.data);
      setPagination({}); // Clear pagination when viewing by date
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch newspaper by date');
    } finally {
      setLoading(false);
    }
  };

  // Fetch available dates
  const fetchAvailableDates = async () => {
    try {
      const token = localStorage.getItem('token');
      const today = new Date();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const year = today.getFullYear();
      
      const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/newspaper/dates?month=${month}&year=${year}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setAvailableDates(response.data.data);
    } catch (err) {
      console.error('Failed to fetch available dates:', err);
    }
  };

  // Handle file upload
  const handleFileUpload = async (e) => {
    e.preventDefault();
    const file = e.target.files[0];
    
    if (!file) return;
    
    if (file.type !== 'application/pdf') {
      setError('Only PDF files are allowed');
      return;
    }

    setUploadLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const formData = new FormData();
      formData.append('pdf', file);
      
      const token = localStorage.getItem('token');
      await axios.post(`${process.env.REACT_APP_BACKEND_URL}/newspaper/upload`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      setSuccess('PDF uploaded successfully');
      fetchNewspaper();
      fetchAvailableDates();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'An error occurred during upload');
    } finally {
      setUploadLoading(false);
      e.target.value = '';
    }
  };

  // Handle deletion
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this newspaper?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${process.env.REACT_APP_BACKEND_URL}/newspaper/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setSuccess('Newspaper deleted successfully');
      setNewspaper(null);
      fetchNewspaper();
      fetchAvailableDates();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to delete newspaper');
    }
  };

  // Handle date selection
  const handleDateSelect = (date) => {
    const formattedDate = date.toISOString().split('T')[0];
    setSelectedDate(date);
    fetchNewspaperByDate(formattedDate);
  };

  // Logout function
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  // Format date safely
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'Invalid Date';
    }
  };


  // Fetch navigation links
  const fetchNavLinks = async () => {
    setNavLinksLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/navlink/get`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setNavLinks(response.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch navigation links');
    } finally {
      setNavLinksLoading(false);
    }
  };

  // Add new navigation link
  const handleAddLink = async () => {
    if (!newLink.name || !newLink.path) {
      setError('Both name and path are required');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(`${process.env.REACT_APP_BACKEND_URL}/navlink/create`, newLink, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setSuccess('Navigation link added successfully');
      setNewLink({ name: '', path: '' });
      fetchNavLinks();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to add navigation link');
    }
  };

  // Add multiple navigation links
  const handleAddMultipleLinks = async () => {
    try {
      // Parse the JSON input
      let linksArray;
      try {
        linksArray = JSON.parse(multipleLinks);
      } catch (e) {
        setError('Invalid JSON format');
        return;
      }
      
      if (!Array.isArray(linksArray)) {
        setError('Input must be a valid JSON array');
        return;
      }

      // Validate each link
      for (const link of linksArray) {
        if (!link.name || !link.path) {
          setError('Each link must have both name and path properties');
          return;
        }
      }

      const token = localStorage.getItem('token');
      await axios.post(`${process.env.REACT_APP_BACKEND_URL}/navlink/create-multiple`, linksArray, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setSuccess(`${linksArray.length} navigation links added successfully`);
      setMultipleLinks('');
      fetchNavLinks();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to add navigation links');
    }
  };

  // Update navigation link
  const handleUpdateLink = async () => {
    if (!editingLink.name || !editingLink.path) {
      setError('Both name and path are required');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.put(`${process.env.REACT_APP_BACKEND_URL}/navlink/update/${editingLink._id}`, editingLink, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setSuccess('Navigation link updated successfully');
      setEditingLink(null);
      fetchNavLinks();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to update navigation link');
    }
  };

  // Delete navigation link
  const handleDeleteLink = async (identifier) => {
    if (!window.confirm('Are you sure you want to delete this navigation link?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${process.env.REACT_APP_BACKEND_URL}/navlink/delete/${identifier}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setSuccess('Navigation link deleted successfully');
      fetchNavLinks();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to delete navigation link');
    }
  };

  // Clear all navigation links
  const handleClearAllLinks = async () => {
    if (!window.confirm('Are you sure you want to clear ALL navigation links?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${process.env.REACT_APP_BACKEND_URL}/navlink/clear`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setSuccess('All navigation links cleared successfully');
      fetchNavLinks();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to clear navigation links');
    }
  };

  // Initialize data
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
    } else {
      fetchNewspaper();
      fetchAvailableDates();
      fetchNavLinks();
    }
  }, [navigate]);

  // Fetch newspaper data with pagination
  // const fetchNewspaper = async (page = 1) => {
  //   setLoading(true);
  //   try {
  //     const token = localStorage.getItem('token');
  //     const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/newspaper/page?page=${page}`, {
  //       headers: {
  //         Authorization: `Bearer ${token}`,
  //       },
  //     });

  //     setNewspaper(response.data.data);
  //     setPagination(response.data.pagination);
  //     setCurrentPage(page);
  //   } catch (err) {
  //     setError(err.response?.data?.message || err.message || 'Failed to fetch newspaper');
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  // Other existing functions (fetchNewspaperByDate, fetchAvailableDates, handleFileUpload, 
  // handleDelete, handleDateSelect, handleLogout, formatDate) remain the same...

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-zinc-900 rounded-lg shadow-lg p-6 border border-red-600">
          {/* Navigation Links Management Section */}
          <div className="mb-8 p-6 border border-dashed border-blue-500 rounded-lg bg-zinc-800">
            <h2 className="text-xl font-semibold mb-4 text-white">Navigation Links Management</h2>
            
            {/* Add/Edit Form */}
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-3 text-white">
                {editingLink ? 'Edit Link' : 'Add New Link'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Name</label>
                  <input
                    type="text"
                    value={editingLink ? editingLink.name : newLink.name}
                    onChange={(e) => editingLink 
                      ? setEditingLink({...editingLink, name: e.target.value})
                      : setNewLink({...newLink, name: e.target.value})}
                    className="w-full border border-zinc-700 bg-zinc-800 text-white rounded p-2 focus:border-blue-500 focus:outline-none"
                    placeholder="Link name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Path</label>
                  <input
                    type="text"
                    value={editingLink ? editingLink.path : newLink.path}
                    onChange={(e) => editingLink 
                      ? setEditingLink({...editingLink, path: e.target.value})
                      : setNewLink({...newLink, path: e.target.value})}
                    className="w-full border border-zinc-700 bg-zinc-800 text-white rounded p-2 focus:border-blue-500 focus:outline-none"
                    placeholder="/path"
                  />
                </div>
              </div>
              <div className="flex space-x-3">
                {editingLink ? (
                  <>
                    <button
                      onClick={handleUpdateLink}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                      Update Link
                    </button>
                    <button
                      onClick={() => setEditingLink(null)}
                      className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleAddLink}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    Add Link
                  </button>
                )}
                <button
                  onClick={handleClearAllLinks}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                >
                  Clear All Links
                </button>
              </div>
            </div>

            {/* Add Multiple Links Section */}
            <div className="mt-6">
              <h3 className="text-lg font-medium mb-3 text-white">Add Multiple Links (JSON)</h3>
              <textarea
                value={multipleLinks}
                onChange={(e) => setMultipleLinks(e.target.value)}
                className="w-full h-32 border border-zinc-700 bg-zinc-800 text-white rounded p-2 focus:border-blue-500 focus:outline-none mb-2 font-mono text-sm"
                placeholder={`[\n  { "name": "About Us", "path": "/about" },\n  { "name": "Security", "path": "/security" },\n  { "name": "Help", "path": "/help" }\n]`}
              />
              <div className="flex space-x-3">
                <button
                  onClick={handleAddMultipleLinks}
                  className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                >
                  Add Multiple Links
                </button>
                <button
                  onClick={() => setMultipleLinks(`[
  { "name": "About Us", "path": "/about" },
  { "name": "Security", "path": "/security" },
  { "name": "Help", "path": "/help" }
]`)}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                >
                  Load Example
                </button>
              </div>
              <p className="mt-2 text-sm text-gray-400">
                Enter an array of link objects in JSON format
              </p>
            </div>

            {/* Navigation Links List */}
            <div className="mt-6">
              <h3 className="text-lg font-medium mb-3 text-white">Current Navigation Links</h3>
              {navLinksLoading ? (
                <p className="text-gray-400">Loading navigation links...</p>
              ) : navLinks.length === 0 ? (
                <p className="text-gray-400">No navigation links configured</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-zinc-700">
                    <thead>
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-300">Name</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-300">Path</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-300">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                      {navLinks.map((link, index) => (
                        <tr key={index}>
                          <td className="px-4 py-2 text-sm text-white">{link.name}</td>
                          <td className="px-4 py-2 text-sm text-blue-300">{link.path}</td>
                          <td className="px-4 py-2 text-sm">
                            <button
                              onClick={() => setEditingLink({...link})}
                              className="mr-2 text-blue-400 hover:text-blue-300"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteLink(link._id)}
                              className="text-red-400 hover:text-red-300"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-white">Newspaper Management Dashboard</h1>
            {/* <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
            >
              Logout
            </button> */}
          </div>

          {/* Alert messages */}
          {error && (
            <div className="mb-4 bg-red-900/50 border-l-4 border-red-600 text-red-300 p-4 rounded">
              <p>{error}</p>
            </div>
          )}
          {success && (
            <div className="mb-4 bg-green-900/50 border-l-4 border-green-600 text-green-300 p-4 rounded">
              <p>{success}</p>
            </div>
          )}

          {/* Navigation and Date Selection */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => fetchNewspaper(1)}
                className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                Latest
              </button>
              
              <DatePicker
                selected={selectedDate}
                onChange={handleDateSelect}
                dateFormat="yyyy-MM-dd"
                placeholderText="Select a date"
                className="border border-zinc-700 bg-zinc-800 text-white rounded p-2 focus:border-red-500 focus:outline-none"
                maxDate={new Date()}
                highlightDates={availableDates.map(d => new Date(d.date))}
              />
            </div>

            {pagination.totalPages > 1 && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => fetchNewspaper(pagination.currentPage - 1)}
                  disabled={!pagination.hasPreviousPage}
                  className={`px-3 py-1 rounded ${pagination.hasPreviousPage ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-zinc-700 text-zinc-400 cursor-not-allowed'} transition-colors`}
                >
                  Previous
                </button>
                
                <span className="px-3 py-1 bg-zinc-800 text-white rounded">
                  Page {pagination.currentPage} of {pagination.totalPages}
                </span>
                
                <button
                  onClick={() => fetchNewspaper(pagination.currentPage + 1)}
                  disabled={!pagination.hasNextPage}
                  className={`px-3 py-1 rounded ${pagination.hasNextPage ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-zinc-700 text-zinc-400 cursor-not-allowed'} transition-colors`}
                >
                  Next
                </button>
              </div>
            )}
          </div>

          {/* Upload section */}
          <div className="mb-8 p-6 border border-dashed border-red-600 rounded-lg bg-zinc-800">
            <h2 className="text-xl font-semibold mb-4 text-white">Upload New Newspaper PDF</h2>
            <div className="flex items-center">
              <label
                htmlFor="pdf-upload"
                className={`cursor-pointer px-4 py-2 text-white rounded focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors ${uploadLoading ? 'bg-red-700' : 'bg-red-600 hover:bg-red-700'}`}
              >
                {uploadLoading ? 'Uploading...' : 'Select PDF'}
              </label>
              <input
                id="pdf-upload"
                type="file"
                accept="application/pdf"
                onChange={handleFileUpload}
                className="hidden"
                disabled={uploadLoading}
              />
              <span className="ml-3 text-sm text-gray-400">
                {uploadLoading ? 'Please wait...' : 'Choose a PDF file to upload'}
              </span>
            </div>
          </div>

          {/* Newspaper Details */}
          <div>
            <h2 className="text-xl font-semibold mb-4 text-white">
              {selectedDate ? `Newspaper for ${formatDate(selectedDate)}` : 'Newspaper Details'}
            </h2>
            
            {loading ? (
              <div className="text-center py-4 text-gray-400">
                <p>Loading newspaper data...</p>
              </div>
            ) : !newspaper ? (
              <div className="text-center py-4 text-gray-400">
                <p>No newspaper found</p>
              </div>
            ) : (
              <div>
                <div className="mb-6 p-4 bg-zinc-800 rounded-lg">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-400">Created At</p>
                      <p className="font-medium text-white">{formatDate(newspaper.createdAt)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Total Pages</p>
                      <p className="font-medium text-white">{newspaper.totalpages}</p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleDelete(newspaper._id)}
                    className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
                  >
                    Delete Newspaper
                  </button>
                </div>

                <h3 className="text-lg font-semibold mb-3 text-white">Newspaper Pages</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {newspaper.newspaperLinks.map((link, index) => (
                    <div key={index} className="border border-zinc-700 rounded-lg overflow-hidden shadow-sm bg-zinc-800">
                      <img 
                        src={link} 
                        alt={`Newspaper Page ${index + 1}`}
                        className="w-full h-auto object-contain"
                      />
                      <div className="p-2 bg-zinc-900 text-center">
                        <p className="text-sm text-gray-300">Page {index + 1}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        
        </div>
      </div>
    </div>
  );
};

export default Dashboard;