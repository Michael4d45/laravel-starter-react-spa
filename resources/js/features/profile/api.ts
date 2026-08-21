import { decodeJson, httpRequest, runEffect, withRetry } from '@/lib/apiCore';
import { MessageResponseSchema } from '@/schemas/App/Features/Auth/Responses/MessageResponse';
import { pipe } from 'effect';

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
