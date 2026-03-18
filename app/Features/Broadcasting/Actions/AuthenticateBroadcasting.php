<?php

declare(strict_types=1);

namespace App\Features\Broadcasting\Actions;

use App\Features\Broadcasting\Requests\AuthenticateBroadcastingRequest;
use App\Features\Broadcasting\Responses\AuthenticateBroadcastingResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Broadcast;

class AuthenticateBroadcasting
{
    /**
     * Authenticate a broadcasting channel
     */
    public function __invoke(
        Request $request,
        AuthenticateBroadcastingRequest $data,
    ): JsonResponse {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        // Authenticate the channel
        try {
            $authData = Broadcast::auth($request);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Channel authentication failed',
            ], 403);
        }

        $auth = '';
        if (is_string($authData)) {
            $auth = $authData;
        } elseif (is_array($authData) && array_key_exists('auth', $authData)) {
            $auth = $authData['auth'];
        }

        $channelData = is_array($authData)
            ? $authData['channel_data'] ?? null
            : null;

        return response()->json(AuthenticateBroadcastingResponse::from([
            'auth' => $auth,
            'channel_data' => $channelData,
        ]));
    }
}
