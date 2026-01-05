// Re-export types from the generated schemas
export type { UserData as User } from '@/lib/schemas/generated-schema';

/**
 * Effect-based profile loader that fetches user data from the API
 * with structured error handling and runtime type safety.
 */
export { Actions as profileLoaderEffect } from '@/lib/actions';

/**
 * Convenience function to run the profile loader effect
 * Note: This is now primarily for testing - use profileLoader() for React Router
 */
export async function loadProfile() {
    return import('@/lib/actions').then(({ runAction, Actions }) => runAction(Actions.getUser));
}

/**
 * React Router loader function that uses the Effect-based loader
 * This will automatically redirect to login if the user is not authenticated
 */
export async function profileLoader() {
    return import('@/lib/actions').then(({ runActionForLoader, Actions }) => runActionForLoader(Actions.getUser));
}
