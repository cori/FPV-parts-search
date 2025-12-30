/**
 * Simple in-memory cache for Val.town
 * Val.town supports a KV store, but for local testing we'll use memory
 * In production, this would use: https://docs.val.town/std/blob/
 */

const cache = new Map();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes in milliseconds

/**
 * Get cached value if it exists and is not expired
 * @param {string} key - Cache key
 * @returns {any|null} Cached value or null if expired/missing
 */
export function getCache(key) {
  const entry = cache.get(key);

  if (!entry) {
    return null;
  }

  const now = Date.now();
  if (now - entry.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }

  return entry.value;
}

/**
 * Set cache value with current timestamp
 * @param {string} key - Cache key
 * @param {any} value - Value to cache
 */
export function setCache(key, value) {
  cache.set(key, {
    value,
    timestamp: Date.now(),
  });
}

/**
 * Clear all cache entries
 */
export function clearCache() {
  cache.clear();
}

/**
 * Get cache stats
 */
export function getCacheStats() {
  return {
    size: cache.size,
    ttl: CACHE_TTL,
  };
}
