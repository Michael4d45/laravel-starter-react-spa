import { Effect, Schema } from 'effect';
import { apiCache } from './apiCache';
import { authManager } from '../features/auth/authManager';
import { db } from './db';
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

export const FetchErrorSchema = Schema.Struct({
    _tag: Schema.Literal('FetchError'),
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
export type FetchError = Schema.Schema.Type<typeof FetchErrorSchema>;
type Errors = Schema.Schema.Type<typeof ErrorsSchema>;

export type ApiError =
    | ValidationError
    | CsrfTokenExpiredError
    | AuthenticationError
    | NotFoundError
    | TooManyAttemptsError
    | ParseError
    | FatalError
    | FetchError;

type EffectResult<A> =
    | { _tag: 'Success'; data: A }
    | { _tag: 'ValidationError'; message: string; errors: Errors }
    | { _tag: 'CsrfTokenExpiredError'; message: string }
    | { _tag: 'AuthenticationError'; message: string }
    | { _tag: 'NotFoundError'; message: string }
    | { _tag: 'TooManyAttemptsError'; message: string }
    | { _tag: 'ParseError'; message: string }
    | { _tag: 'FatalError'; message: string }
    | { _tag: 'FetchError'; message: string };

export type RunEffect<A> = Promise<EffectResult<A>>;

/* ============================================================================
 * Core HTTP Effect Constructors
 * ============================================================================ */

// Effect that ensures CSRF token is ready
const CSRF_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

let tokenExpiresAt: number | null = null;

let csrfToken = decodeURIComponent(getCookieValue('XSRF-TOKEN') ?? '');

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

    // Re-read the cookie after fetch
    csrfToken = decodeURIComponent(getCookieValue('XSRF-TOKEN') ?? '');
    tokenExpiresAt = Date.now() + CSRF_TTL_MS;

    if (!csrfToken) {
        return yield* Effect.fail({
            _tag: 'FatalError' as const,
            message: 'CSRF token missing after fetch',
        });
    }
});

export const clearCsrfToken = () => {
    csrfToken = '';
    tokenExpiresAt = null;
};

export const csrfTokenCheck = Effect.gen(function* () {
    const tokenInCookie = decodeURIComponent(
        getCookieValue('XSRF-TOKEN') ?? '',
    );

    // Token missing or expired
    if (
        !csrfToken ||
        !tokenInCookie ||
        !tokenExpiresAt ||
        tokenExpiresAt < Date.now()
    ) {
        yield* ensureCsrfToken;
    }

    return csrfToken;
});

// Effect that performs HTTP request
export const httpRequest = (url: string, options?: RequestInit) =>
    Effect.gen(function* () {
        if (!options) {
            options = { method: 'GET' };
        }

        // Build headers
        const headers = new Headers(options.headers);

        if (!headers.has('Accept')) {
            headers.set('Accept', 'application/json');
        }

        const csrfToken = yield* csrfTokenCheck;
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
                _tag: 'FetchError' as const,
                message: `Network error: Failed to fetch ${url} with method ${options?.method || 'GET'}. This could be due to network connectivity issues, CORS policy violations, invalid URL, server unavailability, or certificate problems. Error details: ${error}${error instanceof Error && error.stack ? `\nStack: ${error.stack}` : ''}`,
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

        return response;
    });

export function buildQueryString(params?: Record<string, any>): string {
    if (!params) return '';
    const parts: string[] = [];
    for (const [key, value] of Object.entries(params)) {
        if (value === null || value === undefined) continue;
        if (Array.isArray(value)) {
            for (const item of value) {
                parts.push(
                    `${encodeURIComponent(key)}[]=${encodeURIComponent(String(item))}`,
                );
            }
        } else {
            parts.push(
                `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`,
            );
        }
    }
    return parts.length ? `?${parts.join('&')}` : '';
}

export const getWithQuery = (url: string, options?: RequestInit) =>
    Effect.flatMap((decodedQuery: Record<string, any> | undefined) =>
        httpRequest(`${url}${buildQueryString(decodedQuery)}`, {
            method: 'GET',
            ...(options || {}),
        }),
    );

export const sendWithPayload = (url: string, options?: RequestInit) =>
    Effect.flatMap((decodedPayload) =>
        httpRequest(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(decodedPayload),
            ...(options || {}),
        }),
    );

export const sendWithFormData = (url: string, options?: RequestInit) =>
    Effect.flatMap((formData: FormData) =>
        httpRequest(url, {
            method: 'POST',
            body: formData,
            ...(options || {}),
        }),
    );

/* ============================================================================
 * Retry Logic
 * ============================================================================ */

interface RetryContext {
    retried419?: boolean;
    retriedFetchError?: boolean;
}

export const withRetry =
    (context: string, retryCtx: RetryContext = {}) =>
    <A>(effect: Effect.Effect<A, ApiError>): Effect.Effect<A, ApiError> => {
        return effect.pipe(
            Effect.catchTag('CsrfTokenExpiredError', (error) => {
                if (!retryCtx.retried419) {
                    console.log(`${context}: CSRF expired, retrying...`);
                    return ensureCsrfToken.pipe(
                        Effect.flatMap(() =>
                            withRetry(context + ' (csrf retry)', {
                                ...retryCtx,
                                retried419: true,
                            })(effect),
                        ),
                    );
                }
                console.log(
                    `${context}: CSRF expired after retry, clearing auth`,
                );
                authManager.clearAuthData();
                return Effect.fail(error);
            }),
            Effect.catchTag('FetchError', (error) => {
                if (!retryCtx.retriedFetchError) {
                    console.log(`${context}: Fetch failed, retrying...`);
                    return withRetry(context + ' (fetch retry)', {
                        ...retryCtx,
                        retriedFetchError: true,
                    })(effect);
                }
                console.log(`${context}: Fetch failed after retry`);
                return Effect.fail(error);
            }),
        );
    };

/* ============================================================================
 * Caching Layer
 * ============================================================================ */

export const withCache = <A>(cacheKey: string) => {
    return (effect: Effect.Effect<A, ApiError>) =>
        Effect.gen(function* () {
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

export const withCacheFirst = <A>(cacheKey: string, ttlSeconds?: number) => {
    return (effect: Effect.Effect<A, ApiError>) =>
        Effect.gen(function* () {
            // Check cache first
            const entry = yield* Effect.promise(() =>
                db.apiCache.get(cacheKey),
            );
            if (
                entry &&
                (!ttlSeconds ||
                    Date.now() - entry.timestamp < ttlSeconds * 1000)
            ) {
                return entry.data as A;
            }

            // If offline and no valid cache, fail
            if (!navigator.onLine) {
                return yield* Effect.fail({
                    _tag: 'FatalError' as const,
                    message:
                        'You are offline and no valid cached data is available.',
                });
            }

            // Fetch fresh data
            const data = yield* effect;

            // Cache the result
            yield* Effect.promise(() => apiCache.set(cacheKey, data));

            return data;
        });
};

export const encodeUndefined =
    <A, I>(schema: Schema.Schema<A, I>) =>
    (data: A | undefined) =>
        Schema.encodeUnknown(Schema.Union(schema, Schema.Undefined))(data);

export const decodeJson =
    <A, I>(schema: Schema.Schema<A, I>) =>
    (effect: Effect.Effect<Response, ApiError>) =>
        effect.pipe(
            Effect.flatMap((response: Response) =>
                Effect.tryPromise({
                    try: () => response.json(),
                    catch: (error) => ({
                        _tag: 'ParseError' as const,
                        message: `JSON parse error: ${error}`,
                    }),
                }),
            ),
            Effect.flatMap((data) => Schema.decodeUnknown(schema)(data)),
        );

/* ============================================================================
 * Result Converter (Effect → Promise of Tagged Union)
 * ============================================================================ */

export const runEffect = <A>(
    effect: Effect.Effect<A, ApiError>,
): RunEffect<A> => {
    return Effect.runPromise(
        effect.pipe(
            Effect.map((data) => ({
                _tag: 'Success' as const,
                data,
            })),
            Effect.tapError((error) =>
                Effect.sync(() => {
                    console.error(error);
                    if (error._tag === 'AuthenticationError') {
                        authManager.clearAuthData();
                    }
                }),
            ),
            Effect.catchAll((error) => Effect.succeed(error)),
        ),
    );
};
