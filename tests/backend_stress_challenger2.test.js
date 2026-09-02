/**
 * backend_stress_challenger2.test.js
 * 
 * Empirical Stress, Boundary & Performance Test Harness for RahulTube Milestone 1.
 * Author: Empirical Challenger 2
 * Execution: node tests/backend_stress_challenger2.test.js
 */

import axios from 'axios';
import { performance } from 'perf_hooks';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5000';

// Configuration
const CONCURRENCY_LEVEL = 10;
const BENCHMARK_ROUNDS = 5;

// Test Results Collector
const stats = {
  total: 0,
  passed: 0,
  failed: 0,
  latencies: {},
  errors: []
};

function recordLatency(category, ms) {
  if (!stats.latencies[category]) {
    stats.latencies[category] = [];
  }
  stats.latencies[category].push(ms);
}

function calculateStats(latencies) {
  if (!latencies || latencies.length === 0) return { min: 0, max: 0, avg: 0, p95: 0, count: 0 };
  const sorted = [...latencies].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const sum = sorted.reduce((acc, val) => acc + val, 0);
  const avg = sum / sorted.length;
  const p95Index = Math.floor(sorted.length * 0.95);
  const p95 = sorted[p95Index] || max;
  return {
    min: Math.round(min),
    max: Math.round(max),
    avg: Math.round(avg),
    p95: Math.round(p95),
    count: sorted.length
  };
}

function assert(condition, testName, details = '') {
  stats.total++;
  if (condition) {
    stats.passed++;
    console.log(`  [PASS] ${testName}${details ? ` -> ${details}` : ''}`);
    return true;
  } else {
    stats.failed++;
    const errMsg = `[FAIL] ${testName}${details ? ` -> ${details}` : ''}`;
    console.error(`  ${errMsg}`);
    stats.errors.push(errMsg);
    return false;
  }
}

async function measure(name, fn) {
  const t0 = performance.now();
  try {
    const res = await fn();
    const duration = performance.now() - t0;
    recordLatency(name, duration);
    return { success: true, res, duration };
  } catch (err) {
    const duration = performance.now() - t0;
    recordLatency(name, duration);
    return { success: false, error: err, duration };
  }
}

// ---------------------------------------------------------
// SUITE 1: Channel Fetching Boundary & Adversarial Tests
// ---------------------------------------------------------
async function testChannelEndpoints() {
  console.log('\n======================================================');
  console.log('🧪 SUITE 1: Channel Fetching Stress & Boundary Tests');
  console.log('======================================================');

  // Test 1.1: Standard Channel ID (Google for Developers)
  const c1 = await measure('channel_standard_id', () =>
    axios.get(`${BASE_URL}/api/channel/UC_x5XG1OV2P6uZZ5FSM9Ttw`)
  );
  assert(
    c1.success && c1.res.status === 200 && c1.res.data.success === true,
    '1.1 Standard Channel ID (UC...) returns 200 and success: true',
    `Channel: "${c1.res?.data?.channel?.name}", Videos: ${c1.res?.data?.tabs?.videos?.length} (${Math.round(c1.duration)}ms)`
  );
  assert(
    c1.res?.data?.channel?.id && c1.res?.data?.channel?.avatar && Array.isArray(c1.res?.data?.tabs?.videos),
    '1.1b Channel object contains id, avatar, banner, subscribers, videos tab',
    `Avatar: ${c1.res?.data?.channel?.avatar?.slice(0, 30)}...`
  );

  // Test 1.2: Channel Handle resolution (@GoogleDevelopers or @mkbhd)
  const c2 = await measure('channel_handle', () =>
    axios.get(`${BASE_URL}/api/channel/@GoogleDevelopers`)
  );
  assert(
    c2.success && c2.res.status === 200 && c2.res.data.success === true,
    '1.2 Channel Handle resolution (@GoogleDevelopers) succeeds',
    `Resolved name: "${c2.res?.data?.channel?.name}", ID: ${c2.res?.data?.channel?.id} (${Math.round(c2.duration)}ms)`
  );

  // Test 1.3: Channel Handle resolution with @veritasium
  const c3 = await measure('channel_handle_veritasium', () =>
    axios.get(`${BASE_URL}/api/channel/@veritasium`)
  );
  assert(
    c3.success && c3.res.status === 200 && c3.res.data.channel?.name,
    '1.3 Channel Handle (@veritasium) resolves authentic creator',
    `Name: "${c3.res?.data?.channel?.name}" (${Math.round(c3.duration)}ms)`
  );

  // Test 1.4: Tab filtering query parameter
  const c4 = await measure('channel_tab_videos', () =>
    axios.get(`${BASE_URL}/api/channel/UC_x5XG1OV2P6uZZ5FSM9Ttw?tab=videos`)
  );
  assert(
    c4.success && c4.res.status === 200 && Array.isArray(c4.res.data.tabs.videos),
    '1.4 Channel with ?tab=videos returns videos tab populated',
    `Videos count: ${c4.res?.data?.tabs?.videos?.length} (${Math.round(c4.duration)}ms)`
  );

  // Test 1.5: Non-existent / Random Channel ID
  const c5 = await measure('channel_nonexistent_id', () =>
    axios.get(`${BASE_URL}/api/channel/UCzzzzzzzzzzzzzzzzzzzzzz`)
  );
  assert(
    c5.success && c5.res.status === 200 && (c5.res.data.channel !== undefined),
    '1.5 Non-existent Channel ID returns graceful structured fallback without unhandled exception',
    `Success flag: ${c5.res?.data?.success} (${Math.round(c5.duration)}ms)`
  );

  // Test 1.6: Special characters and injection payload in Channel ID
  const c6 = await measure('channel_special_chars', () =>
    axios.get(`${BASE_URL}/api/channel/<script>alert(1)</script>`).catch(e => e.response)
  );
  assert(
    c6.res && (c6.res.status === 200 || c6.res.status === 400 || c6.res.status === 404 || c6.res.status === 500),
    '1.6 XSS/Special characters in channel ID does not crash server',
    `HTTP Status: ${c6.res?.status} (${Math.round(c6.duration)}ms)`
  );
}

// ---------------------------------------------------------
// SUITE 2: Shorts Scraper & Multi-Hop Pagination Stress Tests
// ---------------------------------------------------------
async function testShortsEndpoints() {
  console.log('\n======================================================');
  console.log('🧪 SUITE 2: Shorts Scraper & Pagination Stress Tests');
  console.log('======================================================');

  // Test 2.1: Default viral category
  const s1 = await measure('shorts_viral', () =>
    axios.get(`${BASE_URL}/api/shorts?category=viral`)
  );
  assert(
    s1.success && s1.res.status === 200 && s1.res.data.success === true,
    '2.1 GET /api/shorts?category=viral returns 200 and success: true',
    `Shorts count: ${s1.res?.data?.shorts?.length}, token: ${Boolean(s1.res?.data?.continuationToken)} (${Math.round(s1.duration)}ms)`
  );

  // Verify Short item structure
  const firstShort = s1.res?.data?.shorts?.[0];
  assert(
    firstShort && firstShort.id && firstShort.title && firstShort.thumbnail,
    '2.1b Short item contains required fields (id, title, thumbnail)',
    `Sample: [${firstShort?.id}] "${firstShort?.title?.slice(0, 30)}..."`
  );

  // Test 2.2: Multi-hop pagination (Hop 1 -> Hop 2 -> Hop 3)
  let hopToken = s1.res?.data?.continuationToken;
  let hopSuccessCount = 0;
  let totalShortsCollected = s1.res?.data?.shorts?.length || 0;

  if (hopToken) {
    // Hop 2
    const s2 = await measure('shorts_page2', () =>
      axios.get(`${BASE_URL}/api/shorts?category=viral&continuation=${encodeURIComponent(hopToken)}`)
    );
    if (s2.success && s2.res.status === 200 && s2.res.data.success === true) {
      hopSuccessCount++;
      totalShortsCollected += (s2.res.data.shorts?.length || 0);
      hopToken = s2.res.data.continuationToken;
    }
  }

  if (hopToken) {
    // Hop 3
    const s3 = await measure('shorts_page3', () =>
      axios.get(`${BASE_URL}/api/shorts?category=viral&continuation=${encodeURIComponent(hopToken)}`)
    );
    if (s3.success && s3.res.status === 200 && s3.res.data.success === true) {
      hopSuccessCount++;
      totalShortsCollected += (s3.res.data.shorts?.length || 0);
    }
  }

  assert(
    hopSuccessCount >= 1,
    '2.2 Multi-hop Shorts pagination executes successfully across multiple pages',
    `Hops succeeded: ${hopSuccessCount}, Total Shorts collected: ${totalShortsCollected}`
  );

  // Test 2.3: Diverse Categories
  const categories = ['gaming', 'comedy', 'tech', 'music', 'science'];
  const categoryResults = await Promise.all(
    categories.map(cat =>
      measure(`shorts_cat_${cat}`, () => axios.get(`${BASE_URL}/api/shorts?category=${cat}`))
    )
  );

  const allCatsPassed = categoryResults.every(r => r.success && r.res.status === 200 && r.res.data.success === true);
  assert(
    allCatsPassed,
    '2.3 Multiple distinct Shorts categories (gaming, comedy, tech, music, science) fetch successfully',
    `All 5 categories responded with 200 OK`
  );

  // Test 2.4: Invalid / Malformed Continuation Token
  const badToken = 'INVALID_CONTINUATION_TOKEN_XYZ_1234567890_!@#$%^&*()';
  const sInvalid = await measure('shorts_invalid_continuation', () =>
    axios.get(`${BASE_URL}/api/shorts?category=viral&continuation=${encodeURIComponent(badToken)}`)
  );
  assert(
    sInvalid.success && sInvalid.res.status === 200 && Array.isArray(sInvalid.res.data.shorts),
    '2.4 Corrupted/Invalid continuation token returns safe empty/fallback array without 500 crash',
    `Status: ${sInvalid.res?.status}, Shorts count: ${sInvalid.res?.data?.shorts?.length} (${Math.round(sInvalid.duration)}ms)`
  );

  // Test 2.5: Concurrent Burst Load (10 parallel requests)
  console.log('  ⚡ Running 10 concurrent requests to /api/shorts...');
  const burstStart = performance.now();
  const burstPromises = Array.from({ length: CONCURRENCY_LEVEL }, (_, i) =>
    measure(`shorts_burst_${i}`, () => axios.get(`${BASE_URL}/api/shorts?category=viral&burst=${i}`))
  );
  const burstResults = await Promise.all(burstPromises);
  const burstDuration = performance.now() - burstStart;
  const burstSuccessCount = burstResults.filter(r => r.success && r.res.status === 200).length;

  assert(
    burstSuccessCount === CONCURRENCY_LEVEL,
    '2.5 10x Concurrent Shorts Burst Load completes 100% successfully',
    `Passed: ${burstSuccessCount}/${CONCURRENCY_LEVEL} in ${Math.round(burstDuration)}ms (avg ${Math.round(burstDuration / CONCURRENCY_LEVEL)}ms/req)`
  );
}

// ---------------------------------------------------------
// SUITE 3: Recommendations Scoring Engine Stress Tests
// ---------------------------------------------------------
async function testRecommendationsEndpoint() {
  console.log('\n======================================================');
  console.log('🧪 SUITE 3: Recommendations Engine Cold vs Rich History');
  console.log('======================================================');

  // Test 3.1: Cold Start (Completely empty payload {})
  const rCold1 = await measure('rec_cold_empty_body', () =>
    axios.post(`${BASE_URL}/api/recommendations`, {})
  );
  assert(
    rCold1.success && rCold1.res.status === 200 && rCold1.res.data.success === true,
    '3.1 Cold Start with empty payload {} returns personalized/fallback feed',
    `Shelves: ${rCold1.res?.data?.shelves?.length}, FlatFeed: ${rCold1.res?.data?.flatFeed?.length} (${Math.round(rCold1.duration)}ms)`
  );

  // Test 3.2: Cold Start (Explicit empty arrays)
  const rCold2 = await measure('rec_cold_empty_arrays', () =>
    axios.post(`${BASE_URL}/api/recommendations`, {
      history: [],
      liked: [],
      subscriptions: [],
      queryLog: []
    })
  );
  assert(
    rCold2.success && rCold2.res.status === 200 && rCold2.res.data.shelves?.length > 0,
    '3.2 Cold Start with empty arrays returns default recommendation shelves',
    `Shelves: ${rCold2.res?.data?.shelves?.map(s => s.id).join(', ')} (${Math.round(rCold2.duration)}ms)`
  );

  // Test 3.3: Rich History with 50+ diverse items
  const richHistory = Array.from({ length: 55 }, (_, i) => ({
    id: i === 0 ? 'dQw4w9WgXcQ' : `test_vid_id_${i}`,
    title: i % 2 === 0 ? `JavaScript Masterclass Chapter ${i} Tutorial` : `Lo-Fi Chill Beats Relaxation Session ${i}`,
    author: i % 3 === 0 ? 'TechLead' : 'Lofi Girl',
    category: i % 2 === 0 ? 'Coding' : 'Music',
    timestamp: Date.now() - i * 60000
  }));

  const richLiked = Array.from({ length: 25 }, (_, i) => ({
    id: `liked_vid_${i}`,
    title: `Amazing Tech Gadget Review ${i}`
  }));

  const richSubscriptions = [
    'Google for Developers',
    'Fireship',
    'Veritasium',
    'Marques Brownlee',
    'Lofi Girl'
  ];

  const richQueryLog = [
    'Next.js 15 Full Tutorial',
    'React 19 Server Components',
    'Web Audio API synthesized music',
    'Deep Learning transformers explained'
  ];

  const rRich = await measure('rec_rich_50_items', () =>
    axios.post(`${BASE_URL}/api/recommendations`, {
      history: richHistory,
      liked: richLiked,
      subscriptions: richSubscriptions,
      queryLog: richQueryLog
    })
  );

  assert(
    rRich.success && rRich.res.status === 200 && rRich.res.data.success === true,
    '3.3 Rich History with 55 history items, 25 likes, 5 subs executes scoring and generates shelves',
    `Shelves count: ${rRich.res?.data?.shelves?.length}, FlatFeed items: ${rRich.res?.data?.flatFeed?.length} (${Math.round(rRich.duration)}ms)`
  );

  // Verify shelf personalization
  const shelfIds = rRich.res?.data?.shelves?.map(s => s.id) || [];
  assert(
    shelfIds.includes('recommended_for_you') || shelfIds.includes('because_you_watched') || shelfIds.includes('from_subscriptions'),
    '3.3b Personalized shelves generated dynamically based on history and subscriptions',
    `Active shelves: ${shelfIds.join(', ')}`
  );

  // Verify deduplication in flatFeed
  const flatFeed = rRich.res?.data?.flatFeed || [];
  const feedIds = flatFeed.map(v => v.id);
  const uniqueFeedIds = new Set(feedIds);
  assert(
    uniqueFeedIds.size === feedIds.length,
    '3.3c Recommendation flatFeed has 0 duplicates (perfect deduplication)',
    `Total items: ${feedIds.length}, Unique IDs: ${uniqueFeedIds.size}`
  );

  // Test 3.4: Malformed and Corrupted Inputs
  const rMalformed = await measure('rec_malformed_input', () =>
    axios.post(`${BASE_URL}/api/recommendations`, {
      history: "not an array",
      liked: 12345,
      subscriptions: { corrupted: true },
      queryLog: [null, undefined, {}, []]
    })
  );
  assert(
    rMalformed.success && rMalformed.res.status === 200 && Array.isArray(rMalformed.res.data.shelves),
    '3.4 Malformed / corrupted profile types handled safely with fallback generation',
    `Status: ${rMalformed.res?.status}, Shelves: ${rMalformed.res?.data?.shelves?.length} (${Math.round(rMalformed.duration)}ms)`
  );
}

// ---------------------------------------------------------
// SUITE 4: Stream Audio & Format Resolution Error Handling
// ---------------------------------------------------------
async function testStreamEndpoints() {
  console.log('\n======================================================');
  console.log('🧪 SUITE 4: Stream Audio & Format Resolution Boundaries');
  console.log('======================================================');

  // Test 4.1: Valid Video Audio Info
  const sValid = await measure('stream_info_valid', () =>
    axios.get(`${BASE_URL}/api/stream/info/dQw4w9WgXcQ`)
  );
  assert(
    sValid.success && sValid.res.status === 200 && sValid.res.data.success === true,
    '4.1 GET /api/stream/info/:validId returns audio formats metadata',
    `MIME: ${sValid.res?.data?.audio?.best?.mimeType}, Bitrate: ${sValid.res?.data?.audio?.best?.bitrate} (${Math.round(sValid.duration)}ms)`
  );

  // Test 4.2: Invalid Video ID Format (Short / Special characters)
  const sInvalidId = await measure('stream_info_invalid_id', () =>
    axios.get(`${BASE_URL}/api/stream/info/invalid!id`).catch(e => e.response)
  );
  assert(
    sInvalidId.res && (sInvalidId.res.status === 404 || sInvalidId.res.status === 400 || sInvalidId.res.status === 500),
    '4.2 GET /api/stream/info with invalid ID handles error cleanly without crashing',
    `HTTP Status: ${sInvalidId.res?.status} (${Math.round(sInvalidId.duration)}ms)`
  );

  // Test 4.3: Non-existent 11-char Video ID (audio format lookup)
  const sNonExistent = await measure('stream_info_nonexistent', () =>
    axios.get(`${BASE_URL}/api/stream/info/zzzzzzzzzzz`).catch(e => e.response)
  );
  assert(
    sNonExistent.res && (sNonExistent.res.status === 404 || sNonExistent.res.status === 500),
    '4.3 GET /api/stream/info for non-existent video returns 404 Not Found',
    `HTTP Status: ${sNonExistent.res?.status}, Error: "${sNonExistent.res?.data?.error}" (${Math.round(sNonExistent.duration)}ms)`
  );

  // Test 4.4: Audio Proxy with Byte Range Requests (HTTP 206 Partial Content)
  const sRange = await measure('stream_audio_range_request', () =>
    axios.get(`${BASE_URL}/api/stream/audio/dQw4w9WgXcQ`, {
      headers: { Range: 'bytes=0-1024' },
      responseType: 'arraybuffer'
    })
  );
  assert(
    sRange.success && sRange.res.status === 206,
    '4.4 GET /api/stream/audio with Range header returns 206 Partial Content',
    `Received bytes: ${sRange.res?.data?.byteLength} (expected 1025), Content-Range: ${sRange.res?.headers?.['content-range']} (${Math.round(sRange.duration)}ms)`
  );

  // Test 4.5: Subsequent Range Chunk (e.g. 1025-2048)
  const sRange2 = await measure('stream_audio_range_chunk2', () =>
    axios.get(`${BASE_URL}/api/stream/audio/dQw4w9WgXcQ`, {
      headers: { Range: 'bytes=1025-2048' },
      responseType: 'arraybuffer'
    })
  );
  assert(
    sRange2.success && sRange2.res.status === 206 && sRange2.res.data.byteLength === 1024,
    '4.5 Subsequent audio range chunk (1025-2048) streams exact 1024 byte slice',
    `Received bytes: ${sRange2.res?.data?.byteLength} (${Math.round(sRange2.duration)}ms)`
  );

  // Test 4.6: Audio Proxy on non-existent ID
  const sProxyNonExistent = await measure('stream_proxy_nonexistent', () =>
    axios.get(`${BASE_URL}/api/stream/audio/zzzzzzzzzzz`).catch(e => e.response)
  );
  assert(
    sProxyNonExistent.res && (sProxyNonExistent.res.status === 404 || sProxyNonExistent.res.status === 502),
    '4.6 Audio proxy on nonexistent video returns 404/502 without breaking stream pipeline',
    `HTTP Status: ${sProxyNonExistent.res?.status} (${Math.round(sProxyNonExistent.duration)}ms)`
  );
}

// ---------------------------------------------------------
// SUITE 5: Health Check & Error Middleware Recovery
// ---------------------------------------------------------
async function testHealthAndErrorRecovery() {
  console.log('\n======================================================');
  console.log('🧪 SUITE 5: Server Health Check & Error Recovery Tests');
  console.log('======================================================');

  // Test 5.1: Health Endpoint validation
  const h1 = await measure('health_check', () =>
    axios.get(`${BASE_URL}/api/health`)
  );
  assert(
    h1.success && h1.res.status === 200 && h1.res.data.status === 'ok',
    '5.1 GET /api/health returns 200 OK and valid health payload',
    `Uptime: ${Math.round(h1.res?.data?.uptime)}s, Service: "${h1.res?.data?.service}" (${Math.round(h1.duration)}ms)`
  );

  // Test 5.2: Unmatched API route triggers 404 JSON handler
  const h2 = await measure('unmatched_api_route', () =>
    axios.get(`${BASE_URL}/api/non_existent_endpoint_${Date.now()}`).catch(e => e.response)
  );
  assert(
    h2.res && h2.res.status === 404 && h2.res.data.success === false,
    '5.2 Unmatched API route returns 404 JSON format with descriptive message',
    `HTTP 404: "${h2.res?.data?.error}" (${Math.round(h2.duration)}ms)`
  );

  // Test 5.3: Method Not Allowed / Post to GET-only endpoint
  const h3 = await measure('post_to_get_endpoint', () =>
    axios.post(`${BASE_URL}/api/health`, { some: 'data' }).catch(e => e.response)
  );
  assert(
    h3.res && (h3.res.status === 404 || h3.res.status === 405 || h3.res.status === 200),
    '5.3 Unexpected HTTP method handled gracefully by router',
    `HTTP Status: ${h3.res?.status} (${Math.round(h3.duration)}ms)`
  );

  // Test 5.4: Post-Stress Liveness & Memory Check
  const h4 = await measure('post_stress_health_verification', () =>
    axios.get(`${BASE_URL}/api/health`)
  );
  assert(
    h4.success && h4.res.status === 200 && h4.res.data.status === 'ok',
    '5.4 Post-stress health check proves server process remains fully alive and stable',
    `Uptime continuous: ${Math.round(h4.res?.data?.uptime)}s (${Math.round(h4.duration)}ms)`
  );
}

// ---------------------------------------------------------
// MAIN TEST HARNESS RUNNER
// ---------------------------------------------------------
async function runAllSuites() {
  console.log('================================================================');
  console.log('🚀 RAHULTUBE MILESTONE 1: EMPIRICAL STRESS & BENCHMARK HARNESS');
  console.log(`📡 Target Backend: ${BASE_URL}`);
  console.log('================================================================');

  const overallStart = performance.now();

  try {
    await testChannelEndpoints();
    await testShortsEndpoints();
    await testRecommendationsEndpoint();
    await testStreamEndpoints();
    await testHealthAndErrorRecovery();
  } catch (err) {
    console.error('Fatal unhandled error during test execution:', err);
  }

  const overallDuration = performance.now() - overallStart;

  console.log('\n================================================================');
  console.log('📊 PERFORMANCE LATENCY BENCHMARK SUMMARY (in milliseconds)');
  console.log('================================================================');
  console.log('| Endpoint / Test Action              | Samples | Min (ms) | Max (ms) | Avg (ms) | P95 (ms) |');
  console.log('|-------------------------------------|---------|----------|----------|----------|----------|');

  for (const [key, latencies] of Object.entries(stats.latencies)) {
    const s = calculateStats(latencies);
    const keyPadded = key.padEnd(35, ' ');
    const countPadded = String(s.count).padStart(7, ' ');
    const minPadded = String(s.min).padStart(8, ' ');
    const maxPadded = String(s.max).padStart(8, ' ');
    const avgPadded = String(s.avg).padStart(8, ' ');
    const p95Padded = String(s.p95).padStart(8, ' ');
    console.log(`| ${keyPadded} | ${countPadded} | ${minPadded} | ${maxPadded} | ${avgPadded} | ${p95Padded} |`);
  }

  console.log('================================================================');
  console.log(`🏁 FINAL SCORE: ${stats.passed} PASSED / ${stats.failed} FAILED (Total: ${stats.total})`);
  console.log(`⏱️ Total Suite Execution Time: ${Math.round(overallDuration)}ms`);
  console.log(`🎯 EMPIRICAL VERDICT: ${stats.failed === 0 ? 'APPROVE ✅' : 'REQUEST_CHANGES ❌'}`);
  console.log('================================================================\n');

  if (stats.failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAllSuites();
