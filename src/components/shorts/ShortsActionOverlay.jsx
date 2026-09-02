import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown, MessageSquare, Share2, Copy, Check, Music, CheckCircle2, Volume2, VolumeX } from 'lucide-react';
import { useUser } from '../../context/UserContext.jsx';

export default function ShortsActionOverlay({
  short,
  onOpenComments,
  commentCount = 0,
  isMuted = false,
  onToggleMute
}) {
  const { toggleLike, isLiked, toggleSubscribe, isSubscribed } = useUser();
  const [isDisliked, setIsDisliked] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!short) return null;

  const liked = isLiked(short.id);
  const subscribed = isSubscribed(short.author?.name || short.author?.channelId);

  const handleLike = () => {
    toggleLike(short);
    if (isDisliked) setIsDisliked(false);
  };

  const handleDislike = () => {
    setIsDisliked(!isDisliked);
    if (liked) toggleLike(short);
  };

  const handleSubscribe = () => {
    toggleSubscribe(short.author || { name: 'Creator', channelId: `UC_${short.id}` });
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`https://www.youtube.com/shorts/${short.id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      {/* Bottom Info Overlay inside 9:16 player */}
      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-4 text-white space-y-3 pointer-events-none z-20">
        {/* Channel Bar */}
        <div className="flex items-center gap-3 pointer-events-auto">
          <img
            src={short.author?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(short.author?.name || short.id)}`}
            alt={short.author?.name || 'Avatar'}
            className="w-9 h-9 rounded-full border border-white/40 object-cover bg-zinc-800"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 font-bold text-sm truncate">
              <span>{short.author?.name || 'Creator'}</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            </div>
          </div>

          <button
            onClick={handleSubscribe}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition shadow ${
              subscribed ? 'bg-zinc-800/90 text-zinc-300' : 'bg-red-600 text-white hover:bg-red-500'
            }`}
          >
            {subscribed ? 'Subscribed' : 'Subscribe'}
          </button>
        </div>

        {/* Caption */}
        <p className="text-xs text-zinc-200 line-clamp-2 leading-relaxed font-medium pointer-events-auto">
          {short.title}
        </p>

        {/* Audio Track Tag with Spinning Vinyl */}
        <div className="flex items-center gap-2 text-[11px] text-zinc-300 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full w-fit pointer-events-auto">
          <Music className="w-3.5 h-3.5 text-red-400 shrink-0 animate-spin" style={{ animationDuration: '6s' }} />
          <span className="truncate max-w-[220px]">
            {short.sound?.title ? `${short.sound.title} - ${short.sound.author || ''}` : `Original Sound • ${short.views || 'Viral'}`}
          </span>
        </div>
      </div>

      {/* Right-Side Vertical Action Buttons */}
      <div className="flex flex-col items-center gap-4 py-2 text-zinc-200 z-20">
        {/* Like Button */}
        <div className="flex flex-col items-center gap-1">
          <button
            onClick={handleLike}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition border border-zinc-800 shadow-lg ${
              liked ? 'bg-red-600 text-white' : 'bg-[#222222] hover:bg-zinc-700 text-zinc-200'
            }`}
            title="Like Short"
          >
            <ThumbsUp className={`w-5 h-5 ${liked ? 'fill-white' : ''}`} />
          </button>
          <span className="text-xs font-semibold text-zinc-400">{liked ? 'Liked' : 'Like'}</span>
        </div>

        {/* Dislike Button */}
        <div className="flex flex-col items-center gap-1">
          <button
            onClick={handleDislike}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition border border-zinc-800 shadow-lg ${
              isDisliked ? 'bg-zinc-700 text-red-400' : 'bg-[#222222] hover:bg-zinc-700 text-zinc-200'
            }`}
            title="Dislike Short"
          >
            <ThumbsDown className="w-5 h-5" />
          </button>
          <span className="text-xs font-semibold text-zinc-400">Dislike</span>
        </div>

        {/* Comments Drawer Button */}
        <div className="flex flex-col items-center gap-1">
          <button
            onClick={onOpenComments}
            className="w-12 h-12 rounded-full bg-[#222222] hover:bg-zinc-700 text-zinc-200 flex items-center justify-center transition border border-zinc-800 shadow-lg"
            title="View Comments"
          >
            <MessageSquare className="w-5 h-5" />
          </button>
          <span className="text-xs font-semibold text-zinc-400">{commentCount}</span>
        </div>

        {/* Share Button */}
        <div className="flex flex-col items-center gap-1">
          <button
            onClick={() => setShowShareModal(true)}
            className="w-12 h-12 rounded-full bg-[#222222] hover:bg-zinc-700 text-zinc-200 flex items-center justify-center transition border border-zinc-800 shadow-lg"
            title="Share Short"
          >
            <Share2 className="w-5 h-5" />
          </button>
          <span className="text-xs font-semibold text-zinc-400">Share</span>
        </div>

        {/* Audio Mute Button */}
        <div className="flex flex-col items-center gap-1">
          <button
            onClick={onToggleMute}
            className="w-12 h-12 rounded-full bg-[#222222] hover:bg-zinc-700 text-zinc-200 flex items-center justify-center transition border border-zinc-800 shadow-lg"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5" />}
          </button>
          <span className="text-xs font-semibold text-zinc-400">{isMuted ? 'Muted' : 'Sound'}</span>
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-[#1f1f1f] border border-zinc-700 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-base text-zinc-100">Share Short</h3>
              <button onClick={() => setShowShareModal(false)} className="text-zinc-400 hover:text-white">✕</button>
            </div>
            <div className="flex items-center gap-2 bg-[#121212] p-2 rounded-xl border border-zinc-700">
              <input
                type="text"
                readOnly
                value={`https://www.youtube.com/shorts/${short.id}`}
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
    </>
  );
}
