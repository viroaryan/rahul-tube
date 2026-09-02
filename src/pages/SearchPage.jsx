import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import VideoGrid from '../components/common/VideoGrid.jsx';
import SkeletonLoader from '../components/common/SkeletonLoader.jsx';
import { useUser } from '../context/UserContext.jsx';
import { Search } from 'lucide-react';

export default function SearchPage() {
  const location = useLocation();
  const { addSearchQuery } = useUser();

  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [continuationToken, setContinuationToken] = useState(null);

  const query = new URLSearchParams(location.search).get('q') || '';

  const fetchSearchResults = useCallback(async (searchQuery) => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setVideos([]);
    setContinuationToken(null);

    // Save query to user search history for recommendation adaptation
    addSearchQuery(searchQuery);

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data.videos) {
        setVideos(data.videos);
        setContinuationToken(data.continuationToken || null);
      }
    } catch (err) {
      console.warn('[SearchPage] Search fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, [addSearchQuery]);

  useEffect(() => {
    if (query) {
      fetchSearchResults(query);
    }
  }, [query, fetchSearchResults]);

  const loadMoreResults = async () => {
    if (!continuationToken || loadingMore) return;
    setLoadingMore(true);
    try {
      const url = `/api/search?q=${encodeURIComponent(query)}&continuation=${encodeURIComponent(continuationToken)}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.videos && data.videos.length > 0) {
        setVideos((prev) => [...prev, ...data.videos]);
        setContinuationToken(data.continuationToken || null);
      }
    } catch (err) {
      console.warn('[SearchPage] Search pagination failed:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 lg:p-6 space-y-6 pb-20 md:pb-10">
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-2 text-zinc-300 text-sm md:text-base">
          <Search className="w-4 h-4 text-red-500" />
          <span>
            Results for <span className="font-bold text-white">"{query}"</span>
          </span>
        </div>
        <span className="text-xs text-zinc-500">{videos.length} videos scraped</span>
      </div>

      {/* Results Video Grid */}
      <VideoGrid
        videos={videos}
        loading={loading}
        loadingMore={loadingMore}
        hasMore={Boolean(continuationToken)}
        onLoadMore={loadMoreResults}
      />
    </div>
  );
}
