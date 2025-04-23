export default function Pagination({
	activeImage,
	images,
	onPageChange,
	isFlipping
}) {
	if (!images.length || !activeImage) return null;

	const currentPage = activeImage.id;
	const totalPages = images.length;

	return (
		<div className="flex justify-center mt-4">
			<div className="flex">
				{/* First button (previous) */}
				<button
					onClick={() => onPageChange(Math.max(1, currentPage - 1))}
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
						onClick={() => onPageChange(pageNum)}
						className={`flex items-center justify-center w-12 h-12 border border-gray-300 ${pageNum === currentPage ? "bg-green-500 text-white" : "hover:bg-gray-100"
							}`}
					>
						{pageNum}
					</button>
				))}

				{/* Last button (next) */}
				<button
					onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
					disabled={currentPage === totalPages}
					className="flex items-center justify-center w-12 h-12 border border-gray-300 hover:bg-gray-100 disabled:opacity-50"
					aria-label="Next page"
				>
					»
				</button>
			</div>
		</div>
	);
}