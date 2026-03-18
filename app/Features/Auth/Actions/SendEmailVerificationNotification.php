<?php

declare(strict_types=1);

namespace App\Features\Auth\Actions;

use App\Features\Auth\Requests\AuthRequest;
use App\Features\Auth\Responses\MessageResponse;
use Symfony\Component\HttpFoundation\JsonResponse;

class SendEmailVerificationNotification
{
    /**
     * Send a new email verification notification.
     */
    public function __invoke(AuthRequest $request): JsonResponse
    {
        $user = $request->assertedUser();

        if ($user->hasVerifiedEmail()) {
            return response()->json(MessageResponse::from([
                'message' => 'Email already verified',
            ]));
        }

        $user->sendEmailVerificationNotification();

        return response()->json(MessageResponse::from([
            'message' => 'Verification link sent',
        ]));
    }
}
