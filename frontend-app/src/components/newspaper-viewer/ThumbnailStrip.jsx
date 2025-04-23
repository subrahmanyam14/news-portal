export default function ThumbnailStrip({
	images,
	activeImage,
	onPageChange,
	isClipping
}) {
	if (!images.length || isClipping) return null;

	return (
		<div className="w-full overflow-x-auto p-2 flex gap-2 justify-center">
			{images.map((img) => (
				<img
					key={img.id}
					src={img.src}
					alt={`Page ${img.id}`}
					className={`cursor-pointer border-4 h-32 object-contain ${img.id === activeImage?.id ? "border-blue-500" : "border-gray-300 hover:border-gray-400"
						}`}
					onClick={() => onPageChange(img.id)}
				/>
			))}
		</div>
	);
}