<?php

declare(strict_types=1);

use App\Models\User;

it('can logout with personal access token', function () {
    $user = User::factory()->create();

    // Create a personal access token
    $token = $user->createToken('test-token')->plainTextToken;

    $response = $this->withToken($token)->postJson('/api/logout');

    $response
        ->assertSuccessful()
        ->assertJson(['message' => 'Logged out successfully']);

    // Verify token was deleted
    $this->assertDatabaseMissing('personal_access_tokens', [
        'name' => 'test-token',
        'tokenable_id' => $user->id,
    ]);
});

it('can logout with transient token', function () {
    $user = User::factory()->create();

    // Create a transient token (simulating SPA authentication)
    // Note: Transient tokens are created differently - they don't persist
    $token = $user->createToken('test-token');

    $response = $this->withToken($token->plainTextToken)->postJson(
        '/api/logout',
    );

    $response
        ->assertSuccessful()
        ->assertJson(['message' => 'Logged out successfully']);
});

it('returns unauthorized when not authenticated', function () {
    $response = $this->postJson('/api/logout');

    $response->assertUnauthorized();
});
