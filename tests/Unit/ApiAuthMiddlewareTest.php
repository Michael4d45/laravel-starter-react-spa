<?php

declare(strict_types=1);

use App\Http\Middleware\ApiAuth;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

test('api auth middleware allows authenticated requests', function () {
    $user = User::factory()->create();
    $token = $user->createToken('test-token')->plainTextToken;
    $request = Request::create(
        '/api/user',
        'GET',
        [],
        [],
        [],
        ['HTTP_AUTHORIZATION' => 'Bearer ' . $token],
    );
    $middleware = new ApiAuth;

    $response = $middleware->handle($request, function ($req) {
        return response()->json(['success' => true]);
    });

    expect($response->getStatusCode())->toBe(200);
});

test('api auth middleware blocks unauthenticated requests', function () {
    $request = Request::create('/api/user', 'GET');
    $middleware = new ApiAuth;

    // Mock unauthenticated state
    Auth::shouldReceive('guard')
        ->with('sanctum')
        ->andReturnSelf()
        ->shouldReceive('check')
        ->andReturn(false);

    $response = $middleware->handle($request, function ($req) {
        return response()->json(['success' => true]);
    });

    expect($response->getStatusCode())->toBe(401);
    expect($response->getData()->_tag)->toBe('AuthenticationError');
});
