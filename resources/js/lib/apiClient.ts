import { UserDataSchema } from '@/schemas/App/Data/Models';
import {
    AuthenticateBroadcastingRequestSchema,
    LoginRequest,
    LoginRequestSchema,
    RegisterRequest,
    RegisterRequestSchema,
    ResetPasswordRequest,
    ResetPasswordRequestSchema,
} from '@/schemas/App/Data/Requests';
import {
    AuthResponseSchema,
    AuthenticateBroadcastingResponseSchema,
    ContentItemsSchema,
    DisconnectGoogleResponseSchema,
    MessageResponseSchema,
    TokenListResponseSchema,
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

// Intercept fetch to handle token rotation
const originalFetch = window.fetch;
window.fetch = async (...args) => {
    const response = await originalFetch(...args);

    // Check for token rotation header
    const newToken = response.headers.get('X-New-Token');
    if (newToken) {
        console.debug('[Auth] Token rotated, updating stored token');
        authManager.setToken(newToken);
    }

    return response;
};

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

export const TooManyAttemptsErrorSchema = Schema.Struct({
    _tag: Schema.Literal('TooManyAttemptsError'),
    message: Schema.String,
});

export type TooManyAttemptsError = Schema.Schema.Type<
    typeof TooManyAttemptsErrorSchema
>;

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
            MessageResponseSchema,
        ),
    )
    .add(
        HttpApiEndpoint.post(
            'disconnectGoogle',
            '/api/disconnect-google',
        ).addSuccess(DisconnectGoogleResponseSchema),
    )
    .add(
        HttpApiEndpoint.post(
            'sendPasswordResetLink',
            '/api/send-password-reset-link',
        )
            .setPayload(Schema.Struct({ email: Schema.String }))
            .addSuccess(MessageResponseSchema),
    )
    .add(
        HttpApiEndpoint.post('resetPassword', '/api/reset-password')
            .setPayload(ResetPasswordRequestSchema)
            .addSuccess(MessageResponseSchema),
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
    )
    .add(
        HttpApiEndpoint.get('listTokens', '/api/tokens').addSuccess(
            TokenListResponseSchema,
        ),
    )
    .add(
        HttpApiEndpoint.del('deleteToken', '/api/tokens/:tokenId')
            .setPath(Schema.Struct({ tokenId: Schema.String }))
            .addSuccess(MessageResponseSchema),
    )
    .add(
        HttpApiEndpoint.post(
            'resendVerificationEmail',
            '/api/send-email-verification-notification',
        ).addSuccess(MessageResponseSchema),
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
    .addError(NotFoundErrorSchema, { status: 404 })
    .addError(TooManyAttemptsErrorSchema, { status: 429 });

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

/* ============================================================================
 * Client Types (inferred from HttpApiClient.make)
 * ============================================================================
 */
type BaseClientType = Effect.Effect.Success<typeof baseClient>;
type BaseAuthClientType = Effect.Effect.Success<typeof baseAuthClient>;

type ErrorsType =
    | HttpApiDecodeError
    | ValidationError
    | CsrfTokenExpiredError
    | HttpClientError
    | ParseError
    | AuthenticationError
    | NotFoundError
    | TooManyAttemptsError;

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
                Effect.catchTag('TooManyAttemptsError', (e) => {
                    return Effect.succeed({
                        _tag: 'TooManyAttemptsError' as const,
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
        const client = await this.getBaseClient();
        return this.runEffect(client.auth.login({ payload }), 'login');
    }

    async register(payload: RegisterRequest) {
        const client = await this.getBaseClient();
        return this.runEffect(client.auth.register({ payload }), 'register');
    }

    async sendPasswordResetLink(email: string) {
        const client = await this.getBaseClient();
        return this.runEffect(
            client.auth.sendPasswordResetLink({ payload: { email } }),
            'sendPasswordResetLink',
        );
    }

    async resetPassword(payload: ResetPasswordRequest) {
        const client = await this.getBaseClient();
        return this.runEffect(
            client.auth.resetPassword({ payload }),
            'resetPassword',
        );
    }

    async showUser() {
        const client = await this.getBaseAuthClient();
        return this.runEffect(client.users.show(), 'showUser');
    }

    async logout() {
        const client = await this.getBaseAuthClient();
        const result = await this.runEffect(client.auth.logout({}), 'logout');
        // Clear cached data on logout to prevent data leakage
        await apiCache.clear();
        return result;
    }

    async disconnectGoogle() {
        const client = await this.getBaseAuthClient();
        return this.runEffect(
            client.auth.disconnectGoogle({}),
            'disconnectGoogle',
        );
    }

    async showContent() {
        const client = await this.getBaseClient();
        return this.runEffectWithCache(client.content.show(), 'content_list');
    }

    async fetchOAuthToken() {
        const client = await this.getBaseClient();
        return this.runEffect(client.auth.oauthToken({}), 'fetchOAuthToken');
    }

    /**
     * Fetch session token from server.
     * Useful for restoring auth state from server session (e.g., after OAuth or in tests with actingAs)
     */
    async fetchSessionToken() {
        const client = await this.getBaseClient();
        return this.runEffect(
            client.auth.sessionToken({}),
            'fetchSessionToken',
        );
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

    /**
     * List all active sessions (personal access tokens) for the authenticated user
     */
    async listTokens() {
        const client = await this.getBaseAuthClient();
        return this.runEffect(client.auth.listTokens({}), 'listTokens');
    }

    /**
     * Delete a specific token/session
     */
    async deleteToken(tokenId: string) {
        const client = await this.getBaseAuthClient();
        return this.runEffect(
            client.auth.deleteToken({ path: { tokenId } }),
            'deleteToken',
        );
    }

    /**
     * Resend the email verification notification
     */
    async resendVerificationEmail() {
        const client = await this.getBaseAuthClient();
        return this.runEffect(
            client.auth.resendVerificationEmail({}),
            'resendVerificationEmail',
        );
    }
}

// Export singleton instance
export const ApiClient = new ApiClientSingleton();
