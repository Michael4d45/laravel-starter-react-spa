<?php

declare(strict_types=1);

namespace App\Actions\Auth;

use App\Data\Models\TokenData;
use App\Data\Response\TokenListResponse;
use App\Http\Requests\AuthRequest;
use Illuminate\Http\JsonResponse;

class ListTokens
{
    /**
     * List all active sessions (personal access tokens) for the authenticated user.
     */
    public function __invoke(AuthRequest $request): JsonResponse
    {
        $user = $request->assertedUser();

        $currentTokenId = $user->currentAccessToken()->id;

        $tokens = $user
            ->tokens()
            ->orderByDesc('last_used_at')
            ->orderByDesc('created_at')
            ->get()
            ->map(function ($token) use ($currentTokenId) {
                return TokenData::from([
                    'id' => $token->id,
                    'name' => $token->name,
                    'created_at' => $token->created_at,
                    'last_used_at' => $token->last_used_at,
                    'expires_at' => $token->expires_at,
                    'is_current' =>
                        (string) $token->id === (string) $currentTokenId,
                ]);
            });

        return response()->json(TokenListResponse::from([
            'tokens' => $tokens,
        ]));
    }
}
