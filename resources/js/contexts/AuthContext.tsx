import { ApiClient } from '@/lib/apiClientSingleton';
import { authManager, AuthState } from '@/lib/auth';
import { LoginRequest, RegisterRequest } from '@/types/effect-schemas';
import {
    createContext,
    ReactNode,
    useContext,
    useEffect,
    useState,
} from 'react';
import toast from 'react-hot-toast';

interface AuthContextType {
    authState: AuthState;
    login: typeof ApiClient.login;
    register: typeof ApiClient.register;
    logout: () => void;
    googleLogin: (forceConsent?: boolean) => void;
    disconnectGoogle: () => Promise<void>;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [authState, setAuthState] = useState<AuthState>(
        authManager.getAuthState(),
    );
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        // Subscribe to auth state changes
        const unsubscribe = authManager.subscribe(setAuthState);

        // Handle OAuth callback redirects and refresh auth state
        const handleAuthCallback = async () => {
            const urlParams = new URLSearchParams(window.location.search);
            const authParam = urlParams.get('auth');
            const messageParam = urlParams.get('message');
            const tokenParam = urlParams.get('token');
            const userParam = urlParams.get('user');

            if (authParam === 'success' || authParam === 'connected') {
                // Check if token and user are provided directly in URL (new OAuth flow)
                if (tokenParam && userParam) {
                    try {
                        // Store the initial data from URL
                        const userData = JSON.parse(
                            decodeURIComponent(userParam),
                        );
                        authManager.setAuthData(tokenParam, userData);

                        // For account connections, refresh user data from server to ensure we have latest updates
                        if (authParam === 'connected') {
                            try {
                                const freshUserData =
                                    await ApiClient.showUser();
                                if (freshUserData._tag === 'Success') {
                                    authManager.setAuthData(
                                        tokenParam,
                                        freshUserData.data,
                                    );
                                }
                            } catch (refreshError) {
                                console.warn(
                                    'Failed to refresh user data after connection:',
                                    refreshError,
                                );
                                // Keep the URL data as fallback
                            }
                        }

                        toast.success(
                            authParam === 'success'
                                ? 'Successfully signed in with Google!'
                                : 'Google account connected successfully!',
                        );
                        // Clean up URL
                        window.history.replaceState(
                            {},
                            '',
                            window.location.pathname,
                        );
                        return;
                    } catch (error) {
                        console.error(
                            'Failed to parse OAuth user data:',
                            error,
                        );
                        // Fall back to session refresh
                    }
                }

                // Fallback: OAuth successful but no direct token - try to refresh from session
                await authManager.refreshAuthState();
                toast.success(
                    authParam === 'success'
                        ? 'Successfully signed in with Google!'
                        : 'Google account connected successfully!',
                );
                // Clean up URL
                window.history.replaceState({}, '', window.location.pathname);
            } else if (authParam === 'error' && messageParam) {
                // OAuth error
                toast.error(decodeURIComponent(messageParam));
                // Clean up URL
                window.history.replaceState({}, '', window.location.pathname);
            } else {
                // Check token validity on mount (no OAuth callback)
                await authManager.refreshAuthState();
            }
        };

        handleAuthCallback();

        return unsubscribe;
    }, []);

    const login = async (credentials: LoginRequest) => {
        setIsLoading(true);
        const result = await ApiClient.login(credentials);
        if (result._tag === 'Success') {
            authManager.setAuthData(result.data.token, result.data.user);
            toast.success('Login successful!');
        }
        setIsLoading(false);
        return result;
    };

    const register = async (data: RegisterRequest) => {
        setIsLoading(true);
        const result = await ApiClient.register(data);
        if (result._tag === 'Success') {
            authManager.setAuthData(result.data.token, result.data.user);
            toast.success('Account created successfully!');
        }
        setIsLoading(false);
        return result;
    };

    const logout = async () => {
        try {
            // Call backend logout endpoint to invalidate server-side session/token
            await ApiClient.logout();
        } catch (error) {
            console.warn(
                'Backend logout failed, clearing client-side data anyway:',
                error,
            );
        }

        // Clear client-side authentication data
        authManager.clearAuthData();
        toast.success('Logged out successfully');
    };

    const googleLogin = (forceConsent = false) => {
        ApiClient.googleLogin(forceConsent);
    };

    const disconnectGoogle = async () => {
        setIsLoading(true);
        const result = await ApiClient.disconnectGoogle();
        if (result._tag === 'Success') {
            // Update user data with the fresh data from the server
            const token = authManager.getToken();
            if (token) {
                authManager.setAuthData(token, result.data.user);
            }
            toast.success('Google account disconnected successfully!');
        } else {
            toast.error('Failed to disconnect Google account');
        }
        setIsLoading(false);
    };

    const value: AuthContextType = {
        authState,
        login,
        register,
        logout,
        googleLogin,
        disconnectGoogle,
        isLoading,
    };

    return (
        <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
    );
}

export function useAuth(): AuthContextType {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
