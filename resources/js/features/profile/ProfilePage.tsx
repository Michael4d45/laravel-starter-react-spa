import { Button } from '@/components/ui/Button';
import { GoogleIcon } from '@/components/ui/GoogleIcon';
import { useAuth } from '@/contexts/AuthContext';
import { ApiClient } from '@/lib/apiClient';
import { authManager } from '@/lib/auth';
import { TokenData, UserData } from '@/schemas/App/Data/Models';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { redirect, useLoaderData, useNavigate } from 'react-router-dom';

/**
 * React Router loader function that uses the Effect-based loader
 * This will automatically redirect to login if the user is not authenticated
 */
export async function profileLoader() {
    // Check if user is authenticated (JWT tokens should persist in localStorage)
    let user = authManager.getUser();
    let token = authManager.getToken();

    const urlParams = new URLSearchParams(window.location.search);
    const isOAuthCallback = urlParams.has('auth');

    // If no JWT tokens, try to restore from session (useful for tests with actingAs)
    if (!user || !token) {
        // Skip session fetching if we're in an OAuth callback, as AuthContext handles that
        if (!isOAuthCallback) {
            const result = await ApiClient.fetchSessionToken();
            if (result._tag === 'Success') {
                authManager.setAuthData(result.data.token, result.data.user);
                user = result.data.user;
                token = result.data.token;
            }
        }
    }

    if ((!user || !token) && !isOAuthCallback) {
        // Redirect to login if not authenticated and not in OAuth flow
        return redirect('/login');
    }

    // Fetch tokens as well
    const tokensResult = await ApiClient.listTokens();
    const tokens =
        tokensResult._tag === 'Success' ? tokensResult.data.tokens : [];

    // Return user and tokens data for the component
    return { user, tokens };
}

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
    const { user: loaderUser, tokens: loaderTokens } = useLoaderData<{
        user: UserData;
        tokens: readonly TokenData[];
    }>();
    const navigate = useNavigate();

    // Use the user from AuthContext if available, as it's the real-time source of truth.
    // Fall back to loader data only if authUser is not available (which shouldn't happen here).
    const user = authUser || loaderUser;

    const [tokens, setTokens] = useState<readonly TokenData[]>(loaderTokens);
    const [loadingTokens, setLoadingTokens] = useState(false);
    const [deletingTokenId, setDeletingTokenId] = useState<string | null>(null);
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

    const loadTokens = async (showLoading = false) => {
        if (showLoading) setLoadingTokens(true);
        const result = await ApiClient.listTokens();
        if (result._tag === 'Success') {
            setTokens(result.data.tokens);
        } else {
            toast.error('Failed to load active sessions');
        }
        setLoadingTokens(false);
    };

    const handleDeleteToken = async (tokenId: string) => {
        if (
            !confirm(
                'Remove this session? You will be logged out on that device.',
            )
        ) {
            return;
        }

        setDeletingTokenId(tokenId);
        const result = await ApiClient.deleteToken(tokenId);
        if (result._tag === 'Success') {
            toast.success('Session removed successfully');
            setTokens(tokens.filter((t) => t.id !== tokenId));
        } else if (result._tag === 'ValidationError') {
            const errorMessage =
                Object.values(result.errors)[0]?.[0] ||
                'Failed to remove session';
            toast.error(errorMessage);
        } else {
            toast.error('Failed to remove session');
        }
        setDeletingTokenId(null);
    };

    const formatDate = (date: Date | null) => {
        if (!date) return 'Never';
        return new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
        }).format(date);
    };

    const getTimeAgo = (date: Date | null) => {
        if (!date) return 'Never';
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60)
            return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
        if (diffHours < 24)
            return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
        return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
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
                        {user?.google_id ? (
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

                    <div className="border-t pt-4">
                        <div className="mb-3 flex items-center justify-between">
                            <label className="text-secondary block text-sm font-medium">
                                Active Sessions
                            </label>
                            <button
                                onClick={() => loadTokens(true)}
                                disabled={loadingTokens}
                                className="text-xs text-primary-600 hover:text-primary-700 disabled:opacity-50"
                            >
                                Refresh
                            </button>
                        </div>
                        <p className="text-secondary mb-3 text-xs">
                            These are the devices where you're currently logged
                            in. Remove any sessions you don't recognize.
                        </p>
                        {loadingTokens ? (
                            <div className="py-4 text-center">
                                <p className="text-secondary text-sm">
                                    Loading sessions...
                                </p>
                            </div>
                        ) : tokens.length === 0 ? (
                            <div className="py-4 text-center">
                                <p className="text-secondary text-sm">
                                    No active sessions found
                                </p>
                            </div>
                        ) : (
                            <div
                                className="space-y-2"
                                data-testid="active-sessions-list"
                            >
                                {tokens.map((token) => (
                                    <div
                                        key={token.id}
                                        className="flex items-start justify-between rounded-lg border p-3"
                                        data-testid={`session-${token.id}`}
                                    >
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-medium">
                                                    {token.is_current ? (
                                                        <span className="text-success">
                                                            This device
                                                        </span>
                                                    ) : (
                                                        'Other device'
                                                    )}
                                                </p>
                                            </div>
                                            <div className="text-secondary mt-1 space-y-0.5 text-xs">
                                                <p>
                                                    <span className="font-medium">
                                                        Created:
                                                    </span>{' '}
                                                    {formatDate(
                                                        token.created_at,
                                                    )}
                                                </p>
                                                <p>
                                                    <span className="font-medium">
                                                        Last active:
                                                    </span>{' '}
                                                    {token.last_used_at ? (
                                                        <>
                                                            {getTimeAgo(
                                                                token.last_used_at,
                                                            )}
                                                            <span className="text-gray-400">
                                                                {' '}
                                                                (
                                                                {formatDate(
                                                                    token.last_used_at,
                                                                )}
                                                                )
                                                            </span>
                                                        </>
                                                    ) : (
                                                        'Never used'
                                                    )}
                                                </p>
                                                {token.expires_at && (
                                                    <p>
                                                        <span className="font-medium">
                                                            Expires:
                                                        </span>{' '}
                                                        {formatDate(
                                                            token.expires_at,
                                                        )}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        {!token.is_current && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() =>
                                                    handleDeleteToken(token.id)
                                                }
                                                disabled={
                                                    deletingTokenId === token.id
                                                }
                                                className="text-danger ml-3 hover:bg-danger-50 dark:hover:bg-danger-950/30"
                                                data-testid={`delete-session-${token.id}`}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                ))}
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
