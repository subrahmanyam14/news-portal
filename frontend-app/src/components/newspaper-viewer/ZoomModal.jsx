import { useState, useRef, useEffect } from "react";
import { ZoomIn, ZoomOut, Maximize, Minimize } from "lucide-react";

export default function ZoomModal({ activeImage, clickPosition, onClose }) {
  // Set a higher initial zoom when a click position is provided
  const initialZoomLevel = clickPosition ? 100 : 50;
  
  const [zoomLevel, setZoomLevel] = useState(initialZoomLevel);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [viewportDimensions, setViewportDimensions] = useState({ width: 0, height: 0 });
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [touchDistance, setTouchDistance] = useState(null);
  const [initialZoom, setInitialZoom] = useState(initialZoomLevel);
  const [isZoomedIn, setIsZoomedIn] = useState(initialZoomLevel > 50);
  const [hasAppliedInitialPosition, setHasAppliedInitialPosition] = useState(false);

  const containerRef = useRef(null);
  const zoomedImageRef = useRef(null);
  const imageRef = useRef(null);

  const calculateMaxZoom = () => {
    if (!imageDimensions.width || !viewportDimensions.width) return 400;
    const widthRatio = (imageDimensions.width * 4) / viewportDimensions.width;
    const heightRatio = (imageDimensions.height * 4) / viewportDimensions.height;
    const maxRatio = Math.max(widthRatio, heightRatio);
    return Math.min(400, Math.max(100, Math.floor(maxRatio * 100)));
  };

  const zoomToPoint = (clientX, clientY, newZoomLevel) => {
    if (!containerRef.current || !imageRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const mouseX = clientX - containerRect.left;
    const mouseY = clientY - containerRect.top;

    const currentZoom = zoomLevel / 100;
    const newZoom = newZoomLevel / 100;

    const relativeX = mouseX - containerRect.width / 2 - position.x;
    const relativeY = mouseY - containerRect.height / 2 - position.y;

    const newX = position.x - (relativeX * (newZoom / currentZoom - 1));
    const newY = position.y - (relativeY * (newZoom / currentZoom - 1));

    const constraints = calculateConstraints(newZoomLevel);
    setPosition({
      x: Math.min(Math.max(newX, constraints.minX), constraints.maxX),
      y: Math.min(Math.max(newY, constraints.minY), constraints.maxY)
    });

    setZoomLevel(newZoomLevel);
  };

  const zoomIn = (e) => {
    const clientX = e.clientX || (e.touches && e.touches[0]?.clientX) || 0;
    const clientY = e.clientY || (e.touches && e.touches[0]?.clientY) || 0;
    const newZoom = Math.min(zoomLevel + 25, calculateMaxZoom());
    zoomToPoint(clientX, clientY, newZoom);
  };

  const zoomOut = (e) => {
    const clientX = e.clientX || (e.touches && e.touches[0]?.clientX) || 0;
    const clientY = e.clientY || (e.touches && e.touches[0]?.clientY) || 0;
    const newZoom = Math.max(zoomLevel - 25, 50);
    if (newZoom === 50) {
      setPosition({ x: 0, y: 0 });
    }
    zoomToPoint(clientX, clientY, newZoom);
  };

  const toggleZoom = (e) => {
    if (isZoomedIn) {
      // Zoom out to initial
      setZoomLevel(50);
      setPosition({ x: 0, y: 0 });
      setIsZoomedIn(false);
    } else {
      // Zoom in to preset level (100% or max zoom / 2)
      const zoomTarget = Math.min(100, calculateMaxZoom());
      const centerX = containerRef.current ? containerRef.current.clientWidth / 2 : 0;
      const centerY = containerRef.current ? containerRef.current.clientHeight / 2 : 0;
      zoomToPoint(
        e.clientX || centerX, 
        e.clientY || centerY, 
        zoomTarget
      );
      setIsZoomedIn(true);
    }
  };

  const calculateConstraints = (zoom = zoomLevel, dimensions = imageDimensions) => {
    if (!containerRef.current || !dimensions.width) return { minX: 0, maxX: 0, minY: 0, maxY: 0 };

    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = containerRef.current.clientHeight;
    const zoomFactor = zoom / 100;

    const scaledWidth = dimensions.width * zoomFactor;
    const scaledHeight = dimensions.height * zoomFactor;

    const horizontalConstraint = Math.max(0, (scaledWidth - containerWidth) / 2);
    const verticalConstraint = Math.max(0, (scaledHeight - containerHeight) / 2);

    return {
      minX: -horizontalConstraint,
      maxX: horizontalConstraint,
      minY: -verticalConstraint,
      maxY: verticalConstraint
    };
  };

  const handleImageLoaded = () => {
    if (imageRef.current) {
      const newDimensions = {
        width: imageRef.current.naturalWidth,
        height: imageRef.current.naturalHeight
      };
      setImageDimensions(newDimensions);
    }
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 1 : -1;
    const zoomStep = 10;
    const newZoom = Math.min(Math.max(zoomLevel + (delta * zoomStep), 50), calculateMaxZoom());
    if (newZoom !== zoomLevel) {
      zoomToPoint(e.clientX, e.clientY, newZoom);
      setIsZoomedIn(newZoom > 50);
    }
  };

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    if (containerRef.current) {
      containerRef.current.style.cursor = 'grabbing';
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
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
    if (containerRef.current) {
      containerRef.current.style.cursor = 'grab';
    }
  };

  const getDistance = (touches) => {
    return Math.hypot(
      touches[0].clientX - touches[1].clientX,
      touches[0].clientY - touches[1].clientY
    );
  };

  const getMidpoint = (touches) => {
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2
    };
  };

  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      });
    } else if (e.touches.length === 2) {
      setTouchDistance(getDistance(e.touches));
      setInitialZoom(zoomLevel);
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 1 && isDragging) {
      e.preventDefault();
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
    } else if (e.touches.length === 2) {
      e.preventDefault();
      const newDistance = getDistance(e.touches);
      if (touchDistance !== null) {
        const midpoint = getMidpoint(e.touches);
        const scale = newDistance / touchDistance;
        const newZoom = Math.min(
          Math.max(initialZoom * scale, 50),
          calculateMaxZoom()
        );
        zoomToPoint(midpoint.x, midpoint.y, newZoom);
        setIsZoomedIn(newZoom > 50);
      }
    }
  };

  const handleTouchEnd = (e) => {
    if (e.touches.length === 0) {
      setIsDragging(false);
      setTouchDistance(null);
    } else if (e.touches.length === 1) {
      setTouchDistance(null);
      setDragStart({
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      });
    }
  };

  // Effect to apply click position after image dimensions are known
  useEffect(() => {
    if (clickPosition && 
        !hasAppliedInitialPosition && 
        imageDimensions.width > 0 && 
        containerRef.current) {
      
      const zoomFactor = zoomLevel / 100;
      
      // This is the key fix - we need to use negative offsets
      // Multiply by -1 to move the view in the correct direction
      const offsetX = -1 * (clickPosition.percentX - 0.5) * imageDimensions.width * zoomFactor;
      const offsetY = -1 * (clickPosition.percentY - 0.5) * imageDimensions.height * zoomFactor;
      
      const constraints = calculateConstraints();
      setPosition({
        x: Math.min(Math.max(offsetX, constraints.minX), constraints.maxX),
        y: Math.min(Math.max(offsetY, constraints.minY), constraints.maxY)
      });
      
      setHasAppliedInitialPosition(true);
    }
  }, [clickPosition, imageDimensions, hasAppliedInitialPosition, zoomLevel]);

  useEffect(() => {
    const updateViewportDimensions = () => {
      if (containerRef.current) {
        setViewportDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };

    updateViewportDimensions();
    window.addEventListener('resize', updateViewportDimensions);

    return () => {
      window.removeEventListener('resize', updateViewportDimensions);
    };
  }, []);

  useEffect(() => {
    setIsZoomedIn(zoomLevel > 50);
    if (containerRef.current) {
      containerRef.current.style.cursor = isDragging ? 'grabbing' : 'grab';
    }
  }, [zoomLevel, isDragging]);

  if (!activeImage) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-90 flex justify-center items-center p-4 z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
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
              onClick={toggleZoom}
              title={isZoomedIn ? "Reset Zoom" : "Quick Zoom"}
            >
              {isZoomedIn ? <Minimize size={20} /> : <Maximize size={20} />}
            </button>
            <span className="text-white ml-2">{zoomLevel}% (Max: {calculateMaxZoom()}%)</span>
          </div>

          <button
            className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        {/* Image container */}
        <div
          ref={containerRef}
          className="flex-1 overflow-hidden relative bg-gray-800 touch-none"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{
            cursor: isDragging ? 'grabbing' : 'grab'
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
              transition: isDragging || touchDistance !== null ? 'none' : 'transform 0.2s ease-out',
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
          <p className="hidden md:block">Scroll to zoom. Click and drag to pan. Click the {isZoomedIn ? "Minimize" : "Maximize"} button to toggle zoom.</p>
          <p className="md:hidden">Pinch to zoom. Touch and drag to pan.</p>
        </div>
      </div>
    </div>
  );
}