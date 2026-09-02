import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, Film, Video, ListMusic, Bell, Share2 } from 'lucide-react';
import VideoCard from '../components/common/VideoCard.jsx';
import SkeletonLoader from '../components/common/SkeletonLoader.jsx';
import { useUser } from '../context/UserContext.jsx';

export default function ChannelPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toggleSubscribe, isSubscribed } = useUser();

  const [channelData, setChannelData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('videos');

  useEffect(() => {
    window.scrollTo(0, 0);
    setLoading(true);
    fetch(`/api/channel/${encodeURIComponent(id)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.channel) {
          setChannelData(data);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-4 lg:p-6 space-y-6 animate-pulse">
        <div className="w-full h-40 bg-zinc-800 rounded-3xl" />
        <div className="flex gap-4 items-center">
          <div className="w-20 h-20 bg-zinc-800 rounded-full" />
          <div className="space-y-2 flex-1">
            <div className="h-6 bg-zinc-800 rounded w-1/3" />
            <div className="h-4 bg-zinc-800 rounded w-1/4" />
          </div>
        </div>
      </div>
    );
  }

  const channel = channelData?.channel || {
    name: id,
    handle: `@${id}`,
    subscribers: '1M subscribers',
    description: 'Welcome to the official channel.'
  };
  const tabs = channelData?.tabs || { videos: [], shorts: [], playlists: [] };
  const subscribed = isSubscribed(channel.name || channel.id || id);

  return (
    <div className="max-w-6xl mx-auto p-4 lg:p-6 space-y-6 pb-20 md:pb-10">
      {/* Banner */}
      <div className="w-full h-36 sm:h-52 bg-gradient-to-r from-zinc-800 via-red-950/40 to-zinc-900 rounded-3xl overflow-hidden relative shadow-lg border border-zinc-800">
        {channel.banner && (
          <img src={channel.banner} alt="Banner" className="w-full h-full object-cover" />
        )}
      </div>

      {/* Channel Profile Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-2">
        <div className="flex items-center gap-4">
          <img
            src={
              channel.avatar ||
              `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(channel.name)}&backgroundColor=b91c1c`
            }
            alt={channel.name}
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-zinc-800 border-2 border-zinc-700 object-cover shadow-lg"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-zinc-100">{channel.name}</h1>
              <CheckCircle2 className="w-5 h-5 text-zinc-400" />
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              {channel.handle} • {channel.subscribers} • {channel.videosCount || `${tabs.videos?.length || 0} videos`}
            </p>
            {channel.description && (
              <p className="text-xs text-zinc-400 line-clamp-1 mt-1 max-w-xl">{channel.description}</p>
            )}
          </div>
        </div>

        <button
          onClick={() =>
            toggleSubscribe({
              channelId: channel.id || id,
              name: channel.name,
              avatar: channel.avatar
            })
          }
          className={`px-5 py-2.5 rounded-full text-sm font-semibold transition shadow ${
            subscribed ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-white text-black hover:bg-zinc-200'
          }`}
        >
          {subscribed ? 'Subscribed' : 'Subscribe'}
        </button>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-4 border-b border-zinc-800 px-2 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('videos')}
          className={`flex items-center gap-2 pb-3 transition ${
            activeTab === 'videos' ? 'border-b-2 border-white text-white' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Video className="w-4 h-4" />
          <span>Videos</span>
        </button>
        <button
          onClick={() => setActiveTab('shorts')}
          className={`flex items-center gap-2 pb-3 transition ${
            activeTab === 'shorts' ? 'border-b-2 border-white text-white' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Film className="w-4 h-4" />
          <span>Shorts</span>
        </button>
        <button
          onClick={() => setActiveTab('playlists')}
          className={`flex items-center gap-2 pb-3 transition ${
            activeTab === 'playlists' ? 'border-b-2 border-white text-white' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <ListMusic className="w-4 h-4" />
          <span>Playlists</span>
        </button>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'videos' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-7">
            {tabs.videos?.map((video, idx) => (
              <VideoCard key={`${video.id}-${idx}`} video={video} />
            ))}
          </div>
        )}

        {activeTab === 'shorts' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {tabs.shorts?.map((s, idx) => (
              <div
                key={`${s.id}-${idx}`}
                onClick={() => navigate(`/shorts/${s.id}`)}
                className="group cursor-pointer flex flex-col gap-2"
              >
                <div className="aspect-[9/16] rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800 relative">
                  <img
                    src={s.thumbnail || `https://i.ytimg.com/vi/${s.id}/hqdefault.jpg`}
                    alt={s.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition"
                  />
                  <div className="absolute bottom-2 left-2 bg-black/80 px-2 py-0.5 rounded text-[10px] text-white">
                    {s.views || 'Short'}
                  </div>
                </div>
                <p className="text-xs font-semibold text-zinc-100 line-clamp-2 leading-tight group-hover:text-red-400">
                  {s.title}
                </p>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'playlists' && (
          <div className="py-16 text-center text-zinc-500 text-sm">
            No public playlists found for this channel.
          </div>
        )}
      </div>
    </div>
  );
}
