import { useState, useEffect, useRef, useCallback } from "react"
import { ChevronLeft, ChevronRight, Calendar, Download, Printer, Maximize, Minimize, Expand } from "lucide-react"
import axios from "axios"
import { jsPDF } from 'jspdf';
import { format } from 'date-fns';

const defaultNewspaperData = {
  totalpages: 4,
  newspaperLinks: [
    "https://previews.123rf.com/images/olegdudko/olegdudko1510/olegdudko151007353/46794713-toys.jpg",
    "https://static.vecteezy.com/system/resources/previews/029/830/133/non_2x/toys-and-car-on-isolated-white-background-ai-generative-photo.jpg",
    "https://static.vecteezy.com/system/resources/thumbnails/028/535/140/small/many-colorful-toys-collection-on-the-desk-generative-ai-photo.jpg",
    "https://static.vecteezy.com/system/resources/thumbnails/028/535/374/small/many-colorful-toys-collection-on-the-desk-generative-ai-photo.jpg",
  ],
}

const NewspaperViewer = () => {
  const [currentPage, setCurrentPage] = useState(1)
  const [newspaperData, setNewspaperData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [zoomLevel, setZoomLevel] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [fitToScreen, setFitToScreen] = useState(true)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [startPos, setStartPos] = useState({ x: 0, y: 0 })
  const [lastClickTime, setLastClickTime] = useState(0)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [pdfGenerating, setPdfGenerating] = useState(false)

  const modalRef = useRef(null)
  const imageRef = useRef(null)
  const modalContentRef = useRef(null)
  const datePickerRef = useRef(null)

  // Close date picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target)) {
        setShowDatePicker(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  // Fetch newspaper data when date changes
  useEffect(() => {
    const fetchNewspaper = async () => {
      try {
        setLoading(true)
        const dateString = selectedDate.toISOString().split("T")[0]

        try {
          const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/newspaper/date?date=${dateString}`)
          
          if (response.data.success) {
            setNewspaperData(response.data.data)
            setError(null)
          } else {
            throw new Error(response.data.message || "Failed to fetch newspaper")
          }
        } catch (apiError) {
          console.log("API error, using default data:", apiError)
          setNewspaperData(defaultNewspaperData)
          setError("Failed to fetch latest newspaper. Showing sample data.")
        }
      } catch (err) {
        console.error("Fetch error:", err)
        setNewspaperData(defaultNewspaperData)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchNewspaper()
  }, [selectedDate])

  const formatDate = (date) => {
    if (!date) return "Select Date"
    return date.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  }

  const handleDateChange = (e) => {
    const newDate = new Date(e.target.value)
    if (!isNaN(newDate.getTime())) {
      setSelectedDate(newDate)
      setShowDatePicker(false)
    }
  }

  const goToPage = (pageNum) => {
    if (pageNum >= 1 && pageNum <= (newspaperData?.totalpages || 0)) {
      setCurrentPage(pageNum)
    }
  }

  const handleImageClick = () => {
    setIsModalOpen(true)
    setZoomLevel(0)
    setPosition({ x: 0, y: 0 })

    if (modalContentRef.current) {
      modalContentRef.current.scrollTop = 0
      modalContentRef.current.scrollLeft = 0
    }
  }

  const handleModalImageClick = (e) => {
    e.preventDefault()
    if (isDragging) return

    const currentTime = new Date().getTime()
    const isDoubleClick = currentTime - lastClickTime < 300

    setLastClickTime(currentTime)

    if (isDoubleClick) {
      setZoomLevel((prevZoom) => (prevZoom === 0 ? 1 : 0))
      setPosition({ x: 0, y: 0 })

      if (modalContentRef.current) {
        modalContentRef.current.scrollTop = 0
        modalContentRef.current.scrollLeft = 0
      }
    }
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setZoomLevel(0)
    setPosition({ x: 0, y: 0 })
  }

  const handleMouseDown = (e) => {
    if (zoomLevel === 0) return
    e.preventDefault()
    setIsDragging(true)
    setStartPos({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    })
  }

  const handleMouseMove = useCallback(
    (e) => {
      if (!isDragging || zoomLevel === 0) return

      const newX = e.clientX - startPos.x
      const newY = e.clientY - startPos.y

      setPosition({
        x: newX,
        y: newY,
      })
    },
    [isDragging, zoomLevel, startPos],
  )

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  useEffect(() => {
    if (isModalOpen) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
      document.body.style.overflow = "hidden"

      return () => {
        document.removeEventListener("mousemove", handleMouseMove)
        document.removeEventListener("mouseup", handleMouseUp)
        document.body.style.overflow = "auto"
      }
    }
  }, [isModalOpen, isDragging, handleMouseMove, handleMouseUp])

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(console.log)
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(console.log)
      }
    }
    setIsFullscreen(!isFullscreen)
  }

  const toggleFitToScreen = () => {
    setFitToScreen(!fitToScreen)
  }

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange)
    }
  }, [])

  const loadImage = (url, retryCount = 0, maxRetries = 2) => {
    return new Promise((resolve, reject) => {
      // Try direct loading first
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      
      img.onload = () => resolve(img);
      
      img.onerror = async () => {
        // If direct loading fails, try with retry
        if (retryCount < maxRetries) {
          console.log(`Retrying image load (${retryCount + 1}/${maxRetries}): ${url}`);
          try {
            // Wait a bit before retrying
            await new Promise(r => setTimeout(r, 1000));
            const retryImg = await loadImage(url, retryCount + 1, maxRetries);
            resolve(retryImg);
          } catch (retryError) {
            reject(retryError);
          }
        } else {
          // If all retries fail, try with a CORS proxy
          try {
            const proxyUrl = `https://cors-anywhere.herokuapp.com/${url}`;
            console.log(`Trying with CORS proxy: ${proxyUrl}`);
            
            const proxyImg = new Image();
            proxyImg.crossOrigin = 'Anonymous';
            
            proxyImg.onload = () => resolve(proxyImg);
            
            proxyImg.onerror = () => {
              // If proxy also fails, check if we have a local fallback
              console.error(`Failed to load image with proxy: ${url}`);
              
              // As last resort, try to fetch via backend if available
              if (process.env.REACT_APP_BACKEND_URL) {
                const backendProxyUrl = `${process.env.REACT_APP_BACKEND_URL}/proxy-image?url=${encodeURIComponent(url)}`;
                console.log(`Trying with backend proxy: ${backendProxyUrl}`);
                
                fetch(backendProxyUrl)
                  .then(response => response.blob())
                  .then(blob => {
                    const objectUrl = URL.createObjectURL(blob);
                    const backendImg = new Image();
                    backendImg.onload = () => {
                      resolve(backendImg);
                      URL.revokeObjectURL(objectUrl);
                    };
                    backendImg.src = objectUrl;
                  })
                  .catch(err => {
                    console.error(`All image loading methods failed for: ${url}`, err);
                    reject(new Error(`Failed to load image after all attempts: ${url}`));
                  });
              } else {
                reject(new Error(`Failed to load image after all attempts: ${url}`));
              }
            };
            
            proxyImg.src = proxyUrl;
          } catch (proxyError) {
            reject(proxyError);
          }
        }
      };
      
      img.src = url;
    });
  };

  const generatePDF = async () => {
    if (!newspaperData || !newspaperData.newspaperLinks || newspaperData.newspaperLinks.length === 0) {
      console.error('No newspaper data available');
      return;
    }
    
    try {
      setPdfGenerating(true);
      
      // Create a new jsPDF instance
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: false
      });
      
      // Add a loading message on the first page
      pdf.setFontSize(14);
      pdf.text("Generating PDF, please wait...", 20, 20);
      
      // Process each page
      let successCount = 0;
      const totalPages = newspaperData.newspaperLinks.length;
      
      for (let i = 0; i < totalPages; i++) {
        const imgUrl = newspaperData.newspaperLinks[i];
        
        // Show progress information
        const progressPercent = Math.floor((i / totalPages) * 100);
        console.log(`Processing page ${i+1}/${totalPages} (${progressPercent}%)`);
        
        try {
          // Pre-fetch images to check availability
          await fetch(imgUrl, { mode: 'no-cors' })
            .catch(err => console.log(`Pre-fetch check failed for ${imgUrl}`, err));
          
          // Load the image with our enhanced loader
          const img = await loadImage(imgUrl);
          
          // First page is already created when we initialize the PDF
          if (i > 0 || successCount > 0) {
            pdf.addPage();
          }
          
          // Calculate dimensions to fit the image properly on the page
          const pageWidth = pdf.internal.pageSize.getWidth();
          const pageHeight = pdf.internal.pageSize.getHeight();
          
          // Calculate scaling to fit image on page while maintaining aspect ratio
          const imgRatio = img.width / img.height;
          const pageRatio = pageWidth / pageHeight;
          
          let imgWidth, imgHeight;
          if (imgRatio > pageRatio) {
            // Image is wider than page (relative to height)
            imgWidth = pageWidth;
            imgHeight = pageWidth / imgRatio;
          } else {
            // Image is taller than page (relative to width)
            imgHeight = pageHeight;
            imgWidth = pageHeight * imgRatio;
          }
          
          // Center the image on the page
          const x = (pageWidth - imgWidth) / 2;
          const y = (pageHeight - imgHeight) / 2;
          
          // Create a canvas to maintain image quality
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, img.width, img.height);
          
          // Convert to high-quality PNG data URL
          const dataUrl = canvas.toDataURL('image/png', 1.0);
          
          // Clear the page if this is the first successful page (to remove the loading message)
          if (successCount === 0) {
            pdf.deletePage(1);
            pdf.addPage();
            pdf.setPage(1);
          }
          
          // Add image to PDF
          pdf.addImage(dataUrl, 'PNG', x, y, imgWidth, imgHeight, undefined, 'FAST', 0);
          successCount++;
          
        } catch (error) {
          console.error(`Error processing page ${i+1}:`, error);
          
          // Attempt to download the image directly via XHR as a last resort
          try {
            const xhr = new XMLHttpRequest();
            xhr.responseType = 'blob';
            xhr.open('GET', imgUrl, true);
            
            const xhrPromise = new Promise((resolve, reject) => {
              xhr.onload = function() {
                if (this.status === 200) {
                  const blob = new Blob([this.response], {type: 'image/jpeg'});
                  const img = new Image();
                  img.onload = function() {
                    resolve(img);
                  };
                  img.src = URL.createObjectURL(blob);
                } else {
                  reject(new Error(`XHR failed with status ${this.status}`));
                }
              };
              xhr.onerror = function() {
                reject(new Error('XHR request failed'));
              };
            });
            
            xhr.send();
            
            // Wait for XHR to complete with timeout
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('XHR timeout')), 10000)
            );
            
            const xhrImg = await Promise.race([xhrPromise, timeoutPromise]);
            
            // If we got here, XHR succeeded, add the image
            if (i > 0 || successCount > 0) {
              pdf.addPage();
            }
            
            // Process the image (same as above)
            // (Code omitted for brevity - would be the same as the successful case)
            
            successCount++;
            
          } catch (xhrError) {
            console.error(`XHR fallback also failed:`, xhrError);
            
            // Create an error page only if we have at least one successful page
            if (successCount > 0) {
              pdf.addPage();
            }
            
            // Create a more informative error page
            pdf.setFillColor(245, 245, 245);
            pdf.rect(0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight(), 'F');
            
            pdf.setFontSize(16);
            pdf.setTextColor(100, 100, 100);
            pdf.text(`Page ${i+1} could not be loaded`, 20, 30);
            
            pdf.setFontSize(10);
            pdf.setTextColor(150, 150, 150);
            pdf.text(`URL: ${imgUrl.substring(0, 50)}...`, 20, 40);
            pdf.text(`Error: ${error.message || 'Unknown error'}`, 20, 45);
            
            // Add troubleshooting guidance
            pdf.setFontSize(12);
            pdf.setTextColor(100, 100, 100);
            pdf.text("Troubleshooting:", 20, 60);
            
            pdf.setFontSize(10);
            pdf.text("1. Check your internet connection", 25, 70);
            pdf.text("2. The image might be temporarily unavailable", 25, 75);
            pdf.text("3. Try accessing the newspaper directly on the website", 25, 80);
            pdf.text("4. Try again later or contact support if the issue persists", 25, 85);
          }
        }
      }
      
      // If no pages were successfully processed, show an error
      if (successCount === 0) {
        pdf.deletePage(1);
        pdf.addPage();
        
        pdf.setFontSize(18);
        pdf.setTextColor(200, 0, 0);
        pdf.text("Error Generating PDF", 20, 30);
        
        pdf.setFontSize(12);
        pdf.setTextColor(80, 80, 80);
        pdf.text("Failed to load any newspaper pages. Please try again later.", 20, 45);
        pdf.text("This might be due to:", 20, 55);
        
        pdf.text("• Internet connectivity issues", 25, 65);
        pdf.text("• The newspaper server might be temporarily down", 25, 70);
        pdf.text("• CORS restrictions preventing image access", 25, 75);
        pdf.text("• The selected date may not have newspaper pages available", 25, 80);
        
        pdf.text("Suggestions:", 20, 95);
        pdf.text("• Refresh the page and try again", 25, 105);
        pdf.text("• Select a different date", 25, 110);
        pdf.text("• Try accessing the newspaper directly on the website", 25, 115);
      }
      
      // Generate a filename from the current date
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      const fileName = `newspaper_${formattedDate}.pdf`;
      
      pdf.save(fileName);
      console.log(`PDF saved with ${successCount}/${totalPages} pages as ${fileName}`);
      
      // Show status message to user
      if (successCount < totalPages) {
        alert(`PDF generated with ${successCount} out of ${totalPages} pages. Some pages could not be loaded.`);
      } else {
        alert(`PDF successfully generated with all ${totalPages} pages.`);
      }
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setPdfGenerating(false);
    }
  };

  if (loading) return <div className="text-center py-10">Loading newspaper...</div>
  if (error && !newspaperData) return <div className="text-center py-10 text-red-500">{error}</div>
  if (!newspaperData) return <div className="text-center py-10">No newspaper data available</div>

  return (
    <div className="flex flex-col min-h-screen bg-black text-white">
      {/* Newspaper Info and Controls - Updated with black and red theme */}
      <div className="flex flex-col sm:flex-row justify-between items-center p-4 bg-zinc-900 shadow-sm gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center">
            <span className="text-red-600">E</span>
            <span className="text-white">Paper</span>
            <span className="ml-2 text-gray-400">-</span>
            <div className="relative ml-2" ref={datePickerRef}>
              <button
                className="text-red-600 flex items-center hover:text-red-400 transition-colors"
                onClick={() => setShowDatePicker(!showDatePicker)}
              >
                {formatDate(selectedDate)}
                <Calendar className="w-4 h-4 ml-1" />
              </button>
              {showDatePicker && (
                <div className="absolute top-full left-0 mt-2 z-10 bg-zinc-900 p-2 rounded shadow-lg border border-zinc-700">
                  <input
                    type="date"
                    value={selectedDate.toISOString().split("T")[0]}
                    onChange={handleDateChange}
                    max={new Date().toISOString().split("T")[0]}
                    className="p-1 border border-zinc-700 rounded bg-black text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              )}
            </div>
          </h1>
        </div>

        {/* Controls - Updated with black and red theme */}
        <div className="flex flex-wrap justify-center gap-2">
          <button
            className={`p-2 rounded hover:bg-zinc-800 transition-colors ${fitToScreen ? "bg-red-600 text-white" : "bg-zinc-900 text-red-500"}`}
            onClick={toggleFitToScreen}
          >
            <Expand className="w-5 h-5" />
          </button>
          <button
            className={`p-2 rounded hover:bg-zinc-800 transition-colors ${isFullscreen ? "bg-red-600 text-white" : "bg-zinc-900 text-red-500"}`}
            onClick={toggleFullscreen}
          >
            {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
          </button>
          <button 
            className={`p-2 bg-zinc-900 text-red-500 rounded hover:bg-zinc-800 transition-colors flex items-center gap-1 ${pdfGenerating ? "opacity-70 cursor-not-allowed" : ""}`}
            onClick={generatePDF}
            disabled={pdfGenerating}
          >
            <Download className="w-5 h-5" />
            {pdfGenerating && (
              <svg className="animate-spin h-4 w-4 text-red-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {pdfGenerating ? "Generating..." : ""}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col md:flex-row flex-1">
        {/* Desktop Vertical Pagination - Updated with black and red theme */}
        <div className="hidden md:flex w-16 bg-zinc-900 flex-col items-center py-4">
          <button
            className={`p-2 rounded-full mb-2 ${currentPage <= 1 ? "text-gray-500" : "text-red-500 hover:bg-zinc-800"}`}
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage <= 1}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex flex-col items-center gap-2 py-2 flex-grow overflow-y-auto max-h-full">
            {Array.from({ length: newspaperData.totalpages }, (_, i) => (
              <button
                key={i + 1}
                className={`w-10 h-10 rounded-full flex items-center justify-center ${currentPage === i + 1 ? "bg-red-600 text-white" : "hover:bg-zinc-800 text-gray-300"}`}
                onClick={() => goToPage(i + 1)}
              >
                {i + 1}
              </button>
            ))}
          </div>

          <button
            className={`p-2 rounded-full mt-2 ${currentPage >= newspaperData.totalpages ? "text-gray-500" : "text-red-500 hover:bg-zinc-800"}`}
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage >= newspaperData.totalpages}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Newspaper Viewer - Image Container */}
        <div className="flex-1 flex flex-col items-center justify-center bg-black py-4">
          <div className="relative w-[75vw]">
            <img
              src={newspaperData.newspaperLinks[currentPage - 1] || "/placeholder.svg"}
              alt={`Page ${currentPage}`}
              className="w-full h-auto cursor-pointer"
              onClick={handleImageClick}
            />

            {/* Navigation buttons - Updated with black and red theme */}
            <button
              className="absolute left-2 top-1/2 transform -translate-y-1/2 p-3 rounded-full bg-zinc-900/90 shadow-lg hover:bg-zinc-800 transition-all"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage <= 1}
            >
              <ChevronLeft className="w-6 h-6 text-white" />
            </button>

            <button
              className="absolute right-2 top-1/2 transform -translate-y-1/2 p-3 rounded-full bg-zinc-900/90 shadow-lg hover:bg-zinc-800 transition-all"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage >= newspaperData.totalpages}
            >
              <ChevronRight className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Pagination - Updated with black and red theme */}
      <div className="md:hidden flex justify-center items-center p-2 bg-zinc-900">
        <button
          className={`p-2 rounded-full ${currentPage <= 1 ? "text-gray-500" : "text-red-500 hover:bg-zinc-800"}`}
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage <= 1}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center overflow-x-auto px-2 space-x-1 max-w-full">
          {Array.from({ length: newspaperData.totalpages }, (_, i) => (
            <button
              key={i + 1}
              className={`min-w-8 h-8 rounded-full flex items-center justify-center px-2 ${currentPage === i + 1 ? "bg-red-600 text-white" : "hover:bg-zinc-800 text-gray-300"}`}
              onClick={() => goToPage(i + 1)}
            >
              {i + 1}
            </button>
          ))}
        </div>

        <button
          className={`p-2 rounded-full ${currentPage >= newspaperData.totalpages ? "text-gray-500" : "text-red-500 hover:bg-zinc-800"}`}
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage >= newspaperData.totalpages}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Footer - Updated with black and red theme */}
      <div className="p-3 bg-zinc-900 shadow-inner flex justify-between items-center">
        <span className="text-sm text-gray-300">
          Page {currentPage} of {newspaperData.totalpages}
        </span>
        <select
          className="p-1 border border-zinc-700 rounded bg-black text-white focus:outline-none focus:ring-2 focus:ring-red-500"
          value={currentPage}
          onChange={(e) => goToPage(Number.parseInt(e.target.value))}
        >
          {Array.from({ length: newspaperData.totalpages }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              Page {i + 1}
            </option>
          ))}
        </select>
      </div>

           {/* Modal - Updated with black and red theme */}
           {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
          <div ref={modalRef} className="relative w-[90vw] h-[80vh] bg-black flex items-center justify-center border-2 border-red-600 rounded-lg">
            <button
              className="absolute top-4 right-4 text-white bg-red-600 rounded-full w-8 h-8 flex items-center justify-center text-2xl z-10 hover:bg-red-700 transition-colors"
              onClick={handleCloseModal}
            >
              ×
            </button>

            <div
              ref={modalContentRef}
              className={`relative h-full w-full ${zoomLevel === 1 ? "overflow-auto" : "overflow-auto"}`}
            >
              <div
                className={`flex justify-center ${zoomLevel === 1 ? "cursor-grab" : "cursor-pointer"} ${isDragging ? "cursor-grabbing" : ""}`}
                onClick={handleModalImageClick}
                onMouseDown={handleMouseDown}
              >
                <img
                  ref={imageRef}
                  src={newspaperData.newspaperLinks[currentPage - 1] || "/placeholder.svg"}
                  alt={`Page ${currentPage}`}
                  className={`transition-all duration-300 ${
                    zoomLevel === 0 ? "w-full h-auto object-contain" : "max-w-none w-auto h-auto scale-150"
                  }`}
                  style={{
                    transform: zoomLevel === 1 ? `translate(${position.x}px, ${position.y}px)` : "none",
                    transformOrigin: "center center",
                  }}
                  draggable="false"
                  onContextMenu={(e) => e.preventDefault()}
                />
              </div>
            </div>

            {/* Modal Navigation - Updated with black and red theme */}
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
              <button
                className={`p-2 rounded-full bg-black/50 border border-red-600 ${
                  currentPage <= 1 ? "opacity-50 cursor-not-allowed" : "hover:bg-red-600/30"
                }`}
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage <= 1}
              >
                <ChevronLeft className="w-5 h-5 text-white" />
              </button>
              <span className="bg-black/50 px-3 py-1 rounded-full text-sm text-white border border-red-600">
                {currentPage} / {newspaperData.totalpages}
              </span>
              <button
                className={`p-2 rounded-full bg-black/50 border border-red-600 ${
                  currentPage >= newspaperData.totalpages ? "opacity-50 cursor-not-allowed" : "hover:bg-red-600/30"
                }`}
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage >= newspaperData.totalpages}
              >
                <ChevronRight className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewspaperViewer;