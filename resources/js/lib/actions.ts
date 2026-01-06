import { ParseError } from '@effect/schema/ParseResult';
import * as S from '@effect/schema/Schema';
import { Effect } from 'effect';
import { ApiClient, ApiClientLive, ApiError, NetworkError, OfflineError } from './api/client';

// Import custom schemas from actions (for validation in Actions)

// Import feature-specific actions
import { AuthActions } from './actions/auth.actions';
import { ContentActions } from './actions/content.actions';

// ============================================================================
// Error Handling Helpers
// ============================================================================

/**
 * Map API errors to domain errors (standard case)
 */
export const mapApiErrors = <A, R>(effect: Effect.Effect<A, ApiError | NetworkError | OfflineError, R>) =>
    effect.pipe(
        Effect.catchTags({
            ApiError: (error) => Effect.fail({ _tag: 'ApiFailure', error } as const),
            NetworkError: (error) => Effect.fail({ _tag: 'NetworkError', error } as const),
            OfflineError: (error) => Effect.fail({ _tag: 'OfflineError', error } as const),
        }),
    ) as Effect.Effect<A, ApiActionError, R>;

/**
 * Map API errors to domain errors (with auth handling for 401)
 */
export const mapApiErrorsWithAuth = <A, R>(effect: Effect.Effect<A, ApiError | NetworkError | OfflineError, R>) =>
    effect.pipe(
        Effect.catchTags({
            ApiError: (error) =>
                error.status === 401 ? Effect.fail({ _tag: 'Unauthorized' } as const) : Effect.fail({ _tag: 'ApiFailure', error } as const),
            NetworkError: (error) => Effect.fail({ _tag: 'NetworkError', error } as const),
            OfflineError: (error) => Effect.fail({ _tag: 'OfflineError', error } as const),
        }),
    ) as Effect.Effect<A, ApiActionError, R>;

/**
 * Error constructors for consistent error creation
 */
export const Errors = {
    unauthorized: () => ({ _tag: 'Unauthorized' }) as const,
    validation: (error: ParseError) => ({ _tag: 'ValidationError', error }) as const,
    formValidation: (errors: ValidationErrors) => ({ _tag: 'FormValidationError', errors }) as const,
    apiFailure: (error: ApiError) => ({ _tag: 'ApiFailure', error }) as const,
    network: (error: NetworkError) => ({ _tag: 'NetworkError', error }) as const,
    offline: (error: OfflineError) => ({ _tag: 'OfflineError', error }) as const,
};

/**
 * Form error class for handling validation errors in React forms
 */
export class FormError extends Error {
    public errors?: ValidationErrors;

    constructor(message: string, errors?: ValidationErrors) {
        super(message);
        this.name = 'FormError';
        this.errors = errors;
    }
}

/**
 * Decode with validation and consistent error handling
 */
export function decodeWithValidation<A, I>(schema: S.Schema<A, I>, label: string) {
    return (input: I) =>
        S.decode(schema)(input).pipe(
            Effect.tapError((error) =>
                Effect.sync(() => {
                    console.error(`${label} validation error:`, error);
                }),
            ),
            Effect.mapError((error) => ({ _tag: 'ValidationError', error }) as const),
        );
}

/**
 * Validated POST action helper for login/register style operations
 */
export function validatedPost<Request, Response>(
    route: string,
    requestSchema: S.Schema<Request>,
    responseSchema: S.Schema<Response>,
    requestLabel: string,
    responseLabel: string,
) {
    return (request: Request) =>
        Effect.gen(function* () {
            const validatedRequest = yield* decodeWithValidation(requestSchema, requestLabel)(request);
            const api = yield* ApiClient;
            const response = yield* mapApiErrors(api.post(route, validatedRequest));
            return yield* decodeWithValidation(responseSchema, responseLabel)(response.data);
        });
}

// ============================================================================
// Shared Types
// ============================================================================

/**
 * Standard validation errors format for forms and API responses
 * Maps field names to arrays of error messages
 */
export interface ValidationErrors {
    [key: string]: string[];
}

// ============================================================================
// Domain Errors
// ============================================================================

export type ApiActionError =
    | { _tag: 'Unauthorized' }
    | { _tag: 'ValidationError'; error: ParseError }
    | { _tag: 'FormValidationError'; errors: ValidationErrors }
    | { _tag: 'ApiFailure'; error: ApiError }
    | { _tag: 'NetworkError'; error: NetworkError }
    | { _tag: 'OfflineError'; error: OfflineError };

// ============================================================================
// Actions
// ============================================================================

/**
 * Effect-based API Actions abstraction
 * Handles all API interactions with proper error handling and type safety
 */
export const Actions = {
    // ============================================================================
    // Auth Actions
    // ============================================================================
    ...AuthActions,

    // ============================================================================
    // Content Actions
    // ============================================================================
    ...ContentActions,
};

// ============================================================================
// Convenience Functions (for backward compatibility)
// ============================================================================

/**
 * Run an Action Effect with the ApiClientLive layer
 */
export function runAction<T>(effect: Effect.Effect<T, ApiActionError, ApiClient>): Promise<T> {
    return Effect.runPromise(effect.pipe(Effect.provide(ApiClientLive)));
}

/**
 * Run an Action Effect and map errors to Response objects (for React Router loaders)
 */
export async function runActionForLoader<T>(
    effect: Effect.Effect<T, ApiActionError, ApiClient>,
    mapError?: (error: ApiActionError) => Response,
): Promise<T> {
    try {
        return await runAction(effect);
    } catch (error: unknown) {
        // Type-safe error checking
        if (!error || typeof error !== 'object' || !('_tag' in error)) {
            throw error;
        }

        const apiError = error as ApiActionError;

        if (mapError) {
            // eslint-disable-next-line @typescript-eslint/only-throw-error
            throw mapError(apiError);
        }

        // Default error mapping - translate Effect errors to Response objects
        if (apiError._tag === 'Unauthorized') {
            // eslint-disable-next-line @typescript-eslint/only-throw-error
            throw new Response('Unauthorized', {
                status: 401,
                statusText: 'Please log in to view this content',
            });
        }
        if (apiError._tag === 'ValidationError') {
            // eslint-disable-next-line @typescript-eslint/only-throw-error
            throw new Response('Bad Response', {
                status: 502,
                statusText: 'Server returned invalid data format',
            });
        }

        throw error;
    }
}
