/**
 * trendingRoutes.js - Express router for /api/trending
 */

import { Router } from 'express';
import innertubeService from '../services/innertubeService.js';

const router = Router();

// GET /api/trending?category={category}&continuation={token}
router.get('/trending', async (req, res) => {
  try {
    const category = req.query.category || 'All';
    const continuation = req.query.continuation || null;

    const data = await innertubeService.getTrending(category, continuation);
    res.json({
      success: true,
      category,
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

export default router;
