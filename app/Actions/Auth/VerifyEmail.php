<?php

declare(strict_types=1);

namespace App\Actions\Auth;

use App\Models\User;
use Illuminate\Auth\Events\Verified;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class VerifyEmail
{
    /**
     * Mark the authenticated user's email address as verified.
     */
    public function __invoke(Request $request): RedirectResponse
    {
        if (!$request->hasValidSignature()) {
            return redirect(
                'profile/verify?verified=0&reason=invalid-signature',
            );
        }

        $user = User::find($request->route('id'));
        if (!$user instanceof User) {
            return redirect('profile/verify?verified=0&reason=user-missing');
        }

        // Match the hash Laravel uses in the notification
        $expected = sha1($user->getEmailForVerification());
        if (!hash_equals($expected, (string) $request->route('hash'))) {
            return redirect('profile/verify?verified=0&reason=hash-mismatch');
        }

        if (!$user->hasVerifiedEmail()) {
            $user->markEmailAsVerified();
            event(new Verified($user));
        }

        return redirect()->intended(
            route('home', absolute: false) . '?verified=1',
        );
    }
}
