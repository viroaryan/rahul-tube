import React from 'react';
import VideoCard from './VideoCard.jsx';
import SkeletonLoader from './SkeletonLoader.jsx';
import { Loader2 } from 'lucide-react';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll.js';

export default function VideoGrid({
  videos = [],
  loading = false,
  loadingMore = false,
  hasMore = false,
  onLoadMore
}) {
  const sentinelRef = useInfiniteScroll({
    onIntersect: onLoadMore || (() => {}),
    hasMore: hasMore && Boolean(onLoadMore),
    isLoading: loadingMore
  });

  if (loading) {
    return <SkeletonLoader count={12} />;
  }

  if (!videos || videos.length === 0) {
    return (
      <div className="py-20 text-center text-zinc-500 text-sm">
        No videos found in this category.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-7">
        {videos.map((video, idx) => (
          <VideoCard key={`${video.id}-${idx}`} video={video} />
        ))}
      </div>

      {/* Infinite Scroll Sentinel */}
      {hasMore && (
        <div ref={sentinelRef} className="flex justify-center py-6">
          {loadingMore && (
            <div className="flex items-center gap-2 text-zinc-400 text-sm">
              <Loader2 className="w-5 h-5 animate-spin text-red-500" />
              <span>Loading more live videos from YouTube...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
