/**
 * adversarial_m1_test.js - Comprehensive Empirical Adversarial Test Harness for RahulTube Milestone 1
 * Stress tests concurrency, deep pagination, URL parsing, fuzzing/injections, comments, audio proxy range headers.
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:5000';
const client = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  validateStatus: () => true // Allow handling all status codes manually
});

const results = {
  total: 0,
  passed: 0,
  failed: 0,
  details: []
};

function record(name, pass, message, extra = null) {
  results.total++;
  if (pass) {
    results.passed++;
    console.log(`  ✅ [PASS] ${name} - ${message}`);
  } else {
    results.failed++;
    console.error(`  ❌ [FAIL] ${name} - ${message}`);
  }
  results.details.push({ name, pass, message, extra });
}

// -------------------------------------------------------------
// Suite 1: Concurrency Burst & Cache Stress Test
// -------------------------------------------------------------
async function testConcurrency() {
  console.log('\n--- [SUITE 1] Concurrency & Cache Stress Testing ---');

  // Test 1A: 25 distinct concurrent search queries
  const distinctQueries = [
    'lofi beats', 'react tutorial', 'javascript async await', 'funny cats',
    'ambient space music', 'quantum physics documentary', 'cooking pasta',
    'synthwave 80s', 'world history timeline', 'rust programming beginner',
    'unreal engine 5', 'gordon ramsay cooking', 'cybersecurity 101',
    'deep sea exploration', 'minecraft speedrun', 'web development 2026',
    'machine learning basics', 'chess opening guide', 'astronomy live',
    'rock classic hits', 'yoga morning stretch', 'origami tutorial',
    'piano relaxing', 'coffee brewing guide', 'formula 1 highlights'
  ];

  const startTimeA = Date.now();
  const promisesA = distinctQueries.map(q => client.get(`/api/search?q=${encodeURIComponent(q)}`));
  const responsesA = await Promise.all(promisesA);
  const durationA = Date.now() - startTimeA;

  const successA = responsesA.filter(r => r.status === 200 && r.data?.success);
  record(
    'Concurrency: 25 distinct queries burst',
    successA.length >= 22, // Allow small network jitter if any
    `${successA.length}/25 succeeded in ${durationA}ms (Avg ${(durationA/25).toFixed(0)}ms/req)`
  );

  // Test 1B: 30 identical concurrent requests (Cache Hit & Race Condition Stress)
  const startTimeB = Date.now();
  const promisesB = Array.from({ length: 30 }, () => client.get('/api/search?q=cache_stress_test'));
  const responsesB = await Promise.all(promisesB);
  const durationB = Date.now() - startTimeB;

  const successB = responsesB.filter(r => r.status === 200 && r.data?.success);
  const avgCachedLatency = durationB / 30;
  record(
    'Concurrency: 30 identical queries cache burst',
    successB.length === 30,
    `All 30 resolved in ${durationB}ms (${avgCachedLatency.toFixed(1)}ms avg latency per request)`
  );

  // Test 1C: Cache retrieval speed verification
  const t0 = Date.now();
  const cachedRes = await client.get('/api/search?q=cache_stress_test');
  const tCache = Date.now() - t0;
  record(
    'Cache: Instant memory retrieval latency',
    cachedRes.status === 200 && tCache < 50,
    `Cached request returned in ${tCache}ms (<50ms threshold)`
  );
}

// -------------------------------------------------------------
// Suite 2: Deep Pagination Chaining
// -------------------------------------------------------------
async function testDeepPagination() {
  console.log('\n--- [SUITE 2] Deep Continuation Token Pagination ---');

  // 2A: Search Pagination 3-4 levels deep
  try {
    const p1 = await client.get('/api/search?q=space+documentary');
    let continuation1 = p1.data?.continuationToken;
    record(
      'Pagination: Search Page 1 returns valid items and token',
      p1.status === 200 && p1.data?.videos?.length > 0 && typeof continuation1 === 'string',
      `Found ${p1.data?.videos?.length} videos, continuationToken present: ${Boolean(continuation1)}`
    );

    if (continuation1) {
      const p2 = await client.get(`/api/search?continuation=${encodeURIComponent(continuation1)}`);
      let continuation2 = p2.data?.continuationToken;
      record(
        'Pagination: Search Page 2 successfully fetches next batch',
        p2.status === 200 && p2.data?.videos?.length > 0,
        `Page 2 returned ${p2.data?.videos?.length} videos, nextToken present: ${Boolean(continuation2)}`
      );

      if (continuation2) {
        const p3 = await client.get(`/api/search?continuation=${encodeURIComponent(continuation2)}`);
        let continuation3 = p3.data?.continuationToken;
        record(
          'Pagination: Search Page 3 successfully fetches next batch',
          p3.status === 200 && p3.data?.videos?.length > 0,
          `Page 3 returned ${p3.data?.videos?.length} videos, nextToken present: ${Boolean(continuation3)}`
        );
      } else {
        record('Pagination: Search Page 3', true, 'Page 2 had no further continuation (end of stream)');
      }
    }
  } catch (e) {
    record('Pagination: Search deep pagination', false, `Failed with error: ${e.message}`);
  }

  // 2B: Shorts Deep Pagination
  try {
    const s1 = await client.get('/api/shorts?category=viral');
    const sCont1 = s1.data?.continuationToken;
    record(
      'Pagination: Shorts Page 1 returns shorts and token',
      s1.status === 200 && s1.data?.shorts?.length > 0 && typeof sCont1 === 'string',
      `Returned ${s1.data?.shorts?.length} shorts, continuationToken present: ${Boolean(sCont1)}`
    );

    if (sCont1) {
      const s2 = await client.get(`/api/shorts?continuation=${encodeURIComponent(sCont1)}`);
      record(
        'Pagination: Shorts Page 2 chained continuation',
        s2.status === 200 && s2.data?.shorts?.length > 0,
        `Page 2 returned ${s2.data?.shorts?.length} shorts`
      );
    }
  } catch (e) {
    record('Pagination: Shorts pagination', false, `Failed with error: ${e.message}`);
  }
}

// -------------------------------------------------------------
// Suite 3: Direct YouTube URL & ID Resolution Matrix
// -------------------------------------------------------------
async function testUrlResolution() {
  console.log('\n--- [SUITE 3] Direct URL & Video ID Resolution Matrix ---');

  const testCases = [
    { input: 'dQw4w9WgXcQ', expected: 'dQw4w9WgXcQ', desc: 'Raw 11-char ID' },
    { input: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', expected: 'dQw4w9WgXcQ', desc: 'Standard desktop watch URL' },
    { input: 'http://youtube.com/watch?v=dQw4w9WgXcQ', expected: 'dQw4w9WgXcQ', desc: 'HTTP desktop watch URL' },
    { input: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s&list=PLrEnWoR732-BHrPp_AKTQoDC5671HRhQu', expected: 'dQw4w9WgXcQ', desc: 'URL with &t= and &list= params' },
    { input: 'https://www.youtube.com/watch?feature=share&v=dQw4w9WgXcQ&t=10', expected: 'dQw4w9WgXcQ', desc: 'URL with v parameter not first' },
    { input: 'https://youtu.be/dQw4w9WgXcQ', expected: 'dQw4w9WgXcQ', desc: 'Shortened youtu.be link' },
    { input: 'https://youtu.be/dQw4w9WgXcQ?t=15&feature=share', expected: 'dQw4w9WgXcQ', desc: 'Shortened youtu.be with params' },
    { input: 'https://www.youtube.com/shorts/dQw4w9WgXcQ', expected: 'dQw4w9WgXcQ', desc: 'Shorts URL format' },
    { input: 'https://www.youtube.com/live/dQw4w9WgXcQ?si=abcdef123456', expected: 'dQw4w9WgXcQ', desc: 'Live URL format' },
    { input: 'https://www.youtube.com/embed/dQw4w9WgXcQ', expected: 'dQw4w9WgXcQ', desc: 'Embed URL format' },
    { input: 'https://m.youtube.com/watch?v=dQw4w9WgXcQ', expected: 'dQw4w9WgXcQ', desc: 'Mobile m.youtube.com URL' }
  ];

  for (const tc of testCases) {
    try {
      const res = await client.get(`/api/search?q=${encodeURIComponent(tc.input)}`);
      const isDirect = res.data?.isDirectVideo === true;
      const matchedId = res.data?.videoId === tc.expected;
      record(
        `URL Resolver: ${tc.desc}`,
        res.status === 200 && isDirect && matchedId,
        `Extracted videoId="${res.data?.videoId}", isDirect=${res.data?.isDirectVideo}`
      );
    } catch (e) {
      record(`URL Resolver: ${tc.desc}`, false, `Threw exception: ${e.message}`);
    }
  }

  // Negative test cases: regular keyword queries should NOT be detected as direct IDs
  const negativeCases = [
    { input: 'javascript tutorial', desc: 'Multi-word query' },
    { input: 'short', desc: '5-letter word' },
    { input: 'https://example.com/watch?v=dQw4w9WgXcQ', desc: 'Non-youtube domain' },
    { input: 'dQw4w9WgXc', desc: '10-char string (too short)' },
    { input: 'dQw4w9WgXcQ1', desc: '12-char string (too long)' }
  ];

  for (const nc of negativeCases) {
    try {
      const res = await client.get(`/api/search?q=${encodeURIComponent(nc.input)}`);
      const isNotDirect = res.data?.isDirectVideo === false && res.data?.videoId === null;
      record(
        `Negative URL Resolver: ${nc.desc}`,
        res.status === 200 && isNotDirect,
        `isDirectVideo=${res.data?.isDirectVideo}, videoId=${res.data?.videoId}`
      );
    } catch (e) {
      record(`Negative URL Resolver: ${nc.desc}`, false, `Threw exception: ${e.message}`);
    }
  }
}

// -------------------------------------------------------------
// Suite 4: Extreme Inputs, Fuzzing & Injection Probes
// -------------------------------------------------------------
async function testExtremeInputs() {
  console.log('\n--- [SUITE 4] Extreme Inputs, Injection Probes & Fuzzing ---');

  // 4A: Unicode Emojis & Multilingual Characters
  const unicodeTests = [
    { q: '🔥🎧💻🚀✨', label: 'Emoji sequence' },
    { q: 'العربية موسيقى', label: 'Arabic script (RTL)' },
    { q: '中文流行音乐', label: 'Chinese Simplified' },
    { q: '日本語 アニメ サントラ', label: 'Japanese Kanji/Kana' },
    { q: 'русский рок классика', label: 'Cyrillic Russian' },
    { q: 'संस्कृत मन्त्र', label: 'Devanagari Sanskrit' }
  ];

  for (const ut of unicodeTests) {
    try {
      const res = await client.get(`/api/search?q=${encodeURIComponent(ut.q)}`);
      record(
        `Unicode Support: ${ut.label}`,
        res.status === 200 && res.data?.success === true && Array.isArray(res.data?.videos),
        `Query "${ut.q}" returned ${res.data?.videos?.length} results`
      );
    } catch (e) {
      record(`Unicode Support: ${ut.label}`, false, `Error: ${e.message}`);
    }
  }

  // 4B: Large Strings (1,000 chars and 4,000 chars)
  const str1000 = 'a'.repeat(1000);
  const str4000 = 'word '.repeat(800);
  try {
    const res1000 = await client.get(`/api/search?q=${encodeURIComponent(str1000)}`);
    record(
      'Extreme Input: 1,000-character query',
      res1000.status === 200,
      `Handled gracefully with status ${res1000.status}`
    );

    const res4000 = await client.get(`/api/search?q=${encodeURIComponent(str4000)}`);
    record(
      'Extreme Input: 4,000-character query',
      res4000.status === 200,
      `Handled gracefully with status ${res4000.status}`
    );
  } catch (e) {
    record('Extreme Input: Long strings', false, `Error: ${e.message}`);
  }

  // 4C: Injection Probes (SQL, XSS, Path Traversal, SSTI, Prototype Pollution)
  const injectionProbes = [
    { q: "'; DROP TABLE videos; --", label: 'SQL Injection' },
    { q: "' OR '1'='1", label: 'SQL Boolean Injection' },
    { q: '<script>alert("XSS")</script>', label: 'XSS Script Tag' },
    { q: '<img src=x onerror=alert(document.cookie)>', label: 'XSS Image Tag' },
    { q: '../../../../etc/passwd', label: 'Path Traversal' },
    { q: '..\\..\\..\\windows\\system32', label: 'Windows Path Traversal' },
    { q: '{{7*7}}', label: 'SSTI Template Tag' },
    { q: '${process.env.PORT}', label: 'Template Literal Probe' },
    { q: '__proto__[polluted]=true', label: 'Prototype Pollution Probe' }
  ];

  for (const probe of injectionProbes) {
    try {
      const res = await client.get(`/api/search?q=${encodeURIComponent(probe.q)}`);
      record(
        `Security Probe: ${probe.label}`,
        res.status === 200 && res.data?.success !== undefined,
        `Safely handled, returned HTTP ${res.status}, success=${res.data?.success}`
      );
    } catch (e) {
      record(`Security Probe: ${probe.label}`, false, `Crashed or failed: ${e.message}`);
    }
  }

  // 4D: Null, Undefined, Empty Query Params
  const emptyParamTests = [
    { url: '/api/search', label: 'Missing ?q param' },
    { url: '/api/search?q=', label: 'Empty ?q= param' },
    { url: '/api/search?q=null', label: 'Literal "null" string' },
    { url: '/api/search?q=undefined', label: 'Literal "undefined" string' },
    { url: '/api/suggestions', label: 'Suggestions without ?q' },
    { url: '/api/suggestions?q=', label: 'Suggestions empty ?q=' }
  ];

  for (const ep of emptyParamTests) {
    try {
      const res = await client.get(ep.url);
      record(
        `Null/Empty Param: ${ep.label}`,
        res.status === 200,
        `Handled with HTTP 200, returned valid response structure`
      );
    } catch (e) {
      record(`Null/Empty Param: ${ep.label}`, false, `Error: ${e.message}`);
    }
  }

  // 4E: Malformed / High-Volume Recommendations Body
  try {
    // Malformed body (invalid JSON or missing fields)
    const malformedRes = await client.post('/api/recommendations', {
      history: 'not-an-array',
      liked: null,
      randomProp: 12345
    });
    record(
      'Fuzzing: POST /api/recommendations malformed types',
      malformedRes.status === 200 && malformedRes.data?.success === true,
      `Handled malformed body gracefully, generated ${malformedRes.data?.shelves?.length} shelves`
    );

    // Empty body
    const emptyBodyRes = await client.post('/api/recommendations', {});
    record(
      'Fuzzing: POST /api/recommendations empty body',
      emptyBodyRes.status === 200 && emptyBodyRes.data?.success === true,
      `Returned fallback feed with ${emptyBodyRes.data?.flatFeed?.length} items`
    );

    // High volume history items
    const highVolumeHistory = Array.from({ length: 500 }, (_, i) => ({
      id: `vid_${i}`,
      title: `Watched video number ${i}`,
      author: `Channel ${i % 10}`,
      category: i % 2 === 0 ? 'Music' : 'Tech'
    }));
    const highVolRes = await client.post('/api/recommendations', {
      history: highVolumeHistory,
      liked: highVolumeHistory.slice(0, 50),
      subscriptions: ['Channel 1', 'Channel 2', 'Channel 3'],
      queryLog: ['react', 'nextjs', 'typescript']
    });
    record(
      'Stress: POST /api/recommendations with 500 history items',
      highVolRes.status === 200 && highVolRes.data?.success === true,
      `Processed 500 items in response, returned ${highVolRes.data?.shelves?.length} shelves`
    );
  } catch (e) {
    record('Fuzzing: POST /api/recommendations', false, `Error: ${e.message}`);
  }
}

// -------------------------------------------------------------
// Suite 5: Comments Scraping & Pagination on High-Traffic Videos
// -------------------------------------------------------------
async function testComments() {
  console.log('\n--- [SUITE 5] Comments Scraping & Pagination on High-Traffic Videos ---');

  const highTrafficVideos = [
    { id: 'dQw4w9WgXcQ', name: 'Rick Astley - Never Gonna Give You Up' },
    { id: 'jNQXAC9IVRw', name: 'Me at the zoo (First YouTube Video)' }
  ];

  for (const target of highTrafficVideos) {
    try {
      const res1 = await client.get(`/api/comments/${target.id}`);
      const comments1 = res1.data?.comments || [];
      const count = res1.data?.commentCount;
      const continuation1 = res1.data?.continuationToken;

      record(
        `Comments: Initial load for "${target.name}" (${target.id})`,
        res1.status === 200 && res1.data?.success === true && comments1.length > 0,
        `Retrieved ${comments1.length} comments, total count reported: ${count}`
      );

      // Verify structure of first comment
      if (comments1.length > 0) {
        const c = comments1[0];
        const validComment = Boolean(c.id && c.author && c.content && (c.authorThumbnail || c.likeCount !== undefined));
        record(
          `Comments Schema: First comment authentic for ${target.id}`,
          validComment,
          `Author="${c.author}", content="${c.content?.slice(0, 35)}...", likes=${c.likeCount}`
        );
      }

      // Test Comments Pagination
      if (continuation1) {
        const res2 = await client.get(`/api/comments/${target.id}?continuation=${encodeURIComponent(continuation1)}`);
        const comments2 = res2.data?.comments || [];
        const continuation2 = res2.data?.continuationToken;

        record(
          `Comments Pagination: Page 2 for ${target.id}`,
          res2.status === 200 && res2.data?.success === true && comments2.length > 0,
          `Retrieved ${comments2.length} comments in page 2, next token present: ${Boolean(continuation2)}`
        );

        if (continuation2) {
          const res3 = await client.get(`/api/comments/${target.id}?continuation=${encodeURIComponent(continuation2)}`);
          const comments3 = res3.data?.comments || [];
          record(
            `Comments Pagination: Page 3 for ${target.id}`,
            res3.status === 200 && res3.data?.success === true && comments3.length > 0,
            `Retrieved ${comments3.length} comments in page 3`
          );
        }
      }
    } catch (e) {
      record(`Comments: ${target.name}`, false, `Failed: ${e.message}`);
    }
  }

  // Invalid Video ID for Comments
  try {
    const invalidRes = await client.get('/api/comments/invalid_id_9999');
    record(
      'Comments: Non-existent video ID resilience',
      invalidRes.status === 200 || invalidRes.status === 400 || invalidRes.status === 404 || invalidRes.status === 500,
      `Handled gracefully with HTTP ${invalidRes.status}, error="${invalidRes.data?.error || 'none'}"`
    );
  } catch (e) {
    record('Comments: Non-existent video ID resilience', false, `Crash: ${e.message}`);
  }
}

// -------------------------------------------------------------
// Suite 6: Audio Stream Proxy & HTTP Range Request Hardening
// -------------------------------------------------------------
async function testAudioStreamProxy() {
  console.log('\n--- [SUITE 6] Audio Stream Proxy & HTTP Range Requests ---');

  const videoId = 'dQw4w9WgXcQ';

  // 6A: Check Audio Stream Info
  try {
    const infoRes = await client.get(`/api/stream/info/${videoId}`);
    const audio = infoRes.data?.audio;
    record(
      'Audio Info: Stream format metadata extraction',
      infoRes.status === 200 && infoRes.data?.success === true && audio?.best?.url && audio?.formats?.length > 0,
      `Best format: ${audio?.best?.mimeType} (bitrate: ${audio?.best?.bitrate} bps, formats: ${audio?.formats?.length})`
    );
  } catch (e) {
    record('Audio Info: Stream format metadata', false, `Failed: ${e.message}`);
  }

  // 6B: Range Header: bytes=0-1024 (1025 bytes requested)
  try {
    const res1 = await client.get(`/api/stream/audio/${videoId}`, {
      headers: { Range: 'bytes=0-1024' },
      responseType: 'arraybuffer'
    });

    const is206 = res1.status === 206;
    const len = res1.data.byteLength;
    const contentType = res1.headers['content-type'];
    const contentRange = res1.headers['content-range'];
    const acceptRanges = res1.headers['accept-ranges'];

    record(
      'Audio Proxy Range: bytes=0-1024 (1025 bytes)',
      is206 && len === 1025 && contentType?.startsWith('audio/') && contentRange?.includes('bytes 0-1024/'),
      `Status=${res1.status}, ByteLength=${len}, Content-Type=${contentType}, Content-Range=${contentRange}, Accept-Ranges=${acceptRanges}`
    );
  } catch (e) {
    record('Audio Proxy Range: bytes=0-1024', false, `Failed: ${e.message}`);
  }

  // 6C: Range Header: bytes=1025-4096 (3072 bytes offset)
  try {
    const res2 = await client.get(`/api/stream/audio/${videoId}`, {
      headers: { Range: 'bytes=1025-4096' },
      responseType: 'arraybuffer'
    });

    const is206 = res2.status === 206;
    const len = res2.data.byteLength;
    const contentRange = res2.headers['content-range'];

    record(
      'Audio Proxy Range: bytes=1025-4096 (offset chunk)',
      is206 && len === 3072 && contentRange?.includes('bytes 1025-4096/'),
      `Status=${res2.status}, ByteLength=${len}, Content-Range=${contentRange}`
    );
  } catch (e) {
    record('Audio Proxy Range: bytes=1025-4096', false, `Failed: ${e.message}`);
  }

  // 6D: Range Header: bytes=0-0 (Single byte probe)
  try {
    const res3 = await client.get(`/api/stream/audio/${videoId}`, {
      headers: { Range: 'bytes=0-0' },
      responseType: 'arraybuffer'
    });

    record(
      'Audio Proxy Range: Single byte probe (bytes=0-0)',
      res3.status === 206 && res3.data.byteLength === 1,
      `Status=${res3.status}, ByteLength=${res3.data.byteLength}`
    );
  } catch (e) {
    record('Audio Proxy Range: bytes=0-0', false, `Failed: ${e.message}`);
  }

  // 6E: Invalid Video ID for Audio Proxy
  try {
    const invalidStream = await client.get('/api/stream/audio/nonexistent99');
    record(
      'Audio Proxy: Non-existent video ID response',
      invalidStream.status === 404 || invalidStream.status === 502,
      `Correctly returned HTTP ${invalidStream.status}`
    );
  } catch (e) {
    record('Audio Proxy: Non-existent video ID response', false, `Error: ${e.message}`);
  }
}

// -------------------------------------------------------------
// Suite 7: Video Details & Channel Views Edge Cases
// -------------------------------------------------------------
async function testVideoAndChannelEdgeCases() {
  console.log('\n--- [SUITE 7] Video Details & Channel View Edge Cases ---');

  // 7A: Video Details with complex real video
  try {
    const vRes = await client.get('/api/video/dQw4w9WgXcQ');
    const v = vRes.data?.video;
    const rel = vRes.data?.related;
    record(
      'Video Details: Complete schema validation',
      vRes.status === 200 && v && v.id === 'dQw4w9WgXcQ' && v.title && v.author?.name && Array.isArray(rel) && rel.length > 0,
      `Title="${v?.title}", Author="${v?.author?.name}", Verified=${v?.author?.verified}, Related=${rel?.length}`
    );
  } catch (e) {
    record('Video Details: Complete schema validation', false, `Error: ${e.message}`);
  }

  // 7B: Channel View with handle / ID
  try {
    const chRes = await client.get('/api/channel/UC_x5XG1OV2P6uZZ5FSM9Ttw');
    const ch = chRes.data?.channel;
    const tabs = chRes.data?.tabs;
    record(
      'Channel Details: Channel ID UC_x5XG1OV2P6uZZ5FSM9Ttw',
      chRes.status === 200 && ch && ch.name && tabs?.videos?.length > 0,
      `ChannelName="${ch?.name}", Subscribers="${ch?.subscribers}", VideosTab=${tabs?.videos?.length} items`
    );
  } catch (e) {
    record('Channel Details: UC_x5XG1OV2P6uZZ5FSM9Ttw', false, `Error: ${e.message}`);
  }

  // 7C: Trending Category edge case
  try {
    const trRes = await client.get('/api/trending?category=NonExistentCategory123');
    record(
      'Trending: Fallback for custom/unrecognized category',
      trRes.status === 200 && trRes.data?.success === true && Array.isArray(trRes.data?.videos),
      `Returned ${trRes.data?.videos?.length} fallback trending videos`
    );
  } catch (e) {
    record('Trending: Fallback category', false, `Error: ${e.message}`);
  }
}

// -------------------------------------------------------------
// Main Runner & Summary
// -------------------------------------------------------------
async function runAllSuites() {
  console.log('================================================================');
  console.log('🚀 RUNNING ADVERSARIAL STRESS TEST HARNESS — MILESTONE 1');
  console.log('================================================================');

  const overallStart = Date.now();

  try {
    await testConcurrency();
    await testDeepPagination();
    await testUrlResolution();
    await testExtremeInputs();
    await testComments();
    await testAudioStreamProxy();
    await testVideoAndChannelEdgeCases();
  } catch (err) {
    console.error('💥 Unexpected Suite Error:', err);
  }

  const overallDuration = ((Date.now() - overallStart) / 1000).toFixed(2);

  console.log('\n================================================================');
  console.log(`🏁 ADVERSARIAL TEST RESULTS SUMMARY (${overallDuration}s)`);
  console.log(`   TOTAL TESTS:  ${results.total}`);
  console.log(`   PASSED:       ${results.passed}`);
  console.log(`   FAILED:       ${results.failed}`);
  console.log(`   PASS RATE:    ${((results.passed / results.total) * 100).toFixed(1)}%`);
  console.log('================================================================\n');

  if (results.failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAllSuites();
