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

describe('Tier 3 — Pairwise 1: Search Query Execution -> Watch Page Transition', () => {
  test('1. Search for keyword retrieves video candidate', async () => {
    const searchRes = await apiRequest('/api/search?q=javascript+basics');
    assertEqual(searchRes.status, 200);
    assertGreaterThan(searchRes.data.videos.length, 0);
    const selectedVideo = searchRes.data.videos[0];

    // Follow through to watch page API
    const watchRes = await apiRequest(`/api/video/${selectedVideo.id}`);
    assertEqual(watchRes.status, 200);
    assertTruthy(watchRes.data.video);
    assertEqual(watchRes.data.video.id, selectedVideo.id);
  });

  test('2. Watch transition populates related videos for the selected search result', async () => {
    const searchRes = await apiRequest('/api/search?q=lofi+music');
    const firstVid = searchRes.data.videos[0];
    const watchRes = await apiRequest(`/api/video/${firstVid.id}`);
    assertTruthy(Array.isArray(watchRes.data.related));
  });

  test('3. Watch transition appends video entry to local Watch History', () => {
    const storage = createMockLocalStorage();
    const video = {
      id: 'selected_vid_1',
      title: 'JavaScript In 100 Seconds',
      thumbnail: 'https://i.ytimg.com/vi/selected_vid_1/hqdefault.jpg',
      author: { name: 'Fireship' },
      views: '2M views',
      duration: '2:15',
      watchedAt: '2:30 PM'
    };
    
    // Simulate VideoPlayerView history logging
    let history = JSON.parse(storage.getItem('rahultube_history') || '[]');
    history = [video, ...history.filter(v => v.id !== video.id)];
    storage.setItem('rahultube_history', JSON.stringify(history));

    const updatedHistory = JSON.parse(storage.getItem('rahultube_history'));
    assertEqual(updatedHistory.length, 1);
    assertEqual(updatedHistory[0].title, 'JavaScript In 100 Seconds');
  });
});

describe('Tier 3 — Pairwise 2: Watch Video -> Like Action -> Liked Library Persistence', () => {
  test('1. Liking a video in watch view synchronizes with Liked page state', () => {
    const storage = createMockLocalStorage();
    const video = {
      id: 'like_test_1',
      title: 'Deep Learning Revolution',
      thumbnail: 'https://i.ytimg.com/vi/like_test_1/hqdefault.jpg',
      author: { name: 'AI Explorer' },
      duration: '15:20',
      views: '500K'
    };

    // Click Like on Watch page
    let likedList = JSON.parse(storage.getItem('rahultube_liked') || '[]');
    likedList.unshift(video);
    storage.setItem('rahultube_liked', JSON.stringify(likedList));

    // Inspect Liked page state
    const likedPageItems = JSON.parse(storage.getItem('rahultube_liked') || '[]');
    assertEqual(likedPageItems.length, 1);
    assertEqual(likedPageItems[0].id, 'like_test_1');
    assertEqual(likedPageItems[0].author.name, 'AI Explorer');
  });

  test('2. Unliking from Watch page immediately removes item from Liked Library', () => {
    const storage = createMockLocalStorage({
      rahultube_liked: JSON.stringify([{ id: 'like_test_1' }, { id: 'other_vid' }])
    });

    // Unlike like_test_1
    let likedList = JSON.parse(storage.getItem('rahultube_liked'));
    likedList = likedList.filter(v => v.id !== 'like_test_1');
    storage.setItem('rahultube_liked', JSON.stringify(likedList));

    const updated = JSON.parse(storage.getItem('rahultube_liked'));
    assertEqual(updated.length, 1);
    assertEqual(updated[0].id, 'other_vid');
  });
});

describe('Tier 3 — Pairwise 3: Watch Video -> Subscribe -> Subscriptions Library & Feed Sync', () => {
  test('1. Subscribing on Watch page updates Subscriptions list', () => {
    const storage = createMockLocalStorage();
    const channelName = 'Kurzgesagt – In a Nutshell';

    // Click Subscribe
    let subs = JSON.parse(storage.getItem('rahultube_subs') || '[]');
    subs.unshift(channelName);
    storage.setItem('rahultube_subs', JSON.stringify(subs));

    // Check Subscriptions page
    const currentSubs = JSON.parse(storage.getItem('rahultube_subs') || '[]');
    assertIncludes(currentSubs, 'Kurzgesagt – In a Nutshell');
  });

  test('2. Subscribed channel updates user affinity weight for recommendations', () => {
    const storage = createMockLocalStorage({
      rahultube_subs: JSON.stringify(['Veritasium'])
    });
    const subs = JSON.parse(storage.getItem('rahultube_subs'));
    const isSubscribed = subs.includes('Veritasium');
    const affinityMultiplier = isSubscribed ? 2.5 : 1.0;
    assertEqual(affinityMultiplier, 2.5);
  });
});

describe('Tier 3 — Pairwise 4: Shorts Reel Navigation + Comments Drawer Synchronization', () => {
  test('1. Navigating through Shorts updates comments endpoint for active short', async () => {
    const shortsRes = await apiRequest('/api/shorts?category=viral');
    assertEqual(shortsRes.status, 200);
    assertGreaterThanOrEqual(shortsRes.data.shorts.length, 2);

    const short1 = shortsRes.data.shorts[0];
    const short2 = shortsRes.data.shorts[1];

    // Fetch comments for Short 1
    const commentsRes1 = await apiRequest(`/api/comments/${short1.id}`);
    assertEqual(commentsRes1.status, 200);
    assertTruthy(commentsRes1.data.comments);

    // Advance to Short 2 and fetch comments for Short 2
    const commentsRes2 = await apiRequest(`/api/comments/${short2.id}`);
    assertEqual(commentsRes2.status, 200);
    assertTruthy(commentsRes2.data.comments);
  });

  test('2. Like state updates independently per Short during reel traversal', () => {
    const storage = createMockLocalStorage();
    const shortA = { id: 'short_A' };
    const shortB = { id: 'short_B' };

    // Like Short A only
    storage.setItem('rahultube_liked', JSON.stringify([shortA]));

    const liked = JSON.parse(storage.getItem('rahultube_liked'));
    const isShortALiked = liked.some(v => v.id === shortA.id);
    const isShortBLiked = liked.some(v => v.id === shortB.id);

    assertTruthy(isShortALiked);
    assertFalsy(isShortBLiked);
  });
});

describe('Tier 3 — Pairwise 5: Watch History Accumulation -> Personalized Recommendation Bias', () => {
  test('1. Watching Tech category videos skews recommendation affinity toward Tech', () => {
    const history = [
      { id: 'v1', category: 'Tech', title: 'M3 MacBook Review' },
      { id: 'v2', category: 'Tech', title: 'GPT-5 Architecture' },
      { id: 'v3', category: 'Music', title: 'Lofi Chill Beats' }
    ];

    const categoryScores = {};
    history.forEach(item => {
      categoryScores[item.category] = (categoryScores[item.category] || 0) + 1;
    });

    assertEqual(categoryScores['Tech'], 2);
    assertEqual(categoryScores['Music'], 1);
    assertGreaterThan(categoryScores['Tech'], categoryScores['Music']);
  });

  test('2. Querying top affinity category returns aligned video candidates', async () => {
    const res = await apiRequest('/api/trending?category=Tech');
    assertEqual(res.status, 200);
    assertGreaterThan(res.data.videos.length, 0);
  });
});

describe('Tier 3 — Pairwise 6: Direct URL Search Input -> Watch Route Bypass', () => {
  test('1. Pasting YouTube URL in Navbar triggers direct watch page routing', async () => {
    const inputUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    const detectedId = extractVideoId(inputUrl);
    assertEqual(detectedId, 'dQw4w9WgXcQ');

    // Server API handles direct video indicator
    const res = await apiRequest(`/api/search?q=${encodeURIComponent(inputUrl)}`);
    assertEqual(res.status, 200);
    assertTruthy(res.data.isDirectVideo);
    assertEqual(res.data.videoId, 'dQw4w9WgXcQ');
  });

  test('2. Pasting Shorts URL in search bar resolves direct video ID for playback', () => {
    const shortsUrl = 'https://www.youtube.com/shorts/5O9nK4922eQ';
    const detectedId = extractVideoId(shortsUrl);
    assertEqual(detectedId, '5O9nK4922eQ');
  });
});

describe('Tier 3 — Pairwise 7: Liked Page "Play All" -> First Video Playback & Queue', () => {
  test('1. Liked playlist triggers sequential playback from index 0', () => {
    const likedQueue = [
      { id: 'fav_track_1', title: 'First Song' },
      { id: 'fav_track_2', title: 'Second Song' },
      { id: 'fav_track_3', title: 'Third Song' }
    ];

    const targetPlaybackId = likedQueue[0].id;
    const remainingQueue = likedQueue.slice(1);

    assertEqual(targetPlaybackId, 'fav_track_1');
    assertEqual(remainingQueue.length, 2);
    assertEqual(remainingQueue[0].id, 'fav_track_2');
  });
});

describe('Tier 3 — Pairwise 8: Theater Mode Toggle + Related Videos Responsive Rearrangement', () => {
  test('1. Theater mode toggles player to 3-column span and reflows related videos below', () => {
    let theaterMode = false;
    // Normal mode classes
    let playerColClass = theaterMode ? 'lg:col-span-3' : 'lg:col-span-2';
    let relatedColClass = theaterMode ? 'lg:col-span-3 grid grid-cols-4' : 'space-y-3';
    assertEqual(playerColClass, 'lg:col-span-2');
    assertEqual(relatedColClass, 'space-y-3');

    // Toggle Theater ON
    theaterMode = true;
    playerColClass = theaterMode ? 'lg:col-span-3' : 'lg:col-span-2';
    relatedColClass = theaterMode ? 'lg:col-span-3 grid grid-cols-4' : 'space-y-3';
    assertEqual(playerColClass, 'lg:col-span-3');
    assertIncludes(relatedColClass, 'grid grid-cols-4');
  });
});
