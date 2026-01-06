import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { ActionResult } from '@/lib/actions';
import { UserData } from '@/lib/schemas/generated-schema';
import { useLoaderData } from 'react-router-dom';

/**
 * React Router loader function that uses the Effect-based loader
 * This will automatically redirect to login if the user is not authenticated
 */
export async function profileLoader() {
    return import('@/lib/actions').then(async ({ RunnableActions }) => {
        const result = await RunnableActions.getUser();
        return ActionResult.match(result, {
            onSuccess: (data) => {
                return data;
            },
            onFailure: (error) => {
                throw new Error(`Profile loading failed: ${JSON.stringify(error)}`);
            },
        });
    });
}

/**
 * Profile page component that displays user information and a logout button
 */
export function ProfilePage() {
    const user = useLoaderData<UserData>();
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
