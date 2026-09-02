import React, { useState, useEffect, useRef } from 'react';
import { Search, Menu, X, Play, ArrowLeft } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { extractVideoId } from '../../utils/formatters.js';

export default function Navbar({ toggleSidebar, sidebarOpen }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const [mobileSearch, setMobileSearch] = useState(false);
  const searchRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const q = params.get('q');
    if (q) setSearchQuery(q);
  }, [location]);

  useEffect(() => {
    if (!searchQuery.trim() || extractVideoId(searchQuery)) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/suggestions?q=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        if (data.suggestions) {
          setSuggestions(data.suggestions);
        }
      } catch (e) {}
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (query) => {
    const q = query || searchQuery;
    if (!q.trim()) return;
    setShowSuggestions(false);

    const directId = extractVideoId(q);
    if (directId) {
      navigate(`/watch/${directId}`);
      return;
    }

    navigate(`/search?q=${encodeURIComponent(q.trim())}`);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIdx >= 0 && suggestions[selectedIdx]) {
        setSearchQuery(suggestions[selectedIdx]);
        handleSearch(suggestions[selectedIdx]);
      } else {
        handleSearch();
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between px-4 h-14 bg-[#0f0f0f] border-b border-[#272727]">
      {/* Left Section: Hamburger & Branding */}
      <div className="flex items-center gap-4">
        <button
          onClick={toggleSidebar}
          className="p-2 hover:bg-[#272727] rounded-full transition text-[#f1f1f1]"
          title="Toggle Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div
          onClick={() => navigate('/')}
          className="flex items-center gap-2 cursor-pointer select-none group"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-red-600 to-red-500 flex items-center justify-center shadow-lg shadow-red-600/30 group-hover:scale-105 transition-transform">
            <Play className="w-4 h-4 fill-white text-white ml-0.5" />
          </div>
          <div className="flex items-center">
            <span className="font-bold text-lg tracking-tight text-white">
              Rahul<span className="text-red-500">Tube</span>
            </span>
            <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-400 bg-zinc-800/80 px-1.5 py-0.5 rounded ml-1.5 border border-zinc-700/50">
              LIVE
            </span>
          </div>
        </div>
      </div>

      {/* Middle Section: Search Input with Autocomplete and Clear button */}
      <div className="flex-1 max-w-2xl mx-4 hidden md:flex items-center justify-center relative" ref={searchRef}>
        <div className="flex w-full max-w-xl">
          <div className="relative flex-1 flex items-center">
            <input
              type="text"
              placeholder="Search any YouTube video, paste link (URL) or channel..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSuggestions(true);
                setSelectedIdx(-1);
              }}
              onFocus={() => setShowSuggestions(true)}
              onKeyDown={handleKeyDown}
              className="w-full bg-[#121212] text-[#f1f1f1] placeholder-zinc-500 text-sm rounded-l-full px-4 py-2 border border-[#303030] focus:border-red-500 focus:outline-none transition"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSuggestions([]);
                }}
                className="absolute right-3 text-zinc-400 hover:text-white"
                title="Clear input"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            onClick={() => handleSearch()}
            className="bg-[#222222] hover:bg-[#2a2a2a] text-zinc-300 px-5 rounded-r-full border border-l-0 border-[#303030] flex items-center justify-center transition"
            title="Search YouTube"
          >
            <Search className="w-4 h-4" />
          </button>
        </div>

        {/* Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1.5 max-w-xl mx-auto bg-[#212121] border border-[#383838] rounded-2xl shadow-2xl overflow-hidden z-50 py-2">
            {suggestions.map((item, idx) => (
              <div
                key={idx}
                onMouseDown={() => {
                  setSearchQuery(item);
                  handleSearch(item);
                }}
                className={`flex items-center gap-3 px-4 py-2.5 text-sm cursor-pointer transition ${
                  selectedIdx === idx ? 'bg-[#383838] text-white' : 'text-zinc-200 hover:bg-[#2d2d2d]'
                }`}
              >
                <Search className="w-4 h-4 text-zinc-400 shrink-0" />
                <span className="truncate font-medium">{item}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right Section: Status Indicator & User Avatar */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setMobileSearch(true)}
          className="md:hidden p-2 hover:bg-[#272727] rounded-full text-zinc-200"
          title="Search"
        >
          <Search className="w-5 h-5" />
        </button>

        <div className="hidden sm:flex items-center gap-1.5 bg-emerald-950/40 text-emerald-400 border border-emerald-800/40 px-3 py-1 rounded-full text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Real-Time Engine Active</span>
        </div>

        <div
          onClick={() => navigate('/history')}
          className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-red-600 flex items-center justify-center text-white font-bold text-xs cursor-pointer shadow hover:opacity-90"
          title="RahulTube User Library"
        >
          R
        </div>
      </div>

      {/* Mobile Search Overlay */}
      {mobileSearch && (
        <div className="fixed inset-0 bg-[#0f0f0f] z-50 p-3 flex flex-col">
          <div className="flex items-center gap-2">
            <button onClick={() => setMobileSearch(false)} className="p-2 text-zinc-200">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <input
              type="text"
              autoFocus
              placeholder="Search or paste YouTube URL..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setMobileSearch(false);
                  handleSearch();
                }
              }}
              className="flex-1 bg-[#222222] text-white px-4 py-2 rounded-full border border-[#383838] focus:outline-none"
            />
            <button
              onClick={() => {
                setMobileSearch(false);
                handleSearch();
              }}
              className="bg-red-600 text-white px-4 py-2 rounded-full text-sm font-medium"
            >
              Go
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
