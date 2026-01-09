<?php

declare(strict_types=1);

namespace App\Actions\Auth;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
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

        // Delete the current Sanctum token first (before logout clears user)
        $token = $user?->currentAccessToken();
        if ($token instanceof PersonalAccessToken) {
            $token->delete();
        }

        // Log out from the session (guards against session-based auth like Filament)
        // Web middleware must be active on the route for this to work
        Auth::guard('web')->logout();

        // Invalidate the current session and regenerate CSRF token
        // This ensures Filament and other session-based auth systems get a clean slate
        session()->invalidate();
        session()->regenerateToken();

        if ($request->expectsJson()) {
            // For transient tokens (like in tests), we can't delete them but logout is still successful
            return response()->json(['message' => 'Logged out successfully']);
        }
        return redirect()->route('home');
    }
}
