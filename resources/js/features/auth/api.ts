import { apiCache } from '@/lib/apiCache';
import {
    clearCsrfToken,
    decodeJson,
    ensureCsrfToken,
    httpRequest,
    runEffect,
    sendWithPayload,
    withRetry,
} from '@/lib/apiCore';
import { UserDataSchema } from '@/schemas/App/Data/Models/UserData';
import {
    LoginRequest,
    LoginRequestSchema,
} from '@/schemas/App/Features/Auth/Requests/LoginRequest';
import {
    RegisterRequest,
    RegisterRequestSchema,
} from '@/schemas/App/Features/Auth/Requests/RegisterRequest';
import {
    ResetPasswordRequest,
    ResetPasswordRequestSchema,
} from '@/schemas/App/Features/Auth/Requests/ResetPasswordRequest';
import { DisconnectGoogleResponseSchema } from '@/schemas/App/Features/Auth/Responses/DisconnectGoogleResponse';
import { MessageResponseSchema } from '@/schemas/App/Features/Auth/Responses/MessageResponse';
import { Effect, pipe, Schema } from 'effect';

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

export async function showUser() {
    return runEffect(
        pipe(
            httpRequest('/api/user'),
            withRetry('showUser'),
            decodeJson(UserDataSchema),
        ),
    );
}
