<?php

declare(strict_types=1);

namespace App\Actions\Auth;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Laravel\Socialite\Facades\Socialite;
use Symfony\Component\HttpFoundation\RedirectResponse;

class RedirectToGoogle
{
    /**
     * Redirect the user to Google OAuth.
     */
    public function __invoke(Request $request): RedirectResponse
    {
        /** @var User|null $user */
        $user = $request->user();

        // If no session user, check for user_id in query parameters (from frontend)
        if (!$user instanceof User) {
            $userId = $request->query('user_id');
            if (is_string($userId)) {
                $user = User::find($userId);
            }
        }

        /** @var \Laravel\Socialite\Two\GoogleProvider $driver */
        // @phpstan-ignore method.notFound
        $driver = Socialite::driver('google')->stateless();

        $driver->scopes([
            'openid',
            'profile',
            'email',
        ]);

        // Create signed state to prevent tampering
        // Include timestamp to prevent replay attacks
        $stateData = [
            'user_id' => $user instanceof User ? $user->id : null,
            'timestamp' => now()->timestamp,
        ];
        $stateJson = json_encode($stateData);
        $signedState = Crypt::encryptString(
            $stateJson !== false ? $stateJson : '{}',
        );
        $driver->with(['state' => $signedState]);

        // Force re-consent if requested (useful if email was denied previously)
        if ($request->query('force_consent')) {
            $driver->with(['prompt' => 'consent', 'access_type' => 'offline']);
        }

        return $driver->redirect();
    }
}
