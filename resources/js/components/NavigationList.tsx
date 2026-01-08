import { navigationSections } from '@/config/navigation';
import NavigationSection from './NavigationSection';

interface NavigationListProps {
    onItemClick?: () => void;
}

export default function NavigationList({ onItemClick }: NavigationListProps) {
    return (
        <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-8 md:gap-y-7">
                {navigationSections.map((section) => {
                    return (
                        <NavigationSection
                            key={section.title}
                            section={section}
                            onItemClick={onItemClick}
                        />
                    );
                })}
            </ul>
        </nav>
    );
}
