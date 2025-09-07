import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { useSearchParams } from 'react-router-dom';

const ImageMetaViewer = () => {
  const [searchParams] = useSearchParams();
  const [imageUrl, setImageUrl] = useState(null);
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);

  const imgRef = useRef(null);
  const wrapperRef = useRef(null);
  const [initialScale, setInitialScale] = useState(1);
  const [maxScale, setMaxScale] = useState(4);
  const isDragging = useRef(false);
  const lastPosition = useRef({ x: 0, y: 0 });
  const startPosition = useRef({ x: 0, y: 0 });
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Pinch-to-zoom state
  const [initialDistance, setInitialDistance] = useState(0);
  const [initialScale2, setInitialScale2] = useState(1);
  const [initialTranslate, setInitialTranslate] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const imageName = searchParams.get('img');
    if (imageName) {
      const fullUrl = `https://epaper.thesiddipettimes.in/4b599cbe842d49b1b0e9e00bcab7a62d:sdpttimes/epaper/newspapers/${imageName}`;
      setImageUrl(fullUrl);
    }
  }, [searchParams]);

  const getDistance = (touches) => {
    return Math.sqrt(
      Math.pow(touches[0].clientX - touches[1].clientX, 2) +
      Math.pow(touches[0].clientY - touches[1].clientY, 2)
    );
  };

  const getCenter = (touches) => {
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2
    };
  };

  const constrainTranslate = useCallback((newTranslate, newScale) => {
    const img = imgRef.current;
    const wrapper = wrapperRef.current;
    if (!img || !wrapper) return newTranslate;

    const imgWidth = img.naturalWidth * newScale;
    const imgHeight = img.naturalHeight * newScale;
    const wrapperWidth = wrapper.clientWidth;
    const wrapperHeight = wrapper.clientHeight;

    let { x, y } = newTranslate;

    // Constrain horizontal movement
    if (imgWidth <= wrapperWidth) {
      x = (wrapperWidth - imgWidth) / 2;
    } else {
      const maxX = 0;
      const minX = wrapperWidth - imgWidth;
      x = Math.max(minX, Math.min(maxX, x));
    }

    // Constrain vertical movement
    if (imgHeight <= wrapperHeight) {
      y = (wrapperHeight - imgHeight) / 2;
    } else {
      const maxY = 0;
      const minY = wrapperHeight - imgHeight;
      y = Math.max(minY, Math.min(maxY, y));
    }

    return { x, y };
  }, []);

  const handleImageLoad = () => {
    const img = imgRef.current;
    const wrapper = wrapperRef.current;
    if (img && wrapper) {
      const scaleX = wrapper.clientWidth / img.naturalWidth;
      const scaleY = wrapper.clientHeight / img.naturalHeight;
      const fitScale = Math.min(scaleX, scaleY, 1);
      
      setInitialScale(fitScale);
      setScale(fitScale);
      
      // Calculate max scale based on image size
      const maxScaleValue = Math.max(4, 1 / fitScale);
      setMaxScale(maxScaleValue);
      
      centerImage(fitScale);
      setImageLoaded(true);
    }
  };

  const centerImage = (fitScale) => {
    const img = imgRef.current;
    const wrapper = wrapperRef.current;
    if (img && wrapper) {
      const imgWidth = img.naturalWidth * fitScale;
      const imgHeight = img.naturalHeight * fitScale;
      const x = (wrapper.clientWidth - imgWidth) / 2;
      const y = (wrapper.clientHeight - imgHeight) / 2;
      const newTranslate = { x, y };
      setTranslate(newTranslate);
      lastPosition.current = newTranslate;
    }
  };

  const handleDoubleClick = (e) => {
    e.preventDefault();
    setIsTransitioning(true);
    
    if (scale <= initialScale * 1.1) {
      // Zoom in to 2x at click point
      const rect = wrapperRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      
      const newScale = initialScale * 2;
      const scaleRatio = newScale / scale;
      
      const newTranslate = {
        x: clickX - (clickX - translate.x) * scaleRatio,
        y: clickY - (clickY - translate.y) * scaleRatio
      };
      
      const constrainedTranslate = constrainTranslate(newTranslate, newScale);
      setScale(newScale);
      setTranslate(constrainedTranslate);
      lastPosition.current = constrainedTranslate;
    } else {
      // Zoom out to fit
      setScale(initialScale);
      centerImage(initialScale);
    }
    
    setTimeout(() => setIsTransitioning(false), 300);
  };

  const handleWheel = (e) => {
    e.preventDefault();
    
    const rect = wrapperRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const zoomSpeed = 0.1;
    const delta = e.deltaY > 0 ? -zoomSpeed : zoomSpeed;
    const newScale = Math.min(maxScale, Math.max(initialScale, scale + delta));
    
    if (newScale !== scale) {
      const scaleRatio = newScale / scale;
      const newTranslate = {
        x: mouseX - (mouseX - translate.x) * scaleRatio,
        y: mouseY - (mouseY - translate.y) * scaleRatio
      };
      
      const constrainedTranslate = constrainTranslate(newTranslate, newScale);
      setScale(newScale);
      setTranslate(constrainedTranslate);
      lastPosition.current = constrainedTranslate;
    }
  };

  // Mouse drag support
  const handleMouseDown = (e) => {
    if (e.detail === 2) return; // Ignore if it's a double-click
    isDragging.current = true;
    startPosition.current = { x: e.clientX, y: e.clientY };
    e.preventDefault();
  };

  const handleMouseMove = (e) => {
    if (!isDragging.current) return;
    
    const dx = e.clientX - startPosition.current.x;
    const dy = e.clientY - startPosition.current.y;
    
    const newTranslate = {
      x: lastPosition.current.x + dx,
      y: lastPosition.current.y + dy
    };
    
    const constrainedTranslate = constrainTranslate(newTranslate, scale);
    setTranslate(constrainedTranslate);
  };

  const handleMouseUp = () => {
    if (isDragging.current) {
      lastPosition.current = { ...translate };
      isDragging.current = false;
    }
  };

  // Touch support
  const handleTouchStart = (e) => {
    e.preventDefault();
    
    if (e.touches.length === 1) {
      // Single touch - start dragging
      isDragging.current = true;
      startPosition.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      };
    } else if (e.touches.length === 2) {
      // Two touches - start pinch zoom
      isDragging.current = false;
      const distance = getDistance(e.touches);
      const center = getCenter(e.touches);
      
      setInitialDistance(distance);
      setInitialScale2(scale);
      setInitialTranslate({ ...translate });
    }
  };

  const handleTouchMove = (e) => {
    e.preventDefault();
    
    if (e.touches.length === 1 && isDragging.current) {
      // Single touch - dragging
      const dx = e.touches[0].clientX - startPosition.current.x;
      const dy = e.touches[0].clientY - startPosition.current.y;
      
      const newTranslate = {
        x: lastPosition.current.x + dx,
        y: lastPosition.current.y + dy
      };
      
      const constrainedTranslate = constrainTranslate(newTranslate, scale);
      setTranslate(constrainedTranslate);
    } else if (e.touches.length === 2) {
      // Two touches - pinch zoom
      const distance = getDistance(e.touches);
      const center = getCenter(e.touches);
      
      if (initialDistance > 0) {
        const scaleChange = distance / initialDistance;
        const newScale = Math.min(maxScale, Math.max(initialScale, initialScale2 * scaleChange));
        
        const rect = wrapperRef.current.getBoundingClientRect();
        const centerX = center.x - rect.left;
        const centerY = center.y - rect.top;
        
        const scaleRatio = newScale / initialScale2;
        const newTranslate = {
          x: centerX - (centerX - initialTranslate.x) * scaleRatio,
          y: centerY - (centerY - initialTranslate.y) * scaleRatio
        };
        
        const constrainedTranslate = constrainTranslate(newTranslate, newScale);
        setScale(newScale);
        setTranslate(constrainedTranslate);
      }
    }
  };

  const handleTouchEnd = (e) => {
    if (e.touches.length === 0) {
      // All touches ended
      if (isDragging.current) {
        lastPosition.current = { ...translate };
        isDragging.current = false;
      }
      setInitialDistance(0);
      setInitialScale2(1);
    } else if (e.touches.length === 1) {
      // One touch remaining - switch to drag mode
      isDragging.current = true;
      startPosition.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      };
      lastPosition.current = { ...translate };
      setInitialDistance(0);
    }
  };

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (imgRef.current && wrapperRef.current && imageLoaded) {
        const img = imgRef.current;
        const wrapper = wrapperRef.current;
        const scaleX = wrapper.clientWidth / img.naturalWidth;
        const scaleY = wrapper.clientHeight / img.naturalHeight;
        const fitScale = Math.min(scaleX, scaleY, 1);
        
        setInitialScale(fitScale);
        
        // If we're at fit scale, recenter and rescale
        if (scale <= initialScale * 1.1) {
          setScale(fitScale);
          centerImage(fitScale);
        } else {
          // Maintain current zoom level but constrain position
          const constrainedTranslate = constrainTranslate(translate, scale);
          setTranslate(constrainedTranslate);
          lastPosition.current = constrainedTranslate;
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [imageLoaded, scale, translate, initialScale, constrainTranslate]);

  return (
    <>
      <Helmet>
        <title>Clipping from The Siddipet Times</title>
        <meta property="og:title" content="Clipping from The Siddipet Times" />
        <meta property="og:description" content="Check out this newspaper clipping!" />
        <meta property="og:image" content={imageUrl} />
        <meta property="og:url" content={window.location.href} />
        <meta property="og:type" content="article" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Clipping from The Siddipet Times" />
        <meta name="twitter:description" content="Check out this newspaper clipping!" />
        <meta name="twitter:image" content={imageUrl} />
      </Helmet>

      <div
        ref={wrapperRef}
        onDoubleClick={handleDoubleClick}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          width: '100vw',
          height: '100vh',
          overflow: 'hidden',
          backgroundColor: '#000',
          position: 'relative',
          touchAction: 'none',
          userSelect: 'none',
          cursor: scale > initialScale * 1.1 ? (isDragging.current ? 'grabbing' : 'grab') : 'zoom-in'
        }}
      >
        {imageUrl && (
          <img
            ref={imgRef}
            src={imageUrl}
            onLoad={handleImageLoad}
            alt="Newspaper Clipping"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
              transformOrigin: 'top left',
              transition: isTransitioning ? 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)' : 'none',
              pointerEvents: 'none',
              maxWidth: 'none',
              maxHeight: 'none'
            }}
            draggable={false}
          />
        )}
        
        {/* Zoom indicator */}
        {imageLoaded && scale > initialScale * 1.1 && (
          <div
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              color: 'white',
              padding: '8px 12px',
              borderRadius: '4px',
              fontSize: '14px',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              pointerEvents: 'none',
              zIndex: 1000
            }}
          >
            {Math.round((scale / initialScale) * 100)}%
          </div>
        )}
      </div>
    </>
  );
};

export default ImageMetaViewer;
