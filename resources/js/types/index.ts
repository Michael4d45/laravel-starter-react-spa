export interface PaginationLinks {
    url: string | null;
    label: string;
    page: number | null;
    active: boolean;
}

export interface PaginationMeta {
    current_page: number;
    first_page_url: string;
    from: number | null;
    last_page: number;
    last_page_url: string;
    next_page_url: string | null;
    path: string;
    per_page: number;
    prev_page_url: string | null;
    to: number | null;
    total: number;
}

declare global {
    export interface LengthAwarePaginator<T extends object> {
        data: T[];
        links: PaginationLinks[];
        meta: PaginationMeta;
    }
}
