import {
    AuthResponseSchema,
    ContentItemsSchema,
    LoginRequest,
    LoginRequestSchema,
    RegisterRequest,
    RegisterRequestSchema,
    UserDataSchema,
} from '@/types/effect-schemas';
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
    errors: Schema.Record({
        key: Schema.String,
        value: Schema.Array(Schema.String),
    }),
});

export type ValidationError = Schema.Schema.Type<typeof ValidationErrorSchema>;

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

export const Api = HttpApi.make('BackendApi')
    .add(authGroup)
    .add(userGroup)
    .add(contentGroup)
    .addError(ValidationErrorSchema, { status: 422 });

/* ============================================================================
 * Form-Friendly Result
 * ============================================================================
 */
const baseUrl = ''; // Empty string to use relative paths

const baseClient = HttpApiClient.make(Api, {
    baseUrl,
});

const baseAuthClient = HttpApiClient.make(Api, {
    baseUrl,
    transformClient: (client) => {
        const token = authManager.getToken();
        if (token) {
            return client.pipe(
                HttpClient.mapRequest(HttpClientRequest.bearerToken(token)),
            );
        }
        return client;
    },
});

/* ============================================================================
 * Client Types (inferred from HttpApiClient.make)
 * ============================================================================
 */
type BaseClientType = Effect.Effect.Success<typeof baseClient>;
type BaseAuthClientType = Effect.Effect.Success<typeof baseAuthClient>;

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

    private runEffect<A>(
        effect: Effect.Effect<
            A,
            HttpApiDecodeError | ValidationError | HttpClientError | ParseError
        >,
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
                        errors: e.errors,
                    });
                }),
                Effect.catchTag('ParseError', (e) => {
                    // Don't log - callers handle the error via tagged union result
                    return Effect.succeed({
                        _tag: 'ParseError' as const,
                        message: JSON.stringify(e),
                    });
                }),
                Effect.catchAll((e) => {
                    return Effect.succeed({
                        _tag: 'FatalError' as const,
                        message: JSON.stringify(e),
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
        effect: Effect.Effect<
            A,
            HttpApiDecodeError | ValidationError | HttpClientError | ParseError
        >,
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
        const result = await this.runEffect(effect);

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
        const client = await this.getBaseClient();
        return this.runEffect(client.auth.login({ payload }));
    }

    async register(payload: RegisterRequest) {
        const client = await this.getBaseClient();
        return this.runEffect(client.auth.register({ payload }));
    }

    async showUser() {
        const client = await this.getBaseAuthClient();
        return this.runEffect(client.users.show());
    }

    async logout() {
        // Get CSRF token from meta tag for session-based logout
        const csrfToken =
            document
                .querySelector('meta[name="csrf-token"]')
                ?.getAttribute('content') || null;

        // Create a client with CSRF token header for logout
        const logoutClient = HttpApiClient.make(Api, {
            baseUrl: '',
            transformClient: (client) => {
                const token = authManager.getToken();
                let transformed = client;
                if (token) {
                    transformed = transformed.pipe(
                        HttpClient.mapRequest(
                            HttpClientRequest.bearerToken(token),
                        ),
                    );
                }
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

        const client = await Effect.runPromise(
            logoutClient.pipe(Effect.provide(FetchHttpClient.layer)),
        );

        const result = await this.runEffect(client.auth.logout());
        // Clear cached data on logout to prevent data leakage
        await apiCache.clear();
        return result;
    }

    async disconnectGoogle() {
        const client = await this.getBaseAuthClient();
        return this.runEffect(client.auth.disconnectGoogle());
    }

    async showContent() {
        const client = await this.getBaseClient();
        return this.runEffectWithCache(client.content.show(), 'content_list');
    }

    /**
     * Fetch OAuth token after successful OAuth callback.
     * Called when user returns from OAuth provider with ?auth=success
     */
    async fetchOAuthToken() {
        const client = await this.getBaseClient();
        return this.runEffect(client.auth.oauthToken());
    }

    /**
     * Fetch session token from server.
     * Useful for restoring auth state from server session (e.g., after OAuth or in tests with actingAs)
     */
    async fetchSessionToken() {
        const client = await this.getBaseClient();
        return this.runEffect(client.auth.sessionToken());
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
}

// Export singleton instance
export const ApiClient = new ApiClientSingleton();
