<?php

declare(strict_types=1);

namespace App\Actions\Auth;

use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Laravel\Socialite\Contracts\User as SocialiteUser;
use Laravel\Socialite\Facades\Socialite;
use Symfony\Component\HttpFoundation\RedirectResponse;

//TODO: account for $user->is_guest.
class HandleGoogleCallback
{
    function __invoke(): RedirectResponse
    {
        /** @var User|null $currentUser */
        $currentUser = Auth::user();
        $wasAuthenticated = $currentUser instanceof User;

        try {
            /** @var \Laravel\Socialite\Two\GoogleProvider $driver */
            $driver = Socialite::driver('google');

            $googleUser = $driver->user();
            $googleId = $googleUser->getId();
            $email = $googleUser->getEmail();

            if (!$email) {
                return $this->rejectMissingEmail($wasAuthenticated);
            }

            // Determine the user
            $user = $this->resolveUser(
                googleId: $googleId,
                email: $email,
                googleUser: $googleUser,
                currentUser: $currentUser,
                wasAuthenticated: $wasAuthenticated,
            );

            if ($user instanceof RedirectResponse) {
                // resolveUser returned an error redirect
                return $user;
            }

            $remember = session()->pull('auth.google.remember', false);
            if (!is_bool($remember)) {
                $remember = false;
            }
            // Log the user in
            Auth::login($user, $remember);

            return redirect(
                ($wasAuthenticated ? '/profile' : '/') . '?auth=success',
            );
        } catch (\Throwable $e) {
            Log::error('Google Error', [
                'error' => $e->getMessage(),
            ]);

            $redirectPath = $wasAuthenticated ? '/profile' : '/login';
            return redirect($redirectPath);
        }
    }

    /**
     * Resolve which user to authenticate based on Google data.
     *
     * @return User|RedirectResponse Returns User on success, RedirectResponse on error
     */
    private function resolveUser(
        string $googleId,
        string $email,
        SocialiteUser $googleUser,
        null|User $currentUser,
        bool $wasAuthenticated,
    ): User|RedirectResponse {
        // Step 1: Check if Google account is already linked to a user
        $googleAccountUser = User::where('google_id', $googleId)->first();

        if ($googleAccountUser instanceof User) {
            // Reject if logged in as different user
            if (
                $wasAuthenticated
                && $currentUser instanceof User
                && $currentUser->id !== $googleAccountUser->id
            ) {
                return $this->rejectGoogleAlreadyLinked();
            }

            return $googleAccountUser;
        }

        // Step 2: Check if email matches existing user
        $emailUser = User::where('email', $email)->first();

        if ($emailUser instanceof User) {
            if (
                $wasAuthenticated
                && $currentUser instanceof User
                && $currentUser->id !== $emailUser->id
            ) {
                return $this->rejectEmailMismatch();
            }

            $name = $googleUser->getName() ?? $emailUser->name;
            $emailUser->update([
                'name' => Str::limit($name, 255),
                'google_id' => $googleId,
                'verified_google_email' => $email,
                'email_verified_at' => $emailUser->email_verified_at ?? now(),
            ]);

            return $emailUser;
        }

        // Step 3: Link to current authenticated user
        if ($wasAuthenticated && $currentUser instanceof User) {
            $emailToUse = $currentUser->email ?? $email;

            $name = $googleUser->getName() ?? $currentUser->name;
            $currentUser->update([
                'name' => Str::limit($name, 255),
                'email' => $emailToUse,
                'google_id' => $googleId,
                'verified_google_email' => $email,
                'email_verified_at' =>
                    $currentUser->email_verified_at
                        ?? ($emailToUse === $email ? now() : null),
            ]);

            return $currentUser;
        }

        // Step 4: Create new user
        $name = $googleUser->getName();
        assert(is_string($name), 'User name must be a string');
        return User::create([
            'name' => Str::limit($name, 255),
            'email' => $email,
            'password' => Hash::make(Str::random(32)),
            'google_id' => $googleId,
            'verified_google_email' => $email,
            'email_verified_at' => now(),
        ]);
    }

    private function rejectMissingEmail(bool $authenticated): RedirectResponse
    {
        $redirectPath = $authenticated ? '/profile' : '/login';
        $message = 'Google did not provide an email address. Please grant email access and try again.';
        return redirect(
            $redirectPath . '?auth=error&message=' . urlencode($message),
        );
    }

    private function rejectGoogleAlreadyLinked(): RedirectResponse
    {
        $message = 'This Google account is already connected to another user.';
        return redirect('/profile?auth=error&message=' . urlencode($message));
    }

    private function rejectEmailMismatch(): RedirectResponse
    {
        $message = 'A user with this email already exists. Please use the same email account.';
        return redirect('/profile?auth=error&message=' . urlencode($message));
    }
}
