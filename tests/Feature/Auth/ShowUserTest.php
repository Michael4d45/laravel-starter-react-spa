<?php

declare(strict_types=1);

namespace Tests\Feature\Auth;

use App\Models\User;

test('it can fetch the authenticated user', function () {
    $user = User::factory()->create([
        'name' => 'John Doe',
        'email' => 'john@example.com',
    ]);

    $this->actingAs($user);

    $response = $this->getJson('/api/user');

    $response->assertSuccessful();
    $response->assertJson([
        'id' => $user->id,
        'name' => 'John Doe',
        'email' => 'john@example.com',
    ]);
});

test('it returns unauthorized when not authenticated', function () {
    $response = $this->getJson('/api/user');

    $response->assertStatus(401);
    $response->assertJson([
        'message' => 'Unauthenticated.',
    ]);
});
