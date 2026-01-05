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
        if (
            config()->boolean('logging.should_log_requests')
            && !$this->shouldIgnoreRoute($request)
        ) {
            // Note: Be cautious with logging request bodies as they may contain sensitive data
            Log::info('Incoming Request', [
                'method' => $request->method(),
                'url' => $request->fullUrl(),
                'ip' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'headers' => $request->headers->all(),
                // @mago-expect lint:no-request-all
                'body' => $request->all(), // WARNING: May contain sensitive data
                'timestamp' => now()->toISOString(),
            ]);
        }

        return $next($request);
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
