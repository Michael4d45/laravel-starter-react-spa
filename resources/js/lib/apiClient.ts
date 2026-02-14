import {
    UserDataSchema,
} from '@/schemas/App/Data/Models';
import {
    AuthenticateBroadcastingRequest,
    AuthenticateBroadcastingRequestSchema,
    LoginRequest,
    LoginRequestSchema,
    RegisterRequest,
    RegisterRequestSchema,
    ResetPasswordRequest,
    ResetPasswordRequestSchema,
} from '@/schemas/App/Data/Requests';
import {
    AuthenticateBroadcastingResponseSchema,
    ContentItemsSchema,
    DisconnectGoogleResponseSchema,
    MessageResponseSchema,
} from '@/schemas/App/Data/Response';
import { Effect, pipe, Schema } from 'effect';
import { apiCache } from './apiCache';
import {
    clearCsrfToken,
    decodeJson,
    ensureCsrfToken,
    httpRequest,
    runEffect,
    sendWithPayload,
    withRetry,
} from './apiCore';

/* ==========================================================================
 * Auth Methods
 * ========================================================================== */

export async function login(payload: LoginRequest) {
    return runEffect(
        pipe(
            payload,
            Schema.encodeUnknown(LoginRequestSchema),
            sendWithPayload('/login'),
            withRetry('login'),
            decodeJson(MessageResponseSchema),
            Effect.tap(ensureCsrfToken),
        ),
    );
}

export async function register(payload: RegisterRequest) {
    return runEffect(
        pipe(
            payload,
            Schema.encodeUnknown(RegisterRequestSchema),
            sendWithPayload('/register'),
            withRetry('register'),
            decodeJson(MessageResponseSchema),
            Effect.tap(ensureCsrfToken),
        ),
    );
}

export async function logout() {
    return runEffect(
        pipe(
            httpRequest('/logout', { method: 'POST' }),
            decodeJson(MessageResponseSchema),
            Effect.tap(() =>
                Effect.sync(() => {
                    apiCache.clear();
                    clearCsrfToken();
                }),
            ),
        ),
    );
}

export async function sendPasswordResetLink(email: string) {
    return runEffect(
        pipe(
            httpRequest('/api/send-password-reset-link', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            }),
            withRetry('sendPasswordResetLink'),
            decodeJson(MessageResponseSchema),
        ),
    );
}

export async function resetPassword(payload: ResetPasswordRequest) {
    return runEffect(
        pipe(
            payload,
            Schema.encodeUnknown(ResetPasswordRequestSchema),
            sendWithPayload('/api/reset-password'),
            withRetry('resetPassword'),
            decodeJson(MessageResponseSchema),
        ),
    );
}

export async function resendVerificationEmail() {
    return runEffect(
        pipe(
            httpRequest('/api/send-email-verification-notification', {
                method: 'POST',
            }),
            withRetry('resendVerificationEmail'),
            decodeJson(MessageResponseSchema),
        ),
    );
}

export async function disconnectGoogle() {
    return runEffect(
        pipe(
            httpRequest('/api/disconnect-google', { method: 'POST' }),
            withRetry('disconnectGoogle'),
            decodeJson(DisconnectGoogleResponseSchema),
        ),
    );
}

/* ==========================================================================
 * User Methods
 * ========================================================================== */

export async function showUser() {
    return runEffect(
        pipe(
            httpRequest('/api/user'),
            withRetry('showUser'),
            decodeJson(UserDataSchema),
        ),
    );
}

/* ==========================================================================
 * Content Methods
 * ========================================================================== */

export async function showContent() {
    return runEffect(
        pipe(
            httpRequest('/api/content'),
            withRetry('showContent'),
            decodeJson(ContentItemsSchema),
        ),
    );
}

/* ==========================================================================
 * Broadcasting Methods
 * ========================================================================== */

export async function authenticateBroadcasting(
    payload: AuthenticateBroadcastingRequest,
) {
    return runEffect(
        pipe(
            payload,
            Schema.encodeUnknown(AuthenticateBroadcastingRequestSchema),
            sendWithPayload('/api/broadcasting/auth'),
            withRetry('authenticateBroadcasting'),
            decodeJson(AuthenticateBroadcastingResponseSchema),
        ),
    );
}
