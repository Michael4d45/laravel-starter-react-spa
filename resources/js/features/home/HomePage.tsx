import { RealtimeNotifications } from '@/components/realtime/RealtimeNotifications';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';

export function HomePage() {
    const { user } = useAuth();
    const isAuthenticated = !!user;

    if (!isAuthenticated) {
        return (
            <div className="mx-auto max-w-7xl">
                <div className="flex h-screen flex-col items-center justify-center text-center">
                    <h1 className="text-4xl">Welcome</h1>
                    <p className="text-muted mt-4 text-lg">
                        Get started by signing in or creating an account
                    </p>
                    <div className="mt-8 flex gap-4">
                        <Link to="/login" className="btn-primary px-6 py-3">
                            Log in
                        </Link>
                        <Link
                            to="/register"
                            className="btn-secondary px-6 py-3"
                        >
                            Sign up
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto space-y-8 px-4 py-8">
            <div>
                <h1>Welcome back, {user.name}!</h1>
                <p className="text-muted mt-2">
                    You're all set to get started.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Link
                    to="/content"
                    className="card block p-6 transition hover:shadow-lg"
                >
                    <h2 className="mb-2 text-xl font-semibold">Content</h2>
                    <p className="text-muted">Browse and explore content</p>
                </Link>

                <Link
                    to="/profile"
                    className="card block p-6 transition hover:shadow-lg"
                >
                    <h2 className="mb-2 text-xl font-semibold">Profile</h2>
                    <p className="text-muted">Manage your account settings</p>
                </Link>
            </div>

            <RealtimeNotifications />
        </div>
    );
}
