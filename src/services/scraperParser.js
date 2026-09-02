/**
 * scraperParser.js - Comprehensive parser for YouTube InnerTube data structures
 * Handles videoRenderer, lockupViewModel, compactVideoRenderer, shortsLockupViewModel,
 * commentEntityPayload, commentRenderer, channelHeader, and continuation tokens.
 */

/**
 * Extracts an 11-character video ID from a query, URL, or short link.
 */
export function extractVideoId(input) {
  if (!input || typeof input !== 'string') return null;
  const str = input.trim();

  // Raw 11-char video ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(str)) {
    return str;
  }

  // Full or shortened YouTube URLs
  const patterns = [
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|live\/))([a-zA-Z0-9_-]{11})/,
    /^https?:\/\/(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    /^https?:\/\/youtu\.be\/([a-zA-Z0-9_-]{11})/
  ];

  for (const pattern of patterns) {
    const match = str.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Extracts best thumbnail URL from an array of thumbnails or sources.
 */
export function getBestThumbnail(thumbnails = [], fallbackId = null) {
  if (Array.isArray(thumbnails) && thumbnails.length > 0) {
    const last = thumbnails[thumbnails.length - 1];
    if (last && last.url) {
      // Ensure https protocol
      return last.url.startsWith('//') ? `https:${last.url}` : last.url;
    }
  }
  if (fallbackId) {
    return `https://i.ytimg.com/vi/${fallbackId}/hqdefault.jpg`;
  }
  return '';
}

/**
 * Formats duration from seconds number or text string.
 */
export function formatDuration(secondsOrText) {
  if (typeof secondsOrText === 'string') {
    if (/^\d+(?::\d{2})+$/.test(secondsOrText.trim())) {
      return secondsOrText.trim();
    }
    const parsed = parseInt(secondsOrText, 10);
    if (isNaN(parsed) || parsed <= 0) return '0:00';
    secondsOrText = parsed;
  }
  const sec = parseInt(secondsOrText, 10);
  if (isNaN(sec) || sec <= 0) return '0:00';

  const hours = Math.floor(sec / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  const seconds = sec % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Parses classic videoRenderer object from InnerTube search or browse.
 */
export function parseVideoRenderer(v) {
  if (!v || !v.videoId) return null;

  const thumbnails = v.thumbnail?.thumbnails || [];
  const thumbnail = getBestThumbnail(thumbnails, v.videoId);

  // Title extraction
  const title = v.title?.runs?.map(r => r.text).join('') || v.title?.simpleText || 'Untitled Video';

  // Duration extraction
  let duration = v.lengthText?.simpleText || '';
  if (!duration && v.thumbnailOverlays) {
    for (const overlay of v.thumbnailOverlays) {
      if (overlay.thumbnailOverlayTimeStatusRenderer?.text?.simpleText) {
        duration = overlay.thumbnailOverlayTimeStatusRenderer.text.simpleText;
        break;
      }
    }
  }
  if (!duration) duration = '0:00';

  // Views extraction
  const views = v.viewCountText?.simpleText ||
    (v.shortViewCountText?.simpleText ? `${v.shortViewCountText.simpleText} views` : '') ||
    '0 views';

  // Published time / Ago
  const ago = v.publishedTimeText?.simpleText || '';

  // Author details
  const ownerRuns = v.ownerText?.runs || v.shortBylineText?.runs || [];
  const authorName = ownerRuns[0]?.text || 'Channel';
  const channelId = ownerRuns[0]?.navigationEndpoint?.browseEndpoint?.browseId ||
    v.shortBylineText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId || '';

  // Author avatar
  let authorAvatar = '';
  const avatarThumbs = v.channelThumbnailSupportedRenderers?.channelThumbnailWithLinkRenderer?.thumbnail?.thumbnails ||
    v.channelThumbnail?.thumbnails || [];
  if (avatarThumbs.length > 0) {
    authorAvatar = avatarThumbs[avatarThumbs.length - 1]?.url || '';
    if (authorAvatar.startsWith('//')) authorAvatar = `https:${authorAvatar}`;
  }
  if (!authorAvatar) {
    authorAvatar = `https://yt3.ggpht.com/a/default-user=s88-c-k-c0x00ffffff-no-rj`;
  }

  // Verified badge check
  const badges = v.ownerBadges || [];
  const verified = badges.some(b =>
    b.metadataBadgeRenderer?.style === 'BADGE_STYLE_TYPE_VERIFIED' ||
    b.metadataBadgeRenderer?.style === 'BADGE_STYLE_TYPE_VERIFIED_ARTIST' ||
    b.metadataBadgeRenderer?.icon?.iconType === 'CHECK_CIRCLE_THICK' ||
    b.metadataBadgeRenderer?.icon?.iconType === 'OFFICIAL_ARTIST_BADGE'
  );

  return {
    id: v.videoId,
    title,
    duration,
    views,
    ago,
    thumbnail,
    author: {
      name: authorName,
      channelId,
      avatar: authorAvatar,
      verified
    }
  };
}

/**
 * Parses modern lockupViewModel (YouTube web latest format)
 */
export function parseLockupViewModel(l) {
  if (!l) return null;

  // Extract video ID
  let videoId = l.contentId || '';
  if (!videoId || videoId.length !== 11) {
    const onTapCmd = l.rendererContext?.commandContext?.onTap?.innertubeCommand;
    videoId = onTapCmd?.watchEndpoint?.videoId || '';
  }
  if (!videoId || videoId.length !== 11) return null;

  // Title extraction
  const title = l.metadata?.lockupMetadataViewModel?.title?.content ||
    l.rendererContext?.accessibilityContext?.label?.split(' · ')?.[0] ||
    'YouTube Video';

  // Metadata rows (Author, Views, Ago)
  const metadataRows = l.metadata?.lockupMetadataViewModel?.metadata?.contentMetadataViewModel?.metadataRows || [];
  let authorName = 'Channel';
  let channelId = '';
  let verified = false;
  let views = '0 views';
  let ago = '';

  if (metadataRows.length > 0) {
    // Row 0 typically contains channel name
    const authorRow = metadataRows[0];
    if (authorRow?.metadataParts?.[0]?.text?.content) {
      authorName = authorRow.metadataParts[0].text.content;
      const cmd = authorRow.metadataParts[0].text.commandRuns?.[0]?.onTap?.innertubeCommand;
      if (cmd?.browseEndpoint?.browseId) {
        channelId = cmd.browseEndpoint.browseId;
      }
    }

    // Row 1 typically contains views and date
    const statsRow = metadataRows.length > 1 ? metadataRows[1] : metadataRows[0];
    if (statsRow?.metadataParts) {
      const parts = statsRow.metadataParts.map(p => p.text?.content).filter(Boolean);
      for (const p of parts) {
        if (p.toLowerCase().includes('view') || /^\d+(\.\d+)?[KMB]?$/.test(p)) {
          views = p.toLowerCase().includes('view') ? p : `${p} views`;
        } else if (p.includes('ago') || p.includes('Streamed') || p.includes('Premiered')) {
          ago = p;
        }
      }
    }
  }

  // Duration from thumbnail overlays
  let duration = '0:00';
  const overlays = l.contentImage?.thumbnailViewModel?.overlays || [];
  for (const o of overlays) {
    if (o.thumbnailBottomOverlayViewModel?.badges) {
      for (const b of o.thumbnailBottomOverlayViewModel.badges) {
        if (b.thumbnailBadgeViewModel?.text) {
          duration = b.thumbnailBadgeViewModel.text;
          break;
        }
      }
    } else if (o.thumbnailOverlayTimeStatusRenderer?.text?.simpleText) {
      duration = o.thumbnailOverlayTimeStatusRenderer.text.simpleText;
      break;
    }
  }

  // Thumbnails
  const thumbSources = l.contentImage?.thumbnailViewModel?.image?.sources || [];
  const thumbnail = getBestThumbnail(thumbSources, videoId);

  // Avatar
  const avatarSources = l.metadata?.lockupMetadataViewModel?.image?.sources || [];
  let avatar = getBestThumbnail(avatarSources);
  if (!avatar) {
    avatar = 'https://yt3.ggpht.com/a/default-user=s88-c-k-c0x00ffffff-no-rj';
  }

  return {
    id: videoId,
    title,
    duration,
    views,
    ago,
    thumbnail,
    author: {
      name: authorName,
      channelId,
      avatar,
      verified
    }
  };
}

/**
 * Parses compactVideoRenderer (used in related videos sidebar)
 */
export function parseCompactVideoRenderer(c) {
  if (!c || !c.videoId) return null;

  const thumbnail = getBestThumbnail(c.thumbnail?.thumbnails, c.videoId);
  const title = c.title?.simpleText || c.title?.runs?.map(r => r.text).join('') || 'Untitled Video';
  const duration = c.lengthText?.simpleText || '0:00';
  const views = c.viewCountText?.simpleText || (c.shortViewCountText?.simpleText ? `${c.shortViewCountText.simpleText} views` : '0 views');
  const ago = c.publishedTimeText?.simpleText || '';

  const authorName = c.shortBylineText?.runs?.[0]?.text || c.longBylineText?.runs?.[0]?.text || 'Channel';
  const channelId = c.shortBylineText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId || '';

  let avatar = '';
  const avatarThumbs = c.channelThumbnail?.thumbnails || [];
  if (avatarThumbs.length > 0) {
    avatar = avatarThumbs[avatarThumbs.length - 1]?.url || '';
    if (avatar.startsWith('//')) avatar = `https:${avatar}`;
  }
  if (!avatar) {
    avatar = 'https://yt3.ggpht.com/a/default-user=s88-c-k-c0x00ffffff-no-rj';
  }

  const badges = c.ownerBadges || [];
  const verified = badges.some(b =>
    b.metadataBadgeRenderer?.style === 'BADGE_STYLE_TYPE_VERIFIED' ||
    b.metadataBadgeRenderer?.icon?.iconType === 'CHECK_CIRCLE_THICK'
  );

  return {
    id: c.videoId,
    title,
    duration,
    views,
    ago,
    thumbnail,
    author: {
      name: authorName,
      channelId,
      avatar,
      verified
    }
  };
}

/**
 * Parses shortsLockupViewModel (YouTube Shorts format)
 */
export function parseShortsLockupViewModel(slvm) {
  if (!slvm) return null;

  const entityId = slvm.entityId || '';
  let videoId = entityId.split('-').pop();

  if (!videoId || videoId.length !== 11) {
    const onTap = slvm.onTap?.innertubeCommand?.reelWatchEndpoint || slvm.onTap?.innertubeCommand?.watchEndpoint;
    videoId = onTap?.videoId || '';
  }
  if (!videoId || videoId.length !== 11) return null;

  const overlay = slvm.overlayMetadata || {};
  const accessibility = slvm.accessibilityText || '';
  const parts = accessibility.split(', play Short')[0]?.split(', ');

  const title = overlay.primaryText?.content || (parts && parts[0]) || 'YouTube Short';
  const views = overlay.secondaryText?.content || (parts && parts[1]) || 'Shorts';

  const thumbs = slvm.thumbnail?.sources || [];
  const thumbnail = getBestThumbnail(thumbs, videoId);

  return {
    id: videoId,
    title,
    views,
    thumbnail,
    author: {
      name: 'Creator',
      avatar: 'https://yt3.ggpht.com/a/default-user=s88-c-k-c0x00ffffff-no-rj',
      verified: false
    },
    sound: {
      title: 'Original Sound',
      author: 'Creator'
    }
  };
}

/**
 * Parses reelItemRenderer
 */
export function parseReelItemRenderer(r) {
  if (!r || !r.videoId) return null;

  const title = r.headline?.simpleText || r.headline?.runs?.map(x => x.text).join('') || 'YouTube Short';
  const views = r.viewCountText?.simpleText || 'Shorts';
  const thumbnail = getBestThumbnail(r.thumbnail?.thumbnails, r.videoId);

  return {
    id: r.videoId,
    title,
    views,
    thumbnail,
    author: {
      name: 'Creator',
      avatar: 'https://yt3.ggpht.com/a/default-user=s88-c-k-c0x00ffffff-no-rj',
      verified: false
    },
    sound: {
      title: 'Original Sound',
      author: 'Creator'
    }
  };
}

/**
 * Parses modern commentEntityPayload from frameworkUpdates.entityBatchUpdate.mutations
 */
export function parseCommentEntityPayload(payload) {
  if (!payload || !payload.properties) return null;

  const props = payload.properties;
  const author = payload.author || {};
  const toolbar = payload.toolbar || {};

  const id = props.commentId || payload.key || String(Math.random());
  const content = props.content?.content || '';
  const published = props.publishedTime || '';

  const authorName = author.displayName || 'User';
  let authorThumbnail = author.avatarThumbnailUrl || '';
  if (authorThumbnail && authorThumbnail.startsWith('//')) {
    authorThumbnail = `https:${authorThumbnail}`;
  }
  if (!authorThumbnail) {
    authorThumbnail = 'https://yt3.ggpht.com/a/default-user=s88-c-k-c0x00ffffff-no-rj';
  }

  const isVerified = Boolean(author.isVerified);
  const authorChannelId = author.channelId || '';

  // Like count extraction
  let likeCount = 0;
  const rawLikes = toolbar.likeCountNotliked || toolbar.likeCountLiked || '0';
  if (typeof rawLikes === 'number') {
    likeCount = rawLikes;
  } else if (typeof rawLikes === 'string') {
    const cleanLikes = rawLikes.trim();
    if (cleanLikes.endsWith('K')) {
      likeCount = Math.round(parseFloat(cleanLikes) * 1000);
    } else if (cleanLikes.endsWith('M')) {
      likeCount = Math.round(parseFloat(cleanLikes) * 1000000);
    } else {
      likeCount = parseInt(cleanLikes.replace(/,/g, ''), 10) || 0;
    }
  }

  return {
    id,
    author: authorName,
    authorThumbnail,
    content,
    published,
    likeCount,
    isVerified,
    authorChannelId
  };
}

/**
 * Parses classic commentRenderer
 */
export function parseCommentRenderer(cr) {
  if (!cr) return null;

  const id = cr.commentId || '';
  const author = cr.authorText?.simpleText || cr.authorText?.runs?.map(r => r.text).join('') || 'User';
  const authorThumbnail = getBestThumbnail(cr.authorThumbnail?.thumbnails) || 'https://yt3.ggpht.com/a/default-user=s88-c-k-c0x00ffffff-no-rj';
  const content = cr.contentText?.runs?.map(r => r.text).join('') || cr.contentText?.simpleText || '';
  const published = cr.publishedTimeText?.runs?.[0]?.text || cr.publishedTimeText?.simpleText || '';

  let likeCount = 0;
  if (typeof cr.likeCount === 'number') {
    likeCount = cr.likeCount;
  } else if (cr.voteCount?.simpleText) {
    const vt = cr.voteCount.simpleText.trim();
    if (vt.endsWith('K')) likeCount = Math.round(parseFloat(vt) * 1000);
    else if (vt.endsWith('M')) likeCount = Math.round(parseFloat(vt) * 1000000);
    else likeCount = parseInt(vt.replace(/,/g, ''), 10) || 0;
  }

  const authorChannelId = cr.authorEndpoint?.browseEndpoint?.browseId || '';
  const isVerified = Boolean(cr.authorCommentBadge?.authorCommentBadgeRenderer);

  return {
    id,
    author,
    authorThumbnail,
    content,
    published,
    likeCount,
    isVerified,
    authorChannelId
  };
}

/**
 * Extracts continuation token from any InnerTube response tree
 */
export function extractContinuationToken(data) {
  if (!data || typeof data !== 'object') return null;

  // 1. Check top-level continuationItemRenderer
  if (data.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token) {
    return data.continuationItemRenderer.continuationEndpoint.continuationCommand.token;
  }

  // 2. Check onResponseReceivedEndpoints / onResponseReceivedCommands
  const commands = data.onResponseReceivedEndpoints || data.onResponseReceivedCommands || [];
  for (const cmd of commands) {
    const items = cmd.appendContinuationItemsAction?.continuationItems ||
      cmd.reloadContinuationItemsCommand?.continuationItems || [];
    for (const item of items) {
      if (item.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token) {
        return item.continuationItemRenderer.continuationEndpoint.continuationCommand.token;
      }
    }
  }

  // 3. Check sectionListRenderer contents
  const sections = data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents ||
    data.contents?.sectionListRenderer?.contents || [];
  for (const sec of sections) {
    if (sec.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token) {
      return sec.continuationItemRenderer.continuationEndpoint.continuationCommand.token;
    }
  }

  return null;
}
