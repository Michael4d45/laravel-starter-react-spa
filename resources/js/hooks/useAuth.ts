import { ActionResult, RunnableActions, type ValidationErrors } from '@/lib/actions';
import { type UserData as User } from '@/lib/schemas/generated-schema';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

// User type is imported from Actions

interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
}

/**
 * Handle ActionResult in React components - set validation errors or show toast
 */
export function handleAuthResult<T>(
    result: ActionResult<T>,
    setValidationErrors: (errors: ValidationErrors) => void,
    fallbackMessage: string,
): T | null {
    return ActionResult.match(result, {
        onSuccess: (data) => data,
        onFailure: (error) => {
            // All error types now have a message field
            if (error._tag === 'FormValidationError') {
                if (error.errors && Object.keys(error.errors).length > 0) {
                    setValidationErrors(error.errors);
                } else {
                    toast.error(error.message || fallbackMessage);
                }
            } else {
                toast.error(error.message || fallbackMessage);
            }
            return null;
        },
    });
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

        const result = await RunnableActions.getUser();
        ActionResult.match(result, {
            onSuccess: (user) => {
                setAuthState({
                    user,
                    isAuthenticated: true,
                    isLoading: false,
                });
            },
            onFailure: (error) => {
                // Token validation failed, remove the invalid token and try to get a new one
                console.warn('Token validation failed:', error);
                localStorage.removeItem('auth_token');
                fetchTokenIfAuthenticated(); // Don't await here to avoid blocking
            },
        });
    };

    // Function to automatically fetch JWT token if user is authenticated via session
    const fetchTokenIfAuthenticated = async () => {
        const result = await RunnableActions.createToken();
        ActionResult.match(result, {
            onSuccess: (tokenResponse) => {
                // Got a token, store it and set authenticated state
                localStorage.setItem('auth_token', tokenResponse.token);
                setAuthState({
                    user: tokenResponse.user,
                    isAuthenticated: true,
                    isLoading: false,
                });
            },
            onFailure: (error) => {
                // Not authenticated or error occurred
                setAuthState({
                    user: null,
                    isAuthenticated: false,
                    isLoading: false,
                });
            },
        });
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

    const login = async (email: string, password: string): Promise<ActionResult<{ token: string; user: User }>> => {
        if (!navigator.onLine) {
            return {
                success: false,
                error: { _tag: 'OfflineError', error: { message: 'Cannot login while offline' } as any, message: 'Cannot login while offline' },
            };
        }

        const result = await RunnableActions.login({ email, password, remember: false });

        if (ActionResult.isSuccess(result)) {
            // Login successful
            const authResponse = result.data;
            localStorage.setItem('auth_token', authResponse.token);
            setAuthState({
                user: authResponse.user,
                isAuthenticated: true,
                isLoading: false,
            });
            return { success: true, data: authResponse };
        } else {
            return { success: false, error: result.error };
        }
    };

    const register = async (name: string, email: string, password: string): Promise<ActionResult<{ token: string; user: User }>> => {
        if (!navigator.onLine) {
            return {
                success: false,
                error: { _tag: 'OfflineError', error: { message: 'Cannot register while offline' } as any, message: 'Cannot register while offline' },
            };
        }

        const result = await RunnableActions.register({
            name,
            email,
            password,
            password_confirmation: password,
        });

        if (ActionResult.isSuccess(result)) {
            // Registration successful - the API auto-logs in the user
            const authResponse = result.data;
            localStorage.setItem('auth_token', authResponse.token);
            setAuthState({
                user: authResponse.user,
                isAuthenticated: true,
                isLoading: false,
            });
            return { success: true, data: authResponse };
        } else {
            return { success: false, error: result.error };
        }
    };

    const logout = async () => {
        const token = localStorage.getItem('auth_token');

        if (token && navigator.onLine) {
            const result = await RunnableActions.logout();
            ActionResult.match(result, {
                onSuccess: () => {
                    // Logout successful
                },
                onFailure: (error) => {
                    // Ignore logout errors - still remove local token
                    console.warn('Logout API call failed:', error);
                },
            });
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
