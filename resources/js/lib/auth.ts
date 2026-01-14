import { UserData } from '@/schemas/App/Data/Models';

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
     * Update stored JWT token (used for token rotation)
     */
    setToken(token: string): void {
        localStorage.setItem(TOKEN_KEY, token);
        // Don't notify listeners since user data hasn't changed
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
