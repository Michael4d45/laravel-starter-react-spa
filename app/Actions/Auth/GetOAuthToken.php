<?php

declare(strict_types=1);

namespace App\Actions\Auth;

use App\Data\Response\AuthResponse;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class GetOAuthToken
{
    /**
     * Retrieve OAuth token from session after successful callback.
     *
     * This endpoint is called by the frontend after OAuth redirect.
     * Token is stored in session by HandleGoogleCallback and
     * retrieved here once, then cleared from session.
     */
    public function __invoke(Request $request): JsonResponse
    {
        // Check if we have OAuth data in session
        $token = session()->pull('oauth_token');
        $userData = session()->pull('oauth_user');

        if (is_string($token) && is_array($userData)) {
            // Fetch fresh user from database to avoid date casting issues
            $userId = $userData['id'] ?? null;
            $user = is_string($userId) ? User::find($userId) : null;

            if ($user instanceof User) {
                Log::info('GetOAuthToken: Retrieved token from session', [
                    'user_id' => $user->id,
                ]);

                return response()->json(AuthResponse::from([
                    'token' => $token,
                    'user' => $user,
                ]));
            }
        }

        // No OAuth data in session - check if user is authenticated via session
        // This handles the case where the user might already be logged in
        /** @var User|null $user */
        $user = Auth::user();

        if ($user instanceof User) {
            $newToken = $user->createToken('api-token')->plainTextToken;

            Log::info('GetOAuthToken: Created new token for authenticated user', [
                'user_id' => $user->id,
            ]);

            return response()->json(AuthResponse::from([
                'token' => $newToken,
                'user' => $user,
            ]));
        }

        return response()->json([
            'error' => 'No OAuth session found',
        ], 404);
    }
}
