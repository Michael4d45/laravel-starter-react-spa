import { ApiClient } from '@/lib/apiClientSingleton';
import { authManager, AuthState } from '@/lib/auth';
import {
    LoginRequest,
    RegisterRequest,
    UserData,
} from '@/types/effect-schemas';
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
    user: UserData | null;
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

    // Provide the current user directly for easier consumption and reactivity
    const user = authState.user;

    useEffect(() => {
        // Subscribe to auth state changes
        const unsubscribe = authManager.subscribe(setAuthState);

        // Handle OAuth callback redirects and refresh auth state
        const handleAuthCallback = async () => {
            const urlParams = new URLSearchParams(window.location.search);
            const authParam = urlParams.get('auth');
            const messageParam = urlParams.get('message');

            if (authParam === 'success' || authParam === 'connected') {
                // OAuth successful - fetch token securely from API
                try {
                    const response = await fetch('/api/oauth-token', {
                        method: 'GET',
                        headers: {
                            Accept: 'application/json',
                            'X-Requested-With': 'XMLHttpRequest',
                        },
                        credentials: 'same-origin', // Include session cookies
                    });

                    if (response.ok) {
                        const data = await response.json();
                        if (data.token && data.user) {
                            // Update the auth manager (localStorage)
                            authManager.setAuthData(data.token, data.user);

                            // Force a state update to ensure all components re-render with new data
                            setAuthState({
                                token: data.token,
                                user: data.user,
                                isAuthenticated: true,
                            });

                            toast.success(
                                authParam === 'success'
                                    ? 'Successfully signed in with Google!'
                                    : 'Google account connected successfully!',
                            );
                        }
                    } else {
                        console.error('Failed to retrieve OAuth token');
                        toast.error(
                            'Authentication completed but failed to retrieve session.',
                        );
                    }
                } catch (error) {
                    console.error('OAuth token fetch error:', error);
                    toast.error('Failed to complete authentication.');
                }

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
        user,
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
