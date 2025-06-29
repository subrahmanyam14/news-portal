const HeadlineEditModal = ({ isOpen, headline, setHeadline, onClose, onSubmit }) => {

	if (!isOpen || !headline) return null;

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
			<div className="bg-white rounded-lg p-6 w-full max-w-md">
				<h3 className="text-xl font-semibold mb-4 text-gray-800">Edit Headline</h3>

				<div className="mb-4">
					<label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
					<input
						type="text"
						value={headline.name}
						onChange={(e) => setHeadline({ ...headline, name: e.target.value })}
						className="w-full border border-gray-300 bg-white text-gray-800 rounded p-2 focus:border-[#403fbb] focus:outline-none"
						placeholder="Headline name"
					/>
				</div>

				<div className="mb-6">
					<label className="block text-sm font-medium text-gray-700 mb-1">Path</label>
					<input
						type="text"
						value={headline.path}
						onChange={(e) => setHeadline({ ...headline, path: e.target.value })}
						className="w-full border border-gray-300 bg-white text-gray-800 rounded p-2 focus:border-[#403fbb] focus:outline-none"
						placeholder="/path"
					/>
				</div>

				<div className="flex justify-end space-x-3">
					<button
						onClick={onClose}
						className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
					>
						Cancel
					</button>
					<button
						onClick={onSubmit}
						className="px-4 py-2 bg-[#403fbb] text-white rounded hover:bg-[#5756c5] transition-colors"
					>
						Update Headline
					</button>
				</div>
			</div>
		</div>
	);
};

export default HeadlineEditModal