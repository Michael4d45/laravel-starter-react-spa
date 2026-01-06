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

export function useAuth(options: { autoValidate?: boolean } = { autoValidate: true }) {
    const navigate = useNavigate();

    // Initialize state based on token existence
    const getInitialState = (): AuthState => {
        const token = localStorage.getItem('auth_token');
        if (token && options.autoValidate) {
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

        let authResponse;
        let authError: AuthError | null = null;

        try {
            authResponse = await runAction(Actions.login({ email, password, remember: false }));
        } catch (error: any) {
            // Parse the Effect FiberFailure error message (contains JSON with structured error)
            if (typeof error.message === 'string' && error.message.startsWith('{')) {
                try {
                    const structuredError = JSON.parse(error.message);

                    // Handle structured Effect errors
                    if (structuredError._tag === 'ApiFailure' && structuredError.error?.data?.errors) {
                        authError = new AuthError(structuredError.error.data.message || 'Login failed', structuredError.error.data.errors);
                    }
                } catch (parseError) {
                    // Fall through to generic error
                }
            }

            // Fallback for any other error
            if (!authError) {
                authError = new AuthError('Login failed. Please check your credentials.', {});
            }
        }

        // If we have an auth error, throw it now (outside the catch block)
        if (authError) {
            throw authError;
        }

        // Login successful
        localStorage.setItem('auth_token', authResponse.token);

        setAuthState({
            user: authResponse.user,
            isAuthenticated: true,
            isLoading: false,
        });
    };

    const register = async (name: string, email: string, password: string): Promise<void> => {
        if (!navigator.onLine) {
            throw new Error('Cannot register while offline');
        }

        let authResponse;
        let authError: AuthError | null = null;

        try {
            authResponse = await runAction(
                Actions.register({
                    name,
                    email,
                    password,
                    password_confirmation: password,
                }),
            );
        } catch (error: any) {
            // Parse the Effect FiberFailure error message (contains JSON with structured error)
            if (typeof error.message === 'string' && error.message.startsWith('{')) {
                try {
                    const structuredError = JSON.parse(error.message);

                    // Handle structured Effect errors
                    if (structuredError._tag === 'ApiFailure' && structuredError.error?.data?.errors) {
                        authError = new AuthError(structuredError.error.data.message || 'Registration failed', structuredError.error.data.errors);
                    }
                } catch (parseError) {
                    // Fall through to generic error
                }
            }

            // Fallback for any other error
            if (!authError) {
                authError = new AuthError('Registration failed. Please try again.', {});
            }
        }

        // If we have an auth error, throw it now (outside the catch block)
        if (authError) {
            throw authError;
        }

        // Registration successful - the API auto-logs in the user
        localStorage.setItem('auth_token', authResponse.token);

        setAuthState({
            user: authResponse.user,
            isAuthenticated: true,
            isLoading: false,
        });
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
