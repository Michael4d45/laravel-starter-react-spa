import { UserData } from '@/schemas/App/Data/Models';

const USER_KEY = 'auth_user';

interface AuthLoggedInState {
    user: UserData;
    isAuthenticated: true;
}

interface AuthLoggedOutState {
    user: null;
    isAuthenticated: false;
}

export type AuthState = AuthLoggedInState | AuthLoggedOutState;

export class AuthManager {
    private static instance: AuthManager;
    private listeners: Set<(state: AuthState) => void> = new Set();

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
        const user = this.getUser();

        if (user) {
            return {
                user,
                isAuthenticated: true,
            };
        }

        return {
            user,
            isAuthenticated: false,
        };
    }

    /**
     * Update the current user data
     */
    setUser(user: UserData | null): void {
        if (user) {
            localStorage.setItem(USER_KEY, JSON.stringify(user));
        } else {
            localStorage.removeItem(USER_KEY);
        }
        this.notifyListeners();
    }

    /**
     * Clear authentication data on logout
     */
    clearAuthData(): void {
        localStorage.removeItem(USER_KEY);
        this.notifyListeners();
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
        return !!this.getUser();
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
