import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { authManager } from '@/lib/auth';
import { UserData } from '@/types/effect-schemas';
import { useLoaderData, useNavigate } from 'react-router-dom';
import { redirect } from 'react-router-dom';

/**
 * React Router loader function that uses the Effect-based loader
 * This will automatically redirect to login if the user is not authenticated
 */
export async function profileLoader() {
    // First try to restore authentication from server session (useful for tests)
    await authManager.tryRestoreFromSession();

    // Check if user is authenticated
    const user = authManager.getUser();
    const token = authManager.getToken();

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
    const { logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <div className="mx-auto max-w-md">
            <div className="rounded-lg bg-white p-8 shadow-md">
                <h1 className="mb-6 text-2xl font-bold">Profile</h1>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            Name
                        </label>
                        <p className="mt-1 text-gray-900">{user?.name}</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            Email
                        </label>
                        <p className="mt-1 text-gray-900">{user?.email}</p>
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
