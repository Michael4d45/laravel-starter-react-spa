import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { ApiClient } from '@/lib/apiClient';
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
    useRef,
    useState,
} from 'react';
import toast from 'react-hot-toast';
import { useLocation, useNavigate } from 'react-router-dom';

interface AuthContextType {
    authState: AuthState;
    user: UserData | null;
    login: typeof ApiClient.login;
    register: typeof ApiClient.register;
    logout: () => Promise<void>;
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
    const processingAuthCallback = useRef(false);
    const isOnline = useOnlineStatus();

    // Provide the current user directly for easier consumption and reactivity
    const user = authState.user;

    useEffect(() => {
        // Subscribe to auth state changes
        const unsubscribe = authManager.subscribe(setAuthState);

        // Handle OAuth callback redirects and check for session auth
        const handleAuthInit = async () => {
            const urlParams = new URLSearchParams(window.location.search);
            const authParam = urlParams.get('auth');
            const messageParam = urlParams.get('message');

            if (processingAuthCallback.current) {
                return;
            }

            // Handle OAuth callbacks
            if (authParam === 'success' || authParam === 'connected') {
                processingAuthCallback.current = true;
                // OAuth successful - fetch token securely from API
                const result = await ApiClient.fetchOAuthToken();

                if (result._tag === 'Success') {
                    const { token, user } = result.data;
                    authManager.setAuthData(token, user);
                    setAuthState({ token, user, isAuthenticated: true });
                    toast.success(
                        authParam === 'success'
                            ? 'Successfully signed in with Google!'
                            : 'Google account connected successfully!',
                    );
                } else {
                    console.error('Failed to retrieve OAuth token:', result);
                    toast.error(
                        'Authentication completed but failed to retrieve session.',
                    );
                }
                window.history.replaceState({}, '', window.location.pathname);
                return;
            }

            if (authParam === 'error' && messageParam) {
                toast.error(decodeURIComponent(messageParam));
                window.history.replaceState({}, '', window.location.pathname);
                return;
            }

            // No OAuth callback - check if we need to validate existing JWT token
            const existingToken = authManager.getToken();

            if (!existingToken) {
                // Try to restore auth from server session (useful for tests with actingAs)
                // This silently fails for unauthenticated users - that's expected
                processingAuthCallback.current = true;
                try {
                    const result = await ApiClient.fetchSessionToken();
                    if (result._tag === 'Success') {
                        authManager.setAuthData(
                            result.data.token,
                            result.data.user,
                        );
                    }
                    // Silently ignore errors - user simply isn't logged in
                } catch {
                    // Silently ignore - user isn't logged in via session
                }
                processingAuthCallback.current = false;
            } else {
                // Validate existing JWT token with backend when online
                if (isOnline) {
                    processingAuthCallback.current = true;
                    try {
                        const result = await ApiClient.showUser();
                        if (result._tag === 'Success') {
                            // Token is valid, update user data in case it changed
                            authManager.setAuthData(existingToken, result.data);
                        } else {
                            authManager.clearAuthData();
                        }
                    } catch (error) {
                        authManager.clearAuthData();
                    }
                    processingAuthCallback.current = false;
                }
                // If offline, skip validation and keep existing token
            }
        };
        handleAuthInit();

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
            // Silently ignore logout errors
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

// Component to handle navigation when authenticated on auth pages
export function AuthGuard({ children }: { children: ReactNode }) {
    const { authState } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const isOnAuthPage =
            location.pathname === '/login' || location.pathname === '/register';
        if (authState.isAuthenticated && isOnAuthPage) {
            navigate('/', { replace: true });
        }
    }, [authState.isAuthenticated, location.pathname, navigate]);

    return <>{children}</>;
}
