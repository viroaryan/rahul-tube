import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronUp, ChevronDown, Sparkles, Loader2 } from 'lucide-react';
import ShortsActionOverlay from './ShortsActionOverlay.jsx';
import ShortsCommentsDrawer from './ShortsCommentsDrawer.jsx';
import { useSwipeGestures } from '../../hooks/useSwipeGestures.js';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts.js';

export default function ShortsPlayer() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [shorts, setShorts] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [continuationToken, setContinuationToken] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);

  const containerRef = useRef(null);

  // Load initial batch of Shorts
  useEffect(() => {
    setLoading(true);
    fetch('/api/shorts?category=viral')
      .then((res) => res.json())
      .then((data) => {
        if (data.shorts && data.shorts.length > 0) {
          let list = data.shorts;
          if (id) {
            const foundIdx = list.findIndex((s) => s.id === id);
            if (foundIdx !== -1) {
              setCurrentIdx(foundIdx);
            } else {
              list = [
                {
                  id,
                  title: 'YouTube Short',
                  views: 'Trending',
                  thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
                  author: { name: 'Creator', avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${id}` }
                },
                ...list
              ];
              setCurrentIdx(0);
            }
          }
          setShorts(list);
          setContinuationToken(data.continuationToken || null);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  const currentShort = shorts[currentIdx] || null;

  // Load next batch of shorts via continuation token
  const loadMoreShorts = useCallback(async () => {
    if (!continuationToken || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/shorts?continuation=${encodeURIComponent(continuationToken)}`);
      const data = await res.json();
      if (data.shorts && data.shorts.length > 0) {
        setShorts((prev) => [...prev, ...data.shorts]);
        setContinuationToken(data.continuationToken || null);
      }
    } catch (err) {
      console.warn('[Shorts] Failed to load continuation batch:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [continuationToken, loadingMore]);

  // Pre-fetch next batch if user is nearing the end of current list
  useEffect(() => {
    if (shorts.length > 0 && currentIdx >= shorts.length - 3 && continuationToken && !loadingMore) {
      loadMoreShorts();
    }
  }, [currentIdx, shorts.length, continuationToken, loadingMore, loadMoreShorts]);

  // Load comments whenever active short changes
  useEffect(() => {
    if (!currentShort?.id) return;
    setLoadingComments(true);
    fetch(`/api/comments/${currentShort.id}`)
      .then((res) => res.json())
      .then((d) => {
        if (d.comments) {
          setComments(d.comments);
        } else {
          setComments([]);
        }
      })
      .catch(() => setComments([]))
      .finally(() => setLoadingComments(false));
  }, [currentShort?.id]);

  const handleNext = useCallback(() => {
    if (currentIdx < shorts.length - 1) {
      setCurrentIdx((prev) => prev + 1);
    }
  }, [currentIdx, shorts.length]);

  const handlePrev = useCallback(() => {
    if (currentIdx > 0) {
      setCurrentIdx((prev) => prev - 1);
    }
  }, [currentIdx]);

  // Gesture handling (Touch swipe & Mouse wheel)
  const swipeHandlers = useSwipeGestures({
    onSwipeUp: handleNext,
    onSwipeDown: handlePrev,
    threshold: 40
  });

  // Keyboard navigation
  useKeyboardShortcuts({
    onNext: handleNext,
    onPrev: handlePrev,
    onToggleMute: () => setIsMuted((m) => !m)
  });

  const handleAddComment = (text) => {
    const newEntry = {
      id: `local-${Date.now()}`,
      author: 'You (RahulTube User)',
      authorThumbnail: 'https://api.dicebear.com/7.x/initials/svg?seed=Rahul',
      content: text,
      published: 'Just now',
      likeCount: 0
    };
    setComments((prev) => [newEntry, ...prev]);
  };

  if (loading) {
    return (
      <div className="h-[calc(100vh-3.5rem)] flex items-center justify-center p-4">
        <div className="w-[340px] sm:w-[380px] lg:w-[420px] aspect-[9/16] bg-zinc-900 rounded-3xl animate-pulse flex flex-col justify-end p-6 space-y-4 border border-zinc-800">
          <div className="h-4 bg-zinc-800 rounded w-3/4" />
          <div className="h-8 bg-zinc-800 rounded-full w-1/2" />
        </div>
      </div>
    );
  }

  if (shorts.length === 0) {
    return (
      <div className="h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center space-y-3 p-4">
        <Sparkles className="w-10 h-10 text-red-500 animate-bounce" />
        <h2 className="text-lg font-bold text-zinc-100">No Shorts Found</h2>
        <button
          onClick={() => navigate('/')}
          className="bg-red-600 text-white px-5 py-2 rounded-full text-xs font-semibold hover:bg-red-500 transition"
        >
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      {...swipeHandlers}
      className="h-[calc(100vh-3.5rem)] flex items-center justify-center py-3 px-2 overflow-hidden select-none relative focus:outline-none"
      tabIndex={0}
    >
      <div className="flex items-center gap-4 max-w-full">
        {/* Main Short Video Container (9:16 aspect ratio) */}
        <div className="relative w-[330px] sm:w-[380px] lg:w-[420px] aspect-[9/16] max-h-[calc(100vh-4.5rem)] bg-black rounded-3xl overflow-hidden shadow-2xl border border-zinc-800">
          {/* Ad-free Privacy Embed for active short */}
          <iframe
            key={currentShort?.id}
            src={`https://www.youtube-nocookie.com/embed/${currentShort?.id}?autoplay=1&loop=1&playlist=${currentShort?.id}&modestbranding=1&rel=0&controls=1&mute=${isMuted ? 1 : 0}`}
            title={currentShort?.title || 'YouTube Short'}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full border-0 pointer-events-auto"
          />

          {/* Action and Info Overlay */}
          <ShortsActionOverlay
            short={currentShort}
            commentCount={comments.length}
            onOpenComments={() => setShowComments(true)}
            isMuted={isMuted}
            onToggleMute={() => setIsMuted(!isMuted)}
          />
        </div>

        {/* Up / Down Navigation Buttons Next to Video */}
        <div className="hidden sm:flex flex-col gap-2 text-zinc-300">
          <button
            onClick={handlePrev}
            disabled={currentIdx === 0}
            className="p-3 rounded-full bg-[#181818] hover:bg-[#282828] disabled:opacity-20 text-zinc-300 hover:text-white transition shadow-lg border border-zinc-800"
            title="Previous Short (Up Arrow / k)"
          >
            <ChevronUp className="w-6 h-6" />
          </button>
          <button
            onClick={handleNext}
            disabled={currentIdx === shorts.length - 1}
            className="p-3 rounded-full bg-[#181818] hover:bg-[#282828] disabled:opacity-20 text-zinc-300 hover:text-white transition shadow-lg border border-zinc-800"
            title="Next Short (Down Arrow / j)"
          >
            <ChevronDown className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Live Comments Drawer */}
      <ShortsCommentsDrawer
        isOpen={showComments}
        onClose={() => setShowComments(false)}
        comments={comments}
        onAddComment={handleAddComment}
        loading={loadingComments}
      />
    </div>
  );
}
