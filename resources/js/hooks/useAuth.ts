import { Actions, runAction } from '@/lib/actions';
import { type UserData as User } from '@/lib/schemas/generated-schema';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// User type is imported from Actions

interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
}

export interface ValidationErrors {
    [key: string]: string[];
}

export class AuthError extends Error {
    public errors?: ValidationErrors;

    constructor(message: string, errors?: ValidationErrors) {
        super(message);
        this.name = 'AuthError';
        this.errors = errors;
    }
}

export function useAuth() {
    const navigate = useNavigate();

    // Initialize state based on token existence
    const getInitialState = (): AuthState => {
        const token = localStorage.getItem('auth_token');
        if (token) {
            // We have a token, start with loading state while we validate it
            return {
                user: null,
                isAuthenticated: false,
                isLoading: true,
            };
        }
        return {
            user: null,
            isAuthenticated: false,
            isLoading: false,
        };
    };

    const [authState, setAuthState] = useState<AuthState>(getInitialState);

    // Function to validate token and get user data from server
    const validateToken = async () => {
        const token = localStorage.getItem('auth_token');
        if (!token) {
            // No token in localStorage, but user might be authenticated via session
            // Try to get a token automatically
            await fetchTokenIfAuthenticated();
            return;
        }

        try {
            const user = await runAction(Actions.getUser);
            setAuthState({
                user,
                isAuthenticated: true,
                isLoading: false,
            });
        } catch (error) {
            // Token validation failed, remove the invalid token and try to get a new one
            console.warn('Token validation failed:', error);
            localStorage.removeItem('auth_token');
            await fetchTokenIfAuthenticated();
        }
    };

    // Function to automatically fetch JWT token if user is authenticated via session
    const fetchTokenIfAuthenticated = async () => {
        try {
            const tokenResponse = await runAction(Actions.createToken);
            // Got a token, store it and set authenticated state
            localStorage.setItem('auth_token', tokenResponse.token);
            setAuthState({
                user: tokenResponse.user,
                isAuthenticated: true,
                isLoading: false,
            });
        } catch (error) {
            // Not authenticated or error occurred
            setAuthState({
                user: null,
                isAuthenticated: false,
                isLoading: false,
            });
        }
    };

    // Validate token on mount (always try to authenticate)
    useEffect(() => {
        const initAuth = async () => {
            try {
                await validateToken();
            } catch (error) {
                console.error('Auth initialization failed:', error);
            }
        };
        initAuth();
    }, []);

    const login = async (email: string, password: string): Promise<void> => {
        if (!navigator.onLine) {
            throw new Error('Cannot login while offline');
        }

        try {
            const authResponse = await runAction(Actions.login({ email, password, remember: false }));

            localStorage.setItem('auth_token', authResponse.token);

            setAuthState({
                user: authResponse.user,
                isAuthenticated: true,
                isLoading: false,
            });
        } catch (error: any) {
            // Handle structured errors from Actions
            if (error._tag === 'ApiFailure' && error.error.status) {
                const responseData = error.error.data;
                throw new AuthError(responseData?.message || 'Login failed', responseData?.errors || {});
            }

            // Re-throw other errors
            throw error;
        }
    };

    const register = async (name: string, email: string, password: string): Promise<void> => {
        if (!navigator.onLine) {
            throw new Error('Cannot register while offline');
        }

        try {
            const authResponse = await runAction(
                Actions.register({
                    name,
                    email,
                    password,
                    password_confirmation: password,
                }),
            );

            // Registration successful - the API auto-logs in the user
            localStorage.setItem('auth_token', authResponse.token);

            setAuthState({
                user: authResponse.user,
                isAuthenticated: true,
                isLoading: false,
            });
        } catch (error: any) {
            // Handle structured errors from Actions
            if (error._tag === 'ApiFailure' && error.error.status) {
                const responseData = error.error.data;
                throw new AuthError(responseData?.message || 'Registration failed', responseData?.errors || {});
            }

            // Re-throw other errors
            throw error;
        }
    };

    const logout = async () => {
        const token = localStorage.getItem('auth_token');

        if (token && navigator.onLine) {
            try {
                await runAction(Actions.logout);
            } catch (error) {
                // Ignore logout errors - still remove local token
                console.warn('Logout API call failed:', error);
            }
        }

        localStorage.removeItem('auth_token');
        setAuthState({
            user: null,
            isAuthenticated: false,
            isLoading: false,
        });

        // Navigate to home page after logout
        navigate('/');
    };

    return {
        ...authState,
        login,
        register,
        logout,
    };
}
