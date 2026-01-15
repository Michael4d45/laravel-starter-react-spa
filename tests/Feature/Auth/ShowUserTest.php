<?php

declare(strict_types=1);

namespace Tests\Feature\Auth;

use App\Models\User;

test('it can fetch the authenticated user', function () {
    $user = User::factory()->create([
        'name' => 'John Doe',
        'email' => 'john@example.com',
    ]);

    $token = $user->createToken('test-token')->plainTextToken;

    $response = $this->withToken($token)->getJson('/api/user');

    $response->assertSuccessful();
    $response->assertJson([
        'id' => $user->id,
        'name' => 'John Doe',
        'email' => 'john@example.com',
    ]);
});

test('it returns unauthorized when no token is provided', function () {
    $response = $this->getJson('/api/user');

    $response->assertStatus(401);
    $response->assertJson([
        '_tag' => 'AuthenticationError',
        'message' => 'Unauthenticated.',
    ]);
});

test('it returns unauthorized when an invalid token is provided', function () {
    $response = $this->withToken('invalid-token')->getJson('/api/user');

    $response->assertStatus(401);
    $response->assertJson([
        '_tag' => 'AuthenticationError',
        'message' => 'Unauthenticated.',
    ]);
});
