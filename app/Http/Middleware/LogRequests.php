<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class LogRequests
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        // @mago-expect lint:no-request-all
        $body = $request->all();
        $queryParams = $request->query();
        if (
            config()->boolean('logging.should_log_request')
            && !LoggingHelper::shouldIgnoreRoute($request)
            && ($body !== [] || $queryParams !== [])
        ) {
            // Note: Be cautious with logging request bodies as they may contain sensitive data
            Log::info('Incoming Request', [
                'method' => $request->method(),
                'url' => $request->fullUrl(),
                'ip' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'headers' => LoggingHelper::maskHeaders($request->headers->all()),
                'body' => LoggingHelper::maskSensitiveData($body), // Sensitive data is now masked
                'query_params' => LoggingHelper::maskSensitiveData($queryParams), // Query params may also contain sensitive data
                'timestamp' => now()->toISOString(),
                'cookies' => LoggingHelper::maskCookies($request->cookies->all()),
            ]);
        }

        $response = $next($request);

        return $response instanceof Response
            ? $response
            : response(
                is_string($response)
                    ? $response
                    : (string) (is_scalar($response) ? $response : ''),
            );
    }
}
