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

import { authManager } from './auth';

export const ValidationErrorSchema = Schema.Struct({
    _tag: Schema.Literal('ValidationError'),
    errors: Schema.Record({
        key: Schema.String,
        value: Schema.Array(Schema.String),
    }),
});

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
        HttpApiEndpoint.post(
            'register',
            '/api/register',
        )
            .setPayload(RegisterRequestSchema)
            .addSuccess(AuthResponseSchema),
    )
    .add(
        HttpApiEndpoint.post(
            'logout',
            '/api/logout',
        ).addSuccess(Schema.Struct({ message: Schema.String })),
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
    );

const userGroup = HttpApiGroup.make('users').add(
    HttpApiEndpoint.get(
        'show',
        '/api/user',
    ).addSuccess(UserDataSchema),
);

const contentGroup = HttpApiGroup.make('content').add(
    HttpApiEndpoint.get(
        'show',
        '/api/content',
    ).addSuccess(ContentItemsSchema),
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
 * Singleton Client
 * ============================================================================
 */
class ApiClientSingleton {
    /* ==========================================================================
     * Public API Methods
     * ========================================================================== */
    login(payload: LoginRequest) {
        const effect = Effect.gen(function* () {
            const client = yield* baseClient;

            return yield* client.auth.login({ payload }).pipe(
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
                Effect.catchAll((e) => {
                    return Effect.succeed({
                        _tag: 'FatalError' as const,
                        message: JSON.stringify(e),
                    });
                }),
            );
        });
        return Effect.runPromise(
            effect.pipe(Effect.provide(FetchHttpClient.layer)),
        );
    }

    register(payload: RegisterRequest) {
        const effect = Effect.gen(function* () {
            const client = yield* baseClient;

            return yield* client.auth.register({ payload }).pipe(
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
                Effect.catchAll((e) => {
                    return Effect.succeed({
                        _tag: 'FatalError' as const,
                        message: JSON.stringify(e),
                    });
                }),
            );
        });
        return Effect.runPromise(
            effect.pipe(Effect.provide(FetchHttpClient.layer)),
        );
    }

    showUser() {
        const effect = Effect.gen(function* () {
            const client = yield* baseAuthClient;

            return yield* client.users.show().pipe(
                Effect.map((data) => ({
                    _tag: 'Success' as const,
                    data,
                })),
                Effect.catchAll((e) => {
                    return Effect.succeed({
                        _tag: 'FatalError' as const,
                        message: JSON.stringify(e),
                    });
                }),
            );
        });
        return Effect.runPromise(
            effect.pipe(Effect.provide(FetchHttpClient.layer)),
        );
    }

    logout() {
        const effect = Effect.gen(function* () {
            const client = yield* baseAuthClient;

            return yield* client.auth.logout().pipe(
                Effect.map((data) => ({
                    _tag: 'Success' as const,
                    data,
                })),
                Effect.catchAll((e) => {
                    return Effect.succeed({
                        _tag: 'FatalError' as const,
                        message: JSON.stringify(e),
                    });
                }),
            );
        });
        return Effect.runPromise(
            effect.pipe(Effect.provide(FetchHttpClient.layer)),
        );
    }

    disconnectGoogle() {
        const effect = Effect.gen(function* () {
            const client = yield* baseAuthClient;

            return yield* client.auth.disconnectGoogle().pipe(
                Effect.map((data) => ({
                    _tag: 'Success' as const,
                    data,
                })),
                Effect.catchAll((e) => {
                    return Effect.succeed({
                        _tag: 'FatalError' as const,
                        message: JSON.stringify(e),
                    });
                }),
            );
        });
        return Effect.runPromise(
            effect.pipe(Effect.provide(FetchHttpClient.layer)),
        );
    }

    showContent() {
        const effect = Effect.gen(function* () {
            const client = yield* baseClient;

            return yield* client.content.show().pipe(
                Effect.map((data) => ({
                    _tag: 'Success' as const,
                    data,
                })),
                Effect.catchTag('ParseError', (e) => {
                    console.error(e);
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
            );
        });
        return Effect.runPromise(
            effect.pipe(Effect.provide(FetchHttpClient.layer)),
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
}

// Export singleton instance
export const ApiClient = new ApiClientSingleton();
