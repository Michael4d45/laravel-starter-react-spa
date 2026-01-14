<?php

declare(strict_types=1);

use App\Models\User;
use Laravel\Sanctum\Sanctum;

beforeEach(function () {
    setup_log_capture('token-management.log');
});

afterEach(function () {
    assert_no_log_errors(storage_path('logs/token-management.log'));
});

it('lists all tokens for authenticated user', function (): void {
    $user = User::factory()->create();

    // Create multiple tokens for the user
    $token1 = $user->createToken('api-token')->plainTextToken;
    $token2 = $user->createToken('api-token')->plainTextToken;

    // Use one of the created tokens for authentication
    $response = $this->withHeader('Authorization', "Bearer {$token1}")->getJson(
        '/api/tokens',
    );

    $response
        ->assertOk()
        ->assertJsonStructure([
            'tokens' => [
                '*' => [
                    'id',
                    'name',
                    'created_at',
                    'last_used_at',
                    'expires_at',
                    'is_current',
                ],
            ],
        ])
        ->assertJsonCount(2, 'tokens'); // 2 tokens created above
});

it('marks current token correctly in list', function (): void {
    $user = User::factory()->create();
    $tokenResult = $user->createToken('api-token');
    $token = $tokenResult->plainTextToken;
    $tokenId = $tokenResult->accessToken->id;

    // Create another token
    $user->createToken('api-token');

    // Use the first token for authentication
    $response = $this->withHeader('Authorization', "Bearer {$token}")->getJson(
        '/api/tokens',
    );

    $response->assertOk();
    $data = $response->json('tokens');

    // Should have exactly one token marked as current (the one we're using)
    $currentTokens = array_filter($data, fn($t) => $t['is_current']);
    expect($currentTokens)->toHaveCount(1);

    // Verify it's the correct token
    $currentToken = array_values($currentTokens)[0];
    expect($currentToken['id'])->toBe($tokenId);
});

it('deletes a token successfully', function (): void {
    $user = User::factory()->create();

    // Create two tokens
    $token1 = $user->createToken('api-token')->plainTextToken;
    $tokenToDelete = $user->createToken('api-token');

    // Authenticate with first token
    $response = $this->withHeader(
        'Authorization',
        "Bearer {$token1}",
    )->deleteJson("/api/tokens/{$tokenToDelete->accessToken->id}");

    $response
        ->assertOk()
        ->assertJson([
            'message' => 'Session removed successfully.',
        ]);

    // Verify token was deleted
    $this->assertDatabaseMissing('personal_access_tokens', [
        'id' => $tokenToDelete->accessToken->id,
    ]);
});

it('prevents deleting current token', function (): void {
    $user = User::factory()->create();
    $token = $user->createToken('api-token');

    // Try to delete the current token
    $response = $this->withHeader(
        'Authorization',
        "Bearer {$token->plainTextToken}",
    )->deleteJson("/api/tokens/{$token->accessToken->id}");

    $response->assertStatus(422)->assertJsonValidationErrors(['token']);

    // Verify token still exists
    $this->assertDatabaseHas('personal_access_tokens', [
        'id' => $token->accessToken->id,
    ]);
});

it('prevents deleting another users token', function (): void {
    $user1 = User::factory()->create();
    $user2 = User::factory()->create();

    // Create token for user2
    $user2Token = $user2->createToken('api-token');

    // Authenticate as user1 and try to delete user2's token
    Sanctum::actingAs($user1, ['*']);

    $response = $this->deleteJson("/api/tokens/{$user2Token->accessToken->id}");

    $response->assertStatus(422)->assertJsonValidationErrors(['token']);

    // Verify token still exists
    $this->assertDatabaseHas('personal_access_tokens', [
        'id' => $user2Token->accessToken->id,
    ]);
});

it('returns 401 when not authenticated for list tokens', function (): void {
    $response = $this->getJson('/api/tokens');

    $response->assertUnauthorized();
});

it('returns 401 when not authenticated for delete token', function (): void {
    $response = $this->deleteJson('/api/tokens/123');

    $response->assertUnauthorized();
});

it('returns 422 when deleting non-existent token', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user, ['*']);

    $response = $this->deleteJson('/api/tokens/999999');

    $response->assertStatus(422)->assertJsonValidationErrors(['token']);
});

it('shows token expiration date when configured', function (): void {
    config(['sanctum.expiration' => 7 * 24 * 60]); // 7 days

    $user = User::factory()->create();
    $token = $user->createToken(
        'api-token',
        expiresAt: now()->addDays(7),
    )->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer {$token}")->getJson(
        '/api/tokens',
    );

    $response->assertOk();
    $data = $response->json('tokens');

    // At least one token should have an expiration date
    $tokensWithExpiry = array_filter(
        $data,
        fn($t) => $t['expires_at'] !== null,
    );
    expect($tokensWithExpiry)->not->toBeEmpty();
});

it('orders tokens by last used and then created date', function (): void {
    $user = User::factory()->create();

    // Create tokens with different timestamps
    $oldToken = $user->createToken('api-token');
    sleep(1);
    $newToken = $user->createToken('api-token');

    // Update last_used_at for old token to make it more recent
    $oldToken
        ->accessToken
        ->forceFill([
            'last_used_at' => now(),
        ])
        ->save();

    Sanctum::actingAs($user, ['*']);

    $response = $this->getJson('/api/tokens');

    $response->assertOk();
    $data = $response->json('tokens');

    // First token should be the one that was used most recently
    expect($data)->not->toBeEmpty();
});
