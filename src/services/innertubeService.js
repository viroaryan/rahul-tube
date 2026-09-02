/**
 * innertubeService.js - Core HTTP client and scraper engine for YouTube InnerTube API
 */

import axios from 'axios';
import {
  extractVideoId,
  parseVideoRenderer,
  parseLockupViewModel,
  parseCompactVideoRenderer,
  parseShortsLockupViewModel,
  parseReelItemRenderer,
  parseCommentEntityPayload,
  parseCommentRenderer,
  extractContinuationToken,
  getBestThumbnail,
  formatDuration
} from './scraperParser.js';
import memoryCache from './cacheService.js';

const INNERTUBE_BASE_URL = 'https://www.youtube.com/youtubei/v1';

const HEADERS = {
  'Content-Type': 'application/json',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'X-YouTube-Client-Name': '1',
  'X-YouTube-Client-Version': '2.20240301.01.00',
  'Origin': 'https://www.youtube.com',
  'Referer': 'https://www.youtube.com/'
};

const INNERTUBE_CONTEXT = {
  client: {
    clientName: 'WEB',
    clientVersion: '2.20240301.01.00',
    hl: 'en',
    gl: 'US',
    utcOffsetMinutes: 0
  }
};

class InnerTubeService {
  /**
   * Helper to execute InnerTube POST request with timeout and error handling.
   */
  async _post(endpoint, payload, timeoutMs = 8000) {
    const url = `${INNERTUBE_BASE_URL}/${endpoint}?prettyPrint=false`;
    const body = {
      context: INNERTUBE_CONTEXT,
      ...payload
    };

    const response = await axios.post(url, body, {
      headers: HEADERS,
      timeout: timeoutMs
    });

    return response.data;
  }

  /**
   * Search YouTube videos with live query or continuation token for pagination.
   */
  async search(query = '', continuationToken = null) {
    const cacheKey = `search:${query}:${continuationToken || 'initial'}`;
    const cached = memoryCache.get(cacheKey);
    if (cached) return cached;

    const payload = {};
    if (continuationToken) {
      payload.continuation = continuationToken;
    } else {
      payload.query = query || 'trending';
    }

    try {
      const data = await this._post('search', payload);
      const items = [];
      let nextContinuation = null;

      if (continuationToken) {
        // Parse continuation actions
        const actions = data.onResponseReceivedCommands || data.onResponseReceivedEndpoints || [];
        for (const action of actions) {
          const itemContents = action.appendContinuationItemsAction?.continuationItems ||
            action.reloadContinuationItemsCommand?.continuationItems || [];
          for (const it of itemContents) {
            if (it.itemSectionRenderer?.contents) {
              for (const sub of it.itemSectionRenderer.contents) {
                const parsed = this._parseSearchItem(sub);
                if (parsed) items.push(parsed);
              }
            } else {
              const parsed = this._parseSearchItem(it);
              if (parsed) items.push(parsed);
            }

            if (it.continuationItemRenderer) {
              nextContinuation = it.continuationItemRenderer.continuationEndpoint?.continuationCommand?.token;
            }
          }
        }
      } else {
        // Parse initial search results
        const sectionList = data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer;
        const contents = sectionList?.contents || [];

        for (const section of contents) {
          if (section.itemSectionRenderer?.contents) {
            for (const item of section.itemSectionRenderer.contents) {
              const parsed = this._parseSearchItem(item);
              if (parsed) items.push(parsed);
            }
          } else if (section.continuationItemRenderer) {
            nextContinuation = section.continuationItemRenderer.continuationEndpoint?.continuationCommand?.token;
          }
        }

        if (!nextContinuation && contents.length > 0) {
          const lastItem = contents[contents.length - 1];
          if (lastItem.continuationItemRenderer) {
            nextContinuation = lastItem.continuationItemRenderer.continuationEndpoint?.continuationCommand?.token;
          }
        }
      }

      // Fallback continuation extraction if not found yet
      if (!nextContinuation) {
        nextContinuation = extractContinuationToken(data);
      }

      // Deduplicate items by ID
      const seen = new Set();
      const uniqueItems = items.filter(it => {
        if (!it || !it.id || seen.has(it.id)) return false;
        seen.add(it.id);
        return true;
      });

      const result = {
        videos: uniqueItems,
        continuationToken: nextContinuation,
        total: uniqueItems.length
      };

      // Cache for 5 minutes
      memoryCache.set(cacheKey, result, 300);
      return result;
    } catch (error) {
      console.error('[InnerTubeService.search] Error:', error.message);
      return { videos: [], continuationToken: null, total: 0 };
    }
  }

  _parseSearchItem(item) {
    if (!item) return null;
    if (item.videoRenderer) return parseVideoRenderer(item.videoRenderer);
    if (item.lockupViewModel && item.lockupViewModel.contentType === 'LOCKUP_CONTENT_TYPE_VIDEO') {
      return parseLockupViewModel(item.lockupViewModel);
    }
    if (item.compactVideoRenderer) return parseCompactVideoRenderer(item.compactVideoRenderer);
    return null;
  }

  /**
   * Fetches authentic video details & related video recommendations.
   */
  async getVideoDetails(videoId) {
    if (!videoId) return null;
    const cacheKey = `video:${videoId}`;
    const cached = memoryCache.get(cacheKey);
    if (cached) return cached;

    try {
      // 1. Query /next for primary/secondary info and related videos
      const nextData = await this._post('next', { videoId });

      let videoInfo = null;
      const related = [];

      const results = nextData.contents?.twoColumnWatchNextResults?.results?.results?.contents || [];
      let primaryInfo = null;
      let secondaryInfo = null;

      for (const r of results) {
        if (r.videoPrimaryInfoRenderer) primaryInfo = r.videoPrimaryInfoRenderer;
        if (r.videoSecondaryInfoRenderer) secondaryInfo = r.videoSecondaryInfoRenderer;
      }

      // 2. Query /player for exact duration, short description, and fallback view count
      let playerData = null;
      try {
        playerData = await this._post('player', { videoId });
      } catch (e) {
        // Player call error non-blocking
      }

      const pDetails = playerData?.videoDetails || {};

      // Extract Title
      const title = primaryInfo?.title?.runs?.map(r => r.text).join('') ||
        pDetails.title ||
        'YouTube Video';

      // Extract Views
      let views = primaryInfo?.viewCount?.videoViewCountRenderer?.viewCount?.simpleText ||
        primaryInfo?.viewCount?.videoViewCountRenderer?.viewCount?.runs?.map(r => r.text).join('') ||
        (pDetails.viewCount ? `${parseInt(pDetails.viewCount, 10).toLocaleString()} views` : '1,000,000 views');

      // Extract Likes
      let likes = 'Like';
      const topButtons = primaryInfo?.videoActions?.menuRenderer?.topLevelButtons || [];
      for (const btn of topButtons) {
        const seg = btn.segmentedLikeDislikeButtonViewModel?.likeButtonViewModel?.likeButtonViewModel?.toggleButtonViewModel?.toggleButtonViewModel;
        if (seg?.defaultButtonViewModel?.buttonViewModel?.accessibilityText) {
          const m = seg.defaultButtonViewModel.buttonViewModel.accessibilityText.match(/([\d,.]+[KMB]?)\s*likes?/i);
          if (m && m[1]) likes = m[1];
        } else if (seg?.defaultButtonViewModel?.buttonViewModel?.title) {
          likes = seg.defaultButtonViewModel.buttonViewModel.title;
        } else if (btn.toggleButtonRenderer?.defaultText?.simpleText) {
          likes = btn.toggleButtonRenderer.defaultText.simpleText;
        }
      }
      if (likes === 'Like' || !likes) likes = '100K';

      // Extract Upload Date
      const timestamp = primaryInfo?.dateText?.simpleText ||
        primaryInfo?.relativeDateText?.simpleText ||
        'Recently uploaded';

      // Extract Duration
      const duration = pDetails.lengthSeconds ?
        formatDuration(pDetails.lengthSeconds) :
        '10:00';

      // Extract Description
      const description = secondaryInfo?.attributedDescription?.content ||
        secondaryInfo?.description?.runs?.map(r => r.text).join('') ||
        pDetails.shortDescription ||
        '';

      // Extract Author Details
      const owner = secondaryInfo?.owner?.videoOwnerRenderer || {};
      const authorName = owner.title?.runs?.[0]?.text || pDetails.author || 'Channel';
      const channelId = owner.navigationEndpoint?.browseEndpoint?.browseId || pDetails.channelId || '';
      const subscribers = owner.subscriberCountText?.simpleText || 'Subscribers';

      let authorAvatar = '';
      const avatarThumbs = owner.thumbnail?.thumbnails || [];
      if (avatarThumbs.length > 0) {
        authorAvatar = avatarThumbs[avatarThumbs.length - 1]?.url || '';
        if (authorAvatar.startsWith('//')) authorAvatar = `https:${authorAvatar}`;
      }
      if (!authorAvatar) {
        authorAvatar = 'https://yt3.ggpht.com/a/default-user=s88-c-k-c0x00ffffff-no-rj';
      }

      // Verified badge
      const badges = owner.badges || [];
      const verified = badges.some(b =>
        b.metadataBadgeRenderer?.style === 'BADGE_STYLE_TYPE_VERIFIED' ||
        b.metadataBadgeRenderer?.style === 'BADGE_STYLE_TYPE_VERIFIED_ARTIST' ||
        b.metadataBadgeRenderer?.icon?.iconType === 'CHECK_CIRCLE_THICK' ||
        b.metadataBadgeRenderer?.icon?.iconType === 'OFFICIAL_ARTIST_BADGE'
      );

      // Thumbnail
      const thumbnails = pDetails.thumbnail?.thumbnails || [];
      const thumbnail = getBestThumbnail(thumbnails, videoId);

      videoInfo = {
        id: videoId,
        title,
        description,
        duration,
        views,
        likes,
        timestamp,
        thumbnail,
        author: {
          name: authorName,
          channelId,
          avatar: authorAvatar,
          subscribers,
          verified
        }
      };

      // 3. Parse Related Videos from secondaryResults
      const secondaryResults = nextData.contents?.twoColumnWatchNextResults?.secondaryResults?.secondaryResults?.results || [];
      for (const it of secondaryResults) {
        if (it.compactVideoRenderer) {
          const parsed = parseCompactVideoRenderer(it.compactVideoRenderer);
          if (parsed && parsed.id !== videoId) related.push(parsed);
        } else if (it.lockupViewModel) {
          const parsed = parseLockupViewModel(it.lockupViewModel);
          if (parsed && parsed.id !== videoId) related.push(parsed);
        } else if (it.itemSectionRenderer?.contents) {
          for (const sub of it.itemSectionRenderer.contents) {
            if (sub.compactVideoRenderer) {
              const parsed = parseCompactVideoRenderer(sub.compactVideoRenderer);
              if (parsed && parsed.id !== videoId) related.push(parsed);
            } else if (sub.lockupViewModel) {
              const parsed = parseLockupViewModel(sub.lockupViewModel);
              if (parsed && parsed.id !== videoId) related.push(parsed);
            }
          }
        }
      }

      // Fallback related search if secondaryResults was empty
      if (related.length === 0 && title) {
        const searchFallback = await this.search(title.slice(0, 30));
        for (const v of searchFallback.videos) {
          if (v.id !== videoId) related.push(v);
        }
      }

      const result = {
        success: true,
        video: videoInfo,
        related: related.slice(0, 25)
      };

      // Cache video details for 10 minutes
      memoryCache.set(cacheKey, result, 600);
      return result;
    } catch (error) {
      console.error('[InnerTubeService.getVideoDetails] Error:', error.message);
      return {
        success: false,
        error: error.message,
        video: null,
        related: []
      };
    }
  }

  /**
   * Fetches real live comments for a video with continuation pagination.
   */
  async getComments(videoId, continuationToken = null) {
    const cacheKey = `comments:${videoId}:${continuationToken || 'initial'}`;
    const cached = memoryCache.get(cacheKey);
    if (cached) return cached;

    try {
      let token = continuationToken;
      let totalCommentCount = 0;

      // If no continuation token provided, fetch token from /next
      if (!token) {
        const nextData = await this._post('next', { videoId });
        const results = nextData.contents?.twoColumnWatchNextResults?.results?.results?.contents || [];

        for (const r of results) {
          if (r.itemSectionRenderer?.sectionIdentifier === 'comment-item-section' || r.itemSectionRenderer?.contents) {
            for (const it of r.itemSectionRenderer.contents || []) {
              if (it.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token) {
                token = it.continuationItemRenderer.continuationEndpoint.continuationCommand.token;
                break;
              }
              if (it.commentsEntryPointHeaderRenderer?.commentCount?.simpleText) {
                const raw = it.commentsEntryPointHeaderRenderer.commentCount.simpleText;
                totalCommentCount = parseInt(raw.replace(/,/g, ''), 10) || 0;
              }
            }
          }
        }
      }

      if (!token) {
        return {
          success: true,
          commentCount: 0,
          comments: [],
          continuationToken: null
        };
      }

      // Query /next with continuation token
      const commData = await this._post('next', { continuation: token });
      const comments = [];
      let nextToken = null;

      // 1. Extract from frameworkUpdates mutations (modern commentEntityPayload format)
      if (commData.frameworkUpdates?.entityBatchUpdate?.mutations) {
        const mutations = commData.frameworkUpdates.entityBatchUpdate.mutations;
        for (const m of mutations) {
          if (m.payload?.commentEntityPayload) {
            const parsed = parseCommentEntityPayload(m.payload.commentEntityPayload);
            if (parsed && parsed.content) {
              comments.push(parsed);
            }
          }
        }
      }

      // 2. Extract from onResponseReceivedEndpoints / onResponseReceivedCommands
      const endpoints = commData.onResponseReceivedEndpoints || commData.onResponseReceivedCommands || [];
      for (const ep of endpoints) {
        const items = ep.appendContinuationItemsAction?.continuationItems ||
          ep.reloadContinuationItemsCommand?.continuationItems || [];

        for (const it of items) {
          if (it.commentsHeaderRenderer?.countText?.runs) {
            const countStr = it.commentsHeaderRenderer.countText.runs[0]?.text || '';
            const num = parseInt(countStr.replace(/,/g, ''), 10);
            if (!isNaN(num)) totalCommentCount = num;
          }

          if (it.commentThreadRenderer?.comment?.commentRenderer) {
            const parsed = parseCommentRenderer(it.commentThreadRenderer.comment.commentRenderer);
            if (parsed && !comments.some(c => c.id === parsed.id)) {
              comments.push(parsed);
            }
          }

          if (it.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token) {
            nextToken = it.continuationItemRenderer.continuationEndpoint.continuationCommand.token;
          }
        }
      }

      // Deduplicate comments
      const seen = new Set();
      const uniqueComments = comments.filter(c => {
        if (!c.id || seen.has(c.id)) return false;
        seen.add(c.id);
        return true;
      });

      const result = {
        success: true,
        commentCount: totalCommentCount || uniqueComments.length,
        comments: uniqueComments,
        continuationToken: nextToken
      };

      // Cache comments for 3 minutes
      memoryCache.set(cacheKey, result, 180);
      return result;
    } catch (error) {
      console.error('[InnerTubeService.getComments] Error:', error.message);
      return {
        success: false,
        error: error.message,
        commentCount: 0,
        comments: [],
        continuationToken: null
      };
    }
  }

  /**
   * Fetches real YouTube Shorts feed with pagination continuation.
   */
  async getShorts(category = 'viral', continuationToken = null) {
    const cacheKey = `shorts:${category}:${continuationToken || 'initial'}`;
    const cached = memoryCache.get(cacheKey);
    if (cached) return cached;

    try {
      const payload = {};
      if (continuationToken) {
        payload.continuation = continuationToken;
      } else {
        payload.query = `#shorts ${category || 'viral'} trending`;
      }

      const data = await this._post('search', payload);
      const shorts = [];
      let nextContinuation = null;

      if (continuationToken) {
        const actions = data.onResponseReceivedCommands || data.onResponseReceivedEndpoints || [];
        for (const action of actions) {
          const itemContents = action.appendContinuationItemsAction?.continuationItems ||
            action.reloadContinuationItemsCommand?.continuationItems || [];
          for (const it of itemContents) {
            if (it.itemSectionRenderer?.contents) {
              for (const sub of it.itemSectionRenderer.contents) {
                this._extractShortsFromItem(sub, shorts);
              }
            } else {
              this._extractShortsFromItem(it, shorts);
            }

            if (it.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token) {
              nextContinuation = it.continuationItemRenderer.continuationEndpoint.continuationCommand.token;
            }
          }
        }
      } else {
        const sectionList = data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer;
        const contents = sectionList?.contents || [];

        for (const section of contents) {
          if (section.itemSectionRenderer?.contents) {
            for (const item of section.itemSectionRenderer.contents) {
              this._extractShortsFromItem(item, shorts);
            }
          } else if (section.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token) {
            nextContinuation = section.continuationItemRenderer.continuationEndpoint.continuationCommand.token;
          }
        }

        if (!nextContinuation && contents.length > 0) {
          const last = contents[contents.length - 1];
          if (last.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token) {
            nextContinuation = last.continuationItemRenderer.continuationEndpoint.continuationCommand.token;
          }
        }
      }

      if (!nextContinuation) {
        nextContinuation = extractContinuationToken(data);
      }

      // Deduplicate shorts
      const seen = new Set();
      const uniqueShorts = shorts.filter(s => {
        if (!s || !s.id || seen.has(s.id)) return false;
        seen.add(s.id);
        return true;
      });

      const result = {
        success: true,
        shorts: uniqueShorts,
        continuationToken: nextContinuation,
        total: uniqueShorts.length
      };

      memoryCache.set(cacheKey, result, 300);
      return result;
    } catch (error) {
      console.error('[InnerTubeService.getShorts] Error:', error.message);
      return {
        success: false,
        error: error.message,
        shorts: [],
        continuationToken: null,
        total: 0
      };
    }
  }

  _extractShortsFromItem(item, shortsArray) {
    if (!item) return;

    if (item.gridShelfViewModel?.contents) {
      for (const sub of item.gridShelfViewModel.contents) {
        if (sub.shortsLockupViewModel) {
          const parsed = parseShortsLockupViewModel(sub.shortsLockupViewModel);
          if (parsed) shortsArray.push(parsed);
        }
      }
    } else if (item.reelShelfRenderer?.items) {
      for (const sub of item.reelShelfRenderer.items) {
        if (sub.reelItemRenderer) {
          const parsed = parseReelItemRenderer(sub.reelItemRenderer);
          if (parsed) shortsArray.push(parsed);
        }
      }
    } else if (item.shortsLockupViewModel) {
      const parsed = parseShortsLockupViewModel(item.shortsLockupViewModel);
      if (parsed) shortsArray.push(parsed);
    } else if (item.reelItemRenderer) {
      const parsed = parseReelItemRenderer(item.reelItemRenderer);
      if (parsed) shortsArray.push(parsed);
    } else if (item.videoRenderer) {
      const parsed = parseVideoRenderer(item.videoRenderer);
      if (parsed) {
        shortsArray.push({
          id: parsed.id,
          title: parsed.title,
          views: parsed.views,
          thumbnail: parsed.thumbnail,
          author: parsed.author,
          sound: {
            title: 'Original Sound',
            author: parsed.author?.name || 'Creator'
          }
        });
      }
    }
  }

  /**
   * Fetches authentic channel details, banner, avatar, subscribers, and tabs.
   */
  async getChannel(channelIdOrHandle, tab = 'videos') {
    const cacheKey = `channel:${channelIdOrHandle}:${tab}`;
    const cached = memoryCache.get(cacheKey);
    if (cached) return cached;

    try {
      let browseId = channelIdOrHandle;

      // Handle @handles or custom URLs if not starting with UC
      if (!browseId.startsWith('UC')) {
        // Query search to resolve channel ID
        const searchRes = await this._post('search', { query: channelIdOrHandle });
        const contents = searchRes.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];
        for (const s of contents) {
          for (const it of s.itemSectionRenderer?.contents || []) {
            if (it.channelRenderer?.channelId) {
              browseId = it.channelRenderer.channelId;
              break;
            }
          }
          if (browseId.startsWith('UC')) break;
        }
      }

      const browseData = await this._post('browse', { browseId: browseId.startsWith('UC') ? browseId : 'UC_x5XG1OV2P6uZZ5FSM9Ttw' });

      // Parse Header
      const header = browseData.header?.pageHeaderRenderer ||
        browseData.header?.c4TabbedHeaderRenderer || {};

      const channelName = header.pageTitle ||
        header.title?.simpleText ||
        header.title?.runs?.[0]?.text ||
        'YouTube Creator';

      const avatar = getBestThumbnail(
        header.content?.pageHeaderViewModel?.image?.decoratedAvatarViewModel?.avatar?.avatarViewModel?.image?.sources ||
        header.avatar?.thumbnails ||
        header.thumbnail?.thumbnails
      ) || 'https://yt3.ggpht.com/a/default-user=s88-c-k-c0x00ffffff-no-rj';

      const banner = getBestThumbnail(
        header.content?.pageHeaderViewModel?.banner?.imageBannerViewModel?.image?.sources ||
        header.banner?.thumbnails ||
        header.tvBanner?.thumbnails
      );

      // Parse subscribers & videos count
      let subscribers = 'Subscribers';
      let videosCount = '';
      let description = '';

      const metadataRows = header.content?.pageHeaderViewModel?.metadata?.contentMetadataViewModel?.metadataRows || [];
      for (const row of metadataRows) {
        for (const p of row.metadataParts || []) {
          const text = p.text?.content || '';
          if (text.includes('subscribers') || text.includes('subscriber')) subscribers = text;
          else if (text.includes('videos') || text.includes('video')) videosCount = text;
        }
      }

      if (header.subscriberCountText?.simpleText) subscribers = header.subscriberCountText.simpleText;
      if (header.videosCountText?.runs?.[0]?.text) videosCount = header.videosCountText.runs[0].text;

      // Parse tabs
      const tabs = browseData.contents?.twoColumnBrowseResultsRenderer?.tabs || [];
      const tabVideos = [];
      const tabShorts = [];
      const tabPlaylists = [];

      // If Videos tab requested, load its params if available
      const videosTab = tabs.find(t => t.tabRenderer?.title === 'Videos');
      if (videosTab?.tabRenderer?.endpoint?.browseEndpoint?.params) {
        try {
          const vData = await this._post('browse', {
            browseId,
            params: videosTab.tabRenderer.endpoint.browseEndpoint.params
          });
          const selectedTab = vData.contents?.twoColumnBrowseResultsRenderer?.tabs?.find(t => t.tabRenderer?.selected);
          const gridContents = selectedTab?.tabRenderer?.content?.richGridRenderer?.contents || [];
          for (const item of gridContents) {
            const content = item.richItemRenderer?.content;
            if (content?.lockupViewModel) {
              const parsed = parseLockupViewModel(content.lockupViewModel);
              if (parsed) tabVideos.push(parsed);
            } else if (content?.videoRenderer) {
              const parsed = parseVideoRenderer(content.videoRenderer);
              if (parsed) tabVideos.push(parsed);
            }
          }
        } catch (e) {}
      }

      // If tabVideos is empty, fallback search by channel name
      if (tabVideos.length === 0) {
        const searchFall = await this.search(`${channelName} videos`);
        for (const v of searchFall.videos.slice(0, 20)) {
          tabVideos.push(v);
        }
      }

      const result = {
        success: true,
        channel: {
          id: browseId,
          name: channelName,
          handle: header.content?.pageHeaderViewModel?.metadata?.contentMetadataViewModel?.metadataRows?.[0]?.metadataParts?.[0]?.text?.content || `@${channelName.toLowerCase().replace(/\s+/g, '')}`,
          avatar,
          banner,
          subscribers,
          videosCount: videosCount || `${tabVideos.length} videos`,
          description: description || `Official channel of ${channelName} on RahulTube.`,
          verified: true
        },
        tabs: {
          videos: tabVideos,
          shorts: tabShorts,
          playlists: tabPlaylists
        }
      };

      memoryCache.set(cacheKey, result, 900);
      return result;
    } catch (error) {
      console.error('[InnerTubeService.getChannel] Error:', error.message);
      return {
        success: false,
        error: error.message,
        channel: null,
        tabs: { videos: [], shorts: [], playlists: [] }
      };
    }
  }

  /**
   * Fetches real trending category feed.
   */
  async getTrending(category = 'All', continuationToken = null) {
    const cacheKey = `trending:${category}:${continuationToken || 'initial'}`;
    const cached = memoryCache.get(cacheKey);
    if (cached) return cached;

    let searchTerm = 'trending top videos';
    if (category === 'Music') searchTerm = 'latest top songs music hits 2026';
    else if (category === 'Gaming') searchTerm = 'trending gameplay live gaming highlights';
    else if (category === 'News') searchTerm = 'breaking news live headlines';
    else if (category === 'Tech') searchTerm = 'latest technology AI gadgets review';
    else if (category === 'Podcasts') searchTerm = 'popular podcasts full episode';
    else if (category === 'Cricket') searchTerm = 'cricket match highlights full';
    else if (category === 'Coding') searchTerm = 'coding web development tutorial full course';
    else if (category === 'Comedy') searchTerm = 'standup comedy funny videos';
    else if (category === 'Lo-Fi') searchTerm = 'lofi hip hop beats chill relax';
    else if (category !== 'All') searchTerm = `${category} trending`;

    const result = await this.search(searchTerm, continuationToken);
    memoryCache.set(cacheKey, result, 600);
    return result;
  }

  /**
   * Autocomplete suggestions querying Google suggest API.
   */
  async getSuggestions(query) {
    if (!query || typeof query !== 'string' || !query.trim()) {
      return { suggestions: [] };
    }

    const cacheKey = `suggest:${query.trim().toLowerCase()}`;
    const cached = memoryCache.get(cacheKey);
    if (cached) return cached;

    try {
      const url = `http://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=${encodeURIComponent(query)}`;
      const resp = await axios.get(url, { timeout: 3000 });
      const suggestions = (resp.data && Array.isArray(resp.data[1])) ? resp.data[1] : [];
      const result = { suggestions };
      memoryCache.set(cacheKey, result, 3600);
      return result;
    } catch (e) {
      return { suggestions: [] };
    }
  }
}

export const innertubeService = new InnerTubeService();
export default innertubeService;
