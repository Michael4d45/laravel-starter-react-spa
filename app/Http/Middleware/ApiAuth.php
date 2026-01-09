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
        $token = $request->bearerToken();
        if (!$token) {
            return response()->json([
                '_tag' => 'AuthenticationError',
                'message' => 'No bearer token provided.',
            ], 401);
        }
        $token = PersonalAccessToken::findToken($token);
        if (!$token) {
            return response()->json([
                '_tag' => 'AuthenticationError',
                'message' => 'Invalid bearer token.',
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
        return $next($request);
    }
}
