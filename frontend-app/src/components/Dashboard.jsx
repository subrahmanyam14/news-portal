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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">Newspaper Management Dashboard</h1>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-300"
            >
              Logout
            </button>
          </div>

          {/* Alert messages */}
          {error && (
            <div className="mb-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded">
              <p>{error}</p>
            </div>
          )}
          {success && (
            <div className="mb-4 bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded">
              <p>{success}</p>
            </div>
          )}

          {/* Navigation and Date Selection */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => fetchNewspaper(1)}
                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Latest
              </button>
              
              <DatePicker
                selected={selectedDate}
                onChange={handleDateSelect}
                dateFormat="yyyy-MM-dd"
                placeholderText="Select a date"
                className="border rounded p-2"
                maxDate={new Date()}
                highlightDates={availableDates.map(d => new Date(d.date))}
              />
            </div>

            {pagination.totalPages > 1 && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => fetchNewspaper(pagination.currentPage - 1)}
                  disabled={!pagination.hasPreviousPage}
                  className={`px-3 py-1 rounded ${pagination.hasPreviousPage ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                >
                  Previous
                </button>
                
                <span className="px-3 py-1 bg-gray-100 rounded">
                  Page {pagination.currentPage} of {pagination.totalPages}
                </span>
                
                <button
                  onClick={() => fetchNewspaper(pagination.currentPage + 1)}
                  disabled={!pagination.hasNextPage}
                  className={`px-3 py-1 rounded ${pagination.hasNextPage ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                >
                  Next
                </button>
              </div>
            )}
          </div>

          {/* Upload section */}
          <div className="mb-8 p-6 border border-dashed border-gray-300 rounded-lg bg-gray-50">
            <h2 className="text-xl font-semibold mb-4 text-gray-700">Upload New Newspaper PDF</h2>
            <div className="flex items-center">
              <label
                htmlFor="pdf-upload"
                className="cursor-pointer px-4 py-2 text-white rounded focus:outline-none focus:ring-2 focus:ring-offset-2"
                style={{ backgroundColor: '#1e3a8a' }}
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
              <span className="ml-3 text-sm text-gray-500">
                {uploadLoading ? 'Please wait...' : 'Choose a PDF file to upload'}
              </span>
            </div>
          </div>

          {/* Newspaper Details */}
          <div>
            <h2 className="text-xl font-semibold mb-4 text-gray-700">
              {selectedDate ? `Newspaper for ${formatDate(selectedDate)}` : 'Newspaper Details'}
            </h2>
            
            {loading ? (
              <div className="text-center py-4">
                <p>Loading newspaper data...</p>
              </div>
            ) : !newspaper ? (
              <div className="text-center py-4 text-gray-500">
                <p>No newspaper found</p>
              </div>
            ) : (
              <div>
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-500">Created At</p>
                      <p className="font-medium">{formatDate(newspaper.createdAt)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Total Pages</p>
                      <p className="font-medium">{newspaper.totalpages}</p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleDelete(newspaper._id)}
                    className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    Delete Newspaper
                  </button>
                </div>

                <h3 className="text-lg font-semibold mb-3">Newspaper Pages</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {newspaper.newspaperLinks.map((link, index) => (
                    <div key={index} className="border rounded-lg overflow-hidden shadow-sm">
                      <img 
                        src={link} 
                        alt={`Newspaper Page ${index + 1}`}
                        className="w-full h-auto object-contain"
                      />
                      <div className="p-2 bg-gray-50 text-center">
                        <p className="text-sm">Page {index + 1}</p>
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