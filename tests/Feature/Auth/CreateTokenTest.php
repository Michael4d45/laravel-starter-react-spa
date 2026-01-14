<?php

declare(strict_types=1);

namespace Tests\Feature\Auth;

use App\Models\User;

test('it creates a token for web session user', function () {
    $user = User::factory()->create();

    // actingAs uses the web guard and should populate the session
    $this->actingAs($user);

    $response = $this->getJson('/api/token');

    $response->assertSuccessful();
    $response->assertJsonStructure([
        'token',
        'user' => ['id', 'name', 'email'],
    ]);
});

test('it returns unauthorized when no session user', function () {
    $response = $this->getJson('/api/token');

    $response->assertStatus(401);
    $response->assertJson([
        '_tag' => 'AuthenticationError',
        'message' => 'User not found.',
    ]);
});
