import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { cn } from '@/lib/utils';

export function OfflineBanner() {
    const isOnline = useOnlineStatus();
    const isOffline = !isOnline;

    if (!isOffline) return null;

    return (
        <div
            className={cn(
                'sticky top-0 z-50 bg-(--warning) p-2 text-center text-sm text-white transition-transform duration-300',
                isOffline ? 'translate-y-0' : '-translate-y-full',
            )}
        >
            You are offline. Some features may be unavailable.
        </div>
    );
}
