import React from 'react';
import { Sparkles } from 'lucide-react';
import VideoCard from '../common/VideoCard.jsx';

export default function RecommendedShelf({ shelf }) {
  if (!shelf || !shelf.videos || shelf.videos.length === 0) return null;

  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center gap-2.5 px-1">
        <Sparkles className="w-4 h-4 text-red-500" />
        <h2 className="text-base sm:text-lg font-bold text-zinc-100">{shelf.title}</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-7">
        {shelf.videos.slice(0, 8).map((video, idx) => (
          <VideoCard key={`${video.id}-${idx}`} video={video} />
        ))}
      </div>
    </div>
  );
}
