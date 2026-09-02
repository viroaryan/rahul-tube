import React from 'react';
import { History, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ContinueWatchingShelf({ history = [] }) {
  const navigate = useNavigate();

  if (!history || history.length === 0) return null;

  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2.5">
          <History className="w-4 h-4 text-red-500" />
          <h2 className="text-base sm:text-lg font-bold text-zinc-100">Continue Watching</h2>
        </div>
        <button
          onClick={() => navigate('/history')}
          className="text-xs font-semibold text-zinc-400 hover:text-white transition"
        >
          View All
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {history.slice(0, 4).map((video) => (
          <div
            key={video.id}
            onClick={() => navigate(`/watch/${video.id}`)}
            className="group cursor-pointer bg-[#181818] hover:bg-[#222222] p-2.5 rounded-2xl border border-zinc-800 transition flex flex-col gap-2 relative"
          >
            <div className="relative aspect-video rounded-xl overflow-hidden bg-zinc-900">
              <img
                src={video.thumbnail}
                alt={video.title}
                className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
              />
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                <div className="w-9 h-9 rounded-full bg-red-600 text-white flex items-center justify-center shadow">
                  <Play className="w-4 h-4 fill-white ml-0.5" />
                </div>
              </div>

              {/* Progress Bar */}
              <div className="absolute bottom-0 inset-x-0 h-1 bg-zinc-800">
                <div className="h-full bg-red-600 rounded-r" style={{ width: '45%' }} />
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-zinc-100 line-clamp-1 group-hover:text-red-400 transition-colors">
                {video.title}
              </h4>
              <p className="text-[11px] text-zinc-400 mt-0.5 truncate">{video.author?.name || 'YouTube Creator'}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
