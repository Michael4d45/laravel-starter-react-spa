import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export function OfflineBanner() {
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const [isVisible, setIsVisible] = useState(!navigator.onLine);

    useEffect(() => {
        const handleOnline = () => {
            setIsOffline(false);
            setIsVisible(false);
        };
        const handleOffline = () => {
            setIsOffline(true);
            setIsVisible(true);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    if (!isOffline || !isVisible) return null;

    return (
        <div
            className={cn(
                'fixed inset-x-0 top-0 z-50 bg-orange-500 text-white p-2 text-center text-sm transition-transform duration-300',
                isOffline ? 'translate-y-0' : '-translate-y-full',
            )}
        >
            You are offline. Some features may be unavailable.
        </div>
    );
}
