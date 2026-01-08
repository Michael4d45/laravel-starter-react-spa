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
        'group flex gap-x-3 rounded-md p-3 md:p-2 text-base md:text-sm leading-6 font-semibold text-gray-700 hover:bg-primary-50 hover:text-primary-600 dark:text-gray-300 dark:hover:bg-primary-950/20 dark:hover:text-primary-400 transition-colors';

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
