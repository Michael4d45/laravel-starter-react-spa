<?php

declare(strict_types=1);

namespace App\Actions\Auth;

use App\Data\Response\MessageResponse;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;
use Symfony\Component\HttpFoundation\Response;

class Logout
{
    /**
     * Destroy an authenticated session.
     */
    public function __invoke(Request $request): Response
    {
        $user = $request->user();

        // Delete the current Sanctum token
        $token = $user?->currentAccessToken();
        if ($token instanceof PersonalAccessToken) {
            $token->delete();
        }

        return response()->json(MessageResponse::from([
            'message' => 'Logged out successfully',
        ]));
    }
}
