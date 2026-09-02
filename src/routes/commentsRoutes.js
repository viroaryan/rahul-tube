/**
 * commentsRoutes.js - Express router for /api/comments/:id
 */

import { Router } from 'express';
import innertubeService from '../services/innertubeService.js';
import { extractVideoId } from '../services/scraperParser.js';

const router = Router();

// GET /api/comments/:id?continuation={token}
router.get('/comments/:id', async (req, res) => {
  try {
    const rawId = req.params.id;
    const videoId = extractVideoId(rawId) || rawId;
    const continuation = req.query.continuation || null;

    if (!videoId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid video ID format'
      });
    }

    const data = await innertubeService.getComments(videoId, continuation);
    res.json(data);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      commentCount: 0,
      comments: [],
      continuationToken: null
    });
  }
});

export default router;
