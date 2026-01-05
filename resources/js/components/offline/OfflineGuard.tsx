import React from 'react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

interface OfflineGuardProps {
    children: React.ReactNode;
    requiresOnline?: boolean;
}

export function OfflineGuard({ children, requiresOnline = false }: OfflineGuardProps) {
    const isOnline = useOnlineStatus();

    if (requiresOnline && !isOnline) {
        return (
            <div className="text-center p-4 text-gray-600">
                You need to be online to access this feature.
            </div>
        );
    }

    return <>{children}</>;
}
