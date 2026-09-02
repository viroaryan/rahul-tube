/**
 * backend_concurrency_stress.test.js
 * 
 * High Concurrency & Resiliency Stress Test Suite (50 parallel requests across mixed endpoints)
 */

import axios from 'axios';
import { performance } from 'perf_hooks';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5000';

async function runConcurrencyStress() {
  console.log('\n================================================================');
  console.log('⚡ SUSTAINED HIGH-CONCURRENCY STRESS TEST (50 PARALLEL REQUESTS)');
  console.log('================================================================');

  const endpoints = [
    { name: 'Health Check', url: `${BASE_URL}/api/health`, method: 'GET' },
    { name: 'Search Trending', url: `${BASE_URL}/api/search?q=trending`, method: 'GET' },
    { name: 'Search Music', url: `${BASE_URL}/api/search?q=music+2026`, method: 'GET' },
    { name: 'Video Details', url: `${BASE_URL}/api/video/dQw4w9WgXcQ`, method: 'GET' },
    { name: 'Comments', url: `${BASE_URL}/api/comments/dQw4w9WgXcQ`, method: 'GET' },
    { name: 'Shorts Viral', url: `${BASE_URL}/api/shorts?category=viral`, method: 'GET' },
    { name: 'Shorts Tech', url: `${BASE_URL}/api/shorts?category=tech`, method: 'GET' },
    { name: 'Channel ID', url: `${BASE_URL}/api/channel/UC_x5XG1OV2P6uZZ5FSM9Ttw`, method: 'GET' },
    { name: 'Trending Gaming', url: `${BASE_URL}/api/trending?category=Gaming`, method: 'GET' },
    { name: 'Recommendations Post', url: `${BASE_URL}/api/recommendations`, method: 'POST', data: { history: [{ id: 'dQw4w9WgXcQ', title: 'Rick Astley' }] } }
  ];

  // Generate 50 mixed concurrent requests
  const requests = [];
  for (let i = 0; i < 50; i++) {
    const ep = endpoints[i % endpoints.length];
    requests.push({
      id: i + 1,
      name: ep.name,
      promise: (async () => {
        const t0 = performance.now();
        try {
          const res = ep.method === 'POST' 
            ? await axios.post(ep.url, ep.data, { timeout: 15000 })
            : await axios.get(ep.url, { timeout: 15000 });
          const dur = performance.now() - t0;
          return { id: i + 1, name: ep.name, status: res.status, ok: res.status >= 200 && res.status < 300, duration: dur };
        } catch (err) {
          const dur = performance.now() - t0;
          return { id: i + 1, name: ep.name, status: err.response?.status || 500, ok: false, error: err.message, duration: dur };
        }
      })()
    });
  }

  const tStart = performance.now();
  const results = await Promise.all(requests.map(r => r.promise));
  const tTotal = performance.now() - tStart;

  const passed = results.filter(r => r.ok).length;
  const failed = results.filter(r => !r.ok).length;
  const latencies = results.map(r => r.duration);
  const minLat = Math.round(Math.min(...latencies));
  const maxLat = Math.round(Math.max(...latencies));
  const avgLat = Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);

  console.log(`\nResults for 50 concurrent requests:`);
  console.log(`- Succeeded: ${passed} / 50 (${Math.round((passed / 50) * 100)}%)`);
  console.log(`- Failed:    ${failed} / 50`);
  console.log(`- Wall Time: ${Math.round(tTotal)} ms`);
  console.log(`- Latencies: Min ${minLat}ms | Max ${maxLat}ms | Avg ${avgLat}ms`);
  console.log(`- Throughput: ${(50 / (tTotal / 1000)).toFixed(2)} req/sec`);

  if (failed === 0) {
    console.log('\n✅ 50-CONCURRENT STRESS SUITE PASSED PERFECTLY!\n');
    process.exit(0);
  } else {
    console.error('\n❌ CONCURRENCY STRESS DETECTED FAILURES\n');
    process.exit(1);
  }
}

runConcurrencyStress();
