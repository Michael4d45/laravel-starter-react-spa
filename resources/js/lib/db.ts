import Dexie, { type EntityTable } from 'dexie';

export interface ApiCacheEntry {
    key: string;
    data: unknown;
    timestamp: number;
    size: number; // Size in bytes
}

export const db = new Dexie('AppCacheDB') as Dexie & {
    apiCache: EntityTable<ApiCacheEntry, 'key'>;
};

db.version(1).stores({
    apiCache: 'key, timestamp, size',
});
