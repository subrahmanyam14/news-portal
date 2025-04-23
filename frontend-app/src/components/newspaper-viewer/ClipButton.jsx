import { Scissors } from "lucide-react";

export default function ClipButton({
	isClipping,
	onToggleClipping,
	activeImage,
	loading
}) {
	return (
		<button
			className={`px-2 md:px-4 py-2 rounded flex items-center relative hover:bg-green-600 transition-colors ${isClipping ? 'bg-green-600' : 'bg-green-500'}`}
			onClick={onToggleClipping}
			disabled={!activeImage || loading}
		>
			<span className="flex gap-2">
				<Scissors size={20} /> <span className="hidden md:block">Clip</span>
			</span>
		</button>
	);
}