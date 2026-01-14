<?php

declare(strict_types=1);

namespace App\Actions\Auth;

use App\Data\Response\MessageResponse;
use App\Http\Requests\AuthRequest;
use App\Models\PersonalAccessToken;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\ValidationException;

class DeleteToken
{
    /**
     * Delete a specific personal access token for the authenticated user.
     */
    public function __invoke(
        AuthRequest $request,
        string $tokenId,
    ): JsonResponse {
        $user = $request->assertedUser();

        $token = PersonalAccessToken::find($tokenId);

        // Verify the token exists and belongs to the current user
        if (
            !$token instanceof PersonalAccessToken
            || $token->tokenable_id !== $user->id
        ) {
            throw ValidationException::withMessages([
                'token' => [
                    'The selected token does not exist or does not belong to you.',
                ],
            ]);
        }

        // Prevent deletion of current token
        $currentTokenId = $user->currentAccessToken()->id;
        if ($token->id === $currentTokenId) {
            throw ValidationException::withMessages([
                'token' => [
                    'You cannot delete your current session. Please use logout instead.',
                ],
            ]);
        }

        $token->delete();

        return response()->json(MessageResponse::from([
            'message' => 'Session removed successfully.',
        ]));
    }
}
