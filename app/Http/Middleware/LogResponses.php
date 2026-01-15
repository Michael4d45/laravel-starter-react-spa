<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class LogResponses
{
    /**
     * Handle an incoming request and log the response.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);
        if (!$response instanceof Response) {
            return response()->noContent();
        }

        if (
            config()->boolean(
                'logging.should_log_user',
            ) && !LoggingHelper::shouldIgnoreRoute($request) && ($user =
                $request->user())
        ) {
            Log::info('User', [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'is_guest' => $user->is_guest,
                'is_admin' => $user->is_admin,
            ]);
        }

        if (
            config()->boolean('logging.should_log_responses')
            && !LoggingHelper::shouldIgnoreRoute($request)
            && $this->isJsonResponse($response)
        ) {
            $content = $response->getContent();
            $logData = [
                'status_code' => $response->getStatusCode(),
                'content_type' => $response->headers->get('content-type'),
                'headers' => LoggingHelper::maskHeaders($response->headers->all()),
                'content_length' => is_string($content) ? strlen($content) : 0,
                'timestamp' => now()->toISOString(),
            ];

            // Handle JsonResponse vs regular Response differently
            if ($response instanceof JsonResponse) {
                $logData['body'] = LoggingHelper::maskSensitiveData((array) $response->getData(
                    true,
                )); // Get the decoded data for script formatting
            } else {
                $contentStr = is_string($content) ? $content : '';
                // Try to decode JSON, otherwise use raw content
                $decoded = json_decode($contentStr, true);
                $logData['body'] = is_array($decoded)
                    ? LoggingHelper::maskSensitiveData($decoded)
                    : $contentStr;
            }

            Log::info('Outgoing Response', $logData);
        }

        return $response;
    }

    /**
     * Check if the response is JSON.
     */
    private function isJsonResponse(Response $response): bool
    {
        // Check if it's a JsonResponse instance
        if ($response instanceof JsonResponse) {
            return true;
        }

        // Check content-type header
        $contentType = $response->headers->get('content-type');
        if (
            $contentType
            && str_contains(strtolower($contentType), 'application/json')
        ) {
            return true;
        }

        return false;
    }
}
