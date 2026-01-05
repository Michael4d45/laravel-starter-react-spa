import * as S from '@effect/schema/Schema';

export const PaginationLinks = S.Struct({
    url: S.Union(S.String, S.Null),
    label: S.String,
    page: S.Union(S.Number, S.Null),
    active: S.Boolean,
});

export const PaginationMeta = S.Struct({
    current_page: S.Number,
    first_page_url: S.String,
    from: S.Union(S.Number, S.Null),
    last_page: S.Number,
    last_page_url: S.String,
    next_page_url: S.Union(S.String, S.Null),
    path: S.String,
    per_page: S.Number,
    prev_page_url: S.Union(S.String, S.Null),
    to: S.Union(S.Number, S.Null),
    total: S.Number,
});

export const LengthAwarePaginator = <A extends S.Schema.Any>(item: A) =>
    S.Struct({
        data: S.Array(item),
        links: S.Array(PaginationLinks),
        meta: PaginationMeta,
    });
