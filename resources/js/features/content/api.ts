import { decodeJson, httpRequest, runEffect, withRetry } from '@/lib/apiCore';
import { ContentItemsSchema } from '@/schemas/App/Data/ContentItems';
import { pipe } from 'effect';

export async function showContent() {
    return runEffect(
        pipe(
            httpRequest('/api/content'),
            withRetry('showContent'),
            decodeJson(ContentItemsSchema),
        ),
    );
}
