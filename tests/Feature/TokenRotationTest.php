<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;

test('expired token is rejected', function () {
    $user = User::factory()->create();

    // Create a token that expires in the past
    $token = $user->createToken('api-token');
    $token->accessToken->update([
        'expires_at' => now()->subHour(),
    ]);

    Artisan::call('sanctum:prune-expired');

    $response = $this->withHeaders([
        'Authorization' => 'Bearer ' . $token->plainTextToken,
    ])->getJson('/api/user');

    $response->assertStatus(401);
    $response->assertJson([
        '_tag' => 'AuthenticationError',
        'message' => 'Unauthenticated.',
    ]);
});

test('token rotation within 24 hours of expiry', function () {
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
    expect($response->headers->has('X-New-Token'))->toBeTrue();

    // New token should be different from old token
    $newToken = $response->headers->get('X-New-Token');
    expect($newToken)->not->toEqual($token->plainTextToken);

    // Old token should be deleted
    expect(
        DB::table('personal_access_tokens')
            ->where('id', $token->accessToken->id)
            ->exists(),
    )->toBeFalse();
});

test('token not rotated when far from expiry', function () {
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
    expect($response->headers->has('X-New-Token'))->toBeFalse();

    // Old token should still exist
    expect(
        DB::table('personal_access_tokens')->where('id', $oldTokenId)->exists(),
    )->toBeTrue();
});

test('valid token works', function () {
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
});
