/**
 * channelRoutes.js - Express router for /api/channel/:id
 */

import { Router } from 'express';
import innertubeService from '../services/innertubeService.js';

const router = Router();

// GET /api/channel/:id?tab={tab}
router.get('/channel/:id', async (req, res) => {
  try {
    const channelId = req.params.id;
    const tab = req.query.tab || 'videos';

    if (!channelId) {
      return res.status(400).json({
        success: false,
        error: 'Missing channel ID or handle'
      });
    }

    const data = await innertubeService.getChannel(channelId, tab);
    if (!data || !data.channel) {
      return res.status(404).json({
        success: false,
        error: 'Channel not found'
      });
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      channel: null,
      tabs: { videos: [], shorts: [], playlists: [] }
    });
  }
});

export default router;
