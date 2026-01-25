<?php

declare(strict_types=1);

namespace App\Actions\Auth;

use Illuminate\Http\Request;
use Laravel\Socialite\Facades\Socialite;
use Symfony\Component\HttpFoundation\RedirectResponse;

class RedirectToGoogle
{
    /**
     * Redirect the user to Google OAuth.
     */
    public function __invoke(Request $request): RedirectResponse
    {
        $remember = $request->boolean('remember', false);
        $request->session()->put('auth.google.remember', $remember);

        /** @var \Laravel\Socialite\Two\GoogleProvider $driver */
        $driver = Socialite::driver('google');

        $driver->scopes([
            'openid',
            'profile',
            'email',
        ]);

        return $driver->redirect();
    }
}
