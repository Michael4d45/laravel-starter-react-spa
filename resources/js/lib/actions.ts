import { ParseError } from '@effect/schema/ParseResult';
import * as S from '@effect/schema/Schema';
import { Cause, Effect, Exit } from 'effect';
import { ApiClient, ApiClientLive, ApiError, NetworkError, OfflineError } from './api/client';

// Import generated schemas and types
import { AuthResponseSchema, ContentItemsSchema, LoginRequestSchema, RegisterRequestSchema, UserDataSchema } from '@/types/effect-schemas';

// Import Wayfinder-generated actions
import CreateToken from '@/actions/App/Actions/Auth/CreateToken';
import Login from '@/actions/App/Actions/Auth/Login';
import Logout from '@/actions/App/Actions/Auth/Logout';
import Register from '@/actions/App/Actions/Auth/Register';
import ShowUser from '@/actions/App/Actions/Auth/ShowUser';
import ShowContent from '@/actions/App/Actions/Content/ShowContent';

// ============================================================================
// Error Handling Helpers
// ============================================================================

/**
 * Map API errors to domain errors (standard case)
 */
export const mapApiErrors = <A, R>(effect: Effect.Effect<A, ApiError | NetworkError | OfflineError, R>) =>
    effect.pipe(
        Effect.catchTags({
            ApiError: (error) => {
                if (error.status === 401) {
                    return Effect.fail({ _tag: 'Unauthorized', message: 'Authentication required' } as const);
                }
                // Check if this is a Laravel validation error (422 with errors field)
                if (error.status === 422 && error.data?.errors) {
                    return Effect.fail({
                        _tag: 'FormValidationError',
                        errors: error.data.errors,
                        message: error.data.message || 'Validation failed',
                    } as const);
                }
                return Effect.fail({ _tag: 'ApiFailure', error, message: error.message } as const);
            },
            NetworkError: (error) => Effect.fail({ _tag: 'NetworkError', error, message: error.message } as const),
            OfflineError: (error) => Effect.fail({ _tag: 'OfflineError', error, message: error.message } as const),
        }),
    ) as Effect.Effect<A, ApiActionError, R>;

/**
 * Map API errors to domain errors (with auth handling for 401)
 */

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
            Effect.mapError((error) => ({ _tag: 'ValidationError', error, message: `${label} validation failed` }) as const),
        );
}

/**
 * Validated POST action helper for login/register style operations
 */
export function validatedPost<
    Request,
    Response,
    EncodedResponse
>(
    route: string,
    requestSchema: S.Schema<Request>,
    responseSchema: S.Schema<Response, EncodedResponse>,
    requestLabel: string,
    responseLabel: string,
) {
    return (request: Request) =>
        Effect.gen(function* () {
            const validatedRequest =
                yield* decodeWithValidation(requestSchema, requestLabel)(request)

            const api = yield* ApiClient
            const response =
                yield* mapApiErrors(api.post(route, validatedRequest))

            return yield* decodeWithValidation(responseSchema, responseLabel)(
                response.data
            )
        })
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
    | { _tag: 'Unauthorized'; message: string }
    | { _tag: 'ValidationError'; error: ParseError; message: string }
    | { _tag: 'FormValidationError'; errors: ValidationErrors; message: string }
    | { _tag: 'ApiFailure'; error: ApiError; message: string }
    | { _tag: 'NetworkError'; error: NetworkError; message: string }
    | { _tag: 'OfflineError'; error: OfflineError; message: string };

// ============================================================================
// Effect-based API Actions
// ============================================================================

/**
 * Runnable API Actions - automatically execute Effects and return ActionResult
 * Use these for direct calls like: const result = await getUser()
 */
export const RunnableActions = {
    // ============================================================================
    // Auth Actions
    // ============================================================================

    /**
     * Get the current authenticated user
     */
    getUser: () => runAction(Effect.gen(function* () {
        const api = yield* ApiClient;
        const response = yield* mapApiErrors(api.get(ShowUser.url()));
        return yield* decodeWithValidation(UserDataSchema, 'User')(response.data);
    })),

    /**
     * Create a token for the currently authenticated user
     */
    createToken: () => runAction(Effect.gen(function* () {
        const api = yield* ApiClient;
        const response = yield* mapApiErrors(api.get(CreateToken.url()));
        return yield* decodeWithValidation(AuthResponseSchema, 'Token response')(response.data);
    })),

    /**
     * Login with email and password
     */
    login: (params: S.Schema.Type<typeof LoginRequestSchema>) => runAction(validatedPost(Login.url(), LoginRequestSchema, AuthResponseSchema, 'Login request', 'Login response')(params)),

    /**
     * Register a new user
     */
    register: (params: S.Schema.Type<typeof RegisterRequestSchema>) => runAction(validatedPost(Register.url(), RegisterRequestSchema, AuthResponseSchema, 'Register request', 'Register response')(params)),

    /**
     * Logout the current user
     */
    logout: () => runAction(Effect.gen(function* () {
        const api = yield* ApiClient;
        yield* mapApiErrors(api.post(Logout.url()));
        return { success: true };
    })),

    // ============================================================================
    // Content Actions
    // ============================================================================

    /**
     * Get content items
     */
    getContent: () => runAction(Effect.gen(function* () {
        const api = yield* ApiClient;
        const response = yield* mapApiErrors(api.get(ShowContent.url()));
        return yield* decodeWithValidation(ContentItemsSchema, 'Content response')(response.data);
    })),
};

/**
 * Result type for Effect operations - either success data or structured error
 */
export type ActionResult<T> = { success: true; data: T } | { success: false; error: ApiActionError };

/**
 * Run an Action Effect and return structured result instead of throwing
 * This is the proper Effect way - no try-catch needed in calling code
 */
export async function runAction<T>(effect: Effect.Effect<T, ApiActionError, ApiClient>): Promise<ActionResult<T>> {
    const exit = await Effect.runPromiseExit(effect.pipe(Effect.provide(ApiClientLive)));
    if (Exit.isSuccess(exit)) {
        return { success: true, data: exit.value };
    } else {
        // Extract the actual error from the Cause
        const error = Cause.failureOrCause(exit.cause);
        if (error._tag === 'Left') {
            return { success: false, error: error.left };
        } else {
            // This shouldn't happen with our Effect types, but handle it gracefully
            return {
                success: false,
                error: { _tag: 'NetworkError', error: { message: 'Unknown error occurred' } as any, message: 'Unknown error occurred' },
            };
        }
    }
}

/**
 * Utility functions for working with ActionResult
 */
export const ActionResult = {
    /**
     * Check if result is success and get data (type-safe)
     */
    isSuccess: <T>(result: ActionResult<T>): result is { success: true; data: T } => result.success,

    /**
     * Check if result is failure and get error (type-safe)
     */
    isFailure: <T>(result: ActionResult<T>): result is { success: false; error: ApiActionError } => !result.success,

    /**
     * Get data if success, undefined if failure
     */
    getData: <T>(result: ActionResult<T>): T | undefined => (result.success ? result.data : undefined),

    /**
     * Get error if failure, undefined if success
     */
    getError: <T>(result: ActionResult<T>): ApiActionError | undefined => (result.success ? undefined : result.error),

    /**
     * Pattern matching utility - provide handlers for success and failure
     */
    match: <T, R>(
        result: ActionResult<T>,
        handlers: {
            onSuccess: (data: T) => R;
            onFailure: (error: ApiActionError) => R;
        },
    ): R => {
        return result.success ? handlers.onSuccess(result.data) : handlers.onFailure(result.error);
    },
};
