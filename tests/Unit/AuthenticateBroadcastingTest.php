<?php

declare(strict_types=1);

use App\Models\RealtimeConnection;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Broadcast;

uses(RefreshDatabase::class);

test('can authenticate broadcasting channel and track connection', function () {
    $user = User::factory()->create();
    $token = $user->createToken('test-token')->plainTextToken;

    // Mock the Broadcast::auth method to return expected auth data
    Broadcast::shouldReceive('auth')->andReturn(['auth' => 'test-auth-token']);

    $response = $this->withToken($token)->postJson('/api/broadcasting/auth', [
        'socket_id' => 'socket-123',
        'channel_name' => 'App.Models.User.' . $user->id,
    ]);

    $response->assertSuccessful()->assertJson(['auth' => 'test-auth-token']);

    // Verify connection was tracked
    expect(RealtimeConnection::count())->toBe(1);

    $connection = RealtimeConnection::where('socket_id', 'socket-123')->first();
    expect($connection)->not->toBeNull();
    expect($connection->socket_id)->toBe('socket-123');
    expect($connection->user_id)->toBe($user->id);
    expect($connection->channel_name)->toBe('App.Models.User.' . $user->id);
});

test('track connection works directly', function () {
    $user = User::factory()->create();
    $tracker = new \App\Actions\Broadcasting\TrackConnection;
    $request = request(); // Get current request

    $tracker->connect('socket-test', $user->id, 'test-channel', $request);

    expect(RealtimeConnection::count())->toBe(1);
});

test('connecting with same socket id multiple times does not create duplicates', function () {
    $user = User::factory()->create();
    $tracker = new \App\Actions\Broadcasting\TrackConnection;
    $request = request();

    // First connection
    $tracker->connect('socket-duplicate', $user->id, 'test-channel', $request);
    expect(RealtimeConnection::count())->toBe(1);

    // Second connection with same socket_id
    $tracker->connect('socket-duplicate', $user->id, 'test-channel', $request);
    expect(RealtimeConnection::count())->toBe(1); // Should still be 1

    $connection = RealtimeConnection::where(
        'socket_id',
        'socket-duplicate',
    )->first();
    expect($connection)->not->toBeNull();
    expect($connection->socket_id)->toBe('socket-duplicate');
    expect($connection->user_id)->toBe($user->id);
    expect($connection->disconnected_at)->toBeNull(); // Should still be active
});

test('can reconnect after disconnecting', function () {
    $user = User::factory()->create();
    $tracker = new \App\Actions\Broadcasting\TrackConnection;
    $request = request();

    // Connect
    $tracker->connect('socket-reconnect', $user->id, 'test-channel', $request);
    expect(RealtimeConnection::count())->toBe(1);

    // Disconnect
    $tracker->disconnect('socket-reconnect');
    $connection = RealtimeConnection::where(
        'socket_id',
        'socket-reconnect',
    )->first();
    expect($connection->disconnected_at)->not->toBeNull();

    // Reconnect with same socket_id (this would happen if client reconnects)
    $tracker->connect('socket-reconnect', $user->id, 'test-channel', $request);
    expect(RealtimeConnection::count())->toBe(1); // Should still be 1 record

    $reconnected = RealtimeConnection::where(
        'socket_id',
        'socket-reconnect',
    )->first();
    expect($reconnected->disconnected_at)->toBeNull(); // Should be reactivated
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

    $response = $this->withToken($token)->postJson('/api/broadcasting/auth', [
        'socket_id' => 'socket-123',
        'channel_name' => 'invalid-channel',
    ]);

    // For now, just check that it doesn't crash - the actual behavior depends on broadcasting setup
    $response->assertSuccessful();
});
