<?php

declare(strict_types=1);

namespace App\Actions\Auth;

use App\Data\Requests\LoginRequest;
use App\Models\User;
use Illuminate\Auth\Events\Lockout;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;

class Login
{
    /**
     * Handle an incoming authentication request.
     */
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

    public function __invoke(
        LoginRequest $loginData,
        Request $request,
    ): Response {
        $this->authenticate(
            $loginData->email,
            $loginData->password,
            $loginData->remember,
        );

        $user = Auth::user();

        // Return JSON response for API requests
        if ($request->expectsJson()) {
            $token = $user->createToken('api-token')->plainTextToken;

            return response()->json([
                'token' => $token,
                'user' => $user,
            ]);
        }

        // Handle guest user data merging for web requests
        if ($request->hasSession()) {
            $guestUser = $request->user();
            $realUser = $user;

            if (
                $guestUser
                && $guestUser->is_guest
                && $realUser
                && $guestUser->id !== $realUser->id
            ) {
                User::mergeGuestData($guestUser, $realUser);

                // Clear guest user session
                session()->forget('guest_user_id');

                // Re-login as the real user to ensure session is updated
                Auth::logout();
                Auth::login($realUser);
                $request->session()->regenerate();
            } else {
                $request->session()->regenerate();
            }
        }

        // Return redirect for web requests
        if ($request->hasSession()) {
            $intendedUrl = $request->session()->pull('url.intended');
            if (!is_string($intendedUrl)) {
                $intendedUrl = route('home', absolute: false);
            }
        } else {
            $intendedUrl = route('home', absolute: false);
        }

        return redirect()->route($intendedUrl);
    }
}
