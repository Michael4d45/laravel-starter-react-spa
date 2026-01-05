import { useEffect, useState } from 'react';

// Simplified types for now
interface User {
    id: number;
    name: string;
    email: string;
}

interface AuthTokens {
    token: string;
    user: User;
}

interface LoginCredentials {
    email: string;
    password: string;
}

interface RegisterData {
    name: string;
    email: string;
    password: string;
}

interface ValidationErrors {
    [key: string]: string[];
}

export interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
}

export class AuthHookError extends Error {
    public errors?: ValidationErrors;

    constructor(message: string, errors?: ValidationErrors) {
        super(message);
        this.name = 'AuthHookError';
        this.errors = errors;
    }
}

export function useAuthEffect() {
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
    const [error, setError] = useState<string | null>(null);

    // Function to validate token and get user data from server
    const validateToken = async () => {
        try {
            const response = await fetch('/api/user', {
                headers: {
                    Authorization: localStorage.getItem('auth_token') ? `Bearer ${localStorage.getItem('auth_token')}` : '',
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'include',
            });

            if (response.status === 401) {
                localStorage.removeItem('auth_token');
                await fetchTokenIfAuthenticated();
                return;
            }

            if (!response.ok) {
                localStorage.removeItem('auth_token');
                await fetchTokenIfAuthenticated();
                return;
            }

            const user = await response.json();
            setAuthState({
                user,
                isAuthenticated: true,
                isLoading: false,
            });
        } catch (error) {
            console.warn('Token validation failed:', error);
            localStorage.removeItem('auth_token');
            await fetchTokenIfAuthenticated();
        }
    };

    // Function to automatically fetch JWT token if user is authenticated via session
    const fetchTokenIfAuthenticated = async () => {
        try {
            const response = await fetch('/api/token', {
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'include',
            });

            if (response.ok) {
                const tokens = await response.json();
                localStorage.setItem('auth_token', tokens.token);
                setAuthState({
                    user: tokens.user,
                    isAuthenticated: true,
                    isLoading: false,
                });
            } else {
                setAuthState({
                    user: null,
                    isAuthenticated: false,
                    isLoading: false,
                });
            }
        } catch (error) {
            console.warn('Token fetch failed:', error);
            setAuthState({
                user: null,
                isAuthenticated: false,
                isLoading: false,
            });
        }
    };

    // Validate token on mount (always try to authenticate)
    useEffect(() => {
        validateToken();
    }, []);

    const login = async (email: string, password: string): Promise<void> => {
        const credentials: LoginCredentials = { email, password };

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'include',
                body: JSON.stringify(credentials),
            });

            if (!response.ok) {
                throw new Error('Login failed');
            }

            const tokens = await response.json();
            localStorage.setItem('auth_token', tokens.token);
            setAuthState({
                user: tokens.user,
                isAuthenticated: true,
                isLoading: false,
            });
        } catch (error: any) {
            setError('Login failed');
            throw new AuthHookError('Login failed');
        }
    };

    const register = async (name: string, email: string, password: string): Promise<void> => {
        const data: RegisterData = { name, email, password };

        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'include',
                body: JSON.stringify({
                    ...data,
                    password_confirmation: data.password,
                }),
            });

            if (!response.ok) {
                throw new Error('Registration failed');
            }

            const tokens = await response.json();
            localStorage.setItem('auth_token', tokens.token);
            setAuthState({
                user: tokens.user,
                isAuthenticated: true,
                isLoading: false,
            });
        } catch (error: any) {
            setError('Registration failed');
            throw new AuthHookError('Registration failed');
        }
    };

    const logout = async () => {
        try {
            const token = localStorage.getItem('auth_token');
            if (token) {
                await fetch('/api/logout', {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                    credentials: 'include',
                });
            }
        } catch (error) {
            // Ignore logout errors, still clear local state
            console.warn('Logout failed:', error);
        }

        setAuthState({
            user: null,
            isAuthenticated: false,
            isLoading: false,
        });
    };

    return {
        ...authState,
        error,
        login,
        register,
        logout,
    };
}
