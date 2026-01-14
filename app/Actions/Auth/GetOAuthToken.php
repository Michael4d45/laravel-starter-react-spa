<?php

declare(strict_types=1);

namespace App\Actions\Auth;

use App\Data\Response\AuthResponse;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

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
        // Try to get token from the one-time handoff cookie (stateless)
        $token = $request->cookie('oauth_token_handoff');

        if (is_string($token)) {
            // Find the user associated with this token
            $pat = \App\Models\PersonalAccessToken::findToken($token);
            $user = $pat?->tokenable;

            if ($user instanceof User) {
                // Return token and user, and clear the handoff cookie
                return response()
                    ->json(AuthResponse::from([
                        'token' => $token,
                        'user' => $user,
                    ]))
                    ->withoutCookie('oauth_token_handoff');
            }
        }

        // No OAuth handoff found - check if user is already authenticated
        // ... (rest of the logic for authenticated users)
        /** @var User|null $user */
        $user = Auth::user();

        if ($user instanceof User) {
            $newToken = $user->createToken('api-token')->plainTextToken;

            return response()->json(AuthResponse::from([
                'token' => $newToken,
                'user' => $user,
            ]));
        }

        return response()->json([
            'error' => 'No OAuth handoff found',
        ], 404);
    }
}
