/**
 * server.js - RahulTube Backend Server Entry Point
 * Mounts modular routers for InnerTube Scraping, Search, Video Details, Comments, Shorts, Channel, Recommendations, and Streaming.
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// Import modular routers
import searchRoutes from './src/routes/searchRoutes.js';
import videoRoutes from './src/routes/videoRoutes.js';
import commentsRoutes from './src/routes/commentsRoutes.js';
import shortsRoutes from './src/routes/shortsRoutes.js';
import channelRoutes from './src/routes/channelRoutes.js';
import trendingRoutes from './src/routes/trendingRoutes.js';
import recommendationsRoutes from './src/routes/recommendationsRoutes.js';
import streamRoutes from './src/routes/streamRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Range', 'Accept']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging in development
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.path.startsWith('/api')) {
      console.log(`[API] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    service: 'RahulTube InnerTube Backend Scraper API'
  });
});

// Mount Modular API Routers
app.use('/api', searchRoutes);
app.use('/api', videoRoutes);
app.use('/api', commentsRoutes);
app.use('/api', shortsRoutes);
app.use('/api', channelRoutes);
app.use('/api', trendingRoutes);
app.use('/api', recommendationsRoutes);
app.use('/api', streamRoutes);

// Static frontend serving
app.use(express.static(path.join(__dirname, 'dist')));

// SPA Fallback for client-side routing
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({
      success: false,
      error: `API route not found: ${req.method} ${req.path}`
    });
  }
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Global Error Handler Middleware
app.use((err, req, res, next) => {
  console.error('[Server Error]', err.stack || err.message);
  if (!res.headersSent) {
    res.status(err.status || 500).json({
      success: false,
      error: err.message || 'Internal Server Error'
    });
  }
});

// Start Server (if not running in Vercel Serverless environment)
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`===================================================`);
    console.log(`🚀 RahulTube Modular Backend Engine RUNNING on port ${PORT}`);
    console.log(`📡 Health Check: http://localhost:${PORT}/api/health`);
    console.log(`🔍 Search API:   http://localhost:${PORT}/api/search?q=trending`);
    console.log(`🎬 Video API:    http://localhost:${PORT}/api/video/:id`);
    console.log(`💬 Comments API: http://localhost:${PORT}/api/comments/:id`);
    console.log(`⚡ Shorts API:   http://localhost:${PORT}/api/shorts`);
    console.log(`📺 Channel API:  http://localhost:${PORT}/api/channel/:id`);
    console.log(`🔥 Trending API: http://localhost:${PORT}/api/trending`);
    console.log(`🎧 Audio Stream: http://localhost:${PORT}/api/stream/audio/:id`);
    console.log(`===================================================`);
  });
}

export default app;
