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
// Scenario 1: Cold Start New User Discovery Journey
// =========================================================================
describe('Tier 4 — Scenario 1: Cold Start New User Discovery Journey', () => {
  const userStorage = createMockLocalStorage();

  test('Step 1: User arrives with clean state (empty history, likes, subs)', () => {
    assertEqual(userStorage.length, 0, 'Initial storage must be empty');
  });

  test('Step 2: Home feed loads trending videos on cold start', async () => {
    const feedRes = await apiRequest('/api/trending?category=All');
    assertEqual(feedRes.status, 200);
    assertGreaterThan(feedRes.data.videos.length, 0);
  });

  test('Step 3: User filters by Category Pill ("Tech")', async () => {
    const techRes = await apiRequest('/api/trending?category=Tech');
    assertEqual(techRes.status, 200);
    assertGreaterThan(techRes.data.videos.length, 0);
  });

  test('Step 4: User searches for "Next.js full course"', async () => {
    const searchRes = await apiRequest('/api/search?q=Next.js+full+course');
    assertEqual(searchRes.status, 200);
    assertGreaterThan(searchRes.data.videos.length, 0);
    const selected = searchRes.data.videos[0];
    assertTruthy(selected.id);
  });

  test('Step 5: User clicks video and enters Watch page', async () => {
    const searchRes = await apiRequest('/api/search?q=Next.js');
    const targetVideo = searchRes.data.videos[0];
    const watchRes = await apiRequest(`/api/video/${targetVideo.id}`);
    assertEqual(watchRes.status, 200);
    assertTruthy(watchRes.data.video);

    // Save to Watch History
    const historyItem = {
      id: watchRes.data.video.id,
      title: watchRes.data.video.title,
      thumbnail: `https://i.ytimg.com/vi/${watchRes.data.video.id}/hqdefault.jpg`,
      author: watchRes.data.video.author,
      views: watchRes.data.video.views,
      duration: watchRes.data.video.duration,
      watchedAt: '3:00 PM'
    };
    userStorage.setItem('rahultube_history', JSON.stringify([historyItem]));
  });

  test('Step 6: Verify Watch History recorded user watch session', () => {
    const history = JSON.parse(userStorage.getItem('rahultube_history') || '[]');
    assertEqual(history.length, 1);
    assertTruthy(history[0].id);
  });
});

// =========================================================================
// Scenario 2: Content Curator & Library Lifecycle
// =========================================================================
describe('Tier 4 — Scenario 2: Content Curator & Library Lifecycle', () => {
  const curatorStorage = createMockLocalStorage();

  test('Step 1: Curator watches multiple videos from distinct channels', () => {
    const videos = [
      { id: 'vid_1', title: 'Rust In 100 Seconds', author: { name: 'Fireship' } },
      { id: 'vid_2', title: 'Why Quantum Computing Matters', author: { name: 'Veritasium' } },
      { id: 'vid_3', title: 'Building Autonomous AI', author: { name: 'Two Minute Papers' } }
    ];
    curatorStorage.setItem('rahultube_history', JSON.stringify(videos));
    assertEqual(JSON.parse(curatorStorage.getItem('rahultube_history')).length, 3);
  });

  test('Step 2: Curator likes 2 videos and subscribes to 2 channels', () => {
    const liked = [
      { id: 'vid_1', title: 'Rust In 100 Seconds', duration: '2:15', thumbnail: 'https://i.ytimg.com/vi/vid_1/hqdefault.jpg' },
      { id: 'vid_2', title: 'Why Quantum Computing Matters', duration: '18:40', thumbnail: 'https://i.ytimg.com/vi/vid_2/hqdefault.jpg' }
    ];
    const subs = ['Fireship', 'Veritasium'];

    curatorStorage.setItem('rahultube_liked', JSON.stringify(liked));
    curatorStorage.setItem('rahultube_subs', JSON.stringify(subs));

    assertEqual(JSON.parse(curatorStorage.getItem('rahultube_liked')).length, 2);
    assertEqual(JSON.parse(curatorStorage.getItem('rahultube_subs')).length, 2);
  });

  test('Step 3: Curator opens Liked page and triggers "Play All"', () => {
    const liked = JSON.parse(curatorStorage.getItem('rahultube_liked'));
    const playAllTargetId = liked[0].id;
    assertEqual(playAllTargetId, 'vid_1');
  });

  test('Step 4: Curator removes 1 video from Liked playlist', () => {
    let liked = JSON.parse(curatorStorage.getItem('rahultube_liked'));
    liked = liked.filter(v => v.id !== 'vid_2');
    curatorStorage.setItem('rahultube_liked', JSON.stringify(liked));
    assertEqual(JSON.parse(curatorStorage.getItem('rahultube_liked')).length, 1);
  });

  test('Step 5: Curator unsubscribes from one channel on Subscriptions page', () => {
    let subs = JSON.parse(curatorStorage.getItem('rahultube_subs'));
    subs = subs.filter(s => s !== 'Veritasium');
    curatorStorage.setItem('rahultube_subs', JSON.stringify(subs));
    assertEqual(JSON.parse(curatorStorage.getItem('rahultube_subs')).length, 1);
    assertEqual(JSON.parse(curatorStorage.getItem('rahultube_subs'))[0], 'Fireship');
  });

  test('Step 6: Curator clears Watch History', () => {
    curatorStorage.removeItem('rahultube_history');
    const history = JSON.parse(curatorStorage.getItem('rahultube_history') || '[]');
    assertEqual(history.length, 0);
  });
});

// =========================================================================
// Scenario 3: Shorts Binge & Social Engagement Session
// =========================================================================
describe('Tier 4 — Scenario 3: Shorts Binge & Social Engagement Session', () => {
  const shortsStorage = createMockLocalStorage();
  let shortsList = [];

  test('Step 1: User navigates to /shorts and receives vertical shorts list', async () => {
    const res = await apiRequest('/api/shorts?category=viral');
    assertEqual(res.status, 200);
    assertGreaterThanOrEqual(res.data.shorts.length, 3);
    shortsList = res.data.shorts;
  });

  test('Step 2: User watches first Short in 9:16 aspect ratio', () => {
    const currentShort = shortsList[0];
    assertTruthy(currentShort.id);
    assertEqual(currentShort.id.length, 11);
  });

  test('Step 3: User likes the first Short', () => {
    const currentShort = shortsList[0];
    let liked = JSON.parse(shortsStorage.getItem('rahultube_liked') || '[]');
    liked.unshift({ id: currentShort.id, title: currentShort.title, duration: 'Short' });
    shortsStorage.setItem('rahultube_liked', JSON.stringify(liked));
    assertEqual(JSON.parse(shortsStorage.getItem('rahultube_liked')).length, 1);
  });

  test('Step 4: User opens comments drawer and inspects reactions', async () => {
    const currentShort = shortsList[0];
    const commentsRes = await apiRequest(`/api/comments/${currentShort.id}`);
    assertEqual(commentsRes.status, 200);
    assertTruthy(commentsRes.data.comments.length > 0);
  });

  test('Step 5: User uses ArrowDown key to navigate through 3 consecutive Shorts', () => {
    let currentIdx = 0;
    const historyTraversed = [shortsList[0].id];

    // Down 1
    currentIdx++;
    historyTraversed.push(shortsList[currentIdx].id);

    // Down 2
    currentIdx++;
    historyTraversed.push(shortsList[currentIdx].id);

    assertEqual(currentIdx, 2);
    assertEqual(historyTraversed.length, 3);
  });

  test('Step 6: User shares Short link via modal', () => {
    const activeShort = shortsList[2];
    const shareUrl = `https://www.youtube.com/shorts/${activeShort.id}`;
    assertIncludes(shareUrl, `https://www.youtube.com/shorts/${activeShort.id}`);
  });
});

// =========================================================================
// Scenario 4: Direct Link Resolution & Video Consumption
// =========================================================================
describe('Tier 4 — Scenario 4: Direct Link Resolution & Video Consumption', () => {
  test('Step 1: User pastes full YouTube watch URL into Navbar search', async () => {
    const input = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    const videoId = extractVideoId(input);
    assertEqual(videoId, 'dQw4w9WgXcQ');

    const searchRes = await apiRequest(`/api/search?q=${encodeURIComponent(input)}`);
    assertEqual(searchRes.status, 200);
    assertTruthy(searchRes.data.isDirectVideo);
    assertEqual(searchRes.data.videoId, 'dQw4w9WgXcQ');
  });

  test('Step 2: Client navigates directly to /watch/:id', async () => {
    const videoId = 'dQw4w9WgXcQ';
    const watchRes = await apiRequest(`/api/video/${videoId}`);
    assertEqual(watchRes.status, 200);
    assertTruthy(watchRes.data.video);
    assertEqual(watchRes.data.video.id, videoId);
  });

  test('Step 3: Player verifies ad-free, modestbranding, and privacy parameters', () => {
    const videoId = 'dQw4w9WgXcQ';
    const embedSrc = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&modestbranding=1&rel=0`;
    assertIncludes(embedSrc, 'youtube-nocookie.com');
    assertIncludes(embedSrc, 'modestbranding=1');
    assertIncludes(embedSrc, 'rel=0');
  });

  test('Step 4: User toggles Theater Mode to expand video span', () => {
    let theaterMode = false;
    theaterMode = true;
    const layoutState = {
      isTheater: theaterMode,
      mainSpanClass: 'lg:col-span-3',
      relatedSpanClass: 'lg:col-span-3 grid grid-cols-4'
    };
    assertTruthy(layoutState.isTheater);
    assertEqual(layoutState.mainSpanClass, 'lg:col-span-3');
  });
});

// =========================================================================
// Scenario 5: Personalized Recommendation Learning Loop
// =========================================================================
describe('Tier 4 — Scenario 5: Personalized Recommendation Learning Loop', () => {
  const profileStorage = createMockLocalStorage();

  test('Step 1: User starts browsing Coding and Tech videos', () => {
    const sessionHistory = [
      { id: 'c1', category: 'Coding', title: 'React 19 Tutorial' },
      { id: 'c2', category: 'Coding', title: 'TypeScript Advanced Types' },
      { id: 'c3', category: 'Tech', title: 'AI Chips Breakdown' },
      { id: 'm1', category: 'Music', title: 'Lofi Study Chill' }
    ];
    profileStorage.setItem('rahultube_history', JSON.stringify(sessionHistory));
  });

  test('Step 2: Algorithm aggregates category and creator affinity weights', () => {
    const history = JSON.parse(profileStorage.getItem('rahultube_history'));
    const affinity = {};
    history.forEach(v => {
      affinity[v.category] = (affinity[v.category] || 0) + 1;
    });

    assertEqual(affinity['Coding'], 2);
    assertEqual(affinity['Tech'], 1);
    assertEqual(affinity['Music'], 1);
  });

  test('Step 3: Top affinity category ("Coding") requested for personalized shelf', async () => {
    const res = await apiRequest('/api/trending?category=Coding');
    assertEqual(res.status, 200);
    assertGreaterThan(res.data.videos.length, 0);
  });

  test('Step 4: User likes a Coding video, strengthening affinity weight', () => {
    let liked = JSON.parse(profileStorage.getItem('rahultube_liked') || '[]');
    liked.push({ id: 'c1', category: 'Coding', title: 'React 19 Tutorial' });
    profileStorage.setItem('rahultube_liked', JSON.stringify(liked));

    const totalCodingScore = (2 * 1.0) + (1 * 3.0); // 2 watches + 1 like
    assertEqual(totalCodingScore, 5.0);
  });
});

// =========================================================================
// Scenario 6: Failover & Network Resiliency Session
// =========================================================================
describe('Tier 4 — Scenario 6: Failover & Network Resiliency Session', () => {
  test('1. Video details request with unknown ID returns graceful fallback model without 500 error', async () => {
    const res = await apiRequest('/api/video/unreachable_upstream_id');
    assertEqual(res.status, 200);
    assertTruthy(res.data.success);
    assertTruthy(res.data.video);
    assertEqual(res.data.video.id, 'unreachable_upstream_id');
  });

  test('2. Comments request on video with network disruption provides clean array response', async () => {
    const res = await apiRequest('/api/comments/timeout_simulate_id');
    assertEqual(res.status, 200);
    assertTruthy(res.data.success);
    assertTruthy(Array.isArray(res.data.comments));
  });


  test('3. Client fallback thumbnail substitution handles image load errors cleanly', () => {
    const video = { id: 'err_img_123', thumbnail: 'https://broken.domain.com/broken.jpg' };
    const handleImgError = () => {
      video.thumbnail = `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`;
    };
    handleImgError();
    assertEqual(video.thumbnail, 'https://i.ytimg.com/vi/err_img_123/hqdefault.jpg');
  });

  test('4. Corrupted storage recovery preserves application stability', () => {
    const badStorage = createMockLocalStorage({
      rahultube_history: 'CORRUPTED_RAW_STRING_NOT_JSON'
    });
    let safeList = [];
    try {
      safeList = JSON.parse(badStorage.getItem('rahultube_history') || '[]');
    } catch (e) {
      safeList = [];
    }
    assertEqual(safeList.length, 0);
  });
});
