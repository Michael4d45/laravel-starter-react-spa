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
        // @phpstan-ignore method.notFound
        $builder = Socialite::driver('google')->scopes([
            'openid',
            'profile',
            'email',
        ]);

        // Force re-consent if requested (useful if email was denied previously)
        if ($request->query('force_consent')) {
            $builder->with(['prompt' => 'consent', 'access_type' => 'offline']);
        }

        return $builder->redirect();
    }
}
