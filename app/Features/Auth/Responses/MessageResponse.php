<?php

declare(strict_types=1);

namespace App\Features\Auth\Responses;

use Spatie\LaravelData\Data;

class MessageResponse extends Data
{
    public function __construct(
        public string $message,
    ) {}
}
