<?php

declare(strict_types=1);

namespace App\Actions\Auth;

use App\Data\Response\AuthResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CreateToken
{
    /**
     * Create a token for the already authenticated user.
     */
    public function __invoke(Request $request): Response
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $token = $user->createToken('api-token')->plainTextToken;

        return response()->json(AuthResponse::from([
            'token' => $token,
            'user' => $user,
        ]));
    }
}
