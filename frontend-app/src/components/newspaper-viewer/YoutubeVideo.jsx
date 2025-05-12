import { useState, useEffect, useRef } from 'react';

export default function YoutubeVideo({ link }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [apiReady, setApiReady] = useState(false);
  const iframeRef = useRef(null);
  const playerRef = useRef(null);

  function extractYouTubeVideoID(url) {
    if (!url) return null;
    const regex = /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  }

  const videoId = extractYouTubeVideoID(link);

  // Load YouTube API script only once
  useEffect(() => {
    // Check if API is already loaded
    if (window.YT && window.YT.Player) {
      setApiReady(true);
      return;
    }

    // Define callback function before loading the script
    window.onYouTubeIframeAPIReady = () => {
      setApiReady(true);
    };

    // Load the YouTube API script
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

    return () => {
      window.onYouTubeIframeAPIReady = null;
    };
  }, []);

  // Initialize player when API is ready and we have a videoId
  useEffect(() => {
    if (!videoId || !apiReady) return;

    // Set a small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      if (iframeRef.current) {
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
            onReady: () => {
              setIsLoaded(true);
            }
          }
        });
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      if (playerRef.current) {
        playerRef.current.destroy();
      }
    };
  }, [videoId, apiReady]);

  // if (!link || !videoId) return null;

  return (
    <div className="flex justify-center max-w-full items-center mx-6 my-6">
      <div
        className={`w-full md:max-w-4xl relative rounded-lg shadow-2xl transition-all duration-700 transform ${isLoaded ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}
        style={{ aspectRatio: '16/9' }}
      >
        {/* YouTube iframe */}
        <div className="absolute inset-0 m-1 overflow-hidden rounded-md">
          <div ref={iframeRef} className="w-full h-full"></div>
        </div>
      </div>
    </div>
  );
}