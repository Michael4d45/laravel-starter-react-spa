import { useOnlineStatus } from './useOnlineStatus';

export function useOfflineBlock() {
    const isOnline = useOnlineStatus();
    return {
        isBlocked: !isOnline,
        blockReason: isOnline ? null : 'You are currently offline. This action requires an internet connection.',
    };
}
