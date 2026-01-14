<?php

declare(strict_types=1);

use App\Models\User;

beforeEach(function () {
    setup_log_capture('token-rotation.log');
});

afterEach(function () {
    assert_no_log_errors(storage_path('logs/token-rotation.log'));
});

it('frontend automatically updates token when X-New-Token header is received', function (): void {
    $user = User::factory()->create([
        'name' => 'Token Test User',
        'email' => 'token-test@example.com',
    ]);

    // Create a token that expires in 12 hours (within 24-hour rotation window)
    $token = $user->createToken('api-token');
    $token->accessToken->update([
        'expires_at' => now()->addHours(12),
    ]);

    $plainToken = $token->plainTextToken;

    // Initialize with a custom script that sets the token in localStorage
    // This script must run BEFORE the app loads to set initial auth state
    // We intercept fetch BEFORE the app's interceptor to log headers
    $initScript = <<<JS
        // Set up initial auth state BEFORE the app loads
        localStorage.setItem('auth_token', '{$plainToken}');
        localStorage.setItem('auth_user', JSON.stringify({
            id: '{$user->id}',
            name: '{$user->name}',
            email: '{$user->email}',
            email_verified_at: null,
            google_id: null
        }));

        // Track token changes and API responses for verification
        window.__tokenRotationTest = {
            initialToken: '{$plainToken}',
            tokenChanges: [],
            apiResponses: [],
        };

        // Wrap localStorage.setItem to track token changes
        const originalSetItem = localStorage.setItem.bind(localStorage);
        localStorage.setItem = function(key, value) {
            if (key === 'auth_token') {
                console.log('[TokenRotationTest] localStorage.setItem for auth_token');
                if (value !== window.__tokenRotationTest.initialToken) {
                    window.__tokenRotationTest.tokenChanges.push({
                        timestamp: Date.now(),
                        oldToken: window.__tokenRotationTest.initialToken,
                        newToken: value,
                    });
                    console.log('[TokenRotationTest] Token rotated to new value!');
                }
            }
            return originalSetItem(key, value);
        };

        // Intercept fetch BEFORE the app loads to capture all responses
        const nativeFetch = window.fetch.bind(window);
        window.fetch = async function(...args) {
            const response = await nativeFetch(...args);
            const url = args[0]?.toString?.() || args[0];
            
            // Log all response headers for debugging
            const headers = {};
            response.headers.forEach((value, key) => {
                headers[key] = value;
            });
            
            const newTokenHeader = response.headers.get('X-New-Token');
            window.__tokenRotationTest.apiResponses.push({
                url: url,
                status: response.status,
                hasNewToken: !!newTokenHeader,
                newToken: newTokenHeader ? newTokenHeader.substring(0, 30) + '...' : null,
                allHeaders: headers,
            });
            
            if (newTokenHeader) {
                console.log('[TokenRotationTest] X-New-Token header found!', url);
            }
            
            return response;
        };
    JS;

    $page = visit_with_custom_init('/profile', [], [$initScript])
        ->assertNoJavaScriptErrors()
        ->waitForText('Profile', 10)
        ->assertSee('Token Test User')
        ->assertSee('token-test@example.com')
        // Wait a moment for any async token rotation to complete
        ->wait(2);

    // The stored token should have been updated by the app's fetch interceptor
    $storedToken = $page->script('localStorage.getItem("auth_token")');

    // Verify the token was rotated (different from original)
    expect($storedToken)->not->toBe(
        $plainToken,
        'Token should have been rotated after API call',
    );

    // Verify token changes were tracked
    $tokenChanges = $page->script('window.__tokenRotationTest.tokenChanges');
    expect($tokenChanges)->toBeArray();
    expect(count($tokenChanges))
        ->toBeGreaterThan(
            0,
            'Expected at least one token change to be tracked',
        );

    // Verify the tracked change matches what's in localStorage
    $lastChange = end($tokenChanges);
    expect($lastChange['newToken'])->toBe($storedToken);

    // Verify old token was deleted from database
    $this->assertDatabaseMissing('personal_access_tokens', [
        'id' => $token->accessToken->id,
    ]);
});

it('frontend does not update token when token is not close to expiry', function (): void {
    $user = User::factory()->create([
        'name' => 'No Rotation User',
        'email' => 'no-rotation@example.com',
    ]);

    // Create a token that expires in 3 days (outside 24-hour rotation window)
    $token = $user->createToken('api-token');
    $token->accessToken->update([
        'expires_at' => now()->addDays(3),
    ]);

    $plainToken = $token->plainTextToken;
    $tokenId = $token->accessToken->id;

    // Initialize with a custom script that sets the token in localStorage
    $initScript = <<<JS
        // Set up initial auth state
        localStorage.setItem('auth_token', '{$plainToken}');
        localStorage.setItem('auth_user', JSON.stringify({
            id: '{$user->id}',
            name: '{$user->name}',
            email: '{$user->email}',
            email_verified_at: null,
            google_id: null
        }));

        // Track token changes for verification
        window.__tokenRotationTest = {
            initialToken: '{$plainToken}',
            tokenChanges: [],
        };

        // Wrap localStorage.setItem to track token changes
        const originalSetItem = localStorage.setItem.bind(localStorage);
        localStorage.setItem = function(key, value) {
            if (key === 'auth_token' && value !== window.__tokenRotationTest.initialToken) {
                window.__tokenRotationTest.tokenChanges.push({
                    timestamp: Date.now(),
                    oldToken: window.__tokenRotationTest.initialToken,
                    newToken: value,
                });
            }
            return originalSetItem(key, value);
        };
    JS;

    $page = visit_with_custom_init('/profile', [], [$initScript])
        ->assertNoJavaScriptErrors()
        ->waitForText('Profile', 10)
        ->assertSee('No Rotation User');

    // Verify that token was NOT rotated
    $tokenChanges = $page->script('window.__tokenRotationTest.tokenChanges');
    expect($tokenChanges)->toBeArray();
    expect(count($tokenChanges))->toBe(0);

    // Verify the original token is still stored in localStorage
    $storedToken = $page->script('localStorage.getItem("auth_token")');
    expect($storedToken)->toBe($plainToken);

    // Verify old token still exists in database
    $this->assertDatabaseHas('personal_access_tokens', [
        'id' => $tokenId,
    ]);
});

it('subsequent API calls use the rotated token', function (): void {
    $user = User::factory()->create([
        'name' => 'Subsequent Calls User',
        'email' => 'subsequent@example.com',
    ]);

    // Create a token that expires in 12 hours (within 24-hour rotation window)
    $token = $user->createToken('api-token');
    $token->accessToken->update([
        'expires_at' => now()->addHours(12),
    ]);

    $plainToken = $token->plainTextToken;

    // Initialize with token and track API call success
    $initScript = <<<JS
        localStorage.setItem('auth_token', '{$plainToken}');
        localStorage.setItem('auth_user', JSON.stringify({
            id: '{$user->id}',
            name: '{$user->name}',
            email: '{$user->email}',
            email_verified_at: null,
            google_id: null
        }));

        window.__tokenRotationTest = {
            initialToken: '{$plainToken}',
            apiCallResults: [],
        };

        // Track API call results
        const nativeFetch = window.fetch.bind(window);
        window.fetch = async function(...args) {
            const response = await nativeFetch(...args);
            const url = args[0]?.toString?.() || args[0];
            if (url.includes('/api/')) {
                window.__tokenRotationTest.apiCallResults.push({
                    url: url,
                    status: response.status,
                    ok: response.ok,
                });
            }
            return response;
        };
    JS;

    $page = visit_with_custom_init('/profile', [], [$initScript])
        ->assertNoJavaScriptErrors()
        ->waitForText('Profile', 10)
        ->assertSee('Subsequent Calls User')
        ->wait(1);

    // Get the new token after rotation
    $newToken = $page->script('localStorage.getItem("auth_token")');
    expect($newToken)->not->toBe($plainToken);

    // Verify there's a new token in the database for this user
    $this->assertDatabaseHas('personal_access_tokens', [
        'tokenable_id' => $user->id,
    ]);

    // Verify all API calls succeeded (no 401 errors)
    $apiResults = $page->script('window.__tokenRotationTest.apiCallResults');
    foreach ($apiResults as $result) {
        expect($result['status'])
            ->toBe(200, "API call to {$result['url']} should succeed");
    }

    // Verify old token was deleted
    $this->assertDatabaseMissing('personal_access_tokens', [
        'id' => $token->accessToken->id,
    ]);
});
