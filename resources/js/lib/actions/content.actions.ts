import { decodeWithValidation, mapApiErrors } from '@/lib/actions';
import { ApiClient } from '@/lib/api/client';
import { Effect } from 'effect';

// Import generated schemas
import { ContentItemsSchema } from '@/lib/schemas/generated-schema';

// Import Wayfinder-generated actions
import ShowContent from '@/actions/App/Actions/Content/ShowContent';

// ============================================================================
// Content Actions
// ============================================================================

export const ContentActions = {
    /**
     * Get content items
     */
    getContent: Effect.gen(function* () {
        const api = yield* ApiClient;
        const response = yield* mapApiErrors(api.get(ShowContent.url()));
        return yield* decodeWithValidation(ContentItemsSchema, 'Content response')(response.data);
    }),
};
