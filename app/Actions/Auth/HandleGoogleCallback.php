<?php

declare(strict_types=1);

namespace App\Actions\Auth;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Laravel\Socialite\Contracts\User as SocialiteUser;
use Laravel\Socialite\Facades\Socialite;
use Symfony\Component\HttpFoundation\RedirectResponse;

class HandleGoogleCallback
{
    private const STATE_MAX_AGE_SECONDS = 600; // 10 minutes

    public function __invoke(Request $request): RedirectResponse
    {
        $wasAuthenticated = Auth::check();

        /** @var User|null $currentUser */
        $currentUser = Auth::user();
        $isGuest = $currentUser instanceof User && $currentUser->is_guest;

        /** @var User|null $intendedUser */
        $intendedUser = null;

        // Decrypt and validate the signed state parameter
        $state = $request->query('state');
        if (is_string($state)) {
            try {
                $decryptedState = Crypt::decryptString($state);
                $stateData = json_decode($decryptedState, true);

                // Validate state timestamp to prevent replay attacks
                if (is_array($stateData)) {
                    $timestamp = isset($stateData['timestamp'])
                    && is_int($stateData['timestamp'])
                        ? $stateData['timestamp']
                        : 0;
                    $userId = $stateData['user_id'] ?? null;
                    $currentTimestamp = (int) now()->timestamp;

                    if (
                        ($currentTimestamp - $timestamp)
                        < self::STATE_MAX_AGE_SECONDS
                    ) {
                        if (is_string($userId)) {
                            $intendedUser = User::find($userId);
                        }
                    } else {
                        Log::warning('OAuth state expired or invalid', [
                            'timestamp' => $timestamp,
                            'now' => now()->timestamp,
                        ]);
                    }
                }
            } catch (\Throwable $e) {
                Log::warning('Failed to decrypt OAuth state', [
                    'error' => $e->getMessage(),
                ]);

                // Continue without intended user - this is not fatal
            }
        }

        try {
            /** @var \Laravel\Socialite\Two\GoogleProvider $driver */
            // @phpstan-ignore method.notFound
            $driver = Socialite::driver('google')->stateless();

            /** @var SocialiteUser $googleUser */
            $googleUser = $driver->user();

            /** @var string $googleId */
            $googleId = $googleUser->getId();
            /** @var string|null $email */
            $email = $googleUser->getEmail();

            if (!$email) {
                return $this->rejectMissingEmail($wasAuthenticated);
            }

            // Determine the user and redirect path
            $user = $this->resolveUser(
                googleId: $googleId,
                email: $email,
                googleUser: $googleUser,
                intendedUser: $intendedUser,
                currentUser: $currentUser,
                wasAuthenticated: $wasAuthenticated,
                isGuest: $isGuest,
            );

            if ($user instanceof RedirectResponse) {
                // resolveUser returned an error redirect
                return $user;
            }

            // Login and create token
            Auth::login($user);
            $token = $user->createToken('oauth-token')->plainTextToken;

            // Store token and user in session for secure retrieval
            session()->put('oauth_token', $token);
            session()->put('oauth_user', $user->toArray());

            Log::info('HandleGoogleCallback: OAuth successful', [
                'user_id' => $user->id,
                'was_link' => $intendedUser !== null,
            ]);

            // Redirect without sensitive data in URL
            $redirectPath = $intendedUser !== null ? '/profile' : '/';
            $authStatus = $intendedUser !== null ? 'connected' : 'success';

            return redirect($redirectPath . '?auth=' . $authStatus);
        } catch (\Throwable $e) {
            $errorUserId = match (true) {
                $currentUser instanceof User => $currentUser->id,
                $intendedUser instanceof User => $intendedUser->id,
                default => null,
            };

            Log::error('Google OAuth Error', [
                'error' => $e->getMessage(),
                'user_id' => $errorUserId,
            ]);

            $redirectPath = $wasAuthenticated ? '/profile' : '/login';
            return redirect(
                $redirectPath . '?auth=error&message='
                    . urlencode(
                        'Google authentication failed. Please try again.',
                    ),
            );
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
        null|User $intendedUser,
        null|User $currentUser,
        bool $wasAuthenticated,
        bool $isGuest,
    ): User|RedirectResponse {
        // Step 1: Check if Google account is already linked to a user
        $googleAccountUser = User::where('google_id', $googleId)->first();

        if ($googleAccountUser instanceof User) {
            // Handle account transfer if intended user differs
            if (
                $intendedUser instanceof User
                && $intendedUser->id !== $googleAccountUser->id
            ) {
                return $this->transferGoogleAccount(
                    $googleAccountUser,
                    $intendedUser,
                    $googleId,
                    $email,
                    $googleUser,
                );
            }

            // Reject if logged in as different non-guest user
            if (
                $wasAuthenticated
                && !$isGuest
                && $currentUser instanceof User
                && $currentUser->id !== $googleAccountUser->id
                && (
                    !$intendedUser instanceof User
                    || $intendedUser->id !== $googleAccountUser->id
                )
            ) {
                return $this->rejectGoogleAlreadyLinked();
            }

            // Merge guest data if upgrading
            if (
                $isGuest
                && $currentUser instanceof User
                && $currentUser->id !== $googleAccountUser->id
            ) {
                User::mergeGuestData($currentUser, $googleAccountUser);
            }

            return $googleAccountUser;
        }

        // Step 2: Link Google to intended user (from state)
        if ($intendedUser instanceof User) {
            if (
                $intendedUser->google_id
                && $intendedUser->google_id !== $googleId
            ) {
                return $this->rejectGoogleAlreadyLinked();
            }

            $intendedUser->update([
                'name' => $googleUser->getName() ?? $intendedUser->name,
                'email' => $email,
                'google_id' => $googleId,
                'email_verified_at' =>
                    $intendedUser->email_verified_at ?? now(),
                'is_guest' => false,
            ]);

            return $intendedUser;
        }

        // Step 3: Check if email matches existing user
        $emailUser = User::where('email', $email)->first();

        if ($emailUser instanceof User) {
            if (
                $wasAuthenticated
                && !$isGuest
                && $currentUser instanceof User
                && $currentUser->id !== $emailUser->id
            ) {
                return $this->rejectEmailMismatch();
            }

            if (
                $wasAuthenticated
                && $isGuest
                && $currentUser instanceof User
                && $currentUser->id !== $emailUser->id
            ) {
                User::mergeGuestData($currentUser, $emailUser);
            }

            $emailUser->update([
                'name' => $googleUser->getName() ?? $emailUser->name,
                'google_id' => $googleId,
                'email_verified_at' => $emailUser->email_verified_at ?? now(),
                'is_guest' => false,
            ]);

            return $emailUser;
        }

        // Step 4: Link to current authenticated user
        if ($wasAuthenticated && $currentUser instanceof User) {
            $currentUser->update([
                'name' => $currentUser->name ?? $googleUser->getName(),
                'email' => $currentUser->email ?? $email,
                'google_id' => $googleId,
                'email_verified_at' => $currentUser->email_verified_at ?? now(),
                'is_guest' => false,
            ]);

            return $currentUser;
        }

        // Step 5: Create new user
        return User::create([
            'name' => $googleUser->getName(),
            'email' => $email,
            'password' => Hash::make(Str::random(32)),
            'google_id' => $googleId,
            'email_verified_at' => now(),
            'is_guest' => false,
        ]);
    }

    /**
     * Transfer Google account from one user to another.
     */
    private function transferGoogleAccount(
        User $fromUser,
        User $toUser,
        string $googleId,
        string $email,
        SocialiteUser $googleUser,
    ): User {
        Log::info('Transferring Google account between users', [
            'from_user_id' => $fromUser->id,
            'to_user_id' => $toUser->id,
            'google_id' => $googleId,
        ]);

        $fromUser->update(['google_id' => null]);
        $toUser->update([
            'name' => $googleUser->getName() ?? $toUser->name,
            'email' => $email,
            'google_id' => $googleId,
            'email_verified_at' => $toUser->email_verified_at ?? now(),
            'is_guest' => false,
        ]);

        return $toUser;
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
