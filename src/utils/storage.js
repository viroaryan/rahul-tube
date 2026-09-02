/**
 * Safe localStorage CRUD helper with JSON validation, error recovery and LRU capping.
 */

export const STORAGE_KEYS = {
  HISTORY: 'rahultube_history',
  LIKED: 'rahultube_liked',
  SUBS: 'rahultube_subs',
  SEARCH_HISTORY: 'rahultube_search_history',
  PLAYER_SETTINGS: 'rahultube_player_settings'
};

const DEFAULT_CAPS = {
  [STORAGE_KEYS.HISTORY]: 50,
  [STORAGE_KEYS.LIKED]: 200,
  [STORAGE_KEYS.SUBS]: 100,
  [STORAGE_KEYS.SEARCH_HISTORY]: 50
};

/**
 * Safely retrieve and parse a JSON item from localStorage.
 */
export function getStorageItem(key, defaultValue = null) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === undefined) {
      return defaultValue;
    }
    const parsed = JSON.parse(raw);
    return parsed !== null ? parsed : defaultValue;
  } catch (err) {
    console.warn(`[storage] Failed to parse localStorage key "${key}", resetting to default:`, err);
    // Auto-recover from corrupted state
    try {
      if (defaultValue !== null) {
        localStorage.setItem(key, JSON.stringify(defaultValue));
      } else {
        localStorage.removeItem(key);
      }
    } catch (_) {}
    return defaultValue;
  }
}

/**
 * Safely store an item in localStorage with quota error handling and LRU capping for arrays.
 */
export function setStorageItem(key, value, maxCap = null) {
  try {
    let toStore = value;
    const limit = maxCap || DEFAULT_CAPS[key] || null;

    if (Array.isArray(value) && limit && limit > 0) {
      toStore = value.slice(0, limit);
    }

    localStorage.setItem(key, JSON.stringify(toStore));
    return true;
  } catch (err) {
    console.error(`[storage] Failed to set localStorage key "${key}":`, err);
    // If quota exceeded, attempt to prune old entries
    if (err.name === 'QuotaExceededError' || err.code === 22) {
      try {
        if (Array.isArray(value)) {
          const emergencyPruned = value.slice(0, Math.max(10, Math.floor((maxCap || 50) / 2)));
          localStorage.setItem(key, JSON.stringify(emergencyPruned));
          return true;
        }
      } catch (_) {}
    }
    return false;
  }
}

/**
 * Remove an item from localStorage.
 */
export function removeStorageItem(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (err) {
    console.error(`[storage] Failed to remove localStorage key "${key}":`, err);
    return false;
  }
}

/**
 * Clear all RahulTube related storage keys.
 */
export function clearAllRahulTubeStorage() {
  Object.values(STORAGE_KEYS).forEach(k => removeStorageItem(k));
}
