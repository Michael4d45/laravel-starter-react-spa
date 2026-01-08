import Logo from '@/components/Logo';
import NavigationList from '@/components/NavigationList';
import UserActions from '@/components/UserActions';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';

interface HeaderProps {
    children?: React.ReactNode;
}

export default function Header({ children }: HeaderProps) {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <>
            <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8 dark:border-gray-800 dark:bg-gray-900">
                <button
                    type="button"
                    className="-m-2.5 p-2.5 text-gray-700 lg:hidden dark:text-gray-300"
                    onClick={() => setSidebarOpen(true)}
                >
                    <span className="sr-only">Open sidebar</span>
                    <Menu className="h-6 w-6" />
                </button>

                <div className="h-6 w-px bg-gray-200 lg:hidden dark:bg-gray-800" />

                <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
                    <div className="flex items-center gap-x-4 lg:gap-x-6">
                        <div className="md:hidden">
                            <Logo width={100} height={25} />
                        </div>
                    </div>
                    <div className="ml-auto flex items-center gap-x-4 lg:gap-x-6">
                        {children}
                    </div>
                </div>
            </div>

            {/* Mobile sidebar overlay */}
            {sidebarOpen && (
                <div className="relative z-50 lg:hidden">
                    <div
                        className="fixed inset-0 bg-gray-900/80"
                        onClick={() => setSidebarOpen(false)}
                    />
                    <div className="fixed inset-0 flex">
                        <div className="relative mr-16 flex w-full max-w-xs flex-1">
                            <div className="absolute top-0 left-full flex w-16 justify-center pt-5">
                                <button
                                    type="button"
                                    className="-m-2.5 p-2.5"
                                    onClick={() => setSidebarOpen(false)}
                                >
                                    <span className="sr-only">Close sidebar</span>
                                    <X className="h-6 w-6 text-white" />
                                </button>
                            </div>

                            <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white px-6 pb-4 dark:bg-gray-900">
                                <div className="flex h-16 shrink-0 items-center">
                                    <Link
                                        to="/"
                                        className="flex items-center"
                                        onClick={() => setSidebarOpen(false)}
                                    >
                                        <Logo
                                            width={120}
                                            height={30}
                                            className="mr-3"
                                        />
                                    </Link>
                                </div>
                                <NavigationList
                                    onItemClick={() => setSidebarOpen(false)}
                                />
                                <UserActions
                                    onItemClick={() => setSidebarOpen(false)}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
