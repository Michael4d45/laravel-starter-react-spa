<?php

use App\Http\Middleware\AdminMiddleware;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Michael4d45\ContextLogging\Middleware\EmitContextMiddleware;
use Michael4d45\ContextLogging\Middleware\RequestContextMiddleware;

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

        $middleware->alias([
            'admin' => AdminMiddleware::class,
        ]);
        $middleware->statefulApi();
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->report(function (ValidationException $e) {
            if (config()->boolean('logging.should_log_validation_errors')) {
                Log::warning('Validation error occurred', [
                    'errors' => $e->errors(),
                ]);
            }
        });
    })
    ->create();
