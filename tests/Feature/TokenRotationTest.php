<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TokenRotationTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test that expired tokens are rejected
     */
    public function test_expired_token_is_rejected(): void
    {
        $user = User::factory()->create();

        // Create a token that expires in the past
        $token = $user->createToken('api-token');
        $token->accessToken->update([
            'expires_at' => now()->subHour(),
        ]);

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token->plainTextToken,
        ])->getJson('/api/user');

        $response->assertStatus(401);
        $response->assertJson([
            '_tag' => 'AuthenticationError',
            'message' => 'Token has expired.',
        ]);
    }

    /**
     * Test that tokens within rotation window get rotated
     */
    public function test_token_rotation_within_24_hours_of_expiry(): void
    {
        $user = User::factory()->create();

        // Create a token that expires in 12 hours (within 24-hour rotation window)
        $token = $user->createToken('api-token');
        $token->accessToken->update([
            'expires_at' => now()->addHours(12),
        ]);

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token->plainTextToken,
        ])->getJson('/api/user');

        $response->assertStatus(200);

        // Should have a new token in the response header
        static::assertTrue($response->headers->has('X-New-Token'));

        // New token should be different from old token
        $newToken = $response->headers->get('X-New-Token');
        static::assertNotEquals($token->plainTextToken, $newToken);

        // Old token should be deleted
        $this->assertDatabaseMissing('personal_access_tokens', [
            'id' => $token->accessToken->id,
        ]);
    }

    /**
     * Test that tokens outside rotation window don't get rotated
     */
    public function test_token_not_rotated_when_far_from_expiry(): void
    {
        $user = User::factory()->create();

        // Create a token that expires in 3 days (outside 24-hour rotation window)
        $token = $user->createToken('api-token');
        $token->accessToken->update([
            'expires_at' => now()->addDays(3),
        ]);

        $oldTokenId = $token->accessToken->id;

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token->plainTextToken,
        ])->getJson('/api/user');

        $response->assertStatus(200);

        // Should NOT have a new token in the response header
        static::assertFalse($response->headers->has('X-New-Token'));

        // Old token should still exist
        $this->assertDatabaseHas('personal_access_tokens', [
            'id' => $oldTokenId,
        ]);
    }

    /**
     * Test that valid token works normally
     */
    public function test_valid_token_works(): void
    {
        $user = User::factory()->create();

        // Create a token with normal expiration (7 days)
        $token = $user->createToken('api-token');
        $token->accessToken->update([
            'expires_at' => now()->addDays(7),
        ]);

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token->plainTextToken,
        ])->getJson('/api/user');

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'id',
            'name',
            'email',
        ]);
    }
}
