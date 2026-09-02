/**
 * test_reviewer_adversarial.js - Comprehensive Adversarial and Edge-Case Test Suite
 * Milestone 1: Backend Scraping Engine & InnerTube Service API
 */

import axios from 'axios';
import { memoryCache } from './src/services/cacheService.js';
import { extractVideoId, formatDuration } from './src/services/scraperParser.js';

const BASE_URL = 'http://localhost:5000';

async function runAdversarialTests() {
  console.log('🔥 Starting Adversarial & Edge-Case Verification Suite...\n');
  let passed = 0;
  let failed = 0;
  const findings = [];

  function assert(condition, message, errorDetail = null) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      if (errorDetail) console.error(`     Detail:`, errorDetail);
      failed++;
      findings.push({ message, errorDetail });
    }
  }

  // ==========================================
  // SECTION 1: INTEGRITY & NON-CHEATING CHECKS
  // ==========================================
  console.log('\n--- SECTION 1: Integrity & Dynamic Scraping Verification ---');

  // Test 1.1: Live dynamic search queries return distinctly different real YouTube results
  try {
    const q1 = await axios.get(`${BASE_URL}/api/search?q=mit+opencourseware+calculus`);
    const q2 = await axios.get(`${BASE_URL}/api/search?q=gordon+ramsay+scrambled+eggs`);

    assert(q1.data.success && q2.data.success, 'Both distinct search queries returned success: true');
    assert(q1.data.videos.length > 0 && q2.data.videos.length > 0, 'Both queries returned videos');
    
    // Check titles are completely distinct and match topics
    const q1HasCalc = q1.data.videos.some(v => v.title.toLowerCase().includes('calculus') || v.title.toLowerCase().includes('mit') || v.title.toLowerCase().includes('lecture'));
    const q2HasFood = q2.data.videos.some(v => v.title.toLowerCase().includes('ramsay') || v.title.toLowerCase().includes('egg') || v.title.toLowerCase().includes('cook'));
    
    assert(q1HasCalc, `MIT Calculus query returned real relevant video titles (e.g. "${q1.data.videos[0].title}")`);
    assert(q2HasFood, `Gordon Ramsay query returned real relevant video titles (e.g. "${q2.data.videos[0].title}")`);
    
    // Check no dummy mock names
    const allTitles = [...q1.data.videos, ...q2.data.videos].map(v => v.author?.name || '');
    const hasMockNames = allTitles.some(name => name === 'Rahul Sharma' || name === 'Alex Rivera' || name === 'Priya Verma');
    assert(!hasMockNames, 'No hardcoded mock creator names detected in search results');
  } catch (e) {
    assert(false, `Section 1.1 search integrity failed: ${e.message}`);
  }

  // Test 1.2: Video details for a different known video (e.g., Gangnam Style: 9bZkp7q19f0)
  try {
    const res = await axios.get(`${BASE_URL}/api/video/9bZkp7q19f0`);
    assert(res.data.success === true, 'GET /api/video/9bZkp7q19f0 returned success');
    const v = res.data.video;
    assert(v.title.toLowerCase().includes('gangnam style') || v.title.toLowerCase().includes('psy'), `Authentic title for Gangnam Style: "${v.title}"`);
    assert(v.author.name.toLowerCase().includes('officialpsy') || v.author.name.toLowerCase().includes('psy'), `Authentic creator: "${v.author.name}"`);
    assert(v.views.includes('views') || /[\d,]+/.test(v.views), `Authentic view count: "${v.views}"`);
  } catch (e) {
    assert(false, `Section 1.2 video details integrity failed: ${e.message}`);
  }

  // ==========================================
  // SECTION 2: INTERFACE CONTRACT VERIFICATION
  // ==========================================
  console.log('\n--- SECTION 2: Strict Interface Contract Verification ---');

  // Test 2.1: /api/search contract check
  try {
    const res = await axios.get(`${BASE_URL}/api/search?q=veritasium`);
    const data = res.data;
    assert(typeof data.success === 'boolean', 'search: has boolean success');
    assert(typeof data.isDirectVideo === 'boolean', 'search: has boolean isDirectVideo');
    assert(data.videoId === null || typeof data.videoId === 'string', 'search: videoId is null or string');
    assert(Array.isArray(data.videos), 'search: videos is Array');
    assert(data.videos.length > 0, 'search: returned videos');
    const v = data.videos[0];
    assert(typeof v.id === 'string' && v.id.length === 11, `search: video item id is 11-char string (${v.id})`);
    assert(typeof v.title === 'string', 'search: video title is string');
    assert(typeof v.duration === 'string', `search: video duration is string (${v.duration})`);
    assert(typeof v.views === 'string', `search: video views is string (${v.views})`);
    assert(typeof v.ago === 'string', `search: video ago is string (${v.ago})`);
    assert(typeof v.thumbnail === 'string' && v.thumbnail.startsWith('http'), `search: video thumbnail is valid URL`);
    assert(typeof v.author === 'object' && v.author !== null, 'search: author is object');
    assert(typeof v.author.name === 'string', 'search: author.name is string');
    assert(typeof v.author.channelId === 'string', 'search: author.channelId is string');
    assert(typeof v.author.avatar === 'string' && v.author.avatar.startsWith('http'), 'search: author.avatar is valid URL');
    assert(typeof v.author.verified === 'boolean', 'search: author.verified is boolean');
  } catch (e) {
    assert(false, `Section 2.1 search contract check failed: ${e.message}`);
  }

  // Test 2.2: /api/video/:id contract check
  try {
    const res = await axios.get(`${BASE_URL}/api/video/dQw4w9WgXcQ`);
    const data = res.data;
    assert(data.success === true, 'video: success is true');
    const v = data.video;
    assert(typeof v.id === 'string' && v.id === 'dQw4w9WgXcQ', 'video.id is 11-char ID');
    assert(typeof v.title === 'string', 'video.title is string');
    assert(typeof v.description === 'string', 'video.description is string');
    assert(typeof v.duration === 'string', 'video.duration is string');
    assert(typeof v.views === 'string', 'video.views is string');
    assert(typeof v.likes === 'string', 'video.likes is string');
    assert(typeof v.timestamp === 'string', 'video.timestamp is string');
    assert(typeof v.thumbnail === 'string', 'video.thumbnail is string');
    assert(typeof v.author === 'object', 'video.author is object');
    assert(typeof v.author.name === 'string', 'video.author.name is string');
    assert(typeof v.author.channelId === 'string', 'video.author.channelId is string');
    assert(typeof v.author.avatar === 'string', 'video.author.avatar is string');
    assert(typeof v.author.subscribers === 'string', 'video.author.subscribers is string');
    assert(typeof v.author.verified === 'boolean', 'video.author.verified is boolean');
    assert(Array.isArray(data.related), 'video.related is Array');
  } catch (e) {
    assert(false, `Section 2.2 video contract check failed: ${e.message}`);
  }

  // Test 2.3: /api/comments/:id contract check
  try {
    const res = await axios.get(`${BASE_URL}/api/comments/dQw4w9WgXcQ`);
    const data = res.data;
    assert(data.success === true, 'comments: success is true');
    assert(typeof data.commentCount === 'number', `comments: commentCount is number (${data.commentCount})`);
    assert(Array.isArray(data.comments), 'comments: comments is Array');
    if (data.comments.length > 0) {
      const c = data.comments[0];
      assert(typeof c.id === 'string', 'comments: comment.id is string');
      assert(typeof c.author === 'string', 'comments: comment.author is string');
      assert(typeof c.authorThumbnail === 'string' && c.authorThumbnail.startsWith('http'), 'comments: comment.authorThumbnail is valid URL');
      assert(typeof c.content === 'string', 'comments: comment.content is string');
      assert(typeof c.published === 'string', 'comments: comment.published is string');
      assert(typeof c.likeCount === 'number', `comments: comment.likeCount is number (${c.likeCount})`);
    }
  } catch (e) {
    assert(false, `Section 2.3 comments contract check failed: ${e.message}`);
  }

  // Test 2.4: /api/shorts contract check
  try {
    const res = await axios.get(`${BASE_URL}/api/shorts?category=comedy`);
    const data = res.data;
    assert(data.success === true, 'shorts: success is true');
    assert(Array.isArray(data.shorts), 'shorts: shorts is Array');
    if (data.shorts.length > 0) {
      const s = data.shorts[0];
      assert(typeof s.id === 'string' && s.id.length === 11, `shorts: short.id is 11-char (${s.id})`);
      assert(typeof s.title === 'string', 'shorts: short.title is string');
      assert(typeof s.views === 'string', 'shorts: short.views is string');
      assert(typeof s.thumbnail === 'string', 'shorts: short.thumbnail is string');
      assert(typeof s.author === 'object', 'shorts: short.author is object');
      assert(typeof s.sound === 'object', 'shorts: short.sound is object');
    }
  } catch (e) {
    assert(false, `Section 2.4 shorts contract check failed: ${e.message}`);
  }

  // Test 2.5: /api/channel/:id contract check
  try {
    const res = await axios.get(`${BASE_URL}/api/channel/UCBJycsmduvYEL83R_U4JriQ`); // Marques Brownlee
    const data = res.data;
    assert(data.success === true, 'channel: success is true');
    const ch = data.channel;
    assert(typeof ch.id === 'string', 'channel.id is string');
    assert(typeof ch.name === 'string', `channel.name is string (${ch.name})`);
    assert(typeof ch.handle === 'string', `channel.handle is string (${ch.handle})`);
    assert(typeof ch.avatar === 'string', 'channel.avatar is string');
    assert(typeof ch.subscribers === 'string', `channel.subscribers is string (${ch.subscribers})`);
    assert(typeof ch.verified === 'boolean', 'channel.verified is boolean');
    assert(typeof data.tabs === 'object', 'channel.tabs is object');
    assert(Array.isArray(data.tabs.videos), 'channel.tabs.videos is Array');
  } catch (e) {
    assert(false, `Section 2.5 channel contract check failed: ${e.message}`);
  }

  // ==========================================
  // SECTION 3: ADVERSARIAL EDGE CASES & INPUTS
  // ==========================================
  console.log('\n--- SECTION 3: Adversarial Input & Boundary Testing ---');

  // Test 3.1: Special characters, SQL injection, XSS payloads in Search query
  const dangerousQueries = [
    '<script>alert("XSS")</script>',
    "'; DROP TABLE users; --",
    '${7*7}',
    '   ',
    '!@#$%^&*()_+=-~`{}[]|\\:;"\'<>,.?/',
    '🚀🔥🎧✨'
  ];

  for (const dq of dangerousQueries) {
    try {
      const res = await axios.get(`${BASE_URL}/api/search?q=${encodeURIComponent(dq)}`);
      assert(res.status === 200 && res.data.success === true, `Dangerous search input handled gracefully: "${dq.slice(0, 15)}..."`);
    } catch (e) {
      assert(false, `Search crashed on dangerous input "${dq}": ${e.message}`);
    }
  }

  // Test 3.2: Direct YouTube URL parsing variations in scraperParser
  const testUrls = [
    { input: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', expected: 'dQw4w9WgXcQ' },
    { input: 'https://youtu.be/dQw4w9WgXcQ', expected: 'dQw4w9WgXcQ' },
    { input: 'https://www.youtube.com/shorts/dQw4w9WgXcQ', expected: 'dQw4w9WgXcQ' },
    { input: 'https://www.youtube.com/embed/dQw4w9WgXcQ', expected: 'dQw4w9WgXcQ' },
    { input: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=120s&ab_channel=RickAstley', expected: 'dQw4w9WgXcQ' },
    { input: 'https://m.youtube.com/watch?v=dQw4w9WgXcQ', expected: 'dQw4w9WgXcQ' },
    { input: 'dQw4w9WgXcQ', expected: 'dQw4w9WgXcQ' },
    { input: 'invalid-url-here', expected: null },
    { input: '', expected: null },
    { input: null, expected: null }
  ];

  for (const { input, expected } of testUrls) {
    const extracted = extractVideoId(input);
    assert(extracted === expected, `extractVideoId("${String(input).slice(0, 30)}...") -> ${extracted} (expected: ${expected})`);
  }

  // Test 3.3: formatDuration helper unit tests
  assert(formatDuration(0) === '0:00', 'formatDuration(0) === "0:00"');
  assert(formatDuration(45) === '0:45', 'formatDuration(45) === "0:45"');
  assert(formatDuration(125) === '2:05', 'formatDuration(125) === "2:05"');
  assert(formatDuration(3665) === '1:01:05', 'formatDuration(3665) === "1:01:05"');
  assert(formatDuration('12:34') === '12:34', 'formatDuration("12:34") === "12:34"');
  assert(formatDuration('invalid') === '0:00', 'formatDuration("invalid") === "0:00"');

  // Test 3.4: Recommendations API boundary states
  // Cold start (empty body)
  try {
    const resEmpty = await axios.post(`${BASE_URL}/api/recommendations`, {});
    assert(resEmpty.status === 200 && resEmpty.data.success === true, 'POST /api/recommendations with empty body succeeds (cold start)');
    assert(Array.isArray(resEmpty.data.shelves) && resEmpty.data.shelves.length > 0, `Cold start generated ${resEmpty.data.shelves.length} default shelves`);
  } catch (e) {
    assert(false, `Recommendations cold start failed: ${e.message}`);
  }

  // Corrupted profile data
  try {
    const resCorrupt = await axios.post(`${BASE_URL}/api/recommendations`, {
      history: [null, undefined, {}, { invalid: true }],
      liked: 'not an array',
      subscriptions: [123, false, null],
      queryLog: [null, 42]
    });
    assert(resCorrupt.status === 200 && resCorrupt.data.success === true, 'POST /api/recommendations handles corrupted data gracefully without crashing');
  } catch (e) {
    assert(false, `Recommendations corrupted payload crashed server: ${e.message}`);
  }

  // Test 3.5: Non-existent Video ID error handling
  try {
    const res = await axios.get(`${BASE_URL}/api/video/XXXXXXXXXXX`, { validateStatus: false });
    assert(res.status === 404 || (res.status === 200 && res.data.success === false), `Non-existent video ID returns 404 or success:false (status: ${res.status})`);
  } catch (e) {
    assert(false, `Non-existent video ID threw uncaught error: ${e.message}`);
  }

  // ==========================================
  // SECTION 4: STREAMING & RANGE PROXY TESTING
  // ==========================================
  console.log('\n--- SECTION 4: Streaming & Range Proxy Testing ---');

  // Test 4.1: Range slicing precision
  try {
    const r1 = await axios.get(`${BASE_URL}/api/stream/audio/dQw4w9WgXcQ`, {
      headers: { Range: 'bytes=0-99' },
      responseType: 'arraybuffer'
    });
    assert(r1.status === 206, 'Byte range 0-99 returns 206 Partial Content');
    assert(r1.data.byteLength === 100, `Byte range 0-99 returns exactly 100 bytes (got: ${r1.data.byteLength})`);

    const r2 = await axios.get(`${BASE_URL}/api/stream/audio/dQw4w9WgXcQ`, {
      headers: { Range: 'bytes=500-999' },
      responseType: 'arraybuffer'
    });
    assert(r2.status === 206, 'Byte range 500-999 returns 206 Partial Content');
    assert(r2.data.byteLength === 500, `Byte range 500-999 returns exactly 500 bytes (got: ${r2.data.byteLength})`);
  } catch (e) {
    assert(false, `Audio stream range slicing failed: ${e.message}`);
  }

  // ==========================================
  // SECTION 5: CACHE & CONCURRENCY STRESS TEST
  // ==========================================
  console.log('\n--- SECTION 5: Cache Invalidation & Concurrency Stress Test ---');

  // Test 5.1: In-memory cache LRU eviction test
  const initialSize = memoryCache.size();
  for (let i = 0; i < 1100; i++) {
    memoryCache.set(`stress_test_key_${i}`, { index: i }, 60);
  }
  const peakSize = memoryCache.size();
  assert(peakSize <= 1000, `LRU cache correctly capped at maxEntries (1000). Current size: ${peakSize}`);

  // Test 5.2: Concurrent request burst (20 parallel requests across multiple endpoints)
  console.log('   Bursting 20 concurrent requests across all endpoints...');
  const burstEndpoints = [
    `${BASE_URL}/api/health`,
    `${BASE_URL}/api/search?q=nodejs`,
    `${BASE_URL}/api/suggestions?q=python`,
    `${BASE_URL}/api/trending?category=Gaming`,
    `${BASE_URL}/api/shorts?category=viral`,
    `${BASE_URL}/api/video/dQw4w9WgXcQ`,
    `${BASE_URL}/api/comments/dQw4w9WgXcQ`,
    `${BASE_URL}/api/stream/info/dQw4w9WgXcQ`,
    `${BASE_URL}/api/channel/UC_x5XG1OV2P6uZZ5FSM9Ttw`,
    `${BASE_URL}/api/search?q=react+native`,
    `${BASE_URL}/api/trending?category=Tech`,
    `${BASE_URL}/api/shorts?category=tech`,
    `${BASE_URL}/api/suggestions?q=rust`,
    `${BASE_URL}/api/health`,
    `${BASE_URL}/api/search?q=docker`,
    `${BASE_URL}/api/trending?category=All`,
    `${BASE_URL}/api/stream/info/9bZkp7q19f0`,
    `${BASE_URL}/api/video/9bZkp7q19f0`,
    `${BASE_URL}/api/comments/9bZkp7q19f0`,
    `${BASE_URL}/api/suggestions?q=kubernetes`
  ];

  try {
    const t0 = Date.now();
    const responses = await Promise.all(
      burstEndpoints.map(url => axios.get(url, { timeout: 15000 }).catch(err => ({ error: err.message })))
    );
    const elapsed = Date.now() - t0;
    const errors = responses.filter(r => r.error);
    assert(errors.length === 0, `All 20 concurrent burst requests succeeded in ${elapsed}ms (0 failures)`);
  } catch (e) {
    assert(false, `Concurrent burst test crashed: ${e.message}`);
  }

  // ==========================================
  // SUMMARY REPORT
  // ==========================================
  console.log('\n===================================================');
  console.log(`📊 ADVERSARIAL TEST SUMMARY: ${passed} PASSED, ${failed} FAILED (Total: ${passed + failed})`);
  console.log('===================================================\n');

  if (failed > 0) {
    console.error('Failed findings:', JSON.stringify(findings, null, 2));
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAdversarialTests();
