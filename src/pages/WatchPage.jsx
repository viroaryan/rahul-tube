import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ThumbsUp,
  ThumbsDown,
  Share2,
  Maximize2,
  MessageSquare,
  CheckCircle2,
  Copy,
  Check,
  Headphones,
  Sparkles,
  Send
} from 'lucide-react';
import { useUser } from '../context/UserContext.jsx';
import { usePlayer } from '../context/PlayerContext.jsx';

export default function WatchPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { addToHistory, toggleLike, isLiked, toggleSubscribe, isSubscribed } = useUser();
  const {
    activeVideo,
    setActiveVideo,
    theaterMode,
    toggleTheaterMode,
    toggleAudioOnly,
    togglePip
  } = usePlayer();

  const [video, setVideo] = useState(null);
  const [related, setRelated] = useState([]);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [descExpanded, setDescExpanded] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');

  const liked = isLiked(id);
  const subscribed = isSubscribed(video?.author?.name || video?.author?.channelId);

  useEffect(() => {
    window.scrollTo(0, 0);
    setLoading(true);

    fetch(`/api/video/${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.video) {
          setVideo(data.video);
          setRelated(data.related || []);
          setActiveVideo(data.video);

          // Save to Watch History
          addToHistory(data.video);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));

    fetch(`/api/comments/${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.comments) setComments(data.comments);
      })
      .catch(() => {});
  }, [id, addToHistory, setActiveVideo]);

  const handleLike = () => {
    if (!video) return;
    toggleLike(video);
    if (isDisliked) setIsDisliked(false);
  };

  const handleDislike = () => {
    setIsDisliked(!isDisliked);
    if (liked) toggleLike(video);
  };

  const handleSubscribe = () => {
    if (!video?.author) return;
    toggleSubscribe(video.author);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddComment = (e) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    const commentObj = {
      id: `local-comment-${Date.now()}`,
      author: 'You (RahulTube User)',
      authorThumbnail: 'https://api.dicebear.com/7.x/initials/svg?seed=Rahul',
      content: newCommentText.trim(),
      published: 'Just now',
      likeCount: 0
    };
    setComments((prev) => [commentObj, ...prev]);
    setNewCommentText('');
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 animate-pulse">
        <div className="lg:col-span-2 space-y-4">
          <div className="aspect-video bg-zinc-800 rounded-2xl w-full" />
          <div className="h-6 bg-zinc-800 rounded w-3/4" />
          <div className="h-12 bg-zinc-800 rounded-xl" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <div className="w-40 aspect-video bg-zinc-800 rounded-xl shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-zinc-800 rounded w-full" />
                <div className="h-3 bg-zinc-800 rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`max-w-[1700px] mx-auto p-3 lg:p-6 pb-20 ${theaterMode ? 'w-full' : ''}`}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Video & Details Section */}
        <div className={theaterMode ? 'lg:col-span-3 space-y-4' : 'lg:col-span-2 space-y-4'}>
          {/* Ad-Free Privacy Video Player Viewport */}
          <div className="relative aspect-video rounded-2xl overflow-hidden bg-black shadow-2xl border border-zinc-800">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&modestbranding=1&rel=0&iv_load_policy=3`}
              title={video?.title || 'Video Player'}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="w-full h-full border-0"
            />
          </div>

          {/* Title */}
          <h1 className="text-lg lg:text-xl font-bold text-zinc-100 leading-snug">
            {video?.title}
          </h1>

          {/* Action Row */}
          <div className="flex flex-wrap items-center justify-between gap-4 py-2 border-b border-zinc-800">
            {/* Channel Info */}
            <div className="flex items-center gap-3">
              <img
                src={
                  video?.author?.avatar ||
                  `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(video?.author?.name || 'C')}`
                }
                alt={video?.author?.name}
                className="w-11 h-11 rounded-full bg-zinc-800 border border-zinc-700 object-cover"
              />
              <div>
                <div className="flex items-center gap-1 font-semibold text-zinc-100 text-sm md:text-base">
                  <span>{video?.author?.name || 'Channel'}</span>
                  <CheckCircle2 className="w-4 h-4 text-zinc-400" />
                </div>
                <p className="text-xs text-zinc-400">{video?.author?.subscribers || '1M+ subscribers'}</p>
              </div>

              <button
                onClick={handleSubscribe}
                className={`ml-2 px-4 py-2 rounded-full text-sm font-semibold transition ${
                  subscribed
                    ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                    : 'bg-white text-black hover:bg-zinc-200'
                }`}
              >
                {subscribed ? 'Subscribed' : 'Subscribe'}
              </button>
            </div>

            {/* Like, Dislike, Share, Premium Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Like/Dislike Button Group */}
              <div className="flex items-center bg-[#222222] rounded-full border border-zinc-700/60 overflow-hidden">
                <button
                  onClick={handleLike}
                  className={`flex items-center gap-2 px-3.5 py-2 hover:bg-zinc-700/60 text-sm font-medium transition ${
                    liked ? 'text-red-500 font-semibold' : 'text-zinc-200'
                  }`}
                  title="I like this"
                >
                  <ThumbsUp className={`w-4 h-4 ${liked ? 'fill-red-500' : ''}`} />
                  <span>{video?.likes || '142K'}</span>
                </button>
                <div className="w-px h-5 bg-zinc-700" />
                <button
                  onClick={handleDislike}
                  className={`px-3 py-2 hover:bg-zinc-700/60 transition ${
                    isDisliked ? 'text-red-500' : 'text-zinc-400'
                  }`}
                  title="I dislike this"
                >
                  <ThumbsDown className={`w-4 h-4 ${isDisliked ? 'fill-red-500' : ''}`} />
                </button>
              </div>

              {/* Share */}
              <button
                onClick={() => setShowShareModal(true)}
                className="flex items-center gap-2 bg-[#222222] hover:bg-zinc-700/60 text-zinc-200 px-4 py-2 rounded-full text-sm font-medium border border-zinc-700/60 transition"
              >
                <Share2 className="w-4 h-4" />
                <span className="hidden sm:inline">Share</span>
              </button>

              {/* Audio-Only Mode */}
              <button
                onClick={toggleAudioOnly}
                className="flex items-center gap-1.5 bg-[#222222] hover:bg-zinc-700/60 text-zinc-300 hover:text-emerald-400 px-3.5 py-2 rounded-full text-sm font-medium border border-zinc-700/60 transition"
                title="Audio-Only Background Mode"
              >
                <Headphones className="w-4 h-4" />
                <span className="hidden md:inline text-xs">Audio Mode</span>
              </button>

              {/* Theater Mode Toggle */}
              <button
                onClick={toggleTheaterMode}
                className={`p-2 rounded-full border border-zinc-700/60 transition ${
                  theaterMode ? 'bg-red-600 text-white' : 'bg-[#222222] hover:bg-zinc-700/60 text-zinc-300'
                }`}
                title="Toggle Theater Mode"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Description Box */}
          <div
            onClick={() => setDescExpanded(!descExpanded)}
            className="bg-[#1c1c1c] hover:bg-[#222222] p-4 rounded-2xl cursor-pointer transition border border-zinc-800"
          >
            <div className="flex items-center gap-2 font-semibold text-sm text-zinc-200 mb-1.5">
              <span>{video?.views} views</span>
              <span>•</span>
              <span>{video?.timestamp}</span>
            </div>

            <p
              className={`text-sm text-zinc-300 whitespace-pre-line leading-relaxed ${
                descExpanded ? '' : 'line-clamp-3'
              }`}
            >
              {video?.description || 'No description available for this video.'}
            </p>

            <button className="text-xs font-bold text-zinc-400 hover:text-white mt-2 uppercase tracking-wide">
              {descExpanded ? 'Show less' : '...more'}
            </button>
          </div>

          {/* Comments Section */}
          <div className="pt-4 space-y-4">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-5 h-5 text-zinc-400" />
              <h2 className="text-lg font-bold text-zinc-100">{comments.length} Comments</h2>
            </div>

            {/* Comment Form */}
            <form onSubmit={handleAddComment} className="flex gap-3 items-start">
              <img
                src="https://api.dicebear.com/7.x/initials/svg?seed=Rahul"
                alt="Avatar"
                className="w-9 h-9 rounded-full bg-zinc-800 shrink-0 border border-zinc-700"
              />
              <div className="flex-1 flex gap-2">
                <input
                  type="text"
                  placeholder="Add a public comment..."
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  className="flex-1 bg-[#161616] text-sm text-white placeholder-zinc-500 px-4 py-2.5 rounded-2xl border border-zinc-700/60 focus:border-red-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!newCommentText.trim()}
                  className="px-4 py-2 rounded-2xl bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Comment</span>
                </button>
              </div>
            </form>

            {/* Comments List */}
            <div className="space-y-4 pt-2">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <img
                    src={
                      comment.authorThumbnail ||
                      `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(comment.author || 'U')}`
                    }
                    alt={comment.author}
                    className="w-9 h-9 rounded-full bg-zinc-800 object-cover shrink-0"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-xs text-zinc-400 mb-1">
                      <span className="font-semibold text-zinc-200">{comment.author}</span>
                      <span>•</span>
                      <span>{comment.published}</span>
                    </div>
                    <p
                      className="text-sm text-zinc-300 leading-normal"
                      dangerouslySetInnerHTML={{ __html: comment.content }}
                    />
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-zinc-400">
                      <button className="flex items-center gap-1 hover:text-white">
                        <ThumbsUp className="w-3.5 h-3.5" />
                        <span>{comment.likeCount > 0 ? comment.likeCount : ''}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Related Videos Queue */}
        <div
          className={
            theaterMode
              ? 'lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-6 border-t border-zinc-800'
              : 'space-y-3'
          }
        >
          <h2 className="text-base font-bold text-zinc-200 mb-2">Related Videos</h2>
          {related.map((rel) => (
            <div
              key={rel.id}
              onClick={() => navigate(`/watch/${rel.id}`)}
              className="flex gap-3 group cursor-pointer hover:bg-[#1a1a1a] p-1.5 rounded-xl transition"
            >
              <div className="relative w-40 aspect-video rounded-lg overflow-hidden bg-zinc-800 shrink-0">
                <img
                  src={rel.thumbnail || `https://i.ytimg.com/vi/${rel.id}/hqdefault.jpg`}
                  alt={rel.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition"
                />
                {rel.duration && (
                  <span className="absolute bottom-1 right-1 bg-black/80 text-[10px] text-white px-1.5 py-0.5 rounded font-medium">
                    {rel.duration}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-semibold text-zinc-100 line-clamp-2 leading-snug group-hover:text-red-400 transition">
                  {rel.title}
                </h4>
                <p className="text-[11px] text-zinc-400 mt-1 truncate">{rel.author?.name}</p>
                <div className="flex items-center gap-1 text-[11px] text-zinc-500">
                  <span>{rel.views}</span>
                  {rel.ago && <span>• {rel.ago}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-[#1f1f1f] border border-zinc-700 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-base text-zinc-100">Share Video</h3>
              <button onClick={() => setShowShareModal(false)} className="text-zinc-400 hover:text-white">
                ✕
              </button>
            </div>
            <div className="flex items-center gap-2 bg-[#121212] p-2 rounded-xl border border-zinc-700">
              <input
                type="text"
                readOnly
                value={window.location.href}
                className="bg-transparent text-xs text-zinc-300 flex-1 focus:outline-none px-2"
              />
              <button
                onClick={handleCopyLink}
                className="bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
