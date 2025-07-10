import { useEffect, useState } from 'react';

export default function ThumbnailStrip({
	images,
	activeImage,
	onPageChange,
	isClipping
}) {
	// const [isMobile, setIsMobile] = useState(false);

	// Check if device is mobile
	// useEffect(() => {
	// 	const checkMobile = () => {
	// 		setIsMobile(window.innerWidth < 1280); // md breakpoint
	// 	};
		
	// 	checkMobile();
	// 	window.addEventListener('resize', checkMobile);
		
	// 	return () => window.removeEventListener('resize', checkMobile);
	// }, []);

	if (!images.length || isClipping) return null;

	const currentPage = activeImage?.id;

	// Function to check if an image should be highlighted
	const isImageActive = (img) => {
		// if (isMobile) {
			// Mobile: highlight only the current page
			return img.id === currentPage;
		// } else {
		// 	// Desktop: highlight both pages in the current spread
		// 	const currentSpread = Math.ceil(currentPage / 2);
		// 	const imageSpread = Math.ceil(img.id / 2);
		// 	return imageSpread === currentSpread;
		// }
	};

	// Function to get border styling
	const getBorderStyle = (img) => {
		if (isImageActive(img)) {
			return "border-blue-500 shadow-lg";
		}
		return "border-gray-300 hover:border-gray-400";
	};

	// Function to handle thumbnail click
	const handleThumbnailClick = (img) => {
		// if (isMobile) {
			// Mobile: navigate to the specific page
			onPageChange(img.id);
		// } else {
		// 	// Desktop: navigate to the first page of the spread containing this image
		// 	const targetSpread = Math.ceil(img.id / 2);
		// 	const firstPageOfSpread = (targetSpread - 1) * 2 + 1;
		// 	onPageChange(firstPageOfSpread);
		// }
	};

	// Group images for desktop view
	const getDisplayItems = () => {
		// if (isMobile) {
			// Mobile: show individual thumbnails
			return images.map(img => ({
				type: 'single',
				image: img,
				id: img.id,
				isActive: isImageActive(img)
			}));
		// } else {
			// Desktop: group images into spreads
			// const spreads = [];
			// for (let i = 0; i < images.length; i += 2) {
			// 	const leftPage = images[i];
			// 	const rightPage = images[i + 1];
				
			// 	spreads.push({
			// 		type: 'spread',
			// 		leftPage,
			// 		rightPage,
			// 		id: `spread-${Math.ceil(leftPage.id / 2)}`,
			// 		isActive: isImageActive(leftPage)
			// 	});
			// }
			// return spreads;
		// }
	};

	const displayItems = getDisplayItems();

	return (
		<div className="flex justify-center w-full px-4">
			<div className="overflow-x-auto whitespace-nowrap flex gap-2 py-2">
				{displayItems.map((item) => {
					// if (item.type === 'single') {
						// Mobile: single thumbnail
						return (
							<img
								key={item.image.id}
								src={item.image.src}
								alt={`Page ${item.image.id}`}
								className={`inline-block cursor-pointer border-4 h-32 object-contain transition-all duration-200 ${getBorderStyle(item.image)}`}
								onClick={() => handleThumbnailClick(item.image)}
							/>
						);
					// } else {
					// 	// Desktop: spread thumbnail (two pages side by side)
					// 	return (
					// 		<div
					// 			key={item.id}
					// 			className={`inline-flex cursor-pointer border-4 transition-all duration-200 ${item.isActive ? 'border-blue-500 shadow-lg' : 'border-gray-300 hover:border-gray-400'}`}
					// 			onClick={() => handleThumbnailClick(item.leftPage)}
					// 		>
					// 			{/* Left page */}
					// 			<img
					// 				src={item.leftPage.src}
					// 				alt={`Page ${item.leftPage.id}`}
					// 				className="h-32 object-contain border-r border-gray-200"
					// 				style={{ minWidth: '64px' }} // Half minWidth for spread view
					// 			/>
					// 			{/* Right page (if exists) */}
					// 			{item.rightPage && (
					// 				<img
					// 					src={item.rightPage.src}
					// 					alt={`Page ${item.rightPage.id}`}
					// 					className="h-32 object-contain"
					// 					style={{ minWidth: '64px' }} // Half width for spread view
					// 				/>
					// 			)}
					// 		</div>
					// 	);
					// }
				})}
			</div>
		</div>
	);
}