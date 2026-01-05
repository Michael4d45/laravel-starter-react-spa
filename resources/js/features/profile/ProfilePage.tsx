import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { useLoaderData } from 'react-router-dom';

export function ProfilePage() {
    const user = useLoaderData();
    const { logout } = useAuth();

    return (
        <div className="mx-auto max-w-md">
            <div className="rounded-lg bg-white p-8 shadow-md">
                <h1 className="mb-6 text-2xl font-bold">Profile</h1>

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
