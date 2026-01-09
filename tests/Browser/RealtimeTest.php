<?php

declare(strict_types=1);

use App\Events\TestRealtimeEvent;
use App\Models\User;
use Illuminate\Support\Facades\Event;

beforeEach(function () {
    setup_log_capture('realtime.log');
});

afterEach(function () {
    assert_no_log_errors(storage_path('logs/realtime.log'));
});

/*
 |--------------------------------------------------------------------------
 | Broadcasting Tests (CI/CD Compatible)
 |--------------------------------------------------------------------------
 |
 | These tests verify broadcasting logic without requiring Reverb to run.
 | They use Event::fake() to mock the broadcasting layer.
 |
 */

it('dispatches broadcast event when API is called', function (): void {
    Event::fake([TestRealtimeEvent::class]);

    $user = User::factory()->create();
    $token = $user->createToken('test-token')->plainTextToken;

    $response = $this->postJson(
        '/api/trigger-test-event',
        [
            'message' => 'Test broadcast message',
        ],
        [
            'Authorization' => 'Bearer ' . $token,
        ],
    );

    $response->assertOk()->assertJson(['success' => true]);

    // Verify the event was dispatched with correct data
    Event::assertDispatched(TestRealtimeEvent::class, function ($event) use (
        $user,
    ) {
        return (
            $event->user->id === $user->id
            && $event->message === 'Test broadcast message'
        );
    });
});

it('broadcasts to correct private channel', function (): void {
    $user = User::factory()->create();

    $event = new TestRealtimeEvent($user, 'Channel test');

    $channels = $event->broadcastOn();

    expect($channels)->toHaveCount(1);
    expect($channels[0]->name)->toBe('private-App.Models.User.' . $user->id);
});

it('includes correct payload in broadcast', function (): void {
    $user = User::factory()->create();

    $event = new TestRealtimeEvent($user, 'Payload test');

    $payload = $event->broadcastWith();

    expect($payload)->toHaveKey('message', 'Payload test');
    expect($payload)->toHaveKey('timestamp');
});

/*
 |--------------------------------------------------------------------------
 | UI Component Tests
 |--------------------------------------------------------------------------
 |
 | These tests verify the RealtimeNotifications component renders correctly
 | for authenticated and unauthenticated users.
 |
 */

it('shows real-time notifications component for authenticated users', function (): void {
    $user = User::factory()->create();
    $this->actingAs($user);

    visit('/')
        ->assertNoJavaScriptErrors()
        ->waitForText('Welcome back', 10)
        ->waitForText('Sign out', 10)
        ->waitForText('Real-time Updates', 10)
        ->assertSee('No real-time messages yet');
});

it('hides real-time notifications for unauthenticated users', function (): void {
    visit('/')
        ->assertNoJavaScriptErrors()
        ->waitForText('Welcome', 10)
        ->assertDontSee('Real-time Updates');
});
