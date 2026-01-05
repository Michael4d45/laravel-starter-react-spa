import { useState, useEffect } from 'react';
import { login as apiLogin, register as apiRegister, logout as apiLogout } from '@/routes/api';
import { api } from '@/lib/api/client';

interface User {
    id: number;
    name: string;
    email: string;
}

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
            // Use the API client to call /api/user endpoint
            const response = await api.get('/api/user');

            if (response.status === 200 && response.data) {
                setAuthState({
                    user: response.data,
                    isAuthenticated: true,
                    isLoading: false,
                });
            } else {
                // Token is invalid, remove it and try to get a new one
                localStorage.removeItem('auth_token');
                await fetchTokenIfAuthenticated();
            }
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
            // Try to get a token for the already authenticated user
            const response = await api.get('/api/token');

            if (response.status === 200 && response.data.token) {
                // Got a token, store it and set authenticated state
                localStorage.setItem('auth_token', response.data.token);
                setAuthState({
                    user: response.data.user,
                    isAuthenticated: true,
                    isLoading: false,
                });
            } else {
                // Not authenticated
                setAuthState({
                    user: null,
                    isAuthenticated: false,
                    isLoading: false,
                });
            }
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
        validateToken();
    }, []);

    const login = async (email: string, password: string): Promise<void> => {
        if (!navigator.onLine) {
            throw new Error('Cannot login while offline');
        }

        try {
            // Use Wayfinder-generated API route with centralized API client
            const route = apiLogin();
            const response = await api.post(route.url, { email, password });

            const data = response.data;

            if (response.status < 200 || response.status >= 300) {
                throw new AuthError(data.message || 'Login failed', data.errors || {});
            }

            localStorage.setItem('auth_token', data.token);

            setAuthState({
                user: data.user,
                isAuthenticated: true,
                isLoading: false,
            });
        } catch (error: any) {
            // Handle AxiosError - extract validation errors from response.data
            if (error.response?.data) {
                const responseData = error.response.data;
                throw new AuthError(
                    responseData.message || 'Login failed',
                    responseData.errors || {}
                );
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
            // Use Wayfinder-generated API route with centralized API client
            const route = apiRegister();
            const response = await api.post(route.url, { name, email, password, password_confirmation: password });

            const data = response.data;

            if (response.status < 200 || response.status >= 300) {
                throw new AuthError(data.message || 'Registration failed', data.errors || {});
            }

            // Registration successful - the API auto-logs in the user
            localStorage.setItem('auth_token', data.token);

            setAuthState({
                user: data.user,
                isAuthenticated: true,
                isLoading: false,
            });

            return data;
        } catch (error: any) {
            // Handle AxiosError - extract validation errors from response.data
            if (error.response?.data) {
                const responseData = error.response.data;
                throw new AuthError(
                    responseData.message || 'Registration failed',
                    responseData.errors || {}
                );
            }

            // Re-throw other errors
            throw error;
        }
    };

    const logout = async () => {
        const token = localStorage.getItem('auth_token');

        if (token && navigator.onLine) {
            try {
                // Use Wayfinder-generated API route with centralized API client
                const route = apiLogout();
                await api.post(route.url);
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
    };

    return {
        ...authState,
        login,
        register,
        logout,
    };
}