/**
 * recommendationEngine.js - Heuristic and affinity scoring recommendation engine for RahulTube
 */

import innertubeService from './innertubeService.js';
import memoryCache from './cacheService.js';

class RecommendationEngine {
  /**
   * Builds personalized recommendation shelves from user profile state.
   */
  async generateFeed(userProfile = {}) {
    const {
      history = [],
      liked = [],
      subscriptions = [],
      queryLog = []
    } = userProfile;

    const shelves = [];
    const collectedVideos = [];
    const seenIds = new Set();

    // Helper to add unique videos
    const addUnique = (videos = [], limit = 12) => {
      const result = [];
      for (const v of videos) {
        if (!v || !v.id || seenIds.has(v.id)) continue;
        seenIds.add(v.id);
        result.push(v);
        collectedVideos.push(v);
        if (result.length >= limit) break;
      }
      return result;
    };

    try {
      // 1. Shelf: "Recommended for You" (based on recent queries or top liked/history topic)
      let recQuery = 'trending popular';
      if (queryLog.length > 0) {
        const lastQuery = typeof queryLog[0] === 'string' ? queryLog[0] : (queryLog[0]?.query || '');
        if (lastQuery) recQuery = lastQuery;
      } else if (history.length > 0 && history[0]?.title) {
        recQuery = history[0].title.slice(0, 30);
      }

      const recVideos = await innertubeService.search(recQuery);
      const uniqueRec = addUnique(recVideos.videos, 12);
      if (uniqueRec.length > 0) {
        shelves.push({
          id: 'recommended_for_you',
          title: 'Recommended for You',
          videos: uniqueRec
        });
      }

      // 2. Shelf: "Because you watched [Title]" (if user has history)
      if (history.length > 0) {
        const sourceVideo = history[0];
        const sourceId = sourceVideo.id || sourceVideo.videoId;
        const sourceTitle = sourceVideo.title || 'recent video';

        if (sourceId) {
          const videoDetails = await innertubeService.getVideoDetails(sourceId);
          const relatedVideos = videoDetails?.related || [];
          const uniqueRelated = addUnique(relatedVideos, 10);

          if (uniqueRelated.length > 0) {
            shelves.push({
              id: 'because_you_watched',
              title: `Because you watched ${sourceTitle.slice(0, 35)}...`,
              sourceVideoId: sourceId,
              videos: uniqueRelated
            });
          }
        }
      }

      // 3. Shelf: "From your subscriptions" (if user has subscriptions)
      if (subscriptions.length > 0) {
        const sub = subscriptions[0];
        const subName = typeof sub === 'string' ? sub : (sub.name || '');
        if (subName) {
          const subVideos = await innertubeService.search(`${subName} new uploads`);
          const uniqueSub = addUnique(subVideos.videos, 10);
          if (uniqueSub.length > 0) {
            shelves.push({
              id: 'from_subscriptions',
              title: `From your subscriptions: ${subName}`,
              videos: uniqueSub
            });
          }
        }
      }

      // 4. Shelf: "Trending Now" (global popular videos)
      const trendingData = await innertubeService.getTrending('All');
      const uniqueTrending = addUnique(trendingData.videos, 12);
      if (uniqueTrending.length > 0) {
        shelves.push({
          id: 'trending_now',
          title: 'Trending Now',
          videos: uniqueTrending
        });
      }

      // If no shelves were generated (cold start), fallback to trending + music + tech
      if (shelves.length === 0) {
        const defaultTrend = await innertubeService.getTrending('All');
        shelves.push({
          id: 'recommended_for_you',
          title: 'Recommended for You',
          videos: defaultTrend.videos.slice(0, 16)
        });
      }

      return {
        success: true,
        shelves,
        flatFeed: collectedVideos
      };
    } catch (error) {
      console.error('[RecommendationEngine.generateFeed] Error:', error.message);
      // Fallback
      const fallbackTrending = await innertubeService.getTrending('All');
      return {
        success: true,
        shelves: [
          {
            id: 'recommended_for_you',
            title: 'Recommended for You',
            videos: fallbackTrending.videos.slice(0, 20)
          }
        ],
        flatFeed: fallbackTrending.videos.slice(0, 20)
      };
    }
  }
}

export const recommendationEngine = new RecommendationEngine();
export default recommendationEngine;
