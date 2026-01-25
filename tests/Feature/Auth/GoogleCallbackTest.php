<?php

declare(strict_types=1);

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\User as SocialiteTwoUser;

uses(RefreshDatabase::class);

it('creates new user and logs them in when Google account is not linked', function (): void {
    // Mock Google user data
    $googleUser = $this->createMock(SocialiteTwoUser::class);
    $googleUser->method('getId')->willReturn('google123');
    $googleUser->method('getEmail')->willReturn('newuser@example.com');
    $googleUser->method('getName')->willReturn('New User');

    // Mock Socialite driver
    $driver = $this->createMock(\Laravel\Socialite\Two\GoogleProvider::class);
    $driver->method('user')->willReturn($googleUser);
    $driver->method('stateless')->willReturnSelf();

    Socialite::shouldReceive('driver')->with('google')->andReturn($driver);

    // Make request to callback
    $response = $this->get('/auth/google/callback');

    // Should redirect to home
    $response->assertRedirect('/?auth=success');

    // User should be created and authenticated
    $user = User::where('google_id', 'google123')->first();
    expect($user)->not->toBeNull();
    expect($user->email)->toBe('newuser@example.com');
    expect($user->name)->toBe('New User');
    expect($user->verified_google_email)->toBe('newuser@example.com');
    expect($user->email_verified_at)->not->toBeNull();

    $this->assertAuthenticatedAs($user);
});

it('logs in existing user linked by Google ID', function (): void {
    $existingUser = User::factory()->create([
        'google_id' => 'google123',
        'email' => 'existing@example.com',
        'name' => 'Existing User',
    ]);

    // Mock Google user data
    $googleUser = $this->createMock(SocialiteTwoUser::class);
    $googleUser->method('getId')->willReturn('google123');
    $googleUser->method('getEmail')->willReturn('existing@example.com');
    $googleUser->method('getName')->willReturn('Updated Name');

    // Mock Socialite driver
    $driver = $this->createMock(\Laravel\Socialite\Two\GoogleProvider::class);
    $driver->method('user')->willReturn($googleUser);
    $driver->method('stateless')->willReturnSelf();

    Socialite::shouldReceive('driver')->with('google')->andReturn($driver);

    // Make request to callback
    $response = $this->get('/auth/google/callback');

    // Should redirect to home
    $response->assertRedirect('/?auth=success');

    // Should be authenticated as existing user
    $this->assertAuthenticatedAs($existingUser);

    // User data should NOT be updated for existing Google-linked users
    $existingUser->refresh();
    expect($existingUser->name)->toBe('Existing User');
});

it('links Google account to existing user by email', function (): void {
    $existingUser = User::factory()->create([
        'email' => 'existing@example.com',
        'name' => 'Existing User',
        'google_id' => null,
    ]);

    // Mock Google user data
    $googleUser = $this->createMock(SocialiteTwoUser::class);
    $googleUser->method('getId')->willReturn('google123');
    $googleUser->method('getEmail')->willReturn('existing@example.com');
    $googleUser->method('getName')->willReturn('Google Name');

    // Mock Socialite driver
    $driver = $this->createMock(\Laravel\Socialite\Two\GoogleProvider::class);
    $driver->method('user')->willReturn($googleUser);
    $driver->method('stateless')->willReturnSelf();

    Socialite::shouldReceive('driver')->with('google')->andReturn($driver);

    // Make request to callback
    $response = $this->get('/auth/google/callback');

    // Should redirect to home
    $response->assertRedirect('/?auth=success');

    // Should be authenticated as existing user
    $this->assertAuthenticatedAs($existingUser);

    // User should now have Google ID linked
    $existingUser->refresh();
    expect($existingUser->google_id)->toBe('google123');
    expect($existingUser->verified_google_email)->toBe('existing@example.com');
    expect($existingUser->email_verified_at)->not->toBeNull();
});

it('links Google account to currently authenticated user', function (): void {
    $currentUser = User::factory()->create([
        'email' => 'current@example.com',
        'name' => 'Current User',
        'google_id' => null,
    ]);

    // Authenticate the user
    $this->actingAs($currentUser);

    // Mock Google user data
    $googleUser = $this->createMock(SocialiteTwoUser::class);
    $googleUser->method('getId')->willReturn('google123');
    $googleUser->method('getEmail')->willReturn('google@example.com');
    $googleUser->method('getName')->willReturn('Google Name');

    // Mock Socialite driver
    $driver = $this->createMock(\Laravel\Socialite\Two\GoogleProvider::class);
    $driver->method('user')->willReturn($googleUser);
    $driver->method('stateless')->willReturnSelf();

    Socialite::shouldReceive('driver')->with('google')->andReturn($driver);

    // Make request to callback
    $response = $this->get('/auth/google/callback');

    // Should redirect to home
    $response->assertRedirect('/profile?auth=success');

    // Should still be authenticated as the same user
    $this->assertAuthenticatedAs($currentUser);

    // User should now have Google ID linked
    $currentUser->refresh();
    expect($currentUser->google_id)->toBe('google123');
    expect($currentUser->verified_google_email)->toBe('google@example.com');
    expect($currentUser->name)->toBe('Google Name');
});

it('rejects when Google account is already linked to different user', function (): void {
    $otherUser = User::factory()->create([
        'google_id' => 'google123',
        'email' => 'other@example.com',
    ]);

    $currentUser = User::factory()->create([
        'email' => 'current@example.com',
    ]);

    // Authenticate as current user
    $this->actingAs($currentUser);

    // Mock Google user data
    $googleUser = $this->createMock(SocialiteTwoUser::class);
    $googleUser->method('getId')->willReturn('google123');
    $googleUser->method('getEmail')->willReturn('other@example.com');

    // Mock Socialite driver
    $driver = $this->createMock(\Laravel\Socialite\Two\GoogleProvider::class);
    $driver->method('user')->willReturn($googleUser);
    $driver->method('stateless')->willReturnSelf();

    Socialite::shouldReceive('driver')->with('google')->andReturn($driver);

    // Make request to callback
    $response = $this->get('/auth/google/callback');

    // Should redirect to profile with error
    $response->assertRedirect(
        '/profile?auth=error&message='
            . urlencode(
                'This Google account is already connected to another user.',
            ),
    );

    // Should still be authenticated as current user
    $this->assertAuthenticatedAs($currentUser);
});

it('rejects when email already exists for different user', function (): void {
    $existingUser = User::factory()->create([
        'email' => 'existing@example.com',
    ]);

    $currentUser = User::factory()->create([
        'email' => 'current@example.com',
    ]);

    // Authenticate as current user
    $this->actingAs($currentUser);

    // Mock Google user data
    $googleUser = $this->createMock(SocialiteTwoUser::class);
    $googleUser->method('getId')->willReturn('google123');
    $googleUser->method('getEmail')->willReturn('existing@example.com');

    // Mock Socialite driver
    $driver = $this->createMock(\Laravel\Socialite\Two\GoogleProvider::class);
    $driver->method('user')->willReturn($googleUser);
    $driver->method('stateless')->willReturnSelf();

    Socialite::shouldReceive('driver')->with('google')->andReturn($driver);

    // Make request to callback
    $response = $this->get('/auth/google/callback');

    // Should redirect to profile with error
    $response->assertRedirect(
        '/profile?auth=error&message='
            . urlencode(
                'A user with this email already exists. Please use the same email account.',
            ),
    );

    // Should still be authenticated as current user
    $this->assertAuthenticatedAs($currentUser);
});

it('rejects when Google does not provide email', function (): void {
    // Mock Google user data without email
    $googleUser = $this->createMock(SocialiteTwoUser::class);
    $googleUser->method('getId')->willReturn('google123');
    $googleUser->method('getEmail')->willReturn(null);

    // Mock Socialite driver
    $driver = $this->createMock(\Laravel\Socialite\Two\GoogleProvider::class);
    $driver->method('user')->willReturn($googleUser);
    $driver->method('stateless')->willReturnSelf();

    Socialite::shouldReceive('driver')->with('google')->andReturn($driver);

    // Make request to callback
    $response = $this->get('/auth/google/callback');

    // Should redirect to login with error
    $response->assertRedirect(
        '/login?auth=error&message='
            . urlencode(
                'Google did not provide an email address. Please grant email access and try again.',
            ),
    );

    // Should not be authenticated
    $this->assertGuest();
});

it('rejects when Google does not provide email and user is authenticated', function (): void {
    $currentUser = User::factory()->create();
    $this->actingAs($currentUser);

    // Mock Google user data without email
    $googleUser = $this->createMock(SocialiteTwoUser::class);
    $googleUser->method('getId')->willReturn('google123');
    $googleUser->method('getEmail')->willReturn(null);

    // Mock Socialite driver
    $driver = $this->createMock(\Laravel\Socialite\Two\GoogleProvider::class);
    $driver->method('user')->willReturn($googleUser);
    $driver->method('stateless')->willReturnSelf();

    Socialite::shouldReceive('driver')->with('google')->andReturn($driver);

    // Make request to callback
    $response = $this->get('/auth/google/callback');

    // Should redirect to profile with error
    $response->assertRedirect(
        '/profile?auth=error&message='
            . urlencode(
                'Google did not provide an email address. Please grant email access and try again.',
            ),
    );

    // Should still be authenticated
    $this->assertAuthenticatedAs($currentUser);
});

it('handles exceptions gracefully', function (): void {
    // Mock Socialite driver to throw exception
    Socialite::shouldReceive('driver')
        ->with('google')
        ->andThrow(new \Exception('OAuth error'));

    // Make request to callback
    $response = $this->get('/auth/google/callback');

    // Should redirect to login
    $response->assertRedirect('/login');

    // Should not be authenticated
    $this->assertGuest();
});

it('handles exceptions gracefully when user is authenticated', function (): void {
    $currentUser = User::factory()->create();
    $this->actingAs($currentUser);

    // Mock Socialite driver to throw exception
    Socialite::shouldReceive('driver')
        ->with('google')
        ->andThrow(new \Exception('OAuth error'));

    // Make request to callback
    $response = $this->get('/auth/google/callback');

    // Should redirect to profile
    $response->assertRedirect('/profile');

    // Should still be authenticated
    $this->assertAuthenticatedAs($currentUser);
});
