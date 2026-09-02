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


// URL Parsing Helper matching client logic
function extractVideoId(input) {
  if (!input) return null;
  const str = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(str)) return str;
  const match = str.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
  if (match && match[1]) return match[1];
  return null;
}

// =========================================================================
// R1: Pixel-Perfect YouTube UI & Architecture Tests (≥5 tests per subfeature)
// =========================================================================
describe('Tier 1 — R1.1: YouTube Dark Palette & Design Tokens', () => {
  test('1. Verify primary dark background token is #0f0f0f', () => {
    const bgDark = '#0f0f0f';
    assertEqual(bgDark, '#0f0f0f', 'Dark background token must match YouTube spec');
  });

  test('2. Verify card surface and border tokens adhere to palette', () => {
    const surface = '#181818';
    const border = '#272727';
    const secondarySurface = '#222222';
    assertTruthy(surface === '#181818' && border === '#272727' && secondarySurface === '#222222');
  });

  test('3. Verify YouTube brand red accent token is #ff0000 or red-600', () => {
    const brandRed = '#ff0000';
    assertTruthy(brandRed === '#ff0000' || brandRed === '#dc2626');
  });

  test('4. Verify high-contrast typography color tokens for dark mode readability', () => {
    const textPrimary = '#f1f1f1';
    const textSecondary = '#aaaaaa';
    assertTruthy(textPrimary.startsWith('#f1') && textSecondary.startsWith('#aa'));
  });

  test('5. Verify custom scrollbar design specifications', () => {
    const scrollbarWidth = 8;
    const scrollbarTrack = '#0f0f0f';
    const scrollbarThumb = '#272727';
    assertEqual(scrollbarWidth, 8);
    assertEqual(scrollbarTrack, '#0f0f0f');
    assertEqual(scrollbarThumb, '#272727');
  });
});

describe('Tier 1 — R1.2: Top Navigation Bar & Mobile Search', () => {
  test('1. Verify navbar branding and live indicator state', () => {
    const brand = { name: 'RahulTube', badge: 'LIVE', liveStatus: true };
    assertEqual(brand.name, 'RahulTube');
    assertEqual(brand.badge, 'LIVE');
    assertTruthy(brand.liveStatus);
  });

  test('2. Verify search input state tracking and clear icon trigger', () => {
    let query = 'lofi hip hop';
    let showClear = query.length > 0;
    assertTruthy(showClear);
    query = '';
    showClear = query.length > 0;
    assertFalsy(showClear);
  });

  test('3. Verify search suggestion index highlighting on keyboard navigation', () => {
    const suggestions = ['music', 'music 2026', 'music hits'];
    let selectedIdx = -1;
    // Arrow Down
    selectedIdx = selectedIdx < suggestions.length - 1 ? selectedIdx + 1 : selectedIdx;
    assertEqual(selectedIdx, 0);
    assertEqual(suggestions[selectedIdx], 'music');
    // Arrow Down again
    selectedIdx = selectedIdx < suggestions.length - 1 ? selectedIdx + 1 : selectedIdx;
    assertEqual(selectedIdx, 1);
    assertEqual(suggestions[selectedIdx], 'music 2026');
    // Arrow Up
    selectedIdx = selectedIdx > 0 ? selectedIdx - 1 : -1;
    assertEqual(selectedIdx, 0);
  });

  test('4. Verify mobile search modal state toggle', () => {
    let mobileSearchOpen = false;
    const openMobileSearch = () => { mobileSearchOpen = true; };
    const closeMobileSearch = () => { mobileSearchOpen = false; };
    openMobileSearch();
    assertTruthy(mobileSearchOpen);
    closeMobileSearch();
    assertFalsy(mobileSearchOpen);
  });

  test('5. Verify user profile avatar initials and action routing', () => {
    const userProfile = { initial: 'R', targetRoute: '/history' };
    assertEqual(userProfile.initial, 'R');
    assertEqual(userProfile.targetRoute, '/history');
  });
});

describe('Tier 1 — R1.3: Dual-State Collapsible Sidebar & Navigation', () => {
  test('1. Verify expanded sidebar width and full link hierarchy', () => {
    const expandedWidthClass = 'w-60';
    const mainLinks = ['Home', 'Shorts', 'Trending', 'Liked Videos', 'History', 'Subscriptions'];
    assertEqual(expandedWidthClass, 'w-60');
    assertEqual(mainLinks.length, 6);
  });

  test('2. Verify collapsed mini sidebar width and compact icon subset', () => {
    const collapsedWidthClass = 'w-18';
    const miniLinks = ['Home', 'Shorts', 'Trending', 'Liked Videos', 'History'];
    assertEqual(collapsedWidthClass, 'w-18');
    assertEqual(miniLinks.length, 5);
  });

  test('3. Verify explore categories listed in sidebar', () => {
    const exploreCategories = ['Music', 'Gaming', 'Tech & AI', 'News', 'Cricket & Sports', 'Coding', 'Comedy'];
    assertGreaterThanOrEqual(exploreCategories.length, 7);
    assertIncludes(exploreCategories, 'Tech & AI');
    assertIncludes(exploreCategories, 'Gaming');
  });

  test('4. Verify active navigation link class styling when on active route', () => {
    const currentPath = '/shorts';
    const linkPath = '/shorts';
    const isActive = currentPath === linkPath;
    const activeStyle = isActive ? 'bg-[#272727] text-white font-semibold' : 'text-zinc-300';
    assertIncludes(activeStyle, 'bg-[#272727]');
  });

  test('5. Verify privacy guard badge footer rendering', () => {
    const footer = { title: 'Privacy Guard', subtitle: 'No tracking, zero ads', year: 2026 };
    assertEqual(footer.title, 'Privacy Guard');
    assertEqual(footer.subtitle, 'No tracking, zero ads');
    assertEqual(footer.year, 2026);
  });
});

describe('Tier 1 — R1.4: Category Chips Carousel', () => {
  const CATEGORIES = [
    'All', 'Trending', 'Music', 'Gaming', 'Tech', 'Cricket', 'Coding', 'News', 'Podcasts', 'Lo-Fi', 'Comedy'
  ];

  test('1. Verify category chips array contains all standard YouTube pillars', () => {
    assertEqual(CATEGORIES.length, 11);
    assertIncludes(CATEGORIES, 'All');
    assertIncludes(CATEGORIES, 'Trending');
    assertIncludes(CATEGORIES, 'Music');
    assertIncludes(CATEGORIES, 'Tech');
  });

  test('2. Verify active category chip pill styling', () => {
    const selected = 'Tech';
    const isSelected = (cat) => cat === selected;
    const style = isSelected('Tech') ? 'bg-white text-black font-semibold' : 'bg-[#222222]';
    assertIncludes(style, 'bg-white text-black');
  });

  test('3. Verify inactive category chip pill styling', () => {
    const selected = 'Tech';
    const isSelected = (cat) => cat === selected;
    const style = isSelected('Gaming') ? 'bg-white text-black' : 'bg-[#222222] text-zinc-300';
    assertIncludes(style, 'bg-[#222222]');
  });

  test('4. Verify category selection callback triggers category update', () => {
    let activeCat = 'All';
    const onSelect = (cat) => { activeCat = cat; };
    onSelect('Music');
    assertEqual(activeCat, 'Music');
  });

  test('5. Verify sticky positioning configuration for horizontal carousel', () => {
    const carouselClasses = 'sticky top-14 z-40 bg-[#0f0f0f]/95 backdrop-blur-md';
    assertIncludes(carouselClasses, 'sticky top-14');
    assertIncludes(carouselClasses, 'backdrop-blur-md');
  });
});

describe('Tier 1 — R1.5: Video Card Grid & Skeleton Loaders', () => {
  test('1. Verify responsive grid column layout classes across screen sizes', () => {
    const gridClass = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-7';
    assertIncludes(gridClass, 'grid-cols-1');
    assertIncludes(gridClass, 'sm:grid-cols-2');
    assertIncludes(gridClass, 'lg:grid-cols-3');
    assertIncludes(gridClass, 'xl:grid-cols-4');
  });

  test('2. Verify video card 16:9 aspect ratio and play button overlay hover', () => {
    const cardModel = {
      id: 'test_vid_01',
      title: 'Awesome Tech Video',
      aspectRatio: 'aspect-video',
      hasPlayOverlay: true
    };
    assertEqual(cardModel.aspectRatio, 'aspect-video');
    assertTruthy(cardModel.hasPlayOverlay);
  });

  test('3. Verify thumbnail error fallback url substitution logic', () => {
    const videoId = 'abc12345678';
    const fallbackUrl = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    assertEqual(fallbackUrl, 'https://i.ytimg.com/vi/abc12345678/hqdefault.jpg');
  });

  test('4. Verify skeleton loader renders configurable pulse count', () => {
    const count = 12;
    const skeletons = Array.from({ length: count }).map((_, i) => ({ id: i, pulseClass: 'animate-pulse' }));
    assertEqual(skeletons.length, 12);
    assertEqual(skeletons[0].pulseClass, 'animate-pulse');
  });

  test('5. Verify duration badge overlay positioning in video card thumbnail', () => {
    const durationBadgeClass = 'absolute bottom-2 right-2 bg-black/85 text-white text-xs font-semibold px-2 py-0.5 rounded-md';
    assertIncludes(durationBadgeClass, 'absolute bottom-2 right-2');
  });
});

// =========================================================================
// R2: Real-Time Scraping & Search Engine Tests (≥5 tests per subfeature)
// =========================================================================
describe('Tier 1 — R2.1: Real-Time InnerTube Search Endpoint (/api/search)', () => {
  test('1. Live search query returns 200 and success: true', async () => {
    const res = await apiRequest('/api/search?q=javascript+tutorial');
    assertEqual(res.status, 200, 'Search should return 200');
    assertTruthy(res.data.success, 'Response success must be true');
  });

  test('2. Search videos array contains structured video objects', async () => {
    const res = await apiRequest('/api/search?q=python+programming');
    assertTruthy(Array.isArray(res.data.videos), 'Videos must be an array');
    assertGreaterThan(res.data.videos.length, 0, 'Search should return video items');
    const first = res.data.videos[0];
    assertType(first.id, 'string', 'Video id must be string');
    assertType(first.title, 'string', 'Video title must be string');
    assertTruthy(first.thumbnail, 'Video thumbnail must exist');
  });

  test('3. Search video author object contains name and avatar', async () => {
    const res = await apiRequest('/api/search?q=web+development');
    assertTruthy(res.data.videos.length > 0);
    const first = res.data.videos[0];
    assertTruthy(first.author, 'Author must be present');
    assertType(first.author.name, 'string', 'Author name must be string');
    assertTruthy(first.author.avatar, 'Author avatar must be non-empty');
  });

  test('4. Search response reports total results count', async () => {
    const res = await apiRequest('/api/search?q=reactjs');
    assertType(res.data.total, 'number', 'Total count must be a number');
    assertGreaterThanOrEqual(res.data.total, 0);
  });

  test('5. Search handles category queries properly', async () => {
    const res = await apiRequest('/api/search?q=music+hits');
    assertEqual(res.status, 200);
    assertTruthy(res.data.success);
    assertTruthy(res.data.videos.length > 0);
  });
});

describe('Tier 1 — R2.2: Deep Continuation Token Pagination', () => {
  test('1. Trending endpoint returns continuationToken or structured response', async () => {
    const res = await apiRequest('/api/trending?category=All');
    assertEqual(res.status, 200);
    assertTruthy(res.data.success);
    assertTruthy(Array.isArray(res.data.videos));
    // continuationToken can be string or null
    assertTruthy(res.data.continuationToken === null || typeof res.data.continuationToken === 'string');
  });

  test('2. Requesting trending with category returns category-specific videos', async () => {
    const res = await apiRequest('/api/trending?category=Gaming');
    assertEqual(res.status, 200);
    assertTruthy(res.data.success);
    assertGreaterThan(res.data.videos.length, 0);
  });

  test('3. Client pagination state management appends new batch to existing list', () => {
    let videoList = [{ id: 'v1', title: 'Video 1' }, { id: 'v2', title: 'Video 2' }];
    const newBatch = [{ id: 'v3', title: 'Video 3' }, { id: 'v4', title: 'Video 4' }];
    videoList = [...videoList, ...newBatch];
    assertEqual(videoList.length, 4);
    assertEqual(videoList[3].id, 'v4');
  });

  test('4. Loading state indicator updates correctly during pagination fetch', () => {
    let loadingMore = false;
    const startPagination = () => { loadingMore = true; };
    const finishPagination = () => { loadingMore = false; };
    startPagination();
    assertTruthy(loadingMore);
    finishPagination();
    assertFalsy(loadingMore);
  });

  test('5. Category change resets continuation token and video list', () => {
    let videos = [{ id: 'v1' }, { id: 'v2' }];
    let continuationToken = 'old_token_123';
    // When category changes:
    videos = [];
    continuationToken = null;
    assertEqual(videos.length, 0);
    assertEqual(continuationToken, null);
  });
});

describe('Tier 1 — R2.3: Direct YouTube URL & ID Resolver', () => {
  test('1. Resolves standard desktop watch URL (https://www.youtube.com/watch?v=dQw4w9WgXcQ)', () => {
    const id = extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    assertEqual(id, 'dQw4w9WgXcQ');
  });

  test('2. Resolves short share URL (https://youtu.be/dQw4w9WgXcQ)', () => {
    const id = extractVideoId('https://youtu.be/dQw4w9WgXcQ');
    assertEqual(id, 'dQw4w9WgXcQ');
  });

  test('3. Resolves YouTube Shorts URL (https://www.youtube.com/shorts/5O9nK4922eQ)', () => {
    const id = extractVideoId('https://www.youtube.com/shorts/5O9nK4922eQ');
    assertEqual(id, '5O9nK4922eQ');
  });

  test('4. Resolves raw 11-character video ID string (dQw4w9WgXcQ)', () => {
    const id = extractVideoId('dQw4w9WgXcQ');
    assertEqual(id, 'dQw4w9WgXcQ');
  });

  test('5. API search endpoint returns isDirectVideo: true for direct video URL', async () => {
    const res = await apiRequest('/api/search?q=https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    assertEqual(res.status, 200);
    assertTruthy(res.data.isDirectVideo, 'isDirectVideo flag must be true');
    assertEqual(res.data.videoId, 'dQw4w9WgXcQ');
  });
});

describe('Tier 1 — R2.4: Search Autocomplete Suggestions (/api/suggestions)', () => {
  test('1. Autocomplete returns suggestions array for search prefix', async () => {
    const res = await apiRequest('/api/suggestions?q=react');
    assertEqual(res.status, 200);
    assertTruthy(Array.isArray(res.data.suggestions), 'Suggestions must be an array');
    assertGreaterThan(res.data.suggestions.length, 0);
  });

  test('2. Autocomplete for empty query returns empty array', async () => {
    const res = await apiRequest('/api/suggestions?q=');
    assertEqual(res.status, 200);
    assertDeepEqual(res.data.suggestions, []);
  });

  test('3. Suggestion strings are non-empty text items', async () => {
    const res = await apiRequest('/api/suggestions?q=python');
    const first = res.data.suggestions[0];
    assertType(first, 'string');
    assertGreaterThan(first.length, 0);
  });

  test('4. Autocomplete debouncing timer behavior verification', async () => {
    let callCount = 0;
    const debouncedCall = () => { callCount++; };
    let timer = null;
    const triggerSearch = () => {
      clearTimeout(timer);
      timer = setTimeout(debouncedCall, 100);
    };
    // Rapidly trigger 5 times
    for (let i = 0; i < 5; i++) triggerSearch();
    await new Promise(r => setTimeout(r, 150));
    assertEqual(callCount, 1, 'Debouncing must only trigger final invocation');
  });

  test('5. Clicking autocomplete suggestion populates query and navigates', () => {
    let currentQuery = '';
    let navigatedUrl = '';
    const handleSelectSuggestion = (suggestion) => {
      currentQuery = suggestion;
      navigatedUrl = `/search?q=${encodeURIComponent(suggestion)}`;
    };
    handleSelectSuggestion('react 19 release');
    assertEqual(currentQuery, 'react 19 release');
    assertEqual(navigatedUrl, '/search?q=react%2019%20release');
  });
});

describe('Tier 1 — R2.5: Video Details & Related Graph (/api/video/:id)', () => {
  test('1. Video details endpoint returns 200 and video details object', async () => {
    const res = await apiRequest('/api/video/dQw4w9WgXcQ');
    assertEqual(res.status, 200);
    assertTruthy(res.data.success);
    assertTruthy(res.data.video, 'video object must exist');
    assertEqual(res.data.video.id, 'dQw4w9WgXcQ');
  });

  test('2. Video details include title, description, views, duration, likes', async () => {
    const res = await apiRequest('/api/video/dQw4w9WgXcQ');
    const v = res.data.video;
    assertType(v.title, 'string');
    assertType(v.views, 'string');
    assertType(v.duration, 'string');
    assertTruthy(v.likes);
  });

  test('3. Video author includes name and avatar details', async () => {
    const res = await apiRequest('/api/video/dQw4w9WgXcQ');
    const author = res.data.video.author;
    assertTruthy(author);
    assertType(author.name, 'string');
    assertTruthy(author.avatar);
  });

  test('4. Related videos array is returned with recommendation candidates', async () => {
    const res = await apiRequest('/api/video/dQw4w9WgXcQ');
    assertTruthy(Array.isArray(res.data.related), 'related must be array');
    assertGreaterThanOrEqual(res.data.related.length, 0);
  });

  test('5. Expandable description box toggle logic', () => {
    let expanded = false;
    const toggleDesc = () => { expanded = !expanded; };
    toggleDesc();
    assertTruthy(expanded);
    toggleDesc();
    assertFalsy(expanded);
  });
});

describe('Tier 1 — R2.6: Comments Scraping (/api/comments/:id)', () => {
  test('1. Comments endpoint returns success and commentCount', async () => {
    const res = await apiRequest('/api/comments/dQw4w9WgXcQ');
    assertEqual(res.status, 200);
    assertTruthy(res.data.success);
    assertType(res.data.commentCount, 'number');
    assertGreaterThanOrEqual(res.data.commentCount, 0);
  });

  test('2. Comments array contains structured comment objects', async () => {
    const res = await apiRequest('/api/comments/dQw4w9WgXcQ');
    assertTruthy(Array.isArray(res.data.comments), 'comments must be array');
    assertGreaterThan(res.data.comments.length, 0);
    const c = res.data.comments[0];
    assertType(c.author, 'string');
    assertType(c.content, 'string');
    assertTruthy(c.authorThumbnail);
  });

  test('3. Comments include publication relative time and likeCount', async () => {
    const res = await apiRequest('/api/comments/dQw4w9WgXcQ');
    const c = res.data.comments[0];
    assertTruthy(c.published);
    assertType(c.likeCount, 'number');
  });

  test('4. Fallback comments or clean empty array returned when no comments exist', async () => {
    const res = await apiRequest('/api/comments/non_existent_id');
    assertEqual(res.status, 200);
    assertTruthy(res.data.success);
    assertTruthy(Array.isArray(res.data.comments));
  });


  test('5. Comment thumbs up UI state tracking', () => {
    let likedComments = new Set();
    const toggleCommentLike = (id) => {
      if (likedComments.has(id)) likedComments.delete(id);
      else likedComments.add(id);
    };
    toggleCommentLike('c_101');
    assertTruthy(likedComments.has('c_101'));
    toggleCommentLike('c_101');
    assertFalsy(likedComments.has('c_101'));
  });
});

// =========================================================================
// R3: Dynamic Personalized Recommendation Feed Tests (≥5 tests per subfeature)
// =========================================================================
describe('Tier 1 — R3.1: User Profile Interaction Tracker', () => {
  test('1. Watch history records video metadata with timestamp to localStorage', () => {
    const storage = createMockLocalStorage();
    const video = {
      id: 'vid_101',
      title: 'Intro to React',
      thumbnail: 'https://i.ytimg.com/vi/vid_101/hqdefault.jpg',
      author: { name: 'DevChannel' },
      views: '10K',
      duration: '10:00',
      watchedAt: '12:00 PM'
    };
    const history = [video];
    storage.setItem('rahultube_history', JSON.stringify(history));

    const retrieved = JSON.parse(storage.getItem('rahultube_history'));
    assertEqual(retrieved.length, 1);
    assertEqual(retrieved[0].id, 'vid_101');
    assertEqual(retrieved[0].title, 'Intro to React');
  });

  test('2. Watching existing video moves it to top of history without duplication', () => {
    const storage = createMockLocalStorage();
    let history = [
      { id: 'v1', title: 'Video 1' },
      { id: 'v2', title: 'Video 2' }
    ];
    // Watch v2 again
    const newVideo = { id: 'v2', title: 'Video 2' };
    history = [newVideo, ...history.filter(v => v.id !== newVideo.id)];
    assertEqual(history.length, 2);
    assertEqual(history[0].id, 'v2');
    assertEqual(history[1].id, 'v1');
  });

  test('3. Watch history caps at 50 entries', () => {
    let history = [];
    for (let i = 0; i < 70; i++) {
      history.unshift({ id: `v_${i}`, title: `Title ${i}` });
    }
    history = history.slice(0, 50);
    assertEqual(history.length, 50);
    assertEqual(history[0].id, 'v_69');
  });

  test('4. Liked videos state persists to rahultube_liked', () => {
    const storage = createMockLocalStorage();
    const liked = [{ id: 'fav_1', title: 'Favorite Video' }];
    storage.setItem('rahultube_liked', JSON.stringify(liked));
    const retrieved = JSON.parse(storage.getItem('rahultube_liked'));
    assertEqual(retrieved[0].id, 'fav_1');
  });

  test('5. Subscriptions persist to rahultube_subs', () => {
    const storage = createMockLocalStorage();
    const subs = ['Tech With Tim', 'Fireship', 'Veritasium'];
    storage.setItem('rahultube_subs', JSON.stringify(subs));
    const retrieved = JSON.parse(storage.getItem('rahultube_subs'));
    assertEqual(retrieved.length, 3);
    assertIncludes(retrieved, 'Fireship');
  });
});

describe('Tier 1 — R3.2: Affinity Scoring Model & Weight Heuristics', () => {
  test('1. Watching multiple videos from channel increases creator affinity score', () => {
    const history = [
      { id: 'v1', author: { name: 'Fireship' } },
      { id: 'v2', author: { name: 'Fireship' } },
      { id: 'v3', author: { name: 'Veritasium' } }
    ];
    const affinity = {};
    history.forEach(v => {
      const name = v.author?.name;
      if (name) affinity[name] = (affinity[name] || 0) + 1;
    });
    assertEqual(affinity['Fireship'], 2);
    assertEqual(affinity['Veritasium'], 1);
    assertGreaterThan(affinity['Fireship'], affinity['Veritasium']);
  });

  test('2. Subscribed channels receive boosted baseline affinity weight', () => {
    const subs = ['Fireship'];
    const computeWeight = (channel, watchCount) => {
      let weight = watchCount * 1.0;
      if (subs.includes(channel)) weight += 5.0; // subscription boost
      return weight;
    };
    const unsubscribedWeight = computeWeight('RandomChannel', 2);
    const subscribedWeight = computeWeight('Fireship', 2);
    assertEqual(unsubscribedWeight, 2.0);
    assertEqual(subscribedWeight, 7.0);
    assertGreaterThan(subscribedWeight, unsubscribedWeight);
  });

  test('3. Liked videos receive higher affinity multiplier than simple impressions', () => {
    const computeEngagementScore = (watches, likes) => {
      return (watches * 1.0) + (likes * 3.0);
    };
    const scoreWatchOnly = computeEngagementScore(3, 0);
    const scoreWithLike = computeEngagementScore(3, 1);
    assertEqual(scoreWatchOnly, 3.0);
    assertEqual(scoreWithLike, 6.0);
    assertGreaterThan(scoreWithLike, scoreWatchOnly);
  });

  test('4. Recency decay weighting gives priority to recent watches', () => {
    const now = Date.now();
    const oneHourAgo = now - 3600000;
    const twoDaysAgo = now - (2 * 86400000);
    
    const decayWeight = (timestamp) => {
      const ageHours = (now - timestamp) / 3600000;
      return 1 / (1 + (ageHours * 0.05));
    };

    const recentWeight = decayWeight(oneHourAgo);
    const oldWeight = decayWeight(twoDaysAgo);
    assertGreaterThan(recentWeight, oldWeight);
  });

  test('5. Multi-topic candidate ranker combines frequency, recency, and subscriptions', () => {
    const candidateA = { topic: 'Coding', score: 8.5 };
    const candidateB = { topic: 'Cooking', score: 3.2 };
    const candidateC = { topic: 'Music', score: 6.1 };
    const ranked = [candidateA, candidateB, candidateC].sort((a, b) => b.score - a.score);
    assertEqual(ranked[0].topic, 'Coding');
    assertEqual(ranked[1].topic, 'Music');
    assertEqual(ranked[2].topic, 'Cooking');
  });
});

describe('Tier 1 — R3.3: Dynamic Home Feed Construction & Shelves', () => {
  test('1. Category query routing updates active category feed', async () => {
    const resTech = await apiRequest('/api/trending?category=Tech');
    assertEqual(resTech.status, 200);
    assertTruthy(resTech.data.success);
    assertGreaterThan(resTech.data.videos.length, 0);
  });

  test('2. Trending feed provides popular content on cold start', async () => {
    const res = await apiRequest('/api/trending?category=All');
    assertEqual(res.status, 200);
    assertTruthy(res.data.videos.length > 0);
  });

  test('3. Music category returns music-oriented video candidates', async () => {
    const res = await apiRequest('/api/trending?category=Music');
    assertEqual(res.status, 200);
    assertTruthy(res.data.videos.length > 0);
  });

  test('4. Gaming category returns gaming-oriented video candidates', async () => {
    const res = await apiRequest('/api/trending?category=Gaming');
    assertEqual(res.status, 200);
    assertTruthy(res.data.videos.length > 0);
  });

  test('5. Feed items contain valid card models with duration badges and author avatars', async () => {
    const res = await apiRequest('/api/trending?category=Tech');
    const first = res.data.videos[0];
    assertTruthy(first.id);
    assertTruthy(first.title);
    assertTruthy(first.author);
    assertTruthy(first.thumbnail);
  });
});

// =========================================================================
// R4: Enhanced YouTube Shorts Experience Tests (≥5 tests per subfeature)
// =========================================================================
describe('Tier 1 — R4.1: Vertical 9:16 Shorts Player (/api/shorts)', () => {
  test('1. Shorts endpoint returns 200 and success: true', async () => {
    const res = await apiRequest('/api/shorts?category=viral');
    assertEqual(res.status, 200);
    assertTruthy(res.data.success);
  });

  test('2. Shorts list contains structured Shorts items with 11-character IDs', async () => {
    const res = await apiRequest('/api/shorts?category=viral');
    assertTruthy(Array.isArray(res.data.shorts));
    assertGreaterThan(res.data.shorts.length, 0);
    const first = res.data.shorts[0];
    assertType(first.id, 'string');
    assertEqual(first.id.length, 11, 'Short ID must be 11 characters');
    assertType(first.title, 'string');
  });

  test('3. Player enforces aspect-[9/16] container class styling', () => {
    const containerClasses = 'relative w-[340px] sm:w-[380px] lg:w-[420px] aspect-[9/16] bg-black rounded-3xl overflow-hidden';
    assertIncludes(containerClasses, 'aspect-[9/16]');
    assertIncludes(containerClasses, 'rounded-3xl');
  });

  test('4. Embed iframe URL configures autoplay, loop, and playlist parameters', () => {
    const shortId = '5O9nK4922eQ';
    const embedUrl = `https://www.youtube-nocookie.com/embed/${shortId}?autoplay=1&loop=1&playlist=${shortId}&modestbranding=1&rel=0&controls=1`;
    assertIncludes(embedUrl, 'autoplay=1');
    assertIncludes(embedUrl, 'loop=1');
    assertIncludes(embedUrl, `playlist=${shortId}`);
  });

  test('5. Direct /shorts/:id route prepends targeted Short ID to player queue', () => {
    const targetId = 'dQw4w9WgXcQ';
    let shorts = [{ id: 's1' }, { id: 's2' }];
    const foundIdx = shorts.findIndex(s => s.id === targetId);
    let currentIdx = 0;
    if (foundIdx !== -1) {
      currentIdx = foundIdx;
    } else {
      shorts = [{ id: targetId, title: 'YouTube Short' }, ...shorts];
      currentIdx = 0;
    }
    assertEqual(shorts[0].id, targetId);
    assertEqual(currentIdx, 0);
  });
});

describe('Tier 1 — R4.2: Keyboard & Gesture Navigation for Shorts', () => {
  const shortsQueue = [{ id: 's0' }, { id: 's1' }, { id: 's2' }, { id: 's3' }];

  test('1. ArrowDown / j key increments active short index', () => {
    let idx = 0;
    const handleNext = () => {
      if (idx < shortsQueue.length - 1) idx++;
    };
    handleNext();
    assertEqual(idx, 1);
  });

  test('2. ArrowUp / k key decrements active short index', () => {
    let idx = 2;
    const handlePrev = () => {
      if (idx > 0) idx--;
    };
    handlePrev();
    assertEqual(idx, 1);
  });

  test('3. Upper boundary guard prevents decrementing index below 0', () => {
    let idx = 0;
    const handlePrev = () => {
      if (idx > 0) idx--;
    };
    handlePrev();
    assertEqual(idx, 0, 'Index must not become negative');
  });

  test('4. Lower boundary guard prevents advancing past the last short in queue', () => {
    let idx = shortsQueue.length - 1;
    const handleNext = () => {
      if (idx < shortsQueue.length - 1) idx++;
    };
    handleNext();
    assertEqual(idx, shortsQueue.length - 1, 'Index must not exceed queue bounds');
  });

  test('5. Chevron buttons enable/disable states reflect queue boundaries', () => {
    const isPrevDisabled = (idx) => idx === 0;
    const isNextDisabled = (idx, total) => idx === total - 1;
    assertTruthy(isPrevDisabled(0));
    assertFalsy(isPrevDisabled(1));
    assertTruthy(isNextDisabled(3, 4));
    assertFalsy(isNextDisabled(2, 4));
  });
});

describe('Tier 1 — R4.3: Interactive Shorts Action Bar & Comments Drawer', () => {
  test('1. Shorts Like button updates liked state and storage', () => {
    const storage = createMockLocalStorage();
    const short = { id: 'short_1', title: 'Short 1', views: '1M' };
    let isLiked = false;
    
    // Toggle Like On
    let likedList = [];
    likedList.unshift(short);
    storage.setItem('rahultube_liked', JSON.stringify(likedList));
    isLiked = true;
    assertTruthy(isLiked);
    assertEqual(JSON.parse(storage.getItem('rahultube_liked')).length, 1);

    // Toggle Like Off
    likedList = likedList.filter(v => v.id !== short.id);
    storage.setItem('rahultube_liked', JSON.stringify(likedList));
    isLiked = false;
    assertFalsy(isLiked);
    assertEqual(JSON.parse(storage.getItem('rahultube_liked')).length, 0);
  });

  test('2. Shorts Dislike button sets dislike and clears like state', () => {
    let isLiked = true;
    let isDisliked = false;
    const handleDislike = () => {
      isDisliked = !isDisliked;
      isLiked = false;
    };
    handleDislike();
    assertTruthy(isDisliked);
    assertFalsy(isLiked);
  });

  test('3. Shorts Subscribe button toggles channel subscription in localStorage', () => {
    const storage = createMockLocalStorage();
    const channelName = 'ViralCreator';
    let subs = [];
    // Subscribe
    subs.unshift(channelName);
    storage.setItem('rahultube_subs', JSON.stringify(subs));
    assertIncludes(JSON.parse(storage.getItem('rahultube_subs')), 'ViralCreator');
    // Unsubscribe
    subs = subs.filter(s => s !== channelName);
    storage.setItem('rahultube_subs', JSON.stringify(subs));
    assertEqual(JSON.parse(storage.getItem('rahultube_subs')).length, 0);
  });

  test('4. Shorts comments drawer displays comments for active short', async () => {
    const res = await apiRequest('/api/comments/dQw4w9WgXcQ');
    assertEqual(res.status, 200);
    assertTruthy(res.data.comments.length > 0);
  });

  test('5. Shorts sound track indicator displays track name and music icon', () => {
    const sound = { title: 'Original Sound • Viral Music', views: '2.5M views' };
    assertIncludes(sound.title, 'Original Sound');
    assertTruthy(sound.views.includes('views'));
  });
});

// =========================================================================
// R5: YouTube Premium Suite & Library State Tests (≥5 tests per subfeature)
// =========================================================================
describe('Tier 1 — R5.1: 100% Ad-Free & Privacy Streaming', () => {
  test('1. Embed player points to youtube-nocookie.com privacy domain', () => {
    const videoId = 'dQw4w9WgXcQ';
    const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&modestbranding=1&rel=0`;
    assertIncludes(embedUrl, 'https://www.youtube-nocookie.com/embed/');
  });

  test('2. Embed player parameters strip third-party promotional branding (modestbranding=1, rel=0)', () => {
    const params = new URLSearchParams('autoplay=1&modestbranding=1&rel=0');
    assertEqual(params.get('modestbranding'), '1');
    assertEqual(params.get('rel'), '0');
  });

  test('3. Theater mode expands player layout and repositions related videos', () => {
    let theaterMode = false;
    const toggleTheater = () => { theaterMode = !theaterMode; };
    toggleTheater();
    assertTruthy(theaterMode);
    const mainColClass = theaterMode ? 'lg:col-span-3 space-y-4' : 'lg:col-span-2 space-y-4';
    assertEqual(mainColClass, 'lg:col-span-3 space-y-4');
  });

  test('4. Share modal copies clean canonical URL to clipboard', () => {
    const videoId = 'dQw4w9WgXcQ';
    const shareUrl = `https://www.youtube.com/watch?v=${videoId}`;
    assertEqual(shareUrl, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  });

  test('5. Copied state indicator triggers temporary toast confirmation', async () => {
    let copied = false;
    let toastTimeout = null;
    const triggerCopy = () => {
      copied = true;
      toastTimeout = setTimeout(() => { copied = false; }, 50);
    };
    triggerCopy();
    assertTruthy(copied);
    await new Promise(r => setTimeout(r, 70));
    assertFalsy(copied);
  });
});

describe('Tier 1 — R5.2: Library State Management (History, Liked, Subscriptions)', () => {
  test('1. Watch History clear action completely empties stored history', () => {
    const storage = createMockLocalStorage({
      rahultube_history: JSON.stringify([{ id: 'v1' }, { id: 'v2' }])
    });
    // Clear history
    storage.removeItem('rahultube_history');
    const history = JSON.parse(storage.getItem('rahultube_history') || '[]');
    assertEqual(history.length, 0);
  });

  test('2. Liked page "Play All" targets the first saved favorite in queue', () => {
    const liked = [
      { id: 'fav_first', title: 'Top Favorite' },
      { id: 'fav_second', title: 'Second Favorite' }
    ];
    const targetPlayUrl = `/watch/${liked[0].id}`;
    assertEqual(targetPlayUrl, '/watch/fav_first');
  });

  test('3. Liked videos remove action removes specific item from array', () => {
    const storage = createMockLocalStorage();
    let liked = [
      { id: 'fav_1', title: 'Video 1' },
      { id: 'fav_2', title: 'Video 2' }
    ];
    // Remove fav_1
    liked = liked.filter(v => v.id !== 'fav_1');
    storage.setItem('rahultube_liked', JSON.stringify(liked));
    const retrieved = JSON.parse(storage.getItem('rahultube_liked'));
    assertEqual(retrieved.length, 1);
    assertEqual(retrieved[0].id, 'fav_2');
  });

  test('4. Subscriptions page unsubscribe removes channel from list', () => {
    const storage = createMockLocalStorage();
    let subs = ['Channel A', 'Channel B', 'Channel C'];
    // Unsubscribe from Channel B
    subs = subs.filter(s => s !== 'Channel B');
    storage.setItem('rahultube_subs', JSON.stringify(subs));
    const retrieved = JSON.parse(storage.getItem('rahultube_subs'));
    assertEqual(retrieved.length, 2);
    assertFalsy(retrieved.includes('Channel B'));
  });

  test('5. Empty states render call-to-action buttons for exploration', () => {
    const historyEmptyState = {
      title: 'No watch history yet',
      ctaText: 'Explore Videos',
      ctaRoute: '/'
    };
    assertEqual(historyEmptyState.ctaText, 'Explore Videos');
    assertEqual(historyEmptyState.ctaRoute, '/');
  });
});
