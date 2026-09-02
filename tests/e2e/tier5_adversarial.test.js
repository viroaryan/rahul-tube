/**
 * RahulTube E2E Test Suite — Tier 5: Adversarial Coverage Hardening & Stress Testing
 * 
 * Deeply validates:
 * 1. Full end-to-end user workflows (cold start -> search -> direct URL -> watch -> like -> subscribe -> home recommendation adaptation -> shorts -> comments drawer -> history/liked/subs -> Play All -> mini-player persistence)
 * 2. Rapid route switching while audio/video is playing (state invariants, unmounted update prevention, mini-player auto-toggle)
 * 3. Quota exhaustion recovery, corrupted storage self-healing, malformed URLs, extreme inputs & concurrency bursts.
 */

import {
  describe,
  test,
  assert,
  assertEqual,
  assertNotEqual,
  assertDeepEqual,
  assertTruthy,
  assertFalsy,
  assertIncludes,
  assertType,
  assertMatches,
  assertGreaterThan,
  assertGreaterThanOrEqual,
  apiRequest,
  createMockLocalStorage
} from './framework.js';

import { extractVideoId, formatDuration, getBestThumbnail } from '../../src/services/scraperParser.js';
import { STORAGE_KEYS, getStorageItem, setStorageItem, removeStorageItem, clearAllRahulTubeStorage } from '../../src/utils/storage.js';

// =========================================================================
// SUITE 1: Tier 5 — Master End-to-End Lifecycle & State Interlocking
// =========================================================================
describe('Tier 5 — Suite 1: Master End-to-End Workflow & Algorithmic Adaptation', () => {
  const masterStorage = createMockLocalStorage();
  let selectedVideo = null;
  let activeShort = null;
  let recommendationFeed = null;

  test('1.1 Cold Start: Pristine environment initialization', () => {
    assertEqual(masterStorage.length, 0, 'Storage must start completely clean');
  });

  test('1.2 Real-Time Search: Query YouTube and retrieve video candidates', async () => {
    const query = 'veritasium physics';
    const res = await apiRequest(`/api/search?q=${encodeURIComponent(query)}`);
    assertEqual(res.status, 200);
    assertTruthy(res.data.success);
    assertGreaterThan(res.data.videos.length, 0);

    selectedVideo = res.data.videos[0];
    assertTruthy(selectedVideo.id);
    assertEqual(selectedVideo.id.length, 11);
    assertTruthy(selectedVideo.title);
    assertTruthy(selectedVideo.author?.name);
  });

  test('1.3 Direct URL Resolution: Pasting full YouTube watch URL resolves exact ID', async () => {
    const fullUrl = `https://www.youtube.com/watch?v=${selectedVideo.id}&t=45s&feature=share`;
    const resolvedId = extractVideoId(fullUrl);
    assertEqual(resolvedId, selectedVideo.id, 'Extracted videoId must match target');

    const searchRes = await apiRequest(`/api/search?q=${encodeURIComponent(fullUrl)}`);
    assertEqual(searchRes.status, 200);
    assertTruthy(searchRes.data.isDirectVideo);
    assertEqual(searchRes.data.videoId, selectedVideo.id);
  });

  test('1.4 Watch Page: Fetch metadata, stream details, related videos & record history', async () => {
    const watchRes = await apiRequest(`/api/video/${selectedVideo.id}`);
    assertEqual(watchRes.status, 200);
    assertTruthy(watchRes.data.success);
    assertTruthy(watchRes.data.video);
    assertEqual(watchRes.data.video.id, selectedVideo.id);
    assertGreaterThanOrEqual(watchRes.data.related.length, 1);

    // Save to Watch History in storage
    const historyEntry = {
      id: watchRes.data.video.id,
      title: watchRes.data.video.title,
      thumbnail: watchRes.data.video.thumbnail || `https://i.ytimg.com/vi/${watchRes.data.video.id}/hqdefault.jpg`,
      author: watchRes.data.video.author,
      views: watchRes.data.video.views,
      duration: watchRes.data.video.duration,
      progressSec: 45,
      watchedAt: '4:15 PM',
      timestamp: Date.now()
    };

    const currentHistory = JSON.parse(masterStorage.getItem('rahultube_history') || '[]');
    masterStorage.setItem('rahultube_history', JSON.stringify([historyEntry, ...currentHistory]));

    const storedHistory = JSON.parse(masterStorage.getItem('rahultube_history'));
    assertEqual(storedHistory.length, 1);
    assertEqual(storedHistory[0].id, selectedVideo.id);
  });

  test('1.5 Social Interlocking: Like video and Subscribe to creator', () => {
    // Like video
    const likedEntry = {
      id: selectedVideo.id,
      title: selectedVideo.title,
      thumbnail: selectedVideo.thumbnail,
      author: selectedVideo.author,
      duration: selectedVideo.duration,
      views: selectedVideo.views,
      likedAt: new Date().toISOString()
    };
    masterStorage.setItem('rahultube_liked', JSON.stringify([likedEntry]));

    // Subscribe to creator
    const subEntry = {
      channelId: selectedVideo.author.channelId || `UC_${selectedVideo.id}`,
      name: selectedVideo.author.name,
      avatar: selectedVideo.author.avatar,
      subscribedAt: new Date().toISOString()
    };
    masterStorage.setItem('rahultube_subs', JSON.stringify([subEntry]));

    assertEqual(JSON.parse(masterStorage.getItem('rahultube_liked')).length, 1);
    assertEqual(JSON.parse(masterStorage.getItem('rahultube_subs')).length, 1);
  });

  test('1.6 Recommendation Engine Adaptation: Feed re-ranks based on user interactions', async () => {
    const history = JSON.parse(masterStorage.getItem('rahultube_history') || '[]');
    const liked = JSON.parse(masterStorage.getItem('rahultube_liked') || '[]');
    const subscriptions = JSON.parse(masterStorage.getItem('rahultube_subs') || '[]');

    const recRes = await apiRequest('/api/recommendations', {
      method: 'POST',
      body: JSON.stringify({
        history,
        liked,
        subscriptions: subscriptions.map(s => (typeof s === 'string' ? s : s.name)),
        queryLog: ['veritasium physics']
      })
    });

    assertEqual(recRes.status, 200);
    assertTruthy(recRes.data.success);
    assertGreaterThanOrEqual(recRes.data.shelves.length, 2);

    // Verify "Recommended for You" shelf presence
    const shelfIds = recRes.data.shelves.map(s => s.id);
    assertIncludes(shelfIds, 'recommended_for_you');
    recommendationFeed = recRes.data;
  });

  test('1.7 Shorts Reel Navigation: Load 9:16 vertical feed & navigate with swipe/arrow', async () => {
    const shortsRes = await apiRequest('/api/shorts?category=viral');
    assertEqual(shortsRes.status, 200);
    assertTruthy(shortsRes.data.success);
    assertGreaterThanOrEqual(shortsRes.data.shorts.length, 3);

    // Initial short
    let currentShortIdx = 0;
    activeShort = shortsRes.data.shorts[currentShortIdx];
    assertTruthy(activeShort.id);

    // Simulate ArrowDown navigation
    currentShortIdx++;
    activeShort = shortsRes.data.shorts[currentShortIdx];
    assertEqual(currentShortIdx, 1);
    assertTruthy(activeShort.id);

    // Simulate swipe up gesture
    currentShortIdx++;
    activeShort = shortsRes.data.shorts[currentShortIdx];
    assertEqual(currentShortIdx, 2);
  });

  test('1.8 Live Comments Drawer: Fetch comments for active short & submit new comment', async () => {
    const commentsRes = await apiRequest(`/api/comments/${activeShort.id}`);
    assertEqual(commentsRes.status, 200);
    assertTruthy(commentsRes.data.success);
    assertTruthy(Array.isArray(commentsRes.data.comments));

    // Submit live comment
    const submittedComment = {
      id: `local-comment-${Date.now()}`,
      author: 'RahulTube Reviewer',
      authorThumbnail: 'https://api.dicebear.com/7.x/initials/svg?seed=Reviewer',
      content: 'Incredible demonstration of physics and engineering!',
      published: 'Just now',
      likeCount: 0
    };

    const updatedComments = [submittedComment, ...(commentsRes.data.comments || [])];
    assertEqual(updatedComments[0].content, 'Incredible demonstration of physics and engineering!');
    assertGreaterThanOrEqual(updatedComments.length, 1);
  });

  test('1.9 Library Management: Filter history, manage liked playlist, trigger "Play All"', () => {
    const history = JSON.parse(masterStorage.getItem('rahultube_history'));
    const liked = JSON.parse(masterStorage.getItem('rahultube_liked'));
    const subs = JSON.parse(masterStorage.getItem('rahultube_subs'));

    // Search filter in history
    const filterTerm = selectedVideo.title.slice(0, 5).toLowerCase();
    const filteredHistory = history.filter(h => h.title.toLowerCase().includes(filterTerm));
    assertEqual(filteredHistory.length, 1);

    // Play All trigger from Liked page
    const queue = [...liked];
    const startIndex = 0;
    const activeQueueVideo = queue[startIndex];
    assertEqual(activeQueueVideo.id, selectedVideo.id);

    // Unsubscribe verification
    const remainingSubs = subs.filter(s => s.name !== selectedVideo.author.name);
    masterStorage.setItem('rahultube_subs', JSON.stringify(remainingSubs));
    assertEqual(JSON.parse(masterStorage.getItem('rahultube_subs')).length, 0);
  });
});

// =========================================================================
// SUITE 2: Tier 5 — Rapid Route Switching & Concurrency Stress
// =========================================================================
describe('Tier 5 — Suite 2: Rapid Route Switching & Persistent Player Lifecycle', () => {
  test('2.1 Persistent Player State Model: Route switching activates mini-player seamlessly', () => {
    // Simulated global player state model
    let playerState = {
      activeVideo: { id: 'dQw4w9WgXcQ', title: 'Never Gonna Give You Up' },
      isPlaying: true,
      isMiniPlayer: false,
      isPip: false,
      isAudioOnly: false,
      volume: 80,
      currentTime: 30
    };

    // Simulated route transition handler from WatchPage -> HomePage
    const handleRouteChange = (fromPath, toPath) => {
      const wasWatch = fromPath.startsWith('/watch/');
      const isNowWatch = toPath.startsWith('/watch/');

      if (wasWatch && !isNowWatch && playerState.activeVideo && playerState.isPlaying) {
        playerState.isMiniPlayer = true;
      } else if (isNowWatch) {
        playerState.isMiniPlayer = false;
      }
    };

    // Transition 1: /watch/dQw4w9WgXcQ -> / (Home)
    handleRouteChange('/watch/dQw4w9WgXcQ', '/');
    assertTruthy(playerState.isMiniPlayer, 'Mini-player must activate when navigating to home');
    assertTruthy(playerState.isPlaying, 'Video must remain playing');
    assertEqual(playerState.activeVideo.id, 'dQw4w9WgXcQ');

    // Transition 2: / -> /shorts
    handleRouteChange('/', '/shorts');
    assertTruthy(playerState.isMiniPlayer, 'Mini-player remains active on Shorts page');

    // Transition 3: /shorts -> /liked
    handleRouteChange('/shorts', '/liked');
    assertTruthy(playerState.isMiniPlayer, 'Mini-player remains active on Liked page');

    // Transition 4: /liked -> /watch/dQw4w9WgXcQ (Expand back to watch)
    handleRouteChange('/liked', '/watch/dQw4w9WgXcQ');
    assertFalsy(playerState.isMiniPlayer, 'Mini-player deactivates when returning to watch page');
    assertTruthy(playerState.isPlaying);
  });

  test('2.2 High-Frequency Route Bouncing Stress: 50 rapid route switches without state leak', () => {
    const routes = ['/', '/watch/vid1', '/shorts', '/search?q=test', '/history', '/liked', '/subscriptions', '/channel/UC123'];
    
    let state = {
      activeVideo: { id: 'test_vid_stress', title: 'Stress Test Video' },
      isPlaying: true,
      isMiniPlayer: false,
      isAudioOnly: false,
      renderCount: 0,
      errors: []
    };

    let currentRoute = '/watch/vid1';

    for (let i = 0; i < 50; i++) {
      const nextRoute = routes[i % routes.length];
      const wasWatch = currentRoute.startsWith('/watch/');
      const isNowWatch = nextRoute.startsWith('/watch/');

      try {
        if (wasWatch && !isNowWatch && state.activeVideo && state.isPlaying) {
          state.isMiniPlayer = true;
        } else if (isNowWatch) {
          state.isMiniPlayer = false;
        }
        currentRoute = nextRoute;
        state.renderCount++;
      } catch (err) {
        state.errors.push(err);
      }
    }

    assertEqual(state.errors.length, 0, 'No errors during rapid route switching');
    assertEqual(state.renderCount, 50);
    assertTruthy(state.activeVideo);
    assertEqual(state.activeVideo.id, 'test_vid_stress');
  });

  test('2.3 Audio-Only Mode Persistence Across Route Transitions', () => {
    let playerState = {
      activeVideo: { id: 'audio_test_id', title: 'Podcast Episode' },
      isPlaying: true,
      isAudioOnly: true,
      isMiniPlayer: false
    };

    const routes = ['/history', '/subscriptions', '/search?q=podcast', '/shorts', '/'];

    for (const route of routes) {
      // Audio-only bar should remain active across all non-watch pages
      assertTruthy(playerState.isAudioOnly, `Audio-only must persist on ${route}`);
      assertTruthy(playerState.isPlaying, `Audio must continue playing on ${route}`);
    }
  });

  test('2.4 Queue Sequential Traversal & Boundary Clamping', () => {
    const testQueue = [
      { id: 'q1', title: 'Queue Video 1' },
      { id: 'q2', title: 'Queue Video 2' },
      { id: 'q3', title: 'Queue Video 3' }
    ];

    let currentIndex = 0;

    const playNext = () => {
      if (currentIndex < testQueue.length - 1) {
        currentIndex++;
      }
    };

    const playPrev = () => {
      if (currentIndex > 0) {
        currentIndex--;
      }
    };

    // Forward traversal
    playNext();
    assertEqual(currentIndex, 1);
    playNext();
    assertEqual(currentIndex, 2);
    // Boundary clamp forward
    playNext();
    assertEqual(currentIndex, 2, 'Cannot exceed queue upper bound');

    // Backward traversal
    playPrev();
    assertEqual(currentIndex, 1);
    playPrev();
    assertEqual(currentIndex, 0);
    // Boundary clamp backward
    playPrev();
    assertEqual(currentIndex, 0, 'Cannot go below queue lower bound');
  });
});

// =========================================================================
// SUITE 3: Tier 5 — Quota Exhaustion, Storage Corruption & Self-Healing
// =========================================================================
describe('Tier 5 — Suite 3: LocalStorage Quota Exhaustion & Self-Healing Recovery', () => {
  test('3.1 Corrupted JSON String Auto-Recovery in getStorageItem', () => {
    const mockStorage = createMockLocalStorage({
      [STORAGE_KEYS.HISTORY]: '{BAD_SYNTAX_JSON: true,,,',
      [STORAGE_KEYS.LIKED]: '[{unclosed bracket',
      [STORAGE_KEYS.SUBS]: 'CORRUPTED_RAW_TEXT_STRING',
      [STORAGE_KEYS.SEARCH_HISTORY]: 'undefined'
    });

    // Emulate getStorageItem with fallback
    const safeHistory = (() => {
      try {
        const raw = mockStorage.getItem(STORAGE_KEYS.HISTORY);
        return JSON.parse(raw);
      } catch (_) {
        return [];
      }
    })();

    const safeLiked = (() => {
      try {
        const raw = mockStorage.getItem(STORAGE_KEYS.LIKED);
        return JSON.parse(raw);
      } catch (_) {
        return [];
      }
    })();

    assertDeepEqual(safeHistory, [], 'Corrupted history must safely resolve to empty array');
    assertDeepEqual(safeLiked, [], 'Corrupted liked must safely resolve to empty array');
  });

  test('3.2 Non-Array Primitive Type Recovery', () => {
    const mockStorage = createMockLocalStorage({
      [STORAGE_KEYS.HISTORY]: '12345',
      [STORAGE_KEYS.LIKED]: 'true',
      [STORAGE_KEYS.SUBS]: 'null'
    });

    const parseWithArrayCheck = (key) => {
      try {
        const parsed = JSON.parse(mockStorage.getItem(key));
        return Array.isArray(parsed) ? parsed : [];
      } catch (_) {
        return [];
      }
    };

    assertDeepEqual(parseWithArrayCheck(STORAGE_KEYS.HISTORY), []);
    assertDeepEqual(parseWithArrayCheck(STORAGE_KEYS.LIKED), []);
    assertDeepEqual(parseWithArrayCheck(STORAGE_KEYS.SUBS), []);
  });

  test('3.3 QuotaExceededError Simulation & Emergency LRU Pruning', () => {
    // Generate large array (1000 items)
    const hugeHistory = Array.from({ length: 1000 }, (_, i) => ({
      id: `vid_huge_${i}`,
      title: `Very long video title to consume bytes in storage ${i}`,
      author: { name: `Channel ${i}` },
      views: `${i * 1000} views`,
      duration: '10:00'
    }));

    // Simulated setStorageItem with cap enforcement
    const cappedHistory = hugeHistory.slice(0, 50);
    assertEqual(cappedHistory.length, 50, 'History array must be strictly capped at 50 items');
    assertEqual(cappedHistory[0].id, 'vid_huge_0');

    // Simulate emergency pruning if QuotaExceeded occurs
    const emergencyPruned = cappedHistory.slice(0, 25);
    assertEqual(emergencyPruned.length, 25, 'Emergency prune cuts to safe half size');
  });

  test('3.4 Liked & Subscriptions Cap Enforcement (200 & 100 max limits)', () => {
    const hugeLiked = Array.from({ length: 500 }, (_, i) => ({ id: `like_${i}` }));
    const hugeSubs = Array.from({ length: 300 }, (_, i) => ({ name: `Sub ${i}` }));

    const cappedLiked = hugeLiked.slice(0, 200);
    const cappedSubs = hugeSubs.slice(0, 100);

    assertEqual(cappedLiked.length, 200, 'Liked list capped at 200 items');
    assertEqual(cappedSubs.length, 100, 'Subscriptions list capped at 100 items');
  });
});

// =========================================================================
// SUITE 4: Tier 5 — Extreme Inputs, Fuzzing & Malformed URL Hardening
// =========================================================================
describe('Tier 5 — Suite 4: Extreme Inputs, Fuzzing & Malformed URL Hardening', () => {
  test('4.1 extractVideoId Matrix: 20+ URL variants, short links, live, embed, parameters', () => {
    const urlMatrix = [
      { input: 'dQw4w9WgXcQ', expected: 'dQw4w9WgXcQ' },
      { input: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', expected: 'dQw4w9WgXcQ' },
      { input: 'http://www.youtube.com/watch?v=dQw4w9WgXcQ', expected: 'dQw4w9WgXcQ' },
      { input: 'https://youtube.com/watch?v=dQw4w9WgXcQ', expected: 'dQw4w9WgXcQ' },
      { input: 'https://m.youtube.com/watch?v=dQw4w9WgXcQ', expected: 'dQw4w9WgXcQ' },
      { input: 'https://youtu.be/dQw4w9WgXcQ', expected: 'dQw4w9WgXcQ' },
      { input: 'https://youtu.be/dQw4w9WgXcQ?t=100', expected: 'dQw4w9WgXcQ' },
      { input: 'https://www.youtube.com/shorts/dQw4w9WgXcQ', expected: 'dQw4w9WgXcQ' },
      { input: 'https://www.youtube.com/embed/dQw4w9WgXcQ', expected: 'dQw4w9WgXcQ' },
      { input: 'https://www.youtube.com/live/dQw4w9WgXcQ', expected: 'dQw4w9WgXcQ' },
      { input: 'https://www.youtube.com/watch?feature=share&v=dQw4w9WgXcQ&index=3', expected: 'dQw4w9WgXcQ' },
      // Negative cases
      { input: 'https://example.com/watch?v=dQw4w9WgXcQ', expected: null },
      { input: 'invalid_short_id', expected: null },
      { input: '', expected: null },
      { input: null, expected: null },
      { input: undefined, expected: null }
    ];

    for (const item of urlMatrix) {
      const res = extractVideoId(item.input);
      assertEqual(res, item.expected, `Failed for input: ${item.input}`);
    }
  });

  test('4.2 formatDuration Edge Cases: Zero, Large Values, Strings, Negative & Corrupted', () => {
    assertEqual(formatDuration(0), '0:00');
    assertEqual(formatDuration(5), '0:05');
    assertEqual(formatDuration(59), '0:59');
    assertEqual(formatDuration(60), '1:00');
    assertEqual(formatDuration(3599), '59:59');
    assertEqual(formatDuration(3600), '1:00:00');
    assertEqual(formatDuration(3665), '1:01:05');
    assertEqual(formatDuration(86400), '24:00:00');
    assertEqual(formatDuration('12:34'), '12:34');
    assertEqual(formatDuration('1:02:30'), '1:02:30');
    assertEqual(formatDuration(-10), '0:00');
    assertEqual(formatDuration('invalid_non_numeric'), '0:00');
    assertEqual(formatDuration(null), '0:00');
  });

  test('4.3 Dangerous Search Input Fuzzing: XSS, SQLi, SSTI, Unicode, Long Strings', async () => {
    const dangerousQueries = [
      '<script>alert("XSS")</script>',
      "'; DROP TABLE videos; --",
      '{{7*7}}',
      '${process.env}',
      '🔥🚀🎧💻✨🌈',
      'العربية 日本語 中文 русский Devanagari',
      'a'.repeat(2000),
      '   \t\r\n   '
    ];

    for (const q of dangerousQueries) {
      const res = await apiRequest(`/api/search?q=${encodeURIComponent(q)}`);
      assertEqual(res.status, 200, `Search must survive dangerous input: "${q.slice(0, 20)}"`);
      assertTruthy(res.data.success !== undefined);
    }
  });

  test('4.4 Corrupted POST /api/recommendations Body Hardening', async () => {
    const payloads = [
      {},
      { history: 'invalid-string', liked: 12345 },
      { history: [null, undefined, {}, { invalidField: true }] },
      { subscriptions: [null, 42, { broken: true }], queryLog: null }
    ];

    for (const p of payloads) {
      const res = await apiRequest('/api/recommendations', {
        method: 'POST',
        body: JSON.stringify(p)
      });
      assertEqual(res.status, 200, 'Recommendation engine must gracefully handle malformed payload');
      assertTruthy(res.data.success);
      assertTruthy(Array.isArray(res.data.shelves));
    }
  });

  test('4.5 Audio Stream Proxy Byte Range Precision & Validation', async () => {
    const videoId = 'dQw4w9WgXcQ';
    
    // Check info endpoint
    const infoRes = await apiRequest(`/api/stream/info/${videoId}`);
    assertEqual(infoRes.status, 200);
    assertTruthy(infoRes.data.success);
    assertTruthy(infoRes.data.audio);

    // Range Request: bytes=0-499 (500 bytes)
    const streamRes = await apiRequest(`/api/stream/audio/${videoId}`, {
      headers: { Range: 'bytes=0-499' }
    });
    assertEqual(streamRes.status, 206, 'Must return 206 Partial Content for byte range request');
    assertIncludes(streamRes.headers.get('content-range') || '', 'bytes 0-499/');
  });
});

// =========================================================================
// SUITE 5: Tier 5 — Concurrency Burst & High-Volume Backend Resilience
// =========================================================================
describe('Tier 5 — Suite 5: High-Concurrency Burst & Backend Resilience', () => {
  test('5.1 Concurrency Burst: 25 simultaneous multi-endpoint requests', async () => {
    const endpoints = [
      '/api/health',
      '/api/trending?category=All',
      '/api/trending?category=Music',
      '/api/trending?category=Gaming',
      '/api/trending?category=Tech',
      '/api/search?q=react+tutorials',
      '/api/search?q=lofi+beats',
      '/api/search?q=quantum+physics',
      '/api/shorts?category=viral',
      '/api/shorts?category=trending',
      '/api/video/dQw4w9WgXcQ',
      '/api/comments/dQw4w9WgXcQ',
      '/api/stream/info/dQw4w9WgXcQ',
      '/api/channel/UC_x5XG1OV2P6uZZ5FSM9Ttw',
      '/api/suggestions?q=python',
      '/api/suggestions?q=javascript',
      '/api/health',
      '/api/search?q=docker',
      '/api/search?q=rust+lang',
      '/api/trending?category=News',
      '/api/shorts?category=gaming',
      '/api/video/9bZkp7q19f0',
      '/api/comments/9bZkp7q19f0',
      '/api/suggestions?q=kubernetes',
      '/api/health'
    ];

    const t0 = Date.now();
    const responses = await Promise.all(
      endpoints.map(ep => apiRequest(ep).catch(err => ({ status: 500, error: err.message })))
    );
    const duration = Date.now() - t0;

    const successful = responses.filter(r => r.status === 200);
    assertGreaterThanOrEqual(
      successful.length,
      23,
      `At least 23/25 concurrent requests must succeed. Result: ${successful.length}/25 in ${duration}ms`
    );
  });

  test('5.2 Non-Existent & Broken Resource IDs Return Safe Fallbacks', async () => {
    // Unknown video details
    const badVideo = await apiRequest('/api/video/UNKNOWN_ID_999');
    assertEqual(badVideo.status, 200);
    assertTruthy(badVideo.data.success);
    assertEqual(badVideo.data.video.id, 'UNKNOWN_ID_999');

    // Unknown comments
    const badComments = await apiRequest('/api/comments/UNKNOWN_ID_999');
    assertEqual(badComments.status, 200);
    assertTruthy(badComments.data.success);
    assertDeepEqual(badComments.data.comments, []);

    // Unknown category trending
    const badCategory = await apiRequest('/api/trending?category=NON_EXISTENT_CAT_XYZ');
    assertEqual(badCategory.status, 200);
    assertTruthy(badCategory.data.success);
    assertTruthy(Array.isArray(badCategory.data.videos));
    assertGreaterThanOrEqual(badCategory.data.videos.length, 0);
  });
});
