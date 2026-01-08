import Logo from '@/components/Logo';
import NavigationList from '@/components/NavigationList';
import UserActions from '@/components/UserActions';
import { Link } from 'react-router-dom';

export default function Sidebar() {
    return (
        <aside className="hidden md:fixed md:inset-y-0 md:z-50 md:flex md:w-64 md:flex-col">
            <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-gray-200 bg-white px-6 pb-4 dark:border-gray-800 dark:bg-gray-900">
                <div className="flex h-16 shrink-0 items-center">
                    <Link to="/" className="flex items-center">
                        <Logo width={120} height={30} className="mr-3" />
                    </Link>
                </div>
                <NavigationList />
                <UserActions />
            </div>
        </aside>
    );
}
