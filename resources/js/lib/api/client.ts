import axios, { AxiosError } from 'axios';
import { Context, Data, Effect, Layer } from 'effect';
import { openDB } from 'idb';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/';
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
