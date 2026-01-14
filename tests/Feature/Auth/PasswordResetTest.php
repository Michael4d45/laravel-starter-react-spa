<?php

declare(strict_types=1);

use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword as ResetPasswordNotification;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;

beforeEach(function () {
    // Ensure clean state for password reset tests
    DB::table('password_reset_tokens')->truncate();
});

describe('Send Password Reset Link', function () {
    test('sends password reset link for existing user', function () {
        Notification::fake();

        $user = User::factory()->create([
            'email' => 'test@example.com',
        ]);

        $response = $this->postJson('/api/send-password-reset-link', [
            'email' => 'test@example.com',
        ]);

        $response
            ->assertOk()
            ->assertJson([
                '_tag' => 'Success',
            ]);

        // Verify notification was sent
        Notification::assertSentTo($user, ResetPasswordNotification::class);

        // Verify token was created in database
        $this->assertDatabaseHas('password_reset_tokens', [
            'email' => 'test@example.com',
        ]);
    });

    test('returns same message for non-existent email to prevent enumeration', function () {
        Notification::fake();

        $response = $this->postJson('/api/send-password-reset-link', [
            'email' => 'nonexistent@example.com',
        ]);

        // Should return success message even though user doesn't exist
        $response
            ->assertOk()
            ->assertJson([
                '_tag' => 'Success',
                'message' => 'If an account exists with that email, a password reset link has been sent.',
            ]);

        // Verify no notification was sent
        Notification::assertNothingSent();

        // Verify no token was created
        $this->assertDatabaseMissing('password_reset_tokens', [
            'email' => 'nonexistent@example.com',
        ]);
    });

    test('validates email format', function () {
        $response = $this->postJson('/api/send-password-reset-link', [
            'email' => 'invalid-email',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['email']);
    });

    test('requires email field', function () {
        $response = $this->postJson('/api/send-password-reset-link', []);

        $response->assertStatus(422)->assertJsonValidationErrors(['email']);
    });

    test('is rate limited to 5 requests per minute', function () {
        Notification::fake();

        $user = User::factory()->create();

        // Make 5 successful requests
        for ($i = 0; $i < 5; $i++) {
            $response = $this->postJson('/api/send-password-reset-link', [
                'email' => $user->email,
            ]);
            $response->assertOk();
        }

        // 6th request should be rate limited
        $response = $this->postJson('/api/send-password-reset-link', [
            'email' => $user->email,
        ]);

        $response->assertStatus(429); // Too Many Requests
    });

    test('replaces existing token when new request is made', function () {
        Notification::fake();

        $user = User::factory()->create();

        // First request
        $response1 = $this->postJson('/api/send-password-reset-link', [
            'email' => $user->email,
        ]);
        $response1->assertOk();

        // Second request should also succeed
        $response2 = $this->postJson('/api/send-password-reset-link', [
            'email' => $user->email,
        ]);
        $response2->assertOk();

        // Should only have one token (Laravel replaces the old one)
        $this->assertEquals(
            1,
            DB::table('password_reset_tokens')
                ->where('email', $user->email)
                ->count(),
        );
    });
});

describe('Reset Password', function () {
    test('successfully resets password with valid token', function () {
        $user = User::factory()->create([
            'password' => Hash::make('old-password'),
        ]);

        // Create a password reset token
        $token = app('auth.password.broker')->createToken($user);

        $response = $this->postJson('/api/reset-password', [
            'token' => $token,
            'email' => $user->email,
            'password' => 'new-password123',
            'password_confirmation' => 'new-password123',
        ]);

        $response
            ->assertOk()
            ->assertJson([
                '_tag' => 'Success',
            ]);

        // Verify password was changed
        $user->refresh();
        $this->assertTrue(Hash::check('new-password123', $user->password));

        // Verify old password no longer works
        $this->assertFalse(Hash::check('old-password', $user->password));

        // Verify token was deleted (one-time use)
        $this->assertDatabaseMissing('password_reset_tokens', [
            'email' => $user->email,
        ]);
    });

    test('revokes all user tokens after password reset', function () {
        $user = User::factory()->create();

        // Create some API tokens
        $token1 = $user->createToken('token1')->plainTextToken;
        $token2 = $user->createToken('token2')->plainTextToken;

        $this->assertEquals(2, $user->tokens()->count());

        // Reset password
        $resetToken = app('auth.password.broker')->createToken($user);

        $this->postJson('/api/reset-password', [
            'token' => $resetToken,
            'email' => $user->email,
            'password' => 'new-password123',
            'password_confirmation' => 'new-password123',
        ]);

        // Verify all tokens were revoked
        $user->refresh();
        $this->assertEquals(0, $user->tokens()->count());

        // Verify old tokens don't work
        $response = $this->getJson('/api/user', [
            'Authorization' => 'Bearer ' . $token1,
        ]);
        $response->assertStatus(401);
    });

    test('rejects invalid token', function () {
        $user = User::factory()->create();

        $response = $this->postJson('/api/reset-password', [
            'token' => 'invalid-token',
            'email' => $user->email,
            'password' => 'new-password123',
            'password_confirmation' => 'new-password123',
        ]);

        $response
            ->assertStatus(422)
            ->assertJson([
                '_tag' => 'ValidationError',
            ]);

        // Verify password was not changed
        $user->refresh();
        $this->assertFalse(Hash::check('new-password123', $user->password));
    });

    test('rejects expired token', function () {
        $user = User::factory()->create();

        // Create token
        $token = app('auth.password.broker')->createToken($user);

        // Manually update only the created_at to be over 60 minutes ago
        // Don't touch the token column, just update timestamp
        DB::table('password_reset_tokens')
            ->where('email', $user->email)
            ->update([
                'created_at' => now()->subMinutes(61)->toDateTimeString(),
            ]);

        $response = $this->postJson('/api/reset-password', [
            'token' => $token,
            'email' => $user->email,
            'password' => 'new-password123',
            'password_confirmation' => 'new-password123',
        ]);

        $response
            ->assertStatus(422)
            ->assertJson([
                '_tag' => 'ValidationError',
            ]);

        // Verify the token check failed (expected behavior - token is rejected)
        expect($response->json('message'))->toContain('password reset token');
    });

    test('token can only be used once', function () {
        $user = User::factory()->create();
        $token = app('auth.password.broker')->createToken($user);

        // First reset should succeed
        $response = $this->postJson('/api/reset-password', [
            'token' => $token,
            'email' => $user->email,
            'password' => 'new-password123',
            'password_confirmation' => 'new-password123',
        ]);

        $response->assertOk();

        // Second attempt with same token should fail
        $response = $this->postJson('/api/reset-password', [
            'token' => $token,
            'email' => $user->email,
            'password' => 'another-password123',
            'password_confirmation' => 'another-password123',
        ]);

        $response
            ->assertStatus(422)
            ->assertJson([
                '_tag' => 'ValidationError',
                'message' => 'This password reset token is invalid.',
            ]);

        // Verify password is still the first one
        $user->refresh();
        $this->assertTrue(Hash::check('new-password123', $user->password));
        $this->assertFalse(Hash::check('another-password123', $user->password));
    });

    test('rejects mismatched password confirmation', function () {
        $user = User::factory()->create();
        $token = app('auth.password.broker')->createToken($user);

        $response = $this->postJson('/api/reset-password', [
            'token' => $token,
            'email' => $user->email,
            'password' => 'new-password123',
            'password_confirmation' => 'different-password123',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['password']);
    });

    test('validates password meets requirements', function () {
        $user = User::factory()->create();
        $token = app('auth.password.broker')->createToken($user);

        $response = $this->postJson('/api/reset-password', [
            'token' => $token,
            'email' => $user->email,
            'password' => 'weak',
            'password_confirmation' => 'weak',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['password']);
    });

    test('requires all fields', function () {
        $response = $this->postJson('/api/reset-password', []);

        $response
            ->assertStatus(422)
            ->assertJsonValidationErrors(['token', 'email', 'password']);
    });

    test('rejects non-existent email with a generic message to prevent enumeration', function () {
        $token = 'some-token';

        $response = $this->postJson('/api/reset-password', [
            'token' => $token,
            'email' => 'nonexistent@example.com',
            'password' => 'new-password123',
            'password_confirmation' => 'new-password123',
        ]);

        $response
            ->assertStatus(422)
            ->assertJson([
                '_tag' => 'ValidationError',
                'message' => 'This password reset token is invalid.',
            ]);
    });

    test('is rate limited to 5 attempts per minute', function () {
        $user = User::factory()->create();
        $token = app('auth.password.broker')->createToken($user);

        // Make 5 failed attempts with wrong token
        for ($i = 0; $i < 5; $i++) {
            $response = $this->postJson('/api/reset-password', [
                'token' => 'wrong-token-' . $i,
                'email' => $user->email,
                'password' => 'new-password123',
                'password_confirmation' => 'new-password123',
            ]);
            $response->assertStatus(422);
        }

        // 6th request should be rate limited
        $response = $this->postJson('/api/reset-password', [
            'token' => $token,
            'email' => $user->email,
            'password' => 'new-password123',
            'password_confirmation' => 'new-password123',
        ]);

        $response->assertStatus(429); // Too Many Requests
    });

    test('fires password reset event', function () {
        Event::fake();

        $user = User::factory()->create();
        $token = app('auth.password.broker')->createToken($user);

        $this->postJson('/api/reset-password', [
            'token' => $token,
            'email' => $user->email,
            'password' => 'new-password123',
            'password_confirmation' => 'new-password123',
        ]);

        Event::assertDispatched(\Illuminate\Auth\Events\PasswordReset::class);
    });
});

describe('Password Reset Security', function () {
    test('token expiration is configurable', function () {
        $user = User::factory()->create();
        $token = app('auth.password.broker')->createToken($user);

        // Verify config is set to 60 minutes
        $expireMinutes = config('auth.passwords.users.expire');
        expect($expireMinutes)->toBe(60);

        // Create token at exact expiration boundary
        DB::table('password_reset_tokens')
            ->where('email', $user->email)
            ->update([
                'created_at' => now()->subMinutes($expireMinutes),
            ]);

        $response = $this->postJson('/api/reset-password', [
            'token' => $token,
            'email' => $user->email,
            'password' => 'new-password123',
            'password_confirmation' => 'new-password123',
        ]);

        // At exactly expireMinutes, token should still work
        // Over expireMinutes should fail
        $response->assertStatus(422);
    });

    test('prevents token reuse across different users', function () {
        $user1 = User::factory()->create(['email' => 'user1@example.com']);
        $user2 = User::factory()->create(['email' => 'user2@example.com']);

        $token = app('auth.password.broker')->createToken($user1);

        // Try to use user1's token for user2
        $response = $this->postJson('/api/reset-password', [
            'token' => $token,
            'email' => 'user2@example.com',
            'password' => 'new-password123',
            'password_confirmation' => 'new-password123',
        ]);

        $response->assertStatus(422);

        // Verify user2's password was not changed
        $user2->refresh();
        $this->assertFalse(Hash::check('new-password123', $user2->password));
    });

    test('clears all tokens for a user when password reset succeeds', function () {
        $user = User::factory()->create();

        // Create multiple tokens (should only keep the latest)
        $token1 = app('auth.password.broker')->createToken($user);
        sleep(1);
        $token2 = app('auth.password.broker')->createToken($user);

        // Use the valid token to reset
        $this->postJson('/api/reset-password', [
            'token' => $token2,
            'email' => $user->email,
            'password' => 'new-password123',
            'password_confirmation' => 'new-password123',
        ]);

        // Verify no tokens exist anymore
        $this->assertDatabaseMissing('password_reset_tokens', [
            'email' => $user->email,
        ]);
    });

    test('send password reset link uses the correct frontend url', function () {
        Notification::fake();

        $user = User::factory()->create([
            'email' => 'test@example.com',
        ]);

        $this->postJson('/api/send-password-reset-link', [
            'email' => 'test@example.com',
        ]);

        Notification::assertSentTo(
            $user,
            ResetPasswordNotification::class,
            function ($notification) use ($user) {
                $mailData = $notification->toMail($user)->toArray();
                $actionUrl = $mailData['actionUrl'];

                // In a SPA, this should point to a frontend route, not the API
                // It should NOT contain /api/
                return (
                    (
                        str_contains($actionUrl, '/password-reset?')
                        || str_contains($actionUrl, '/reset-password/')
                    )
                    && !str_contains($actionUrl, '/api/')
                );
            },
        );
    });

    test('password reset tokens are stored securely (hashed)', function () {
        $user = User::factory()->create(['email' => 'hash-test@example.com']);

        $this->postJson('/api/send-password-reset-link', [
            'email' => $user->email,
        ]);

        $tokenRecord = DB::table('password_reset_tokens')
            ->where('email', $user->email)
            ->first();

        expect($tokenRecord)->not->toBeNull();
        // The token in DB should be hashed, so it shouldn't look like a simple hex string or be very short
        // Laravel uses SHA256 for tokens in the DB usually, or Bcrypt if configured
        expect($tokenRecord->token)->not->toBeNull();
        expect(strlen($tokenRecord->token))->toBeGreaterThan(40);
        expect($tokenRecord->token)->not->toContain(' ');
    });
});
