import { useAuth as useAuthContext } from '@/contexts/AuthContext';
import { authManager } from '@/lib/auth';

// Re-export the main auth hook for convenience
export { useAuth } from '@/contexts/AuthContext';

/**
 * Hook to check if user is authenticated
 */
export function useIsAuthenticated(): boolean {
    return authManager.isAuthenticated();
}

/**
 * Hook to get current user
 */
export function useCurrentUser() {
    const { authState } = useAuthContext();
    return authState.user;
}

/**
 * Hook to get current token
 */
export function useAuthToken(): string | null {
    const { authState } = useAuthContext();
    return authState.token;
}

/**
 * Hook to check if auth operations are loading
 */
export function useAuthLoading(): boolean {
    const { isLoading } = useAuthContext();
    return isLoading;
}
