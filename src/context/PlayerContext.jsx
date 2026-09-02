import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const PlayerContext = createContext(null);

export function PlayerProvider({ children }) {
  const [activeVideo, setActiveVideo] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMiniPlayer, setIsMiniPlayer] = useState(false);
  const [isPip, setIsPip] = useState(false);
  const [isAudioOnly, setIsAudioOnly] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(80);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [theaterMode, setTheaterMode] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [videoQueue, setVideoQueue] = useState([]);
  const [currentQueueIndex, setCurrentQueueIndex] = useState(0);

  const playVideo = useCallback((video, mode = 'watch') => {
    if (!video) return;
    const videoObj = typeof video === 'string' ? { id: video, title: 'YouTube Video' } : video;
    setActiveVideo(videoObj);
    setIsPlaying(true);

    if (mode === 'mini') {
      setIsMiniPlayer(true);
      setIsAudioOnly(false);
    } else if (mode === 'audio') {
      setIsAudioOnly(true);
      setIsMiniPlayer(false);
    } else {
      setIsMiniPlayer(false);
    }
  }, []);

  const pauseVideo = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const resumeVideo = useCallback(() => {
    if (activeVideo) {
      setIsPlaying(true);
    }
  }, [activeVideo]);

  const closeMiniPlayer = useCallback(() => {
    setIsPlaying(false);
    setIsMiniPlayer(false);
    setIsPip(false);
    setIsAudioOnly(false);
    setActiveVideo(null);
  }, []);

  const expandToWatch = useCallback(() => {
    setIsMiniPlayer(false);
    setIsPip(false);
  }, []);

  const togglePip = useCallback(() => {
    setIsPip((prev) => !prev);
  }, []);

  const toggleAudioOnly = useCallback(() => {
    setIsAudioOnly((prev) => !prev);
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  const setVolumeLevel = useCallback((vol) => {
    const clamped = Math.max(0, Math.min(100, Number(vol) || 0));
    setVolume(clamped);
    if (clamped > 0) {
      setIsMuted(false);
    }
  }, []);

  const seekTo = useCallback((seconds) => {
    setCurrentTime(Math.max(0, Number(seconds) || 0));
  }, []);

  const toggleTheaterMode = useCallback(() => {
    setTheaterMode((prev) => !prev);
  }, []);

  const setPlaybackSpeed = useCallback((rate) => {
    const valid = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
    if (valid.includes(rate)) {
      setPlaybackRate(rate);
    } else {
      setPlaybackRate(1);
    }
  }, []);

  // Queue Management
  const playQueue = useCallback((queue, startIndex = 0) => {
    if (!Array.isArray(queue) || queue.length === 0) return;
    setVideoQueue(queue);
    const validIdx = Math.max(0, Math.min(queue.length - 1, startIndex));
    setCurrentQueueIndex(validIdx);
    playVideo(queue[validIdx], 'watch');
  }, [playVideo]);

  const playNext = useCallback(() => {
    if (videoQueue.length === 0) return;
    const nextIdx = currentQueueIndex + 1;
    if (nextIdx < videoQueue.length) {
      setCurrentQueueIndex(nextIdx);
      playVideo(videoQueue[nextIdx], 'watch');
    }
  }, [videoQueue, currentQueueIndex, playVideo]);

  const playPrevious = useCallback(() => {
    if (videoQueue.length === 0) return;
    const prevIdx = currentQueueIndex - 1;
    if (prevIdx >= 0) {
      setCurrentQueueIndex(prevIdx);
      playVideo(videoQueue[prevIdx], 'watch');
    }
  }, [videoQueue, currentQueueIndex, playVideo]);

  const value = {
    activeVideo,
    isPlaying,
    isMiniPlayer,
    isPip,
    isAudioOnly,
    isMuted,
    volume,
    currentTime,
    duration,
    theaterMode,
    playbackRate,
    videoQueue,
    currentQueueIndex,
    playVideo,
    pauseVideo,
    resumeVideo,
    closeMiniPlayer,
    expandToWatch,
    togglePip,
    toggleAudioOnly,
    toggleMute,
    setVolumeLevel,
    seekTo,
    toggleTheaterMode,
    setPlaybackRate: setPlaybackSpeed,
    setPlaybackSpeed,
    playQueue,
    playNext,
    playPrevious,
    setIsMiniPlayer,
    setCurrentTime,
    setDuration,
    setActiveVideo
  };

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return ctx;
}

export default PlayerContext;
