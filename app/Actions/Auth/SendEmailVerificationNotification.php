<?php

declare(strict_types=1);

namespace App\Actions\Auth;

use App\Http\Requests\AuthRequest;
use Illuminate\Http\RedirectResponse;

class SendEmailVerificationNotification
{
    /**
     * Send a new email verification notification.
     */
    public function __invoke(AuthRequest $request): RedirectResponse
    {
        $user = $request->assertedUser();

        if ($user->hasVerifiedEmail()) {
            return redirect()->intended(route('home', absolute: false));
        }

        $user->sendEmailVerificationNotification();

        return back()->with('status', 'verification-link-sent');
    }
}
