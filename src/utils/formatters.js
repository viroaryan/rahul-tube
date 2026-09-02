/**
 * Formatting and URL parsing utilities.
 */

/**
 * Robust YouTube video ID extractor supporting all common URL patterns and raw 11-char IDs.
 */
export function extractVideoId(input) {
  if (!input || typeof input !== 'string') return null;
  const str = input.trim();
  
  // 1. Direct 11-char YouTube ID (alphanumeric + _ + -)
  if (/^[a-zA-Z0-9_-]{11}$/.test(str)) {
    return str;
  }

  // 2. Standard watch URL, embed, shorts, youtu.be, live, etc.
  const regex = /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|live\/))([\w-]{11})/;
  const match = str.match(regex);
  if (match && match[1]) {
    return match[1];
  }

  return null;
}

/**
 * Format numeric view counts into human-readable compact representations.
 */
export function formatViews(views) {
  if (views === null || views === undefined) return '0 views';
  
  // If already formatted as string (e.g., "1.2M views")
  if (typeof views === 'string') {
    const trimmed = views.trim();
    if (trimmed.toLowerCase().includes('view')) return trimmed;
    const num = Number(trimmed.replace(/[^0-9.-]+/g, ''));
    if (isNaN(num)) return trimmed;
    views = num;
  }

  if (typeof views !== 'number' || isNaN(views)) return '0 views';

  if (views >= 1_000_000_000) {
    return (views / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B views';
  }
  if (views >= 1_000_000) {
    return (views / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M views';
  }
  if (views >= 1_000) {
    return (views / 1_000).toFixed(1).replace(/\.0$/, '') + 'K views';
  }
  return `${views} views`;
}

/**
 * Format duration in seconds into MM:SS or HH:MM:SS string.
 */
export function formatDuration(input) {
  if (!input && input !== 0) return '';
  
  if (typeof input === 'string') {
    // If it's already a formatted duration like "12:34" or "1:02:45"
    if (/^\d+(?::\d{2})+$/.test(input.trim())) {
      return input.trim();
    }
    const num = parseFloat(input);
    if (isNaN(num)) return input;
    input = num;
  }

  const totalSeconds = Math.max(0, Math.floor(input));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const paddedSeconds = seconds < 10 ? `0${seconds}` : `${seconds}`;

  if (hours > 0) {
    const paddedMinutes = minutes < 10 ? `0${minutes}` : `${minutes}`;
    return `${hours}:${paddedMinutes}:${paddedSeconds}`;
  }

  return `${minutes}:${paddedSeconds}`;
}

/**
 * Format ISO dates or timestamps into relative "time ago" string.
 */
export function formatTimeAgo(dateInput) {
  if (!dateInput) return '';

  // If already relative string (e.g., "2 hours ago", "3 days ago")
  if (typeof dateInput === 'string' && dateInput.includes('ago')) {
    return dateInput;
  }

  const date = new Date(dateInput);
  if (isNaN(date.getTime())) {
    return typeof dateInput === 'string' ? dateInput : '';
  }

  const now = new Date();
  const diffSec = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));

  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths} month${diffMonths === 1 ? '' : 's'} ago`;
  const diffYears = Math.floor(diffDays / 365);
  return `${diffYears} year${diffYears === 1 ? '' : 's'} ago`;
}
