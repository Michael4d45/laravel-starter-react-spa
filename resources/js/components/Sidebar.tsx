import Logo from '@/components/Logo';
import NavigationList from '@/components/NavigationList';
import UserActions from '@/components/UserActions';
import { useSidebarMode } from '@/hooks/useSidebarMode';
import { cn } from '@/lib/utils';
import { Link } from 'react-router';

export default function Sidebar() {
    const { isCompact } = useSidebarMode();

    return (
        <aside
            className={cn(
                'hidden md:fixed md:inset-y-0 md:z-50 md:flex md:flex-col',
                isCompact ? 'md:w-20' : 'md:w-64',
            )}
        >
            <div
                className={cn(
                    'border-secondary bg-card flex grow flex-col gap-y-5 overflow-x-hidden overflow-y-auto border-r pb-4',
                    isCompact ? 'px-3' : 'px-6',
                )}
            >
                <div
                    className={cn(
                        'flex h-16 shrink-0 items-center',
                        isCompact && 'justify-center',
                    )}
                >
                    <Link to="/" className="flex items-center">
                        {isCompact ? (
                            <Logo kind="mark" width={36} height={36} />
                        ) : (
                            <Logo />
                        )}
                    </Link>
                </div>
                <NavigationList compact={isCompact} />
                <UserActions compact={isCompact} />
            </div>
        </aside>
    );
}
