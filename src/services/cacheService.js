/**
 * cacheService.js - In-Memory TTL / LRU Cache Service for RahulTube
 */

class CacheService {
  constructor(defaultTTLSeconds = 300, maxEntries = 500) {
    this.defaultTTL = defaultTTLSeconds * 1000;
    this.maxEntries = maxEntries;
    this.cache = new Map();
  }

  _isExpired(item) {
    return Date.now() > item.expiresAt;
  }

  get(key) {
    if (!this.cache.has(key)) return null;

    const item = this.cache.get(key);
    if (this._isExpired(item)) {
      this.cache.delete(key);
      return null;
    }

    // Refresh position for LRU
    this.cache.delete(key);
    this.cache.set(key, item);
    return item.value;
  }

  set(key, value, ttlSeconds = null) {
    const ttl = (ttlSeconds !== null ? ttlSeconds : this.defaultTTL / 1000) * 1000;

    // LRU eviction if full
    if (this.cache.size >= this.maxEntries && !this.cache.has(key)) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttl,
      createdAt: Date.now()
    });
  }

  has(key) {
    return this.get(key) !== null;
  }

  del(key) {
    return this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }

  size() {
    // Cleanup expired entries while checking size
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        this.cache.delete(key);
      }
    }
    return this.cache.size;
  }
}

// Export singleton with default 5-minute TTL
export const memoryCache = new CacheService(300, 1000);
export default memoryCache;
