import { authManager, AuthState } from '@/features/auth/authManager';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { UserData } from '@/schemas/App/Data/Models/UserData';
import { LoginRequest } from '@/schemas/App/Features/Auth/Requests/LoginRequest';
import { RegisterRequest } from '@/schemas/App/Features/Auth/Requests/RegisterRequest';
import {
    createContext,
    ReactNode,
    useContext,
    useEffect,
    useRef,
    useState,
} from 'react';
import toast from 'react-hot-toast';
import { useMatches, useNavigate } from 'react-router';
import {
    disconnectGoogle as apiDisconnectGoogle,
    login as apiLogin,
    logout as apiLogout,
    register as apiRegister,
    showUser,
} from './api';

export interface AuthContextState {
    hasFetchedUser: boolean;
    isAuthenticated: boolean;
    user: UserData | null;
}

interface AuthContextType {
    authState: AuthContextState;
    user: UserData | null;
    login: typeof apiLogin;
    register: typeof apiRegister;
    logout: () => Promise<void>;
    googleLogin: (reconnect?: boolean, remember?: boolean) => Promise<void>;
    disconnectGoogle: typeof apiDisconnectGoogle;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const OFFLINE_AUTH_TRUST_KEY = 'auth_user_trusted_offline';

const setOfflineAuthTrust = (trusted: boolean): void => {
    if (trusted) {
        localStorage.setItem(OFFLINE_AUTH_TRUST_KEY, '1');
        return;
    }

    localStorage.removeItem(OFFLINE_AUTH_TRUST_KEY);
};

const isOfflineAuthTrusted = (): boolean => {
    return localStorage.getItem(OFFLINE_AUTH_TRUST_KEY) === '1';
};

const getInitialAuthState = (): AuthState & { hasFetchedUser: boolean } => {
    const cachedAuthState = authManager.getAuthState();
    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;

    if (
        isOffline &&
        isOfflineAuthTrusted() &&
        cachedAuthState.isAuthenticated
    ) {
        return { ...cachedAuthState, hasFetchedUser: false };
    }

    return { user: null, isAuthenticated: false, hasFetchedUser: false };
};

interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [authState, setAuthState] = useState<
        AuthState & {
            hasFetchedUser: boolean;
        }
    >(getInitialAuthState);
    const [isLoading, setIsLoading] = useState(false);
    const hasMounted = useRef(false);
    const isOnline = useOnlineStatus();
    const isFetchingUser = useRef(false);

    // Provide the current user directly for easier consumption and reactivity
    const user = authState.user;

    const handleSetAuthState = (state: AuthState) => {
        setAuthState((previousState) => {
            const nextState = { ...state, hasFetchedUser: true };

            if (JSON.stringify(previousState) === JSON.stringify(nextState)) {
                return previousState;
            }

            console.log('[AuthContext] Auth state changed:', state);
            return nextState;
        });
    };

    const getUser = () => {
        if (isFetchingUser.current) return;
        isFetchingUser.current = true;

        return showUser()
            .then((result) => {
                if (result._tag === 'Success') {
                    setOfflineAuthTrust(true);
                    authManager.setUser(result.data);
                    console.log('[AuthContext] Fetched user data');
                } else if (result._tag === 'AuthenticationError') {
                    setOfflineAuthTrust(false);
                    authManager.clearAuthData();
                }

                return result;
            })
            .finally(() => {
                isFetchingUser.current = false;
                setAuthState((previousState) => {
                    if (previousState.hasFetchedUser) {
                        return previousState;
                    }

                    return { ...previousState, hasFetchedUser: true };
                });
            });
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
        if (isOnline) {
            getUser();
        } else {
            const cachedAuthState = authManager.getAuthState();

            if (isOfflineAuthTrusted() && cachedAuthState.isAuthenticated) {
                authManager.setUser(cachedAuthState.user);
            } else {
                authManager.clearAuthData();
            }
        }

        return unsubscribe;
    }, [isOnline]);

    const login = async (credentials: LoginRequest) => {
        setIsLoading(true);

        const result = await apiLogin(credentials);
        if (result._tag === 'Success') {
            // Fetch user after successful login
            await getUser();
        }
        setIsLoading(false);
        return result;
    };

    const register = async (data: RegisterRequest) => {
        setIsLoading(true);

        const result = await apiRegister(data);
        if (result._tag === 'Success') {
            // Fetch user after successful register
            await getUser();
        }
        setIsLoading(false);
        return result;
    };

    const logout = async () => {
        const response = await apiLogout();

        if (response._tag === 'Success') {
            // Clear client-side authentication data
            setOfflineAuthTrust(false);
            authManager.clearAuthData();

            toast.success(response.data.message);
        } else {
            toast.error('Failed to log out. Please try again.');
        }
    };

    const googleLogin = async (reconnect?: boolean) => {
        // Redirect to Google OAuth
        window.location.href = `/auth/google${reconnect ? '?reconnect=1' : ''}`;
    };

    const disconnectGoogle = async () => {
        const result = await apiDisconnectGoogle();
        if (result._tag === 'Success') {
            // Update user data after disconnecting Google
            setOfflineAuthTrust(true);
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
    const matches = useMatches();

    const isOnAuthPage = matches.some(
        (match) => (match.handle as any)?.isAuthPage,
    );
    const isOnProtectedPage = matches.some(
        (match) => (match.handle as any)?.isProtected,
    );

    useEffect(() => {
        if (!(isOnProtectedPage || isOnAuthPage) || !authState.hasFetchedUser) {
            return;
        }

        if (authState.isAuthenticated && isOnAuthPage) {
            navigate('/', { replace: true });
        }

        if (!authState.isAuthenticated && !isOnAuthPage) {
            navigate('/login', { replace: true });
        }
    }, [
        authState.isAuthenticated,
        authState.hasFetchedUser,
        isOnAuthPage,
        navigate,
        isOnProtectedPage,
    ]);

    if (
        isOnProtectedPage &&
        (!authState.hasFetchedUser ||
            (authState.isAuthenticated && isOnAuthPage) ||
            (!authState.isAuthenticated && !isOnAuthPage))
    ) {
        return null;
    }

    return <>{children}</>;
}
