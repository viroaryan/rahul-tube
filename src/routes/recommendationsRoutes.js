/**
 * recommendationsRoutes.js - Express router for /api/recommendations
 */

import { Router } from 'express';
import recommendationEngine from '../services/recommendationEngine.js';

const router = Router();

// POST /api/recommendations
router.post('/recommendations', async (req, res) => {
  try {
    const userProfile = req.body || {};
    const feed = await recommendationEngine.generateFeed(userProfile);
    res.json(feed);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      shelves: [],
      flatFeed: []
    });
  }
});

export default router;
