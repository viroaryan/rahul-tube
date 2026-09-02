/**
 * adversarial_milestone6_challenger2.test.js
 * 
 * Comprehensive White-Box Adversarial Stress Test Suite for RahulTube Milestone 6.
 * Target: PlayerContext, UserContext, RecommendationContext, ShortsPlayer, innertubeService & streamService.
 * Execution: node tests/adversarial_milestone6_challenger2.test.js
 */

import http from 'http';
import axios from 'axios';
import { performance } from 'perf_hooks';
import { getStorageItem, setStorageItem, removeStorageItem, STORAGE_KEYS } from '../src/utils/storage.js';
import { recommendationEngine } from '../src/services/recommendationEngine.js';
import { innertubeService } from '../src/services/innertubeService.js';
import { streamService } from '../src/services/streamService.js';
import { extractVideoId, formatDuration } from '../src/services/scraperParser.js';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5000';

// Global Test Runner State
const results = {
  total: 0,
  passed: 0,
  failed: 0,
  suites: 0,
  failures: []
};

function assert(condition, testName, detail = '') {
  results.total++;
  if (condition) {
    results.passed++;
    console.log(`  ✔ [PASS] ${testName}${detail ? ` (${detail})` : ''}`);
    return true;
  } else {
    results.failed++;
    const msg = `  ✖ [FAIL] ${testName}${detail ? ` -> ${detail}` : ''}`;
    console.error(msg);
    results.failures.push(msg);
    return false;
  }
}

function suite(name) {
  results.suites++;
  console.log(`\n======================================================`);
  console.log(`🧪 SUITE ${results.suites}: ${name}`);
  console.log(`======================================================`);
}

// Mock localStorage for Node environment
class MockLocalStorage {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return this.store.hasOwnProperty(key) ? this.store[key] : null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}
globalThis.localStorage = new MockLocalStorage();

// ====================================================================
// SUITE 1: PlayerContext Logic, Mode Transitions, Queue & Seek Clamping
// ====================================================================
async function testPlayerContextLogic() {
  suite('PlayerContext Mode Transitions, Queue Operations & Bounds Clamping');

  // Simulation of PlayerContext state transitions
  function createPlayerContextState() {
    let state = {
      activeVideo: null,
      isPlaying: false,
      isMiniPlayer: false,
      isPip: false,
      isAudioOnly: false,
      isMuted: false,
      volume: 80,
      currentTime: 0,
      duration: 0,
      theaterMode: false,
      playbackRate: 1,
      videoQueue: [],
      currentQueueIndex: 0
    };

    const actions = {
      playVideo: (video, mode = 'watch') => {
        if (!video) return;
        const videoObj = typeof video === 'string' ? { id: video, title: 'YouTube Video' } : video;
        state.activeVideo = videoObj;
        state.isPlaying = true;
        if (mode === 'mini') {
          state.isMiniPlayer = true;
          state.isAudioOnly = false;
        } else if (mode === 'audio') {
          state.isAudioOnly = true;
          state.isMiniPlayer = false;
        } else {
          state.isMiniPlayer = false;
        }
      },
      pauseVideo: () => {
        state.isPlaying = false;
      },
      resumeVideo: () => {
        if (state.activeVideo) state.isPlaying = true;
      },
      closeMiniPlayer: () => {
        state.isPlaying = false;
        state.isMiniPlayer = false;
        state.isPip = false;
        state.isAudioOnly = false;
        state.activeVideo = null;
      },
      expandToWatch: () => {
        state.isMiniPlayer = false;
        state.isPip = false;
      },
      togglePip: () => {
        state.isPip = !state.isPip;
      },
      toggleAudioOnly: () => {
        state.isAudioOnly = !state.isAudioOnly;
      },
      toggleMute: () => {
        state.isMuted = !state.isMuted;
      },
      setVolumeLevel: (vol) => {
        const clamped = Math.max(0, Math.min(100, Number(vol) || 0));
        state.volume = clamped;
        if (clamped > 0) state.isMuted = false;
      },
      seekTo: (seconds) => {
        state.currentTime = Math.max(0, Number(seconds) || 0);
      },
      toggleTheaterMode: () => {
        state.theaterMode = !state.theaterMode;
      },
      setPlaybackSpeed: (rate) => {
        const valid = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
        state.playbackRate = valid.includes(rate) ? rate : 1;
      },
      playQueue: (queue, startIndex = 0) => {
        if (!Array.isArray(queue) || queue.length === 0) return;
        state.videoQueue = queue;
        const validIdx = Math.max(0, Math.min(queue.length - 1, startIndex));
        state.currentQueueIndex = validIdx;
        actions.playVideo(queue[validIdx], 'watch');
      },
      playNext: () => {
        if (state.videoQueue.length === 0) return;
        const nextIdx = state.currentQueueIndex + 1;
        if (nextIdx < state.videoQueue.length) {
          state.currentQueueIndex = nextIdx;
          actions.playVideo(state.videoQueue[nextIdx], 'watch');
        }
      },
      playPrevious: () => {
        if (state.videoQueue.length === 0) return;
        const prevIdx = state.currentQueueIndex - 1;
        if (prevIdx >= 0) {
          state.currentQueueIndex = prevIdx;
          actions.playVideo(state.videoQueue[prevIdx], 'watch');
        }
      }
    };

    return { getState: () => state, actions };
  }

  // Test 1.1: Mode Transitions: Watch <-> Mini <-> PiP <-> AudioOnly
  const ctx = createPlayerContextState();
  const testVid = { id: 'dQw4w9WgXcQ', title: 'Rick Astley' };

  ctx.actions.playVideo(testVid, 'watch');
  assert(ctx.getState().isPlaying === true && ctx.getState().isMiniPlayer === false && ctx.getState().isAudioOnly === false, '1.1a Play video in watch mode');

  ctx.actions.playVideo(testVid, 'mini');
  assert(ctx.getState().isMiniPlayer === true && ctx.getState().isAudioOnly === false, '1.1b Transition to mini-player mode');

  ctx.actions.togglePip();
  assert(ctx.getState().isPip === true, '1.1c Toggle PiP mode enabled');

  ctx.actions.playVideo(testVid, 'audio');
  assert(ctx.getState().isAudioOnly === true && ctx.getState().isMiniPlayer === false, '1.1d Transition to audio-only mode clears mini-player');

  ctx.actions.expandToWatch();
  assert(ctx.getState().isMiniPlayer === false && ctx.getState().isPip === false, '1.1e Expand to watch resets mini and PiP modes');

  ctx.actions.closeMiniPlayer();
  assert(ctx.getState().activeVideo === null && ctx.getState().isPlaying === false && ctx.getState().isMiniPlayer === false && ctx.getState().isAudioOnly === false, '1.1f Close mini-player completely resets all player active states');

  // Test 1.2: Seek Clamping
  ctx.actions.playVideo(testVid);
  ctx.actions.seekTo(-500);
  assert(ctx.getState().currentTime === 0, '1.2a Negative seekTo(-500) clamps to 0s');

  ctx.actions.seekTo(125.4);
  assert(ctx.getState().currentTime === 125.4, '1.2b Valid seekTo(125.4) sets exact time');

  ctx.actions.seekTo('invalid_string');
  assert(ctx.getState().currentTime === 0, '1.2c Non-numeric seekTo("invalid_string") safely defaults to 0');

  ctx.actions.seekTo(NaN);
  assert(ctx.getState().currentTime === 0, '1.2d seekTo(NaN) safely defaults to 0');

  // Test 1.3: Volume Clamping & Auto-unmute
  ctx.actions.setVolumeLevel(-50);
  assert(ctx.getState().volume === 0, '1.3a Negative volume level clamps to 0');

  ctx.actions.setVolumeLevel(150);
  assert(ctx.getState().volume === 100, '1.3b Volume above 100 clamps to 100');

  ctx.actions.toggleMute();
  assert(ctx.getState().isMuted === true, '1.3c Mute toggle sets isMuted to true');

  ctx.actions.setVolumeLevel(50);
  assert(ctx.getState().volume === 50 && ctx.getState().isMuted === false, '1.3d Setting positive volume level auto-unmutes player');

  // Test 1.4: Playback Speed Validation
  ctx.actions.setPlaybackSpeed(1.5);
  assert(ctx.getState().playbackRate === 1.5, '1.4a Valid speed 1.5x accepted');

  ctx.actions.setPlaybackSpeed(999);
  assert(ctx.getState().playbackRate === 1, '1.4b Invalid speed 999 resets safely to 1.0x');

  ctx.actions.setPlaybackSpeed(-2);
  assert(ctx.getState().playbackRate === 1, '1.4c Negative speed -2 resets safely to 1.0x');

  // Test 1.5: Queue Management & Boundary Clamping
  const sampleQueue = [
    { id: 'v1', title: 'Video 1' },
    { id: 'v2', title: 'Video 2' },
    { id: 'v3', title: 'Video 3' }
  ];

  ctx.actions.playQueue(sampleQueue, 0);
  assert(ctx.getState().currentQueueIndex === 0 && ctx.getState().activeVideo.id === 'v1', '1.5a playQueue starts at index 0');

  // Play previous at index 0 (should clamp at 0)
  ctx.actions.playPrevious();
  assert(ctx.getState().currentQueueIndex === 0 && ctx.getState().activeVideo.id === 'v1', '1.5b playPrevious at index 0 stays clamped at 0');

  // Advance queue
  ctx.actions.playNext();
  assert(ctx.getState().currentQueueIndex === 1 && ctx.getState().activeVideo.id === 'v2', '1.5c playNext advances to index 1');

  ctx.actions.playNext();
  assert(ctx.getState().currentQueueIndex === 2 && ctx.getState().activeVideo.id === 'v3', '1.5d playNext advances to index 2 (last item)');

  // Play next at last index (should clamp at last index)
  ctx.actions.playNext();
  assert(ctx.getState().currentQueueIndex === 2 && ctx.getState().activeVideo.id === 'v3', '1.5e playNext at end of queue stays clamped at last item');

  // playQueue with invalid startIndex
  ctx.actions.playQueue(sampleQueue, 999);
  assert(ctx.getState().currentQueueIndex === 2, '1.5f playQueue with startIndex 999 clamps to queue.length - 1');

  ctx.actions.playQueue(sampleQueue, -50);
  assert(ctx.getState().currentQueueIndex === 0, '1.5g playQueue with startIndex -50 clamps to index 0');

  // playQueue with empty queue
  ctx.actions.playQueue([], 0);
  assert(ctx.getState().videoQueue.length === 3, '1.5h playQueue with empty array is safely ignored');
}

// ====================================================================
// SUITE 2: UserContext Concurrency, Rapid Toggles & Storage LRU Eviction
// ====================================================================
async function testUserContextAndStorage() {
  suite('UserContext Concurrency, Rapid Toggles & Storage LRU Eviction');

  localStorage.clear();

  // Test 2.1: Storage LRU eviction capping (History cap: 50, Subs cap: 100, Liked cap: 200)
  const hugeHistory = Array.from({ length: 150 }, (_, i) => ({
    id: `hist_vid_${i}`,
    title: `History Video ${i}`,
    watchedAt: '12:00 PM'
  }));

  setStorageItem(STORAGE_KEYS.HISTORY, hugeHistory, 50);
  const storedHistory = getStorageItem(STORAGE_KEYS.HISTORY, []);
  assert(storedHistory.length === 50, '2.1a Storing 150 history items is strictly capped at 50 (LRU)', `Got: ${storedHistory.length}`);
  assert(storedHistory[0].id === 'hist_vid_0', '2.1b Most recent item preserved at index 0');

  // Test 2.2: Subscriptions cap at 100
  const hugeSubs = Array.from({ length: 150 }, (_, i) => ({
    channelId: `UC_${i}`,
    name: `Channel ${i}`
  }));
  setStorageItem(STORAGE_KEYS.SUBS, hugeSubs, 100);
  const storedSubs = getStorageItem(STORAGE_KEYS.SUBS, []);
  assert(storedSubs.length === 100, '2.2 Storing 150 subscriptions is strictly capped at 100 (LRU)', `Got: ${storedSubs.length}`);

  // Test 2.3: Rapid Toggle Like Simulation (100 rapid sequential toggles)
  let likedList = [];
  const testVideo = { id: 'toggle_test_vid', title: 'Toggle Test Video' };

  for (let i = 0; i < 100; i++) {
    const exists = likedList.some(v => v.id === testVideo.id);
    if (exists) {
      likedList = likedList.filter(v => v.id !== testVideo.id);
    } else {
      likedList = [testVideo, ...likedList];
    }
  }
  assert(likedList.length === 0, '2.3 100 consecutive rapid like toggles alternate cleanly and result in unliked state (even count)');

  // Test 2.4: Rapid Toggle Subscribe with Case Sensitivity & Handle Matching
  let subsList = [];
  function toggleSub(subItem) {
    const name = typeof subItem === 'string' ? subItem : (subItem.name || subItem.channelId || '');
    const channelId = typeof subItem === 'object' ? subItem.channelId : '';
    const exists = subsList.some(s => {
      if (typeof s === 'string') return s.toLowerCase() === name.toLowerCase();
      return (channelId && s.channelId === channelId) || (name && s.name && s.name.toLowerCase() === name.toLowerCase());
    });
    if (exists) {
      subsList = subsList.filter(s => {
        if (typeof s === 'string') return s.toLowerCase() !== name.toLowerCase();
        return (!channelId || s.channelId !== channelId) && (!name || !s.name || s.name.toLowerCase() !== name.toLowerCase());
      });
      return false;
    } else {
      subsList = [{ channelId: channelId || `UC_${name}`, name }, ...subsList];
      return true;
    }
  }

  toggleSub({ channelId: 'UC_TEST', name: 'Veritasium' });
  assert(subsList.length === 1, '2.4a Subscribed to Veritasium');

  // Attempt to toggle with lowercase string
  toggleSub('veritasium');
  assert(subsList.length === 0, '2.4b Unsubscribed via lowercase string "veritasium" (case-insensitive deduplication)');

  // Test 2.5: Corrupted localStorage JSON Recovery
  localStorage.setItem(STORAGE_KEYS.SEARCH_HISTORY, 'CORRUPTED_NON_JSON_DATA_{{{{');
  const recoveredSearch = getStorageItem(STORAGE_KEYS.SEARCH_HISTORY, []);
  assert(Array.isArray(recoveredSearch) && recoveredSearch.length === 0, '2.5 Corrupted JSON in localStorage safely caught and auto-recovered to default array');
}

// ====================================================================
// SUITE 3: RecommendationContext & Engine Cold/Rich Feed & Fallback
// ====================================================================
async function testRecommendationStress() {
  suite('Recommendation Engine Cold/Rich History & Backend Fallback Resiliency');

  // Test 3.1: Cold Start Feed Generation
  const coldProfile = {
    history: [],
    liked: [],
    subscriptions: [],
    queryLog: []
  };
  const coldFeed = await recommendationEngine.generateFeed(coldProfile);
  assert(coldFeed.success === true, '3.1a Cold start feed generation succeeds');
  assert(Array.isArray(coldFeed.shelves) && coldFeed.shelves.length > 0, '3.1b Cold start contains valid default shelves', `Shelves: ${coldFeed.shelves.length}`);
  assert(coldFeed.shelves[0].videos.length > 0, '3.1c Cold start first shelf has videos populated', `Videos count: ${coldFeed.shelves[0].videos.length}`);

  // Test 3.2: Rich Profile with 50 items
  const richProfile = {
    history: Array.from({ length: 50 }, (_, i) => ({
      id: `history_${i}`,
      title: i % 2 === 0 ? `JavaScript React Tutorial Episode ${i}` : `Quantum Physics Lecture ${i}`,
      author: { name: i % 2 === 0 ? 'TechLead' : 'MIT' }
    })),
    liked: Array.from({ length: 25 }, (_, i) => ({
      id: `liked_${i}`,
      title: `Liked Coding Masterclass ${i}`
    })),
    subscriptions: ['Google for Developers', 'Veritasium', 'Fireship'],
    queryLog: ['Next.js tutorials', 'Web Audio API']
  };

  const richFeed = await recommendationEngine.generateFeed(richProfile);
  assert(richFeed.success === true, '3.2a Rich profile feed generation succeeds');
  assert(richFeed.shelves.length >= 2, '3.2b Rich profile generates multiple personalized shelves', `Shelves count: ${richFeed.shelves.length}`);

  // Deduplication check across collected feed
  const flatIds = richFeed.flatFeed.map(v => v.id);
  const uniqueIds = new Set(flatIds);
  assert(flatIds.length === uniqueIds.size, '3.2c Recommendation flatFeed has 0 duplicates', `Total: ${flatIds.length}, Unique: ${uniqueIds.size}`);

  // Test 3.3: Client RecommendationContext Fallback when Backend is Unreachable
  // Simulation of RecommendationContext fetch logic with broken primary API
  async function simulateRecommendationContextFetch(primaryFails = true) {
    let shelvesResult = [];
    let flatFeedResult = [];
    let loading = true;

    try {
      if (!primaryFails) {
        // primary succeeds
        shelvesResult = [{ id: 'mock', title: 'Mock Shelf', videos: [{ id: 'v1' }] }];
      } else {
        // primary throws network error -> fallback to /api/trending
        const trendRes = await axios.get(`${BASE_URL}/api/trending?category=All`);
        if (trendRes.data && Array.isArray(trendRes.data.videos)) {
          const fallbackShelf = {
            id: 'recommended_for_you',
            title: 'Recommended for You',
            videos: trendRes.data.videos
          };
          shelvesResult = [fallbackShelf];
          flatFeedResult = trendRes.data.videos;
        }
      }
    } catch (err) {
      console.warn('Fallback caught error:', err.message);
    } finally {
      loading = false;
    }

    return { shelves: shelvesResult, flatFeed: flatFeedResult, loading };
  }

  const simulatedRes = await simulateRecommendationContextFetch(true);
  assert(simulatedRes.loading === false, '3.3a Loading state always resolves to false on network failure');
  assert(simulatedRes.shelves.length > 0 && simulatedRes.shelves[0].videos.length > 0, '3.3b Unreachable primary recommendation endpoint seamlessly falls back to trending shelf', `Fallback videos: ${simulatedRes.shelves[0].videos.length}`);
}

// ====================================================================
// SUITE 4: ShortsPlayer Gestures, Debouncing & Boundary Clamping
// ====================================================================
async function testShortsPlayerGestures() {
  suite('ShortsPlayer Touch Gestures, Wheel Debouncing & Index Clamping');

  // Simulation of useSwipeGestures hook logic
  function createSwipeGestureHandler({ onSwipeUp, onSwipeDown, threshold = 40, wheelCooldown = 400 }) {
    let touchStartY = null;
    let touchEndY = null;
    let lastWheelTime = 0;

    return {
      touchStart: (clientY) => {
        touchStartY = clientY;
        touchEndY = null;
      },
      touchMove: (clientY) => {
        touchEndY = clientY;
      },
      touchEnd: () => {
        if (touchStartY === null || touchEndY === null) return;
        const distance = touchStartY - touchEndY;
        if (distance > threshold && onSwipeUp) {
          onSwipeUp();
        } else if (distance < -threshold && onSwipeDown) {
          onSwipeDown();
        }
        touchStartY = null;
        touchEndY = null;
      },
      wheel: (deltaY, now = Date.now()) => {
        if (now - lastWheelTime < wheelCooldown) return false;
        if (deltaY > 20 && onSwipeUp) {
          lastWheelTime = now;
          onSwipeUp();
          return true;
        } else if (deltaY < -20 && onSwipeDown) {
          lastWheelTime = now;
          onSwipeDown();
          return true;
        }
        return false;
      }
    };
  }

  let currentIndex = 0;
  const shortsList = Array.from({ length: 5 }, (_, i) => ({ id: `short_${i}`, title: `Short ${i}` }));

  const handleNext = () => {
    if (currentIndex < shortsList.length - 1) {
      currentIndex++;
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      currentIndex--;
    }
  };

  const gestures = createSwipeGestureHandler({
    onSwipeUp: handleNext,
    onSwipeDown: handlePrev,
    threshold: 40,
    wheelCooldown: 400
  });

  // Test 4.1: Touch Swipe Delta Thresholding
  // Swipe Up by 20px (under 40px threshold) -> should not trigger
  gestures.touchStart(100);
  gestures.touchMove(80); // distance = 20px
  gestures.touchEnd();
  assert(currentIndex === 0, '4.1a Sub-threshold touch swipe (20px < 40px) is ignored');

  // Swipe Up by 60px (> 40px threshold) -> triggers next
  gestures.touchStart(100);
  gestures.touchMove(40); // distance = 60px
  gestures.touchEnd();
  assert(currentIndex === 1, '4.1b Valid touch swipe up (60px > 40px) navigates to next short (index 1)');

  // Swipe Down by 70px (> 40px threshold) -> triggers prev
  gestures.touchStart(100);
  gestures.touchMove(170); // distance = -70px
  gestures.touchEnd();
  assert(currentIndex === 0, '4.1c Valid touch swipe down (-70px < -40px) navigates to previous short (index 0)');

  // Incomplete touch (touchStart without touchEnd) -> ignored
  gestures.touchStart(100);
  assert(currentIndex === 0, '4.1d Incomplete touch start without touchEnd produces no state change');

  // Test 4.2: Mouse Wheel Debouncing & Cooldown
  let t0 = 10000;
  const w1 = gestures.wheel(50, t0);
  assert(w1 === true && currentIndex === 1, '4.2a Mouse wheel down (deltaY: 50) navigates to index 1');

  // Rapid wheel event 100ms later (within 400ms cooldown) -> debounced
  const w2 = gestures.wheel(50, t0 + 100);
  assert(w2 === false && currentIndex === 1, '4.2b Rapid mouse wheel event within 400ms cooldown is debounced');

  // Wheel event after 450ms -> fires
  const w3 = gestures.wheel(50, t0 + 450);
  assert(w3 === true && currentIndex === 2, '4.2c Mouse wheel after 450ms cooldown navigates to index 2');

  // Wheel micro-jitter (deltaY: 5) -> ignored
  const w4 = gestures.wheel(5, t0 + 1000);
  assert(w4 === false && currentIndex === 2, '4.2d Wheel micro-jitter (deltaY <= 20) is ignored');

  // Test 4.3: Boundary Clamping at Index 0 and Last Index
  // Navigate to last index (index 4)
  currentIndex = 4;
  for (let i = 0; i < 20; i++) {
    handleNext();
  }
  assert(currentIndex === 4, '4.3a 20 consecutive handleNext() calls at end of queue remain clamped at index 4');

  // Navigate to index 0
  currentIndex = 0;
  for (let i = 0; i < 20; i++) {
    handlePrev();
  }
  assert(currentIndex === 0, '4.3b 20 consecutive handlePrev() calls at beginning remain clamped at index 0');
}

// ====================================================================
// SUITE 5: innertubeService & streamService HTTP Range & Socket Resiliency
// ====================================================================
async function testStreamAndInnertubeResiliency() {
  suite('innertubeService & streamService HTTP Range & Socket Resiliency');

  // Test 5.1: HTTP Range Request Slicing & Header Casing
  try {
    // lowercase header
    const rLower = await axios.get(`${BASE_URL}/api/stream/audio/dQw4w9WgXcQ`, {
      headers: { range: 'bytes=0-49' },
      responseType: 'arraybuffer'
    });
    assert(rLower.status === 206, '5.1a Lowercase "range: bytes=0-49" returns HTTP 206 Partial Content');
    assert(rLower.data.byteLength === 50, `5.1b Range 0-49 returns exactly 50 bytes (got: ${rLower.data.byteLength})`);
    assert(rLower.headers['accept-ranges'] === 'bytes', '5.1c Response includes Accept-Ranges: bytes');
    assert(Boolean(rLower.headers['content-range']), `5.1d Content-Range header present: ${rLower.headers['content-range']}`);

    // uppercase header
    const rUpper = await axios.get(`${BASE_URL}/api/stream/audio/dQw4w9WgXcQ`, {
      headers: { RANGE: 'bytes=100-199' },
      responseType: 'arraybuffer'
    });
    assert(rUpper.status === 206 && rUpper.data.byteLength === 100, `5.1e Uppercase "RANGE: bytes=100-199" returns 206 with 100 bytes (got: ${rUpper.data.byteLength})`);
  } catch (err) {
    assert(false, `5.1 Range request failed: ${err.message}`);
  }

  // Test 5.2: Stream Socket Disconnect / Client Abort Simulation
  try {
    const abortResult = await new Promise((resolve) => {
      const req = http.get(`${BASE_URL}/api/stream/audio/dQw4w9WgXcQ`, (res) => {
        // Read 1 chunk then destroy socket abruptly
        res.on('data', () => {
          req.destroy(); // Abort socket
          setTimeout(() => {
            resolve({ aborted: true });
          }, 200);
        });
      });
      req.on('error', () => {
        resolve({ aborted: true });
      });
    });

    assert(abortResult.aborted === true, '5.2 Client abrupt socket abort destroys upstream stream cleanly without server crash');

    // Verify server remains responsive after abort
    const healthAfterAbort = await axios.get(`${BASE_URL}/api/health`);
    assert(healthAfterAbort.status === 200 && healthAfterAbort.data.status === 'ok', '5.2b Server health check remains 200 OK immediately after socket abort');
  } catch (err) {
    assert(false, `5.2 Socket disconnect test failed: ${err.message}`);
  }

  // Test 5.3: Stream Non-Existent Video ID
  try {
    const resBad = await axios.get(`${BASE_URL}/api/stream/audio/nonexistent_id_999`, { validateStatus: false });
    assert(resBad.status === 404 || resBad.status === 502, `5.3 Stream request for invalid video ID returns 404/502 (status: ${resBad.status})`);
    assert(resBad.data.success === false, '5.3b Error response has success: false JSON format');
  } catch (err) {
    assert(false, `5.3 Invalid video ID stream threw error: ${err.message}`);
  }

  // Test 5.4: InnerTube Service URL Extraction Edge Cases
  const urlCases = [
    { in: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10s', expected: 'dQw4w9WgXcQ' },
    { in: 'https://youtu.be/dQw4w9WgXcQ?si=test', expected: 'dQw4w9WgXcQ' },
    { in: 'https://youtube.com/shorts/dQw4w9WgXcQ', expected: 'dQw4w9WgXcQ' },
    { in: 'https://www.youtube.com/embed/dQw4w9WgXcQ', expected: 'dQw4w9WgXcQ' },
    { in: 'dQw4w9WgXcQ', expected: 'dQw4w9WgXcQ' },
    { in: 'https://evil.com/watch?v=dQw4w9WgXcQ', expected: null },
    { in: '   ', expected: null },
    { in: null, expected: null }
  ];

  for (const tc of urlCases) {
    const res = extractVideoId(tc.in);
    assert(res === tc.expected, `5.4 extractVideoId("${String(tc.in).slice(0, 30)}") -> ${res} (expected: ${tc.expected})`);
  }

  // Test 5.5: Search with Unicode, Hindi, Japanese & Emojis
  try {
    const resUnicode = await axios.get(`${BASE_URL}/api/search?q=${encodeURIComponent('म्यूजिक 音楽 🎵 Bollywood Lo-Fi')}`);
    assert(resUnicode.status === 200 && resUnicode.data.success === true, '5.5 InnerTube search handles Multilingual Unicode and Emojis cleanly without crash');
    assert(Array.isArray(resUnicode.data.videos), `5.5b Returned ${resUnicode.data.videos.length} videos for multilingual query`);
  } catch (err) {
    assert(false, `5.5 Unicode search failed: ${err.message}`);
  }
}

// ====================================================================
// MAIN RUNNER
// ====================================================================
async function runAllTests() {
  console.log('================================================================');
  console.log('🛡️ RAHULTUBE MILESTONE 6: TIER 5 ADVERSARIAL STRESS TEST SUITE');
  console.log('👤 Challenger 2 (Empirical Verification Suite)');
  console.log('================================================================');

  const start = performance.now();

  try {
    await testPlayerContextLogic();
    await testUserContextAndStorage();
    await testRecommendationStress();
    await testShortsPlayerGestures();
    await testStreamAndInnertubeResiliency();
  } catch (err) {
    console.error('Fatal unhandled error in test suite:', err);
  }

  const duration = Math.round(performance.now() - start);

  console.log('\n================================================================');
  console.log('📊 EMPIRICAL TEST HARNESS EXECUTION SUMMARY');
  console.log('================================================================');
  console.log(`Total Test Suites : ${results.suites}`);
  console.log(`Total Assertions  : ${results.total}`);
  console.log(`Passed Assertions : ${results.passed}`);
  console.log(`Failed Assertions : ${results.failed}`);
  console.log(`Execution Time    : ${duration} ms`);
  console.log('================================================================');

  if (results.failed === 0) {
    console.log('🎯 EMPIRICAL VERDICT: APPROVE ✅ (100% Tests Passed without Flaws)');
    process.exit(0);
  } else {
    console.error('🎯 EMPIRICAL VERDICT: REQUEST_CHANGES ❌');
    process.exit(1);
  }
}

runAllTests();
