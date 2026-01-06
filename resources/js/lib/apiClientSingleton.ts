import {
    AuthResponseSchema,
    ContentDataSchema,
    LoginRequestSchema,
    RegisterRequestSchema,
    UserDataSchema,
} from '@/types/effect-schemas';
import {
    FetchHttpClient,
    HttpApi,
    HttpApiClient,
    HttpApiEndpoint,
    HttpApiError,
    HttpApiGroup,
    HttpApiMiddleware,
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

/* ============================================================================
 * Errors
 * ============================================================================
 */
export class ValidationError extends Schema.TaggedError<ValidationError>()(
    'ValidationError',
    {
        message: Schema.String,
        errors: Schema.Record({
            key: Schema.String,
            value: Schema.Array(Schema.String),
        }),
    },
) {}

class LoggerError extends Schema.TaggedError<LoggerError>()(
    'LoggerError',
    {},
) {}

class Logger extends HttpApiMiddleware.Tag<Logger>()('Http/Logger', {
    failure: LoggerError,
}) {}

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
    .middleware(Logger)
    .addError(ValidationError, { status: 422 })
    .addError(HttpApiError.Unauthorized)
    .addError(HttpApiError.NotFound);

/* ============================================================================
 * Form-Friendly Result
 * ============================================================================
 */
export type FormResult<A> =
    | { _tag: 'Success'; data: A }
    | { _tag: 'ValidationError'; errors: Record<string, readonly string[]> }
    | { _tag: 'FatalError'; message: string };

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
    login(payload: Schema.Schema.Type<typeof LoginRequestSchema>) {
        console.log(payload);
        const effect = Effect.gen(function* () {
            const client = yield* baseClient;

            return yield* client.auth.login({ payload }).pipe(
                Effect.map((data) => ({
                    _tag: 'Success' as const,
                    data,
                })),
                Effect.catchTag('ValidationError', (e) =>
                    Effect.succeed({
                        _tag: 'ValidationError' as const,
                        errors: e.errors,
                    }),
                ),
                Effect.catchAll((e) =>
                    Effect.succeed({
                        _tag: 'FatalError' as const,
                        message: 'Something went wrong',
                    }),
                ),
            );
        });
        return Effect.runPromise(
            effect.pipe(Effect.provide(FetchHttpClient.layer)),
        );
    }

    register(payload: Schema.Schema.Type<typeof RegisterRequestSchema>) {
        const effect = Effect.gen(function* () {
            const client = yield* baseClient;
            return yield* client.auth.register({ payload }).pipe(
                Effect.map((data) => ({
                    _tag: 'Success' as const,
                    data,
                })),
                Effect.catchTag('ValidationError', (e) =>
                    Effect.succeed({
                        _tag: 'ValidationError' as const,
                        errors: e.errors,
                    }),
                ),
                Effect.catchAll((e) =>
                    Effect.succeed({
                        _tag: 'FatalError' as const,
                        message: 'Something went wrong',
                    }),
                ),
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
                Effect.catchTag('ValidationError', (e) =>
                    Effect.succeed({
                        _tag: 'ValidationError' as const,
                        errors: e.errors,
                    }),
                ),
                Effect.catchAll((e) =>
                    Effect.succeed({
                        _tag: 'FatalError' as const,
                        message: 'Something went wrong',
                    }),
                ),
            );
        });
        return Effect.runPromise(
            effect.pipe(Effect.provide(FetchHttpClient.layer)),
        );
    }

    showContent() {
        const effect = Effect.gen(function* () {
            const client = yield* baseAuthClient;
            return yield* client.content.show().pipe(
                Effect.map((data) => ({
                    _tag: 'Success' as const,
                    data,
                })),
                Effect.catchTag('ValidationError', (e) =>
                    Effect.succeed({
                        _tag: 'ValidationError' as const,
                        errors: e.errors,
                    }),
                ),
                Effect.catchAll((e) =>
                    Effect.succeed({
                        _tag: 'FatalError' as const,
                        message: 'Something went wrong',
                    }),
                ),
            );
        });
        return Effect.runPromise(
            effect.pipe(Effect.provide(FetchHttpClient.layer)),
        );
    }
}

// Export singleton instance
export const ApiClient = new ApiClientSingleton();

// const result = await ApiClient.login({
//     email: "test@test.com",
//     password: "test",
//     remember: false
// })

// console.log(result)
