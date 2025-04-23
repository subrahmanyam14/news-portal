import { useState, useRef, useEffect } from "react";
import { ZoomIn, ZoomOut, Maximize, Minimize } from "lucide-react";

export default function ZoomModal({
	activeImage,
	onClose
}) {
	const [zoomLevel, setZoomLevel] = useState(75);
	const [isDragging, setIsDragging] = useState(false);
	const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
	const [position, setPosition] = useState({ x: 0, y: 0 });
	const [viewportDimensions, setViewportDimensions] = useState({ width: 0, height: 0 });
	const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });

	const containerRef = useRef(null);
	const zoomedImageRef = useRef(null);
	const imageRef = useRef(null);

	const calculateMaxZoom = () => {
		if (!imageDimensions.width || !viewportDimensions.width) return 400;
		const widthRatio = (imageDimensions.width * 4) / viewportDimensions.width;
		const heightRatio = (imageDimensions.height * 4) / viewportDimensions.height;
		return Math.min(400, Math.max(100, Math.floor(Math.max(widthRatio, heightRatio) * 100)));
	};

	const zoomToPoint = (e, newZoomLevel) => {
		if (!containerRef.current || !imageRef.current) return;

		const containerRect = containerRef.current.getBoundingClientRect();
		const mouseX = e.clientX - containerRect.left;
		const mouseY = e.clientY - containerRect.top;

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
		const newZoom = Math.min(zoomLevel + 25, calculateMaxZoom());
		zoomToPoint(e, newZoom);
	};

	const zoomOut = (e) => {
		const newZoom = Math.max(zoomLevel - 25, 50);
		if (newZoom === 75) {
			setPosition({ x: 0, y: 0 });
		}
		zoomToPoint(e, newZoom);
	};

	const resetZoom = () => {
		setZoomLevel(75);
		setPosition({ x: 0, y: 0 });
	};

	const calculateConstraints = (zoom = zoomLevel) => {
		if (!containerRef.current || !imageRef.current) return { minX: 0, maxX: 0, minY: 0, maxY: 0 };

		const containerWidth = containerRef.current.clientWidth;
		const containerHeight = containerRef.current.clientHeight;
		const zoomFactor = zoom / 100;

		const scaledWidth = imageDimensions.width * zoomFactor;
		const scaledHeight = imageDimensions.height * zoomFactor;

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
			setImageDimensions({
				width: imageRef.current.naturalWidth,
				height: imageRef.current.naturalHeight
			});
		}
	};

	const handleWheel = (e) => {
		e.preventDefault();
		const delta = e.deltaY < 0 ? 1 : -1;
		const zoomStep = 10;
		const newZoom = Math.min(Math.max(zoomLevel + (delta * zoomStep), 50), calculateMaxZoom());
		if (newZoom !== zoomLevel) {
			zoomToPoint(e, newZoom);
		}
	};

	const handleMouseDown = (e) => {
		if (zoomLevel > 75) {
			setIsDragging(true);
			setDragStart({ x: e.clientX, y: e.clientY });
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
		if (containerRef.current) {
			containerRef.current.style.cursor = zoomLevel > 75 ? 'grab' : 'default';
		}
	};

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
		}
	};

	const handleTouchEnd = () => {
		setIsDragging(false);
	};

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
							onClick={resetZoom}
							title="Reset Zoom"
						>
							{zoomLevel === 75 ? <Maximize size={20} /> : <Minimize size={20} />}
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
	);
}