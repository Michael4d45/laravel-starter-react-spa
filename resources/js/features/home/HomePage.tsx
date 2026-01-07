import AppearanceToggleTab from '@/components/ui/AppearanceToggleTab';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';

export function HomePage() {
    const { authState, logout } = useAuth();
    const isAuthenticated = authState.isAuthenticated;

    return (
        <div className="mx-auto max-w-4xl">
            <div className="mb-12 text-center">
                <h1 className="text-secondary mb-4 text-4xl font-bold">
                    Laravel React PWA
                </h1>
                <p className="text-secondary text-xl">
                    A progressive web app with offline support and
                    authentication
                </p>
            </div>

            <div className="bg-card rounded-lg p-8 shadow-md">
                <h2 className="mb-6 text-center text-2xl font-semibold">
                    Navigation
                </h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Link to="/content">
                        <Button className="h-16 w-full text-lg">
                            View Content
                        </Button>
                    </Link>

                    {isAuthenticated ? (
                        <>
                            <Link to="/profile">
                                <Button
                                    variant="secondary"
                                    className="h-16 w-full text-lg"
                                >
                                    Profile
                                </Button>
                            </Link>
                            <Button
                                variant="danger"
                                className="h-16 w-full text-lg md:col-span-2"
                                onClick={() => logout()}
                            >
                                Logout
                            </Button>
                        </>
                    ) : (
                        <>
                            <Link to="/login">
                                <Button
                                    variant="primary"
                                    className="h-16 w-full text-lg"
                                >
                                    Login
                                </Button>
                            </Link>
                            <Link to="/register">
                                <Button
                                    variant="secondary"
                                    className="h-16 w-full text-lg"
                                >
                                    Register
                                </Button>
                            </Link>
                        </>
                    )}
                    <AppearanceToggleTab />
                </div>
            </div>

            <div className="mt-8 text-center">
                <p className="text-secondary text-sm">
                    Try going offline in your browser's dev tools and refreshing
                    the page!
                </p>
            </div>
        </div>
    );
}
