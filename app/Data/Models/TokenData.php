<?php

declare(strict_types=1);

namespace App\Data\Models;

use Illuminate\Support\Carbon;
use Spatie\LaravelData\Data;

class TokenData extends Data
{
    public function __construct(
        public string $id,
        public string $name,
        public Carbon|null $created_at,
        public Carbon|null $last_used_at,
        public Carbon|null $expires_at,
        public bool $is_current,
    ) {}
}
