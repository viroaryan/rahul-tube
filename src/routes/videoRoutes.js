/**
 * videoRoutes.js - Express router for /api/video/:id and /api/related/:id
 */

import { Router } from 'express';
import innertubeService from '../services/innertubeService.js';
import { extractVideoId } from '../services/scraperParser.js';

const router = Router();

// GET /api/video/:id
router.get('/video/:id', async (req, res) => {
  try {
    const rawId = req.params.id;
    const videoId = extractVideoId(rawId) || rawId;

    if (!videoId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid video ID or URL format'
      });
    }

    const data = await innertubeService.getVideoDetails(videoId);
    if (!data || !data.video) {
      return res.status(404).json({
        success: false,
        error: 'Video details not found'
      });
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/related/:id
router.get('/related/:id', async (req, res) => {
  try {
    const rawId = req.params.id;
    const videoId = extractVideoId(rawId) || rawId;

    if (!videoId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid video ID format'
      });
    }

    const data = await innertubeService.getVideoDetails(videoId);
    res.json({
      success: true,
      related: data?.related || []
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      related: []
    });
  }
});

export default router;
