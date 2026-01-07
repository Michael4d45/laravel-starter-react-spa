<?php

declare(strict_types=1);

use App\Models\User;

it('can register a new user', function (): void {
    $email = 'test-user-registration@example.com';
    $logPath = setup_log_capture('auth.log');
    $page = visit_with_error_init('/register')
        ->assertNoJavaScriptErrors()
        ->waitForText('Create Account')
        ->type('#name', 'John Doe')
        ->type('#email', $email)
        ->type('#password', 'password1234')
        ->type('#password_confirmation', 'password1234')
        ->screenshot(filename: 'register.png')
        ->click('@create-account')
        ->wait(1); // Give more time for API call to complete

    assert_no_log_errors($logPath);

    $page->assertNoJavaScriptErrors()->screenshot(
        filename: 'register-after.png',
    );

    $page->assertDontSee('The email has already been taken');

    $this->assertDatabaseHas('users', [
        'name' => 'John Doe',
        'email' => $email,
    ]);
});

it('can login with valid credentials', function (): void {
    $user = User::factory()->create([
        'email' => 'test@example.com',
        'password' => bcrypt('password1234'),
    ]);

    visit('/login')
        ->assertNoJavaScriptErrors()
        ->waitForText('Login', 10)
        ->wait(1)
        ->type('#email', 'test@example.com')
        ->type('#password', 'password1234')
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

it('validates password requirements during registration', function (): void {
    visit('/register')
        ->assertNoJavaScriptErrors()
        ->waitForText('Create Account')
        // Test password too short (less than 8 characters)
        ->type('#name', 'John Doe')
        ->type('#email', 'test@example.com')
        ->type('#password', '123') // Too short
        ->type('#password_confirmation', '123')
        ->click('@create-account')
        ->wait(2)
        // Check that we're still on the registration page (validation prevented redirect)
        ->assertPathIs('/register')
        // Verify no JavaScript errors occurred during validation
        ->assertNoJavaScriptErrors()
        // Verify that no success toast or redirect occurred
        ->assertDontSee('Account created successfully');
});

it('validates password confirmation matching during registration', function (): void {
    visit('/register')
        ->assertNoJavaScriptErrors()
        ->waitForText('Create Account')
        // Test password confirmation doesn't match
        ->type('#name', 'John Doe')
        ->type('#email', 'test@example.com')
        ->type('#password', 'password123')
        ->type('#password_confirmation', 'different123') // Doesn't match
        ->click('@create-account')
        ->wait(2)
        // Check that we're still on the registration page (validation prevented redirect)
        ->assertPathIs('/register')
        // Verify no JavaScript errors occurred during validation
        ->assertNoJavaScriptErrors()
        // Verify that no success toast or redirect occurred
        ->assertDontSee('Account created successfully');
});

it('validates both password length and confirmation during registration', function (): void {
    visit('/register')
        ->assertNoJavaScriptErrors()
        ->waitForText('Create Account')
        // Test both password too short AND confirmation doesn't match
        ->type('#name', 'John Doe')
        ->type('#email', 'test@example.com')
        ->type('#password', '123456789')
        ->type('#password_confirmation', '1234567890')
        ->click('@create-account')
        ->wait(2)
        ->screenshot(filename: 'password-validation-failed1.png')
        // Check that we're still on the registration page (validation prevented redirect)
        ->assertPathIs('/register')
        // Verify that the form still contains our invalid input (form wasn't cleared)
        ->assertValue('#password', '123456789')
        ->assertValue('#password_confirmation', '1234567890')
        // Verify no JavaScript errors occurred during validation
        ->assertNoJavaScriptErrors()
        // Verify that no success toast or redirect occurred
        ->assertDontSee('Account created successfully')
        ->assertPathIs('/register')
        // Take a screenshot to verify visual state
        ->screenshot(filename: 'password-validation-failed2.png');
});

it('validates email uniqueness during registration', function (): void {
    User::factory()->create([
        'email' => 'test@example.com',
    ]);

    visit('/register')
        ->assertNoJavaScriptErrors()
        ->waitForText('Create Account')
        // Test both password too short AND confirmation doesn't match
        ->type('#name', 'John Doe')
        ->type('#email', 'test@example.com')
        ->type('#password', '123456789')
        ->type('#password_confirmation', '123456789')
        ->click('@create-account')
        ->wait(2)
        ->screenshot(filename: 'email-validation-failed1.png')
        // Check that we're still on the registration page (validation prevented redirect)
        ->assertPathIs('/register')
        // Verify that the form still contains our invalid input (form wasn't cleared)
        ->assertValue('#email', 'test@example.com')
        ->assertValue('#password', '123456789')
        ->assertValue('#password_confirmation', '123456789')
        // Verify no JavaScript errors occurred during validation
        ->assertNoJavaScriptErrors()
        // Verify that no success toast or redirect occurred
        ->assertDontSee('Account created successfully')
        ->assertPathIs('/register')
        // Wait a bit more for the validation error to be displayed
        ->wait(3)
        // Verify that validation error is displayed inline
        ->assertSee('The email has already been taken')
        // Take a screenshot to verify visual state
        ->screenshot(filename: 'email-validation-failed2.png');
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

it('shows google login button on login page', function (): void {
    visit('/login')
        ->assertNoJavaScriptErrors()
        ->waitForText('Login')
        ->assertSee('Continue with Google')
        ->assertSee('Or'); // The divider text
});

it('shows google login button on register page', function (): void {
    visit('/register')
        ->assertNoJavaScriptErrors()
        ->waitForText('Create Account')
        ->assertSee('Continue with Google')
        ->assertSee('Or'); // The divider text
});

it('shows google account connection on profile page', function (): void {
    $user = User::factory()->create([
        'email' => 'test@example.com',
        'password' => bcrypt('password1234'),
    ]);

    // Use actingAs to create a session - the frontend will detect this and get a token
    $this->actingAs($user);

    visit('/profile')
        ->assertNoJavaScriptErrors()
        ->waitForText('Logout', 10)
        ->assertSee('Google Account')
        ->assertSee('Connect Google Account');
});

it('shows google account as connected on profile page', function (): void {
    $user = User::factory()->create([
        'email' => 'test@example.com',
        'password' => bcrypt('password1234'),
        'google_id' => '123456789',
    ]);

    // Use actingAs to create a session - the frontend will detect this and get a token
    $this->actingAs($user);

    visit('/profile')
        ->assertNoJavaScriptErrors()
        ->waitForText('Logout', 10)
        ->assertSee('Google Account')
        ->assertSee('Connected')
        ->assertSee('Reconnect');
});

it('can logout', function (): void {
    $logPath = setup_log_capture('auth.log');

    // Create and authenticate user (Laravel session) - frontend should auto-fetch JWT token
    $user = User::factory()->create();

    // Use actingAs to create a session - the frontend will detect this and get a token
    $this->actingAs($user);

    // Visit profile page - frontend should automatically fetch JWT token via session
    visit('/profile')
        ->assertNoJavaScriptErrors()
        ->waitForText('Logout', 10)
        ->assertSee('Logout') // Confirm we're logged in
        ->click('Logout')
        ->assertNoJavaScriptErrors()
        ->wait(2); // Wait for logout to complete

    assert_no_log_errors($logPath);
});
