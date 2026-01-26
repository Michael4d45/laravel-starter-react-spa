import { Button } from '@/components/ui/Button';
import { GoogleIcon } from '@/components/ui/GoogleIcon';
import { useAuth } from '@/contexts/AuthContext';
import { ApiClient } from '@/lib/apiClient';
import { authManager } from '@/lib/auth';
import { UserData } from '@/schemas/App/Data/Models';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useLoaderData, useNavigate } from 'react-router-dom';

interface ProfileData {
    user: UserData;
}

/**
 * React Router loader function that uses the Effect-based loader
 * This will automatically redirect to login if the user is not authenticated
 */
export const profileLoader = async () => {
    const user = authManager.getUser();

    return { user };
};

/**
 * Profile page component that displays user information and a logout button
 */
export function ProfilePage() {
    const {
        user: authUser,
        logout,
        googleLogin,
        disconnectGoogle,
        isLoading,
    } = useAuth();
    const { user: loaderUser } = useLoaderData<ProfileData>();
    const navigate = useNavigate();

    // Use the user from AuthContext if available, as it's the real-time source of truth.
    // Fall back to loader data only if authUser is not available (which shouldn't happen here).
    const user = authUser || loaderUser;

    const [isResendingVerification, setIsResendingVerification] =
        useState(false);

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const handleResendVerification = async () => {
        setIsResendingVerification(true);
        const result = await ApiClient.resendVerificationEmail();
        if (result._tag === 'Success') {
            toast.success('Verification link sent!');
        } else {
            toast.error('Failed to send verification link');
        }
        setIsResendingVerification(false);
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
                        {user && !user.email_verified_at && (
                            <div className="mt-2 rounded-md bg-warning-50 p-3 dark:bg-warning-900/30">
                                <div className="flex flex-col gap-2">
                                    <p className="text-sm text-warning-700 dark:text-warning-200">
                                        Your email address is unverified.
                                    </p>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleResendVerification}
                                        disabled={isResendingVerification}
                                        className="w-fit text-xs hover:bg-warning-100 dark:hover:bg-warning-900/50"
                                    >
                                        {isResendingVerification
                                            ? 'Sending...'
                                            : 'Resend Verification Email'}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="border-t pt-4">
                        <label className="text-secondary mb-2 block text-sm font-medium">
                            Google Account
                        </label>
                        {user?.verified_google_email ? (
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-3">
                                    <div className="text-success flex items-center gap-2">
                                        <GoogleIcon />
                                        <span className="text-sm">
                                            Connected
                                        </span>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={disconnectGoogle}
                                            disabled={isLoading}
                                            className="text-danger hover:text-danger-light text-xs"
                                        >
                                            Disconnect
                                        </Button>
                                    </div>
                                </div>
                                {user.verified_google_email && (
                                    <p className="text-secondary text-xs">
                                        {user.verified_google_email}
                                    </p>
                                )}
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
                                    <GoogleIcon />
                                    Connect Google Account
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-6">
                    <Button
                        data-test="profile-logout"
                        variant="danger"
                        onClick={handleLogout}
                        className="w-full"
                    >
                        Sign Out
                    </Button>
                </div>
            </div>
        </div>
    );
}
