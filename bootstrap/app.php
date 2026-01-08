<?php

use App\Http\Middleware\LogRequests;
use App\Http\Middleware\LogResponses;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Michael4d45\ContextLogging\Middleware\EmitContextMiddleware;
use Michael4d45\ContextLogging\Middleware\RequestContextMiddleware;
use Symfony\Component\HttpKernel\Exception\HttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        channels: __DIR__ . '/../routes/channels.php',
        web: __DIR__ . '/../routes/web.php',
        api: __DIR__ . '/../routes/api.php',
        commands: __DIR__ . '/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->append(RequestContextMiddleware::class);
        $middleware->append(EmitContextMiddleware::class);
        $middleware->append(LogRequests::class);
        $middleware->append(LogResponses::class);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->render(function (ValidationException $e, $request) {
            if (config()->boolean('logging.should_log_validation_errors')) {
                Log::warning('Validation exception caught', [
                    'errors' => $e->errors(),
                    'input' => $request->all(),
                    'url' => $request->fullUrl(),
                    'method' => $request->method(),
                    'ip' => $request->ip(),
                    'user_agent' => $request->userAgent(),
                    'user_id' => $request->user()?->id,
                    'timestamp' => now()->toISOString(),
                ]);
            }

            // For API requests, return JSON response
            if ($request->expectsJson()) {
                return response()->json([
                    '_tag' => 'ValidationError',
                    'errors' => $e->errors(),
                ], 422);
            }

            throw $e;
        });
        $exceptions->render(function (HttpException $e, $request) {
            $isCsrfTokenMismatch = $e->getMessage() === 'CSRF token mismatch.';
            if ($request->expectsJson() && $isCsrfTokenMismatch) {
                return response()->json([
                    '_tag' => 'CsrfTokenExpiredError',
                ], 419);
            }

            throw $e;
        });
    })
    ->create();
