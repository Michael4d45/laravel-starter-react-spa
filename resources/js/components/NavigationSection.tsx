import { NavigationSection as NavigationSectionType } from '@/config/navigation';
import { cn } from '@/lib/utils';
import NavigationItem from './NavigationItem';

interface NavigationSectionProps {
    section: NavigationSectionType;
    onItemClick?: () => void;
    compact?: boolean;
}

export default function NavigationSection({
    section,
    onItemClick,
    compact = false,
}: NavigationSectionProps) {
    return (
        <li>
            <ul
                role="list"
                className={cn('-mx-2', compact ? 'space-y-3' : 'space-y-1')}
            >
                <li>
                    {!compact && (
                        <div className="text-muted text-xs leading-6 font-semibold md:text-xs">
                            {section.title}
                        </div>
                    )}
                    <ul
                        role="list"
                        className={cn(
                            '-mx-2 space-y-2 md:space-y-1',
                            compact ? 'mt-0' : 'mt-2 md:mt-2',
                        )}
                    >
                        {section.items.map((item) => (
                            <NavigationItem
                                key={item.href}
                                {...item}
                                compact={compact}
                                {...(onItemClick
                                    ? { onClick: onItemClick }
                                    : {})}
                            />
                        ))}
                    </ul>
                </li>
            </ul>
        </li>
    );
}
