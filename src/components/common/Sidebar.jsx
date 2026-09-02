import React from 'react';
import {
  Home,
  Flame,
  Film,
  Music2,
  Gamepad2,
  Newspaper,
  Radio,
  History,
  ThumbsUp,
  Compass,
  Cpu,
  Trophy,
  Laugh,
  ShieldCheck,
  X
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function Sidebar({ isOpen, onClose, activeCategory, onSelectCategory }) {
  const navigate = useNavigate();
  const location = useLocation();

  const mainLinks = [
    { label: 'Home', icon: Home, path: '/', category: 'All' },
    { label: 'Shorts', icon: Film, path: '/shorts' },
    { label: 'Trending', icon: Flame, path: '/trending', category: 'Trending' },
    { label: 'Liked Videos', icon: ThumbsUp, path: '/liked' },
    { label: 'History', icon: History, path: '/history' },
    { label: 'Subscriptions', icon: Radio, path: '/subscriptions' }
  ];

  const exploreLinks = [
    { label: 'Music', icon: Music2, category: 'Music' },
    { label: 'Gaming', icon: Gamepad2, category: 'Gaming' },
    { label: 'Tech & AI', icon: Cpu, category: 'Tech' },
    { label: 'News', icon: Newspaper, category: 'News' },
    { label: 'Cricket & Sports', icon: Trophy, category: 'Cricket' },
    { label: 'Coding', icon: Compass, category: 'Coding' },
    { label: 'Comedy', icon: Laugh, category: 'Comedy' }
  ];

  const handleNav = (item) => {
    if (onClose) onClose();

    if (item.path) {
      if (item.category && location.pathname === '/') {
        onSelectCategory?.(item.category);
      }
      navigate(item.path);
    } else if (item.category) {
      navigate('/');
      onSelectCategory?.(item.category);
    }
  };

  // Mini Collapsed Sidebar (desktop view)
  if (!isOpen) {
    return (
      <aside className="w-18 shrink-0 bg-[#0f0f0f] border-r border-[#272727] py-3 hidden md:flex flex-col items-center gap-6 select-none h-[calc(100vh-3.5rem)] sticky top-14">
        {mainLinks.slice(0, 5).map((item, idx) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <button
              key={idx}
              onClick={() => handleNav(item)}
              className={`flex flex-col items-center gap-1.5 p-2 rounded-xl w-14 hover:bg-[#272727] transition ${
                isActive ? 'text-red-500 font-semibold' : 'text-zinc-400 hover:text-white'
              }`}
              title={item.label}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] text-center leading-tight truncate w-full">{item.label}</span>
            </button>
          );
        })}
      </aside>
    );
  }

  // Expanded Sidebar
  return (
    <>
      {/* Mobile Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 z-40 md:hidden animate-in fade-in"
      />

      <aside className="fixed md:sticky top-14 left-0 bottom-0 z-40 w-60 shrink-0 bg-[#0f0f0f] border-r border-[#272727] p-3 flex flex-col justify-between overflow-y-auto h-[calc(100vh-3.5rem)] select-none shadow-2xl md:shadow-none animate-in slide-in-from-left duration-200">
        <div className="space-y-6">
          {/* Main Navigation Links */}
          <div className="space-y-1">
            {mainLinks.map((item, idx) => {
              const Icon = item.icon;
              const isActive =
                location.pathname === item.path && (!item.category || activeCategory === item.category);
              return (
                <button
                  key={idx}
                  onClick={() => handleNav(item)}
                  className={`flex items-center gap-4 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                    isActive
                      ? 'bg-[#272727] text-white font-semibold'
                      : 'text-zinc-300 hover:bg-[#222222] hover:text-white'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-red-500' : 'text-zinc-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          <hr className="border-[#272727]" />

          {/* Explore Categories */}
          <div>
            <h3 className="px-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
              Explore
            </h3>
            <div className="space-y-1">
              {exploreLinks.map((item, idx) => {
                const Icon = item.icon;
                const isActive = location.pathname === '/' && activeCategory === item.category;
                return (
                  <button
                    key={idx}
                    onClick={() => handleNav(item)}
                    className={`flex items-center gap-4 w-full px-3 py-2.5 rounded-xl text-sm transition ${
                      isActive
                        ? 'bg-[#272727] text-white font-semibold'
                        : 'text-zinc-300 hover:bg-[#222222] hover:text-white'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? 'text-red-500' : 'text-zinc-400'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer & Privacy Badge */}
        <div className="pt-4 mt-6 border-t border-[#272727] space-y-2">
          <div className="flex items-center gap-2 text-xs text-zinc-400 bg-[#161616] p-2.5 rounded-xl border border-[#272727]">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <p className="font-medium text-zinc-200">Privacy Guard</p>
              <p className="text-[11px] text-zinc-400">No tracking, zero ads</p>
            </div>
          </div>
          <p className="text-[11px] text-zinc-500 px-1">&copy; 2026 RahulTube Player</p>
        </div>
      </aside>
    </>
  );
}
