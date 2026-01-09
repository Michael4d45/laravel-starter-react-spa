import { NavigationSection as NavigationSectionType } from '@/config/navigation';
import NavigationItem from './NavigationItem';

interface NavigationSectionProps {
    section: NavigationSectionType;
    onItemClick?: () => void;
}

export default function NavigationSection({
    section,
    onItemClick,
}: NavigationSectionProps) {
    return (
        <li>
            <ul role="list" className="-mx-2 space-y-1">
                <li>
                    <div className="text-muted text-xs leading-6 font-semibold md:text-xs">
                        {section.title}
                    </div>
                    <ul
                        role="list"
                        className="-mx-2 mt-2 space-y-2 md:mt-2 md:space-y-1"
                    >
                        {section.items.map((item) => (
                            <NavigationItem
                                key={item.href}
                                {...item}
                                onClick={onItemClick}
                            />
                        ))}
                    </ul>
                </li>
            </ul>
        </li>
    );
}
