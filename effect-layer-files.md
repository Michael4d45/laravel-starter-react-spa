# Frontend Effect Layer Files

## Core Effect Infrastructure

### resources/js/lib/effect/index.ts
**Purpose**: Main entry point for the Effect library exports and application runtime setup. Provides centralized imports for all Effect-related functionality and services.

**Contents**:
```typescript
// Core Effect exports
export * from 'effect';

// Application runtime and layers
export * from './layers';
export * from './runtime';

// Services
export * from '../api/client';

// Utilities
export * from './utils';

// Re-export commonly used Effect functions for convenience
export { Context, Data, Effect, Either, Layer, Match, Option, Schedule } from 'effect';
```

### resources/js/lib/effect/layers.ts
**Purpose**: Defines the application's Effect layers that combine all services and dependencies. Acts as the dependency injection container for the Effect system.

**Contents**:
```typescript
import { Layer } from 'effect';
import { ApiClientLive } from '../api/client';

// Main application layer that combines all services
export const AppLayer = Layer.mergeAll(
    ApiClientLive,
    // Add more layers here as you create additional services
    // Example: AuthLive, CacheLive, NotificationLive, etc.
);

// Export the live layer for use in the application
export const AppLive = AppLayer;
```

### resources/js/lib/effect/runtime.ts
**Purpose**: Provides runtime utilities for executing Effect operations. Offers different execution modes (sync, async, promise-based) for running Effects in React components and hooks.

**Contents**:
```typescript
import { Effect, Runtime } from 'effect';

/**
 * The main Effect runtime for the application.
 * This runtime handles all Effect operations and provides the execution context.
 */
export const runtime = Runtime.defaultRuntime;

/**
 * Run an Effect synchronously and return the result or throw an error.
 * This is a convenience function for running effects in React components.
 */
export const runEffectSync = Runtime.runSync;

/**
 * Run an Effect asynchronously and return a Promise.
 * This is useful for async operations in React hooks.
 */
export const runEffectPromise = <A, E>(effect: Effect.Effect<A, E>) => Effect.runPromise(effect);

/**
 * Run an Effect synchronously, returning an Exit for error handling.
 * This allows you to handle both success and failure cases explicitly.
 */
export const runEffectExit = Runtime.runSyncExit;

/**
 * Run an Effect and return the result or throw an error.
 * This is a convenience function for running effects in React components.
 */
export const runEffect = runEffectSync;
```

### resources/js/lib/effect/utils.ts
**Purpose**: Utility functions for common Effect patterns including error handling, retry logic, caching, timeouts, and parallel/sequential execution helpers.

**Contents**:
```typescript
import { Data, Effect, Schedule } from 'effect';

// Common error types
export class TimeoutError extends Data.TaggedError('TimeoutError')<{
    message: string;
}> {}

export class RetryError extends Data.TaggedError('RetryError')<{
    message: string;
    attempts: number;
}> {}

/**
 * Add timeout to an Effect
 */
export const withTimeout = <A, E>(effect: Effect.Effect<A, E>, timeoutMs: number) =>
    Effect.race(effect, Effect.delay(Effect.fail(new TimeoutError({ message: `Operation timed out after ${timeoutMs}ms` })), timeoutMs));

/**
 * Add retry logic to an Effect with exponential backoff
 */
export const withRetry = <A, E>(
    effect: Effect.Effect<A, E>,
    options: {
        maxAttempts?: number;
        initialDelay?: number;
        maxDelay?: number;
    } = {},
) => {
    const { maxAttempts = 3, initialDelay = 1000, maxDelay = 30000 } = options;

    const retrySchedule = Schedule.exponential(initialDelay, 2).pipe(
        Schedule.upTo(maxDelay),
        Schedule.union(Schedule.spaced(initialDelay)),
        Schedule.whileInput((error) => {
            // Don't retry certain types of errors
            return !(error instanceof TimeoutError);
        }),
    );

    return Effect.retry(effect, retrySchedule);
};

/**
 * Add both timeout and retry to an Effect
 */
export const withTimeoutAndRetry = <A, E>(effect: Effect.Effect<A, E>, timeoutMs: number, retryOptions?: Parameters<typeof withRetry>[1]) =>
    withRetry(withTimeout(effect, timeoutMs), retryOptions);

/**
 * Convert an Effect result to a Promise for use in React hooks
 */
export const effectToPromise = <A, E>(effect: Effect.Effect<A, E>) => Effect.runPromise(effect);

/**
 * Handle Effect errors and convert to a standard format
 */
export const handleEffectError = (error: unknown): { message: string; code?: string; details?: any } => {
    if (error instanceof Error) {
        return {
            message: error.message,
            code: error.name,
            details: error,
        };
    }

    if (typeof error === 'object' && error !== null) {
        const err = error as any;
        return {
            message: err.message || 'An error occurred',
            code: err._tag || err.code,
            details: error,
        };
    }

    return {
        message: String(error),
        details: error,
    };
};

/**
 * Create a loading state wrapper for Effects
 */
export const withLoadingState = <A, E>(effect: Effect.Effect<A, E>) =>
    Effect.gen(function* () {
        // You could add loading state management here
        // For now, just run the effect
        const result = yield* effect;
        return result;
    });

/**
 * Create an Effect that caches results
 */
export const withCache = <A>(
    key: string,
    effect: Effect.Effect<A, any>,
    ttlMs: number = 5 * 60 * 1000, // 5 minutes default
) =>
    Effect.gen(function* () {
        const cached = localStorage.getItem(`effect_cache_${key}`);
        if (cached) {
            try {
                const { data, timestamp } = JSON.parse(cached);
                if (Date.now() - timestamp < ttlMs) {
                    return data as A;
                }
            } catch {
                // Invalid cache, continue
            }
        }

        const result = yield* effect;

        localStorage.setItem(
            `effect_cache_${key}`,
            JSON.stringify({
                data: result,
                timestamp: Date.now(),
            }),
        );

        return result;
    });

/**
 * Create an Effect that debounces execution
 */
export const withDebounce = <A, E>(effect: Effect.Effect<A, E>, delayMs: number) =>
    Effect.gen(function* () {
        yield* Effect.delay(effect, delayMs);
        return yield* effect;
    });

/**
 * Utility to run multiple effects in parallel
 */
export const parallel = <const Effects extends readonly Effect.Effect<any, any>[]>(effects: Effects) => Effect.all(effects);

/**
 * Utility to run multiple effects sequentially
 */
export const sequential = <const Effects extends readonly Effect.Effect<any, any>[]>(effects: Effects) => Effect.all(effects, { concurrency: 1 });
```

## API Client Layer

### resources/js/lib/api/client.ts
**Purpose**: Effect-based API client that handles HTTP requests with comprehensive error handling, caching, and offline support. Provides a service interface for making API calls through Effects.

**Contents**:
```typescript
import axios, { AxiosError } from 'axios';
import { Context, Data, Effect, Layer } from 'effect';
import { openDB } from 'idb';

const DB_NAME = 'api-cache-db';
const STORE_NAME = 'api-responses';

// Types
export interface ApiRequest {
    url: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    data?: any;
    headers?: Record<string, string>;
}

export interface ApiResponse<T = any> {
    data: T;
    status: number;
    statusText: string;
    headers: Record<string, string>;
}

// Errors
export class ApiError extends Data.TaggedError('ApiError')<{
    message: string;
    status?: number;
    data?: any;
}> {}

export class NetworkError extends Data.TaggedError('NetworkError')<{
    message: string;
    originalError: Error;
}> {}

export class OfflineError extends Data.TaggedError('OfflineError')<{
    message: string;
}> {}

// Service Interface
export class ApiClient extends Context.Tag('ApiClient')<
    ApiClient,
    {
        readonly request: <T = any>(request: ApiRequest) => Effect.Effect<ApiResponse<T>, ApiError | NetworkError | OfflineError>;
        readonly get: <T = any>(
            url: string,
            headers?: Record<string, string>,
        ) => Effect.Effect<ApiResponse<T>, ApiError | NetworkError | OfflineError>;
        readonly post: <T = any>(
            url: string,
            data?: any,
            headers?: Record<string, string>,
        ) => Effect.Effect<ApiResponse<T>, ApiError | NetworkError | OfflineError>;
        readonly put: <T = any>(
            url: string,
            data?: any,
            headers?: Record<string, string>,
        ) => Effect.Effect<ApiResponse<T>, ApiError | NetworkError | OfflineError>;
        readonly delete: <T = any>(
            url: string,
            headers?: Record<string, string>,
        ) => Effect.Effect<ApiResponse<T>, ApiError | NetworkError | OfflineError>;
    }
>() {}

// Cache Database Effect
const getCacheDb = Effect.promise(() =>
    openDB(DB_NAME, 1, {
        upgrade(db) {
            db.createObjectStore(STORE_NAME);
        },
    }),
);

// Cache utilities
const getCacheKey = (url: string, method: string) => `${method}:${url}`;

const getCachedResponse = (key: string) =>
    Effect.gen(function* () {
        const db = yield* getCacheDb;
        const cached = yield* Effect.promise(() => db.get(STORE_NAME, key));
        return cached;
    });

const setCachedResponse = (key: string, data: any) =>
    Effect.gen(function* () {
        const db = yield* getCacheDb;
        yield* Effect.promise(() => db.put(STORE_NAME, data, key));
    });

// Axios request with proper error handling
const axiosRequest = <T>(config: any) =>
    Effect.async<ApiResponse<T>, ApiError | NetworkError>((resume) => {
        axios(config)
            .then((response) => {
                resume(
                    Effect.succeed({
                        data: response.data,
                        status: response.status,
                        statusText: response.statusText,
                        headers: response.headers as Record<string, string>,
                    }),
                );
            })
            .catch((error) => {
                if (error instanceof AxiosError) {
                    if (error.response) {
                        // HTTP error response
                        const apiError = new ApiError({
                            message: error.response.data?.message || error.message,
                            status: error.response.status,
                            data: error.response.data,
                        });
                        resume(Effect.fail(apiError));
                    } else if (error.request) {
                        // Network error
                        resume(
                            Effect.fail(
                                new NetworkError({
                                    message: 'Network request failed',
                                    originalError: error,
                                }),
                            ),
                        );
                    } else {
                        // Unknown axios error
                        resume(
                            Effect.fail(
                                new NetworkError({
                                    message: error.message || 'Unknown axios error',
                                    originalError: error,
                                }),
                            ),
                        );
                    }
                } else {
                    // Unknown error
                    resume(
                        Effect.fail(
                            new NetworkError({
                                message: error instanceof Error ? error.message : 'Unknown error occurred',
                                originalError: error instanceof Error ? error : new Error(String(error)),
                            }),
                        ),
                    );
                }
            });
    });

// Main API request effect
const makeApiRequest = <T = any>(request: ApiRequest): Effect.Effect<ApiResponse<T>, ApiError | NetworkError | OfflineError> =>
    Effect.gen(function* () {
        // Check if offline for non-GET requests
        if (!navigator.onLine && request.method !== 'GET') {
            return yield* Effect.fail(
                new OfflineError({
                    message: `Cannot perform ${request.method} request while offline`,
                }),
            );
        }

        const token = localStorage.getItem('auth_token');

        const axiosConfig = {
            url: request.url,
            method: request.method.toLowerCase() as any,
            data: request.data,
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                ...request.headers,
                ...(token && { Authorization: `Bearer ${token}` }),
            },
            withCredentials: true,
        };

        // Try cache fallback for GET requests when offline
        if (!navigator.onLine && request.method === 'GET') {
            try {
                const cacheKey = getCacheKey(request.url, request.method);
                const cachedData = yield* getCachedResponse(cacheKey);
                if (cachedData) {
                    return {
                        data: cachedData,
                        status: 200,
                        statusText: 'OK (Cached)',
                        headers: {},
                    };
                }
            } catch (cacheError) {
                // Ignore cache errors
            }
        }

        const response = yield* axiosRequest<T>(axiosConfig);

        // Cache successful GET responses
        if (request.method === 'GET') {
            const cacheKey = getCacheKey(request.url, request.method);
            yield* setCachedResponse(cacheKey, response.data);
        }

        return response;
    });

// Layer
export const ApiClientLive = Layer.succeed(ApiClient, {
    request: makeApiRequest,
    get: <T = any>(url: string, headers?: Record<string, string>) => makeApiRequest<T>({ url, method: 'GET', headers }),
    post: <T = any>(url: string, data?: any, headers?: Record<string, string>) => makeApiRequest<T>({ url, method: 'POST', data, headers }),
    put: <T = any>(url: string, data?: any, headers?: Record<string, string>) => makeApiRequest<T>({ url, method: 'PUT', data, headers }),
    delete: <T = any>(url: string, headers?: Record<string, string>) => makeApiRequest<T>({ url, method: 'DELETE', headers }),
});
```

## Actions and Business Logic

### resources/js/lib/actions.ts
**Purpose**: Central hub for all Effect-based API actions. Defines runnable actions that can be called directly from React components, with comprehensive error handling and validation using Effect schemas.

**Contents**:
```typescript
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
```

## Schema Definitions

### resources/js/types/effect-schemas.ts
**Purpose**: Defines Effect schemas for runtime type validation and TypeScript type generation. These schemas ensure data consistency between frontend and backend, providing compile-time and runtime type safety.

**Contents**:
```typescript
import * as S from '@effect/schema/Schema';

export const PaginationLinks = S.Struct({
  url: S.Union(S.String, S.Null),
  label: S.String,
  page: S.Union(S.Number, S.Null),
  active: S.Boolean,
});

export const PaginationMeta = S.Struct({
  current_page: S.Number,
  first_page_url: S.String,
  from: S.Union(S.Number, S.Null),
  last_page: S.Number,
  last_page_url: S.String,
  next_page_url: S.Union(S.String, S.Null),
  path: S.String,
  per_page: S.Number,
  prev_page_url: S.Union(S.String, S.Null),
  to: S.Union(S.Number, S.Null),
  total: S.Number,
});

export const LengthAwarePaginator = <A extends S.Schema.Any>(item: A) =>
  S.Struct({
    data: S.Array(item),
    links: S.Array(PaginationLinks),
    meta: PaginationMeta,
  });

export const LoginRequestSchema = S.Struct({
  email: S.String,
  password: S.String,
  remember: S.Boolean
});

export type LoginRequest = S.Schema.Type<typeof LoginRequestSchema>;

export const UpdatePasswordRequestSchema = S.Struct({
  current_password: S.String,
  password: S.String
});

export type UpdatePasswordRequest = S.Schema.Type<typeof UpdatePasswordRequestSchema>;

export const RegisterRequestSchema = S.Struct({
  name: S.String,
  email: S.String,
  password: S.String,
  password_confirmation: S.String
});

export type RegisterRequest = S.Schema.Type<typeof RegisterRequestSchema>;

export const UserDataSchema = S.Struct({
  id: S.String,
  name: S.optional(S.String),
  email: S.optional(S.String),
  google_id: S.optional(S.String),
  email_verified_at: S.optional(S.DateFromString),
  created_at: S.optional(S.DateFromString),
  updated_at: S.optional(S.DateFromString),
  is_guest: S.Boolean,
  is_admin: S.Boolean
});

export type UserData = S.Schema.Type<typeof UserDataSchema>;

export const ContentDataSchema = S.Struct({
  id: S.Number,
  title: S.String,
  body: S.String
});

export type ContentData = S.Schema.Type<typeof ContentDataSchema>;

export const AuthResponseSchema = S.Struct({
  token: S.String,
  user: UserDataSchema
});

export type AuthResponse = S.Schema.Type<typeof AuthResponseSchema>;

export const ContentItemsSchema = S.Struct({
  content: S.Array(ContentDataSchema)
});

export type ContentItems = S.Schema.Type<typeof ContentItemsSchema>;
```

## React Integration Hooks

### resources/js/hooks/useAuth.ts
**Purpose**: React hook that integrates Effect-based authentication actions with React state management. Provides authentication state and methods for login, register, logout, and token management.

**Contents**:
```typescript
import { ActionResult, RunnableActions, type ValidationErrors } from '@/lib/actions';
import { AuthResponse, UserData } from '@/types/effect-schemas';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

// User type is imported from Actions

interface AuthState {
    user: UserData | null;
    isAuthenticated: boolean;
    isLoading: boolean;
}

/**
 * Handle ActionResult in React components - set validation errors or show toast
 */
export function handleAuthResult<T>(
    result: ActionResult<T>,
    setValidationErrors: (errors: ValidationErrors) => void,
    fallbackMessage: string,
): T | null {
    return ActionResult.match(result, {
        onSuccess: (data) => data,
        onFailure: (error) => {
            // All error types now have a message field
            if (error._tag === 'FormValidationError') {
                if (error.errors && Object.keys(error.errors).length > 0) {
                    setValidationErrors(error.errors);
                } else {
                    toast.error(error.message || fallbackMessage);
                }
            } else {
                toast.error(error.message || fallbackMessage);
            }
            return null;
        },
    });
}

// Main hook implementation continues...
```

## React Router Integration

### resources/js/features/content/ContentPage.tsx
**Purpose**: Example React component demonstrating Effect integration with React Router loaders. Shows how to use RunnableActions in route loaders and handle the results in components.

**Contents**:
```typescript
import { Button } from '@/components/ui/Button';
import { useOfflineBlock } from '@/hooks/useOfflineBlock';
import { ActionResult, RunnableActions } from '@/lib/actions';
import { ContentItems } from '@/types/effect-schemas';
import toast from 'react-hot-toast';
import { Link, useLoaderData } from 'react-router-dom';

/**
 * React Router loader function that uses the Effect-based loader
 */
export async function contentLoader() {
    const result = await RunnableActions.getContent();
    return ActionResult.match(result, {
        onSuccess: (data) => {
            return data;
        },
        onFailure: (error) => {
            throw new Error(`Content loading failed: ${JSON.stringify(error)}`);
        },
    });
}

// Component continues...
```
