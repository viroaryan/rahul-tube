import React, { useState } from 'react';
import { MessageSquare, X, Send, ThumbsUp } from 'lucide-react';

export default function ShortsCommentsDrawer({
  isOpen,
  onClose,
  comments = [],
  onAddComment,
  loading = false
}) {
  const [newComment, setNewComment] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    if (onAddComment) {
      onAddComment(newComment.trim());
    }
    setNewComment('');
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-[#161616]/98 backdrop-blur-md border-l border-zinc-800 shadow-2xl p-4 flex flex-col space-y-4 animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
        <h3 className="font-bold text-base text-zinc-100 flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-red-500" />
          <span>Comments ({comments.length})</span>
        </h3>
        <button
          onClick={onClose}
          className="p-1 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Comments List */}
      <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
        {loading ? (
          <div className="space-y-3 animate-pulse">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-2.5">
                <div className="w-8 h-8 rounded-full bg-zinc-800 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-zinc-800 rounded w-1/3" />
                  <div className="h-3 bg-zinc-800 rounded w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-16 text-zinc-500 text-xs">
            No comments yet. Be the first to comment!
          </div>
        ) : (
          comments.map((c) => (
            <div key={c.id || Math.random()} className="flex gap-2.5 text-xs">
              <img
                src={c.authorThumbnail || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(c.author || 'User')}`}
                alt={c.author}
                className="w-8 h-8 rounded-full bg-zinc-800 object-cover shrink-0 border border-zinc-700/60"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-bold text-zinc-200 truncate">{c.author}</span>
                  {c.published && <span className="text-[10px] text-zinc-500">{c.published}</span>}
                </div>
                <p className="text-zinc-300 leading-relaxed break-words" dangerouslySetInnerHTML={{ __html: c.content }} />
                <div className="flex items-center gap-3 mt-1 text-[11px] text-zinc-400">
                  <button className="flex items-center gap-1 hover:text-white">
                    <ThumbsUp className="w-3 h-3" />
                    <span>{c.likeCount > 0 ? c.likeCount : ''}</span>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Comment Input */}
      <form onSubmit={handleSubmit} className="border-t border-zinc-800 pt-3 flex items-center gap-2">
        <input
          type="text"
          placeholder="Add a public comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          className="flex-1 bg-[#222222] text-xs text-white placeholder-zinc-500 px-3.5 py-2 rounded-full border border-zinc-700 focus:border-red-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!newComment.trim()}
          className="p-2 rounded-full bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white transition"
          title="Send comment"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
