<?php

declare(strict_types=1);

namespace App\Features\Auth\Responses;

use App\Data\Models\UserData;
use Spatie\LaravelData\Data;

class DisconnectGoogleResponse extends Data
{
    public function __construct(
        public string $message,
        public UserData $user,
    ) {}
}
