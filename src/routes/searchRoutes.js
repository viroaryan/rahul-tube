/**
 * searchRoutes.js - Express router for /api/search and /api/suggestions
 */

import { Router } from 'express';
import innertubeService from '../services/innertubeService.js';
import { extractVideoId } from '../services/scraperParser.js';

const router = Router();

// GET /api/search?q={query}&continuation={token}
router.get('/search', async (req, res) => {
  try {
    const query = req.query.q || '';
    const continuation = req.query.continuation || null;

    // Detect if input is a direct YouTube URL or raw 11-char video ID
    const directVideoId = extractVideoId(query);
    if (directVideoId && !continuation) {
      return res.json({
        success: true,
        isDirectVideo: true,
        videoId: directVideoId,
        videos: [],
        continuationToken: null,
        total: 1
      });
    }

    const data = await innertubeService.search(query || 'trending', continuation);
    res.json({
      success: true,
      isDirectVideo: false,
      videoId: null,
      ...data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      videos: [],
      continuationToken: null,
      total: 0
    });
  }
});

// GET /api/suggestions?q={query}
router.get('/suggestions', async (req, res) => {
  try {
    const query = req.query.q || '';
    const data = await innertubeService.getSuggestions(query);
    res.json(data);
  } catch (error) {
    res.json({ suggestions: [] });
  }
});

export default router;
