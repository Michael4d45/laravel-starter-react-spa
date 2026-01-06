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
     * Check if stored token is expired (basic check)
     * In a real app, you'd decode the JWT and check the exp claim
     */
    isTokenExpired(): boolean {
        const token = this.getToken();
        if (!token) return true;

        try {
            // Basic JWT decode (without verification - for client-side only)
            const payload = JSON.parse(atob(token.split('.')[1]));
            const currentTime = Math.floor(Date.now() / 1000);

            return payload.exp && payload.exp < currentTime;
        } catch {
            // If we can't decode, consider it expired
            return true;
        }
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
