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

		// Check if YT API is already loaded
		if (window.YT && typeof window.YT.Player === 'function') {
			initializePlayer();
			return () => {
				clearTimeout(timer);
				cleanupPlayer();
			};
		}

		// Load the YouTube API if not already loaded
		const tag = document.createElement('script');
		tag.src = 'https://www.youtube.com/iframe_api';
		const firstScriptTag = document.getElementsByTagName('script')[0];
		firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

		// Initialize the player when API is ready
		window.onYouTubeIframeAPIReady = initializePlayer;

		return () => {
			clearTimeout(timer);
			cleanupPlayer();
			window.onYouTubeIframeAPIReady = null;
		};
	}, [videoId]);

	const initializePlayer = () => {
		if (!iframeRef.current || !videoId) return;
		
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

	const cleanupPlayer = () => {
		if (playerRef.current) {
			playerRef.current.destroy();
			playerRef.current = null;
		}
	};

	if (!link || !videoId) return null;

	// Handle play/pause without reloading the video
	const handlePlayToggle = () => {
		if (playerRef.current) {
			if (isPlaying) {
				playerRef.current.pauseVideo();
			} else {
				playerRef.current.playVideo();
			}
		}
	};

	return (
		<div className="flex flex-col w-full items-center justify-center mx-auto my-4">
			{/* Container with responsive margins */}
			<div className="w-full max-w-4xl px-4 sm:px-6 md:px-8">
				{/* Maintain aspect ratio container */}
				<div
					className={`relative rounded-lg shadow-2xl transition-all duration-700 transform ${
						isLoaded ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
					}`}
					style={{ aspectRatio: '16/9' }}
				>
					{/* Inner container for the YouTube iframe */}
					<div className="absolute inset-0 overflow-hidden rounded-md">
						<div id="youtube-player" ref={iframeRef} className="w-full h-full"></div>
					</div>
				</div>

				{/* Control buttons */}
				<div className={`mt-4 flex justify-center space-x-4 transition-all duration-700 ${
					isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
				}`}>
					<button
						className="px-4 py-2 rounded-md bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium transform transition hover:scale-105 hover:shadow-lg"
						onClick={handlePlayToggle}
					>
						{isPlaying ? 'Pause' : 'Play'}
					</button>
				</div>
			</div>
		</div>
	);
}