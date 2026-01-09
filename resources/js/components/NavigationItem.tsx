import { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

interface NavigationItemProps {
    href: string;
    label: string;
    icon: LucideIcon;
    onClick?: () => void;
    className?: string;
}

export default function NavigationItem({
    href,
    label,
    icon: Icon,
    onClick,
    className = '',
}: NavigationItemProps) {
    const baseClasses =
        'nav-item group flex gap-x-3 rounded-md p-3 md:p-2 text-base md:text-sm leading-6 font-semibold transition-colors';

    return (
        <li>
            <Link
                to={href}
                className={`${baseClasses} ${className}`}
                onClick={onClick}
            >
                <Icon className="h-7 w-7 shrink-0 text-primary-500 transition-colors group-hover:text-primary-600 md:h-6 md:w-6 dark:text-primary-400 dark:group-hover:text-primary-300" />
                {label}
            </Link>
        </li>
    );
}
