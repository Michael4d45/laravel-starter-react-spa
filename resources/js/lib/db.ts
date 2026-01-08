import Dexie, { type EntityTable } from 'dexie';

export interface ApiCacheEntry {
    key: string;
    data: unknown;
    timestamp: number;
}

export const db = new Dexie('AppCacheDB') as Dexie & {
    apiCache: EntityTable<ApiCacheEntry, 'key'>;
};

db.version(1).stores({
    apiCache: 'key, timestamp',
});

