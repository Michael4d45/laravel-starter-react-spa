import { UserDataSchema } from '@/schemas/App/Data/Models';
import {
    AuthenticateBroadcastingRequestSchema,
    LoginRequest,
    LoginRequestSchema,
    RegisterRequest,
    RegisterRequestSchema,
} from '@/schemas/App/Data/Requests';
import {
    AuthResponseSchema,
    AuthenticateBroadcastingResponseSchema,
    ContentItemsSchema,
} from '@/schemas/App/Data/Response';
import {
    FetchHttpClient,
    HttpApi,
    HttpApiClient,
    HttpApiEndpoint,
    HttpApiGroup,
    HttpClient,
    HttpClientRequest,
} from '@effect/platform';
import { Effect, Schema } from 'effect';

import { HttpApiDecodeError } from '@effect/platform/HttpApiError';
import { HttpClientError } from '@effect/platform/HttpClientError';
import { ParseError } from 'effect/ParseResult';
import { apiCache } from './apiCache';
import { authManager } from './auth';

export const ValidationErrorSchema = Schema.Struct({
    _tag: Schema.Literal('ValidationError'),
    message: Schema.String,
    errors: Schema.Record({
        key: Schema.String,
        value: Schema.Array(Schema.String),
    }),
});

export type ValidationError = Schema.Schema.Type<typeof ValidationErrorSchema>;

export const CsrfTokenExpiredErrorSchema = Schema.Struct({
    _tag: Schema.Literal('CsrfTokenExpiredError'),
    message: Schema.String,
});

export type CsrfTokenExpiredError = Schema.Schema.Type<
    typeof CsrfTokenExpiredErrorSchema
>;

export const AuthenticationErrorSchema = Schema.Struct({
    _tag: Schema.Literal('AuthenticationError'),
    message: Schema.String,
});

export type AuthenticationError = Schema.Schema.Type<
    typeof AuthenticationErrorSchema
>;

export const NotFoundErrorSchema = Schema.Struct({
    _tag: Schema.Literal('NotFoundError'),
    message: Schema.String,
});

export type NotFoundError = Schema.Schema.Type<typeof NotFoundErrorSchema>;

/* ============================================================================
 * API Definition
 * ============================================================================
 */

const authGroup = HttpApiGroup.make('auth')
    .add(
        HttpApiEndpoint.post('login', '/api/login')
            .setPayload(LoginRequestSchema)
            .addSuccess(AuthResponseSchema),
    )
    .add(
        HttpApiEndpoint.post('register', '/api/register')
            .setPayload(RegisterRequestSchema)
            .addSuccess(AuthResponseSchema),
    )
    .add(
        HttpApiEndpoint.post('logout', '/api/logout').addSuccess(
            Schema.Struct({ message: Schema.String }),
        ),
    )
    .add(
        HttpApiEndpoint.post(
            'disconnectGoogle',
            '/api/disconnect-google',
        ).addSuccess(
            Schema.Struct({
                message: Schema.String,
                user: UserDataSchema,
            }),
        ),
    )
    .add(
        HttpApiEndpoint.get('oauthToken', '/api/oauth-token').addSuccess(
            AuthResponseSchema,
        ),
    )
    .add(
        HttpApiEndpoint.get('sessionToken', '/api/token').addSuccess(
            AuthResponseSchema,
        ),
    );

const userGroup = HttpApiGroup.make('users').add(
    HttpApiEndpoint.get('show', '/api/user').addSuccess(UserDataSchema),
);

const contentGroup = HttpApiGroup.make('content').add(
    HttpApiEndpoint.get('show', '/api/content').addSuccess(ContentItemsSchema),
);

// Broadcasting endpoints (authenticated)
const broadcastingGroup = HttpApiGroup.make('broadcasting').add(
    HttpApiEndpoint.post('auth', '/api/broadcasting/auth')
        .setPayload(AuthenticateBroadcastingRequestSchema)
        .addSuccess(AuthenticateBroadcastingResponseSchema),
);

export const Api = HttpApi.make('BackendApi')
    .add(authGroup)
    .add(userGroup)
    .add(contentGroup)
    .add(broadcastingGroup)
    .addError(ValidationErrorSchema, { status: 422 })
    .addError(CsrfTokenExpiredErrorSchema, { status: 419 })
    .addError(AuthenticationErrorSchema, { status: 401 })
    .addError(NotFoundErrorSchema, { status: 404 });

/* ============================================================================
 * Form-Friendly Result
 * ============================================================================
 */
const baseUrl = ''; // Empty string to use relative paths

// Base transform that always adds Accept header
const withJsonAccept = HttpClient.mapRequest(
    HttpClientRequest.setHeader('Accept', 'application/json'),
);

// Base client with common configuration
const baseClient = HttpApiClient.make(Api, {
    baseUrl,
    transformClient: (client) => client.pipe(withJsonAccept),
});

// Auth client - adds bearer token on top of base
const baseAuthClient = HttpApiClient.make(Api, {
    baseUrl,
    transformClient: (client) => {
        const token = authManager.getToken();
        if (token) {
            return client.pipe(
                withJsonAccept,
                HttpClient.mapRequest(HttpClientRequest.bearerToken(token)),
            );
        }
        return client.pipe(withJsonAccept);
    },
});

// CSRF client - adds CSRF token on top of base
const baseCsrfClient = HttpApiClient.make(Api, {
    baseUrl,
    transformClient: (client) => {
        const csrfToken =
            document
                .querySelector('meta[name="csrf-token"]')
                ?.getAttribute('content') || null;
        if (csrfToken) {
            return client.pipe(
                withJsonAccept,
                HttpClient.mapRequest(
                    HttpClientRequest.setHeader('X-CSRF-TOKEN', csrfToken),
                ),
            );
        }
        return client.pipe(withJsonAccept);
    },
});

// Auth + CSRF client - combines both auth and CSRF on top of base
const baseAuthCsrfClient = HttpApiClient.make(Api, {
    baseUrl,
    transformClient: (client) => {
        let transformed = client.pipe(withJsonAccept);

        const token = authManager.getToken();
        if (token) {
            transformed = transformed.pipe(
                HttpClient.mapRequest(HttpClientRequest.bearerToken(token)),
            );
        }
        const csrfToken =
            document
                .querySelector('meta[name="csrf-token"]')
                ?.getAttribute('content') || null;
        if (csrfToken) {
            transformed = transformed.pipe(
                HttpClient.mapRequest(
                    HttpClientRequest.setHeader('X-CSRF-TOKEN', csrfToken),
                ),
            );
        }

        return transformed;
    },
});

/* ============================================================================
 * Client Types (inferred from HttpApiClient.make)
 * ============================================================================
 */
type BaseClientType = Effect.Effect.Success<typeof baseClient>;
type BaseAuthClientType = Effect.Effect.Success<typeof baseAuthClient>;
type BaseCsrfClientType = Effect.Effect.Success<typeof baseCsrfClient>;
type BaseAuthCsrfClientType = Effect.Effect.Success<typeof baseAuthCsrfClient>;

type ErrorsType =
    | HttpApiDecodeError
    | ValidationError
    | CsrfTokenExpiredError
    | HttpClientError
    | ParseError
    | AuthenticationError
    | NotFoundError;

/* ============================================================================
 * Singleton Client
 * ============================================================================
 */
class ApiClientSingleton {
    /* ==========================================================================
     * Memoized Client Instances
     * ========================================================================== */
    private _baseClientPromise: Promise<BaseClientType> | null = null;
    private _baseAuthClientPromise: Promise<BaseAuthClientType> | null = null;
    private _baseCsrfClientPromise: Promise<BaseCsrfClientType> | null = null;
    private _baseAuthCsrfClientPromise: Promise<BaseAuthCsrfClientType> | null =
        null;

    private getBaseClient(): Promise<BaseClientType> {
        if (!this._baseClientPromise) {
            this._baseClientPromise = Effect.runPromise(
                baseClient.pipe(Effect.provide(FetchHttpClient.layer)),
            );
        }
        return this._baseClientPromise;
    }

    private getBaseAuthClient(): Promise<BaseAuthClientType> {
        if (!this._baseAuthClientPromise) {
            this._baseAuthClientPromise = Effect.runPromise(
                baseAuthClient.pipe(Effect.provide(FetchHttpClient.layer)),
            );
        }
        return this._baseAuthClientPromise;
    }

    private getBaseCsrfClient(): Promise<BaseCsrfClientType> {
        if (!this._baseCsrfClientPromise) {
            this._baseCsrfClientPromise = Effect.runPromise(
                baseCsrfClient.pipe(Effect.provide(FetchHttpClient.layer)),
            );
        }
        return this._baseCsrfClientPromise;
    }

    private getBaseAuthCsrfClient(): Promise<BaseAuthCsrfClientType> {
        if (!this._baseAuthCsrfClientPromise) {
            this._baseAuthCsrfClientPromise = Effect.runPromise(
                baseAuthCsrfClient.pipe(Effect.provide(FetchHttpClient.layer)),
            );
        }
        return this._baseAuthCsrfClientPromise;
    }

    private runEffect<A>(
        effect: Effect.Effect<A, ErrorsType>,
        context: string,
    ) {
        return Effect.runPromise(
            effect.pipe(
                Effect.map((data) => ({
                    _tag: 'Success' as const,
                    data,
                })),
                Effect.catchTag('ValidationError', (e) => {
                    return Effect.succeed({
                        _tag: 'ValidationError' as const,
                        message: e.message,
                        errors: e.errors,
                    });
                }),
                Effect.catchTag('CsrfTokenExpiredError', (e) => {
                    return Effect.succeed({
                        _tag: 'CsrfTokenExpiredError' as const,
                        message: 'CSRF token expired',
                    });
                }),
                Effect.catchTag('AuthenticationError', (e) => {
                    return Effect.succeed({
                        _tag: 'AuthenticationError' as const,
                        message: e.message,
                    });
                }),
                Effect.catchTag('NotFoundError', (e) => {
                    return Effect.succeed({
                        _tag: 'NotFoundError' as const,
                        message: e.message,
                    });
                }),
                Effect.catchTag('ParseError', (e) => {
                    console.error(context, e);
                    return Effect.succeed({
                        _tag: 'ParseError' as const,
                        message: e.toString(),
                    });
                }),
                Effect.catchAll((e) => {
                    console.error(e);
                    return Effect.succeed({
                        _tag: 'FatalError' as const,
                        message: e.toString(),
                    });
                }),
                Effect.provide(FetchHttpClient.layer),
            ),
        );
    }

    /**
     * Run an Effect with optional caching for offline support.
     * If a cacheKey is provided:
     * - Online: Fetch fresh data and cache it
     * - Offline: Return cached data if available
     */
    private async runEffectWithCache<A>(
        effect: Effect.Effect<A, ErrorsType>,
        cacheKey: string,
    ) {
        // If offline, try to return cached data
        if (!navigator.onLine) {
            const cached = await apiCache.get<A>(cacheKey);
            if (cached !== undefined) {
                return {
                    _tag: 'Success' as const,
                    data: cached,
                };
            }
            // No cached data available while offline
            return {
                _tag: 'FatalError' as const,
                message: 'You are offline and no cached data is available.',
            };
        }

        // Online: fetch fresh data
        const result = await this.runEffect(effect, cacheKey);

        // Cache successful responses
        if (result._tag === 'Success') {
            await apiCache.set(cacheKey, result.data);
        }

        return result;
    }

    /* ==========================================================================
     * Public API Methods
     * ========================================================================== */
    async login(payload: LoginRequest) {
        // Login needs web middleware (session + CSRF) to create sessions for Filament
        const client = await this.getBaseCsrfClient();
        return this.runEffect(client.auth.login({ payload }), 'login');
    }

    async register(payload: RegisterRequest) {
        // Register needs web middleware (session + CSRF) to create sessions for Filament
        const client = await this.getBaseCsrfClient();
        return this.runEffect(client.auth.register({ payload }), 'register');
    }

    async showUser() {
        const client = await this.getBaseAuthClient();
        return this.runEffect(client.users.show(), 'showUser');
    }

    async logout() {
        // Logout needs web middleware (session + CSRF) to clear Redis sessions for Filament
        const client = await this.getBaseAuthCsrfClient();
        const result = await this.runEffect(client.auth.logout(), 'logout');
        // Clear cached data on logout to prevent data leakage
        await apiCache.clear();
        return result;
    }

    async disconnectGoogle() {
        const client = await this.getBaseAuthClient();
        return this.runEffect(
            client.auth.disconnectGoogle(),
            'disconnectGoogle',
        );
    }

    async showContent() {
        const client = await this.getBaseClient();
        return this.runEffectWithCache(client.content.show(), 'content_list');
    }

    async fetchOAuthToken() {
        const client = await this.getBaseClient();
        return this.runEffect(client.auth.oauthToken(), 'fetchOAuthToken');
    }

    /**
     * Fetch session token from server.
     * Useful for restoring auth state from server session (e.g., after OAuth or in tests with actingAs)
     */
    async fetchSessionToken() {
        const client = await this.getBaseClient();
        return this.runEffect(client.auth.sessionToken(), 'fetchSessionToken');
    }

    /**
     * Initiate Google OAuth login/registration flow
     */
    googleLogin(forceConsent = false) {
        // Include current user ID in the OAuth redirect URL as a query parameter
        // This will be picked up by RedirectToGoogle action
        const user = authManager.getUser();
        const query: Record<string, string> = {};
        if (forceConsent) {
            query.force_consent = '1';
        }
        if (user) {
            query.user_id = user.id;
        }

        const queryString = new URLSearchParams(query).toString();
        window.location.href = `/auth/google${queryString ? `?${queryString}` : ''}`;
    }

    /* ==========================================================================
     * Broadcasting API Methods (Authenticated)
     * ========================================================================== */
    async authenticateBroadcasting(socketId: string, channelName: string) {
        const client = await this.getBaseAuthClient();
        return this.runEffect(
            client.broadcasting.auth({
                payload: { socket_id: socketId, channel_name: channelName },
            }),
            'authenticateBroadcasting',
        );
    }
}

// Export singleton instance
export const ApiClient = new ApiClientSingleton();
