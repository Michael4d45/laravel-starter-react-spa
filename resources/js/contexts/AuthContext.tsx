import { ApiClient } from '@/lib/apiClientSingleton';
import { authManager, AuthState } from '@/lib/auth';
import {
    LoginRequest,
    RegisterRequest,
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
    login: typeof ApiClient.login;
    register: typeof ApiClient.register;
    logout: () => void;
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

        // Check token validity on mount
        authManager.refreshAuthState();

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
            console.warn('Backend logout failed, clearing client-side data anyway:', error);
        }

        // Clear client-side authentication data
        authManager.clearAuthData();
        toast.success('Logged out successfully');
    };

    const value: AuthContextType = {
        authState,
        login,
        register,
        logout,
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
