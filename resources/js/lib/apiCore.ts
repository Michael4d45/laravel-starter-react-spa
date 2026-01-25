import { Effect, Schema } from 'effect';
import { apiCache } from './apiCache';
import { authManager } from './auth';
import { getCookieValue } from './utils';

/* ============================================================================
 * Error Types (Tagged Unions)
 * ============================================================================ */

const ErrorsSchema = Schema.Record({
    key: Schema.String,
    value: Schema.Array(Schema.String),
});

export const ValidationErrorSchema = Schema.Struct({
    _tag: Schema.Literal('ValidationError'),
    message: Schema.String,
    errors: ErrorsSchema,
});

export const CsrfTokenExpiredErrorSchema = Schema.Struct({
    _tag: Schema.Literal('CsrfTokenExpiredError'),
    message: Schema.String,
});

export const AuthenticationErrorSchema = Schema.Struct({
    _tag: Schema.Literal('AuthenticationError'),
    message: Schema.String,
});

export const NotFoundErrorSchema = Schema.Struct({
    _tag: Schema.Literal('NotFoundError'),
    message: Schema.String,
});

export const TooManyAttemptsErrorSchema = Schema.Struct({
    _tag: Schema.Literal('TooManyAttemptsError'),
    message: Schema.String,
});

export const ParseErrorSchema = Schema.Struct({
    _tag: Schema.Literal('ParseError'),
    message: Schema.String,
});

export const FatalErrorSchema = Schema.Struct({
    _tag: Schema.Literal('FatalError'),
    message: Schema.String,
});

export type ValidationError = Schema.Schema.Type<typeof ValidationErrorSchema>;
export type CsrfTokenExpiredError = Schema.Schema.Type<
    typeof CsrfTokenExpiredErrorSchema
>;
export type AuthenticationError = Schema.Schema.Type<
    typeof AuthenticationErrorSchema
>;
export type NotFoundError = Schema.Schema.Type<typeof NotFoundErrorSchema>;
export type TooManyAttemptsError = Schema.Schema.Type<
    typeof TooManyAttemptsErrorSchema
>;
export type ParseError = Schema.Schema.Type<typeof ParseErrorSchema>;
export type FatalError = Schema.Schema.Type<typeof FatalErrorSchema>;
type Errors = Schema.Schema.Type<typeof ErrorsSchema>;

type ApiError =
    | ValidationError
    | CsrfTokenExpiredError
    | AuthenticationError
    | NotFoundError
    | TooManyAttemptsError
    | ParseError
    | FatalError;

type EffectResult<A> =
    | { _tag: 'Success'; data: A }
    | { _tag: 'ValidationError'; message: string; errors: Errors }
    | { _tag: 'CsrfTokenExpiredError'; message: string }
    | { _tag: 'AuthenticationError'; message: string }
    | { _tag: 'NotFoundError'; message: string }
    | { _tag: 'TooManyAttemptsError'; message: string }
    | { _tag: 'ParseError'; message: string }
    | { _tag: 'FatalError'; message: string };

type RunEffect<A> = Promise<EffectResult<A>>;

/* ============================================================================
 * Core HTTP Effect Constructors
 * ============================================================================ */

// Effect that ensures CSRF token is ready
export const ensureCsrfToken = Effect.gen(function* () {
    const response = yield* Effect.tryPromise({
        try: () =>
            fetch('/sanctum/csrf-cookie', {
                credentials: 'include',
                headers: { Accept: 'application/json' },
            }),
        catch: (error) => ({
            _tag: 'FatalError' as const,
            message: `CSRF fetch failed: ${error}`,
        }),
    });

    if (!response.ok) {
        return yield* Effect.fail({
            _tag: 'FatalError' as const,
            message: 'Failed to obtain CSRF token',
        });
    }
});

// Effect that performs HTTP request
export const httpRequest = <A, R>(
    url: string,
    options: RequestInit,
    successSchema: Schema.Schema<A, R>,
) =>
    Effect.gen(function* () {
        // Get CSRF token from cookie
        const csrfToken = decodeURIComponent(
            getCookieValue('XSRF-TOKEN') ?? '',
        );

        // Build headers
        const headers = new Headers(options.headers);
        headers.set('Accept', 'application/json');
        if (csrfToken) {
            headers.set('X-XSRF-TOKEN', csrfToken);
        }

        // Make the fetch request
        const response = yield* Effect.tryPromise({
            try: () =>
                fetch(url, {
                    ...options,
                    credentials: 'include',
                    headers,
                }),
            catch: (error) => ({
                _tag: 'FatalError' as const,
                message: `Network error: Failed to fetch ${url} with method ${options.method || 'GET'}. This could be due to network connectivity issues, CORS policy violations, invalid URL, server unavailability, or certificate problems. Error details: ${error}${error instanceof Error && error.stack ? `\nStack: ${error.stack}` : ''}`,
            }),
        });

        // Handle HTTP error status codes
        if (!response.ok) {
            const contentType = response.headers.get('content-type');
            let errorData: unknown = null;

            if (contentType?.includes('application/json')) {
                errorData = yield* Effect.tryPromise({
                    try: () => response.json(),
                    catch: (error) => ({
                        _tag: 'ParseError' as const,
                        message: `Failed to parse error response: ${error}`,
                    }),
                });
            }

            // Map status codes to typed errors
            if (response.status === 422) {
                const decoded = yield* Schema.decodeUnknown(ErrorsSchema)(
                    (errorData as any)?.errors || [],
                );

                return yield* Effect.fail({
                    _tag: 'ValidationError' as const,
                    errors: decoded,
                    message: (errorData as any)?.message || 'ValidationError',
                });
            }
            if (response.status === 419) {
                return yield* Effect.fail({
                    _tag: 'CsrfTokenExpiredError' as const,
                    message: 'CSRF token expired',
                });
            }
            if (response.status === 401) {
                return yield* Effect.fail({
                    _tag: 'AuthenticationError' as const,
                    message: (errorData as any)?.message || 'Unauthenticated',
                });
            }
            if (response.status === 404) {
                return yield* Effect.fail({
                    _tag: 'NotFoundError' as const,
                    message: (errorData as any)?.message || 'Not found',
                });
            }
            if (response.status === 429) {
                return yield* Effect.fail({
                    _tag: 'TooManyAttemptsError' as const,
                    message: 'Too many attempts',
                });
            }

            return yield* Effect.fail({
                _tag: 'FatalError' as const,
                message: `HTTP ${response.status}: ${response.statusText}`,
            });
        }

        // Parse successful response
        const data = yield* Effect.tryPromise({
            try: () => response.json(),
            catch: (error) => ({
                _tag: 'ParseError' as const,
                message: `JSON parse error: ${error}`,
            }),
        });

        // Decode using schema
        return yield* Schema.decodeUnknown(successSchema)(data).pipe(
            Effect.mapError((error) => ({
                _tag: 'ParseError' as const,
                message: error.message,
            })),
        );
    });

/* ============================================================================
 * Retry Logic
 * ============================================================================ */

type RetryContext = {
    retried419?: boolean;
};

export const withRetry = <A>(
    effect: Effect.Effect<A, ApiError>,
    context: string,
    retryCtx: RetryContext = {},
): Effect.Effect<A, ApiError> => {
    return effect.pipe(
        Effect.catchTag('CsrfTokenExpiredError', (error) => {
            if (!retryCtx.retried419) {
                console.log(`${context}: CSRF expired, retrying...`);
                return ensureCsrfToken.pipe(
                    Effect.flatMap(() =>
                        withRetry(effect, `${context} (csrf retry)`, {
                            ...retryCtx,
                            retried419: true,
                        }),
                    ),
                );
            }
            // Already retried, clear auth and fail
            console.log(`${context}: CSRF expired after retry, clearing auth`);
            authManager.clearAuthData();
            return Effect.fail(error);
        }),
        Effect.tap((result) =>
            Effect.sync(() =>
                console.log(`${context}: success`, JSON.stringify(result)),
            ),
        ),
        Effect.tapError((error) =>
            Effect.sync(() => {
                console.log(`${context}: error`, JSON.stringify(error));
                if (error._tag === 'AuthenticationError') {
                    authManager.clearAuthData();
                }
            }),
        ),
    );
};

/* ============================================================================
 * Caching Layer
 * ============================================================================ */

export const withCache = <A>(
    effect: Effect.Effect<A, ApiError>,
    cacheKey: string,
): Effect.Effect<A, ApiError> => {
    return Effect.gen(function* () {
        // If offline, try cache
        if (!navigator.onLine) {
            const cached = yield* Effect.promise(() =>
                apiCache.get<A>(cacheKey),
            );
            if (cached !== undefined) {
                console.log(`${cacheKey}: returning cached data (offline)`);
                return cached;
            }
            return yield* Effect.fail({
                _tag: 'FatalError' as const,
                message: 'You are offline and no cached data is available.',
            });
        }

        // Online: fetch fresh data
        const data = yield* effect;

        // Cache the result
        yield* Effect.promise(() => apiCache.set(cacheKey, data));

        return data;
    });
};

/* ============================================================================
 * Result Converter (Effect → Promise of Tagged Union)
 * ============================================================================ */

export const runEffect = <A>(
    effect: Effect.Effect<A, ApiError>,
    context: string,
): RunEffect<A> => {
    console.log(`calling: ${context}`);

    return Effect.runPromise(
        effect.pipe(
            Effect.map((data) => ({
                _tag: 'Success' as const,
                data,
            })),
            Effect.catchAll((error) => Effect.succeed(error)),
        ),
    );
};
