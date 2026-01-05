import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';

export function HomePage() {
    const { isAuthenticated, logout } = useAuth();

    return (
        <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
                <h1 className="text-4xl font-bold text-gray-900 mb-4">
                    Laravel React PWA
                </h1>
                <p className="text-xl text-gray-600">
                    A progressive web app with offline support and authentication
                </p>
            </div>

            <div className="bg-white p-8 rounded-lg shadow-md">
                <h2 className="text-2xl font-semibold mb-6 text-center">Navigation</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Link to="/content">
                        <Button className="w-full h-16 text-lg">
                            View Content
                        </Button>
                    </Link>

                    {isAuthenticated ? (
                        <>
                            <Link to="/profile">
                                <Button variant="secondary" className="w-full h-16 text-lg">
                                    Profile
                                </Button>
                            </Link>
                            <Button
                                variant="danger"
                                className="w-full h-16 text-lg md:col-span-2"
                                onClick={logout}
                            >
                                Logout
                            </Button>
                        </>
                    ) : (
                        <>
                            <Link to="/login">
                                <Button variant="primary" className="w-full h-16 text-lg">
                                    Login
                                </Button>
                            </Link>
                            <Link to="/register">
                                <Button variant="secondary" className="w-full h-16 text-lg">
                                    Register
                                </Button>
                            </Link>
                        </>
                    )}
                </div>
            </div>

            <div className="mt-8 text-center">
                <p className="text-sm text-gray-500">
                    Try going offline in your browser's dev tools and refreshing the page!
                </p>
            </div>
        </div>
    );
}
