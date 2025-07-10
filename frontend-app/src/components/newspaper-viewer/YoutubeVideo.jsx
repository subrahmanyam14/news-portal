import { useState, useEffect, useRef } from 'react';

export default function YoutubeLiveVideo({ link }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [apiReady, setApiReady] = useState(false);
  const iframeRef = useRef(null);
  const playerRef = useRef(null);

  function extractYouTubeVideoID(url) {
    if (!url) return null;
    const regex = /(?:youtube\.com\/(?:watch\?v=|embed\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    // console.log("youlink is : ", url);
    const match = url.match(regex);
    return match ? match[1] : null;
  }

  const videoId = extractYouTubeVideoID(link);

  useEffect(() => {
    if (window.YT && window.YT.Player) {
      setApiReady(true);
      return;
    }

    window.onYouTubeIframeAPIReady = () => {
      setApiReady(true);
    };

    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

    return () => {
      window.onYouTubeIframeAPIReady = null;
    };
  }, []);

  useEffect(() => {
    if (!videoId || !apiReady) return;

    const timer = setTimeout(() => {
      if (iframeRef.current) {
        playerRef.current = new window.YT.Player(iframeRef.current, {
          videoId,
          playerVars: {
            autoplay: 1,
            controls: 1,
            rel: 0,
            showinfo: 0,
            modestbranding: 1,
            enablejsapi: 1,
            playsinline: 1,
          },
          events: {
            onReady: (event) => {
              setIsLoaded(true);
              event.target.playVideo();
            },
            onStateChange: (event) => {
              if (event.data === window.YT.PlayerState.ENDED) {
                console.log('Live stream ended or offline.');
              }
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

  return (
    <div className="w-screen relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw]">
      <div
        className={`w-full relative transition-all duration-700 transform ${isLoaded ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}
        style={{ aspectRatio: '16/9' }}
      >
        <div className="absolute inset-0 overflow-hidden">
          <div ref={iframeRef} className="w-full h-full"></div>
        </div>
      </div>
    </div>
  );
}