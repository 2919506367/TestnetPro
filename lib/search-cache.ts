const store = new Map<string, { value: unknown; expiresAt: number }>();

export function getCache<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.value as T;
}

export function setCache(key: string, value: unknown, ttlMinutes: number = 10) {
  store.set(key, {
    value,
    expiresAt: Date.now() + ttlMinutes * 60 * 1000,
  });
}

export function clearCache(prefix?: string) {
  if (prefix) {
    for (const key of store.keys()) {
      if (key.startsWith(prefix)) store.delete(key);
    }
  } else {
    store.clear();
  }
}
