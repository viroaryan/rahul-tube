import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { History, Trash2, Search, X, Play } from 'lucide-react';
import { useUser } from '../context/UserContext.jsx';

export default function HistoryPage() {
  const { history, clearHistory, removeFromHistory } = useUser();
  const [filterQuery, setFilterQuery] = useState('');
  const navigate = useNavigate();

  const filteredHistory = history.filter((item) => {
    if (!filterQuery.trim()) return true;
    const q = filterQuery.toLowerCase().trim();
    const titleMatch = item.title?.toLowerCase().includes(q);
    const authorMatch = item.author?.name?.toLowerCase().includes(q);
    return titleMatch || authorMatch;
  });

  return (
    <div className="max-w-6xl mx-auto p-4 lg:p-6 space-y-6 pb-20 md:pb-10">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-600/20 text-red-500 flex items-center justify-center">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-100">Watch History</h1>
            <p className="text-xs text-zinc-400">{history.length} videos recorded locally on your device</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Search within History */}
          {history.length > 0 && (
            <div className="relative flex items-center">
              <input
                type="text"
                placeholder="Search history..."
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                className="bg-[#181818] text-xs text-zinc-200 placeholder-zinc-500 px-3 py-2 rounded-full border border-zinc-700/60 focus:outline-none focus:border-red-500 w-44 sm:w-56"
              />
              {filterQuery && (
                <button
                  onClick={() => setFilterQuery('')}
                  className="absolute right-2.5 text-zinc-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {history.length > 0 && (
            <button
              onClick={clearHistory}
              className="flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-red-400 bg-[#222] hover:bg-[#2a2a2a] px-4 py-2 rounded-full transition border border-zinc-700/60 shrink-0"
              title="Clear all watch history"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear History</span>
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {history.length === 0 ? (
        <div className="text-center py-20 space-y-3">
          <History className="w-12 h-12 text-zinc-600 mx-auto" />
          <h3 className="text-base font-semibold text-zinc-300">No watch history yet</h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            Videos you watch on RahulTube will show up here for quick resumption.
          </p>
          <button
            onClick={() => navigate('/')}
            className="mt-2 bg-red-600 text-white px-5 py-2 rounded-full text-xs font-semibold hover:bg-red-500 transition shadow"
          >
            Explore Videos
          </button>
        </div>
      ) : filteredHistory.length === 0 ? (
        <div className="text-center py-16 text-zinc-500 text-xs">
          No watch history matches "{filterQuery}".
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredHistory.map((video) => (
            <div
              key={video.id}
              onClick={() => navigate(`/watch/${video.id}`)}
              className="group cursor-pointer bg-[#181818] hover:bg-[#222222] p-2.5 rounded-2xl border border-zinc-800 transition flex flex-col gap-2.5 relative"
            >
              <div className="relative aspect-video rounded-xl overflow-hidden bg-zinc-900">
                <img
                  src={video.thumbnail || `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`}
                  alt={video.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                />

                {/* Individual Delete from History */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFromHistory(video.id);
                  }}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 hover:bg-red-600 text-zinc-300 hover:text-white transition opacity-0 group-hover:opacity-100 shadow"
                  title="Remove from history"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                {video.duration && (
                  <span className="absolute bottom-1.5 right-1.5 bg-black/85 text-[11px] text-white px-1.5 py-0.5 rounded font-medium">
                    {video.duration}
                  </span>
                )}
              </div>

              <div>
                <h4 className="text-xs font-bold text-zinc-100 line-clamp-2 leading-snug group-hover:text-red-400 transition">
                  {video.title}
                </h4>
                <p className="text-[11px] text-zinc-400 mt-1 truncate">{video.author?.name || 'Channel'}</p>
                <div className="flex items-center justify-between text-[10px] text-zinc-500 mt-1">
                  <span>{video.views}</span>
                  <span>Watched {video.watchedAt}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
