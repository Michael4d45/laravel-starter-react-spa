<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Models\PersonalAccessToken;
use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Symfony\Component\HttpFoundation\Response;

class RefreshSanctumToken
{
    /**
     * Rotate the current Sanctum token when it is about to expire.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $authHeader = $request->header('Authorization');
        if (is_string($authHeader) && str_starts_with($authHeader, 'Bearer ')) {
            $rawToken = ltrim($authHeader, 'Bearer ');
            $accessToken = PersonalAccessToken::findToken($rawToken);
            if ($accessToken instanceof PersonalAccessToken) {
                $expiresAt = $accessToken->expires_at;
                if ($expiresAt !== null) {
                    $expiresAt = $expiresAt instanceof Carbon
                        ? $expiresAt
                        : Carbon::parse($expiresAt);

                    if ($expiresAt->isPast()) {
                        return response()->json([
                            '_tag' => 'AuthenticationError',
                            'message' => 'Token has expired.',
                        ], 401);
                    }
                }
            }
        }

        $response = $next($request);
        if (!$response instanceof Response) {
            return response()->noContent();
        }

        $user = $request->user();
        if (!$user instanceof User) {
            return $response;
        }

        $token = $user->currentAccessToken();

        if (!$token->expires_at instanceof Carbon) {
            return $response;
        }

        if (
            $token->expires_at->gt(now())
            && now()->diffInHours($token->expires_at) < 24
        ) {
            $newToken = $user->createToken(
                $token->name,
                $token->abilities ?? ['*'],
            )->plainTextToken;

            $token->delete();

            $response->headers->set('X-New-Token', $newToken);
        }

        return $response;
    }
}
