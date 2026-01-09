<?php

declare(strict_types=1);

use App\Actions\Broadcasting\TrackConnection;
use App\Console\Commands\MonitorRealtimeConnections;
use App\Models\RealtimeConnection;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;

uses(RefreshDatabase::class);

test('can track realtime connections', function () {
    $user = User::factory()->create();
    $tracker = app(TrackConnection::class);

    $request = Request::create(
        '/',
        'POST',
        [],
        [],
        [],
        [
            'REMOTE_ADDR' => '127.0.0.1',
            'HTTP_USER_AGENT' => 'Test Browser',
        ],
    );

    // Track a connection
    $tracker->connect(
        'socket-123',
        $user->id,
        'App.Models.User.' . $user->id,
        $request,
    );

    // Verify connection was tracked
    expect(RealtimeConnection::count())->toBe(1);

    $connection = RealtimeConnection::first();
    expect($connection->socket_id)->toBe('socket-123');
    expect($connection->user_id)->toBe($user->id);
    expect($connection->channel_name)->toBe('App.Models.User.' . $user->id);
    expect($connection->ip_address)->toBe('127.0.0.1');
    expect($connection->disconnected_at)->toBeNull();

    // Track disconnection
    $tracker->disconnect('socket-123');

    $connection->refresh();
    expect($connection->disconnected_at)->not->toBeNull();
});

test('can get active connection count', function () {
    $user = User::factory()->create();
    $tracker = app(TrackConnection::class);
    $request = Request::create('/', 'POST');

    // Create multiple connections
    $tracker->connect(
        'socket-1',
        $user->id,
        'App.Models.User.' . $user->id,
        $request,
    );
    $tracker->connect(
        'socket-2',
        $user->id,
        'App.Models.User.' . $user->id,
        $request,
    );

    expect($tracker->getActiveConnectionCount())->toBe(2);

    // Disconnect one
    $tracker->disconnect('socket-1');

    expect($tracker->getActiveConnectionCount())->toBe(1);
});

test('monitoring command displays connection info', function () {
    $user = User::factory()->create();
    $tracker = app(TrackConnection::class);
    $request = Request::create('/', 'POST');

    // Create a connection
    $tracker->connect(
        'socket-test',
        $user->id,
        'App.Models.User.' . $user->id,
        $request,
    );

    $command = new MonitorRealtimeConnections;
    $command->setLaravel(app());

    // Capture command output
    $this
        ->artisan('app:monitor-realtime-connections')
        ->expectsOutput('=== Realtime Connections Monitor ===')
        ->expectsOutput('Total registered users: 1')
        ->expectsOutput('Active tracked connections: 1')
        ->assertSuccessful();
});
