<?php

declare(strict_types=1);

namespace App\Actions\Auth;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DisconnectGoogle
{
    /**
     * Disconnect Google account from the authenticated user.
     */
    public function __invoke(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'message' => 'Unauthenticated',
            ], 401);
        }

        if (!$user->google_id) {
            return response()->json([
                'message' => 'No Google account connected',
            ], 400);
        }

        // Remove Google account connection
        $user->update([
            'google_id' => null,
        ]);

        // Optionally revoke all Google-related tokens
        // $user->tokens()->where('name', 'oauth-token')->delete();

        return response()->json([
            'message' => 'Google account disconnected successfully',
            'user' => $user->fresh(), // Return updated user data
        ]);
    }
}
