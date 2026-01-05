// Re-export types from the generated schemas
export type { ContentProps as ContentResponse } from '@/lib/schemas/generated-schema';

/**
 * Effect-based content loader that replaces the Promise-based approach
 * with structured error handling and type safety.
 */
export { Actions as contentLoaderEffect } from '@/lib/actions';

/**
 * Convenience function to run the content loader effect
 */
export async function loadContent() {
    return import('@/lib/actions').then(({ runAction, Actions }) => runAction(Actions.getContent));
}

/**
 * React Router loader function that uses the Effect-based loader
 */
export async function contentLoader() {
    return import('@/lib/actions').then(({ runAction, Actions }) => runAction(Actions.getContent));
}
