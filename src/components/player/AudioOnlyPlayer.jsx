import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Pause, Volume2, VolumeX, RotateCcw, RotateCw, X, Maximize2, Radio, CheckCircle2 } from 'lucide-react';
import { usePlayer } from '../../context/PlayerContext.jsx';
import { formatDuration } from '../../utils/formatters.js';

export default function AudioOnlyPlayer() {
  const {
    activeVideo,
    isPlaying,
    pauseVideo,
    resumeVideo,
    toggleAudioOnly,
    volume,
    setVolumeLevel,
    isMuted,
    toggleMute,
    currentTime,
    setCurrentTime,
    duration,
    setDuration,
    expandToWatch
  } = usePlayer();
  const navigate = useNavigate();
  const audioRef = useRef(null);
  const [audioSrc, setAudioSrc] = useState('');

  useEffect(() => {
    if (!activeVideo?.id) return;
    setAudioSrc(`/api/stream/audio/${activeVideo.id}`);
  }, [activeVideo?.id]);

  useEffect(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.play().catch(() => {});
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, audioSrc]);

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = isMuted ? 0 : volume / 100;
  }, [volume, isMuted]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      if (audioRef.current.duration && !isNaN(audioRef.current.duration)) {
        setDuration(audioRef.current.duration);
      }
    }
  };

  const handleSeek = (e) => {
    const time = Number(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
    setCurrentTime(time);
  };

  const handleSkip = (seconds) => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime + seconds);
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleExpand = () => {
    toggleAudioOnly();
    expandToWatch();
    navigate(`/watch/${activeVideo.id}`);
  };

  if (!activeVideo) return null;

  return (
    <div className="fixed bottom-16 md:bottom-4 left-4 right-4 md:left-auto md:right-4 z-50 md:w-[450px] bg-[#1a1a1a]/95 backdrop-blur-md rounded-2xl border border-emerald-500/40 shadow-2xl p-4 transition-all duration-300 animate-in fade-in slide-in-from-bottom-5">
      <audio
        ref={audioRef}
        src={audioSrc}
        onTimeUpdate={handleTimeUpdate}
        onEnded={pauseVideo}
        onError={() => console.warn('[AudioPlayer] Native stream fallback')}
      />

      {/* Header Bar */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold tracking-wide uppercase">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <Radio className="w-4 h-4" />
          <span>Low-Bandwidth Audio Mode</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleExpand}
            className="p-1 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white"
            title="Switch to Full Video Watch Page"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <button
            onClick={toggleAudioOnly}
            className="p-1 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-red-400"
            title="Exit Audio Mode"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Video / Audio Info & Visualizer */}
      <div className="flex items-center gap-3 mb-3">
        <img
          src={activeVideo.thumbnail || `https://i.ytimg.com/vi/${activeVideo.id}/hqdefault.jpg`}
          alt={activeVideo.title}
          className="w-14 h-14 rounded-xl object-cover bg-zinc-800 shrink-0 border border-zinc-700"
        />
        <div className="flex-1 min-w-0">
          <h4 className="text-xs font-bold text-zinc-100 truncate">{activeVideo.title}</h4>
          <div className="flex items-center gap-1 mt-0.5 text-[11px] text-zinc-400">
            <span className="truncate">{activeVideo.author?.name || 'Creator'}</span>
            <CheckCircle2 className="w-3 h-3 text-zinc-400 shrink-0" />
          </div>

          {/* Animated Equalizer Wave Bars */}
          <div className="flex items-end gap-1 h-4 mt-2">
            {[30, 80, 45, 95, 60, 100, 70, 40, 85, 50, 90, 65].map((height, i) => (
              <div
                key={i}
                style={{
                  height: isPlaying ? `${height}%` : '20%',
                  transition: 'height 0.2s ease'
                }}
                className="w-1 bg-emerald-400 rounded-full animate-pulse"
              />
            ))}
          </div>
        </div>
      </div>

      {/* Progress Scrubber */}
      <div className="space-y-1 mb-3">
        <input
          type="range"
          min={0}
          max={duration || 100}
          value={currentTime}
          onChange={handleSeek}
          className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-emerald-400"
        />
        <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
          <span>{formatDuration(currentTime)}</span>
          <span>{formatDuration(duration)}</span>
        </div>
      </div>

      {/* Playback Controls */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleSkip(-10)}
            className="p-1.5 rounded-full hover:bg-zinc-800 text-zinc-300 hover:text-white"
            title="Seek backward 10s"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={isPlaying ? pauseVideo : resumeVideo}
            className="w-9 h-9 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black flex items-center justify-center shadow-lg transition"
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-black" /> : <Play className="w-4 h-4 fill-black ml-0.5" />}
          </button>
          <button
            onClick={() => handleSkip(10)}
            className="p-1.5 rounded-full hover:bg-zinc-800 text-zinc-300 hover:text-white"
            title="Seek forward 10s"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>

        {/* Volume Control */}
        <div className="flex items-center gap-2">
          <button onClick={toggleMute} className="text-zinc-400 hover:text-white">
            {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <input
            type="range"
            min={0}
            max={100}
            value={isMuted ? 0 : volume}
            onChange={(e) => setVolumeLevel(e.target.value)}
            className="w-20 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-emerald-400"
          />
        </div>
      </div>
    </div>
  );
}
