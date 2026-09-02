import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Pause, X, Maximize2, Headphones, CheckCircle2 } from 'lucide-react';
import { usePlayer } from '../../context/PlayerContext.jsx';

export default function MiniPlayer() {
  const {
    activeVideo,
    isPlaying,
    pauseVideo,
    resumeVideo,
    closeMiniPlayer,
    expandToWatch,
    toggleAudioOnly
  } = usePlayer();
  const navigate = useNavigate();

  if (!activeVideo) return null;

  const handleExpand = () => {
    expandToWatch();
    navigate(`/watch/${activeVideo.id}`);
  };

  return (
    <div className="fixed bottom-16 md:bottom-4 right-4 z-50 w-80 sm:w-96 bg-[#181818]/95 backdrop-blur-md rounded-2xl border border-[#272727] shadow-2xl overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-bottom-5">
      {/* Video Viewport */}
      <div className="relative aspect-video bg-black group">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${activeVideo.id}?autoplay=1&modestbranding=1&rel=0&iv_load_policy=3&controls=0`}
          title={activeVideo.title || 'Mini Player'}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          className="w-full h-full border-0 pointer-events-none"
        />

        {/* Floating Overlays */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
          <button
            onClick={isPlaying ? pauseVideo : resumeVideo}
            className="w-10 h-10 rounded-full bg-white/90 hover:bg-white text-black flex items-center justify-center shadow-lg transition"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="w-5 h-5 fill-black" /> : <Play className="w-5 h-5 fill-black ml-0.5" />}
          </button>
          <button
            onClick={handleExpand}
            className="w-10 h-10 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center shadow-lg transition"
            title="Expand to Watch Page"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>

        {/* Premium Badge */}
        <div className="absolute top-2 left-2 bg-red-600/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider backdrop-blur-sm shadow">
          Mini-Player
        </div>
      </div>

      {/* Controls & Meta Bar */}
      <div className="p-3 flex items-center justify-between gap-2 bg-[#121212]">
        <div className="flex-1 min-w-0 cursor-pointer" onClick={handleExpand}>
          <h4 className="text-xs font-bold text-zinc-100 truncate hover:text-red-400 transition-colors">
            {activeVideo.title}
          </h4>
          <div className="flex items-center gap-1 mt-0.5 text-[11px] text-zinc-400">
            <span className="truncate">{activeVideo.author?.name || 'YouTube Creator'}</span>
            <CheckCircle2 className="w-3 h-3 text-zinc-400 shrink-0" />
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={toggleAudioOnly}
            className="p-1.5 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-emerald-400 transition"
            title="Switch to Audio-Only Mode"
          >
            <Headphones className="w-4 h-4" />
          </button>
          <button
            onClick={isPlaying ? pauseVideo : resumeVideo}
            className="p-1.5 rounded-full hover:bg-zinc-800 text-zinc-200 hover:text-white transition"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <button
            onClick={closeMiniPlayer}
            className="p-1.5 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-red-400 transition"
            title="Close Mini-Player"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
