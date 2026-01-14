<?php

use App\Http\Middleware\ApiAuth;
use App\Http\Middleware\LogRequests;
use App\Http\Middleware\LogResponses;
use Illuminate\Auth\AuthenticationException;
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

        $middleware->encryptCookies(except: [
            'oauth_token_handoff',
        ]);

        $middleware->alias([
            'api.auth' => ApiAuth::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->report(function (ValidationException $e) {
            if (config()->boolean('logging.should_log_validation_errors')) {
                Log::warning('Validation error occurred', [
                    'errors' => $e->errors(),
                ]);
            }
        });
        $exceptions->render(function (Exception $e, $request) {
            if ($request->expectsJson()) {
                $body = [
                    '_tag' => 'FatalError',
                    'message' => $e->getMessage(),
                ];
                $status = 500;
                if (method_exists($e, 'getStatusCode')) {
                    $status = $e->getStatusCode();
                }
                if ($e instanceof AuthenticationException) {
                    $body['_tag'] = 'AuthenticationError';
                    $status = 401;
                } else if ($e instanceof ValidationException) {
                    $body['_tag'] = 'ValidationError';
                    $body['errors'] = $e->errors();
                    $status = 422;
                } else if ($e instanceof HttpException) {
                    $body['_tag'] = 'HttpError';
                    switch ($status) {
                        case 419:
                            $body['_tag'] = 'CsrfTokenExpiredError';
                            break;
                        case 429:
                            $body['_tag'] = 'TooManyAttemptsError';
                            break;
                        case 404:
                            $body['_tag'] = 'NotFoundError';
                            break;
                        default:
                    }
                }
                return response()->json($body, $status);
            }
        });
    })
    ->create();
