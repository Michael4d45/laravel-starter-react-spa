<?php

declare(strict_types=1);

namespace App\Actions\Auth;

use Illuminate\Auth\Events\Verified;
use Illuminate\Foundation\Auth\EmailVerificationRequest;
use Illuminate\Http\RedirectResponse;

class VerifyEmail
{
    /**
     * Mark the authenticated user's email address as verified.
     */
    public function __invoke(EmailVerificationRequest $request): RedirectResponse
    {
        $user = $request->user();

        if ($user === null) {
            throw new \Exception('User not in request');
        }

        if ($user->hasVerifiedEmail()) {
            return redirect()->intended(
                route('home', absolute: false) . '?verified=1',
            );
        }

        if ($user->markEmailAsVerified()) {
            event(new Verified($user));
        }

        return redirect()->intended(
            route('home', absolute: false) . '?verified=1',
        );
    }
}
