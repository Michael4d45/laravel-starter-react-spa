<?php

declare(strict_types=1);

use App\Models\User;

beforeEach(function () {
    setup_log_capture('profile.log');
});

afterEach(function () {
    assert_no_log_errors(storage_path('logs/profile.log'));
});

it('profile page loads without JS errors when authenticated', function (): void {
    $user = User::factory()->create();
    $this->actingAs($user);

    visit('/profile')
        ->assertNoJavaScriptErrors()
        ->waitForText('Profile', 10)
        ->assertSee('Profile');
});

it('profile page redirects to login when not authenticated', function (): void {
    visit('/profile')
        ->assertNoJavaScriptErrors()
        ->assertPathIs('/login');
});

it('displays user information on profile page', function (): void {
    $user = User::factory()->create([
        'name' => 'John Doe',
        'email' => 'john@example.com',
    ]);
    $this->actingAs($user);

    visit('/profile')
        ->assertNoJavaScriptErrors()
        ->waitForText('Profile', 10)
        ->assertSee('John Doe')
        ->assertSee('john@example.com');
});

it('displays user name and email correctly', function (): void {
    $user = User::factory()->create([
        'name' => 'Jane Smith',
        'email' => 'jane@example.com',
    ]);
    $this->actingAs($user);

    visit('/profile')
        ->assertNoJavaScriptErrors()
        ->waitForText('Profile', 10)
        ->assertSee('Jane Smith')
        ->assertSee('jane@example.com')
        ->assertSee('Name')
        ->assertSee('Email')
        ->screenshot(filename: 'profile-display.png');
});

it('shows logout button on profile page', function (): void {
    $user = User::factory()->create();
    $this->actingAs($user);

    visit('/profile')
        ->assertNoJavaScriptErrors()
        ->waitForText('Profile', 10)
        ->assertSee('Logout')
        ->screenshot(filename: 'profile-logout-button.png');
});

it('profile page has proper layout and styling', function (): void {
    $user = User::factory()->create([
        'name' => 'Test User',
        'email' => 'test@example.com',
    ]);
    $this->actingAs($user);

    visit('/profile')
        ->assertNoJavaScriptErrors()
        ->waitForText('Profile', 10)
        ->assertSee('Profile')
        ->assertSee('Test User')
        ->assertSee('test@example.com')
        // Check for proper CSS classes that indicate styling is applied
        ->assertPresent('.bg-white')
        ->assertPresent('.shadow-md')
        ->assertPresent('.rounded-lg')
        ->screenshot(filename: 'profile-styling.png');
});

it('profile page is responsive on different screen sizes', function (): void {
    $user = User::factory()->create();
    $this->actingAs($user);

    visit('/profile')
        ->assertNoJavaScriptErrors()
        ->waitForText('Profile', 10)
        ->resize(375, 667) // Mobile size
        ->assertNoJavaScriptErrors()
        ->screenshot(filename: 'profile-mobile.png')
        ->resize(768, 1024) // Tablet size
        ->assertNoJavaScriptErrors()
        ->screenshot(filename: 'profile-tablet.png')
        ->resize(1920, 1080) // Desktop size
        ->assertNoJavaScriptErrors()
        ->screenshot(filename: 'profile-desktop.png');
});

it('displays complete profile content structure', function (): void {
    $user = User::factory()->create([
        'name' => 'Alice Johnson',
        'email' => 'alice.johnson@example.com',
    ]);
    $this->actingAs($user);

    visit('/profile')
        ->assertNoJavaScriptErrors()
        ->waitForText('Profile', 10)

        // Verify main heading
        ->assertSee('Profile')

        // Verify name section structure
        ->assertSee('Name')
        ->assertSee('Alice Johnson')

        // Verify email section structure
        ->assertSee('Email')
        ->assertSee('alice.johnson@example.com')

        // Verify logout button
        ->assertSee('Logout')

        // Verify all expected content elements are present and visible
        ->assertSee('Alice Johnson') // User's name
        ->assertSee('alice.johnson@example.com') // User's email

        // Verify the page has all expected sections
        ->assertSee('Name') // Name label
        ->assertSee('Email') // Email label

        // Take screenshot to verify visual layout
        ->screenshot(filename: 'profile-content-structure.png');
});
