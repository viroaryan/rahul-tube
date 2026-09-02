import React from 'react';
import { Home, Film, Radio, History } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function MobileBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const items = [
    { label: 'Home', icon: Home, path: '/' },
    { label: 'Shorts', icon: Film, path: '/shorts' },
    { label: 'Subscriptions', icon: Radio, path: '/subscriptions' },
    { label: 'You', icon: History, path: '/history' }
  ];

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-[#0f0f0f]/95 backdrop-blur-md border-t border-[#272727] h-14 flex items-center justify-around md:hidden select-none">
      {items.map((item, idx) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.path;
        return (
          <button
            key={idx}
            onClick={() => navigate(item.path)}
            className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition ${
              isActive ? 'text-red-500 font-bold' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] leading-tight">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
