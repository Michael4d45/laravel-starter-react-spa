<?php

declare(strict_types=1);

namespace App\Actions\Realtime;

use App\Events\TestRealtimeEvent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class TriggerTestEvent
{
    public function __invoke(Request $request): JsonResponse
    {
        $user = Auth::user();

        if (!$user) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $message = $request->string('message', 'Hello from Reverb!');

        event(new TestRealtimeEvent($user, $message->toString()));

        return response()->json([
            'success' => true,
            'message' => 'Event dispatched',
        ]);
    }
}
