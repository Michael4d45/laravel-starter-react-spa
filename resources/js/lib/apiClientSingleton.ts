import {
    AuthResponseSchema,
    ContentDataSchema,
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

// Actions
import Login from '@/actions/App/Actions/Auth/Login';
import Register from '@/actions/App/Actions/Auth/Register';
import ShowUser from '@/actions/App/Actions/Auth/ShowUser';
import ShowContent from '@/actions/App/Actions/Content/ShowContent';
import { authManager } from './auth';

export const ValidationErrorSchema = Schema.Struct({
    _tag: Schema.Literal('ValidationError'),
    errors: Schema.Record({
        key: Schema.String,
        value: Schema.Array(Schema.String),
    }),
})

/* ============================================================================
 * API Definition
 * ============================================================================
 */

const authGroup = HttpApiGroup.make('auth')
    .add(
        HttpApiEndpoint.post('login', Login.definition.url as `/${string}`)
            .setPayload(LoginRequestSchema)
            .addSuccess(AuthResponseSchema),
    )
    .add(
        HttpApiEndpoint.post(
            'register',
            Register.definition.url as `/${string}`,
        )
            .setPayload(RegisterRequestSchema)
            .addSuccess(AuthResponseSchema),
    );

const userGroup = HttpApiGroup.make('users').add(
    HttpApiEndpoint.get(
        'show',
        ShowUser.definition.url as `/${string}`,
    ).addSuccess(UserDataSchema),
);

const contentGroup = HttpApiGroup.make('content').add(
    HttpApiEndpoint.get(
        'show',
        ShowContent.definition.url as `/${string}`,
    ).addSuccess(ContentDataSchema),
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
const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

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
                Effect.catchTag("ValidationError", (e) => {
                    return Effect.succeed({
                        _tag: 'ValidationError' as const,
                        errors: e.errors,
                    });
                }),
                Effect.catchAll((e) => {
                    return Effect.succeed({
                        _tag: 'FatalError' as const,
                        message: JSON.stringify(e),
                    })
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
                Effect.catchTag("ValidationError", (e) => {
                    return Effect.succeed({
                        _tag: 'ValidationError' as const,
                        errors: e.errors,
                    });
                }),
                Effect.catchAll((e) => {
                    return Effect.succeed({
                        _tag: 'FatalError' as const,
                        message: JSON.stringify(e),
                    })
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
                    })
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
                Effect.catchAll((e) => {
                    return Effect.succeed({
                        _tag: 'FatalError' as const,
                        message: JSON.stringify(e),
                    })
                }),
            );
        });
        return Effect.runPromise(
            effect.pipe(Effect.provide(FetchHttpClient.layer)),
        );
    }
}

// Export singleton instance
export const ApiClient = new ApiClientSingleton();
