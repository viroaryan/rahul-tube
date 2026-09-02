import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Play } from 'lucide-react';

export default function VideoCard({ video }) {
  const navigate = useNavigate();

  if (!video || !video.id) return null;

  const handleChannelClick = (e) => {
    e.stopPropagation();
    if (video.author?.channelId) {
      navigate(`/channel/${video.author.channelId}`);
    } else if (video.author?.name) {
      navigate(`/search?q=${encodeURIComponent(video.author.name)}`);
    }
  };

  return (
    <div
      onClick={() => navigate(`/watch/${video.id}`)}
      className="group cursor-pointer flex flex-col gap-3 transition-transform duration-200 hover:-translate-y-1"
    >
      {/* Thumbnail Container */}
      <div className="relative aspect-video rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800/60 shadow-md">
        <img
          src={video.thumbnail || `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`}
          alt={video.title}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
          onError={(e) => {
            e.target.src = `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`;
          }}
        />

        {/* Play overlay on hover */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-lg transform scale-75 group-hover:scale-100 transition">
            <Play className="w-6 h-6 fill-white ml-0.5" />
          </div>
        </div>

        {/* Duration badge */}
        {video.duration && (
          <span className="absolute bottom-2 right-2 bg-black/85 text-white text-xs font-semibold px-2 py-0.5 rounded-md backdrop-blur-sm">
            {video.duration}
          </span>
        )}
      </div>

      {/* Meta Info */}
      <div className="flex gap-3 px-0.5">
        {/* Channel Avatar */}
        <div className="shrink-0" onClick={handleChannelClick}>
          <img
            src={video.author?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(video.author?.name || 'C')}`}
            alt={video.author?.name}
            className="w-9 h-9 rounded-full object-cover bg-zinc-800 border border-zinc-700/60 hover:opacity-80 transition"
          />
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-zinc-100 line-clamp-2 leading-snug group-hover:text-red-400 transition-colors">
            {video.title}
          </h3>

          <div
            onClick={handleChannelClick}
            className="flex items-center gap-1 mt-1 text-xs text-zinc-400 hover:text-zinc-200 transition"
          >
            <span className="truncate">{video.author?.name || 'Channel'}</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          </div>

          <div className="flex items-center gap-1 text-xs text-zinc-400 mt-0.5">
            <span>{video.views}</span>
            {video.ago && (
              <>
                <span>•</span>
                <span>{video.ago}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
