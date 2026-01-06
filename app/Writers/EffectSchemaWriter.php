<?php

declare(strict_types=1);

namespace App\Writers;

use Spatie\TypeScriptTransformer\Structures\TypesCollection;
use Spatie\TypeScriptTransformer\Writers\Writer;

class EffectSchemaWriter implements Writer
{
    public function format(TypesCollection $collection): string
    {
        $content = "import * as S from '@effect/schema/Schema';

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

";

        /** @var \Spatie\TypeScriptTransformer\Structures\TransformedType $type */
        foreach ($collection as $type) {
            if ($type->isInline) {
                continue;
            }

            // For Effect schemas, use the raw transformed content directly
            if (str_contains($type->transformed, 'S.Struct')) {
                $content .= $type->transformed . "\n\n";
            } else {
                $content .= $type->toString() . "\n\n";
            }
        }

        return $content;
    }

    public function replacesSymbolsWithFullyQualifiedIdentifiers(): bool
    {
        return false;
    }
}
