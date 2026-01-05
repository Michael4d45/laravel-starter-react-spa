import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import React from 'react';

interface OfflineGuardProps {
    children: React.ReactNode;
    requiresOnline?: boolean;
}

export function OfflineGuard({ children, requiresOnline = false }: OfflineGuardProps) {
    const isOnline = useOnlineStatus();

    if (requiresOnline && !isOnline) {
        return <div className="p-4 text-center text-gray-600">You need to be online to access this feature.</div>;
    }

    return <>{children}</>;
}
