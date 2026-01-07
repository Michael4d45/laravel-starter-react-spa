<?php

declare(strict_types=1);

namespace App\Actions\Auth;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Laravel\Socialite\Facades\Socialite;
use Symfony\Component\HttpFoundation\RedirectResponse;

class RedirectToGoogle
{
    /**
     * Redirect the user to Google OAuth.
     */
    public function __invoke(Request $request): RedirectResponse
    {
        $user = $request->user();

        // If no session user, check for user_id in query parameters (from frontend)
        if (!$user) {
            $userId = $request->query('user_id');
            if ($userId) {
                $user = User::find($userId);
            }
        }

        // @phpstan-ignore method.notFound
        $builder = Socialite::driver('google')->stateless()->scopes([
            'openid',
            'profile',
            'email',
        ]);

        // Include current user ID in state to maintain connection context
        $state = $user ? ['user_id' => $user->id] : [];
        $builder->with(['state' => json_encode($state)]);

        // Force re-consent if requested (useful if email was denied previously)
        if ($request->query('force_consent')) {
            $builder->with(['prompt' => 'consent', 'access_type' => 'offline']);
        }

        return $builder->redirect();
    }
}
