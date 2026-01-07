<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Http\Middleware\LoggingHelper;
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

        if (
            config()->boolean('logging.should_log_responses')
            && !LoggingHelper::shouldIgnoreRoute($request)
            && $this->isJsonResponse($response)
        ) {
            $logData = [
                'method' => $request->method(),
                'url' => $request->fullUrl(),
                'status_code' => $response->getStatusCode(),
                'content_type' => $response->headers->get('content-type'),
                'headers' => LoggingHelper::maskHeaders($response->headers->all()),
                'content_length' => strlen($response->getContent()),
                'timestamp' => now()->toISOString(),
            ];

            // Handle JsonResponse vs regular Response differently
            if ($response instanceof JsonResponse) {
                $logData['body'] = LoggingHelper::maskSensitiveData($response->getData(
                    true,
                )); // Get the decoded data for script formatting
            } else {
                $content = $response->getContent();
                // Try to decode JSON, otherwise use raw content
                $decoded = json_decode($content, true);
                $logData['body'] = $decoded !== null
                    ? LoggingHelper::maskSensitiveData($decoded)
                    : $content;
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
