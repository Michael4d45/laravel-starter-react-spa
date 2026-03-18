<?php

declare(strict_types=1);

namespace App\Features\Auth\Actions;

use App\Data\Models\UserData;
use App\Features\Auth\Requests\AuthRequest;
use App\Features\Auth\Responses\DisconnectGoogleResponse;
use Illuminate\Http\JsonResponse;

class DisconnectGoogle
{
    /**
     * Disconnect Google account from the authenticated user.
     */
    public function __invoke(AuthRequest $request): JsonResponse
    {
        $user = $request->assertedUser();

        if (!$user->google_id) {
            return response()->json([
                'message' => 'No Google account connected',
            ], 400);
        }

        // Remove Google account connection
        $user->update([
            'google_id' => null,
            'verified_google_email' => null,
        ]);

        return response()->json(DisconnectGoogleResponse::from([
            'message' => 'Google account disconnected successfully',
            'user' => UserData::from($user->fresh()),
        ]));
    }
}
