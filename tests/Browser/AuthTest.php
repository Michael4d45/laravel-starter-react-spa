<?php

declare(strict_types=1);

use App\Models\User;

it('can register a new user', function (): void {
    $email = 'test-registration-' . rand(1000, 9999) . '@example.com';
    $logPath = setup_log_capture('auth.log');
    $page = visit_with_error_init('/register')
        ->assertNoJavaScriptErrors()
        ->waitForText('Create Account')
        ->type('#name', 'John Doe')
        ->type('#email', $email)
        ->type('#password', 'password123')
        ->type('#password_confirmation', 'password123')
        ->screenshot(filename: 'register.png')
        ->click('Create Account')
        ->wait(1); // Give more time for API call to complete

    assert_no_log_errors($logPath);

    $page->assertNoJavaScriptErrors()->screenshot(
        filename: 'register-after.png',
    );

    $page->assertDontSee('The email has already been taken');

    dd(User::all());

    $this->assertDatabaseHas('users', [
        'name' => 'John Doe',
        'email' => $email,
    ]);
});

it('can login with valid credentials', function (): void {
    $user = User::factory()->create([
        'email' => 'test@example.com',
        'password' => bcrypt('password123'),
    ]);

    visit('/login')
        ->assertNoJavaScriptErrors()
        ->waitForText('Login', 10)
        ->wait(1)
        ->type('#email', 'test@example.com')
        ->type('#password', 'password123')
        ->click('Login')
        ->wait(1)
        ->assertNoJavaScriptErrors()
        ->assertDontSee('Login failed'); // Should not show login error
});

it('shows validation errors for invalid login', function (): void {
    visit('/login')
        ->assertNoJavaScriptErrors()
        ->waitForText('Login')
        ->type('#email', 'invalid@example.com')
        ->type('#password', 'wrongpassword')
        ->click('Login')
        ->wait(1)
        ->assertNoJavaScriptErrors()
        ->assertPathIs('/login') // Should stay on login page with errors
        ->assertNoJavaScriptErrors();
});

it('shows validation errors for invalid registration', function (): void {
    visit('/register')
        ->assertNoJavaScriptErrors()
        ->waitForText('Create Account')
        ->type('#name', 'John')
        ->type('#email', 'invalid-email')
        ->type('#password', 'short')
        ->type('#password_confirmation', 'different')
        ->click('Create Account')
        ->wait(1)
        ->assertNoJavaScriptErrors()
        ->assertPathIs('/register') // Should stay on register page with errors
        ->assertNoJavaScriptErrors();
});

it('can logout', function (): void {
    $logPath = setup_log_capture('auth.log');

    // Create and authenticate user (Laravel session)
    $user = User::factory()->create();
    $this->actingAs($user);

    // Visit profile page - frontend should automatically fetch JWT token
    visit('/profile')
        ->assertNoJavaScriptErrors()
        ->waitForText('Logout', 10)
        ->assertSee('Logout') // Confirm we're logged in
        ->click('Logout')
        ->assertNoJavaScriptErrors()
        ->wait(1) // Wait for logout to complete
        ->assertPathIs('/');

    assert_no_log_errors($logPath);
});
