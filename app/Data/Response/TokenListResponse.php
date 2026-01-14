<?php

declare(strict_types=1);

namespace App\Data\Response;

use App\Data\Models\TokenData;
use Illuminate\Support\Collection;
use Spatie\LaravelData\Data;

class TokenListResponse extends Data
{
    public function __construct(
        /** @var Collection<array-key, TokenData> $tokens */
        public Collection $tokens,
    ) {}
}
