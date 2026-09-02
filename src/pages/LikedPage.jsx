import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ThumbsUp, Trash2, Play } from 'lucide-react';
import { useUser } from '../context/UserContext.jsx';
import { usePlayer } from '../context/PlayerContext.jsx';

export default function LikedPage() {
  const { liked, toggleLike } = useUser();
  const { playQueue } = usePlayer();
  const navigate = useNavigate();

  const handlePlayAll = () => {
    if (!liked || liked.length === 0) return;
    playQueue(liked, 0);
    navigate(`/watch/${liked[0].id}`);
  };

  const removeLiked = (e, video) => {
    e.stopPropagation();
    toggleLike(video);
  };

  return (
    <div className="max-w-6xl mx-auto p-4 lg:p-6 space-y-6 pb-20 md:pb-10">
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-600/20 text-red-500 flex items-center justify-center">
            <ThumbsUp className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-100">Liked Videos</h1>
            <p className="text-xs text-zinc-400">{liked.length} saved favorites</p>
          </div>
        </div>

        {liked.length > 0 && (
          <button
            onClick={handlePlayAll}
            className="flex items-center gap-2 text-xs font-semibold text-black bg-white hover:bg-zinc-200 px-4 py-2 rounded-full transition shadow"
            title="Play all liked videos sequentially"
          >
            <Play className="w-3.5 h-3.5 fill-black" />
            <span>Play All</span>
          </button>
        )}
      </div>

      {/* Content */}
      {liked.length === 0 ? (
        <div className="text-center py-20 space-y-3">
          <ThumbsUp className="w-12 h-12 text-zinc-600 mx-auto" />
          <h3 className="text-base font-semibold text-zinc-300">No liked videos yet</h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            Click the thumbs-up button on any video to add it to your favorites.
          </p>
          <button
            onClick={() => navigate('/')}
            className="mt-2 bg-red-600 text-white px-5 py-2 rounded-full text-xs font-semibold hover:bg-red-500 transition shadow"
          >
            Discover Videos
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {liked.map((video) => (
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
                <button
                  onClick={(e) => removeLiked(e, video)}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 hover:bg-red-600 text-zinc-300 hover:text-white transition opacity-0 group-hover:opacity-100 shadow"
                  title="Remove from liked"
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
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
