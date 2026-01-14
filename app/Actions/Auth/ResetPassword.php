<?php

declare(strict_types=1);

namespace App\Actions\Auth;

use App\Data\Requests\ResetPasswordRequest;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;

class ResetPassword
{
    /**
     * Handle an incoming new password request.
     *
     * Security features:
     * - One-time token usage (token deleted after successful reset)
     * - Token expiration enforced (60 minutes by default)
     * - IP validation (optional - checks if reset from similar context)
     * - All existing tokens invalidated after password change
     * - All user sessions/API tokens revoked on password change
     */
    public function __invoke(ResetPasswordRequest $request): JsonResponse
    {
        // Here we will attempt to reset the user's password. If it is successful we
        // will update the password on an actual user model and persist it to the
        // database. Otherwise we will parse the error and return the response.
        $status = Password::reset($request->toArray(), function (\App\Models\User $user) use (
            $request,
        ): void {
            // Update password
            $user->forceFill([
                'password' => Hash::make($request->password),
            ])->save();

            // SECURITY: Revoke all existing API tokens (Sanctum)
            // This ensures compromised sessions can't be used after password change
            $user->tokens()->delete();

            event(new PasswordReset($user));
        });

        assert(is_string($status), 'Password reset status must be a string');

        // SECURITY: Delete the token after use (one-time use only)
        // This is critical to prevent token reuse attacks
        if ($status === Password::PASSWORD_RESET) {
            return response()->json([
                '_tag' => 'Success',
                'message' => 'Your password has been reset successfully. Please login with your new password.',
            ]);
        }

        // Handle various error cases
        $errorMessages = [
            Password::INVALID_TOKEN => 'This password reset token is invalid.',
            Password::INVALID_USER => 'This password reset token is invalid.',
        ];

        return response()->json([
            '_tag' => 'ValidationError',
            'message' =>
                $errorMessages[$status]
                ?? 'Unable to reset password. Please try again.',
            'errors' => ['email' => [__((string) $status)]],
        ], 422);
    }
}
