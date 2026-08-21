import { useEffect, useState } from 'react';

export type Appearance = 'light' | 'dark' | 'system';

const prefersDark = () => {
    if (typeof window === 'undefined') {
        return false;
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

const computeResolvedTheme = (appearance: Appearance): 'light' | 'dark' => {
    const isDark =
        appearance === 'dark' || (appearance === 'system' && prefersDark());
    return isDark ? 'dark' : 'light';
};

const setCookie = (name: string, value: string, days = 365) => {
    if (typeof document === 'undefined') {
        return;
    }

    const maxAge = days * 24 * 60 * 60;
    document.cookie = `${name}=${value};path=/;max-age=${maxAge};SameSite=Lax`;
};

const applyTheme = (appearance: Appearance) => {
    const isDark =
        appearance === 'dark' || (appearance === 'system' && prefersDark());

    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
};

const mediaQuery = () => {
    if (typeof window === 'undefined') {
        return null;
    }

    return window.matchMedia('(prefers-color-scheme: dark)');
};

const handleSystemThemeChange = () => {
    const currentAppearance = localStorage.getItem('appearance') as
        Appearance | undefined;
    applyTheme(currentAppearance || 'system');
};

export function initializeTheme() {
    const savedAppearance =
        (localStorage.getItem('appearance') as Appearance | undefined) ||
        'system';

    applyTheme(savedAppearance);

    // Add the event listener for system theme changes...
    mediaQuery()?.addEventListener('change', handleSystemThemeChange);
}

export function useAppearance() {
    const [appearance, setAppearance] = useState<Appearance>(() => {
        if (typeof window === 'undefined') {
            return 'system';
        }
        return (
            (localStorage.getItem('appearance') as Appearance | null) ||
            'system'
        );
    });

    const resolvedTheme = computeResolvedTheme(appearance);

    const updateAppearance = (mode: Appearance) => {
        setAppearance(mode);

        // Store in localStorage for client-side persistence...
        localStorage.setItem('appearance', mode);

        // Store in cookie for SSR...
        setCookie('appearance', mode);

        applyTheme(mode);

        // Dispatch custom event for same-tab updates
        if (typeof window !== 'undefined') {
            window.dispatchEvent(
                new CustomEvent('appearanceChange', { detail: mode }),
            );
        }
    };

    useEffect(() => {
        applyTheme(appearance);

        const mq = mediaQuery();
        const listener = () => {
            if (appearance === 'system') {
                applyTheme('system');
            }
        };

        mq?.addEventListener('change', listener);

        // Listen for appearance changes from other components (same tab)
        const handleAppearanceChange = (e: CustomEvent<Appearance>) => {
            setAppearance(e.detail);
        };
        window.addEventListener(
            'appearanceChange',
            handleAppearanceChange as EventListener,
        );

        // Listen for storage changes (cross-tab)
        const handleStorage = (e: StorageEvent) => {
            if (e.key === 'appearance') {
                setAppearance(e.newValue as Appearance);
            }
        };
        window.addEventListener('storage', handleStorage);

        return () => {
            mq?.removeEventListener('change', listener);
            window.removeEventListener(
                'appearanceChange',
                handleAppearanceChange as EventListener,
            );
            window.removeEventListener('storage', handleStorage);
        };
    }, [appearance]);

    return { appearance, updateAppearance, resolvedTheme } as const;
}
