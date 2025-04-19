import { useState, useEffect, useRef } from "react";
import { jsPDF } from "jspdf";
import { Download, ChevronLeft, ChevronRight, Calendar, ZoomIn, ZoomOut, Maximize, Minimize, Scissors, X } from "lucide-react";
import axios from "axios";

// CSS styles for 3D flip animation and marquee
const flipStyles = `
  .perspective-1000 {
    perspective: 1000px;
    -webkit-perspective: 1000px;
  }
  
  .flip-card {
    transform-style: preserve-3d;
    -webkit-transform-style: preserve-3d;
    transition: transform 0.6s cubic-bezier(0.4, 0.0, 0.2, 1);
    -webkit-transition: transform 0.6s cubic-bezier(0.4, 0.0, 0.2, 1);
  }
  
  .flip-card.no-transition {
    transition: none !important;
    -webkit-transition: none !important;
  }
  
  .flip-card.flipping.left {
    transform: rotateY(-180deg);
    -webkit-transform: rotateY(-180deg);
  }
  
  .flip-card.flipping.right {
    transform: rotateY(180deg);
    -webkit-transform: rotateY(180deg);
  }
  
  .flip-card-front,
  .flip-card-back {
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
    position: absolute;
    width: 100%;
    height: 100%;
    transform-style: preserve-3d;
    -webkit-transform-style: preserve-3d;
    display: flex;
    justify-content: center;
    align-items: center;
  }
  
  .flip-card-back {
    transform: rotateY(180deg);
    -webkit-transform: rotateY(180deg);
  }
  
  .flip-card-front img,
  .flip-card-back img {
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    transition: box-shadow 0.3s ease;
  }
  
  .flipping .flip-card-front img,
  .flipping .flip-card-back img {
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.3);
  }

  /* Marquee styles */
  .marquee-container {
    background-color: #1a1a1a;
    color: white;
    padding: 8px 0;
    width: 100%;
  }

  .marquee a {
    color: white;
    text-decoration: none;
    margin: 0 20px;
    transition: color 0.3s ease;
  }
`;

export default function ImageViewer() {
  const [images, setImages] = useState([]);
  const [activeImage, setActiveImage] = useState(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(75);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [viewportDimensions, setViewportDimensions] = useState({ width: 0, height: 0 });
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [isFlipping, setIsFlipping] = useState(false);
  const [noTransition, setNoTransition] = useState(false);
  const [flipDirection, setFlipDirection] = useState('');
  const [nextImageToShow, setNextImageToShow] = useState(null);
  const [isClipping, setIsClipping] = useState(false);
  const [clipBox, setClipBox] = useState({ x: 0, y: 0, width: 200, height: 200 });
  const [resizingClipBox, setResizingClipBox] = useState(false);
  const [resizeDirection, setResizeDirection] = useState(null);
  const [movingClipBox, setMovingClipBox] = useState(false);
  const [clipBoxDragStart, setClipBoxDragStart] = useState({ x: 0, y: 0 });
  const [clipImageLoading, setClipImageLoading] = useState(false);
  const zoomedImageRef = useRef(null);
  const containerRef = useRef(null);
  const imageRef = useRef(null);
  const flipCardRef = useRef(null);
  const clipImageRef = useRef(null);
  const clipContainerRef = useRef(null);
  const marqueeRef = useRef(null);
  const [headlines, setHeadlines] = useState([]);
  const [headlinesLoading, setHeadlinesLoading] = useState(false);

  // Helper function to format date as YYYY-MM-DD
  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Set initial date to today
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

  // Calculate maximum zoom level based on image and viewport dimensions
  const calculateMaxZoom = () => {
    if (!imageDimensions.width || !viewportDimensions.width) return 400;
    const widthRatio = (imageDimensions.width * 4) / viewportDimensions.width;
    const heightRatio = (imageDimensions.height * 4) / viewportDimensions.height;
    return Math.min(400, Math.max(100, Math.floor(Math.max(widthRatio, heightRatio) * 100)));
  };

  // Enhanced zoom to point functionality
  const zoomToPoint = (e, newZoomLevel) => {
    if (!containerRef.current || !imageRef.current) return;

    // Get container dimensions and mouse position
    const containerRect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - containerRect.left;
    const mouseY = e.clientY - containerRect.top;

    // Calculate current and new zoom factors
    const currentZoom = zoomLevel / 100;
    const newZoom = newZoomLevel / 100;

    // Calculate the mouse position relative to the image center
    const relativeX = mouseX - containerRect.width / 2 - position.x;
    const relativeY = mouseY - containerRect.height / 2 - position.y;

    // Calculate the new position to zoom toward the mouse pointer
    const newX = position.x - (relativeX * (newZoom / currentZoom - 1));
    const newY = position.y - (relativeY * (newZoom / currentZoom - 1));

    // Apply constraints
    const constraints = calculateConstraints(newZoomLevel);
    setPosition({
      x: Math.min(Math.max(newX, constraints.minX), constraints.maxX),
      y: Math.min(Math.max(newY, constraints.minY), constraints.maxY)
    });

    setZoomLevel(newZoomLevel);
  };

  // Enhanced zoom in with mouse position
  const zoomIn = (e) => {
    const newZoom = Math.min(zoomLevel + 25, calculateMaxZoom());
    zoomToPoint(e, newZoom);
  };

  // Enhanced zoom out with mouse position
  const zoomOut = (e) => {
    const newZoom = Math.max(zoomLevel - 25, 50);
    if (newZoom === 75) {
      setPosition({ x: 0, y: 0 });
    }
    zoomToPoint(e, newZoom);
  };

  // Reset zoom to default
  const resetZoom = () => {
    setZoomLevel(75);
    setPosition({ x: 0, y: 0 });
  };

  // Calculate constraints based on current zoom level
  const calculateConstraints = (zoom = zoomLevel) => {
    if (!containerRef.current || !imageRef.current) return { minX: 0, maxX: 0, minY: 0, maxY: 0 };

    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = containerRef.current.clientHeight;
    const zoomFactor = zoom / 100;

    // Calculate image dimensions at current zoom level
    const scaledWidth = imageDimensions.width * zoomFactor;
    const scaledHeight = imageDimensions.height * zoomFactor;

    // Calculate maximum allowed pan in each direction
    const horizontalConstraint = Math.max(0, (scaledWidth - containerWidth) / 2);
    const verticalConstraint = Math.max(0, (scaledHeight - containerHeight) / 2);

    return {
      minX: -horizontalConstraint,
      maxX: horizontalConstraint,
      minY: -verticalConstraint,
      maxY: verticalConstraint
    };
  };

  // Update viewport dimensions on resize
  useEffect(() => {
    const updateViewportDimensions = () => {
      if (containerRef.current) {
        setViewportDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };

    // Set initial dimensions
    updateViewportDimensions();

    // Add resize listener
    window.addEventListener('resize', updateViewportDimensions);

    return () => {
      window.removeEventListener('resize', updateViewportDimensions);
    };
  }, [isZoomed]);

  // Update image dimensions when image loads
  const handleImageLoaded = () => {
    if (imageRef.current) {
      setImageDimensions({
        width: imageRef.current.naturalWidth,
        height: imageRef.current.naturalHeight
      });
    }
  };

  // Reset zoom level and position when opening the zoom modal
  useEffect(() => {
    if (isZoomed) {
      setZoomLevel(75);
      setPosition({ x: 0, y: 0 });
    }
  }, [isZoomed]);

  // Fetch available dates for the current month
  useEffect(() => {
    const fetchAvailableDates = async () => {
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_BACKEND_URL}/newspaper/dates?month=${currentMonthYear.month
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
          url = `${process.env.REACT_APP_BACKEND_URL}/newspaper`;
        } else {
          url = `${process.env.REACT_APP_BACKEND_URL}/newspaper/date?date=${selectedDate}`;
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

  // Fetch headlines
  useEffect(() => {
    const fetchHeadlines = async () => {
      setHeadlinesLoading(true);
      try {
        const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/headline/get`);
        setHeadlines(response.data || []);
      } catch (err) {
        console.error('Failed to fetch headlines:', err);
      } finally {
        setHeadlinesLoading(false);
      }
    };

    fetchHeadlines();
  }, []);

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
    if (!activeImage || !images.length || isFlipping) return;

    // Get the next image
    const nextImg = images[(activeImage.id % images.length)];

    // Reset any previous no-transition state
    setNoTransition(false);

    // Set animation direction and next image
    setFlipDirection('left');
    setNextImageToShow(nextImg);
    setIsFlipping(true);

    // After animation completes, update the active image and reset the card
    setTimeout(() => {
      // Disable transitions temporarily
      setNoTransition(true);
      setIsFlipping(false);

      // Update active image
      setActiveImage(nextImg);

      // Re-enable transitions after the DOM has updated
      setTimeout(() => {
        setNoTransition(false);
      }, 50);
    }, 600);
  };

  const prevImage = () => {
    if (!activeImage || !images.length || isFlipping) return;

    // Get the previous image
    const prevImg = images[(activeImage.id - 2 + images.length) % images.length];

    // Reset any previous no-transition state
    setNoTransition(false);

    // Set animation direction and next image
    setFlipDirection('right');
    setNextImageToShow(prevImg);
    setIsFlipping(true);

    // After animation completes, update the active image and reset the card
    setTimeout(() => {
      // Disable transitions temporarily
      setNoTransition(true);
      setIsFlipping(false);

      // Update active image
      setActiveImage(prevImg);

      // Re-enable transitions after the DOM has updated
      setTimeout(() => {
        setNoTransition(false);
      }, 50);
    }, 600);
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

  // Enhanced wheel handler for smooth zooming
  const handleWheel = (e) => {
    e.preventDefault();

    // Calculate new zoom level based on wheel direction
    const delta = e.deltaY < 0 ? 1 : -1;
    const zoomStep = 10; // Smaller steps for smoother zooming
    const newZoom = Math.min(Math.max(zoomLevel + (delta * zoomStep), 50), calculateMaxZoom());

    // Only zoom if we're actually changing zoom level
    if (newZoom !== zoomLevel) {
      zoomToPoint(e, newZoom);
    }
  };

  // Enhanced touch support for mobile
  const handleTouchStart = (e) => {
    if (e.touches.length === 1 && zoomLevel > 75) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      });
    }
  };

  const handleTouchMove = (e) => {
    if (isDragging && e.touches.length === 1 && zoomLevel > 75) {
      e.preventDefault(); // Prevent page scroll

      const dx = e.touches[0].clientX - dragStart.x;
      const dy = e.touches[0].clientY - dragStart.y;

      const constraints = calculateConstraints();

      setPosition(prev => ({
        x: Math.min(Math.max(prev.x + dx, constraints.minX), constraints.maxX),
        y: Math.min(Math.max(prev.y + dy, constraints.minY), constraints.maxY)
      }));

      setDragStart({
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      });
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Mouse events for panning with improved boundary logic
  const handleMouseDown = (e) => {
    if (zoomLevel > 75) {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      // Change cursor style
      if (containerRef.current) {
        containerRef.current.style.cursor = 'grabbing';
      }
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging && zoomLevel > 75) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;

      const constraints = calculateConstraints();

      setPosition(prev => ({
        x: Math.min(Math.max(prev.x + dx, constraints.minX), constraints.maxX),
        y: Math.min(Math.max(prev.y + dy, constraints.minY), constraints.maxY)
      }));

      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    // Restore cursor
    if (containerRef.current) {
      containerRef.current.style.cursor = zoomLevel > 75 ? 'grab' : 'default';
    }
  };

  // Function to go to a specific page
  const goToPage = (pageNum) => {
    if (pageNum >= 1 && pageNum <= images.length && !isFlipping) {
      const targetImage = images[pageNum - 1];

      // If same page or no current page, just set it without animation
      if (!activeImage || activeImage.id === pageNum) {
        setActiveImage(targetImage);
        return;
      }

      // Reset any previous no-transition state
      setNoTransition(false);

      // Determine flip direction based on current and target page
      const direction = pageNum > activeImage.id ? 'left' : 'right';
      setFlipDirection(direction);
      setNextImageToShow(targetImage);
      setIsFlipping(true);

      // After animation completes, update the active image and reset the card
      setTimeout(() => {
        // Disable transitions temporarily
        setNoTransition(true);
        setIsFlipping(false);

        // Update active image
        setActiveImage(targetImage);

        // Re-enable transitions after the DOM has updated
        setTimeout(() => {
          setNoTransition(false);
        }, 50);
      }, 600);
    }
  };

  // Pagination component
  const renderPagination = () => {
    if (!images.length || !activeImage) return null;

    const currentPage = activeImage.id;
    const totalPages = images.length;

    return (
      <div className="flex justify-center mt-4">
        <div className="flex">
          {/* First button (previous) */}
          <button
            onClick={() => goToPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="flex items-center justify-center w-12 h-12 border border-gray-300 hover:bg-gray-100 disabled:opacity-50"
            aria-label="Previous page"
          >
            «
          </button>

          {/* Page number buttons */}
          {Array.from({ length: Math.min(7, totalPages) }, (_, i) => i + 1).map(pageNum => (
            <button
              key={pageNum}
              onClick={() => goToPage(pageNum)}
              className={`flex items-center justify-center w-12 h-12 border border-gray-300 ${pageNum === currentPage ? "bg-green-500 text-white" : "hover:bg-gray-100"
                }`}
            >
              {pageNum}
            </button>
          ))}

          {/* Last button (next) */}
          <button
            onClick={() => goToPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="flex items-center justify-center w-12 h-12 border border-gray-300 hover:bg-gray-100 disabled:opacity-50"
            aria-label="Next page"
          >
            »
          </button>
        </div>
      </div>
    );
  };

  // Function to toggle the clipping mode
  const toggleClippingMode = () => {
    if (!activeImage) return;

    if (!isClipping) {
      // When entering clip mode, initialize the clip box in the center
      if (containerRef.current) {
        const container = containerRef.current.getBoundingClientRect();
        setClipBox({
          x: container.width / 2 - 150,
          y: container.height / 2 - 100,
          width: 300,
          height: 200
        });
      }
    }

    setIsClipping(!isClipping);
  };

  // Function to handle resize start for clip box
  const handleResizeStart = (e, direction) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingClipBox(true);
    setResizeDirection(direction);
    setClipBoxDragStart({ x: e.clientX, y: e.clientY });
  };

  // Function to handle move start for clip box
  const handleMoveStart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setMovingClipBox(true);
    setClipBoxDragStart({ x: e.clientX, y: e.clientY });
  };

  // Function to handle mouse movements when resizing or moving clip box
  const handleClipBoxMove = (e) => {
    if (!resizingClipBox && !movingClipBox) return;

    e.preventDefault();

    const dx = e.clientX - clipBoxDragStart.x;
    const dy = e.clientY - clipBoxDragStart.y;

    if (movingClipBox) {
      // Move the entire box
      setClipBox(prev => {
        // Calculate new position
        let newX = prev.x + dx;
        let newY = prev.y + dy;

        // Apply boundaries if we have a container
        if (clipContainerRef.current) {
          const bounds = clipContainerRef.current.getBoundingClientRect();

          // Ensure the box stays within the image bounds
          newX = Math.max(0, Math.min(newX, bounds.width - prev.width));
          newY = Math.max(0, Math.min(newY, bounds.height - prev.height));
        }

        return { ...prev, x: newX, y: newY };
      });
    } else if (resizingClipBox) {
      // Resize the box based on the direction
      setClipBox(prev => {
        let newBox = { ...prev };

        // Minimum dimensions to prevent box becoming too small
        const MIN_WIDTH = 50;
        const MIN_HEIGHT = 50;

        switch (resizeDirection) {
          case 'e': // Right edge
            newBox.width = Math.max(MIN_WIDTH, prev.width + dx);
            break;
          case 'w': // Left edge
            const newWidthW = Math.max(MIN_WIDTH, prev.width - dx);
            if (newWidthW !== prev.width) {
              newBox.x = prev.x + (prev.width - newWidthW);
              newBox.width = newWidthW;
            }
            break;
          case 's': // Bottom edge
            newBox.height = Math.max(MIN_HEIGHT, prev.height + dy);
            break;
          case 'n': // Top edge
            const newHeightN = Math.max(MIN_HEIGHT, prev.height - dy);
            if (newHeightN !== prev.height) {
              newBox.y = prev.y + (prev.height - newHeightN);
              newBox.height = newHeightN;
            }
            break;
          case 'se': // Bottom-right corner
            newBox.width = Math.max(MIN_WIDTH, prev.width + dx);
            newBox.height = Math.max(MIN_HEIGHT, prev.height + dy);
            break;
          case 'sw': // Bottom-left corner
            const newWidthSW = Math.max(MIN_WIDTH, prev.width - dx);
            if (newWidthSW !== prev.width) {
              newBox.x = prev.x + (prev.width - newWidthSW);
              newBox.width = newWidthSW;
            }
            newBox.height = Math.max(MIN_HEIGHT, prev.height + dy);
            break;
          case 'ne': // Top-right corner
            newBox.width = Math.max(MIN_WIDTH, prev.width + dx);
            const newHeightNE = Math.max(MIN_HEIGHT, prev.height - dy);
            if (newHeightNE !== prev.height) {
              newBox.y = prev.y + (prev.height - newHeightNE);
              newBox.height = newHeightNE;
            }
            break;
          case 'nw': // Top-left corner
            const newWidthNW = Math.max(MIN_WIDTH, prev.width - dx);
            if (newWidthNW !== prev.width) {
              newBox.x = prev.x + (prev.width - newWidthNW);
              newBox.width = newWidthNW;
            }
            const newHeightNW = Math.max(MIN_HEIGHT, prev.height - dy);
            if (newHeightNW !== prev.height) {
              newBox.y = prev.y + (prev.height - newHeightNW);
              newBox.height = newHeightNW;
            }
            break;
          default:
            break;
        }

        // Apply boundaries if we have a container
        if (clipContainerRef.current) {
          const bounds = clipContainerRef.current.getBoundingClientRect();

          // Ensure the box stays within the image bounds
          if (newBox.x < 0) {
            newBox.width += newBox.x;
            newBox.x = 0;
          }

          if (newBox.y < 0) {
            newBox.height += newBox.y;
            newBox.y = 0;
          }

          if (newBox.x + newBox.width > bounds.width) {
            newBox.width = bounds.width - newBox.x;
          }

          if (newBox.y + newBox.height > bounds.height) {
            newBox.height = bounds.height - newBox.y;
          }
        }

        return newBox;
      });
    }

    // Update the drag start position
    setClipBoxDragStart({ x: e.clientX, y: e.clientY });
  };

  // Function to handle mouse up for clip box interactions
  const handleClipBoxRelease = () => {
    setResizingClipBox(false);
    setMovingClipBox(false);
  };

  // Function to download the cropped image
  const downloadClippedImage = async () => {
    if (!activeImage || !clipContainerRef.current) return;

    setClipImageLoading(true);

    try {
      // Create an offscreen canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      // Create a new image for drawing to canvas
      const img = new Image();
      img.crossOrigin = 'Anonymous';

      // Load the image
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = activeImage.src;
      });

      // Get the original image dimensions
      const imgWidth = img.naturalWidth;
      const imgHeight = img.naturalHeight;

      // Get the clip container dimensions
      const containerRect = clipContainerRef.current.getBoundingClientRect();

      // Calculate the scaling factors between the displayed image and the original image
      const scaleX = imgWidth / containerRect.width;
      const scaleY = imgHeight / containerRect.height;

      // Calculate the actual clip dimensions in the original image
      const actualX = clipBox.x * scaleX;
      const actualY = clipBox.y * scaleY;
      const actualWidth = clipBox.width * scaleX;
      const actualHeight = clipBox.height * scaleY;

      // Set the canvas dimensions to the clipped area size
      canvas.width = actualWidth;
      canvas.height = actualHeight;

      // Draw only the clipped portion of the image
      ctx.drawImage(
        img,
        actualX, actualY, actualWidth, actualHeight,
        0, 0, actualWidth, actualHeight
      );

      // Convert canvas to blob and download
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `newspaper-clip-${selectedDate}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setClipImageLoading(false);
      }, 'image/jpeg', 0.9);

    } catch (err) {
      console.error('Error clipping image:', err);
      setClipImageLoading(false);
    }
  };

  // Add event listeners for global mouse movements when clipping
  useEffect(() => {
    if (isClipping) {
      window.addEventListener('mousemove', handleClipBoxMove);
      window.addEventListener('mouseup', handleClipBoxRelease);

      return () => {
        window.removeEventListener('mousemove', handleClipBoxMove);
        window.removeEventListener('mouseup', handleClipBoxRelease);
      };
    }
  }, [isClipping, resizingClipBox, movingClipBox, clipBoxDragStart]);

  return (
    <div className="flex flex-col mt-16">
      {/* Add flip animation styles */}
      <style>{flipStyles}</style>

      {/* Headlines Marquee */}
      {headlines.length > 0 && !headlinesLoading && (
        <div className="marquee-container">
          <marquee
            ref={marqueeRef}
            behavior="scroll"
            direction="left"
            scrollAmount="5"
            onMouseOver={() => marqueeRef.current && marqueeRef.current.stop()}
            onMouseOut={() => marqueeRef.current && marqueeRef.current.start()}
          >
            {headlines.map((headline, index) => (
              <a
                key={index}
                href={headline.path}
                target="_blank"
                rel="noopener noreferrer"
                className="mr-6 hover:text-blue-500"
              >
                ● {headline.name}
              </a>
            ))}
          </marquee>
        </div>
      )}

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
                      className={`p-1 rounded ${isToday ? 'bg-blue-600' :
                        isSelected ? 'border-2 border-blue-500' :
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
              onChange={(e) => goToPage(Number(e.target.value))}
              disabled={loading || !images.length || isFlipping}
            >
              {images.map((img) => (
                <option key={img.id} value={img.id}>Page - {img.id}</option>
              ))}
            </select>
          </>
        )}
        <div className="flex gap-2">
          {/* Clip Button */}
          <button
            className={`px-2 md:px-4 py-2 rounded flex items-center relative hover:bg-green-600 transition-colors ${isClipping ? 'bg-green-600' : 'bg-green-500'}`}
            onClick={toggleClippingMode}
            disabled={!activeImage || loading}
          >
            <span className="flex gap-2">
              <Scissors size={20} /> <span className="hidden md:block">Clip</span>
            </span>
          </button>

          {/* Download Button */}
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
              <Download size={20} /> <span className="hidden md:block">PDF</span>
            </span>
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex flex-1 flex-col gap-6 overflow-hidden justify-center md:px-32">
        {/* Main Image */}
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
                className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-gray-700 p-2 rounded-full text-white hover:bg-gray-600 disabled:opacity-50 z-10 transition-all duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:hover:bg-gray-400"
                onClick={prevImage}
                disabled={images.length <= 1 || isFlipping || activeImage?.id === 1 || isClipping}
                aria-label="Previous page"
              >
                <ChevronLeft size={24} />
              </button>

              {/* 3D Flip Card Container */}
              <div className="perspective-1000 w-full flex justify-center items-center" style={{ height: '70vh' }}>
                <div
                  ref={flipCardRef}
                  className={`flip-card ${isFlipping ? `flipping ${flipDirection}` : ''} ${noTransition ? 'no-transition' : ''}`}
                  style={{
                    width: '100%',
                    height: '100%',
                    position: 'relative'
                  }}
                >
                  {/* Current Active Image - Front */}
                  <div className="flip-card-front">
                    {isClipping ? (
                      <div className="relative" ref={clipContainerRef}>
                        <img
                          src={activeImage.src}
                          alt={`Page ${activeImage.id}`}
                          className="shadow-lg border-2 border-gray-400 max-h-[70vh] object-contain"
                          ref={clipImageRef}
                        />

                        {/* Overlay with semi-transparent background */}
                        <div className="absolute inset-0 bg-black bg-opacity-70">
                          {/* Clip area (transparent window) */}
                          <div
                            className="absolute cursor-move"
                            style={{
                              left: `${clipBox.x}px`,
                              top: `${clipBox.y}px`,
                              width: `${clipBox.width}px`,
                              height: `${clipBox.height}px`,
                            }}
                            onMouseDown={handleMoveStart}
                          >
                            {/* Clear area to see the image */}
                            <div className="absolute inset-0 bg-transparent border-2 border-white rounded-md border-dashed"></div>

                            {/* Resize handles */}
                            <div
                              className="absolute w-4 h-4 cursor-nwse-resize right-0 bottom-0 transform translate-x-1/2 translate-y-1/2"
                              onMouseDown={(e) => handleResizeStart(e, 'se')}
                            >
                              <div className="absolute inset-0 bg-white rounded-full w-2 h-2 transform -translate-x-1/2 -translate-y-1/2"></div>
                            </div>
                            <div
                              className="absolute w-4 h-4 cursor-nesw-resize left-0 bottom-0 transform translate-x-1/2 translate-y-1/2"
                              onMouseDown={(e) => handleResizeStart(e, 'sw')}
                            >
                              <div className="absolute inset-0 bg-white rounded-full w-2 h-2 transform -translate-x-1/2 -translate-y-1/2"></div>
                            </div>
                            <div
                              className="absolute w-4 h-4 cursor-nesw-resize right-0 top-0 transform translate-x-1/2 translate-y-1/2"
                              onMouseDown={(e) => handleResizeStart(e, 'ne')}
                            >
                              <div className="absolute inset-0 bg-white rounded-full w-2 h-2 transform -translate-x-1/2 -translate-y-1/2"></div>
                            </div>
                            <div
                              className="absolute w-4 h-4 cursor-nwse-resize left-0 top-0 transform translate-x-1/2 translate-y-1/2"
                              onMouseDown={(e) => handleResizeStart(e, 'nw')}
                            >
                              <div className="absolute inset-0 bg-white rounded-full w-2 h-2 transform -translate-x-1/2 -translate-y-1/2"></div>
                            </div>

                            {/* Action buttons */}
                            <div className="absolute -top-6 right-0 flex gap-2">
                              <button
                                className="bg-green-500 text-white px-2 py-1 rounded-md flex items-center gap-2 hover:bg-green-600 transition-colors shadow-md"
                                onClick={downloadClippedImage}
                                disabled={clipImageLoading}
                              >
                                {clipImageLoading ? (
                                  <div className="border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                  <>
                                    <Download size={16} />
                                  </>
                                )}
                              </button>
                              <button
                                className="bg-red-500 text-white px-2 py-1 rounded-md flex items-center gap-2 hover:bg-red-600 transition-colors shadow-md"
                                onClick={toggleClippingMode}
                              >
                                <X size={16} />
                              </button>
                            </div>

                            {/* Dimensions display */}
                            <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-white text-sm bg-black bg-opacity-50 px-2 py-1 rounded">
                              {Math.round(clipBox.width)} x {Math.round(clipBox.height)} px
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <img
                        src={activeImage.src}
                        alt={`Page ${activeImage.id}`}
                        className="shadow-lg border-2 border-gray-400 cursor-zoom-in max-h-[70vh] object-contain"
                        onClick={() => setIsZoomed(true)}
                      />
                    )}
                  </div>

                  {/* Next Image To Show - Back */}
                  <div className="flip-card-back">
                    <img
                      src={(nextImageToShow || activeImage).src}
                      alt={`Page ${(nextImageToShow || activeImage).id}`}
                      className="shadow-lg border-2 border-gray-400 cursor-zoom-in max-h-[70vh] object-contain"
                    />
                  </div>
                </div>
              </div>

              <button
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-gray-700 p-2 rounded-full text-white hover:bg-gray-600 disabled:opacity-50 z-10 transition-all duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:hover:bg-gray-400"
                onClick={nextImage}
                disabled={images.length <= 1 || isFlipping || activeImage?.id === images.length || isClipping}
                aria-label="Next page"
              >
                <ChevronRight size={24} />
              </button>
            </>
          )}
        </div>

        {/* Updated Pagination Component */}
        {renderPagination()}

        {/* Bottom Preview - All Images */}
        {images.length > 0 && !isClipping && (
          <div className="w-full overflow-x-auto p-2 flex gap-2 justify-center">
            {images.map((img) => (
              <img
                key={img.id}
                src={img.src}
                alt={`Page ${img.id}`}
                className={`cursor-pointer border-4 h-32 object-contain ${img.id === activeImage?.id ? "border-blue-500" : "border-gray-300 hover:border-gray-400"
                  }`}
                onClick={() => goToPage(img.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Enhanced Zoom Popup */}
      {isZoomed && activeImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 flex justify-center items-center p-4 z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsZoomed(false);
            }
          }}
        >
          <div className="relative w-full h-full max-w-6xl max-h-[90vh] bg-gray-900 rounded-lg flex flex-col">
            {/* Toolbar */}
            <div className="bg-gray-800 p-2 flex items-center justify-between rounded-t-lg">
              <div className="flex items-center gap-2">
                <button
                  className="bg-gray-700 p-2 rounded hover:bg-gray-600 text-white"
                  onClick={(e) => zoomIn(e)}
                  title="Zoom In"
                >
                  <ZoomIn size={20} />
                </button>
                <button
                  className="bg-gray-700 p-2 rounded hover:bg-gray-600 text-white"
                  onClick={(e) => zoomOut(e)}
                  title="Zoom Out"
                >
                  <ZoomOut size={20} />
                </button>
                <button
                  className="bg-gray-700 p-2 rounded hover:bg-gray-600 text-white"
                  onClick={resetZoom}
                  title="Reset Zoom"
                >
                  {zoomLevel === 75 ? <Maximize size={20} /> : <Minimize size={20} />}
                </button>
                <span className="text-white ml-2">{zoomLevel}% (Max: {calculateMaxZoom()}%)</span>
              </div>

              <button
                className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                onClick={() => setIsZoomed(false)}
              >
                Close
              </button>
            </div>

            {/* Image container with improved zoom behavior */}
            <div
              ref={containerRef}
              className="flex-1 overflow-hidden relative bg-gray-800"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onWheel={handleWheel}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              style={{
                cursor: zoomLevel > 75 ? (isDragging ? 'grabbing' : 'grab') : 'default'
              }}
            >
              <div
                ref={zoomedImageRef}
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px)) scale(${zoomLevel / 100})`,
                  transformOrigin: 'center',
                  transition: isDragging ? 'none' : 'transform 0.2s ease-out',
                  willChange: 'transform'
                }}
              >
                <img
                  ref={imageRef}
                  src={activeImage.src}
                  alt="Zoomed Image"
                  onLoad={handleImageLoaded}
                  draggable="false"
                  style={{
                    maxWidth: 'none',
                    maxHeight: 'none',
                    display: 'block'
                  }}
                />
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-gray-800 text-gray-300 text-xs md:text-sm p-2 text-center rounded-b-lg">
              <p className="hidden md:block">Scroll to zoom. Click and drag to pan. Zoom happens at mouse pointer position.</p>
              <p className="md:hidden">Pinch to zoom. Touch and drag to pan.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}