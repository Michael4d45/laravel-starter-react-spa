<?php

declare(strict_types=1);

namespace App\Actions\Auth;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
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

        // Check if there's a user_id in the OAuth state (for connecting accounts)
        $state = $request->query('state');
        $intendedUser = null;
        if ($state) {
            $stateData = json_decode($state, true);
            if (is_array($stateData) && isset($stateData['user_id'])) {
                $intendedUser = User::find($stateData['user_id']);
            }
        }

        try {
            /** @var SocialiteUser $googleUser */
            $googleUser = Socialite::driver('google')->stateless()->user();

            $googleId = $googleUser->getId();
            $email = $googleUser->getEmail();

            if (!$email) {
                throw new \Exception('Google did not provide an email address');
            }

            if (!$email) {
                return $this->rejectMissingEmail($wasAuthenticated);
            }

            /** ---------------------------------------------
             * Step 1: Resolve by Google ID (authoritative)
             * --------------------------------------------- */
            $googleAccountUser = User::where('google_id', $googleId)->first();

            if ($googleAccountUser) {
                // If we have an intended user from state, check if we should transfer
                if (
                    $intendedUser instanceof User
                    && $intendedUser->id !== $googleAccountUser->id
                ) {
                    // Transfer Google account from old user to intended user
                    Log::info('Transferring Google account between users', [
                        'from_user_id' => $googleAccountUser->id,
                        'to_user_id' => $intendedUser->id,
                        'google_id' => $googleId,
                    ]);

                    try {
                        // Clear google_id from old user
                        $googleAccountUser->update(['google_id' => null]);

                        // Set google_id on intended user
                        $intendedUser->update([
                            'name' =>
                                $googleUser->getName() ?? $intendedUser->name,
                            'email' => $email, // Update email to Google email if different
                            'google_id' => $googleId,
                            'email_verified_at' =>
                                $intendedUser->email_verified_at ?? now(),
                            'is_guest' => false,
                        ]);

                        Auth::login($intendedUser);

                        // Create JWT token immediately for SPA
                        $token = $intendedUser->createToken(
                            'oauth-token',
                        )->plainTextToken;

                        Log::info('HandleGoogleCallback: Transferred Google account and created token', [
                            'user_id' => $intendedUser->id,
                            'session_id' => session()->getId(),
                            'auth_check' => Auth::check(),
                            'auth_user_id' => Auth::user()?->id,
                            'token_created' => !!$token,
                        ]);

                        // For SPA, redirect back to frontend with token and user data
                        return redirect(
                            '/profile?auth=connected&token='
                                . urlencode($token)
                                . '&user='
                                . urlencode(json_encode($intendedUser->toArray())),
                        );
                    } catch (\Throwable $updateError) {
                        Log::error('Failed to transfer Google account', [
                            'error' => $updateError->getMessage(),
                            'from_user_id' => $googleAccountUser->id,
                            'to_user_id' => $intendedUser->id,
                        ]);
                        throw $updateError;
                    }
                }

                // Logged in as someone else → reject
                if (
                    $wasAuthenticated
                    && !$isGuest
                    && $currentUser?->id !== $googleAccountUser->id
                    && (
                        !$intendedUser instanceof User
                        || $intendedUser->id !== $googleAccountUser->id
                    )
                ) {
                    return $this->rejectGoogleAlreadyLinked();
                }

                // Guest upgrading into existing Google account
                if ($isGuest && $currentUser->id !== $googleAccountUser->id) {
                    User::mergeGuestData($currentUser, $googleAccountUser);
                }

                Auth::login($googleAccountUser);

                // Create JWT token immediately for SPA
                $token = $googleAccountUser->createToken(
                    'oauth-token',
                )->plainTextToken;

                // For SPA, redirect back to frontend with token and user data
                return redirect(
                    '/?auth=success&token=' . urlencode($token) . '&user='
                        . urlencode(json_encode($googleAccountUser->toArray())),
                );
            }

            /** ---------------------------------------------
             * Step 2: Check intended user from OAuth state
             * --------------------------------------------- */
            if ($intendedUser instanceof User) {
                // Check if intended user already has a different Google account
                if (
                    $intendedUser->google_id
                    && $intendedUser->google_id !== $googleId
                ) {
                    return $this->rejectGoogleAlreadyLinked();
                }

                // Connect Google to the intended user
                $intendedUser->update([
                    'name' => $googleUser->getName() ?? $intendedUser->name,
                    'email' => $email, // Update email to Google email if different
                    'google_id' => $googleId,
                    'email_verified_at' =>
                        $intendedUser->email_verified_at ?? now(),
                    'is_guest' => false,
                ]);

                Auth::login($intendedUser);

                // Create JWT token immediately for SPA
                $token = $intendedUser->createToken(
                    'oauth-token',
                )->plainTextToken;

                Log::info('HandleGoogleCallback: Connected Google to intended user and created token', [
                    'user_id' => $intendedUser->id,
                    'session_id' => session()->getId(),
                    'auth_check' => Auth::check(),
                    'auth_user_id' => Auth::user()?->id,
                    'token_created' => !!$token,
                ]);

                // For SPA, redirect back to frontend with token and user data
                return redirect(
                    '/profile?auth=connected&token='
                        . urlencode($token)
                        . '&user='
                        . urlencode(json_encode($intendedUser->toArray())),
                );
            }

            /** ---------------------------------------------
             * Step 3: Resolve by email (fallback)
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

                // If user was authenticated as guest, merge data
                if (
                    $wasAuthenticated
                    && $isGuest
                    && $currentUser->id !== $emailUser->id
                ) {
                    User::mergeGuestData($currentUser, $emailUser);
                }

                // Update the email user with Google data
                try {
                    $emailUser->update([
                        'name' => $googleUser->getName() ?? $emailUser->name,
                        'google_id' => $googleId,
                        'email_verified_at' =>
                            $emailUser->email_verified_at ?? now(),
                        'is_guest' => false,
                    ]);

                    Auth::login($emailUser);

                    // Create JWT token immediately for SPA
                    $token = $emailUser->createToken(
                        'oauth-token',
                    )->plainTextToken;

                    Log::info(
                        'HandleGoogleCallback: Logged in existing email user with Google and created token',
                        [
                            'user_id' => $emailUser->id,
                            'session_id' => session()->getId(),
                            'auth_check' => Auth::check(),
                            'auth_user_id' => Auth::user()?->id,
                            'token_created' => !!$token,
                        ],
                    );

                    // For SPA, redirect back to frontend with token and user data
                    return redirect(
                        '/?auth=success&token=' . urlencode($token) . '&user='
                            . urlencode(json_encode($emailUser->toArray())),
                    );
                } catch (\Throwable $updateError) {
                    Log::error('Failed to update email user', [
                        'error' => $updateError->getMessage(),
                        'user_id' => $emailUser->id,
                        'email' => $emailUser->email,
                    ]);
                    throw $updateError;
                }
            }

            /** ---------------------------------------------
             * Step 4: Attach to current user or create new
             * --------------------------------------------- */

            if ($wasAuthenticated && $currentUser) {
                $currentUser->update([
                    'name' => $currentUser->name ?? $googleUser->getName(),
                    'email' => $currentUser->email ?? $email,
                    'google_id' => $googleId,
                    'email_verified_at' =>
                        $currentUser->email_verified_at ?? now(),
                    'is_guest' => false,
                ]);

                Auth::login($currentUser);

                // Create JWT token immediately for SPA
                $token = $currentUser->createToken(
                    'oauth-token',
                )->plainTextToken;

                Log::info('HandleGoogleCallback: Connected Google to existing user and created token', [
                    'user_id' => $currentUser->id,
                    'session_id' => session()->getId(),
                    'auth_check' => Auth::check(),
                    'auth_user_id' => Auth::user()?->id,
                    'token_created' => !!$token,
                ]);

                // For SPA, redirect back to frontend with token and user data
                return redirect(
                    '/profile?auth=connected&token='
                        . urlencode($token)
                        . '&user='
                        . urlencode(json_encode($currentUser->toArray())),
                );
            }

            try {
                $user = User::create([
                    'name' => $googleUser->getName(),
                    'email' => $email,
                    'password' => Hash::make(Str::random(32)),
                    'google_id' => $googleId,
                    'email_verified_at' => now(),
                    'is_guest' => false,
                ]);

                Auth::login($user);

                // Create JWT token immediately for SPA
                $token = $user->createToken('oauth-token')->plainTextToken;

                // For SPA, redirect back to frontend with token and user data
                return redirect(
                    '/?auth=success&token=' . urlencode($token) . '&user='
                        . urlencode(json_encode($user->toArray())),
                );
            } catch (\Throwable $createError) {
                Log::error('Failed to create user', [
                    'error' => $createError->getMessage(),
                    'name' => $googleUser->getName(),
                    'email' => $email,
                    'google_id' => $googleId,
                ]);
                throw $createError;
            }
        } catch (\Throwable $e) {
            Log::error('Google OAuth Error', [
                'error' => $e->getMessage(),
                'user_id' => $currentUser?->id ?? $intendedUser?->id,
                'email' => $email ?? 'unknown',
            ]);

            // For SPA, redirect back to frontend with error state
            $errorMessage = $e->getMessage() ?: 'Unknown error';
            $redirectPath = $wasAuthenticated ? '/profile' : '/login';
            return redirect(
                $redirectPath . '?auth=error&message='
                    . urlencode('Google authentication failed: '
                    . $errorMessage),
            );
        }
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
