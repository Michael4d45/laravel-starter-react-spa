<?php

declare(strict_types=1);

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('can login a user and establishes session', function (): void {
    $user = User::factory()->create([
        'email' => 'test@example.com',
        'password' => bcrypt('password123'),
    ]);

    $csrfToken = csrf_token();
    $response = $this->withSession([
        '_token' => $csrfToken,
    ])->postJson('/login', [
        'email' => 'test@example.com',
        'password' => 'password123',
        '_token' => $csrfToken,
    ]);

    $response
        ->assertStatus(200)
        ->assertJsonStructure([
            'message',
        ]);

    // User should be session-authenticated after login
    $this->assertAuthenticatedAs($user);
});

it('rejects invalid credentials', function (): void {
    User::factory()->create([
        'email' => 'test@example.com',
        'password' => bcrypt('password123'),
    ]);

    $csrfToken = csrf_token();
    $response = $this->withSession([
        '_token' => $csrfToken,
    ])->postJson('/login', [
        'email' => 'test@example.com',
        'password' => 'wrong-password',
        '_token' => $csrfToken,
    ]);

    $response->assertStatus(422);
    $this->assertGuest();
});

it('rate limits login attempts', function (): void {
    User::factory()->create([
        'email' => 'test@example.com',
        'password' => bcrypt('password123'),
    ]);

    $csrfToken = csrf_token();

    // Make 5 failed attempts
    for ($i = 0; $i < 5; $i++) {
        $this->withSession([
            '_token' => $csrfToken,
        ])->postJson('/login', [
            'email' => 'test@example.com',
            'password' => 'wrong-password',
            '_token' => $csrfToken,
        ]);
    }

    // 6th attempt should be rate limited
    $response = $this->withSession([
        '_token' => $csrfToken,
    ])->postJson('/login', [
        'email' => 'test@example.com',
        'password' => 'wrong-password',
        '_token' => $csrfToken,
    ]);

    $response->assertStatus(422);
    expect($response->json('message'))->toContain('Too many login attempts');
});
