import { Download } from "lucide-react";

export default function DownloadButton({
	downloading,
	onDownload,
	images
}) {
	return (
		<button
			className="bg-green-500 px-2 md:px-4 py-2 rounded flex items-center relative hover:bg-green-600 transition-colors"
			onClick={onDownload}
			disabled={downloading || !images.length}
		>
			{downloading && (
				<div className="absolute inset-0 flex items-center justify-center bg-green-500 bg-opacity-50">
					<div className="w-5 h-5 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
				</div>
			)}
			<span className={`flex gap-2 ${downloading ? "opacity-0" : "opacity-100"}`}>
				<Download size={20} /> <span className="hidden md:block">PDF</span>
			</span>
		</button>
	);
}