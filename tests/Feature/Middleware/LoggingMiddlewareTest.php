<?php

declare(strict_types=1);

use App\Http\Middleware\LogRequests;
use App\Http\Middleware\LogResponses;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Log;

uses(RefreshDatabase::class);

it('logs requests when should_log_requests is enabled', function (): void {
    Config::set('logging.should_log_requests', true);

    Log::shouldReceive('info')
        ->once()
        ->with('Incoming Request', \Mockery::on(function ($data) {
            return isset($data['method'], $data['url'], $data['timestamp']);
        }));

    $request = Request::create('/test', 'GET');
    $middleware = new LogRequests;

    $response = $middleware->handle($request, function ($req) {
        return response('OK');
    });

    expect($response->getStatusCode())->toBe(200);
});

it('does not log requests when should_log_requests is disabled', function (): void {
    Config::set('logging.should_log_requests', false);

    Log::spy();

    $request = Request::create('/test', 'GET');
    $middleware = new LogRequests;

    $response = $middleware->handle($request, function ($req) {
        return response('OK');
    });

    expect($response->getStatusCode())->toBe(200);
    Log::shouldNotHaveReceived('info');
});

it('logs responses when should_log_responses is enabled', function (): void {
    Config::set('logging.should_log_responses', true);

    Log::shouldReceive('info')
        ->once()
        ->with('Outgoing Response', \Mockery::on(function ($data) {
            return isset($data['method'], $data['url'], $data['status_code']);
        }));

    $request = Request::create('/test', 'GET');
    $middleware = new LogResponses;

    $response = $middleware->handle($request, function ($req) {
        return response('OK', 200);
    });

    expect($response->getStatusCode())->toBe(200);
});

it('does not log responses when should_log_responses is disabled', function (): void {
    Config::set('logging.should_log_responses', false);

    Log::spy();

    $request = Request::create('/test', 'GET');
    $middleware = new LogResponses;

    $response = $middleware->handle($request, function ($req) {
        return response('OK', 200);
    });

    expect($response->getStatusCode())->toBe(200);
    Log::shouldNotHaveReceived('info');
});

it('does not log requests for ignored routes', function (): void {
    Config::set('logging.should_log_requests', true);
    Config::set('logging.ignore_routes', [
        '*.js',
        '*.css',
        '_boost/browser-logs',
    ]);

    Log::spy();

    // Test static asset
    $request = Request::create('/assets/app.js', 'GET');
    $middleware = new LogRequests;

    $response = $middleware->handle($request, function ($req) {
        return response('OK');
    });

    expect($response->getStatusCode())->toBe(200);
    Log::shouldNotHaveReceived('info');
});

it('does not log responses for ignored routes', function (): void {
    Config::set('logging.should_log_responses', true);
    Config::set('logging.ignore_routes', [
        '*.js',
        '*.css',
        '_boost/browser-logs',
    ]);

    Log::spy();

    // Test exact match
    $request = Request::create('/_boost/browser-logs', 'GET');
    $middleware = new LogResponses;

    $response = $middleware->handle($request, function ($req) {
        return response('OK', 200);
    });

    expect($response->getStatusCode())->toBe(200);
    Log::shouldNotHaveReceived('info');
});

it('logs requests for non-ignored routes even with ignore config', function (): void {
    Config::set('logging.should_log_requests', true);
    Config::set('logging.ignore_routes', ['*.js', '*.css']);

    Log::shouldReceive('info')
        ->once()
        ->with('Incoming Request', \Mockery::on(function ($data) {
            return isset($data['method'], $data['url']);
        }));

    $request = Request::create('/api/users', 'GET');
    $middleware = new LogRequests;

    $response = $middleware->handle($request, fn($req) => response('OK'));

    expect($response->getStatusCode())->toBe(200);
});
