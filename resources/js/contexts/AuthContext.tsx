import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { ApiClient } from '@/lib/apiClient';
import { authManager, AuthState } from '@/lib/auth';
import { UserData } from '@/schemas/App/Data/Models';
import { LoginRequest, RegisterRequest } from '@/schemas/App/Data/Requests';
import {
    createContext,
    ReactNode,
    useContext,
    useEffect,
    useRef,
    useState,
} from 'react';
import toast from 'react-hot-toast';
import { useLocation, useNavigate } from 'react-router';

export interface AuthContextState {
    hasFetchedUser: boolean;
    isAuthenticated: boolean;
    user: UserData | null;
}

interface AuthContextType {
    authState: AuthContextState;
    user: UserData | null;
    login: typeof ApiClient.login;
    register: typeof ApiClient.register;
    logout: () => Promise<void>;
    googleLogin: (reconnect?: boolean, remember?: boolean) => Promise<void>;
    disconnectGoogle: typeof ApiClient.disconnectGoogle;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [authState, setAuthState] = useState<
        AuthState & {
            hasFetchedUser: boolean;
        }
    >({ ...authManager.getAuthState(), hasFetchedUser: false });
    const [isLoading, setIsLoading] = useState(false);
    const hasMounted = useRef(false);
    const isOnline = useOnlineStatus();
    const isFetchingUser = useRef(false);

    // Provide the current user directly for easier consumption and reactivity
    const user = authState.user;

    const handleSetAuthState = (state: AuthState) => {
        console.log('[AuthContext] Auth state changed:', state);
        setAuthState({ ...state, hasFetchedUser: true });
    };

    const getUser = async () => {
        if (isFetchingUser.current) return;
        isFetchingUser.current = true;

        const result = await ApiClient.showUser();
        if (result._tag === 'Success') {
            authManager.setUser(result.data);
            console.log('[AuthContext] Fetched user data');
        }

        isFetchingUser.current = false;
        return result;
    };

    useEffect(() => {
        // Avoid flapping during initial boot.
        // Real-time connections are now handled by individual hooks when user changes
        if (!hasMounted.current) {
            hasMounted.current = true;
            return;
        }
    }, [authState.isAuthenticated]);

    useEffect(() => {
        const unsubscribe = authManager.subscribe(handleSetAuthState);
        const urlParams = new URLSearchParams(window.location.search);
        const auth = urlParams.get('auth');
        if (auth === 'success') {
            toast.success('Logged in successfully');
        } else if (auth === 'error') {
            const message =
                urlParams.get('message') ||
                'An error occurred during authentication';
            toast.error(message);
        }
        // Clean up URL
        const url = new URL(window.location.href);
        url.searchParams.delete('auth');
        url.searchParams.delete('message');
        window.history.replaceState({}, document.title, url.toString());
        if (isOnline) getUser();
        return unsubscribe;
    }, [isOnline]);

    const login = async (credentials: LoginRequest) => {
        setIsLoading(true);

        const result = await ApiClient.login(credentials);
        if (result._tag === 'Success') {
            // Fetch user after successful login
            await getUser();
        }
        setIsLoading(false);
        return result;
    };

    const register = async (data: RegisterRequest) => {
        setIsLoading(true);

        const result = await ApiClient.register(data);
        if (result._tag === 'Success') {
            // Fetch user after successful register
            await getUser();
        }
        setIsLoading(false);
        return result;
    };

    const logout = async () => {
        try {
            // Call backend logout endpoint to invalidate server-side session
            await ApiClient.logout();
        } catch (error) {
            // Silently ignore logout errors
            console.warn('[AuthContext] Logout API call failed:', error);
        }

        // Clear client-side authentication data
        authManager.clearAuthData();

        toast.success('Logged out successfully');
    };

    const googleLogin = async (reconnect?: boolean) => {
        // Redirect to Google OAuth
        window.location.href = `/auth/google${reconnect ? '?reconnect=1' : ''}`;
    };

    const disconnectGoogle = async () => {
        const result = await ApiClient.disconnectGoogle();
        if (result._tag === 'Success') {
            // Update user data after disconnecting Google
            authManager.setUser(result.data.user);
            toast.success(result.data.message);
        }
        return result;
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

    const isOnAuthPage =
        location.pathname === '/login' ||
        location.pathname === '/register' ||
        location.pathname === '/forgot-password' ||
        location.pathname.startsWith('/reset-password');

    useEffect(() => {
        if (!authState.hasFetchedUser) return;

        if (authState.isAuthenticated && isOnAuthPage) {
            navigate('/', { replace: true });
        }

        if (
            !authState.isAuthenticated &&
            !isOnAuthPage &&
            location.pathname !== '/'
        ) {
            navigate('/login', { replace: true });
        }
    }, [
        authState.isAuthenticated,
        authState.hasFetchedUser,
        isOnAuthPage,
        location.pathname,
        navigate,
    ]);

    if (!authState.hasFetchedUser) {
        return null; // or a spinner
    }

    if (
        (authState.isAuthenticated && isOnAuthPage) ||
        (!authState.isAuthenticated &&
            !isOnAuthPage &&
            location.pathname !== '/')
    ) {
        return null;
    }

    return <>{children}</>;
}
