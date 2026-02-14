import AppearanceToggleTab from '@/components/ui/AppearanceToggleTab';
import { useAuth } from '@/contexts/AuthContext';
import { useSidebarMode } from '@/hooks/useSidebarMode';
import { cn } from '@/lib/utils';
import {
    LogIn,
    LogOut,
    LucideIcon,
    PanelLeftClose,
    PanelLeftOpen,
    Shield,
    User,
    UserPlus,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { IconButton } from './ui/IconButton';

interface UserActionsProps {
    onItemClick?: (() => void) | undefined;
    compact?: boolean;
}

interface ActionItemProps {
    href: string;
    label: string;
    icon: LucideIcon;
    onClick?: (() => void) | undefined;
    compact: boolean;
}

function ActionItem({
    href,
    label,
    icon: Icon,
    onClick,
    compact,
}: ActionItemProps) {
    return (
        <Link
            to={href}
            className={cn(
                'nav-item flex items-center rounded-md p-3 text-base font-semibold md:p-2 md:text-sm',
                compact ? 'justify-center px-2' : 'gap-x-3',
            )}
            onClick={onClick}
        >
            <Icon className="h-6 w-6 shrink-0 text-primary-500 md:h-5 md:w-5" />
            {compact ? <span className="sr-only">{label}</span> : label}
        </Link>
    );
}

export default function UserActions({
    onItemClick,
    compact = false,
}: UserActionsProps) {
    const { user, logout } = useAuth();
    const { isCompact, toggleSidebarMode } = useSidebarMode();
    const useCompact = compact && isCompact;

    const handleLogout = async () => {
        await logout();
        onItemClick?.();
    };

    const handleSidebarToggle = () => {
        toggleSidebarMode();
        onItemClick?.();
    };

    return (
        <div className="flex flex-col gap-y-4">
            <div className="flex flex-col gap-y-3 md:gap-y-2">
                {user?.is_admin && (
                    <a
                        href="/admin"
                        className={cn(
                            'nav-item flex items-center rounded-md p-3 text-base font-semibold md:p-2 md:text-sm',
                            useCompact ? 'justify-center px-2' : 'gap-x-3',
                        )}
                        onClick={onItemClick}
                    >
                        <Shield className="h-6 w-6 shrink-0 text-primary-500 md:h-5 md:w-5" />
                        {useCompact ? (
                            <span className="sr-only">Admin Panel</span>
                        ) : (
                            'Admin Panel'
                        )}
                    </a>
                )}
                {user && !user.is_guest && (
                    <ActionItem
                        href="/profile"
                        label={user.name ?? 'Profile'}
                        icon={User}
                        onClick={onItemClick}
                        compact={useCompact}
                    />
                )}
                {user?.is_guest && (
                    <ActionItem
                        href="/login"
                        label="Log in"
                        icon={LogIn}
                        onClick={onItemClick}
                        compact={useCompact}
                    />
                )}
                {user?.is_guest && (
                    <ActionItem
                        href="/register"
                        label="Sign up"
                        icon={UserPlus}
                        onClick={onItemClick}
                        compact={useCompact}
                    />
                )}
                {user && !user.is_guest && (
                    <ActionItem
                        href="/"
                        label="Sign out"
                        icon={LogOut}
                        onClick={handleLogout}
                        compact={useCompact}
                    />
                )}
            </div>
            <div className="flex">
                <IconButton
                    type="button"
                    className="hidden md:block"
                    onClick={handleSidebarToggle}
                >
                    {useCompact ? <PanelLeftOpen /> : <PanelLeftClose />}
                </IconButton>
                {compact ? null : <AppearanceToggleTab showText={false} />}
            </div>
        </div>
    );
}
