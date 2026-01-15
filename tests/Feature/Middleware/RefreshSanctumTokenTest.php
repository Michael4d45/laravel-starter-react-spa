<?php

declare(strict_types=1);

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('refreshes sanctum token when expiring soon', function (): void {
    $user = User::factory()->create();

    $tokenResult = $user->createToken(
        'api-token',
        expiresAt: now()->addHours(23),
    );

    $oldTokenId = $tokenResult->accessToken->id;
    $oldPlainTextToken = $tokenResult->plainTextToken;

    $response = $this->withHeader(
        'Authorization',
        "Bearer {$oldPlainTextToken}",
    )->getJson('/api/user');

    $response->assertOk();

    $newToken = $response->headers->get('X-New-Token');
    expect($newToken)->not->toBeNull();

    [$newTokenId] = explode('|', $newToken, 2);
    expect($newTokenId)->not->toBe($oldTokenId);

    $this->assertDatabaseMissing('personal_access_tokens', [
        'id' => $oldTokenId,
    ]);

    $this->assertDatabaseHas('personal_access_tokens', [
        'id' => $newTokenId,
    ]);
});

it('does not refresh sanctum token when not expiring soon', function (): void {
    $user = User::factory()->create();

    $tokenResult = $user->createToken(
        'api-token',
        expiresAt: now()->addHours(48),
    );

    $tokenId = $tokenResult->accessToken->id;
    $plainTextToken = $tokenResult->plainTextToken;

    $response = $this->withHeader(
        'Authorization',
        "Bearer {$plainTextToken}",
    )->getJson('/api/user');

    $response->assertOk();

    $newToken = $response->headers->get('X-New-Token');
    expect($newToken)->toBeNull();

    $this->assertDatabaseHas('personal_access_tokens', [
        'id' => $tokenId,
    ]);
});
