import { UserData } from '@/types/effect-schemas';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

export interface AuthState {
    token: string | null;
    user: UserData | null;
    isAuthenticated: boolean;
}

export class AuthManager {
    private static instance: AuthManager;
    private listeners: Set<(state: AuthState) => void> = new Set();

    private constructor() {}

    static getInstance(): AuthManager {
        if (!AuthManager.instance) {
            AuthManager.instance = new AuthManager();
        }
        return AuthManager.instance;
    }

    /**
     * Get current authentication state
     */
    getAuthState(): AuthState {
        const token = this.getToken();
        const user = this.getUser();

        return {
            token,
            user,
            isAuthenticated: !!(token && user),
        };
    }

    /**
     * Set authentication data after successful login/register
     */
    setAuthData(token: string, user: UserData): void {
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(USER_KEY, JSON.stringify(user));
        this.notifyListeners();
    }

    /**
     * Clear authentication data on logout
     */
    clearAuthData(): void {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        this.notifyListeners();
    }

    /**
     * Get stored JWT token
     */
    getToken(): string | null {
        return localStorage.getItem(TOKEN_KEY);
    }

    /**
     * Get stored user data
     */
    getUser(): UserData | null {
        const userJson = localStorage.getItem(USER_KEY);
        if (!userJson) return null;

        try {
            return JSON.parse(userJson);
        } catch {
            // If parsing fails, clear corrupted data
            this.clearAuthData();
            return null;
        }
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated(): boolean {
        return !!(this.getToken() && this.getUser());
    }

    /**
     * Check if stored token is expired
     * Laravel Sanctum tokens don't have expiration by default, so we consider them valid
     * unless they're missing or corrupted
     */
    isTokenExpired(): boolean {
        const token = this.getToken();
        // Sanctum tokens don't expire by default, so just check if token exists
        return !token;
    }

    /**
     * Refresh authentication state (useful for checking token validity)
     */
    refreshAuthState(): void {
        if (this.isTokenExpired()) {
            this.clearAuthData();
        }
    }

    /**
     * Try to restore authentication from server session (useful for tests with actingAs)
     */
    async tryRestoreFromSession(): Promise<boolean> {
        // If we already have a valid token, no need to restore
        if (this.getToken() && !this.isTokenExpired()) {
            return true;
        }

        try {
            // Try to get a token from the server (works if there's a session)
            const response = await fetch('/api/token', {
                method: 'GET',
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'same-origin', // Include cookies for session auth
            });

            if (response.ok) {
                const data = await response.json();
                if (data.token && data.user) {
                    this.setAuthData(data.token, data.user);
                    return true;
                }
            }
        } catch (error) {
            console.warn('Failed to restore auth from session:', error);
        }

        return false;
    }

    /**
     * Subscribe to authentication state changes
     */
    subscribe(listener: (state: AuthState) => void): () => void {
        this.listeners.add(listener);

        // Return unsubscribe function
        return () => {
            this.listeners.delete(listener);
        };
    }

    /**
     * Notify all listeners of state changes
     */
    private notifyListeners(): void {
        const state = this.getAuthState();
        this.listeners.forEach((listener) => listener(state));
    }
}

// Export singleton instance
export const authManager = AuthManager.getInstance();
