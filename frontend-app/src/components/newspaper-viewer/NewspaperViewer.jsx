import { useState, useEffect, useRef } from "react";
import { jsPDF } from "jspdf";
import axios from "axios";
import HeadlinesMarquee from "./HeadlinesMarquee";
import DatePicker from "./DatePicker";
import PageSelector from "./PageSelector";
import ClipButton from "./ClipButton";
import DownloadButton from "./DownloadButton";
import ImageViewer from "./ImageViewer";
import Pagination from "./Pagination";
import ThumbnailStrip from "./ThumbnailStrip";
import ZoomModal from "./ZoomModal";
import YoutubeVideo from "./YoutubeVideo";

// Sample data to use as fallback
const SAMPLE_DATA = {
  headlines: [
    {
      "name": "Latest Updates",
      "path": "/latest",
      "_id": "680fc6be9a73cb9c85003354"
    },
    {
      "name": "Featured",
      "path": "/featured",
      "_id": "680fc6be9a73cb9c85003355"
    }
  ],
  navigationLinks: [
    {
      "name": "Security",
      "path": "/security",
      "_id": "67f240c2cf2918abb88da5ff"
    },
    {
      "name": "About Us",
      "path": "/about",
      "_id": "67fa0d028c4eef948264a768"
    }
  ],
  newspaper: {
    "success": true,
    "data": {
      "_id": "681080c6a5d79a4fb0cc78a3",
      "newspaperLinks": [
        "https://res.cloudinary.com/dlkllp35e/image/upload/v1745911974/newspapers/s3ayxf0twvzeldvlpkwe.png",
        "https://res.cloudinary.com/dlkllp35e/image/upload/v1745911978/newspapers/yloxfwac1dntqkyrj7ew.png",
        "https://res.cloudinary.com/dlkllp35e/image/upload/v1745911982/newspapers/eqwbe4kfnkwtmn6rrf1v.png",
        "https://res.cloudinary.com/dlkllp35e/image/upload/v1745911986/newspapers/nypjtkmhrptwyrmbqijn.png",
        "https://res.cloudinary.com/dlkllp35e/image/upload/v1745911991/newspapers/n4284xkc3qnrvjah0xag.png",
        "https://res.cloudinary.com/dlkllp35e/image/upload/v1745911996/newspapers/rfxid9tsefyoiw8kjlhh.png",
        "https://res.cloudinary.com/dlkllp35e/image/upload/v1745912000/newspapers/sh7icjg4pu7z5qvdwypd.png",
        "https://res.cloudinary.com/dlkllp35e/image/upload/v1745912005/newspapers/rqsybsmvxwfh7o1l00vf.png"
      ],
      "totalpages": 8,
      "publicationDate": "2025-04-29T06:46:55.856Z",
      "originalFilename": "flexbox.pdf",
      "isPublished": true,
      "youtubeLink": "https://youtu.be/d0Anl3tIKaA?si=Ai64A6dhxOMbJe5V",
      "createdAt": "2025-04-29T07:33:26.211Z",
      "updatedAt": "2025-04-29T07:33:26.211Z",
      "__v": 0
    }
  }
};

export default function NewspaperViewer() {
	const [images, setImages] = useState([]);
	const [activeImage, setActiveImage] = useState(null);
	const [isZoomed, setIsZoomed] = useState(false);
	const [downloading, setDownloading] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);
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
	const [headlines, setHeadlines] = useState([]);
	const [headlinesLoading, setHeadlinesLoading] = useState(false);
	const [availableDates, setAvailableDates] = useState([]);
	const clipContainerRef = useRef(null);
	const [youtubeLink, setYoutubeLink] = useState(null);

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
					`${process.env.REACT_APP_BACKEND_URL}/newspaper/dates?month=${currentMonthYear.month
						.toString()
						.padStart(2, '0')}&year=${currentMonthYear.year}`
				);
				const filteredDates = response.data.data.filter(dateObj =>
					!isFutureDate(dateObj.date)
				);
				setAvailableDates(filteredDates);
			} catch (err) {
				console.error("Error fetching available dates:", err);
				// If fetching fails, use today's date as available
				setAvailableDates([{ date: todayDateStr }]);
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
				
				// Check if response has valid data
				if (response.data && response.data.data && response.data.data.newspaperLinks) {
					const links = response.data.data.newspaperLinks.map((src, index) => ({
						id: index + 1,
						src,
						date: selectedDate
					}));
					setYoutubeLink(response.data.data.youtubeLink || null);				
					setImages(links);
					setActiveImage(links[0] || null);
				} else {
					throw new Error("Invalid data format received from server");
				}
			} catch (err) {
				console.error("Error fetching newspaper:", err);
				
				// Show sample data with a warning message
				const sampleLinks = SAMPLE_DATA.newspaper.data.newspaperLinks.map((src, index) => ({
					id: index + 1,
					src,
					date: selectedDate
				}));
				setYoutubeLink(SAMPLE_DATA.newspaper.data.youtubeLink || null);
				setImages(sampleLinks);
				setActiveImage(sampleLinks[0] || null);
				setError("Server connection issue. Showing sample data instead.");
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
				if (response.data) {
					setHeadlines(response.data);
				} else {
					throw new Error("Invalid headline data");
				}
			} catch (err) {
				console.error('Failed to fetch headlines:', err);
				// If fetching fails, use sample headlines
				setHeadlines(SAMPLE_DATA.headlines);
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
		const pageWidth = doc.internal.pageSize.getWidth();
		const pageHeight = doc.internal.pageSize.getHeight();

		try {
			for (let index = 0; index < images.length; index++) {
				const img = images[index];
				const image = new Image();
				image.src = img.src;

				await new Promise((resolve) => {
					image.onload = () => {
						if (index !== 0) doc.addPage();

						const imgWidth = image.width;
						const imgHeight = image.height;
						const ratio = Math.min(pageWidth / imgWidth, pageHeight / imgHeight);
						const scaledWidth = imgWidth * ratio;
						const scaledHeight = imgHeight * ratio;
						const x = (pageWidth - scaledWidth) / 2;
						const y = (pageHeight - scaledHeight) / 2;

						doc.addImage(image, "JPEG", x, y, scaledWidth, scaledHeight);
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
		const nextImg = images[(activeImage.id % images.length)];

		setNoTransition(false);
		setFlipDirection('left');
		setNextImageToShow(nextImg);
		setIsFlipping(true);

		setTimeout(() => {
			setNoTransition(true);
			setIsFlipping(false);
			setActiveImage(nextImg);
			setTimeout(() => setNoTransition(false), 50);
		}, 600);
	};

	const prevImage = () => {
		if (!activeImage || !images.length || isFlipping) return;
		const prevImg = images[(activeImage.id - 2 + images.length) % images.length];

		setNoTransition(false);
		setFlipDirection('right');
		setNextImageToShow(prevImg);
		setIsFlipping(true);

		setTimeout(() => {
			setNoTransition(true);
			setIsFlipping(false);
			setActiveImage(prevImg);
			setTimeout(() => setNoTransition(false), 50);
		}, 600);
	};

	const goToPage = (pageNum) => {
		if (pageNum >= 1 && pageNum <= images.length && !isFlipping) {
			const targetImage = images[pageNum - 1];

			if (!activeImage || activeImage.id === pageNum) {
				setActiveImage(targetImage);
				return;
			}

			setNoTransition(false);
			const direction = pageNum > activeImage.id ? 'left' : 'right';
			setFlipDirection(direction);
			setNextImageToShow(targetImage);
			setIsFlipping(true);

			setTimeout(() => {
				setNoTransition(true);
				setIsFlipping(false);
				setActiveImage(targetImage);
				setTimeout(() => setNoTransition(false), 50);
			}, 600);
		}
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

	const toggleClippingMode = () => {
		if (!activeImage) return;

		if (!isClipping) {
			setIsClipping(true);
		} else {
			setIsClipping(false);
		}
	};

	const handleResizeStart = (e, direction) => {
		e.preventDefault();
		e.stopPropagation();
		setResizingClipBox(true);
		setResizeDirection(direction);
		setClipBoxDragStart({ x: e.clientX, y: e.clientY });
	};

	const handleMoveStart = (e) => {
		e.preventDefault();
		e.stopPropagation();
		setMovingClipBox(true);
		setClipBoxDragStart({ x: e.clientX, y: e.clientY });
	};

	const handleClipBoxMove = (e) => {
		if (!resizingClipBox && !movingClipBox) return;
		e.preventDefault();

		const dx = e.clientX - clipBoxDragStart.x;
		const dy = e.clientY - clipBoxDragStart.y;

		if (movingClipBox) {
			setClipBox(prev => ({
				...prev,
				x: Math.max(0, prev.x + dx),
				y: Math.max(0, prev.y + dy)
			}));
		} else if (resizingClipBox) {
			setClipBox(prev => {
				let newBox = { ...prev };
				const MIN_WIDTH = 50;
				const MIN_HEIGHT = 50;

				switch (resizeDirection) {
					case 'e':
						newBox.width = Math.max(MIN_WIDTH, prev.width + dx);
						break;
					case 'w':
						const newWidthW = Math.max(MIN_WIDTH, prev.width - dx);
						newBox.x = prev.x + (prev.width - newWidthW);
						newBox.width = newWidthW;
						break;
					case 's':
						newBox.height = Math.max(MIN_HEIGHT, prev.height + dy);
						break;
					case 'n':
						const newHeightN = Math.max(MIN_HEIGHT, prev.height - dy);
						newBox.y = prev.y + (prev.height - newHeightN);
						newBox.height = newHeightN;
						break;
					case 'se':
						newBox.width = Math.max(MIN_WIDTH, prev.width + dx);
						newBox.height = Math.max(MIN_HEIGHT, prev.height + dy);
						break;
					case 'sw':
						const newWidthSW = Math.max(MIN_WIDTH, prev.width - dx);
						newBox.x = prev.x + (prev.width - newWidthSW);
						newBox.width = newWidthSW;
						newBox.height = Math.max(MIN_HEIGHT, prev.height + dy);
						break;
					case 'ne':
						newBox.width = Math.max(MIN_WIDTH, prev.width + dx);
						const newHeightNE = Math.max(MIN_HEIGHT, prev.height - dy);
						newBox.y = prev.y + (prev.height - newHeightNE);
						newBox.height = newHeightNE;
						break;
					case 'nw':
						const newWidthNW = Math.max(MIN_WIDTH, prev.width - dx);
						newBox.x = prev.x + (prev.width - newWidthNW);
						newBox.width = newWidthNW;
						const newHeightNW = Math.max(MIN_HEIGHT, prev.height - dy);
						newBox.y = prev.y + (prev.height - newHeightNW);
						newBox.height = newHeightNW;
						break;
					default:
						break;
				}

				return newBox;
			});
		}

		setClipBoxDragStart({ x: e.clientX, y: e.clientY });
	};

	const handleClipBoxRelease = () => {
		setResizingClipBox(false);
		setMovingClipBox(false);
	};

	const uploadImage = async (blob) => {
		try {
			const formData = new FormData();
			formData.append('image', blob, `newspaper-clip-${selectedDate}.jpg`);
			
			try {
				const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/newspaper/upload`, {
					method: 'POST',
					body: formData
				});
				
				if (!response.ok) throw new Error(`Upload failed with status: ${response.status}`);
				const data = await response.json();
				return data.url;
			} catch (uploadError) {
				console.error('Error uploading image, using local URL instead:', uploadError);
				// Return a local blob URL if server upload fails
				return URL.createObjectURL(blob);
			}
		} catch (error) {
			console.error('Error processing image for upload:', error);
			throw error;
		}
	};

	const handleClippedImage = async (action) => {
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
			const displayedWidth = containerRect.width;
			const displayedHeight = containerRect.height;

			// Calculate scale factors (use the minimum to maintain aspect ratio)
			const scaleX = imgWidth / displayedWidth;
			const scaleY = imgHeight / displayedHeight;

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
				actualX, actualY, actualWidth, actualHeight, // source rectangle
				0, 0, actualWidth, actualHeight              // destination rectangle
			);

			// Get the blob from the canvas
			const blob = await new Promise(resolve => {
				canvas.toBlob(resolve, 'image/jpeg', 0.9);
			});

			if (action === 'download') {
				// Handle download
				const url = URL.createObjectURL(blob);
				const link = document.createElement('a');
				link.href = url;
				link.download = `newspaper-clip-${selectedDate}.jpg`;
				document.body.appendChild(link);
				link.click();
				document.body.removeChild(link);
				URL.revokeObjectURL(url);
			}
			else if (action === 'facebook' || action === 'whatsapp') {
				// For sharing, upload the image first to get a public URL
				try {
					const publicImageUrl = await uploadImage(blob);

					// Then open the appropriate sharing link
					if (action === 'facebook') {
						window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(publicImageUrl)}`, '_blank');
					} else if (action === 'whatsapp') {
						window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent('Check out this newspaper clipping! ' + publicImageUrl)}`, '_blank');
					}
				} catch (shareError) {
					console.error('Error sharing image:', shareError);
					alert('Unable to share image. Please try downloading instead.');
				}
			}
		} catch (err) {
			console.error('Error processing image:', err);
			alert('An error occurred while processing the image.');
		} finally {
			setClipImageLoading(false);
		}
	};

	const downloadClippedImage = () => handleClippedImage('download');
	const shareToFacebook = () => handleClippedImage('facebook');
	const shareToWhatsApp = () => handleClippedImage('whatsapp');

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
		<div className="flex flex-col mt-4">
			{/* Headlines Marquee */}
			<HeadlinesMarquee headlines={headlines} loading={headlinesLoading} />

			{/* Navbar */}
			<nav className="bg-gray-800 text-white p-4 flex justify-between items-center">
				<DatePicker
					selectedDate={selectedDate}
					availableDates={availableDates}
					todayDateStr={todayDateStr}
					onDateChange={setSelectedDate}
					isFutureDate={isFutureDate}
					formatDate={formatDate}
					currentMonthYear={currentMonthYear}
					changeMonthYear={changeMonthYear}
				/>

				<PageSelector
					activeImage={activeImage}
					images={images}
					onPageChange={goToPage}
					loading={loading}
					isFlipping={isFlipping}
				/>

				<div className="flex gap-2">
					<ClipButton
						isClipping={isClipping}
						onToggleClipping={toggleClippingMode}
						activeImage={activeImage}
						loading={loading}
					/>

					<DownloadButton
						downloading={downloading}
						onDownload={downloadPDF}
						images={images}
					/>
				</div>
			</nav>

			{/* Main Content */}
			<div className="flex flex-1 flex-col gap-6 overflow-hidden justify-center md:px-32">
				{loading ? (
					<div className="flex flex-col items-center justify-center h-full">
						<div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
						<p className="mt-4 text-gray-700">Loading newspaper...</p>
					</div>
				) : error ? (
					<div className="flex flex-col">
						<div className="text-center p-4 text-yellow-600 bg-yellow-100 rounded mb-4">
							{error}
						</div>
						<ImageViewer
							clipContainerRef={clipContainerRef}
							activeImage={activeImage}
							nextImageToShow={nextImageToShow}
							isFlipping={isFlipping}
							flipDirection={flipDirection}
							noTransition={noTransition}
							isClipping={isClipping}
							onPrevImage={prevImage}
							onNextImage={nextImage}
							images={images}
							onZoomClick={() => setIsZoomed(true)}
							clipBox={clipBox}
							onMoveStart={handleMoveStart}
							onResizeStart={handleResizeStart}
							onDownloadClippedImage={downloadClippedImage}
							onShareToFacebook={shareToFacebook}
							onShareToWhatsApp={shareToWhatsApp}
							onToggleClipping={toggleClippingMode}
							clipImageLoading={clipImageLoading}
						/>

						<Pagination
							activeImage={activeImage}
							images={images}
							onPageChange={goToPage}
							isFlipping={isFlipping}
						/>

						<ThumbnailStrip
							images={images}
							activeImage={activeImage}
							onPageChange={goToPage}
							isClipping={isClipping}
						/>
						
						{youtubeLink && <YoutubeVideo link={youtubeLink}/>}
					</div>
				) : !activeImage ? (
					<div className="text-center p-8 text-gray-500">
						No newspaper available for selected date
					</div>
				) : (
					<>
						<ImageViewer
							clipContainerRef={clipContainerRef}
							activeImage={activeImage}
							nextImageToShow={nextImageToShow}
							isFlipping={isFlipping}
							flipDirection={flipDirection}
							noTransition={noTransition}
							isClipping={isClipping}
							onPrevImage={prevImage}
							onNextImage={nextImage}
							images={images}
							onZoomClick={() => setIsZoomed(true)}
							clipBox={clipBox}
							onMoveStart={handleMoveStart}
							onResizeStart={handleResizeStart}
							onDownloadClippedImage={downloadClippedImage}
							onShareToFacebook={shareToFacebook}
							onShareToWhatsApp={shareToWhatsApp}
							onToggleClipping={toggleClippingMode}
							clipImageLoading={clipImageLoading}
						/>

						<Pagination
							activeImage={activeImage}
							images={images}
							onPageChange={goToPage}
							isFlipping={isFlipping}
						/>

						<ThumbnailStrip
							images={images}
							activeImage={activeImage}
							onPageChange={goToPage}
							isClipping={isClipping}
						/>
						
						{youtubeLink && <YoutubeVideo link={youtubeLink}/>}
					</>
				)}
			</div>

			{isZoomed && activeImage && (
				<ZoomModal
					activeImage={activeImage}
					onClose={() => setIsZoomed(false)}
				/>
			)}
		</div>
	);
}