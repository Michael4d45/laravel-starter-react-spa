<?php

declare(strict_types=1);

namespace App\Actions\Auth;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Laravel\Socialite\Contracts\User as SocialiteUser;
use Laravel\Socialite\Facades\Socialite;
use Symfony\Component\HttpFoundation\RedirectResponse;

class HandleGoogleCallback
{
    public function __invoke(Request $request): RedirectResponse
    {
        $wasAuthenticated = Auth::check();
        $currentUser = Auth::user();
        $isGuest = $currentUser instanceof User && $currentUser->is_guest;

        try {
            /** @var SocialiteUser $googleUser */
            $googleUser = Socialite::driver('google')->user();

            $googleId = $googleUser->getId();
            $email = $googleUser->getEmail();

            if (!$email) {
                return $this->rejectMissingEmail($wasAuthenticated);
            }

            /** ---------------------------------------------
             * Step 1: Resolve by Google ID (authoritative)
             * --------------------------------------------- */
            $googleAccountUser = User::where('google_id', $googleId)->first();

            if ($googleAccountUser) {
                // Logged in as someone else → reject
                if (
                    $wasAuthenticated
                    && !$isGuest
                    && $currentUser?->id !== $googleAccountUser->id
                ) {
                    return $this->rejectGoogleAlreadyLinked();
                }

                // Guest upgrading into existing Google account
                if ($isGuest && $currentUser->id !== $googleAccountUser->id) {
                    User::mergeGuestData($currentUser, $googleAccountUser);
                }

                Auth::login($googleAccountUser);

                return redirect()->intended(route('home'));
            }

            /** ---------------------------------------------
             * Step 2: Resolve by email (secondary)
             * --------------------------------------------- */
            $emailUser = User::where('email', $email)->first();

            if ($emailUser) {
                // Logged in as different non-guest → reject
                if (
                    $wasAuthenticated
                    && !$isGuest
                    && $currentUser?->id !== $emailUser->id
                ) {
                    return $this->rejectEmailMismatch();
                }

                // Merge guest into existing email user
                if ($isGuest && $currentUser->id !== $emailUser->id) {
                    User::mergeGuestData($currentUser, $emailUser);
                }

                $emailUser->update([
                    'name' => $googleUser->getName() ?? $emailUser->name,
                    'google_id' => $googleId,
                    'email_verified_at' =>
                        $emailUser->email_verified_at ?? now(),
                    'is_guest' => false,
                ]);

                Auth::login($emailUser);

                return redirect()->intended(route('home'));
            }

            /** ---------------------------------------------
             * Step 3: Attach to current user or create new
             * --------------------------------------------- */
            if ($wasAuthenticated) {
                $currentUser?->update([
                    'name' => $currentUser->name ?? $googleUser->getName(),
                    'email' => $currentUser->email ?? $email,
                    'google_id' => $googleId,
                    'email_verified_at' =>
                        $currentUser->email_verified_at ?? now(),
                    'is_guest' => false,
                ]);

                return redirect()
                    ->route('profile')
                    ->with('success', 'Google account connected successfully!');
            }

            $user = User::create([
                'name' => $googleUser->getName(),
                'email' => $email,
                'password' => Hash::make(Str::random(32)),
                'google_id' => $googleId,
                'email_verified_at' => now(),
                'is_guest' => false,
            ]);

            Auth::login($user);

            return redirect()->intended(route('home'));
        } catch (\Throwable $e) {
            return redirect()
                ->route($wasAuthenticated ? 'profile' : 'login')
                ->with('error', 'Google authentication failed.');
        }
    }

    private function rejectMissingEmail(bool $authenticated): RedirectResponse
    {
        return redirect()
            ->route($authenticated ? 'profile' : 'login')
            ->with(
                'error',
                'Google did not provide an email address. Please grant email access and try again.',
            )
            ->with('reconnect_url', route('auth.google', [
                'force_consent' => 1,
            ]));
    }

    private function rejectGoogleAlreadyLinked(): RedirectResponse
    {
        return redirect()
            ->route('profile')
            ->with(
                'error',
                'This Google account is already connected to another user.',
            );
    }

    private function rejectEmailMismatch(): RedirectResponse
    {
        return redirect()
            ->route('profile')
            ->with(
                'error',
                'A user with this email already exists. Please use the same email account.',
            );
    }
}
