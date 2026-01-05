import ShowContent from '@/actions/App/Actions/Content/ShowContent';

import { api } from '@/lib/api/client';

interface ContentItem {
    id: number;
    title: string;
    body: string;
}

export interface ContentResponse {
    content: ContentItem[];
}

export async function contentLoader(): Promise<ContentResponse> {
    const response = await api.get<ContentResponse>(ShowContent.url());
    return response.data || { content: [] }; // always return an object
}
