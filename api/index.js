/**
 * api/index.js - Vercel Serverless Function Handler
 * Mounts all RahulTube modular API routes for serverless execution on Vercel.
 */

import express from 'express';
import cors from 'cors';

// Import all modular route handlers
import searchRoutes from '../src/routes/searchRoutes.js';
import videoRoutes from '../src/routes/videoRoutes.js';
import commentsRoutes from '../src/routes/commentsRoutes.js';
import shortsRoutes from '../src/routes/shortsRoutes.js';
import channelRoutes from '../src/routes/channelRoutes.js';
import trendingRoutes from '../src/routes/trendingRoutes.js';
import recommendationsRoutes from '../src/routes/recommendationsRoutes.js';
import streamRoutes from '../src/routes/streamRoutes.js';

const app = express();

// CORS and Body Parsers
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Range', 'Accept']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get(['/api/health', '/health'], (req, res) => {
  res.json({
    status: 'ok',
    service: 'RahulTube Vercel Serverless API',
    timestamp: new Date().toISOString()
  });
});

// Mount on /api prefix
app.use('/api', searchRoutes);
app.use('/api', videoRoutes);
app.use('/api', commentsRoutes);
app.use('/api', shortsRoutes);
app.use('/api', channelRoutes);
app.use('/api', trendingRoutes);
app.use('/api', recommendationsRoutes);
app.use('/api', streamRoutes);

// Mount on root prefix for direct route matching
app.use('/', searchRoutes);
app.use('/', videoRoutes);
app.use('/', commentsRoutes);
app.use('/', shortsRoutes);
app.use('/', channelRoutes);
app.use('/', trendingRoutes);
app.use('/', recommendationsRoutes);
app.use('/', streamRoutes);

// Error Handler
app.use((err, req, res, next) => {
  console.error('[Vercel API Error]', err.stack || err.message);
  if (!res.headersSent) {
    res.status(err.status || 500).json({
      success: false,
      error: err.message || 'Internal Serverless Error'
    });
  }
});

export default app;
