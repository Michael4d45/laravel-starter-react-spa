<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Models\PersonalAccessToken;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ApiAuth
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $tokenString = $request->bearerToken();
        if (!$tokenString) {
            return response()->json([
                '_tag' => 'AuthenticationError',
                'message' => 'No bearer token provided.',
            ], 401);
        }
        $token = PersonalAccessToken::findToken($tokenString);
        if (!$token) {
            return response()->json([
                '_tag' => 'AuthenticationError',
                'message' => 'Invalid bearer token.',
            ], 401);
        }

        // Check if token is expired
        if ($token->expires_at && $token->expires_at->isPast()) {
            return response()->json([
                '_tag' => 'AuthenticationError',
                'message' => 'Token has expired.',
            ], 401);
        }

        $user = $token->tokenable;
        if (!$user) {
            return response()->json([
                '_tag' => 'AuthenticationError',
                'message' => 'User not found.',
            ], 401);
        }
        $request->setUserResolver(function () use ($user) {
            return $user;
        });

        // Store token for rotation check
        $request->attributes->set('current_token', $token);

        $response = $next($request);

        // Implement token rotation: if token is expiring within 1 day, issue a new one
        // Check if expires_at is in the future and less than 24 hours away
        if (
            $token->expires_at
            && $token->expires_at->gt(now())
            && now()->diffInHours($token->expires_at, false) < 24
        ) {
            /** @var \App\Models\User $user */
            $newToken = $user->createToken('api-token')->plainTextToken;
            // Delete the old token to prevent reuse
            $token->delete();
            // Add new token to response header for client to update
            $response->headers->set('X-New-Token', $newToken);
        }

        return $response;
    }
}
