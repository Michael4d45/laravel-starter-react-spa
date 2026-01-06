<?php

declare(strict_types=1);

namespace App\Actions\Auth;

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
        $token = $request->user()?->currentAccessToken();
        if ($token instanceof PersonalAccessToken) {
            $token->delete();
        }
        // For transient tokens (like in tests), we can't delete them but logout is still successful
        return response()->json(['message' => 'Logged out successfully']);
    }
}
