import { useState, useEffect } from "react";
import { jsPDF } from "jspdf";
import { Download, ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import axios from "axios";

export default function ImageViewer() {
  const [images, setImages] = useState([]);
  const [activeImage, setActiveImage] = useState(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
    // Helper function to format date as YYYY-MM-DD
    const formatDate = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
  // Set initial date to today (correctly handles timezone)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayDateStr = formatDate(today);
  const [selectedDate, setSelectedDate] = useState(todayDateStr);
  
  const [availableDates, setAvailableDates] = useState([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currentMonthYear, setCurrentMonthYear] = useState({
    month: today.getMonth() + 1,
    year: today.getFullYear()
  });



  // Function to check if a date is in the future
  const isFutureDate = (date) => {
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate > today;
  };

  // Fetch available dates for the current month
  useEffect(() => {
    const fetchAvailableDates = async () => {
      try {
        const response = await axios.get(
          `http://localhost:5002/newspaper/dates?month=${currentMonthYear.month
            .toString()
            .padStart(2, '0')}&year=${currentMonthYear.year}`
        );
        // Filter out future dates from available dates
        const filteredDates = response.data.data.filter(dateObj => 
          !isFutureDate(dateObj.date)
        );
        setAvailableDates(filteredDates);
      } catch (err) {
        console.error("Error fetching available dates:", err);
      }
    };
    fetchAvailableDates();
  }, [currentMonthYear]);

  // Fetch newspaper data when selectedDate changes
  useEffect(() => {
    const fetchNewspaper = async () => {
      setLoading(true);
      setError(null);
      try {
        let url;
        if (selectedDate === todayDateStr) {
          url = 'http://localhost:5002/newspaper';
        } else {
          url = `http://localhost:5002/newspaper/date?date=${selectedDate}`;
        }

        const response = await axios.get(url);
        const links = response.data.data.newspaperLinks.map((src, index) => ({
          id: index + 1,
          src,
          date: selectedDate
        }));

        setImages(links);
        setActiveImage(links[0] || null);
      } catch (err) {
        console.error("Error fetching newspaper:", err);
        setError("Failed to load newspaper. Please try another date.");
        setImages([]);
        setActiveImage(null);
      } finally {
        setLoading(false);
      }
    };

    if (selectedDate) {
      fetchNewspaper();
    }
  }, [selectedDate]);

  const downloadPDF = async () => {
    if (!images.length) return;

    setDownloading(true);
    const doc = new jsPDF({ orientation: "portrait", unit: "px", format: "a4" });

    try {
      for (let index = 0; index < images.length; index++) {
        const img = images[index];
        const image = new Image();
        image.src = img.src;

        await new Promise((resolve) => {
          image.onload = () => {
            if (index !== 0) doc.addPage();
            doc.addImage(image, "JPEG", 0, 0, 595, 842);
            resolve();
          };
          image.onerror = () => {
            console.error(`Failed to load image: ${img.src}`);
            resolve();
          };
        });
      }

      doc.save(`Newspaper-${selectedDate}.pdf`);
    } catch (err) {
      console.error("Error generating PDF:", err);
    } finally {
      setDownloading(false);
    }
  };

  const nextImage = () => {
    if (!activeImage || !images.length) return;
    setActiveImage((prev) => images[(prev.id % images.length)]);
  };

  const prevImage = () => {
    if (!activeImage || !images.length) return;
    setActiveImage((prev) => images[(prev.id - 2 + images.length) % images.length]);
  };

  const handleDateChange = (date) => {
    if (isFutureDate(date)) return;
    setSelectedDate(date);
    setShowDatePicker(false);
  };

  const changeMonthYear = (increment) => {
    setCurrentMonthYear(prev => {
      let newMonth = prev.month + increment;
      let newYear = prev.year;

      if (newMonth > 12) {
        newMonth = 1;
        newYear++;
      } else if (newMonth < 1) {
        newMonth = 12;
        newYear--;
      }

      // Don't allow navigating to future months/years
      const newDate = new Date(newYear, newMonth - 1, 1);
      newDate.setHours(0, 0, 0, 0);
      if (newDate > today) {
        return {
          month: today.getMonth() + 1,
          year: today.getFullYear()
        };
      }

      return { month: newMonth, year: newYear };
    });
  };

  return (
    <div className="flex flex-col">
      {/* Navbar */}
      <nav className="bg-gray-800 text-white p-4 flex justify-between items-center">
        <div className="relative">
          <button
            className="bg-gray-700 px-3 py-1 rounded flex items-center gap-2"
            onClick={() => setShowDatePicker(!showDatePicker)}
          >
            <Calendar size={16} />
            {selectedDate}
          </button>

          {showDatePicker && (
            <div className="absolute top-full left-0 mt-2 bg-gray-700 p-4 rounded shadow-lg z-50 w-64">
              <div className="flex justify-between items-center mb-2">
                <button 
                  onClick={() => changeMonthYear(-1)}
                  className="hover:bg-gray-600 p-1 rounded"
                >
                  &lt;
                </button>
                <span className="font-medium">
                  {new Date(currentMonthYear.year, currentMonthYear.month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
                </span>
                <button 
                  onClick={() => {
                    const currentDate = new Date(currentMonthYear.year, currentMonthYear.month - 1, 1);
                    currentDate.setHours(0, 0, 0, 0);
                    if (currentDate < today) {
                      changeMonthYear(1);
                    }
                  }}
                  className={`p-1 rounded ${new Date(currentMonthYear.year, currentMonthYear.month - 1, 1) >= today ? 'text-gray-500 cursor-not-allowed' : 'hover:bg-gray-600'}`}
                  disabled={new Date(currentMonthYear.year, currentMonthYear.month - 1, 1) >= today}
                >
                  &gt;
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center text-sm">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                  <div key={day} className="p-1 font-medium">{day}</div>
                ))}

                {Array.from({ length: new Date(currentMonthYear.year, currentMonthYear.month - 1, 0).getDay() + 1 }).map((_, i) => (
                  <div key={`empty-${i}`} className="p-1"></div>
                ))}

                {Array.from({ length: new Date(currentMonthYear.year, currentMonthYear.month, 0).getDate() }, (_, i) => {
                  const day = i + 1;
                  const date = new Date(currentMonthYear.year, currentMonthYear.month - 1, day);
                  const dateStr = formatDate(date);
                  const isToday = dateStr === todayDateStr;
                  const isAvailable = availableDates.some(d => d.date === dateStr);
                  const isSelected = selectedDate === dateStr;
                  const isFuture = isFutureDate(dateStr);

                  return (
                    <button
                      key={day}
                      className={`p-1 rounded ${
                        isToday ? 'border border-yellow-400 bg-gray-600' : 
                        isSelected ? 'bg-blue-500' : 
                        isAvailable ? 'bg-gray-600 hover:bg-gray-500' : 
                        isFuture ? 'text-gray-400 cursor-not-allowed' : 'text-gray-500'
                      }`}
                      onClick={() => !isFuture && isAvailable && handleDateChange(dateStr)}
                      disabled={isFuture || !isAvailable}
                    >
                      {day}
                      {isToday && <span className="sr-only">(Today)</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {activeImage && (
          <>
            <select
              className="bg-gray-700 px-3 py-1 rounded hidden md:block"
              value={activeImage?.id}
              onChange={(e) => setActiveImage(images.find(img => img.id === Number(e.target.value)))}
              disabled={loading || !images.length}
            >
              {images.map((img) => (
                <option key={img.id} value={img.id}>Page - {img.id}</option>
              ))}
            </select>

            <div className="flex space-x-1 md:space-x-2 items-center text-sm md:text-base">
              {activeImage?.id > 3 && (
                <button 
                  className="px-1 hover:bg-gray-700 rounded" 
                  onClick={() => setActiveImage(images[activeImage.id - 4])}
                >
                  ◁
                </button>
              )}
              {images.slice(activeImage.id - 1, activeImage.id + 2).map((img) => (
                <button
                  key={img.id}
                  className={`px-2 md:px-3 py-1 rounded ${
                    img.id === activeImage.id ? "bg-blue-500" : "bg-gray-600 hover:bg-gray-500"
                  }`}
                  onClick={() => setActiveImage(img)}
                >
                  {img.id}
                </button>
              ))}
              {activeImage.id + 3 <= images.length && (
                <button 
                  className="px-1 hover:bg-gray-700 rounded" 
                  onClick={() => setActiveImage(images[activeImage.id + 2])}
                >
                  ▷
                </button>
              )}
            </div>
          </>
        )}
        <button
          className="bg-green-500 px-2 md:px-4 py-2 rounded flex items-center relative hover:bg-green-600 transition-colors"
          onClick={downloadPDF}
          disabled={downloading || !images.length}
        >
          {downloading && (
            <div className="absolute inset-0 flex items-center justify-center bg-green-500 bg-opacity-50">
              <div className="w-5 h-5 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
          <span className={`flex gap-2 ${downloading ? "opacity-0" : "opacity-100"}`}>
            <Download size={20} /> <span className="hidden md:block"> PDF</span>
          </span>
        </button>
      </nav>

      {/* Main Content */}
      <div className="flex flex-1 gap-6 overflow-hidden justify-center md:px-32">
        {/* Left Side - All Images */}
        {images.length > 0 && (
          <div className="w-1/4 h-[100vh] overflow-y-auto p-2 space-y-2 hidden lg:block">
            {images.map((img) => (
              <img
                key={img.id}
                src={img.src}
                alt={`Page ${img.id}`}
                className={`cursor-pointer border-4 ${img.id === activeImage?.id ? "border-blue-500" : "border-gray-300 hover:border-gray-400"}`}
                onClick={() => setActiveImage(img)}
              />
            ))}
          </div>
        )}

        {/* Right Side - Active Image with Scroll, Arrows, and Zoom Popup */}
        <div className={`w-full flex flex-col justify-center items-center relative p-4`}>
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-4 text-gray-700">Loading newspaper...</p>
            </div>
          ) : error ? (
            <div className="text-center p-8 text-red-500">
              {error}
            </div>
          ) : !activeImage ? (
            <div className="text-center p-8 text-gray-500">
              No newspaper available for selected date
            </div>
          ) : (
            <>
              <button
                className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-gray-700 p-2 rounded-full text-white hover:bg-gray-600 disabled:opacity-50"
                onClick={prevImage}
                disabled={images.length <= 1}
              >
                <ChevronLeft size={24} />
              </button>

              <img
                src={activeImage.src}
                alt={`Page ${activeImage.id}`}
                className="shadow-lg border-2 border-gray-400 cursor-zoom-in max-h-[90vh] object-contain"
                onClick={() => setIsZoomed(true)}
              />

              <button
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-gray-700 p-2 rounded-full text-white hover:bg-gray-600 disabled:opacity-50"
                onClick={nextImage}
                disabled={images.length <= 1}
              >
                <ChevronRight size={24} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Zoom Popup */}
      {isZoomed && activeImage && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center p-4 z-50">
          <div className="relative w-full h-full max-w-4xl max-h-[90vh] border-4 border-white">
            <button
              className="absolute top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
              onClick={() => setIsZoomed(false)}
            >
              X
            </button>
            <div className="overflow-auto w-full h-full">
              <img
                src={activeImage.src}
                alt="Zoomed Image"
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}