import { decodeWithValidation, mapApiErrors, mapApiErrorsWithAuth, validatedPost } from '@/lib/actions';
import { ApiClient } from '@/lib/api/client';
import { Effect } from 'effect';

// Import generated schemas and types
import { AuthResponseSchema, LoginRequestSchema, RegisterRequestSchema, UserDataSchema } from '@/lib/schemas/generated-schema';

// Import Wayfinder-generated actions
import CreateToken from '@/actions/App/Actions/Auth/CreateToken';
import Login from '@/actions/App/Actions/Auth/Login';
import Logout from '@/actions/App/Actions/Auth/Logout';
import Register from '@/actions/App/Actions/Auth/Register';
import ShowUser from '@/actions/App/Actions/Auth/ShowUser';

// ============================================================================
// Schema Aliases for semantic clarity
// ============================================================================

// Alias for semantic clarity - same structure as AuthResponseSchema
export const TokenResponseSchema = AuthResponseSchema;

// ============================================================================
// Additional Type Imports (if needed)
// ============================================================================

// ============================================================================
// Auth Actions
// ============================================================================

export const AuthActions = {
    /**
     * Get the current authenticated user
     */
    getUser: Effect.gen(function* () {
        const api = yield* ApiClient;
        const response = yield* mapApiErrorsWithAuth(api.get(ShowUser.url()));
        return yield* decodeWithValidation(UserDataSchema, 'User')(response.data);
    }),

    /**
     * Create a token for the currently authenticated user
     */
    createToken: Effect.gen(function* () {
        const api = yield* ApiClient;
        const response = yield* mapApiErrorsWithAuth(api.get(CreateToken.url()));
        return yield* decodeWithValidation(TokenResponseSchema, 'Token response')(response.data);
    }),

    /**
     * Login with email and password
     */
    login: validatedPost(Login.url(), LoginRequestSchema, AuthResponseSchema, 'Login request', 'Login response'),

    /**
     * Register a new user
     */
    register: validatedPost(Register.url(), RegisterRequestSchema, AuthResponseSchema, 'Register request', 'Register response'),

    /**
     * Logout the current user
     */
    logout: Effect.gen(function* () {
        const api = yield* ApiClient;
        yield* mapApiErrors(api.post(Logout.url()));
        return { success: true };
    }),
};
