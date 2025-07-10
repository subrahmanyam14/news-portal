import { useEffect, useState } from 'react';

export default function Pagination({
	activeImage,
	images,
	onPageChange,
	isFlipping
}) {
	// const [isMobile, setIsMobile] = useState(false);

	// Check if device is mobile
	// useEffect(() => {
	// 	const checkMobile = () => {
	// 		setIsMobile(window.innerWidth < 768); // md breakpoint
	// 	};

	// 	checkMobile();
	// 	window.addEventListener('resize', checkMobile);

	// 	return () => window.removeEventListener('resize', checkMobile);
	// }, []);

	if (!images.length || !activeImage) return null;

	const currentPage = activeImage.id;
	const totalPages = images.length;

	// Calculate pagination based on view mode
	const getPaginationData = () => {
		// if (isMobile) {
		// Mobile: single page view
		return {
			currentPageDisplay: currentPage,
			totalPagesDisplay: totalPages,
			prevPage: Math.max(1, currentPage - 1),
			nextPage: Math.min(totalPages, currentPage + 1),
			isPrevDisabled: currentPage === 1,
			isNextDisabled: currentPage === totalPages
		};
		// } else {
		// 	// Desktop: two-page view
		// 	const currentSpread = Math.ceil(currentPage / 2);
		// 	const totalSpreads = Math.ceil(totalPages / 2);

		// 	return {
		// 		currentPageDisplay: currentSpread,
		// 		totalPagesDisplay: totalSpreads,
		// 		prevPage: Math.max(1, (currentSpread - 1) * 2 - 1),
		// 		nextPage: Math.min(totalPages, currentSpread * 2 + 1),
		// 		isPrevDisabled: currentSpread === 1,
		// 		isNextDisabled: currentSpread === totalSpreads
		// 	};
		// }
	};

	const paginationData = getPaginationData();

	// Generate page numbers for pagination
	const getPageNumbers = () => {
		// if (isMobile) {
		// Mobile: show actual page numbers
		const maxVisible = 7;
		const start = Math.max(1, Math.min(currentPage - Math.floor(maxVisible / 2), totalPages - maxVisible + 1));
		const end = Math.min(totalPages, start + maxVisible - 1);

		return Array.from({ length: end - start + 1 }, (_, i) => ({
			number: start + i,
			isActive: start + i === currentPage,
			onClick: () => onPageChange(start + i)
		}));
		// } else {
		// 	// Desktop: show spread numbers (representing two pages each)
		// 	const totalSpreads = Math.ceil(totalPages / 2);
		// 	const currentSpread = Math.ceil(currentPage / 2);
		// 	const maxVisible = 7;

		// 	const start = Math.max(1, Math.min(currentSpread - Math.floor(maxVisible / 2), totalSpreads - maxVisible + 1));
		// 	const end = Math.min(totalSpreads, start + maxVisible - 1);

		// 	return Array.from({ length: end - start + 1 }, (_, i) => {
		// 		const spreadNum = start + i;
		// 		const firstPageOfSpread = (spreadNum - 1) * 2 + 1;

		// 		return {
		// 			number: spreadNum,
		// 			isActive: spreadNum === currentSpread,
		// 			onClick: () => onPageChange(firstPageOfSpread),
		// 			label: `${firstPageOfSpread}${firstPageOfSpread < totalPages ? `-${Math.min(firstPageOfSpread + 1, totalPages)}` : ''}`
		// 		};
		// 	});
		// }
	};

	const pageNumbers = getPageNumbers();

	return (
		<div className="flex justify-center items-center mt-4 mb-4">
			<div className="flex items-center space-x-1">
				{/* Previous button */}
				<button
					onClick={() => onPageChange(paginationData.prevPage)}
					disabled={paginationData.isPrevDisabled || isFlipping}
					className="flex items-center justify-center w-8 md:w-12 h-8 md:h-12 border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
					aria-label="Previous page"
				>
					«
				</button>

				{/* Page number buttons */}
				{pageNumbers.map((page, index) => (
					<button
						key={index}
						onClick={page.onClick}
						disabled={isFlipping}
						className={`flex items-center justify-center w-8 md:w-12 h-8 md:h-12 border border-gray-300 transition-colors text-xs md:text-sm ${page.isActive
							? "bg-green-500 text-white border-green-500"
							: "hover:bg-gray-100 disabled:cursor-not-allowed"
							} ${isFlipping ? 'opacity-50 cursor-not-allowed' : ''}`}
						// title={isMobile ? `Page ${page.number}` : `Pages ${page.label}`}
						title={`Page ${page.number}`}
					>
						{page.number}
						{/* {isMobile ? page.number : page.label} */}
					</button>
				))}

				{/* Next button */}
				<button
					onClick={() => onPageChange(paginationData.nextPage)}
					disabled={paginationData.isNextDisabled || isFlipping}
					className="flex items-center justify-center w-8 md:w-12 h-8 md:h-12 border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
					aria-label="Next page"
				>
					»
				</button>
			</div>
		</div>
	);
}