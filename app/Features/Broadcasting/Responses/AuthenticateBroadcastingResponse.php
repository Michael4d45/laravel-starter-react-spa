<?php

declare(strict_types=1);

namespace App\Features\Broadcasting\Responses;

use Spatie\LaravelData\Data;

class AuthenticateBroadcastingResponse extends Data
{
    public function __construct(
        public string $auth,
        public string|null $channel_data,
    ) {}
}
