import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const CATEGORIES = [
  'All',
  'Trending',
  'Music',
  'Gaming',
  'Tech',
  'Cricket',
  'Coding',
  'News',
  'Podcasts',
  'Lo-Fi',
  'Comedy'
];

export default function CategoryPills({ selected = 'All', onSelect }) {
  const scrollRef = useRef(null);

  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -250 : 250;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <div className="relative group/carousel select-none sticky top-14 z-30 bg-[#0f0f0f]/95 backdrop-blur-md py-3 px-1">
      {/* Left Scroll Button */}
      <button
        onClick={() => scroll('left')}
        className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-black/80 hover:bg-zinc-800 text-white items-center justify-center shadow-lg border border-zinc-700/60 opacity-0 group-hover/carousel:opacity-100 transition-opacity"
        title="Scroll left"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {/* Pills Container */}
      <div
        ref={scrollRef}
        className="flex items-center gap-2.5 overflow-x-auto no-scrollbar scroll-smooth px-1"
      >
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => onSelect?.(cat)}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              selected === cat
                ? 'bg-white text-black font-semibold shadow'
                : 'bg-[#222222] text-zinc-300 hover:bg-[#2e2e2e] hover:text-white'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Right Scroll Button */}
      <button
        onClick={() => scroll('right')}
        className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-black/80 hover:bg-zinc-800 text-white items-center justify-center shadow-lg border border-zinc-700/60 opacity-0 group-hover/carousel:opacity-100 transition-opacity"
        title="Scroll right"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
