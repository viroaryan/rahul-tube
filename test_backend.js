/**
 * test_backend.js - Milestone 1 Automated Verification Suite
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:5000';

async function runTests() {
  console.log('🧪 Starting Milestone 1 Backend Verification Suite...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  // 1. Health check
  try {
    const res = await axios.get(`${BASE_URL}/api/health`);
    assert(res.status === 200 && res.data.status === 'ok', 'GET /api/health returns 200 OK');
  } catch (e) {
    assert(false, `GET /api/health failed: ${e.message}`);
  }

  // 2. Search query
  let searchContinuation = null;
  try {
    const res = await axios.get(`${BASE_URL}/api/search?q=lofi+beats`);
    assert(res.status === 200 && res.data.success === true, 'GET /api/search?q=lofi+beats returns success');
    assert(Array.isArray(res.data.videos) && res.data.videos.length > 0, `Search returns ${res.data.videos?.length} videos`);
    const sample = res.data.videos?.[0];
    assert(sample?.id && sample?.title && sample?.thumbnail && sample?.author?.name, 'Search video item has complete structure');
    searchContinuation = res.data.continuationToken;
    console.log(`     (Search continuation token present: ${Boolean(searchContinuation)})`);
  } catch (e) {
    assert(false, `GET /api/search failed: ${e.message}`);
  }

  // 3. Search continuation pagination
  if (searchContinuation) {
    try {
      const res = await axios.get(`${BASE_URL}/api/search?continuation=${encodeURIComponent(searchContinuation)}`);
      assert(res.status === 200 && res.data.success === true, 'GET /api/search with continuation token succeeds');
      assert(Array.isArray(res.data.videos) && res.data.videos.length > 0, `Continuation returned ${res.data.videos?.length} more videos`);
    } catch (e) {
      assert(false, `GET /api/search continuation failed: ${e.message}`);
    }
  }

  // 4. Direct URL / 11-char ID detection in Search
  try {
    const resUrl = await axios.get(`${BASE_URL}/api/search?q=https://www.youtube.com/watch?v=dQw4w9WgXcQ`);
    assert(resUrl.data.isDirectVideo === true && resUrl.data.videoId === 'dQw4w9WgXcQ', 'Direct YouTube URL detected accurately');

    const resId = await axios.get(`${BASE_URL}/api/search?q=dQw4w9WgXcQ`);
    assert(resId.data.isDirectVideo === true && resId.data.videoId === 'dQw4w9WgXcQ', 'Direct 11-char video ID detected accurately');
  } catch (e) {
    assert(false, `Direct URL/ID resolution failed: ${e.message}`);
  }

  // 5. Suggestions
  try {
    const res = await axios.get(`${BASE_URL}/api/suggestions?q=javascript`);
    assert(res.status === 200 && Array.isArray(res.data.suggestions) && res.data.suggestions.length > 0, `Suggestions returned ${res.data.suggestions?.length} items for 'javascript'`);
  } catch (e) {
    assert(false, `GET /api/suggestions failed: ${e.message}`);
  }

  // 6. Video Details & Related Videos
  try {
    const res = await axios.get(`${BASE_URL}/api/video/dQw4w9WgXcQ`);
    assert(res.status === 200 && res.data.success === true, 'GET /api/video/dQw4w9WgXcQ returns success');
    const v = res.data.video;
    assert(v?.id === 'dQw4w9WgXcQ', 'Video ID matches requested ID');
    assert(v?.title && v.title.toLowerCase().includes('never gonna give you up'), `Video title authentic: "${v?.title}"`);
    assert(v?.author?.name && v.author.name.includes('Rick'), `Author name authentic: "${v?.author?.name}"`);
    assert(v?.author?.avatar && (v.author.avatar.includes('yt3.ggpht.com') || v.author.avatar.includes('googleusercontent.com')), `Author avatar authentic: "${v?.author?.avatar?.slice(0, 45)}..."`);
    assert(v?.views && typeof v.views === 'string', `Authentic view count: ${v?.views}`);
    assert(v?.likes && typeof v.likes === 'string', `Authentic likes: ${v?.likes}`);
    assert(v?.author?.subscribers && typeof v.author.subscribers === 'string', `Authentic subscribers: ${v?.author?.subscribers}`);
    assert(v?.author?.verified === true, 'Author verified badge is true');
    assert(Array.isArray(res.data.related) && res.data.related.length > 0, `Related videos graph returned ${res.data.related?.length} videos`);
  } catch (e) {
    assert(false, `GET /api/video/dQw4w9WgXcQ failed: ${e.message}`);
  }

  // 7. Comments Scraping with live data & continuation token
  let commentsContinuation = null;
  try {
    const res = await axios.get(`${BASE_URL}/api/comments/dQw4w9WgXcQ`);
    assert(res.status === 200 && res.data.success === true, 'GET /api/comments/dQw4w9WgXcQ returns success');
    assert(Array.isArray(res.data.comments) && res.data.comments.length > 0, `Live comments returned ${res.data.comments?.length} authentic comments`);
    const c = res.data.comments?.[0];
    assert(c?.id && c?.author && c?.content, `Authentic comment parsed (Author: "${c?.author}", content: "${c?.content?.slice(0, 30)}...")`);
    assert(c?.authorThumbnail && (c.authorThumbnail.includes('yt3.ggpht.com') || c.authorThumbnail.includes('googleusercontent.com')), `Authentic author thumbnail: ${c?.authorThumbnail?.slice(0, 45)}...`);
    commentsContinuation = res.data.continuationToken;
    console.log(`     (Comments continuation token present: ${Boolean(commentsContinuation)})`);
  } catch (e) {
    assert(false, `GET /api/comments failed: ${e.message}`);
  }

  // 8. Comments Pagination
  if (commentsContinuation) {
    try {
      const res = await axios.get(`${BASE_URL}/api/comments/dQw4w9WgXcQ?continuation=${encodeURIComponent(commentsContinuation)}`);
      assert(res.status === 200 && res.data.success === true, 'GET /api/comments with continuation token succeeds');
      assert(Array.isArray(res.data.comments) && res.data.comments.length > 0, `Next page returned ${res.data.comments?.length} comments`);
    } catch (e) {
      assert(false, `Comments pagination failed: ${e.message}`);
    }
  }

  // 9. Shorts Feed Scraping & Continuation
  let shortsContinuation = null;
  try {
    const res = await axios.get(`${BASE_URL}/api/shorts?category=viral`);
    assert(res.status === 200 && res.data.success === true, 'GET /api/shorts returns success');
    assert(Array.isArray(res.data.shorts) && res.data.shorts.length > 0, `Shorts feed returned ${res.data.shorts?.length} shorts`);
    const s = res.data.shorts?.[0];
    assert(s?.id && s?.title && s?.thumbnail, `Short item complete (ID: ${s?.id}, Title: "${s?.title?.slice(0, 30)}...")`);
    shortsContinuation = res.data.continuationToken;
    console.log(`     (Shorts continuation token present: ${Boolean(shortsContinuation)})`);
  } catch (e) {
    assert(false, `GET /api/shorts failed: ${e.message}`);
  }

  // 10. Channel Scraping
  try {
    const res = await axios.get(`${BASE_URL}/api/channel/UC_x5XG1OV2P6uZZ5FSM9Ttw`);
    assert(res.status === 200 && res.data.success === true, 'GET /api/channel/UC_x5XG1OV2P6uZZ5FSM9Ttw returns success');
    const ch = res.data.channel;
    assert(ch?.name && ch.name.includes('Google'), `Channel name authentic: "${ch?.name}"`);
    assert(ch?.avatar && (ch.avatar.includes('yt3.ggpht.com') || ch.avatar.includes('googleusercontent.com')), `Channel avatar authentic: ${ch?.avatar?.slice(0, 45)}...`);
    assert(Array.isArray(res.data.tabs?.videos) && res.data.tabs.videos.length > 0, `Channel videos tab returned ${res.data.tabs.videos.length} videos`);
  } catch (e) {
    assert(false, `GET /api/channel failed: ${e.message}`);
  }

  // 11. Trending Categories
  try {
    const res = await axios.get(`${BASE_URL}/api/trending?category=Music`);
    assert(res.status === 200 && res.data.success === true, 'GET /api/trending?category=Music returns success');
    assert(Array.isArray(res.data.videos) && res.data.videos.length > 0, `Trending Music returned ${res.data.videos?.length} videos`);
  } catch (e) {
    assert(false, `GET /api/trending failed: ${e.message}`);
  }

  // 12. Recommendations Engine Feed
  try {
    const res = await axios.post(`${BASE_URL}/api/recommendations`, {
      history: [ { id: 'dQw4w9WgXcQ', title: 'Rick Astley - Never Gonna Give You Up', author: 'Rick Astley' } ],
      liked: [ { id: 'dQw4w9WgXcQ', title: 'Rick Astley - Never Gonna Give You Up' } ],
      subscriptions: [ 'Google for Developers' ],
      queryLog: [ 'lofi beats' ]
    });
    assert(res.status === 200 && res.data.success === true, 'POST /api/recommendations returns success');
    assert(Array.isArray(res.data.shelves) && res.data.shelves.length >= 2, `Recommendations generated ${res.data.shelves?.length} personalized shelves`);
    assert(Array.isArray(res.data.flatFeed) && res.data.flatFeed.length > 0, `Flat feed synthesized with ${res.data.flatFeed?.length} videos`);
  } catch (e) {
    assert(false, `POST /api/recommendations failed: ${e.message}`);
  }

  // 13. Audio Stream Info
  try {
    const res = await axios.get(`${BASE_URL}/api/stream/info/dQw4w9WgXcQ`);
    assert(res.status === 200 && res.data.success === true, 'GET /api/stream/info/dQw4w9WgXcQ returns success');
    assert(res.data.audio?.best?.url && res.data.audio.best.mimeType?.startsWith('audio/'), `Audio format detected (${res.data.audio?.best?.mimeType}, bitrate: ${res.data.audio?.best?.bitrate})`);
  } catch (e) {
    assert(false, `GET /api/stream/info failed: ${e.message}`);
  }

  // 14. Audio Stream Proxy with HTTP Range
  try {
    const res = await axios.get(`${BASE_URL}/api/stream/audio/dQw4w9WgXcQ`, {
      headers: { Range: 'bytes=0-2048' },
      responseType: 'arraybuffer'
    });
    assert(res.status === 206, `GET /api/stream/audio with Range returned 206 Partial Content`);
    assert(res.data.byteLength === 2049, `Stream proxy returned exactly 2049 bytes (got ${res.data.byteLength})`);
    assert(res.headers['content-type']?.startsWith('audio/'), `Content-Type is audio (${res.headers['content-type']})`);
    assert(res.headers['content-range']?.includes('bytes 0-2048/'), `Content-Range header present (${res.headers['content-range']})`);
  } catch (e) {
    assert(false, `GET /api/stream/audio failed: ${e.message}`);
  }

  console.log('\n===================================================');
  console.log(`📊 Summary: ${passed} PASSED, ${failed} FAILED (Total: ${passed + failed})`);
  console.log('===================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
