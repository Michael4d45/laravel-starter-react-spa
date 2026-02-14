import { db } from './db';

/**
 * API cache utility for offline support.
 * Stores API responses in IndexedDB via Dexie.
 */
const MAX_CACHE_SIZE_RATIO = 0.1; // Use 10% of available storage

export const apiCache = {
    /**
     * Get maximum cache size based on available storage.
     */
    async getMaxSize(): Promise<number> {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            const estimate = await navigator.storage.estimate();
            return (estimate.quota || 0) * MAX_CACHE_SIZE_RATIO;
        }
        return 50 * 1024 * 1024; // Fallback 50MB
    },
    async get<T>(key: string): Promise<T | undefined> {
        const entry = await db.apiCache.get(key);
        return entry?.data as T | undefined;
    },

    /**
     * Store data in cache.
     */
    async set(key: string, data: unknown): Promise<void> {
        const size = this.calculateSize(data);
        await this.ensureSpace(size);
        await db.apiCache.put({
            key,
            data,
            timestamp: Date.now(),
            size,
        });
    },

    /**
     * Clear all cached data. Called on logout.
     */
    async clear(): Promise<void> {
        await db.apiCache.clear();
    },

    /**
     * Calculate size of data in bytes.
     */
    calculateSize(data: unknown): number {
        if (data instanceof ArrayBuffer) {
            return data.byteLength;
        }
        if (typeof data === 'string') {
            return new Blob([data]).size;
        }
        // For other types, estimate or use JSON.stringify
        try {
            return new Blob([JSON.stringify(data)]).size;
        } catch {
            return 0; // Fallback
        }
    },

    /**
     * Ensure there's enough space by pruning old entries.
     */
    async ensureSpace(requiredSize: number): Promise<void> {
        const maxSize = await this.getMaxSize();
        const totalSize = await this.getTotalSize();
        if (totalSize + requiredSize <= maxSize) {
            return;
        }

        // Prune oldest entries until under limit
        const entries = await db.apiCache.orderBy('timestamp').toArray();
        let currentSize = totalSize;
        for (const entry of entries) {
            if (currentSize + requiredSize <= maxSize) {
                break;
            }
            const entrySize = entry.size || this.calculateSize(entry.data);
            await db.apiCache.delete(entry.key);
            currentSize -= entrySize;
        }
    },

    /**
     * Get total size of cache.
     */
    async getTotalSize(): Promise<number> {
        const entries = await db.apiCache.toArray();
        let total = 0;
        for (const entry of entries) {
            total += entry.size || this.calculateSize(entry.data);
        }
        return total;
    },
};
