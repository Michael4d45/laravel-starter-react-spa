<?php

declare(strict_types=1);

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('can register a new user', function (): void {
    $data = [
        'name' => 'John Doe',
        'email' => 'john@example.com',
        'password' => 'password123',
        'password_confirmation' => 'password123',
    ];

    $csrfToken = csrf_token();
    $response = $this->withSession([
        '_token' => $csrfToken,
    ])->postJson('/register', array_merge($data, [
        '_token' => $csrfToken,
    ]));

    $response
        ->assertStatus(200)
        ->assertJsonStructure([
            'message',
        ]);

    $this->assertDatabaseHas('users', [
        'name' => 'John Doe',
        'email' => 'john@example.com',
    ]);

    $user = User::where('email', 'john@example.com')->first();
    expect($user)->not->toBeNull();
    expect($user->name)->toBe('John Doe');

    // User should be session-authenticated after registration
    $this->assertAuthenticatedAs($user);
});
