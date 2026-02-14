import { useEffect, useState } from 'react';

export type SidebarMode = 'expanded' | 'compact';

const STORAGE_KEY = 'sidebarMode';
const EVENT_NAME = 'sidebarModeChange';

const readSidebarMode = (): SidebarMode => {
    if (typeof window === 'undefined') {
        return 'expanded';
    }

    const storedMode = localStorage.getItem(STORAGE_KEY);

    if (storedMode === 'compact' || storedMode === 'expanded') {
        return storedMode;
    }

    return 'expanded';
};

export function useSidebarMode() {
    const [sidebarMode, setSidebarMode] = useState<SidebarMode>(() =>
        readSidebarMode(),
    );

    const updateSidebarMode = (mode: SidebarMode) => {
        setSidebarMode(mode);

        if (typeof window === 'undefined') {
            return;
        }

        localStorage.setItem(STORAGE_KEY, mode);

        window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: mode }));
    };

    const toggleSidebarMode = () => {
        updateSidebarMode(sidebarMode === 'compact' ? 'expanded' : 'compact');
    };

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        const handleSidebarModeChange = (event: CustomEvent<SidebarMode>) => {
            setSidebarMode(event.detail);
        };

        const handleStorageChange = (event: StorageEvent) => {
            if (event.key === STORAGE_KEY) {
                setSidebarMode(readSidebarMode());
            }
        };

        window.addEventListener(
            EVENT_NAME,
            handleSidebarModeChange as EventListener,
        );
        window.addEventListener('storage', handleStorageChange);

        return () => {
            window.removeEventListener(
                EVENT_NAME,
                handleSidebarModeChange as EventListener,
            );
            window.removeEventListener('storage', handleStorageChange);
        };
    }, []);

    return {
        sidebarMode,
        isCompact: sidebarMode === 'compact',
        updateSidebarMode,
        toggleSidebarMode,
    } as const;
}
