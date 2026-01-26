import AppearanceToggleTab from '@/components/ui/AppearanceToggleTab';
import { useAuth } from '@/contexts/AuthContext';
import { LogIn, LogOut, Shield, User, UserPlus } from 'lucide-react';
import { Link } from 'react-router-dom';

interface UserActionsProps {
    onItemClick?: () => void;
}

export default function UserActions({ onItemClick }: UserActionsProps) {
    const { user, logout } = useAuth();

    const handleLogout = async () => {
        await logout();
        onItemClick?.();
    };

    return (
        <div className="flex flex-col gap-y-4">
            <div className="flex flex-col gap-y-3 md:gap-y-2">
                {user?.is_admin && (
                    <a
                        href="/admin"
                        className="nav-item flex items-center gap-x-3 rounded-md p-3 text-base font-semibold md:p-2 md:text-sm"
                        onClick={onItemClick}
                    >
                        <Shield className="h-6 w-6 shrink-0 text-primary-500 md:h-5 md:w-5" />
                        Admin
                    </a>
                )}
                {user && (
                    <Link
                        to="/profile"
                        className="nav-item flex items-center gap-x-3 rounded-md p-3 text-base font-semibold md:p-2 md:text-sm"
                        onClick={onItemClick}
                    >
                        <User className="h-6 w-6 shrink-0 text-primary-500 md:h-5 md:w-5" />
                        {user.name}
                    </Link>
                )}
                {!user && (
                    <Link
                        to="/login"
                        className="nav-item flex items-center gap-x-3 rounded-md p-3 text-base font-semibold md:p-2 md:text-sm"
                        onClick={onItemClick}
                    >
                        <LogIn className="h-6 w-6 shrink-0 text-primary-500 md:h-5 md:w-5" />
                        Log in
                    </Link>
                )}
                {!user && (
                    <Link
                        to="/register"
                        className="nav-item flex items-center gap-x-3 rounded-md p-3 text-base font-semibold md:p-2 md:text-sm"
                        onClick={onItemClick}
                    >
                        <UserPlus className="h-6 w-6 shrink-0 text-primary-500 md:h-5 md:w-5" />
                        Sign up
                    </Link>
                )}
                {user && (
                    <button
                        onClick={handleLogout}
                        className="nav-item flex items-center gap-x-3 rounded-md p-3 text-base font-semibold md:p-2 md:text-sm"
                    >
                        <LogOut className="h-6 w-6 shrink-0 text-primary-500 md:h-5 md:w-5" />
                        Sign out
                    </button>
                )}
            </div>
            <AppearanceToggleTab showText={false} />
        </div>
    );
}
