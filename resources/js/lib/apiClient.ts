import { UserDataSchema } from '@/schemas/App/Data/Models';
import {
    LoginRequest,
    RegisterRequest,
    ResetPasswordRequest,
} from '@/schemas/App/Data/Requests';
import {
    AuthenticateBroadcastingResponseSchema,
    ContentItemsSchema,
    DisconnectGoogleResponseSchema,
    MessageResponseSchema,
} from '@/schemas/App/Data/Response';
import { Effect, pipe } from 'effect';
import { apiCache } from './apiCache';
import {
    ensureCsrfToken,
    httpRequest,
    runEffect,
    withCache,
    withRetry,
} from './apiCore';

/* ============================================================================
 * API Client Singleton
 * ============================================================================ */

class ApiClientSingleton {
    private csrfInitialized = false;

    private async ensureCsrf(): Promise<void> {
        if (!this.csrfInitialized) {
            await Effect.runPromise(ensureCsrfToken);
            this.csrfInitialized = true;
        }
    }

    /* ==========================================================================
     * Content
     * ========================================================================= */

    async showContent() {
        const effect = pipe(
            httpRequest(
                `/api/content`,
                {
                    method: 'GET',
                },
                ContentItemsSchema,
            ),
            (eff) => withRetry(eff, 'getContent'),
            (eff) => withCache(eff, `content`),
        );

        return runEffect(effect, 'getContent');
    }

    /* ==========================================================================
     * Auth Methods
     * ========================================================================== */

    async login(payload: LoginRequest) {
        await this.ensureCsrf();

        const effect = pipe(
            httpRequest(
                '/login',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                },
                MessageResponseSchema,
            ),
            (eff) => withRetry(eff, 'login'),
        );

        return runEffect(effect, 'login');
    }

    async register(payload: RegisterRequest) {
        await this.ensureCsrf();

        const effect = pipe(
            httpRequest(
                '/register',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                },
                MessageResponseSchema,
            ),
            (eff) => withRetry(eff, 'register'),
        );

        return runEffect(effect, 'register');
    }

    async logout() {
        const effect = pipe(
            httpRequest(
                '/api/logout',
                {
                    method: 'POST',
                },
                MessageResponseSchema,
            ),
            Effect.tap(() => Effect.promise(() => apiCache.clear())),
        );

        return runEffect(effect, 'logout');
    }

    async sendPasswordResetLink(email: string) {
        await this.ensureCsrf();

        const effect = pipe(
            httpRequest(
                '/api/send-password-reset-link',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email }),
                },
                MessageResponseSchema,
            ),
            (eff) => withRetry(eff, 'sendPasswordResetLink'),
        );

        return runEffect(effect, 'sendPasswordResetLink');
    }

    async resetPassword(payload: ResetPasswordRequest) {
        await this.ensureCsrf();

        const effect = pipe(
            httpRequest(
                '/api/reset-password',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                },
                MessageResponseSchema,
            ),
            (eff) => withRetry(eff, 'resetPassword'),
        );

        return runEffect(effect, 'resetPassword');
    }

    async resendVerificationEmail() {
        const effect = pipe(
            httpRequest(
                '/api/send-email-verification-notification',
                {
                    method: 'POST',
                },
                MessageResponseSchema,
            ),
            (eff) => withRetry(eff, 'resendVerificationEmail'),
        );

        return runEffect(effect, 'resendVerificationEmail');
    }

    async disconnectGoogle() {
        const effect = pipe(
            httpRequest(
                '/api/disconnect-google',
                {
                    method: 'POST',
                },
                DisconnectGoogleResponseSchema,
            ),
            (eff) => withRetry(eff, 'disconnectGoogle'),
        );

        return runEffect(effect, 'disconnectGoogle');
    }

    /* ==========================================================================
     * User Methods
     * ========================================================================== */

    async showUser() {
        const effect = pipe(
            httpRequest(
                '/api/user',
                {
                    method: 'GET',
                },
                UserDataSchema,
            ),
            (eff) => withRetry(eff, 'showUser'),
        );

        return runEffect(effect, 'showUser');
    }

    /* ==========================================================================
     * Broadcasting Methods
     * ========================================================================== */

    async authenticateBroadcasting(socketId: string, channelName: string) {
        const effect = pipe(
            httpRequest(
                '/api/broadcasting/auth',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        socket_id: socketId,
                        channel_name: channelName,
                    }),
                },
                AuthenticateBroadcastingResponseSchema,
            ),
            (eff) => withRetry(eff, 'authenticateBroadcasting'),
        );

        return runEffect(effect, 'authenticateBroadcasting');
    }
}

export const ApiClient = new ApiClientSingleton();
