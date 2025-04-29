import { useState, useEffect, useRef } from 'react';

export default function YoutubeVideo({ link }) {
	const [isLoaded, setIsLoaded] = useState(false);
	const [isPlaying, setIsPlaying] = useState(false);
	const iframeRef = useRef(null);
	const playerRef = useRef(null);

	function extractYouTubeVideoID(url) {
		if (!url) return null;
		const regex = /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
		const match = url.match(regex);
		return match ? match[1] : null;
	}

	const videoId = extractYouTubeVideoID(link);

	useEffect(() => {
		if (!videoId) return;

		const timer = setTimeout(() => {
			setIsLoaded(true);
		}, 500);

		const tag = document.createElement('script');
		tag.src = 'https://www.youtube.com/iframe_api';
		const firstScriptTag = document.getElementsByTagName('script')[0];
		firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

		window.onYouTubeIframeAPIReady = () => {
			playerRef.current = new window.YT.Player(iframeRef.current, {
				videoId,
				playerVars: {
					autoplay: 0,
					controls: 1,
					rel: 0,
					showinfo: 0,
					modestbranding: 1,
					enablejsapi: 1
				},
				events: {
					onStateChange: (event) => {
						setIsPlaying(event.data === window.YT.PlayerState.PLAYING);
					}
				}
			});
		};

		return () => {
			clearTimeout(timer);
			if (playerRef.current) {
				playerRef.current.destroy();
			}
			window.onYouTubeIframeAPIReady = null;
		};
	}, [videoId]);

	if (!link || !videoId) return null;

	// Handle play/pause without reloading the video
	const handlePlayToggle = () => {
		if (playerRef.current) {
			if (isPlaying) {
				playerRef.current.pauseVideo();
			} else {
				playerRef.current.playVideo();
			}
			setIsPlaying(!isPlaying);
		}
	};

	return (
		<div className="flex flex-col max-w-full items-center justify-center  md:max-w-4xl">
			<div
				className={`w-full relative rounded-lg shadow-2xl transition-all duration-700 transform ${isLoaded ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
					}`}
				style={{ aspectRatio: '16/9' }}
			>
				{/* YouTube iframe */}
				<div className="absolute inset-0 m-1 overflow-hidden rounded-md">
					<div id="youtube-player" ref={iframeRef} className="w-full h-full"></div>
				</div>
			</div>

			{/* Optional controls underneath */}
			<div className={`mt-4 flex space-x-4 transition-all duration-700 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
				}`}>
				<button
					className="px-4 py-2 rounded-md bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium transform transition hover:scale-105 hover:shadow-lg"
					onClick={handlePlayToggle}
				>
					{isPlaying ? 'Pause' : 'Play'}
				</button>
			</div>
		</div>
	);
}