import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Radio, CheckCircle2, UserMinus } from 'lucide-react';
import { useUser } from '../context/UserContext.jsx';

export default function SubscriptionsPage() {
  const { subscriptions, toggleSubscribe } = useUser();
  const navigate = useNavigate();

  const handleChannelClick = (channel) => {
    if (typeof channel === 'string') {
      navigate(`/search?q=${encodeURIComponent(channel)}`);
    } else if (channel.channelId) {
      navigate(`/channel/${channel.channelId}`);
    } else if (channel.name) {
      navigate(`/search?q=${encodeURIComponent(channel.name)}`);
    }
  };

  const getChannelName = (channel) => {
    if (typeof channel === 'string') return channel;
    return channel.name || channel.channelId || 'Channel';
  };

  const getChannelAvatar = (channel) => {
    if (typeof channel === 'object' && channel.avatar) return channel.avatar;
    const name = getChannelName(channel);
    return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=b91c1c`;
  };

  return (
    <div className="max-w-4xl mx-auto p-4 lg:p-6 space-y-6 pb-20 md:pb-10">
      {/* Header Bar */}
      <div className="flex items-center gap-3 border-b border-zinc-800 pb-4">
        <div className="w-10 h-10 rounded-xl bg-red-600/20 text-red-500 flex items-center justify-center">
          <Radio className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Subscriptions</h1>
          <p className="text-xs text-zinc-400">{subscriptions.length} channels followed</p>
        </div>
      </div>

      {/* Content */}
      {subscriptions.length === 0 ? (
        <div className="text-center py-20 space-y-3">
          <Radio className="w-12 h-12 text-zinc-600 mx-auto" />
          <h3 className="text-base font-semibold text-zinc-300">No subscriptions yet</h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            Subscribe to your favorite creators on RahulTube to see them listed here.
          </p>
          <button
            onClick={() => navigate('/')}
            className="mt-2 bg-red-600 text-white px-5 py-2 rounded-full text-xs font-semibold hover:bg-red-500 transition shadow"
          >
            Explore Channels
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {subscriptions.map((channel, idx) => {
            const channelName = getChannelName(channel);
            const avatarUrl = getChannelAvatar(channel);

            return (
              <div
                key={idx}
                className="flex items-center justify-between bg-[#181818] p-4 rounded-2xl border border-zinc-800 hover:border-zinc-700 transition"
              >
                <div
                  onClick={() => handleChannelClick(channel)}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  <img
                    src={avatarUrl}
                    alt={channelName}
                    className="w-12 h-12 rounded-full bg-zinc-800 border border-zinc-700 object-cover"
                  />
                  <div>
                    <div className="flex items-center gap-1.5 font-bold text-sm text-zinc-100 hover:text-red-400 transition">
                      <span>{channelName}</span>
                      <CheckCircle2 className="w-4 h-4 text-zinc-400" />
                    </div>
                    <p className="text-xs text-zinc-400">Subscribed</p>
                  </div>
                </div>

                <button
                  onClick={() => toggleSubscribe(channel)}
                  className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-red-400 bg-zinc-800 hover:bg-zinc-700 px-3.5 py-1.5 rounded-full transition border border-zinc-700/60"
                  title="Unsubscribe from channel"
                >
                  <UserMinus className="w-3.5 h-3.5" />
                  <span>Unsubscribe</span>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
