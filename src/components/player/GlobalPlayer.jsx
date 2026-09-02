import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { usePlayer } from '../../context/PlayerContext.jsx';
import MiniPlayer from './MiniPlayer.jsx';
import PipWindow from './PipWindow.jsx';
import AudioOnlyPlayer from './AudioOnlyPlayer.jsx';

export default function GlobalPlayer() {
  const { activeVideo, isPlaying, isMiniPlayer, isPip, isAudioOnly, setIsMiniPlayer } = usePlayer();
  const location = useLocation();
  const prevPathRef = useRef(location.pathname);

  const isWatchPage = location.pathname.startsWith('/watch/');

  // When user navigates away from watch page while video is playing, automatically activate Mini-Player
  useEffect(() => {
    const wasWatch = prevPathRef.current.startsWith('/watch/');
    const isNowWatch = location.pathname.startsWith('/watch/');

    if (wasWatch && !isNowWatch && activeVideo && isPlaying) {
      setIsMiniPlayer(true);
    } else if (isNowWatch) {
      setIsMiniPlayer(false);
    }

    prevPathRef.current = location.pathname;
  }, [location.pathname, activeVideo, isPlaying, setIsMiniPlayer]);

  if (!activeVideo) return null;

  return (
    <>
      {/* 1. Audio-Only floating bar */}
      {isAudioOnly && <AudioOnlyPlayer />}

      {/* 2. Floating Draggable Picture-in-Picture window */}
      {isPip && !isAudioOnly && <PipWindow />}

      {/* 3. Floating Mini-Player when navigating other pages */}
      {!isWatchPage && !isAudioOnly && !isPip && (isMiniPlayer || isPlaying) && <MiniPlayer />}
    </>
  );
}
