import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getStorageItem, setStorageItem, removeStorageItem, STORAGE_KEYS } from '../utils/storage.js';

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [history, setHistory] = useState(() => getStorageItem(STORAGE_KEYS.HISTORY, []));
  const [liked, setLiked] = useState(() => getStorageItem(STORAGE_KEYS.LIKED, []));
  const [subscriptions, setSubscriptions] = useState(() => getStorageItem(STORAGE_KEYS.SUBS, []));
  const [searchHistory, setSearchHistory] = useState(() => getStorageItem(STORAGE_KEYS.SEARCH_HISTORY, []));

  // Sync to localStorage whenever state changes
  useEffect(() => {
    setStorageItem(STORAGE_KEYS.HISTORY, history, 50);
  }, [history]);

  useEffect(() => {
    setStorageItem(STORAGE_KEYS.LIKED, liked, 200);
  }, [liked]);

  useEffect(() => {
    setStorageItem(STORAGE_KEYS.SUBS, subscriptions, 100);
  }, [subscriptions]);

  useEffect(() => {
    setStorageItem(STORAGE_KEYS.SEARCH_HISTORY, searchHistory, 50);
  }, [searchHistory]);

  // History Actions
  const addToHistory = useCallback((video, progressSec = 0) => {
    if (!video || !video.id) return;
    setHistory((prev) => {
      const filtered = prev.filter((item) => item.id !== video.id);
      const newEntry = {
        id: video.id,
        title: video.title || 'YouTube Video',
        thumbnail: video.thumbnail || `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`,
        author: video.author || { name: 'Channel' },
        views: video.views || '',
        duration: video.duration || '0:00',
        progressSec: progressSec || 0,
        watchedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: Date.now()
      };
      return [newEntry, ...filtered].slice(0, 50);
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    removeStorageItem(STORAGE_KEYS.HISTORY);
  }, []);

  const removeFromHistory = useCallback((videoId) => {
    if (!videoId) return;
    setHistory((prev) => prev.filter((item) => item.id !== videoId));
  }, []);

  // Liked Videos Actions
  const isLiked = useCallback(
    (videoId) => {
      if (!videoId) return false;
      return liked.some((v) => (typeof v === 'object' ? v.id === videoId : v === videoId));
    },
    [liked]
  );

  const toggleLike = useCallback((video) => {
    if (!video) return false;
    const videoId = typeof video === 'string' ? video : video.id;
    if (!videoId) return false;

    let willBeLiked = false;
    setLiked((prev) => {
      const exists = prev.some((v) => (typeof v === 'object' ? v.id === videoId : v === videoId));
      if (exists) {
        willBeLiked = false;
        return prev.filter((v) => (typeof v === 'object' ? v.id !== videoId : v !== videoId));
      } else {
        willBeLiked = true;
        const newEntry =
          typeof video === 'object'
            ? {
                id: video.id,
                title: video.title || 'YouTube Video',
                thumbnail: video.thumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
                author: video.author || { name: 'Channel' },
                duration: video.duration || '0:00',
                views: video.views || '',
                likedAt: new Date().toISOString()
              }
            : { id: videoId, title: 'YouTube Video', thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`, likedAt: new Date().toISOString() };
        return [newEntry, ...prev].slice(0, 200);
      }
    });
    return willBeLiked;
  }, []);

  // Subscriptions Actions
  const isSubscribed = useCallback(
    (channelIdOrName) => {
      if (!channelIdOrName) return false;
      const target = String(channelIdOrName).toLowerCase().trim();
      return subscriptions.some((s) => {
        if (typeof s === 'string') return s.toLowerCase().trim() === target;
        if (typeof s === 'object' && s !== null) {
          return (
            (s.name && s.name.toLowerCase().trim() === target) ||
            (s.channelId && s.channelId.toLowerCase().trim() === target)
          );
        }
        return false;
      });
    },
    [subscriptions]
  );

  const toggleSubscribe = useCallback((channel) => {
    if (!channel) return false;
    let name = '';
    let channelId = '';
    let avatar = '';

    if (typeof channel === 'string') {
      name = channel.trim();
    } else if (typeof channel === 'object') {
      name = channel.name || channel.channelTitle || '';
      channelId = channel.channelId || channel.id || '';
      avatar = channel.avatar || '';
    }

    if (!name && !channelId) return false;

    let willBeSubscribed = false;
    setSubscriptions((prev) => {
      const exists = prev.some((s) => {
        if (typeof s === 'string') return s.toLowerCase() === (name || channelId).toLowerCase();
        if (typeof s === 'object' && s !== null) {
          return (
            (channelId && s.channelId === channelId) ||
            (name && s.name && s.name.toLowerCase() === name.toLowerCase())
          );
        }
        return false;
      });

      if (exists) {
        willBeSubscribed = false;
        return prev.filter((s) => {
          if (typeof s === 'string') return s.toLowerCase() !== (name || channelId).toLowerCase();
          if (typeof s === 'object' && s !== null) {
            return (
              (!channelId || s.channelId !== channelId) &&
              (!name || !s.name || s.name.toLowerCase() !== name.toLowerCase())
            );
          }
          return true;
        });
      } else {
        willBeSubscribed = true;
        // Store as clean object while preserving backward compatibility
        const newSub = {
          channelId: channelId || `UC_${encodeURIComponent(name)}`,
          name: name || channelId,
          avatar: avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || channelId)}`,
          subscribedAt: new Date().toISOString()
        };
        return [newSub, ...prev].slice(0, 100);
      }
    });
    return willBeSubscribed;
  }, []);

  // Search History Actions
  const addSearchQuery = useCallback((query) => {
    if (!query || typeof query !== 'string' || !query.trim()) return;
    const clean = query.trim();
    setSearchHistory((prev) => {
      const filtered = prev.filter((item) => item.query.toLowerCase() !== clean.toLowerCase());
      return [{ query: clean, timestamp: Date.now() }, ...filtered].slice(0, 50);
    });
  }, []);

  const clearSearchHistory = useCallback(() => {
    setSearchHistory([]);
    removeStorageItem(STORAGE_KEYS.SEARCH_HISTORY);
  }, []);

  const value = {
    history,
    liked,
    subscriptions,
    searchHistory,
    addToHistory,
    clearHistory,
    removeFromHistory,
    toggleLike,
    isLiked,
    toggleSubscribe,
    isSubscribed,
    addSearchQuery,
    clearSearchHistory
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return ctx;
}

export default UserContext;
