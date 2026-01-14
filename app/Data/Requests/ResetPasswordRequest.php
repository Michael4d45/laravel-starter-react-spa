<?php

declare(strict_types=1);

namespace App\Data\Requests;

use Spatie\LaravelData\Attributes\Validation\Confirmed;
use Spatie\LaravelData\Attributes\Validation\Email;
use Spatie\LaravelData\Attributes\Validation\Password;
use Spatie\LaravelData\Attributes\Validation\Required;
use Spatie\LaravelData\Attributes\Validation\StringType;
use Spatie\LaravelData\Data;

class ResetPasswordRequest extends Data
{
    public function __construct(
        #[Required]
        #[StringType]
        public string $token,

        #[Required]
        #[Email]
        public string $email,

        #[Required]
        #[StringType]
        #[Confirmed]
        #[Password]
        public string $password,

        #[Required]
        #[StringType]
        public string $password_confirmation,
    ) {}
}
