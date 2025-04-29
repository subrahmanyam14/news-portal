import { ChevronLeft, ChevronRight, Download, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import HTMLFlipBook from "react-pageflip";

export default function ImageViewer({
  clipContainerRef,
  activeImage,
  nextImageToShow,
  isFlipping,
  flipDirection,
  noTransition,
  isClipping,
  onPrevImage,
  onNextImage,
  images,
  onZoomClick,
  clipBox,
  onMoveStart,
  onResizeStart,
  onDownloadClippedImage,
  onShareToFacebook,
  onShareToWhatsApp,
  onToggleClipping,
  clipImageLoading
}) {
  const bookRef = useRef(null);
  const clipImageRef = useRef(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [resizing, setResizing] = useState(null);
  const [startTouch, setStartTouch] = useState(null);

  useEffect(() => {
    if (activeImage) {
      setCurrentPage(activeImage.id - 1);

      // Sync the book's page with activeImage
      if (bookRef.current && !isFlipping) {
        const bookCurrentPage = bookRef.current.pageFlip().getCurrentPageIndex();
        if (bookCurrentPage !== activeImage.id - 1) {
          bookRef.current.pageFlip().turnToPage(activeImage.id - 1);
        }
      }
    }
  }, [activeImage, isFlipping]);

  useEffect(() => {
    const handleMove = (e) => {
      if (!resizing || !startTouch) return;

      let clientX, clientY;
      if (e.touches) {
        e.preventDefault();
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      const deltaX = clientX - startTouch.x;
      const deltaY = clientY - startTouch.y;

      let newBox = { ...startTouch.box };

      switch (resizing) {
        case 'se':
          newBox.width = startTouch.box.width + deltaX;
          newBox.height = startTouch.box.height + deltaY;
          break;
        case 'sw':
          newBox.width = startTouch.box.width - deltaX;
          newBox.height = startTouch.box.height + deltaY;
          newBox.x = startTouch.box.x + deltaX;
          break;
        case 'ne':
          newBox.width = startTouch.box.width + deltaX;
          newBox.height = startTouch.box.height - deltaY;
          newBox.y = startTouch.box.y + deltaY;
          break;
        case 'nw':
          newBox.width = startTouch.box.width - deltaX;
          newBox.height = startTouch.box.height - deltaY;
          newBox.x = startTouch.box.x + deltaX;
          newBox.y = startTouch.box.y + deltaY;
          break;
      }

      newBox.width = Math.max(50, newBox.width);
      newBox.height = Math.max(50, newBox.height);

      clipBox.x = newBox.x;
      clipBox.y = newBox.y;
      clipBox.width = newBox.width;
      clipBox.height = newBox.height;
    };

    const handleEnd = () => {
      setResizing(null);
      setStartTouch(null);
    };

    if (resizing) {
      document.addEventListener('mousemove', handleMove);
      document.addEventListener('mouseup', handleEnd);
      document.addEventListener('touchmove', handleMove, { passive: false });
      document.addEventListener('touchend', handleEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('touchend', handleEnd);
    };
  }, [resizing, startTouch]);

  const handleResizeStart = (e, direction) => {
    e.preventDefault();
    e.stopPropagation();

    let clientX, clientY;
    if (e.touches) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    setStartTouch({ x: clientX, y: clientY, box: { ...clipBox } });
    setResizing(direction);
  };

  const handlePageFlip = (e) => {
    const newPage = e.data;
    if (images[newPage]) {
      if (newPage > currentPage) {
        onNextImage();
      } else if (newPage < currentPage) {
        onPrevImage();
      }
    }
  };

  const renderPages = () => {
    return images.map((image, index) => (
      <div key={index} className="page">
        <div className="page-content">
          <img
            src={image.src}
            alt={`Page ${image.id}`}
            className="shadow-lg border-2 border-gray-400 cursor-zoom-in max-h-[70vh] w-auto object-contain"
            onClick={onZoomClick}
          />
        </div>
      </div>
    ));
  };

  return (
    <div className="w-full flex flex-col justify-center items-center relative p-0 md:p-4">
      <button
        className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-gray-700 p-2 rounded-full text-white hover:bg-gray-600 disabled:opacity-50 z-10 transition-all duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:hover:bg-gray-400"
        onClick={() => {
          if (bookRef.current) {
            bookRef.current.pageFlip().flipPrev();
          }
          onPrevImage();
        }}
        disabled={images.length <= 1 || isFlipping || activeImage?.id === 1 || isClipping}
        aria-label="Previous page"
      >
        <ChevronLeft size={24} />
      </button>

      <div className="w-full flex justify-center items-center" style={{ height: '80vh' }}>
        {isClipping ? (
          <div className="relative" ref={clipContainerRef}>
            <img
              src={activeImage.src}
              alt={`Page ${activeImage.id}`}
              className="shadow-lg border-2 border-gray-400 max-h-[70vh] object-contain"
              ref={clipImageRef}
            />

            <div className="absolute inset-0 bg-black bg-opacity-70">
              <div
                className="absolute cursor-move touch-none"
                style={{
                  left: `${clipBox.x}px`,
                  top: `${clipBox.y}px`,
                  width: `${clipBox.width}px`,
                  height: `${clipBox.height}px`,
                }}
                onMouseDown={onMoveStart}
                onTouchStart={(e) => {
                  e.preventDefault();
                  const touch = e.touches[0];
                  const mouseEvent = {
                    type: 'touchstart',
                    clientX: touch.clientX,
                    clientY: touch.clientY,
                    preventDefault: () => { },
                    stopPropagation: () => { }
                  };
                  onMoveStart(mouseEvent);
                }}
              >
                <div className="absolute inset-0 bg-transparent border-2 border-white rounded-md border-dashed"></div>

                {/* Resize handles */}
                <div
                  className="absolute w-8 h-8 cursor-nwse-resize right-0 bottom-0 transform translate-x-1/2 translate-y-1/2 touch-none"
                  onMouseDown={(e) => handleResizeStart(e, 'se')}
                  onTouchStart={(e) => handleResizeStart(e, 'se')}
                >
                  <div className="absolute inset-0 bg-white rounded-full w-4 h-4 transform -translate-x-1/2 -translate-y-1/2"></div>
                </div>

                <div
                  className="absolute w-8 h-8 cursor-nesw-resize left-0 bottom-0 transform translate-x-1/2 translate-y-1/2 touch-none"
                  onMouseDown={(e) => handleResizeStart(e, 'sw')}
                  onTouchStart={(e) => handleResizeStart(e, 'sw')}
                >
                  <div className="absolute inset-0 bg-white rounded-full w-4 h-4 transform -translate-x-1/2 -translate-y-1/2"></div>
                </div>

                <div
                  className="absolute w-8 h-8 cursor-nesw-resize right-0 top-0 transform translate-x-1/2 translate-y-1/2 touch-none"
                  onMouseDown={(e) => handleResizeStart(e, 'ne')}
                  onTouchStart={(e) => handleResizeStart(e, 'ne')}
                >
                  <div className="absolute inset-0 bg-white rounded-full w-4 h-4 transform -translate-x-1/2 -translate-y-1/2"></div>
                </div>

                <div
                  className="absolute w-8 h-8 cursor-nwse-resize left-0 top-0 transform translate-x-1/2 translate-y-1/2 touch-none"
                  onMouseDown={(e) => handleResizeStart(e, 'nw')}
                  onTouchStart={(e) => handleResizeStart(e, 'nw')}
                >
                  <div className="absolute inset-0 bg-white rounded-full w-4 h-4 transform -translate-x-1/2 -translate-y-1/2"></div>
                </div>

                <div className="absolute -top-6 right-0 flex gap-2">
                  <button
                    className="bg-green-500 text-white px-2 py-1 rounded-md flex items-center gap-2 hover:bg-green-600 transition-colors shadow-md"
                    onClick={onDownloadClippedImage}
                    disabled={clipImageLoading}
                    aria-label="Download image"
                  >
                    {clipImageLoading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Download size={16} />
                    )}
                  </button>

                  <button
                    className="bg-blue-600 text-white px-2 py-1 rounded-md flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-md"
                    onClick={onShareToFacebook}
                    disabled={clipImageLoading}
                    aria-label="Share to Facebook"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                  </button>

                  <button
                    className="bg-green-600 text-white px-2 py-1 rounded-md flex items-center gap-2 hover:bg-green-700 transition-colors shadow-md"
                    onClick={onShareToWhatsApp}
                    disabled={clipImageLoading}
                    aria-label="Share to WhatsApp"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                  </button>

                  <button
                    className="bg-red-500 text-white px-2 py-1 rounded-md flex items-center gap-2 hover:bg-red-600 transition-colors shadow-md"
                    onClick={onToggleClipping}
                    aria-label="Close clipping mode"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-white text-sm bg-black bg-opacity-50 px-2 py-1 rounded">
                  {Math.round(clipBox.width)} x {Math.round(clipBox.height)} px
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flip-book-container">
            <HTMLFlipBook
              ref={bookRef}
              width={500}
              height={700}
              size="stretch"
              minWidth={300}
              maxWidth={1000}
              minHeight={400}
              maxHeight={1000}
              drawShadow={true}
              flippingTime={1000}
              usePortrait={true}
              startPage={activeImage ? activeImage.id - 1 : 0}
              showCover={false}
              mobileScrollSupport={true}
              onFlip={handlePageFlip}
              className="newspaper-book"
              style={{ backgroundColor: "transparent" }}
              startZIndex={10}
              autoSize={true}
              maxShadowOpacity={0.5}
              showPageCorners={true}
              disableTouch={true}
              disableFlipByClick={false}
            >
              {renderPages()}
            </HTMLFlipBook>
          </div>
        )}
      </div>

      <button
        className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-gray-700 p-2 rounded-full text-white hover:bg-gray-600 disabled:opacity-50 z-10 transition-all duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:hover:bg-gray-400"
        onClick={() => {
          if (bookRef.current) {
            bookRef.current.pageFlip().flipNext();
          }
          onNextImage();
        }}
        disabled={images.length <= 1 || isFlipping || activeImage?.id === images.length || isClipping}
        aria-label="Next page"
      >
        <ChevronRight size={24} />
      </button>

      <style jsx global>{`
        .newspaper-book {
          background-color: transparent !important;
        }
        
        .page {
          background-color: white;
          box-shadow: 0 0 20px rgba(0, 0, 0, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 10px;
        }
        
        .page-content {
          width: 100%;
          height: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        
        .stf__parent {
          background: transparent !important;
        }
        
        .stf__wrapper {
          box-shadow: none !important;
        }
        
        .stf__block {
          box-shadow: 0 0 20px rgba(0, 0, 0, 0.2);
          background: white;
        }
        
        @media (max-width: 768px) {
          .newspaper-book {
            width: 100% !important;
            height: 100% !important;
          }
          
          .page {
            padding: 0 !important;
            width: 100% !important;
            height: 100% !important;
          }
          
          .page-content {
            padding: 0 !important;
          }
          
          .page-content img {
            max-width: 100%;
            width: auto;
            height: auto;
            object-fit: contain;
          }
          
          .flip-book-container {
            width: 100% !important;
            padding: 0 !important;
          }
          
          .page-content img {
            touch-action: none !important;
          }
          
          .absolute.cursor-move,
          [class*="cursor-n"],
          [class*="cursor-s"],
          [class*="cursor-e"],
          [class*="cursor-w"] {
            touch-action: none !important;
          }
          
          .stf__block {
            touch-action: pan-y !important;
          }
        }
      `}</style>
    </div>
  );
}