<?php

declare(strict_types=1);

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Broadcast;

uses(RefreshDatabase::class);

test('can authenticate broadcasting channel', function () {
    $user = User::factory()->create();
    $token = $user->createToken('test-token')->plainTextToken;

    // Mock the Broadcast::auth method to return expected auth data
    Broadcast::shouldReceive('auth')->andReturn([
        'auth' => 'test-auth-token',
        'channel_data' => '{"id":"' . $user->id . '","name":"Test"}',
    ]);

    $response = $this->withToken($token)->postJson('/api/broadcasting/auth', [
        'socket_id' => 'socket-123',
        'channel_name' => 'App.Models.User.' . $user->id,
    ]);

    $response
        ->assertSuccessful()
        ->assertJson([
            'auth' => 'test-auth-token',
            'channel_data' => '{"id":"' . $user->id . '","name":"Test"}',
        ]);
});

test('supports string auth responses', function () {
    $user = User::factory()->create();
    $token = $user->createToken('test-token')->plainTextToken;

    Broadcast::shouldReceive('auth')->andReturn('test-auth-string');

    $response = $this->withToken($token)->postJson('/api/broadcasting/auth', [
        'socket_id' => 'socket-123',
        'channel_name' => 'online',
    ]);

    $response
        ->assertSuccessful()
        ->assertJson([
            'auth' => 'test-auth-string',
            'channel_data' => null,
        ]);
});

test('returns 401 when user is not authenticated', function () {
    $response = $this->postJson('/api/broadcasting/auth', [
        'socket_id' => 'socket-123',
        'channel_name' => 'test-channel',
    ]);

    $response->assertUnauthorized();
});

test('returns 403 when channel authentication fails', function () {
    $user = User::factory()->create();
    $token = $user->createToken('test-token')->plainTextToken;

    Broadcast::shouldReceive('auth')->andThrow(new \RuntimeException('fail'));

    $response = $this->withToken($token)->postJson('/api/broadcasting/auth', [
        'socket_id' => 'socket-123',
        'channel_name' => 'invalid-channel',
    ]);

    $response->assertForbidden();
});
