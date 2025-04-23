export default function PageSelector({
	activeImage,
	images,
	onPageChange,
	loading,
	isFlipping
}) {
	if (!activeImage) return null;

	return (
		<select
			className="bg-gray-700 px-3 py-1 rounded hidden md:block"
			value={activeImage?.id}
			onChange={(e) => onPageChange(Number(e.target.value))}
			disabled={loading || !images.length || isFlipping}
		>
			{images.map((img) => (
				<option key={img.id} value={img.id}>Page - {img.id}</option>
			))}
		</select>
	);
}