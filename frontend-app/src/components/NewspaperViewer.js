import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Download, Printer, ZoomIn, ZoomOut, Maximize, Minimize, Expand } from 'lucide-react';
import axios from 'axios';

const NewspaperViewer = ({ currentDate, onDateChange }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [newspaperData, setNewspaperData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fitToScreen, setFitToScreen] = useState(true);

  // Default data for fallback
  const defaultNewspaperData = {
    totalpages: 4,
    newspaperLinks: [
      'https://www.prajamantalu.com/media/2024-12/25073246-page-1.jpg',
      'https://www.prajamantalu.com/media/2024-12/25073246-page-2.jpg',
      'https://www.prajamantalu.com/media/2024-12/25073246-page-3.jpg',
      'https://www.prajamantalu.com/media/2024-12/25073246-page-4.jpg'
    ]
  };

  // Fetch newspaper data
  useEffect(() => {
    const fetchNewspaper = async () => {
      try {
        setLoading(true);
        const dateString = currentDate.toISOString().split('T')[0];
        
        try {
          const response = await axios.get(
            `${process.env.REACT_APP_BACKEND_URL}/newspaper/date?date=${dateString}`
          );
          
          if (response.data.success) {
            setNewspaperData(response.data.data);
          } else {
            throw new Error(response.data.message || 'Failed to fetch newspaper');
          }
        } catch (apiError) {
          console.log('API error, using default data:', apiError);
          // Use default data if API fails
          setNewspaperData(defaultNewspaperData);
        }
      } catch (err) {
        setError(err.message);
        // Use default data on any error
        setNewspaperData(defaultNewspaperData);
      } finally {
        setLoading(false);
      }
    };

    fetchNewspaper();
  }, [currentDate]);

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  const goToPage = (pageNum) => {
    if (pageNum >= 1 && pageNum <= (newspaperData?.totalpages || 0)) {
      setCurrentPage(pageNum);
    }
  };

  const handleZoom = (direction) => {
    setFitToScreen(false);
    setZoomLevel(prev => {
      const newZoom = direction === 'in' ? prev + 0.25 : prev - 0.25;
      return Math.min(Math.max(newZoom, 0.5), 3);
    });
  };

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      document.documentElement.requestFullscreen().catch(console.log);
    } else {
      document.exitFullscreen().catch(console.log);
    }
    setIsFullscreen(!isFullscreen);
  };

  const toggleFitToScreen = () => {
    setFitToScreen(!fitToScreen);
    if (fitToScreen) {
      setZoomLevel(1);
    }
  };

  if (loading) return <div className="text-center py-10">Loading newspaper...</div>;
  if (error && !newspaperData) return <div className="text-center py-10 text-red-500">{error}</div>;
  if (!newspaperData) return <div className="text-center py-10">No newspaper data available</div>;

  return (
    <div className="flex flex-col min-h-screen">
      {/* Newspaper Info and Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-center p-4 bg-white shadow-sm gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center">
            EPaper
            <span className="ml-2 text-gray-600">-</span>
            <button 
              className="ml-2 text-blue-600 flex items-center hover:text-blue-800 transition-colors"
              onClick={() => onDateChange(currentDate)}
            >
              {formatDate(currentDate)}
              <Calendar className="w-4 h-4 ml-1" />
            </button>
          </h1>
        </div>
        
        {/* Controls as a vertical stack on mobile, horizontal on larger screens */}
        <div className="flex flex-wrap justify-center gap-2">
          <button 
            className="p-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
            onClick={() => handleZoom('in')}
            disabled={zoomLevel >= 3}
          >
            <ZoomIn className="w-5 h-5" />
          </button>
          <button 
            className="p-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
            onClick={() => handleZoom('out')}
            disabled={zoomLevel <= 0.5}
          >
            <ZoomOut className="w-5 h-5" />
          </button>
          <button 
            className={`p-2 rounded hover:bg-blue-100 transition-colors ${fitToScreen ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600'}`}
            onClick={toggleFitToScreen}
          >
            <Expand className="w-5 h-5" />
          </button>
          <button 
            className={`p-2 rounded hover:bg-blue-100 transition-colors ${isFullscreen ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600'}`}
            onClick={toggleFullscreen}
          >
            {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
          </button>
          <button className="p-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors">
            <Download className="w-5 h-5" />
          </button>
          <button className="p-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors">
            <Printer className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Content Area with Vertical Pagination */}
      <div className="flex flex-col md:flex-row flex-1">
        {/* Desktop Vertical Pagination (left side) - Visible only on medium screens and up */}
        <div className="hidden md:flex w-16 bg-gray-100 flex-col items-center py-4">
          <button 
            className={`p-2 rounded-full mb-2 ${currentPage <= 1 ? 'text-gray-400' : 'text-blue-600 hover:bg-blue-50'}`}
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage <= 1}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <div className="flex flex-col items-center gap-2 py-2 flex-grow overflow-y-auto max-h-full">
            {Array.from({ length: newspaperData.totalpages }, (_, i) => (
              <button
                key={i + 1}
                className={`w-10 h-10 rounded-full flex items-center justify-center ${currentPage === i + 1 ? 'bg-blue-600 text-white' : 'hover:bg-blue-50'}`}
                onClick={() => goToPage(i + 1)}
              >
                {i + 1}
              </button>
            ))}
          </div>
          
          <button 
            className={`p-2 rounded-full mt-2 ${currentPage >= newspaperData.totalpages ? 'text-gray-400' : 'text-blue-600 hover:bg-blue-50'}`}
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage >= newspaperData.totalpages}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Newspaper Viewer - Image Container */}
        <div className="flex-1 flex flex-col items-center justify-center bg-gray-200 py-4">
          {/* Image Container with 85vw width on desktop, full width on mobile */}
          <div className="relative w-full md:w-85">
            <img 
              src={newspaperData.newspaperLinks[currentPage - 1]} 
              alt={`Page ${currentPage}`}
              className="w-full h-auto"
              style={fitToScreen ? {} : { transform: `scale(${zoomLevel})`, transformOrigin: 'top center' }}
            />
            
            {/* Absolute positioned navigation buttons */}
            <button 
              className="absolute left-2 top-1/2 transform -translate-y-1/2 p-3 rounded-full bg-white/90 shadow-lg hover:bg-white transition-all"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage <= 1}
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            
            <button 
              className="absolute right-2 top-1/2 transform -translate-y-1/2 p-3 rounded-full bg-white/90 shadow-lg hover:bg-white transition-all"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage >= newspaperData.totalpages}
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Pagination - Visible only on small screens */}
      <div className="md:hidden flex justify-center items-center p-2 bg-gray-100">
        <button 
          className={`p-2 rounded-full ${currentPage <= 1 ? 'text-gray-400' : 'text-blue-600 hover:bg-blue-50'}`}
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage <= 1}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        
        <div className="flex items-center overflow-x-auto px-2 space-x-1 max-w-full">
          {Array.from({ length: newspaperData.totalpages }, (_, i) => (
            <button
              key={i + 1}
              className={`min-w-8 h-8 rounded-full flex items-center justify-center px-2 ${currentPage === i + 1 ? 'bg-blue-600 text-white' : 'hover:bg-blue-50'}`}
              onClick={() => goToPage(i + 1)}
            >
              {i + 1}
            </button>
          ))}
        </div>
        
        <button 
          className={`p-2 rounded-full ${currentPage >= newspaperData.totalpages ? 'text-gray-400' : 'text-blue-600 hover:bg-blue-50'}`}
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage >= newspaperData.totalpages}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Footer with page information */}
      <div className="p-3 bg-white shadow-inner flex justify-between items-center">
        <span className="text-sm text-gray-600">
          Page {currentPage} of {newspaperData.totalpages}
        </span>
        <select 
          className="p-1 border rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={currentPage}
          onChange={(e) => goToPage(parseInt(e.target.value))}
        >
          {Array.from({ length: newspaperData.totalpages }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              Page {i + 1}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default NewspaperViewer;