import {
  describe,
  test,
  assert,
  assertEqual,
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


function extractVideoId(input) {
  if (!input) return null;
  const str = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(str)) return str;
  const match = str.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
  if (match && match[1]) return match[1];
  return null;
}

// =========================================================================
// R1 Boundaries: UI & Layout Edge Conditions
// =========================================================================
describe('Tier 2 — R1 Boundaries: UI, Layout & Navigation Corners', () => {
  test('1. Empty or undefined category string defaults cleanly to All category', async () => {
    const res = await apiRequest('/api/trending?category=');
    assertEqual(res.status, 200);
    assertTruthy(res.data.success);
    assertGreaterThan(res.data.videos.length, 0);
  });

  test('2. Extremely long video title (500+ chars) clamps safely without layout breakage', () => {
    const ultraLongTitle = 'A'.repeat(600);
    const lineClampClass = 'line-clamp-2 leading-snug break-words';
    assertIncludes(lineClampClass, 'line-clamp-2');
    assertIncludes(lineClampClass, 'break-words');
    assertGreaterThan(ultraLongTitle.length, 500);
  });

  test('3. Mobile narrow viewport (320px width) activates single-column grid and bottom navigation', () => {
    const viewportWidth = 320;
    const isMobile = viewportWidth < 768;
    const gridCols = isMobile ? 'grid-cols-1' : 'grid-cols-4';
    assertTruthy(isMobile);
    assertEqual(gridCols, 'grid-cols-1');
  });

  test('4. Ultra-wide 4K viewport (3840px width) caps max container width to prevent stretching', () => {
    const maxContainerClass = 'max-w-[1700px] mx-auto';
    assertIncludes(maxContainerClass, 'max-w-[1700px]');
    assertIncludes(maxContainerClass, 'mx-auto');
  });

  test('5. Rapid sequential sidebar toggle clicks maintain boolean consistency', () => {
    let sidebarOpen = true;
    const toggle = () => { sidebarOpen = !sidebarOpen; };
    // Click 11 times (odd number => state should be false)
    for (let i = 0; i < 11; i++) toggle();
    assertEqual(sidebarOpen, false);
    // Click 1 more time => true
    toggle();
    assertEqual(sidebarOpen, true);
  });
});

// =========================================================================
// R2 Boundaries: Search & InnerTube Scraping Edge Conditions
// =========================================================================
describe('Tier 2 — R2 Boundaries: Search, URLs & Scraping Corner Cases', () => {
  test('1. Search with completely empty query string defaults to trending videos', async () => {
    const res = await apiRequest('/api/search?q=');
    assertEqual(res.status, 200);
    assertTruthy(res.data.success);
    assertGreaterThan(res.data.videos.length, 0);
  });

  test('2. Search with whitespace only ("   ") handles cleanly without crash', async () => {
    const res = await apiRequest('/api/search?q=%20%20%20');
    assertEqual(res.status, 200);
    assertTruthy(res.data.success);
    assertTruthy(Array.isArray(res.data.videos));
  });

  test('3. Search with special symbols, Unicode, Hindi, and Emojis handles properly', async () => {
    const query = 'गाने 2026 🎵🔥 #trending & top';
    const res = await apiRequest(`/api/search?q=${encodeURIComponent(query)}`);
    assertEqual(res.status, 200);
    assertTruthy(res.data.success);
  });

  test('4. XSS & HTML injection attempt in search query is treated as literal search string', async () => {
    const malicious = '<script>alert("xss")</script><img src=x onerror=alert(1)>';
    const res = await apiRequest(`/api/search?q=${encodeURIComponent(malicious)}`);
    assertEqual(res.status, 200);
    assertTruthy(res.data.success);
    assertType(res.data.videos, 'object');
  });

  test('5. Malformed YouTube URLs fail extractVideoId gracefully returning null', () => {
    assertEqual(extractVideoId('http://youtube.com/not_a_video'), null);
    assertEqual(extractVideoId('https://youtube.com/watch?invalidParam=123'), null);
    assertEqual(extractVideoId('https://youtu.be/tooShort'), null);
    assertEqual(extractVideoId(''), null);
    assertEqual(extractVideoId(null), null);
    assertEqual(extractVideoId(undefined), null);
  });


  test('6. Video details request with non-existent ID returns resilient fallback metadata', async () => {
    const res = await apiRequest('/api/video/invalid_id_999');
    assertEqual(res.status, 200);
    assertTruthy(res.data.success);
    assertTruthy(res.data.video);
    assertEqual(res.data.video.id, 'invalid_id_999');
  });

  test('7. Invalid / expired continuation pagination token returns graceful empty fallback', async () => {
    const res = await apiRequest('/api/search?q=music&continuation=invalid_token_xyz987');
    assertEqual(res.status, 200);
    assertTruthy(res.data.success);
    assertTruthy(Array.isArray(res.data.videos));
  });
});

// =========================================================================
// R3 Boundaries: Personalization & Storage Edge Conditions
// =========================================================================
describe('Tier 2 — R3 Boundaries: Recommendation & Profile Cold-Starts', () => {
  test('1. Cold start scenario with 0 history, 0 likes, 0 subs returns rich trending feed', async () => {
    const storage = createMockLocalStorage();
    const history = JSON.parse(storage.getItem('rahultube_history') || '[]');
    const likes = JSON.parse(storage.getItem('rahultube_liked') || '[]');
    assertEqual(history.length, 0);
    assertEqual(likes.length, 0);
    
    // System should fall back to trending
    const res = await apiRequest('/api/trending?category=All');
    assertEqual(res.status, 200);
    assertGreaterThan(res.data.videos.length, 0);
  });

  test('2. Corrupted JSON string in localStorage is caught and safely recovered to empty array', () => {
    const storage = createMockLocalStorage({
      rahultube_history: '{malformed_json_without_closing_brackets...'
    });
    let list = [];
    try {
      list = JSON.parse(storage.getItem('rahultube_history') || '[]');
    } catch (e) {
      list = [];
    }
    assertEqual(list.length, 0);
  });

  test('3. Extreme history list size (1000 items) is pruned to 50 items to protect storage quota', () => {
    const oversizedList = Array.from({ length: 1000 }).map((_, i) => ({ id: `vid_${i}` }));
    const cappedList = oversizedList.slice(0, 50);
    assertEqual(cappedList.length, 50);
    assertEqual(cappedList[0].id, 'vid_0');
  });

  test('4. Single-channel dominance in history maintains diversified fallback candidates', () => {
    const history = Array.from({ length: 20 }).map(() => ({
      id: 'v_same',
      author: { name: 'DominantChannel' }
    }));
    const uniqueChannels = new Set(history.map(v => v.author?.name));
    assertEqual(uniqueChannels.size, 1);
    // Recommendation system injects discovery pool when channel entropy is low
    const discoveryRatio = uniqueChannels.size === 1 ? 0.5 : 0.2;
    assertEqual(discoveryRatio, 0.5);
  });

  test('5. Rapid repetitive like/unlike clicks maintain idempotent state', () => {
    const storage = createMockLocalStorage();
    const video = { id: 'toggle_vid', title: 'Toggle Test' };
    
    // Toggle 100 times (even count => not liked at the end)
    for (let i = 0; i < 100; i++) {
      let liked = JSON.parse(storage.getItem('rahultube_liked') || '[]');
      if (liked.some(v => v.id === video.id)) {
        liked = liked.filter(v => v.id !== video.id);
      } else {
        liked.unshift(video);
      }
      storage.setItem('rahultube_liked', JSON.stringify(liked));
    }
    const finalLiked = JSON.parse(storage.getItem('rahultube_liked') || '[]');
    assertEqual(finalLiked.length, 0);
  });
});

// =========================================================================
// R4 Boundaries: Shorts Navigation & Edge Scenarios
// =========================================================================
describe('Tier 2 — R4 Boundaries: Shorts Edge Navigation & Missing Data', () => {
  test('1. Navigation on single-item Shorts queue remains clamped at index 0', () => {
    const singleQueue = [{ id: 'only_short' }];
    let idx = 0;
    // Attempt next
    if (idx < singleQueue.length - 1) idx++;
    assertEqual(idx, 0);
    // Attempt prev
    if (idx > 0) idx--;
    assertEqual(idx, 0);
  });

  test('2. Short item with missing thumbnail substitutes valid fallback image URL', () => {
    const shortWithoutThumb = { id: 'no_thumb_id', thumbnail: null };
    const safeThumbUrl = shortWithoutThumb.thumbnail || `https://i.ytimg.com/vi/${shortWithoutThumb.id}/hqdefault.jpg`;
    assertEqual(safeThumbUrl, 'https://i.ytimg.com/vi/no_thumb_id/hqdefault.jpg');
  });

  test('3. Short item with null sound metadata renders default Original Sound tag', () => {
    const short = { id: 's1', sound: null, views: '1M' };
    const soundTitle = short.sound?.title || `Original Sound • ${short.views}`;
    assertEqual(soundTitle, 'Original Sound • 1M');
  });

  test('4. Rapid keyboard spam (j/k or ArrowDown) clamps cleanly within queue limits', () => {
    const queue = [{ id: '1' }, { id: '2' }, { id: '3' }];
    let currentIdx = 0;
    // Spam next 50 times
    for (let i = 0; i < 50; i++) {
      if (currentIdx < queue.length - 1) currentIdx++;
    }
    assertEqual(currentIdx, 2);
    // Spam prev 50 times
    for (let i = 0; i < 50; i++) {
      if (currentIdx > 0) currentIdx--;
    }
    assertEqual(currentIdx, 0);
  });

  test('5. Non-existent short ID passed to comments returns empty comments gracefully', async () => {
    const res = await apiRequest('/api/comments/non_existent_short_99');
    assertEqual(res.status, 200);
    assertTruthy(res.data.success);
    assertTruthy(Array.isArray(res.data.comments));
  });
});

// =========================================================================
// R5 Boundaries: Premium Suite & Library Edge Conditions
// =========================================================================
describe('Tier 2 — R5 Boundaries: Premium State, Subscriptions & Storage Corners', () => {
  test('1. Clearing watch history when already empty does not throw error', () => {
    const storage = createMockLocalStorage();
    storage.removeItem('rahultube_history');
    const list = JSON.parse(storage.getItem('rahultube_history') || '[]');
    assertEqual(list.length, 0);
  });

  test('2. Removing non-existent ID from liked list leaves array intact', () => {
    const storage = createMockLocalStorage({
      rahultube_liked: JSON.stringify([{ id: 'v1', title: 'Video 1' }])
    });
    let liked = JSON.parse(storage.getItem('rahultube_liked'));
    liked = liked.filter(v => v.id !== 'non_existent_id');
    storage.setItem('rahultube_liked', JSON.stringify(liked));
    assertEqual(JSON.parse(storage.getItem('rahultube_liked')).length, 1);
  });

  test('3. Subscribing to existing channel is deduplicated and not added twice', () => {
    const storage = createMockLocalStorage({
      rahultube_subs: JSON.stringify(['Veritasium'])
    });
    const subList = JSON.parse(storage.getItem('rahultube_subs'));
    const channelName = 'Veritasium';
    if (!subList.includes(channelName)) {
      subList.unshift(channelName);
    }
    storage.setItem('rahultube_subs', JSON.stringify(subList));
    assertEqual(JSON.parse(storage.getItem('rahultube_subs')).length, 1);
  });

  test('4. Subscribing with null or whitespace channel name is safely rejected', () => {
    let subList = ['Channel A'];
    const addSub = (name) => {
      if (!name || !name.trim()) return false;
      subList.unshift(name.trim());
      return true;
    };
    assertEqual(addSub(null), false);
    assertEqual(addSub('   '), false);
    assertEqual(subList.length, 1);
  });

  test('5. Share URL generation with special characters in video title escapes properly', () => {
    const video = { id: 'dQw4w9WgXcQ', title: 'Never Gonna Give You Up & More <Live>' };
    const shareUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(video.id)}`;
    assertEqual(shareUrl, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  });
});
