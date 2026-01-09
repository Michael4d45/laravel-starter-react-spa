<?php

declare(strict_types=1);

namespace App\Actions\Auth;

use App\Data\Requests\LoginRequest;
use App\Data\Response\AuthResponse;
use Illuminate\Auth\Events\Lockout;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;

class Login
{
    /**
     * Attempt to authenticate the request's credentials.
     *
     * @throws ValidationException
     */
    private function authenticate(
        string $email,
        string $password,
        bool $remember,
    ): void {
        $this->ensureIsNotRateLimited($email);

        if (!Auth::attempt([
            'email' => $email,
            'password' => $password,
        ], $remember)) {
            RateLimiter::hit($this->throttleKey($email));
            throw ValidationException::withMessages([
                'email' => trans('auth.failed'),
            ]);
        }
    }

    /**
     * Ensure the login request is not rate limited.
     *
     * @throws ValidationException
     */
    private function ensureIsNotRateLimited(string $email): void
    {
        if (!RateLimiter::tooManyAttempts($this->throttleKey($email), 5)) {
            return;
        }

        event(new Lockout(request()));

        $seconds = RateLimiter::availableIn($this->throttleKey($email));

        throw ValidationException::withMessages([
            'email' => trans('auth.throttle', [
                'seconds' => $seconds,
                'minutes' => ceil($seconds / 60),
            ]),
        ]);
    }

    /**
     * Get the rate limiting throttle key for the request.
     */
    private function throttleKey(string $email): string
    {
        return Str::transliterate(Str::lower($email) . '|' . request()->ip());
    }

    public function __invoke(LoginRequest $loginData): Response
    {
        $this->authenticate(
            $loginData->email,
            $loginData->password,
            $loginData->remember,
        );

        $user = Auth::user();

        $token = $user?->createToken('api-token')->plainTextToken;

        // Regenerate session ID to prevent session fixation attacks
        session()->regenerate(true);

        // Regenerate CSRF token for security
        session()->regenerateToken();

        return response()->json(AuthResponse::from([
            'token' => $token,
            'user' => $user,
        ]));
    }
}
