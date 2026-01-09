<?php

declare(strict_types=1);

namespace App\Actions\Auth;

use App\Data\Response\AuthResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class CreateToken
{
    /**
     * Create a token for the already authenticated user.
     * Returns 401 JSON response for unauthenticated requests (no exception thrown).
     */
    public function __invoke(Request $request): Response
    {
        // Try to get user from web session (used by tests with actingAs)
        $user = Auth::guard('web')->user() ?? $request->user();

        if (!$user) {
            return response()->json([
                '_tag' => 'AuthenticationError',
                'message' => 'User not found.',
            ], Response::HTTP_UNAUTHORIZED);
        }

        $token = $user->createToken('api-token')->plainTextToken;

        return response()->json(AuthResponse::from([
            'token' => $token,
            'user' => $user,
        ]));
    }
}
