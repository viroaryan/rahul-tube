import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useUser } from './UserContext.jsx';

const RecommendationContext = createContext(null);

export function RecommendationProvider({ children }) {
  const { history, liked, subscriptions, searchHistory } = useUser();
  const [shelves, setShelves] = useState([]);
  const [flatFeed, setFlatFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(Date.now());
  const debounceTimerRef = useRef(null);

  const fetchRecommendations = useCallback(async (customPayload = null) => {
    setLoading(true);
    try {
      const payload = customPayload || {
        history: history.slice(0, 30),
        liked: liked.slice(0, 30),
        subscriptions: subscriptions.map((s) => (typeof s === 'string' ? s : s.name || s.channelId)),
        queryLog: searchHistory.slice(0, 20).map((q) => q.query)
      };

      const res = await fetch('/api/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.shelves)) {
          setShelves(data.shelves);
          setFlatFeed(data.flatFeed || []);
          setLastUpdated(Date.now());
          setLoading(false);
          return;
        }
      }

      // Fallback to trending feed if recommendation response is empty
      const trendRes = await fetch('/api/trending?category=All');
      if (trendRes.ok) {
        const trendData = await trendRes.json();
        const fallbackShelf = {
          id: 'recommended_for_you',
          title: 'Recommended for You',
          videos: trendData.videos || []
        };
        setShelves([fallbackShelf]);
        setFlatFeed(trendData.videos || []);
      }
    } catch (err) {
      console.warn('[recommendations] Recommendation fetch fallback:', err);
    } finally {
      setLoading(false);
    }
  }, [history, liked, subscriptions, searchHistory]);

  // Debounced auto-sync whenever user behavior changes
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      fetchRecommendations();
    }, 600);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [history.length, liked.length, subscriptions.length, searchHistory.length, fetchRecommendations]);

  const value = {
    shelves,
    flatFeed,
    loading,
    lastUpdated,
    refreshRecommendations: fetchRecommendations
  };

  return <RecommendationContext.Provider value={value}>{children}</RecommendationContext.Provider>;
}

export function useRecommendations() {
  const ctx = useContext(RecommendationContext);
  if (!ctx) {
    throw new Error('useRecommendations must be used within a RecommendationProvider');
  }
  return ctx;
}

export default RecommendationContext;
