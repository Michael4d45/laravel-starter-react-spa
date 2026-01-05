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

        if (
            config()->boolean('logging.should_log_responses')
            && !$this->shouldIgnoreRoute($request)
        ) {
            $logData = [
                'method' => $request->method(),
                'url' => $request->fullUrl(),
                'status_code' => $response->getStatusCode(),
                'content_type' => $response->headers->get('content-type'),
                'headers' => $response->headers->all(),
                'content_length' => strlen($response->getContent()),
                'timestamp' => now()->toISOString(),
            ];

            // Include response body for error responses (4xx and 5xx)
            $statusCode = $response->getStatusCode();

            if ($statusCode >= 400 && $statusCode < 600) {
                // Handle JsonResponse vs regular Response differently
                if ($response instanceof JsonResponse) {
                    $logData['body'] = $response->getData(true); // Get the decoded data for script formatting
                } else {
                    $content = $response->getContent();
                    // Try to decode JSON, otherwise use raw content
                    $decoded = json_decode($content, true);
                    $logData['body'] = $decoded !== null ? $decoded : $content;
                }
            }

            Log::info('Outgoing Response', $logData);
        }

        return $response;
    }

    /**
     * Check if the current route should be ignored based on configured patterns.
     */
    private function shouldIgnoreRoute(Request $request): bool
    {
        $ignoreRoutes = config()->array('logging.ignore_routes', []);

        $path = $request->path();

        foreach ($ignoreRoutes as $pattern) {
            if (!is_string($pattern)) {
                continue;
            }

            // Handle wildcard patterns
            if (str_contains($pattern, '*')) {
                $regex = str_replace(['.', '*'], ['\.', '.*'], $pattern);
                // Convert [ext1|ext2|ext3] to (ext1|ext2|ext3) for proper regex grouping
                $regex = preg_replace('/\[([^\]]+)\]/', '($1)', $regex);
                if (preg_match('#^' . $regex . '$#', $path)) {
                    return true;
                }
            } elseif ($path === $pattern) {
                // Exact match for non-wildcard patterns
                return true;
            }
        }

        return false;
    }
}
