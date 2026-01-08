import { db } from './db';

/**
 * API cache utility for offline support.
 * Stores API responses in IndexedDB via Dexie.
 */
export const apiCache = {
    /**
     * Retrieve cached data by key.
     */
    async get<T>(key: string): Promise<T | undefined> {
        const entry = await db.apiCache.get(key);
        return entry?.data as T | undefined;
    },

    /**
     * Store data in cache.
     */
    async set<T>(key: string, data: T): Promise<void> {
        await db.apiCache.put({
            key,
            data,
            timestamp: Date.now(),
        });
    },

    /**
     * Clear all cached data. Called on logout.
     */
    async clear(): Promise<void> {
        await db.apiCache.clear();
    },
};

