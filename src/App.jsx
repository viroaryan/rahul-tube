import React, { useState } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/common/Navbar.jsx';
import Sidebar from './components/common/Sidebar.jsx';
import MobileBottomNav from './components/common/MobileBottomNav.jsx';
import GlobalPlayer from './components/player/GlobalPlayer.jsx';

import HomePage from './pages/HomePage.jsx';
import WatchPage from './pages/WatchPage.jsx';
import ShortsPage from './pages/ShortsPage.jsx';
import SearchPage from './pages/SearchPage.jsx';
import ChannelPage from './pages/ChannelPage.jsx';
import HistoryPage from './pages/HistoryPage.jsx';
import LikedPage from './pages/LikedPage.jsx';
import SubscriptionsPage from './pages/SubscriptionsPage.jsx';

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();

  const isWatchPage = location.pathname.startsWith('/watch/');
  const isShortsPage = location.pathname.startsWith('/shorts');

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-[#f1f1f1] flex flex-col font-sans selection:bg-red-600 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        toggleSidebar={() => setSidebarOpen((prev) => !prev)}
        sidebarOpen={sidebarOpen}
      />

      {/* Main Body */}
      <div className="flex flex-1 relative">
        {/* Sidebar (Desktop and Mobile Drawer) */}
        {!isWatchPage && (
          <Sidebar
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />
        )}

        {/* Content Area */}
        <main className="flex-1 min-w-0 overflow-y-auto min-h-[calc(100vh-3.5rem)]">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/trending" element={<HomePage />} />
            <Route path="/shorts" element={<ShortsPage />} />
            <Route path="/shorts/:id" element={<ShortsPage />} />
            <Route path="/watch/:id" element={<WatchPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/channel/:id" element={<ChannelPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/liked" element={<LikedPage />} />
            <Route path="/subscriptions" element={<SubscriptionsPage />} />
          </Routes>
        </main>
      </div>

      {/* Persistent Global Player (Mini-Player / PiP / Audio-Only) */}
      <GlobalPlayer />

      {/* Native Mobile Bottom Navigation Bar (< 768px) */}
      {!isWatchPage && <MobileBottomNav />}
    </div>
  );
}
