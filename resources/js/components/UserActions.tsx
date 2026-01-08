import AppearanceToggleTab from '@/components/ui/AppearanceToggleTab';
import { useAuth } from '@/contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn, LogOut, User, UserPlus } from 'lucide-react';

interface UserActionsProps {
    onItemClick?: () => void;
}

export default function UserActions({ onItemClick }: UserActionsProps) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        onItemClick?.();
        navigate('/');
    };

    return (
        <div className="flex flex-col gap-y-4">
            <div className="flex flex-col gap-y-3 md:gap-y-2">
                {user && (
                    <Link
                        to="/profile"
                        className="flex items-center gap-x-3 rounded-md p-3 text-base font-semibold text-gray-700 hover:bg-gray-50 hover:text-indigo-600 md:p-2 md:text-sm dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
                        onClick={onItemClick}
                    >
                        <User className="h-6 w-6 shrink-0 text-primary-500 md:h-5 md:w-5" />
                        {user.name || 'Profile'}
                    </Link>
                )}
                {!user && (
                    <Link
                        to="/login"
                        className="flex items-center gap-x-3 rounded-md p-3 text-base font-semibold text-gray-700 hover:bg-gray-50 hover:text-indigo-600 md:p-2 md:text-sm dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
                        onClick={onItemClick}
                    >
                        <LogIn className="h-6 w-6 shrink-0 text-primary-500 md:h-5 md:w-5" />
                        Log in
                    </Link>
                )}
                {!user && (
                    <Link
                        to="/register"
                        className="flex items-center gap-x-3 rounded-md p-3 text-base font-semibold text-gray-700 hover:bg-gray-50 hover:text-indigo-600 md:p-2 md:text-sm dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
                        onClick={onItemClick}
                    >
                        <UserPlus className="h-6 w-6 shrink-0 text-primary-500 md:h-5 md:w-5" />
                        Sign up
                    </Link>
                )}
                {user && (
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-x-3 rounded-md p-3 text-base font-semibold text-gray-700 hover:bg-gray-50 hover:text-indigo-600 md:p-2 md:text-sm dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
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
