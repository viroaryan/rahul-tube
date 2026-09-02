import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Pause, X, Maximize2, Move, Volume2, VolumeX } from 'lucide-react';
import { usePlayer } from '../../context/PlayerContext.jsx';

export default function PipWindow() {
  const {
    activeVideo,
    isPlaying,
    isPip,
    togglePip,
    pauseVideo,
    resumeVideo,
    isMuted,
    toggleMute,
    expandToWatch
  } = usePlayer();
  const navigate = useNavigate();

  const [position, setPosition] = useState({ x: 24, y: 80 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });

  if (!isPip || !activeVideo) return null;

  const handleMouseDown = (e) => {
    isDragging.current = true;
    dragStart.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };

    const handleMouseMove = (moveEvent) => {
      if (!isDragging.current) return;
      const newX = Math.max(10, Math.min(window.innerWidth - 360, moveEvent.clientX - dragStart.current.x));
      const newY = Math.max(60, Math.min(window.innerHeight - 240, moveEvent.clientY - dragStart.current.y));
      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleExpand = () => {
    togglePip();
    expandToWatch();
    navigate(`/watch/${activeVideo.id}`);
  };

  return (
    <div
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
      className="fixed z-50 w-80 sm:w-96 bg-[#161616] rounded-2xl border border-red-500/30 shadow-2xl overflow-hidden cursor-default select-none"
    >
      {/* Draggable Title Bar */}
      <div
        onMouseDown={handleMouseDown}
        className="px-3 py-2 bg-[#202020] flex items-center justify-between cursor-move border-b border-zinc-800 text-xs text-zinc-300 hover:bg-[#252525] transition"
      >
        <div className="flex items-center gap-2 font-semibold">
          <Move className="w-3.5 h-3.5 text-red-500" />
          <span className="truncate max-w-[200px]">{activeVideo.title}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleExpand}
            className="p-1 hover:bg-zinc-700 rounded text-zinc-300 hover:text-white"
            title="Expand to Full Watch Page"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={togglePip}
            className="p-1 hover:bg-zinc-700 rounded text-zinc-300 hover:text-red-400"
            title="Close Picture-in-Picture"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Video Content */}
      <div className="relative aspect-video bg-black">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${activeVideo.id}?autoplay=1&modestbranding=1&rel=0&iv_load_policy=3`}
          title="Picture-in-Picture Video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          className="w-full h-full border-0 pointer-events-auto"
        />
      </div>

      {/* Quick Controls Footer */}
      <div className="px-3 py-2 bg-[#121212] flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={isPlaying ? pauseVideo : resumeVideo}
            className="p-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={toggleMute}
            className="p-1.5 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white"
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-red-400" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
        </div>
        <span className="text-[10px] text-zinc-400 font-medium tracking-wide uppercase">PiP Window Active</span>
      </div>
    </div>
  );
}
