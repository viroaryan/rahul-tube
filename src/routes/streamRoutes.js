/**
 * streamRoutes.js - Express router for /api/stream/audio/:id and /api/stream/info/:id
 */

import { Router } from 'express';
import streamService from '../services/streamService.js';
import { extractVideoId } from '../services/scraperParser.js';

const router = Router();

// GET /api/stream/audio/:id - Streams audio chunk with Range header support
router.get('/stream/audio/:id', async (req, res) => {
  const rawId = req.params.id;
  const videoId = extractVideoId(rawId) || rawId;

  if (!videoId) {
    return res.status(400).json({
      success: false,
      error: 'Invalid video ID format'
    });
  }

  await streamService.proxyAudioStream(videoId, req, res);
});

// GET /api/stream/info/:id - Returns audio format stream metadata
router.get('/stream/info/:id', async (req, res) => {
  try {
    const rawId = req.params.id;
    const videoId = extractVideoId(rawId) || rawId;

    if (!videoId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid video ID format'
      });
    }

    const info = await streamService.getAudioStreamInfo(videoId);
    if (!info) {
      return res.status(404).json({
        success: false,
        error: 'No audio streams found for this video'
      });
    }

    res.json({
      success: true,
      audio: info
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
