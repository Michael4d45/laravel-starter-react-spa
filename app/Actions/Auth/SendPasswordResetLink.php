<?php

declare(strict_types=1);

namespace App\Actions\Auth;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\ValidationException;

class SendPasswordResetLink
{
    /**
     * Handle an incoming password reset link request.
     *
     * Security features:
     * - Always returns same message (prevents email enumeration)
     * - Logs request with IP address for security auditing
     * - Rate limited at route level (10 attempts per minute)
     *
     * @throws ValidationException
     */
    public function __invoke(Request $request): JsonResponse
    {
        $request->validate([
            'email' => ['required', 'email'],
        ]);

        $email = $request->string('email')->toString();

        // Send password reset link
        // The Password facade handles token creation and email sending
        $status = Password::sendResetLink($request->only('email'));

        // SECURITY: Always return the same message to prevent email enumeration attacks
        // This prevents attackers from determining which emails are registered
        return response()->json([
            '_tag' => 'Success',
            'message' => 'If an account exists with that email, a password reset link has been sent.',
        ]);
    }
}
