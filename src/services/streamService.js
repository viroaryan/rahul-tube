/**
 * streamService.js - Audio stream extractor and streaming proxy for RahulTube
 */

import axios from 'axios';
import memoryCache from './cacheService.js';

const ANDROID_VR_CONTEXT = {
  client: {
    clientName: 'ANDROID_VR',
    clientVersion: '1.56.21',
    hl: 'en',
    gl: 'US'
  }
};

const ANDROID_VR_HEADERS = {
  'Content-Type': 'application/json',
  'User-Agent': 'Mozilla/5.0 (Linux; Android 10; Quest 2) AppleWebKit/537.36'
};

class StreamService {
  /**
   * Resolves audio formats for a given video ID using InnerTube ANDROID_VR client.
   */
  async getAudioStreamInfo(videoId) {
    if (!videoId) return null;
    const cacheKey = `stream:audio:${videoId}`;
    const cached = memoryCache.get(cacheKey);
    if (cached) return cached;

    try {
      const resp = await axios.post('https://www.youtube.com/youtubei/v1/player', {
        context: ANDROID_VR_CONTEXT,
        videoId
      }, {
        headers: ANDROID_VR_HEADERS,
        timeout: 6000
      });

      const streamingData = resp.data?.streamingData;
      if (!streamingData) return null;

      const adaptive = streamingData.adaptiveFormats || [];
      const audioFormats = adaptive
        .filter(f => f.mimeType && f.mimeType.startsWith('audio/'))
        .map(f => ({
          url: f.url,
          mimeType: f.mimeType.split(';')[0],
          fullMimeType: f.mimeType,
          bitrate: f.bitrate,
          audioQuality: f.audioQuality,
          contentLength: f.contentLength ? parseInt(f.contentLength, 10) : null
        }))
        .filter(f => Boolean(f.url));

      // Sort highest quality / bitrate first
      audioFormats.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));

      if (audioFormats.length === 0) return null;

      const bestFormat = audioFormats[0];
      const result = {
        best: bestFormat,
        formats: audioFormats
      };

      // Cache audio stream info for 30 minutes (URLs are valid for several hours)
      memoryCache.set(cacheKey, result, 1800);
      return result;
    } catch (error) {
      console.error(`[StreamService.getAudioStreamInfo] Error for ${videoId}:`, error.message);
      return null;
    }
  }

  /**
   * Proxies audio streaming directly to the client with HTTP Range request support.
   */
  async proxyAudioStream(videoId, req, res) {
    try {
      const streamInfo = await this.getAudioStreamInfo(videoId);
      if (!streamInfo || !streamInfo.best?.url) {
        return res.status(404).json({
          success: false,
          error: 'Audio stream format not available for this video'
        });
      }

      const targetUrl = streamInfo.best.url;
      const clientRange = req.headers.range;

      const upstreamHeaders = {
        'User-Agent': ANDROID_VR_HEADERS['User-Agent'],
        'Accept': '*/*'
      };
      if (clientRange) {
        upstreamHeaders['Range'] = clientRange;
      }

      const streamResp = await axios.get(targetUrl, {
        headers: upstreamHeaders,
        responseType: 'stream',
        timeout: 10000
      });

      // Forward response headers
      res.status(streamResp.status);
      res.setHeader('Content-Type', streamInfo.best.mimeType || 'audio/mp4');
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Access-Control-Allow-Origin', '*');

      if (streamResp.headers['content-range']) {
        res.setHeader('Content-Range', streamResp.headers['content-range']);
      }
      if (streamResp.headers['content-length']) {
        res.setHeader('Content-Length', streamResp.headers['content-length']);
      }

      // Pipe upstream stream into response
      streamResp.data.pipe(res);

      req.on('close', () => {
        if (streamResp.data && typeof streamResp.data.destroy === 'function') {
          streamResp.data.destroy();
        }
      });
    } catch (error) {
      console.error(`[StreamService.proxyAudioStream] Error for ${videoId}:`, error.message);
      if (!res.headersSent) {
        res.status(502).json({
          success: false,
          error: 'Failed to stream audio: ' + error.message
        });
      }
    }
  }
}

export const streamService = new StreamService();
export default streamService;
