<?php

declare(strict_types=1);

namespace App\Data\Models;

use Illuminate\Support\Carbon;
use Spatie\LaravelData\Data;

class UserData extends Data
{
    public function __construct(
        public string $id,
        public string|null $name,
        public string|null $email,
        public string|null $google_id,
        public Carbon|null $email_verified_at,
        public Carbon|null $created_at,
        public Carbon|null $updated_at,
        public bool $is_guest,
        public bool $is_admin,
    ) {}
}
