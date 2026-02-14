import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

interface NavigationItemProps {
    href: string;
    label: string;
    icon: LucideIcon;
    onClick?: () => void;
    className?: string;
    compact?: boolean;
}

export default function NavigationItem({
    href,
    label,
    icon: Icon,
    onClick,
    className = '',
    compact = false,
}: NavigationItemProps) {
    const baseClasses =
        'nav-item group flex gap-x-3 rounded-md p-3 md:p-2 text-base md:text-sm leading-6 font-semibold transition-colors';

    return (
        <li>
            <Link
                to={href}
                className={cn(
                    baseClasses,
                    compact && 'justify-center gap-x-0 px-2',
                    className,
                )}
                onClick={onClick}
            >
                <Icon className="h-7 w-7 shrink-0 text-primary-500 transition-colors group-hover:text-primary-600 md:h-6 md:w-6 dark:text-primary-400 dark:group-hover:text-primary-300" />
                {compact ? <span className="sr-only">{label}</span> : label}
            </Link>
        </li>
    );
}
