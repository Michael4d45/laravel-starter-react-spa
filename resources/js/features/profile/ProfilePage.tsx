import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Link } from 'react-router-dom';

export function ProfilePage() {
    const { user, isAuthenticated, logout } = useAuth();

    if (!isAuthenticated) {
        return (
            <div className="max-w-md mx-auto text-center">
                <div className="bg-white p-8 rounded-lg shadow-md">
                    <h1 className="text-2xl font-bold mb-4">Profile</h1>
                    <p className="text-gray-600 mb-6">Please login to view your profile.</p>
                    <Link to="/login">
                        <Button>Login</Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-md mx-auto">
            <div className="bg-white p-8 rounded-lg shadow-md">
                <h1 className="text-2xl font-bold mb-6">Profile</h1>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Name</label>
                        <p className="mt-1 text-gray-900">{user?.name}</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Email</label>
                        <p className="mt-1 text-gray-900">{user?.email}</p>
                    </div>
                </div>

                <div className="mt-6">
                    <Button variant="danger" onClick={logout} className="w-full">
                        Logout
                    </Button>
                </div>
            </div>
        </div>
    );
}
