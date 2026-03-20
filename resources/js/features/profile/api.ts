import { decodeJson, httpRequest, runEffect, withRetry } from '@/lib/apiCore';
import { MessageResponseSchema } from '@/schemas/App/Data/MessageResponse';
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
