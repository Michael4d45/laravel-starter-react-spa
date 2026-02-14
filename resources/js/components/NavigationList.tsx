import { navigationSections } from '@/config/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Settings } from 'lucide-react';
import NavigationSection from './NavigationSection';

interface NavigationListProps {
    onItemClick?: () => void;
    compact?: boolean;
}

export default function NavigationList({
    onItemClick,
    compact = false,
}: NavigationListProps) {
    const { user } = useAuth();

    const sections = [...navigationSections];

    if (user?.is_admin) {
        sections.push({
            title: 'Admin',
            items: [
                {
                    href: '/admin/import-race-data',
                    label: 'Import Race Data',
                    icon: Settings,
                },
            ],
        });
    }

    return (
        <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-8 md:gap-y-7">
                {sections.map((section) => {
                    return (
                        <NavigationSection
                            key={section.title}
                            section={section}
                            compact={compact}
                            {...(onItemClick ? { onItemClick } : {})}
                        />
                    );
                })}
            </ul>
        </nav>
    );
}
