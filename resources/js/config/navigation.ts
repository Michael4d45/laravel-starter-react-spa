import { Home, LucideIcon, Settings, User } from 'lucide-react';

export interface NavigationItem {
    href: string;
    label: string;
    icon: LucideIcon;
}

export interface NavigationSection {
    title: string;
    items: NavigationItem[];
}

export const navigationSections: NavigationSection[] = [
    {
        title: 'Main',
        items: [
            {
                href: '/',
                label: 'Home',
                icon: Home,
            },
            {
                href: '/content',
                label: 'Content',
                icon: Settings,
            },
        ],
    },
    {
        title: 'Account',
        items: [
            {
                href: '/profile',
                label: 'Profile',
                icon: User,
            },
        ],
    },
];
