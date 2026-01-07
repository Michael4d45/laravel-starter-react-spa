import { Button } from '@/components/ui/Button';
import { GoogleIcon } from '@/components/ui/GoogleIcon';
import { useAuth } from '@/contexts/AuthContext';
import { authManager } from '@/lib/auth';
import { UserData } from '@/types/effect-schemas';
import { redirect, useLoaderData, useNavigate } from 'react-router-dom';

/**
 * React Router loader function that uses the Effect-based loader
 * This will automatically redirect to login if the user is not authenticated
 */
export async function profileLoader() {
    // Check if user is authenticated (JWT tokens should persist in localStorage)
    let user = authManager.getUser();
    let token = authManager.getToken();

    // If no JWT tokens, try to restore from session (useful for tests with actingAs)
    if (!user || !token) {
        const restored = await authManager.tryRestoreFromSession();
        if (restored) {
            user = authManager.getUser();
            token = authManager.getToken();
        }
    }

    if (!user || !token) {
        // Redirect to login if not authenticated
        return redirect('/login');
    }

    // Return user data for the component
    return user;
}

/**
 * Profile page component that displays user information and a logout button
 */
export function ProfilePage() {
    const user = useLoaderData<UserData>();
    const { logout, googleLogin, disconnectGoogle, isLoading } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <div className="mx-auto max-w-md">
            <div className="bg-card rounded-lg p-8 shadow-md">
                <h1 className="mb-6 text-2xl font-bold">Profile</h1>

                <div className="space-y-4">
                    <div>
                        <label className="text-secondary block text-sm font-medium">
                            Name
                        </label>
                        <p className="text-secondary mt-1">{user?.name}</p>
                    </div>

                    <div>
                        <label className="text-secondary block text-sm font-medium">
                            Email
                        </label>
                        <p className="text-secondary mt-1">{user?.email}</p>
                    </div>

                    <div className="border-t pt-4">
                        <label className="text-secondary mb-2 block text-sm font-medium">
                            Google Account
                        </label>
                        {user?.google_id ? (
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2 text-green-600">
                                    <GoogleIcon />
                                    <span className="text-sm">Connected</span>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => googleLogin(true)}
                                        className="text-xs"
                                    >
                                        Reconnect
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={disconnectGoogle}
                                        disabled={isLoading}
                                        className="text-xs text-red-600 hover:text-red-700"
                                    >
                                        Disconnect
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div>
                                <p className="text-secondary mb-2 text-sm">
                                    Connect your Google account for easier login
                                </p>
                                <Button
                                    variant="outline"
                                    onClick={() => googleLogin()}
                                    className="flex items-center gap-2"
                                >
                                    <svg
                                        className="h-4 w-4"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            fill="currentColor"
                                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                        />
                                        <path
                                            fill="currentColor"
                                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                        />
                                        <path
                                            fill="currentColor"
                                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                        />
                                        <path
                                            fill="currentColor"
                                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                        />
                                    </svg>
                                    Connect Google Account
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-6">
                    <Button
                        variant="danger"
                        onClick={handleLogout}
                        className="w-full"
                    >
                        Logout
                    </Button>
                </div>
            </div>
        </div>
    );
}
