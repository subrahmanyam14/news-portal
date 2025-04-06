import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const Dashboard = () => {
  const [newspaper, setNewspaper] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [pagination, setPagination] = useState({});
  const [availableDates, setAvailableDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [navLinks, setNavLinks] = useState([]);
  const [editingLink, setEditingLink] = useState(null);
  const [navLinksLoading, setNavLinksLoading] = useState(false);
  const [multipleLinks, setMultipleLinks] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  // Publication date now allows future dates
  const [publicationDate, setPublicationDate] = useState(new Date());
  const [isPublished, setIsPublished] = useState(true);
  const [selectedFile, setSelectedFile] = useState(null);
  // State to track if we're showing future publications
  const [includeFuture, setIncludeFuture] = useState(false);
  const navigate = useNavigate();

  // Check if user is authenticated
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
    } else {
      fetchNewspaper(1, includeFuture);
      fetchNavLinks();
    }
  }, [navigate]);

  // Effect to refetch data when includeFuture changes
  useEffect(() => {
    fetchNewspaper(1, includeFuture);
    fetchAvailableDates(includeFuture);
  }, [includeFuture]);

  // Fetch newspaper data with pagination
  const fetchNewspaper = async (page = 1, showFuture = includeFuture) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/newspaper/future?page=${page}&includeFuture=${showFuture}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setNewspaper(response.data.data);
      setPagination(response.data.pagination);
      setCurrentPage(page);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to fetch newspaper');
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
      setPagination({});
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to fetch newspaper by date');
    } finally {
      setLoading(false);
    }
  };

  // Fetch available dates
  const fetchAvailableDates = async (showFuture = includeFuture) => {
    try {
      const token = localStorage.getItem('token');
      const today = new Date();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const year = today.getFullYear();
      
      const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/newspaper/dates?month=${month}&year=${year}&includeFuture=${showFuture}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setAvailableDates(response.data.data);
    } catch (err) {
      toast.error('Failed to fetch available dates');
      console.error('Failed to fetch available dates:', err);
    }
  };

  // Handle file selection
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    
    if (!file) return;
    
    if (file.type !== 'application/pdf') {
      toast.error('Only PDF files are allowed');
      e.target.value = '';
      return;
    }

    setSelectedFile(file);
  };

  // Handle file upload with publication date and publish status
  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select a PDF file first');
      return;
    }

    setUploadLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('pdf', selectedFile);
      
      // Add publication date in ISO format
      const formattedDate = publicationDate.toISOString();
      formData.append('publicationDate', formattedDate);
      
      // Add publish status
      formData.append('isPublished', isPublished);
      
      const token = localStorage.getItem('token');
      await axios.post(`${process.env.REACT_APP_BACKEND_URL}/newspaper/upload`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      toast.success('PDF uploaded successfully');
      fetchNewspaper(1, includeFuture);
      fetchAvailableDates(includeFuture);
      
      // Reset form after successful upload
      setSelectedFile(null);
      setPublicationDate(new Date());
      setIsPublished(true);
      
      // Reset file input
      const fileInput = document.getElementById('pdf-upload');
      if (fileInput) fileInput.value = '';
      
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'An error occurred during upload');
    } finally {
      setUploadLoading(false);
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

      toast.success('Newspaper deleted successfully');
      setNewspaper(null);
      fetchNewspaper(1, includeFuture);
      fetchAvailableDates(includeFuture);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to delete newspaper');
    }
  };

  // Handle date selection
  const handleDateSelect = (date) => {
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    
    const formattedDate = nextDay.toISOString().split('T')[0];
    setSelectedDate(date);
    fetchNewspaperByDate(formattedDate);
  };

  // Toggle future publications
  const toggleFuturePublications = () => {
    setIncludeFuture(prevState => !prevState);
    // Fetch is handled by useEffect when includeFuture changes
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
      toast.error(err.response?.data?.message || err.message || 'Failed to fetch navigation links');
    } finally {
      setNavLinksLoading(false);
    }
  };

  // Open edit modal
  const openEditModal = (link) => {
    setEditingLink({...link});
    setIsEditModalOpen(true);
  };

  // Update navigation link
  const handleUpdateLink = async () => {
    if (!editingLink.name || !editingLink.path) {
      toast.error('Both name and path are required');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${process.env.REACT_APP_BACKEND_URL}/navlink/update/${editingLink._id}`, 
        {
          linkId: editingLink._id,
          updatedLink: {
            name: editingLink.name,
            path: editingLink.path
          }
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      toast.success('Navigation link updated successfully');
      setEditingLink(null);
      setIsEditModalOpen(false);
      fetchNavLinks();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to update navigation link');
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
      toast.success('Navigation link deleted successfully');
      fetchNavLinks();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to delete navigation link');
    }
  };

  // Add multiple navigation links
  const handleAddMultipleLinks = async () => {
    try {
      let linksArray;
      try {
        linksArray = JSON.parse(multipleLinks);
      } catch (e) {
        toast.error('Invalid JSON format');
        return;
      }
      
      if (!Array.isArray(linksArray)) {
        toast.error('Input must be a valid JSON array');
        return;
      }

      for (const link of linksArray) {
        if (!link.name || !link.path) {
          toast.error('Each link must have both name and path properties');
          return;
        }
      }

      const token = localStorage.getItem('token');
      await axios.post(`${process.env.REACT_APP_BACKEND_URL}/navlink/create-multiple`, linksArray, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      toast.success(`${linksArray.length} navigation links added successfully`);
      setMultipleLinks('');
      fetchNavLinks();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to add navigation links');
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
      toast.success('All navigation links cleared successfully');
      fetchNavLinks();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to clear navigation links');
    }
  };

  // Toggle publication status
  const handlePublishStatusChange = (status) => {
    setIsPublished(status);
  };

  // Handle pagination
  const handlePageChange = (page) => {
    fetchNewspaper(page, includeFuture);
  };

  // Edit Link Modal Component
  const EditLinkModal = () => {
    if (!isEditModalOpen || !editingLink) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <h3 className="text-xl font-semibold mb-4 text-gray-800">Edit Navigation Link</h3>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={editingLink.name}
              onChange={(e) => setEditingLink({...editingLink, name: e.target.value})}
              className="w-full border border-gray-300 bg-white text-gray-800 rounded p-2 focus:border-[#403fbb] focus:outline-none"
              placeholder="Link name"
            />
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">Path</label>
            <input
              type="text"
              value={editingLink.path}
              onChange={(e) => setEditingLink({...editingLink, path: e.target.value})}
              className="w-full border border-gray-300 bg-white text-gray-800 rounded p-2 focus:border-[#403fbb] focus:outline-none"
              placeholder="/path"
            />
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => {
                setIsEditModalOpen(false);
                setEditingLink(null);
              }}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleUpdateLink}
              className="px-4 py-2 bg-[#403fbb] text-white rounded hover:bg-[#5756c5] transition-colors"
            >
              Update Link
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white">
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />
      
      {/* Edit Modal */}
      <EditLinkModal />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-lg p-6 border border-[#403fbb]">
          {/* Navigation Links Management Section */}
          <div className="mb-8 p-6 border border-dashed border-[#403fbb] rounded-lg bg-gray-50">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Navigation Links Management</h2>

            {/* Add Multiple Links Section */}
            <div className="mt-6">
              <h3 className="text-lg font-medium mb-3 text-gray-800">Add Multiple Links (JSON)</h3>
              <textarea
                value={multipleLinks}
                onChange={(e) => setMultipleLinks(e.target.value)}
                className="w-full h-32 border border-gray-300 bg-white text-gray-800 rounded p-2 focus:border-[#403fbb] focus:outline-none mb-2 font-mono text-sm"
                placeholder={`[\n  { "name": "About Us", "path": "/about" },\n  { "name": "Security", "path": "/security" },\n  { "name": "Help", "path": "/help" }\n]`}
              />
              <div className="flex space-x-3">
                <button
                  onClick={handleAddMultipleLinks}
                  className="px-4 py-2 bg-[#403fbb] text-white rounded hover:bg-[#5756c5] transition-colors"
                >
                  Add Multiple Links
                </button>
                <button
                  onClick={() => setMultipleLinks(`[
  { "name": "About Us", "path": "/about" },
  { "name": "Security", "path": "/security" },
  { "name": "Help", "path": "/help" }
]`)}
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                >
                  Load Example
                </button>
              </div>
              <p className="mt-2 text-sm text-gray-600">
                Enter an array of link objects in JSON format
              </p>
            </div>

            {/* Navigation Links List */}
            <div className="mt-6">
              <h3 className="text-lg font-medium mb-3 text-gray-800">Current Navigation Links</h3>
              {navLinksLoading ? (
                <p className="text-gray-500">Loading navigation links...</p>
              ) : navLinks.length === 0 ? (
                <p className="text-gray-500">No navigation links configured</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Name</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Path</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {navLinks.map((link, index) => (
                        <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-4 py-2 text-sm text-gray-800">{link.name}</td>
                          <td className="px-4 py-2 text-sm text-[#403fbb]">{link.path}</td>
                          <td className="px-4 py-2 text-sm">
                            <button
                              onClick={() => openEditModal(link)}
                              className="mr-2 text-[#403fbb] hover:text-[#5756c5]"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteLink(link._id)}
                              className="text-red-500 hover:text-red-600"
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
              <div className="mt-4">
                <button
                  onClick={handleClearAllLinks}
                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                >
                  Clear All Links
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">Newspaper Management Dashboard</h1>
          </div>

          

          {/* Upload section with publication date and publish status */}
          <div className="mb-8 p-6 border border-dashed border-[#403fbb] rounded-lg bg-gray-50">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Upload New Newspaper PDF</h2>
            
            <div className="space-y-4">
              {/* File Selection */}
              <div className="flex items-center">
                <label
                  htmlFor="pdf-upload"
                  className="cursor-pointer px-4 py-2 bg-[#403fbb] text-white rounded hover:bg-[#5756c5] focus:outline-none focus:ring-2 focus:ring-[#403fbb] transition-colors"
                >
                  Select PDF
                </label>
                <input
                  id="pdf-upload"
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={uploadLoading}
                />
                <span className="ml-3 text-sm text-gray-600">
                  {selectedFile ? selectedFile.name : 'Choose a PDF file to upload'}
                </span>
              </div>
              
              {/* Publication Date Selection - No maxDate restriction */}
              <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Publication Date</label>
                  <DatePicker
                    selected={publicationDate}
                    onChange={(date) => setPublicationDate(date)}
                    dateFormat="yyyy-MM-dd"
                    className="border border-gray-300 bg-white text-gray-800 rounded p-2 focus:border-[#403fbb] focus:outline-none"
                    // Removed maxDate to allow future publication dates
                  />
                  {publicationDate && publicationDate > new Date() && (
                    <p className="text-sm text-blue-600 mt-1">
                      This will be scheduled for future publication
                    </p>
                  )}
                </div>
                
                {/* Publish Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Publication Status</label>
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={() => handlePublishStatusChange(true)}
                      className={`px-3 py-1 rounded ${isPublished ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                    >
                      Published
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePublishStatusChange(false)}
                      className={`px-3 py-1 rounded ${!isPublished ? 'bg-yellow-500 text-white' : 'bg-gray-200 text-gray-700'}`}
                    >
                      Draft
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Upload Button */}
              <div className="pt-2">
                <button
                  onClick={handleUpload}
                  disabled={!selectedFile || uploadLoading}
                  className={`px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-[#403fbb] transition-colors ${
                    !selectedFile || uploadLoading 
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                      : 'bg-[#403fbb] text-white hover:bg-[#5756c5]'
                  }`}
                >
                  {uploadLoading ? 'Uploading...' : 'Upload Newspaper'}
                </button>
                {uploadLoading && (
                  <span className="ml-3 text-sm text-gray-600">
                    Please wait, uploading your file...
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Navigation and Date Selection */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => fetchNewspaper(1, includeFuture)}
                className="px-3 py-1 bg-[#403fbb] text-white rounded hover:bg-[#5756c5] transition-colors"
              >
                Latest
              </button>
              
              <DatePicker
                selected={selectedDate}
                onChange={handleDateSelect}
                dateFormat="yyyy-MM-dd"
                placeholderText="Select a date"
                className="border border-gray-300 bg-white text-gray-800 rounded p-2 focus:border-[#403fbb] focus:outline-none"
                // Removed maxDate to allow selection of future dates
                highlightDates={availableDates.map(d => new Date(d.date))}
              />
              
              {/* Toggle for showing/hiding future publications */}
              <button
                onClick={toggleFuturePublications}
                className={`px-3 py-1 rounded ${
                  includeFuture 
                    ? 'bg-[#403fbb] text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                } transition-colors`}
              >
                {includeFuture ? 'Hide Future' : 'Show Future'}
              </button>
            </div>

            {pagination.totalPages > 1 && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                  disabled={!pagination.hasPreviousPage}
                  className={`px-3 py-1 rounded ${pagination.hasPreviousPage ? 'bg-[#403fbb] text-white hover:bg-[#5756c5]' : 'bg-gray-200 text-gray-500 cursor-not-allowed'} transition-colors`}
                >
                  Previous
                </button>
                
                <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded">
                  Page {pagination.currentPage} of {pagination.totalPages}
                </span>
                
                <button
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                  disabled={!pagination.hasNextPage}
                  className={`px-3 py-1 rounded ${pagination.hasNextPage ? 'bg-[#403fbb] text-white hover:bg-[#5756c5]' : 'bg-gray-200 text-gray-500 cursor-not-allowed'} transition-colors`}
                >
                  Next
                </button>
              </div>
            )}
          </div>

          {/* Newspaper Details */}
          <div>
            <h2 className="text-xl font-semibold mb-4 text-gray-800">
              {selectedDate ? `Newspaper for ${formatDate(selectedDate)}` : 'Newspaper Details'}
              {includeFuture && !selectedDate && <span className="ml-2 text-sm text-blue-600">(Including future publications)</span>}
            </h2>
            
            {loading ? (
              <div className="text-center py-4 text-gray-500">
                <p>Loading newspaper data...</p>
              </div>
            ) : !newspaper ? (
              <div className="text-center py-4 text-gray-500">
                <p>No newspaper found</p>
              </div>
            ) : (
              <div>
                <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-600">Created At</p>
                      <p className="font-medium text-gray-800">{formatDate(newspaper.createdAt)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Publication Date</p>
                      <p className={`font-medium ${new Date(newspaper.publicationDate || newspaper.createdAt) > new Date() 
                        ? 'text-blue-600' : 'text-gray-800'}`}>
                        {formatDate(newspaper.publicationDate || newspaper.createdAt)}
                        {new Date(newspaper.publicationDate || newspaper.createdAt) > new Date() && " (Future)"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Status</p>
                      <p className={`font-medium ${newspaper.isPublished ? 'text-green-600' : 'text-yellow-600'}`}>
                        {newspaper.isPublished ? 'Published' : 'Draft'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Pages</p>
                      <p className="font-medium text-gray-800">{newspaper.totalpages}</p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleDelete(newspaper._id)}
                    className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
                  >
                    Delete Newspaper
                  </button>
                </div>

                <h3 className="text-lg font-semibold mb-3 text-gray-800">Newspaper Pages</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {newspaper.newspaperLinks.map((link, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg overflow-hidden shadow-sm bg-white">
                      <img 
                        src={link} 
                        alt={`Newspaper Page ${index + 1}`}
                        className="w-full h-auto object-contain"
                      />
                      <div className="p-2 bg-gray-50 text-center">
                        <p className="text-sm text-gray-600">Page {index + 1}</p>
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