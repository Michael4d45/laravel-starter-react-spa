import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import React from 'react';

interface OfflineGuardProps {
    children: React.ReactNode;
    requiresOnline?: boolean;
}

export function OfflineGuard({
    children,
    requiresOnline = false,
}: OfflineGuardProps) {
    const isOnline = useOnlineStatus();

    if (requiresOnline && !isOnline) {
        return (
            <div className="text-secondary p-4 text-center">
                You need to be online to access this feature.
            </div>
        );
    }

    return <>{children}</>;
}
