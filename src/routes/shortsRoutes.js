/**
 * shortsRoutes.js - Express router for /api/shorts
 */

import { Router } from 'express';
import innertubeService from '../services/innertubeService.js';

const router = Router();

// GET /api/shorts?category={category}&continuation={token}
router.get('/shorts', async (req, res) => {
  try {
    const category = req.query.category || 'viral';
    const continuation = req.query.continuation || null;

    const data = await innertubeService.getShorts(category, continuation);
    res.json(data);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      shorts: [],
      continuationToken: null,
      total: 0
    });
  }
});

export default router;
