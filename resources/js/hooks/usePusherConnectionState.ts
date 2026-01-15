import {
    getRealtimeConnectionSnapshot,
    subscribeRealtimeConnection,
    type RealtimeConnectionSnapshot,
} from '@/lib/realtimeConnectionState';
import { useSyncExternalStore } from 'react';

/**
 * Hook to subscribe to pusher connection state using useSyncExternalStore.
 * Safe for React Strict Mode; subscriptions are cleaned up on unmount.
 */
export function usePusherConnectionState(): RealtimeConnectionSnapshot {
    return useSyncExternalStore(
        subscribeRealtimeConnection,
        getRealtimeConnectionSnapshot,
        getRealtimeConnectionSnapshot,
    );
}
