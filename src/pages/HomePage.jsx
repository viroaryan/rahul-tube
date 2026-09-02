import React, { useState, useEffect, useCallback } from 'react';
import CategoryPills from '../components/common/CategoryPills.jsx';
import VideoGrid from '../components/common/VideoGrid.jsx';
import SkeletonLoader from '../components/common/SkeletonLoader.jsx';
import RecommendedShelf from '../components/shelves/RecommendedShelf.jsx';
import SubscriptionsShelf from '../components/shelves/SubscriptionsShelf.jsx';
import ContinueWatchingShelf from '../components/shelves/ContinueWatchingShelf.jsx';
import { useUser } from '../context/UserContext.jsx';
import { useRecommendations } from '../context/RecommendationContext.jsx';

export default function HomePage() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [continuationToken, setContinuationToken] = useState(null);

  const { history } = useUser();
  const { shelves, loading: recLoading } = useRecommendations();

  // Load category feed
  const loadCategoryFeed = useCallback(async (category) => {
    setLoading(true);
    setVideos([]);
    setContinuationToken(null);
    try {
      const url = `/api/trending?category=${encodeURIComponent(category)}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.videos) {
        setVideos(data.videos);
        setContinuationToken(data.continuationToken || null);
      }
    } catch (err) {
      console.warn('[HomePage] Failed to fetch feed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategoryFeed(selectedCategory);
  }, [selectedCategory, loadCategoryFeed]);

  const loadMoreVideos = async () => {
    if (!continuationToken || loadingMore) return;
    setLoadingMore(true);
    try {
      const url = `/api/trending?category=${encodeURIComponent(selectedCategory)}&continuation=${encodeURIComponent(continuationToken)}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.videos && data.videos.length > 0) {
        setVideos((prev) => [...prev, ...data.videos]);
        setContinuationToken(data.continuationToken || null);
      }
    } catch (err) {
      console.warn('[HomePage] Failed to load more videos:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 pb-20 md:pb-10">
      {/* Sticky Category Pills Carousel */}
      <CategoryPills selected={selectedCategory} onSelect={setSelectedCategory} />

      {/* When on 'All', display personalized shelves */}
      {selectedCategory === 'All' && !loading && (
        <div className="space-y-8">
          {/* Continue Watching History Shelf */}
          {history.length > 0 && <ContinueWatchingShelf history={history} />}

          {/* Dynamic Personalized Shelves */}
          {shelves.map((shelf) => {
            if (shelf.id === 'from_subscriptions') {
              return <SubscriptionsShelf key={shelf.id} shelf={shelf} />;
            }
            return <RecommendedShelf key={shelf.id} shelf={shelf} />;
          })}
        </div>
      )}

      {/* Main Video Grid with Infinite Scroll */}
      <div className="space-y-3">
        {selectedCategory !== 'All' && (
          <h2 className="text-base font-bold text-zinc-100 px-1">{selectedCategory} Videos</h2>
        )}
        <VideoGrid
          videos={videos}
          loading={loading}
          loadingMore={loadingMore}
          hasMore={Boolean(continuationToken)}
          onLoadMore={loadMoreVideos}
        />
      </div>
    </div>
  );
}
